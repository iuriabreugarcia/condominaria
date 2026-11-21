import {
  BadgeDollarSign,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  LoaderCircle,
  ReceiptText,
  RefreshCcw,
  Tags,
  WalletCards,
  Printer,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AdminShell } from "../components/AdminShell";
import { useAdminRouteContext } from "../components/AdminProtectedRoute";
import { usePageTitle } from "../hooks/usePageTitle";
import { apiRequest, ApiError } from "../lib/api";

function abrirUrlExternaSegura(url: string) {
  if (typeof document === "undefined" || !url) {
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function abrirJanelaImpressaoSegura(nome = "impressao-financeira"): Window | null {
  if (typeof window === "undefined") {
    return null;
  }

  const abrir = window["open"];

  if (typeof abrir !== "function") {
    return null;
  }

  return abrir.call(
    window,
    "",
    nome,
    "width=980,height=720,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes",
  );
}



import type {
  AdminCategoriaFinanceira,
  AdminCobrancaCondominial,
  AdminConfiguracoesPagamentoCondominio,
  AtualizarConfiguracoesPagamentoCondominioPayload,
  AdminHistoricoFinanceiro,
  AdminLancamentoFinanceiro,
  AdminMorador,
  AdminResumoCobrancas,
  AdminResumoFinanceiro,
  AdminUnidade,
  CancelarFinanceiroAdminPayload,
  CriarCategoriaFinanceiraAdminPayload,
  CriarCobrancaAdminPayload,
  CriarLancamentoFinanceiroAdminPayload,
  PagarFinanceiroAdminPayload,
  StatusCobrancaAdmin,
  StatusFinanceiroAdmin,
  TipoCategoriaFinanceiraAdmin,
  TipoLancamentoFinanceiroAdmin,
  CriarCobrancasLoteAdminPayload,
  ResultadoCriacaoCobrancasLoteAdmin,
} from "../types/api";

const papeisFinanceiro = new Set(["ADMINISTRADOR", "SINDICO", "FINANCEIRO"]);

const configuracoesPagamentoVazias = {
  pixChave: "",
  pixTipo: "",
  beneficiarioPagamento: "",
  bancoPagamento: "",
  instrucoesPagamento: "",
  mensagemCobrancaPadrao: "",
};

type ComprovanteCobrancaVisualizacao = {
  cobrancaId: number;
  arquivoNome: string | null;
  arquivoTipo: string | null;
  arquivoDados: string | null;
  observacao: string | null;
  status: string | null;
  enviadoEm: string | null;
};


function obterMensagemErro(error: unknown, fallback: string) {
  const mensagem = error instanceof ApiError ? error.message : '';
  const normalizada = mensagem.trim().toLowerCase();

  if (!mensagem.trim()) {
    return fallback;
  }

  if (
    normalizada.includes('internal server error') ||
    normalizada.includes('prismaclientknownrequesterror') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('cannot read properties')
  ) {
    return 'Não foi possível concluir a operação agora. Verifique os dados e tente novamente.';
  }

  if (normalizada.includes('failed to fetch') || normalizada.includes('network')) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
  }

  return mensagem;
}

function dataInicioMesAtual() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function dataFimMesAtual() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
}

function dataIsoFinalDoDia(valor: string) {
  return new Date(`${valor}T23:59:59`).toISOString();
}

function dataIsoInicioDoDia(valor: string) {
  return new Date(`${valor}T00:00:00`).toISOString();
}

function formatarData(valor: string | null) {
  if (!valor) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(valor));
}

function formatarDataHora(valor: string | null) {
  if (!valor) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}

function formatarMoeda(valor: string | number | null | undefined) {
  const numero = Number(valor ?? 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(numero) ? numero : 0);
}


function formatarPercentualBR(valor: string | number | null | undefined) {
  const numero = Number(valor ?? 0);

  if (!Number.isFinite(numero)) {
    return '0%';
  }

  const normalizado = Math.max(0, Math.min(100, numero));

  return `${normalizado.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(normalizado) ? 0 : 1,
    maximumFractionDigits: 1,
  })}%`;
}

function rotuloTipo(
  tipo: TipoLancamentoFinanceiroAdmin | TipoCategoriaFinanceiraAdmin,
) {
  switch (tipo) {
    case "RECEITA":
      return "Receita";
    case "DESPESA":
      return "Despesa";
    case "AMBOS":
      return "Ambos";
    default:
      return tipo;
  }
}

function rotuloStatusFinanceiro(status: StatusFinanceiroAdmin) {
  switch (status) {
    case "PENDENTE":
      return "Pendente";
    case "PAGO":
      return "Pago";
    case "CANCELADO":
      return "Cancelado";
    default:
      return status;
  }
}

function rotuloStatusCobranca(status: StatusCobrancaAdmin) {
  switch (status) {
    case "PENDENTE":
      return "Pendente";
    case "PAGO":
      return "Paga";
    case "CANCELADA":
      return "Cancelada";
    default:
      return status;
  }
}

function classeStatusFinanceiro(status: StatusFinanceiroAdmin) {
  switch (status) {
    case "PENDENTE":
      return "bg-amber-100 text-amber-800";
    case "PAGO":
      return "bg-emerald-100 text-emerald-800";
    case "CANCELADO":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function classeStatusCobranca(status: StatusCobrancaAdmin) {
  switch (status) {
    case "PENDENTE":
      return "bg-amber-100 text-amber-800";
    case "PAGO":
      return "bg-emerald-100 text-emerald-800";
    case "CANCELADA":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function FinanceiroStatusBadge({
  status,
}: {
  status: StatusFinanceiroAdmin;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${classeStatusFinanceiro(
        status,
      )}`}
    >
      {rotuloStatusFinanceiro(status)}
    </span>
  );
}

function CobrancaStatusBadge({
  status,
}: {
  status: StatusCobrancaAdmin;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${classeStatusCobranca(
        status,
      )}`}
    >
      {rotuloStatusCobranca(status)}
    </span>
  );
}


function cobrancaAdministrativaEstaVencida(cobranca: AdminCobrancaCondominial) {
  if (cobranca.status !== "PENDENTE") {
    return false;
  }

  const vencimento = new Date(cobranca.vencimentoEm);
  const agora = new Date();

  vencimento.setHours(23, 59, 59, 999);

  return vencimento < agora;
}

function lancamentoFinanceiroEstaVencido(
  lancamento: AdminLancamentoFinanceiro,
) {
  if (lancamento.status !== "PENDENTE" || !lancamento.vencimentoEm) {
    return false;
  }

  const vencimento = new Date(lancamento.vencimentoEm);
  const agora = new Date();

  vencimento.setHours(23, 59, 59, 999);

  return vencimento < agora;
}

function diasAteVencimento(valor: string | null) {
  if (!valor) {
    return null;
  }

  const hoje = new Date();
  const vencimento = new Date(valor);

  hoje.setHours(0, 0, 0, 0);
  vencimento.setHours(0, 0, 0, 0);

  return Math.round(
    (vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function rotuloPrazoVencimento(valor: string | null) {
  const dias = diasAteVencimento(valor);

  if (dias === null) {
    return "Sem vencimento";
  }

  if (dias < 0) {
    return `Vencido há ${Math.abs(dias)} dia(s)`;
  }

  if (dias === 0) {
    return "Vence hoje";
  }

  if (dias === 1) {
    return "Vence amanhã";
  }

  return `Vence em ${dias} dias`;
}

function classePrazoVencimento(valor: string | null) {
  const dias = diasAteVencimento(valor);

  if (dias === null) {
    return "bg-slate-100 text-slate-700";
  }

  if (dias < 0) {
    return "bg-rose-100 text-rose-800";
  }

  if (dias <= 3) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-orange-100 text-orange-800";
}

function rotuloAcaoHistoricoFinanceiro(acao: string) {
  switch (acao) {
    case "PAGAMENTO_LANCAMENTO":
      return "Lançamento pago";
    case "CANCELAMENTO_LANCAMENTO":
      return "Lançamento cancelado";
    case "ESTORNO_PAGAMENTO_LANCAMENTO":
      return "Pagamento desfeito";
    case "PAGAMENTO_COBRANCA":
      return "Cobrança paga";
    case "CANCELAMENTO_COBRANCA":
      return "Cobrança cancelada";
    case "ESTORNO_PAGAMENTO_COBRANCA":
      return "Pagamento desfeito";
    default:
      return acao.toLocaleLowerCase("pt-BR").replace(/_/g, " ");
  }
}

function classeAcaoHistoricoFinanceiro(acao: string) {
  if (acao.includes("CANCELAMENTO")) {
    return "bg-rose-100 text-rose-800";
  }

  if (acao.includes("ESTORNO")) {
    return "bg-amber-100 text-amber-800";
  }

  if (acao.includes("PAGAMENTO")) {
    return "bg-emerald-100 text-emerald-800";
  }

  return "bg-slate-100 text-slate-700";
}

function dataInputDeIso(valor: string | null | undefined) {
  if (!valor) {
    return "";
  }

  return valor.slice(0, 10);
}

export function AdminFinanceiroPage() {
  usePageTitle("Financeiro Administrativo");

  const { usuario, condominiosAdministrativos } = useAdminRouteContext();

  const condominioInicial =
    condominiosAdministrativos.find((vinculo) => vinculo.principal)?.condominio
      .id ??
    condominiosAdministrativos[0]?.condominio.id ??
    0;

  const [condominioId, setCondominioId] = useState(condominioInicial);

  const [categorias, setCategorias] = useState<AdminCategoriaFinanceira[]>([]);
  const [lancamentos, setLancamentos] = useState<AdminLancamentoFinanceiro[]>(
    [],
  );
  const [cobrancas, setCobrancas] = useState<AdminCobrancaCondominial[]>([]);
  const [historicosFinanceiros, setHistoricosFinanceiros] = useState<
    AdminHistoricoFinanceiro[]
  >([]);
  const [buscaHistoricoFinanceiro, setBuscaHistoricoFinanceiro] = useState("");
  const [filtroAcaoHistoricoFinanceiro, setFiltroAcaoHistoricoFinanceiro] =
    useState<"TODAS" | "PAGAMENTO" | "CANCELAMENTO" | "ESTORNO">("TODAS");
  const [inicioHistoricoFinanceiro, setInicioHistoricoFinanceiro] =
    useState("");
  const [fimHistoricoFinanceiro, setFimHistoricoFinanceiro] = useState("");
  const [ordenacaoHistoricoFinanceiro, setOrdenacaoHistoricoFinanceiro] =
    useState<"RECENTES" | "ANTIGOS">("RECENTES");
  const [
    quantidadeHistoricoFinanceiroVisivel,
    setQuantidadeHistoricoFinanceiroVisivel,
  ] = useState(10);
  const [unidades, setUnidades] = useState<AdminUnidade[]>([]);
  const [moradores, setMoradores] = useState<AdminMorador[]>([]);

  const [resumoFinanceiro, setResumoFinanceiro] =
    useState<AdminResumoFinanceiro | null>(null);
  const [resumoCobrancas, setResumoCobrancas] =
    useState<AdminResumoCobrancas | null>(null);
  const [configuracoesPagamento, setConfiguracoesPagamento] =
    useState<AdminConfiguracoesPagamentoCondominio | null>(null);
  const [configuracoesPagamentoForm, setConfiguracoesPagamentoForm] = useState(
    configuracoesPagamentoVazias,
  );
  const [salvandoConfiguracoesPagamento, setSalvandoConfiguracoesPagamento] =
    useState(false);


  const [periodoInicio, setPeriodoInicio] = useState(dataInicioMesAtual());
  const [periodoFim, setPeriodoFim] = useState(dataFimMesAtual());

  const [carregando, setCarregando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState("");
  const [erroAcao, setErroAcao] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [imprimindoRelatorioFinanceiro, setImprimindoRelatorioFinanceiro] =
    useState(false);

  const [enviandoCategoria, setEnviandoCategoria] = useState(false);
  const [editandoCategoriaId, setEditandoCategoriaId] = useState<number | null>(
    null,
  );
  const [salvandoEdicaoCategoria, setSalvandoEdicaoCategoria] = useState(false);
  const [acaoCategoriaId, setAcaoCategoriaId] = useState<number | null>(null);

  const [edicaoCategoriaForm, setEdicaoCategoriaForm] = useState({
    nome: "",
    tipo: "RECEITA" as TipoCategoriaFinanceiraAdmin,
    descricao: "",
  });
  const [enviandoLancamento, setEnviandoLancamento] = useState(false);
  const [enviandoCobranca, setEnviandoCobranca] = useState(false);
  const [enviandoCobrancasLote, setEnviandoCobrancasLote] = useState(false);

  const [acaoLancamentoId, setAcaoLancamentoId] = useState<number | null>(null);
  const [acaoCobrancaId, setAcaoCobrancaId] = useState<number | null>(null);
  const [comprovanteVisualizacao, setComprovanteVisualizacao] =
    useState<ComprovanteCobrancaVisualizacao | null>(null);

  const [erroCancelamentoLancamento, setErroCancelamentoLancamento] = useState<
    Record<number, string>
  >({});
  const [erroCancelamentoCobranca, setErroCancelamentoCobranca] = useState<
    Record<number, string>
  >({});
  const [erroPagamentoCobranca, setErroPagamentoCobranca] = useState<
    Record<number, string>
  >({});

  const campoCancelamentoLancamentoRefs = useRef<
    Record<number, HTMLInputElement | null>
  >({});
  const campoCancelamentoCobrancaRefs = useRef<
    Record<number, HTMLInputElement | null>
  >({});
  const campoPagamentoCobrancaRefs = useRef<
    Record<number, HTMLInputElement | null>
  >({});
  const campoPagamentoCobrancaAgendaRefs = useRef<
    Record<number, HTMLInputElement | null>
  >({});

  const [categoriaForm, setCategoriaForm] = useState({
    nome: "",
    tipo: "RECEITA" as TipoCategoriaFinanceiraAdmin,
    descricao: "",
  });

  const [lancamentoForm, setLancamentoForm] = useState({
    categoriaId: "",
    tipo: "RECEITA" as TipoLancamentoFinanceiroAdmin,
    descricao: "",
    valor: "",
    competenciaEm: "",
    vencimentoEm: "",
    observacoes: "",
  });

  const [cobrancaForm, setCobrancaForm] = useState({
    unidadeId: "",
    moradorId: "",
    categoriaId: "",
    descricao: "",
    valor: "",
    competenciaEm: "",
    vencimentoEm: "",
    observacoes: "",
  });

  const [editandoLancamentoId, setEditandoLancamentoId] = useState<
    number | null
  >(null);
  const [salvandoEdicaoLancamento, setSalvandoEdicaoLancamento] =
    useState(false);

  const [edicaoLancamentoForm, setEdicaoLancamentoForm] = useState({
    categoriaId: "",
    tipo: "RECEITA" as TipoLancamentoFinanceiroAdmin,
    descricao: "",
    valor: "",
    competenciaEm: "",
    vencimentoEm: "",
    observacoes: "",
  });

  const [editandoCobrancaId, setEditandoCobrancaId] = useState<number | null>(
    null,
  );
  const [salvandoEdicaoCobranca, setSalvandoEdicaoCobranca] = useState(false);

  const [edicaoCobrancaForm, setEdicaoCobrancaForm] = useState({
    unidadeId: "",
    moradorId: "",
    descricao: "",
    valor: "",
    competenciaEm: "",
    vencimentoEm: "",
    observacoes: "",
  });

  const [cobrancasLoteForm, setCobrancasLoteForm] = useState({
    categoriaId: "",
    descricao: "",
    valor: "",
    competenciaEm: "",
    vencimentoEm: "",
    observacoes: "",
  });

  const [cancelamentoLancamento, setCancelamentoLancamento] = useState<
    Record<number, string>
  >({});
  const [cancelamentoCobranca, setCancelamentoCobranca] = useState<
    Record<number, string>
  >({});

  const [pagamentoLancamento, setPagamentoLancamento] = useState<
    Record<number, string>
  >({});
  const [pagamentoCobranca, setPagamentoCobranca] = useState<
    Record<number, string>
  >({});

  const [buscaCobranca, setBuscaCobranca] = useState("");
  const [statusFiltroCobranca, setStatusFiltroCobranca] = useState<
    "TODAS" | StatusCobrancaAdmin
  >("TODAS");
  const [somenteCobrancasVencidas, setSomenteCobrancasVencidas] =
    useState(false);
  const [somenteComprovantesPendentes, setSomenteComprovantesPendentes] =
    useState(false);

  const [buscaLancamento, setBuscaLancamento] = useState("");
  const [tipoFiltroLancamento, setTipoFiltroLancamento] = useState<
    "TODOS" | TipoLancamentoFinanceiroAdmin
  >("TODOS");
  const [statusFiltroLancamento, setStatusFiltroLancamento] = useState<
    "TODOS" | StatusFinanceiroAdmin
  >("TODOS");
  const [somenteLancamentosVencidos, setSomenteLancamentosVencidos] =
    useState(false);

  const [buscaInadimplenciaUnidade, setBuscaInadimplenciaUnidade] =
    useState("");
  const [
    quantidadeInadimplenciaUnidadeVisivel,
    setQuantidadeInadimplenciaUnidadeVisivel,
  ] = useState(6);
  const [ordenacaoInadimplenciaUnidade, setOrdenacaoInadimplenciaUnidade] =
    useState<
      | "MAIOR_VALOR"
      | "MENOR_VALOR"
      | "MAIS_TITULOS"
      | "MAIS_ANTIGO"
      | "UNIDADE_AZ"
    >("MAIOR_VALOR");

  const condominioSelecionado =
    condominiosAdministrativos.find(
      (vinculo) => vinculo.condominio.id === condominioId,
    ) ?? null;

  const podeGerirFinanceiro =
    usuario.superAdmin ||
    Boolean(
      condominioSelecionado &&
      papeisFinanceiro.has(condominioSelecionado.papel),
    );

  function aplicarConfiguracoesPagamentoNoFormulario(
    dados: AdminConfiguracoesPagamentoCondominio | null,
  ) {
    setConfiguracoesPagamentoForm({
      pixChave: dados?.pixChave ?? "",
      pixTipo: dados?.pixTipo ?? "",
      beneficiarioPagamento: dados?.beneficiarioPagamento ?? "",
      bancoPagamento: dados?.bancoPagamento ?? "",
      instrucoesPagamento: dados?.instrucoesPagamento ?? "",
      mensagemCobrancaPadrao: dados?.mensagemCobrancaPadrao ?? "",
    });
  }

  function linhasConfiguracoesPagamento() {
    const linhas: string[] = [];

    if (configuracoesPagamento?.mensagemCobrancaPadrao?.trim()) {
      linhas.push(configuracoesPagamento.mensagemCobrancaPadrao.trim());
    }

    if (configuracoesPagamento?.pixChave?.trim()) {
      const tipoPix = configuracoesPagamento.pixTipo
        ? ` (${configuracoesPagamento.pixTipo})`
        : "";
      linhas.push(`Pix${tipoPix}: ${configuracoesPagamento.pixChave.trim()}`);
    }

    if (configuracoesPagamento?.beneficiarioPagamento?.trim()) {
      linhas.push(
        `Beneficiário: ${configuracoesPagamento.beneficiarioPagamento.trim()}`,
      );
    }

    if (configuracoesPagamento?.bancoPagamento?.trim()) {
      linhas.push(`Banco/observação: ${configuracoesPagamento.bancoPagamento.trim()}`);
    }

    if (configuracoesPagamento?.instrucoesPagamento?.trim()) {
      linhas.push(configuracoesPagamento.instrucoesPagamento.trim());
    }

    return linhas;
  }

  const categoriasLancamentoCompativeis = categorias.filter((categoria) => {
    if (!categoria.ativo) {
      return false;
    }

    if (categoria.tipo === "AMBOS") {
      return true;
    }

    return categoria.tipo === lancamentoForm.tipo;
  });

  const categoriasReceita = categorias.filter(
    (categoria) =>
      categoria.ativo &&
      (categoria.tipo === "RECEITA" || categoria.tipo === "AMBOS"),
  );

  const totaisResumo = useMemo(() => {
    const gruposFinanceiro = resumoFinanceiro?.grupos ?? [];
    const gruposCobrancas = resumoCobrancas?.grupos ?? [];

    const receitaPrevista = gruposFinanceiro
      .filter(
        (grupo) => grupo.tipo === "RECEITA" && grupo.status !== "CANCELADO",
      )
      .reduce((total, grupo) => total + Number(grupo._sum.valor ?? 0), 0);

    const receitaPaga = gruposFinanceiro
      .filter((grupo) => grupo.tipo === "RECEITA" && grupo.status === "PAGO")
      .reduce((total, grupo) => total + Number(grupo._sum.valor ?? 0), 0);

    const despesaLancada = gruposFinanceiro
      .filter(
        (grupo) => grupo.tipo === "DESPESA" && grupo.status !== "CANCELADO",
      )
      .reduce((total, grupo) => total + Number(grupo._sum.valor ?? 0), 0);

    const despesaPaga = gruposFinanceiro
      .filter((grupo) => grupo.tipo === "DESPESA" && grupo.status === "PAGO")
      .reduce((total, grupo) => total + Number(grupo._sum.valor ?? 0), 0);

    const cobrancasPendentes = gruposCobrancas
      .filter((grupo) => grupo.status === "PENDENTE")
      .reduce((total, grupo) => total + Number(grupo._sum.valor ?? 0), 0);

    const cobrancasPagas = gruposCobrancas
      .filter((grupo) => grupo.status === "PAGO")
      .reduce((total, grupo) => total + Number(grupo._sum.valor ?? 0), 0);

    const vencidasPendentes = Number(
      resumoCobrancas?.vencidasPendentes._sum.valor ?? 0,
    );

    const quantidadeVencidas =
      resumoCobrancas?.vencidasPendentes._count._all ?? 0;

    const baseCobrancasValidas = cobrancasPendentes + cobrancasPagas;

    const taxaInadimplenciaPeriodo =
      baseCobrancasValidas > 0
        ? (vencidasPendentes / baseCobrancasValidas) * 100
        : 0;

    return {
      receitaPrevista,
      receitaPaga,
      despesaLancada,
      despesaPaga,
      saldoPrevisto: receitaPrevista - despesaLancada,
      saldoPago: receitaPaga - despesaPaga,
      cobrancasPendentes,
      cobrancasPagas,
      vencidasPendentes,
      quantidadeVencidas,
      taxaInadimplenciaPeriodo,
    };
  }, [resumoCobrancas, resumoFinanceiro]);

  const cobrancasVencidasEmAberto = useMemo(
    () =>
      [...cobrancas]
        .filter(cobrancaAdministrativaEstaVencida)
        .sort(
          (a, b) =>
            new Date(a.vencimentoEm).getTime() -
            new Date(b.vencimentoEm).getTime(),
        ),
    [cobrancas],
  );

  const cobrancasVencidasDestaque = cobrancasVencidasEmAberto.slice(0, 5);

  const inadimplenciaPorUnidade = useMemo(() => {
    const unidadesEmAtraso = new Map<
      number,
      {
        unidadeId: number;
        identificador: string;
        numero: string;
        moradores: Set<string>;
        quantidadeTitulos: number;
        valorTotal: number;
        vencimentoMaisAntigo: string;
      }
    >();

    cobrancasVencidasEmAberto.forEach((cobranca) => {
      const existente = unidadesEmAtraso.get(cobranca.unidade.id);
      const valor = Number(cobranca.valor ?? 0);

      if (!existente) {
        unidadesEmAtraso.set(cobranca.unidade.id, {
          unidadeId: cobranca.unidade.id,
          identificador: cobranca.unidade.identificador,
          numero: cobranca.unidade.numero,
          moradores: new Set(
            cobranca.morador?.nome ? [cobranca.morador.nome] : [],
          ),
          quantidadeTitulos: 1,
          valorTotal: valor,
          vencimentoMaisAntigo: cobranca.vencimentoEm,
        });

        return;
      }

      existente.quantidadeTitulos += 1;
      existente.valorTotal += valor;

      if (cobranca.morador?.nome) {
        existente.moradores.add(cobranca.morador.nome);
      }

      if (
        new Date(cobranca.vencimentoEm).getTime() <
        new Date(existente.vencimentoMaisAntigo).getTime()
      ) {
        existente.vencimentoMaisAntigo = cobranca.vencimentoEm;
      }
    });

    return [...unidadesEmAtraso.values()]
      .map((item) => ({
        ...item,
        moradores: [...item.moradores],
      }))
      .sort((a, b) => {
        if (b.valorTotal !== a.valorTotal) {
          return b.valorTotal - a.valorTotal;
        }

        return (
          new Date(a.vencimentoMaisAntigo).getTime() -
          new Date(b.vencimentoMaisAntigo).getTime()
        );
      });
  }, [cobrancasVencidasEmAberto]);

  const inadimplenciaPorUnidadeFiltrada = useMemo(() => {
    const busca = buscaInadimplenciaUnidade.trim().toLocaleLowerCase("pt-BR");

    const listaBase = busca
      ? inadimplenciaPorUnidade.filter((item) => {
          const textoBusca = [
            item.identificador,
            item.numero,
            ...item.moradores,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("pt-BR");

          return textoBusca.includes(busca);
        })
      : inadimplenciaPorUnidade;

    return [...listaBase].sort((a, b) => {
      const valorA = Number(a.valorTotal || 0);
      const valorB = Number(b.valorTotal || 0);
      const titulosA = Number(a.quantidadeTitulos || 0);
      const titulosB = Number(b.quantidadeTitulos || 0);
      const vencimentoA = new Date(a.vencimentoMaisAntigo).getTime();
      const vencimentoB = new Date(b.vencimentoMaisAntigo).getTime();

      switch (ordenacaoInadimplenciaUnidade) {
        case "MENOR_VALOR":
          return valorA - valorB;

        case "MAIS_TITULOS":
          if (titulosB !== titulosA) {
            return titulosB - titulosA;
          }

          return valorB - valorA;

        case "MAIS_ANTIGO":
          return vencimentoA - vencimentoB;

        case "UNIDADE_AZ":
          return a.identificador.localeCompare(b.identificador, "pt-BR");

        case "MAIOR_VALOR":
        default:
          if (valorB !== valorA) {
            return valorB - valorA;
          }

          return vencimentoA - vencimentoB;
      }
    });
  }, [
    buscaInadimplenciaUnidade,
    inadimplenciaPorUnidade,
    ordenacaoInadimplenciaUnidade,
  ]);

  const inadimplenciaPorUnidadeDestaque = inadimplenciaPorUnidadeFiltrada.slice(
    0,
    quantidadeInadimplenciaUnidadeVisivel,
  );

  const temMaisInadimplenciaPorUnidade =
    inadimplenciaPorUnidadeFiltrada.length >
    inadimplenciaPorUnidadeDestaque.length;

  const categoriasResumoReceitas = useMemo(
    () =>
      (resumoFinanceiro?.categorias ?? [])
        .filter((categoria) => categoria.tipo === "RECEITA")
        .slice(0, 6),
    [resumoFinanceiro],
  );

  const categoriasResumoDespesas = useMemo(
    () =>
      (resumoFinanceiro?.categorias ?? [])
        .filter((categoria) => categoria.tipo === "DESPESA")
        .slice(0, 6),
    [resumoFinanceiro],
  );

  const cobrancasAgendaVencimentos = useMemo(
    () =>
      [...cobrancas]
        .filter((cobranca) => cobranca.status === "PENDENTE")
        .sort(
          (a, b) =>
            new Date(a.vencimentoEm).getTime() -
            new Date(b.vencimentoEm).getTime(),
        )
        .slice(0, 6),
    [cobrancas],
  );

  const despesasAgendaVencimentos = useMemo(
    () =>
      [...lancamentos]
        .filter(
          (lancamento) =>
            lancamento.tipo === "DESPESA" &&
            lancamento.status === "PENDENTE" &&
            Boolean(lancamento.vencimentoEm),
        )
        .sort(
          (a, b) =>
            new Date(a.vencimentoEm ?? "").getTime() -
            new Date(b.vencimentoEm ?? "").getTime(),
        )
        .slice(0, 6),
    [lancamentos],
  );

  const totalComprovantesPendentesAnalise = useMemo(
    () =>
      cobrancas.filter(
        (cobranca) =>
          cobranca.comprovanteStatus === "ENVIADO" &&
          cobranca.status === "PENDENTE",
      ).length,
    [cobrancas],
  );

  const cobrancasFiltradas = useMemo(() => {
    const busca = buscaCobranca.trim().toLocaleLowerCase("pt-BR");

    return cobrancas.filter((cobranca) => {
      const correspondeStatus =
        statusFiltroCobranca === "TODAS" ||
        cobranca.status === statusFiltroCobranca;

      const correspondeVencimento =
        !somenteCobrancasVencidas ||
        cobrancaAdministrativaEstaVencida(cobranca);

      const correspondeComprovantePendente =
        !somenteComprovantesPendentes ||
        (cobranca.comprovanteStatus === "ENVIADO" &&
          cobranca.status === "PENDENTE");

      const textoBusca = [
        cobranca.descricao,
        cobranca.unidade.identificador,
        cobranca.unidade.numero,
        cobranca.morador?.nome,
        cobranca.observacoes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      const correspondeBusca = !busca || textoBusca.includes(busca);

      return (
        correspondeStatus &&
        correspondeVencimento &&
        correspondeComprovantePendente &&
        correspondeBusca
      );
    });
  }, [
    buscaCobranca,
    cobrancas,
    somenteCobrancasVencidas,
    somenteComprovantesPendentes,
    statusFiltroCobranca,
  ]);

  const lancamentosFiltrados = useMemo(() => {
    const busca = buscaLancamento.trim().toLocaleLowerCase("pt-BR");

    return lancamentos.filter((lancamento) => {
      const correspondeTipo =
        tipoFiltroLancamento === "TODOS" ||
        lancamento.tipo === tipoFiltroLancamento;

      const correspondeStatus =
        statusFiltroLancamento === "TODOS" ||
        lancamento.status === statusFiltroLancamento;

      const correspondeVencimento =
        !somenteLancamentosVencidos ||
        lancamentoFinanceiroEstaVencido(lancamento);

      const textoBusca = [
        lancamento.descricao,
        lancamento.categoria?.nome,
        lancamento.observacoes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      const correspondeBusca = !busca || textoBusca.includes(busca);

      return (
        correspondeTipo &&
        correspondeStatus &&
        correspondeVencimento &&
        correspondeBusca
      );
    });
  }, [
    buscaLancamento,
    lancamentos,
    somenteLancamentosVencidos,
    statusFiltroLancamento,
    tipoFiltroLancamento,
  ]);

  useEffect(() => {
    let ativo = true;

    async function cxCarregarHistoricoFinanceiro() {
      if (!condominioId) {
        setHistoricosFinanceiros([]);
        return;
      }

      try {
        const resposta = await apiRequest<AdminHistoricoFinanceiro[]>(
          `/condominios/${condominioId}/financeiro/historico`,
        );

        if (ativo) {
          setHistoricosFinanceiros(resposta);
        }
      } catch {
        if (ativo) {
          setHistoricosFinanceiros([]);
        }
      }
    }

    void cxCarregarHistoricoFinanceiro();

    return () => {
      ativo = false;
    };
  }, [condominioId, mensagemSucesso]);

  const resumoHistoricoFinanceiro = useMemo(() => {
    const pagamentos = historicosFinanceiros.filter((historico) =>
      historico.acao.includes("PAGAMENTO"),
    ).length;

    const cancelamentos = historicosFinanceiros.filter((historico) =>
      historico.acao.includes("CANCELAMENTO"),
    ).length;

    const estornos = historicosFinanceiros.filter((historico) =>
      historico.acao.includes("ESTORNO"),
    ).length;

    const ultimoRegistro = historicosFinanceiros[0]?.criadoEm ?? null;

    return {
      total: historicosFinanceiros.length,
      pagamentos,
      cancelamentos,
      estornos,
      ultimoRegistro,
    };
  }, [historicosFinanceiros]);

  const historicosFinanceirosFiltrados = useMemo(() => {
    const termo = buscaHistoricoFinanceiro.trim().toLocaleLowerCase("pt-BR");
    const inicioPeriodo = inicioHistoricoFinanceiro
      ? new Date(`${inicioHistoricoFinanceiro}T00:00:00`)
      : null;
    const fimPeriodo = fimHistoricoFinanceiro
      ? new Date(`${fimHistoricoFinanceiro}T23:59:59`)
      : null;

    const filtrados = historicosFinanceiros.filter((historico) => {
      if (
        filtroAcaoHistoricoFinanceiro !== "TODAS" &&
        !historico.acao.includes(filtroAcaoHistoricoFinanceiro)
      ) {
        return false;
      }

      const criadoEm = new Date(historico.criadoEm);

      if (inicioPeriodo && criadoEm < inicioPeriodo) {
        return false;
      }

      if (fimPeriodo && criadoEm > fimPeriodo) {
        return false;
      }

      if (!termo) {
        return true;
      }

      const camposBusca = [
        historico.acao,
        historico.entidade,
        historico.descricao,
        historico.detalhes ?? "",
        historico.usuario?.nome ?? "",
        historico.usuario?.email ?? "",
        historico.lancamentoFinanceiro?.descricao ?? "",
        historico.cobrancaCondominial?.descricao ?? "",
        historico.cobrancaCondominial?.unidade?.identificador ?? "",
        historico.cobrancaCondominial?.unidade?.numero ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return camposBusca.includes(termo);
    });

    return [...filtrados].sort((a, b) => {
      const dataA = new Date(a.criadoEm).getTime();
      const dataB = new Date(b.criadoEm).getTime();

      return ordenacaoHistoricoFinanceiro === "RECENTES"
        ? dataB - dataA
        : dataA - dataB;
    });
  }, [
    buscaHistoricoFinanceiro,
    fimHistoricoFinanceiro,
    filtroAcaoHistoricoFinanceiro,
    historicosFinanceiros,
    inicioHistoricoFinanceiro,
    ordenacaoHistoricoFinanceiro,
  ]);

  const historicosFinanceirosVisiveis = historicosFinanceirosFiltrados.slice(
    0,
    quantidadeHistoricoFinanceiroVisivel,
  );

  const temMaisHistoricoFinanceiro =
    historicosFinanceirosFiltrados.length >
    historicosFinanceirosVisiveis.length;

  useEffect(() => {
    setQuantidadeHistoricoFinanceiroVisivel(10);
  }, [
    buscaHistoricoFinanceiro,
    fimHistoricoFinanceiro,
    filtroAcaoHistoricoFinanceiro,
    inicioHistoricoFinanceiro,
    ordenacaoHistoricoFinanceiro,
  ]);

  function aplicarFiltroResumoHistoricoFinanceiro(
    filtro: "TODAS" | "PAGAMENTO" | "CANCELAMENTO" | "ESTORNO",
  ) {
    setFiltroAcaoHistoricoFinanceiro(filtro);
  }

  useEffect(() => {
    setQuantidadeInadimplenciaUnidadeVisivel(6);
  }, [buscaInadimplenciaUnidade, ordenacaoInadimplenciaUnidade]);

  const resumoInadimplenciaPorUnidade = useMemo(() => {
    const totalUnidades = inadimplenciaPorUnidadeFiltrada.length;

    const totalTitulos = inadimplenciaPorUnidadeFiltrada.reduce(
      (total, item) => total + Number(item.quantidadeTitulos || 0),
      0,
    );

    const valorTotal = inadimplenciaPorUnidadeFiltrada.reduce(
      (total, item) => total + Number(item.valorTotal || 0),
      0,
    );

    const vencimentos = inadimplenciaPorUnidadeFiltrada
      .map((item) => item.vencimentoMaisAntigo)
      .filter(Boolean)
      .map((data) => new Date(data).getTime())
      .filter((data) => Number.isFinite(data));

    const vencimentoMaisAntigo =
      vencimentos.length > 0
        ? new Date(Math.min(...vencimentos)).toISOString()
        : null;

    const mediaPorUnidade = totalUnidades > 0 ? valorTotal / totalUnidades : 0;

    return {
      totalUnidades,
      totalTitulos,
      valorTotal,
      vencimentoMaisAntigo,
      mediaPorUnidade,
    };
  }, [inadimplenciaPorUnidadeFiltrada]);

  function rotuloOrdenacaoInadimplenciaUnidade(
    ordenacao:
      | "MAIOR_VALOR"
      | "MENOR_VALOR"
      | "MAIS_TITULOS"
      | "MAIS_ANTIGO"
      | "UNIDADE_AZ",
  ) {
    switch (ordenacao) {
      case "MENOR_VALOR":
        return "Menor valor vencido";
      case "MAIS_TITULOS":
        return "Mais títulos";
      case "MAIS_ANTIGO":
        return "Vencimento mais antigo";
      case "UNIDADE_AZ":
        return "Unidade A-Z";
      case "MAIOR_VALOR":
      default:
        return "Maior valor vencido";
    }
  }

  function aplicarOrdenacaoResumoInadimplencia(
    ordenacao:
      | "MAIOR_VALOR"
      | "MENOR_VALOR"
      | "MAIS_TITULOS"
      | "MAIS_ANTIGO"
      | "UNIDADE_AZ",
  ) {
    setOrdenacaoInadimplenciaUnidade(ordenacao);
    setQuantidadeInadimplenciaUnidadeVisivel(6);
  }

  async function copiarResumoInadimplenciaUnidade(
    item: (typeof inadimplenciaPorUnidade)[number],
  ) {
    const moradores =
      item.moradores.length > 0 ? item.moradores.join(", ") : "Não vinculado";

    const resumo = [
      "Resumo de inadimplência",
      "",
      `Unidade: ${item.identificador}`,
      `Morador(es): ${moradores}`,
      `Títulos vencidos: ${item.quantidadeTitulos}`,
      `Valor vencido: $<span className="admin-financeiro-valor-nowrap">{formatarMoeda(item.valorTotal)}</span>`,
      `Vencimento mais antigo: ${formatarData(item.vencimentoMaisAntigo)}`,
    ].join("\n");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resumo);
      } else {
        const campoTemporario = document.createElement("textarea");
        campoTemporario.value = resumo;
        campoTemporario.setAttribute("readonly", "true");
        campoTemporario.style.position = "fixed";
        campoTemporario.style.opacity = "0";

        document.body.appendChild(campoTemporario);
        campoTemporario.select();
        document.execCommand("copy");
        document.body.removeChild(campoTemporario);
      }

      setMensagemSucesso("Resumo da inadimplência copiado.");
      setErroAcao("");
    } catch {
      setErroAcao("Não foi possível copiar o resumo da inadimplência.");
    }
  }

  function abrirCobrancasDaUnidadeInadimplente(
    identificador: string,
    numero?: string | null,
  ) {
    setBuscaCobranca(identificador || numero || "");
    setStatusFiltroCobranca("PENDENTE");
    setSomenteCobrancasVencidas(true);

    window.setTimeout(() => {
      document.getElementById("cobrancas-cadastradas")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  }

  function telefoneWhatsappNormalizado(valor: string | null | undefined) {
    const digitos = String(valor ?? "").replace(/\D/g, "");

    if (!digitos || digitos.length < 10) {
      return null;
    }

    if (digitos.startsWith("55")) {
      return digitos;
    }

    if (digitos.length === 10 || digitos.length === 11) {
      return `55${digitos}`;
    }

    return digitos;
  }

  async function copiarTextoFinanceiro(
    conteudo: string,
    mensagem: string,
    erro = "Não foi possível copiar o texto.",
  ) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(conteudo);
      } else {
        const campoTemporario = document.createElement("textarea");
        campoTemporario.value = conteudo;
        campoTemporario.setAttribute("readonly", "true");
        campoTemporario.style.position = "fixed";
        campoTemporario.style.opacity = "0";

        document.body.appendChild(campoTemporario);
        campoTemporario.select();
        document.execCommand("copy");
        document.body.removeChild(campoTemporario);
      }

      setMensagemSucesso(mensagem);
      setErroAcao("");
    } catch {
      setErroAcao(erro);
    }
  }

  function montarMensagemCobrancaWhatsapp(cobranca: AdminCobrancaCondominial) {
    const nomeCondominio =
      condominioSelecionado?.condominio.nome ?? "Condominaria Express";
    const nomeMorador = cobranca.morador?.nome ?? "morador(a)";
    const situacao = cobrancaAdministrativaEstaVencida(cobranca)
      ? "VENCIDA"
      : "PENDENTE";

    return [
      `Olá, ${nomeMorador}.`,
      "",
      `Identificamos uma cobrança ${situacao.toLocaleLowerCase(
        "pt-BR",
      )} no ${nomeCondominio}.`,
      "",
      `Unidade: ${cobranca.unidade.identificador}`,
      `Cobrança: ${cobranca.descricao}`,
      `Valor: $<span className="admin-financeiro-valor-nowrap">{formatarMoeda(cobranca.valor)}</span>`,
      `Competência: ${formatarData(cobranca.competenciaEm)}`,
      `Vencimento: ${formatarData(cobranca.vencimentoEm)}`,
      `Situação: ${situacao}`,
      "",
      ...linhasConfiguracoesPagamento(),
      "",
      ...linhasConfiguracoesPagamento(),
      "",
      "Por favor, regularize o pagamento ou envie o comprovante para baixa.",
      "Em caso de dúvidas, responda esta mensagem.",
    ].join("\n");
  }

  async function copiarMensagemCobrancaWhatsapp(
    cobranca: AdminCobrancaCondominial,
  ) {
    await copiarTextoFinanceiro(
      montarMensagemCobrancaWhatsapp(cobranca),
      "Mensagem da cobrança copiada.",
      "Não foi possível copiar a mensagem da cobrança.",
    );
  }

  function abrirWhatsappCobranca(cobranca: AdminCobrancaCondominial) {
    const telefone = telefoneWhatsappNormalizado(cobranca.morador?.telefone);

    if (!telefone) {
      setErroAcao("O morador desta cobrança não possui telefone válido cadastrado.");
      return;
    }

    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(
      montarMensagemCobrancaWhatsapp(cobranca),
    )}`;

    abrirUrlExternaSegura(url);
  }

  function cobrancasVencidasDaUnidadeInadimplente(
    item: (typeof inadimplenciaPorUnidade)[number],
  ) {
    return cobrancas.filter(
      (cobranca) =>
        cobranca.status === "PENDENTE" &&
        cobranca.unidade.id === item.unidadeId &&
        cobrancaAdministrativaEstaVencida(cobranca),
    );
  }

  function telefoneWhatsappInadimplenciaUnidade(
    item: (typeof inadimplenciaPorUnidade)[number],
  ) {
    const cobrancaComTelefone = cobrancasVencidasDaUnidadeInadimplente(
      item,
    ).find((cobranca) =>
      Boolean(telefoneWhatsappNormalizado(cobranca.morador?.telefone)),
    );

    return telefoneWhatsappNormalizado(cobrancaComTelefone?.morador?.telefone);
  }

  function montarMensagemInadimplenciaUnidadeWhatsapp(
    item: (typeof inadimplenciaPorUnidade)[number],
  ) {
    const nomeCondominio =
      condominioSelecionado?.condominio.nome ?? "Condominaria Express";
    const moradores =
      item.moradores.length > 0 ? item.moradores.join(", ") : "Não vinculado";
    const cobrancasVencidas = cobrancasVencidasDaUnidadeInadimplente(item);

    const linhasCobrancas = cobrancasVencidas.length
      ? cobrancasVencidas.map(
          (cobranca) =>
            `- ${cobranca.descricao}: ${formatarMoeda(
              cobranca.valor,
            )} | venc. ${formatarData(cobranca.vencimentoEm)}`,
        )
      : ["- Consulte a administração para a relação detalhada dos títulos."];

    return [
      "Olá.",
      "",
      `Identificamos títulos vencidos vinculados à unidade ${item.identificador} no ${nomeCondominio}.`,
      "",
      `Morador(es): ${moradores}`,
      `Quantidade de títulos vencidos: ${item.quantidadeTitulos}`,
      `Valor total vencido: $<span className="admin-financeiro-valor-nowrap">{formatarMoeda(item.valorTotal)}</span>`,
      `Vencimento mais antigo: ${formatarData(item.vencimentoMaisAntigo)}`,
      "",
      "Títulos vencidos:",
      ...linhasCobrancas,
      "",
      "Por favor, regularize o pagamento ou envie o comprovante para baixa.",
      "Em caso de dúvidas, responda esta mensagem.",
    ].join("\n");
  }

  async function copiarMensagemInadimplenciaUnidadeWhatsapp(
    item: (typeof inadimplenciaPorUnidade)[number],
  ) {
    await copiarTextoFinanceiro(
      montarMensagemInadimplenciaUnidadeWhatsapp(item),
      "Mensagem de cobrança da unidade copiada.",
      "Não foi possível copiar a mensagem de cobrança da unidade.",
    );
  }

  function abrirWhatsappInadimplenciaUnidade(
    item: (typeof inadimplenciaPorUnidade)[number],
  ) {
    const telefone = telefoneWhatsappInadimplenciaUnidade(item);

    if (!telefone) {
      setErroAcao(
        "Não há telefone válido em cobranças vencidas vinculadas a esta unidade.",
      );
      return;
    }

    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(
      montarMensagemInadimplenciaUnidadeWhatsapp(item),
    )}`;

    abrirUrlExternaSegura(url);
  }

  function imprimirReciboCobranca(cobranca: AdminCobrancaCondominial) {
    if (cobranca.status !== "PAGO") {
      setErroAcao("Apenas cobranças pagas podem gerar recibo.");
      return;
    }

    const escaparHtml = (valor: string | number | null | undefined) =>
      String(valor ?? "").replace(/[&<>"']/g, (caractere) => {
        const mapa: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        };

        return mapa[caractere] ?? caractere;
      });

    const nomeCondominio =
      condominioSelecionado?.condominio.nome ?? "Condominaria Express";
    const nomeMorador = cobranca.morador?.nome ?? "Não informado";
    const telefoneMorador = cobranca.morador?.telefone ?? "Não informado";
    const emailMorador = cobranca.morador?.email ?? "Não informado";
    const responsavelBaixa = cobranca.pagoPorUsuario?.nome ?? "Não informado";
    const dataPagamento = cobranca.pagoEm ?? cobranca.atualizadoEm;
    const categoria =
      cobranca.lancamentoFinanceiro?.categoria?.nome ?? "Cobrança condominial";

    const janela = abrirJanelaImpressaoSegura();

    if (!janela) {
      setErroAcao("Não foi possível abrir a janela do recibo.");
      return;
    }

    janela.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Recibo de pagamento - Cobrança #${escaparHtml(cobranca.id)}</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 32px;
              background: #f8fafc;
              color: #0f172a;
              font-family: Arial, sans-serif;
            }

            .recibo {
              max-width: 820px;
              margin: 0 auto;
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 28px;
              overflow: hidden;
              box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
            }

            header {
              background: linear-gradient(135deg, #f97316, #fb923c);
              color: #ffffff;
              padding: 28px 32px;
            }

            .marca {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.18em;
              opacity: 0.9;
              text-transform: uppercase;
            }

            h1 {
              margin: 10px 0 0;
              font-size: 30px;
            }

            .subtitulo {
              margin: 8px 0 0;
              font-size: 14px;
              opacity: 0.92;
            }

            main {
              padding: 28px 32px 32px;
            }

            .status {
              align-items: center;
              background: #ecfdf5;
              border: 1px solid #a7f3d0;
              border-radius: 18px;
              color: #065f46;
              display: flex;
              justify-content: space-between;
              gap: 16px;
              margin-bottom: 22px;
              padding: 14px 16px;
            }

            .status strong {
              font-size: 15px;
            }

            .valor {
              color: #065f46;
              font-size: 24px;
              font-weight: 700;
              white-space: nowrap;
            }

            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 14px;
            }

            .box {
              border: 1px solid #e2e8f0;
              border-radius: 18px;
              padding: 14px;
            }

            .box.full {
              grid-column: 1 / -1;
            }

            .label {
              color: #64748b;
              display: block;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.1em;
              margin-bottom: 6px;
              text-transform: uppercase;
            }

            .conteudo {
              color: #0f172a;
              font-size: 14px;
              font-weight: 700;
              line-height: 1.5;
            }

            .muted {
              color: #475569;
              font-size: 12px;
              font-weight: 600;
              line-height: 1.6;
              margin-top: 4px;
            }

            .assinatura {
              border-top: 1px dashed #cbd5e1;
              margin-top: 30px;
              padding-top: 22px;
              text-align: center;
            }

            .linha-assinatura {
              border-top: 1px solid #64748b;
              margin: 34px auto 8px;
              max-width: 360px;
            }

            footer {
              background: #f8fafc;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 11px;
              line-height: 1.6;
              padding: 16px 32px;
              text-align: center;
            }

            @media print {
              body {
                background: #ffffff;
                padding: 0;
              }

              .recibo {
                border: 0;
                border-radius: 0;
                box-shadow: none;
                max-width: none;
              }

              @page {
                margin: 12mm;
              }
            }
          </style>
        </head>
        <body>
          <section class="recibo">
            <header>
              <div class="marca">Condominaria Express</div>
              <h1>Recibo de pagamento</h1>
              <p class="subtitulo">
                ${escaparHtml(nomeCondominio)} · Cobrança #${escaparHtml(cobranca.id)}
              </p>
            </header>

            <main>
              <div class="status">
                <div>
                  <strong>Pagamento confirmado</strong>
                  <div class="muted">
                    Baixa registrada em ${escaparHtml(formatarData(dataPagamento))}
                  </div>
                </div>
                <div class="valor">${escaparHtml(formatarMoeda(cobranca.valor))}</div>
              </div>

              <div class="grid">
                <div class="box full">
                  <span class="label">Descrição</span>
                  <div class="conteudo">${escaparHtml(cobranca.descricao)}</div>
                  <div class="muted">Categoria: ${escaparHtml(categoria)}</div>
                </div>

                <div class="box">
                  <span class="label">Condomínio</span>
                  <div class="conteudo">${escaparHtml(nomeCondominio)}</div>
                </div>

                <div class="box">
                  <span class="label">Unidade</span>
                  <div class="conteudo">${escaparHtml(cobranca.unidade.identificador)}</div>
                  <div class="muted">Número: ${escaparHtml(cobranca.unidade.numero)}</div>
                </div>

                <div class="box">
                  <span class="label">Morador</span>
                  <div class="conteudo">${escaparHtml(nomeMorador)}</div>
                  <div class="muted">
                    Telefone: ${escaparHtml(telefoneMorador)}<br />
                    E-mail: ${escaparHtml(emailMorador)}
                  </div>
                </div>

                <div class="box">
                  <span class="label">Competência e vencimento</span>
                  <div class="conteudo">
                    Competência: ${escaparHtml(formatarData(cobranca.competenciaEm))}
                  </div>
                  <div class="muted">
                    Vencimento: ${escaparHtml(formatarData(cobranca.vencimentoEm))}
                  </div>
                </div>

                <div class="box">
                  <span class="label">Data do pagamento</span>
                  <div class="conteudo">${escaparHtml(formatarData(dataPagamento))}</div>
                </div>

                <div class="box">
                  <span class="label">Responsável pela baixa</span>
                  <div class="conteudo">${escaparHtml(responsavelBaixa)}</div>
                  <div class="muted">
                    ${escaparHtml(cobranca.pagoPorUsuario?.email ?? "E-mail não informado")}
                  </div>
                </div>

                <div class="box full">
                  <span class="label">Observações</span>
                  <div class="conteudo">
                    ${escaparHtml(cobranca.observacoes ?? "Sem observações registradas.")}
                  </div>
                </div>

                <div class="box full">
                  <span class="label">Dados de pagamento do condomínio</span>
                  <div class="conteudo">
                    Beneficiário: ${escaparHtml(configuracoesPagamento?.beneficiarioPagamento ?? "Não informado")}<br />
                    Pix: ${escaparHtml(configuracoesPagamento?.pixChave ?? "Não informado")}
                    ${configuracoesPagamento?.pixTipo ? `(${escaparHtml(configuracoesPagamento.pixTipo)})` : ""}
                  </div>
                  <div class="muted">
                    ${escaparHtml(configuracoesPagamento?.bancoPagamento ?? "Banco/observação não informado.")}<br />
                    ${escaparHtml(configuracoesPagamento?.instrucoesPagamento ?? "Sem instruções adicionais registradas.")}
                  </div>
                </div>
              </div>

              <div class="assinatura">
                <p class="muted">
                  Este recibo confirma a baixa da cobrança no sistema administrativo do condomínio.
                </p>
                <div class="linha-assinatura"></div>
                <strong>${escaparHtml(nomeCondominio)}</strong>
              </div>
            </main>

            <footer>
              Documento gerado em ${escaparHtml(formatarDataHora(new Date().toISOString()))}.<br />
              Controle interno: cobrança #${escaparHtml(cobranca.id)}.
            </footer>
          </section>
        </body>
      </html>
    `);

    janela.document.close();
    janela.focus();

    window.setTimeout(() => {
      janela.print();
    }, 300);
  }

  function exportarInadimplenciaPorUnidadeCsv() {
    if (inadimplenciaPorUnidadeFiltrada.length === 0) {
      return;
    }

    const cabecalho = [
      "Unidade",
      "Moradores",
      "Quantidade de títulos",
      "Valor vencido",
      "Vencimento mais antigo",
    ];

    const linhas = inadimplenciaPorUnidadeFiltrada.map((item) => [
      item.identificador,
      item.moradores.length > 0 ? item.moradores.join(", ") : "Não vinculado",
      item.quantidadeTitulos,
      formatarMoeda(item.valorTotal),
      formatarData(item.vencimentoMaisAntigo),
    ]);

    const conteudoCsv = [cabecalho, ...linhas]
      .map((linha) =>
        linha
          .map((campo) => `"${String(campo).replace(/"/g, '""')}"`)
          .join(";"),
      )
      .join("\n");

    const arquivoCsv = new Blob([`\uFEFF${conteudoCsv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(arquivoCsv);
    const link = document.createElement("a");

    link.href = url;
    link.download = `inadimplencia-por-unidade-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function imprimirInadimplenciaPorUnidade() {
    if (inadimplenciaPorUnidadeFiltrada.length === 0) {
      return;
    }

    const escaparHtml = (valor: string | number | null | undefined) =>
      String(valor ?? "").replace(/[&<>"']/g, (caractere) => {
        const mapa: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        };

        return mapa[caractere] ?? caractere;
      });

    const linhas = inadimplenciaPorUnidadeFiltrada
      .map(
        (item) => `
          <tr>
            <td>${escaparHtml(item.identificador)}</td>
            <td>${escaparHtml(
              item.moradores.length > 0
                ? item.moradores.join(", ")
                : "Não vinculado",
            )}</td>
            <td>${escaparHtml(item.quantidadeTitulos)}</td>
            <td>${escaparHtml(formatarMoeda(item.valorTotal))}</td>
            <td>${escaparHtml(formatarData(item.vencimentoMaisAntigo))}</td>
          </tr>
        `,
      )
      .join("");

    const totalVencido = inadimplenciaPorUnidadeFiltrada.reduce(
      (total, item) => total + Number(item.valorTotal),
      0,
    );

    const totalTitulos = inadimplenciaPorUnidadeFiltrada.reduce(
      (total, item) => total + Number(item.quantidadeTitulos),
      0,
    );

    const janela = abrirJanelaImpressaoSegura();

    if (!janela) {
      setErroAcao("Não foi possível abrir a janela de impressão.");
      return;
    }

    janela.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Inadimplência por unidade</title>
          <style>
            * { box-sizing: border-box; }

            body {
              margin: 0;
              padding: 32px;
              background: #ffffff;
              color: #0f172a;
              font-family: Arial, sans-serif;
            }

            header {
              border-bottom: 2px solid #fb923c;
              margin-bottom: 24px;
              padding-bottom: 16px;
            }

            .marca {
              color: #f97316;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.18em;
              text-transform: uppercase;
            }

            h1 {
              margin: 8px 0 0;
              font-size: 26px;
            }

            .resumo {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
              margin: 18px 0 24px;
            }

            .resumo div {
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 12px;
            }

            .resumo small {
              display: block;
              color: #64748b;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
            }

            .resumo strong {
              display: block;
              margin-top: 6px;
              font-size: 18px;
            }

            table {
              border-collapse: collapse;
              width: 100%;
            }

            th,
            td {
              border-bottom: 1px solid #e2e8f0;
              font-size: 13px;
              padding: 10px;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #fff7ed;
              color: #9a3412;
              font-size: 11px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
            }

            tr {
              break-inside: avoid;
            }

            @media print {
              body { padding: 18px; }
            }
          </style>
        </head>
        <body>
          <header>
            <div class="marca">Condominaria Express</div>
            <h1>Inadimplência por unidade</h1>
            <p>Relatório gerado em ${escaparHtml(formatarDataHora(new Date().toISOString()))}</p>
            <p>Busca aplicada: ${escaparHtml(buscaInadimplenciaUnidade || "Nenhuma")}</p>
          </header>

          <section class="resumo">
            <div>
              <small>Unidades listadas</small>
              <strong>${inadimplenciaPorUnidadeFiltrada.length}</strong>
            </div>
            <div>
              <small>Títulos vencidos</small>
              <strong>${totalTitulos}</strong>
            </div>
            <div>
              <small>Valor vencido</small>
              <strong>${escaparHtml(formatarMoeda(totalVencido))}</strong>
            </div>
          </section>

          <table>
            <thead>
              <tr>
                <th>Unidade</th>
                <th>Moradores</th>
                <th>Títulos</th>
                <th>Valor vencido</th>
                <th>Mais antigo</th>
              </tr>
            </thead>
            <tbody>
              ${linhas}
            </tbody>
          </table>
        </body>
      </html>
    `);

    janela.document.close();
    janela.focus();

    window.setTimeout(() => {
      janela.print();
    }, 300);
  }

  function imprimirHistoricoFinanceiro() {
    if (historicosFinanceirosFiltrados.length === 0) {
      return;
    }

    const escaparHtml = (valor: string | number | null | undefined) =>
      String(valor ?? "").replace(/[&<>"']/g, (caractere) => {
        const mapa: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        };

        return mapa[caractere] ?? caractere;
      });

    const linhas = historicosFinanceirosFiltrados
      .map((historico) => {
        const lancamento = historico.lancamentoFinanceiro
          ? `
            <div class="vinculo">
              <strong>Lançamento:</strong>
              ${escaparHtml(historico.lancamentoFinanceiro.descricao)}
              <br />
              <span>
                ${escaparHtml(formatarMoeda(historico.lancamentoFinanceiro.valor))}
                · ${escaparHtml(rotuloStatusFinanceiro(historico.lancamentoFinanceiro.status))}
              </span>
            </div>
          `
          : "";

        const cobranca = historico.cobrancaCondominial
          ? `
            <div class="vinculo">
              <strong>Cobrança:</strong>
              ${escaparHtml(historico.cobrancaCondominial.descricao)}
              <br />
              <span>
                Unidade ${escaparHtml(historico.cobrancaCondominial.unidade.identificador)}
                · ${escaparHtml(formatarMoeda(historico.cobrancaCondominial.valor))}
                · ${escaparHtml(rotuloStatusCobranca(historico.cobrancaCondominial.status))}
              </span>
            </div>
          `
          : "";

        return `
          <article class="registro">
            <div class="topo">
              <span class="acao">${escaparHtml(rotuloAcaoHistoricoFinanceiro(historico.acao))}</span>
              <strong>${escaparHtml(formatarDataHora(historico.criadoEm))}</strong>
            </div>

            <h2>${escaparHtml(historico.descricao)}</h2>

            <p>
              <strong>Usuário:</strong>
              ${escaparHtml(historico.usuario?.nome ?? "Não informado")}
              ${historico.usuario?.email ? `<br /><small>${escaparHtml(historico.usuario.email)}</small>` : ""}
            </p>

            <div class="vinculos">
              ${lancamento}
              ${cobranca}
            </div>

            ${historico.detalhes ? `<p class="detalhes"><strong>Detalhes:</strong> ${escaparHtml(historico.detalhes)}</p>` : ""}
          </article>
        `;
      })
      .join("");

    const janela = abrirJanelaImpressaoSegura();

    if (!janela) {
      setErroAcao("Não foi possível abrir a janela de impressão.");
      return;
    }

    janela.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Histórico financeiro</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 32px;
              background: #ffffff;
              color: #0f172a;
              font-family: Arial, sans-serif;
            }

            header {
              border-bottom: 2px solid #fb923c;
              margin-bottom: 24px;
              padding-bottom: 16px;
            }

            .marca {
              color: #f97316;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.18em;
              text-transform: uppercase;
            }

            h1 {
              margin: 8px 0 0;
              font-size: 26px;
            }

            .resumo {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
              margin: 18px 0 24px;
            }

            .resumo div {
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 12px;
            }

            .resumo small {
              display: block;
              color: #64748b;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
            }

            .resumo strong {
              display: block;
              margin-top: 6px;
              font-size: 18px;
            }

            .registro {
              break-inside: avoid;
              border: 1px solid #e2e8f0;
              border-radius: 18px;
              margin-bottom: 14px;
              padding: 16px;
            }

            .topo {
              align-items: center;
              display: flex;
              justify-content: space-between;
              gap: 12px;
            }

            .acao {
              background: #ffedd5;
              border-radius: 999px;
              color: #9a3412;
              display: inline-block;
              font-size: 11px;
              font-weight: 700;
              padding: 6px 10px;
            }

            h2 {
              margin: 12px 0 8px;
              font-size: 16px;
            }

            p {
              color: #334155;
              font-size: 13px;
              line-height: 1.6;
              margin: 8px 0;
            }

            small {
              color: #64748b;
            }

            .vinculos {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
              margin-top: 12px;
            }

            .vinculo {
              background: #f8fafc;
              border-radius: 14px;
              padding: 12px;
              font-size: 13px;
              line-height: 1.6;
            }

            .detalhes {
              background: #fff7ed;
              border-radius: 14px;
              padding: 10px 12px;
            }

            @media print {
              body {
                padding: 18px;
              }

              .registro {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <header>
            <div class="marca">Condominaria Express</div>
            <h1>Histórico financeiro</h1>
            <p>Relatório gerado em ${escaparHtml(formatarDataHora(new Date().toISOString()))}</p>
          </header>

          <section class="resumo">
            <div>
              <small>Total impresso</small>
              <strong>${historicosFinanceirosFiltrados.length}</strong>
            </div>
            <div>
              <small>Filtro de ação</small>
              <strong>${escaparHtml(filtroAcaoHistoricoFinanceiro)}</strong>
            </div>
            <div>
              <small>Data inicial</small>
              <strong>${escaparHtml(inicioHistoricoFinanceiro || "—")}</strong>
            </div>
            <div>
              <small>Data final</small>
              <strong>${escaparHtml(fimHistoricoFinanceiro || "—")}</strong>
            </div>
          </section>

          <main>
            ${linhas}
          </main>
        </body>
      </html>
    `);

    janela.document.close();
    janela.focus();

    window.setTimeout(() => {
      janela.print();
    }, 300);
  }

  function exportarHistoricoFinanceiroCsv() {
    if (historicosFinanceirosFiltrados.length === 0) {
      return;
    }

    const cabecalho = [
      "Data/hora",
      "Ação",
      "Entidade",
      "Descrição",
      "Detalhes",
      "Usuário",
      "E-mail do usuário",
      "Lançamento",
      "Status do lançamento",
      "Valor do lançamento",
      "Cobrança",
      "Status da cobrança",
      "Valor da cobrança",
      "Unidade",
    ];

    const linhas = historicosFinanceirosFiltrados.map((historico) => [
      formatarDataHora(historico.criadoEm),
      rotuloAcaoHistoricoFinanceiro(historico.acao),
      historico.entidade,
      historico.descricao,
      historico.detalhes ?? "",
      historico.usuario?.nome ?? "Não informado",
      historico.usuario?.email ?? "",
      historico.lancamentoFinanceiro?.descricao ?? "",
      historico.lancamentoFinanceiro
        ? rotuloStatusFinanceiro(historico.lancamentoFinanceiro.status)
        : "",
      historico.lancamentoFinanceiro
        ? formatarMoeda(historico.lancamentoFinanceiro.valor)
        : "",
      historico.cobrancaCondominial?.descricao ?? "",
      historico.cobrancaCondominial
        ? rotuloStatusCobranca(historico.cobrancaCondominial.status)
        : "",
      historico.cobrancaCondominial
        ? formatarMoeda(historico.cobrancaCondominial.valor)
        : "",
      historico.cobrancaCondominial?.unidade?.identificador ?? "",
    ]);

    const conteudoCsv = [cabecalho, ...linhas]
      .map((linha) =>
        linha
          .map((campo) => `"${String(campo).replace(/"/g, '""')}"`)
          .join(";"),
      )
      .join("\n");

    const arquivoCsv = new Blob([`\uFEFF${conteudoCsv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(arquivoCsv);
    const link = document.createElement("a");

    link.href = url;
    link.download = `historico-financeiro-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function filtrarCobrancasRecebiveis(
    status: "PENDENTE" | "PAGO",
    somenteVencidas: boolean,
  ) {
    setBuscaCobranca("");
    setStatusFiltroCobranca(status);
    setSomenteCobrancasVencidas(somenteVencidas);

    window.setTimeout(() => {
      document.getElementById("cobrancas-cadastradas")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  function filtrarLancamentosResumo(
    tipo: TipoLancamentoFinanceiroAdmin,
    status: "TODOS" | StatusFinanceiroAdmin,
  ) {
    setBuscaLancamento("");
    setTipoFiltroLancamento(tipo);
    setStatusFiltroLancamento(status);
    setSomenteLancamentosVencidos(false);

    window.setTimeout(() => {
      document.getElementById("lancamentos-cadastrados")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  async function carregarDados(id: number) {
    if (!id) {
      return;
    }

    setCarregando(true);
    setErroCarregamento("");

    try {
      const inicio = dataIsoInicioDoDia(periodoInicio);
      const fim = dataIsoFinalDoDia(periodoFim);

      const [
        categoriasResposta,
        lancamentosResposta,
        cobrancasResposta,
        unidadesResposta,
        moradoresResposta,
        resumoFinanceiroResposta,
        resumoCobrancasResposta,
        configuracoesPagamentoResposta,
      ] = await Promise.all([
        apiRequest<AdminCategoriaFinanceira[]>(
          `/condominios/${id}/financeiro/categorias`,
        ),
        apiRequest<AdminLancamentoFinanceiro[]>(
          `/condominios/${id}/financeiro/lancamentos`,
        ),
        apiRequest<AdminCobrancaCondominial[]>(`/condominios/${id}/cobrancas`),
        apiRequest<AdminUnidade[]>(`/condominios/${id}/unidades`),
        apiRequest<AdminMorador[]>(`/condominios/${id}/moradores`),
        apiRequest<AdminResumoFinanceiro>(
          `/condominios/${id}/financeiro/resumo?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`,
        ),
        apiRequest<AdminResumoCobrancas>(
          `/condominios/${id}/cobrancas/resumo?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`,
        ),
        apiRequest<AdminConfiguracoesPagamentoCondominio>(
          `/condominios/${id}/financeiro/configuracoes-pagamento`,
        ),
      ]);

      setCategorias(categoriasResposta);
      setLancamentos(lancamentosResposta);
      setCobrancas(cobrancasResposta);
      setUnidades(unidadesResposta);
      setMoradores(moradoresResposta);
      setResumoFinanceiro(resumoFinanceiroResposta);
      setResumoCobrancas(resumoCobrancasResposta);
      setConfiguracoesPagamento(configuracoesPagamentoResposta);
      aplicarConfiguracoesPagamentoNoFormulario(configuracoesPagamentoResposta);
    } catch (error) {
      setErroCarregamento(
        obterMensagemErro(
          error,
          "Não foi possível carregar o financeiro administrativo.",
        ),
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarDados(condominioId);
  }, [condominioId]);

  async function atualizarResumo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await carregarDados(condominioId);
  }

  function imprimirRelatorioFinanceiro() {
    if (imprimindoRelatorioFinanceiro) {
      return;
    }

    setErroAcao("");
    setImprimindoRelatorioFinanceiro(true);

    const areaImpressao = document.getElementById(
      "relatorio-financeiro-competencia-impressao",
    );

    if (!areaImpressao) {
      setErroAcao(
        "Não foi possível localizar o relatório financeiro para impressão.",
      );
      setImprimindoRelatorioFinanceiro(false);
      return;
    }

    const janelaImpressao = abrirJanelaImpressaoSegura();

    if (!janelaImpressao) {
      setErroAcao(
        "O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.",
      );
      setImprimindoRelatorioFinanceiro(false);
      return;
    }

    const finalizarPreparacao = () => {
      setImprimindoRelatorioFinanceiro(false);
    };

    const estilosPagina = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((elemento) => elemento.outerHTML)
      .join("\n");

    janelaImpressao.document.open();
    janelaImpressao.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Relatório Financeiro da Competência</title>
  ${estilosPagina}
  <style>
    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      padding: 24px;
    }

    #relatorio-financeiro-competencia-impressao {
      display: block !important;
      position: static !important;
      inset: auto !important;
      width: 100% !important;
      min-height: auto !important;
      margin: 0 auto !important;
      padding: 0 !important;
      visibility: visible !important;
      background: #ffffff !important;
      color: #0f172a !important;
    }

    #relatorio-financeiro-competencia-impressao * {
      visibility: visible !important;
    }

    @media print {
      @page {
        size: A4;
        margin: 16mm;
      }

      html,
      body {
        padding: 0 !important;
        background: #ffffff !important;
      }

      #relatorio-financeiro-competencia-impressao {
        width: 100% !important;
        margin: 0 !important;
      }

      #relatorio-financeiro-competencia-impressao .quebra-evitar {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${areaImpressao.outerHTML}
</body>
</html>`);
    janelaImpressao.document.close();

    janelaImpressao.focus();

    window.setTimeout(() => {
      janelaImpressao.print();
      window.setTimeout(finalizarPreparacao, 5000);
    }, 500);
  }

  async function salvarConfiguracoesPagamento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || salvandoConfiguracoesPagamento) {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setSalvandoConfiguracoesPagamento(true);

    const payload: AtualizarConfiguracoesPagamentoCondominioPayload = {
      pixChave: configuracoesPagamentoForm.pixChave.trim(),
      pixTipo: configuracoesPagamentoForm.pixTipo.trim(),
      beneficiarioPagamento:
        configuracoesPagamentoForm.beneficiarioPagamento.trim(),
      bancoPagamento: configuracoesPagamentoForm.bancoPagamento.trim(),
      instrucoesPagamento: configuracoesPagamentoForm.instrucoesPagamento.trim(),
      mensagemCobrancaPadrao:
        configuracoesPagamentoForm.mensagemCobrancaPadrao.trim(),
    };

    try {
      const resposta =
        await apiRequest<AdminConfiguracoesPagamentoCondominio>(
          `/condominios/${condominioId}/financeiro/configuracoes-pagamento`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );

      setConfiguracoesPagamento(resposta);
      aplicarConfiguracoesPagamentoNoFormulario(resposta);
      setMensagemSucesso("Configurações de pagamento atualizadas.");
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          "Não foi possível salvar as configurações de pagamento.",
        ),
      );
    } finally {
      setSalvandoConfiguracoesPagamento(false);
    }
  }

  async function criarCategoria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviandoCategoria) {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setEnviandoCategoria(true);

    const payload: CriarCategoriaFinanceiraAdminPayload = {
      nome: categoriaForm.nome.trim(),
      tipo: categoriaForm.tipo,
    };

    if (categoriaForm.descricao.trim()) {
      payload.descricao = categoriaForm.descricao.trim();
    }

    try {
      await apiRequest(`/condominios/${condominioId}/financeiro/categorias`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setCategoriaForm({
        nome: "",
        tipo: "RECEITA",
        descricao: "",
      });

      setMensagemSucesso("Categoria financeira cadastrada.");
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          "Não foi possível cadastrar a categoria financeira.",
        ),
      );
    } finally {
      setEnviandoCategoria(false);
    }
  }

  function abrirEdicaoCategoria(categoria: AdminCategoriaFinanceira) {
    setErroAcao("");
    setMensagemSucesso("");
    setEditandoCategoriaId(categoria.id);

    setEdicaoCategoriaForm({
      nome: categoria.nome,
      tipo: categoria.tipo,
      descricao: categoria.descricao ?? "",
    });
  }

  function cancelarEdicaoCategoria() {
    setEditandoCategoriaId(null);
    setEdicaoCategoriaForm({
      nome: "",
      tipo: "RECEITA",
      descricao: "",
    });
  }

  async function salvarEdicaoCategoria(
    event: FormEvent<HTMLFormElement>,
    categoriaId: number,
  ) {
    event.preventDefault();

    if (!condominioId || salvandoEdicaoCategoria) {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setSalvandoEdicaoCategoria(true);

    const payload: CriarCategoriaFinanceiraAdminPayload = {
      nome: edicaoCategoriaForm.nome.trim(),
      tipo: edicaoCategoriaForm.tipo,
    };

    if (edicaoCategoriaForm.descricao.trim()) {
      payload.descricao = edicaoCategoriaForm.descricao.trim();
    }

    try {
      await apiRequest(
        `/condominios/${condominioId}/financeiro/categorias/${categoriaId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso("Categoria financeira atualizada.");
      cancelarEdicaoCategoria();
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          "Não foi possível atualizar a categoria financeira.",
        ),
      );
    } finally {
      setSalvandoEdicaoCategoria(false);
    }
  }

  async function alterarStatusCategoria(categoria: AdminCategoriaFinanceira) {
    if (!condominioId || acaoCategoriaId !== null) {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setAcaoCategoriaId(categoria.id);

    const acao = categoria.ativo ? "desativar" : "ativar";

    try {
      await apiRequest(
        `/condominios/${condominioId}/financeiro/categorias/${categoria.id}/${acao}`,
        {
          method: "PATCH",
        },
      );

      if (categoria.ativo && editandoCategoriaId === categoria.id) {
        cancelarEdicaoCategoria();
      }

      setMensagemSucesso(
        categoria.ativo
          ? "Categoria financeira desativada."
          : "Categoria financeira reativada.",
      );

      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          categoria.ativo
            ? "Não foi possível desativar a categoria financeira."
            : "Não foi possível reativar a categoria financeira.",
        ),
      );
    } finally {
      setAcaoCategoriaId(null);
    }
  }

  async function criarLancamento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviandoLancamento) {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setEnviandoLancamento(true);

    const payload: CriarLancamentoFinanceiroAdminPayload = {
      tipo: lancamentoForm.tipo,
      descricao: lancamentoForm.descricao.trim(),
      valor: lancamentoForm.valor.trim(),
      competenciaEm: dataIsoInicioDoDia(lancamentoForm.competenciaEm),
    };

    if (lancamentoForm.categoriaId) {
      payload.categoriaId = Number(lancamentoForm.categoriaId);
    }

    if (lancamentoForm.vencimentoEm) {
      payload.vencimentoEm = dataIsoInicioDoDia(lancamentoForm.vencimentoEm);
    }

    if (lancamentoForm.observacoes.trim()) {
      payload.observacoes = lancamentoForm.observacoes.trim();
    }

    try {
      await apiRequest(`/condominios/${condominioId}/financeiro/lancamentos`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setLancamentoForm({
        categoriaId: "",
        tipo: "RECEITA",
        descricao: "",
        valor: "",
        competenciaEm: "",
        vencimentoEm: "",
        observacoes: "",
      });

      setMensagemSucesso("Lançamento financeiro cadastrado.");
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          "Não foi possível cadastrar o lançamento financeiro.",
        ),
      );
    } finally {
      setEnviandoLancamento(false);
    }
  }

  async function criarCobranca(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviandoCobranca) {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setEnviandoCobranca(true);

    const payload: CriarCobrancaAdminPayload = {
      unidadeId: Number(cobrancaForm.unidadeId),
      descricao: cobrancaForm.descricao.trim(),
      valor: cobrancaForm.valor.trim(),
      competenciaEm: dataIsoInicioDoDia(cobrancaForm.competenciaEm),
      vencimentoEm: dataIsoInicioDoDia(cobrancaForm.vencimentoEm),
    };

    if (cobrancaForm.moradorId) {
      payload.moradorId = Number(cobrancaForm.moradorId);
    }

    if (cobrancaForm.categoriaId) {
      payload.categoriaId = Number(cobrancaForm.categoriaId);
    }

    if (cobrancaForm.observacoes.trim()) {
      payload.observacoes = cobrancaForm.observacoes.trim();
    }

    try {
      await apiRequest(`/condominios/${condominioId}/cobrancas`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setCobrancaForm({
        unidadeId: "",
        moradorId: "",
        categoriaId: "",
        descricao: "",
        valor: "",
        competenciaEm: "",
        vencimentoEm: "",
        observacoes: "",
      });

      setMensagemSucesso("Cobrança condominial cadastrada.");
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(error, "Não foi possível cadastrar a cobrança."),
      );
    } finally {
      setEnviandoCobranca(false);
    }
  }

  async function criarCobrancasLote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviandoCobrancasLote) {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setEnviandoCobrancasLote(true);

    const payload: CriarCobrancasLoteAdminPayload = {
      descricao: cobrancasLoteForm.descricao.trim(),
      valor: cobrancasLoteForm.valor.trim(),
      competenciaEm: dataIsoInicioDoDia(cobrancasLoteForm.competenciaEm),
      vencimentoEm: dataIsoInicioDoDia(cobrancasLoteForm.vencimentoEm),
    };

    if (cobrancasLoteForm.categoriaId) {
      payload.categoriaId = Number(cobrancasLoteForm.categoriaId);
    }

    if (cobrancasLoteForm.observacoes.trim()) {
      payload.observacoes = cobrancasLoteForm.observacoes.trim();
    }

    try {
      const resposta = await apiRequest<ResultadoCriacaoCobrancasLoteAdmin>(
        `/condominios/${condominioId}/cobrancas/lote`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      setCobrancasLoteForm({
        categoriaId: "",
        descricao: "",
        valor: "",
        competenciaEm: "",
        vencimentoEm: "",
        observacoes: "",
      });

      setMensagemSucesso(
        `Geração em lote concluída: ${resposta.criadas} cobrança(s) criada(s), ${resposta.ignoradasDuplicidade} ignorada(s) por duplicidade, em ${resposta.totalUnidadesAtivas} unidade(s) ativa(s).`,
      );

      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          "Não foi possível gerar as cobranças em lote.",
        ),
      );
    } finally {
      setEnviandoCobrancasLote(false);
    }
  }

  function abrirEdicaoLancamento(lancamento: AdminLancamentoFinanceiro) {
    if (lancamento.status !== "PENDENTE") {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setEditandoLancamentoId(lancamento.id);

    setEdicaoLancamentoForm({
      categoriaId: lancamento.categoriaId ? String(lancamento.categoriaId) : "",
      tipo: lancamento.tipo,
      descricao: lancamento.descricao,
      valor: String(lancamento.valor),
      competenciaEm: dataInputDeIso(lancamento.competenciaEm),
      vencimentoEm: dataInputDeIso(lancamento.vencimentoEm),
      observacoes: lancamento.observacoes ?? "",
    });
  }

  function cancelarEdicaoLancamento() {
    setEditandoLancamentoId(null);
    setEdicaoLancamentoForm({
      categoriaId: "",
      tipo: "RECEITA",
      descricao: "",
      valor: "",
      competenciaEm: "",
      vencimentoEm: "",
      observacoes: "",
    });
  }

  async function salvarEdicaoLancamento(
    event: FormEvent<HTMLFormElement>,
    lancamentoId: number,
  ) {
    event.preventDefault();

    if (!condominioId || salvandoEdicaoLancamento) {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setSalvandoEdicaoLancamento(true);

    const payload: CriarLancamentoFinanceiroAdminPayload = {
      tipo: edicaoLancamentoForm.tipo,
      descricao: edicaoLancamentoForm.descricao.trim(),
      valor: edicaoLancamentoForm.valor.trim(),
      competenciaEm: dataIsoInicioDoDia(edicaoLancamentoForm.competenciaEm),
    };

    if (edicaoLancamentoForm.categoriaId) {
      payload.categoriaId = Number(edicaoLancamentoForm.categoriaId);
    }

    if (edicaoLancamentoForm.vencimentoEm) {
      payload.vencimentoEm = dataIsoInicioDoDia(
        edicaoLancamentoForm.vencimentoEm,
      );
    }

    if (edicaoLancamentoForm.observacoes.trim()) {
      payload.observacoes = edicaoLancamentoForm.observacoes.trim();
    }

    try {
      await apiRequest(
        `/condominios/${condominioId}/financeiro/lancamentos/${lancamentoId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso("Lançamento atualizado com sucesso.");
      cancelarEdicaoLancamento();
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          "Não foi possível atualizar o lançamento financeiro.",
        ),
      );
    } finally {
      setSalvandoEdicaoLancamento(false);
    }
  }

  function abrirEdicaoCobranca(cobranca: AdminCobrancaCondominial) {
    if (cobranca.status !== "PENDENTE") {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setEditandoCobrancaId(cobranca.id);

    setEdicaoCobrancaForm({
      unidadeId: String(cobranca.unidadeId),
      moradorId: cobranca.moradorId ? String(cobranca.moradorId) : "",
      descricao: cobranca.descricao,
      valor: String(cobranca.valor),
      competenciaEm: dataInputDeIso(cobranca.competenciaEm),
      vencimentoEm: dataInputDeIso(cobranca.vencimentoEm),
      observacoes: cobranca.observacoes ?? "",
    });
  }

  function cancelarEdicaoCobranca() {
    setEditandoCobrancaId(null);
    setEdicaoCobrancaForm({
      unidadeId: "",
      moradorId: "",
      descricao: "",
      valor: "",
      competenciaEm: "",
      vencimentoEm: "",
      observacoes: "",
    });
  }

  async function salvarEdicaoCobranca(
    event: FormEvent<HTMLFormElement>,
    cobrancaId: number,
  ) {
    event.preventDefault();

    if (!condominioId || salvandoEdicaoCobranca) {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setSalvandoEdicaoCobranca(true);

    const payload: CriarCobrancaAdminPayload = {
      unidadeId: Number(edicaoCobrancaForm.unidadeId),
      descricao: edicaoCobrancaForm.descricao.trim(),
      valor: edicaoCobrancaForm.valor.trim(),
      competenciaEm: dataIsoInicioDoDia(edicaoCobrancaForm.competenciaEm),
      vencimentoEm: dataIsoInicioDoDia(edicaoCobrancaForm.vencimentoEm),
    };

    if (edicaoCobrancaForm.moradorId) {
      payload.moradorId = Number(edicaoCobrancaForm.moradorId);
    }

    if (edicaoCobrancaForm.observacoes.trim()) {
      payload.observacoes = edicaoCobrancaForm.observacoes.trim();
    }

    try {
      await apiRequest(`/condominios/${condominioId}/cobrancas/${cobrancaId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setMensagemSucesso("Cobrança atualizada com sucesso.");
      cancelarEdicaoCobranca();
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          "Não foi possível atualizar a cobrança condominial.",
        ),
      );
    } finally {
      setSalvandoEdicaoCobranca(false);
    }
  }

  async function pagarLancamento(lancamentoId: number) {
    if (!condominioId || acaoLancamentoId !== null) {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setAcaoLancamentoId(lancamentoId);

    const dataPagamento = pagamentoLancamento[lancamentoId]?.trim();

    const payload: PagarFinanceiroAdminPayload = {};

    if (dataPagamento) {
      payload.pagoEm = dataIsoInicioDoDia(dataPagamento);
    }

    try {
      await apiRequest(
        `/condominios/${condominioId}/financeiro/lancamentos/${lancamentoId}/pagar`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso("Lançamento marcado como pago.");
      setPagamentoLancamento((atual) => {
        const proximo = { ...atual };
        delete proximo[lancamentoId];
        return proximo;
      });
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(error, "Não foi possível pagar o lançamento."),
      );
    } finally {
      setAcaoLancamentoId(null);
    }
  }

  async function estornarPagamentoLancamento(lancamentoId: number) {
    if (!condominioId || acaoLancamentoId !== null) {
      return;
    }

    const confirmar = window.confirm(
      "Deseja desfazer o pagamento deste lançamento e voltar para pendente?",
    );

    if (!confirmar) {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setAcaoLancamentoId(lancamentoId);

    try {
      await apiRequest(
        `/condominios/${condominioId}/financeiro/lancamentos/${lancamentoId}/estornar-pagamento`,
        {
          method: "PATCH",
        },
      );

      setMensagemSucesso("Pagamento do lançamento desfeito.");
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          "Não foi possível desfazer o pagamento do lançamento.",
        ),
      );
    } finally {
      setAcaoLancamentoId(null);
    }
  }

  async function cancelarLancamento(lancamentoId: number) {
    if (!condominioId || acaoLancamentoId !== null) {
      return;
    }

    const motivo = cancelamentoLancamento[lancamentoId]?.trim();

    if (!motivo || motivo.length < 3) {
      const mensagem = "Informe o motivo do cancelamento do lançamento.";

      setErroAcao(mensagem);
      setErroCancelamentoLancamento((atual) => ({
        ...atual,
        [lancamentoId]: mensagem,
      }));

      window.setTimeout(() => {
        campoCancelamentoLancamentoRefs.current[lancamentoId]?.focus();
      }, 0);

      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setErroCancelamentoLancamento((atual) => {
      const proximo = { ...atual };
      delete proximo[lancamentoId];
      return proximo;
    });
    setAcaoLancamentoId(lancamentoId);

    const payload: CancelarFinanceiroAdminPayload = {
      motivoCancelamento: motivo,
    };

    try {
      await apiRequest(
        `/condominios/${condominioId}/financeiro/lancamentos/${lancamentoId}/cancelar`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso("Lançamento cancelado.");
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(error, "Não foi possível cancelar o lançamento."),
      );
    } finally {
      setAcaoLancamentoId(null);
    }
  }

  async function pagarCobranca(
    cobrancaId: number,
    origem: "agenda" | "geral" = "geral",
  ) {
    if (!condominioId || acaoCobrancaId !== null) {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");

    const dataPagamento = pagamentoCobranca[cobrancaId]?.trim();

    if (!dataPagamento) {
      const mensagem = "Informe a data do pagamento da cobrança.";

      setErroAcao(mensagem);
      setErroPagamentoCobranca((atual) => ({
        ...atual,
        [cobrancaId]: mensagem,
      }));

      window.setTimeout(() => {
        const campoPagamento =
          origem === "agenda"
            ? campoPagamentoCobrancaAgendaRefs.current[cobrancaId]
            : campoPagamentoCobrancaRefs.current[cobrancaId];

        campoPagamento?.focus();
      }, 0);

      return;
    }

    setErroPagamentoCobranca((atual) => {
      const proximo = { ...atual };
      delete proximo[cobrancaId];
      return proximo;
    });

    setAcaoCobrancaId(cobrancaId);

    const payload: PagarFinanceiroAdminPayload = {
      pagoEm: dataIsoInicioDoDia(dataPagamento),
    };

    try {
      await apiRequest(
        `/condominios/${condominioId}/cobrancas/${cobrancaId}/pagar`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso("Cobrança marcada como paga.");
      setPagamentoCobranca((atual) => {
        const proximo = { ...atual };
        delete proximo[cobrancaId];
        return proximo;
      });
      await carregarDados(condominioId);
    } catch (error) {
      const mensagem = obterMensagemErro(
        error,
        "Não foi possível pagar a cobrança.",
      );

      setErroAcao(mensagem);
      setErroPagamentoCobranca((atual) => ({
        ...atual,
        [cobrancaId]: mensagem,
      }));
    } finally {
      setAcaoCobrancaId(null);
    }
  }

  async function estornarPagamentoCobranca(cobrancaId: number) {
    if (!condominioId || acaoCobrancaId !== null) {
      return;
    }

    const confirmar = window.confirm(
      "Deseja desfazer o pagamento desta cobrança e voltar para pendente?",
    );

    if (!confirmar) {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setAcaoCobrancaId(cobrancaId);

    try {
      await apiRequest(
        `/condominios/${condominioId}/cobrancas/${cobrancaId}/estornar-pagamento`,
        {
          method: "PATCH",
        },
      );

      setMensagemSucesso("Pagamento da cobrança desfeito.");
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          "Não foi possível desfazer o pagamento da cobrança.",
        ),
      );
    } finally {
      setAcaoCobrancaId(null);
    }
  }

  async function abrirComprovanteCobranca(cobrancaId: number) {
    if (!condominioId || acaoCobrancaId !== null) {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setAcaoCobrancaId(cobrancaId);

    try {
      const comprovante = await apiRequest<ComprovanteCobrancaVisualizacao>(
        `/condominios/${condominioId}/cobrancas/${cobrancaId}/comprovante`,
      );

      if (!comprovante.arquivoDados) {
        setErroAcao("Comprovante não encontrado.");
        return;
      }

      setComprovanteVisualizacao({
        cobrancaId,
        arquivoNome: comprovante.arquivoNome,
        arquivoTipo: comprovante.arquivoTipo,
        arquivoDados: comprovante.arquivoDados,
        observacao: comprovante.observacao,
        status: comprovante.status,
        enviadoEm: comprovante.enviadoEm,
      });
    } catch (error) {
      setErroAcao(
        obterMensagemErro(error, "Não foi possível abrir o comprovante."),
      );
    } finally {
      setAcaoCobrancaId(null);
    }
  }

  async function aprovarComprovanteCobranca(cobrancaId: number) {
    if (!condominioId || acaoCobrancaId !== null) {
      return;
    }

    const confirmar = window.confirm(
      "Deseja aprovar este comprovante e marcar a cobrança como paga?",
    );

    if (!confirmar) {
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setAcaoCobrancaId(cobrancaId);

    try {
      await apiRequest(
        `/condominios/${condominioId}/cobrancas/${cobrancaId}/comprovante/aprovar`,
        {
          method: "PATCH",
        },
      );

      setMensagemSucesso("Comprovante aprovado e cobrança marcada como paga.");
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(error, "Não foi possível aprovar o comprovante."),
      );
    } finally {
      setAcaoCobrancaId(null);
    }
  }

  async function recusarComprovanteCobranca(cobrancaId: number) {
    if (!condominioId || acaoCobrancaId !== null) {
      return;
    }

    const motivo = window.prompt("Informe o motivo da recusa do comprovante:")?.trim();

    if (!motivo) {
      setErroAcao("Informe o motivo da recusa do comprovante.");
      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setAcaoCobrancaId(cobrancaId);

    try {
      await apiRequest(
        `/condominios/${condominioId}/cobrancas/${cobrancaId}/comprovante/recusar`,
        {
          method: "PATCH",
          body: JSON.stringify({ motivo }),
        },
      );

      setMensagemSucesso("Comprovante recusado.");
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(error, "Não foi possível recusar o comprovante."),
      );
    } finally {
      setAcaoCobrancaId(null);
    }
  }

  async function cancelarCobranca(cobrancaId: number) {
    if (!condominioId || acaoCobrancaId !== null) {
      return;
    }

    const motivo = cancelamentoCobranca[cobrancaId]?.trim();

    if (!motivo || motivo.length < 3) {
      const mensagem = "Informe o motivo do cancelamento da cobrança.";

      setErroAcao(mensagem);
      setErroCancelamentoCobranca((atual) => ({
        ...atual,
        [cobrancaId]: mensagem,
      }));

      window.setTimeout(() => {
        campoCancelamentoCobrancaRefs.current[cobrancaId]?.focus();
      }, 0);

      return;
    }

    setErroAcao("");
    setMensagemSucesso("");
    setErroCancelamentoCobranca((atual) => {
      const proximo = { ...atual };
      delete proximo[cobrancaId];
      return proximo;
    });
    setAcaoCobrancaId(cobrancaId);

    const payload: CancelarFinanceiroAdminPayload = {
      motivoCancelamento: motivo,
    };

    try {
      await apiRequest(
        `/condominios/${condominioId}/cobrancas/${cobrancaId}/cancelar`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso("Cobrança cancelada.");
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(error, "Não foi possível cancelar a cobrança."),
      );
    } finally {
      setAcaoCobrancaId(null);
    }
  }

  return (
    <AdminShell
      usuario={usuario}
      condominiosAdministrativos={condominiosAdministrativos}
    >
      {comprovanteVisualizacao ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-600">
                  Comprovante de pagamento
                </p>
                <h3 className="mt-2 break-words text-xl font-bold text-slate-950">
                  {comprovanteVisualizacao.arquivoNome ?? "Comprovante enviado"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Enviado em: {formatarDataHora(comprovanteVisualizacao.enviadoEm)} • Status:{" "}
                  {comprovanteVisualizacao.status ?? "—"}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {comprovanteVisualizacao.arquivoDados ? (
                  <a
                    href={comprovanteVisualizacao.arquivoDados}
                    download={comprovanteVisualizacao.arquivoNome ?? "comprovante"}
                    className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-600"
                  >
                    Baixar arquivo
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={() => setComprovanteVisualizacao(null)}
                  className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  Fechar
                </button>
              </div>
            </div>

            {comprovanteVisualizacao.observacao ? (
              <div className="border-b border-orange-100 bg-orange-50 px-5 py-3 text-sm font-semibold leading-6 text-orange-900 sm:px-6">
                Observação do morador: {comprovanteVisualizacao.observacao}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4 sm:p-6">
              {comprovanteVisualizacao.arquivoDados &&
              comprovanteVisualizacao.arquivoTipo?.includes("pdf") ? (
                <iframe
                  src={comprovanteVisualizacao.arquivoDados}
                  title="Comprovante de pagamento"
                  className="h-[70vh] w-full rounded-3xl border border-slate-200 bg-white"
                />
              ) : comprovanteVisualizacao.arquivoDados &&
                comprovanteVisualizacao.arquivoTipo?.startsWith("image/") ? (
                <img
                  src={comprovanteVisualizacao.arquivoDados}
                  alt="Comprovante de pagamento"
                  className="mx-auto block max-h-[70vh] max-w-full rounded-3xl border border-slate-200 bg-white object-contain shadow-sm"
                />
              ) : comprovanteVisualizacao.arquivoDados ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    Este tipo de arquivo não possui pré-visualização no navegador.
                  </p>
                  <a
                    href={comprovanteVisualizacao.arquivoDados}
                    download={comprovanteVisualizacao.arquivoNome ?? "comprovante"}
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600"
                  >
                    Baixar comprovante
                  </a>
                </div>
              ) : (
                <div className="rounded-3xl border border-rose-200 bg-white p-6 text-center text-sm font-semibold text-rose-700">
                  Arquivo do comprovante não encontrado.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Financeiro administrativo
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Categorias, lançamentos e cobranças
            </h2>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600 sm:text-base">
              Controle receitas, despesas e cobranças condominiais em um único
              painel, com resumo por período e ações de baixa ou cancelamento.
            </p>
          </div>

          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <label className="grid gap-2">
              <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] sm:text-[11px] xl:text-xs text-slate-600">
                Condomínio ativo
              </span>

              <select
                value={condominioId}
                onChange={(event) =>
                  setCondominioId(Number(event.target.value))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                {condominiosAdministrativos.map((vinculo) => (
                  <option key={vinculo.id} value={vinculo.condominio.id}>
                    {vinculo.condominio.nome}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={imprimirRelatorioFinanceiro}
              disabled={imprimindoRelatorioFinanceiro}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-800 transition hover:border-orange-300 hover:bg-orange-100 disabled:cursor-wait disabled:opacity-60"
            >
              {imprimindoRelatorioFinanceiro ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              {imprimindoRelatorioFinanceiro
                ? "Preparando relatório..."
                : "Imprimir relatório financeiro"}
            </button>
          </div>
        </div>
      </section>

      <section
        className="mt-6 rounded-[2rem] border border-orange-100 bg-orange-50 p-5 shadow-sm sm:p-6"
        data-admin-financeiro-card-comprovantes-pendentes="true"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-700">
              Comprovantes pendentes de análise
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              {totalComprovantesPendentesAnalise} comprovante(s) aguardando validação
            </h3>

            <p className="mt-3 max-w-4xl text-sm leading-7 text-orange-900">
              Priorize a análise dos comprovantes enviados pelos moradores para baixar cobranças pagas ou recusar envios inconsistentes com motivo claro.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setBuscaCobranca("");
              setStatusFiltroCobranca("TODAS");
              setSomenteCobrancasVencidas(false);
              setSomenteComprovantesPendentes(true);
            }}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-orange-600 px-5 text-sm font-bold text-white transition hover:bg-orange-700 lg:w-auto"
          >
            Filtrar comprovantes pendentes
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Configurações de pagamento
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Pix, instruções e mensagem padrão
            </h3>

            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
              Defina os dados que aparecem nas mensagens de cobrança por WhatsApp e nos recibos de pagamento.
            </p>
          </div>

          <span className="w-fit rounded-3xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">
            {configuracoesPagamento?.pixChave ? 'Pix cadastrado' : 'Pix não cadastrado'}
          </span>
        </div>

        <form
          onSubmit={salvarConfiguracoesPagamento}
          className="mt-5 grid gap-4 lg:grid-cols-2"
        >
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Chave Pix
            </span>
            <input
              type="text"
              value={configuracoesPagamentoForm.pixChave}
              onChange={(event) =>
                setConfiguracoesPagamentoForm((atual) => ({
                  ...atual,
                  pixChave: event.target.value,
                }))
              }
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Tipo da chave
            </span>
            <select
              value={configuracoesPagamentoForm.pixTipo}
              onChange={(event) =>
                setConfiguracoesPagamentoForm((atual) => ({
                  ...atual,
                  pixTipo: event.target.value,
                }))
              }
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              <option value="">Não informado</option>
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="E-mail">E-mail</option>
              <option value="Telefone">Telefone</option>
              <option value="Chave aleatória">Chave aleatória</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Beneficiário
            </span>
            <input
              type="text"
              value={configuracoesPagamentoForm.beneficiarioPagamento}
              onChange={(event) =>
                setConfiguracoesPagamentoForm((atual) => ({
                  ...atual,
                  beneficiarioPagamento: event.target.value,
                }))
              }
              placeholder="Nome do condomínio ou responsável pelo recebimento"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Banco/observação
            </span>
            <input
              type="text"
              value={configuracoesPagamentoForm.bancoPagamento}
              onChange={(event) =>
                setConfiguracoesPagamentoForm((atual) => ({
                  ...atual,
                  bancoPagamento: event.target.value,
                }))
              }
              placeholder="Banco, conta, observação ou responsável financeiro"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="grid gap-2 lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Instruções de pagamento
            </span>
            <textarea
              value={configuracoesPagamentoForm.instrucoesPagamento}
              onChange={(event) =>
                setConfiguracoesPagamentoForm((atual) => ({
                  ...atual,
                  instrucoesPagamento: event.target.value,
                }))
              }
              rows={3}
              placeholder="Ex.: Enviar comprovante após o pagamento. Em caso de dúvidas, procurar a administração."
              className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="grid gap-2 lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Mensagem padrão de cobrança
            </span>
            <textarea
              value={configuracoesPagamentoForm.mensagemCobrancaPadrao}
              onChange={(event) =>
                setConfiguracoesPagamentoForm((atual) => ({
                  ...atual,
                  mensagemCobrancaPadrao: event.target.value,
                }))
              }
              rows={3}
              placeholder="Ex.: Olá! Identificamos uma cobrança condominial pendente. Seguem os dados para regularização."
              className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-2">
            <button
              type="submit"
              disabled={salvandoConfiguracoesPagamento}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-wait disabled:opacity-60"
            >
              {salvandoConfiguracoesPagamento
                ? 'Salvando...'
                : 'Salvar configurações de pagamento'}
            </button>

            <button
              type="button"
              onClick={() => aplicarConfiguracoesPagamentoNoFormulario(configuracoesPagamento)}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
            >
              Restaurar dados salvos
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Resumo por período
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Visão financeira consolidada
            </h3>
          </div>

          <form
            onSubmit={atualizarResumo}
            className="grid gap-3 sm:grid-cols-[170px_170px_auto]"
          >
            <input
              type="date"
              value={periodoInicio}
              onChange={(event) => setPeriodoInicio(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              required
            />

            <input
              type="date"
              value={periodoFim}
              onChange={(event) => setPeriodoFim(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              required
            />

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Atualizar resumo
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <CircleDollarSign className="h-5 w-5 text-emerald-600" />
            <p className="mt-4 text-sm font-semibold text-slate-600">
              Receita paga
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-950">
              <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.receitaPaga)}</span>
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <WalletCards className="h-5 w-5 text-rose-600" />
            <p className="mt-4 text-sm font-semibold text-slate-600">
              Despesa paga
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-950">
              <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.despesaPaga)}</span>
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <BadgeDollarSign className="h-5 w-5 text-orange-600" />
            <p className="mt-4 text-sm font-semibold text-slate-600">
              Saldo realizado
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-950">
              <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.saldoPago)}</span>
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <ReceiptText className="h-5 w-5 text-amber-600" />
            <p className="mt-4 text-sm font-semibold text-slate-600">
              Cobranças vencidas
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-950">
              <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.vencidasPendentes)}</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {totaisResumo.quantidadeVencidas} pendente(s)
            </p>
          </article>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Análise da competência
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Resultado financeiro da competência
            </h3>

            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
              Compare o que foi previsto para o período com o que já foi
              efetivamente realizado.
            </p>
          </div>

          <span className="w-fit rounded-3xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">
            Baseado no período selecionado
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => filtrarLancamentosResumo("RECEITA", "TODOS")}
            aria-label="Ver lançamentos de receita"
            className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
          >
            <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700 sm:text-[11px] xl:text-xs">
              Receita prevista
            </p>

            <p className="mt-3 text-2xl font-bold text-emerald-950">
              <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.receitaPrevista)}</span>
            </p>
          </button>

          <button
            type="button"
            onClick={() => filtrarLancamentosResumo("RECEITA", "PAGO")}
            aria-label="Ver receitas pagas"
            className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
          >
            <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700 sm:text-[11px] xl:text-xs">
              Receita recebida
            </p>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.receitaPaga)}</span>
            </p>
          </button>

          <button
            type="button"
            onClick={() => filtrarLancamentosResumo("DESPESA", "TODOS")}
            aria-label="Ver lançamentos de despesa"
            className="rounded-3xl border border-rose-100 bg-rose-50 p-5 w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
          >
            <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-700 sm:text-[11px] xl:text-xs">
              Despesa lançada
            </p>

            <p className="mt-3 text-2xl font-bold text-rose-950">
              <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.despesaLancada)}</span>
            </p>
          </button>

          <button
            type="button"
            onClick={() => filtrarLancamentosResumo("DESPESA", "PAGO")}
            aria-label="Ver despesas pagas"
            className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
          >
            <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-700 sm:text-[11px] xl:text-xs">
              Despesa paga
            </p>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.despesaPaga)}</span>
            </p>
          </button>

          <article className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
            <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-orange-700 sm:text-[11px] xl:text-xs">
              Saldo previsto
            </p>

            <p className="mt-3 text-2xl font-bold text-orange-950">
              <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.saldoPrevisto)}</span>
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600 sm:text-[11px] xl:text-xs">
              Saldo realizado
            </p>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.saldoPago)}</span>
            </p>
          </article>
        </div>

        <p className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
          <strong>Leitura:</strong> o saldo previsto considera receitas e
          despesas ainda válidas, pendentes ou pagas. O saldo realizado
          considera somente valores efetivamente pagos.
        </p>
      </section>

      <section className="mt-6 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Leitura por classificação
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Desempenho por categoria
            </h3>

            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
              Acompanhe quais categorias concentram receitas e despesas dentro
              da competência selecionada.
            </p>
          </div>

          <span className="w-fit rounded-3xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">
            Resumo do período
          </span>
        </div>

        <div
          className="admin-financeiro-grid-pendencias mt-5 grid items-start gap-5 xl:grid-cols-2"
          data-admin-financeiro-grid-pendencias="true"
        >
          <article className="admin-financeiro-entradas-previstas h-fit self-start rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
                  Receitas
                </p>

                <h4 className="mt-1 text-xl font-bold text-slate-950">
                  Categorias de entrada
                </h4>
              </div>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800 shadow-sm">
                {categoriasResumoReceitas.length} exibida(s)
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {categoriasResumoReceitas.map((categoria) => (
                <div
                  key={`receita-${categoria.categoriaId ?? "sem-categoria"}`}
                  className="rounded-2xl border border-white bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-950">
                        {categoria.nome}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {categoria.quantidade} lançamento(s)
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      <span className="admin-financeiro-valor-nowrap">{formatarMoeda(categoria.valorPrevisto)}</span>
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Previsto:{" "}
                    <strong><span className="admin-financeiro-valor-nowrap">{formatarMoeda(categoria.valorPrevisto)}</span></strong> •
                    Recebido:{" "}
                    <strong><span className="admin-financeiro-valor-nowrap">{formatarMoeda(categoria.valorPago)}</span></strong>
                  </p>
                </div>
              ))}

              {categoriasResumoReceitas.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-emerald-200 bg-white p-4 text-sm text-emerald-800">
                  Nenhuma receita classificada no período selecionado.
                </p>
              ) : null}
            </div>
          </article>

          <article className="h-fit self-start rounded-3xl border border-rose-100 bg-rose-50/60 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-rose-700">
                  Despesas
                </p>

                <h4 className="mt-1 text-xl font-bold text-slate-950">
                  Categorias de saída
                </h4>
              </div>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-rose-800 shadow-sm">
                {categoriasResumoDespesas.length} exibida(s)
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {categoriasResumoDespesas.map((categoria) => (
                <div
                  key={`despesa-${categoria.categoriaId ?? "sem-categoria"}`}
                  className="rounded-2xl border border-white bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-950">
                        {categoria.nome}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {categoria.quantidade} lançamento(s)
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                      <span className="admin-financeiro-valor-nowrap">{formatarMoeda(categoria.valorPrevisto)}</span>
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Lançado:{" "}
                    <strong><span className="admin-financeiro-valor-nowrap">{formatarMoeda(categoria.valorPrevisto)}</span></strong> •
                    Pago: <strong><span className="admin-financeiro-valor-nowrap">{formatarMoeda(categoria.valorPago)}</span></strong>
                  </p>
                </div>
              ))}

              {categoriasResumoDespesas.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-rose-200 bg-white p-4 text-sm text-rose-800">
                  Nenhuma despesa classificada no período selecionado.
                </p>
              ) : null}
            </div>
          </article>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-rose-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-rose-600">
              Gestão de recebíveis
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Inadimplência e cobranças vencidas
            </h3>

            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
              Acompanhe o volume financeiro em aberto, os títulos já vencidos e
              priorize a baixa das cobranças pendentes.
            </p>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
            {totaisResumo.quantidadeVencidas} título(s) vencido(s)
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <button
            type="button"
            onClick={() => filtrarCobrancasRecebiveis("PENDENTE", false)}
            aria-label="Ver cobranças pendentes em aberto"
            className="rounded-3xl border border-amber-100 bg-amber-50 p-4 w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
          >
            <p className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.03em] sm:text-[10px] xl:text-[10px] text-amber-700">
              Cobranças em aberto
            </p>

            <p className="mt-3 text-2xl font-bold text-amber-950">
              <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.cobrancasPendentes)}</span>
            </p>
          </button>

          <button
            type="button"
            onClick={() => filtrarCobrancasRecebiveis("PAGO", false)}
            aria-label="Ver cobranças pagas"
            className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
          >
            <p className="leading-tight text-[9px] font-semibold uppercase tracking-[0.02em] sm:text-[10px] xl:text-[10px] text-emerald-700">
              Cobranças pagas
            </p>

            <p className="mt-3 text-2xl font-bold text-emerald-950">
              <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.cobrancasPagas)}</span>
            </p>
          </button>

          <button
            type="button"
            onClick={() => filtrarCobrancasRecebiveis("PENDENTE", true)}
            aria-label="Ver cobranças vencidas em aberto"
            className="rounded-3xl border border-rose-100 bg-rose-50 p-4 w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
          >
            <p className="leading-tight text-[9px] font-semibold uppercase tracking-[0.02em] sm:text-[10px] xl:text-[10px] text-rose-700">
              Vencido em aberto
            </p>

            <p className="mt-3 text-2xl font-bold text-rose-950">
              <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.vencidasPendentes)}</span>
            </p>
          </button>

          <article className="rounded-3xl border border-orange-100 bg-orange-50 p-4">
            <p className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.02em] sm:text-[10px] xl:text-[10px] text-orange-700">
              Taxa de inadimplência
            </p>

            <p className="mt-3 text-2xl font-bold text-orange-950">
              {formatarPercentualBR(totaisResumo.taxaInadimplenciaPeriodo)}
            </p>

            <p className="mt-1 text-[10px] font-semibold leading-4 text-orange-800 sm:text-[11px]">
              Sobre cobranças válidas do período
            </p>
          </article>

          <button
            type="button"
            onClick={() => filtrarCobrancasRecebiveis("PENDENTE", true)}
            aria-label="Ver títulos vencidos em aberto"
            className="rounded-3xl border border-slate-200 bg-slate-50 p-4 w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
          >
            <p className="leading-tight text-[9px] font-semibold uppercase tracking-[0.02em] sm:text-[10px] xl:text-[10px] text-slate-600">
              Quantidade vencida
            </p>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {totaisResumo.quantidadeVencidas}
            </p>
          </button>
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-950">
                Prioridade de cobrança
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                As cobranças abaixo são as vencidas em aberto com vencimento
                mais antigo.
              </p>
            </div>

            <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
              {cobrancasVencidasEmAberto.length} em acompanhamento
            </span>
          </div>

          {cobrancasVencidasDestaque.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              Não há cobranças vencidas em aberto no momento.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {cobrancasVencidasDestaque.map((cobranca) => (
                <article
                  key={cobranca.id}
                  className="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                          Vencida
                        </span>

                        <CobrancaStatusBadge status={cobranca.status} />
                      </div>

                      <h4 className="mt-3 text-base font-bold text-slate-950">
                        {cobranca.descricao}
                      </h4>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Unidade:{" "}
                        <strong>{cobranca.unidade.identificador}</strong>
                        {" • "}
                        Morador:{" "}
                        <strong>
                          {cobranca.morador?.nome ?? "Não vinculado"}
                        </strong>
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Vencimento:{" "}
                        <strong>{formatarData(cobranca.vencimentoEm)}</strong>
                        {" • "}
                        Valor: <strong><span className="admin-financeiro-valor-nowrap">{formatarMoeda(cobranca.valor)}</span></strong>
                      </p>
                    </div>

                    {podeGerirFinanceiro ? (
                      <div className="grid shrink-0 gap-3 lg:w-[220px]">
                        <label className="grid gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                            Data do pagamento da cobrança vencida
                          </span>
                          <input
                            type="date"
                            ref={(element) => {
                              campoPagamentoCobrancaRefs.current[cobranca.id] =
                                element;
                            }}
                            value={pagamentoCobranca[cobranca.id] ?? ""}
                            onChange={(event) => {
                              setPagamentoCobranca((atual) => ({
                                ...atual,
                                [cobranca.id]: event.target.value,
                              }));

                              setErroPagamentoCobranca((atual) => {
                                if (!atual[cobranca.id]) {
                                  return atual;
                                }

                                const proximo = { ...atual };
                                delete proximo[cobranca.id];
                                return proximo;
                              });
                            }}
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </label>

                        {erroPagamentoCobranca[cobranca.id] ? (
                          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
                            {erroPagamentoCobranca[cobranca.id]}
                          </p>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => void pagarCobranca(cobranca.id)}
                          disabled={acaoCobrancaId !== null}
                          className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {acaoCobrancaId === cobranca.id
                            ? "Baixando..."
                            : "Marcar como paga"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="admin-financeiro-previsao-operacional mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Previsão operacional
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Agenda de vencimentos financeiros
            </h3>

            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
              Acompanhe as cobranças e despesas pendentes ordenadas pelo
              vencimento mais próximo.
            </p>
          </div>

          <span className="w-fit rounded-3xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">
            Prioridades de caixa
          </span>
        </div>

        <div
          className="admin-financeiro-grid-pendencias mt-5 grid items-start gap-5 xl:grid-cols-2"
          data-admin-financeiro-grid-pendencias="true"
        >
          <article className="admin-financeiro-entradas-previstas h-fit self-start rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
                  Entradas previstas
                </p>

                <h4 className="mt-1 text-xl font-bold text-slate-950">
                  Cobranças pendentes
                </h4>
              </div>

              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800 shadow-sm">
                {cobrancasAgendaVencimentos.length} prioridade(s)
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {cobrancasAgendaVencimentos.map((cobranca) => (
                <div
                  key={`agenda-cobranca-${cobranca.id}`}
                  className="rounded-2xl border border-white bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-950">
                        {cobranca.descricao}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Unidade:{" "}
                        <strong>{cobranca.unidade.identificador}</strong> •
                        Morador:{" "}
                        <strong>
                          {cobranca.morador?.nome ?? "Não informado"}
                        </strong>
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Vencimento:{" "}
                        <strong>{formatarData(cobranca.vencimentoEm)}</strong> •
                        Valor: <strong><span className="admin-financeiro-valor-nowrap">{formatarMoeda(cobranca.valor)}</span></strong>
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${classePrazoVencimento(
                        cobranca.vencimentoEm,
                      )}`}
                    >
                      {rotuloPrazoVencimento(cobranca.vencimentoEm)}
                    </span>
                  </div>
                  {podeGerirFinanceiro ? (
                    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <label className="grid gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                            Data do pagamento da cobrança
                          </span>

                          <input
                            ref={(element) => {
                              campoPagamentoCobrancaAgendaRefs.current[
                                cobranca.id
                              ] = element;
                            }}
                            type="date"
                            value={pagamentoCobranca[cobranca.id] ?? ""}
                            onChange={(event) => {
                              setPagamentoCobranca((atual) => ({
                                ...atual,
                                [cobranca.id]: event.target.value,
                              }));

                              setErroPagamentoCobranca((atual) => {
                                if (!atual[cobranca.id]) {
                                  return atual;
                                }

                                const proximo = { ...atual };
                                delete proximo[cobranca.id];
                                return proximo;
                              });
                            }}
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </label>

                        <button
                          type="button"
                          title="Baixar cobrança pela agenda"
                          onClick={() =>
                            void pagarCobranca(cobranca.id, "agenda")
                          }
                          disabled={acaoCobrancaId !== null}
                          className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {acaoCobrancaId === cobranca.id
                            ? "Baixando..."
                            : "Marcar como paga"}
                        </button>
                      </div>

                      {erroPagamentoCobranca[cobranca.id] ? (
                        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
                          {erroPagamentoCobranca[cobranca.id]}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}

              {cobrancasAgendaVencimentos.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-emerald-200 bg-white p-4 text-sm text-emerald-800">
                  Nenhuma cobrança pendente com vencimento registrado.
                </p>
              ) : null}
            </div>
          </article>

          <article className="h-fit self-start rounded-3xl border border-rose-100 bg-rose-50/60 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-rose-700">
                  Saídas previstas
                </p>

                <h4 className="mt-1 text-xl font-bold text-slate-950">
                  Despesas pendentes
                </h4>
              </div>

              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-rose-800 shadow-sm">
                {despesasAgendaVencimentos.length} prioridade(s)
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {despesasAgendaVencimentos.map((lancamento) => (
                <div
                  key={`agenda-despesa-${lancamento.id}`}
                  className="rounded-2xl border border-white bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-950">
                        {lancamento.descricao}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Categoria:{" "}
                        <strong>
                          {lancamento.categoria?.nome ?? "Não informada"}
                        </strong>
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Vencimento:{" "}
                        <strong>{formatarData(lancamento.vencimentoEm)}</strong>{" "}
                        • Valor:{" "}
                        <strong><span className="admin-financeiro-valor-nowrap">{formatarMoeda(lancamento.valor)}</span></strong>
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${classePrazoVencimento(
                        lancamento.vencimentoEm,
                      )}`}
                    >
                      {rotuloPrazoVencimento(lancamento.vencimentoEm)}
                    </span>
                  </div>

                  {podeGerirFinanceiro ? (
                    <div className="mt-4 grid gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <label className="grid gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                          Data do pagamento da despesa
                        </span>

                        <input
                          type="date"
                          value={pagamentoLancamento[lancamento.id] ?? ""}
                          onChange={(event) =>
                            setPagamentoLancamento((atual) => ({
                              ...atual,
                              [lancamento.id]: event.target.value,
                            }))
                          }
                          className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>

                      <button
                        type="button"
                        title="Baixar despesa pela agenda"
                        onClick={() => void pagarLancamento(lancamento.id)}
                        disabled={acaoLancamentoId !== null}
                        className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {acaoLancamentoId === lancamento.id
                          ? "Baixando..."
                          : "Marcar como paga"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}

              {despesasAgendaVencimentos.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-rose-200 bg-white p-4 text-sm text-rose-800">
                  Nenhuma despesa pendente com vencimento registrado.
                </p>
              ) : null}
            </div>
          </article>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Consolidação de atrasos
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Inadimplência por unidade
            </h3>

            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
              Veja quais unidades concentram cobranças vencidas em aberto, com
              valor consolidado e vencimento mais antigo.
            </p>
          </div>

          <span className="w-fit rounded-3xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">
            {inadimplenciaPorUnidade.length} unidade(s) em atraso
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <button
            type="button"
            onClick={() => aplicarOrdenacaoResumoInadimplencia("UNIDADE_AZ")}
            aria-label="Ordenar inadimplência por unidade em ordem alfabética"
            className={`rounded-3xl border border-orange-100 bg-orange-50 p-4 w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 ${ordenacaoInadimplenciaUnidade === "UNIDADE_AZ" ? "border-orange-300 ring-4 ring-orange-100 shadow-md" : ""}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-orange-700">
              Unidades em atraso
            </p>
            <p className="mt-2 text-2xl font-bold text-orange-950">
              {resumoInadimplenciaPorUnidade.totalUnidades}
            </p>
          </button>

          <button
            type="button"
            onClick={() => aplicarOrdenacaoResumoInadimplencia("MAIS_TITULOS")}
            aria-label="Ordenar inadimplência por maior quantidade de títulos"
            className={`rounded-3xl border border-rose-100 bg-rose-50 p-4 w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 ${ordenacaoInadimplenciaUnidade === "MAIS_TITULOS" ? "border-orange-300 ring-4 ring-orange-100 shadow-md" : ""}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-rose-700">
              Títulos vencidos
            </p>
            <p className="mt-2 text-2xl font-bold text-rose-950">
              {resumoInadimplenciaPorUnidade.totalTitulos}
            </p>
          </button>

          <button
            type="button"
            onClick={() => aplicarOrdenacaoResumoInadimplencia("MAIOR_VALOR")}
            aria-label="Ordenar inadimplência por maior valor vencido"
            className={`rounded-3xl border border-rose-100 bg-white p-4 w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 ${ordenacaoInadimplenciaUnidade === "MAIOR_VALOR" ? "border-orange-300 ring-4 ring-orange-100 shadow-md" : ""}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-rose-700">
              Total vencido
            </p>
            <p className="mt-2 text-xl font-bold text-rose-700">
              <span className="admin-financeiro-valor-nowrap">{formatarMoeda(resumoInadimplenciaPorUnidade.valorTotal)}</span>
            </p>
          </button>

          <button
            type="button"
            onClick={() => aplicarOrdenacaoResumoInadimplencia("MAIS_ANTIGO")}
            aria-label="Ordenar inadimplência por vencimento mais antigo"
            className={`rounded-3xl border border-amber-100 bg-amber-50 p-4 w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 ${ordenacaoInadimplenciaUnidade === "MAIS_ANTIGO" ? "border-orange-300 ring-4 ring-orange-100 shadow-md" : ""}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">
              Mais antigo
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-amber-950">
              {formatarData(resumoInadimplenciaPorUnidade.vencimentoMaisAntigo)}
            </p>
          </button>

          <button
            type="button"
            onClick={() => aplicarOrdenacaoResumoInadimplencia("MAIOR_VALOR")}
            aria-label="Ordenar inadimplência por maior valor vencido"
            className="rounded-3xl border border-slate-200 bg-slate-50 p-4 w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
              Média por unidade
            </p>
            <p className="mt-2 text-xl font-bold text-slate-950">
              <span className="admin-financeiro-valor-nowrap">{formatarMoeda(resumoInadimplenciaPorUnidade.mediaPorUnidade)}</span>
            </p>
          </button>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-950">
                Buscar inadimplência
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Filtre por unidade, número ou nome do morador.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                {inadimplenciaPorUnidadeFiltrada.length} de{" "}
                {inadimplenciaPorUnidade.length} unidade(s)
              </span>

              <span className="w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800 shadow-sm">
                Ordenação:{" "}
                {rotuloOrdenacaoInadimplenciaUnidade(
                  ordenacaoInadimplenciaUnidade,
                )}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(0,1fr)_240px_auto_auto_auto]">
            <input
              type="text"
              value={buscaInadimplenciaUnidade}
              onChange={(event) =>
                setBuscaInadimplenciaUnidade(event.target.value)
              }
              placeholder="Buscar por unidade, número ou morador"
              className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />

            <select
              value={ordenacaoInadimplenciaUnidade}
              onChange={(event) =>
                setOrdenacaoInadimplenciaUnidade(
                  event.target.value as
                    | "MAIOR_VALOR"
                    | "MENOR_VALOR"
                    | "MAIS_TITULOS"
                    | "MAIS_ANTIGO"
                    | "UNIDADE_AZ",
                )
              }
              title="Ordenar inadimplência"
              className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              <option value="MAIOR_VALOR">Maior valor vencido</option>
              <option value="MENOR_VALOR">Menor valor vencido</option>
              <option value="MAIS_TITULOS">Mais títulos</option>
              <option value="MAIS_ANTIGO">Vencimento mais antigo</option>
              <option value="UNIDADE_AZ">Unidade A-Z</option>
            </select>

            <button
              type="button"
              onClick={() => setBuscaInadimplenciaUnidade("")}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
            >
              Limpar busca
            </button>

            <button
              type="button"
              onClick={imprimirInadimplenciaPorUnidade}
              disabled={inadimplenciaPorUnidadeFiltrada.length === 0}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-orange-200 bg-white px-4 text-sm font-bold text-orange-800 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Imprimir
            </button>

            <button
              type="button"
              onClick={exportarInadimplenciaPorUnidadeCsv}
              disabled={inadimplenciaPorUnidadeFiltrada.length === 0}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        {inadimplenciaPorUnidadeDestaque.length === 0 ? (
          <p className="mt-5 rounded-3xl border border-dashed border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">
            {inadimplenciaPorUnidade.length === 0
              ? "Nenhuma unidade possui cobranças vencidas em aberto no momento."
              : "Nenhuma unidade inadimplente encontrada com a busca informada."}
          </p>
        ) : (
          <>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {inadimplenciaPorUnidadeDestaque.map((item) => (
                <article
                  key={item.unidadeId}
                  className="rounded-3xl border border-orange-100 bg-orange-50/50 p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-orange-700">
                        Unidade
                      </p>

                      <h4 className="mt-1 text-xl font-bold text-slate-950">
                        {item.identificador}
                      </h4>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Morador(es):{" "}
                        <strong>
                          {item.moradores.length > 0
                            ? item.moradores.join(", ")
                            : "Não vinculado"}
                        </strong>
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-800 shadow-sm">
                      {item.quantidadeTitulos} título(s)
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2 2xl:grid-cols-4">
                    <button
                      type="button"
                      onClick={() =>
                        abrirCobrancasDaUnidadeInadimplente(
                          item.identificador,
                          item.numero,
                        )
                      }
                      className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-orange-200 bg-white px-4 text-sm font-bold text-orange-800 transition hover:bg-orange-50"
                    >
                      Ver cobranças vencidas
                    </button>

                    <button
                      type="button"
                      onClick={() => copiarResumoInadimplenciaUnidade(item)}
                      className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                    >
                      Copiar resumo
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void copiarMensagemInadimplenciaUnidadeWhatsapp(item)
                      }
                      className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600"
                    >
                      Copiar mensagem
                    </button>

                    <button
                      type="button"
                      onClick={() => abrirWhatsappInadimplenciaUnidade(item)}
                      disabled={!telefoneWhatsappInadimplenciaUnidade(item)}
                      className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Abrir WhatsApp
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Valor vencido
                      </p>

                      <p className="mt-2 text-lg font-bold text-rose-700">
                        <span className="admin-financeiro-valor-nowrap">{formatarMoeda(item.valorTotal)}</span>
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Mais antigo
                      </p>

                      <p className="mt-2 text-lg font-bold text-slate-950">
                        {formatarData(item.vencimentoMaisAntigo)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {inadimplenciaPorUnidadeFiltrada.length >
            inadimplenciaPorUnidadeDestaque.length ? (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-slate-600">
                  Exibindo {inadimplenciaPorUnidadeDestaque.length} de{" "}
                  {inadimplenciaPorUnidadeFiltrada.length} unidade(s), conforme
                  ordenação aplicada.
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  {temMaisInadimplenciaPorUnidade ? (
                    <button
                      type="button"
                      onClick={() =>
                        setQuantidadeInadimplenciaUnidadeVisivel((atual) =>
                          Math.min(
                            atual + 6,
                            inadimplenciaPorUnidadeFiltrada.length,
                          ),
                        )
                      }
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      Ver mais 6
                    </button>
                  ) : null}

                  {quantidadeInadimplenciaUnidadeVisivel > 6 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setQuantidadeInadimplenciaUnidadeVisivel(6)
                      }
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                    >
                      Mostrar menos
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section
        id="cx-historico-financeiro-real"
        className="mt-6 rounded-[2rem] border border-orange-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Auditoria financeira
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Histórico financeiro
            </h3>

            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
              Últimas ações registradas no financeiro: pagamentos, cancelamentos
              e estornos.
            </p>
          </div>

          <span className="w-fit rounded-3xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">
            {historicosFinanceirosVisiveis.length} de{" "}
            {historicosFinanceirosFiltrados.length} filtrado(s)
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <button
            type="button"
            onClick={() => aplicarFiltroResumoHistoricoFinanceiro("TODAS")}
            aria-label="Ver todas as ações do histórico financeiro"
            className="rounded-3xl border border-slate-200 bg-slate-50 p-4 w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
              Total de ações
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {resumoHistoricoFinanceiro.total}
            </p>
          </button>

          <button
            type="button"
            onClick={() => aplicarFiltroResumoHistoricoFinanceiro("PAGAMENTO")}
            aria-label="Filtrar histórico financeiro por pagamentos"
            className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">
              Pagamentos
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-950">
              {resumoHistoricoFinanceiro.pagamentos}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              aplicarFiltroResumoHistoricoFinanceiro("CANCELAMENTO")
            }
            aria-label="Filtrar histórico financeiro por cancelamentos"
            className="rounded-3xl border border-rose-100 bg-rose-50 p-4 w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-rose-700">
              Cancelamentos
            </p>
            <p className="mt-2 text-2xl font-bold text-rose-950">
              {resumoHistoricoFinanceiro.cancelamentos}
            </p>
          </button>

          <button
            type="button"
            onClick={() => aplicarFiltroResumoHistoricoFinanceiro("ESTORNO")}
            aria-label="Filtrar histórico financeiro por estornos"
            className="rounded-3xl border border-amber-100 bg-amber-50 p-4 w-full cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">
              Estornos
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-950">
              {resumoHistoricoFinanceiro.estornos}
            </p>
          </button>

          <article className="rounded-3xl border border-orange-100 bg-orange-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-orange-700">
              Última ação
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-orange-950">
              {formatarDataHora(resumoHistoricoFinanceiro.ultimoRegistro)}
            </p>
          </article>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(320px,1fr)_190px_170px_170px_170px_auto_auto_auto]">
            <input
              type="text"
              value={buscaHistoricoFinanceiro}
              onChange={(event) =>
                setBuscaHistoricoFinanceiro(event.target.value)
              }
              placeholder="Buscar por ação, usuário, lançamento, cobrança ou unidade"
              className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />

            <select
              value={filtroAcaoHistoricoFinanceiro}
              onChange={(event) =>
                setFiltroAcaoHistoricoFinanceiro(
                  event.target.value as
                    | "TODAS"
                    | "PAGAMENTO"
                    | "CANCELAMENTO"
                    | "ESTORNO",
                )
              }
              className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              <option value="TODAS">Todas as ações</option>
              <option value="PAGAMENTO">Pagamentos</option>
              <option value="CANCELAMENTO">Cancelamentos</option>
              <option value="ESTORNO">Estornos</option>
            </select>

            <select
              value={ordenacaoHistoricoFinanceiro}
              onChange={(event) =>
                setOrdenacaoHistoricoFinanceiro(
                  event.target.value as "RECENTES" | "ANTIGOS",
                )
              }
              title="Ordenação do histórico"
              className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              <option value="RECENTES">Mais recentes</option>
              <option value="ANTIGOS">Mais antigos</option>
            </select>

            <input
              type="date"
              value={inicioHistoricoFinanceiro}
              onChange={(event) =>
                setInicioHistoricoFinanceiro(event.target.value)
              }
              title="Data inicial do histórico"
              className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />

            <input
              type="date"
              value={fimHistoricoFinanceiro}
              onChange={(event) =>
                setFimHistoricoFinanceiro(event.target.value)
              }
              title="Data final do histórico"
              className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />

            <button
              type="button"
              onClick={() => {
                setBuscaHistoricoFinanceiro("");
                setFiltroAcaoHistoricoFinanceiro("TODAS");
                setInicioHistoricoFinanceiro("");
                setFimHistoricoFinanceiro("");
                setOrdenacaoHistoricoFinanceiro("RECENTES");
              }}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
            >
              Limpar filtros
            </button>

            <button
              type="button"
              onClick={imprimirHistoricoFinanceiro}
              disabled={historicosFinanceirosFiltrados.length === 0}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-orange-200 bg-white px-4 text-sm font-bold text-orange-800 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Imprimir
            </button>

            <button
              type="button"
              onClick={exportarHistoricoFinanceiroCsv}
              disabled={historicosFinanceirosFiltrados.length === 0}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="mt-5 grid max-h-[720px] gap-3 overflow-y-auto pr-1">
          {historicosFinanceirosFiltrados.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-700">
              {historicosFinanceiros.length === 0
                ? "Nenhum histórico financeiro registrado até o momento."
                : "Nenhum histórico encontrado com os filtros aplicados."}
            </p>
          ) : (
            historicosFinanceirosVisiveis.map((historico) => (
              <article
                key={historico.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${classeAcaoHistoricoFinanceiro(
                        historico.acao,
                      )}`}
                    >
                      {rotuloAcaoHistoricoFinanceiro(historico.acao)}
                    </span>

                    <p className="mt-3 font-bold text-slate-950">
                      {historico.descricao}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Usuário:{" "}
                      <strong>
                        {historico.usuario?.nome ?? "Não informado"}
                      </strong>
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-slate-500">
                    {formatarDataHora(historico.criadoEm)}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {historico.lancamentoFinanceiro ? (
                    <div className="rounded-2xl border border-white bg-white p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                        Lançamento
                      </p>

                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {historico.lancamentoFinanceiro.descricao}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        <span className="admin-financeiro-valor-nowrap">{formatarMoeda(historico.lancamentoFinanceiro.valor)}</span> •{" "}
                        {rotuloStatusFinanceiro(
                          historico.lancamentoFinanceiro.status,
                        )}
                      </p>
                    </div>
                  ) : null}

                  {historico.cobrancaCondominial ? (
                    <div className="rounded-2xl border border-white bg-white p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                        Cobrança
                      </p>

                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {historico.cobrancaCondominial.descricao}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Unidade{" "}
                        {historico.cobrancaCondominial.unidade.identificador} •{" "}
                        <span className="admin-financeiro-valor-nowrap">{formatarMoeda(historico.cobrancaCondominial.valor)}</span> •{" "}
                        {rotuloStatusCobranca(
                          historico.cobrancaCondominial.status,
                        )}
                      </p>
                    </div>
                  ) : null}
                </div>

                {historico.detalhes ? (
                  <p className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600">
                    Detalhes: {historico.detalhes}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>

        {historicosFinanceirosFiltrados.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-600">
              Exibindo {historicosFinanceirosVisiveis.length} de{" "}
              {historicosFinanceirosFiltrados.length} registro(s) filtrado(s).
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
              {temMaisHistoricoFinanceiro ? (
                <button
                  type="button"
                  onClick={() =>
                    setQuantidadeHistoricoFinanceiroVisivel((atual) =>
                      Math.min(
                        atual + 10,
                        historicosFinanceirosFiltrados.length,
                      ),
                    )
                  }
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Ver mais 10
                </button>
              ) : null}

              {quantidadeHistoricoFinanceiroVisivel > 10 ? (
                <button
                  type="button"
                  onClick={() => setQuantidadeHistoricoFinanceiroVisivel(10)}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                >
                  Mostrar menos
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      {carregando ? (
        <section className="mt-6 flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700 shadow-sm">
          <LoaderCircle className="h-5 w-5 animate-spin text-orange-500" />
          Carregando dados financeiros...
        </section>
      ) : null}

      {erroCarregamento ? (
        <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
          <p className="text-sm font-bold">
            Não foi possível carregar os dados.
          </p>
          <p className="mt-2 text-sm leading-6">{erroCarregamento}</p>
          <button
            type="button"
            onClick={() => void carregarDados(condominioId)}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-2xl bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            <RefreshCcw className="h-4 w-4" />
            Tentar novamente
          </button>
        </section>
      ) : null}

      {erroAcao ? (
        <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800">
          {erroAcao}
        </section>
      ) : null}

      {mensagemSucesso ? (
        <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">
          {mensagemSucesso}
        </section>
      ) : null}

      {!podeGerirFinanceiro ? (
        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          Seu perfil não possui permissão de gestão financeira neste condomínio.
        </section>
      ) : null}

      <section className="mt-6 grid items-start gap-6 xl:grid-cols-3">
        <article className="self-start rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Categorias
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Nova categoria
          </h3>

          {podeGerirFinanceiro ? (
            <form onSubmit={criarCategoria} className="mt-5 grid gap-4">
              <input
                value={categoriaForm.nome}
                onChange={(event) =>
                  setCategoriaForm((atual) => ({
                    ...atual,
                    nome: event.target.value,
                  }))
                }
                placeholder="Nome da categoria"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                required
              />

              <select
                value={categoriaForm.tipo}
                onChange={(event) =>
                  setCategoriaForm((atual) => ({
                    ...atual,
                    tipo: event.target.value as TipoCategoriaFinanceiraAdmin,
                  }))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
                <option value="AMBOS">Ambos</option>
              </select>

              <input
                value={categoriaForm.descricao}
                onChange={(event) =>
                  setCategoriaForm((atual) => ({
                    ...atual,
                    descricao: event.target.value,
                  }))
                }
                placeholder="Descrição opcional"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <button
                type="submit"
                disabled={enviandoCategoria}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                <Tags className="h-4 w-4" />
                {enviandoCategoria ? "Salvando..." : "Cadastrar categoria"}
              </button>
            </form>
          ) : null}

          <div className="mt-6 grid gap-3">
            {categorias.map((categoria) => (
              <div
                key={categoria.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-bold text-slate-950">{categoria.nome}</p>

                    <p className="mt-1 text-sm text-slate-600">
                      {rotuloTipo(categoria.tipo)}
                    </p>

                    {categoria.descricao ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {categoria.descricao}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          categoria.ativo
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {categoria.ativo ? "Ativa" : "Inativa"}
                      </span>

                      {podeGerirFinanceiro ? (
                        <button
                          type="button"
                          onClick={() => void alterarStatusCategoria(categoria)}
                          disabled={acaoCategoriaId === categoria.id}
                          className={`inline-flex h-9 items-center justify-center rounded-2xl border px-3 text-xs font-bold transition disabled:opacity-60 ${
                            categoria.ativo
                              ? "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          }`}
                        >
                          {acaoCategoriaId === categoria.id
                            ? "Processando..."
                            : categoria.ativo
                              ? "Desativar"
                              : "Reativar"}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {podeGerirFinanceiro &&
                  editandoCategoriaId !== categoria.id ? (
                    <button
                      type="button"
                      onClick={() => abrirEdicaoCategoria(categoria)}
                      className="inline-flex h-10 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-semibold text-orange-800 transition hover:bg-orange-100"
                    >
                      Editar
                    </button>
                  ) : null}
                </div>

                {podeGerirFinanceiro && editandoCategoriaId === categoria.id ? (
                  <form
                    onSubmit={(event) =>
                      void salvarEdicaoCategoria(event, categoria.id)
                    }
                    className="mt-4 grid gap-3 rounded-3xl border border-orange-100 bg-white p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-bold text-slate-950">
                        Editar categoria financeira
                      </p>

                      <button
                        type="button"
                        onClick={cancelarEdicaoCategoria}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                      >
                        Fechar edição
                      </button>
                    </div>

                    <input
                      value={edicaoCategoriaForm.nome}
                      onChange={(event) =>
                        setEdicaoCategoriaForm((atual) => ({
                          ...atual,
                          nome: event.target.value,
                        }))
                      }
                      minLength={3}
                      maxLength={120}
                      required
                      placeholder="Nome da categoria"
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />

                    <select
                      value={edicaoCategoriaForm.tipo}
                      onChange={(event) =>
                        setEdicaoCategoriaForm((atual) => ({
                          ...atual,
                          tipo: event.target
                            .value as TipoCategoriaFinanceiraAdmin,
                        }))
                      }
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="RECEITA">Receita</option>
                      <option value="DESPESA">Despesa</option>
                      <option value="AMBOS">Ambos</option>
                    </select>

                    <input
                      value={edicaoCategoriaForm.descricao}
                      onChange={(event) =>
                        setEdicaoCategoriaForm((atual) => ({
                          ...atual,
                          descricao: event.target.value,
                        }))
                      }
                      maxLength={255}
                      placeholder="Descrição opcional"
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />

                    <button
                      type="submit"
                      disabled={salvandoEdicaoCategoria}
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
                    >
                      {salvandoEdicaoCategoria
                        ? "Salvando alterações..."
                        : "Salvar alterações da categoria"}
                    </button>
                  </form>
                ) : null}
              </div>
            ))}

            {categorias.length === 0 && !carregando ? (
              <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Nenhuma categoria cadastrada.
              </p>
            ) : null}
          </div>
        </article>

        <article className="self-start rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Lançamentos
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Novo lançamento
          </h3>

          {podeGerirFinanceiro ? (
            <form onSubmit={criarLancamento} className="mt-5 grid gap-4">
              <select
                value={lancamentoForm.tipo}
                onChange={(event) =>
                  setLancamentoForm((atual) => ({
                    ...atual,
                    tipo: event.target.value as TipoLancamentoFinanceiroAdmin,
                    categoriaId: "",
                  }))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
              </select>

              <select
                value={lancamentoForm.categoriaId}
                onChange={(event) =>
                  setLancamentoForm((atual) => ({
                    ...atual,
                    categoriaId: event.target.value,
                  }))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="">Categoria opcional</option>
                {categoriasLancamentoCompativeis.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>

              <input
                value={lancamentoForm.descricao}
                onChange={(event) =>
                  setLancamentoForm((atual) => ({
                    ...atual,
                    descricao: event.target.value,
                  }))
                }
                placeholder="Descrição"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                required
              />

              <input
                value={lancamentoForm.valor}
                onChange={(event) =>
                  setLancamentoForm((atual) => ({
                    ...atual,
                    valor: event.target.value.replace(",", "."),
                  }))
                }
                placeholder="Valor: 150.00"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                required
              />

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <label className="grid min-w-0 gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Competência
                  </span>
                  <input
                    type="date"
                    value={lancamentoForm.competenciaEm}
                    onChange={(event) =>
                      setLancamentoForm((atual) => ({
                        ...atual,
                        competenciaEm: event.target.value,
                      }))
                    }
                    className="h-12 w-full min-w-0 max-w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    required
                  />
                </label>

                <label className="grid min-w-0 gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Vencimento
                  </span>
                  <input
                    type="date"
                    value={lancamentoForm.vencimentoEm}
                    onChange={(event) =>
                      setLancamentoForm((atual) => ({
                        ...atual,
                        vencimentoEm: event.target.value,
                      }))
                    }
                    className="h-12 w-full min-w-0 max-w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>
              </div>

              <input
                value={lancamentoForm.observacoes}
                onChange={(event) =>
                  setLancamentoForm((atual) => ({
                    ...atual,
                    observacoes: event.target.value,
                  }))
                }
                placeholder="Observações"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <button
                type="submit"
                disabled={enviandoLancamento}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {enviandoLancamento ? "Salvando..." : "Cadastrar lançamento"}
              </button>
            </form>
          ) : null}
        </article>

        <article className="self-start rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Cobranças
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Nova cobrança
          </h3>

          {podeGerirFinanceiro ? (
            <form onSubmit={criarCobranca} className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  value={cobrancaForm.unidadeId}
                  onChange={(event) =>
                    setCobrancaForm((atual) => ({
                      ...atual,
                      unidadeId: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                >
                  <option value="">Unidade</option>
                  {unidades.map((unidade) => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.identificador}
                    </option>
                  ))}
                </select>

                <select
                  value={cobrancaForm.moradorId}
                  onChange={(event) =>
                    setCobrancaForm((atual) => ({
                      ...atual,
                      moradorId: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Morador opcional</option>
                  {moradores.map((morador) => (
                    <option key={morador.id} value={morador.id}>
                      {morador.nome}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={cobrancaForm.categoriaId}
                onChange={(event) =>
                  setCobrancaForm((atual) => ({
                    ...atual,
                    categoriaId: event.target.value,
                  }))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="">Categoria de receita opcional</option>
                {categoriasReceita.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>

              <input
                value={cobrancaForm.descricao}
                onChange={(event) =>
                  setCobrancaForm((atual) => ({
                    ...atual,
                    descricao: event.target.value,
                  }))
                }
                placeholder="Descrição"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                required
              />

              <input
                value={cobrancaForm.valor}
                onChange={(event) =>
                  setCobrancaForm((atual) => ({
                    ...atual,
                    valor: event.target.value.replace(",", "."),
                  }))
                }
                placeholder="Valor: 420.00"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                required
              />

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <label className="grid min-w-0 gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Competência
                  </span>
                  <input
                    type="date"
                    value={cobrancaForm.competenciaEm}
                    onChange={(event) =>
                      setCobrancaForm((atual) => ({
                        ...atual,
                        competenciaEm: event.target.value,
                      }))
                    }
                    className="h-12 w-full min-w-0 max-w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    required
                  />
                </label>

                <label className="grid min-w-0 gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Vencimento
                  </span>
                  <input
                    type="date"
                    value={cobrancaForm.vencimentoEm}
                    onChange={(event) =>
                      setCobrancaForm((atual) => ({
                        ...atual,
                        vencimentoEm: event.target.value,
                      }))
                    }
                    className="h-12 w-full min-w-0 max-w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    required
                  />
                </label>
              </div>

              <input
                value={cobrancaForm.observacoes}
                onChange={(event) =>
                  setCobrancaForm((atual) => ({
                    ...atual,
                    observacoes: event.target.value,
                  }))
                }
                placeholder="Observações"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <button
                type="submit"
                disabled={enviandoCobranca}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {enviandoCobranca ? "Salvando..." : "Cadastrar cobrança"}
              </button>
            </form>
          ) : null}
        </article>
      </section>

      <section className="mt-6 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Geração recorrente
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Cobranças em lote
            </h3>

            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
              Gere uma cobrança pendente para cada unidade ativa do condomínio.
              Unidades que já tiverem cobrança com a mesma descrição e
              competência serão ignoradas.
            </p>
          </div>

          <span className="w-fit rounded-3xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">
            Todas as unidades ativas
          </span>
        </div>

        {podeGerirFinanceiro ? (
          <form onSubmit={criarCobrancasLote} className="mt-5 grid gap-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <input
                value={cobrancasLoteForm.descricao}
                onChange={(event) =>
                  setCobrancasLoteForm((atual) => ({
                    ...atual,
                    descricao: event.target.value,
                  }))
                }
                placeholder="Descrição da cobrança em lote"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                required
              />

              <input
                value={cobrancasLoteForm.valor}
                onChange={(event) =>
                  setCobrancasLoteForm((atual) => ({
                    ...atual,
                    valor: event.target.value,
                  }))
                }
                placeholder="Valor, ex.: 420.00"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                required
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
              <select
                value={cobrancasLoteForm.categoriaId}
                onChange={(event) =>
                  setCobrancasLoteForm((atual) => ({
                    ...atual,
                    categoriaId: event.target.value,
                  }))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="">Categoria de receita opcional</option>
                {categoriasReceita.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Competência
                </span>
                <input
                  type="date"
                  value={cobrancasLoteForm.competenciaEm}
                  onChange={(event) =>
                    setCobrancasLoteForm((atual) => ({
                      ...atual,
                      competenciaEm: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Vencimento
                </span>
                <input
                  type="date"
                  value={cobrancasLoteForm.vencimentoEm}
                  onChange={(event) =>
                    setCobrancasLoteForm((atual) => ({
                      ...atual,
                      vencimentoEm: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                />
              </label>
            </div>

            <input
              value={cobrancasLoteForm.observacoes}
              onChange={(event) =>
                setCobrancasLoteForm((atual) => ({
                  ...atual,
                  observacoes: event.target.value,
                }))
              }
              placeholder="Observações opcionais"
              className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />

            <button
              type="submit"
              disabled={enviandoCobrancasLote}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              {enviandoCobrancasLote
                ? "Gerando cobranças..."
                : "Gerar cobranças para todas as unidades"}
            </button>
          </form>
        ) : null}
      </section>

      <section className="mt-6 grid items-start gap-6 xl:grid-cols-2">
        <article
          id="lancamentos-cadastrados"
          className="self-start rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 scroll-mt-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Lançamentos cadastrados
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Receitas e despesas
          </h3>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-950">
                  Filtrar lançamentos
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Localize receitas e despesas por descrição, categoria, status
                  ou vencimento.
                </p>
              </div>

              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                {lancamentosFiltrados.length} de {lancamentos.length}{" "}
                lançamento(s)
              </span>
            </div>

            <div className="mt-4 grid gap-3 2xl:grid-cols-[minmax(0,1fr)_160px_160px]">
              <input
                type="text"
                value={buscaLancamento}
                onChange={(event) => setBuscaLancamento(event.target.value)}
                placeholder="Buscar por lançamento, categoria ou observação"
                className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <select
                value={tipoFiltroLancamento}
                onChange={(event) =>
                  setTipoFiltroLancamento(
                    event.target.value as
                      | "TODOS"
                      | TipoLancamentoFinanceiroAdmin,
                  )
                }
                className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="TODOS">Todos os tipos</option>
                <option value="RECEITA">Receitas</option>
                <option value="DESPESA">Despesas</option>
              </select>

              <select
                value={statusFiltroLancamento}
                onChange={(event) =>
                  setStatusFiltroLancamento(
                    event.target.value as "TODOS" | StatusFinanceiroAdmin,
                  )
                }
                className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="TODOS">Todos os status</option>
                <option value="PENDENTE">Pendentes</option>
                <option value="PAGO">Pagos</option>
                <option value="CANCELADO">Cancelados</option>
              </select>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={somenteLancamentosVencidos}
                  onChange={(event) =>
                    setSomenteLancamentosVencidos(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                />
                Somente vencidos em aberto
              </label>

              <button
                type="button"
                onClick={() => {
                  setBuscaLancamento("");
                  setTipoFiltroLancamento("TODOS");
                  setStatusFiltroLancamento("TODOS");
                  setSomenteLancamentosVencidos(false);
                }}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
              >
                Limpar filtros
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {lancamentosFiltrados.map((lancamento) => (
              <div
                key={lancamento.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">
                      {lancamento.descricao}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {rotuloTipo(lancamento.tipo)} •{" "}
                      <span className="admin-financeiro-valor-nowrap">{formatarMoeda(lancamento.valor)}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Categoria: {lancamento.categoria?.nome ?? "Não informada"}
                    </p>
                  </div>

                  <FinanceiroStatusBadge status={lancamento.status} />
                </div>

                <p className="mt-3 text-xs font-semibold text-slate-500">
                  Competência: {formatarData(lancamento.competenciaEm)} •
                  Vencimento: {formatarData(lancamento.vencimentoEm)}
                  {lancamento.pagoEm
                    ? ` • Pago em: ${formatarData(lancamento.pagoEm)}`
                    : ""}
                </p>

                {lancamento.observacoes ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Observações: {lancamento.observacoes}
                  </p>
                ) : null}
                <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    Rastreabilidade do lançamento
                  </p>

                  <div className="mt-3 grid gap-2 text-sm text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-950">
                        Criado por:
                      </span>{" "}
                      {lancamento.criadoPorUsuario?.nome ?? "Não informado"}
                    </p>

                    {lancamento.status === "PAGO" ? (
                      <p>
                        <span className="font-semibold text-emerald-800">
                          Pago por:
                        </span>{" "}
                        {lancamento.pagoPorUsuario?.nome ?? "Não informado"}
                      </p>
                    ) : null}

                    {lancamento.status === "CANCELADO" ? (
                      <p>
                        <span className="font-semibold text-rose-800">
                          Cancelado por:
                        </span>{" "}
                        {lancamento.canceladoPorUsuario?.nome ??
                          "Não informado"}
                      </p>
                    ) : null}
                  </div>
                </div>
                {lancamento.status === "PAGO" && podeGerirFinanceiro ? (
                  <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4">
                    <button
                      type="button"
                      onClick={() =>
                        void estornarPagamentoLancamento(lancamento.id)
                      }
                      disabled={acaoLancamentoId !== null}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      {acaoLancamentoId === lancamento.id
                        ? "Desfazendo..."
                        : "Desfazer pagamento"}
                    </button>
                  </div>
                ) : null}

                {lancamento.status === "PENDENTE" && podeGerirFinanceiro ? (
                  <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
                    {editandoLancamentoId === lancamento.id ? (
                      <form
                        onSubmit={(event) =>
                          void salvarEdicaoLancamento(event, lancamento.id)
                        }
                        className="mb-4 grid gap-3 rounded-3xl border border-orange-100 bg-orange-50/60 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-bold text-slate-950">
                            Editar lançamento pendente
                          </p>

                          <button
                            type="button"
                            onClick={cancelarEdicaoLancamento}
                            className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                          >
                            Fechar edição
                          </button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <select
                            value={edicaoLancamentoForm.tipo}
                            onChange={(event) =>
                              setEdicaoLancamentoForm((atual) => ({
                                ...atual,
                                tipo: event.target
                                  .value as TipoLancamentoFinanceiroAdmin,
                                categoriaId: "",
                              }))
                            }
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          >
                            <option value="RECEITA">Receita</option>
                            <option value="DESPESA">Despesa</option>
                          </select>

                          <select
                            value={edicaoLancamentoForm.categoriaId}
                            onChange={(event) =>
                              setEdicaoLancamentoForm((atual) => ({
                                ...atual,
                                categoriaId: event.target.value,
                              }))
                            }
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          >
                            <option value="">Sem categoria</option>
                            {categorias
                              .filter(
                                (categoria) =>
                                  categoria.ativo &&
                                  (categoria.tipo === "AMBOS" ||
                                    categoria.tipo ===
                                      edicaoLancamentoForm.tipo),
                              )
                              .map((categoria) => (
                                <option key={categoria.id} value={categoria.id}>
                                  {categoria.nome}
                                </option>
                              ))}
                          </select>
                        </div>

                        <input
                          value={edicaoLancamentoForm.descricao}
                          onChange={(event) =>
                            setEdicaoLancamentoForm((atual) => ({
                              ...atual,
                              descricao: event.target.value,
                            }))
                          }
                          minLength={3}
                          maxLength={180}
                          required
                          placeholder="Descrição"
                          className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />

                        <div className="grid gap-3 md:grid-cols-3">
                          <input
                            value={edicaoLancamentoForm.valor}
                            onChange={(event) =>
                              setEdicaoLancamentoForm((atual) => ({
                                ...atual,
                                valor: event.target.value,
                              }))
                            }
                            required
                            placeholder="Valor"
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />

                          <input
                            type="date"
                            value={edicaoLancamentoForm.competenciaEm}
                            onChange={(event) =>
                              setEdicaoLancamentoForm((atual) => ({
                                ...atual,
                                competenciaEm: event.target.value,
                              }))
                            }
                            required
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />

                          <input
                            type="date"
                            value={edicaoLancamentoForm.vencimentoEm}
                            onChange={(event) =>
                              setEdicaoLancamentoForm((atual) => ({
                                ...atual,
                                vencimentoEm: event.target.value,
                              }))
                            }
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </div>

                        <input
                          value={edicaoLancamentoForm.observacoes}
                          onChange={(event) =>
                            setEdicaoLancamentoForm((atual) => ({
                              ...atual,
                              observacoes: event.target.value,
                            }))
                          }
                          maxLength={255}
                          placeholder="Observações"
                          className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />

                        <button
                          type="submit"
                          disabled={salvandoEdicaoLancamento}
                          className="inline-flex h-11 items-center justify-center rounded-2xl bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
                        >
                          {salvandoEdicaoLancamento
                            ? "Salvando alterações..."
                            : "Salvar alterações do lançamento"}
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => abrirEdicaoLancamento(lancamento)}
                        className="mb-4 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-semibold text-orange-800 transition hover:bg-orange-100"
                      >
                        Editar lançamento pendente
                      </button>
                    )}
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                        Data do pagamento do lançamento
                      </span>
                      <input
                        type="date"
                        value={pagamentoLancamento[lancamento.id] ?? ""}
                        onChange={(event) =>
                          setPagamentoLancamento((atual) => ({
                            ...atual,
                            [lancamento.id]: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => void pagarLancamento(lancamento.id)}
                      disabled={acaoLancamentoId === lancamento.id}
                      className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Marcar como pago
                    </button>
                    <input
                      ref={(element) => {
                        campoCancelamentoLancamentoRefs.current[lancamento.id] =
                          element;
                      }}
                      value={cancelamentoLancamento[lancamento.id] ?? ""}
                      onChange={(event) => {
                        setCancelamentoLancamento((atual) => ({
                          ...atual,
                          [lancamento.id]: event.target.value,
                        }));

                        setErroCancelamentoLancamento((atual) => {
                          if (!atual[lancamento.id]) {
                            return atual;
                          }

                          const proximo = { ...atual };
                          delete proximo[lancamento.id];
                          return proximo;
                        });
                      }}
                      placeholder="Motivo do cancelamento"
                      className="mt-3 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />

                    {erroCancelamentoLancamento[lancamento.id] ? (
                      <p className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
                        {erroCancelamentoLancamento[lancamento.id]}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void cancelarLancamento(lancamento.id)}
                      disabled={acaoLancamentoId === lancamento.id}
                      className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      <Ban className="h-4 w-4" />
                      Cancelar lançamento
                    </button>
                  </div>
                ) : null}
              </div>
            ))}

            {lancamentosFiltrados.length === 0 && !carregando ? (
              <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                {lancamentos.length === 0
                  ? "Nenhum lançamento financeiro cadastrado."
                  : "Nenhum lançamento encontrado com os filtros aplicados."}
              </p>
            ) : null}
          </div>
        </article>

        <article
          id="cobrancas-cadastradas"
          className="self-start rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 scroll-mt-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Cobranças cadastradas
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Controle condominial
          </h3>

              <div
                data-hotfix-comprovantes-controle="true"
                className="mt-4 rounded-3xl border border-sky-100 bg-sky-50 p-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSomenteComprovantesPendentes((valorAtual) => !valorAtual);
                    setSomenteCobrancasVencidas(false);
                    setStatusFiltroCobranca("TODAS");
                  }}
                  className={[
                    "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition",
                    somenteComprovantesPendentes
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-sky-200 bg-white text-sky-900 hover:bg-sky-100",
                  ].join(" ")}
                >
                  <span>
                    {somenteComprovantesPendentes
                      ? "Exibindo comprovantes pendentes"
                      : "Filtrar comprovantes pendentes"}
                  </span>

                  <span
                    className={[
                      "rounded-full px-2.5 py-1 text-xs font-bold",
                      somenteComprovantesPendentes
                        ? "bg-white/20 text-white"
                        : "bg-sky-100 text-sky-800",
                    ].join(" ")}
                  >
                    {totalComprovantesPendentesAnalise}
                  </span>
                </button>
              </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-950">
                  Filtrar cobranças
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Localize títulos por descrição, unidade, morador, status ou
                  vencimento.
                </p>
              </div>

              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                {cobrancasFiltradas.length} de {cobrancas.length} cobrança(s)
                {somenteComprovantesPendentes ? " • comprovantes pendentes" : ""}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setSomenteComprovantesPendentes((valorAtual) => !valorAtual);
                setSomenteCobrancasVencidas(false);
                setStatusFiltroCobranca("TODAS");
              }}
              className={[
                "mt-4 flex w-full flex-col gap-3 rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:justify-between",
                somenteComprovantesPendentes
                  ? "border-orange-400 bg-orange-500 text-white shadow-sm shadow-orange-100"
                  : "border-sky-100 bg-sky-50 text-sky-950",
              ].join(" ")}
            >
              <div>
                <p
                  className={[
                    "text-[11px] font-bold uppercase tracking-[0.08em]",
                    somenteComprovantesPendentes ? "text-white/90" : "text-sky-700",
                  ].join(" ")}
                >
                  Análise financeira
                </p>
                <p className="mt-1 text-base font-bold">
                  Comprovantes pendentes de análise
                </p>
                <p
                  className={[
                    "mt-1 text-sm font-medium",
                    somenteComprovantesPendentes ? "text-white/85" : "text-sky-800",
                  ].join(" ")}
                >
                  Clique para ver somente cobranças pendentes com comprovante enviado.
                </p>
              </div>

              <span
                className={[
                  "inline-flex h-12 min-w-12 items-center justify-center rounded-2xl px-4 text-lg font-bold",
                  somenteComprovantesPendentes
                    ? "bg-white/20 text-white"
                    : "bg-white text-sky-900 shadow-sm",
                ].join(" ")}
              >
                {totalComprovantesPendentesAnalise > 99
                  ? "99+"
                  : totalComprovantesPendentesAnalise}
              </span>
            </button>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <input
                type="text"
                value={buscaCobranca}
                onChange={(event) => setBuscaCobranca(event.target.value)}
                placeholder="Buscar por cobrança, unidade ou morador"
                className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <select
                value={statusFiltroCobranca}
                onChange={(event) =>
                  setStatusFiltroCobranca(
                    event.target.value as "TODAS" | StatusCobrancaAdmin,
                  )
                }
                className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="TODAS">Todos os status</option>
                <option value="PENDENTE">Pendentes</option>
                <option value="PAGO">Pagas</option>
                <option value="CANCELADA">Canceladas</option>
              </select>
            </div>

            <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <label className="inline-flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm">
                  <input
                    type="checkbox"
                    checked={somenteCobrancasVencidas}
                    onChange={(event) => {
                      setSomenteCobrancasVencidas(event.target.checked);
                      if (event.target.checked) {
                        setSomenteComprovantesPendentes(false);
                      }
                    }}
                    className="shrink-0 rounded-lg border-2 border-slate-300 text-orange-500 accent-orange-500 focus:ring-4 focus:ring-orange-100 h-6 w-6 min-h-6 min-w-6 shrink-0 accent-orange-500"
                  />
                  <span>Somente vencidas em aberto</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setSomenteComprovantesPendentes((valorAtual) => !valorAtual);
                    setSomenteCobrancasVencidas(false);
                    setStatusFiltroCobranca("TODAS");
                  }}
                  className={[
                    "inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-4 text-center text-sm font-bold leading-tight transition",
                    somenteComprovantesPendentes
                      ? "border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-100"
                      : "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
                  ].join(" ")}
                >
                  <span>
                    {somenteComprovantesPendentes
                      ? "Comprovantes filtrados"
                      : "Filtrar comprovantes pendentes"}
                  </span>

                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      somenteComprovantesPendentes
                        ? "bg-white/20 text-white"
                        : "bg-white text-sky-800",
                    ].join(" ")}
                  >
                    {totalComprovantesPendentesAnalise > 99
                      ? "99+"
                      : totalComprovantesPendentesAnalise}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBuscaCobranca("");
                  setStatusFiltroCobranca("TODAS");
                  setSomenteCobrancasVencidas(false);
                  setSomenteComprovantesPendentes(false);
                }}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700 xl:w-auto"
              >
                Limpar filtros
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {cobrancasFiltradas.map((cobranca) => (
              <div
                key={cobranca.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">
                      {cobranca.descricao}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {cobranca.unidade.identificador} •{" "}
                      <span className="admin-financeiro-valor-nowrap">{formatarMoeda(cobranca.valor)}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Morador: {cobranca.morador?.nome ?? "Não informado"}
                    </p>
                  </div>

                  <CobrancaStatusBadge status={cobranca.status} />
                </div>

                <p className="mt-3 text-xs font-semibold text-slate-500">
                  Competência: {formatarData(cobranca.competenciaEm)} •
                  Vencimento: {formatarData(cobranca.vencimentoEm)}
                  {cobranca.pagoEm
                    ? ` • Pago em: ${formatarData(cobranca.pagoEm)}`
                    : ""}
                </p>

                {cobranca.observacoes ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Observações: {cobranca.observacoes}
                  </p>
                ) : null}
                {cobranca.comprovanteStatus ? (
                  <div
                    className="admin-financeiro-comprovante mt-4 rounded-3xl border border-orange-100 bg-orange-50 p-4"
                    data-admin-financeiro-comprovante="true"
                  >
                    <div className="grid gap-4">
                      <div className="min-w-0">
                        <p
                          className="admin-financeiro-comprovante-label text-xs font-bold uppercase tracking-[0.08em] text-orange-700"
                          data-admin-financeiro-comprovante-label="true"
                        >
                          Comprovante de pagamento
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-orange-950">
                          {cobranca.comprovanteStatus === "ENVIADO"
                            ? "Aguardando análise"
                            : cobranca.comprovanteStatus === "APROVADO"
                              ? "Aprovado"
                              : "Recusado"}
                          {cobranca.comprovanteEnviadoEm
                            ? ` • Enviado em ${formatarDataHora(cobranca.comprovanteEnviadoEm)}`
                            : ""}
                        </p>
                        {cobranca.comprovanteObservacao ? (
                          <p className="mt-2 text-sm leading-6 text-orange-900">
                            Observação do morador: {cobranca.comprovanteObservacao}
                          </p>
                        ) : null}
                        {cobranca.comprovanteMotivoRecusa ? (
                          <p className="mt-2 text-sm font-semibold leading-6 text-rose-700">
                            Motivo da recusa: {cobranca.comprovanteMotivoRecusa}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid w-full gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => void abrirComprovanteCobranca(cobranca.id)}
                          disabled={acaoCobrancaId === cobranca.id}
                          className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-orange-200 bg-white px-4 py-2 text-sm font-bold text-orange-800 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {acaoCobrancaId === cobranca.id
                            ? "Carregando..."
                            : "Ver comprovante"}
                        </button>

                        {cobranca.comprovanteStatus === "ENVIADO" &&
                        cobranca.status === "PENDENTE" &&
                        podeGerirFinanceiro ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void aprovarComprovanteCobranca(cobranca.id)}
                              disabled={acaoCobrancaId === cobranca.id}
                              className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                              Aprovar e marcar como paga
                            </button>

                            <button
                              type="button"
                              onClick={() => void recusarComprovanteCobranca(cobranca.id)}
                              disabled={acaoCobrancaId === cobranca.id}
                              className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                            >
                              Recusar comprovante
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    Rastreabilidade da cobrança
                  </p>

                  <div className="mt-3 grid gap-2 text-sm text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-950">
                        Criada por:
                      </span>{" "}
                      {cobranca.criadoPorUsuario?.nome ?? "Não informado"}
                    </p>

                    {cobranca.status === "PAGO" ? (
                      <p>
                        <span className="font-semibold text-emerald-800">
                          Paga por:
                        </span>{" "}
                        {cobranca.pagoPorUsuario?.nome ?? "Não informado"}
                      </p>
                    ) : null}

                    {cobranca.status === "CANCELADA" ? (
                      <p>
                        <span className="font-semibold text-rose-800">
                          Cancelada por:
                        </span>{" "}
                        {cobranca.canceladoPorUsuario?.nome ?? "Não informado"}
                      </p>
                    ) : null}
                  </div>
                </div>
                {cobranca.status === "PAGO" && podeGerirFinanceiro ? (
                  <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => imprimirReciboCobranca(cobranca)}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700"
                      >
                        <Printer className="h-4 w-4" />
                        Imprimir recibo
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void estornarPagamentoCobranca(cobranca.id)
                        }
                        disabled={acaoCobrancaId !== null}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        {acaoCobrancaId === cobranca.id
                          ? "Desfazendo..."
                          : "Desfazer pagamento"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {cobranca.status === "PENDENTE" && podeGerirFinanceiro ? (
                  <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="mb-4 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => void copiarMensagemCobrancaWhatsapp(cobranca)}
                        className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-800 transition hover:bg-orange-100"
                      >
                        Copiar mensagem
                      </button>

                      <button
                        type="button"
                        onClick={() => abrirWhatsappCobranca(cobranca)}
                        disabled={!telefoneWhatsappNormalizado(cobranca.morador?.telefone)}
                        className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Abrir WhatsApp
                      </button>
                    </div>

                    {editandoCobrancaId === cobranca.id ? (
                      <form
                        onSubmit={(event) =>
                          void salvarEdicaoCobranca(event, cobranca.id)
                        }
                        className="mb-4 grid gap-3 rounded-3xl border border-orange-100 bg-orange-50/60 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-bold text-slate-950">
                            Editar cobrança pendente
                          </p>

                          <button
                            type="button"
                            onClick={cancelarEdicaoCobranca}
                            className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                          >
                            Fechar edição
                          </button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <select
                            value={edicaoCobrancaForm.unidadeId}
                            onChange={(event) =>
                              setEdicaoCobrancaForm((atual) => ({
                                ...atual,
                                unidadeId: event.target.value,
                              }))
                            }
                            required
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          >
                            <option value="">Selecione a unidade</option>
                            {unidades.map((unidade) => (
                              <option key={unidade.id} value={unidade.id}>
                                {unidade.identificador}
                              </option>
                            ))}
                          </select>

                          <select
                            value={edicaoCobrancaForm.moradorId}
                            onChange={(event) =>
                              setEdicaoCobrancaForm((atual) => ({
                                ...atual,
                                moradorId: event.target.value,
                              }))
                            }
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          >
                            <option value="">Sem morador vinculado</option>
                            {moradores.map((morador) => (
                              <option key={morador.id} value={morador.id}>
                                {morador.nome}
                              </option>
                            ))}
                          </select>
                        </div>

                        <input
                          value={edicaoCobrancaForm.descricao}
                          onChange={(event) =>
                            setEdicaoCobrancaForm((atual) => ({
                              ...atual,
                              descricao: event.target.value,
                            }))
                          }
                          minLength={3}
                          maxLength={180}
                          required
                          placeholder="Descrição"
                          className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />

                        <div className="grid gap-3 md:grid-cols-3">
                          <input
                            value={edicaoCobrancaForm.valor}
                            onChange={(event) =>
                              setEdicaoCobrancaForm((atual) => ({
                                ...atual,
                                valor: event.target.value,
                              }))
                            }
                            required
                            placeholder="Valor"
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />

                          <input
                            type="date"
                            value={edicaoCobrancaForm.competenciaEm}
                            onChange={(event) =>
                              setEdicaoCobrancaForm((atual) => ({
                                ...atual,
                                competenciaEm: event.target.value,
                              }))
                            }
                            required
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />

                          <input
                            type="date"
                            value={edicaoCobrancaForm.vencimentoEm}
                            onChange={(event) =>
                              setEdicaoCobrancaForm((atual) => ({
                                ...atual,
                                vencimentoEm: event.target.value,
                              }))
                            }
                            required
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </div>

                        <input
                          value={edicaoCobrancaForm.observacoes}
                          onChange={(event) =>
                            setEdicaoCobrancaForm((atual) => ({
                              ...atual,
                              observacoes: event.target.value,
                            }))
                          }
                          maxLength={255}
                          placeholder="Observações"
                          className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />

                        <button
                          type="submit"
                          disabled={salvandoEdicaoCobranca}
                          className="inline-flex h-11 items-center justify-center rounded-2xl bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
                        >
                          {salvandoEdicaoCobranca
                            ? "Salvando alterações..."
                            : "Salvar alterações da cobrança"}
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => abrirEdicaoCobranca(cobranca)}
                        className="mb-4 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-semibold text-orange-800 transition hover:bg-orange-100"
                      >
                        Editar cobrança pendente
                      </button>
                    )}
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                        Data do pagamento da cobrança
                      </span>
                      <input
                        type="date"
                        ref={(element) => {
                          campoPagamentoCobrancaRefs.current[cobranca.id] =
                            element;
                        }}
                        value={pagamentoCobranca[cobranca.id] ?? ""}
                        onChange={(event) => {
                          setPagamentoCobranca((atual) => ({
                            ...atual,
                            [cobranca.id]: event.target.value,
                          }));

                          setErroPagamentoCobranca((atual) => {
                            if (!atual[cobranca.id]) {
                              return atual;
                            }

                            const proximo = { ...atual };
                            delete proximo[cobranca.id];
                            return proximo;
                          });
                        }}
                        className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </label>

                    {erroPagamentoCobranca[cobranca.id] ? (
                      <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
                        {erroPagamentoCobranca[cobranca.id]}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void pagarCobranca(cobranca.id)}
                      disabled={acaoCobrancaId === cobranca.id}
                      className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Marcar como paga
                    </button>
                    <input
                      ref={(element) => {
                        campoCancelamentoCobrancaRefs.current[cobranca.id] =
                          element;
                      }}
                      value={cancelamentoCobranca[cobranca.id] ?? ""}
                      onChange={(event) => {
                        setCancelamentoCobranca((atual) => ({
                          ...atual,
                          [cobranca.id]: event.target.value,
                        }));

                        setErroCancelamentoCobranca((atual) => {
                          if (!atual[cobranca.id]) {
                            return atual;
                          }

                          const proximo = { ...atual };
                          delete proximo[cobranca.id];
                          return proximo;
                        });
                      }}
                      placeholder="Motivo do cancelamento"
                      className="mt-3 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />

                    {erroCancelamentoCobranca[cobranca.id] ? (
                      <p className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
                        {erroCancelamentoCobranca[cobranca.id]}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void cancelarCobranca(cobranca.id)}
                      disabled={acaoCobrancaId === cobranca.id}
                      className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      <Ban className="h-4 w-4" />
                      Cancelar cobrança
                    </button>
                  </div>
                ) : null}
              </div>
            ))}

            {cobrancasFiltradas.length === 0 && !carregando ? (
              <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                {cobrancas.length === 0
                  ? "Nenhuma cobrança condominial cadastrada."
                  : somenteComprovantesPendentes
                    ? "Nenhum comprovante pendente de análise."
                    : "Nenhuma cobrança encontrada com os filtros aplicados."}
              </p>
            ) : null}
          </div>
        </article>
      </section>

      <section
        id="relatorio-financeiro-competencia-impressao"
        className="hidden bg-white text-slate-950"
      >
        <style>{`
          #relatorio-financeiro-competencia-impressao {
            display: none;
          }

          @media print {
            body * {
              visibility: hidden !important;
            }

            #relatorio-financeiro-competencia-impressao,
            #relatorio-financeiro-competencia-impressao * {
              visibility: visible !important;
            }

            #relatorio-financeiro-competencia-impressao {
              display: block !important;
              position: absolute;
              inset: 0;
              width: 100%;
              min-height: 100vh;
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              color: #0f172a !important;
            }

            #relatorio-financeiro-competencia-impressao .quebra-evitar {
              break-inside: avoid;
            }
          }
        `}</style>

        <div className="mx-auto max-w-5xl bg-white">
          <header className="border-b border-slate-300 pb-6">
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-700">
              Condominaria Express
            </p>

            <h1 className="mt-3 text-3xl font-bold text-slate-950">
              Relatório Financeiro da Competência
            </h1>

            <p className="mt-3 text-sm text-slate-600">
              Documento administrativo para acompanhamento do período
              selecionado.
            </p>
          </header>

          <section className="quebra-evitar mt-6 rounded-3xl border border-slate-300 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Condomínio
                </p>
                <p className="mt-2 text-lg font-bold text-slate-950">
                  {condominioSelecionado?.condominio.nome ??
                    "Condomínio não identificado"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Período
                </p>
                <p className="mt-2 text-lg font-bold text-slate-950">
                  {formatarData(dataIsoInicioDoDia(periodoInicio))} a{" "}
                  {formatarData(dataIsoFinalDoDia(periodoFim))}
                </p>
              </div>
            </div>
          </section>

          <section className="quebra-evitar mt-6 rounded-3xl border border-slate-300 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
              Resultado financeiro da competência
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Receita prevista
                </p>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.receitaPrevista)}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Receita recebida
                </p>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.receitaPaga)}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Despesa lançada
                </p>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.despesaLancada)}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Despesa paga
                </p>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.despesaPaga)}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Saldo previsto
                </p>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.saldoPrevisto)}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Saldo realizado
                </p>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.saldoPago)}</span>
                </p>
              </div>
            </div>
          </section>

          <section className="quebra-evitar mt-6 rounded-3xl border border-slate-300 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
              Cobranças e inadimplência
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Cobranças pendentes
                </p>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.cobrancasPendentes)}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Valor vencido
                </p>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  <span className="admin-financeiro-valor-nowrap">{formatarMoeda(totaisResumo.vencidasPendentes)}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Taxa de inadimplência
                </p>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  {formatarPercentualBR(totaisResumo.taxaInadimplenciaPeriodo)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Títulos vencidos
                </p>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  {totaisResumo.quantidadeVencidas}
                </p>
              </div>
            </div>
          </section>

          <section className="quebra-evitar mt-6 rounded-3xl border border-slate-300 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
              Desempenho por categoria
            </p>

            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Receitas</h2>

                <div className="mt-3 grid gap-3">
                  {categoriasResumoReceitas.map((categoria) => (
                    <div
                      key={
                        "impressao-receita-" +
                        (categoria.categoriaId ?? "sem-categoria")
                      }
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <p className="font-bold text-slate-950">
                        {categoria.nome}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Previsto: <span className="admin-financeiro-valor-nowrap">{formatarMoeda(categoria.valorPrevisto)}</span> •
                        Recebido: <span className="admin-financeiro-valor-nowrap">{formatarMoeda(categoria.valorPago)}</span>
                      </p>
                    </div>
                  ))}

                  {categoriasResumoReceitas.length === 0 ? (
                    <p className="text-sm text-slate-600">
                      Nenhuma receita classificada no período.
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-950">Despesas</h2>

                <div className="mt-3 grid gap-3">
                  {categoriasResumoDespesas.map((categoria) => (
                    <div
                      key={
                        "impressao-despesa-" +
                        (categoria.categoriaId ?? "sem-categoria")
                      }
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <p className="font-bold text-slate-950">
                        {categoria.nome}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Lançado: <span className="admin-financeiro-valor-nowrap">{formatarMoeda(categoria.valorPrevisto)}</span> •
                        Pago: <span className="admin-financeiro-valor-nowrap">{formatarMoeda(categoria.valorPago)}</span>
                      </p>
                    </div>
                  ))}

                  {categoriasResumoDespesas.length === 0 ? (
                    <p className="text-sm text-slate-600">
                      Nenhuma despesa classificada no período.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-300 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
              Inadimplência por unidade
            </p>

            <div className="mt-4 grid gap-3">
              {inadimplenciaPorUnidade.map((item) => (
                <div
                  key={"impressao-unidade-" + item.unidadeId}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">
                        {item.identificador}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Morador(es):{" "}
                        {item.moradores.length > 0
                          ? item.moradores.join(", ")
                          : "Não vinculado"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-slate-950">
                        <span className="admin-financeiro-valor-nowrap">{formatarMoeda(item.valorTotal)}</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.quantidadeTitulos} título(s)
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {inadimplenciaPorUnidade.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Nenhuma unidade possui cobrança vencida em aberto.
                </p>
              ) : null}
            </div>
          </section>

          <footer className="mt-8 border-t border-slate-300 pt-4 text-xs text-slate-500">
            Relatório gerado pelo módulo Financeiro Administrativo da
            Condominaria Express.
          </footer>
        </div>
      </section>
    </AdminShell>
  );
}
