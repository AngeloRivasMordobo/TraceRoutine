/**
 * Base components (Nocturne): outlined buttons, cards, tags, segmented control.
 * Every color comes from the theme; every size from the tokens.
 */
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from './theme';
import { accentRamp, font, neutral, radius, rgba, space, TOUCH, track } from './tokens';

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
  const color = variant === 'secondary' ? th.text : th.accent;
  const press = variant === 'primary' ? rgba(th.accent, 0.22) : variant === 'secondary' ? rgba(th.text, 0.14) : rgba(th.accent, 0.18);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { borderColor: border, backgroundColor: pressed ? press : 'transparent', opacity: disabled ? 0.45 : 1 },
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
  const bg = tone === 'accent' ? th.accentTint : tone === 'neutral' ? neutral[800] : 'transparent';
  const color = tone === 'accent' ? th.onAccentTint : tone === 'neutral' ? neutral[100] : th.accent;
  return (
    <View style={[styles.tag, { backgroundColor: bg, borderColor: tone === 'outline' ? th.accent : 'transparent' }]}>
      <Text style={[styles.tagLabel, { color }]}>{label}</Text>
    </View>
  );
}

/** A section label inside a screen — muted, as the design draws its group labels. */
export function Eyebrow({ children }: { children: string }) {
  const th = useTheme();
  return <Text style={[styles.eyebrow, { color: th.muted }]}>{children.toUpperCase()}</Text>;
}

/** The screen kicker above each title: accent, 10.5 px, wide tracking. */
export function Kicker({ children }: { children: string }) {
  return <Text style={[styles.kicker, { color: accentRamp[400] }]}>{children.toUpperCase()}</Text>;
}

/** The screen title under a Kicker. */
export function Title({ children }: { children: string }) {
  const th = useTheme();
  return <Text style={[styles.title, { color: th.text }]}>{children}</Text>;
}

/**
 * Progress bar. The month's global bar is the accent gradient the design uses;
 * `solid` gives Today's flat accent fill.
 */
export function Bar({ pct, height = 5, solid }: { pct: number; height?: number; solid?: boolean }) {
  const th = useTheme();
  const w = Math.max(0, Math.min(100, pct));
  return (
    <View style={[styles.barTrack, { backgroundColor: th.surface2, height, borderRadius: height / 2 }]}>
      <View style={{ width: `${w}%`, height: '100%', borderRadius: height / 2, overflow: 'hidden' }}>
        {solid ? (
          <View style={{ flex: 1, backgroundColor: accentRamp[500] }} />
        ) : (
          <Svg width="100%" height={height}>
            <Defs>
              <LinearGradient id="barFill" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={accentRamp[600]} />
                <Stop offset="1" stopColor={accentRamp[400]} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height={height} fill="url(#barFill)" />
          </Svg>
        )}
      </View>
    </View>
  );
}

/** The consistency donut the design puts on Stats. */
export function Ring({ pct, size = 104, stroke = 7, radius: radius_, children }: { pct: number | null; size?: number; stroke?: number; radius?: number; children?: React.ReactNode }) {
  const th = useTheme();
  // The canvas draws r = 44 in a 104 box; keep that ratio at any size.
  const r = radius_ ?? size * (44 / 104);
  const c = 2 * Math.PI * r;
  const on = (Math.max(0, Math.min(100, pct ?? 0)) / 100) * c;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={th.surface2} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accentRamp[500]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${on} ${c - on}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.ringCenter}>{children}</View>
      </View>
    </View>
  );
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
    <View style={[styles.seg, { borderColor: th.line }]} accessibilityRole="radiogroup">
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segItem, i > 0 && [styles.segDivider, { borderLeftColor: th.line }], on && { backgroundColor: th.accentTint }]}>
            <Text style={[styles.segLabel, { color: on ? th.onAccentTint : th.muted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH,
    paddingHorizontal: space[3] * 1.2,
    paddingVertical: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { fontFamily: font.medium, fontSize: font.size.control },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space[6] },
  tag: { alignSelf: 'flex-start', borderRadius: radius.tag, borderWidth: 1, paddingHorizontal: space[3], paddingVertical: space[1] },
  tagLabel: { fontFamily: font.medium, fontSize: font.size.xs },
  eyebrow: { fontFamily: font.medium, fontSize: font.size.xs, letterSpacing: track('label', font.size.xs) },
  kicker: { fontFamily: font.medium, fontSize: font.size.meta, letterSpacing: track('kicker', font.size.meta) },
  title: { fontFamily: font.medium, fontSize: font.size.xl, letterSpacing: track('title', font.size.xl), marginTop: 4 },
  barTrack: { width: '100%', overflow: 'hidden' },
  ringCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  segItem: { flex: 1, minHeight: TOUCH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[2] },
  segDivider: { borderLeftWidth: 1 },
  segLabel: { fontFamily: font.medium, fontSize: font.size.label },
});
