/**
 * Minimal SQL driver interface so repositories can be tested without a device.
 * `ExpoSqliteDriver` wraps expo-sqlite's async API.
 */
import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './schema';

export type Row = Record<string, unknown>;
export type Param = string | number | null;

export interface SqlDriver {
  run(sql: string, params?: Param[]): Promise<void>;
  all<T extends Row = Row>(sql: string, params?: Param[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
}

export class ExpoSqliteDriver implements SqlDriver {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  static async open(name = 'traceroutine.db'): Promise<ExpoSqliteDriver> {
    const db = await SQLite.openDatabaseAsync(name);
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    return new ExpoSqliteDriver(db);
  }

  run(sql: string, params: Param[] = []): Promise<void> {
    return this.db.runAsync(sql, params).then(() => undefined);
  }
  all<T extends Row = Row>(sql: string, params: Param[] = []): Promise<T[]> {
    return this.db.getAllAsync<T>(sql, params);
  }
  exec(sql: string): Promise<void> {
    return this.db.execAsync(sql);
  }
}

/** Applies pending migrations in order. Idempotent. */
export async function migrate(driver: SqlDriver): Promise<number> {
  await driver.exec(MIGRATIONS[0].statements[0]); // schema_version table
  const rows = await driver.all<{ version: number }>('SELECT version FROM schema_version LIMIT 1');
  let current = rows[0]?.version ?? 0;
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    for (const s of m.statements) await driver.exec(s);
    if (current === 0) await driver.run('INSERT INTO schema_version (version) VALUES (?)', [m.version]);
    else await driver.run('UPDATE schema_version SET version = ?', [m.version]);
    current = m.version;
  }
  return current;
}
