import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cycleStep, doneThisWeek, dueToday, isDue, nextDue, pendingSince, daysBetween, type Activity } from '@/src/engine';
import { formatLongDate, formatRelativeDay, formatShortDate, freqLabel, t } from '@/src/i18n';
import { appStore, useAppStore, useLogLookup } from '@/src/store/appStore';
import { Button, Card, Eyebrow } from '@/src/ui/components';
import { useTheme } from '@/src/ui/theme';
import { activityColors, font, radius, rgba, space, TOUCH, type ActivityColor } from '@/src/ui/tokens';

export default function TodayScreen() {
  const th = useTheme();
  const today = useAppStore((s) => s.today);
  const activities = useAppStore((s) => s.activities);
  useAppStore((s) => s.lang);
  const L = useLogLookup();

  const due = dueToday(activities, today, L);
  const doneCount = due.filter((a) => ['done', 'min'].includes(L(a.id, today) ?? '')).length;
  const upcoming = activities
    .filter((a) => !a.archived && !isDue(a, today, L))
    .map((a) => ({ a, d: nextDue(a, today, L) }))
    .filter((x): x is { a: Activity; d: string } => !!x.d && daysBetween(today, x.d) <= 7)
    .sort((x, y) => daysBetween(y.d, x.d));

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
            ) : (
              <Card style={{ marginTop: space[8] }}>
                <Eyebrow>{t('today.freeDay')}</Eyebrow>
                <Text style={[styles.freeTitle, { color: th.text }]}>{t('today.freeDayBody')}</Text>
                {upcoming[0] && (
                  <Text style={{ color: th.muted }}>{t('today.nextIs', { name: upcoming[0].a.name, when: formatRelativeDay(upcoming[0].d, today) })}</Text>
                )}
              </Card>
            )}
          </View>
        }
        renderItem={({ item }) => <ActivityCard a={item} today={today} />}
        ListFooterComponent={
          <View style={{ marginTop: space[8] }}>
            {upcoming.length > 0 && <Eyebrow>{t('today.comingUp')}</Eyebrow>}
            {upcoming.map(({ a, d }) => (
              <View key={a.id} style={[styles.upRow, { borderBottomColor: th.line }]}>
                <Text style={[styles.upName, { color: th.text }]}>{a.name}</Text>
                <Text style={[styles.upWhen, { color: th.muted }]}>{formatRelativeDay(d, today)}</Text>
              </View>
            ))}
            <Link href="/editor" asChild>
              <Button label="+" variant="secondary" style={{ marginTop: space[8] }} />
            </Link>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function subtitle(a: Activity, today: string, L: ReturnType<typeof useLogLookup>): string {
  const f = a.freq;
  let s: string;
  if (f.type === 'cycle') s = t('today.cycleToday', { step: cycleStep(a, today, L)?.label ?? '', n: f.steps?.length ?? 0 });
  else if (f.type === 'perWeek') s = t('today.thisWeek', { done: doneThisWeek(a, today, L), times: f.times ?? 1 });
  else s = freqLabel(f);
  if (a.end) s += ` · ${t('today.until', { date: formatShortDate(a.end) })}`;
  const since = pendingSince(a, today, L);
  if (since) s += ` · ${daysBetween(since, today) === 1 ? t('today.pendingSinceYesterday') : t('today.pendingSince', { day: since.slice(-2) })}`;
  return s;
}

function ActivityCard({ a, today }: { a: Activity; today: string }) {
  const th = useTheme();
  const L = useLogLookup();
  const st = L(a.id, today);
  const color = activityColors[a.color as ActivityColor] ?? th.accent;
  const glyph = st === 'done' ? '✓' : st === 'min' ? '½' : st === 'skip' ? '—' : '';
  return (
    <Card style={[styles.card, st === 'done' && { borderColor: rgba(color, 0.4) }]}>
      <View style={[styles.icon, { backgroundColor: rgba(color, 0.14) }]}>
        <Text style={{ color, fontWeight: font.weight.semibold }}>{a.name.charAt(0)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: th.text }]}>{a.name}</Text>
        <Text style={[styles.sub, { color: th.muted }]} numberOfLines={2}>
          {st === 'skip' ? t('today.skippedToday') : subtitle(a, today, L)}
        </Text>
        {!!a.minimal && st !== 'skip' && <Text style={[styles.min, { color: th.faint }]}>{t('today.minPrefix', { text: a.minimal })}</Text>}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={st ? t('today.undo', { name: a.name }) : t('today.markDone', { name: a.name })}
        onPress={() => appStore.setLog(a.id, today, st === 'done' ? null : 'done')}
        onLongPress={() => appStore.setLog(a.id, today, 'min')}
        delayLongPress={450}
        style={({ pressed }) => [
          styles.pad,
          { borderColor: st === 'skip' ? th.faint : color, backgroundColor: st === 'done' ? color : st === 'min' ? rgba(color, 0.45) : 'transparent' },
          pressed && { transform: [{ scale: 0.92 }] },
        ]}>
        <Text style={{ color: st === 'done' ? th.onAccent : color, fontSize: font.size.lg, fontWeight: font.weight.bold }}>{glyph}</Text>
      </Pressable>
    </Card>
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
  freeTitle: { fontFamily: font.family, fontSize: font.size.xl, fontWeight: font.weight.semibold, marginVertical: space[3] },
  card: { flexDirection: 'row', alignItems: 'center', gap: space[4], marginBottom: space[3], padding: space[4] },
  icon: { width: TOUCH, height: TOUCH, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: font.family, fontSize: font.size.lg, fontWeight: font.weight.semibold },
  sub: { fontFamily: font.family, fontSize: font.size.sm, marginTop: 2 },
  min: { fontFamily: font.family, fontSize: font.size.xs, marginTop: 2 },
  pad: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  upRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space[4], borderBottomWidth: 1 },
  upName: { fontFamily: font.family, fontSize: font.size.md, fontWeight: font.weight.semibold },
  upWhen: { fontFamily: font.family, fontSize: font.size.sm },
});
