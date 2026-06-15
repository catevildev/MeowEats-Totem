import { Link, useRoute } from "wouter";
import { LayoutDashboard, Layers, Package, ListOrdered, CreditCard, Settings2, Printer } from "lucide-react";
import { StandardNavbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <StandardNavbar />
      <div className="flex-1 flex w-full overflow-hidden">
        <aside className="w-64 border-r bg-card/50 hidden md:block py-8 px-4 overflow-y-auto">
          <nav className="space-y-6">
            
            <div>
              <div className="px-4 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/50">Visão Geral</div>
              <div className="space-y-1">
                <AdminNavLink href="/admin" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" exact />
              </div>
            </div>

            <div>
              <div className="px-4 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/50">Cardápio</div>
              <div className="space-y-1">
                <AdminNavLink href="/admin/categorias" icon={<Layers className="w-5 h-5" />} label="Categorias" />
                <AdminNavLink href="/admin/produtos" icon={<Package className="w-5 h-5" />} label="Produtos" />
              </div>
            </div>

            <div>
              <div className="px-4 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/50">Operacional</div>
              <div className="space-y-1">
                <AdminNavLink href="/admin/pedidos" icon={<ListOrdered className="w-5 h-5" />} label="Pedidos" />
                <AdminNavLink href="/admin/pagamentos" icon={<CreditCard className="w-5 h-5" />} label="Pagamentos" />
              </div>
            </div>

            <div>
              <div className="px-4 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/50">Configurações</div>
              <div className="space-y-1">
                <AdminNavLink href="/admin/tef" icon={<Settings2 className="w-5 h-5" />} label="TEF / Loja" />
                <AdminNavLink href="/admin/impressoras" icon={<Printer className="w-5 h-5" />} label="Impressoras" />
              </div>
            </div>

          </nav>
        </aside>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminNavLink({ href, icon, label, exact }: { href: string, icon: React.ReactNode, label: string, exact?: boolean }) {
  const [isActive] = useRoute(exact ? href : `${href}/*`);
  
  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer font-medium",
        isActive 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}>
        {icon}
        {label}
      </div>
    </Link>
  );
}
