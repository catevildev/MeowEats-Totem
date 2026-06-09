import { Router, type IRouter } from "express";
import { db, impressorasTable, runInsertWithLastId } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { ThermalPrinter, PrinterTypes } from "node-thermal-printer";

const router: IRouter = Router();

router.get("/impressoras", async (req, res) => {
  try {
    const impressoras = await db.select().from(impressorasTable).orderBy(desc(impressorasTable.id));
    res.json(impressoras);
  } catch (err) {
    req.log.error({ err }, "Erro listando impressoras");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/impressoras", async (req, res) => {
  try {
    const { nome, tipoConexao, endereco, larguraPapel, margemEsquerda, margemDireita, ativa } = req.body;
    
    const id = await runInsertWithLastId(async (dbi) => {
      await dbi.insert(impressorasTable).values({
        nome,
        tipoConexao: tipoConexao ?? "rede",
        endereco,
        larguraPapel: larguraPapel ?? "80mm",
        margemEsquerda: margemEsquerda ?? 0,
        margemDireita: margemDireita ?? 0,
        ativa: ativa ?? true
      });
    });

    const inserted = await db.select().from(impressorasTable).where(eq(impressorasTable.id, id)).then(r => r[0]);
    res.status(201).json(inserted);
  } catch (err) {
    req.log.error({ err }, "Erro criando impressora");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/impressoras/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updateData = req.body;
    await db.update(impressorasTable).set(updateData).where(eq(impressorasTable.id, id));
    const updated = await db.select().from(impressorasTable).where(eq(impressorasTable.id, id)).then(r => r[0]);
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Erro atualizando impressora");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/impressoras/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(impressorasTable).where(eq(impressorasTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Erro excluindo impressora");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/impressoras/:id/test", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const impressora = await db.select().from(impressorasTable).where(eq(impressorasTable.id, id)).then(r => r[0]);
    
    if (!impressora) {
      return res.status(404).json({ error: "Impressora não encontrada" });
    }

    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: impressora.tipoConexao === "rede" ? `tcp://${impressora.endereco}` : `printer:${impressora.endereco}`,
      options: {
        timeout: 3000
      }
    });

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      return res.status(400).json({ error: "Impressora não está acessível no endereço informado." });
    }

    printer.alignCenter();
    printer.bold(true);
    printer.println("Teste de Impressão - MeowEats");
    printer.setTextNormal();
    printer.println("--------------------------------");
    printer.println(`Configuração: ${impressora.nome}`);
    printer.println(`Interface: ${impressora.endereco}`);
    printer.println("--------------------------------");
    printer.println("Se você está lendo isso, a");
    printer.println("impressora foi configurada com");
    printer.println("sucesso no MeowEats!");
    printer.println(" ");
    printer.println(" ");
    printer.cut();
    printer.beep();
    
    await printer.execute();
    res.json({ success: true, message: "Teste enviado com sucesso" });
  } catch (err) {
    req.log.error({ err }, "Erro ao testar impressora");
    res.status(500).json({ error: "Erro interno ao enviar teste", details: String(err) });
  }
});

export default router;
