import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '@/src/i18n';
import { useAppStore } from '@/src/store/appStore';
import { Eyebrow } from '@/src/ui/components';
import { ActivityIcon } from '@/src/ui/icons';
import { useTheme } from '@/src/ui/theme';
import { activityColors, font, radius, space, TOUCH } from '@/src/ui/tokens';

type Suggestion = { key: string; icon: string; color: string; preset: string };
const SUGGESTIONS: Suggestion[] = [
  { key: 'train', icon: 'barbell', color: 'coral', preset: 'everyOtherDay' },
  { key: 'treatment', icon: 'pill', color: 'mint', preset: 'everyOtherDay' },
  { key: 'read', icon: 'book', color: 'accent', preset: 'threePerWeek' },
  { key: 'practice', icon: 'guitar', color: 'rose', preset: 'mwf' },
];

/** Guided first activity (TR-71): one tap prefills the editor with a real, non-daily frequency. */
export default function FirstActivityScreen() {
  const th = useTheme();
  const router = useRouter();
  useAppStore((s) => s.lang);
  const open = (s?: Suggestion) => {
    const name = s ? t(`firstActivity.${s.key}`).split(/ (every|cada|3 |tres |lunes|Monday)/)[0] : '';
    router.replace({ pathname: '/editor', params: { first: '1', ...(s ? { preset: s.preset, icon: s.icon, color: s.color, name, end: s.key === 'treatment' ? '21d' : '' } : {}) } });
  };
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.bg }]}>
      <View style={styles.content}>
        <Eyebrow>{t('app.name')}</Eyebrow>
        <Text style={[styles.display, { color: th.text }]}>{t('firstActivity.title')}</Text>
        <Text style={[styles.lead, { color: th.muted }]}>{t('firstActivity.body')}</Text>
        <View style={{ marginTop: space[8], gap: space[3] }}>
          {SUGGESTIONS.map((s) => {
            const color = activityColors[s.color as keyof typeof activityColors];
            return (
              <Pressable key={s.key} onPress={() => open(s)} accessibilityRole="button" style={({ pressed }) => [styles.opt, { borderColor: th.line, backgroundColor: pressed ? th.surface2 : th.surface }]}>
                <View style={[styles.icon, { backgroundColor: `${color}24` }]}><ActivityIcon name={s.icon} color={color} /></View>
                <Text style={[styles.optText, { color: th.text }]}>{t(`firstActivity.${s.key}`)}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => open()} accessibilityRole="button" style={({ pressed }) => [styles.opt, { borderColor: th.accent, backgroundColor: pressed ? th.surface2 : 'transparent' }]}>
            <Text style={[styles.optText, { color: th.accent, textAlign: 'center', flex: 1 }]}>{t('firstActivity.other')}</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => router.replace('/(tabs)')} accessibilityRole="button" style={styles.skip}><Text style={{ color: th.muted }}>{t('firstActivity.skip')}</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, padding: space[6] },
  display: { fontFamily: font.family, fontSize: font.size.display, fontWeight: font.weight.semibold, letterSpacing: font.tracking.tight, marginTop: space[2] },
  lead: { fontFamily: font.family, fontSize: font.size.md, marginTop: space[3] },
  opt: { flexDirection: 'row', alignItems: 'center', gap: space[4], minHeight: TOUCH + 12, padding: space[4], borderRadius: radius.md, borderWidth: 1 },
  icon: { width: TOUCH, height: TOUCH, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  optText: { fontFamily: font.family, fontSize: font.size.md, fontWeight: font.weight.medium },
  skip: { alignItems: 'center', paddingVertical: space[4] },
});
