import { describe, expect, it } from 'vitest';
import type { Activity, Log } from '../engine/types';
import { activitiesCsv, backupSummary, logsCsv, parseBackup, toBackup } from './backup';

const a: Activity = { id: 'read', name: 'Leer, "novela"', icon: 'book', color: 'accent', record: 'amount', unit: 'páginas', start: '2026-08-01', end: null, freq: { type: 'perWeek', times: 3 } };
const logs: Log[] = [{ activityId: 'read', date: '2026-08-05', state: 'done', value: 12 }, { activityId: 'read', date: '2026-08-03', state: 'skip', reason: 'noTime' }];

describe('backup formats', () => {
  it('writes CSV with BOM, escaping and sorted logs', () => {
    const csv = activitiesCsv([a], () => '3 veces por semana');
    expect(csv.startsWith('\uFEFFid,name')).toBe(true);
    expect(csv).toContain('"Leer, ""novela"""');
    const l = logsCsv(logs, () => 'Leer');
    expect(l.split('\r\n')[1]).toBe('2026-08-03,Leer,skip,,noTime,');
  });
  it('round-trips a JSON backup and validates it', () => {
    const json = toBackup([a], logs, { lang: 'es' });
    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.backup.activities[0].name).toBe(a.name);
      expect(backupSummary(parsed.backup)).toEqual({ activities: 1, logs: 2, from: '2026-08-03', to: '2026-08-05' });
    }
    expect(parseBackup('{')).toEqual({ ok: false, error: 'invalid_json' });
    expect(parseBackup('{"hello":1}')).toEqual({ ok: false, error: 'not_a_backup' });
    expect(parseBackup(JSON.stringify({ version: 99, activities: [], logs: [] }))).toEqual({ ok: false, error: 'newer_version' });
  });
  it('drops logs that point to unknown activities or have bad dates', () => {
    const p = parseBackup(JSON.stringify({ version: 1, activities: [a], logs: [...logs, { activityId: 'ghost', date: '2026-08-01', state: 'done' }, { activityId: 'read', date: 'nope', state: 'done' }] }));
    expect(p.ok && p.backup.logs.length).toBe(2);
  });
});
