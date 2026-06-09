import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "./AdminLayout";
import { formatCurrency } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { listarPagamentos, type PagamentoTef } from "@/lib/tef-api";
import { formatTefMensagemForDisplay } from "@/lib/tef-display";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClientTable } from "@/hooks/useClientTable";
import { TablePagination, TableToolbar } from "@/components/TablePagination";

type Filtro = "todos" | PagamentoTef["statusPagamento"];

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "pendente", label: "Pendentes" },
  { id: "aprovado", label: "Aprovados" },
  { id: "cancelado", label: "Cancelados" },
  { id: "negado", label: "Negados" },
];

export default function AdminPagamentos() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [lista, setLista] = useState<PagamentoTef[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<PagamentoTef | null>(null);

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
    data: lista,
    filterFn: (item, query, dFilter) => {
      // Date filter
      if (dFilter) {
        // Assume item.criadoEm is ISO string. Compare YYYY-MM-DD.
        const itemDate = new Date(item.criadoEm).toISOString().split('T')[0];
        if (itemDate !== dFilter) return false;
      }
      
      const q = query.toLowerCase();
      if (!q) return true;
      if (item.pedidoNumero?.toLowerCase().includes(q)) return true;
      if (String(item.pedidoId).includes(q)) return true;
      if (item.tefTransactionId?.toLowerCase().includes(q)) return true;
      return false;
    }
  });

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const data =
        filtro === "todos"
          ? await listarPagamentos()
          : await listarPagamentos(filtro);
      setLista(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [filtro]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pagamentos TEF</h1>
          <p className="text-muted-foreground">
            Aprovados, pendentes, cancelados e negados na maquininha — clique na linha para ver detalhes
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={cn(
                "px-4 py-2 rounded-xl border text-sm font-medium transition-colors",
                filtro === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <TableToolbar 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          searchPlaceholder="Buscar por pedido ou ID da transação..." 
        />

        {erro && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {erro}
          </div>
        )}

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-4 font-semibold text-muted-foreground">Data</th>
                    <th className="p-4 font-semibold text-muted-foreground">Forma</th>
                    <th className="p-4 font-semibold text-muted-foreground">Valor</th>
                    <th className="p-4 font-semibold text-muted-foreground">Status</th>
                    <th className="p-4 font-semibold text-muted-foreground">Pedido</th>
                    <th className="p-4 font-semibold text-muted-foreground">Mensagem TEF</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        {searchQuery ? "Nenhum pagamento encontrado na busca" : "Nenhum pagamento registrado"}
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((p) => {
                      const mensagem = formatTefMensagemForDisplay(
                        p.statusPagamento,
                        p.tefMensagem,
                        p.tefReason,
                      );
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-muted/30 cursor-pointer"
                          onClick={() => setSelecionado(p)}
                        >
                          <td className="p-4 text-muted-foreground">
                            {format(new Date(p.criadoEm), "dd/MM/yyyy HH:mm")}
                          </td>
                          <td className="p-4 uppercase font-medium">{p.formaPagamento}</td>
                          <td className="p-4 font-bold">{formatCurrency(p.valor)}</td>
                          <td className="p-4">
                            <StatusBadge status={p.statusPagamento} />
                          </td>
                          <td className="p-4 font-medium">
                            {p.pedidoNumero ?? (p.pedidoId ? `#${p.pedidoId}` : "—")}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">
                            {mensagem}
                          </td>
                        </tr>
                      );
                    })
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
        )}
      </div>

      <Dialog open={selecionado != null} onOpenChange={(open) => !open && setSelecionado(null)}>
        {selecionado && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes do pagamento #{selecionado.id}</DialogTitle>
              <DialogDescription>
                {format(new Date(selecionado.criadoEm), "dd/MM/yyyy 'às' HH:mm")}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 text-sm">
              <DetailRow label="Valor" value={formatCurrency(selecionado.valor)} />
              <DetailRow label="Forma" value={selecionado.formaPagamento.toUpperCase()} />
              <DetailRow
                label="Status"
                value={<StatusBadge status={selecionado.statusPagamento} />}
              />
              <DetailRow
                label="Pedido"
                value={
                  selecionado.pedidoNumero ? (
                    <Link
                      href="/admin/pedidos"
                      className="text-primary font-semibold hover:underline"
                    >
                      {selecionado.pedidoNumero}
                    </Link>
                  ) : selecionado.pedidoId ? (
                    `#${selecionado.pedidoId}`
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow
                label="Código SiTef"
                value={selecionado.tefCodigo != null ? String(selecionado.tefCodigo) : "—"}
              />
              <DetailRow
                label="Motivo"
                value={selecionado.tefReason ?? "—"}
              />
              <DetailRow
                label="ID transação"
                value={selecionado.tefTransactionId ?? "—"}
                mono
              />
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Mensagem TEF
                </p>
                <p className="text-sm leading-relaxed">
                  {formatTefMensagemForDisplay(
                    selecionado.statusPagamento,
                    selecionado.tefMensagem,
                    selecionado.tefReason,
                  )}
                </p>
                {selecionado.tefMensagem &&
                  selecionado.tefMensagem !==
                    formatTefMensagemForDisplay(
                      selecionado.statusPagamento,
                      selecionado.tefMensagem,
                      selecionado.tefReason,
                    ) && (
                    <p className="text-xs text-muted-foreground pt-1 border-t">
                      Original: {selecionado.tefMensagem}
                    </p>
                  )}
              </div>
              <DetailRow
                label="Atualizado em"
                value={format(new Date(selecionado.atualizadoEm), "dd/MM/yyyy HH:mm")}
              />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </AdminLayout>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn("text-right font-medium", mono && "font-mono text-xs break-all")}>
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: PagamentoTef["statusPagamento"] }) {
  const styles = {
    pendente: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    aprovado: "bg-success/10 text-success border-success/20",
    cancelado: "bg-muted text-muted-foreground border-border",
    negado: "bg-destructive/10 text-destructive border-destructive/20",
  };
  const labels = {
    pendente: "Pendente",
    aprovado: "Aprovado",
    cancelado: "Cancelado",
    negado: "Negado",
  };
  return (
    <span className={cn("px-3 py-1 text-xs font-bold rounded-full border", styles[status])}>
      {labels[status]}
    </span>
  );
}
