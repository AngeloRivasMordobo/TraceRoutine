/**
 * Contrast of the theme pairs that carry text. The design only draws the dark theme; the light theme is
 * derived from the same ramps, and QA on iOS found selected options painted in their own colour, the
 * active tab and the kicker almost invisible on the light ground. WCAG AA asks 4.5:1 for small text.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { select: (o: Record<string, unknown>) => o.default } }));

const { accentRamp, dark, light } = await import('./tokens');

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio; `rgb(r, g, b)` (from mix()) is accepted too. */
function contrast(a: string, b: string): number {
  const hex = (c: string) => {
    const m = c.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
    return m ? `#${m.slice(1).map((v) => Number(v).toString(16).padStart(2, '0')).join('')}` : c;
  };
  const [x, y] = [luminance(hex(a)), luminance(hex(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe.each([['dark', dark], ['light', light]] as const)('%s theme text contrast', (_, th) => {
  it('keeps the label of a selected pill or chip readable on its tint', () => {
    expect(contrast(th.onAccentTint, th.accentTint)).toBeGreaterThanOrEqual(4.5);
  });
  it('keeps accent text, the kicker and the active tab readable on the ground and on the tab bar', () => {
    for (const ground of [th.bg, th.chrome]) {
      expect(contrast(th.accentText, ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(th.kicker, ground)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('keeps the text of an accent tag readable on its tint', () => {
    expect(contrast(th.accentTagText, th.accentTint)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('dark theme, as the design draws it', () => {
  it('keeps the colours the screens used before they went through the theme', () => {
    expect(dark.accentTint).toBe(accentRamp[800]); // selected pill in Settings
    expect(dark.accentText).toBe(accentRamp[300]); // active tab, "+", percentages
    expect(dark.kicker).toBe(accentRamp[400]);
    expect(dark.accentTagText).toBe(accentRamp[100]);
  });
});

describe('light theme', () => {
  it('no longer paints a selected label in the colour of its own background', () => {
    expect(light.onAccentTint).not.toBe(light.accentTint);
    expect(light.accentTint).not.toBe(accentRamp[800]);
  });
});
