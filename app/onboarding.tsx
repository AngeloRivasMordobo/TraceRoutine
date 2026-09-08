import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { track } from '@/src/analytics';
import { t } from '@/src/i18n';
import { appStore, useAppStore } from '@/src/store/appStore';
import { Button } from '@/src/ui/components';
import { UIIcon, type UIIconKey } from '@/src/ui/icons';
import { Logo } from '@/src/ui/Logo';
import { useTheme } from '@/src/ui/theme';
import { accentRamp, activityColors, font, neutral, radius, space } from '@/src/ui/tokens';

/**
 * Three-step onboarding, as the design canvas lays it out: a brand cover, the
 * frequencies the app understands, and the minimum version. Skippable; shown once.
 */
export default function OnboardingScreen() {
  const th = useTheme();
  const router = useRouter();
  const lang = useAppStore((s) => s.lang);
  const { width } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const goTo = (i: number) => { setStep(i); scroll.current?.scrollTo({ x: i * width, animated: true }); };
  const finish = (skipped: boolean) => {
    track(skipped ? 'onboarding_skipped' : 'onboarding_completed');
    appStore.completeOnboarding();
    router.replace('/first-activity');
  };

  const freqs: { icon: UIIconKey; name: string; ex: string }[] = [
    { icon: 'repeat', name: t('onboarding.everyOther'), ex: t('onboarding.exTraining') },
    { icon: 'calendar', name: t('onboarding.mwf'), ex: t('onboarding.exPhysio') },
    { icon: 'shuffle', name: t('onboarding.threePerWeek'), ex: t('onboarding.exReading') },
    { icon: 'cycle', name: t('onboarding.cycles'), ex: t('onboarding.exCycles') },
  ];

  /** The two circles from the canvas: a full day and a minimum day. */
  const dayRow = (full: boolean, label: string, example: string) => (
    <View style={styles.dayRow}>
      <View style={[styles.circle, full ? { backgroundColor: activityColors.sky } : { borderWidth: 1.5, borderColor: activityColors.sky }]}>
        {!full && <View style={[styles.circleHalf, { backgroundColor: activityColors.sky }]} />}
        <UIIcon name="check" color={full ? th.onAccent : neutral[200]} size={full ? 17 : 15} weight="bold" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.dayLabel, { color: th.text }]}>{label}</Text>
        <Text style={[styles.dayExample, { color: th.muted }]}>{example}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.bg }]}>
      <View style={styles.top}>
        <Pressable
          onPress={() => appStore.setLang(lang === 'es' ? 'en' : 'es')}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.language')}
          style={({ pressed }) => [styles.lang, { borderColor: pressed ? accentRamp[600] : th.line }]}>
          <UIIcon name="globe" color={th.muted} size={13} />
          <Text style={[styles.langLabel, { color: th.muted }]}>{lang.toUpperCase()}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setStep(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}>
        <View style={[styles.page, styles.cover, { width }]}>
          <Logo size={16} gap={5} />
          <Text style={[styles.brand, { color: th.text }]}>{t('app.name')}</Text>
          <Text style={[styles.tagline, { color: accentRamp[300] }]}>{t('app.tagline')}</Text>
          <Text style={[styles.promise, { color: th.muted }]}>{t('app.promise')}</Text>
        </View>

        <View style={[styles.page, { width }]}>
          <Text style={[styles.h, { color: th.text }]}>{t('onboarding.freqTitle')}</Text>
          <Text style={[styles.body, { color: th.muted }]}>{t('onboarding.step1Body')}</Text>
          <View style={{ gap: space[3] }}>
            {freqs.map((f) => (
              <View key={f.name} style={[styles.freqRow, { borderColor: th.line }]}>
                <UIIcon name={f.icon} color={accentRamp[400]} size={16} />
                <Text style={[styles.freqName, { color: th.text }]}>{f.name}</Text>
                <Text style={[styles.freqEx, { color: th.faint }]}>{f.ex}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.page, { width }]}>
          <Text style={[styles.h, { color: th.text }]}>{t('onboarding.step2Title')}</Text>
          <Text style={[styles.body, { color: th.muted }]}>{t('onboarding.step2Body')}</Text>
          <View style={[styles.dayCard, { borderColor: th.line }]}>
            {dayRow(true, t('onboarding.normalDay'), t('onboarding.normalExample'))}
            {dayRow(false, t('onboarding.badDay'), t('onboarding.badExample'))}
          </View>
          <Text style={[styles.note, { color: accentRamp[300] }]}>{t('onboarding.step2Note')}</Text>
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => <View key={i} style={[styles.dot, { backgroundColor: i === step ? accentRamp[400] : th.line }]} />)}
        </View>
        <Text style={[styles.stepText, { color: th.faint }]}>{t('onboarding.step', { n: step + 1 })}</Text>
        {step === 2
          ? <Button label={t('onboarding.start')} onPress={() => finish(false)} />
          : <Button label={t('onboarding.next')} onPress={() => goTo(step + 1)} />}
        <Pressable onPress={() => finish(true)} accessibilityRole="button" style={styles.skip}>
          <Text style={{ color: th.muted, fontFamily: font.family, fontSize: font.size.sm }}>{t('onboarding.skip')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space[6], paddingTop: space[4] },
  lang: { flexDirection: 'row', alignItems: 'center', gap: space[1], borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space[4], paddingVertical: space[2] },
  langLabel: { fontFamily: font.medium, fontSize: font.size.xs },
  page: { paddingHorizontal: space[10], paddingTop: space[8], justifyContent: 'center', flexGrow: 1 },
  cover: { alignItems: 'center' },
  brand: { fontFamily: font.medium, fontSize: 30, letterSpacing: font.tracking.tight, marginTop: space[10] },
  tagline: { fontFamily: font.family, fontSize: font.size.md, marginTop: space[4], textAlign: 'center' },
  promise: { fontFamily: font.family, fontSize: font.size.sm, lineHeight: 20, marginTop: space[6], maxWidth: 250, textAlign: 'center' },
  h: { fontFamily: font.medium, fontSize: 24, letterSpacing: font.tracking.tight },
  body: { fontFamily: font.family, fontSize: font.size.sm, lineHeight: 20, marginTop: space[4], marginBottom: space[8] },
  freqRow: { flexDirection: 'row', alignItems: 'center', gap: space[4], borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space[5], paddingVertical: space[4] },
  freqName: { flex: 1, fontFamily: font.medium, fontSize: font.size.sm },
  freqEx: { fontFamily: font.family, fontSize: font.size.xs },
  dayCard: { borderWidth: 1, borderRadius: radius.md, padding: space[5], gap: space[4] },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  circle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  circleHalf: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  dayLabel: { fontFamily: font.medium, fontSize: font.size.sm },
  dayExample: { fontFamily: font.family, fontSize: font.size.xs, marginTop: 2 },
  note: { fontFamily: font.family, fontSize: 11.5, lineHeight: 18, marginTop: space[6] },
  bottom: { padding: space[6], gap: space[4], alignItems: 'stretch' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space[2] },
  dot: { width: 6, height: 6, borderRadius: 3 },
  stepText: { textAlign: 'center', fontFamily: font.family, fontSize: font.size.xs },
  skip: { alignItems: 'center', paddingVertical: space[3], borderRadius: radius.md },
});
