import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { aggregate, consistency, monthRange, parseKey } from '@/src/engine';
import { formatMonthYear, t } from '@/src/i18n';
import { useAppStore, useLogLookup } from '@/src/store/appStore';
import { Bar, Button, Kicker, Title } from '@/src/ui/components';
import { UIIcon } from '@/src/ui/icons';
import { MonthGrid } from '@/src/ui/month/MonthGrid';
import { shiftMonth } from '@/src/ui/month/gridModel';
import { useTheme } from '@/src/ui/theme';
import { accentRamp, font, radius, space } from '@/src/ui/tokens';

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

  const step = (delta: number, label: string, icon: 'back' | 'forward') => (
    <Pressable
      onPress={() => setYm(shiftMonth(y, m, delta))}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.step, { borderColor: pressed ? th.accent : th.line }]}>
      <UIIcon name={icon} color={th.muted} size={14} />
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.bg }]} edges={['top']}>
      <View style={styles.top}>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Kicker>{t('tabs.month')}</Kicker>
            <Title>{formatMonthYear(y, m)}</Title>
          </View>
          {step(-1, t('month.prev'), 'back')}
          {step(1, t('month.next'), 'forward')}
        </View>
        <View style={styles.barRow}>
          <View style={{ flex: 1 }}><Bar pct={overall.pct ?? 0} height={5} /></View>
          <Text style={[styles.pct, { color: accentRamp[300] }]}>{overall.pct === null ? '–' : `${overall.pct}%`}</Text>
        </View>
        <Text style={[styles.overall, { color: th.muted }]}>{`${t('month.overall')} · ${t('month.overallHelp')}`}</Text>
      </View>
      {active.length ? (
        <MonthGrid key={`${y}-${m}`} y={y} m={m} />
      ) : (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: th.text }]}>{t('today.emptyTitle')}</Text>
          <Link href="/editor" asChild><Button label={t('editor.newTitle')} /></Link>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { paddingHorizontal: space[6], paddingTop: space[5] },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  step: { width: 34, height: 34, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space[4], marginTop: space[5] },
  pct: { fontFamily: font.medium, fontSize: font.size.sm },
  overall: { fontFamily: font.family, fontSize: 10.5, marginTop: space[1], marginBottom: space[5] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[6], padding: space[8] },
  emptyText: { fontFamily: font.medium, fontSize: font.size.lg, textAlign: 'center' },
});
