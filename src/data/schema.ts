/**
 * SQLite schema (TR-16). Versioned migrations; dates stored as `YYYY-MM-DD` text.
 */
export interface Migration {
  version: number;
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        record_type TEXT NOT NULL CHECK (record_type IN ('check','minutes','amount')),
        unit TEXT,
        minimal TEXT,
        start TEXT NOT NULL,
        end TEXT,
        reminder TEXT,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS schedules (
        activity_id TEXT PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('daily','everyN','weekdays','perWeek','cycle')),
        n INTEGER,
        days TEXT,
        times INTEGER,
        anchor TEXT NOT NULL DEFAULT 'calendar' CHECK (anchor IN ('calendar','relative'))
      )`,
      `CREATE TABLE IF NOT EXISTS cycle_steps (
        activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        label TEXT NOT NULL,
        rest INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (activity_id, position)
      )`,
      `CREATE TABLE IF NOT EXISTS logs (
        activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('done','min','skip')),
        value REAL,
        note TEXT,
        reason TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (activity_id, date)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date)`,
      `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
    ],
  },
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
