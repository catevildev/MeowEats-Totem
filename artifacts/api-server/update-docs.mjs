import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const file = path.resolve('../../lib/api-spec/openapi.yaml');
const doc = yaml.parseDocument(fs.readFileSync(file, 'utf8'));

const summaries = {
  healthCheck: "Status de Saúde da API",
  listarCategorias: "Listar todas as categorias",
  criarCategoria: "Criar nova categoria",
  atualizarCategoria: "Atualizar categoria",
  excluirCategoria: "Excluir categoria",
  listarProdutos: "Listar todos os produtos",
  criarProduto: "Cadastrar novo produto",
  buscarProduto: "Buscar produto por ID",
  atualizarProduto: "Atualizar produto",
  excluirProduto: "Excluir produto",
  listarPedidos: "Listar histórico de pedidos",
  criarPedido: "Criar novo pedido",
  buscarPedido: "Buscar pedido por ID",
  atualizarStatusPedido: "Atualizar status do pedido",
  imprimirPedido: "Reimprimir comanda do pedido",
  emitirNfce: "Emitir NFC-e (PlugNotas)",
  consultarNfce: "Consultar status da NFC-e",
  cancelarNfce: "Cancelar NFC-e emitida",
  listarImpressoras: "Listar impressoras cadastradas",
  criarImpressora: "Cadastrar nova impressora",
  atualizarImpressora: "Atualizar impressora",
  excluirImpressora: "Excluir impressora",
  iniciarPagamentoTef: "Iniciar transação TEF",
  consultarStatusPagamento: "Consultar status do TEF",
  cancelarTransacaoTef: "Cancelar transação TEF"
};

const pathsObj = doc.get('paths');
if (pathsObj) {
  for (const item of pathsObj.items) {
    const pathNode = item.value;
    for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
      const opNode = pathNode.get(method);
      if (opNode) {
        const opId = opNode.get('operationId');
        if (summaries[opId]) {
          opNode.set('summary', summaries[opId]);
        }
      }
    }
  }
}

fs.writeFileSync(file, doc.toString({ lineWidth: 120 }), 'utf8');
console.log('Summaries updated successfully.');
