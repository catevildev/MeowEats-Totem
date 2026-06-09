/**
 * Schema único para o drizzle-kit conseguir extrair as tabelas (push/generate).
 * Ficheiros partidos com imports entre si falhavam no Windows/pnpm com "No schema files found".
 */
import {
  mysqlTable,
  varchar,
  int,
  boolean,
  decimal,
  text,
  mysqlEnum,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

/** Mesmo tipo em PK e FK evita ER_FK_INCOMPATIBLE_COLUMNS no MySQL (serial vs int). */
const idPk = () => int("id", { unsigned: true }).autoincrement().primaryKey();
import { createInsertSchema } from "drizzle-zod";

export const categoriasTable = mysqlTable("categorias", {
  id: idPk(),
  nome: varchar("nome", { length: 255 }).notNull(),
  icone: varchar("icone", { length: 255 }),
  imagemUrl: varchar("imagem_url", { length: 1024 }),
  ordem: int("ordem").notNull().default(0),
});

export const produtosTable = mysqlTable("produtos", {
  id: idPk(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  preco: decimal("preco", { precision: 10, scale: 2 }).notNull(),
  ncm: varchar("ncm", { length: 8 }).notNull().default("00000000"),
  cfop: varchar("cfop", { length: 4 }).notNull().default("5102"),
  origem: mysqlEnum("origem", [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
  ])
    .notNull()
    .default("0"),
  cest: varchar("cest", { length: 7 }),
  categoriaId: int("categoria_id", { unsigned: true })
    .notNull()
    .references(() => categoriasTable.id),
  /** URL relativa (/api/uploads/...) — não guardar base64 */
  imagem: varchar("imagem", { length: 1024 }),
  ativo: boolean("ativo").notNull().default(true),
});

export const extrasTable = mysqlTable("extras", {
  id: idPk(),
  produtoId: int("produto_id", { unsigned: true })
    .notNull()
    .references(() => produtosTable.id, { onDelete: "cascade" }),
  nome: varchar("nome", { length: 255 }).notNull(),
  preco: decimal("preco", { precision: 10, scale: 2 }).notNull().default("0"),
  tipo: mysqlEnum("tipo", ["adicional", "remocao", "tamanho"]).notNull(),
  /** Título do bloco no totem (ex.: "Turbine seu lanche", "Deseja ketchup?") */
  grupoTitulo: varchar("grupo_titulo", { length: 255 })
    .notNull()
    .default("Opções"),
  modoSelecao: mysqlEnum("modo_selecao", ["multipla", "unica", "sim_nao"])
    .notNull()
    .default("multipla"),
  maxSelecoes: int("max_selecoes", { unsigned: true }).notNull().default(1),
  obrigatorio: boolean("obrigatorio").notNull().default(false),
  ordemGrupo: int("ordem_grupo", { unsigned: true }).notNull().default(0),
  ordemItem: int("ordem_item", { unsigned: true }).notNull().default(0),
  /** URL relativa (/api/uploads/...) — foto da opção no totem */
  imagem: varchar("imagem", { length: 1024 }),
});

export const pedidosTable = mysqlTable("pedidos", {
  id: idPk(),
  numero: varchar("numero", { length: 32 }).notNull(),
  status: mysqlEnum("status", [
    "novo",
    "em_preparo",
    "pronto",
    "entregue",
    "cancelado",
  ])
    .notNull()
    .default("novo"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  tipoPedido: mysqlEnum("tipo_pedido", ["comer_aqui", "para_viagem"]).notNull(),
  formaPagamento: mysqlEnum("forma_pagamento", [
    "credito",
    "debito",
    "pix",
    "nfc",
  ]),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

export const itensPedidoTable = mysqlTable("itens_pedido", {
  id: idPk(),
  pedidoId: int("pedido_id", { unsigned: true })
    .notNull()
    .references(() => pedidosTable.id, { onDelete: "cascade" }),
  produtoId: int("produto_id", { unsigned: true })
    .notNull()
    .references(() => produtosTable.id),
  quantidade: int("quantidade", { unsigned: true }).notNull(),
  preco: decimal("preco", { precision: 10, scale: 2 }).notNull(),
  observacoes: text("observacoes"),
  extrasIds: varchar("extras_ids", { length: 2048 }).notNull().default("[]"),
});

/** Tentativas de pagamento TEF (aprovado, pendente, cancelado, negado). */
export const pagamentosTefTable = mysqlTable("pagamentos_tef", {
  id: idPk(),
  pedidoId: int("pedido_id", { unsigned: true }).references(() => pedidosTable.id, {
    onDelete: "set null",
  }),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  formaPagamento: mysqlEnum("forma_pagamento", [
    "credito",
    "debito",
    "pix",
    "nfc",
  ]).notNull(),
  statusPagamento: mysqlEnum("status_pagamento", [
    "pendente",
    "aprovado",
    "cancelado",
    "negado",
  ])
    .notNull()
    .default("pendente"),
  tefTransactionId: varchar("tef_transaction_id", { length: 64 }),
  tefCodigo: int("tef_codigo"),
  tefMensagem: text("tef_mensagem"),
  tefReason: varchar("tef_reason", { length: 64 }),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow().onUpdateNow(),
});

/** Configuração SiTef / loja (uma linha, id=1). */
export const configuracaoTefTable = mysqlTable("configuracao_tef", {
  id: int("id", { unsigned: true }).primaryKey().default(1),
  ip: varchar("ip", { length: 255 }).notNull().default("127.0.0.1"),
  empresa: varchar("empresa", { length: 32 }).notNull().default("00000000"),
  empresaCnpj: varchar("empresa_cnpj", { length: 14 }).notNull().default(""),
  terminal: varchar("terminal", { length: 16 }).notNull().default("000001"),
  softwareHouseCnpj: varchar("software_house_cnpj", { length: 14 })
    .notNull()
    .default(""),
  pinPadPorta: varchar("pin_pad_porta", { length: 32 })
    .notNull()
    .default("AUTO_USB"),
  pinPadMensagem: varchar("pin_pad_mensagem", { length: 64 })
    .notNull()
    .default("MeowEats Totem"),
  pinPadVerificar: boolean("pin_pad_verificar").notNull().default(true),
  senhaSupervisor: int("senha_supervisor", { unsigned: true })
    .notNull()
    .default(1234),
  bridgeWsUrl: varchar("bridge_ws_url", { length: 255 })
    .notNull()
    .default("ws://127.0.0.1:5099/tef/ws"),
  bridgeHttpUrl: varchar("bridge_http_url", { length: 255 })
    .notNull()
    .default("http://127.0.0.1:5099"),
  mockPagamento: boolean("mock_pagamento").notNull().default(false),
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow().onUpdateNow(),
});

export const impressorasTable = mysqlTable("impressoras", {
  id: idPk(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipoConexao: mysqlEnum("tipo_conexao", ["rede", "usb"]).notNull().default("rede"),
  endereco: varchar("endereco", { length: 255 }).notNull(),
  larguraPapel: mysqlEnum("largura_papel", ["80mm", "58mm"]).notNull().default("80mm"),
  margemEsquerda: int("margem_esquerda").notNull().default(0),
  margemDireita: int("margem_direita").notNull().default(0),
  ativa: boolean("ativa").notNull().default(true),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow().onUpdateNow(),
});

export const fiscalDocumentsTable = mysqlTable(
  "fiscal_documents",
  {
    id: idPk(),
    pedidoId: int("pedido_id", { unsigned: true })
      .notNull()
      .references(() => pedidosTable.id, { onDelete: "cascade" }),
    provider: mysqlEnum("provider", ["plugnotas"]).notNull().default("plugnotas"),
    ambiente: mysqlEnum("ambiente", ["sandbox", "producao"])
      .notNull()
      .default("sandbox"),
    idIntegracao: varchar("id_integracao", { length: 50 }).notNull(),
    idNota: varchar("id_nota", { length: 80 }),
    protocol: varchar("protocol", { length: 80 }),
    status: mysqlEnum("status", [
      "pending",
      "processing",
      "authorized",
      "rejected",
      "cancel_requested",
      "cancelled",
      "error",
    ])
      .notNull()
      .default("pending"),
    chaveAcesso: varchar("chave_acesso", { length: 64 }),
    numero: varchar("numero", { length: 40 }),
    serie: varchar("serie", { length: 20 }),
    protocoloAutorizacao: varchar("protocolo_autorizacao", { length: 80 }),
    protocoloCancelamento: varchar("protocolo_cancelamento", { length: 80 }),
    cStat: int("c_stat"),
    mensagem: text("mensagem"),
    erro: text("erro"),
    pdfUrl: varchar("pdf_url", { length: 1024 }),
    xmlUrl: varchar("xml_url", { length: 1024 }),
    xmlCancelamentoUrl: varchar("xml_cancelamento_url", { length: 1024 }),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    idIntegracaoUnique: uniqueIndex("fiscal_documents_id_integracao_uq").on(
      table.idIntegracao,
    ),
  }),
);

export const fiscalEventsTable = mysqlTable("fiscal_events", {
  id: idPk(),
  fiscalDocumentId: int("fiscal_document_id", { unsigned: true })
    .notNull()
    .references(() => fiscalDocumentsTable.id, { onDelete: "cascade" }),
  tipo: mysqlEnum("tipo", [
    "emit_requested",
    "emit_accepted",
    "emit_error",
    "summary_updated",
    "cancel_requested",
    "cancel_status_updated",
    "cancel_error",
  ])
    .notNull()
    .default("emit_requested"),
  payload: text("payload").notNull(),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

export const insertCategoriaSchema = createInsertSchema(categoriasTable).omit({
  id: true,
});
export const insertProdutoSchema = createInsertSchema(produtosTable).omit({
  id: true,
});
export const insertExtraSchema = createInsertSchema(extrasTable).omit({
  id: true,
});
export const insertPedidoSchema = createInsertSchema(pedidosTable).omit({
  id: true,
  criadoEm: true,
});
export const insertItemPedidoSchema = createInsertSchema(itensPedidoTable).omit({
  id: true,
});
export const insertImpressoraSchema = createInsertSchema(impressorasTable).omit({
  id: true,
  criadoEm: true,
  atualizadoEm: true,
});

export type InsertCategoria = typeof categoriasTable.$inferInsert;
export type Categoria = typeof categoriasTable.$inferSelect;
export type InsertProduto = typeof produtosTable.$inferInsert;
export type InsertExtra = typeof extrasTable.$inferInsert;
export type Produto = typeof produtosTable.$inferSelect;
export type Extra = typeof extrasTable.$inferSelect;
export type InsertPedido = typeof pedidosTable.$inferInsert;
export type InsertItemPedido = typeof itensPedidoTable.$inferInsert;
export type Pedido = typeof pedidosTable.$inferSelect;
export type ItemPedido = typeof itensPedidoTable.$inferSelect;
export type InsertFiscalDocument = typeof fiscalDocumentsTable.$inferInsert;
export type FiscalDocument = typeof fiscalDocumentsTable.$inferSelect;
export type InsertFiscalEvent = typeof fiscalEventsTable.$inferInsert;
export type FiscalEvent = typeof fiscalEventsTable.$inferSelect;
export type PagamentoTef = typeof pagamentosTefTable.$inferSelect;
export type InsertPagamentoTef = typeof pagamentosTefTable.$inferInsert;
export type ConfiguracaoTef = typeof configuracaoTefTable.$inferSelect;
export type InsertConfiguracaoTef = typeof configuracaoTefTable.$inferInsert;
export type Impressora = typeof impressorasTable.$inferSelect;
export type InsertImpressora = typeof impressorasTable.$inferInsert;
