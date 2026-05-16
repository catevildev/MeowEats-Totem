/**
 * Base da API no browser.
 * - Dev local (Vite): deixe VITE_API_URL vazio → rotas relativas /api/* (proxy do vite.config).
 * - Vercel + Lightsail: VITE_API_URL=https://sua-api:6005 (sem barra no final).
 */
export function getApiBaseUrl(): string | null {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}

/** Caminhos /api/uploads/... ou URLs absolutas vindas do banco. */
export function resolveMediaUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return apiUrl(trimmed);
}
