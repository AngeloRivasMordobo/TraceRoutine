import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import 'react-native-reanimated';
import { configureNotifications, rescheduleReminders, watchStoreForReminders } from '@/src/reminders/service';
import { appStore, bootstrapStore, useAppStore } from '@/src/store/appStore';
import { ThemeProvider, useTheme } from '@/src/ui/theme';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const themeMode = useAppStore((s) => s.themeMode);
  const ready = useAppStore((s) => s.ready);

  useEffect(() => {
    let stopWatching: (() => void) | undefined;
    void bootstrapStore().then(async () => {
      await configureNotifications();
      await rescheduleReminders();
      stopWatching = watchStoreForReminders();
    });
    // Foreground: re-evaluate "today" (midnight, travel) and reschedule reminders in local time.
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') { appStore.refreshToday(); void rescheduleReminders(); }
    });
    return () => { sub.remove(); stopWatching?.(); };
  }, []);

  if (!ready) return null; // splash stays visible until the store has loaded
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
