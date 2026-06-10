import { FormEvent, ReactNode, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  useAtualizarProduto,
  useCriarProduto,
  useExcluirProduto,
  useListarProdutos,
  useListarCategorias,
} from "@workspace/api-client-react";
import type { Produto } from "@workspace/api-client-react";
import { Link } from "wouter";
import { AdminLayout } from "./AdminLayout";
import { cn, formatCurrency } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/api-config";
import { uploadImagem } from "@/lib/upload-image";
import {
  emptyGrupoOpcao,
  extrasToGruposForm,
  gruposToExtrasInputComUpload,
  emptyOpcaoItem,
  MODO_SELECAO_LABELS,
  type GrupoOpcaoForm,
  type ModoSelecao,
} from "@/lib/product-options";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import { useClientTable } from "@/hooks/useClientTable";
import { TablePagination, TableToolbar } from "@/components/TablePagination";

type NovoProdutoForm = {
  nome: string;
  descricao: string;
  preco: string;
  categoriaId: string;
  imagem: string | null;
  ativo: boolean;
};

const INITIAL_FORM: NovoProdutoForm = {
  nome: "",
  descricao: "",
  preco: "",
  categoriaId: "",
  imagem: null,
  ativo: true,
};

const inputClass =
  "border rounded-lg px-3 py-2 bg-background w-full min-w-0 text-base";

function FormField({
  label,
  htmlFor,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1 min-w-0", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-foreground block"
      >
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </label>
      {children}
      {hint ? (
        <p className="text-xs text-muted-foreground leading-snug">{hint}</p>
      ) : null}
    </div>
  );
}

export default function AdminProdutos() {
  const { data: produtos, isLoading, refetch } = useListarProdutos();
  const { data: categorias } = useListarCategorias();
  const [formModalAberto, setFormModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<NovoProdutoForm>(INITIAL_FORM);
  const [gruposOpcao, setGruposOpcao] = useState<GrupoOpcaoForm[]>([]);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [imagemArquivo, setImagemArquivo] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const criarProduto = useCriarProduto();
  const atualizarProduto = useAtualizarProduto();
  const excluirProduto = useExcluirProduto();
  const salvando =
    criarProduto.isPending || atualizarProduto.isPending;
  const categoriasOrdenadas = useMemo(
    () =>
      [...(categorias ?? [])].sort(
        (a, b) => a.ordem - b.ordem || a.id - b.id,
      ),
    [categorias],
  );
  const podeSalvar = useMemo(() => {
    return (
      form.nome.trim().length > 0 &&
      Number(form.preco) > 0 &&
      Number(form.categoriaId) > 0
    );
  }, [form]);

  const {
    paginatedData,
    searchQuery,
    setSearchQuery,
    currentPage,
    setPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    totalItems,
  } = useClientTable({
    data: produtos,
    filterFn: (item, query) => {
      if (categoryFilter !== "all" && item.categoriaId.toString() !== categoryFilter) {
        return false;
      }
      const q = query.toLowerCase();
      if (!q) return true;
      if (item.nome?.toLowerCase().includes(q)) return true;
      if (item.descricao?.toLowerCase().includes(q)) return true;
      const cat = categorias?.find(c => c.id === item.categoriaId);
      if (cat && cat.nome.toLowerCase().includes(q)) return true;
      return false;
    }
  });

  function limparPreviewBlob() {
    if (imagemPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagemPreview);
    }
  }

  function limparPreviewsOpcoes(grupos: GrupoOpcaoForm[]) {
    for (const g of grupos) {
      for (const it of g.itens) {
        if (it.previewLocal?.startsWith("blob:")) {
          URL.revokeObjectURL(it.previewLocal);
        }
      }
    }
  }

  function fecharModal() {
    limparPreviewBlob();
    limparPreviewsOpcoes(gruposOpcao);
    setFormModalAberto(false);
    setEditandoId(null);
    setForm(INITIAL_FORM);
    setGruposOpcao([]);
    setImagemArquivo(null);
    setImagemPreview(null);
    setErroForm(null);
  }

  function abrirNovo() {
    limparPreviewBlob();
    setEditandoId(null);
    setForm(INITIAL_FORM);
    setGruposOpcao([]);
    setImagemArquivo(null);
    setImagemPreview(null);
    setErroForm(null);
    setFormModalAberto(true);
  }

  function abrirEdicao(produto: Produto) {
    limparPreviewBlob();
    setEditandoId(produto.id);
    setForm({
      nome: produto.nome,
      descricao: produto.descricao ?? "",
      preco: String(produto.preco),
      categoriaId: String(produto.categoriaId),
      imagem: produto.imagem ?? null,
      ativo: produto.ativo,
    });
    setGruposOpcao(extrasToGruposForm(produto.extras ?? []));
    setImagemArquivo(null);
    setImagemPreview(
      produto.imagem ? resolveMediaUrl(produto.imagem) ?? null : null,
    );
    setErroForm(null);
    setFormModalAberto(true);
  }

  async function onExcluir(produto: Produto) {
    if (
      !window.confirm(
        `Excluir o produto "${produto.nome}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }
    try {
      await excluirProduto.mutateAsync({ id: produto.id });
      if (editandoId === produto.id) fecharModal();
      await refetch();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao excluir produto";
      window.alert(message);
    }
  }

  async function onSubmitProduto(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErroForm(null);

    if (!podeSalvar) {
      setErroForm("Preencha nome, preço e categoria.");
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      preco: Number(form.preco),
      categoriaId: Number(form.categoriaId),
      ativo: form.ativo,
    };

    try {
      let imagemUrl: string | null = form.imagem;
      if (imagemArquivo) {
        imagemUrl = await uploadImagem(imagemArquivo);
      }

      const extras = await gruposToExtrasInputComUpload(
        gruposOpcao,
        uploadImagem,
      );

      if (editandoId != null) {
        await atualizarProduto.mutateAsync({
          id: editandoId,
          data: { ...payload, imagem: imagemUrl, extras },
        });
      } else {
        await criarProduto.mutateAsync({
          data: { ...payload, imagem: imagemUrl, extras },
        });
      }
      fecharModal();
      await refetch();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : editandoId != null
            ? "Falha ao atualizar produto"
            : "Falha ao criar produto";
      setErroForm(message);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
            <p className="text-muted-foreground">
              Gerencie o cardápio do quiosque.{" "}
              <Link
                href="/admin/categorias"
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                Categorias e ordem no totem
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={abrirNovo}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-semibold shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Novo Produto
            </button>
          </div>
        </div>

        {formModalAberto && createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-2 sm:p-4 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="produto-form-titulo"
          >
            <form
              onSubmit={onSubmitProduto}
              className="bg-card border rounded-2xl overflow-hidden shadow-xl w-full max-w-3xl max-h-[min(100dvh-1rem,920px)] flex flex-col min-h-0"
            >
              <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b shrink-0">
                <h2 id="produto-form-titulo" className="text-lg sm:text-xl font-bold">
                  {editandoId != null ? "Editar Produto" : "Novo Produto"}
                </h2>
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-muted shrink-0"
                  aria-label="Fechar"
                  onClick={fecharModal}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Nome" htmlFor="produto-nome" required>
                  <input
                    id="produto-nome"
                    className={inputClass}
                    placeholder="Ex.: Big Meow"
                    value={form.nome}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nome: e.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Preço (R$)" htmlFor="produto-preco" required>
                  <input
                    id="produto-preco"
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={form.preco}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, preco: e.target.value }))
                    }
                  />
                </FormField>
                <FormField
                  label="Categoria"
                  htmlFor="produto-categoria"
                  required
                  className="sm:col-span-2"
                >
                  <select
                    id="produto-categoria"
                    className={inputClass}
                    value={form.categoriaId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, categoriaId: e.target.value }))
                    }
                  >
                    <option value="">Selecione…</option>
                    {categoriasOrdenadas.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  label="Imagem"
                  htmlFor="produto-imagem"
                  className="sm:col-span-2"
                  hint="Opcional — no cardápio do cliente a foto só aparece se você enviar um arquivo."
                >
                  <input
                    id="produto-imagem"
                    className={cn(
                      inputClass,
                      "file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1",
                    )}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (imagemPreview) URL.revokeObjectURL(imagemPreview);
                      setImagemArquivo(file);
                      setImagemPreview(URL.createObjectURL(file));
                      setForm((f) => ({ ...f, imagem: null }));
                      setErroForm(null);
                    }}
                  />
                </FormField>
              </div>

              {imagemPreview && (
                <div className="border rounded-xl p-3 bg-muted/20">
                  <p className="text-sm font-medium mb-2">Pré-visualização</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <img
                      src={imagemPreview}
                      alt="Preview"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover border bg-muted shrink-0"
                    />
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg border text-sm"
                      onClick={() => {
                        if (imagemPreview) URL.revokeObjectURL(imagemPreview);
                        setImagemArquivo(null);
                        setImagemPreview(null);
                        setForm((f) => ({ ...f, imagem: null }));
                      }}
                    >
                      Remover imagem
                    </button>
                  </div>
                </div>
              )}

              <FormField label="Descrição" htmlFor="produto-descricao">
                <textarea
                  id="produto-descricao"
                  className={cn(inputClass, "min-h-[4.5rem] resize-y")}
                  placeholder="Texto exibido no totem (opcional)"
                  value={form.descricao}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, descricao: e.target.value }))
                  }
                />
              </FormField>

              <div className="border rounded-xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">Opções de personalização</h3>
                    <p className="text-sm text-muted-foreground">
                      Como no totem: turbinar lanche, ketchup sim/não, etc. Digite o título do grupo e cada opção.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 rounded border text-sm"
                      onClick={() =>
                        setGruposOpcao((prev) => [...prev, emptyGrupoOpcao("multipla")])
                      }
                    >
                      + Grupo (várias)
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 rounded border text-sm"
                      onClick={() =>
                        setGruposOpcao((prev) => [...prev, emptyGrupoOpcao("unica")])
                      }
                    >
                      + Grupo (uma)
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 rounded border text-sm"
                      onClick={() =>
                        setGruposOpcao((prev) => [...prev, emptyGrupoOpcao("sim_nao")])
                      }
                    >
                      + Sim / Não
                    </button>
                  </div>
                </div>

                {gruposOpcao.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem opções — o cliente só vê nome, descrição e observações.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {gruposOpcao.map((grupo, gIdx) => (
                      <div
                        key={gIdx}
                        className="border rounded-lg p-4 bg-muted/20 space-y-3"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormField label="Título do grupo" htmlFor={`grupo-titulo-${gIdx}`}>
                          <input
                            id={`grupo-titulo-${gIdx}`}
                            className={inputClass}
                            placeholder='Ex.: "Turbine seu lanche"'
                            value={grupo.titulo}
                            onChange={(e) =>
                              setGruposOpcao((prev) =>
                                prev.map((g, i) =>
                                  i === gIdx ? { ...g, titulo: e.target.value } : g,
                                ),
                              )
                            }
                          />
                          </FormField>
                          <FormField label="Tipo de escolha" htmlFor={`grupo-modo-${gIdx}`}>
                          <select
                            id={`grupo-modo-${gIdx}`}
                            className={inputClass}
                            value={grupo.modo}
                            onChange={(e) => {
                              const modo = e.target.value as ModoSelecao;
                              setGruposOpcao((prev) =>
                                prev.map((g, i) => {
                                  if (i !== gIdx) return g;
                                  if (modo === "sim_nao") {
                                    return {
                                      ...g,
                                      modo,
                                      maxSelecoes: 1,
                                      itens: [
                                        {
                                          nome: "Sim",
                                          preco: g.itens[0]?.preco ?? "0",
                                          imagem: g.itens[0]?.imagem ?? null,
                                        },
                                        {
                                          nome: "Não",
                                          preco: "0",
                                          imagem: null,
                                        },
                                      ],
                                    };
                                  }
                                  return {
                                    ...g,
                                    modo,
                                    maxSelecoes:
                                      modo === "multipla"
                                        ? Math.max(2, g.maxSelecoes)
                                        : 1,
                                  };
                                }),
                              );
                            }}
                          >
                            {(Object.keys(MODO_SELECAO_LABELS) as ModoSelecao[]).map(
                              (m) => (
                                <option key={m} value={m}>
                                  {MODO_SELECAO_LABELS[m]}
                                </option>
                              ),
                            )}
                          </select>
                          </FormField>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          {grupo.modo === "multipla" && (
                            <label className="flex items-center gap-2">
                              Máximo de escolhas
                              <input
                                type="number"
                                min={1}
                                max={20}
                                className="w-16 border rounded px-2 py-1 bg-background"
                                value={grupo.maxSelecoes}
                                onChange={(e) =>
                                  setGruposOpcao((prev) =>
                                    prev.map((g, i) =>
                                      i === gIdx
                                        ? {
                                            ...g,
                                            maxSelecoes: Math.max(
                                              1,
                                              Number(e.target.value) || 1,
                                            ),
                                          }
                                        : g,
                                    ),
                                  )
                                }
                              />
                            </label>
                          )}
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={grupo.obrigatorio}
                              onChange={(e) =>
                                setGruposOpcao((prev) =>
                                  prev.map((g, i) =>
                                    i === gIdx
                                      ? { ...g, obrigatorio: e.target.checked }
                                      : g,
                                  ),
                                )
                              }
                            />
                            Obrigatório no pedido
                          </label>
                          <button
                            type="button"
                            className="text-destructive text-sm ml-auto"
                            onClick={() =>
                              setGruposOpcao((prev) =>
                                prev.filter((_, i) => i !== gIdx),
                              )
                            }
                          >
                            Remover grupo
                          </button>
                        </div>

                        <div className="space-y-3">
                          {grupo.itens.length > 0 && (
                            <div className="hidden sm:grid sm:grid-cols-[4.5rem_1fr_7.5rem_2.25rem] gap-2 px-0.5 text-xs font-medium text-muted-foreground">
                              <span>Foto</span>
                              <span>Nome da opção</span>
                              <span>Valor (R$)</span>
                              <span className="sr-only">Remover</span>
                            </div>
                          )}
                          {grupo.itens.map((item, iIdx) => {
                            const valorDesabilitado =
                              grupo.modo === "sim_nao" && iIdx === 1;
                            const valorLabel =
                              grupo.modo === "sim_nao"
                                ? iIdx === 0
                                  ? "Valor se Sim (R$)"
                                  : "Valor"
                                : "Valor (R$)";
                            return (
                            <div
                              key={iIdx}
                              className="grid grid-cols-1 sm:grid-cols-[4.5rem_1fr_7.5rem_2.25rem] gap-3 sm:gap-2 sm:items-end border sm:border-0 rounded-lg sm:rounded-none p-3 sm:p-0 bg-background/50 sm:bg-transparent"
                            >
                              <FormField
                                label="Foto da opção"
                                htmlFor={`opcao-img-${gIdx}-${iIdx}`}
                                hint="Opcional — aparece no totem"
                                className="sm:mb-0 sm:[&_label]:sr-only sm:[&_p]:hidden"
                              >
                                <div className="flex flex-col items-center gap-1">
                                  {(item.previewLocal ||
                                    resolveMediaUrl(item.imagem)) && (
                                    <img
                                      src={
                                        item.previewLocal ??
                                        resolveMediaUrl(item.imagem) ??
                                        ""
                                      }
                                      alt=""
                                      className="w-14 h-14 rounded-lg object-cover border bg-muted"
                                    />
                                  )}
                                  <input
                                    id={`opcao-img-${gIdx}-${iIdx}`}
                                    type="file"
                                    accept="image/*"
                                    className="text-[10px] w-full max-w-[4.5rem]"
                                    disabled={valorDesabilitado}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      setGruposOpcao((prev) =>
                                        prev.map((g, gi) => {
                                          if (gi !== gIdx) return g;
                                          return {
                                            ...g,
                                            itens: g.itens.map((it, ii) => {
                                              if (ii !== iIdx) return it;
                                              if (it.previewLocal) {
                                                URL.revokeObjectURL(
                                                  it.previewLocal,
                                                );
                                              }
                                              if (!file) {
                                                return {
                                                  ...it,
                                                  arquivoPendente: null,
                                                  previewLocal: null,
                                                };
                                              }
                                              return {
                                                ...it,
                                                arquivoPendente: file,
                                                previewLocal:
                                                  URL.createObjectURL(file),
                                                imagem: null,
                                              };
                                            }),
                                          };
                                        }),
                                      );
                                    }}
                                  />
                                  {(item.previewLocal || item.imagem) && (
                                    <button
                                      type="button"
                                      className="text-[10px] text-muted-foreground underline"
                                      onClick={() =>
                                        setGruposOpcao((prev) =>
                                          prev.map((g, gi) => {
                                            if (gi !== gIdx) return g;
                                            return {
                                              ...g,
                                              itens: g.itens.map((it, ii) => {
                                                if (ii !== iIdx) return it;
                                                if (it.previewLocal) {
                                                  URL.revokeObjectURL(
                                                    it.previewLocal,
                                                  );
                                                }
                                                return {
                                                  ...it,
                                                  imagem: null,
                                                  arquivoPendente: null,
                                                  previewLocal: null,
                                                };
                                              }),
                                            };
                                          }),
                                        )
                                      }
                                    >
                                      Remover
                                    </button>
                                  )}
                                </div>
                              </FormField>
                              <FormField
                                label="Nome da opção"
                                htmlFor={`opcao-nome-${gIdx}-${iIdx}`}
                                className="sm:mb-0 sm:[&_label]:sr-only"
                              >
                              <input
                                id={`opcao-nome-${gIdx}-${iIdx}`}
                                className={inputClass}
                                placeholder={
                                  grupo.modo === "sim_nao"
                                    ? iIdx === 0
                                      ? "Sim"
                                      : "Não"
                                    : "Ex.: Bacon em tiras"
                                }
                                value={item.nome}
                                onChange={(e) =>
                                  setGruposOpcao((prev) =>
                                    prev.map((g, gi) =>
                                      gi === gIdx
                                        ? {
                                            ...g,
                                            itens: g.itens.map((it, ii) =>
                                              ii === iIdx
                                                ? { ...it, nome: e.target.value }
                                                : it,
                                            ),
                                          }
                                        : g,
                                    ),
                                  )
                                }
                              />
                              </FormField>
                              <FormField
                                label={valorLabel}
                                htmlFor={`opcao-valor-${gIdx}-${iIdx}`}
                                hint={
                                  valorDesabilitado
                                    ? undefined
                                    : "Acréscimo ao preço do produto (0 = grátis)"
                                }
                                className="sm:mb-0 sm:[&_label]:sr-only sm:[&_p]:hidden"
                              >
                              <input
                                id={`opcao-valor-${gIdx}-${iIdx}`}
                                className={inputClass}
                                type="number"
                                step="0.01"
                                min="0"
                                inputMode="decimal"
                                aria-label={valorLabel}
                                placeholder="0,00"
                                value={item.preco}
                                disabled={valorDesabilitado}
                                onChange={(e) =>
                                  setGruposOpcao((prev) =>
                                    prev.map((g, gi) =>
                                      gi === gIdx
                                        ? {
                                            ...g,
                                            itens: g.itens.map((it, ii) =>
                                              ii === iIdx
                                                ? { ...it, preco: e.target.value }
                                                : it,
                                            ),
                                          }
                                        : g,
                                    ),
                                  )
                                }
                              />
                              </FormField>
                              {grupo.itens.length > 1 ? (
                                <button
                                  type="button"
                                  className="h-10 sm:h-[42px] px-2 rounded-lg border text-sm shrink-0 justify-self-end sm:justify-self-auto"
                                  aria-label="Remover opção"
                                  onClick={() =>
                                    setGruposOpcao((prev) =>
                                      prev.map((g, gi) =>
                                        gi === gIdx
                                          ? {
                                              ...g,
                                              itens: g.itens.filter(
                                                (_, ii) => ii !== iIdx,
                                              ),
                                            }
                                          : g,
                                      ),
                                    )
                                  }
                                >
                                  ×
                                </button>
                              ) : (
                                <span className="hidden sm:block" aria-hidden />
                              )}
                            </div>
                          );
                          })}
                          {grupo.modo !== "sim_nao" && (
                            <button
                              type="button"
                              className="text-sm text-primary font-medium"
                              onClick={() =>
                                setGruposOpcao((prev) =>
                                  prev.map((g, gi) =>
                                    gi === gIdx
                                      ? {
                                          ...g,
                                          itens: [
                                            ...g.itens,
                                            emptyOpcaoItem(),
                                          ],
                                        }
                                      : g,
                                  ),
                                )
                              }
                            >
                              + Digitar outra opção
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                />
                Produto ativo
              </label>

              {erroForm && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {erroForm}
                </div>
              )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-4 sm:px-6 py-4 border-t bg-card shrink-0">
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-lg border w-full sm:w-auto"
                  onClick={fecharModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!podeSalvar || salvando}
                  className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 w-full sm:w-auto font-semibold"
                >
                  {salvando
                    ? "Salvando..."
                    : editandoId != null
                      ? "Salvar alterações"
                      : "Salvar produto"}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-4">
            <TableToolbar 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery} 
              searchPlaceholder="Buscar por nome, descrição ou categoria..." 
            >
              <select
                className="flex h-10 w-full sm:w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Todas as Categorias</option>
                {categoriasOrdenadas.map((cat) => (
                  <option key={cat.id} value={cat.id.toString()}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </TableToolbar>
            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-4 font-semibold text-muted-foreground">Produto</th>
                    <th className="p-4 font-semibold text-muted-foreground">Categoria</th>
                    <th className="p-4 font-semibold text-muted-foreground">Preço</th>
                    <th className="p-4 font-semibold text-muted-foreground">Status</th>
                    <th className="p-4 font-semibold text-muted-foreground text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        {searchQuery ? "Nenhum produto encontrado na busca" : "Nenhum produto cadastrado"}
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((p) => {
                      const cat = categorias?.find(c => c.id === p.categoriaId);
                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <img 
                              src={resolveMediaUrl(p.imagem) || "https://placehold.co/100x100?text=Sem+Foto"} 
                              alt="" 
                              className="w-12 h-12 rounded-lg object-cover bg-muted"
                            />
                            <span className="font-semibold">{p.nome}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {cat?.nome || `ID: ${p.categoriaId}`}
                        </td>
                        <td className="p-4 font-medium">{formatCurrency(p.preco)}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${p.ativo ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                            {p.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="p-2 text-muted-foreground hover:text-primary transition-colors bg-muted rounded-lg"
                              aria-label={`Editar ${p.nome}`}
                              onClick={() => abrirEdicao(p)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="p-2 text-muted-foreground hover:text-destructive transition-colors bg-muted rounded-lg disabled:opacity-50"
                              aria-label={`Excluir ${p.nome}`}
                              disabled={excluirProduto.isPending}
                              onClick={() => onExcluir(p)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
            
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              setPage={setPage}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              totalItems={totalItems}
            />
          </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
