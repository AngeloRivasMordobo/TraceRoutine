/**
 * Month grid (TR-48 … TR-54): days go down, activities go across. Sticky header
 * with icon, month % and name; today row highlighted; tap cycles the log state,
 * long-press opens the full edit sheet; header tap opens the editor.
 */
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { nextLogState, type Activity, type CellState, type DateKey } from '../../engine';
import { formatShortDate, t, weekdayLetters } from '../../i18n';
import { track } from '../../analytics';
import { appStore, useAppStore, useLogLookup } from '../../store/appStore';
import { Cell } from '../Cell';
import { ActivityIcon } from '../icons';
import { LogSheet } from '../LogSheet';
import { useTheme } from '../theme';
import { activityColors, font, rgba, space, TOUCH, type ActivityColor } from '../tokens';
import { buildMonthGrid, initialRow, type GridDay } from './gridModel';

const ROW_H = 38;
const HEAD_H = 72;
const DAY_W = 54;

export function MonthGrid({ y, m }: { y: number; m: number }) {
  const th = useTheme();
  const router = useRouter();
  const today = useAppStore((s) => s.today);
  const activities = useAppStore((s) => s.activities);
  const lang = useAppStore((s) => s.lang);
  const L = useLogLookup();
  const letters = weekdayLetters(lang);
  const grid = useMemo(() => buildMonthGrid(activities, y, m, today, L), [activities, y, m, today, L]);
  const [sheet, setSheet] = useState<{ activity: Activity; date: DateKey } | null>(null);
  const listRef = useRef<FlatList<GridDay>>(null);
  const colorOf = (a: Activity) => activityColors[a.color as ActivityColor] ?? th.accent;

  const onCell = useCallback((a: Activity, date: DateKey) => {
    const next = nextLogState(L(a.id, date));
    appStore.setLog(a.id, date, next);
    if (date !== today) track('edit_past', { state: next ?? 'empty' });
  }, [L, today]);

  const header = (
    <View style={[styles.head, { backgroundColor: th.bg, borderBottomColor: th.line, height: HEAD_H }]}>
      <View style={{ width: DAY_W }} />
      {grid.columns.map(({ activity, consistency }) => (
        <Pressable
          key={activity.id}
          accessibilityRole="button"
          accessibilityLabel={activity.name}
          onPress={() => router.push({ pathname: '/editor', params: { id: activity.id } })}
          style={styles.col}>
          <ActivityIcon name={activity.icon} color={colorOf(activity)} size={20} />
          <Text style={[styles.pct, { color: colorOf(activity) }]}>{consistency.pct === null ? '–' : `${consistency.pct}%`}</Text>
          <Text style={[styles.colName, { color: th.muted }]} numberOfLines={1}>{activity.name}</Text>
        </Pressable>
      ))}
    </View>
  );

  const renderRow = ({ item }: { item: GridDay }) => (
    <View style={[styles.row, { height: ROW_H }, item.isWeekStart && { borderTopWidth: 1, borderTopColor: th.line }, item.isToday && { backgroundColor: rgba(th.accent, 0.08) }]}>
      <View style={[styles.day, { width: DAY_W }]}>
        <Text style={[styles.dayLetter, { color: item.isToday ? th.accent : item.isWeekend ? th.faint : th.muted }]}>{item.isToday ? '▸ ' : ''}{letters[item.weekday]}</Text>
        <Text style={[styles.dayNum, { color: item.isToday ? th.accent : item.isWeekend ? th.muted : th.text, opacity: item.isFuture ? 0.6 : 1 }]}>{item.day}</Text>
      </View>
      {item.cells.map((c, i) => {
        const a = grid.columns[i].activity;
        return (
          <View key={c.activityId} style={styles.col}>
            <Cell
              state={c.state}
              color={colorOf(a)}
              letter={c.letter}
              disabled={!c.editable}
              accessibilityLabel={t('month.cellLabel', { name: a.name, date: formatShortDate(item.date), state: t(`states.${c.state}`) })}
              onPress={c.editable ? () => onCell(a, item.date) : undefined}
              onLongPress={c.editable ? () => setSheet({ activity: a, date: item.date }) : undefined}
            />
          </View>
        );
      })}
    </View>
  );

  const legendStates: CellState[] = ['done', 'min', 'skip', 'missed', 'future', 'flex', 'none'];

  return (
    <>
      <FlatList
        ref={listRef}
        data={grid.days}
        keyExtractor={(d) => d.date}
        renderItem={renderRow}
        ListHeaderComponent={header}
        stickyHeaderIndices={[0]}
        initialScrollIndex={initialRow(grid)}
        getItemLayout={(_, index) => ({ length: ROW_H, offset: HEAD_H + ROW_H * index, index })}
        onScrollToIndexFailed={() => listRef.current?.scrollToOffset({ offset: 0, animated: false })}
        contentContainerStyle={{ paddingBottom: space[12] }}
        ListFooterComponent={
          <View style={styles.footer}>
            <View style={styles.legend}>
              {legendStates.map((s) => (
                <View key={s} style={styles.legendItem}>
                  <Cell state={s} color={th.accent} size={16} />
                  <Text style={[styles.legendText, { color: th.muted }]}>{t(`states.${s}`)}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.help, { color: th.muted }]}>{t('month.tapHelp')}</Text>
          </View>
        }
      />
      {sheet && <LogSheet activity={sheet.activity} date={sheet.date} mode="full" visible onClose={() => setSheet(null)} />}
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: space[2], borderBottomWidth: 1 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: TOUCH },
  pct: { fontFamily: font.family, fontSize: font.size.xs, fontWeight: font.weight.semibold, marginTop: 2 },
  colName: { fontFamily: font.family, fontSize: 9.5, paddingHorizontal: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  day: { flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingLeft: space[2] },
  dayLetter: { fontFamily: font.family, fontSize: font.size.xs, fontWeight: font.weight.medium },
  dayNum: { fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.semibold },
  footer: { paddingHorizontal: space[6], paddingTop: space[6] },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  legendText: { fontFamily: font.family, fontSize: font.size.xs },
  help: { fontFamily: font.family, fontSize: font.size.sm, marginTop: space[4] },
});
