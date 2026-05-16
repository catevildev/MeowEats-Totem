/**
 * Substitui o preinstall em shell (rm/case) para funcionar no Windows sem Git Bash.
 * Mantém: remover locks concorrentes e exigir instalação via pnpm.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

for (const name of ["package-lock.json", "yarn.lock"]) {
  const file = path.join(root, name);
  try {
    fs.unlinkSync(file);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

const ua = process.env.npm_config_user_agent || "";
const execPath = (process.env.npm_execpath || "").replace(/\\/g, "/");
const isPnpm =
  ua.includes("pnpm/") ||
  /(^|[\\/])pnpm(\.cjs)?$/i.test(execPath) ||
  execPath.includes("/pnpm/");

if (!isPnpm) {
  console.error(
    "Este monorepo usa apenas pnpm. Instale com: corepack enable && corepack pnpm install",
  );
  process.exit(1);
}
