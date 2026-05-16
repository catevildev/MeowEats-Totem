import { motion } from "framer-motion";
import { Trash2, Plus, Minus, ChevronRight, AlertCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { KioskHeader } from "@/components/kiosk/Header";
import { formatCurrency } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/api-config";

interface CartScreenProps {
  onBack: () => void;
  onProceed: () => void;
}

export function CartScreen({ onBack, onProceed }: CartScreenProps) {
  const { items, updateQuantity, removeItem, total, orderType } = useCart();

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 bg-kiosk-bg flex flex-col">
        <KioskHeader showBack onBack={onBack} title="Seu Pedido" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <AlertCircle className="w-32 h-32 text-muted-foreground mb-6 opacity-20" />
          <h2 className="text-4xl font-display font-bold text-foreground mb-4">Seu carrinho está vazio</h2>
          <button 
            onClick={onBack}
            className="bg-primary text-primary-foreground px-8 py-4 rounded-2xl text-xl font-bold shadow-lg hover:-translate-y-1 active:scale-95 transition-all"
          >
            Voltar ao Cardápio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-kiosk-bg flex flex-col">
      <KioskHeader showBack onBack={onBack} title="Revise seu Pedido" />
      
      <div className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
          
          {/* Items List */}
          <div className="flex-1 space-y-4 pb-40 lg:pb-0">
            {items.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-card rounded-3xl p-6 shadow-sm flex items-center gap-6"
              >
                <div className="w-32 h-32 bg-muted rounded-2xl overflow-hidden shrink-0">
                  <img 
                    src={resolveMediaUrl(item.produto.imagem) || `https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop`} 
                    alt={item.produto.nome}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-foreground">{item.produto.nome}</h3>
                  
                  {(item.extras.length > 0 || item.observacoes) && (
                    <div className="mt-2 text-muted-foreground text-sm space-y-1">
                      {item.extras.map(e => (
                        <p key={e.id}>• {e.tipo === 'remocao' ? 'Sem' : 'Com'} {e.nome}</p>
                      ))}
                      {item.observacoes && <p className="italic text-primary/80">"{item.observacoes}"</p>}
                    </div>
                  )}
                  
                  <div className="mt-4 text-xl font-bold text-primary">
                    {formatCurrency(item.precoTotal)}
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between h-32">
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="text-muted-foreground hover:text-destructive p-2 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-8 h-8" />
                  </button>
                  
                  <div className="flex items-center bg-muted rounded-xl p-1">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                      className="w-12 h-12 flex items-center justify-center bg-card rounded-lg shadow-sm hover:bg-white active:scale-95 transition-all text-xl"
                    >
                      <Minus className="w-6 h-6" />
                    </button>
                    <span className="w-12 text-center text-xl font-bold">{item.quantidade}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                      className="w-12 h-12 flex items-center justify-center bg-card rounded-lg shadow-sm hover:bg-white active:scale-95 transition-all text-xl"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            
            <button 
              onClick={onBack}
              className="w-full py-6 rounded-3xl border-4 border-dashed border-primary/30 text-primary hover:bg-primary/5 active:bg-primary/10 transition-colors text-xl font-bold flex items-center justify-center gap-3"
            >
              <Plus className="w-6 h-6" />
              Adicionar Mais Itens
            </button>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:w-[400px] shrink-0">
            <div className="bg-card rounded-3xl p-8 shadow-xl sticky top-8">
              <h3 className="text-2xl font-display font-bold mb-6 border-b pb-4">Resumo</h3>
              
              <div className="space-y-4 mb-8 text-lg">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tipo</span>
                  <span className="font-medium text-foreground">
                    {orderType === 'comer_aqui' ? 'Comer Aqui' : 'Para Viagem'}
                  </span>
                </div>
                <div className="flex justify-between text-2xl font-bold pt-4 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              <button 
                onClick={onProceed}
                className="w-full bg-primary text-primary-foreground py-6 rounded-2xl text-2xl font-bold shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 group"
              >
                Pagamento
                <ChevronRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
