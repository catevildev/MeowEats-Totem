import type { TefInteraction } from "./tef-bridge";

export type TefInteractionResult = {
  value?: string;
  confirm?: boolean;
  cancel?: boolean;
  menuIndex?: number;
};

function interactionText(interaction: TefInteraction): string {
  return [interaction.title, interaction.message].filter(Boolean).join(" — ");
}

function isCardTypeMenu(interaction: TefInteraction): boolean {
  const text = interactionText(interaction).toLowerCase();
  return (
    text.includes("cartao") ||
    text.includes("cartão") ||
    text.includes("tipo do cart")
  );
}

function magneticChipMenuIndex(menuItems: string[]): number {
  const idx = menuItems.findIndex((item) => {
    const s = item.toLowerCase();
    return (s.includes("magnetico") || s.includes("chip")) && !s.includes("digitado");
  });
  return idx >= 0 ? idx : 0;
}

/** Mensagens de erro/aviso do SiTef — só exibir na tela, sem popup do navegador. */
export function looksLikeTefErrorMessage(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /^\d+\s*-\s*/.test(text.trim()) ||
    t.includes("erro") ||
    t.includes("mal inserido") ||
    t.includes("cartao com erro") ||
    t.includes("cartão com erro") ||
    t.includes("negad") ||
    t.includes("nao aprovado") ||
    t.includes("não aprovado") ||
    t.includes("falha") ||
    t.includes("cancelad") ||
    t.includes("recusad") ||
    t.includes("invalid") ||
    t.includes("sem comunicacao") ||
    t.includes("sem comunicação")
  );
}

/**
 * Totem: nunca usa window.prompt/confirm — pinpad e tela do kiosk bastam.
 */
export function resolveTefInteraction(
  interaction: TefInteraction,
  onDisplay?: (text: string) => void,
): TefInteractionResult {
  const display = interactionText(interaction);
  if (display) onDisplay?.(display);

  if (looksLikeTefErrorMessage(display)) {
    return { cancel: true };
  }

  if (interaction.dataType === "Await") {
    return {};
  }

  if (interaction.dataType === "Confirmation") {
    return { confirm: true, cancel: false };
  }

  if (interaction.dataType === "Menu" && interaction.menuItems?.length) {
    if (isCardTypeMenu(interaction)) {
      return { menuIndex: magneticChipMenuIndex(interaction.menuItems) };
    }
    return { menuIndex: 0 };
  }

  // Senha/dados digitados no pinpad — não pedir no navegador.
  if (interaction.minLength > 0 || interaction.maxLength > 0) {
    return { cancel: true };
  }

  return { cancel: true };
}
