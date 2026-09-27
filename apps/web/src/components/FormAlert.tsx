import { getErrorMessage, isServerOrNetworkError } from '../api/errors';

/**
 * A request that failed, above its form. Server and network errors
 * are left to the error middleware's toast, so they are not shown twice.
 */
export function FormAlert({ error }: { error: unknown }) {
  if (error === undefined || isServerOrNetworkError(error)) {
    return null;
  }
  return (
    <p
      role="alert"
      className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {getErrorMessage(error)}
    </p>
  );
}
