import { Router, type IRouter } from "express";
import { db, produtosTable, extrasTable, categoriasTable, runInsertWithLastId } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

async function getProdutoComExtras(id: number) {
  const produto = await db.select().from(produtosTable).where(eq(produtosTable.id, id)).then(r => r[0]);
  if (!produto) return null;
  const extras = await db.select().from(extrasTable).where(eq(extrasTable.produtoId, id));
  const categoria = await db.select().from(categoriasTable).where(eq(categoriasTable.id, produto.categoriaId)).then(r => r[0]);
  return {
    ...produto,
    preco: parseFloat(produto.preco),
    extras: extras.map(e => ({ ...e, preco: parseFloat(e.preco) })),
    categoria: categoria ?? null,
  };
}

router.get("/produtos", async (req, res) => {
  try {
    const { categoria, ativo } = req.query;
    let query = db.select().from(produtosTable);
    const conditions = [];
    if (categoria) conditions.push(eq(produtosTable.categoriaId, parseInt(categoria as string)));
    if (ativo !== undefined) conditions.push(eq(produtosTable.ativo, ativo === "true"));
    const produtos = conditions.length > 0
      ? await db.select().from(produtosTable).where(and(...conditions))
      : await db.select().from(produtosTable);

    const result = await Promise.all(produtos.map(p => getProdutoComExtras(p.id)));
    res.json(result.filter(Boolean));
  } catch (err) {
    req.log.error({ err }, "Error listing produtos");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/produtos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const produto = await getProdutoComExtras(id);
    if (!produto) return res.status(404).json({ error: "Produto não encontrado" });
    res.json(produto);
  } catch (err) {
    req.log.error({ err }, "Error getting produto");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/produtos", async (req, res) => {
  try {
    const {
      nome,
      descricao,
      preco,
      categoriaId,
      imagem,
      ativo,
      ncm,
      cfop,
      origem,
      cest,
      extras = [],
    } = req.body;
    const produtoId = await runInsertWithLastId(async (dbi) => {
      await dbi.insert(produtosTable).values({
        nome,
        descricao,
        preco: preco.toString(),
        categoriaId,
        imagem,
        ativo: ativo ?? true,
        ncm: (ncm ?? "00000000").toString(),
        cfop: (cfop ?? "5102").toString(),
        origem: (origem ?? "0").toString(),
        cest: cest ? cest.toString() : null,
      });
    });

    if (extras.length > 0) {
      await db.insert(extrasTable).values(
        extras.map((e: { nome: string; preco: number; tipo: string }) => ({
          produtoId: produtoId,
          nome: e.nome,
          preco: e.preco.toString(),
          tipo: e.tipo,
        }))
      );
    }

    const result = await getProdutoComExtras(produtoId);
    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err }, "Error creating produto");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/produtos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      nome,
      descricao,
      preco,
      categoriaId,
      imagem,
      ativo,
      ncm,
      cfop,
      origem,
      cest,
      extras = [],
    } = req.body;
    await db.update(produtosTable).set({
      nome,
      descricao,
      preco: preco.toString(),
      categoriaId,
      imagem,
      ativo,
      ncm: (ncm ?? "00000000").toString(),
      cfop: (cfop ?? "5102").toString(),
      origem: (origem ?? "0").toString(),
      cest: cest ? cest.toString() : null,
    }).where(eq(produtosTable.id, id));
    const produto = await db
      .select()
      .from(produtosTable)
      .where(eq(produtosTable.id, id))
      .then((rows) => rows[0]);
    if (!produto) return res.status(404).json({ error: "Produto não encontrado" });

    await db.delete(extrasTable).where(eq(extrasTable.produtoId, id));
    if (extras.length > 0) {
      await db.insert(extrasTable).values(
        extras.map((e: { nome: string; preco: number; tipo: string }) => ({
          produtoId: id,
          nome: e.nome,
          preco: e.preco.toString(),
          tipo: e.tipo,
        }))
      );
    }

    const result = await getProdutoComExtras(id);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error updating produto");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/produtos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(produtosTable).where(eq(produtosTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting produto");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
