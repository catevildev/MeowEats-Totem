import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, Minus, Check } from "lucide-react";
import { Produto, Extra } from "@workspace/api-client-react";
import { formatCurrency, cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/api-config";
import { useCart } from "@/context/CartContext";
import {
  agruparExtras,
  subtituloGrupo,
  type GrupoOpcaoExibicao,
} from "@/lib/product-options";

interface ProductModalProps {
  produto: Produto;
  onClose: () => void;
}

export function ProductModal({ produto, onClose }: ProductModalProps) {
  const { addItem } = useCart();
  const [quantidade, setQuantidade] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<Extra[]>([]);
  const [observacoes, setObservacoes] = useState("");

  const grupos = useMemo(
    () => agruparExtras(produto.extras ?? []),
    [produto.extras],
  );
  const extrasRemocao =
    produto.extras?.filter((e) => e.tipo === "remocao") ?? [];

  const selectedIds = useMemo(
    () => new Set(selectedExtras.map((e) => e.id)),
    [selectedExtras],
  );

  function countInGroup(grupo: GrupoOpcaoExibicao) {
    return grupo.itens.filter((i) => selectedIds.has(i.id)).length;
  }

  function toggleExtra(grupo: GrupoOpcaoExibicao, extra: Extra) {
    const selected = selectedIds.has(extra.id);

    if (grupo.modo === "unica" || grupo.modo === "sim_nao") {
      const withoutGroup = selectedExtras.filter(
        (e) => !grupo.itens.some((i) => i.id === e.id),
      );
      setSelectedExtras(selected ? withoutGroup : [...withoutGroup, extra]);
      return;
    }

    if (selected) {
      setSelectedExtras((prev) => prev.filter((e) => e.id !== extra.id));
      return;
    }
    if (countInGroup(grupo) >= grupo.maxSelecoes) return;
    setSelectedExtras((prev) => [...prev, extra]);
  }

  const gruposObrigatoriosOk = grupos
    .filter((g) => g.obrigatorio)
    .every((g) => countInGroup(g) > 0);

  const handleAddToCart = () => {
    if (!gruposObrigatoriosOk) return;
    addItem(produto, quantidade, selectedExtras, observacoes);
    onClose();
  };

  const extrasPrice = selectedExtras.reduce((sum, e) => sum + e.preco, 0);
  const totalPrice = (produto.preco + extrasPrice) * quantidade;

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
        <div className="h-64 sm:h-80 bg-muted relative shrink-0">
          {resolveMediaUrl(produto.imagem) ? (
            <img
              src={resolveMediaUrl(produto.imagem)}
              alt={produto.nome}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg">
              Sem foto — só texto no cardápio
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-14 h-14 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          <div className="absolute bottom-6 left-8 right-8 text-white">
            <h2 className="text-4xl font-display font-bold text-shadow-md mb-2">
              {produto.nome}
            </h2>
            <p className="text-lg text-white/90 line-clamp-2">
              {produto.descricao}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
          {grupos.map((grupo) => {
            const picked = countInGroup(grupo);
            return (
              <section key={grupo.key}>
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <h3 className="text-2xl font-bold">{grupo.titulo}</h3>
                  {grupo.obrigatorio && (
                    <span className="text-xs font-bold uppercase tracking-wide bg-foreground text-background px-2 py-0.5 rounded">
                      Obrigatório
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <p className="text-muted-foreground flex-1 min-w-[12rem]">
                    {subtituloGrupo(grupo)}
                  </p>
                  <span className="text-sm font-semibold tabular-nums bg-muted px-3 py-1 rounded-full">
                    {picked}/{grupo.maxSelecoes}
                  </span>
                </div>
                <div className="rounded-2xl border-2 border-border overflow-hidden divide-y divide-border">
                  {grupo.itens.map((extra) => {
                    const isSelected = selectedIds.has(extra.id);
                    const atMax =
                      grupo.modo === "multipla" &&
                      !isSelected &&
                      picked >= grupo.maxSelecoes;
                    const imgUrl = resolveMediaUrl(extra.imagem);
                    const escolhaUnica =
                      grupo.modo === "unica" || grupo.modo === "sim_nao";
                    return (
                      <button
                        key={extra.id}
                        type="button"
                        disabled={atMax}
                        onClick={() => !atMax && toggleExtra(grupo, extra)}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 sm:p-5 text-left transition-colors",
                          atMax
                            ? "opacity-40 cursor-not-allowed"
                            : "cursor-pointer hover:bg-muted/40 active:bg-muted/60",
                          isSelected && "bg-primary/5",
                        )}
                      >
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt=""
                            className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] object-contain shrink-0"
                          />
                        ) : null}
                        <div className="flex-1 min-w-0">
                          <p className="text-lg sm:text-xl font-semibold leading-tight">
                            {extra.nome}
                          </p>
                          {extra.preco > 0 ? (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              +{formatCurrency(extra.preco)}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            "shrink-0 flex items-center justify-center border-2 transition-colors",
                            escolhaUnica
                              ? "w-7 h-7 rounded-full"
                              : "w-7 h-7 rounded-md",
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/50 bg-card",
                          )}
                          aria-hidden
                        >
                          {isSelected ? (
                            escolhaUnica ? (
                              <span className="w-3 h-3 rounded-full bg-primary-foreground" />
                            ) : (
                              <Check
                                className="w-4 h-4 text-primary-foreground"
                                strokeWidth={3}
                              />
                            )
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {extrasRemocao.length > 0 && (
            <section>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Minus className="text-destructive" /> Retirar ingredientes
              </h3>
              <div className="flex flex-wrap gap-3">
                {extrasRemocao.map((extra) => {
                  const isSelected = selectedIds.has(extra.id);
                  return (
                    <button
                      key={extra.id}
                      type="button"
                      onClick={() => toggleExtra(
                        {
                          key: "remocao",
                          titulo: "Remoção",
                          modo: "multipla",
                          maxSelecoes: 99,
                          obrigatorio: false,
                          ordemGrupo: 999,
                          itens: [extra],
                        },
                        extra,
                      )}
                      className={cn(
                        "px-6 py-3 rounded-full border-2 text-lg font-medium transition-all active:scale-95",
                        isSelected
                          ? "bg-destructive text-destructive-foreground border-destructive"
                          : "bg-card border-border hover:border-destructive/30 text-foreground",
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
            <h3 className="text-2xl font-bold mb-4">Alguma observação?</h3>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              maxLength={100}
              placeholder="Ex: ponto da carne, alergias..."
              className="w-full p-5 rounded-2xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-lg resize-none min-h-[120px]"
            />
            <p className="text-right text-sm text-muted-foreground mt-1">
              {observacoes.length}/100
            </p>
          </section>
        </div>

        <div className="p-6 border-t bg-card shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {!gruposObrigatoriosOk && grupos.some((g) => g.obrigatorio) && (
            <p className="text-sm text-destructive sm:flex-1">
              Responda todas as opções obrigatórias antes de adicionar.
            </p>
          )}
          <div className="flex items-center bg-muted rounded-2xl p-2 shrink-0">
            <button
              type="button"
              onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
              className="w-16 h-16 flex items-center justify-center bg-card rounded-xl shadow-sm hover:bg-white active:scale-95 transition-all text-2xl"
            >
              <Minus />
            </button>
            <span className="w-16 text-center text-3xl font-bold">{quantidade}</span>
            <button
              type="button"
              onClick={() => setQuantidade(quantidade + 1)}
              className="w-16 h-16 flex items-center justify-center bg-card rounded-xl shadow-sm hover:bg-white active:scale-95 transition-all text-2xl"
            >
              <Plus />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!gruposObrigatoriosOk}
            className="flex-1 bg-primary text-primary-foreground h-20 rounded-2xl text-2xl font-bold shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-between px-8 disabled:opacity-50 disabled:pointer-events-none"
          >
            <span>Adicionar</span>
            <span>{formatCurrency(totalPrice)}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
