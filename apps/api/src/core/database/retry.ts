export interface RetryOptions {
  /** How many times the operation runs at most. */
  attempts: number;
  /** Pause between two attempts. */
  delayMs: number;
  /** Called after each failed attempt except the last. */
  onRetry?: (attempt: number, error: unknown) => void;
}

/** Runs `operation` until it succeeds; after the last failed attempt its error is thrown. */
export async function retry<T>(
  operation: () => Promise<T>,
  { attempts, delayMs, onRetry }: RetryOptions,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts) {
        throw error;
      }
      onRetry?.(attempt, error);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
