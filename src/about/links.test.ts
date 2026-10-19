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
  const sources = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });

  it('never links to the unregistered traceroutine.app domain', () => {
    const offenders = [...sources(join(root, 'app')), ...sources(join(root, 'src'))].filter((f) => readFileSync(f, 'utf8').includes('traceroutine.app'));
    expect(offenders).toEqual([]);
  });
  it('links the privacy policy from Settings', () => {
    const settings = join(root, 'app/(tabs)/settings.tsx');
    expect(existsSync(settings)).toBe(true);
    expect(readFileSync(settings, 'utf8')).toMatch(/privacyPolicyUrl\(lang\)/);
  });
  it('publishes a policy that names the legal publisher, the support inbox and the English anchor', () => {
    const policy = readFileSync(join(root, 'docs/privacy.html'), 'utf8');
    expect(policy).toContain('publicada por MORDOBO TECHNOLOGIES LLC');
    expect(policy).toContain('published by MORDOBO TECHNOLOGIES LLC');
    expect(policy).toContain('mailto:support@mordobo.com');
    expect(policy).not.toContain('angelo.rivas@');
    expect(policy).toMatch(/id="en"/); // privacyPolicyUrl('en') lands here
  });
});
