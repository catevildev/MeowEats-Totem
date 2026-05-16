import fs from 'node:fs';

const categorias = [
  { nome: 'Lançamentos', imagemUrl: null, ordem: 0 },
  { nome: 'Sanduíches e McOfertas', imagemUrl: null, ordem: 1 },
  { nome: 'Mequizices Mais Vendidas', imagemUrl: null, ordem: 2 },
  { nome: 'Acompanhamentos', imagemUrl: null, ordem: 3 },
  { nome: 'Bebidas', imagemUrl: null, ordem: 4 },
  { nome: 'Sobremesas', imagemUrl: null, ordem: 5 },
  { nome: 'Café da Manhã', imagemUrl: null, ordem: 6 },
  { nome: 'McLanche Feliz', imagemUrl: null, ordem: 7 }
];

async function seed() {
  for (const cat of categorias) {
    try {
      const res = await fetch('http://localhost:6001/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat)
      });
      if (res.ok) {
        console.log(`✅ Categoria "${cat.nome}" criada com sucesso!`);
      } else {
        const text = await res.text();
        console.error(`❌ Falha ao criar "${cat.nome}":`, res.status, text);
      }
    } catch (err) {
      console.error(`❌ Erro de rede ao criar "${cat.nome}":`, err.message);
    }
  }
}

seed();
