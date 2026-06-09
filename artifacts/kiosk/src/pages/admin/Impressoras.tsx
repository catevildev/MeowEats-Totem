import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { 
  useListarImpressoras, 
  useCriarImpressora, 
  useAtualizarImpressora, 
  useExcluirImpressora, 
  useTestarImpressora,
  getListarImpressorasQueryKey,
  useListarPedidos,
  useImprimirPedido,
  type Impressora 
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Printer, Plus, Trash2, Edit2 } from "lucide-react";
import * as React from "react";
import { useClientTable } from "@/hooks/useClientTable";
import { TablePagination } from "@/components/TablePagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminImpressoras() {
  const { data: impressoras, isLoading } = useListarImpressoras();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const criarImpressora = useCriarImpressora();
  const atualizarImpressora = useAtualizarImpressora();
  const excluirImpressora = useExcluirImpressora();
  const testarImpressora = useTestarImpressora();
  const imprimirPedido = useImprimirPedido();

  const dataHoje = new Date().toISOString().split("T")[0];
  const { data: pedidosHoje, isLoading: isLoadingPedidos } = useListarPedidos({ data: dataHoje });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const sortedPedidosHoje = React.useMemo(() => {
    if (!pedidosHoje) return [];
    return [...pedidosHoje].sort((a,b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  }, [pedidosHoje]);

  const {
    paginatedData: paginatedPedidos,
    currentPage: pagePedidos,
    setPage: setPagePedidos,
    itemsPerPage: limitPedidos,
    setItemsPerPage: setLimitPedidos,
    totalPages: totalPagesPedidos,
    totalItems: totalItemsPedidos,
  } = useClientTable({
    data: sortedPedidosHoje,
  });

  const [formData, setFormData] = useState({
    nome: "",
    tipoConexao: "rede" as "rede" | "usb",
    endereco: "",
    larguraPapel: "80mm" as "80mm" | "58mm",
    margemEsquerda: 0,
    margemDireita: 0,
    ativa: true
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      tipoConexao: "rede",
      endereco: "",
      larguraPapel: "80mm",
      margemEsquerda: 0,
      margemDireita: 0,
      ativa: true
    });
    setEditingId(null);
  };

  const handleEdit = (imp: Impressora) => {
    setFormData({
      nome: imp.nome,
      tipoConexao: imp.tipoConexao as any,
      endereco: imp.endereco,
      larguraPapel: imp.larguraPapel as any,
      margemEsquerda: imp.margemEsquerda,
      margemDireita: imp.margemDireita,
      ativa: imp.ativa
    });
    setEditingId(imp.id);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await atualizarImpressora.mutateAsync({ id: editingId, data: formData });
        toast({ title: "Impressora atualizada com sucesso" });
      } else {
        await criarImpressora.mutateAsync({ data: formData });
        toast({ title: "Impressora adicionada com sucesso" });
      }
      queryClient.invalidateQueries({ queryKey: getListarImpressorasQueryKey() });
      setIsDialogOpen(false);
    } catch (err) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remover esta impressora?")) return;
    try {
      await excluirImpressora.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListarImpressorasQueryKey() });
      toast({ title: "Impressora removida" });
    } catch (err) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const handleTest = async (id: number) => {
    toast({ title: "Enviando teste de impressão..." });
    try {
      await testarImpressora.mutateAsync({ id });
      toast({ title: "Teste enviado com sucesso!", className: "bg-green-600 text-white" });
    } catch (err) {
      toast({ title: "Falha no teste. Verifique a conexão.", variant: "destructive" });
    }
  };

  const handleReprint = async (id: number) => {
    toast({ title: "Enviando comando de reimpressão..." });
    try {
      await imprimirPedido.mutateAsync({ id });
      toast({ title: "Pedido enviado para impressão!", className: "bg-green-600 text-white" });
    } catch (err) {
      toast({ title: "Erro ao reimprimir pedido.", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Impressoras</h1>
          <p className="text-muted-foreground mt-1">Configure as impressoras térmicas (Cozinha, Balcão, etc)</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar Impressora
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Impressora" : "Nova Impressora"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome (ex: Cozinha)</Label>
                <Input value={formData.nome} onChange={e => setFormData(s => ({ ...s, nome: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4 relative z-50">
                <div className="grid gap-2">
                  <Label>Tipo de Conexão</Label>
                  <Select value={formData.tipoConexao} onValueChange={v => setFormData(s => ({ ...s, tipoConexao: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rede">Rede (IP)</SelectItem>
                      <SelectItem value="usb">USB/Compartilhada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Bobina</Label>
                  <Select value={formData.larguraPapel} onValueChange={v => setFormData(s => ({ ...s, larguraPapel: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="80mm">80mm</SelectItem>
                      <SelectItem value="58mm">58mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2 relative z-0">
                <Label>{formData.tipoConexao === 'rede' ? 'Endereço IP (ex: 192.168.1.100)' : 'Nome de Compartilhamento / Porta'}</Label>
                <Input value={formData.endereco} onChange={e => setFormData(s => ({ ...s, endereco: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <Label>Status de Operação</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.ativa} onCheckedChange={c => setFormData(s => ({ ...s, ativa: c }))} />
                  <span className="text-sm text-muted-foreground">{formData.ativa ? "Ativa" : "Desativada"}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={!formData.nome || !formData.endereco}>
                Salvar Impressora
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div>Carregando impressoras...</div>
        ) : impressoras?.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border">
            <Printer className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Nenhuma impressora configurada</h3>
            <p className="text-muted-foreground">Adicione uma impressora para ativar a impressão de recibos.</p>
          </div>
        ) : (
          impressoras?.map((imp) => (
            <div key={imp.id} className="flex items-center justify-between p-4 bg-card rounded-xl border">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${imp.ativa ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {imp.nome}
                    {!imp.ativa && <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-normal">Desativada</span>}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {imp.tipoConexao === 'rede' ? 'IP:' : 'USB:'} {imp.endereco} • Bobina {imp.larguraPapel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleTest(imp.id)}>
                  Testar
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(imp)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(imp.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Impressões Recentes (Hoje)</h2>
        <div className="bg-card rounded-xl border overflow-hidden">
          {isLoadingPedidos ? (
            <div className="p-8 text-center text-muted-foreground">Carregando pedidos de hoje...</div>
          ) : !pedidosHoje || pedidosHoje.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum pedido registrado hoje.
            </div>
          ) : (
            <div className="flex flex-col">
            <div className="divide-y">
              {paginatedPedidos.map(pedido => (
                <div key={pedido.id} className="flex items-center justify-between p-4">
                  <div>
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      Pedido {pedido.numero}
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-normal">
                        {new Date(pedido.criadoEm).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Status: {pedido.status} • Total: R$ {Number(pedido.total).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => handleReprint(pedido.id)}>
                    <Printer className="w-4 h-4" />
                    Reimprimir
                  </Button>
                </div>
              ))}
            </div>
            <TablePagination
              currentPage={pagePedidos}
              totalPages={totalPagesPedidos}
              setPage={setPagePedidos}
              itemsPerPage={limitPedidos}
              setItemsPerPage={setLimitPedidos}
              totalItems={totalItemsPedidos}
            />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
