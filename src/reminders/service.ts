/**
 * Native side of reminders (TR-58 … TR-62): permissions, categories with actions,
 * idempotent scheduling from the planner, and the response listener that records logs.
 * expo-notifications has no scheduled local notifications on web, so every entry point
 * here is inert there: permissions read as denied and scheduling is skipped.
 */
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { track } from '../analytics';
import { todayKey } from '../engine';
import { t } from '../i18n';
import { appStore } from '../store/appStore';
import { fireDate, planReminders } from './planner';

export type PermissionState = 'granted' | 'denied' | 'undetermined';
const CATEGORY = 'activity';

export async function getPermissionState(): Promise<PermissionState> {
  if (Platform.OS === 'web') return 'denied';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') return 'denied';
  const p = await Notifications.requestPermissionsAsync();
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

export function openSystemSettings(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  return Linking.openSettings();
}

let configured = false;
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', { name: t('reminders.channel'), importance: Notifications.AndroidImportance.DEFAULT });
  }
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    { identifier: 'done', buttonTitle: t('reminders.actionDone'), options: { opensAppToForeground: false } },
    { identifier: 'min', buttonTitle: t('reminders.actionMin'), options: { opensAppToForeground: false } },
  ]);
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { activityId?: string; date?: string } | undefined;
    const action = response.actionIdentifier;
    if (data?.activityId && data.date && (action === 'done' || action === 'min')) {
      appStore.setLog(data.activityId, data.date, action);
      track(action === 'done' ? 'complete' : 'minimum', { source: 'notification' });
    }
  });
}

/** Cancel everything and schedule the current plan. Safe to call often. */
export async function rescheduleReminders(): Promise<number> {
  if ((await getPermissionState()) !== 'granted') return 0;
  const s = appStore.getState();
  const L = (id: string, date: string) => s.logs[`${id}|${date}`]?.state ?? null;
  const now = new Date();
  const plan = planReminders(s.activities, todayKey(now), L, {
    morningSummary: s.morningSummary,
    morningTime: s.morningTime,
    now: { date: todayKey(now), time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` },
    texts: {
      dueToday: (name, step) => (step ? t('reminders.dueTodayStep', { name, step }) : t('reminders.dueToday', { name })),
      summaryTitle: (n) => (n === 1 ? t('reminders.summaryTitleOne') : t('reminders.summaryTitle', { n })),
      summaryBody: (names) => t('reminders.summaryBody', { names: names.join(', ') }),
    },
  }).slice(0, 60); // iOS keeps at most 64 pending notifications
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: {
        title: n.title,
        body: n.body,
        categoryIdentifier: n.kind === 'activity' ? CATEGORY : undefined,
        data: n.kind === 'activity' ? { activityId: n.activityId, date: n.date } : { summary: true, date: n.date },
        ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate(n) },
    });
  }
  track('reminders_scheduled', { count: plan.length });
  return plan.length;
}

/** Debounced reschedule on any store change (logs, activities, settings). */
export function watchStoreForReminders(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = appStore.subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void rescheduleReminders(); }, 800);
  });
  return () => { unsubscribe(); if (timer) clearTimeout(timer); };
}
