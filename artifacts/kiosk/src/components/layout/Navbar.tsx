import { Link, useRoute } from "wouter";
import { UtensilsCrossed, MonitorPlay, Settings, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function StandardNavbar() {
  return (
    <nav className="bg-card border-b shadow-sm sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="h-10" />
            <span className="font-display font-bold text-xl text-primary tracking-tight">Sistema de Autoatendimento</span>
          </div>

          <div className="flex space-x-1">
            <NavItem href="/" icon={<Home className="w-5 h-5" />} label="Totem" external />
            <NavItem href="/cozinha" icon={<UtensilsCrossed className="w-5 h-5" />} label="Cozinha" />
            <NavItem href="/tv" icon={<MonitorPlay className="w-5 h-5" />} label="Painel TV" />
            <NavItem href="/admin" icon={<Settings className="w-5 h-5" />} label="Admin" />
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavItem({ href, icon, label, external }: { href: string, icon: React.ReactNode, label: string, external?: boolean }) {
  const [isActive] = useRoute(href);
  const active = isActive && !external;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
        active
          ? "bg-primary text-primary-foreground shadow-md"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
