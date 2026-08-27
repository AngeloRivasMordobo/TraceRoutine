import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '@/src/i18n';
import { useAppStore } from '@/src/store/appStore';
import { Eyebrow } from '@/src/ui/components';
import { useTheme } from '@/src/ui/theme';
import { font, space } from '@/src/ui/tokens';

/** Wave 3 (TR-55). Empty state only. */
export default function StatsScreen() {
  const th = useTheme();
  useAppStore((s) => s.lang);
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.bg }]} edges={['top']}>
      <View style={styles.content}>
        <Eyebrow>{t('tabs.stats')}</Eyebrow>
        <Text style={[styles.display, { color: th.text }]}>{t('stats.title')}</Text>
        <Text style={{ color: th.muted, marginTop: space[6] }}>{t('stats.tooEarly')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space[6] },
  display: { fontFamily: font.family, fontSize: font.size.display, fontWeight: font.weight.semibold, letterSpacing: font.tracking.tight, marginTop: space[2] },
});
