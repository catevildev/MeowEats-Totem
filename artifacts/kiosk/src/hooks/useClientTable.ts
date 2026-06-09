import { useState, useMemo } from "react";

interface UseClientTableProps<T> {
  data: T[] | undefined;
  filterFn?: (item: T, query: string, dateFilter: string) => boolean;
  initialItemsPerPage?: number;
}

export function useClientTable<T>({ data = [], filterFn, initialItemsPerPage = 10 }: UseClientTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const filteredData = useMemo(() => {
    if (!searchQuery && !dateFilter && !filterFn) return data;
    const query = searchQuery.toLowerCase();
    return filterFn ? data.filter((item) => filterFn(item, query, dateFilter)) : data;
  }, [data, searchQuery, dateFilter, filterFn]);

  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Ensure current page is valid after filtering
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, itemsPerPage]);

  const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return {
    paginatedData,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    currentPage,
    setPage,
    itemsPerPage,
    setItemsPerPage: (limit: number) => {
      setItemsPerPage(limit);
      setCurrentPage(1);
    },
    totalPages,
    totalItems,
  };
}
