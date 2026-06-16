import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from "node-thermal-printer";
import { db, impressorasTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Pedido, ItemPedido, Produto, Extra } from "@workspace/db";

// Baseado no retorno do getPedidoCompleto
type PedidoCompleto = Pedido & {
  total: number;
  itens: (ItemPedido & {
    preco: number;
    extrasIds: number[];
    produto: (Produto & {
      preco: number;
      extras: (Extra & { preco: number })[];
      categoria: any;
    }) | null;
  })[];
};

export async function imprimirReciboPedido(pedido: PedidoCompleto) {
  try {
    const impressoras = await db.select().from(impressorasTable).where(eq(impressorasTable.ativa, true));
    
    if (impressoras.length === 0) {
      console.log("Nenhuma impressora ativa encontrada para imprimir recibo.");
      return;
    }

    for (const config of impressoras) {
      try {
        const printer = new ThermalPrinter({
          type: PrinterTypes.EPSON,
          interface: config.tipoConexao === "rede" ? `tcp://${config.endereco}` : `tcp://0.0.0.0:9999`,
          characterSet: CharacterSet.PC858_EURO,
          removeSpecialCharacters: false,
          lineCharacter: "-",
          breakLine: BreakLine.WORD,
          width: config.larguraPapel === "58mm" ? 32 : 48, // Fonte padrao 48/32 colunas
          options: {
            timeout: 5000
          }
        });

        if (config.tipoConexao === "rede") {
          const isConnected = await printer.isPrinterConnected();
          if (!isConnected) {
            console.error(`Impressora ${config.nome} (${config.endereco}) não está conectada.`);
            continue;
          }
        }

        printer.alignCenter();
        printer.bold(true);
        printer.setTextSize(1, 1);
        printer.println("MeowEats");
        printer.setTextNormal();
        printer.drawLine();
        printer.println(`Pedido: ${pedido.numero}`);
        printer.println(`Data: ${new Date(pedido.criadoEm).toLocaleString("pt-BR")}`);
        printer.println(`Tipo: ${pedido.tipoPedido === "comer_aqui" ? "Comer Aqui" : "Para Viagem"}`);
        printer.drawLine();

        printer.alignLeft();
        let qtdItens = 0;
        
        printer.alignLeft();
        printer.println("DESCRIÇÃO DO PEDIDO");
        printer.drawLine();

        for (const item of pedido.itens) {
          if (!item.produto) continue;
          qtdItens += item.quantidade;
          
          printer.println(item.produto.nome);
          printer.leftRight(
            `  ${item.quantidade}x R$ ${item.preco.toFixed(2)}`,
            `R$ ${(item.quantidade * item.preco).toFixed(2)}`
          );
          
          if (item.observacoes) {
            printer.println(`  Obs: ${item.observacoes}`);
          }
          
          for (const extra of item.produto.extras) {
            printer.leftRight(`  + ${extra.nome}`, `R$ ${extra.preco.toFixed(2)}`);
          }
        }

        printer.drawLine();
        printer.alignLeft();
        
        printer.leftRight("QTD. TOTAL DE ITENS", qtdItens.toString());
        printer.leftRight("VALOR TOTAL R$", `R$ ${pedido.total.toFixed(2)}`);
        printer.leftRight("DESCONTO", "R$ 0.00");
        printer.leftRight("VALOR A PAGAR", `R$ ${pedido.total.toFixed(2)}`);
        
        printer.println("");
        
        let formaPag = (pedido.formaPagamento || "PENDENTE").toUpperCase();
        if (formaPag === "CREDITO") formaPag = "CARTAO CREDITO";
        if (formaPag === "DEBITO") formaPag = "CARTAO DEBITO";

        printer.leftRight("FORMA DE PAGAMENTO", "Valor Pago");
        printer.leftRight(formaPag, `R$ ${pedido.total.toFixed(2)}`);
        
        // Espaçamento final de segurança para o corte
        printer.println(" ");
        printer.println(" ");
        printer.println(" ");
        printer.cut();
        printer.beep();
        
        if (config.tipoConexao === "usb") {
          const buffer = printer.getBuffer();
          const base64 = buffer.toString('base64');
          const bridgeUrl = process.env.TEF_BRIDGE_HTTP_URL || "http://host.docker.internal:5099";
          
          const res = await fetch(`${bridgeUrl}/tef/print`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              printerName: config.endereco,
              dataBase64: base64
            })
          });
          
          if (!res.ok) {
             const errData = await res.text();
             throw new Error(`Falha na ponte de impressão local: ${errData}`);
          }
        } else {
          await printer.execute();
        }
        
        console.log(`Recibo ${pedido.numero} impresso na impressora: ${config.nome}`);
      } catch (err) {
        console.error(`Erro ao tentar imprimir na impressora ${config.nome}:`, err);
      }
    }
  } catch (err) {
    console.error("Erro no servico de impressao:", err);
  }
}
