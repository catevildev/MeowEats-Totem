import { useRelatorioVendas } from "@workspace/api-client-react";
import { AdminLayout } from "./AdminLayout";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, ShoppingBag, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";

export default function AdminDashboard() {
  const hoje = format(new Date(), "yyyy-MM-dd");
  const { data: stats, isLoading } = useRelatorioVendas({ data: hoje });

  if (isLoading) return <AdminLayout><LoadingSpinner /></AdminLayout>;

  const totalVendas = stats?.totalVendas ?? 0;
  const totalPedidos = stats?.totalPedidos ?? 0;
  const ticketMedio = stats?.ticketMedio ?? 0;
  const chartData = stats?.vendasPorHora ?? [];
  const produtos = stats?.produtosMaisVendidos ?? [];
  const dataLabel = format(new Date(), "dd/MM/yyyy");

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do dia ({dataLabel}) — pedidos não cancelados
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard 
            title="Vendas Totais" 
            value={formatCurrency(totalVendas)} 
            icon={<DollarSign className="text-primary" />} 
          />
          <StatCard 
            title="Pedidos Realizados" 
            value={totalPedidos.toString()} 
            icon={<ShoppingBag className="text-secondary" />} 
          />
          <StatCard 
            title="Ticket Médio" 
            value={formatCurrency(ticketMedio)} 
            icon={<TrendingUp className="text-success" />} 
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-6">Vendas por Hora</h3>
            <div className="h-[300px] w-full">
              {chartData.some((h) => h.total > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="hora" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Nenhuma venda registrada hoje
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="font-semibold text-lg mb-6">Produtos Mais Vendidos</h3>
            <div className="flex-1 space-y-4">
              {produtos.length > 0 ? (
                produtos.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-bold">{item.produto}</p>
                        <p className="text-sm text-muted-foreground">{item.quantidade} unidades</p>
                      </div>
                    </div>
                    <div className="font-bold">{formatCurrency(item.total)}</div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-12">
                  Nenhum produto vendido hoje
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-2xl p-6 shadow-sm flex items-center gap-4">
      <div className="p-4 bg-muted rounded-xl">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h3 className="text-3xl font-display font-bold mt-1">{value}</h3>
      </div>
    </div>
  );
}
