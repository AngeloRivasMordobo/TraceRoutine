import { useLocalSearchParams, useRouter } from 'expo-router';
import { track } from '@/src/analytics';
import { FREE_ACTIVE_LIMIT } from '@/src/store/limits';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  activePreset,
  applyPreset,
  cycleLetters,
  cycleStep,
  daysInMonth,
  makeKey,
  monthRange,
  parseKey,
  PRESET_IDS,
  simulatePerfect,
  weekday,
  type Activity,
  type FrequencyRule,
  type FrequencyType,
  type RecordType,
} from '@/src/engine';
import { formatMonthYear, formatRelativeDay, localizedCycleSteps, t, weekdayLetters } from '@/src/i18n';
import { appStore, newId, useActivity, useAppStore } from '@/src/store/appStore';
import { Button, Seg } from '@/src/ui/components';
import { Chip, ErrorText, FieldLabel, Help, Stepper, inputStyle } from '@/src/ui/controls';
import { addCycleStep, anchorExamples, applyDuration, newDraft, previewSummary, removeCycleStep, toggleWeekday, validateDraft, type DraftError } from '@/src/ui/editor/editorModel';
import { ActivityIcon, ICON_KEYS, UIIcon } from '@/src/ui/icons';
import { shiftMonth } from '@/src/ui/month/gridModel';
import { useTheme } from '@/src/ui/theme';
import { ACTIVITY_COLOR_KEYS, activityColor, activityColors, font, neutral, radius, rgba, space, TOUCH } from '@/src/ui/tokens';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Activity editor (TR-31 … TR-38). Everything the preview shows comes from the engine. */
export default function EditorScreen() {
  const { id, first: firstParam, preset: presetParam, icon, color: colorParam, name: nameParam, end: endParam } = useLocalSearchParams<{ id?: string; first?: string; preset?: string; icon?: string; color?: string; name?: string; end?: string }>();
  const existing = useActivity(id);
  const today = useAppStore((s) => s.today);
  const lang = useAppStore((s) => s.lang);
  const activeCount = useAppStore((s) => s.activities.filter((a) => !a.archived && !(a.end && a.end < s.today)).length);
  const router = useRouter();
  const th = useTheme();

  const [draft, setDraft] = useState<Activity>(() => {
    if (existing) return existing;
    let d = newDraft(newId(), today);
    if (presetParam) d = { ...d, freq: applyPreset(d.freq, presetParam as Parameters<typeof applyPreset>[1], { cycleSteps: localizedCycleSteps(lang) }) };
    if (icon) d = { ...d, icon };
    if (colorParam) d = { ...d, color: colorParam };
    if (nameParam) d = { ...d, name: nameParam };
    if (endParam === '21d') d = { ...d, end: applyDuration(today, '21d') };
    return d;
  });
  const limitReached = !existing && activeCount >= FREE_ACTIVE_LIMIT;
  const [touched, setTouched] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [stepInput, setStepInput] = useState('');
  const [pm, setPm] = useState(() => ({ y: parseKey(today).y, m: parseKey(today).m }));

  const errors = validateDraft(draft);
  const err = (e: DraftError) => (showErrors && errors.includes(e) ? t(`editor.err${e.charAt(0).toUpperCase()}${e.slice(1)}`) : null);
  const patch = (p: Partial<Activity>) => { setDraft((d) => ({ ...d, ...p })); setTouched(true); };
  const patchFreq = (fn: (f: FrequencyRule) => FrequencyRule) => { setDraft((d) => ({ ...d, freq: fn(d.freq) })); setTouched(true); };
  const f = draft.freq;
  const n = f.n ?? 2;
  const times = f.times ?? 3;
  const preset = activePreset(f);
  const isCycle = f.type === 'cycle';
  const ex = anchorExamples(n);
  const letters = weekdayLetters(lang);
  const anchor = f.anchor ?? 'calendar';

  const summary = previewSummary(draft, pm.y, pm.m, today);
  const previewLetters = (() => {
    const map = new Map<string, string>();
    if (f.type !== 'cycle') return map;
    const PL = simulatePerfect(draft, monthRange(pm.y, pm.m).last);
    const abc = cycleLetters(f.steps ?? []);
    for (const d of summary.dueDays) {
      const step = cycleStep(draft, d, PL);
      const i = step ? (f.steps ?? []).indexOf(step) : -1;
      map.set(d, i >= 0 ? abc[i] : '');
    }
    return map;
  })();

  // The editor can be the only route in the stack: first-activity replaces into it,
  // and on web it can be opened directly by URL. back() would have nothing to pop.
  const dismiss = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); };
  const save = () => {
    if (errors.length) { setShowErrors(true); return; }
    if (limitReached) {
      track('free_limit_reached', { active: activeCount });
      Alert.alert(t('settings.freeLimitTitle', { limit: FREE_ACTIVE_LIMIT }), t('settings.freeLimitBody'), [
        { text: t('editor.cancel'), style: 'cancel' },
        { text: t('settings.freeLimitArchive'), onPress: () => { dismiss(); router.push('/(tabs)/settings'); } },
        { text: t('settings.freeLimitPro'), onPress: () => { dismiss(); router.push('/(tabs)/settings'); } },
      ]);
      return;
    }
    appStore.upsertActivity({ ...draft, name: draft.name.trim(), unit: draft.unit?.trim() || null, minimal: draft.minimal?.trim() || null, reminder: draft.reminder || null });
    if (!existing) track('create_activity', { type: draft.freq.type, anchor: draft.freq.anchor ?? 'calendar', first_activity: firstParam === '1' });
    if (firstParam === '1') router.replace('/(tabs)/month');
    else dismiss();
  };
  const cancel = () => {
    if (!touched) return dismiss();
    Alert.alert(t('editor.unsaved'), undefined, [
      { text: t('editor.keepEditing'), style: 'cancel' },
      { text: t('editor.discard'), style: 'destructive', onPress: dismiss },
    ]);
  };
  const remove = () => {
    Alert.alert(t('editor.deleteConfirm', { name: draft.name }), undefined, [
      { text: t('editor.cancel'), style: 'cancel' },
      { text: t('editor.delete'), style: 'destructive', onPress: () => { appStore.deleteActivity(draft.id); dismiss(); } },
    ]);
  };
  const archive = () => { appStore.setArchived(draft.id, !draft.archived); dismiss(); };

  const anchorCard = (value: 'calendar' | 'relative', title: string, body: string) => {
    const on = anchor === value;
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: on }}
        onPress={() => patchFreq((r) => ({ ...r, anchor: value }))}
        style={[styles.opt, { borderColor: on ? th.accent : th.line, backgroundColor: on ? rgba(th.accent, 0.08) : th.surface }]}>
        <Text style={[styles.optTitle, { color: th.text }]}>{title}</Text>
        <Text style={[styles.optBody, { color: th.muted }]}>{body}</Text>
      </Pressable>
    );
  };

  const { first } = monthRange(pm.y, pm.m);
  const offset = (weekday(first) + 6) % 7;
  const daysN = daysInMonth(pm.y, pm.m);
  const color = activityColor(draft.color);
  const monthName = formatMonthYear(pm.y, pm.m).split(' ')[0];
  const summaryText = summary.flexible
    ? t('editor.previewFlex', { n: summary.count, month: monthName })
    : `${t('editor.previewDue', { n: summary.count, month: monthName })}${
        summary.dueToday
          ? ` · ${t('editor.previewToday')}${summary.next ? `, ${t('editor.previewThen', { date: formatRelativeDay(summary.next, today) })}` : ''}`
          : summary.next ? ` · ${t('editor.previewNext', { date: formatRelativeDay(summary.next, today) })}` : ''
      }`;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.bg }]} edges={['top', 'bottom']}>
      <View style={styles.head}>
        <Pressable
          onPress={cancel}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('editor.cancel')}
          style={({ pressed }) => [styles.back, { borderColor: pressed ? th.accent : th.line }]}>
          <UIIcon name="back" color={neutral[300]} size={14} />
        </Pressable>
        <Text style={[styles.title, { color: th.text }]}>{existing ? t('editor.editTitle') : t('editor.newTitle')}</Text>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <FieldLabel style={{ marginTop: 0 }}>{t('editor.name')}</FieldLabel>
          <TextInput value={draft.name} onChangeText={(v) => patch({ name: v })} placeholder={t('editor.namePlaceholder')} placeholderTextColor={th.faint} maxLength={30} autoFocus={!existing} style={inputStyle(th)} accessibilityLabel={t('editor.name')} />
          <ErrorText>{err('name')}</ErrorText>

          <FieldLabel>{t('editor.icon')}</FieldLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowGap}>
            {ICON_KEYS.map((k) => (
              <Pressable key={k} accessibilityRole="button" accessibilityLabel={t('editor.chooseIcon', { name: t(`icons.${k}`) })} accessibilityState={{ selected: draft.icon === k }} onPress={() => patch({ icon: k })}
                style={[styles.iconBtn, { borderColor: draft.icon === k ? th.accent : th.line, backgroundColor: th.surface }]}>
                <ActivityIcon name={k} color={draft.icon === k ? color : th.muted} />
              </Pressable>
            ))}
          </ScrollView>

          <FieldLabel>{t('editor.color')}</FieldLabel>
          <View style={styles.rowGap}>
            {ACTIVITY_COLOR_KEYS.map((k) => (
              <Pressable key={k} accessibilityRole="button" accessibilityLabel={t('editor.chooseColor', { name: t(`colors.${k}`) })} accessibilityState={{ selected: draft.color === k }} onPress={() => patch({ color: k })}
                style={[styles.swatch, { backgroundColor: activityColors[k] }, draft.color === k && { borderColor: activityColors[k], shadowColor: activityColors[k] }]} />
            ))}
          </View>

          <FieldLabel>{t('editor.record')}</FieldLabel>
          <Seg<RecordType>
            options={[{ value: 'check', label: t('editor.recordCheck') }, { value: 'minutes', label: t('editor.recordMinutes') }, { value: 'amount', label: t('editor.recordAmount') }]}
            value={draft.record}
            onChange={(v) => patch({ record: v })}
          />
          {draft.record === 'amount' && (
            <>
              <TextInput value={draft.unit ?? ''} onChangeText={(v) => patch({ unit: v })} placeholder={t('editor.unitPlaceholder')} placeholderTextColor={th.faint} style={[inputStyle(th), { marginTop: space[3] }]} />
              <ErrorText>{err('unit')}</ErrorText>
            </>
          )}

          <FieldLabel>{t('editor.minimal')}</FieldLabel>
          <TextInput value={draft.minimal ?? ''} onChangeText={(v) => patch({ minimal: v })} placeholder={t('editor.minimalPlaceholder')} placeholderTextColor={th.faint} maxLength={40} style={inputStyle(th)} />
          <Help>{t('editor.minimalHelp')}</Help>

          <FieldLabel>{t('editor.frequency')}</FieldLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowGap}>
            {PRESET_IDS.map((p) => (
              <Chip key={p} label={t(`presets.${p}`)} on={preset === p} onPress={() => patchFreq((r) => applyPreset(r, p, { cycleSteps: localizedCycleSteps(lang) }))} />
            ))}
          </ScrollView>
          <View style={{ marginTop: space[3] }}>
            <Seg<FrequencyType>
              options={[
                { value: 'daily', label: t('editor.typeDaily') },
                { value: 'everyN', label: t('editor.typeEveryN') },
                { value: 'weekdays', label: t('editor.typeWeekdays') },
                { value: 'perWeek', label: t('editor.typePerWeek') },
                { value: 'cycle', label: t('editor.typeCycle') },
              ]}
              value={f.type}
              onChange={(v) => patchFreq((r) => ({ ...r, type: v }))}
            />
          </View>
          <Help>{t('freq.neverPaid')}</Help>

          {f.type === 'everyN' && (
            <View style={[styles.rowGap, { alignItems: 'center', marginTop: space[4] }]}>
              <Text style={{ color: th.text }}>{t('editor.every')}</Text>
              <Stepper value={n} min={1} max={30} onChange={(v) => patchFreq((r) => ({ ...r, n: v }))} accessibilityLabel={t('editor.days')} />
              <Text style={{ color: th.text }}>{t('editor.days')}{n === 2 ? ` (${t('freq.everyOtherDay').toLowerCase()})` : n === 1 ? ` (${t('freq.daily').toLowerCase()})` : ''}</Text>
            </View>
          )}
          {f.type === 'weekdays' && (
            <>
              <View style={[styles.rowGap, { marginTop: space[4] }]}>
                {WEEK_ORDER.map((d) => {
                  const on = (f.days ?? []).includes(d);
                  return (
                    <Pressable key={d} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => patchFreq((r) => toggleWeekday(r, d))}
                      style={[styles.dow, { backgroundColor: on ? th.accent : th.surface, borderColor: on ? th.accent : th.line }]}>
                      <Text style={{ fontFamily: font.semibold, color: on ? th.onAccent : th.muted }}>{letters[d]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <ErrorText>{err('days')}</ErrorText>
            </>
          )}
          {f.type === 'perWeek' && (
            <>
              <View style={[styles.rowGap, { alignItems: 'center', marginTop: space[4] }]}>
                <Stepper value={times} min={1} max={7} onChange={(v) => patchFreq((r) => ({ ...r, times: v }))} accessibilityLabel={t('editor.timesPerWeek')} />
                <Text style={{ color: th.text }}>{t('editor.timesPerWeek')}</Text>
              </View>
              <Help>{t('editor.youChoose')}</Help>
            </>
          )}
          {isCycle && (
            <>
              <View style={[styles.rowGap, { marginTop: space[4] }]}>
                {(f.steps ?? []).map((s, i) => (
                  <Chip key={`${s.label}-${i}`} label={`${s.label} ×`} on={!s.rest} accessibilityLabel={t('editor.removeStep', { label: s.label })} onPress={() => patchFreq((r) => removeCycleStep(r, i))} />
                ))}
              </View>
              <View style={[styles.rowGap, { marginTop: space[3], alignItems: 'center' }]}>
                <TextInput value={stepInput} onChangeText={setStepInput} placeholder={t('editor.stepPlaceholder')} placeholderTextColor={th.faint} maxLength={14} style={[inputStyle(th), { flex: 1 }]} />
                <Chip label={t('editor.addStep')} onPress={() => { patchFreq((r) => addCycleStep(r, stepInput)); setStepInput(''); }} />
                <Chip label={t('editor.addRest')} onPress={() => patchFreq((r) => addCycleStep(r, t('cycleSteps.rest'), true))} />
              </View>
              <ErrorText>{err('cycle')}</ErrorText>
            </>
          )}

          {(f.type === 'everyN' || isCycle) && (
            <>
              <FieldLabel>{t('anchor.title')}</FieldLabel>
              <View style={{ gap: space[3] }}>
                {isCycle
                  ? anchorCard('calendar', t('anchor.cycleCalendarTitle'), t('anchor.cycleCalendarBody'))
                  : anchorCard('calendar', t('anchor.calendarTitle'), t('anchor.calendarBody', { b: ex.b, c: ex.c }))}
                {isCycle
                  ? anchorCard('relative', t('anchor.cycleRelativeTitle'), t('anchor.cycleRelativeBody'))
                  : anchorCard('relative', t('anchor.relativeTitle'), t('anchor.relativeBody', { b: ex.b, d: ex.d, e: ex.e }))}
              </View>
              {!existing && <Help>{t('editor.anchorHelpNew')}</Help>}
            </>
          )}

          <View style={[styles.preview, { borderColor: th.line, backgroundColor: th.surface }]}>
            <View style={styles.previewHead}>
              <Pressable onPress={() => setPm(shiftMonth(pm.y, pm.m, -1))} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('month.prev')}><Text style={[styles.nav, { color: th.muted }]}>‹</Text></Pressable>
              <Text style={[styles.previewTitle, { color: th.muted }]}>{t('editor.preview', { month: formatMonthYear(pm.y, pm.m) }).toUpperCase()}</Text>
              <Pressable onPress={() => setPm(shiftMonth(pm.y, pm.m, 1))} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('month.next')}><Text style={[styles.nav, { color: th.muted }]}>›</Text></Pressable>
            </View>
            <View style={styles.mini}>
              {WEEK_ORDER.map((d) => <Text key={`h${d}`} style={[styles.miniHead, { color: th.faint }]}>{letters[d]}</Text>)}
              {Array.from({ length: offset }).map((_, i) => <View key={`o${i}`} style={styles.miniCell} />)}
              {Array.from({ length: daysN }).map((_, i) => {
                const date = makeKey(pm.y, pm.m, i + 1);
                const due = summary.dueDays.has(date);
                const inWin = date >= draft.start && (!draft.end || date <= draft.end);
                const flex = summary.flexible && inWin;
                const isToday = date === today;
                return (
                  <View key={date} style={[styles.miniCell, { borderColor: due ? color : flex ? rgba(color, 0.6) : isToday ? th.accent : 'transparent', borderStyle: flex && !due ? 'dotted' : 'solid', backgroundColor: due ? color : 'transparent', opacity: inWin ? 1 : 0.3 }]}>
                    <Text style={[styles.miniText, { color: due ? th.onAccent : isToday ? th.accent : th.muted }]}>{previewLetters.get(date) || i + 1}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={[styles.summary, { color: th.text }]}>{summaryText}</Text>
          </View>

          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <FieldLabel>{t('editor.starts')}</FieldLabel>
              <TextInput value={draft.start} onChangeText={(v) => patch({ start: v })} placeholder="2026-08-27" placeholderTextColor={th.faint} autoCapitalize="none" style={inputStyle(th)} />
              <ErrorText>{err('start')}</ErrorText>
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>{t('editor.ends')}</FieldLabel>
              <TextInput value={draft.end ?? ''} onChangeText={(v) => patch({ end: v || null })} placeholder="—" placeholderTextColor={th.faint} autoCapitalize="none" style={inputStyle(th)} />
              <ErrorText>{err('end')}</ErrorText>
            </View>
          </View>
          <View style={[styles.rowGap, { marginTop: space[3] }]}>
            <Chip label={t('editor.today')} on={draft.start === today} onPress={() => patch({ start: today })} />
            <Chip label={t('editor.duration21')} on={draft.end === applyDuration(draft.start, '21d')} onPress={() => patch({ end: applyDuration(draft.start, '21d') })} />
            <Chip label={t('editor.duration4w')} on={draft.end === applyDuration(draft.start, '4w')} onPress={() => patch({ end: applyDuration(draft.start, '4w') })} />
            <Chip label={t('editor.duration3m')} on={draft.end === applyDuration(draft.start, '3m')} onPress={() => patch({ end: applyDuration(draft.start, '3m') })} />
            <Chip label={t('editor.clearEnd')} on={!draft.end} onPress={() => patch({ end: null })} />
          </View>
          <Help>{`${t('editor.endsHelp')} ${t('editor.dateHelp')}`}</Help>

          <FieldLabel>{t('editor.reminder')}</FieldLabel>
          <View style={[styles.rowGap, { alignItems: 'center' }]}>
            <Switch value={!!draft.reminder} onValueChange={(on) => patch({ reminder: on ? '08:00' : null })} trackColor={{ true: th.accent, false: th.line }} thumbColor={th.text} />
            {!!draft.reminder && (
              <TextInput value={draft.reminder} onChangeText={(v) => patch({ reminder: v })} placeholder="08:00" placeholderTextColor={th.faint} keyboardType="numbers-and-punctuation" style={[inputStyle(th), { width: 96 }]} />
            )}
          </View>
          <ErrorText>{err('time')}</ErrorText>
          <Help>{t('editor.reminderHelp')}</Help>

          <View style={{ height: space[10] }} />
          <Button label={existing ? t('editor.save') : t('editor.create')} onPress={save} disabled={!draft.name.trim()} />
          {!draft.name.trim() && <Help>{t('editor.saveDisabled')}</Help>}
          {existing && (
            <View style={{ gap: space[3], marginTop: space[4] }}>
              <Button label={t('editor.archive')} variant="secondary" onPress={archive} />
              <Pressable onPress={remove} accessibilityRole="button" style={styles.danger}><Text style={{ fontFamily: font.medium, color: th.danger }}>{t('editor.delete')}</Text></Pressable>
            </View>
          )}
          <View style={{ height: space[12] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[6], paddingVertical: space[4] },
  back: { width: 32, height: 32, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.medium, fontSize: font.size.lg },
  body: { padding: space[6] },
  rowGap: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  iconBtn: { width: TOUCH, height: TOUCH, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  // The canvas marks the chosen colour with a ring set off from the ground.
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  dow: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  opt: { padding: space[4], borderRadius: radius.md, borderWidth: 1.5 },
  optTitle: { fontFamily: font.semibold, fontSize: font.size.md, marginBottom: 2 },
  optBody: { fontFamily: font.family, fontSize: font.size.sm },
  preview: { marginTop: space[8], borderWidth: 1, borderRadius: radius.lg, padding: space[4] },
  previewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[3] },
  previewTitle: { fontFamily: font.medium, fontSize: font.size.xs, letterSpacing: font.tracking.eyebrow },
  nav: { fontSize: 22, paddingHorizontal: space[3] },
  mini: { flexDirection: 'row', flexWrap: 'wrap' },
  miniHead: { width: `${100 / 7}%`, textAlign: 'center', fontSize: font.size.xs, marginBottom: space[1] },
  miniCell: { width: `${100 / 7}%`, aspectRatio: 1.15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: radius.sm, borderColor: 'transparent' },
  miniText: { fontFamily: font.semibold, fontSize: font.size.xs },
  summary: { fontFamily: font.family, fontSize: font.size.sm, marginTop: space[3] },
  twoCol: { flexDirection: 'row', gap: space[3] },
  danger: { minHeight: TOUCH, alignItems: 'center', justifyContent: 'center' },
});
