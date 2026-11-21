import {
  CalendarClock,
  CheckCircle2,
  CirclePlay,
  Gavel,
  Link2,
  LoaderCircle,
  MapPinned,
  Search,
  ScrollText,
  Vote,
  Printer,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Pagination } from '../components/shared/Pagination';
import { PageHeader } from '../components/PageHeader';
import { PageSkeleton } from '../components/PageSkeleton';
import { usePortal } from '../context/PortalContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { apiRequest, ApiError } from '../lib/api';
import { obterMoradorAtivo } from '../lib/portal';


import type {
  AtaResumoAssembleiaPortal,
  AssembleiaPortal,
  ModalidadeAssembleiaPortal,
  PortalMoradorMeResponse,
  ResultadoVotacaoPortal,
  StatusAssembleiaPortal,
  StatusPautaAssembleiaPortal,
  StatusVotacaoPautaPortal,
} from '../types/api';

type PaginacaoState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const LIMITE_POR_PAGINA = 10;

function paginacaoInicial(): PaginacaoState {
  return {
    page: 1,
    limit: LIMITE_POR_PAGINA,
    total: 0,
    totalPages: 1,
  };
}

type EstadoPagina = {
  carregando: boolean;
  erro: string;
  contexto: PortalMoradorMeResponse | null;
  assembleias: AssembleiaPortal[];
};

type AssembleiasApiResponse =
  | AssembleiaPortal[]
  | {
      items?: AssembleiaPortal[];
      data?: AssembleiaPortal[];
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    };

type EstadoResultadoVotacao = {
  carregando: boolean;
  erro: string;
  resultado: ResultadoVotacaoPortal | null;
};

type EstadoAtaResumoAssembleia = {
  carregando: boolean;
  erro: string;
  aberto: boolean;
  dados: AtaResumoAssembleiaPortal | null;
};

type FiltrosAssembleias = {
  busca: string;
  situacao:
    | 'TODAS'
    | 'CONVOCADAS'
    | 'EM_ANDAMENTO'
    | 'ENCERRADAS';
  ordem: 'RECENTES' | 'ANTIGAS';
};

const filtrosIniciais: FiltrosAssembleias = {
  busca: '',
  situacao: 'TODAS',
  ordem: 'RECENTES',
};

function normalizarRespostaAssembleias(
  resposta: AssembleiasApiResponse,
): AssembleiaPortal[] {
  if (Array.isArray(resposta)) {
    return resposta;
  }

  if (Array.isArray(resposta.items)) {
    return resposta.items;
  }

  if (Array.isArray(resposta.data)) {
    return resposta.data;
  }

  return [];
}

function formatarDataHora(valor?: string | null) {
  if (!valor) {
    return 'Não informada';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
}

function normalizarBusca(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function rotuloModalidade(modalidade: ModalidadeAssembleiaPortal) {
  switch (modalidade) {
    case 'PRESENCIAL':
      return 'Presencial';
    case 'ONLINE':
      return 'Online';
    case 'HIBRIDA':
      return 'Híbrida';
    default:
      return modalidade;
  }
}

function rotuloStatusAssembleia(status: StatusAssembleiaPortal) {
  switch (status) {
    case 'CONVOCADA':
      return 'Convocada';
    case 'EM_ANDAMENTO':
      return 'Em andamento';
    case 'ENCERRADA':
      return 'Encerrada';
    default:
      return status;
  }
}

function classeStatusAssembleia(status: StatusAssembleiaPortal) {
  switch (status) {
    case 'CONVOCADA':
      return 'bg-sky-100 text-sky-800';
    case 'EM_ANDAMENTO':
      return 'bg-amber-100 text-amber-800';
    case 'ENCERRADA':
      return 'bg-emerald-100 text-emerald-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function rotuloStatusPauta(status: StatusPautaAssembleiaPortal) {
  switch (status) {
    case 'ABERTA':
      return 'Aberta';
    case 'DELIBERADA':
      return 'Deliberada';
    case 'CANCELADA':
      return 'Cancelada';
    default:
      return status;
  }
}

function classeStatusPauta(status: StatusPautaAssembleiaPortal) {
  switch (status) {
    case 'ABERTA':
      return 'bg-amber-100 text-amber-800';
    case 'DELIBERADA':
      return 'bg-emerald-100 text-emerald-800';
    case 'CANCELADA':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function rotuloStatusVotacao(status: StatusVotacaoPautaPortal) {
  switch (status) {
    case 'RASCUNHO':
      return 'Preparando votação';
    case 'ABERTA':
      return 'Votação aberta';
    case 'ENCERRADA':
      return 'Votação encerrada';
    case 'CANCELADA':
      return 'Votação cancelada';
    default:
      return status;
  }
}

function classeStatusVotacao(status: StatusVotacaoPautaPortal) {
  switch (status) {
    case 'RASCUNHO':
      return 'bg-slate-100 text-slate-700';
    case 'ABERTA':
      return 'bg-orange-100 text-orange-800';
    case 'ENCERRADA':
      return 'bg-emerald-100 text-emerald-800';
    case 'CANCELADA':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function mensagemErroAmigavel(mensagem: string) {
  const normalizada = mensagem.trim();
  const tecnica = normalizada.toLowerCase();

  if (!normalizada) {
    return 'Não foi possível carregar as informações das assembleias.';
  }

  if (
    tecnica.includes('internal server error') ||
    tecnica.includes('prisma') ||
    tecnica.includes('unknown column') ||
    tecnica.includes('cannot read properties')
  ) {
    return 'Não foi possível carregar as assembleias agora. A administração técnica já pode verificar o sistema.';
  }

  if (tecnica.includes('failed to fetch') || tecnica.includes('network')) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
  }

  return normalizada;
}

function AssembleiaStatusBadge({
  status,
}: {
  status: StatusAssembleiaPortal;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${classeStatusAssembleia(
        status,
      )}`}
    >
      {rotuloStatusAssembleia(status)}
    </span>
  );
}

function ModalidadeBadge({
  modalidade,
}: {
  modalidade: ModalidadeAssembleiaPortal;
}) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      {rotuloModalidade(modalidade)}
    </span>
  );
}

function PautaStatusBadge({
  status,
}: {
  status: StatusPautaAssembleiaPortal;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${classeStatusPauta(
        status,
      )}`}
    >
      {rotuloStatusPauta(status)}
    </span>
  );
}

function VotacaoStatusBadge({
  status,
}: {
  status: StatusVotacaoPautaPortal;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${classeStatusVotacao(
        status,
      )}`}
    >
      {rotuloStatusVotacao(status)}
    </span>
  );
}

function ResumoAssembleiaCard({
  titulo,
  valor,
  descricao,
  icon,
  destaque = 'slate',
}: {
  titulo: string;
  valor: number;
  descricao: string;
  icon: ReactNode;
  destaque?: 'slate' | 'orange' | 'sky' | 'amber' | 'emerald';
}) {
  const variantes = {
    slate: 'border-slate-200 bg-white text-slate-600',
    orange: 'border-orange-200 bg-orange-50/60 text-orange-700',
    sky: 'border-sky-200 bg-sky-50/60 text-sky-700',
    amber: 'border-amber-200 bg-amber-50/60 text-amber-700',
    emerald: 'border-emerald-200 bg-emerald-50/60 text-emerald-700',
  } as const;

  return (
    <article className={`rounded-3xl border p-5 shadow-sm ${variantes[destaque]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-600">
            {titulo}
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-950">
            {valor}
          </p>
        </div>
        <div className="rounded-2xl bg-white/80 p-2 shadow-sm">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
        {descricao}
      </p>
    </article>
  );
}

export function AssembleiasPage() {
  usePageTitle('Assembleias');

  const [searchParams, setSearchParams] = useSearchParams();
  const [recarregarToken, setRecarregarToken] = useState(0);
  const [paginacao, setPaginacao] = useState<PaginacaoState>(paginacaoInicial());
  const [ultimaAtualizacao, setUltimaAtualizacao] =
    useState<Date | null>(null);

  const [filtros, setFiltros] =
    useState<FiltrosAssembleias>(filtrosIniciais);

  const [estado, setEstado] = useState<EstadoPagina>({
    carregando: true,
    erro: '',
    contexto: null,
    assembleias: [],
  });

  const [resultadosVotacoes, setResultadosVotacoes] =
    useState<Record<number, EstadoResultadoVotacao>>({});

  const [atasResumo, setAtasResumo] =
    useState<Record<number, EstadoAtaResumoAssembleia>>({});

  const {
    contexto,
    moradorAtivo: moradorContexto,
    carregando: carregandoPortal,
    erro: erroPortal,
  } = usePortal();

  useEffect(() => {
    const buscaParam = searchParams.get('busca') ?? '';
    const situacaoParam = searchParams.get('situacao');
    const ordemParam = searchParams.get('ordem');

    const situacao: FiltrosAssembleias['situacao'] =
      situacaoParam === 'CONVOCADAS' ||
      situacaoParam === 'EM_ANDAMENTO' ||
      situacaoParam === 'ENCERRADAS'
        ? situacaoParam
        : 'TODAS';

    const ordem: FiltrosAssembleias['ordem'] =
      ordemParam === 'ANTIGAS'
        ? 'ANTIGAS'
        : 'RECENTES';

    setFiltros({
      busca: buscaParam,
      situacao,
      ordem,
    });
  }, [searchParams]);

  function atualizarUrlFiltros(proximos: FiltrosAssembleias) {
    const params = new URLSearchParams();

    if (proximos.busca.trim()) {
      params.set('busca', proximos.busca.trim());
    }

    if (proximos.situacao !== 'TODAS') {
      params.set('situacao', proximos.situacao);
    }

    if (proximos.ordem !== 'RECENTES') {
      params.set('ordem', proximos.ordem);
    }

    setSearchParams(params, { replace: true });
  }

  function atualizarFiltros(
    parcial: Partial<FiltrosAssembleias>,
  ) {
    const proximos = {
      ...filtros,
      ...parcial,
    };
    setPaginacao((atual) => ({
      ...atual,
      page: 1,
    }));

    setFiltros(proximos);
    atualizarUrlFiltros(proximos);
  }

  function limparFiltros() {
    setPaginacao((atual) => ({
      ...atual,
      page: 1,
    }));
    setSearchParams({}, { replace: true });
  }

  useEffect(() => {
    async function carregarAssembleias() {
      if (carregandoPortal) {
        return;
      }

      if (erroPortal) {
        setEstado((atual) => ({
          ...atual,
          carregando: false,
          erro: erroPortal,
          contexto,
        }));
        return;
      }

      if (!contexto || !moradorContexto) {
        setEstado({
          carregando: false,
          erro: 'Nenhum perfil de morador disponível para o portal.',
          contexto: null,
          assembleias: [],
        });
        return;
      }

      setEstado((atual) => ({
        ...atual,
        carregando: true,
        erro: '',
        contexto,
      }));

      try {
        const resposta = await apiRequest<AssembleiasApiResponse>(
          `/portal-morador/condominios/${moradorContexto.condominioId}/assembleias`,
        );

        const assembleias = normalizarRespostaAssembleias(resposta);

        setEstado({
          carregando: false,
          erro: '',
          contexto,
          assembleias,
        });

        setUltimaAtualizacao(new Date());
      } catch (error) {
        const mensagem =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Não foi possível carregar as assembleias.';

        setEstado({
          carregando: false,
          erro: mensagem,
          contexto,
          assembleias: [],
        });
      }
    }

    void carregarAssembleias();
  }, [
    carregandoPortal,
    contexto,
    erroPortal,
    moradorContexto,
    recarregarToken,
  ]);

  const morador = estado.contexto
    ? obterMoradorAtivo(estado.contexto)
    : null;

  const assembleiasFiltradas = useMemo(() => {
    const busca = normalizarBusca(filtros.busca);

    return [...estado.assembleias]
      .filter((assembleia) => {
        if (
          filtros.situacao === 'CONVOCADAS' &&
          assembleia.status !== 'CONVOCADA'
        ) {
          return false;
        }

        if (
          filtros.situacao === 'EM_ANDAMENTO' &&
          assembleia.status !== 'EM_ANDAMENTO'
        ) {
          return false;
        }

        if (
          filtros.situacao === 'ENCERRADAS' &&
          assembleia.status !== 'ENCERRADA'
        ) {
          return false;
        }

        if (!busca) {
          return true;
        }

        const conteudo = normalizarBusca([
          assembleia.titulo,
          assembleia.descricao ?? '',
          assembleia.local ?? '',
          assembleia.linkOnline ?? '',
          rotuloModalidade(assembleia.modalidade),
          rotuloStatusAssembleia(assembleia.status),
          assembleia.pautas.map((pauta) => [
            pauta.titulo,
            pauta.descricao ?? '',
            pauta.deliberacao ?? '',
            pauta.votacao?.titulo ?? '',
          ].join(' ')).join(' '),
        ].join(' '));

        return conteudo.includes(busca);
      })
      .sort((a, b) => {
        const diferenca =
          new Date(b.primeiraChamadaEm).getTime() -
          new Date(a.primeiraChamadaEm).getTime();

        return filtros.ordem === 'ANTIGAS'
          ? -diferenca
          : diferenca;
      });
  }, [estado.assembleias, filtros]);

  const resumo = useMemo(() => {
    const convocadas = estado.assembleias.filter(
      (assembleia) => assembleia.status === 'CONVOCADA',
    ).length;

    const emAndamento = estado.assembleias.filter(
      (assembleia) => assembleia.status === 'EM_ANDAMENTO',
    ).length;

    const encerradas = estado.assembleias.filter(
      (assembleia) => assembleia.status === 'ENCERRADA',
    ).length;

    return {
      total: estado.assembleias.length,
      convocadas,
      emAndamento,
      encerradas,
    };
  }, [estado.assembleias]);

  async function carregarResultadoVotacao(
    assembleiaId: number,
    votacaoId: number,
  ) {
    if (!moradorContexto) {
      return;
    }

    setResultadosVotacoes((atual) => ({
      ...atual,
      [votacaoId]: {
        carregando: true,
        erro: '',
        resultado: atual[votacaoId]?.resultado ?? null,
      },
    }));

    try {
      const resultado = await apiRequest<ResultadoVotacaoPortal>(
        `/portal-morador/condominios/${moradorContexto.condominioId}/assembleias/${assembleiaId}/votacoes/${votacaoId}/resultados`,
      );

      setResultadosVotacoes((atual) => ({
        ...atual,
        [votacaoId]: {
          carregando: false,
          erro: '',
          resultado,
        },
      }));
    } catch (error) {
      const mensagem =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível carregar a apuração da votação.';

      setResultadosVotacoes((atual) => ({
        ...atual,
        [votacaoId]: {
          carregando: false,
          erro: mensagem,
          resultado: null,
        },
      }));
    }
  }

  async function alternarAtaResumoAssembleia(
    assembleiaId: number,
  ) {
    if (!moradorContexto) {
      return;
    }

    const estadoAtual = atasResumo[assembleiaId];

    if (estadoAtual?.aberto) {
      setAtasResumo((atual) => ({
        ...atual,
        [assembleiaId]: {
          ...estadoAtual,
          aberto: false,
        },
      }));
      return;
    }

    if (estadoAtual?.dados) {
      setAtasResumo((atual) => ({
        ...atual,
        [assembleiaId]: {
          ...estadoAtual,
          aberto: true,
        },
      }));
      return;
    }

    setAtasResumo((atual) => ({
      ...atual,
      [assembleiaId]: {
        carregando: true,
        erro: '',
        aberto: true,
        dados: null,
      },
    }));

    try {
      const dados = await apiRequest<AtaResumoAssembleiaPortal>(
        `/portal-morador/condominios/${moradorContexto.condominioId}/assembleias/${assembleiaId}/ata-resumo`,
      );

      setAtasResumo((atual) => ({
        ...atual,
        [assembleiaId]: {
          carregando: false,
          erro: '',
          aberto: true,
          dados,
        },
      }));
    } catch (error) {
      const mensagem =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível carregar a ata / resumo da assembleia.';

      setAtasResumo((atual) => ({
        ...atual,
        [assembleiaId]: {
          carregando: false,
          erro: mensagem,
          aberto: true,
          dados: null,
        },
      }));
    }
  }

  function imprimirAtaResumoPublicaAssembleia(
    assembleiaId: number,
  ) {
    const areaImpressao = document.getElementById(
      'ata-resumo-publica-' + assembleiaId,
    );

    if (!areaImpressao) {
      return;
    }

    const conteudoImpressao =
      areaImpressao.cloneNode(true) as HTMLElement;

    conteudoImpressao
      .querySelectorAll('button')
      .forEach((botao) => botao.remove());

    const janelaImpressao = window.open(
      '',
      '_blank',
      'width=1100,height=860',
    );

    if (!janelaImpressao) {
      return;
    }

    const estilosPagina = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((elemento) => elemento.outerHTML)
      .join('\n');

    janelaImpressao.document.open();
    janelaImpressao.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ata / Resumo Pública da Assembleia</title>
  ${estilosPagina}
  <style>
    html,
    body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      padding: 24px;
    }

    .barra-previa-impressao {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      max-width: 1120px;
      margin: 0 auto 20px;
      padding: 14px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
    }

    .barra-previa-impressao button {
      height: 44px;
      padding: 0 18px;
      border-radius: 16px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f172a;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }

    .barra-previa-impressao button:first-child {
      border-color: #fdba74;
      background: #f97316;
      color: #ffffff;
    }

    #ata-resumo-publica-${assembleiaId} {
      display: block !important;
      width: 100% !important;
      max-width: 1120px !important;
      margin: 0 auto !important;
      padding: 24px !important;
      background: #ffffff !important;
      color: #0f172a !important;
      border-radius: 28px !important;
      box-sizing: border-box !important;
    }

    #ata-resumo-publica-${assembleiaId} * {
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

      .barra-previa-impressao {
        display: none !important;
      }

      #ata-resumo-publica-${assembleiaId} {
        max-width: none !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }

      #ata-resumo-publica-${assembleiaId} .quebra-evitar {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="barra-previa-impressao">
    <button type="button" onclick="window.print()">
      Imprimir
    </button>
    <button type="button" onclick="window.close()">
      Fechar prévia
    </button>
  </div>

  ${conteudoImpressao.outerHTML}
</body>
</html>`);

    janelaImpressao.document.close();
    janelaImpressao.focus();
  }

  function abrirTermoEncerramentoPublicoAssembleia(
    assembleiaId: number,
  ) {
    const dados = atasResumo[assembleiaId]?.dados;

    if (!dados) {
      return;
    }

    const totalPautas = dados.assembleia.pautas.length;
    const pautasDeliberadas = dados.assembleia.pautas.filter(
      (pauta) => pauta.status === 'DELIBERADA',
    ).length;
    const totalVotacoesEncerradas = dados.resultadosVotacoes.length;
    const totalProcuracoes = dados.presencas.filter(
      (presenca) => presenca.porProcuracao,
    ).length;

    const janela = window.open(
      '',
      '_blank',
      'width=1100,height=860',
    );

    if (!janela) {
      return;
    }

    janela.document.open();
    janela.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Termo de Encerramento da Assembleia</title>
  <style>
    html,
    body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      padding: 24px;
    }

    .acoes {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      max-width: 920px;
      margin: 0 auto 20px;
      padding: 14px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
    }

    .acoes button {
      height: 44px;
      padding: 0 18px;
      border-radius: 16px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f172a;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }

    .acoes button:first-child {
      border-color: #fdba74;
      background: #f97316;
      color: #ffffff;
    }

    .documento {
      max-width: 920px;
      margin: 0 auto;
      padding: 42px;
      border-radius: 28px;
      background: #ffffff;
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
      box-sizing: border-box;
    }

    .cabecalho {
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 24px;
      text-align: center;
    }

    .marca {
      margin: 0;
      color: #c2410c;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    h1 {
      margin: 14px 0 0;
      font-size: 30px;
      line-height: 1.2;
    }

    .condominio {
      margin-top: 12px;
      color: #475569;
      font-size: 14px;
    }

    .bloco {
      margin-top: 28px;
      border: 1px solid #cbd5e1;
      border-radius: 24px;
      padding: 22px;
    }

    .rotulo {
      margin: 0;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    h2 {
      margin: 10px 0 0;
      font-size: 24px;
      line-height: 1.3;
    }

    p {
      line-height: 1.8;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin-top: 18px;
    }

    .card {
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 16px;
    }

    .numero {
      margin-top: 8px;
      font-size: 28px;
      font-weight: 700;
    }

    .assinaturas {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 56px;
      margin-top: 72px;
    }

    .assinatura {
      border-top: 1px solid #475569;
      padding-top: 10px;
      text-align: center;
      font-size: 14px;
      font-weight: 700;
    }

    .rodape {
      margin-top: 40px;
      border-top: 1px solid #cbd5e1;
      padding-top: 18px;
      color: #64748b;
      font-size: 13px;
    }

    @media print {
      @page {
        size: A4;
        margin: 16mm;
      }

      html,
      body {
        background: #ffffff;
        padding: 0;
      }

      .acoes {
        display: none;
      }

      .documento {
        max-width: none;
        margin: 0;
        padding: 0;
        border-radius: 0;
        box-shadow: none;
      }

      .bloco,
      .card {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="acoes">
    <button type="button" onclick="window.print()">Imprimir</button>
    <button type="button" onclick="window.close()">Fechar prévia</button>
  </div>

  <main class="documento">
    <header class="cabecalho">
      <p class="marca">Condominaria Express</p>
      <h1>Termo de Encerramento da Assembleia</h1>
      <p class="condominio">
        ${morador?.condominio.nome ?? 'Condomínio não informado'}
      </p>
    </header>

    <section class="bloco">
      <p class="rotulo">Assembleia encerrada</p>
      <h2>${dados.assembleia.titulo}</h2>

      <p>
        Fica registrado, para fins de consulta dos moradores, que a assembleia
        acima identificada foi encerrada e possui resumo público disponibilizado
        no Portal do Morador.
      </p>
    </section>

    <section class="bloco">
      <p class="rotulo">Resumo consolidado</p>

      <div class="grid">
        <article class="card">
          <p class="rotulo">Unidades presentes</p>
          <div class="numero">${dados.quorum.unidadesPresentes}</div>
        </article>

        <article class="card">
          <p class="rotulo">Quórum</p>
          <div class="numero">${dados.quorum.percentualPresenca.toFixed(2).replace('.', ',')}%</div>
        </article>

        <article class="card">
          <p class="rotulo">Pautas</p>
          <div class="numero">${totalPautas}</div>
        </article>

        <article class="card">
          <p class="rotulo">Pautas deliberadas</p>
          <div class="numero">${pautasDeliberadas}</div>
        </article>

        <article class="card">
          <p class="rotulo">Votações encerradas</p>
          <div class="numero">${totalVotacoesEncerradas}</div>
        </article>

        <article class="card">
          <p class="rotulo">Procurações registradas</p>
          <div class="numero">${totalProcuracoes}</div>
        </article>
      </div>
    </section>

    <section class="bloco">
      <p class="rotulo">Declaração pública</p>

      <p>
        O presente termo consolida os principais indicadores administrativos da
        assembleia encerrada. As pautas, deliberações, presenças públicas por
        unidade e apurações disponíveis permanecem acessíveis no resumo público
        correspondente.
      </p>
    </section>

    <div class="assinaturas">
      <div class="assinatura">Administração / Síndico responsável</div>
      <div class="assinatura">Registro administrativo</div>
    </div>

    <footer class="rodape">
      Documento público emitido pelo módulo de Assembleias da Condominaria Express.
    </footer>
  </main>
</body>
</html>`);

    janela.document.close();
    janela.focus();
  }

  const atualizarDadosPagina = useCallback(() => {
    setEstado((atual) => ({
      ...atual,
      carregando: true,
      erro: '',
    }));

    setRecarregarToken((atual) => atual + 1);
  }, []);

  return (
    <AppShell
      nomeCondominio={morador?.condominio.nome}
      nomeMorador={morador?.nome}
      perfis={estado.contexto?.moradores ?? []}
    >
      <PageHeader
        title="Assembleias"
        description="Acompanhe convocações, pautas, votações e deliberações do condomínio."
        ultimaAtualizacao={ultimaAtualizacao}
        carregando={estado.carregando}
        onRefresh={atualizarDadosPagina}
      />

      {estado.carregando ? (
        <PageSkeleton cards={3} linhas={4} />
      ) : null}

      {estado.erro ? (
        <section className="rounded-[2rem] border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm sm:p-6">
          <p className="text-sm font-bold">
            Não foi possível carregar as assembleias.
          </p>
          <p className="mt-2 text-sm leading-6">
            {mensagemErroAmigavel(estado.erro)}
          </p>
        </section>
      ) : null}

      {!estado.carregando && !estado.erro ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ResumoAssembleiaCard
              titulo="Assembleias"
              valor={resumo.total}
              descricao="Total de assembleias disponíveis para sua unidade."
              icon={<ScrollText className="h-5 w-5 text-orange-600" />}
              destaque="orange"
            />

            <ResumoAssembleiaCard
              titulo="Convocadas"
              valor={resumo.convocadas}
              descricao="Convocações futuras ou abertas para consulta."
              icon={<CalendarClock className="h-5 w-5 text-sky-600" />}
              destaque="sky"
            />

            <ResumoAssembleiaCard
              titulo="Em andamento"
              valor={resumo.emAndamento}
              descricao="Assembleias ativas com pautas e votações em acompanhamento."
              icon={<CirclePlay className="h-5 w-5 text-amber-600" />}
              destaque="amber"
            />

            <ResumoAssembleiaCard
              titulo="Encerradas"
              valor={resumo.encerradas}
              descricao="Histórico com atas, deliberações e apurações publicadas."
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              destaque="emerald"
            />
          </section>

          {resumo.emAndamento > 0 ? (
            <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                    Assembleia em andamento
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-amber-950">
                    Existem pautas ou votações ativas para acompanhamento.
                  </h2>
                </div>
                <Link
                  to="/portal/votacoes?situacao=PENDENTES"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-700"
                >
                  Ver votações
                </Link>
              </div>
            </section>
          ) : null}

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Filtros
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  Localizar assembleias
                </h2>
              </div>

              {(filtros.busca ||
                filtros.situacao !== 'TODAS' ||
                filtros.ordem !== 'RECENTES') ? (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                >
                  Limpar filtros
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
              <label className="relative block">
                <span className="sr-only">
                  Buscar assembleias
                </span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={filtros.busca}
                  onChange={(event) =>
                    atualizarFiltros({
                      busca: event.target.value,
                    })
                  }
                  placeholder="Buscar por título, pauta, local ou deliberação"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <select
                value={filtros.situacao}
                onChange={(event) =>
                  atualizarFiltros({
                    situacao:
                      event.target.value as FiltrosAssembleias['situacao'],
                  })
                }
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="TODAS">Todas as situações</option>
                <option value="CONVOCADAS">Convocadas</option>
                <option value="EM_ANDAMENTO">Em andamento</option>
                <option value="ENCERRADAS">Encerradas</option>
              </select>

              <select
                value={filtros.ordem}
                onChange={(event) =>
                  atualizarFiltros({
                    ordem: event.target.value as FiltrosAssembleias['ordem'],
                  })
                }
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="RECENTES">Mais recentes</option>
                <option value="ANTIGAS">Mais antigas</option>
              </select>
            </div>
          </section>

          <section className="grid gap-5">
            {assembleiasFiltradas.map((assembleia) => (
              <article
                key={assembleia.id}
                className={`rounded-[2rem] border bg-white p-5 shadow-sm sm:p-6 ${
                  assembleia.status === 'EM_ANDAMENTO'
                    ? 'border-amber-200 ring-2 ring-amber-100'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AssembleiaStatusBadge status={assembleia.status} />

                      <ModalidadeBadge modalidade={assembleia.modalidade} />
                    </div>

                    <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
                      {assembleia.titulo}
                    </h2>

                    {assembleia.descricao ? (
                      <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
                        {assembleia.descricao}
                      </p>
                    ) : null}
                  </div>

                  {assembleia.status === 'EM_ANDAMENTO' ? (
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                        Assembleia ativa
                      </p>
                      <p className="mt-1 text-sm font-bold text-amber-950">
                        Acompanhe as pautas e votações disponíveis.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-orange-600" />
                      <p className="text-sm font-bold text-slate-950">
                        Chamadas
                      </p>
                    </div>

                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      1ª chamada
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatarDataHora(assembleia.primeiraChamadaEm)}
                    </p>

                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      2ª chamada
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatarDataHora(assembleia.segundaChamadaEm)}
                    </p>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <MapPinned className="h-4 w-4 text-orange-600" />
                      <p className="text-sm font-bold text-slate-950">
                        Local
                      </p>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {assembleia.local ?? 'Local não informado.'}
                    </p>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-orange-600" />
                      <p className="text-sm font-bold text-slate-950">
                        Acesso online
                      </p>
                    </div>

                    {assembleia.linkOnline ? (
                      <a
                        href={assembleia.linkOnline}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex break-all text-sm font-semibold text-orange-700 underline decoration-orange-300 underline-offset-4 transition hover:text-orange-800"
                      >
                        Abrir link da assembleia
                      </a>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        Link online não informado.
                      </p>
                    )}
                  </section>
                </div>

                <section
                  className={`mt-5 rounded-[1.75rem] border p-4 sm:p-5 ${
                    assembleia.status === 'EM_ANDAMENTO'
                      ? 'border-orange-300 bg-orange-50 shadow-sm ring-2 ring-orange-100'
                      : 'border-orange-200 bg-orange-50/80 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Vote className="h-4 w-4 text-orange-600" />
                        <p className="text-sm font-bold text-slate-950">
                          Minha participação nesta assembleia
                        </p>
                      </div>

                      <h3 className="mt-2 text-lg font-bold text-slate-950">
                        Resumo de acompanhamento
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Este painel resume sua área de acompanhamento: pautas, votações abertas, apurações encerradas e documentos públicos desta assembleia. Acompanhe seu voto e comprovantes na área de Votações.
                      </p>
                    </div>

                    {assembleia.pautas.some((pauta) => pauta.votacao?.status === 'ABERTA') ? (
                      <Link
                        to="/portal/votacoes?situacao=PENDENTES"
                        className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700"
                      >
                        Participar da votação
                      </Link>
                    ) : (
                      <Link
                        to="/portal/votacoes"
                        className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-white px-4 text-sm font-semibold text-orange-800 transition hover:border-orange-300 hover:bg-orange-100"
                      >
                        Ir para votações
                      </Link>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <article className="rounded-2xl border border-white/80 bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                        Pautas
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-950">
                        {assembleia.pautas.length}
                      </p>
                    </article>

                    <article className="rounded-2xl border border-white/80 bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-700">
                        Votações abertas
                      </p>
                      <p className="mt-2 text-2xl font-bold text-orange-950">
                        {assembleia.pautas.filter((pauta) => pauta.votacao?.status === 'ABERTA').length}
                      </p>
                    </article>

                    <article className="rounded-2xl border border-white/80 bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                        Votações encerradas
                      </p>
                      <p className="mt-2 text-2xl font-bold text-emerald-950">
                        {assembleia.pautas.filter((pauta) => pauta.votacao?.status === 'ENCERRADA').length}
                      </p>
                    </article>
                  </div>
                </section>

                <section className="mt-5 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <Gavel className="h-4 w-4 text-orange-600" />
                    <h3 className="text-lg font-bold text-slate-950">
                      Pautas da assembleia
                    </h3>
                  </div>

                  <div className="mt-4 grid gap-4">
                    {assembleia.pautas.map((pauta) => (
                      <article
                        key={pauta.id}
                        className="rounded-3xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                Ordem {pauta.ordem}
                              </span>

                              <PautaStatusBadge status={pauta.status} />
                            </div>

                            <h4 className="mt-3 text-lg font-bold text-slate-950">
                              {pauta.titulo}
                            </h4>

                            {pauta.descricao ? (
                              <p className="mt-2 text-sm leading-7 text-slate-600">
                                {pauta.descricao}
                              </p>
                            ) : null}
                          </div>

                          {pauta.votacao ? (
                            <VotacaoStatusBadge status={pauta.votacao.status} />
                          ) : null}
                        </div>

                        {pauta.deliberacao ? (
                          <section className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                              Deliberação
                            </p>
                            <p className="mt-3 text-sm leading-7 text-emerald-950">
                              {pauta.deliberacao}
                            </p>
                          </section>
                        ) : null}

                        {pauta.votacao?.status === 'ENCERRADA' &&
                        resultadosVotacoes[pauta.votacao.id]?.erro ? (
                          <section className="mt-4 rounded-3xl border border-red-200 bg-red-50 p-4">
                            <p className="text-sm font-semibold text-red-800">
                              {resultadosVotacoes[pauta.votacao.id]?.erro}
                            </p>
                          </section>
                        ) : null}

                        {pauta.votacao?.status === 'ENCERRADA' &&
                        resultadosVotacoes[pauta.votacao.id]?.resultado ? (
                          <section className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                                  Apuração da votação
                                </p>
                                <p className="mt-2 text-sm font-semibold text-emerald-950">
                                  Total de votos: {resultadosVotacoes[pauta.votacao.id]?.resultado?.totalVotos}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3">
                              {resultadosVotacoes[pauta.votacao.id]?.resultado?.opcoes.map((opcao) => (
                                <article
                                  key={opcao.id}
                                  className="rounded-2xl border border-emerald-200 bg-white p-4"
                                >
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <p className="font-bold text-slate-950">
                                        {opcao.descricao}
                                      </p>
                                      <p className="mt-1 text-sm text-slate-600">
                                        {opcao.votos} voto(s)
                                      </p>
                                    </div>

                                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                                      {opcao.percentual.toFixed(2).replace('.', ',')}%
                                    </span>
                                  </div>

                                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-emerald-100">
                                    <div
                                      className="h-full rounded-full bg-emerald-500"
                                      style={{ width: `${opcao.percentual}%` }}
                                    />
                                  </div>
                                </article>
                              ))}
                            </div>
                          </section>
                        ) : null}

                        {pauta.votacao ? (
                          <section className="mt-4 rounded-3xl border border-orange-100 bg-orange-50/70 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Vote className="h-4 w-4 text-orange-600" />
                                  <p className="text-sm font-bold text-orange-950">
                                    {pauta.votacao.titulo}
                                  </p>
                                </div>

                                <p className="mt-2 text-sm text-orange-900">
                                  {rotuloStatusVotacao(pauta.votacao.status)}
                                </p>
                              </div>

                              {pauta.votacao.status === 'ABERTA' ? (
                                <Link
                                  to="/portal/votacoes?situacao=PENDENTES"
                                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600"
                                >
                                  Participar da votação
                                </Link>
                              ) : null}

                              {pauta.votacao.status === 'ENCERRADA' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void carregarResultadoVotacao(
                                      assembleia.id,
                                      pauta.votacao!.id,
                                    )
                                  }
                                  disabled={
                                    resultadosVotacoes[pauta.votacao.id]?.carregando
                                  }
                                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60"
                                >
                                  {resultadosVotacoes[pauta.votacao.id]?.carregando ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                  )}
                                  {resultadosVotacoes[pauta.votacao.id]?.resultado
                                    ? 'Atualizar apuração'
                                    : 'Ver apuração'}
                                </button>
                              ) : null}
                            </div>
                          </section>
                        ) : null}
                      </article>
                    ))}

                    {assembleia.pautas.length === 0 ? (
                      <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                        Esta assembleia ainda não possui pautas publicadas.
                      </p>
                    ) : null}
                  </div>
                </section>

                  {assembleia.status === 'ENCERRADA' ? (
                    <section
                      id={'ata-resumo-publica-' + assembleia.id}
                      className="mt-5 rounded-[1.75rem] border border-orange-200 bg-orange-50/60 p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <ScrollText className="h-4 w-4 text-orange-700" />
                            <h3 className="text-lg font-bold text-slate-950">
                              Ata / resumo público da assembleia
                            </h3>
                          </div>

                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            Consulte o resumo final disponível aos moradores, com quórum,
                            presenças públicas por unidade, deliberações e apurações encerradas.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void alternarAtaResumoAssembleia(assembleia.id)
                          }
                          className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-white px-4 text-sm font-semibold text-orange-800 transition hover:border-orange-300 hover:bg-orange-100"
                        >
                          {atasResumo[assembleia.id]?.carregando
                            ? 'Carregando...'
                            : atasResumo[assembleia.id]?.aberto
                              ? 'Ocultar ata / resumo'
                              : 'Ver ata / resumo'}
                        </button>

                        {atasResumo[assembleia.id]?.dados ? (
                          <button
                            type="button"
                            onClick={() =>
                              imprimirAtaResumoPublicaAssembleia(assembleia.id)
                            }
                            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-orange-300 hover:bg-orange-100 hover:text-orange-800"
                          >
                            <Printer className="h-4 w-4" />
                            Imprimir ata / resumo
                          </button>
                        ) : null}

                        {atasResumo[assembleia.id]?.dados ? (
                          <button
                            type="button"
                            onClick={() =>
                              abrirTermoEncerramentoPublicoAssembleia(
                                assembleia.id,
                              )
                            }
                            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-orange-300 hover:bg-orange-100 hover:text-orange-800"
                          >
                            <ScrollText className="h-4 w-4" />
                            Termo de encerramento
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <article className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-700">
                            Documentos públicos da assembleia
                          </p>
                          <p className="mt-2 text-sm font-bold leading-6 text-slate-950">
                            Ata / resumo
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                            Carregue a ata/resumo para consultar e liberar impressão.
                          </p>
                        </article>

                        <article className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            Documento final
                          </p>
                          <p className="mt-2 text-sm font-bold leading-6 text-slate-950">
                            Termo de encerramento
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                            Disponível após carregar os dados públicos da assembleia encerrada.
                          </p>
                        </article>

                        <article className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                            Transparência
                          </p>
                          <p className="mt-2 text-sm font-bold leading-6 text-slate-950">
                            Apurações públicas
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                            Resultados encerrados aparecem junto ao resumo quando publicados.
                          </p>
                        </article>
                      </div>

                      {atasResumo[assembleia.id]?.aberto ? (
                        <div className="mt-5 grid gap-5">
                          {atasResumo[assembleia.id]?.erro ? (
                            <p className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                              {atasResumo[assembleia.id]?.erro}
                            </p>
                          ) : null}

                          {atasResumo[assembleia.id]?.dados ? (
                            <>
                              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <article className="rounded-3xl border border-slate-200 bg-white p-4">
                                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                                    Unidades totais
                                  </p>
                                  <p className="mt-3 text-3xl font-bold text-slate-950">
                                    {atasResumo[assembleia.id]!.dados!.quorum.totalUnidades}
                                  </p>
                                </article>

                                <article className="rounded-3xl border border-emerald-200 bg-white p-4">
                                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                                    Presentes
                                  </p>
                                  <p className="mt-3 text-3xl font-bold text-emerald-950">
                                    {atasResumo[assembleia.id]!.dados!.quorum.unidadesPresentes}
                                  </p>
                                </article>

                                <article className="rounded-3xl border border-amber-200 bg-white p-4">
                                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
                                    Ausentes
                                  </p>
                                  <p className="mt-3 text-3xl font-bold text-amber-950">
                                    {atasResumo[assembleia.id]!.dados!.quorum.unidadesAusentes}
                                  </p>
                                </article>

                                <article className="rounded-3xl border border-orange-200 bg-white p-4">
                                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-700">
                                    Quórum
                                  </p>
                                  <p className="mt-3 text-3xl font-bold text-orange-950">
                                    {atasResumo[
                                      assembleia.id
                                    ]!.dados!.quorum.percentualPresenca.toFixed(2).replace('.', ',')}%
                                  </p>
                                </article>
                              </section>

                              <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                                <h4 className="text-base font-bold text-slate-950">
                                  Presenças públicas por unidade
                                </h4>

                                {atasResumo[assembleia.id]!.dados!.presencas.length === 0 ? (
                                  <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                                    Nenhuma presença pública registrada para esta assembleia.
                                  </p>
                                ) : (
                                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    {atasResumo[
                                      assembleia.id
                                    ]!.dados!.presencas.map((presenca) => (
                                      <article
                                        key={presenca.id}
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                      >
                                        <p className="font-bold text-slate-950">
                                          {presenca.unidade.identificador}
                                        </p>

                                        <p className="mt-1 text-sm text-slate-600">
                                          {presenca.unidade.bloco
                                            ? `${presenca.unidade.bloco.nome} • Unidade ${presenca.unidade.numero}`
                                            : `Unidade ${presenca.unidade.numero}`}
                                        </p>

                                        <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                          {presenca.porProcuracao
                                            ? 'Representação por procuração'
                                            : 'Presença registrada'}
                                        </span>
                                      </article>
                                    ))}
                                  </div>
                                )}
                              </section>

                              <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                                <h4 className="text-base font-bold text-slate-950">
                                  Pautas e deliberações
                                </h4>

                                <div className="mt-4 grid gap-3">
                                  {atasResumo[
                                    assembleia.id
                                  ]!.dados!.assembleia.pautas.map((pauta) => (
                                    <article
                                      key={pauta.id}
                                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                    >
                                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                                        Ordem {pauta.ordem}
                                      </p>

                                      <h5 className="mt-2 font-bold text-slate-950">
                                        {pauta.titulo}
                                      </h5>

                                      {pauta.deliberacao ? (
                                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                                          {pauta.deliberacao}
                                        </p>
                                      ) : (
                                        <p className="mt-3 text-sm text-slate-500">
                                          Sem deliberação registrada.
                                        </p>
                                      )}
                                    </article>
                                  ))}
                                </div>
                              </section>

                              <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                                <h4 className="text-base font-bold text-slate-950">
                                  Apurações consolidadas
                                </h4>

                                {atasResumo[assembleia.id]!.dados!.resultadosVotacoes.length === 0 ? (
                                  <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                                    Nenhuma apuração encerrada disponível nesta ata / resumo.
                                  </p>
                                ) : (
                                  <div className="mt-4 grid gap-4">
                                    {atasResumo[
                                      assembleia.id
                                    ]!.dados!.resultadosVotacoes.map((resultado) => (
                                      <article
                                        key={resultado.votacaoId}
                                        className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4"
                                      >
                                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-700">
                                          Pauta: {resultado.pautaTitulo}
                                        </p>

                                        <h5 className="mt-2 font-bold text-slate-950">
                                          {resultado.votacaoTitulo}
                                        </h5>

                                        <p className="mt-2 text-sm font-semibold text-slate-700">
                                          Total de votos: {resultado.totalVotos}
                                        </p>

                                        <div className="mt-3 grid gap-3">
                                          {resultado.opcoes.map((opcao) => (
                                            <div
                                              key={opcao.id}
                                              className="rounded-2xl border border-slate-200 bg-white p-3"
                                            >
                                              <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                  <p className="font-semibold text-slate-950">
                                                    {opcao.descricao}
                                                  </p>
                                                  <p className="mt-1 text-sm text-slate-600">
                                                    {opcao.votos} voto(s)
                                                  </p>
                                                </div>

                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                                  {opcao.percentual.toFixed(2).replace('.', ',')}%
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </article>
                                    ))}
                                  </div>
                                )}
                              </section>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </section>
                  ) : null}
              </article>
            ))}

            <Pagination
              page={paginacao.page}
              totalPages={paginacao.totalPages}
              total={paginacao.total}
              limit={paginacao.limit}
              onPageChange={(page: number) =>
                setPaginacao((atual) => ({
                  ...atual,
                  page,
                }))
              }
            />

            {assembleiasFiltradas.length === 0 ? (
              <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
                <ScrollText className="mx-auto h-8 w-8 text-slate-400" />
                <h2 className="mt-4 text-xl font-bold text-slate-950">
                  Nenhuma assembleia encontrada
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-600">
                  Não há assembleias compatíveis com os filtros selecionados.
                </p>
              </section>
            ) : null}
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
