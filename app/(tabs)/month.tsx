import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { aggregate, consistency, monthRange, parseKey } from '@/src/engine';
import { formatMonthYear, t } from '@/src/i18n';
import { useAppStore, useLogLookup } from '@/src/store/appStore';
import { Eyebrow } from '@/src/ui/components';
import { useTheme } from '@/src/ui/theme';
import { font, space } from '@/src/ui/tokens';

/** Wave 1 placeholder: the month header and overall consistency are real; the grid itself is TR-48 (Wave 2). */
export default function MonthScreen() {
  const th = useTheme();
  const today = useAppStore((s) => s.today);
  const activities = useAppStore((s) => s.activities);
  useAppStore((s) => s.lang);
  const L = useLogLookup();
  const { y, m } = parseKey(today);
  const { first, last } = monthRange(y, m);
  const total = aggregate(activities.filter((a) => !a.archived).map((a) => consistency(a, first, last, today, L)));
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.bg }]} edges={['top']}>
      <View style={styles.content}>
        <Eyebrow>{t('tabs.month')}</Eyebrow>
        <Text style={[styles.display, { color: th.text }]}>{formatMonthYear(y, m)}</Text>
        <Text style={[styles.pct, { color: th.accent }]}>{total.pct === null ? '–' : `${total.pct}%`}</Text>
        <Text style={{ color: th.muted }}>{`${t('month.overall')} · ${t('month.overallHelp')}`}</Text>
        <Text style={[styles.note, { color: th.faint }]}>TR-48 · Wave 2</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space[6] },
  display: { fontFamily: font.family, fontSize: font.size.display, fontWeight: font.weight.semibold, letterSpacing: font.tracking.tight, marginTop: space[2] },
  pct: { fontFamily: font.family, fontSize: 40, fontWeight: font.weight.semibold, marginTop: space[8] },
  note: { marginTop: space[10], fontSize: font.size.xs },
});
