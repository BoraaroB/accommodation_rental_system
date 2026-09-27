import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination';

export interface PagerProps {
  page: number;
  pageCount: number;
  /** The URL of a page, e.g. the current one with `page` changed. */
  hrefFor: (page: number) => string;
}

/**
 * Previous and next links around "Page N of M", on the kit's pagination;
 * hidden when there is one page. A link cannot be disabled, so the edge that
 * has no page is shown as plain text.
 */
export function Pager({ page, pageCount, hrefFor }: PagerProps) {
  if (pageCount <= 1) {
    return null;
  }
  return (
    <Pagination aria-label="Pagination">
      <PaginationContent className="w-full justify-between">
        <PaginationItem>
          {page > 1 ? (
            <PaginationPrevious to={hrefFor(page - 1)} />
          ) : (
            <Edge label="Previous" icon={<ChevronLeftIcon />} />
          )}
        </PaginationItem>
        <PaginationItem className="text-sm text-muted-foreground">
          Page {page} of {pageCount}
        </PaginationItem>
        <PaginationItem>
          {page < pageCount ? (
            <PaginationNext to={hrefFor(page + 1)} />
          ) : (
            <Edge label="Next" icon={<ChevronRightIcon />} end />
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function Edge({
  label,
  icon,
  end = false,
}: {
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}) {
  return (
    <span
      aria-disabled="true"
      className="flex h-8 items-center gap-1.5 px-2 text-sm text-muted-foreground opacity-50 [&_svg]:size-4"
    >
      {!end && icon}
      <span className="hidden sm:block">{label}</span>
      {end && icon}
    </span>
  );
}
