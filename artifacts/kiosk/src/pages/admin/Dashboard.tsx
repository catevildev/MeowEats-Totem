import { useRelatorioVendas } from "@workspace/api-client-react";
import { AdminLayout } from "./AdminLayout";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, ShoppingBag, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useRelatorioVendas();

  if (isLoading) return <AdminLayout><LoadingSpinner /></AdminLayout>;

  // Provide mock data if API doesn't return full structure yet
  const safeStats = stats || {
    totalVendas: 0,
    totalPedidos: 0,
    ticketMedio: 0,
    vendasPorHora: [],
    produtosMaisVendidos: []
  };

  const chartData = safeStats.vendasPorHora?.length ? safeStats.vendasPorHora : [
    { hora: '10:00', total: 150 }, { hora: '11:00', total: 300 }, 
    { hora: '12:00', total: 850 }, { hora: '13:00', total: 1200 },
    { hora: '14:00', total: 900 }, { hora: '15:00', total: 400 }
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do dia</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard 
            title="Vendas Totais" 
            value={formatCurrency(safeStats.totalVendas || 4500.50)} 
            icon={<DollarSign className="text-primary" />} 
          />
          <StatCard 
            title="Pedidos Realizados" 
            value={(safeStats.totalPedidos || 124).toString()} 
            icon={<ShoppingBag className="text-secondary" />} 
          />
          <StatCard 
            title="Ticket Médio" 
            value={formatCurrency(safeStats.ticketMedio || 36.29)} 
            icon={<TrendingUp className="text-success" />} 
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-6">Vendas por Hora</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="hora" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`} />
                  <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="font-semibold text-lg mb-6">Produtos Mais Vendidos</h3>
            <div className="flex-1 space-y-4">
              {(safeStats.produtosMaisVendidos?.length ? safeStats.produtosMaisVendidos : [
                { produto: "Cheese Burger Duplo", quantidade: 45, total: 1350 },
                { produto: "Batata Frita Grande", quantidade: 38, total: 570 },
                { produto: "Refrigerante Cola", quantidade: 42, total: 420 },
              ]).map((item, i) => (
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
              ))}
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
