import { Router, type IRouter } from "express";
import {
  db,
  pagamentosTefTable,
  pedidosTable,
  runInsertWithLastId,
} from "@workspace/db";
import { eq, and, desc, gte, lt } from "drizzle-orm";
import { getDateRangeBounds } from "./pedidos";

const router: IRouter = Router();

function mapPagamento(
  row: typeof pagamentosTefTable.$inferSelect,
  pedidoNumero?: string | null,
) {
  return {
    ...row,
    valor: parseFloat(row.valor),
    pedidoNumero: pedidoNumero ?? null,
  };
}

router.get("/pagamentos", async (req, res) => {
  try {
    const { statusPagamento, dataInicio, dataFim } = req.query;
    const conditions = [];
    if (statusPagamento) {
      conditions.push(
        eq(
          pagamentosTefTable.statusPagamento,
          statusPagamento as "pendente" | "aprovado" | "cancelado" | "negado",
        ),
      );
    }
    
    if (dataInicio || dataFim) {
      const { start, end } = getDateRangeBounds(
        typeof dataInicio === "string" ? dataInicio : undefined,
        typeof dataFim === "string" ? dataFim : undefined
      );
      conditions.push(
        and(
          gte(pagamentosTefTable.criadoEm, start),
          lt(pagamentosTefTable.criadoEm, end)
        )!
      );
    }

    const rows =
      conditions.length > 0
        ? await db
            .select({
              pagamento: pagamentosTefTable,
              pedidoNumero: pedidosTable.numero,
            })
            .from(pagamentosTefTable)
            .leftJoin(pedidosTable, eq(pagamentosTefTable.pedidoId, pedidosTable.id))
            .where(and(...conditions))
            .orderBy(desc(pagamentosTefTable.criadoEm))
        : await db
            .select({
              pagamento: pagamentosTefTable,
              pedidoNumero: pedidosTable.numero,
            })
            .from(pagamentosTefTable)
            .leftJoin(pedidosTable, eq(pagamentosTefTable.pedidoId, pedidosTable.id))
            .orderBy(desc(pagamentosTefTable.criadoEm));

    res.json(rows.map((r) => mapPagamento(r.pagamento, r.pedidoNumero)));
  } catch (err) {
    req.log.error({ err }, "Error listing pagamentos");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/pagamentos", async (req, res) => {
  try {
    const { valor, formaPagamento } = req.body;
    if (!valor || !formaPagamento) {
      return res.status(400).json({ error: "valor e formaPagamento são obrigatórios" });
    }

    const id = await runInsertWithLastId(async (dbi) => {
      await dbi.insert(pagamentosTefTable).values({
        valor: Number(valor).toFixed(2),
        formaPagamento,
        statusPagamento: "pendente",
      });
    });

    const row = await db
      .select()
      .from(pagamentosTefTable)
      .where(eq(pagamentosTefTable.id, id))
      .then((r) => r[0]);

    res.status(201).json(mapPagamento(row!));
  } catch (err) {
    req.log.error({ err }, "Error creating pagamento");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/pagamentos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      statusPagamento,
      pedidoId,
      tefTransactionId,
      tefCodigo,
      tefMensagem,
      tefReason,
    } = req.body;

    const patch: Record<string, unknown> = {};
    if (statusPagamento) patch.statusPagamento = statusPagamento;
    if (pedidoId != null) patch.pedidoId = pedidoId;
    if (tefTransactionId != null) patch.tefTransactionId = tefTransactionId;
    if (tefCodigo != null) patch.tefCodigo = tefCodigo;
    if (tefMensagem != null) patch.tefMensagem = tefMensagem;
    if (tefReason != null) patch.tefReason = tefReason;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Nada para atualizar" });
    }

    await db
      .update(pagamentosTefTable)
      .set(patch)
      .where(eq(pagamentosTefTable.id, id));

    const row = await db
      .select()
      .from(pagamentosTefTable)
      .where(eq(pagamentosTefTable.id, id))
      .then((r) => r[0]);

    if (!row) return res.status(404).json({ error: "Pagamento não encontrado" });

    const pedidoNumero = row.pedidoId
      ? await db
          .select({ numero: pedidosTable.numero })
          .from(pedidosTable)
          .where(eq(pedidosTable.id, row.pedidoId))
          .then((r) => r[0]?.numero ?? null)
      : null;

    res.json(mapPagamento(row, pedidoNumero));
  } catch (err) {
    req.log.error({ err }, "Error updating pagamento");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
