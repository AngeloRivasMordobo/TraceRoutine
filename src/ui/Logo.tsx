/**
 * The brand mark (design canvas 1i, "Traza"): cells done and the next one waiting
 * for you — the grid is the logo. `full` is the onboarding cover's four-cell mark at
 * 16 px; `compact` is the Pro card's reduced three-cell lockup, which the canvas draws
 * without the glow.
 */
import { StyleSheet, View } from 'react-native';
import { accentRamp, rgba } from './tokens';

export function Logo({ size = 16, gap = 5, variant = 'full' }: { size?: number; gap?: number; variant?: 'full' | 'compact' }) {
  const r = Math.max(2, Math.round(size * 0.25));
  const box = { width: size, height: size, borderRadius: r };
  if (variant === 'compact') {
    return (
      <View style={[styles.row, { gap }]}>
        <View style={[box, { backgroundColor: accentRamp[500] }]} />
        <View style={[box, { backgroundColor: accentRamp[500], opacity: 0.6 }]} />
        <View style={[box, styles.nextCompact, { borderColor: accentRamp[600] }]} />
      </View>
    );
  }
  return (
    <View style={[styles.row, { gap }]}>
      <View style={[box, { backgroundColor: accentRamp[500] }]} />
      <View style={[box, { backgroundColor: accentRamp[500], opacity: 0.75 }]} />
      <View style={[box, { backgroundColor: rgba(accentRamp[500], 0.32) }]} />
      <View
        style={[
          box,
          styles.next,
          { borderColor: accentRamp[600], shadowColor: accentRamp[500], shadowRadius: size * 0.75 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  next: { borderWidth: 1.5, shadowOpacity: 0.45, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  nextCompact: { borderWidth: 1 },
});
