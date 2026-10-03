/**
 * Nocturne design tokens, ported from the design system's `styles.css`.
 * Rules from the readme: near-neutral blue-grey ground, Inter at medium weight,
 * 8 px radii, accent used as a line and a glow rather than a flood, outlined
 * buttons, 0.7× density. Ramps are OKLCH-generated on a shared lightness scale:
 * on the dark ground use 700–900 for tinted fills/borders, 500 as the base,
 * 100–300 for text on tints. Nothing outside this file hard-codes a color.
 */

import { Platform } from 'react-native';

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
  /** One step below `muted`: the canvas's neutral-600 — sub-lines, help text, frequency labels, inactive nav. */
  subtle: string;
  faint: string;
  /** Icon glyph inside an outlined control: the canvas's neutral-400. */
  icon: string;
  /** One step back from body text: the canvas's neutral-300 for secondary titles and chrome glyphs. */
  textSoft: string;
  accent: string;
  /** Text color on top of a solid accent or activity fill. */
  onAccent: string;
  accentTint: string;
  /** Text and glyphs on top of `accentTint`. */
  onAccentTint: string;
  /** The border of a selected, tinted control. */
  accentLine: string;
  /** Accent-coloured text on the ground: a deep ramp step, never the base accent (Nocturne readme). */
  accentText: string;
  pressed: string;
  /** Nocturne ships no danger ramp; these come from the design canvas. */
  danger: string;
  /** The recessed ground the tab bar sits on. */
  chrome: string;
  /** The ring of the highest elevation step. */
  lineStrong: string;
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
  subtle: neutral[600],
  faint: neutral[700],
  icon: neutral[400],
  textSoft: neutral[300],
  accent: '#9184d9',
  onAccent: '#12141f',
  accentTint: accentRamp[800],
  onAccentTint: accentRamp[200],
  accentLine: accentRamp[600],
  accentText: accentRamp[300],
  pressed: accentRamp[400],
  danger: '#d98a8a',
  chrome: mix('#161826', '#000000', 0.12),
  lineStrong: neutral[500],
  section: '#262a60',
  sectionGlow: '#353b80',
};

export const light: Theme = {
  name: 'light',
  bg: neutral[200],
  surface: neutral[100],
  surface2: neutral[300],
  line: neutral[400],
  text: neutral[900],
  muted: neutral[700],
  subtle: neutral[600],
  faint: neutral[500],
  icon: neutral[600],
  textSoft: neutral[800],
  accent: accentRamp[600],
  onAccent: neutral[100],
  accentTint: accentRamp[200],
  onAccentTint: accentRamp[800],
  accentLine: accentRamp[600],
  accentText: accentRamp[700],
  pressed: accentRamp[700],
  danger: '#b3555a',
  chrome: neutral[300],
  lineStrong: neutral[500],
  section: accentRamp[100],
  sectionGlow: accentRamp[200],
};

/** 0.7× density: base unit 2.8 px (2.8, 5.6, 8.4, 11.2, 16.8, 22.4). */
export const space = { 1: 2.8, 2: 5.6, 3: 8.4, 4: 11.2, 5: 14, 6: 16.8, 8: 22.4, 10: 28, 12: 33.6 } as const;

/** `tag` is Nocturne's `calc(--radius-md * 0.75)`. */
export const radius = { sm: 4, tag: 6, md: 8, lg: 14, pill: 999 } as const;

/**
 * Inter at the two weights Nocturne uses — 400 and 500. The readme forbids going past
 * 500 ("hierarchy here is size and space"), so there is no semibold or bold face.
 * React Native resolves a custom face by family name rather than by `fontWeight`,
 * so each weight is its own family here and styles pick the face.
 */
export const font = {
  family: 'Inter',
  medium: 'Inter-Medium',
  /** The canvas sets every numeric readout in the platform's monospace. */
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
  size: {
    cell: 8.5,
    micro: 9,
    meta: 10.5,
    label: 11.5,
    mono: 12,
    control: 14,
    xs: 11,
    sm: 12.5,
    body: 13,
    md: 15,
    lg: 17,
    xl: 22,
    title: 24,
    brand: 30,
  } as const,
} as const;

/**
 * The canvas tracks in em; React Native's `letterSpacing` is absolute, so the value
 * has to be derived from the size it is applied at.
 */
const TRACK_EM = { label: 0.1, kicker: 0.14, title: -0.01 } as const;
export const track = (role: keyof typeof TRACK_EM, size: number): number =>
  Math.round(TRACK_EM[role] * size * 100) / 100;

/**
 * Nocturne's `--shadow-sm/md/lg`: a 1 px ring plus ambient darkness, never a blurred
 * drop. `lg`'s offset is negative because the only surface at that step is a sheet
 * anchored to the bottom, whose single visible edge is its top. Black here is the
 * readme's one sanctioned exception: ambient darkness is a shadow, not a color.
 */
const ambient = {
  sm: null,
  md: { shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 9, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  lg: { shadowColor: '#000', shadowOpacity: 0.65, shadowRadius: 20, shadowOffset: { width: 0, height: -16 }, elevation: 16 },
} as const;

export function elevation(level: 'sm' | 'md' | 'lg', th: Theme) {
  const ring = { sm: th.line, md: th.faint, lg: th.lineStrong }[level];
  return { borderWidth: 1, borderColor: ring, ...(ambient[level] ?? {}) };
}

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
