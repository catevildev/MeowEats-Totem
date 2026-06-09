import { Router, type IRouter } from "express";
import { db, pedidosTable, itensPedidoTable, produtosTable, extrasTable, runInsertWithLastId } from "@workspace/db";
import { eq, and, sql, desc, gte, lt, ne, inArray } from "drizzle-orm";
import { imprimirReciboPedido } from "../lib/printer";

function getDayBounds(dataParam?: string): { start: Date; end: Date } {
  let y: number;
  let m: number;
  let d: number;

  if (dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam)) {
    [y, m, d] = dataParam.split("-").map(Number);
  } else {
    const now = new Date();
    y = now.getFullYear();
    m = now.getMonth() + 1;
    d = now.getDate();
  }

  return {
    start: new Date(y, m - 1, d, 0, 0, 0, 0),
    end: new Date(y, m - 1, d + 1, 0, 0, 0, 0),
  };
}

const router: IRouter = Router();

let contadorPedido = 1;

async function getNextNumero(): Promise<string> {
  const lastOrder = await db.select({ numero: pedidosTable.numero })
    .from(pedidosTable)
    .orderBy(desc(pedidosTable.id))
    .limit(1);

  if (lastOrder.length > 0) {
    const last = lastOrder[0].numero;
    const match = last.match(/([A-Z])(\d+)/);
    if (match) {
      const letter = match[1];
      const num = parseInt(match[2]) + 1;
      if (num > 999) return `${String.fromCharCode(letter.charCodeAt(0) + 1)}001`;
      return `${letter}${num.toString().padStart(3, "0")}`;
    }
  }
  return "A001";
}

export async function getPedidoCompleto(id: number) {
  const pedido = await db.select().from(pedidosTable).where(eq(pedidosTable.id, id)).then(r => r[0]);
  if (!pedido) return null;

  const itens = await db.select().from(itensPedidoTable).where(eq(itensPedidoTable.pedidoId, id));
  const itensComProduto = await Promise.all(itens.map(async (item) => {
    const produto = await db.select().from(produtosTable).where(eq(produtosTable.id, item.produtoId)).then(r => r[0]);
    const extrasIds = JSON.parse(item.extrasIds ?? "[]") as number[];
    const extras = extrasIds.length > 0
      ? await db.select().from(extrasTable).where(inArray(extrasTable.id, extrasIds))
      : [];
    return {
      ...item,
      preco: parseFloat(item.preco),
      extrasIds,
      produto: produto ? {
        ...produto,
        preco: parseFloat(produto.preco),
        extras: extras.map(e => ({ ...e, preco: parseFloat(e.preco) })),
        categoria: null,
      } : null,
    };
  }));

  return {
    ...pedido,
    total: parseFloat(pedido.total),
    itens: itensComProduto,
  };
}

router.get("/pedidos", async (req, res) => {
  try {
    const { status, data } = req.query;
    const conditions = [];
    if (status) conditions.push(eq(pedidosTable.status, status as string));
    if (data) {
      const startDate = new Date(data as string);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(data as string);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(sql`${pedidosTable.criadoEm} >= ${startDate} AND ${pedidosTable.criadoEm} <= ${endDate}`);
    }

    const pedidos = conditions.length > 0
      ? await db.select().from(pedidosTable).where(and(...conditions)).orderBy(desc(pedidosTable.criadoEm))
      : await db.select().from(pedidosTable).orderBy(desc(pedidosTable.criadoEm));

    const result = await Promise.all(pedidos.map(p => getPedidoCompleto(p.id)));
    res.json(result.filter(Boolean));
  } catch (err) {
    req.log.error({ err }, "Error listing pedidos");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/pedidos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pedido = await getPedidoCompleto(id);
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(pedido);
  } catch (err) {
    req.log.error({ err }, "Error getting pedido");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/pedidos", async (req, res) => {
  try {
    const { tipoPedido, formaPagamento, itens } = req.body;
    const numero = await getNextNumero();

    let total = 0;
    for (const item of itens) {
      const produto = await db.select().from(produtosTable).where(eq(produtosTable.id, item.produtoId)).then(r => r[0]);
      if (!produto) return res.status(400).json({ error: `Produto ${item.produtoId} não encontrado` });

      let itemPrice = parseFloat(produto.preco);
      if (item.extrasIds?.length) {
        const extras = await db.select().from(extrasTable).where(inArray(extrasTable.id, item.extrasIds));
        for (const extra of extras) {
          if (extra.tipo === "adicional" || extra.tipo === "tamanho") {
            itemPrice += parseFloat(extra.preco);
          }
        }
      }
      total += itemPrice * item.quantidade;
    }

    const pedidoId = await runInsertWithLastId(async (dbi) => {
      await dbi.insert(pedidosTable).values({
        numero,
        status: "novo",
        total: total.toFixed(2),
        tipoPedido,
        formaPagamento,
      });
    });

    for (const item of itens) {
      const produto = await db.select().from(produtosTable).where(eq(produtosTable.id, item.produtoId)).then(r => r[0]);
      let itemPrice = parseFloat(produto!.preco);
      if (item.extrasIds?.length) {
        const extras = await db.select().from(extrasTable).where(inArray(extrasTable.id, item.extrasIds));
        for (const extra of extras) {
          if (extra.tipo === "adicional" || extra.tipo === "tamanho") {
            itemPrice += parseFloat(extra.preco);
          }
        }
      }
      await db.insert(itensPedidoTable).values({
        pedidoId,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        preco: itemPrice.toFixed(2),
        observacoes: item.observacoes,
        extrasIds: JSON.stringify(item.extrasIds ?? []),
      });
    }

    const result = await getPedidoCompleto(pedidoId);
    
    if (result) {
      imprimirReciboPedido(result as any).catch(e => req.log.error({ err: e }, "Erro ao acionar impressora no POST /pedidos"));
    }

    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err }, "Error creating pedido");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/pedidos/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    await db.update(pedidosTable).set({ status }).where(eq(pedidosTable.id, id));
    const pedido = await db
      .select()
      .from(pedidosTable)
      .where(eq(pedidosTable.id, id))
      .then((rows) => rows[0]);
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });
    const result = await getPedidoCompleto(pedido.id);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error updating status");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/pedidos/:id/imprimir", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pedido = await getPedidoCompleto(id);
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

    await imprimirReciboPedido(pedido as any);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error reprinting pedido");
    res.status(500).json({ error: "Erro ao reimprimir pedido" });
  }
});

router.get("/relatorios/vendas", async (req, res) => {
  try {
    const { data } = req.query;
    const { start, end } = getDayBounds(
      typeof data === "string" ? data : undefined,
    );

    const pedidos = await db.select().from(pedidosTable).where(
      and(
        gte(pedidosTable.criadoEm, start),
        lt(pedidosTable.criadoEm, end),
        ne(pedidosTable.status, "cancelado"),
      ),
    );

    const totalVendas = pedidos.reduce((sum, p) => sum + parseFloat(p.total), 0);
    const totalPedidos = pedidos.length;
    const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;

    const pedidoIds = pedidos.map((p) => p.id);
    const itensDoDia =
      pedidoIds.length === 0
        ? []
        : await db
            .select({
              produtoId: itensPedidoTable.produtoId,
              quantidade: itensPedidoTable.quantidade,
              preco: itensPedidoTable.preco,
            })
            .from(itensPedidoTable)
            .where(inArray(itensPedidoTable.pedidoId, pedidoIds));

    const produtoContagem: Record<number, { quantidade: number; total: number }> = {};
    for (const item of itensDoDia) {
      if (!produtoContagem[item.produtoId]) produtoContagem[item.produtoId] = { quantidade: 0, total: 0 };
      produtoContagem[item.produtoId].quantidade += item.quantidade;
      produtoContagem[item.produtoId].total += parseFloat(item.preco) * item.quantidade;
    }

    const produtosMaisVendidos = await Promise.all(
      Object.entries(produtoContagem)
        .sort((a, b) => b[1].quantidade - a[1].quantidade)
        .slice(0, 10)
        .map(async ([produtoId, dados]) => {
          const produto = await db.select().from(produtosTable).where(eq(produtosTable.id, parseInt(produtoId))).then(r => r[0]);
          return { produto: produto?.nome ?? "Desconhecido", ...dados };
        })
    );

    const vendasPorHora: { hora: string; total: number; quantidade: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const hora = `${h.toString().padStart(2, "0")}:00`;
      const pedidosHora = pedidos.filter(p => {
        const d = new Date(p.criadoEm);
        return d.getHours() === h;
      });
      vendasPorHora.push({
        hora,
        total: pedidosHora.reduce((sum, p) => sum + parseFloat(p.total), 0),
        quantidade: pedidosHora.length,
      });
    }

    res.json({ totalVendas, totalPedidos, ticketMedio, produtosMaisVendidos, vendasPorHora });
  } catch (err) {
    req.log.error({ err }, "Error getting relatorio");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
