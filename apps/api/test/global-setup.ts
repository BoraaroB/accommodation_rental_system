import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { isTestDatabaseUrl } from '../src/core/config/database-url.js';
import { envFilePathFor } from '../src/core/config/env-file.js';

/**
 * Runs once before the e2e tests: brings the test database up to date with
 * `prisma migrate deploy`, which applies pending migrations and never drops
 * data. Stops when the URL does not name a `_test` database, so the tests
 * never write to another one.
 */
export function setup(): void {
  const url = testDatabaseUrl();
  if (!isTestDatabaseUrl(url)) {
    throw new Error(
      'e2e tests need DATABASE_URL (in .env.test or the environment) to name a database ending in _test',
    );
  }
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}

/** The URL the API will use in the tests: the environment wins over the env file, as in `AppConfigModule`. */
function testDatabaseUrl(): string {
  if (process.env.DATABASE_URL !== undefined) {
    return process.env.DATABASE_URL;
  }
  const envFile = envFilePathFor('test');
  try {
    return parse(readFileSync(envFile)).DATABASE_URL ?? '';
  } catch {
    return '';
  }
}
