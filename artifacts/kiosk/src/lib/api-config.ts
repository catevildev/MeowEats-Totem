/**
 * URLs da API e mídia em desenvolvimento local.
 * Com base vazia, pedidos usam o mesmo host (proxy Vite ou Docker em /api).
 */

export function getApiBaseUrl(): string | null {
  return null;
}

export function apiUrl(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function resolveMediaUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url?.trim()) return undefined;
  const u = url.trim();
  if (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("data:")
  ) {
    return u;
  }
  if (u.startsWith("/api/")) return u;
  if (u.startsWith("/uploads/")) return `/api${u}`;
  if (u.startsWith("/")) return u;
  return u;
}
