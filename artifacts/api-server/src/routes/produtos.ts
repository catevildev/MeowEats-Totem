import { Router, type IRouter } from "express";
import { db, produtosTable, extrasTable, categoriasTable, runInsertWithLastId } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { normalizeProdutoImagem } from "../lib/produto-imagem";

const router: IRouter = Router();

async function getProdutoComExtras(id: number) {
  const produto = await db.select().from(produtosTable).where(eq(produtosTable.id, id)).then(r => r[0]);
  if (!produto) return null;
  const extras = await db
    .select()
    .from(extrasTable)
    .where(eq(extrasTable.produtoId, id));
  const categoria = await db
    .select()
    .from(categoriasTable)
    .where(eq(categoriasTable.id, produto.categoriaId))
    .then((r) => r[0]);
  return {
    ...produto,
    preco: parseFloat(produto.preco),
    extras: extras
      .map((e) => ({
        ...e,
        preco: parseFloat(e.preco),
        grupoTitulo: e.grupoTitulo ?? "Opções",
        modoSelecao: e.modoSelecao ?? "multipla",
        maxSelecoes: e.maxSelecoes ?? 1,
        obrigatorio: Boolean(e.obrigatorio),
        ordemGrupo: e.ordemGrupo ?? 0,
        ordemItem: e.ordemItem ?? 0,
        imagem: e.imagem ?? null,
      }))
      .sort(
        (a, b) =>
          a.ordemGrupo - b.ordemGrupo || a.ordemItem - b.ordemItem,
      ),
    categoria: categoria ?? null,
  };
}

type ExtraInput = {
  nome: string;
  preco: number;
  tipo: string;
  grupoTitulo?: string;
  modoSelecao?: string;
  maxSelecoes?: number;
  obrigatorio?: boolean;
  ordemGrupo?: number;
  ordemItem?: number;
  imagem?: string | null;
};

function mapExtraInsert(produtoId: number, e: ExtraInput) {
  let imagemUrl: string | null = null;
  try {
    imagemUrl = normalizeProdutoImagem(e.imagem);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Imagem da opção inválida";
    throw new Error(msg);
  }
  return {
    produtoId,
    nome: e.nome,
    preco: e.preco.toString(),
    tipo: e.tipo as "adicional" | "remocao" | "tamanho",
    grupoTitulo: e.grupoTitulo?.trim() || "Opções",
    modoSelecao: (e.modoSelecao ?? "multipla") as
      | "multipla"
      | "unica"
      | "sim_nao",
    maxSelecoes: e.maxSelecoes ?? 1,
    obrigatorio: e.obrigatorio ?? false,
    ordemGrupo: e.ordemGrupo ?? 0,
    ordemItem: e.ordemItem ?? 0,
    imagem: imagemUrl,
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
      extras = [],
    } = req.body;
    let imagemUrl: string | null;
    try {
      imagemUrl = normalizeProdutoImagem(imagem);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Imagem inválida";
      return res.status(400).json({ error: msg });
    }
    const produtoId = await runInsertWithLastId(async (dbi) => {
      await dbi.insert(produtosTable).values({
        nome,
        descricao,
        preco: preco.toString(),
        categoriaId,
        imagem: imagemUrl,
        ativo: ativo ?? true,
        ncm: "00000000",
        cfop: "5102",
        origem: "0",
        cest: null,
      });
    });

    if (extras.length > 0) {
      await db.insert(extrasTable).values(
        extras.map((e: ExtraInput) => mapExtraInsert(produtoId, e)),
      );
    }

    const result = await getProdutoComExtras(produtoId);
    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err }, "Error creating produto");
    const msg = err instanceof Error ? err.message : "Erro interno";
    const status = msg.includes("base64") || msg.includes("URL") ? 400 : 500;
    res.status(status).json({ error: status === 400 ? msg : "Erro interno" });
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
      extras = [],
    } = req.body;
    let imagemUrl: string | null;
    try {
      imagemUrl = normalizeProdutoImagem(imagem);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Imagem inválida";
      return res.status(400).json({ error: msg });
    }
    await db.update(produtosTable).set({
      nome,
      descricao,
      preco: preco.toString(),
      categoriaId,
      imagem: imagemUrl,
      ativo,
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
        extras.map((e: ExtraInput) => mapExtraInsert(id, e)),
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
