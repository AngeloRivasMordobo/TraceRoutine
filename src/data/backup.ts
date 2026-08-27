/**
 * Export/import formats (TR-65, TR-66): CSV for spreadsheets, JSON for backups. Pure functions.
 */
import type { Activity, Log } from '../engine/types';

export const BACKUP_VERSION = 1;

export interface Backup { version: number; exportedAt: string; activities: Activity[]; logs: Log[]; settings: Record<string, string> }

const cell = (v: unknown): string => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const BOM = '\uFEFF';

export function activitiesCsv(activities: Activity[], freqLabel: (a: Activity) => string): string {
  const head = ['id', 'name', 'frequency', 'record', 'unit', 'minimal', 'start', 'end', 'reminder', 'archived'];
  const rows = activities.map((a) => [a.id, a.name, freqLabel(a), a.record, a.unit ?? '', a.minimal ?? '', a.start, a.end ?? '', a.reminder ?? '', a.archived ? 1 : 0]);
  return BOM + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function logsCsv(logs: Log[], nameOf: (id: string) => string): string {
  const head = ['date', 'activity', 'state', 'value', 'reason', 'note'];
  const rows = [...logs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).map((l) => [l.date, nameOf(l.activityId), l.state, l.value ?? '', l.reason ?? '', l.note ?? '']);
  return BOM + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function toBackup(activities: Activity[], logs: Log[], settings: Record<string, string>, now = new Date()): string {
  const b: Backup = { version: BACKUP_VERSION, exportedAt: now.toISOString(), activities, logs, settings };
  return JSON.stringify(b, null, 2);
}

export type BackupError = 'invalid_json' | 'not_a_backup' | 'newer_version';

export function parseBackup(text: string): { ok: true; backup: Backup } | { ok: false; error: BackupError } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: 'invalid_json' }; }
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'not_a_backup' };
  const b = raw as Partial<Backup>;
  if (typeof b.version !== 'number' || !Array.isArray(b.activities) || !Array.isArray(b.logs)) return { ok: false, error: 'not_a_backup' };
  if (b.version > BACKUP_VERSION) return { ok: false, error: 'newer_version' };
  const activities = b.activities.filter((a): a is Activity => !!a && typeof a === 'object' && typeof (a as Activity).id === 'string' && typeof (a as Activity).name === 'string' && !!(a as Activity).freq);
  const ids = new Set(activities.map((a) => a.id));
  const logs = b.logs.filter((l): l is Log => !!l && typeof l === 'object' && ids.has((l as Log).activityId) && /^\d{4}-\d{2}-\d{2}$/.test((l as Log).date) && ['done', 'min', 'skip'].includes((l as Log).state));
  return { ok: true, backup: { version: b.version, exportedAt: b.exportedAt ?? '', activities, logs, settings: b.settings ?? {} } };
}

/** Summary line for the import preview: dates span and counts. */
export function backupSummary(b: Backup): { activities: number; logs: number; from: string | null; to: string | null } {
  const dates = b.logs.map((l) => l.date).sort();
  return { activities: b.activities.length, logs: b.logs.length, from: dates[0] ?? null, to: dates[dates.length - 1] ?? null };
}
