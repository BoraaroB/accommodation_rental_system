/** Tests only ever run against a database whose name ends with this suffix. */
const TEST_DATABASE_SUFFIX = '_test';

/**
 * The database name in a PostgreSQL connection string
 * (`postgresql://user:password@host:port/<name>?options`), or `''` when the
 * string is not a URL or names no database.
 */
export function databaseNameOf(url: string): string {
  return URL.canParse(url) ? new URL(url).pathname.slice(1) : '';
}

/** Whether the connection string points at a test database. */
export function isTestDatabaseUrl(url: string): boolean {
  return databaseNameOf(url).endsWith(TEST_DATABASE_SUFFIX);
}
