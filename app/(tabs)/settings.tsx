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
import { Button, Card, Eyebrow, Seg } from '@/src/ui/components';
import { Help, Sheet, inputStyle } from '@/src/ui/controls';
import { ActivityIcon } from '@/src/ui/icons';
import { useTheme, type ThemeMode } from '@/src/ui/theme';
import { activityColors, font, radius, space, TOUCH, type ActivityColor } from '@/src/ui/tokens';

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
        <Eyebrow>{t('tabs.settings')}</Eyebrow>
        <Text style={[styles.display, { color: th.text }]}>{t('settings.title')}</Text>

        <Eyebrow>{t('settings.general')}</Eyebrow>
        <Card>
          <Text style={[styles.label, { color: th.muted }]}>{t('settings.language')}</Text>
          <Seg<Lang> options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))} value={lang} onChange={(l) => { appStore.setLang(l); track('language', { lang: l }); }} />
          <Text style={[styles.label, { color: th.muted, marginTop: space[6] }]}>{t('settings.theme')}</Text>
          <Seg<ThemeMode> options={[{ value: 'dark', label: t('settings.dark') }, { value: 'light', label: t('settings.light') }, { value: 'auto', label: t('settings.auto') }]} value={themeMode} onChange={(v) => { appStore.setThemeMode(v); track('theme', { theme: v }); }} />
        </Card>

        <Eyebrow>{t('settings.reminders')}</Eyebrow>
        <Card>
          <Row label={t(`reminders.permission${perm.charAt(0).toUpperCase()}${perm.slice(1)}`)}>
            {perm === 'granted' ? null : perm === 'denied' ? <Button label={t('reminders.openSystemSettings')} variant="secondary" onPress={openSystemSettings} /> : <Button label={t('reminders.enable')} onPress={enableReminders} />}
          </Row>
          <Row label={t('settings.morningSummary')} help={t('settings.morningSummaryHelp')}>
            <Switch value={morningSummary} onValueChange={appStore.setMorningSummary} trackColor={{ true: th.accent, false: th.line }} thumbColor={th.text} />
          </Row>
          {morningSummary && (
            <Row label={t('settings.morningTime')}>
              <TextInput value={timeDraft} onChangeText={setTimeDraft} onBlur={commitTime} onSubmitEditing={commitTime} keyboardType="numbers-and-punctuation" style={[inputStyle(th), { width: 88, textAlign: 'center' }]} accessibilityLabel={t('settings.morningTime')} />
            </Row>
          )}
        </Card>

        <Eyebrow>{t('settings.data')}</Eyebrow>
        <Card>
          <Text style={[styles.count, { color: th.muted }]}>{t('settings.activeCount', { count: activeCount, limit: FREE_ACTIVE_LIMIT })}</Text>
          <Button label={t('settings.exportCsv')} variant="secondary" onPress={() => void exportCsv()} />
          <Help>{t('settings.exportCsvHelp')}</Help>
          <View style={{ height: space[4] }} />
          <Button label={t('settings.backupExport')} variant="secondary" onPress={() => void exportBackup()} />
          <View style={{ height: space[3] }} />
          <Button label={t('settings.backupImport')} variant="secondary" onPress={() => void importBackup()} />
          <Help>{t('settings.backupHelp')}</Help>
          <Text style={[styles.label, { color: th.muted, marginTop: space[6] }]}>{t('settings.archivedTitle')}</Text>
          {archived.length === 0 ? (
            <Text style={{ color: th.faint }}>{t('settings.archivedEmpty')}</Text>
          ) : (
            archived.map((a) => (
              <View key={a.id} style={[styles.archivedRow, { borderBottomColor: th.line }]}>
                <ActivityIcon name={a.icon} color={activityColors[a.color as ActivityColor] ?? th.accent} size={18} />
                <Text style={[styles.archivedName, { color: th.text }]} numberOfLines={1}>{a.name}</Text>
                <Pressable onPress={() => appStore.setArchived(a.id, false)} accessibilityRole="button" hitSlop={8}><Text style={{ color: th.accent, fontWeight: font.weight.medium }}>{t('settings.unarchive')}</Text></Pressable>
              </View>
            ))
          )}
          <View style={{ height: space[6] }} />
          <Pressable onPress={() => setDeleteStep(1)} accessibilityRole="button" style={styles.danger}><Text style={{ color: th.danger, fontWeight: font.weight.medium }}>{t('settings.deleteAll')}</Text></Pressable>
        </Card>

        <Eyebrow>{t('settings.pro')}</Eyebrow>
        <Card>
          <Text style={{ color: th.text, lineHeight: 20 }}>{t('settings.proBody')}</Text>
          <Text style={[styles.count, { color: th.muted, marginTop: space[3] }]}>{t('settings.freeLimit', { limit: FREE_ACTIVE_LIMIT, left: Math.max(0, FREE_ACTIVE_LIMIT - activeCount) })}</Text>
          <View style={{ height: space[4] }} />
          <Button label={proInterest ? t('settings.proNotified') : t('settings.notifyMe')} variant={proInterest ? 'ghost' : 'primary'} disabled={proInterest} onPress={() => { appStore.markProInterest(); track('pro_interest'); }} />
        </Card>

        <Eyebrow>{t('settings.about')}</Eyebrow>
        <Card>
          <Row label={t('settings.analytics')} help={t('settings.analyticsHelp')}>
            <Switch value={!analyticsOptOut} onValueChange={(on) => appStore.setAnalyticsOptOut(!on)} trackColor={{ true: th.accent, false: th.line }} thumbColor={th.text} />
          </Row>
          <Button label={t('settings.feedback')} variant="secondary" onPress={() => void Linking.openURL(`mailto:hola@traceroutine.app?subject=${encodeURIComponent(t('settings.feedbackSubject'))}&body=${encodeURIComponent(`\n\n— v${version} · ${Constants.platform ? Object.keys(Constants.platform)[0] : ''}`)}`)} />
          <Text style={[styles.foot, { color: th.faint }]}>{`${t('app.name')} · ${t('settings.version', { version })} · ${t('settings.localData')}`}</Text>
        </Card>
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
          <Text style={{ color: th.danger, fontWeight: font.weight.semibold }}>{t('settings.deleteAll')}</Text>
        </Pressable>
      </Sheet>
      {toast && <View style={[styles.toast, { backgroundColor: th.surface2, borderColor: th.line }]}><Text style={{ color: th.text }}>{toast}</Text></View>}
    </SafeAreaView>
  );
}

function Row({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  const th = useTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: th.text, fontFamily: font.family, fontSize: font.size.md }}>{label}</Text>
        {!!help && <Text style={{ color: th.muted, fontSize: font.size.sm, marginTop: 2 }}>{help}</Text>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space[6] },
  display: { fontFamily: font.family, fontSize: font.size.display, fontWeight: font.weight.semibold, letterSpacing: font.tracking.tight, marginTop: space[2] },
  label: { fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.medium, marginBottom: space[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[4], minHeight: TOUCH, paddingVertical: space[2] },
  count: { fontFamily: font.family, fontSize: font.size.sm, marginBottom: space[4] },
  archivedRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: 1 },
  archivedName: { flex: 1, fontFamily: font.family, fontSize: font.size.md },
  danger: { minHeight: TOUCH, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { minHeight: TOUCH, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: radius.md, marginTop: space[4] },
  foot: { marginTop: space[6], fontSize: font.size.xs, fontFamily: font.family },
  toast: { position: 'absolute', left: space[6], right: space[6], bottom: space[8], padding: space[4], borderRadius: radius.md, borderWidth: 1 },
});
