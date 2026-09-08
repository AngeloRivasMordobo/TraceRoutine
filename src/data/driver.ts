/**
 * Minimal SQL driver interface so repositories can be tested without a device.
 * Kept free of expo-sqlite imports so every platform can load it; the concrete
 * `ExpoSqliteDriver` lives in ./sqliteDriver, which has a web variant.
 */
import { MIGRATIONS } from './schema';

export type Row = Record<string, unknown>;
export type Param = string | number | null;

export interface SqlDriver {
  run(sql: string, params?: Param[]): Promise<void>;
  all<T extends Row = Row>(sql: string, params?: Param[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
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
