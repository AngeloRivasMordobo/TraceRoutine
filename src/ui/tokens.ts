/**
 * Nocturne design tokens, ported from the design system's `styles.css`.
 * Rules from the readme: near-neutral blue-grey ground, Inter at medium weight,
 * 8 px radii, accent used as a line and a glow rather than a flood, outlined
 * buttons, 0.7× density. Ramps are OKLCH-generated on a shared lightness scale:
 * on the dark ground use 700–900 for tinted fills/borders, 500 as the base,
 * 100–300 for text on tints. Nothing outside this file hard-codes a color.
 */

export const neutral = {
  100: '#f3f5fe',
  200: '#e4e7f5',
  300: '#cfd3e5',
  400: '#b2b6ca',
  500: '#9397ab',
  600: '#75798c',
  700: '#595d6c',
  800: '#3f424d',
  900: '#292b31',
} as const;

export const accentRamp = {
  100: '#f5f4ff',
  200: '#e7e5fe',
  300: '#d2cefd',
  400: '#b5abfc',
  500: '#968ae0',
  600: '#796cbf',
  700: '#5d5294',
  800: '#423a6a',
  900: '#2b2741',
} as const;

/**
 * One accent per activity — the design canvas's four hues, in its order, all at
 * the accent's own lightness so no row shouts louder than another.
 */
export const activityColors = {
  sky: '#82a7e6',
  amber: '#d0a976',
  teal: '#74c4b2',
  accent: '#968ae0',
} as const;
export type ActivityColor = keyof typeof activityColors;
export const ACTIVITY_COLOR_KEYS = Object.keys(activityColors) as ActivityColor[];

/** Colors stored before the palette moved to the design's four; kept so old activities still render. */
const LEGACY_COLORS: Record<string, ActivityColor> = { coral: 'amber', mint: 'teal', rose: 'accent' };

/** The hue for a stored `Activity.color`, resolving legacy names. Falls back to the accent. */
export function activityColor(key: string): string {
  return activityColors[(key in activityColors ? key : LEGACY_COLORS[key] ?? 'accent') as ActivityColor];
}

export interface Theme {
  name: 'dark' | 'light';
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  text: string;
  muted: string;
  faint: string;
  accent: string;
  /** Text color on top of a solid accent or activity fill. */
  onAccent: string;
  accentTint: string;
  pressed: string;
  danger: string;
  section: string;
  sectionGlow: string;
}

export const dark: Theme = {
  name: 'dark',
  bg: '#161826',
  surface: '#232532',
  surface2: neutral[900],
  line: neutral[800],
  text: '#e9e9ed',
  muted: neutral[500],
  faint: neutral[700],
  accent: '#9184d9',
  onAccent: '#161826',
  accentTint: accentRamp[900],
  pressed: accentRamp[400],
  danger: '#d98a8e',
  section: '#262a60',
  sectionGlow: '#353b80',
};

export const light: Theme = {
  name: 'light',
  bg: neutral[100],
  surface: '#ffffff',
  surface2: neutral[200],
  line: neutral[300],
  text: neutral[900],
  muted: neutral[600],
  faint: neutral[400],
  accent: accentRamp[600],
  onAccent: '#ffffff',
  accentTint: accentRamp[200],
  pressed: accentRamp[700],
  danger: '#b3555a',
  section: accentRamp[100],
  sectionGlow: accentRamp[200],
};

/** 0.7× density: base unit 2.8 px (2.8, 5.6, 8.4, 11.2, 16.8, 22.4). */
export const space = { 1: 2.8, 2: 5.6, 3: 8.4, 4: 11.2, 5: 14, 6: 16.8, 8: 22.4, 10: 28, 12: 33.6 } as const;

export const radius = { sm: 4, md: 8, lg: 14, pill: 999 } as const;

/**
 * Inter, as Nocturne requires. React Native resolves a custom face by family name
 * rather than by `fontWeight`, so each weight is its own family here and styles
 * pick the face instead of setting a weight.
 */
export const font = {
  family: 'Inter',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  size: { xs: 11, sm: 12.5, md: 15, lg: 17, xl: 22, display: 32 } as const,
  tracking: { eyebrow: 1.4, tight: -0.4 } as const,
} as const;

/** Elevation tuned to the dark ground: a 1 px ring rather than a blurred drop. */
export const shadow = {
  sm: { shadowColor: neutral[800], shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 1 },
  md: { shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
} as const;

/** Minimum touch target (accessibility, TR-75). */
export const TOUCH = 44;

/**
 * An opaque blend of `top` over `bottom`, the equivalent of the design's
 * `color-mix(in srgb, hue N%, transparent)` once it has settled on the ground.
 * Use it where a translucent fill would let what sits behind it show through.
 */
export function mix(bottom: string, top: string, amount: number): string {
  const parse = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [br, bg, bb] = parse(bottom);
  const [tr, tg, tb] = parse(top);
  const c = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return `rgb(${c(br, tr)}, ${c(bg, tg)}, ${c(bb, tb)})`;
}

/** rgba() helper for tints of an activity color, e.g. `rgba(activityColors.amber, 0.14)`. */
export function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
