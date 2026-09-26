import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  /** Shown so the user can quote it; the API logs every line with it. */
  requestId?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  requestId,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 px-4 py-12 text-center"
    >
      <p className="text-base font-semibold text-text">{title}</p>
      <p className="max-w-md text-sm text-muted">{message}</p>
      {requestId && (
        <p className="text-xs text-muted">
          Request id: <span className="font-mono">{requestId}</span>
        </p>
      )}
      {onRetry && (
        <Button variant="secondary" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
