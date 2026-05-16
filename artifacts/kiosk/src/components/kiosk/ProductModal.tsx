import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus } from "lucide-react";
import { Produto, Extra } from "@workspace/api-client-react";
import { formatCurrency, cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/api-config";
import { useCart } from "@/context/CartContext";

interface ProductModalProps {
  produto: Produto;
  onClose: () => void;
}

export function ProductModal({ produto, onClose }: ProductModalProps) {
  const { addItem } = useCart();
  const [quantidade, setQuantidade] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<Extra[]>([]);
  const [observacoes, setObservacoes] = useState("");

  const extrasAdicionais = produto.extras?.filter(e => e.tipo === 'adicional') || [];
  const extrasRemocao = produto.extras?.filter(e => e.tipo === 'remocao') || [];

  const toggleExtra = (extra: Extra) => {
    if (selectedExtras.find(e => e.id === extra.id)) {
      setSelectedExtras(prev => prev.filter(e => e.id !== extra.id));
    } else {
      setSelectedExtras(prev => [...prev, extra]);
    }
  };

  const handleAddToCart = () => {
    addItem(produto, quantidade, selectedExtras, observacoes);
    onClose();
  };

  const basePrice = produto.preco;
  const extrasPrice = selectedExtras.reduce((sum, e) => sum + e.preco, 0);
  const totalPrice = (basePrice + extrasPrice) * quantidade;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-12">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.95 }}
        className="bg-card w-full max-w-4xl max-h-full rounded-[2rem] shadow-2xl flex flex-col overflow-hidden relative z-10"
      >
        {/* Header Image */}
        <div className="h-64 sm:h-80 bg-muted relative shrink-0">
          <img 
            src={resolveMediaUrl(produto.imagem) || `https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop`} 
            alt={produto.nome}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-14 h-14 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          <div className="absolute bottom-6 left-8 right-8 text-white">
            <h2 className="text-4xl font-display font-bold text-shadow-md mb-2">{produto.nome}</h2>
            <p className="text-lg text-white/90 line-clamp-2">{produto.descricao}</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
          
          {extrasAdicionais.length > 0 && (
            <section>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Plus className="text-primary" /> Adicionais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {extrasAdicionais.map(extra => {
                  const isSelected = selectedExtras.some(e => e.id === extra.id);
                  return (
                    <div 
                      key={extra.id}
                      onClick={() => toggleExtra(extra)}
                      className={cn(
                        "flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all active:scale-95",
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      )}
                    >
                      <span className="text-xl font-medium">{extra.nome}</span>
                      <span className="text-lg text-primary font-bold">+{formatCurrency(extra.preco)}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {extrasRemocao.length > 0 && (
            <section>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Minus className="text-destructive" /> Retirar ingredientes
              </h3>
              <div className="flex flex-wrap gap-3">
                {extrasRemocao.map(extra => {
                  const isSelected = selectedExtras.some(e => e.id === extra.id);
                  return (
                    <button
                      key={extra.id}
                      onClick={() => toggleExtra(extra)}
                      className={cn(
                        "px-6 py-3 rounded-full border-2 text-lg font-medium transition-all active:scale-95",
                        isSelected 
                          ? "bg-destructive text-destructive-foreground border-destructive" 
                          : "bg-card border-border hover:border-destructive/30 text-foreground"
                      )}
                    >
                      Sem {extra.nome}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-2xl font-bold mb-4">Observações</h3>
            <textarea 
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Ponto da carne, alergias..."
              className="w-full p-5 rounded-2xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-lg resize-none min-h-[120px]"
            />
          </section>

        </div>

        {/* Footer / Add to Cart */}
        <div className="p-6 border-t bg-card shrink-0 flex items-center gap-6">
          <div className="flex items-center bg-muted rounded-2xl p-2 shrink-0">
            <button 
              onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
              className="w-16 h-16 flex items-center justify-center bg-card rounded-xl shadow-sm hover:bg-white active:scale-95 transition-all text-2xl"
            >
              <Minus />
            </button>
            <span className="w-16 text-center text-3xl font-bold">{quantidade}</span>
            <button 
              onClick={() => setQuantidade(quantidade + 1)}
              className="w-16 h-16 flex items-center justify-center bg-card rounded-xl shadow-sm hover:bg-white active:scale-95 transition-all text-2xl"
            >
              <Plus />
            </button>
          </div>

          <button 
            onClick={handleAddToCart}
            className="flex-1 bg-primary text-primary-foreground h-20 rounded-2xl text-2xl font-bold shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-between px-8"
          >
            <span>Adicionar ao Pedido</span>
            <span>{formatCurrency(totalPrice)}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
