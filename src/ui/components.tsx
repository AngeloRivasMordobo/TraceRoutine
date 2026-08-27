/**
 * Base components (Nocturne): outlined buttons, cards, tags, segmented control.
 * Every color comes from the theme; every size from the tokens.
 */
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from './theme';
import { font, radius, rgba, space, TOUCH } from './tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function Button({
  label,
  variant = 'primary',
  disabled,
  style,
  ...rest
}: PressableProps & { label: string; variant?: ButtonVariant; style?: StyleProp<ViewStyle> }) {
  const th = useTheme();
  const border = variant === 'primary' ? th.accent : variant === 'secondary' ? th.line : 'transparent';
  const color = variant === 'primary' ? th.accent : th.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { borderColor: border, backgroundColor: pressed ? rgba(th.accent, 0.14) : 'transparent', opacity: disabled ? 0.45 : 1 },
        style,
      ]}
      {...rest}>
      <Text style={[styles.buttonLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const th = useTheme();
  return <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.line }, style]}>{children}</View>;
}

export function Tag({ label, tone = 'neutral' }: { label: string; tone?: 'accent' | 'neutral' | 'outline' }) {
  const th = useTheme();
  const bg = tone === 'accent' ? th.accentTint : tone === 'neutral' ? th.surface2 : 'transparent';
  const color = tone === 'accent' ? th.accent : th.muted;
  return (
    <View style={[styles.tag, { backgroundColor: bg, borderColor: tone === 'outline' ? th.line : 'transparent' }]}>
      <Text style={[styles.tagLabel, { color }]}>{label}</Text>
    </View>
  );
}

export function Eyebrow({ children }: { children: string }) {
  const th = useTheme();
  return <Text style={[styles.eyebrow, { color: th.muted }]}>{children.toUpperCase()}</Text>;
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const th = useTheme();
  return (
    <View style={[styles.seg, { borderColor: th.line, backgroundColor: th.surface }]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segItem, on && { backgroundColor: th.surface2 }]}>
            <Text style={[styles.segLabel, { color: on ? th.text : th.muted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH,
    paddingHorizontal: space[6],
    paddingVertical: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { fontFamily: font.family, fontSize: font.size.md, fontWeight: font.weight.medium },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space[6] },
  tag: { alignSelf: 'flex-start', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: space[3], paddingVertical: space[1] },
  tagLabel: { fontFamily: font.family, fontSize: font.size.xs, fontWeight: font.weight.medium },
  eyebrow: { fontFamily: font.family, fontSize: font.size.xs, fontWeight: font.weight.medium, letterSpacing: font.tracking.eyebrow },
  seg: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  segItem: { flex: 1, minHeight: TOUCH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[2] },
  segLabel: { fontFamily: font.family, fontSize: font.size.sm, fontWeight: font.weight.semibold },
});
