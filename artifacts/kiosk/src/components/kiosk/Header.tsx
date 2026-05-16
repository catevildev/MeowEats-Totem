import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  showCart?: boolean;
  onCartClick?: () => void;
}

export function KioskHeader({ title, showBack, onBack, showCart, onCartClick }: HeaderProps) {
  const { itemCount, total } = useCart();

  return (
    <header className="h-24 bg-card shadow-sm border-b px-6 flex items-center justify-between shrink-0 sticky top-0 z-40">
      <div className="flex-1 flex items-center justify-start">
        {showBack && (
          <button 
            onClick={onBack}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-secondary/20 text-secondary-foreground hover:bg-secondary/30 active:scale-95 transition-all text-xl font-bold"
          >
            <ArrowLeft className="w-8 h-8" />
            Voltar
          </button>
        )}
      </div>

      <div className="flex-1 flex justify-center items-center">
        {title ? (
          <h1 className="text-3xl font-display font-bold text-foreground">{title}</h1>
        ) : (
          <img 
            src={`${import.meta.env.BASE_URL}images/logo.png`} 
            alt="Logo" 
            className="h-16 object-contain"
          />
        )}
      </div>

      <div className="flex-1 flex justify-end">
        {showCart && itemCount > 0 && (
          <button 
            onClick={onCartClick}
            className="flex items-center gap-4 bg-primary text-primary-foreground px-6 py-4 rounded-2xl shadow-lg shadow-primary/25 hover:-translate-y-1 active:scale-95 transition-all"
          >
            <div className="relative">
              <ShoppingBag className="w-8 h-8" />
              <span className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            </div>
            <div className="text-right flex flex-col">
              <span className="text-sm font-medium opacity-90 leading-none">Ver Pedido</span>
              <span className="text-xl font-bold leading-none mt-1">{formatCurrency(total)}</span>
            </div>
          </button>
        )}
      </div>
    </header>
  );
}
