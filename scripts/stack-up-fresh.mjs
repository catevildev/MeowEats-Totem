/**
 * Mesmo fluxo que stack-up.mjs, mas força rebuild das imagens sem cache de build Docker.
 * Uso: npx pnpm@9 run stack:up:fresh
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const script = path.join(__dirname, "stack-up.mjs");

const r = spawnSync(process.execPath, [script], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, STACK_BUILD_NO_CACHE: "1" },
  windowsHide: true,
});
process.exit(r.status ?? 1);
