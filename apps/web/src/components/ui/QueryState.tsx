import type { ReactNode } from 'react';
import { getErrorMessage, getRequestId } from '../../api/errors';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Skeleton } from './Skeleton';

/** The part of an RTK Query hook result that `QueryState` reads. */
export interface QueryStateQuery<T> {
  /** The latest result; while new arguments load, the previous arguments' result. */
  data?: T;
  /** The result for the current arguments. */
  currentData?: T;
  error?: unknown;
  isError: boolean;
  refetch: () => unknown;
}

export interface QueryStateProps<T> {
  query: QueryStateQuery<T>;
  /** Renders the loaded data. */
  children: (data: T) => ReactNode;
  /** When it returns `true`, `empty` is shown instead of the data. */
  isEmpty?: (data: T) => boolean;
  loading?: ReactNode;
  empty?: ReactNode;
}

/**
 * Loading, error, empty or content for one query:
 * `<QueryState query={useGetXQuery()}>{(x) => …}</QueryState>`.
 */
export function QueryState<T>({
  query,
  children,
  isEmpty,
  loading = <Skeleton className="h-32 w-full" />,
  empty = <EmptyState title="Nothing to show yet" />,
}: QueryStateProps<T>) {
  // A failed refresh keeps the data already shown for these arguments; the
  // error middleware adds a toast when the server failed or was unreachable.
  if (query.isError && query.currentData === undefined) {
    return (
      <ErrorState
        message={getErrorMessage(query.error)}
        requestId={getRequestId(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (query.data === undefined) {
    return <div aria-busy="true">{loading}</div>;
  }
  if (isEmpty?.(query.data)) {
    return empty;
  }
  return children(query.data);
}
