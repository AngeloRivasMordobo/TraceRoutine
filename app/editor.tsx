import { useLocalSearchParams, useRouter } from 'expo-router';
import { track } from '@/src/analytics';
import { offerReminders } from '@/src/reminders/service';
import { frequencyHelp, isActive, passesActiveLimit, type LimitRoute } from '@/src/store/limits';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
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
import { Chip, ErrorText, FieldLabel, Help, Input, Sheet, Stepper } from '@/src/ui/controls';
import { addCycleStep, anchorExamples, applyDuration, cycleLegend, newDraft, previewSummary, removeCycleStep, toggleWeekday, validateDraft, type DraftError } from '@/src/ui/editor/editorModel';
import { ActivityIcon, ICON_KEYS, UIIcon } from '@/src/ui/icons';
import { shiftMonth } from '@/src/ui/month/gridModel';
import { alertActiveLimit } from '@/src/ui/limitAlert';
import { TimeField } from '@/src/ui/TimeField';
import { useTheme } from '@/src/ui/theme';
import { ACTIVITY_COLOR_KEYS, accentRamp, activityColors, font, mix, neutral, radius, rgba, space, TOUCH } from '@/src/ui/tokens';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Activity editor (TR-31 … TR-38). Everything the preview shows comes from the engine. */
export default function EditorScreen() {
  const { id, first: firstParam, preset: presetParam, icon, color: colorParam, name: nameParam, end: endParam } = useLocalSearchParams<{ id?: string; first?: string; preset?: string; icon?: string; color?: string; name?: string; end?: string }>();
  const existing = useActivity(id);
  const today = useAppStore((s) => s.today);
  const lang = useAppStore((s) => s.lang);
  const activities = useAppStore((s) => s.activities);
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
  const [touched, setTouched] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [stepInput, setStepInput] = useState('');
  const [iconSheet, setIconSheet] = useState(false);
  // The canvas shows eight icons at once; keep the chosen one visible even when it is not one of them.
  const inlineIcons = ICON_KEYS.slice(0, 8);
  const shownIcons = (inlineIcons as readonly string[]).includes(draft.icon) ? inlineIcons : [...ICON_KEYS.slice(0, 7), draft.icon as (typeof ICON_KEYS)[number]];
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
  const freqHelp = frequencyHelp(Platform.OS);

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
  /** A button of the limit alert: close the editor and open where it leads. */
  const leaveTo = (to: NonNullable<LimitRoute>) => { dismiss(); router.push(to); };
  const save = async () => {
    if (errors.length) { setShowErrors(true); return; }
    const next = { ...draft, name: draft.name.trim(), unit: draft.unit?.trim() || null, minimal: draft.minimal?.trim() || null, reminder: draft.reminder || null };
    if (passesActiveLimit(activities, next, today)) {
      // iOS v1 sells nothing: the alert states the limit and leads to the activities, with no Pro button (TR-69).
      track('free_limit_reached', { active: activities.filter((a) => isActive(a, today)).length });
      return alertActiveLimit(leaveTo);
    }
    appStore.upsertActivity(next);
    if (!existing) track('create_activity', { type: draft.freq.type, anchor: draft.freq.anchor ?? 'calendar', first_activity: firstParam === '1' });
    // A reminder only fires once the system allows notifications: the first time, explain and ask here (TR-58).
    if (draft.reminder) await offerReminders();
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
  // Bringing an archived activity back is refused at the limit, like creating one (setArchived says so).
  const archive = () => (appStore.setArchived(draft.id, !draft.archived) ? dismiss() : alertActiveLimit(leaveTo));


  const { first } = monthRange(pm.y, pm.m);
  const offset = (weekday(first) + 6) % 7;
  const daysN = daysInMonth(pm.y, pm.m);
  const monthName = formatMonthYear(pm.y, pm.m).split(' ')[0];
  // The canvas writes a short note on the right of the preview head; for a cycle it is
  // the legend that explains the letters painted into the cells.
  const previewNote = isCycle
    ? cycleLegend(f.steps ?? [])
    : summary.flexible
      ? t('editor.previewNoteFlex')
      : anchor === 'relative'
        ? t('editor.previewNoteRelative')
        : '';
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
          <UIIcon name="back" color={th.textSoft} size={14} />
        </Pressable>
        <Text style={[styles.title, { color: th.text }]}>{existing ? t('editor.editTitle') : t('editor.newTitle')}</Text>
      </View>
      {/* iOS presents the editor as a page sheet that starts below the status bar. KeyboardAvoidingView
          measures itself against its parent, not the screen, so it fell short by that offset and the lower
          fields (unit, minimum, cycle step, dates) could stay under the keyboard. The scroll view now insets
          its content by the keyboard in screen coordinates and scrolls the focused field into view.
          On Android this is the same plain view as before. */}
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
          <FieldLabel style={{ marginTop: 0 }}>{t('editor.name')}</FieldLabel>
          <Input value={draft.name} onChangeText={(v) => patch({ name: v })} placeholder={t('editor.namePlaceholder')} maxLength={30} autoFocus={!existing}  accessibilityLabel={t('editor.name')} />
          <ErrorText>{err('name')}</ErrorText>

          <FieldLabel>{t('editor.icon')}</FieldLabel>
          <View style={[styles.rowGap, { gap: space[3] }]}>
            {shownIcons.map((k) => (
              <Pressable key={k} accessibilityRole="button" accessibilityLabel={t('editor.chooseIcon', { name: t(`icons.${k}`) })} accessibilityState={{ selected: draft.icon === k }} onPress={() => patch({ icon: k })}
                style={[styles.iconBtn, { borderColor: draft.icon === k ? th.accent : th.line, borderWidth: draft.icon === k ? 1.5 : 1, backgroundColor: draft.icon === k ? rgba(th.accent, 0.12) : 'transparent' }]}>
                <ActivityIcon name={k} color={draft.icon === k ? th.accentText : th.icon} />
              </Pressable>
            ))}
            <Chip label={t('editor.moreIcons')} on={!(inlineIcons as readonly string[]).includes(draft.icon)} onPress={() => setIconSheet(true)} />
          </View>
          <Sheet visible={iconSheet} onClose={() => setIconSheet(false)} title={t('editor.icon')}>
            <View style={[styles.rowGap, { gap: space[3] }]}>
              {ICON_KEYS.map((k) => (
                <Pressable key={k} accessibilityRole="button" accessibilityLabel={t('editor.chooseIcon', { name: t(`icons.${k}`) })} accessibilityState={{ selected: draft.icon === k }} onPress={() => { patch({ icon: k }); setIconSheet(false); }}
                  style={[styles.iconBtn, { borderColor: draft.icon === k ? th.accent : th.line, borderWidth: draft.icon === k ? 1.5 : 1, backgroundColor: draft.icon === k ? rgba(th.accent, 0.12) : 'transparent' }]}>
                  <ActivityIcon name={k} color={draft.icon === k ? th.accentText : th.icon} />
                </Pressable>
              ))}
            </View>
          </Sheet>

          <FieldLabel>{t('editor.color')}</FieldLabel>
          <View style={styles.rowGap}>
            {ACTIVITY_COLOR_KEYS.map((k) => (
              <Pressable key={k} accessibilityRole="button" accessibilityLabel={t('editor.chooseColor', { name: t(`colors.${k}`) })} accessibilityState={{ selected: draft.color === k }} onPress={() => patch({ color: k })}
                style={[styles.swatchRing, draft.color === k && { borderColor: activityColors[k] }]}>
                <View style={[styles.swatch, { backgroundColor: activityColors[k] }]} />
              </Pressable>
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
              <Input value={draft.unit ?? ''} onChangeText={(v) => patch({ unit: v })} placeholder={t('editor.unitPlaceholder')} style={[{ marginTop: space[3] }]} />
              <ErrorText>{err('unit')}</ErrorText>
            </>
          )}

          <FieldLabel>{t('editor.minimal')}</FieldLabel>
          <Input value={draft.minimal ?? ''} onChangeText={(v) => patch({ minimal: v })} placeholder={t('editor.minimalPlaceholder')} maxLength={40}  />
          <Help>{t('editor.minimalHelp')}</Help>

          <View style={[styles.rule, { borderTopColor: th.surface2 }]} />
          <Text style={[styles.sectionHeading, { color: th.accentText }]}>{t('editor.frequency')}</Text>
          {!!freqHelp && <Help>{t(freqHelp)}</Help>}
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

          {f.type === 'everyN' && (
            <View style={[styles.rowGap, { alignItems: 'center', gap: space[4], marginTop: space[4] }]}>
              <Text style={[styles.freqText, { color: th.icon }]}>{t('editor.every')}</Text>
              <Stepper value={n} min={1} max={30} onChange={(v) => patchFreq((r) => ({ ...r, n: v }))} accessibilityLabel={t('editor.days')} />
              <Text style={[styles.freqText, { color: th.icon }]}>{t('editor.days')}{n === 2 ? ` (${t('freq.everyOtherDay').toLowerCase()})` : n === 1 ? ` (${t('freq.daily').toLowerCase()})` : ''}</Text>
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
                      <Text style={{ fontFamily: font.medium, color: on ? th.onAccent : th.subtle }}>{letters[d]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <ErrorText>{err('days')}</ErrorText>
            </>
          )}
          {f.type === 'perWeek' && (
            <>
              <View style={[styles.rowGap, { alignItems: 'center', gap: space[4], marginTop: space[4] }]}>
                <Stepper value={times} min={1} max={7} onChange={(v) => patchFreq((r) => ({ ...r, times: v }))} accessibilityLabel={t('editor.timesPerWeek')} />
                <Text style={[styles.freqText, { color: th.icon }]}>{t('editor.timesPerWeek')}</Text>
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
                <Input value={stepInput} onChangeText={setStepInput} placeholder={t('editor.stepPlaceholder')} maxLength={14} style={[{ flex: 1 }]} />
                <Chip label={t('editor.addStep')} onPress={() => { patchFreq((r) => addCycleStep(r, stepInput)); setStepInput(''); }} />
                <Chip label={t('editor.addRest')} onPress={() => patchFreq((r) => addCycleStep(r, t('cycleSteps.rest'), true))} />
              </View>
              <ErrorText>{err('cycle')}</ErrorText>
            </>
          )}

          {(f.type === 'everyN' || isCycle) && (
            <>
              <FieldLabel>{t('anchor.title')}</FieldLabel>
              <Seg<'calendar' | 'relative'>
                options={[
                  { value: 'calendar', label: isCycle ? t('anchor.cycleCalendarTitle') : t('anchor.calendarTitle') },
                  { value: 'relative', label: isCycle ? t('anchor.cycleRelativeTitle') : t('anchor.relativeTitle') },
                ]}
                value={anchor}
                onChange={(v) => patchFreq((r) => ({ ...r, anchor: v }))}
              />
              <Help>{`${
                anchor === 'calendar'
                  ? isCycle ? t('anchor.cycleCalendarBody') : t('anchor.calendarBody', { b: ex.b, c: ex.c })
                  : isCycle ? t('anchor.cycleRelativeBody') : t('anchor.relativeBody', { b: ex.b, d: ex.d, e: ex.e })
              }${!existing ? ` ${t('editor.anchorHelpNew')}` : ''}`}</Help>
            </>
          )}

          <View style={[styles.preview, { borderColor: th.line }]}>
            <View style={styles.previewHead}>
              <Text style={[styles.previewTitle, { color: th.textSoft }]}>{t('editor.preview', { month: monthName.toUpperCase() })}</Text>
              {!!previewNote && <Text style={[styles.previewNote, { color: th.subtle }]}>{previewNote}</Text>}
            </View>
            <View style={styles.mini}>
              {WEEK_ORDER.map((d) => <Text key={`h${d}`} style={[styles.miniHead, { color: th.subtle }]}>{letters[d]}</Text>)}
              {Array.from({ length: offset }).map((_, i) => <View key={`o${i}`} style={styles.miniSlot} />)}
              {Array.from({ length: daysN }).map((_, i) => {
                const date = makeKey(pm.y, pm.m, i + 1);
                const due = summary.dueDays.has(date);
                const inWin = date >= draft.start && (!draft.end || date <= draft.end);
                const flex = summary.flexible && inWin;
                const isToday = date === today;
                return (
                  <View key={date} style={styles.miniSlot}>
                    <View
                      style={[
                        styles.miniCell,
                        {
                          borderColor: isToday ? th.accent : 'transparent',
                          borderWidth: isToday ? 1.5 : 0,
                          backgroundColor: due ? accentRamp[700] : flex ? mix(th.bg, accentRamp[500], 0.1) : 'transparent',
                          opacity: inWin ? 1 : 0.3,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.miniText,
                          { fontFamily: due || flex ? font.medium : font.family, color: due ? accentRamp[100] : flex ? th.accentText : th.faint },
                        ]}>
                        {previewLetters.get(date) || i + 1}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <Text style={[styles.summary, { color: th.text }]}>{summaryText}</Text>
            <View style={styles.previewNav}>
              <Pressable onPress={() => setPm(shiftMonth(pm.y, pm.m, -1))} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('month.prev')} style={[styles.previewStep, { borderColor: th.line }]}><UIIcon name="back" color={th.icon} size={13} /></Pressable>
              <Pressable onPress={() => setPm(shiftMonth(pm.y, pm.m, 1))} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('month.next')} style={[styles.previewStep, { borderColor: th.line }]}><UIIcon name="forward" color={th.icon} size={13} /></Pressable>
            </View>
          </View>

          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <FieldLabel>{t('editor.starts')}</FieldLabel>
              <Input value={draft.start} onChangeText={(v) => patch({ start: v })} placeholder="2026-08-27" autoCapitalize="none"  />
              <ErrorText>{err('start')}</ErrorText>
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>{t('editor.ends')}</FieldLabel>
              <Input value={draft.end ?? ''} onChangeText={(v) => patch({ end: v || null })} placeholder="—" autoCapitalize="none"  />
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

          <View style={[styles.rule, { borderTopColor: th.surface2 }]} />
          <View style={styles.reminderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionLabel, { color: th.text }]}>{t('editor.reminder')}</Text>
              <Text style={[styles.sectionHelp, { color: th.subtle }]}>{t('editor.reminderHelp')}</Text>
            </View>
            {!!draft.reminder && (
              <TimeField value={draft.reminder} onChange={(reminder) => patch({ reminder })} accessibilityLabel={t('editor.reminder')} />
            )}
            <Switch
              value={!!draft.reminder}
              onValueChange={(on) => patch({ reminder: on ? '08:00' : null })}
              trackColor={{ true: accentRamp[600], false: th.line }}
              thumbColor={th.name === 'dark' ? neutral[100] : th.text}
            />
          </View>
          <ErrorText>{err('time')}</ErrorText>

          <View style={{ height: space[10] }} />
          <Button label={existing ? t('editor.save') : t('editor.create')} onPress={() => void save()} disabled={!draft.name.trim()} />
          {!draft.name.trim() && <Help>{t('editor.saveDisabled')}</Help>}
          {existing && (
            <View style={{ gap: space[3], marginTop: space[4] }}>
              <Button label={t('editor.archive')} variant="secondary" onPress={archive} />
              <Pressable onPress={remove} accessibilityRole="button" style={styles.danger}><Text style={{ fontFamily: font.medium, color: th.danger }}>{t('editor.delete')}</Text></Pressable>
            </View>
          )}
          <View style={{ height: space[12] }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[6], paddingVertical: space[4] },
  back: { width: 32, height: 32, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.medium, fontSize: font.size.lg },
  body: { padding: space[6] },
  rule: { borderTopWidth: 1, marginTop: space[8] },
  sectionHeading: { fontFamily: font.medium, fontSize: font.size.sm, marginTop: space[5] },
  sectionLabel: { fontFamily: font.medium, fontSize: font.size.body },
  sectionHelp: { fontFamily: font.family, fontSize: font.size.meta, lineHeight: 17, marginTop: 2 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: space[4], marginTop: space[5] },
  rowGap: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  freqText: { fontFamily: font.family, fontSize: font.size.sm },
  iconBtn: { width: TOUCH, height: TOUCH, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  // The canvas marks the chosen colour with a ring set off from the ground by 2 px.
  swatchRing: { width: 37, height: 37, borderRadius: 18.5, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  dow: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  preview: { marginTop: space[8], borderWidth: 1, borderRadius: radius.md, paddingVertical: space[4], paddingHorizontal: space[5] },
  previewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3], marginBottom: space[3] },
  previewTitle: { flexShrink: 1, fontFamily: font.medium, fontSize: font.size.xs },
  previewNote: { fontFamily: font.family, fontSize: font.size.xs, textAlign: 'right' },
  previewNav: { flexDirection: 'row', gap: space[3], marginTop: space[3] },
  previewStep: { width: 26, height: 26, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mini: { flexDirection: 'row', flexWrap: 'wrap' },
  miniHead: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: font.medium, fontSize: font.size.micro, marginBottom: space[1] },
  miniSlot: { width: `${100 / 7}%`, padding: 2 },
  miniCell: { width: '100%', aspectRatio: 1.15, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  miniText: { fontSize: font.size.cell },
  summary: { fontFamily: font.family, fontSize: font.size.sm, marginTop: space[3] },
  twoCol: { flexDirection: 'row', gap: space[3] },
  danger: { minHeight: TOUCH, alignItems: 'center', justifyContent: 'center' },
});
