/**
 * Monitoramento do TEF Bridge via WebSocket (admin) — sem polling HTTP.
 */

import type { TefBridgeHealth } from "./tef-api";

type WsEnvelope = {
  type: string;
  payload?: Record<string, unknown>;
};

export type TefBridgeMonitorState = {
  connected: boolean;
  health: TefBridgeHealth | null;
};

const OFFLINE: TefBridgeHealth = {
  online: false,
  ok: false,
  dllPresent: false,
  is32BitProcess: false,
  message: "Bridge inacessível — execute dotnet run em MeowEats.TefBridge",
};

function mapHealthPayload(payload: Record<string, unknown> | undefined): TefBridgeHealth {
  if (!payload) return OFFLINE;
  return {
    online: Boolean(payload.online ?? true),
    ok: Boolean(payload.ok),
    dllPresent: Boolean(payload.dllPresent),
    is32BitProcess: Boolean(payload.is32BitProcess),
    initialized: payload.initialized as boolean | undefined,
    pinPadPresent: payload.pinPadPresent as boolean | undefined,
    message: payload.message as string | undefined,
    initCode: payload.initCode as number | undefined,
  };
}

export function subscribeTefBridgeStatus(
  wsUrl: string,
  onUpdate: (state: TefBridgeMonitorState) => void,
): () => void {
  let ws: WebSocket | null = null;
  let stopped = false;
  let reconnectTimer: number | undefined;
  let reconnectDelayMs = 1000;

  const emit = (partial: Partial<TefBridgeMonitorState>) => {
    onUpdate({
      connected: partial.connected ?? false,
      health: partial.health ?? null,
    });
  };

  const connect = () => {
    if (stopped) return;

    try {
      ws = new WebSocket(wsUrl);
    } catch {
      emit({ connected: false, health: OFFLINE });
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectDelayMs = 1000;
      emit({ connected: true });
      ws?.send(JSON.stringify({ type: "subscribe_status" }));
    };

    ws.onmessage = (event) => {
      let msg: WsEnvelope;
      try {
        msg = JSON.parse(String(event.data)) as WsEnvelope;
      } catch {
        return;
      }

      if (msg.type === "status") {
        emit({
          connected: true,
          health: mapHealthPayload(msg.payload),
        });
      }
    };

    ws.onerror = () => {
      emit({ connected: false, health: OFFLINE });
    };

    ws.onclose = () => {
      emit({ connected: false, health: OFFLINE });
      scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    window.clearTimeout(reconnectTimer);
    reconnectTimer = window.setTimeout(() => {
      reconnectDelayMs = Math.min(reconnectDelayMs * 2, 15000);
      connect();
    }, reconnectDelayMs);
  };

  connect();

  return () => {
    stopped = true;
    window.clearTimeout(reconnectTimer);
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    ws = null;
  };
}

export type TefBridgeReloadResult = {
  ok: boolean;
  initCode?: number;
  pinpad?: { ok: boolean; code: number; message?: string | null };
  health?: TefBridgeHealth;
};

export function mapBridgeReloadResult(data: unknown): TefBridgeReloadResult | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const pinpad = row.pinpad as Record<string, unknown> | undefined;
  return {
    ok: Boolean(row.ok),
    initCode: row.initCode as number | undefined,
    pinpad: pinpad
      ? {
          ok: Boolean(pinpad.ok),
          code: Number(pinpad.code ?? -1),
          message: (pinpad.message as string | null) ?? null,
        }
      : undefined,
    health: row.health
      ? mapHealthPayload(row.health as Record<string, unknown>)
      : undefined,
  };
}
