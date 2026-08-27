import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseKey, type DateKey } from '@/src/engine';
import { formatMonthYear, formatShortDate, monthNames, t, weekdayNames } from '@/src/i18n';
import { bestMonth, monthStats, weekdayPattern, weeklyTrend } from '@/src/stats/statsModel';
import { useAppStore, useLogLookup } from '@/src/store/appStore';
import { Card, Eyebrow } from '@/src/ui/components';
import { ActivityIcon } from '@/src/ui/icons';
import { shiftMonth } from '@/src/ui/month/gridModel';
import { useTheme } from '@/src/ui/theme';
import { activityColors, font, radius, rgba, space, type ActivityColor } from '@/src/ui/tokens';

/** Stats (TR-55 … TR-57): consistency over scheduled days, patterns, 12-week trend. */
export default function StatsScreen() {
  const th = useTheme();
  const today = useAppStore((s) => s.today);
  const activities = useAppStore((s) => s.activities);
  const lang = useAppStore((s) => s.lang);
  const L = useLogLookup();
  const [{ y, m }, setYm] = useState(() => ({ y: parseKey(today).y, m: parseKey(today).m }));
  const [selected, setSelected] = useState<string | null>(null);

  const month = useMemo(() => monthStats(activities, y, m, today, L), [activities, y, m, today, L]);
  const scope = selected ? activities.filter((a) => a.id === selected) : activities.filter((a) => !a.archived);
  const best = useMemo(() => bestMonth(scope, today, L), [scope, today, L]);
  const pattern = useMemo(() => weekdayPattern(scope, today, L), [scope, today, L]);
  const trend = useMemo(() => weeklyTrend(scope, today, L), [scope, today, L]);
  const days = weekdayNames(lang);
  const months = monthNames(lang);
  const hasData = month.rows.some((r) => r.consistency.expected > 0) || trend.enough;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Eyebrow>{t('tabs.stats')}</Eyebrow>
        <Text style={[styles.display, { color: th.text }]}>{t('stats.title')}</Text>

        <View style={styles.monthRow}>
          <Pressable onPress={() => setYm(shiftMonth(y, m, -1))} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('month.prev')}><Text style={[styles.nav, { color: th.muted }]}>‹</Text></Pressable>
          <Text style={[styles.monthTitle, { color: th.muted }]}>{t('stats.month', { month: formatMonthYear(y, m) })}</Text>
          <Pressable onPress={() => setYm(shiftMonth(y, m, 1))} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('month.next')}><Text style={[styles.nav, { color: th.muted }]}>›</Text></Pressable>
        </View>
        <Text style={[styles.big, { color: th.accent }]} accessibilityLabel={`${month.overall.pct ?? 0}%`}>{month.overall.pct === null ? '–' : `${month.overall.pct}%`}</Text>
        <Text style={[styles.help, { color: th.muted }]}>{t('stats.monthHelp')}</Text>

        {!hasData ? (
          <Card style={{ marginTop: space[8] }}><Text style={{ color: th.muted }}>{t('stats.tooEarly')}</Text></Card>
        ) : (
          <>
            <Eyebrow>{t('stats.perActivity')}</Eyebrow>
            {month.rows.map(({ activity: a, consistency: c }) => {
              const color = activityColors[a.color as ActivityColor] ?? th.accent;
              const on = selected === a.id;
              return (
                <Pressable key={a.id} onPress={() => setSelected(on ? null : a.id)} accessibilityRole="button" accessibilityState={{ selected: on }}
                  style={[styles.row, { borderColor: on ? color : th.line, backgroundColor: on ? rgba(color, 0.08) : th.surface }]}>
                  <ActivityIcon name={a.icon} color={color} size={18} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowTop}>
                      <Text style={[styles.rowName, { color: th.text }]} numberOfLines={1}>{a.name}{a.archived ? ` · ${t('stats.archived')}` : ''}</Text>
                      <Text style={[styles.rowPct, { color }]}>{c.pct === null ? '–' : `${c.pct}%`}</Text>
                    </View>
                    <View style={[styles.bar, { backgroundColor: th.surface2 }]}><View style={[styles.barFill, { backgroundColor: color, width: `${c.pct ?? 0}%` }]} /></View>
                    <Text style={[styles.rowSub, { color: th.muted }]}>{t('stats.ofExpected', { hits: c.hits, expected: c.expected })}</Text>
                  </View>
                </Pressable>
              );
            })}

            <Eyebrow>{t('stats.patterns')}</Eyebrow>
            <Card>
              <Stat label={t('stats.bestMonth')} value={best ? t('stats.bestMonthValue', { month: months[best.m - 1], pct: best.pct }) : '–'} />
              {pattern.enough ? (
                <>
                  <Stat label={t('stats.bestDay')} value={pattern.best === null ? '–' : t('stats.bestDayValue', { day: days[pattern.best] })} />
                  <Stat label={t('stats.worstDay')} value={pattern.worst === null ? '–' : t('stats.worstDayValue', { day: days[pattern.worst] })} last />
                </>
              ) : (
                <Text style={[styles.help, { color: th.muted, marginTop: space[3] }]}>{t('stats.tooEarlyPatterns')}</Text>
              )}
            </Card>

            <Eyebrow>{t('stats.trend')}</Eyebrow>
            <Card>
              {trend.enough ? (
                <>
                  <View style={styles.chart} accessible accessibilityLabel={trendSummary(trend, lang)}>
                    {trend.points.map((p) => (
                      <View key={p.weekStart} style={styles.colWrap}>
                        <View style={[styles.col, { height: `${Math.max(4, p.pct ?? 0)}%`, backgroundColor: p.partial ? rgba(th.accent, 0.45) : p.pct === null ? th.surface2 : th.accent }]} />
                      </View>
                    ))}
                  </View>
                  <View style={styles.axis}>
                    <Text style={[styles.axisText, { color: th.faint }]}>{t('stats.trendAgo')}</Text>
                    <Text style={[styles.axisText, { color: th.faint }]}>{t('stats.trendNow')}</Text>
                  </View>
                  <Text style={[styles.help, { color: th.muted, marginTop: space[3] }]}>{trendSummary(trend, lang)}</Text>
                </>
              ) : (
                <Text style={{ color: th.muted }}>{t('stats.tooEarlyTrend')}</Text>
              )}
            </Card>
          </>
        )}
        <View style={{ height: space[12] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function trendSummary(trend: ReturnType<typeof weeklyTrend>, lang: 'es' | 'en'): string {
  if (!trend.enough || trend.first === null || trend.last === null || !trend.bestWeek) return t('stats.tooEarlyTrend');
  return t('stats.trendSummary', { first: trend.first, last: trend.last, best: formatShortDate(trend.bestWeek as DateKey, lang) });
}

function Stat({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const th = useTheme();
  return (
    <View style={[styles.stat, !last && { borderBottomWidth: 1, borderBottomColor: th.line }]}>
      <Text style={[styles.statLabel, { color: th.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: th.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space[6] },
  display: { fontFamily: font.family, fontSize: font.size.display, fontWeight: font.weight.semibold, letterSpacing: font.tracking.tight, marginTop: space[2] },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[8] },
  monthTitle: { flex: 1, textAlign: 'center', fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.medium, letterSpacing: font.tracking.eyebrow, textTransform: 'uppercase' },
  nav: { fontSize: 24, paddingHorizontal: space[3] },
  big: { fontFamily: font.family, fontSize: 48, fontWeight: font.weight.semibold, letterSpacing: font.tracking.tight, textAlign: 'center', marginTop: space[2] },
  help: { fontFamily: font.family, fontSize: font.size.sm, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[4], padding: space[4], borderRadius: radius.md, borderWidth: 1, marginBottom: space[2] },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { flex: 1, fontFamily: font.family, fontSize: font.size.md, fontWeight: font.weight.semibold },
  rowPct: { fontFamily: font.family, fontSize: font.size.md, fontWeight: font.weight.semibold },
  bar: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: space[2] },
  barFill: { height: '100%' },
  rowSub: { fontFamily: font.family, fontSize: font.size.xs, marginTop: space[1] },
  stat: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space[3] },
  statLabel: { fontFamily: font.family, fontSize: font.size.sm },
  statValue: { fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.semibold },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 96, gap: space[1] },
  colWrap: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  col: { borderRadius: 3 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2] },
  axisText: { fontFamily: font.family, fontSize: font.size.xs },
});
