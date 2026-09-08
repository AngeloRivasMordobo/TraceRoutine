/**
 * Web build of sqliteDriver. Keeps expo-sqlite out of the web bundle: `open()` rejects
 * and createPersister() uses the memory persister on web, so this is never constructed.
 */
import type { Param, Row, SqlDriver } from './driver';

export class ExpoSqliteDriver implements SqlDriver {
  static async open(_name = 'traceroutine.db'): Promise<ExpoSqliteDriver> {
    throw new Error('SQLite is not available on web');
  }

  run(_sql: string, _params: Param[] = []): Promise<void> {
    throw new Error('SQLite is not available on web');
  }
  all<T extends Row = Row>(_sql: string, _params: Param[] = []): Promise<T[]> {
    throw new Error('SQLite is not available on web');
  }
  exec(_sql: string): Promise<void> {
    throw new Error('SQLite is not available on web');
  }
}
