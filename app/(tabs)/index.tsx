import { Link, useRouter } from 'expo-router';
import { track } from '@/src/analytics';
import { useMemo, useState } from 'react';
import { Animated, FlatList, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cycleStep, daysBetween, doneThisWeek, dueToday, isDue, isHit, nextDue, pendingSince, type Activity, type LogLookup } from '@/src/engine';
import { formatLongDate, formatRelativeDay, formatShortDate, freqLabel, t } from '@/src/i18n';
import { appStore, useAppStore, useLog, useLogLookup } from '@/src/store/appStore';
import { Button, Card, Eyebrow } from '@/src/ui/components';
import { Sheet } from '@/src/ui/controls';
import { ActivityIcon } from '@/src/ui/icons';
import { LogSheet } from '@/src/ui/LogSheet';
import { useTheme } from '@/src/ui/theme';
import { activityColors, font, radius, rgba, space, TOUCH, type ActivityColor } from '@/src/ui/tokens';

type SheetMode = 'skip' | 'value' | 'menu' | null;
const ORDER = { pending: 0, done: 1, min: 1, skip: 2 } as const;

/** Today (TR-39 … TR-47): only what is due, tap = done, long-press = minimum, swipe left = skip. */
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
            <Eyebrow>{`${t('today.kicker')} · ${due.length === 1 ? t('today.dueOne') : t('today.dueCount', { n: due.length })}`}</Eyebrow>
            <Text style={[styles.display, { color: th.text }]}>{formatLongDate(today)}</Text>
            {due.length > 0 ? (
              <>
                <View style={styles.progressRow}>
                  <View style={styles.segs}>
                    {due.map((a) => {
                      const st = L(a.id, today);
                      const bg = st === 'done' ? th.accent : st === 'min' ? rgba(th.accent, 0.5) : st === 'skip' ? th.faint : th.surface2;
                      return <View key={a.id} style={[styles.seg, { backgroundColor: bg, borderColor: th.line }]} />;
                    })}
                  </View>
                  <Text style={[styles.count, { color: th.muted }]}>{t('today.doneOf', { done: doneCount, total: due.length })}</Text>
                </View>
                {!hintDismissed && (
                  <View style={[styles.hint, { borderColor: th.line, backgroundColor: th.surface }]}>
                    <Text style={[styles.hintText, { color: th.muted }]}>{t('today.hint')}</Text>
                    <Pressable onPress={appStore.dismissHint} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('today.hintClose')}>
                      <Text style={{ color: th.muted, fontSize: 18 }}>×</Text>
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
        renderItem={({ item }) => <ActivityCard a={item} today={today} />}
        ListFooterComponent={
          <View style={{ marginTop: space[8] }}>
            {upcoming.length > 0 && <Eyebrow>{t('today.comingUp')}</Eyebrow>}
            {upcoming.map(({ a, d }) => (
              <Link key={a.id} href={{ pathname: '/editor', params: { id: a.id } }} asChild>
                <Pressable style={[styles.upRow, { borderBottomColor: th.line }]} accessibilityRole="button">
                  <ActivityIcon name={a.icon} color={activityColors[a.color as ActivityColor] ?? th.accent} size={18} />
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

function subtitle(a: Activity, today: string, L: LogLookup): string {
  const f = a.freq;
  let s: string;
  if (f.type === 'cycle') s = t('today.cycleToday', { step: cycleStep(a, today, L)?.label ?? '', n: f.steps?.length ?? 0 });
  else if (f.type === 'perWeek') s = t('today.thisWeek', { done: doneThisWeek(a, today, L), times: f.times ?? 1 });
  else s = freqLabel(f);
  if (a.end) s += ` · ${t('today.until', { date: formatShortDate(a.end) })}`;
  const since = pendingSince(a, today, L);
  if (since) s += ` · ${daysBetween(since, today) === 1 ? t('today.pendingSinceYesterday') : t('today.pendingSince', { day: Number(since.slice(-2)) })}`;
  return s;
}

function ActivityCard({ a, today }: { a: Activity; today: string }) {
  const th = useTheme();
  const router = useRouter();
  const L = useLogLookup();
  const log = useLog(a.id, today);
  const st = log?.state ?? null;
  const color = activityColors[a.color as ActivityColor] ?? th.accent;
  const glyph = st === 'done' ? '✓' : st === 'min' ? '½' : st === 'skip' ? '—' : '';
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [tx] = useState(() => new Animated.Value(0));

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
    [tx],
  );

  const tap = () => {
    if (st === 'done') return appStore.setLog(a.id, today, null);
    if (st === 'skip') return appStore.setLog(a.id, today, null);
    if (a.record !== 'check' && st !== 'min') return setSheet('value');
    appStore.setLog(a.id, today, 'done', { value: log?.value ?? null });
    track('complete', { type: a.freq.type });
  };
  const minimum = () => { appStore.setLog(a.id, today, 'min', { value: log?.value ?? null }); track('minimum', { type: a.freq.type }); };

  return (
    <View style={[styles.cardWrap, { backgroundColor: th.surface2 }]}>
      <Text style={[styles.skipHint, { color: th.muted }]}>{t('today.skip').toUpperCase()}</Text>
      <Animated.View style={{ transform: [{ translateX: tx }] }} {...pan.panHandlers}>
        <Card style={[styles.card, st === 'done' && { borderColor: rgba(color, 0.4) }, st === 'skip' && { opacity: 0.7 }]}>
          <Pressable
            onPress={() => setSheet('menu')}
            accessibilityRole="button"
            accessibilityLabel={t('today.menu', { name: a.name })}
            style={[styles.icon, { backgroundColor: rgba(color, 0.14) }]}>
            <ActivityIcon name={a.icon} color={color} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: th.text }]}>{a.name}</Text>
            <Text style={[styles.sub, { color: th.muted }]} numberOfLines={2}>{st === 'skip' ? t('today.skippedToday') : subtitle(a, today, L)}</Text>
            {!!a.minimal && st !== 'skip' && <Text style={[styles.min, { color: th.faint }]} numberOfLines={1}>{t('today.minPrefix', { text: a.minimal })}</Text>}
          </View>
          <Pressable
            testID={`check-${a.id}`}
            accessibilityRole="button"
            accessibilityLabel={st ? t('today.undo', { name: a.name }) : t('today.markDone', { name: a.name })}
            accessibilityActions={[{ name: 'minimum', label: t('today.didMinimum') }, { name: 'skip', label: t('today.skip') }]}
            onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'minimum' ? minimum() : setSheet('skip'))}
            onPress={tap}
            onLongPress={minimum}
            delayLongPress={450}
            style={({ pressed }) => [
              styles.pad,
              { borderColor: st === 'skip' ? th.faint : color, backgroundColor: st === 'done' ? color : st === 'min' ? rgba(color, 0.45) : 'transparent' },
              pressed && { transform: [{ scale: 0.92 }] },
            ]}>
            <Text style={{ color: st === 'done' ? th.onAccent : color, fontSize: font.size.lg, fontWeight: font.weight.bold }}>{glyph}</Text>
          </Pressable>
        </Card>
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
  display: { fontFamily: font.family, fontSize: font.size.display, fontWeight: font.weight.semibold, letterSpacing: font.tracking.tight, marginTop: space[2] },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space[4], marginVertical: space[8] },
  segs: { flex: 1, flexDirection: 'row', gap: space[1] },
  seg: { flex: 1, height: 8, borderRadius: 3, borderWidth: 1 },
  count: { fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.semibold },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', marginBottom: space[4] },
  hintText: { flex: 1, fontFamily: font.family, fontSize: font.size.sm },
  freeTitle: { fontFamily: font.family, fontSize: font.size.xl, fontWeight: font.weight.semibold, marginVertical: space[3] },
  cardWrap: { borderRadius: radius.lg, marginBottom: space[3], overflow: 'hidden', justifyContent: 'center' },
  skipHint: { position: 'absolute', right: space[6], fontFamily: font.family, fontSize: font.size.xs, fontWeight: font.weight.semibold, letterSpacing: font.tracking.eyebrow },
  card: { flexDirection: 'row', alignItems: 'center', gap: space[4], padding: space[4] },
  icon: { width: TOUCH, height: TOUCH, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: font.family, fontSize: font.size.lg, fontWeight: font.weight.semibold },
  sub: { fontFamily: font.family, fontSize: font.size.sm, marginTop: 2 },
  min: { fontFamily: font.family, fontSize: font.size.xs, marginTop: 2 },
  pad: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  upRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[4], borderBottomWidth: 1 },
  upName: { flex: 1, fontFamily: font.family, fontSize: font.size.md, fontWeight: font.weight.semibold },
  upWhen: { fontFamily: font.family, fontSize: font.size.sm },
});
