/**
 * The env file the API loads: `.env.test` for tests (both Vitest configs set
 * `NODE_ENV=test`), `.env` otherwise. Relative to the working directory; a
 * missing file is skipped and real environment variables always win, so Docker
 * can pass everything through the environment.
 */
export function envFilePathFor(nodeEnv: string | undefined): string {
  return nodeEnv === 'test' ? '.env.test' : '.env';
}
