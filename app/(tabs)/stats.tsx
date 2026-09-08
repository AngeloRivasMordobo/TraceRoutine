import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';
import { parseKey, type DateKey } from '@/src/engine';
import { formatMonthYear, formatShortDate, monthNames, t, weekdayNames } from '@/src/i18n';
import { bestMonth, monthStats, weekdayPattern, weeklyTrend } from '@/src/stats/statsModel';
import { useAppStore, useLogLookup } from '@/src/store/appStore';
import { Card, Kicker, Ring, Tag, Title } from '@/src/ui/components';
import { ActivityIcon, UIIcon } from '@/src/ui/icons';
import { shiftMonth } from '@/src/ui/month/gridModel';
import { useTheme } from '@/src/ui/theme';
import { accentRamp, activityColor, font, radius, rgba, space } from '@/src/ui/tokens';

const TREND_W = 312;
const TREND_H = 72;

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

  const step = (delta: number, label: string, icon: 'back' | 'forward') => (
    <Pressable
      onPress={() => setYm(shiftMonth(y, m, delta))}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.step, { borderColor: pressed ? th.accent : th.line }]}>
      <UIIcon name={icon} color={th.muted} size={13} />
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Kicker>{t('tabs.stats')}</Kicker>
        <Title>{t('stats.title')}</Title>

        {/* The design's consistency donut, with the month it covers beside it. */}
        <View style={[styles.ringCard, { borderColor: th.line }]}>
          <Ring pct={month.overall.pct}>
            <Text style={[styles.ringPct, { color: th.text }]} accessibilityLabel={`${month.overall.pct ?? 0}%`}>
              {month.overall.pct === null ? '–' : `${month.overall.pct}%`}
            </Text>
          </Ring>
          <View style={{ flex: 1, gap: space[2] }}>
            <View style={styles.monthRow}>
              {step(-1, t('month.prev'), 'back')}
              <Text style={[styles.monthTitle, { color: th.text }]}>{formatMonthYear(y, m)}</Text>
              {step(1, t('month.next'), 'forward')}
            </View>
            <Text style={[styles.help, { color: th.muted }]}>{t('stats.monthHelp')}</Text>
            {best && <Tag label={t('stats.bestMonthValue', { month: months[best.m - 1], pct: best.pct })} tone="accent" />}
          </View>
        </View>

        {!hasData ? (
          <Card style={{ marginTop: space[8] }}><Text style={{ color: th.muted }}>{t('stats.tooEarly')}</Text></Card>
        ) : (
          <>
            <View style={styles.bars}>
              {month.rows.map(({ activity: a, consistency: c }) => {
                const color = activityColor(a.color);
                const on = selected === a.id;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => setSelected(on ? null : a.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.barRow, on && { backgroundColor: rgba(color, 0.08), borderColor: rgba(color, 0.4) }]}>
                    <View style={styles.barTop}>
                      <ActivityIcon name={a.icon} color={color} size={13} />
                      <Text style={[styles.barName, { color: th.text }]} numberOfLines={1}>
                        {a.name}{a.archived ? ` · ${t('stats.archived')}` : ''}
                      </Text>
                      <Text style={[styles.barDetail, { color: th.muted }]}>{t('stats.ofExpected', { hits: c.hits, expected: c.expected })}</Text>
                      <Text style={[styles.barPct, { color }]}>{c.pct === null ? '–' : `${c.pct}%`}</Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: th.surface2 }]}>
                      <View style={[styles.fill, { backgroundColor: color, width: `${c.pct ?? 0}%` }]} />
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Best and worst weekday, side by side as the design pairs them. */}
            <View style={styles.dayCards}>
              <View style={[styles.dayCard, { borderColor: th.line }]}>
                <Text style={[styles.dayLabel, { color: th.muted }]}>{t('stats.bestDay').toUpperCase()}</Text>
                <Text style={[styles.dayValue, { color: accentRamp[300] }]}>
                  {pattern.enough && pattern.best !== null ? days[pattern.best] : '–'}
                </Text>
              </View>
              <View style={[styles.dayCard, { borderColor: th.line }]}>
                <Text style={[styles.dayLabel, { color: th.muted }]}>{t('stats.worstDay').toUpperCase()}</Text>
                <Text style={[styles.dayValue, { color: th.text }]}>
                  {pattern.enough && pattern.worst !== null ? days[pattern.worst] : '–'}
                </Text>
              </View>
            </View>

            <View style={[styles.trendCard, { borderColor: th.line }]}>
              <Text style={[styles.trendTitle, { color: th.text }]}>{t('stats.trend')}</Text>
              {trend.enough ? (
                <>
                  <View accessible accessibilityLabel={trendSummary(trend, lang)}>
                    <TrendLine points={trend.points.map((p) => p.pct)} accent={th.accent} />
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
            </View>
          </>
        )}
        <View style={{ height: space[12] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** The design draws the 12-week trend as a line over a soft area of the same accent. */
function TrendLine({ points, accent }: { points: (number | null)[]; accent: string }) {
  const vals = points.map((p) => p ?? 0);
  if (vals.length < 2) return null;
  const stepX = TREND_W / (vals.length - 1);
  const xy = vals.map((v, i) => `${(i * stepX).toFixed(1)},${(TREND_H - (v / 100) * TREND_H).toFixed(1)}`);
  const area = [`0,${TREND_H}`, ...xy, `${TREND_W},${TREND_H}`].join(' ');
  return (
    <Svg width="100%" height={TREND_H} viewBox={`0 0 ${TREND_W} ${TREND_H}`} preserveAspectRatio="none">
      <Polyline points={area} fill={rgba(accent, 0.12)} stroke="none" />
      <Polyline points={xy.join(' ')} fill="none" stroke={accentRamp[400]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

function trendSummary(trend: ReturnType<typeof weeklyTrend>, lang: 'es' | 'en'): string {
  if (!trend.enough || trend.first === null || trend.last === null || !trend.bestWeek) return t('stats.tooEarlyTrend');
  return t('stats.trendSummary', { first: trend.first, last: trend.last, best: formatShortDate(trend.bestWeek as DateKey, lang) });
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space[6] },
  ringCard: { flexDirection: 'row', alignItems: 'center', gap: space[6], borderWidth: 1, borderRadius: radius.lg, padding: space[6], marginTop: space[8] },
  ringPct: { fontFamily: font.medium, fontSize: font.size.xl },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  monthTitle: { flex: 1, fontFamily: font.medium, fontSize: font.size.sm },
  step: { width: 26, height: 26, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  help: { fontFamily: font.family, fontSize: 11, lineHeight: 18 },
  bars: { marginTop: space[8], gap: space[4] },
  barRow: { borderWidth: 1, borderColor: 'transparent', borderRadius: radius.md, padding: space[2] },
  barTop: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: space[1] },
  barName: { flex: 1, fontFamily: font.medium, fontSize: 11.5 },
  barDetail: { fontFamily: font.family, fontSize: 10 },
  barPct: { fontFamily: font.medium, fontSize: font.size.xs, width: 38, textAlign: 'right' },
  track: { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  dayCards: { flexDirection: 'row', gap: space[4], marginTop: space[8] },
  dayCard: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingVertical: space[4], paddingHorizontal: space[5] },
  dayLabel: { fontFamily: font.family, fontSize: 10, letterSpacing: 1.2 },
  dayValue: { fontFamily: font.medium, fontSize: font.size.md, marginTop: space[2] },
  trendCard: { borderWidth: 1, borderRadius: radius.md, padding: space[5], marginTop: space[5] },
  trendTitle: { fontFamily: font.medium, fontSize: font.size.xs, marginBottom: space[4] },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[1] },
  axisText: { fontFamily: font.family, fontSize: 9.5 },
});
