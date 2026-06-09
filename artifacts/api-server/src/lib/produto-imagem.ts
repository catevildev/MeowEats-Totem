/** Aceita só URL de upload; rejeita base64 (excede limite e não persiste bem). */
export function normalizeProdutoImagem(imagem: unknown): string | null {
  if (imagem == null || imagem === "") return null;
  if (typeof imagem !== "string") return null;
  const value = imagem.trim();
  if (value.startsWith("data:")) {
    throw new Error(
      "Imagem em base64 não é suportada. Use upload de arquivo (URL /api/uploads/...).",
    );
  }
  if (value.length > 1024) {
    throw new Error("URL da imagem muito longa.");
  }
  return value;
}
