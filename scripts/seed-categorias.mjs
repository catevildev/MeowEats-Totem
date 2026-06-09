/**
 * Categorias de demonstração quando a tabela está vazia.
 * Uso: pnpm run db:seed
 * API: http://127.0.0.1:6005 (ou SEED_API_URL)
 */
const API_BASE =
  process.env.SEED_API_URL?.replace(/\/+$/, "") ?? "http://127.0.0.1:6005";

const categorias = [
  { nome: "Lançamentos", icone: null, imagemUrl: null, ordem: 0 },
  { nome: "Sanduíches e McOfertas", icone: null, imagemUrl: null, ordem: 1 },
  { nome: "Mequizices Mais Vendidas", icone: null, imagemUrl: null, ordem: 2 },
  { nome: "Acompanhamentos", icone: null, imagemUrl: null, ordem: 3 },
  { nome: "Bebidas", icone: null, imagemUrl: null, ordem: 4 },
  { nome: "Sobremesas", icone: null, imagemUrl: null, ordem: 5 },
  { nome: "Café da Manhã", icone: null, imagemUrl: null, ordem: 6 },
  { nome: "McLanche Feliz", icone: null, imagemUrl: null, ordem: 7 },
];

async function main() {
  const listRes = await fetch(`${API_BASE}/api/categorias`);
  if (!listRes.ok) {
    console.error(
      `Não foi possível ler categorias (${listRes.status}). API em ${API_BASE}?`,
    );
    process.exit(1);
  }
  const existing = await listRes.json();
  if (Array.isArray(existing) && existing.length > 0) {
    console.log(
      `Já existem ${existing.length} categorias — seed ignorado.`,
    );
    return;
  }

  for (const cat of categorias) {
    const res = await fetch(`${API_BASE}/api/categorias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cat),
    });
    if (res.ok) {
      console.log(`✓ ${cat.nome}`);
    } else {
      console.error(`✗ ${cat.nome}:`, res.status, await res.text());
    }
  }
  console.log("\nSeed concluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
