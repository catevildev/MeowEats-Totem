<div align="center">
  <img src="https://img.icons8.com/color/150/000000/restaurant-menu.png" alt="MeowEats Logo" width="150"/>
  <h1>MeowEats Order Manager</h1>
  <p><strong>Sistema Completo de Autoatendimento e Gestão para Restaurantes</strong></p>

  <p>
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/MySQL-00000F?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" />
    <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  </p>
</div>

<br/>

O **MeowEats** é um sistema Kiosk (Totem) de autoatendimento construído de ponta a ponta para restaurantes, lanchonetes e fast-foods. Ele foi projetado para rodar em terminais sensíveis ao toque (touchscreen) e oferece uma experiência fluida para o cliente realizar e pagar seu próprio pedido, integrando maquininhas de cartão (TEF), emissão fiscal (NFC-e) e envio automático para impressão térmica na cozinha.

---

## 📸 Telas do Sistema

| Módulo | Tela Principal | Descrição |
|--------|---------------|-----------|
| **Totem do Cliente** | <img src="https://raw.githubusercontent.com/catevildev/MeowEats-Totem/main/artifacts/kiosk/public/telas/kiosk.png" width="400" alt="Totem do Cliente"/> | Fluxo completo onde o cliente escolhe os produtos, adicionais, revisa o carrinho e realiza o pagamento via TEF ou NFC. |
| **Painel da Cozinha** | <img src="https://raw.githubusercontent.com/catevildev/MeowEats-Totem/main/artifacts/kiosk/public/telas/cozinha.png" width="400" alt="Painel da Cozinha"/> | Sistema Kanban interativo (*drag-and-drop*) separando pedidos em: **Novos**, **Em Preparo** e **Prontos**. |
| **Painel da TV** | <img src="https://raw.githubusercontent.com/catevildev/MeowEats-Totem/main/artifacts/kiosk/public/telas/tv.png" width="400" alt="Painel da TV"/> | Tela pública com design Premium (Glassmorphism e alertas sonoros) para chamar os clientes quando o pedido estiver pronto. |
| **Dashboard Admin** | <img src="https://raw.githubusercontent.com/catevildev/MeowEats-Totem/main/artifacts/kiosk/public/telas/dash.png" width="400" alt="Dashboard Admin"/> | Gerenciamento de cardápio, relatórios de vendas, histórico de pedidos, cadastro de categorias e configurações de hardware. |

---

## 🚀 Arquitetura e Bibliotecas

A aplicação utiliza uma estrutura de **Monorepo** baseada em `pnpm workspaces`, o que permite compartilhar tipagens e configurações em todo o ecossistema (Backend, Frontend e Módulos).

### 🖥️ Frontend (React Kiosk)
- **Framework**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Estilização**: [TailwindCSS](https://tailwindcss.com/) com design system da [shadcn/ui](https://ui.shadcn.com/)
- **Animações**: [Framer Motion](https://www.framer.com/motion/) para transições fluidas no Kiosk.
- **Chamadas de Rede**: [TanStack React Query](https://tanstack.com/query/latest) (geradas automaticamente via Orval a partir do OpenAPI).
- **Interatividade**: [@dnd-kit/core](https://dndkit.com/) para o arrastar e soltar da Cozinha.

### ⚙️ Backend (Node.js API)
- **Servidor**: [Express.js 5](https://expressjs.com/) em [Node.js 24](https://nodejs.org/)
- **ORM & Banco de Dados**: [Drizzle ORM](https://orm.drizzle.team/) integrado a um banco de dados relacional [MySQL 8](https://www.mysql.com/).
- **Validação de Dados**: [Zod](https://zod.dev/) para garantir segurança de entrada/saída de rotas.
- **Integração de Hardware**: `node-thermal-printer` (Impressões térmicas ESC/POS em 58mm e 80mm).
- **Documentação de API**: `openapi.yaml` servido através do belíssimo [Scalar](https://scalar.com/).
- **Bundler**: `esbuild` para compilação super rápida.

---

## 🗄️ Estrutura do Banco de Dados

O banco MySQL lida com a integridade relacional do ecossistema:
- `categorias`: Mapeamento de abas do cardápio (Combos, Bebidas, etc).
- `produtos`: Cadastro principal (com nome, imagem e preço).
- `extras`: Adicionais e customizações (Ex: +Bacon, Sem Cebola).
- `pedidos` e `itens_pedido`: Rastreabilidade do momento que o cliente toca na tela até a entrega no Painel da TV.
- `impressoras`: Gerenciamento de terminais de impressão térmica na rede.

---

## 🛠️ Como Executar o Projeto (Local / Dev)

Para rodar este monorepo no Windows ou Linux (WSL), certifique-se de ter o **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** aberto e o **Node 20+** instalado.

### 1. Instalar as Dependências
Na raiz do projeto, instale usando o `pnpm` (ou npx caso não tenha o pnpm globalizado):
```bash
$env:CI = "true"  # (No powershell, evita prompts interativos)
npx pnpm@9 install
```

### 2. Subir Banco de Dados via Docker
Nós criamos um script unificado que sobe o contêiner do MySQL e automaticamente faz o `push` das tabelas (Drizzle):
```bash
npx pnpm@9 run stack:up
```

### 3. Rodar o Ambiente de Desenvolvimento
Agora, você pode compilar e rodar a API e o Kiosk simultaneamente. Como este é um monorepo com pacotes dependentes, use o script de *dev* ou rode os serviços pelo **Docker Compose**:
```bash
# Para construir e rodar os serviços locais conteinerizados:
docker compose up -d
```
- **Kiosk/Frontend**: `http://localhost:5173/`
- **API Server**: `http://localhost:6005/api`
- **Documentação da API**: `http://localhost:6005/docs`

---

## 🔒 Variáveis de Ambiente

Antes de iniciar, certifique-se de preencher ou criar o arquivo `.env` na raiz do projeto com base no `.env.example`:

```env
PORT=6005
DATABASE_URL="mysql://meoweats:meoweats@127.0.0.1:3306/meoweats?timezone=Z"
TEF_BRIDGE_HTTP_URL="http://localhost:5099"
UPLOADS_DIR="./uploads"
```

---

<p align="center">
  <i>Feito com cuidado para o melhor desempenho em hardware de restaurantes! 🍔🍕</i>
</p>
