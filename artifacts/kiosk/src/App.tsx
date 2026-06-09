import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import KioskApp from "@/pages/Kiosk";
import CozinhaScreen from "@/pages/Cozinha";
import TVScreen from "@/pages/TV";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminCategorias from "@/pages/admin/Categorias";
import AdminProdutos from "@/pages/admin/Produtos";
import AdminPedidos from "@/pages/admin/Pedidos";
import AdminPagamentos from "@/pages/admin/Pagamentos";
import AdminTefConfig from "@/pages/admin/TefConfig";
import AdminImpressoras from "@/pages/admin/Impressoras";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Client Facing Kiosk (Full Screen, no standard nav) */}
      <Route path="/" component={KioskApp} />
      
      {/* Operations Displays */}
      <Route path="/cozinha" component={CozinhaScreen} />
      <Route path="/tv" component={TVScreen} />
      
      {/* Admin Panel */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/categorias" component={AdminCategorias} />
      <Route path="/admin/produtos" component={AdminProdutos} />
      <Route path="/admin/pedidos" component={AdminPedidos} />
      <Route path="/admin/pagamentos" component={AdminPagamentos} />
      <Route path="/admin/tef" component={AdminTefConfig} />
      <Route path="/admin/impressoras" component={AdminImpressoras} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
