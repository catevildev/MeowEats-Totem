import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  useListarCategorias,
  useListarProdutos,
  Produto,
  type Categoria,
} from "@workspace/api-client-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { KioskHeader } from "@/components/kiosk/Header";
import { ProductModal } from "@/components/kiosk/ProductModal";
import { formatCurrency, cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/api-config";

function CategorySidebarVisual({ cat }: { cat: Categoria }) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = resolveMediaUrl(cat.imagemUrl);

  if (url && !imgFailed) {
    return (
      <div
        className={cn(
          "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 border shadow-sm",
          "bg-background/80 border-border/40",
        )}
      >
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return <span className="text-4xl leading-none">{cat.icone || "🍔"}</span>;
}

interface MenuScreenProps {
  onBack: () => void;
  onGoToCart: () => void;
}

export function MenuScreen({ onBack, onGoToCart }: MenuScreenProps) {
  const { data: categorias, isLoading: loadingCat } = useListarCategorias();
  const categoriasOrdenadas = useMemo(
    () =>
      [...(categorias ?? [])].sort(
        (a, b) => a.ordem - b.ordem || a.id - b.id,
      ),
    [categorias],
  );
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);

  useEffect(() => {
    if (categoriasOrdenadas.length === 0) return;
    setActiveCategory((prev) => {
      if (prev === null) return categoriasOrdenadas[0].id;
      if (!categoriasOrdenadas.some((c) => c.id === prev)) {
        return categoriasOrdenadas[0].id;
      }
      return prev;
    });
  }, [categoriasOrdenadas]);

  const { data: produtos, isLoading: loadingProd } = useListarProdutos({
    categoria: activeCategory || undefined,
    ativo: true
  }, { query: { enabled: !!activeCategory } as any });

  return (
    <div className="fixed inset-0 bg-kiosk-bg flex flex-col">
      <KioskHeader 
        showBack 
        onBack={onBack} 
        showCart 
        onCartClick={onGoToCart}
        title="Cardápio"
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Categories */}
        <div className="w-48 sm:w-64 bg-card border-r shadow-sm overflow-y-auto scrollbar-hide py-6 flex flex-col gap-2 shrink-0">
          {loadingCat ? (
            <LoadingSpinner size={32} />
          ) : (
            categoriasOrdenadas.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "mx-4 p-5 rounded-2xl flex flex-col items-center gap-3 transition-all duration-300",
                  activeCategory === cat.id 
                    ? "bg-primary text-primary-foreground shadow-md scale-105" 
                    : "bg-muted/50 text-muted-foreground hover:bg-muted active:scale-95"
                )}
              >
                <CategorySidebarVisual cat={cat} />
                <span className="font-bold text-center leading-tight">{cat.nome}</span>
              </button>
            ))
          )}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 sm:p-8">
          {loadingProd ? (
            <div className="h-full flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : !produtos?.length ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <span className="text-6xl mb-4">🍽️</span>
              <p className="text-2xl font-medium">Nenhum produto nesta categoria.</p>
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-32"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {produtos.map((produto) => (
                <motion.div
                  key={produto.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedProduct(produto as Produto)}
                  className="bg-card rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl border border-border/50 transition-all duration-300 cursor-pointer group flex flex-col h-full active:scale-[0.98]"
                >
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    <img 
                      src={resolveMediaUrl(produto.imagem) || `https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop`} 
                      alt={produto.nome}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-2xl font-bold text-foreground mb-2 leading-tight">{produto.nome}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-6 flex-1">
                      {produto.descricao}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-2xl font-display font-bold text-primary">
                        {formatCurrency(produto.preco)}
                      </span>
                      <button className="bg-secondary/20 text-secondary-foreground w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-secondary transition-colors">
                        <span className="text-2xl font-bold">+</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedProduct && (
          <ProductModal 
            produto={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
