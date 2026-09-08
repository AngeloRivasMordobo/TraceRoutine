/**
 * The only module that imports expo-sqlite. Metro resolves `sqliteDriver.web.ts`
 * instead on web, so the wa-sqlite worker and its wasm never enter the web bundle
 * (web runs on the memory persister — see persistence.ts).
 */
import * as SQLite from 'expo-sqlite';
import type { Param, Row, SqlDriver } from './driver';

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
