/**
 * Repositories (TR-16): typed access to activities, logs and settings.
 * The engine reads logs through `LogLookup`; `loadLogLookup` builds one from a date range.
 */
import type { Activity, DateKey, Log, LogLookup, LogState } from '../engine/types';
import type { Param, Row, SqlDriver } from './driver';

interface ActivityRow extends Row {
  id: string; name: string; icon: string; color: string; record_type: Activity['record'];
  unit: string | null; minimal: string | null; start: string; end: string | null; reminder: string | null; archived: number;
  type: Activity['freq']['type']; n: number | null; days: string | null; times: number | null; anchor: 'calendar' | 'relative';
}
interface StepRow extends Row { activity_id: string; position: number; label: string; rest: number }
interface LogRow extends Row { activity_id: string; date: string; state: LogState; value: number | null; note: string | null; reason: string | null }

const ACTIVITY_SELECT = `SELECT a.*, s.type, s.n, s.days, s.times, s.anchor
  FROM activities a JOIN schedules s ON s.activity_id = a.id`;

function toActivity(r: ActivityRow, steps: StepRow[]): Activity {
  return {
    id: r.id, name: r.name, icon: r.icon, color: r.color, record: r.record_type,
    unit: r.unit, minimal: r.minimal, start: r.start, end: r.end, reminder: r.reminder, archived: !!r.archived,
    freq: {
      type: r.type, n: r.n ?? undefined, times: r.times ?? undefined, anchor: r.anchor,
      days: r.days ? (JSON.parse(r.days) as number[]) : undefined,
      steps: steps.filter((s) => s.activity_id === r.id).sort((a, b) => a.position - b.position).map((s) => ({ label: s.label, rest: !!s.rest })),
    },
  };
}

export class ActivityRepository {
  constructor(private readonly db: SqlDriver) {}

  async list(opts: { includeArchived?: boolean } = {}): Promise<Activity[]> {
    const rows = await this.db.all<ActivityRow>(`${ACTIVITY_SELECT} ${opts.includeArchived ? '' : 'WHERE a.archived = 0'} ORDER BY a.created_at`);
    const steps = await this.db.all<StepRow>('SELECT * FROM cycle_steps');
    return rows.map((r) => toActivity(r, steps));
  }

  async get(id: string): Promise<Activity | null> {
    const rows = await this.db.all<ActivityRow>(`${ACTIVITY_SELECT} WHERE a.id = ?`, [id]);
    if (!rows.length) return null;
    const steps = await this.db.all<StepRow>('SELECT * FROM cycle_steps WHERE activity_id = ?', [id]);
    return toActivity(rows[0], steps);
  }

  async save(a: Activity): Promise<void> {
    const f = a.freq;
    await this.db.run(
      `INSERT INTO activities (id, name, icon, color, record_type, unit, minimal, start, end, reminder, archived)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, icon=excluded.icon, color=excluded.color, record_type=excluded.record_type,
         unit=excluded.unit, minimal=excluded.minimal, start=excluded.start, end=excluded.end, reminder=excluded.reminder, archived=excluded.archived`,
      [a.id, a.name, a.icon, a.color, a.record, a.unit ?? null, a.minimal ?? null, a.start, a.end ?? null, a.reminder ?? null, a.archived ? 1 : 0],
    );
    await this.db.run(
      `INSERT INTO schedules (activity_id, type, n, days, times, anchor) VALUES (?,?,?,?,?,?)
       ON CONFLICT(activity_id) DO UPDATE SET type=excluded.type, n=excluded.n, days=excluded.days, times=excluded.times, anchor=excluded.anchor`,
      [a.id, f.type, f.n ?? null, f.days ? JSON.stringify(f.days) : null, f.times ?? null, f.anchor ?? 'calendar'],
    );
    await this.db.run('DELETE FROM cycle_steps WHERE activity_id = ?', [a.id]);
    for (const [i, s] of (f.steps ?? []).entries()) {
      await this.db.run('INSERT INTO cycle_steps (activity_id, position, label, rest) VALUES (?,?,?,?)', [a.id, i, s.label, s.rest ? 1 : 0]);
    }
  }

  setArchived(id: string, archived: boolean): Promise<void> {
    return this.db.run('UPDATE activities SET archived = ? WHERE id = ?', [archived ? 1 : 0, id]);
  }

  /** Deletes the activity and, through ON DELETE CASCADE, its schedule, steps and logs. */
  delete(id: string): Promise<void> {
    return this.db.run('DELETE FROM activities WHERE id = ?', [id]);
  }

  async countActive(): Promise<number> {
    const rows = await this.db.all<{ c: number }>('SELECT COUNT(*) AS c FROM activities WHERE archived = 0');
    return rows[0]?.c ?? 0;
  }
}

export class LogRepository {
  constructor(private readonly db: SqlDriver) {}

  async upsert(log: Log): Promise<void> {
    await this.db.run(
      `INSERT INTO logs (activity_id, date, state, value, note, reason, updated_at) VALUES (?,?,?,?,?,?, datetime('now'))
       ON CONFLICT(activity_id, date) DO UPDATE SET state=excluded.state, value=excluded.value, note=excluded.note, reason=excluded.reason, updated_at=excluded.updated_at`,
      [log.activityId, log.date, log.state, log.value ?? null, log.note ?? null, log.reason ?? null],
    );
  }

  /** Sets a state or clears the log when `state` is null (the "empty" step of the tap cycle). */
  async set(activityId: string, date: DateKey, state: LogState | null, extra: Partial<Log> = {}): Promise<void> {
    if (state === null) return this.db.run('DELETE FROM logs WHERE activity_id = ? AND date = ?', [activityId, date]);
    return this.upsert({ activityId, date, state, ...extra });
  }

  async range(from: DateKey, to: DateKey, activityId?: string): Promise<Log[]> {
    const params: Param[] = [from, to];
    let sql = 'SELECT * FROM logs WHERE date BETWEEN ? AND ?';
    if (activityId) { sql += ' AND activity_id = ?'; params.push(activityId); }
    const rows = await this.db.all<LogRow>(sql, params);
    return rows.map((r) => ({ activityId: r.activity_id, date: r.date, state: r.state, value: r.value, note: r.note, reason: r.reason }));
  }

  /** Builds the engine's `LogLookup` from every log up to `to` (relative rules need history). */
  async lookup(to: DateKey): Promise<LogLookup> {
    const rows = await this.db.all<LogRow>('SELECT activity_id, date, state FROM logs WHERE date <= ?', [to]);
    const map = new Map<string, LogState>();
    for (const r of rows) map.set(`${r.activity_id}|${r.date}`, r.state);
    return (id, date) => map.get(`${id}|${date}`) ?? null;
  }
}

export class SettingsRepository {
  constructor(private readonly db: SqlDriver) {}
  async get(key: string): Promise<string | null> {
    const rows = await this.db.all<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    return rows[0]?.value ?? null;
  }
  set(key: string, value: string): Promise<void> {
    return this.db.run('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
  }
  async clearAll(): Promise<void> {
    for (const t of ['logs', 'cycle_steps', 'schedules', 'activities', 'settings']) await this.db.run(`DELETE FROM ${t}`);
  }
}
