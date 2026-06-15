import { FormEvent, useEffect, useState, ReactNode } from "react";
import { AdminLayout } from "./AdminLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  fetchTefConfig,
  saveTefConfig,
  type TefConfig,
  type TefBridgeHealth,
} from "@/lib/tef-api";
import { clearTefConfigCache } from "@/lib/tef-bridge";
import { subscribeTefBridgeStatus } from "@/lib/tef-bridge-monitor";

const BRIDGE_DEFAULT_HTTP = "http://127.0.0.1:5099";
const BRIDGE_DEFAULT_WS = "ws://127.0.0.1:5099/tef/ws";

function bridgeUrlsLookWrong(config: TefConfig): boolean {
  return (
    !config.bridgeHttpUrl.includes(":5099") ||
    !config.bridgeWsUrl.includes(":5099")
  );
}

function normalizeBridgeUrls(config: TefConfig): TefConfig {
  return {
    ...config,
    bridgeHttpUrl: BRIDGE_DEFAULT_HTTP,
    bridgeWsUrl: BRIDGE_DEFAULT_WS,
  };
}

const inputCls = "border rounded-lg px-3 py-2 bg-background w-full";

export default function AdminTefConfig() {
  const [config, setConfig] = useState<TefConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [bridgeHealth, setBridgeHealth] = useState<TefBridgeHealth | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const c = await fetchTefConfig();
      setConfig(c);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (!config?.bridgeWsUrl) return;

    return subscribeTefBridgeStatus(config.bridgeWsUrl, ({ connected, health }) => {
      setWsConnected(connected);
      if (health) setBridgeHealth(health);
    });
  }, [config?.bridgeWsUrl]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      const payload = bridgeUrlsLookWrong(config) ? normalizeBridgeUrls(config) : config;
      const saved = await saveTefConfig({
        ...payload,
        pinPadMensagem: payload.pinPadMensagem,
      });
      setConfig(saved);
      clearTefConfigCache();

      const reload = saved.bridgeReload;
      if (reload?.ok) {
        setMsg(
          reload.usedUrl && reload.usedUrl !== saved.bridgeHttpUrl
            ? `Configuração salva. Pinpad reiniciado via ${reload.usedUrl} (URL corrigida automaticamente).`
            : "Configuração salva. SiTef e pinpad reiniciados com a nova mensagem.",
        );
      } else if (reload) {
        setMsg(
          reload.pinpad?.message
            ? `Configuração salva, mas pinpad retornou: ${reload.pinpad.message}`
            : `Configuração salva, mas SiTef retornou código ${reload.initCode ?? "?"}.`,
        );
      } else {
        const bridgeOnline = wsConnected && Boolean(bridgeHealth?.online);
        setMsg(
          bridgeOnline
            ? "Configuração salva. O bridge aplicará a mensagem no pinpad em alguns segundos (monitor ativo)."
            : `Configuração salva, mas a API não alcançou o bridge em ${saved.bridgeHttpUrl}. Confira se dotnet run está ativo — o admin via WebSocket ${wsConnected ? "está conectado" : "não conectou"}.`,
        );
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  if (loading || !config) {
    return (
      <AdminLayout>
        <LoadingSpinner />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 w-full max-w-7xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração TEF / Loja</h1>
          <p className="text-muted-foreground">
            Parâmetros SiTef (empresa, terminal, pinpad) e URLs da ponte local
          </p>
        </div>

        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            bridgeHealth?.ok
              ? "bg-success/10 text-success border-success/20"
              : bridgeHealth?.online
                ? "bg-amber-500/10 text-amber-800 border-amber-500/20"
                : "bg-amber-500/10 text-amber-800 border-amber-500/20"
          }`}
        >
          TEF Bridge:{" "}
          {bridgeHealth === null
            ? wsConnected
              ? "Conectado — aguardando status…"
              : "Conectando via WebSocket…"
            : !bridgeHealth.online
              ? "Offline — execute dotnet run em MeowEats.TefBridge"
              : bridgeHealth.ok
                ? bridgeHealth.pinPadPresent
                  ? "Online — pinpad detectado"
                  : "Online — TEF pronto"
                : bridgeHealth.message ?? "Online — verifique SiTef"}
          {wsConnected && bridgeHealth?.online ? (
            <span className="text-xs opacity-70 ml-2">(monitor WS)</span>
          ) : !wsConnected && config ? (
            <span className="text-xs opacity-70 ml-2">
              (WS desconectado — confira URL {BRIDGE_DEFAULT_WS})
            </span>
          ) : null}
        </div>

        {bridgeUrlsLookWrong(config) ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 space-y-2">
            <p>
              As URLs da ponte apontam para <strong>{config.bridgeHttpUrl}</strong>, mas o
              MeowEats.TefBridge padrão roda em <strong>{BRIDGE_DEFAULT_HTTP}</strong>.
              Salvar com URL errada impede reiniciar o pinpad ao alterar a mensagem.
            </p>
            <button
              type="button"
              className="text-sm font-semibold underline"
              onClick={() => setConfig(normalizeBridgeUrls(config))}
            >
              Corrigir URLs para porta 5099
            </button>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold text-lg">SiTef / Loja</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <Field label="IP do Gerenciador SiTef">
              <input
                className={inputCls}
                value={config.ip}
                onChange={(e) => setConfig({ ...config, ip: e.target.value })}
              />
            </Field>
            <Field label="Código da empresa">
              <input
                className={inputCls}
                value={config.empresa}
                onChange={(e) => setConfig({ ...config, empresa: e.target.value })}
              />
            </Field>
            <Field label="CNPJ da loja">
              <input
                className={inputCls}
                value={config.empresaCnpj}
                onChange={(e) => setConfig({ ...config, empresaCnpj: e.target.value })}
              />
            </Field>
            <Field label="Terminal (6 dígitos)">
              <input
                className={inputCls}
                value={config.terminal}
                onChange={(e) => setConfig({ ...config, terminal: e.target.value })}
              />
            </Field>
            <Field label="CNPJ Software House">
              <input
                className={inputCls}
                value={config.softwareHouseCnpj}
                onChange={(e) =>
                  setConfig({ ...config, softwareHouseCnpj: e.target.value })
                }
              />
            </Field>
            <Field label="Porta PinPad">
              <input
                className={inputCls}
                value={config.pinPadPorta}
                onChange={(e) => setConfig({ ...config, pinPadPorta: e.target.value })}
              />
            </Field>
            <Field label="Mensagem no visor do PinPad" className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
              <input
                className={`${inputCls} font-mono`}
                maxLength={32}
                value={config.pinPadMensagem}
                onChange={(e) =>
                  setConfig({ ...config, pinPadMensagem: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Até 32 caracteres (2 linhas × 16). Use espaços no início para centralizar
                — ex.: &quot;&nbsp;&nbsp;&nbsp;&nbsp;MeowEats Totem&quot;
              </p>
            </Field>
            <Field label="Senha supervisor (4 dígitos)">
              <input
                className={inputCls}
                type="number"
                value={config.senhaSupervisor}
                onChange={(e) =>
                  setConfig({ ...config, senhaSupervisor: Number(e.target.value) })
                }
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.pinPadVerificar}
              onChange={(e) =>
                setConfig({ ...config, pinPadVerificar: e.target.checked })
              }
            />
            Verificar pinpad conectado
          </label>

          <h2 className="font-semibold text-lg pt-4">Ponte local (MeowEats.TefBridge)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="URL HTTP">
              <input
                className={inputCls}
                value={config.bridgeHttpUrl}
                onChange={(e) =>
                  setConfig({ ...config, bridgeHttpUrl: e.target.value })
                }
              />
            </Field>
            <Field label="URL WebSocket">
              <input
                className={inputCls}
                value={config.bridgeWsUrl}
                onChange={(e) => setConfig({ ...config, bridgeWsUrl: e.target.value })}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm border rounded-lg p-3 bg-muted/30">
            <input
              type="checkbox"
              checked={config.mockPagamento}
              onChange={(e) =>
                setConfig({ ...config, mockPagamento: e.target.checked })
              }
            />
            <span>
              <strong>Modo simulado</strong> — pula a maquininha (só para testes sem pinpad)
            </span>
          </label>

          {msg && (
            <div className="text-sm text-success bg-success/10 rounded-lg px-3 py-2">{msg}</div>
          )}
          {erro && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={salvando}
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar configuração"}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
