import { useMemo, useState } from 'react';

const DEFAULT_PAGE_SIZE = 24;

export function usePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [requestedPage, setRequestedPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const setPage = (nextPage: number) => {
    setRequestedPage(Math.max(1, Math.min(nextPage, totalPages)));
  };

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    setPage,
    totalPages,
    pageItems,
    pageSize,
    total: items.length,
    rangeStart: items.length === 0 ? 0 : (page - 1) * pageSize + 1,
    rangeEnd: Math.min(page * pageSize, items.length),
  };
}
