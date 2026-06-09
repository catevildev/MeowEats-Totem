import { Router, type IRouter } from "express";
import { db, configuracaoTefTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_CONFIG = {
  id: 1,
  ip: "127.0.0.1",
  empresa: "00000000",
  empresaCnpj: "11111111111111",
  terminal: "000001",
  softwareHouseCnpj: "22222222222222",
  pinPadPorta: "AUTO_USB",
  pinPadMensagem: "MeowEats Totem",
  pinPadVerificar: true,
  senhaSupervisor: 1234,
  bridgeWsUrl: "ws://127.0.0.1:5099/tef/ws",
  bridgeHttpUrl: "http://127.0.0.1:5099",
  mockPagamento: false,
};

async function getOrCreateConfig() {
  const row = await db
    .select()
    .from(configuracaoTefTable)
    .where(eq(configuracaoTefTable.id, 1))
    .then((r) => r[0]);

  if (row) return row;

  await db.insert(configuracaoTefTable).values(DEFAULT_CONFIG);
  return (
    (await db
      .select()
      .from(configuracaoTefTable)
      .where(eq(configuracaoTefTable.id, 1))
      .then((r) => r[0])) ?? DEFAULT_CONFIG
  );
}

async function tryBridgeReload(
  bridgeHttpUrl: string,
  log: { warn: (obj: object, msg: string) => void; info?: (obj: object, msg: string) => void },
) {
  const url = `${bridgeHttpUrl.replace(/\/$/, "")}/tef/reload-config`;
  const res = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    log.warn({ status: res.status, url }, "Bridge reload-config retornou erro");
    return null;
  }
  const body = (await res.json()) as {
    ok?: boolean;
    initCode?: number;
    pinpad?: { ok?: boolean; code?: number; message?: string | null };
    health?: Record<string, unknown>;
  };
  log.info?.({ url, ok: body.ok }, "Bridge reload-config OK");
  return { ...body, usedUrl: bridgeHttpUrl };
}

async function notifyBridgeReload(
  bridgeHttpUrl: string,
  log: { warn: (obj: object, msg: string) => void; info?: (obj: object, msg: string) => void },
) {
  const fromEnv = process.env.TEF_BRIDGE_HTTP_URL?.replace(/\/$/, "");
  const candidates = [
    fromEnv,
    "http://host.docker.internal:5099",
    DEFAULT_CONFIG.bridgeHttpUrl,
    "http://127.0.0.1:5099",
    bridgeHttpUrl,
  ].filter((url, index, all) => Boolean(url) && all.indexOf(url) === index);

  for (const candidate of candidates) {
    try {
      const result = await tryBridgeReload(candidate, log);
      if (result) return result;
    } catch (err) {
      log.warn({ err, url: candidate }, "Bridge offline ou reload-config falhou");
    }
  }

  return null;
}

function normalizeBridgeUrls(httpUrl?: string, wsUrl?: string) {
  const http = String(httpUrl ?? DEFAULT_CONFIG.bridgeHttpUrl);
  if (http.includes(":5099")) {
    return {
      bridgeHttpUrl: http.replace(/\/$/, ""),
      bridgeWsUrl: String(wsUrl ?? DEFAULT_CONFIG.bridgeWsUrl),
    };
  }
  return {
    bridgeHttpUrl: DEFAULT_CONFIG.bridgeHttpUrl,
    bridgeWsUrl: DEFAULT_CONFIG.bridgeWsUrl,
  };
}

router.get("/tef/config", async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    res.json(config);
  } catch (err) {
    req.log.error({ err }, "Error getting tef config");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/tef/config", async (req, res) => {
  try {
    const body = req.body ?? {};
    await getOrCreateConfig();

    const bridgeUrls = normalizeBridgeUrls(body.bridgeHttpUrl, body.bridgeWsUrl);
    const pinPadMensagem = String(
      body.pinPadMensagem ?? DEFAULT_CONFIG.pinPadMensagem,
    ).slice(0, 64);

    await db
      .update(configuracaoTefTable)
      .set({
        ip: body.ip ?? DEFAULT_CONFIG.ip,
        empresa: body.empresa ?? DEFAULT_CONFIG.empresa,
        empresaCnpj: body.empresaCnpj ?? "",
        terminal: body.terminal ?? DEFAULT_CONFIG.terminal,
        softwareHouseCnpj: body.softwareHouseCnpj ?? "",
        pinPadPorta: body.pinPadPorta ?? DEFAULT_CONFIG.pinPadPorta,
        pinPadMensagem,
        pinPadVerificar: body.pinPadVerificar ?? true,
        senhaSupervisor: Number(body.senhaSupervisor ?? 1234),
        bridgeWsUrl: bridgeUrls.bridgeWsUrl,
        bridgeHttpUrl: bridgeUrls.bridgeHttpUrl,
        mockPagamento: Boolean(body.mockPagamento),
      })
      .where(eq(configuracaoTefTable.id, 1));

    const config = await getOrCreateConfig();
    const bridgeReload = await notifyBridgeReload(config.bridgeHttpUrl, req.log);
    res.json({ ...config, bridgeReload });
  } catch (err) {
    req.log.error({ err }, "Error updating tef config");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;

export { getOrCreateConfig };
