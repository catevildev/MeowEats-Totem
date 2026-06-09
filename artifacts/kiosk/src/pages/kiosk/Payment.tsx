import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Smartphone, Banknote, AlertCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCart } from "@/context/CartContext";
import { KioskHeader } from "@/components/kiosk/Header";
import { useCriarPedido, CriarPedidoInputFormaPagamento } from "@workspace/api-client-react";
import { formatCurrency, generateOrderNumber } from "@/lib/utils";
import {
  payViaTefBridge,
  shouldUseMockPayment,
  isTefBridgeAvailable,
  type TefForma,
} from "@/lib/tef-bridge";
import {
  criarPagamentoPendente,
  atualizarPagamento,
} from "@/lib/tef-api";
import { resolveTefInteraction } from "@/lib/tef-interaction";
import { sanitizeApprovedTefMensagem } from "@/lib/tef-display";

interface PaymentScreenProps {
  onBack: () => void;
  onSuccess: (orderNumber: string) => void;
}

function mapTefStatus(reason: string): "aprovado" | "cancelado" | "negado" {
  if (reason === "approved") return "aprovado";
  if (reason === "cancelled") return "cancelado";
  return "negado";
}

export function PaymentScreen({ onBack, onSuccess }: PaymentScreenProps) {
  const { total, items, orderType, clearCart } = useCart();
  const criarPedido = useCriarPedido();

  const [status, setStatus] = useState<"selecting" | "pix" | "processing" | "error">("selecting");
  const [tefStatus, setTefStatus] = useState("");
  const [pixQrPayload, setPixQrPayload] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSelectMethod = (selected: CriarPedidoInputFormaPagamento) => {
    processPayment(selected);
  };

  async function createOrder(
    forma: CriarPedidoInputFormaPagamento,
    pagamentoId?: number,
  ) {
    const payload = {
      tipoPedido: orderType || "comer_aqui",
      formaPagamento: forma,
      itens: items.map((item) => ({
        produtoId: item.produto.id,
        quantidade: item.quantidade,
        extrasIds: item.extras.map((e) => e.id),
        observacoes: item.observacoes,
      })),
    };
    const res = await criarPedido.mutateAsync({ data: payload });
    if (pagamentoId) {
      await atualizarPagamento(pagamentoId, { pedidoId: res.id });
    }
    const orderNumber = res?.numero || generateOrderNumber();
    clearCart();
    onSuccess(orderNumber);
  }

  const processPayment = async (forma: CriarPedidoInputFormaPagamento) => {
    setStatus(forma === "pix" ? "pix" : "processing");
    setTefStatus("Conectando ao pinpad...");
    setPixQrPayload(null);
    setErrorMessage("");

    let pagamentoId: number | undefined;

    try {
      const mock = await shouldUseMockPayment();
      const bridgeOk = mock || (await isTefBridgeAvailable());

      if (!bridgeOk) {
        throw new Error(
          "Maquininha indisponível. Inicie o MeowEats.TefBridge (dotnet run) e verifique o pinpad USB.",
        );
      }

      const pagamento = await criarPagamentoPendente(total, forma);
      pagamentoId = pagamento.id;

      if (mock) {
        setTefStatus("Modo simulado (admin) — aguarde...");
        await new Promise((r) => setTimeout(r, 2500));
        await atualizarPagamento(pagamentoId, {
          statusPagamento: "aprovado",
          tefReason: "approved",
          tefMensagem: "Pagamento simulado",
        });
      } else {
        const tefResult = await payViaTefBridge({
          valor: total,
          forma: forma as TefForma,
          onStatus: (text) => setTefStatus(text),
          onQrCode: ({ data }) => setPixQrPayload(data),
          onQrClose: () => setPixQrPayload(null),
          onInteraction: async (interaction) =>
            resolveTefInteraction(interaction, setTefStatus),
        });

        const statusPagamento = tefResult.approved
          ? "aprovado"
          : mapTefStatus(tefResult.reason);
        const tefMensagem = tefResult.approved
          ? sanitizeApprovedTefMensagem(tefResult.message)
          : tefResult.message;

        await atualizarPagamento(pagamentoId, {
          statusPagamento,
          tefTransactionId: tefResult.transactionId,
          tefCodigo: tefResult.code,
          tefMensagem,
          tefReason: tefResult.reason,
        });

        if (!tefResult.approved) {
          const detail =
            tefResult.message ||
            (tefResult.code === 50001
              ? "Pinpad não detectado — conecte o equipamento USB."
              : tefResult.code === 5002
                ? "Falha na comunicação com o pinpad."
                : "Pagamento não aprovado na maquininha");
          setErrorMessage(
            tefResult.code ? `${detail} (código ${tefResult.code})` : detail,
          );
          setStatus("error");
          setTimeout(() => setStatus("selecting"), 5000);
          return;
        }
      }

      setStatus("processing");
      setTefStatus("Pagamento aprovado. Registrando pedido...");
      await createOrder(forma, pagamentoId);
    } catch (error) {
      console.error("Payment failed", error);
      if (pagamentoId) {
        try {
          await atualizarPagamento(pagamentoId, {
            statusPagamento: "cancelado",
            tefMensagem: error instanceof Error ? error.message : "Erro",
            tefReason: "cancelled",
          });
        } catch {
          /* ignore */
        }
      }
      setErrorMessage(error instanceof Error ? error.message : "Pagamento recusado");
      setStatus("error");
      setTimeout(() => setStatus("selecting"), 5000);
    }
  };

  return (
    <div className="fixed inset-0 bg-kiosk-bg flex flex-col">
      <KioskHeader
        showBack={status === "selecting"}
        onBack={onBack}
        title={status === "selecting" ? "Escolha a forma de pagamento" : "Pagamento"}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {status === "selecting" && (
            <motion.div
              key="selecting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-6"
            >
              <div className="col-span-1 sm:col-span-2 text-center mb-8">
                <p className="text-2xl text-muted-foreground">Total a pagar</p>
                <p className="text-6xl font-display font-bold text-primary mt-2">
                  {formatCurrency(total)}
                </p>
              </div>

              <PaymentButton
                icon={<CreditCard className="w-16 h-16" />}
                label="Cartão de Crédito"
                onClick={() => handleSelectMethod("credito")}
              />
              <PaymentButton
                icon={<CreditCard className="w-16 h-16" />}
                label="Cartão de Débito"
                onClick={() => handleSelectMethod("debito")}
              />
              <PaymentButton
                icon={<Smartphone className="w-16 h-16" />}
                label="Aproximação (NFC)"
                onClick={() => handleSelectMethod("nfc")}
              />
              <PaymentButton
                icon={<Banknote className="w-16 h-16" />}
                label="PIX"
                onClick={() => handleSelectMethod("pix")}
                highlight
              />
            </motion.div>
          )}

          {status === "pix" && (
            <motion.div
              key="pix"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-[3rem] p-16 shadow-2xl flex flex-col items-center text-center max-w-2xl w-full"
            >
              {pixQrPayload ? (
                <>
                  <QRCodeSVG value={pixQrPayload} size={280} level="M" />
                  <h2 className="text-4xl font-display font-bold mt-8 mb-4">Escaneie o QR Code</h2>
                </>
              ) : (
                <div className="w-48 h-48 rounded-full border-8 border-primary/20 border-t-primary animate-spin mb-8" />
              )}
              <p className="text-xl text-muted-foreground mb-4">{tefStatus || "Aguardando maquininha..."}</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
            </motion.div>
          )}

          {status === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center text-center max-w-2xl"
            >
              <div className="w-48 h-48 rounded-full border-8 border-primary/20 border-t-primary animate-spin mb-12" />
              <h2 className="text-5xl font-display font-bold mb-4">Processando Pagamento</h2>
              <p className="text-2xl text-muted-foreground">
                {tefStatus || "Siga as instruções na maquininha..."}
              </p>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center bg-destructive/10 text-destructive p-16 rounded-[3rem] max-w-2xl"
            >
              <AlertCircle className="w-32 h-32 mb-8" />
              <h2 className="text-5xl font-display font-bold mb-4">Pagamento Recusado</h2>
              <p className="text-2xl">{errorMessage || "Tente novamente."}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PaymentButton({
  icon,
  label,
  onClick,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center p-12 rounded-[2.5rem] border-4 transition-all active:scale-95 shadow-lg
        ${
          highlight
            ? "bg-secondary/10 border-secondary text-secondary-foreground hover:bg-secondary/20"
            : "bg-card border-transparent hover:border-primary/50 text-foreground"
        }
      `}
    >
      <div className={`mb-6 ${highlight ? "text-secondary" : "text-muted-foreground"}`}>{icon}</div>
      <span className="text-3xl font-bold">{label}</span>
    </button>
  );
}
