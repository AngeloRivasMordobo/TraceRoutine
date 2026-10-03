/**
 * Small controls shared by the editor, Today and Month: bottom sheet, stepper, chip, field label, error text.
 */
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from './theme';
import { elevation, font, neutral, radius, rgba, space, TOUCH, track } from './tokens';

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const th = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="close" />
      <View style={[styles.sheet, { backgroundColor: th.surface }, elevation('lg', th)]}>
        <View style={[styles.grab, { backgroundColor: th.line }]} />
        {!!title && <Text style={[styles.sheetTitle, { color: th.text }]}>{title}</Text>}
        {children}
      </View>
    </Modal>
  );
}

export function Stepper({ value, min, max, onChange, accessibilityLabel }: { value: number; min: number; max: number; onChange: (v: number) => void; accessibilityLabel: string }) {
  const th = useTheme();
  const btn = (delta: number, label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel} ${label}`}
      disabled={delta < 0 ? value <= min : value >= max}
      onPress={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      hitSlop={9}
      style={({ pressed }) => [styles.stepBtn, { borderColor: th.line }, pressed && { backgroundColor: rgba(th.accent, 0.14) }]}>
      <Text style={[styles.stepGlyph, { color: th.icon }]}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn(-1, '−')}
      <Text style={[styles.stepValue, { color: th.accentText }]} accessibilityLabel={`${accessibilityLabel}: ${value}`}>{value}</Text>
      {btn(1, '+')}
    </View>
  );
}

export function Chip({ label, on, onPress, accessibilityLabel }: { label: string; on?: boolean; onPress?: () => void; accessibilityLabel?: string }) {
  const th = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: on ? th.accentLine : th.line, backgroundColor: on ? th.accentTint : pressed ? rgba(th.accent, 0.1) : 'transparent' },
      ]}>
      <Text style={[styles.chipLabel, { color: on ? th.onAccentTint : th.subtle }]}>{label}</Text>
    </Pressable>
  );
}

export function FieldLabel({ children, style }: { children: string; style?: object }) {
  const th = useTheme();
  return <Text style={[styles.label, { color: th.muted }, style]}>{children.toUpperCase()}</Text>;
}

export function Help({ children }: { children: string }) {
  const th = useTheme();
  return <Text style={[styles.help, { color: th.subtle }]}>{children}</Text>;
}

export function ErrorText({ children }: { children?: string | null }) {
  const th = useTheme();
  if (!children) return null;
  return <Text style={[styles.error, { color: th.danger }]}>{children}</Text>;
}

export const inputStyle = (th: ReturnType<typeof useTheme>) => ({
  minHeight: TOUCH,
  paddingHorizontal: space[4],
  paddingVertical: space[3],
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: th.line,
  backgroundColor: th.surface,
  color: th.text,
  fontSize: font.size.control,
  fontFamily: font.family,
});

/** The canvas's `.input`: an accent caret and an accent border while focused. */
export function Input({ style, onFocus, onBlur, placeholderTextColor, ...props }: TextInputProps) {
  const th = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...props}
      selectionColor={th.accent}
      cursorColor={th.accent}
      placeholderTextColor={placeholderTextColor ?? th.faint}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      style={[inputStyle(th), focused && { borderColor: th.accent }, style]}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: rgba(neutral[900], 0.5) },
  sheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space[6], paddingBottom: space[12], gap: space[3] },
  grab: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: space[3] },
  sheetTitle: { fontFamily: font.medium, fontSize: font.size.lg, marginBottom: space[2] },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space[4], alignSelf: 'flex-start' },
  stepBtn: { width: 26, height: 26, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontFamily: font.medium, fontSize: font.size.md },
  stepValue: { fontFamily: font.mono, minWidth: space[8], textAlign: 'center', fontSize: font.size.md },
  chip: { minHeight: 36, paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
  chipLabel: { fontFamily: font.medium, fontSize: font.size.meta },
  label: { fontFamily: font.medium, fontSize: font.size.xs, letterSpacing: track('label', font.size.xs), marginTop: space[5], marginBottom: space[3] },
  help: { fontFamily: font.family, fontSize: font.size.meta, lineHeight: 17, marginTop: space[2] },
  error: { fontFamily: font.family, fontSize: font.size.sm, marginTop: space[2] },
});
