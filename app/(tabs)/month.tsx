import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { aggregate, consistency, monthRange, parseKey } from '@/src/engine';
import { formatMonthYear, t } from '@/src/i18n';
import { useAppStore, useLogLookup } from '@/src/store/appStore';
import { Button, Eyebrow } from '@/src/ui/components';
import { MonthGrid } from '@/src/ui/month/MonthGrid';
import { shiftMonth } from '@/src/ui/month/gridModel';
import { useTheme } from '@/src/ui/theme';
import { font, space } from '@/src/ui/tokens';

export default function MonthScreen() {
  const th = useTheme();
  const today = useAppStore((s) => s.today);
  const activities = useAppStore((s) => s.activities);
  useAppStore((s) => s.lang);
  const L = useLogLookup();
  const [{ y, m }, setYm] = useState(() => ({ y: parseKey(today).y, m: parseKey(today).m }));
  const overall = useMemo(() => {
    const { first, last } = monthRange(y, m);
    return aggregate(activities.filter((a) => !a.archived).map((a) => consistency(a, first, last, today, L)));
  }, [activities, y, m, today, L]);
  const active = activities.filter((a) => !a.archived);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.bg }]} edges={['top']}>
      <View style={styles.top}>
        <Eyebrow>{t('tabs.month')}</Eyebrow>
        <View style={styles.titleRow}>
          <Pressable onPress={() => setYm(shiftMonth(y, m, -1))} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('month.prev')}><Text style={[styles.nav, { color: th.muted }]}>‹</Text></Pressable>
          <Text style={[styles.display, { color: th.text }]}>{formatMonthYear(y, m)}</Text>
          <Pressable onPress={() => setYm(shiftMonth(y, m, 1))} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('month.next')}><Text style={[styles.nav, { color: th.muted }]}>›</Text></Pressable>
          <Text style={[styles.pct, { color: th.accent }]}>{overall.pct === null ? '–' : `${overall.pct}%`}</Text>
        </View>
        <View style={[styles.bar, { backgroundColor: th.surface2 }]}>
          <View style={[styles.barFill, { backgroundColor: th.accent, width: `${overall.pct ?? 0}%` }]} />
        </View>
        <Text style={[styles.overall, { color: th.muted }]}>{`${t('month.overall')} · ${t('month.overallHelp')}`}</Text>
      </View>
      {active.length ? (
        <MonthGrid key={`${y}-${m}`} y={y} m={m} />
      ) : (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: th.text }]}>{t('today.emptyTitle')}</Text>
          <Link href="/editor" asChild><Button label="+" /></Link>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { paddingHorizontal: space[6], paddingTop: space[6] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[2] },
  display: { flex: 1, fontFamily: font.family, fontSize: font.size.xl, fontWeight: font.weight.semibold, letterSpacing: font.tracking.tight, textAlign: 'center' },
  nav: { fontSize: 26, paddingHorizontal: space[3] },
  pct: { fontFamily: font.family, fontSize: font.size.xl, fontWeight: font.weight.semibold, minWidth: 56, textAlign: 'right' },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: space[3] },
  barFill: { height: '100%' },
  overall: { fontFamily: font.family, fontSize: font.size.xs, marginTop: space[2], marginBottom: space[3] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[6], padding: space[8] },
  emptyText: { fontFamily: font.family, fontSize: font.size.lg, fontWeight: font.weight.semibold, textAlign: 'center' },
});
