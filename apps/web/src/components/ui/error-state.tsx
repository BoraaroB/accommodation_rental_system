import { TriangleAlertIcon } from 'lucide-react';
import { Button } from './button';

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
      <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <TriangleAlertIcon aria-hidden="true" className="size-5" />
      </span>
      <p className="text-base font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {requestId && (
        <p className="text-xs text-muted-foreground">
          Request id: <span className="font-mono">{requestId}</span>
        </p>
      )}
      {onRetry && (
        <Button variant="outline" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
