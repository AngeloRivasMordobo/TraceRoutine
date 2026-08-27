import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/ui/theme';

export default function NotFoundScreen() {
  const th = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: th.bg }]}>
        <Text style={{ color: th.text }}>This screen does not exist.</Text>
        <Link href="/" style={{ color: th.accent, marginTop: 15 }}>Go to Today</Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 } });
