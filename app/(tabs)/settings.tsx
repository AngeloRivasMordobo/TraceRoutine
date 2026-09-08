import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { track } from '@/src/analytics';
import { activitiesCsv, backupSummary, logsCsv, parseBackup, toBackup } from '@/src/data/backup';
import { pickTextFile, shareText } from '@/src/data/files';
import { formatShortDate, freqLabel, LANGS, t, type Lang } from '@/src/i18n';
import { getPermissionState, openSystemSettings, requestPermission, rescheduleReminders, type PermissionState } from '@/src/reminders/service';
import { appStore, useAppStore } from '@/src/store/appStore';
import { FREE_ACTIVE_LIMIT } from '@/src/store/limits';
import { Button, Kicker, Title } from '@/src/ui/components';
import { Sheet, inputStyle } from '@/src/ui/controls';
import { ActivityIcon, UIIcon, type UIIconKey } from '@/src/ui/icons';
import { Logo } from '@/src/ui/Logo';
import { useTheme, type ThemeMode } from '@/src/ui/theme';
import { accentRamp, activityColor, font, radius, rgba, space, TOUCH } from '@/src/ui/tokens';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Settings (TR-63 … TR-69). Every change applies instantly. */
export default function SettingsScreen() {
  const th = useTheme();
  const lang = useAppStore((s) => s.lang);
  const themeMode = useAppStore((s) => s.themeMode);
  const morningSummary = useAppStore((s) => s.morningSummary);
  const morningTime = useAppStore((s) => s.morningTime);
  const analyticsOptOut = useAppStore((s) => s.analyticsOptOut);
  const proInterest = useAppStore((s) => s.proInterest);
  const activities = useAppStore((s) => s.activities);
  const logs = useAppStore((s) => s.logs);
  const today = useAppStore((s) => s.today);
  const archived = activities.filter((a) => a.archived);
  const activeCount = activities.filter((a) => !a.archived && !(a.end && a.end < today)).length;
  const [perm, setPerm] = useState<PermissionState>('undetermined');
  const [timeDraft, setTimeDraft] = useState(morningTime);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [typed, setTyped] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const version = Constants.expoConfig?.version ?? '0.1';

  useEffect(() => { void getPermissionState().then(setPerm); }, []);
  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const enableReminders = () => {
    Alert.alert(t('reminders.prePromptTitle'), t('reminders.prePromptBody'), [
      { text: t('reminders.prePromptLater'), style: 'cancel' },
      { text: t('reminders.prePromptOk'), onPress: async () => { setPerm(await requestPermission()); await rescheduleReminders(); } },
    ]);
  };
  const commitTime = () => { if (TIME_RE.test(timeDraft)) appStore.setMorningTime(timeDraft); else setTimeDraft(morningTime); };

  const exportCsv = async () => {
    const list = Object.values(logs);
    const nameOf = (id: string) => activities.find((a) => a.id === id)?.name ?? id;
    await shareText(`traceroutine-activities-${today}.csv`, activitiesCsv(activities, (a) => freqLabel(a.freq)), 'text/csv');
    await shareText(`traceroutine-logs-${today}.csv`, logsCsv(list, nameOf), 'text/csv');
    track('export', { activities: activities.length, logs: list.length });
  };
  const exportBackup = async () => {
    const snap = appStore.snapshot();
    await shareText(`traceroutine-backup-${today}.json`, toBackup(snap.activities, snap.logs, snap.settings), 'application/json');
    track('backup');
  };
  const importBackup = async () => {
    const text = await pickTextFile();
    if (text === null) return;
    const parsed = parseBackup(text);
    if (!parsed.ok) return Alert.alert(parsed.error === 'newer_version' ? t('settings.importNewer') : t('settings.importError'));
    const s = backupSummary(parsed.backup);
    const preview = t('settings.importPreview', { activities: s.activities, logs: s.logs, from: s.from ? formatShortDate(s.from) : '–', to: s.to ? formatShortDate(s.to) : '–' });
    const apply = async (mode: 'replace' | 'merge') => { await appStore.importSnapshot(parsed.backup, mode); track('import', { mode, logs: s.logs }); flash(t('settings.importDone')); };
    Alert.alert(t('settings.backupImport'), preview, [
      { text: t('editor.cancel'), style: 'cancel' },
      { text: t('settings.importMerge'), onPress: () => void apply('merge') },
      { text: t('settings.importReplace'), style: 'destructive', onPress: () => void apply('replace') },
    ]);
  };
  const deleteAll = async () => { await appStore.clearAll(); setDeleteStep(0); setTyped(''); flash(t('settings.deleted')); };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Kicker>{t('tabs.settings')}</Kicker>
        <Title>{t('settings.title')}</Title>

        {/* The design lists settings as flat rows with a leading icon and a hairline between them. */}
        <View style={{ marginTop: space[8] }}>
          <Row icon="globe" label={t('settings.language')}>
            <PillSeg<Lang>
              options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))}
              value={lang}
              onChange={(l) => { appStore.setLang(l); track('language', { lang: l }); }}
            />
          </Row>
          <Row icon="theme" label={t('settings.theme')}>
            <PillSeg<ThemeMode>
              options={[{ value: 'dark', label: t('settings.dark') }, { value: 'light', label: t('settings.light') }, { value: 'auto', label: t('settings.auto') }]}
              value={themeMode}
              onChange={(v) => { appStore.setThemeMode(v); track('theme', { theme: v }); }}
            />
          </Row>
          <Row icon="bell" label={t(`reminders.permission${perm.charAt(0).toUpperCase()}${perm.slice(1)}`)}>
            {perm === 'granted' ? null : perm === 'denied'
              ? <Button label={t('reminders.openSystemSettings')} variant="secondary" onPress={openSystemSettings} />
              : <Button label={t('reminders.enable')} onPress={enableReminders} />}
          </Row>
          <Row icon="bell" label={t('settings.morningSummary')} help={t('settings.morningSummaryHelp')}>
            <Switch value={morningSummary} onValueChange={appStore.setMorningSummary} trackColor={{ true: th.accent, false: th.line }} thumbColor={th.text} />
          </Row>
          {morningSummary && (
            <Row icon="bell" label={t('settings.morningTime')}>
              <TextInput value={timeDraft} onChangeText={setTimeDraft} onBlur={commitTime} onSubmitEditing={commitTime} keyboardType="numbers-and-punctuation" style={[inputStyle(th), { width: 88, textAlign: 'center' }]} accessibilityLabel={t('settings.morningTime')} />
            </Row>
          )}
          <ActionRow icon="download" label={t('settings.exportCsv')} onPress={() => void exportCsv()} />
          <ActionRow icon="download" label={t('settings.backupExport')} onPress={() => void exportBackup()} />
          <ActionRow icon="download" label={t('settings.backupImport')} onPress={() => void importBackup()} />
          <Row icon="info" label={t('settings.analytics')} help={t('settings.analyticsHelp')}>
            <Switch value={!analyticsOptOut} onValueChange={(on) => appStore.setAnalyticsOptOut(!on)} trackColor={{ true: th.accent, false: th.line }} thumbColor={th.text} />
          </Row>
          <ActionRow
            icon="info"
            label={t('settings.feedback')}
            onPress={() => void Linking.openURL(`mailto:hola@traceroutine.app?subject=${encodeURIComponent(t('settings.feedbackSubject'))}&body=${encodeURIComponent(`\n\n— v${version} · ${Constants.platform ? Object.keys(Constants.platform)[0] : ''}`)}`)}
          />
          <ActionRow icon="trash" label={t('settings.deleteAll')} danger onPress={() => setDeleteStep(1)} />
        </View>

        {archived.length > 0 && (
          <>
            <Text style={[styles.groupLabel, { color: th.muted }]}>{t('settings.archivedTitle')}</Text>
            {archived.map((a) => (
              <View key={a.id} style={[styles.archivedRow, { borderBottomColor: th.surface2 }]}>
                <ActivityIcon name={a.icon} color={activityColor(a.color)} size={16} />
                <Text style={[styles.archivedName, { color: th.text }]} numberOfLines={1}>{a.name}</Text>
                <Pressable onPress={() => appStore.setArchived(a.id, false)} accessibilityRole="button" hitSlop={8}>
                  <Text style={{ color: th.accent, fontFamily: font.family, fontSize: font.size.sm }}>{t('settings.unarchive')}</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}

        {/* The Pro card: accent hairline over a fading tint, with the brand mark. */}
        <View style={[styles.pro, { borderColor: accentRamp[800], backgroundColor: rgba(accentRamp[900], 0.55) }]}>
          <View style={styles.proHead}>
            <Logo size={8} gap={2.5} />
            <Text style={[styles.proName, { color: th.text }]}>{`${t('app.name')} Pro`}</Text>
          </View>
          <Text style={[styles.proBody, { color: th.muted }]}>{t('settings.proBody')}</Text>
          <Text style={[styles.proNote, { color: accentRamp[300] }]}>
            {t('settings.freeLimit', { limit: FREE_ACTIVE_LIMIT, left: Math.max(0, FREE_ACTIVE_LIMIT - activeCount) })}
          </Text>
          <Button
            label={proInterest ? t('settings.proNotified') : t('settings.notifyMe')}
            variant={proInterest ? 'ghost' : 'primary'}
            disabled={proInterest}
            onPress={() => { appStore.markProInterest(); track('pro_interest'); }}
            style={{ marginTop: space[4] }}
          />
        </View>

        <Text style={[styles.foot, { color: th.faint }]}>
          {`${t('app.name')} ${version} · ${t('settings.localData')}`}
        </Text>
        <View style={{ height: space[12] }} />
      </ScrollView>

      <Sheet visible={deleteStep === 1} onClose={() => setDeleteStep(0)} title={t('settings.deleteTitle')}>
        <Text style={{ color: th.muted }}>{t('settings.deleteBody')}</Text>
        <Button label={t('settings.deleteBackupFirst')} variant="secondary" onPress={() => { setDeleteStep(0); void exportBackup(); }} style={{ marginTop: space[4] }} />
        <Button label={t('settings.deleteContinue')} variant="ghost" onPress={() => setDeleteStep(2)} />
      </Sheet>
      <Sheet visible={deleteStep === 2} onClose={() => { setDeleteStep(0); setTyped(''); }} title={t('settings.deleteType')}>
        <TextInput value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} placeholder={t('settings.deleteWord')} placeholderTextColor={th.faint} style={inputStyle(th)} />
        <Pressable disabled={typed.trim().toUpperCase() !== t('settings.deleteWord')} onPress={() => void deleteAll()} accessibilityRole="button" style={[styles.deleteBtn, { borderColor: th.danger, opacity: typed.trim().toUpperCase() === t('settings.deleteWord') ? 1 : 0.4 }]}>
          <Text style={{ fontFamily: font.semibold, color: th.danger }}>{t('settings.deleteAll')}</Text>
        </Pressable>
      </Sheet>
      {toast && <View style={[styles.toast, { backgroundColor: th.surface2, borderColor: th.line }]}><Text style={{ color: th.text }}>{toast}</Text></View>}
    </SafeAreaView>
  );
}

/** The design's pill toggle: one rounded outline, the active option tinted from the accent ramp. */
function PillSeg<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const th = useTheme();
  return (
    <View style={[styles.pill, { borderColor: th.line }]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.pillOpt, on && { backgroundColor: accentRamp[800] }]}>
            <Text style={[styles.pillLabel, { color: on ? accentRamp[200] : th.muted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A settings row that performs an action, with the design's trailing caret. */
function ActionRow({ icon, label, onPress, danger }: { icon: UIIconKey; label: string; onPress: () => void; danger?: boolean }) {
  const th = useTheme();
  const tint = danger ? th.danger : th.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: th.surface2, opacity: pressed ? 0.6 : 1 }]}>
      <UIIcon name={icon} color={danger ? th.danger : th.muted} size={16} />
      <Text style={[styles.rowLabel, { color: tint, flex: 1 }]}>{label}</Text>
      {!danger && <UIIcon name="forward" color={th.faint} size={13} />}
    </Pressable>
  );
}

function Row({ icon, label, help, children }: { icon: UIIconKey; label: string; help?: string; children: React.ReactNode }) {
  const th = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: th.surface2 }]}>
      <UIIcon name={icon} color={th.muted} size={16} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: th.text }]}>{label}</Text>
        {!!help && <Text style={[styles.rowHelp, { color: th.muted }]}>{help}</Text>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space[6] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[4], minHeight: TOUCH, paddingVertical: 13, borderBottomWidth: 1 },
  rowLabel: { fontFamily: font.family, fontSize: 13 },
  rowHelp: { fontFamily: font.family, fontSize: 10.5, marginTop: 2 },
  groupLabel: { fontFamily: font.medium, fontSize: font.size.xs, letterSpacing: font.tracking.eyebrow, textTransform: 'uppercase', marginTop: space[8], marginBottom: space[3] },
  pill: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.pill, overflow: 'hidden' },
  pillOpt: { paddingHorizontal: 13, paddingVertical: 5, minHeight: 30, alignItems: 'center', justifyContent: 'center' },
  pillLabel: { fontFamily: font.medium, fontSize: font.size.xs },
  pro: { borderWidth: 1, borderRadius: radius.lg, padding: space[6], marginTop: space[10] },
  proHead: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[2] },
  proName: { fontFamily: font.medium, fontSize: 13 },
  proBody: { fontFamily: font.family, fontSize: 11, lineHeight: 18 },
  proNote: { fontFamily: font.family, fontSize: 10, marginTop: space[3] },
  archivedRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: 1 },
  archivedName: { flex: 1, fontFamily: font.family, fontSize: font.size.sm },
  deleteBtn: { minHeight: TOUCH, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: radius.md, marginTop: space[4] },
  foot: { marginTop: space[10], fontSize: 10, fontFamily: font.family, textAlign: 'center' },
  toast: { position: 'absolute', left: space[6], right: space[6], bottom: space[8], padding: space[4], borderRadius: radius.md, borderWidth: 1 },
});
