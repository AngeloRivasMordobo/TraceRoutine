import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import 'react-native-reanimated';
import { initPostHog } from '@/src/analytics/posthog';
import { initSentry, wrapRoot } from '@/src/analytics/sentry';
import { watchStoreForAnalytics } from '@/src/analytics/watch';
import { configureNotifications, rescheduleReminders, watchStoreForReminders } from '@/src/reminders/service';
import { appStore, bootstrapStore, useAppStore } from '@/src/store/appStore';
import { ThemeProvider, useTheme } from '@/src/ui/theme';

export { ErrorBoundary } from 'expo-router';

initSentry();

function RootLayout() {
  const themeMode = useAppStore((s) => s.themeMode);
  const ready = useAppStore((s) => s.ready);
  // Nocturne is set in Inter. React Native picks a face by family name, so each
  // weight registers under the name src/ui/tokens.ts asks for.
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    let stopWatching: (() => void) | undefined;
    let stopAnalytics: (() => void) | undefined;
    void bootstrapStore().then(async () => {
      initPostHog(); // no-op without EXPO_PUBLIC_POSTHOG_KEY; the store already applied the opt-out
      stopAnalytics = watchStoreForAnalytics();
      await configureNotifications();
      await rescheduleReminders();
      stopWatching = watchStoreForReminders();
    });
    // Foreground: re-evaluate "today" (midnight, travel) and reschedule reminders in local time.
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') { appStore.refreshToday(); void rescheduleReminders(); }
    });
    return () => { sub.remove(); stopWatching?.(); stopAnalytics?.(); };
  }, []);

  if (!ready || !fontsLoaded) return null; // splash stays visible until the store and Inter have loaded
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
          <Stack.Screen name="first-activity" />
          <Stack.Screen name="editor" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default wrapRoot(RootLayout);
