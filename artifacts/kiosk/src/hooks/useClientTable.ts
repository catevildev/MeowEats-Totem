import { useState, useMemo } from "react";
import { DateRange } from "react-day-picker";

interface UseClientTableProps<T> {
  data: T[] | undefined;
  filterFn?: (item: T, query: string, dateRange: DateRange | undefined) => boolean;
  initialItemsPerPage?: number;
}

export function useClientTable<T>({ data = [], filterFn, initialItemsPerPage = 10 }: UseClientTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const filteredData = useMemo(() => {
    if (!searchQuery && !dateRange && !filterFn) return data;
    const query = searchQuery.toLowerCase();
    return filterFn ? data.filter((item) => filterFn(item, query, dateRange)) : data;
  }, [data, searchQuery, dateRange, filterFn]);

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
    dateRange,
    setDateRange,
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
