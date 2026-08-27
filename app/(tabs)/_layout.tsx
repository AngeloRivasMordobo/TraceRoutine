import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import { t } from '@/src/i18n';
import { useAppStore } from '@/src/store/appStore';
import { useTheme } from '@/src/ui/theme';

const icon = (name: SymbolViewProps['name']) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <SymbolView name={name} tintColor={color} size={24} />;
  };

export default function TabLayout() {
  const th = useTheme();
  useAppStore((s) => s.lang); // re-render on language change
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: th.accent,
        tabBarInactiveTintColor: th.muted,
        tabBarStyle: { backgroundColor: th.surface, borderTopColor: th.line },
        sceneStyle: { backgroundColor: th.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.today'), tabBarIcon: icon({ ios: 'sun.max', android: 'today', web: 'today' }) }} />
      <Tabs.Screen name="month" options={{ title: t('tabs.month'), tabBarIcon: icon({ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }) }} />
      <Tabs.Screen name="stats" options={{ title: t('tabs.stats'), tabBarIcon: icon({ ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' }) }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: icon({ ios: 'gearshape', android: 'settings', web: 'settings' }) }} />
    </Tabs>
  );
}
