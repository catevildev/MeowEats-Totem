/**
 * Cliente WebSocket para MeowEats.TefBridge — uma conversa por transação.
 */

import {
  checkTefBridgeHealth,
  fetchTefConfig,
  type TefConfig,
} from "./tef-api";

export type TefForma = "credito" | "debito" | "pix" | "nfc";

export type TefInteraction = {
  interactionId: string;
  dataType: string;
  title?: string;
  message?: string;
  menuItems?: string[];
  minLength: number;
  maxLength: number;
};

export type TefPayResult = {
  approved: boolean;
  code: number;
  message: string;
  reason: string;
  transactionId: string;
  documento?: string | null;
};

export type TefPayOptions = {
  wsUrl?: string;
  httpUrl?: string;
  valor: number;
  forma: TefForma;
  documento?: string;
  onStatus?: (text: string) => void;
  onQrCode?: (payload: { title?: string; data: string }) => void;
  onQrClose?: () => void;
  onInteraction?: (
    interaction: TefInteraction,
  ) => Promise<{
    value?: string;
    confirm?: boolean;
    cancel?: boolean;
    menuIndex?: number;
  }>;
};

type WsEnvelope = {
  type: string;
  sessionId?: string;
  payload?: Record<string, unknown>;
};

let cachedConfig: TefConfig | null = null;

export async function loadTefRuntimeConfig(): Promise<TefConfig> {
  if (!cachedConfig) {
    cachedConfig = await fetchTefConfig();
  }
  return cachedConfig;
}

export function clearTefConfigCache() {
  cachedConfig = null;
}

export async function isTefBridgeAvailable(): Promise<boolean> {
  const config = await loadTefRuntimeConfig();
  if (config.mockPagamento) return true;
  return checkTefBridgeHealth(config.bridgeHttpUrl);
}

export async function shouldUseMockPayment(): Promise<boolean> {
  const config = await loadTefRuntimeConfig();
  return config.mockPagamento;
}

export async function resolveTefWsUrl(): Promise<string> {
  const config = await loadTefRuntimeConfig();
  return config.bridgeWsUrl || "ws://127.0.0.1:5099/tef/ws";
}

export async function payViaTefBridge(options: TefPayOptions): Promise<TefPayResult> {
  const config = await loadTefRuntimeConfig();
  const wsUrl = options.wsUrl || config.bridgeWsUrl;

  if (!config.mockPagamento) {
    const healthy = await checkTefBridgeHealth(
      options.httpUrl || config.bridgeHttpUrl,
    );
    if (!healthy) {
      throw new Error(
        "TEF Bridge offline. Inicie MeowEats.TefBridge (dotnet run) na máquina do pinpad.",
      );
    }
  }

  return new Promise((resolve, reject) => {
    const sessionId = crypto.randomUUID().replace(/-/g, "");
    let settled = false;
    const ws = new WebSocket(wsUrl);

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      fn();
    };

    const send = (type: string, payload?: unknown) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, sessionId, payload }));
      }
    };

    ws.onerror = () => {
      finish(() =>
        reject(
          new Error(
            "Não foi possível conectar ao TEF Bridge. Verifique se dotnet run está ativo em ws://127.0.0.1:5099/tef/ws",
          ),
        ),
      );
    };

    ws.onclose = () => {
      finish(() => {
        if (!settled) {
          reject(new Error("Conexão TEF encerrada antes do fim da transação"));
        }
      });
    };

    ws.onopen = () => {
      send("init");
      send("pinpad_message", { message: config.pinPadMensagem });
      send("start_transaction", {
        valor: options.valor,
        forma: options.forma,
        documento: options.documento,
        operador: "MeowEats",
      });
    };

    ws.onmessage = async (event) => {
      let msg: WsEnvelope;
      try {
        msg = JSON.parse(String(event.data)) as WsEnvelope;
      } catch {
        return;
      }

      const payload = msg.payload;

      switch (msg.type) {
        case "connected":
        case "init_result":
        case "transaction_started":
        case "interaction_ack":
        case "pinpad_message_result":
        case "pong":
          break;

        case "message": {
          const text = String(payload?.text ?? "");
          if (text) options.onStatus?.(text);
          break;
        }

        case "qr_code": {
          const title = payload?.title as string | undefined;
          const data = String(payload?.payload ?? "");
          if (data) options.onQrCode?.({ title, data });
          break;
        }

        case "qr_close":
          options.onQrClose?.();
          break;

        case "interaction": {
          if (!payload || !options.onInteraction) break;
          const interaction: TefInteraction = {
            interactionId: String(payload.interactionId ?? ""),
            dataType: String(payload.dataType ?? ""),
            title: payload.title as string | undefined,
            message: payload.message as string | undefined,
            menuItems: payload.menuItems as string[] | undefined,
            minLength: Number(payload.minLength ?? 0),
            maxLength: Number(payload.maxLength ?? 99),
          };
          try {
            const response = await options.onInteraction(interaction);
            send("interaction_response", {
              interactionId: interaction.interactionId,
              value: response.value ?? null,
              confirm: response.confirm ?? false,
              cancel: response.cancel ?? false,
              menuIndex: response.menuIndex ?? null,
            });
          } catch {
            send("interaction_response", {
              interactionId: interaction.interactionId,
              cancel: true,
            });
          }
          break;
        }

        case "transaction_finished":
          finish(() =>
            resolve({
              approved: Boolean(payload?.approved),
              code: Number(payload?.code ?? -1),
              message: String(payload?.message ?? ""),
              reason: String(payload?.reason ?? "unknown"),
              transactionId: String(payload?.transactionId ?? sessionId),
              documento: (payload?.documento as string | null) ?? null,
            }),
          );
          break;

        case "error":
          finish(() =>
            reject(
              new Error(String((payload as { message?: string })?.message ?? "Erro TEF")),
            ),
          );
          break;

        default:
          break;
      }
    };
  });
}
