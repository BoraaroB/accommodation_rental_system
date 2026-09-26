import { useEffect } from 'react';
import { Toast } from './ui/Toast';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toastDismissed, type ToastMessage } from '../store/uiSlice';

/** How long a toast stays before it dismisses itself. */
export const TOAST_DURATION_MS = 6000;

function AutoDismissToast({ toast }: { toast: ToastMessage }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = setTimeout(
      () => dispatch(toastDismissed(toast.id)),
      TOAST_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [dispatch, toast.id]);

  return (
    <Toast
      tone={toast.tone}
      message={toast.message}
      requestId={toast.requestId}
      onDismiss={() => dispatch(toastDismissed(toast.id))}
    />
  );
}

/** The toast stack: bottom of the screen on phones, bottom right on desktop. */
export function Toasts() {
  const toasts = useAppSelector((state) => state.ui.toasts);

  return (
    // Each toast is its own live region (`role="alert"` or `role="status"`).
    <div className="fixed inset-x-4 bottom-20 z-50 flex flex-col gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:w-96">
      {toasts.map((toast) => (
        <AutoDismissToast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
