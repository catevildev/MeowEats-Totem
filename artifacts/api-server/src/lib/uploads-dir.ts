import path from "path";

/**
 * Pasta de uploads no monorepo: MeowEats-Order-Manager/uploads
 * (do cwd artifacts/api-server sobe dois níveis).
 * Deve coincidir com o bind mount ./uploads:/app/uploads no Docker.
 */
export function getUploadsDir(): string {
  if (process.env.UPLOADS_DIR?.trim()) {
    return path.resolve(process.env.UPLOADS_DIR.trim());
  }
  return path.resolve(process.cwd(), "..", "..", "uploads");
}
