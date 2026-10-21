/**
 * The App Store Connect listing (store/app-store/LISTING.md): Apple's length limits, the keyword rules,
 * the iOS v1 rule that public texts never talk about the other platform, prices, paid plans, ads or
 * features the iOS build hides, and the URLs the listing points at. Each pasted text is the ```text
 * block under a `### <Field>` heading inside a `## <locale>` section.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL } from '../about/links';

const root = fileURLToPath(new URL('../..', import.meta.url));
const md = readFileSync(join(root, 'store/app-store/LISTING.md'), 'utf8');

const LOCALES = ['es-MX', 'es-ES', 'en-US'] as const;
type Locale = (typeof LOCALES)[number];
const FIELDS = {
  Name: 'name',
  Subtitle: 'subtitle',
  'Promotional text': 'promo',
  Description: 'description',
  Keywords: 'keywords',
  "What's New": 'whatsNew',
  'Screenshot captions': 'captions',
} as const;
type Field = (typeof FIELDS)[keyof typeof FIELDS];

/** App Store Connect limits: characters, except keywords, which are counted in UTF-8 bytes. */
const LIMITS: Record<Exclude<Field, 'captions'>, number> = { name: 30, subtitle: 30, promo: 170, description: 4000, keywords: 100, whatsNew: 4000 };
const chars = (s: string) => [...s].length;
const bytes = (s: string) => new TextEncoder().encode(s).length;
const used = (field: Field, s: string) => (field === 'keywords' ? bytes(s) : chars(s));

function parseListing(text: string): Record<Locale, Partial<Record<Field, string>>> {
  const out = Object.fromEntries(LOCALES.map((l) => [l, {}])) as Record<Locale, Partial<Record<Field, string>>>;
  const lines = text.split('\n');
  let locale: Locale | null = null;
  let field: Field | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h2 = /^## (\S+)/.exec(line);
    if (h2) {
      locale = (LOCALES as readonly string[]).includes(h2[1]) ? (h2[1] as Locale) : null;
      field = null;
      continue;
    }
    const h3 = /^### (.+?)(?: \(max [^)]*\))?\s*$/.exec(line);
    if (h3) {
      field = locale ? (FIELDS[h3[1] as keyof typeof FIELDS] ?? null) : null;
      continue;
    }
    if (locale && field && line === '```text') {
      const end = lines.indexOf('```', i + 1);
      expect(end, `unclosed block for ${locale} ${field}`).toBeGreaterThan(i);
      expect(out[locale][field], `${locale} ${field} appears twice`).toBeUndefined();
      out[locale][field] = lines.slice(i + 1, end).join('\n');
      i = end;
      field = null;
    }
  }
  return out;
}

const listing = parseListing(md);
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter(Boolean);

describe('store listing: every locale is complete and within Apple limits', () => {
  for (const locale of LOCALES) {
    it(`${locale} has every field, within its limit`, () => {
      for (const field of Object.values(FIELDS)) {
        const text = listing[locale][field];
        expect(text, `${locale} ${field}`).toBeTruthy();
        expect(text, `${locale} ${field} starts or ends with blank space`).toBe(text?.trim());
        if (field !== 'captions') expect(used(field, text ?? ''), `${locale} ${field}`).toBeLessThanOrEqual(LIMITS[field]);
      }
    });
  }

  it('keeps the brand name the same in every locale', () => {
    for (const locale of LOCALES) expect(listing[locale].name).toBe('TraceRoutine');
  });

  it('lists 5 to 8 screenshot captions per locale, numbered in order and short enough to read on a phone', () => {
    const counts = LOCALES.map((locale) => {
      const captions = (listing[locale].captions ?? '').split('\n');
      captions.forEach((c, i) => {
        expect(c.startsWith(`${i + 1}. `), `${locale} caption ${i + 1}`).toBe(true);
        expect(chars(c.slice(`${i + 1}. `.length)), `${locale} caption ${i + 1}`).toBeLessThanOrEqual(40);
      });
      return captions.length;
    });
    for (const n of counts) {
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(8);
    }
    expect(new Set(counts).size).toBe(1);
  });

  it('matches the character-count table, so the counts a reader sees are the real ones', () => {
    const labels = Object.fromEntries(Object.entries(FIELDS).map(([label, field]) => [label, field])) as Record<string, Field>;
    const rows = [...md.matchAll(/^\| (es-MX|es-ES|en-US) \| ([^|]+?) \| (\d+) \| (\d+)(?: bytes)? \|$/gm)];
    expect(rows).toHaveLength(LOCALES.length * Object.keys(LIMITS).length);
    for (const [, locale, label, count, limit] of rows) {
      const field = labels[label];
      expect(field, label).toBeDefined();
      expect(Number(count), `${locale} ${label}`).toBe(used(field, listing[locale as Locale][field] ?? ''));
      expect(Number(limit), `${locale} ${label}`).toBe(LIMITS[field as keyof typeof LIMITS]);
    }
  });
});

describe('store listing: keywords', () => {
  for (const locale of LOCALES) {
    it(`${locale}: comma-separated, no spaces, no repeats, nothing already in the name or subtitle`, () => {
      const raw = listing[locale].keywords ?? '';
      expect(raw).not.toMatch(/\s/);
      const list = raw.split(',');
      expect(list.every(Boolean)).toBe(true);
      expect(new Set(list.map(fold)).size).toBe(list.length);
      const taken = new Set(words(`${listing[locale].name} ${listing[locale].subtitle}`));
      for (const kw of list.map(fold)) {
        // App Store search already matches singular and plural, so "habito" would repeat "hábitos".
        const repeats = [...taken].some((w) => w === kw || w === `${kw}s` || w === `${kw}es` || kw === `${w}s`);
        expect(repeats, `${locale} keyword "${kw}" repeats the name or subtitle`).toBe(false);
        expect(['app', 'traceroutine', 'iphone']).not.toContain(kw);
      }
    });
  }
});

describe('store listing: iOS v1 public texts', () => {
  // The Pro section, the usage-stats switch and the purchase copy are Android-only (src/store/limits.ts,
  // src/analytics/policy.ts); widget, month sharing and templates do not exist yet. "Free day" is a screen.
  const FORBIDDEN: [string, RegExp][] = [
    ['the other platform or its store', /android|google|play store/i],
    ['a paid plan', /\bpro\b|premium/i],
    ['prices', /[$€]|\bprecios?\b|\bprices?\b|\bpricing\b|\bgratis\b|\bgratuit|\bfree\b(?! day)/i],
    ['purchases or subscriptions', /\bcompras?\b|purchase|suscrip|subscri/i],
    ['ads', /\bads?\b|advert|anuncio|publicidad/i],
    ['features the iOS build does not have', /widget|plantilla|template|compartir (?:tu|el) mes|share (?:your|the) month|apple watch|icloud|sincroniz|\bsync/i],
    ['"coming soon"', /próximamente|coming soon/i],
    ['iPad (the app is iPhone only)', /ipad/i],
  ];

  for (const locale of LOCALES) {
    it(`${locale} never mentions them`, () => {
      for (const field of Object.values(FIELDS)) {
        const text = listing[locale][field] ?? '';
        for (const [what, re] of FORBIDDEN) expect(re.test(text), `${locale} ${field} mentions ${what}: ${re.exec(text)?.[0]}`).toBe(false);
      }
    });
  }

  it('makes the non-medical statement of the privacy policy in every description', () => {
    expect(listing['es-MX'].description).toContain('no diagnostica, trata, cura ni previene');
    expect(listing['es-ES'].description).toContain('no diagnostica, trata, cura ni previene');
    expect(listing['en-US'].description).toContain('does not diagnose, treat, cure or prevent');
  });

  it('gives the public support inbox in every description', () => {
    for (const locale of LOCALES) expect(listing[locale].description).toContain(SUPPORT_EMAIL);
  });
});

describe('store listing: app information', () => {
  const SUPPORT_URL = 'https://angelorivasmordobo.github.io/TraceRoutine/support.html';

  it('points at the privacy policy the app links to, English at #en', () => {
    expect(md).toContain(`es-MX and es-ES: \`${PRIVACY_POLICY_URL}\``);
    expect(md).toContain(`en-US: \`${PRIVACY_POLICY_URL}#en\``);
  });
  it('points the Support URL at docs/support.html, which GitHub Pages serves from /docs', () => {
    expect(existsSync(join(root, 'docs/support.html'))).toBe(true);
    expect(md).toContain(`es-MX and es-ES: \`${SUPPORT_URL}\``);
    expect(md).toContain(`en-US: \`${SUPPORT_URL}#en\``);
    expect(readFileSync(join(root, 'docs/support.html'), 'utf8')).toContain('<hr id="en">');
  });
  it('carries the legal copyright line and the seller team', () => {
    expect(md).toContain('`2026 MORDOBO TECHNOLOGIES LLC`');
    expect(md).toContain('`CTC5PRH3D3`');
  });
  it('declares no data collected and no tracking, as the iOS build does', () => {
    expect(md).toContain('**No, we do not collect data from this app**');
    expect(md).toContain('Tracking: **No**');
  });
  it('keeps the review notes in English with no sign-in, and the non-medical notice', () => {
    const notes = /\*\*Notes\*\* \(paste as is\):\n\n```text\n([\s\S]*?)\n```/.exec(md)?.[1] ?? '';
    expect(notes).toContain('There is no account or sign-in');
    expect(notes).toContain('no in-app purchases');
    expect(notes).toContain('Non-medical notice');
    expect(notes).toContain(SUPPORT_EMAIL);
    expect(notes).not.toMatch(/[áéíóúñ¿¡]/i);
  });
});
