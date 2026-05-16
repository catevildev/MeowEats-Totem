import { Router, type IRouter } from "express";
import { db, categoriasTable, runInsertWithLastId } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categorias", async (req, res) => {
  try {
    const categorias = await db.select().from(categoriasTable).orderBy(asc(categoriasTable.ordem));
    res.json(categorias);
  } catch (err) {
    req.log.error({ err }, "Error listing categorias");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/categorias", async (req, res) => {
  try {
    const { nome, icone, imagemUrl, ordem } = req.body;
    const id = await runInsertWithLastId(async (dbi) => {
      await dbi.insert(categoriasTable).values({ nome, icone, imagemUrl, ordem: ordem ?? 0 });
    });
    const categoria = await db
      .select()
      .from(categoriasTable)
      .where(eq(categoriasTable.id, id))
      .then((rows) => rows[0]);
    if (!categoria) return res.status(500).json({ error: "Falha ao criar categoria" });
    res.status(201).json(categoria);
  } catch (err) {
    req.log.error({ err }, "Error creating categoria");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/categorias/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nome, icone, imagemUrl, ordem } = req.body;
    const exists = await db
      .select({ id: categoriasTable.id })
      .from(categoriasTable)
      .where(eq(categoriasTable.id, id))
      .then((rows) => rows[0]);
    if (!exists) return res.status(404).json({ error: "Categoria não encontrada" });

    await db
      .update(categoriasTable)
      .set({ nome, icone, imagemUrl, ordem })
      .where(eq(categoriasTable.id, id));
    const categoria = await db
      .select()
      .from(categoriasTable)
      .where(eq(categoriasTable.id, id))
      .then((rows) => rows[0]);
    if (!categoria) return res.status(404).json({ error: "Categoria não encontrada" });
    res.json(categoria);
  } catch (err) {
    req.log.error({ err }, "Error updating categoria");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/categorias/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(categoriasTable).where(eq(categoriasTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting categoria");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
