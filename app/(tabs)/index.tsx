import { Link, useRouter } from 'expo-router';
import { track } from '@/src/analytics';
import { useMemo, useState } from 'react';
import { Animated, FlatList, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cycleStep, daysBetween, doneThisWeek, dueToday, isDue, isHit, nextDue, pendingSince, type Activity, type LogLookup } from '@/src/engine';
import { formatLongDate, formatRelativeDay, formatShortDate, freqLabel, t } from '@/src/i18n';
import { appStore, useAppStore, useLog, useLogLookup } from '@/src/store/appStore';
import { Bar, Button, Card, Eyebrow, Kicker, Title } from '@/src/ui/components';
import { Sheet } from '@/src/ui/controls';
import { ActivityIcon, UIIcon } from '@/src/ui/icons';
import { LogSheet } from '@/src/ui/LogSheet';
import { useTheme } from '@/src/ui/theme';
import { activityColor, font, mix, neutral, radius, rgba, space } from '@/src/ui/tokens';

type SheetMode = 'skip' | 'value' | 'menu' | null;
const ORDER = { pending: 0, done: 1, min: 1, skip: 2 } as const;
/** The design's check is a 40 px circle at the head of the row. */
const CHECK = 40;

/**
 * Today (TR-39 … TR-47), laid out as the design canvas's "Lista" default: a large
 * check at the left of each row so the screen works one-handed, the activity and
 * its state to its right. Tap = done, long-press = minimum, swipe left = skip
 * (the canvas draws those last two as chips, noting the real app uses the gestures).
 */
export default function TodayScreen() {
  const th = useTheme();
  const today = useAppStore((s) => s.today);
  const activities = useAppStore((s) => s.activities);
  const hintDismissed = useAppStore((s) => s.hintDismissed);
  useAppStore((s) => s.lang);
  const L = useLogLookup();

  const due = useMemo(
    () => dueToday(activities, today, L).sort((a, b) => ORDER[L(a.id, today) ?? 'pending'] - ORDER[L(b.id, today) ?? 'pending']),
    [activities, today, L],
  );
  const doneCount = due.filter((a) => isHit(L(a.id, today))).length;
  const upcoming = useMemo(
    () =>
      activities
        .filter((a) => !a.archived && !isDue(a, today, L))
        .map((a) => ({ a, d: nextDue(a, today, L) }))
        .filter((x): x is { a: Activity; d: string } => !!x.d && daysBetween(today, x.d) <= 7)
        .sort((x, y) => daysBetween(y.d, x.d)),
    [activities, today, L],
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.bg }]} edges={['top']}>
      <FlatList
        data={due}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.headRow}>
              <View style={{ flex: 1 }}>
                <Kicker>{`${t('today.kicker')} · ${due.length === 1 ? t('today.dueOne') : t('today.dueCount', { n: due.length })}`}</Kicker>
                <Title>{formatLongDate(today)}</Title>
              </View>
              {due.length > 0 && (
                <Text style={[styles.count, { color: th.muted }]}>{t('today.doneOf', { done: doneCount, total: due.length })}</Text>
              )}
            </View>
            {due.length > 0 ? (
              <>
                <View style={styles.barWrap}>
                  <Bar pct={due.length ? (doneCount / due.length) * 100 : 0} height={4} solid />
                </View>
                {!hintDismissed && (
                  <View style={styles.hint}>
                    <UIIcon name="info" color={th.faint} size={13} />
                    <Text style={[styles.hintText, { color: th.faint }]}>{t('today.hint')}</Text>
                    <Pressable onPress={appStore.dismissHint} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('today.hintClose')}>
                      <Text style={{ color: th.faint, fontSize: 16 }}>×</Text>
                    </Pressable>
                  </View>
                )}
              </>
            ) : (
              <Card style={{ marginTop: space[8] }}>
                <Eyebrow>{activities.length ? t('today.freeDay') : t('app.name')}</Eyebrow>
                <Text style={[styles.freeTitle, { color: th.text }]}>{activities.length ? t('today.freeDayBody') : t('today.emptyTitle')}</Text>
                {upcoming[0] && <Text style={{ color: th.muted }}>{t('today.nextIs', { name: upcoming[0].a.name, when: formatRelativeDay(upcoming[0].d, today) })}</Text>}
              </Card>
            )}
          </View>
        }
        renderItem={({ item }) => <ActivityRow a={item} today={today} />}
        ListFooterComponent={
          <View style={{ marginTop: space[8] }}>
            {upcoming.length > 0 && <Eyebrow>{t('today.comingUp')}</Eyebrow>}
            {upcoming.map(({ a, d }) => (
              // asChild renders a Slot, which rejects an array style on its child.
              <Link key={a.id} href={{ pathname: '/editor', params: { id: a.id } }} asChild>
                <Pressable style={StyleSheet.flatten([styles.upRow, { borderBottomColor: th.line }])} accessibilityRole="button">
                  <ActivityIcon name={a.icon} color={activityColor(a.color)} size={16} />
                  <Text style={[styles.upName, { color: th.text }]}>{a.name}</Text>
                  <Text style={[styles.upWhen, { color: th.muted }]}>{formatRelativeDay(d, today)}</Text>
                </Pressable>
              </Link>
            ))}
            <Link href="/editor" asChild>
              <Button label={`+ ${t('editor.newTitle')}`} variant="secondary" style={{ marginTop: space[8] }} />
            </Link>
          </View>
        }
      />
    </SafeAreaView>
  );
}

/** Frequency, the minimum and any pending run, joined the way the design writes the sub-line. */
function subtitle(a: Activity, today: string, L: LogLookup, logged: boolean): string {
  const f = a.freq;
  const bits: string[] = [];
  if (f.type === 'cycle') bits.push(t('today.cycleToday', { step: cycleStep(a, today, L)?.label ?? '', n: f.steps?.length ?? 0 }));
  else if (f.type === 'perWeek') bits.push(t('today.thisWeek', { done: doneThisWeek(a, today, L), times: f.times ?? 1 }));
  else bits.push(freqLabel(f));
  if (a.end) bits.push(t('today.until', { date: formatShortDate(a.end) }));
  const since = pendingSince(a, today, L);
  if (since) bits.push(daysBetween(since, today) === 1 ? t('today.pendingSinceYesterday') : t('today.pendingSince', { day: Number(since.slice(-2)) }));
  if (a.minimal && !logged) bits.push(t('today.minPrefix', { text: a.minimal }));
  return bits.join(' · ');
}

function ActivityRow({ a, today }: { a: Activity; today: string }) {
  const th = useTheme();
  const router = useRouter();
  const L = useLogLookup();
  const log = useLog(a.id, today);
  const st = log?.state ?? null;
  const color = activityColor(a.color);
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [tx] = useState(() => new Animated.Value(0));
  const hit = st === 'done' || st === 'min';

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => tx.setValue(Math.max(-110, Math.min(0, g.dx))),
        onPanResponderRelease: (_, g) => {
          Animated.spring(tx, { toValue: 0, useNativeDriver: true }).start();
          if (g.dx < -70) setSheet('skip');
        },
        onPanResponderTerminate: () => Animated.spring(tx, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [tx, setSheet],
  );

  const tap = () => {
    if (st === 'done' || st === 'skip') return appStore.setLog(a.id, today, null);
    if (a.record !== 'check' && st !== 'min') return setSheet('value');
    appStore.setLog(a.id, today, 'done', { value: log?.value ?? null });
    track('complete', { type: a.freq.type });
  };
  const minimum = () => { appStore.setLog(a.id, today, 'min', { value: log?.value ?? null }); track('minimum', { type: a.freq.type }); };

  // The four check states the canvas draws: filled, bottom half, dashed, outlined.
  const check =
    st === 'done' ? { backgroundColor: color, borderColor: color }
    : st === 'min' ? { backgroundColor: 'transparent', borderColor: color }
    : st === 'skip' ? { backgroundColor: 'transparent', borderColor: th.faint, borderStyle: 'dashed' as const }
    : { backgroundColor: 'transparent', borderColor: color };
  const tag = st ? t(`states.${st}`) : '';

  return (
    <View style={[styles.rowWrap, { backgroundColor: th.surface2 }]}>
      <Text style={[styles.skipHint, { color: th.muted }]}>{t('today.skip').toUpperCase()}</Text>
      <Animated.View style={{ transform: [{ translateX: tx }] }} {...pan.panHandlers}>
        <View
          style={[
            styles.row,
            // Opaque: the swipe-to-skip label sits behind this row.
            { borderColor: hit ? rgba(color, 0.4) : th.surface2, backgroundColor: hit ? mix(th.bg, color, 0.06) : th.bg },
            st === 'skip' && { opacity: 0.55 },
          ]}>
          <Pressable
            testID={`check-${a.id}`}
            accessibilityRole="button"
            accessibilityLabel={st ? t('today.undo', { name: a.name }) : t('today.markDone', { name: a.name })}
            accessibilityActions={[{ name: 'minimum', label: t('today.didMinimum') }, { name: 'skip', label: t('today.skip') }]}
            onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'minimum' ? minimum() : setSheet('skip'))}
            onPress={tap}
            onLongPress={minimum}
            delayLongPress={450}
            style={({ pressed }) => [styles.check, check, pressed && { transform: [{ scale: 0.92 }] }]}>
            {/* The minimum fills the bottom half of the circle. */}
            {st === 'min' && <View style={[styles.checkHalf, { backgroundColor: color }]} />}
            {hit && <UIIcon name="check" color={st === 'done' ? th.onAccent : neutral[200]} size={19} weight="bold" />}
          </Pressable>
          <Pressable
            onPress={() => setSheet('menu')}
            accessibilityRole="button"
            accessibilityLabel={t('today.menu', { name: a.name })}
            style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <ActivityIcon name={a.icon} color={color} size={15} />
              <Text style={[styles.name, { color: st === 'skip' ? th.muted : th.text }]} numberOfLines={1}>{a.name}</Text>
              {!!tag && (
                <View style={[styles.tag, { borderColor: rgba(st === 'skip' ? th.muted : color, 0.45) }]}>
                  <Text style={[styles.tagText, { color: st === 'skip' ? th.muted : color }]}>{tag}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.sub, { color: th.muted }]} numberOfLines={2}>
              {st === 'skip' ? t('today.skippedToday') : subtitle(a, today, L, !!st)}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
      {(sheet === 'skip' || sheet === 'value') && <LogSheet activity={a} date={today} mode={sheet} visible onClose={() => setSheet(null)} />}
      <Sheet visible={sheet === 'menu'} onClose={() => setSheet(null)} title={a.name}>
        <Button label={t('today.didMinimum')} variant="secondary" onPress={() => { minimum(); setSheet(null); }} />
        <Button label={t('today.skip')} variant="secondary" onPress={() => setSheet('skip')} />
        <Button label={t('today.edit')} variant="ghost" onPress={() => { setSheet(null); router.push({ pathname: '/editor', params: { id: a.id } }); }} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space[6], paddingBottom: space[12] },
  headRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[4] },
  count: { fontFamily: font.family, fontSize: 11.5 },
  barWrap: { marginTop: space[5], marginBottom: space[6] },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginBottom: space[6] },
  hintText: { flex: 1, fontFamily: font.family, fontSize: font.size.xs, lineHeight: 17 },
  freeTitle: { fontFamily: font.medium, fontSize: font.size.xl, marginVertical: space[3] },
  rowWrap: { borderRadius: 12, marginBottom: space[3], overflow: 'hidden', justifyContent: 'center' },
  skipHint: { position: 'absolute', right: space[6], fontFamily: font.semibold, fontSize: font.size.xs, letterSpacing: font.tracking.eyebrow },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12 },
  check: { width: CHECK, height: CHECK, borderRadius: CHECK / 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  checkHalf: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { fontFamily: font.medium, fontSize: 13.5, flexShrink: 1 },
  tag: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontFamily: font.medium, fontSize: 9 },
  sub: { fontFamily: font.family, fontSize: 11, marginTop: 3 },
  upRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[4], borderBottomWidth: 1 },
  upName: { flex: 1, fontFamily: font.medium, fontSize: font.size.sm },
  upWhen: { fontFamily: font.family, fontSize: font.size.xs },
});
