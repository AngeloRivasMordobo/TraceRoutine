import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { t } from '@/src/i18n';
import { Button, Eyebrow } from '@/src/ui/components';
import { useTheme } from '@/src/ui/theme';
import { font, space } from '@/src/ui/tokens';

/** Modal shell for the activity editor. Fields, presets and the live preview are TR-31 to TR-38 (Wave 2). */
export default function EditorScreen() {
  const th = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.screen, { backgroundColor: th.bg }]}>
      <Eyebrow>{t('editor.frequency')}</Eyebrow>
      <Text style={[styles.title, { color: th.text }]}>{t('editor.newTitle')}</Text>
      <Text style={{ color: th.muted, marginBottom: space[8] }}>{t('freq.neverPaid')}</Text>
      <Button label={t('editor.cancel')} variant="secondary" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: space[6], paddingTop: space[12] },
  title: { fontFamily: font.family, fontSize: font.size.xl, fontWeight: font.weight.semibold, marginVertical: space[3] },
});
