import { cx } from '../../lib/cx';

const tones = {
  info: 'border-l-primary',
  success: 'border-l-success',
  danger: 'border-l-danger',
} as const;

export type ToastTone = keyof typeof tones;

export interface ToastProps {
  tone: ToastTone;
  message: string;
  requestId?: string;
  onDismiss: () => void;
}

/** One notification; `components/Toasts` places and dismisses them. */
export function Toast({ tone, message, requestId, onDismiss }: ToastProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx(
        'flex items-start gap-3 rounded-card border border-l-4 border-border bg-surface-raised p-3 shadow-lg',
        tones[tone],
      )}
    >
      <div className="flex-1 text-sm text-text">
        <p>{message}</p>
        {requestId && (
          <p className="mt-1 text-xs text-muted">
            Request id: <span className="font-mono">{requestId}</span>
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        className="-my-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-lg text-muted hover:text-text"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}
