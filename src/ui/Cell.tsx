/**
 * One grid cell (TR-49, style A "filled"). Shared by the month grid and the editor preview.
 * Shapes differ per state so they read without color: fill, half fill, dash, dotted, dashed, ring, dot.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CellState } from '../engine';
import { useTheme } from './theme';
import { font, radius, rgba } from './tokens';

interface Props {
  state: CellState;
  color: string;
  letter?: string;
  size?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function Cell({ state, color, letter = '', size = 26, disabled, accessibilityLabel, onPress, onLongPress }: Props) {
  const th = useTheme();
  const r = Math.round(size * 0.27);
  const base = { width: size, height: size, borderRadius: r, borderWidth: 1.5, borderColor: 'transparent' as string, backgroundColor: 'transparent' as string };
  let box = base;
  let textColor: string = th.muted;
  switch (state) {
    case 'done':
      box = { ...base, backgroundColor: color, borderColor: color };
      textColor = th.onAccent;
      break;
    case 'min':
      box = { ...base, borderColor: color };
      textColor = th.text;
      break;
    case 'skip':
      box = { ...base, borderColor: th.faint };
      break;
    case 'pending':
      box = { ...base, borderColor: color };
      textColor = color;
      break;
    case 'missed':
      box = { ...base, borderColor: th.line };
      break;
    case 'future':
      box = { ...base, borderColor: rgba(color, 0.45) };
      break;
    case 'flex':
      box = { ...base, borderColor: rgba(color, 0.6) };
      break;
    case 'flex-future':
      box = { ...base, borderColor: rgba(color, 0.35) };
      break;
    default:
      box = base;
  }
  const borderStyle = state === 'future' ? 'dashed' : state === 'flex' || state === 'flex-future' ? 'dotted' : 'solid';
  const content = (
    <View style={[box, styles.center, { borderStyle }, state === 'done' && { shadowColor: color, shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }, state === 'pending' && { shadowColor: color, shadowOpacity: 0.35, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } }]}>
      {state === 'min' && <View style={[styles.half, { backgroundColor: color, borderTopLeftRadius: r - 1, borderBottomLeftRadius: r - 1 }]} />}
      {state === 'none' && <View style={[styles.dot, { backgroundColor: th.faint }]} />}
      {state === 'skip' && <View style={[styles.dash, { backgroundColor: th.faint }]} />}
      {!!letter && state !== 'none' && (
        <Text style={[styles.letter, { color: textColor, fontSize: Math.max(9, size * 0.38) }]}>{letter}</Text>
      )}
    </View>
  );
  if (!onPress && !onLongPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [pressed && !disabled && { transform: [{ scale: 0.9 }] }]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  half: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%' },
  dot: { width: 4, height: 4, borderRadius: 2, opacity: 0.5 },
  dash: { width: '40%', height: 2, borderRadius: 1, opacity: 0.8 },
  letter: { fontFamily: font.family, fontWeight: font.weight.bold, includeFontPadding: false },
});

export const cellRadius = radius;
