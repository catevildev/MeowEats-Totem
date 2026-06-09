import { useListarPedidos } from "@workspace/api-client-react";
import { AdminLayout } from "./AdminLayout";
import { formatCurrency } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import * as React from "react";
import { useClientTable } from "@/hooks/useClientTable";
import { TablePagination, TableToolbar } from "@/components/TablePagination";
export default function AdminPedidos() {
  const { data: pedidos, isLoading } = useListarPedidos();

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'novo': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'em_preparo': return 'bg-warning/10 text-warning-foreground border-warning/20';
      case 'pronto': return 'bg-success/10 text-success border-success/20';
      case 'entregue': return 'bg-muted text-muted-foreground border-border';
      case 'cancelado': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  const sortedPedidos = React.useMemo(() => {
    if (!pedidos) return [];
    return [...pedidos].sort((a,b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  }, [pedidos]);

  const {
    paginatedData,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    currentPage,
    setPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    totalItems,
  } = useClientTable({
    data: sortedPedidos,
    filterFn: (item, query, dFilter) => {
      if (dFilter) {
        const itemDate = new Date(item.criadoEm).toISOString().split('T')[0];
        if (itemDate !== dFilter) return false;
      }
      
      const q = query.toLowerCase();
      if (!q) return true;
      if (item.numero?.toLowerCase().includes(q)) return true;
      if (item.itens?.some((i: any) => i.produto?.nome?.toLowerCase().includes(q))) return true;
      return false;
    }
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico de Pedidos</h1>
          <p className="text-muted-foreground">
            Histórico completo — o Dashboard mostra apenas o resumo do dia atual
          </p>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-4">
            <TableToolbar 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery} 
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              searchPlaceholder="Buscar por número do pedido ou produto..." 
            />
            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-4 font-semibold text-muted-foreground">Número</th>
                    <th className="p-4 font-semibold text-muted-foreground">Data/Hora</th>
                    <th className="p-4 font-semibold text-muted-foreground">Itens</th>
                    <th className="p-4 font-semibold text-muted-foreground">Total</th>
                    <th className="p-4 font-semibold text-muted-foreground">Tipo</th>
                    <th className="p-4 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        {searchQuery ? "Nenhum pedido encontrado na busca" : "Nenhum pedido registrado"}
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-display font-bold text-lg">{p.numero}</td>
                      <td className="p-4 text-muted-foreground">
                        {format(new Date(p.criadoEm), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col text-sm">
                          {p.itens?.map((i, idx) => (
                            <span key={idx}>{i.quantidade}x {i.produto?.nome || 'Produto'}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-primary">{formatCurrency(p.total)}</td>
                      <td className="p-4 text-sm font-medium">
                        {p.tipoPedido === 'para_viagem' ? 'Viagem' : 'Salão'}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(p.status)}`}>
                          {getStatusLabel(p.status)}
                        </span>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              setPage={setPage}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              totalItems={totalItems}
            />
          </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
