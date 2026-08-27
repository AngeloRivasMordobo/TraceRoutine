import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '@/src/i18n';
import { appStore, useAppStore } from '@/src/store/appStore';
import { Button, Card, Eyebrow } from '@/src/ui/components';
import { useTheme } from '@/src/ui/theme';
import { font, space } from '@/src/ui/tokens';

/** Two-step onboarding shell (TR-70). Copy is final; illustrations built from grid cells come in Wave 3. */
export default function OnboardingScreen() {
  const th = useTheme();
  useAppStore((s) => s.lang);
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.bg }]}>
      <View style={styles.content}>
        <Eyebrow>{t('app.name')}</Eyebrow>
        <Text style={[styles.display, { color: th.text }]}>{t('app.tagline')}</Text>
        <Text style={{ color: th.muted, marginBottom: space[10] }}>{t('app.promise')}</Text>
        <Card style={{ marginBottom: space[4] }}>
          <Text style={[styles.h, { color: th.text }]}>{t('onboarding.step1Title')}</Text>
          <Text style={{ color: th.muted }}>{t('onboarding.step1Body')}</Text>
        </Card>
        <Card>
          <Text style={[styles.h, { color: th.text }]}>{t('onboarding.step2Title')}</Text>
          <Text style={{ color: th.muted }}>{t('onboarding.step2Body')}</Text>
          <Text style={{ color: th.faint, marginTop: space[3], fontSize: font.size.sm }}>{t('onboarding.step2Note')}</Text>
        </Card>
        <View style={{ flex: 1 }} />
        <Button label={t('onboarding.start')} onPress={appStore.completeOnboarding} />
        <Button label={t('onboarding.skip')} variant="ghost" onPress={appStore.completeOnboarding} style={{ marginTop: space[3] }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, padding: space[6] },
  display: { fontFamily: font.family, fontSize: font.size.display, fontWeight: font.weight.semibold, letterSpacing: font.tracking.tight, marginVertical: space[3] },
  h: { fontFamily: font.family, fontSize: font.size.lg, fontWeight: font.weight.semibold, marginBottom: space[2] },
});
