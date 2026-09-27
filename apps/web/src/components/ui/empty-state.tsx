import type { ReactNode } from 'react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './empty';

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** An icon above the title. */
  icon?: ReactNode;
  /** E.g. a button that clears the filters. */
  action?: ReactNode;
}

/** "Nothing here" with an optional way forward, built on the kit's `Empty`. */
export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        {icon && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
