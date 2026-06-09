import type { Extra, CriarExtraInput } from "@workspace/api-client-react";

export type ModoSelecao = "multipla" | "unica" | "sim_nao";

export type OpcaoItemForm = {
  nome: string;
  preco: string;
  /** URL já salva no servidor */
  imagem: string | null;
  /** Arquivo escolhido no admin, enviado no salvar */
  arquivoPendente?: File | null;
  /** blob: para pré-visualização local (revogar ao remover/trocar) */
  previewLocal?: string | null;
};

export type GrupoOpcaoForm = {
  titulo: string;
  modo: ModoSelecao;
  maxSelecoes: number;
  obrigatorio: boolean;
  itens: OpcaoItemForm[];
};

export const MODO_SELECAO_LABELS: Record<ModoSelecao, string> = {
  multipla: "Escolha várias (defina o máximo)",
  unica: "Escolha uma opção",
  sim_nao: "Sim ou Não",
};

export function emptyOpcaoItem(): OpcaoItemForm {
  return {
    nome: "",
    preco: "0",
    imagem: null,
    arquivoPendente: null,
    previewLocal: null,
  };
}

export function emptyGrupoOpcao(modo: ModoSelecao = "multipla"): GrupoOpcaoForm {
  if (modo === "sim_nao") {
    return {
      titulo: "",
      modo: "sim_nao",
      maxSelecoes: 1,
      obrigatorio: true,
      itens: [
        { nome: "Sim", preco: "0", imagem: null },
        { nome: "Não", preco: "0", imagem: null },
      ],
    };
  }
  return {
    titulo: "",
    modo,
    maxSelecoes: modo === "multipla" ? 3 : 1,
    obrigatorio: false,
    itens: [emptyOpcaoItem()],
  };
}

export function gruposToExtrasInput(
  grupos: GrupoOpcaoForm[],
): CriarExtraInput[] {
  const rows: CriarExtraInput[] = [];
  grupos.forEach((grupo, gi) => {
    const titulo = grupo.titulo.trim() || "Opções";
    grupo.itens
      .filter((i) => i.nome.trim())
      .forEach((item, ii) => {
        rows.push({
          nome: item.nome.trim(),
          preco: Number(item.preco || "0"),
          tipo: "adicional",
          grupoTitulo: titulo,
          modoSelecao: grupo.modo,
          maxSelecoes: grupo.modo === "multipla" ? grupo.maxSelecoes : 1,
          obrigatorio: grupo.obrigatorio,
          ordemGrupo: gi,
          ordemItem: ii,
          imagem: item.imagem,
        });
      });
  });
  return rows;
}

/** Faz upload de arquivos pendentes e monta o payload de extras. */
export async function gruposToExtrasInputComUpload(
  grupos: GrupoOpcaoForm[],
  upload: (file: File) => Promise<string>,
): Promise<CriarExtraInput[]> {
  const resolved: GrupoOpcaoForm[] = [];
  for (const grupo of grupos) {
    const itens: OpcaoItemForm[] = [];
    for (const item of grupo.itens) {
      let imagem = item.imagem;
      if (item.arquivoPendente) {
        imagem = await upload(item.arquivoPendente);
      }
      itens.push({
        ...item,
        imagem,
        arquivoPendente: null,
      });
    }
    resolved.push({ ...grupo, itens });
  }
  return gruposToExtrasInput(resolved);
}

export type GrupoOpcaoExibicao = {
  key: string;
  titulo: string;
  modo: ModoSelecao;
  maxSelecoes: number;
  obrigatorio: boolean;
  ordemGrupo: number;
  itens: Extra[];
};

/** Converte extras da API para o formulário de admin (criar/editar). */
export function extrasToGruposForm(extras: Extra[]): GrupoOpcaoForm[] {
  return agruparExtras(extras).map((g) => ({
    titulo: g.titulo,
    modo: g.modo,
    maxSelecoes: g.maxSelecoes,
    obrigatorio: g.obrigatorio,
    itens: g.itens.map((e) => ({
      nome: e.nome,
      preco: String(e.preco),
      imagem: e.imagem ?? null,
      arquivoPendente: null,
      previewLocal: null,
    })),
  }));
}

export function agruparExtras(extras: Extra[]): GrupoOpcaoExibicao[] {
  const map = new Map<string, GrupoOpcaoExibicao>();

  for (const extra of extras) {
    if (extra.tipo === "remocao") continue;
    const titulo = extra.grupoTitulo?.trim() || "Opções";
    const modo = (extra.modoSelecao ?? "multipla") as ModoSelecao;
    const ordemGrupo = extra.ordemGrupo ?? 0;
    const key = `${ordemGrupo}::${titulo}::${modo}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        titulo,
        modo,
        maxSelecoes: extra.maxSelecoes ?? 1,
        obrigatorio: extra.obrigatorio ?? false,
        ordemGrupo,
        itens: [],
      });
    }
    map.get(key)!.itens.push(extra);
  }

  return [...map.values()]
    .map((g) => ({
      ...g,
      itens: [...g.itens].sort(
        (a, b) => (a.ordemItem ?? 0) - (b.ordemItem ?? 0),
      ),
    }))
    .sort((a, b) => a.ordemGrupo - b.ordemGrupo);
}

export function subtituloGrupo(grupo: GrupoOpcaoExibicao): string {
  if (grupo.modo === "multipla") {
    const palavra = grupo.maxSelecoes === 1 ? "opção" : "opções";
    return `Escolha até ${grupo.maxSelecoes} ${palavra}`;
  }
  if (grupo.modo === "sim_nao") {
    return "Escolha 1 opção";
  }
  return "Escolha 1 opção";
}
