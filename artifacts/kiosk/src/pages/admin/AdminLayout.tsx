import { Link, useRoute } from "wouter";
import { LayoutDashboard, Layers, Package, ListOrdered } from "lucide-react";
import { StandardNavbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StandardNavbar />
      <div className="flex-1 flex w-full">
        <aside className="w-64 border-r bg-card/50 hidden md:block py-8 px-4">
          <nav className="space-y-2">
            <AdminNavLink href="/admin" icon={<LayoutDashboard />} label="Dashboard" exact />
            <AdminNavLink href="/admin/categorias" icon={<Layers />} label="Categorias" />
            <AdminNavLink href="/admin/produtos" icon={<Package />} label="Produtos" />
            <AdminNavLink href="/admin/pedidos" icon={<ListOrdered />} label="Pedidos" />
          </nav>
        </aside>
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
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
