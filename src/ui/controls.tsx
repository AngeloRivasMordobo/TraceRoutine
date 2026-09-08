/**
 * Small controls shared by the editor, Today and Month: bottom sheet, stepper, chip, field label, error text.
 */
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './theme';
import { font, radius, rgba, space, TOUCH } from './tokens';

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const th = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="close" />
      <View style={[styles.sheet, { backgroundColor: th.bg, borderColor: th.line }]}>
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
      style={({ pressed }) => [styles.stepBtn, pressed && { backgroundColor: rgba(th.accent, 0.14) }]}>
      <Text style={[styles.stepGlyph, { color: th.text }]}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={[styles.stepper, { borderColor: th.line, backgroundColor: th.surface }]}>
      {btn(-1, '−')}
      <Text style={[styles.stepValue, { color: th.text }]} accessibilityLabel={`${accessibilityLabel}: ${value}`}>{value}</Text>
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
        { borderColor: on ? th.accent : th.line, backgroundColor: on ? th.accentTint : pressed ? rgba(th.accent, 0.1) : th.surface },
      ]}>
      <Text style={[styles.chipLabel, { color: on ? th.accent : th.text }]}>{label}</Text>
    </Pressable>
  );
}

export function FieldLabel({ children, style }: { children: string; style?: object }) {
  const th = useTheme();
  return <Text style={[styles.label, { color: th.muted }, style]}>{children.toUpperCase()}</Text>;
}

export function Help({ children }: { children: string }) {
  const th = useTheme();
  return <Text style={[styles.help, { color: th.muted }]}>{children}</Text>;
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
  fontSize: font.size.md,
  fontFamily: font.family,
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: radius.lg + 6, borderTopRightRadius: radius.lg + 6, borderWidth: 1, padding: space[6], paddingBottom: space[12], gap: space[3] },
  grab: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: space[3] },
  sheetTitle: { fontFamily: font.semibold, fontSize: font.size.lg, marginBottom: space[2] },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden', alignSelf: 'flex-start' },
  stepBtn: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontFamily: font.medium, fontSize: 20 },
  stepValue: { fontFamily: font.semibold, minWidth: TOUCH, textAlign: 'center', fontSize: font.size.lg },
  chip: { minHeight: 36, paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
  chipLabel: { fontFamily: font.medium, fontSize: font.size.sm },
  label: { fontFamily: font.medium, fontSize: font.size.xs, letterSpacing: font.tracking.eyebrow, marginTop: space[8], marginBottom: space[3] },
  help: { fontFamily: font.family, fontSize: font.size.sm, marginTop: space[2] },
  error: { fontFamily: font.family, fontSize: font.size.sm, marginTop: space[2] },
});
