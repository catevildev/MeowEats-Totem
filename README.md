# MeowEats Order Manager

## Overview

pnpm workspace monorepo using TypeScript. Full self-service restaurant kiosk system in Brazilian Portuguese.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: MySQL 8 + Drizzle ORM (`mysql2`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, TailwindCSS, Framer Motion, Recharts

## Structure

```text
MeowEats-Order-Manager/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── kiosk/              # React kiosk frontend (4 modules)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (ex.: stack-up.mjs)
├── docker-compose.yml      # MySQL local
├── .env.example
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Kiosk System Modules

The frontend at `/` has 4 main sections:

1. **Totem do Cliente** (`/`) — Full ordering flow kiosk
   - Welcome screen → Order type → Menu → Customization → Cart → Payment → Confirmation
2. **Cozinha** (`/cozinha`) — Kitchen display panel (kanban: Novos, Em Preparo, Prontos)
3. **TV** (`/tv`) — Public order status display
4. **Admin** (`/admin`) — Product management, order history, sales reports

## Database Schema

- `categorias` — Product categories (Combos, Hambúrgueres, Bebidas, Acompanhamentos, Sobremesas)
- `produtos` — Products with price, category, image, active status
- `extras` — Product customizations (adicional, remocao, tamanho)
- `pedidos` — Orders with status tracking
- `itens_pedido` — Order line items

## API Endpoints

All under `/api`:

- `GET /healthz` — Health check
- `GET/POST /categorias` — Categories CRUD
- `PUT/DELETE /categorias/:id`
- `GET/POST /produtos` — Products CRUD
- `GET/PUT/DELETE /produtos/:id`
- `GET/POST /pedidos` — Orders
- `GET /pedidos/:id`
- `PATCH /pedidos/:id/status` — Update order status
- `GET /relatorios/vendas` — Sales report

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`.

## Root Scripts

- `pnpm run stack:up` — **Docker sobe o MySQL** + `drizzle-kit push` (uma vez por ambiente; requer Docker Desktop)
- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Windows (pnpm sem Git Bash)

O `preinstall` usa `node scripts/preinstall.cjs` (portável). **Não use `npm install`** neste monorepo.

### Se `corepack enable` der `EPERM` em `C:\Program Files\nodejs\`

A instalação do Node em `Program Files` é só de leitura para utilizadores normais. Opções:

**A — Sem administrador (recomendado):** usar o pnpm via `npx` (não precisa de `corepack enable`):

```powershell
cd C:\caminho\para\MeowEats-Order-Manager
$env:CI = "true"   # evita prompts interativos do pnpm
npx --yes pnpm@9 install
```

Para comandos seguintes (`build`, `dev`), continue com `npx`:

```powershell
npx pnpm@9 run build
```

**B — Com administrador:** abrir PowerShell **Executar como administrador**, depois:

```powershell
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
```

**C — pnpm no PATH só do seu utilizador:** instalar com prefixo em `%AppData%` ou usar [pnpm standalone](https://pnpm.io/installation) / Node via **nvm-windows** ou **fnm** (pasta em `Users\...`, sem `EPERM`).

### Git Bash / WSL

Se já tiver `pnpm` no PATH, `pnpm install` funciona normalmente.

---

## Subir tudo em desenvolvimento (Windows / local)

Na raiz do repositório, use **`pnpm`** ou **`npx pnpm@9`** (mesmo comando em todos os passos).

### 1. Uma vez: dependências

```powershell
cd C:\...\MeowEats-Order-Manager
$env:CI = "true"
npx pnpm@9 install
```

### 2. MySQL + tabelas (um comando)

Com **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** a correr:

```powershell
cd C:\...\MeowEats-Order-Manager
npx pnpm@9 run stack:up
```

Isto faz `docker compose up -d` (MySQL 8 na porta **3306**, utilizador `meoweats` / palavra-passe `meoweats`, base `meoweats`) e corre **`drizzle-kit push`**.  
URL por defeito (também em `.env.example`):

`mysql://meoweats:meoweats@127.0.0.1:3306/meoweats`

Para parar o contentor: `docker compose down` (na mesma pasta).

O `stack:up` corre `push:dev` (**`drizzle-kit push --force`**) para o MySQL local alinhar sempre com o schema; **não uses `--force` em produção** (usa migrações versionadas). Se a BD ficar num estado estranho: `docker compose down -v` e volta a correr `stack:up`.

### 3. Dois terminais — API + Kiosk

**Terminal A — API (Express)** — porta **8080** (padrão do proxy do kiosk):

```powershell
cd C:\...\MeowEats-Order-Manager
$env:DATABASE_URL = "mysql://meoweats:meoweats@127.0.0.1:3306/meoweats"
$env:PORT = "8080"
$env:NODE_ENV = "development"
npx pnpm@9 --filter @workspace/api-server run dev
```

**Terminal B — Kiosk (Vite)**:

```powershell
cd C:\...\MeowEats-Order-Manager
$env:PORT = "5173"
$env:BASE_PATH = "/"
# Se a API não estiver em http://127.0.0.1:8080:
# $env:API_URL = "http://127.0.0.1:8080"
npx pnpm@9 --filter @workspace/kiosk run dev
```

### 4. Abrir no browser

- Totem: [http://localhost:5173/](http://localhost:5173/)
- Cozinha: [http://localhost:5173/cozinha](http://localhost:5173/cozinha)
- TV: [http://localhost:5173/tv](http://localhost:5173/tv)
- Admin: [http://localhost:5173/admin](http://localhost:5173/admin)
- API saúde: [http://localhost:8080/api/healthz](http://localhost:8080/api/healthz)

O Vite encaminha pedidos `/api/*` para a API (ver `artifacts/kiosk/vite.config.ts`).
