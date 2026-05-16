/**
 * Sobe API + MySQL para produção (Lightsail).
 * Pré-requisitos: .env com MYSQL_* e CORS_ORIGIN; Docker em execução.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const composeFile = "docker-compose.prod.yml";

const DEFAULT_DATABASE_URL =
  "mysql://meoweats:meoweats@127.0.0.1:6010/meoweats";

function run(cmd, opts = {}) {
  const result = spawnSync(cmd, {
    shell: true,
    stdio: "inherit",
    cwd: root,
    env: opts.env ?? process.env,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(
      `Comando terminou com código ${result.status ?? "null"}: ${cmd}`,
    );
  }
}

function pnpmCmd() {
  const r = spawnSync("pnpm", ["--version"], {
    shell: true,
    encoding: "utf8",
  });
  if (r.status === 0) return "pnpm";
  return "npx --yes pnpm@10";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitMysqlReady(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt += 1;
    const r = spawnSync(
      `docker compose -f ${composeFile} exec -T mysql mysqladmin ping -h 127.0.0.1 -umeoweats -p${process.env.MYSQL_PASSWORD ?? "meoweats"} --silent`,
      { shell: true, cwd: root, encoding: "utf8", windowsHide: true },
    );
    if (r.status === 0) {
      await sleep(1500);
      return;
    }
    await sleep(1500);
  }
  throw new Error("Timeout: MySQL não respondeu.");
}

async function main() {
  const withBuild = process.env.STACK_NO_BUILD !== "1";
  const upCmd = withBuild
    ? `docker compose -f ${composeFile} up -d --wait --build`
    : `docker compose -f ${composeFile} up -d --wait`;

  const up = spawnSync(upCmd, {
    shell: true,
    stdio: "inherit",
    cwd: root,
    windowsHide: true,
  });
  if (up.status !== 0) {
    run(`docker compose -f ${composeFile} up -d --build`);
  }

  await waitMysqlReady(180_000);

  const password = process.env.MYSQL_PASSWORD ?? "meoweats";
  const dbUrl =
    process.env.STACK_DATABASE_URL ??
    `mysql://meoweats:${password}@127.0.0.1:6010/meoweats`;
  const env = { ...process.env, DATABASE_URL: dbUrl };
  const pnpm = pnpmCmd();

  run(`${pnpm} --filter @workspace/db run push:dev`, { env });

  console.log("\n--- Stack de produção (API + MySQL) ---");
  console.log("API:    http://SEU_IP:6005/api/healthz");
  console.log("MySQL:  127.0.0.1:6010 (só no servidor, para manutenção)");
  console.log("Front:  deploy na Vercel com VITE_API_URL apontando para a API");
  console.log("---\n");
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
