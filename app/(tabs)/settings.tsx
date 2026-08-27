import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LANGS, t, type Lang } from '@/src/i18n';
import { appStore, useAppStore } from '@/src/store/appStore';
import { Eyebrow, Seg } from '@/src/ui/components';
import { useTheme, type ThemeMode } from '@/src/ui/theme';
import { font, space } from '@/src/ui/tokens';

/** Wave 1: language and theme switch hot; the rest of Settings is TR-63 (Wave 3). */
export default function SettingsScreen() {
  const th = useTheme();
  const lang = useAppStore((s) => s.lang);
  const themeMode = useAppStore((s) => s.themeMode);
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.bg }]} edges={['top']}>
      <View style={styles.content}>
        <Eyebrow>{t('tabs.settings')}</Eyebrow>
        <Text style={[styles.display, { color: th.text }]}>{t('settings.title')}</Text>
        <Text style={[styles.label, { color: th.muted }]}>{t('settings.language')}</Text>
        <Seg<Lang> options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))} value={lang} onChange={appStore.setLang} />
        <Text style={[styles.label, { color: th.muted }]}>{t('settings.theme')}</Text>
        <Seg<ThemeMode>
          options={[
            { value: 'dark', label: t('settings.dark') },
            { value: 'light', label: t('settings.light') },
            { value: 'auto', label: t('settings.auto') },
          ]}
          value={themeMode}
          onChange={appStore.setThemeMode}
        />
        <Text style={[styles.foot, { color: th.faint }]}>{`${t('app.name')} 0.1 · ${t('settings.localData')}`}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space[6] },
  display: { fontFamily: font.family, fontSize: font.size.display, fontWeight: font.weight.semibold, letterSpacing: font.tracking.tight, marginTop: space[2] },
  label: { fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.medium, marginTop: space[8], marginBottom: space[3] },
  foot: { marginTop: space[12], fontSize: font.size.xs },
});
