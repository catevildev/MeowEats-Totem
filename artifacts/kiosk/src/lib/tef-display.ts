import type { PagamentoTef } from "./tef-api";

/** Mensagens que contradizem status aprovado ou indicam falha. */
export function looksLikeTefFailureMessage(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (!t || t === "unknown") return true;
  return (
    /n[aã]o aprovado/i.test(text) ||
    t.includes("negad") ||
    t.includes("recusad") ||
    t.includes("cancelad") ||
    t.includes("erro") ||
    t.includes("falha") ||
    t.includes("invalid") ||
    t.includes("encoding 1252") ||
    t.includes("sem comunicacao") ||
    t.includes("sem comunicação")
  );
}

export function formatTefMensagemForDisplay(
  status: PagamentoTef["statusPagamento"],
  tefMensagem: string | null | undefined,
  tefReason: string | null | undefined,
): string {
  const raw = (tefMensagem || tefReason || "").trim();

  if (status === "aprovado") {
    if (!raw || looksLikeTefFailureMessage(raw)) {
      return "Pagamento aprovado na maquininha.";
    }
    return raw;
  }

  if (raw) return raw;

  const fallbacks: Record<PagamentoTef["statusPagamento"], string> = {
    pendente: "Aguardando conclusão na maquininha.",
    cancelado: "Operação cancelada.",
    negado: "Pagamento não aprovado na maquininha.",
    aprovado: "Pagamento aprovado na maquininha.",
  };

  return fallbacks[status];
}

export function sanitizeApprovedTefMensagem(message: string): string {
  const trimmed = message.trim();
  if (!trimmed || looksLikeTefFailureMessage(trimmed)) {
    return "Pagamento aprovado na maquininha.";
  }
  return trimmed;
}
