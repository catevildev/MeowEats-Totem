import { apiUrl } from "@/lib/api-config";

export async function uploadImagem(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("imagem", file);

  const res = await fetch(apiUrl("/api/upload"), {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Falha ao enviar imagem");
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    throw new Error("Resposta de upload inválida");
  }
  return data.url;
}
