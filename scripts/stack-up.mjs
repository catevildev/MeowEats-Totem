/**
 * Um comando: sobe MySQL (Docker) e aplica o schema (drizzle-kit push).
 * Pré-requisitos: Docker Desktop em execução, dependências já instaladas (`pnpm install`).
 *
 * Variáveis de ambiente:
 * - STACK_NO_BUILD=1 — `compose up` sem `--build` (imagens já existentes).
 * - STACK_BUILD_NO_CACHE=1 — `compose build --no-cache` antes do `up` (evita imagem “antiga” por cache).
 * - STACK_DATABASE_URL — URL MySQL no host para drizzle push (default: 127.0.0.1:6010).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** Porta publicada no host pelo docker-compose (serviço mysql → 6010). */
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
  return "npx --yes pnpm@9";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Ping real ao MySQL dentro do contentor (porta 3306 abre antes do servidor aceitar sessões). */
async function waitMysqlReady(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt += 1;
    const r = spawnSync(
      'docker compose exec -T mysql mysqladmin ping -h 127.0.0.1 -umeoweats -pmeoweats --silent',
      { shell: true, cwd: root, encoding: "utf8", windowsHide: true },
    );
    if (r.status === 0) {
      await sleep(1500);
      return;
    }
    if (attempt === 1) {
      console.log(
        "\nÀ espera do MySQL aceitar ligações (healthcheck / mysqladmin ping)…",
      );
    }
    await sleep(1500);
  }
  throw new Error(
    "Timeout: MySQL não respondeu a mysqladmin ping. Verifique Docker Desktop e `docker compose ps`.",
  );
}

async function main() {
  const withBuild = process.env.STACK_NO_BUILD !== "1";
  const buildNoCache = withBuild && process.env.STACK_BUILD_NO_CACHE === "1";

  if (buildNoCache) {
    console.log(
      "\nReconstruindo imagens sem cache de build (STACK_BUILD_NO_CACHE=1)…\n",
    );
    run("docker compose build --no-cache");
  }

  // Depois de `build --no-cache`, evita `up --build` (outra passagem de build com cache).
  const upCmd =
    withBuild && !buildNoCache
      ? "docker compose up -d --wait --build"
      : "docker compose up -d --wait";

  // --wait: Compose v2.20+ aguarda healthchecks (MySQL, API, Kiosk).
  const up = spawnSync(upCmd, {
    shell: true,
    stdio: "inherit",
    cwd: root,
    windowsHide: true,
  });
  if (up.status !== 0) {
    console.log(
      "\nNota: compose --wait falhou (Compose antigo?). A tentar só `up -d`…",
    );
    const fallbackUp =
      withBuild && !buildNoCache
        ? "docker compose up -d --build"
        : "docker compose up -d";
    run(fallbackUp);
  }

  await waitMysqlReady(180_000);

  // Evita herdar acidentalmente DATABASE_URL antigo do terminal.
  // Override opcional: STACK_DATABASE_URL=...
  const dbUrl = process.env.STACK_DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const env = { ...process.env, DATABASE_URL: dbUrl };
  const pnpm = pnpmCmd();
  let lastErr;

  for (let i = 0; i < 20; i++) {
    try {
      // --force: dev local; reconcilia BD após mudanças de schema.
      run(`${pnpm} --filter @workspace/db run push:dev`, { env });
      console.log("\n---");
      console.log("Stack Docker + schema aplicado.");
      console.log("Host DATABASE_URL (Drizzle / dev local):", dbUrl);
      console.log("  Kiosk:     http://127.0.0.1:6001");
      console.log("  API:       http://127.0.0.1:6005");
      console.log("  MySQL:     127.0.0.1:6010");
      console.log(
        "\nSem cache de build (código novo na imagem): npx pnpm@9 run stack:up:fresh",
      );
      console.log(
        "Sem reconstruir imagens na próxima vez: $env:STACK_NO_BUILD='1'; npx pnpm@9 run stack:up",
      );
      console.log("---\n");
      return;
    } catch (e) {
      lastErr = e;
      console.log(
        `\ndrizzle push tentativa ${i + 1}/20 (MySQL a aquecer ou ligação instável)…`,
      );
      if (e?.message) console.log(String(e.message));
      await sleep(3000);
    }
  }

  throw lastErr;
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
