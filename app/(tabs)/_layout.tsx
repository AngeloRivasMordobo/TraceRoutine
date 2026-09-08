import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';
import { t } from '@/src/i18n';
import { useAppStore } from '@/src/store/appStore';
import { UIIcon, type UIIconKey } from '@/src/ui/icons';
import { useTheme } from '@/src/ui/theme';
import { accentRamp, font, rgba } from '@/src/ui/tokens';

const icon = (name: UIIconKey) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <UIIcon name={name} color={color} size={19} weight={focused ? 'fill' : 'regular'} />;
  };

/**
 * The middle slot of the design's bottom bar: a raised circular "+" with an accent
 * ring and glow. It takes a tab slot so the four labelled tabs sit either side of
 * it, but it opens the editor rather than switching tab.
 */
function PlusTabButton() {
  const th = useTheme();
  const router = useRouter();
  return (
    <View style={styles.plusSlot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('editor.newTitle')}
        onPress={() => router.push('/editor')}
        style={({ pressed }) => [
          styles.plus,
          { backgroundColor: pressed ? rgba(th.accent, 0.14) : th.bg, borderColor: accentRamp[500], shadowColor: accentRamp[500] },
        ]}>
        <UIIcon name="plus" color={accentRamp[300]} size={18} weight="bold" />
      </Pressable>
    </View>
  );
}

export default function TabLayout() {
  const th = useTheme();
  useAppStore((s) => s.lang); // re-render on language change
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accentRamp[300],
        tabBarInactiveTintColor: th.muted,
        tabBarStyle: { backgroundColor: th.bg, borderTopColor: th.surface2 },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 9.5 },
        sceneStyle: { backgroundColor: th.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.today'), tabBarIcon: icon('today') }} />
      <Tabs.Screen name="month" options={{ title: t('tabs.month'), tabBarIcon: icon('month') }} />
      <Tabs.Screen name="new" options={{ title: '', tabBarButton: () => <PlusTabButton /> }} />
      <Tabs.Screen name="stats" options={{ title: t('tabs.stats'), tabBarIcon: icon('stats') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  plusSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  plus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14, // the canvas lifts the plus above the bar
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
