import { FormEvent, useMemo, useState, useRef } from "react";
import {
  useCriarCategoria,
  useAtualizarCategoria,
  useExcluirCategoria,
  useListarCategorias,
} from "@workspace/api-client-react";
import type { Categoria } from "@workspace/api-client-react";
import { AdminLayout } from "./AdminLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Plus, Edit2, Trash2, X, ChevronUp, ChevronDown, Check, LayoutGrid, Image as ImageIcon, UploadCloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl, resolveMediaUrl } from "@/lib/api-config";

function sortCategorias(list: Categoria[]) {
  return [...list].sort((a, b) => a.ordem - b.ordem || a.id - b.id);
}

export default function AdminCategorias() {
  const { data: categorias, isLoading, refetch } = useListarCategorias();
  const sorted = useMemo(() => sortCategorias(categorias ?? []), [categorias]);

  const criarCategoria = useCriarCategoria();
  const atualizarCategoria = useAtualizarCategoria();
  const excluirCategoria = useExcluirCategoria();

  // State for new category
  const [novoNome, setNovoNome] = useState("");
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);

  // State for inline editing
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editArquivo, setEditArquivo] = useState<File | null>(null);
  const [editImagemAtualUrl, setEditImagemAtualUrl] = useState<string | null>(null);

  const [erroLista, setErroLista] = useState<string | null>(null);
  const [reordenando, setReordenando] = useState(false);
  const [uploading, setUploading] = useState(false);

  const novoFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  async function uploadImagem(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("imagem", file);

    const res = await fetch(apiUrl("/api/upload"), {
      method: "POST",
      body: formData,
    });
    
    if (!res.ok) {
      throw new Error("Falha ao enviar imagem");
    }

    const data = await res.json();
    return data.url;
  }

  async function aplicarNovaOrdem(listaOrdenada: Categoria[]) {
    setReordenando(true);
    setErroLista(null);
    try {
      for (let i = 0; i < listaOrdenada.length; i++) {
        const c = listaOrdenada[i];
        if (c.ordem !== i) {
          await atualizarCategoria.mutateAsync({
            id: c.id,
            data: { nome: c.nome, icone: c.icone ?? null, imagemUrl: c.imagemUrl ?? null, ordem: i },
          });
        }
      }
      await refetch();
    } catch (err) {
      setErroLista(err instanceof Error ? err.message : "Falha ao reordenar.");
    } finally {
      setReordenando(false);
    }
  }

  async function mover(index: number, delta: number) {
    const j = index + delta;
    if (j < 0 || j >= sorted.length) return;
    const nova = [...sorted];
    [nova[index], nova[j]] = [nova[j], nova[index]];
    await aplicarNovaOrdem(nova);
  }

  async function onAdicionar(e: FormEvent) {
    e.preventDefault();
    setErroLista(null);
    if (!novoNome.trim()) return;

    try {
      setUploading(true);
      let imagemUrl = null;
      if (novoArquivo) {
        imagemUrl = await uploadImagem(novoArquivo);
      }

      const novaOrdem = sorted.length > 0 ? Math.max(...sorted.map((c) => c.ordem)) + 1 : 0;
      await criarCategoria.mutateAsync({
        data: {
          nome: novoNome.trim(),
          imagemUrl: imagemUrl,
          icone: null,
          ordem: novaOrdem,
        },
      });
      setNovoNome("");
      setNovoArquivo(null);
      if (novoFileInputRef.current) novoFileInputRef.current.value = "";
      await refetch();
    } catch (err) {
      setErroLista(err instanceof Error ? err.message : "Falha ao criar categoria.");
    } finally {
      setUploading(false);
    }
  }

  function iniciarEdicao(cat: Categoria) {
    setEditandoId(cat.id);
    setEditNome(cat.nome);
    setEditImagemAtualUrl(cat.imagemUrl ?? null);
    setEditArquivo(null);
  }

  async function salvarEdicao(cat: Categoria) {
    if (!editNome.trim()) {
      setEditandoId(null);
      return;
    }
    setErroLista(null);
    try {
      setUploading(true);
      let imagemUrl = editImagemAtualUrl;
      if (editArquivo) {
        imagemUrl = await uploadImagem(editArquivo);
      }

      await atualizarCategoria.mutateAsync({
        id: cat.id,
        data: {
          nome: editNome.trim(),
          imagemUrl: imagemUrl,
          icone: cat.icone ?? null,
          ordem: cat.ordem,
        },
      });
      setEditandoId(null);
      await refetch();
    } catch (err) {
      setErroLista(err instanceof Error ? err.message : "Falha ao atualizar.");
    } finally {
      setUploading(false);
    }
  }

  async function onExcluir(cat: Categoria) {
    if (!window.confirm(`Excluir a categoria "${cat.nome}"? Certifique-se de que não há produtos associados.`)) return;
    setErroLista(null);
    try {
      await excluirCategoria.mutateAsync({ id: cat.id });
      await refetch();
    } catch (err) {
      setErroLista(err instanceof Error ? err.message : "Não foi possível excluir (verifique se há produtos nesta categoria).");
    }
  }

  const uiBloqueada = reordenando || uploading || criarCategoria.isPending || atualizarCategoria.isPending || excluirCategoria.isPending;

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-5xl mx-auto pb-12">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Categorias</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas categorias rapidamente. A ordem abaixo será a mesma exibida no quiosque.
            </p>
          </div>
        </div>

        {erroLista && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3 border border-destructive/20 font-medium">
            {erroLista}
          </div>
        )}

        {/* Inline Create Form */}
        <form 
          onSubmit={onAdicionar} 
          className="bg-card border-2 border-border/50 rounded-2xl p-2 pl-4 shadow-sm flex flex-col sm:flex-row items-center gap-3 transition-all focus-within:border-primary/50 focus-within:shadow-md"
        >
          <div className="flex-shrink-0 text-muted-foreground p-2">
            <Plus className="w-6 h-6" />
          </div>
          
          <div className="flex-1 w-full sm:w-1/3">
            <input
              className="w-full bg-transparent border-none outline-none text-lg font-medium placeholder:text-muted-foreground/50"
              placeholder="Adicionar nova categoria..."
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              disabled={uiBloqueada}
            />
          </div>

          <div className="flex items-center gap-2 border-l border-border/50 pl-4 w-full sm:w-auto">
            <button
              type="button"
              disabled={uiBloqueada}
              onClick={() => novoFileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg font-medium transition-colors border border-border/50 truncate max-w-xs"
            >
              <UploadCloud className="w-5 h-5 text-primary" />
              <span className="truncate">{novoArquivo ? novoArquivo.name : "Anexar Foto"}</span>
            </button>
            <input 
              type="file"
              accept="image/*"
              className="hidden"
              ref={novoFileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setNovoArquivo(e.target.files[0]);
                }
              }}
            />
            {novoArquivo && (
              <button 
                type="button" 
                onClick={() => { setNovoArquivo(null); if(novoFileInputRef.current) novoFileInputRef.current.value=""; }}
                className="p-1 text-muted-foreground hover:text-destructive"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!novoNome.trim() || uiBloqueada}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:brightness-110 disabled:opacity-50 transition-all ml-auto whitespace-nowrap min-w-[120px]"
          >
            {uploading ? "Salvando..." : "Adicionar"}
          </button>
        </form>

        {/* Categories List */}
        {isLoading ? (
          <div className="py-12"><LoadingSpinner /></div>
        ) : (
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm flex flex-col divide-y">
            {sorted.length === 0 ? (
               <div className="p-16 text-center text-muted-foreground flex flex-col items-center gap-4">
                 <LayoutGrid className="w-12 h-12 opacity-20" />
                 <p className="text-lg">Sua lista de categorias está vazia.<br/>Use a barra acima para adicionar a primeira!</p>
               </div>
            ) : (
               <AnimatePresence initial={false}>
                 {sorted.map((cat, index) => {
                   const isEditing = editandoId === cat.id;

                   return (
                     <motion.div
                       key={cat.id}
                       layout
                       initial={{ opacity: 0, y: -10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, scale: 0.95 }}
                       className="flex flex-col sm:flex-row items-center gap-4 p-4 hover:bg-muted/30 transition-colors group bg-card relative"
                     >
                       <div className="flex flex-col items-center gap-1 sm:w-12">
                         <button
                           type="button"
                           disabled={uiBloqueada || index === 0}
                           onClick={() => mover(index, -1)}
                           className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                         >
                           <ChevronUp className="w-5 h-5" />
                         </button>
                         <button
                           type="button"
                           disabled={uiBloqueada || index === sorted.length - 1}
                           onClick={() => mover(index, 1)}
                           className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                         >
                           <ChevronDown className="w-5 h-5" />
                         </button>
                       </div>

                       {isEditing ? (
                         <div className="flex-1 flex gap-3 items-center w-full">
                           {/* Small preview of selected image or current image */}
                           <div className="w-12 h-12 rounded-lg border border-border/50 overflow-hidden bg-white shrink-0">
                             {(editArquivo || editImagemAtualUrl) ? (
                               <img 
                                 src={editArquivo ? URL.createObjectURL(editArquivo) : resolveMediaUrl(editImagemAtualUrl)!} 
                                 alt="preview"
                                 className="w-full h-full object-contain"
                               />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                                 <ImageIcon className="w-5 h-5" />
                               </div>
                             )}
                           </div>

                           <input
                             autoFocus
                             className="flex-1 border rounded-xl px-4 py-2 bg-background focus:ring-2 ring-primary/20 outline-none text-lg font-medium"
                             value={editNome}
                             placeholder="Nome da categoria"
                             onChange={(e) => setEditNome(e.target.value)}
                             onKeyDown={(e) => e.key === "Enter" && salvarEdicao(cat)}
                             disabled={uiBloqueada}
                           />

                           <button
                             type="button"
                             disabled={uiBloqueada}
                             onClick={() => editFileInputRef.current?.click()}
                             className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg border transition-colors shrink-0"
                             title="Alterar Foto"
                           >
                             <UploadCloud className="w-5 h-5 text-primary" />
                             <span className="hidden lg:inline text-sm font-medium">Trocar</span>
                           </button>
                           <input 
                              type="file"
                              accept="image/*"
                              className="hidden"
                              ref={editFileInputRef}
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  setEditArquivo(e.target.files[0]);
                                }
                              }}
                           />
                         </div>
                       ) : (
                         <div className="flex-1 flex items-center gap-4 w-full">
                           {cat.imagemUrl ? (
                             <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm border border-border/50 bg-white">
                               <img 
                                 src={resolveMediaUrl(cat.imagemUrl)} 
                                 alt={cat.nome} 
                                 className="w-full h-full object-contain"
                                 onError={(e) => {
                                   (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiPjwvcmVjdD48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSI+PC9jaXJjbGU+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSI+PC9wb2x5bGluZT48L3N2Zz4=';
                                 }}
                               />
                             </div>
                           ) : (
                             <div className="w-16 h-16 flex items-center justify-center bg-muted/50 rounded-xl text-3xl shadow-sm border border-border/50">
                               {cat.icone || <ImageIcon className="w-6 h-6 text-muted-foreground" />}
                             </div>
                           )}
                           <div className="flex flex-col">
                             <h3 className="font-semibold text-lg text-foreground">{cat.nome}</h3>
                             <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                               Posição {index + 1}
                             </span>
                           </div>
                         </div>
                       )}

                       <div className="flex items-center gap-2 sm:w-28 justify-end">
                         {isEditing ? (
                           <>
                             <button
                               disabled={uiBloqueada}
                               onClick={() => setEditandoId(null)}
                               className="p-2.5 text-muted-foreground hover:bg-muted rounded-xl transition-colors disabled:opacity-50"
                               title="Cancelar"
                             >
                               <X className="w-5 h-5" />
                             </button>
                             <button
                               disabled={uiBloqueada}
                               onClick={() => salvarEdicao(cat)}
                               className="p-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-xl transition-colors disabled:opacity-50"
                               title="Salvar"
                             >
                               {uploading ? <LoadingSpinner className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                             </button>
                           </>
                         ) : (
                           <>
                             <button
                               disabled={uiBloqueada}
                               onClick={() => iniciarEdicao(cat)}
                               className="p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 disabled:opacity-0"
                               title="Editar"
                             >
                               <Edit2 className="w-5 h-5" />
                             </button>
                             <button
                               disabled={uiBloqueada}
                               onClick={() => onExcluir(cat)}
                               className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 disabled:opacity-0"
                               title="Excluir"
                             >
                               <Trash2 className="w-5 h-5" />
                             </button>
                           </>
                         )}
                       </div>
                     </motion.div>
                   );
                 })}
               </AnimatePresence>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
