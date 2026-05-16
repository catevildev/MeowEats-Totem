import { useState } from "react";
import { useListarPedidos, useAtualizarStatusPedido, Pedido, AtualizarStatusInputStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Check, ChevronRight } from "lucide-react";
import { StandardNavbar } from "@/components/layout/Navbar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";

export default function CozinhaScreen() {
  const queryClient = useQueryClient();
  const { data: pedidos, isLoading } = useListarPedidos(
    undefined, 
    { query: { refetchInterval: 3000 } as any } // Poll every 3 seconds
  );
  
  const atualizarStatus = useAtualizarStatusPedido({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/pedidos'] });
      }
    }
  });

  const handleMove = async (id: number, currentStatus: string) => {
    let nextStatus: AtualizarStatusInputStatus = 'em_preparo';
    if (currentStatus === 'novo') nextStatus = 'em_preparo';
    else if (currentStatus === 'em_preparo') nextStatus = 'pronto';
    else if (currentStatus === 'pronto') nextStatus = 'entregue'; // Usually done on another screen, but keeping it simple

    await atualizarStatus.mutateAsync({ id, data: { status: nextStatus } });
  };

  const novos = pedidos?.filter(p => p.status === 'novo') || [];
  const emPreparo = pedidos?.filter(p => p.status === 'em_preparo') || [];
  const prontos = pedidos?.filter(p => p.status === 'pronto') || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StandardNavbar />
      
      <main className="flex-1 p-4 sm:p-6 overflow-hidden flex flex-col">
        <h1 className="text-3xl font-display font-bold mb-6">Painel da Cozinha</h1>
        
        {isLoading ? (
          <LoadingSpinner className="my-auto" />
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
            
            <KanbanColumn 
              title="Novos Pedidos" 
              count={novos.length} 
              color="bg-blue-500"
            >
              {novos.map(p => (
                <OrderCard key={p.id} pedido={p} onMove={() => handleMove(p.id, p.status)} actionLabel="Preparar" />
              ))}
            </KanbanColumn>

            <KanbanColumn 
              title="Em Preparo" 
              count={emPreparo.length} 
              color="bg-warning"
            >
              {emPreparo.map(p => (
                <OrderCard key={p.id} pedido={p} onMove={() => handleMove(p.id, p.status)} actionLabel="Pronto" isWarning />
              ))}
            </KanbanColumn>

            <KanbanColumn 
              title="Prontos" 
              count={prontos.length} 
              color="bg-success"
            >
              {prontos.map(p => (
                <OrderCard key={p.id} pedido={p} onMove={() => handleMove(p.id, p.status)} actionLabel="Entregue" isSuccess />
              ))}
            </KanbanColumn>

          </div>
        )}
      </main>
    </div>
  );
}

function KanbanColumn({ title, count, color, children }: { title: string, count: number, color: string, children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border flex flex-col overflow-hidden max-h-full">
      <div className="p-4 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${color}`} />
          <h2 className="font-bold text-xl">{title}</h2>
        </div>
        <span className="bg-background px-3 py-1 rounded-full text-sm font-bold border shadow-sm">
          {count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {children}
        {count === 0 && (
          <div className="h-32 flex items-center justify-center text-muted-foreground italic">
            Vazio
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ pedido, onMove, actionLabel, isWarning, isSuccess }: { pedido: Pedido, onMove: () => void, actionLabel: string, isWarning?: boolean, isSuccess?: boolean }) {
  const time = format(new Date(pedido.criadoEm), "HH:mm");
  
  return (
    <div className="bg-background border rounded-xl p-4 shadow-sm relative overflow-hidden group">
      {/* Type badge corner */}
      <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white rounded-bl-lg ${pedido.tipoPedido === 'para_viagem' ? 'bg-secondary' : 'bg-primary'}`}>
        {pedido.tipoPedido === 'para_viagem' ? 'Viagem' : 'Salão'}
      </div>

      <div className="flex items-center justify-between mb-3 border-b pb-3 pt-2">
        <h3 className="text-3xl font-display font-black text-foreground">{pedido.numero}</h3>
        <div className="flex items-center text-muted-foreground mr-16">
          <Clock className="w-4 h-4 mr-1" />
          <span className="font-medium">{time}</span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {pedido.itens?.map((item, idx) => (
          <div key={idx} className="flex gap-3">
            <span className="font-bold w-6 text-right shrink-0">{item.quantidade}x</span>
            <div>
              <p className="font-medium">{item.produto?.nome}</p>
              {item.observacoes && (
                <p className="text-sm text-destructive font-bold bg-destructive/10 px-2 py-1 rounded mt-1 w-fit border border-destructive/20">
                  OBS: {item.observacoes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={onMove}
        className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 text-white shadow-md
          ${isSuccess ? 'bg-success hover:bg-success/90' : isWarning ? 'bg-warning text-warning-foreground hover:bg-warning/90' : 'bg-blue-500 hover:bg-blue-600'}
        `}
      >
        {isSuccess ? <Check className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        {actionLabel}
      </button>
    </div>
  );
}
