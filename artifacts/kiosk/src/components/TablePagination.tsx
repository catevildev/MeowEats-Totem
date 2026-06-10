import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { NativeDatePicker } from "./ui/native-date-picker";
import { Search } from "lucide-react";


interface TableToolbarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  searchPlaceholder?: string;
  dataInicio?: string;
  setDataInicio?: (val: string) => void;
  dataFim?: string;
  setDataFim?: (val: string) => void;
  children?: React.ReactNode;
}

export function TableToolbar({ 
  searchQuery, 
  setSearchQuery, 
  searchPlaceholder = "Buscar...",
  dataInicio,
  setDataInicio,
  dataFim,
  setDataFim,
  children
}: TableToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
      <div className="relative flex-1 w-full max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {(setDataInicio || setDataFim) && (
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {setDataInicio && (
            <NativeDatePicker
              value={dataInicio || ""}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full sm:w-auto min-w-[150px]"
              title="Data Início"
            />
          )}
          <span className="text-muted-foreground text-sm font-medium">até</span>
          {setDataFim && (
            <NativeDatePicker
              value={dataFim || ""}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full sm:w-auto min-w-[150px]"
              title="Data Fim"
            />
          )}
        </div>
      )}
      
      {children && (
        <div className="w-full sm:w-auto shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  setPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  totalItems: number;
}

export function TablePagination({
  currentPage,
  totalPages,
  setPage,
  itemsPerPage,
  setItemsPerPage,
  totalItems,
}: TablePaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers
  const pages = [];
  const maxVisiblePages = 5;
  
  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push(-1); // Ellipsis
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (currentPage < totalPages - 2) pages.push(-1); // Ellipsis
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-2 py-4 border-t">
      <div className="flex-1 text-sm text-muted-foreground">
        Mostrando {startItem} a {endItem} de {totalItems} itens
      </div>
      
      <div className="flex items-center gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-muted-foreground">Itens por página</p>
          <Select
            value={`${itemsPerPage}`}
            onValueChange={(value) => setItemsPerPage(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={itemsPerPage} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setPage(currentPage - 1);
                }} 
                className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {pages.map((p, i) => (
              <PaginationItem key={i}>
                {p === -1 ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    isActive={p === currentPage}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(p);
                    }}
                    className="cursor-pointer"
                  >
                    {p}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext 
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setPage(currentPage + 1);
                }} 
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
