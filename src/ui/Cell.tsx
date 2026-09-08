/**
 * One grid cell (TR-49), cell style A "relleno suave" — the design canvas's default.
 * From the canvas's `cellFor`: done is a solid fill of the activity hue, the minimum
 * is the bottom half filled over a soft tint, skipped drops to neutral-900, a
 * scheduled day with no record is the hue at 14% (8% when the frequency is flexible),
 * and a day that is not scheduled is a faint hairline. Today carries an accent ring.
 * Shapes still differ per state so the grid reads without color.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CellState } from '../engine';
import { useTheme } from './theme';
import { accentRamp, font, neutral, radius, rgba } from './tokens';

interface Props {
  state: CellState;
  color: string;
  letter?: string;
  size?: number;
  /** Draws the accent ring the design puts on today's column. */
  isToday?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
  onLongPress?: () => void;
}

/** Tint strengths taken from the canvas: soft 14%, flexible 8%, half-cell ground 14%. */
const SOFT = 0.14;
const FLEX = 0.08;

export function Cell({ state, color, letter = '', size = 26, isToday, disabled, accessibilityLabel, onPress, onLongPress }: Props) {
  const th = useTheme();
  const r = Math.max(2, Math.round(size * 0.3));
  const base = {
    width: size,
    height: size,
    borderRadius: r,
    borderWidth: 1,
    borderColor: 'transparent' as string,
    backgroundColor: 'transparent' as string,
  };
  let box = base;
  let textColor: string = th.muted;
  let half = false;
  switch (state) {
    case 'done':
      box = { ...base, backgroundColor: color };
      textColor = th.onAccent;
      break;
    case 'min':
      box = { ...base, backgroundColor: rgba(color, SOFT) };
      textColor = th.text;
      half = true;
      break;
    case 'skip':
      box = { ...base, backgroundColor: th.surface2 };
      break;
    case 'pending':
    case 'future':
      box = { ...base, backgroundColor: rgba(color, SOFT) };
      textColor = color;
      break;
    // A past due day with no log. TR-49 and the glossary both ask for a neutral
    // outline here — present, but never red: the miss is recorded, not scolded.
    case 'missed':
      box = { ...base, borderColor: th.line };
      break;
    case 'flex':
    case 'flex-future':
      box = { ...base, backgroundColor: rgba(color, FLEX) };
      textColor = color;
      break;
    default: // 'none' — a day this activity is not scheduled on
      box = { ...base, borderColor: rgba(neutral[800], 0.55) };
  }
  const content = (
    <View style={[box, styles.center, isToday && { borderWidth: 1.5, borderColor: accentRamp[400] }]}>
      {half && <View style={[styles.half, { backgroundColor: color, borderBottomLeftRadius: r - 1, borderBottomRightRadius: r - 1 }]} />}
      {!!letter && state !== 'none' && (
        <Text style={[styles.letter, { color: textColor, fontSize: Math.max(8, size * 0.38) }]}>{letter}</Text>
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
  /** The minimum is the bottom half of the cell, over the soft tint. */
  half: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  letter: { fontFamily: font.bold, includeFontPadding: false },
});

export const cellRadius = radius;
