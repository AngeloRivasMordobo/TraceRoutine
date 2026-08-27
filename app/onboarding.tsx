import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { track } from '@/src/analytics';
import { LANGS, t, type Lang } from '@/src/i18n';
import { appStore, useAppStore } from '@/src/store/appStore';
import { Cell } from '@/src/ui/Cell';
import { Button, Card, Eyebrow, Seg } from '@/src/ui/components';
import { useTheme } from '@/src/ui/theme';
import { activityColors, font, radius, space } from '@/src/ui/tokens';

/** Two-step onboarding (TR-70), illustrated with the grid's own cells. Skippable; shown once. */
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
  const rowCells = (pattern: string, color: string) => (
    <View style={styles.cells}>{pattern.split('').map((c, i) => <Cell key={i} state={c === 'x' ? 'done' : c === 'h' ? 'min' : c === 't' ? 'pending' : 'none'} color={color} size={22} />)}</View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.bg }]}>
      <View style={styles.top}>
        <Eyebrow>{t('app.name')}</Eyebrow>
        <View style={{ width: 120 }}>
          <Seg<Lang> options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))} value={lang} onChange={appStore.setLang} />
        </View>
      </View>
      <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setStep(Math.round(e.nativeEvent.contentOffset.x / width))} style={{ flex: 1 }}>
        <View style={[styles.page, { width }]}>
          <Text style={[styles.display, { color: th.text }]}>{t('app.tagline')}</Text>
          <Text style={[styles.lead, { color: th.muted }]}>{t('app.promise')}</Text>
          <Card style={{ marginTop: space[8] }}>
            <Text style={[styles.h, { color: th.text }]}>{t('onboarding.step1Title')}</Text>
            <Text style={[styles.p, { color: th.muted }]}>{t('onboarding.step1Body')}</Text>
            <View style={{ marginTop: space[4], gap: space[3] }}>
              <View style={styles.example}><Text style={[styles.exLabel, { color: th.muted }]}>{t('onboarding.everyOther')}</Text>{rowCells('x.x.x.t', activityColors.coral)}</View>
              <View style={styles.example}><Text style={[styles.exLabel, { color: th.muted }]}>{t('onboarding.mwf')}</Text>{rowCells('x.x.x..', activityColors.sky)}</View>
              <View style={styles.example}><Text style={[styles.exLabel, { color: th.muted }]}>{t('onboarding.threePerWeek')}</Text>{rowCells('.x..xx.', activityColors.accent)}</View>
            </View>
          </Card>
        </View>
        <View style={[styles.page, { width }]}>
          <Text style={[styles.display, { color: th.text }]}>{t('onboarding.step2Title')}</Text>
          <Text style={[styles.lead, { color: th.muted }]}>{t('onboarding.step2Body')}</Text>
          <Card style={{ marginTop: space[8] }}>
            <View style={styles.example}><Text style={[styles.exLabel, { color: th.muted }]}>{t('onboarding.normalDay')}</Text><View style={styles.cells}><Cell state="done" color={activityColors.mint} size={26} /><Text style={{ color: th.text }}>{t('onboarding.normalExample')}</Text></View></View>
            <View style={[styles.example, { marginTop: space[4] }]}><Text style={[styles.exLabel, { color: th.muted }]}>{t('onboarding.badDay')}</Text><View style={styles.cells}><Cell state="min" color={activityColors.mint} size={26} /><Text style={{ color: th.text }}>{t('onboarding.badExample')}</Text></View></View>
            <Text style={[styles.note, { color: th.faint }]}>{t('onboarding.step2Note')}</Text>
          </Card>
        </View>
      </ScrollView>
      <View style={styles.bottom}>
        <View style={styles.dots}>{[0, 1].map((i) => <View key={i} style={[styles.dot, { backgroundColor: i === step ? th.accent : th.line }]} />)}</View>
        <Text style={[styles.stepText, { color: th.faint }]}>{t('onboarding.step', { n: step + 1 })}</Text>
        {step === 0 ? <Button label={t('onboarding.next')} onPress={() => goTo(1)} /> : <Button label={t('onboarding.start')} onPress={() => finish(false)} />}
        <Pressable onPress={() => finish(true)} accessibilityRole="button" style={styles.skip}><Text style={{ color: th.muted }}>{t('onboarding.skip')}</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space[6], paddingTop: space[4] },
  page: { padding: space[6], paddingTop: space[8] },
  display: { fontFamily: font.family, fontSize: font.size.display, fontWeight: font.weight.semibold, letterSpacing: font.tracking.tight },
  lead: { fontFamily: font.family, fontSize: font.size.md, marginTop: space[3], lineHeight: 21 },
  h: { fontFamily: font.family, fontSize: font.size.lg, fontWeight: font.weight.semibold, marginBottom: space[2] },
  p: { fontFamily: font.family, fontSize: font.size.sm, lineHeight: 19 },
  example: { gap: space[2] },
  exLabel: { fontFamily: font.family, fontSize: font.size.xs, fontWeight: font.weight.medium, letterSpacing: font.tracking.eyebrow, textTransform: 'uppercase' },
  cells: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  note: { fontFamily: font.family, fontSize: font.size.sm, marginTop: space[6] },
  bottom: { padding: space[6], gap: space[3] },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stepText: { textAlign: 'center', fontFamily: font.family, fontSize: font.size.xs },
  skip: { alignItems: 'center', paddingVertical: space[3], borderRadius: radius.md },
});
