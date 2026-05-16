import { Router, type IRouter } from "express";
import {
  db,
  pedidosTable,
  fiscalDocumentsTable,
  fiscalEventsTable,
  runInsertWithLastId,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router: IRouter = Router();

const PLUGNOTAS_BASE_URL =
  process.env.PLUGNOTAS_BASE_URL ?? "https://api.sandbox.plugnotas.com.br";

type JsonObject = Record<string, unknown>;

function getApiKey(): string {
  const key = process.env.PLUGNOTAS_API_KEY;
  if (!key) throw new Error("PLUGNOTAS_API_KEY não configurada.");
  return key;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function serialize(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function parsePedidoId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

async function logFiscalEvent(
  fiscalDocumentId: number,
  tipo:
    | "emit_requested"
    | "emit_accepted"
    | "emit_error"
    | "summary_updated"
    | "cancel_requested"
    | "cancel_status_updated"
    | "cancel_error",
  payload: unknown,
): Promise<void> {
  await db.insert(fiscalEventsTable).values({
    fiscalDocumentId,
    tipo,
    payload: serialize(payload),
  });
}

async function getFiscalDocByPedido(pedidoId: number) {
  const rows = await db
    .select()
    .from(fiscalDocumentsTable)
    .where(eq(fiscalDocumentsTable.pedidoId, pedidoId))
    .orderBy(desc(fiscalDocumentsTable.id))
    .limit(1);
  return rows[0] ?? null;
}

async function plugnotasRequest(
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set("x-api-key", getApiKey());
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${normalizeBaseUrl(PLUGNOTAS_BASE_URL)}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new Error(
      `PlugNotas ${response.status}: ${typeof data === "string" ? data : text}`,
    );
  }

  return data;
}

function mapResumoStatus(status: unknown): "authorized" | "rejected" | "cancelled" {
  if (status === "REJEITADO" || status === "DENEGADO") return "rejected";
  if (status === "CANCELADO") return "cancelled";
  return "authorized";
}

router.post("/fiscal/nfce/emitir/:pedidoId", async (req, res) => {
  const pedidoId = parsePedidoId(req.params.pedidoId);
  if (!pedidoId) return res.status(400).json({ error: "pedidoId inválido" });

  const payload = (req.body as { payload?: JsonObject }).payload;
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({
      error: "Body inválido. Envie { payload: {...dadosNfce} }.",
    });
  }

  try {
    const pedido = await db
      .select({ id: pedidosTable.id })
      .from(pedidosTable)
      .where(eq(pedidosTable.id, pedidoId))
      .limit(1)
      .then((rows) => rows[0]);
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

    const idIntegracao = `pedido-${pedidoId}-${Date.now()}`;
    const ambiente = (process.env.PLUGNOTAS_AMBIENTE === "producao"
      ? "producao"
      : "sandbox") as "sandbox" | "producao";

    const docId = await runInsertWithLastId(async (dbi) => {
      await dbi.insert(fiscalDocumentsTable).values({
        pedidoId,
        provider: "plugnotas",
        ambiente,
        idIntegracao,
        status: "pending",
      });
    });
    const doc = await db
      .select()
      .from(fiscalDocumentsTable)
      .where(eq(fiscalDocumentsTable.id, docId))
      .then((rows) => rows[0]);
    if (!doc) return res.status(500).json({ error: "Falha ao criar documento fiscal" });

    const notaPayload: JsonObject = { ...payload, idIntegracao };
    await logFiscalEvent(doc.id, "emit_requested", { request: [notaPayload] });

    try {
      const response = (await plugnotasRequest("/nfce", {
        method: "POST",
        body: JSON.stringify([notaPayload]),
      })) as {
        protocol?: string;
        message?: string;
        documents?: Array<{ id?: string }>;
      };

      const idNota = response.documents?.[0]?.id ?? null;
      const protocol = response.protocol ?? null;

      await db
        .update(fiscalDocumentsTable)
        .set({
          status: "processing",
          idNota,
          protocol,
          mensagem: response.message ?? "Nota em processamento",
        })
        .where(eq(fiscalDocumentsTable.id, doc.id));
      const updated = await db
        .select()
        .from(fiscalDocumentsTable)
        .where(eq(fiscalDocumentsTable.id, doc.id))
        .then((rows) => rows[0]);
      if (!updated) return res.status(500).json({ error: "Documento fiscal não encontrado" });

      await logFiscalEvent(doc.id, "emit_accepted", response);
      return res.status(202).json(updated);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao emitir NFC-e";
      await db
        .update(fiscalDocumentsTable)
        .set({ status: "error", erro: message })
        .where(eq(fiscalDocumentsTable.id, doc.id));
      const updated = await db
        .select()
        .from(fiscalDocumentsTable)
        .where(eq(fiscalDocumentsTable.id, doc.id))
        .then((rows) => rows[0]);
      if (!updated) return res.status(502).json({ error: message });
      await logFiscalEvent(doc.id, "emit_error", { error: message });
      return res.status(502).json(updated);
    }
  } catch (err) {
    req.log.error({ err }, "Error on emitir NFC-e");
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/fiscal/nfce/:pedidoId/resumo", async (req, res) => {
  const pedidoId = parsePedidoId(req.params.pedidoId);
  if (!pedidoId) return res.status(400).json({ error: "pedidoId inválido" });

  try {
    const doc = await getFiscalDocByPedido(pedidoId);
    if (!doc) return res.status(404).json({ error: "Documento fiscal não encontrado" });

    const idConsulta = doc.idNota ?? doc.protocol;
    if (!idConsulta) {
      return res.status(400).json({
        error: "Documento sem idNota/protocol para consulta de resumo.",
      });
    }

    const response = (await plugnotasRequest(
      `/nfce/${encodeURIComponent(idConsulta)}/resumo`,
      { method: "GET" },
    )) as Array<{
      status?: string;
      chave?: string;
      numero?: string;
      serie?: string;
      protocolo?: string;
      mensagem?: string;
      erro?: string;
      cStat?: number;
      pdf?: string;
      xml?: string;
      protocoloCancelamento?: string;
      xmlCancelamento?: string;
    }>;

    const resumo = response[0];
    if (!resumo) {
      return res.status(404).json({ error: "Resumo não encontrado na PlugNotas." });
    }

    await db
      .update(fiscalDocumentsTable)
      .set({
        status: mapResumoStatus(resumo.status),
        chaveAcesso: resumo.chave ?? doc.chaveAcesso,
        numero: resumo.numero ?? doc.numero,
        serie: resumo.serie ?? doc.serie,
        protocoloAutorizacao: resumo.protocolo ?? doc.protocoloAutorizacao,
        protocoloCancelamento:
          resumo.protocoloCancelamento ?? doc.protocoloCancelamento,
        cStat: resumo.cStat ?? doc.cStat,
        mensagem: resumo.mensagem ?? doc.mensagem,
        erro: resumo.erro ?? doc.erro,
        pdfUrl: resumo.pdf ?? doc.pdfUrl,
        xmlUrl: resumo.xml ?? doc.xmlUrl,
        xmlCancelamentoUrl: resumo.xmlCancelamento ?? doc.xmlCancelamentoUrl,
      })
      .where(eq(fiscalDocumentsTable.id, doc.id));
    const updated = await db
      .select()
      .from(fiscalDocumentsTable)
      .where(eq(fiscalDocumentsTable.id, doc.id))
      .then((rows) => rows[0]);
    if (!updated) return res.status(500).json({ error: "Documento fiscal não encontrado" });

    await logFiscalEvent(doc.id, "summary_updated", resumo);
    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error on resumo NFC-e");
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/fiscal/nfce/:pedidoId/cancelar", async (req, res) => {
  const pedidoId = parsePedidoId(req.params.pedidoId);
  if (!pedidoId) return res.status(400).json({ error: "pedidoId inválido" });

  const body = req.body as { justificativa?: string };
  const justificativa = body?.justificativa;

  try {
    const doc = await getFiscalDocByPedido(pedidoId);
    if (!doc) return res.status(404).json({ error: "Documento fiscal não encontrado" });
    if (!doc.idNota) {
      return res.status(400).json({
        error: "Documento sem idNota para solicitar cancelamento.",
      });
    }

    const response = (await plugnotasRequest(
      `/nfce/${encodeURIComponent(doc.idNota)}/cancelamento`,
      {
        method: "POST",
        body: JSON.stringify(
          justificativa?.trim()
            ? { justificativa: justificativa.trim() }
            : {},
        ),
      },
    )) as { message?: string };

    await db
      .update(fiscalDocumentsTable)
      .set({
        status: "cancel_requested",
        mensagem: response.message ?? "Cancelamento em processamento",
      })
      .where(eq(fiscalDocumentsTable.id, doc.id));
    const updated = await db
      .select()
      .from(fiscalDocumentsTable)
      .where(eq(fiscalDocumentsTable.id, doc.id))
      .then((rows) => rows[0]);
    if (!updated) return res.status(500).json({ error: "Documento fiscal não encontrado" });

    await logFiscalEvent(doc.id, "cancel_requested", response);
    return res.status(202).json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro no cancelamento";
    req.log.error({ err }, "Error on cancelar NFC-e");
    const doc = await getFiscalDocByPedido(pedidoId);
    if (doc) {
      await db
        .update(fiscalDocumentsTable)
        .set({ erro: message })
        .where(eq(fiscalDocumentsTable.id, doc.id));
      await logFiscalEvent(doc.id, "cancel_error", { error: message });
    }
    return res.status(500).json({ error: message });
  }
});

router.get("/fiscal/nfce/:pedidoId/cancelamento/status", async (req, res) => {
  const pedidoId = parsePedidoId(req.params.pedidoId);
  if (!pedidoId) return res.status(400).json({ error: "pedidoId inválido" });

  try {
    const doc = await getFiscalDocByPedido(pedidoId);
    if (!doc) return res.status(404).json({ error: "Documento fiscal não encontrado" });
    if (!doc.idNota) {
      return res.status(400).json({
        error: "Documento sem idNota para consulta de cancelamento.",
      });
    }

    const response = (await plugnotasRequest(
      `/nfce/${encodeURIComponent(doc.idNota)}/cancelamento/status`,
      { method: "GET" },
    )) as {
      message?: string;
      data?: {
        status?: string;
        cStat?: number;
        respostaSefaz?: string;
        protocolo?: string;
        xml?: string;
      };
    };

    const status = response.data?.status;
    const fiscalStatus =
      status === "CONCLUIDO"
        ? "cancelled"
        : status === "REJEITADO"
          ? "authorized"
          : "cancel_requested";

    await db
      .update(fiscalDocumentsTable)
      .set({
        status: fiscalStatus,
        cStat: response.data?.cStat ?? doc.cStat,
        mensagem:
          response.data?.respostaSefaz ?? response.message ?? doc.mensagem,
        protocoloCancelamento: response.data?.protocolo ?? doc.protocoloCancelamento,
        xmlCancelamentoUrl: response.data?.xml ?? doc.xmlCancelamentoUrl,
      })
      .where(eq(fiscalDocumentsTable.id, doc.id));
    const updated = await db
      .select()
      .from(fiscalDocumentsTable)
      .where(eq(fiscalDocumentsTable.id, doc.id))
      .then((rows) => rows[0]);
    if (!updated) return res.status(500).json({ error: "Documento fiscal não encontrado" });

    await logFiscalEvent(doc.id, "cancel_status_updated", response);
    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error on status cancelamento NFC-e");
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
