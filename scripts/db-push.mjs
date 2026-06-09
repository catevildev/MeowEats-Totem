/**
 * Aplica o schema Drizzle no MySQL local (porta 6010 do docker-compose).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbUrl =
  process.env.DATABASE_URL ??
  process.env.STACK_DATABASE_URL ??
  "mysql://meoweats:meoweats@127.0.0.1:6010/meoweats";

const pnpm =
  spawnSync("pnpm", ["--version"], { shell: true, encoding: "utf8" }).status ===
  0
    ? "pnpm"
    : "npx --yes pnpm@10";

const r = spawnSync(`${pnpm} --filter @workspace/db run push:dev`, {
  shell: true,
  stdio: "inherit",
  cwd: root,
  env: { ...process.env, DATABASE_URL: dbUrl },
  windowsHide: true,
});

process.exit(r.status ?? 1);
