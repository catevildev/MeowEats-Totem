import { apiUrl } from "./api-config";

export type TefConfig = {
  id: number;
  ip: string;
  empresa: string;
  empresaCnpj: string;
  terminal: string;
  softwareHouseCnpj: string;
  pinPadPorta: string;
  pinPadMensagem: string;
  pinPadVerificar: boolean;
  senhaSupervisor: number;
  bridgeWsUrl: string;
  bridgeHttpUrl: string;
  mockPagamento: boolean;
};

export type PagamentoTef = {
  id: number;
  pedidoId: number | null;
  pedidoNumero?: string | null;
  valor: number;
  formaPagamento: string;
  statusPagamento: "pendente" | "aprovado" | "cancelado" | "negado";
  tefTransactionId: string | null;
  tefCodigo: number | null;
  tefMensagem: string | null;
  tefReason: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export async function fetchTefConfig(): Promise<TefConfig> {
  const res = await fetch(apiUrl("/api/tef/config"));
  if (!res.ok) throw new Error("Falha ao carregar configuração TEF");
  return res.json();
}

export async function saveTefConfig(config: Partial<TefConfig>): Promise<TefConfigSaveResult> {
  const res = await fetch(apiUrl("/api/tef/config"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Falha ao salvar configuração TEF");
  return res.json();
}

export async function criarPagamentoPendente(
  valor: number,
  formaPagamento: string,
): Promise<PagamentoTef> {
  const res = await fetch(apiUrl("/api/pagamentos"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ valor, formaPagamento }),
  });
  if (!res.ok) throw new Error("Falha ao registrar pagamento");
  return res.json();
}

export async function atualizarPagamento(
  id: number,
  data: Partial<PagamentoTef>,
): Promise<PagamentoTef> {
  const res = await fetch(apiUrl(`/api/pagamentos/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Falha ao atualizar pagamento");
  return res.json();
}

export async function listarPagamentos(
  statusPagamento?: PagamentoTef["statusPagamento"],
  dataInicio?: string,
  dataFim?: string
): Promise<PagamentoTef[]> {
  const params = new URLSearchParams();
  if (statusPagamento) params.append("statusPagamento", statusPagamento);
  if (dataInicio) params.append("dataInicio", dataInicio);
  if (dataFim) params.append("dataFim", dataFim);
  const q = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(apiUrl(`/api/pagamentos${q}`));
  if (!res.ok) throw new Error("Falha ao listar pagamentos");
  return res.json();
}

export type TefBridgeHealth = {
  online: boolean;
  ok: boolean;
  dllPresent: boolean;
  is32BitProcess: boolean;
  initialized?: boolean;
  pinPadPresent?: boolean;
  message?: string;
  initCode?: number;
};

export type TefConfigSaveResult = TefConfig & {
  bridgeReload?: {
    ok: boolean;
    initCode?: number;
    usedUrl?: string;
    pinpad?: { ok: boolean; code: number; message?: string | null };
  } | null;
};

export async function fetchTefBridgeHealth(httpUrl: string): Promise<TefBridgeHealth> {
  const offline: TefBridgeHealth = {
    online: false,
    ok: false,
    dllPresent: false,
    is32BitProcess: false,
    message: "Bridge inacessível — execute dotnet run em MeowEats.TefBridge",
  };

  try {
    const res = await fetch(`${httpUrl.replace(/\/$/, "")}/tef/health`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return offline;

    const data = (await res.json()) as {
      ok?: boolean;
      dllPresent?: boolean;
      is32BitProcess?: boolean;
      initialized?: boolean;
      pinPadPresent?: boolean;
      message?: string;
      initCode?: number;
    };

    return {
      online: true,
      ok: Boolean(data.ok),
      dllPresent: Boolean(data.dllPresent),
      is32BitProcess: Boolean(data.is32BitProcess),
      initialized: data.initialized,
      pinPadPresent: data.pinPadPresent,
      message: data.message,
      initCode: data.initCode,
    };
  } catch {
    return offline;
  }
}

export async function checkTefBridgeHealth(httpUrl: string): Promise<boolean> {
  const health = await fetchTefBridgeHealth(httpUrl);
  return health.ok;
}
