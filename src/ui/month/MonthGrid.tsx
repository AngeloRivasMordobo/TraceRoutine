/**
 * Month grid (TR-48 … TR-54) in the design canvas's orientation: one row per
 * activity, one column per day. Each row carries the activity's icon, name,
 * frequency and month percentage; a day strip labels day 1, every fifth day and
 * today; the week break is the wider gap after each Sunday. Tapping a cell cycles
 * the log state, long-press opens the full edit sheet, the row header opens the editor.
 */
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { track } from '../../analytics';
import { nextLogState, type Activity, type CellState, type DateKey } from '../../engine';
import { formatShortDate, freqLabel, t } from '../../i18n';
import { appStore, useAppStore, useLogLookup } from '../../store/appStore';
import { Cell } from '../Cell';
import { ActivityIcon, UIIcon } from '../icons';
import { LogSheet } from '../LogSheet';
import { useTheme } from '../theme';
import { activityColor, font, space } from '../tokens';
import { buildMonthGrid } from './gridModel';

/** Cell metrics from the canvas: a 9.5 px cell, 1.5 px apart, 3.5 px after Sunday. */
const GAP = 1.5;
const WEEK_GAP = 3.5;
const MAX_CELL = 13;
const H_PAD = space[6];

export function MonthGrid({ y, m }: { y: number; m: number }) {
  const th = useTheme();
  const router = useRouter();
  const today = useAppStore((s) => s.today);
  const activities = useAppStore((s) => s.activities);
  useAppStore((s) => s.lang); // re-render on language change
  const L = useLogLookup();
  const { width } = useWindowDimensions();
  const grid = useMemo(() => buildMonthGrid(activities, y, m, today, L), [activities, y, m, today, L]);
  const [sheet, setSheet] = useState<{ activity: Activity; date: DateKey } | null>(null);

  const onCell = useCallback((a: Activity, date: DateKey) => {
    const next = nextLogState(L(a.id, date));
    appStore.setLog(a.id, date, next);
    if (date !== today) track('edit_past', { state: next ?? 'empty' });
  }, [L, today]);

  // Fit the month across the width the phone actually has, keeping the design's gaps.
  const n = grid.days.length;
  const weekBreaks = grid.days.filter((d, i) => d.isWeekEnd && i < n - 1).length;
  const gaps = (n - 1) * GAP + weekBreaks * (WEEK_GAP - GAP);
  const size = Math.min(MAX_CELL, Math.max(6, (width - H_PAD * 2 - gaps) / n));
  const gapAfter = (i: number) => (i === n - 1 ? 0 : grid.days[i].isWeekEnd ? WEEK_GAP : GAP);

  const legendStates: CellState[] = ['done', 'min', 'skip', 'pending', 'missed', 'none'];

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.dayStrip}>
          {grid.days.map((d, i) => (
            <View key={d.day} style={{ width: size, marginRight: gapAfter(i) }}>
              <Text
                numberOfLines={1}
                style={[styles.dayLabel, { color: d.isToday ? th.accent : th.muted, fontSize: Math.min(8.5, size * 0.8) }]}>
                {d.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ gap: space[5] }}>
          {grid.rows.map(({ activity, consistency, cells }) => {
            const hue = activityColor(activity.color);
            return (
              <View key={activity.id}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={activity.name}
                  onPress={() => router.push({ pathname: '/editor', params: { id: activity.id } })}
                  style={styles.rowHead}>
                  <ActivityIcon name={activity.icon} color={hue} size={14} />
                  <Text style={[styles.rowName, { color: th.text }]} numberOfLines={1}>{activity.name}</Text>
                  <Text style={[styles.rowFreq, { color: th.muted }]} numberOfLines={1}>{freqLabel(activity.freq)}</Text>
                  <Text style={[styles.rowPct, { color: hue }]}>{consistency.pct === null ? '–' : `${consistency.pct}%`}</Text>
                </Pressable>
                <View style={styles.cells}>
                  {cells.map((c, i) => (
                    <View key={c.date} style={{ marginRight: gapAfter(i) }}>
                      <Cell
                        state={c.state}
                        color={hue}
                        letter={size >= 11 ? c.letter : ''}
                        size={size}
                        isToday={c.isToday}
                        disabled={!c.editable}
                        accessibilityLabel={t('month.cellLabel', { name: activity.name, date: formatShortDate(c.date), state: t(`states.${c.state}`) })}
                        onPress={c.editable ? () => onCell(activity, c.date) : undefined}
                        onLongPress={c.editable ? () => setSheet({ activity, date: c.date }) : undefined}
                      />
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.legend}>
          {legendStates.map((s) => (
            <View key={s} style={styles.legendItem}>
              <Cell state={s} color={th.accent} size={10} />
              <Text style={[styles.legendText, { color: th.muted }]}>{t(`states.${s}`)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.help}>
          <UIIcon name="tap" color={th.faint} size={13} />
          <Text style={[styles.helpText, { color: th.faint }]}>{t('month.tapHelp')}</Text>
        </View>
      </ScrollView>
      {sheet && <LogSheet activity={sheet.activity} date={sheet.date} mode="full" visible onClose={() => setSheet(null)} />}
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: H_PAD, paddingBottom: space[12] },
  dayStrip: { flexDirection: 'row', marginBottom: space[1] },
  dayLabel: { fontFamily: font.family, textAlign: 'center' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: space[1], minHeight: 20 },
  rowName: { flex: 1, fontFamily: font.medium, fontSize: font.size.sm },
  rowFreq: { fontFamily: font.family, fontSize: 10, marginRight: space[1], flexShrink: 1 },
  rowPct: { fontFamily: font.semibold, fontSize: font.size.xs },
  cells: { flexDirection: 'row' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4], marginTop: space[8] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  legendText: { fontFamily: font.family, fontSize: 10 },
  help: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], marginTop: space[4] },
  helpText: { flex: 1, fontFamily: font.family, fontSize: font.size.xs, lineHeight: 17 },
});
