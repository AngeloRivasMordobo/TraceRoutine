import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useAppStore } from '@/src/store/appStore';
import { ThemeProvider, useTheme } from '@/src/ui/theme';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const themeMode = useAppStore((s) => s.themeMode);
  return (
    <ThemeProvider mode={themeMode}>
      <RootStack />
    </ThemeProvider>
  );
}

function RootStack() {
  const onboarded = useAppStore((s) => s.onboarded);
  const th = useTheme();
  return (
    <>
      <StatusBar style={th.name === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ contentStyle: { backgroundColor: th.bg }, headerShown: false }}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="editor" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
