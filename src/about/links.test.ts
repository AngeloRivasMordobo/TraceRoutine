import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { feedbackMailto, PRIVACY_POLICY_URL, privacyPolicyUrl, SUPPORT_EMAIL } from './links';

const root = fileURLToPath(new URL('../..', import.meta.url));

describe('privacy policy link', () => {
  it('points at the published policy over HTTPS', () => {
    expect(PRIVACY_POLICY_URL).toBe('https://angelorivasmordobo.github.io/TraceRoutine/privacy.html');
  });
  it('opens the policy in the reader language', () => {
    expect(privacyPolicyUrl('es')).toBe(PRIVACY_POLICY_URL);
    expect(privacyPolicyUrl('en')).toBe(`${PRIVACY_POLICY_URL}#en`);
  });
});

describe('support contact', () => {
  it('is the public support inbox, not the unregistered traceroutine.app domain', () => {
    expect(SUPPORT_EMAIL).toBe('support@mordobo.com');
    expect(feedbackMailto('x', '1.0.0', 'ios')).not.toContain('traceroutine.app');
  });
  it('builds the feedback mail with the subject, version and platform encoded', () => {
    const url = feedbackMailto('Comentarios sobre TraceRoutine', '1.0.0', 'ios');
    expect(url.startsWith('mailto:support@mordobo.com?subject=')).toBe(true);
    const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    expect(params.get('subject')).toBe('Comentarios sobre TraceRoutine');
    expect(params.get('body')).toBe('\n\n— v1.0.0 · ios');
  });
  it('leaves the platform out when it is unknown', () => {
    const url = feedbackMailto('TraceRoutine feedback', '1.0.0', '');
    expect(new URLSearchParams(url.slice(url.indexOf('?') + 1)).get('body')).toBe('\n\n— v1.0.0');
  });
});

describe('contact points in the app', () => {
  /** Code and texts that ship: .ts/.tsx (not tests) and the .json dictionaries and iOS locale files. */
  const sources = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? sources(path) : /\.(tsx?|json)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });

  it('never links to the unregistered traceroutine.app domain, in code or in any text', () => {
    const shipped = [...sources(join(root, 'app')), ...sources(join(root, 'src')), ...sources(join(root, 'locales')), join(root, 'docs/privacy.html')];
    expect(shipped).toContain(join(root, 'src/i18n/en.json'));
    expect(shipped).toContain(join(root, 'src/i18n/es.json'));
    const offenders = shipped.filter((f) => readFileSync(f, 'utf8').includes('traceroutine.app'));
    expect(offenders).toEqual([]);
  });
  it('links the privacy policy from Settings', () => {
    const settings = join(root, 'app/(tabs)/settings.tsx');
    expect(existsSync(settings)).toBe(true);
    expect(readFileSync(settings, 'utf8')).toMatch(/privacyPolicyUrl\(lang\)/);
  });
});

describe('privacy policy text (docs/privacy.html)', () => {
  const policy = readFileSync(join(root, 'docs/privacy.html'), 'utf8');
  // privacyPolicyUrl('en') lands on id="en"; everything before it is the Spanish policy.
  const [es, en] = policy.split('<hr id="en">');

  it('has a Spanish half and an English half', () => {
    expect(es).toBeTruthy();
    expect(en).toBeTruthy();
    expect(policy).not.toContain('angelo.rivas@');
  });
  it('names the legal publisher, the support inbox and the date in each language', () => {
    expect(es).toContain('publicada por MORDOBO TECHNOLOGIES LLC');
    expect(en).toContain('published by MORDOBO TECHNOLOGIES LLC');
    for (const half of [es, en]) {
      expect(half).toContain('mailto:support@mordobo.com');
      expect(half).toContain('© 2026 MORDOBO TECHNOLOGIES LLC');
    }
    expect(es).toContain('Última actualización: 19 de octubre de 2026');
    expect(en).toContain('Last updated: October 19, 2026');
  });
  it('says in each language that a system backup may hold a copy, and that we cannot reach it', () => {
    // expo-sqlite keeps the database in Documents on iOS, which iCloud and computer backups include.
    expect(es).not.toContain('únicamente en tu teléfono');
    expect(en).not.toContain('only on your phone');
    expect(es).toMatch(/copia de seguridad del teléfono \(por ejemplo, iCloud o Google\)[^<]*Nosotros no tenemos acceso a ella\./);
    expect(en).toMatch(/phone's backup is on \(for example iCloud or Google\)[^<]*We have no access to it\./);
  });
  it('makes the same non-medical statement in each language', () => {
    expect(es).toContain('no diagnostica, trata, cura ni previene');
    expect(en).toContain('does not diagnose, treat, cure or prevent');
  });
  it('keeps the two halves parallel: same sections, same links', () => {
    const count = (half: string, re: RegExp) => half.match(re)?.length ?? 0;
    expect(count(es, /<h2>/g)).toBe(count(en, /<h2>/g));
    expect(count(es, /<p>/g)).toBe(count(en, /<p>/g));
    expect(count(es, /<li>/g)).toBe(count(en, /<li>/g));
    expect(count(es, /href="mailto:/g)).toBe(count(en, /href="mailto:/g));
  });
});
