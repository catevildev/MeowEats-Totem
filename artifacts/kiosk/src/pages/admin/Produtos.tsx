import { FormEvent, useMemo, useState } from "react";
import {
  useCriarProduto,
  useListarProdutos,
  useListarCategorias,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { AdminLayout } from "./AdminLayout";
import { formatCurrency } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/api-config";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Plus, Edit2, Trash2, X } from "lucide-react";

type NovoProdutoForm = {
  nome: string;
  descricao: string;
  preco: string;
  categoriaId: string;
  imagem: string | null;
  ativo: boolean;
  ncm: string;
  cfop: string;
  origem: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
  cest: string;
};

type ExtraForm = {
  nome: string;
  preco: string;
  tipo: "adicional" | "remocao" | "tamanho";
};

const INITIAL_FORM: NovoProdutoForm = {
  nome: "",
  descricao: "",
  preco: "",
  categoriaId: "",
  imagem: null,
  ativo: true,
  ncm: "00000000",
  cfop: "5102",
  origem: "0",
  cest: "",
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler ficheiro."));
    reader.readAsDataURL(file);
  });
}

async function compressImageToDataUrl(file: File): Promise<string> {
  const rawDataUrl = await fileToDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao processar imagem."));
    img.src = rawDataUrl;
  });

  const maxSize = 1200;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return rawDataUrl;

  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function AdminProdutos() {
  const { data: produtos, isLoading, refetch } = useListarProdutos();
  const { data: categorias } = useListarCategorias();
  const [showNovoProduto, setShowNovoProduto] = useState(false);
  const [form, setForm] = useState<NovoProdutoForm>(INITIAL_FORM);
  const [extrasForm, setExtrasForm] = useState<ExtraForm[]>([]);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const criarProduto = useCriarProduto();
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
      Number(form.categoriaId) > 0 &&
      /^\d{8}$/.test(form.ncm) &&
      /^\d{4}$/.test(form.cfop)
    );
  }, [form]);

  async function onSubmitNovoProduto(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErroForm(null);

    if (!podeSalvar) {
      setErroForm("Preencha nome, preço, categoria e dados fiscais (NCM/CFOP).");
      return;
    }

    try {
      const extras = extrasForm
        .filter((e) => e.nome.trim().length > 0)
        .map((e) => ({
          nome: e.nome.trim(),
          preco: Number(e.preco || "0"),
          tipo: e.tipo,
        }));

      await criarProduto.mutateAsync({
        data: {
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || null,
          preco: Number(form.preco),
          categoriaId: Number(form.categoriaId),
          imagem: form.imagem,
          ativo: form.ativo,
          ncm: form.ncm.trim(),
          cfop: form.cfop.trim(),
          origem: form.origem,
          cest: form.cest.trim() || null,
          extras,
        },
      });
      setForm(INITIAL_FORM);
      setExtrasForm([]);
      setShowNovoProduto(false);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao criar produto";
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
              onClick={() => setShowNovoProduto(true)}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-semibold shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Novo Produto
            </button>
          </div>
        </div>

        {showNovoProduto && (
          <div className="fixed inset-0 z-50 bg-black/40 p-4 md:p-8 overflow-auto">
            <form
              onSubmit={onSubmitNovoProduto}
              className="bg-card border rounded-2xl shadow-xl p-6 max-w-3xl mx-auto space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Novo Produto</h2>
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-muted"
                  onClick={() => {
                    setShowNovoProduto(false);
                    setErroForm(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="border rounded-lg px-3 py-2 bg-background"
                  placeholder="Nome *"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                />
                <input
                  className="border rounded-lg px-3 py-2 bg-background"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Preço *"
                  value={form.preco}
                  onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))}
                />
                <select
                  className="border rounded-lg px-3 py-2 bg-background"
                  value={form.categoriaId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoriaId: e.target.value }))
                  }
                >
                  <option value="">Categoria *</option>
                  {categoriasOrdenadas.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
                <input
                  className="border rounded-lg px-3 py-2 bg-background file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const dataUrl = await compressImageToDataUrl(file);
                      setForm((f) => ({ ...f, imagem: dataUrl }));
                    } catch (err) {
                      const message =
                        err instanceof Error
                          ? err.message
                          : "Falha ao carregar imagem.";
                      setErroForm(message);
                    }
                  }}
                />
              </div>

              {form.imagem && (
                <div className="border rounded-xl p-3 bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-2">Preview da imagem</p>
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveMediaUrl(form.imagem)}
                      alt="Preview"
                      className="w-24 h-24 rounded-lg object-cover border bg-muted"
                    />
                    <button
                      type="button"
                      className="px-3 py-1 rounded border text-sm"
                      onClick={() => setForm((f) => ({ ...f, imagem: null }))}
                    >
                      Remover imagem
                    </button>
                  </div>
                </div>
              )}

              <textarea
                className="border rounded-lg px-3 py-2 bg-background w-full"
                placeholder="Descrição (opcional)"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />

              <div className="border rounded-xl p-4 space-y-3">
                <h3 className="font-semibold">Dados fiscais (NFC-e)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    className="border rounded-lg px-3 py-2 bg-background"
                    placeholder="NCM (8 dígitos) *"
                    maxLength={8}
                    value={form.ncm}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ncm: e.target.value.replace(/\D/g, "") }))
                    }
                  />
                  <input
                    className="border rounded-lg px-3 py-2 bg-background"
                    placeholder="CFOP (4 dígitos) *"
                    maxLength={4}
                    value={form.cfop}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cfop: e.target.value.replace(/\D/g, "") }))
                    }
                  />
                  <select
                    className="border rounded-lg px-3 py-2 bg-background"
                    value={form.origem}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        origem: e.target.value as NovoProdutoForm["origem"],
                      }))
                    }
                  >
                    <option value="0">Origem 0 - Nacional</option>
                    <option value="1">Origem 1 - Estrangeira (importação direta)</option>
                    <option value="2">Origem 2 - Estrangeira (mercado interno)</option>
                    <option value="3">Origem 3 - Nacional conteúdo importado {" > "}40%</option>
                    <option value="4">Origem 4 - Nacional PPB</option>
                    <option value="5">Origem 5 - Nacional conteúdo importado {" <= "}40%</option>
                    <option value="6">Origem 6 - Estrangeira sem similar nacional</option>
                    <option value="7">Origem 7 - Estrangeira mercado interno sem similar</option>
                    <option value="8">Origem 8 - Nacional conteúdo importado {" > "}70%</option>
                  </select>
                  <input
                    className="border rounded-lg px-3 py-2 bg-background"
                    placeholder="CEST (opcional)"
                    maxLength={7}
                    value={form.cest}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cest: e.target.value.replace(/\D/g, "") }))
                    }
                  />
                </div>
              </div>

              <div className="border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Adicionais / Extras</h3>
                  <button
                    type="button"
                    className="px-3 py-1 rounded border text-sm"
                    onClick={() =>
                      setExtrasForm((prev) => [
                        ...prev,
                        { nome: "", preco: "0", tipo: "adicional" },
                      ])
                    }
                  >
                    + Adicional
                  </button>
                </div>

                {extrasForm.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum adicional cadastrado para este produto.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {extrasForm.map((extra, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <input
                          className="border rounded-lg px-3 py-2 bg-background md:col-span-2"
                          placeholder="Nome do adicional"
                          value={extra.nome}
                          onChange={(e) =>
                            setExtrasForm((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, nome: e.target.value } : item,
                              ),
                            )
                          }
                        />
                        <input
                          className="border rounded-lg px-3 py-2 bg-background"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Preço"
                          value={extra.preco}
                          onChange={(e) =>
                            setExtrasForm((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, preco: e.target.value } : item,
                              ),
                            )
                          }
                        />
                        <div className="flex gap-2">
                          <select
                            className="border rounded-lg px-3 py-2 bg-background flex-1"
                            value={extra.tipo}
                            onChange={(e) =>
                              setExtrasForm((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? {
                                        ...item,
                                        tipo: e.target.value as ExtraForm["tipo"],
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            <option value="adicional">Adicional</option>
                            <option value="remocao">Remoção</option>
                            <option value="tamanho">Tamanho</option>
                          </select>
                          <button
                            type="button"
                            className="px-3 py-2 rounded border text-sm"
                            onClick={() =>
                              setExtrasForm((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            Remover
                          </button>
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

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border"
                  onClick={() => setShowNovoProduto(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!podeSalvar || criarProduto.isPending}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                >
                  {criarProduto.isPending ? "Salvando..." : "Salvar produto"}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <LoadingSpinner />
        ) : (
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
                  {produtos?.map((p) => {
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
                            <button className="p-2 text-muted-foreground hover:text-primary transition-colors bg-muted rounded-lg">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-muted-foreground hover:text-destructive transition-colors bg-muted rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
