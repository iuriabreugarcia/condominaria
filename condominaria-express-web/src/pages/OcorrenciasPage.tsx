import {
  AlertTriangle,
  ClipboardList,
  Filter,
  LoaderCircle,
  PlusCircle,
  Search,
  Send,
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSearchShortcut } from '../hooks/useSearchShortcut';
import { useCloseFiltersShortcut } from '../hooks/useCloseFiltersShortcut';
import {
  useCallback,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { PageSkeleton } from '../components/PageSkeleton';
import { Pagination } from '../components/shared/Pagination';
import { PageHeader } from '../components/PageHeader';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { FilterSummary } from '../components/FilterSummary';
import { FilteredEmptyState } from '../components/FilteredEmptyState';
import {
  EmptyState,
  ErrorState,
  SuccessState,
} from '../components/FeedbackState';
import { usePortal } from '../context/PortalContext';
import { apiRequest, ApiError } from '../lib/api';
import {
  carregarRascunho,
  limparRascunho,
  salvarRascunho,
} from '../lib/formDraft';
import type {
  CriarOcorrenciaPortalPayload,
  OcorrenciaPortal,
  OcorrenciaPortalDetalhe,
  PrioridadeOcorrencia,
  StatusOcorrencia,
  UnidadeDisponivelPortal,
} from '../types/api';


type ApiListResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

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

function normalizarListaPaginada<T>(resposta: T[] | ApiListResponse<T>) {
  if (Array.isArray(resposta)) {
    return {
      items: resposta,
      paginacao: {
        page: 1,
        limit: resposta.length || LIMITE_POR_PAGINA,
        total: resposta.length,
        totalPages: 1,
      },
    };
  }

  const items = resposta.items ?? [];
  const total = Number(resposta.total ?? items.length);
  const page = Number(resposta.page ?? 1);
  const limit = Number(resposta.limit ?? LIMITE_POR_PAGINA);
  const totalPages = Number(resposta.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit))));

  return {
    items,
    paginacao: {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: Number.isFinite(limit) && limit > 0 ? limit : LIMITE_POR_PAGINA,
      total: Number.isFinite(total) ? total : items.length,
      totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
    },
  };
}

function montarQueryPaginada(page: number, limit = LIMITE_POR_PAGINA) {
  const params = new URLSearchParams({
    page: String(Math.max(1, page)),
    limit: String(Math.max(1, limit)),
  });

  return `?${params.toString()}`;
}

type EstadoPagina = {
  carregando: boolean;
  erro: string;
  unidades: UnidadeDisponivelPortal[];
  ocorrencias: OcorrenciaPortal[];
};

type FormularioOcorrencia = {
  unidadeId: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: PrioridadeOcorrencia;
};

type EstadoAndamentoOcorrencia = {
  aberto: boolean;
  carregando: boolean;
  erro: string;
  dados: OcorrenciaPortalDetalhe | null;
};

type FiltrosOcorrencia = {
  busca: string;
  status: 'TODOS' | 'ATIVAS' | StatusOcorrencia;
  prioridade: 'TODAS' | PrioridadeOcorrencia;
  ordem: 'RECENTES' | 'ANTIGAS';
};

const CHAVE_RASCUNHO_OCORRENCIA =
  'condominaria:portal:ocorrencias:rascunho';

const formularioInicial: FormularioOcorrencia = {
  unidadeId: '',
  titulo: '',
  descricao: '',
  categoria: '',
  prioridade: 'MEDIA',
};

const filtrosIniciais: FiltrosOcorrencia = {
  busca: '',
  status: 'TODOS',
  prioridade: 'TODAS',
  ordem: 'RECENTES',
};

const rotuloStatus: Record<StatusOcorrencia, string> = {
  ABERTA: 'Aberta',
  EM_ANALISE: 'Em análise',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_MORADOR: 'Aguardando morador',
  RESOLVIDA: 'Resolvida',
  CANCELADA: 'Cancelada',
};

const classeStatus: Record<StatusOcorrencia, string> = {
  ABERTA: 'bg-amber-100 text-amber-800',
  EM_ANALISE: 'bg-blue-100 text-blue-800',
  EM_ANDAMENTO: 'bg-indigo-100 text-indigo-800',
  AGUARDANDO_MORADOR: 'bg-purple-100 text-purple-800',
  RESOLVIDA: 'bg-emerald-100 text-emerald-800',
  CANCELADA: 'bg-slate-200 text-slate-700',
};

const rotuloPrioridade: Record<PrioridadeOcorrencia, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

const classePrioridade: Record<PrioridadeOcorrencia, string> = {
  BAIXA: 'bg-slate-100 text-slate-700',
  MEDIA: 'bg-orange-100 text-orange-800',
  ALTA: 'bg-red-100 text-red-700',
  URGENTE: 'bg-red-600 text-white',
};

function formatarData(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(data));
}

function normalizarBusca(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function validarFormularioOcorrencia(
  formulario: FormularioOcorrencia,
) {
  if (!formulario.unidadeId) {
    return 'Selecione a unidade relacionada à ocorrência.';
  }

  if (formulario.titulo.trim().length < 5) {
    return 'Informe um título com pelo menos 5 caracteres.';
  }

  if (formulario.descricao.trim().length < 15) {
    return 'Descreva a ocorrência com pelo menos 15 caracteres.';
  }

  return '';
}


function mensagemErroAmigavel(
  error: unknown,
  fallback = 'Não foi possível concluir a solicitação.',
) {
  const mensagem =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : '';

  const normalizada = mensagem.trim().toLowerCase();

  if (!normalizada) {
    return fallback;
  }

  if (
    normalizada.includes('internal server error') ||
    normalizada.includes('prismaclient') ||
    normalizada.includes('p2022') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('cannot read')
  ) {
    return 'Não foi possível carregar as informações agora. A administração técnica já pode verificar o sistema.';
  }

  if (
    normalizada.includes('failed to fetch') ||
    normalizada.includes('networkerror') ||
    normalizada.includes('network request failed')
  ) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
  }

  return mensagem.trim() || fallback;
}

function OcorrenciaStatusBadge({
  status,
}: {
  status: StatusOcorrencia;
}) {
  return (
    <span
      className={[
        'inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold',
        classeStatus[status],
      ].join(' ')}
    >
      {rotuloStatus[status]}
    </span>
  );
}

function OcorrenciaPrioridadeBadge({
  prioridade,
}: {
  prioridade: PrioridadeOcorrencia;
}) {
  return (
    <span
      className={[
        'inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold',
        classePrioridade[prioridade],
      ].join(' ')}
    >
      {rotuloPrioridade[prioridade]}
    </span>
  );
}

function ResumoOcorrenciaCard({
  titulo,
  valor,
  detalhe,
  destaque = 'slate',
}: {
  titulo: string;
  valor: number;
  detalhe: string;
  destaque?: 'slate' | 'orange' | 'purple' | 'emerald' | 'rose';
}) {
  const estilos = {
    slate: 'border-slate-200 bg-white text-slate-950',
    orange: 'border-orange-100 bg-orange-50 text-orange-950',
    purple: 'border-purple-100 bg-purple-50 text-purple-950',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-950',
    rose: 'border-rose-100 bg-rose-50 text-rose-950',
  } satisfies Record<string, string>;

  const labelEstilos = {
    slate: 'text-slate-500',
    orange: 'text-orange-700',
    purple: 'text-purple-700',
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
  } satisfies Record<string, string>;

  return (
    <article
      className={[
        'rounded-3xl border p-4 shadow-sm',
        estilos[destaque],
      ].join(' ')}
    >
      <p
        className={[
          'text-[10px] font-bold uppercase tracking-[0.12em]',
          labelEstilos[destaque],
        ].join(' ')}
      >
        {titulo}
      </p>
      <p className="mt-2 text-2xl font-bold">{valor}</p>
      <p className="mt-1 text-xs font-semibold opacity-75">{detalhe}</p>
    </article>
  );
}

export function OcorrenciasPage() {
  const online = useOnlineStatus();
  usePageTitle('Ocorrências');
  const [recarregarToken, setRecarregarToken] = useState(0);
  const [paginacao, setPaginacao] = useState<PaginacaoState>(paginacaoInicial());
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    contexto,
    moradorAtivo,
    carregando: carregandoPortal,
    erro: erroPortal,
  } = usePortal();

  const [estado, setEstado] = useState<EstadoPagina>({
    carregando: true,
    erro: '',
    unidades: [],
    ocorrencias: [],
  });

  const [formulario, setFormulario] =
    useState<FormularioOcorrencia>(() =>
      carregarRascunho(
        CHAVE_RASCUNHO_OCORRENCIA,
        formularioInicial,
      ),
    );

  const [filtros, setFiltros] =
    useState<FiltrosOcorrencia>(filtrosIniciais);

  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const totalFiltrosAtivos = [
    filtros.busca.trim(),
    filtros.status !== 'TODOS',
    filtros.prioridade !== 'TODAS',
    filtros.ordem !== 'RECENTES',
  ].filter(Boolean).length;

  useEffect(() => {
    if (totalFiltrosAtivos > 0) {
      setFiltrosAbertos(true);
    }
  }, [totalFiltrosAtivos]);

  useEffect(() => {
    const buscaParam = searchParams.get('busca') ?? '';
    const statusParam = searchParams.get('status');
    const prioridadeParam = searchParams.get('prioridade');
    const ordemParam = searchParams.get('ordem');

    const status: FiltrosOcorrencia['status'] =
      statusParam === 'ATIVAS' ||
      statusParam === 'ABERTA' ||
      statusParam === 'EM_ANALISE' ||
      statusParam === 'EM_ANDAMENTO' ||
      statusParam === 'AGUARDANDO_MORADOR' ||
      statusParam === 'RESOLVIDA' ||
      statusParam === 'CANCELADA'
        ? statusParam
        : 'TODOS';

    const prioridade: FiltrosOcorrencia['prioridade'] =
      prioridadeParam === 'BAIXA' ||
      prioridadeParam === 'MEDIA' ||
      prioridadeParam === 'ALTA' ||
      prioridadeParam === 'URGENTE'
        ? prioridadeParam
        : 'TODAS';

    const ordem: FiltrosOcorrencia['ordem'] =
      ordemParam === 'ANTIGAS'
        ? ordemParam
        : 'RECENTES';

    setFiltros((atual) => ({
      ...atual,
      busca: buscaParam,
      status,
      prioridade,
      ordem,
    }));
  }, [searchParams]);

  function atualizarUrlOcorrencias(proximos: FiltrosOcorrencia) {
    const params = new URLSearchParams();

    if (proximos.busca.trim()) {
      params.set('busca', proximos.busca.trim());
    }


    if (proximos.status !== 'TODOS') {
      params.set('status', proximos.status);
    }

    if (proximos.prioridade !== 'TODAS') {
      params.set('prioridade', proximos.prioridade);
    }

    if (proximos.ordem !== 'RECENTES') {
      params.set('ordem', proximos.ordem);
    }

    setSearchParams(params, { replace: true });
  }

  function atualizarFiltrosOcorrencias(
    parcial: Partial<FiltrosOcorrencia>,
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
    atualizarUrlOcorrencias(proximos);
  }

  function limparFiltrosOcorrencias() {
    setPaginacao((atual) => ({
      ...atual,
      page: 1,
    }));
    setFiltros({
      ...filtrosIniciais,
      busca: '',
    });
    setSearchParams({}, { replace: true });
  }

  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [andamentosOcorrencias, setAndamentosOcorrencias] =
    useState<Record<number, EstadoAndamentoOcorrencia>>({});
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const buscaInputRef = useRef<HTMLInputElement | null>(null);
  const [erroFormulario, setErroFormulario] = useState('');

  useSearchShortcut({
    inputRef: buscaInputRef,
  });

  useCloseFiltersShortcut({
    aberto: filtrosAbertos,
    onClose: () => setFiltrosAbertos(false),
  });

  useEffect(() => {
    if (!mensagemSucesso) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMensagemSucesso('');
    }, 6000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mensagemSucesso]);

  useEffect(() => {
    salvarRascunho(
      CHAVE_RASCUNHO_OCORRENCIA,
      formulario,
    );
  }, [formulario]);
  useEffect(() => {
    if (erroFormulario || mensagemSucesso) {
      feedbackRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });

      feedbackRef.current?.focus({
        preventScroll: true,
      });
    }
  }, [erroFormulario, mensagemSucesso]);


  useEffect(() => {
    async function carregar() {
      if (carregandoPortal) {
        return;
      }

      if (erroPortal) {
        setEstado((atual) => ({
          ...atual,
          carregando: false,
          erro: erroPortal,
        }));
        return;
      }

      if (!contexto || !moradorAtivo) {
        setEstado((atual) => ({
          ...atual,
          carregando: false,
          erro: 'Nenhum perfil de morador disponível para o portal.',
        }));
        return;
      }

      try {
        const [unidades, ocorrencias] = await Promise.all([
          apiRequest<UnidadeDisponivelPortal[]>(
            `/portal-morador/condominios/${moradorAtivo.condominioId}/unidades`,
          ),
          apiRequest<OcorrenciaPortal[] | ApiListResponse<OcorrenciaPortal>>(
            `/portal-morador/condominios/${moradorAtivo.condominioId}/ocorrencias${montarQueryPaginada(paginacao.page)}`,
          ),
        ]);

        const { items: ocorrenciasNormalizadas, paginacao: paginacaoResposta } = normalizarListaPaginada(ocorrencias);
        setPaginacao(paginacaoResposta);

        const unidadePrincipal =
          unidades.find((item) => item.principal) ?? unidades[0];

        setEstado({
          carregando: false,
          erro: '',
          unidades,
          ocorrencias: ocorrenciasNormalizadas,
        });
        setAndamentosOcorrencias({});
        setUltimaAtualizacao(new Date());

        setFormulario((atual) => ({
          ...atual,
          unidadeId: unidadePrincipal
            ? String(unidadePrincipal.unidade.id)
            : '',
        }));
      } catch (error) {
        setEstado({
          carregando: false,
          erro: mensagemErroAmigavel(
            error,
            'Não foi possível carregar as ocorrências.',
          ),
          unidades: [],
          ocorrencias: [],
        });
      }
    }

    void carregar();
  }, [
    carregandoPortal,
    contexto,
    erroPortal,
    moradorAtivo,
    paginacao.page,
    recarregarToken,
  ]);

  const possuiRascunhoOcorrencia =
    Boolean(formulario.titulo.trim()) ||
    Boolean(formulario.descricao.trim()) ||
    Boolean(formulario.categoria.trim());

  const formularioOcorrenciaValido =
    Boolean(formulario.unidadeId) &&
    formulario.titulo.trim().length >= 5 &&
    formulario.descricao.trim().length >= 15;

  const resumoOcorrencias = useMemo(() => {
    const ativas = estado.ocorrencias.filter((ocorrencia) =>
      ['ABERTA', 'EM_ANALISE', 'EM_ANDAMENTO', 'AGUARDANDO_MORADOR'].includes(
        ocorrencia.status,
      ),
    ).length;

    const aguardandoMorador = estado.ocorrencias.filter(
      (ocorrencia) => ocorrencia.status === 'AGUARDANDO_MORADOR',
    ).length;

    const resolvidas = estado.ocorrencias.filter(
      (ocorrencia) => ocorrencia.status === 'RESOLVIDA',
    ).length;

    const urgentes = estado.ocorrencias.filter(
      (ocorrencia) => ocorrencia.prioridade === 'URGENTE',
    ).length;

    return {
      total: estado.ocorrencias.length,
      ativas,
      aguardandoMorador,
      resolvidas,
      urgentes,
    };
  }, [estado.ocorrencias]);

  const ocorrenciasFiltradas = useMemo(() => {
    const busca = normalizarBusca(filtros.busca);

    return [...estado.ocorrencias]
      .filter((ocorrencia) => {
        if (
          filtros.status === 'ATIVAS' &&
          ocorrencia.status !== 'ABERTA' &&
          ocorrencia.status !== 'EM_ANALISE' &&
          ocorrencia.status !== 'EM_ANDAMENTO' &&
          ocorrencia.status !== 'AGUARDANDO_MORADOR'
        ) {
          return false;
        }

        if (
          filtros.status !== 'TODOS' &&
          filtros.status !== 'ATIVAS' &&
          ocorrencia.status !== filtros.status
        ) {
          return false;
        }

        if (
          filtros.prioridade !== 'TODAS' &&
          ocorrencia.prioridade !== filtros.prioridade
        ) {
          return false;
        }

        if (!busca) {
          return true;
        }

        const conteudo = normalizarBusca([
          ocorrencia.titulo,
          ocorrencia.descricao,
          ocorrencia.categoria ?? '',
          ocorrencia.unidade?.identificador ?? '',
        ].join(' '));

        return conteudo.includes(busca);
      })
      .sort((a, b) => {
        const diferenca =
          new Date(b.criadoEm).getTime() -
          new Date(a.criadoEm).getTime();

        return filtros.ordem === 'ANTIGAS'
          ? -diferenca
          : diferenca;
      });
  }, [estado.ocorrencias, filtros]);

  function descartarRascunhoOcorrencia() {
    const confirmou = window.confirm(
      'Deseja realmente descartar o rascunho desta ocorrência?',
    );

    if (!confirmou) {
      return;
    }

    limparRascunho(CHAVE_RASCUNHO_OCORRENCIA);
    setFormulario((atual) => ({
      ...formularioInicial,
      unidadeId: atual.unidadeId,
    }));
    setErroFormulario('');
    setMensagemSucesso('');
  }

  function limparFormularioOcorrencia() {
    const confirmou = window.confirm(
      'Deseja realmente limpar os dados preenchidos desta ocorrência?',
    );

    if (!confirmou) {
      return;
    }

    setFormulario((atual) => ({
      ...formularioInicial,
      unidadeId: atual.unidadeId,
    }));
    setErroFormulario('');
    setMensagemSucesso('');
    limparRascunho(CHAVE_RASCUNHO_OCORRENCIA);
  }

  async function alternarAndamentoOcorrencia(
    ocorrenciaId: number,
  ) {
    if (!moradorAtivo) {
      return;
    }

    const estadoAtual = andamentosOcorrencias[ocorrenciaId];

    if (estadoAtual?.aberto) {
      setAndamentosOcorrencias((atual) => ({
        ...atual,
        [ocorrenciaId]: {
          ...estadoAtual,
          aberto: false,
        },
      }));
      return;
    }

    if (estadoAtual?.dados) {
      setAndamentosOcorrencias((atual) => ({
        ...atual,
        [ocorrenciaId]: {
          ...estadoAtual,
          aberto: true,
          erro: '',
        },
      }));
      return;
    }

    setAndamentosOcorrencias((atual) => ({
      ...atual,
      [ocorrenciaId]: {
        aberto: true,
        carregando: true,
        erro: '',
        dados: null,
      },
    }));

    try {
      const detalhe = await apiRequest<OcorrenciaPortalDetalhe>(
        `/portal-morador/condominios/${moradorAtivo.condominioId}/ocorrencias/${ocorrenciaId}`,
      );

      setAndamentosOcorrencias((atual) => ({
        ...atual,
        [ocorrenciaId]: {
          aberto: true,
          carregando: false,
          erro: '',
          dados: detalhe,
        },
      }));
    } catch (error) {
      setAndamentosOcorrencias((atual) => ({
        ...atual,
        [ocorrenciaId]: {
          aberto: true,
          carregando: false,
          erro: mensagemErroAmigavel(
            error,
            'Não foi possível carregar o andamento da ocorrência.',
          ),
          dados: null,
        },
      }));
    }
  }

  async function abrirOcorrencia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!online) {
      setMensagemSucesso('');
      setErroFormulario(
        'Sem conexão com a internet. Aguarde a reconexão para registrar a ocorrência.',
      );
      return;
    }

    const erroOcorrencia = validarFormularioOcorrencia(formulario);

    if (erroOcorrencia) {
      setMensagemSucesso('');
      setErroFormulario(erroOcorrencia);
      return;
    }

    setErroFormulario('');

    if (!moradorAtivo) {
      return;
    }

    setSalvando(true);
    setMensagemSucesso('');
    setEstado((atual) => ({
      ...atual,
      erro: '',
    }));

    try {
      const payload: CriarOcorrenciaPortalPayload = {
        unidadeId: Number(formulario.unidadeId),
        titulo: formulario.titulo.trim(),
        descricao: formulario.descricao.trim(),
        prioridade: formulario.prioridade,
      };

      const categoria = formulario.categoria.trim();

      if (categoria) {
        payload.categoria = categoria;
      }

      const novaOcorrencia = await apiRequest<OcorrenciaPortal>(
        `/portal-morador/condominios/${moradorAtivo.condominioId}/ocorrencias`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setEstado((atual) => ({
        ...atual,
        ocorrencias: [
          novaOcorrencia,
          ...atual.ocorrencias,
        ],
      }));

      setFormulario((atual) => ({
        ...formularioInicial,
        unidadeId: atual.unidadeId,
      }));

      limparRascunho(CHAVE_RASCUNHO_OCORRENCIA);
      setErroFormulario('');
      setMensagemSucesso('Ocorrência registrada com sucesso.');
    } catch (error) {
      setEstado((atual) => ({
        ...atual,
        erro: mensagemErroAmigavel(
          error,
          'Não foi possível registrar a ocorrência.',
        ),
      }));
    } finally {
      setSalvando(false);
    }
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
      nomeCondominio={moradorAtivo?.condominio.nome}
      nomeMorador={moradorAtivo?.nome}
      perfis={contexto?.moradores ?? []}
    >
      <PageHeader
        title="Ocorrências"
        description="Abra solicitações, acompanhe o andamento e filtre os registros do condomínio."
        ultimaAtualizacao={ultimaAtualizacao}
        carregando={estado.carregando}
        onRefresh={atualizarDadosPagina}
        actions={
          <a
            href="#nova-ocorrencia"
            className="inline-flex h-11 items-center justify-center rounded-full bg-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
          >
            Nova ocorrência
          </a>
        }
      />


      {estado.carregando ? (
        <PageSkeleton cards={3} linhas={4} />
      ) : null}

      <div
        ref={feedbackRef}
        tabIndex={-1}
        className="scroll-mt-28 outline-none"
      />

      {estado.erro ? (
        <ErrorState
          message={estado.erro}
          actionLabel="Tentar novamente"
          onAction={atualizarDadosPagina}
        />
      ) : null}

      {mensagemSucesso ? (
        <SuccessState
          message={mensagemSucesso}
          onClose={() => setMensagemSucesso('')}
        />
      ) : null}

      {erroFormulario ? (
        <ErrorState
          message={erroFormulario}
          onClose={() => setErroFormulario('')}
        />
      ) : null}

      {!estado.carregando ? (
        <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ResumoOcorrenciaCard
            titulo="Total"
            valor={resumoOcorrencias.total}
            detalhe="registros enviados"
          />
          <ResumoOcorrenciaCard
            titulo="Ativas"
            valor={resumoOcorrencias.ativas}
            detalhe="em acompanhamento"
            destaque="orange"
          />
          <ResumoOcorrenciaCard
            titulo="Aguardando"
            valor={resumoOcorrencias.aguardandoMorador}
            detalhe="dependem do morador"
            destaque="purple"
          />
          <ResumoOcorrenciaCard
            titulo="Resolvidas"
            valor={resumoOcorrencias.resolvidas}
            detalhe="finalizadas"
            destaque="emerald"
          />
          <ResumoOcorrenciaCard
            titulo="Urgentes"
            valor={resumoOcorrencias.urgentes}
            detalhe="atenção prioritária"
            destaque="rose"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <article id="nova-ocorrencia" className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 print:hidden" tabIndex={-1}>
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <PlusCircle className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-950">
                  Abrir nova ocorrência
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Registre um problema, manutenção ou solicitação para o
                  condomínio acompanhar.
                </p>
              </div>
            </div>

            {possuiRascunhoOcorrencia ? (
              <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold">
                      Rascunho de ocorrência salvo.
                    </p>
                    <p className="mt-1 leading-6">
                      Seu preenchimento foi preservado neste navegador.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={descartarRascunhoOcorrencia}
                    className="w-fit rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
                  >
                    Descartar rascunho
                  </button>
                </div>
              </div>
            ) : null}

            <form
              onSubmit={abrirOcorrencia}
              className="grid gap-4"
            >
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Unidade
                </span>

                <select
                  value={formulario.unidadeId}
                  onChange={(event) => {
                    setErroFormulario('');
                    setFormulario((atual) => ({
                      ...atual,
                      unidadeId: event.target.value,
                    }));
                  }}
                  className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                >
                  <option value="">Selecione</option>

                  {estado.unidades.map((item) => (
                    <option
                      key={item.vinculoId}
                      value={item.unidade.id}
                    >
                      {item.unidade.identificador}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Título
                </span>

                <input
                  type="text"
                  maxLength={80}
                  value={formulario.titulo}
                  onChange={(event) => {
                    setErroFormulario('');
                    setFormulario((atual) => ({
                      ...atual,
                      titulo: event.target.value,
                    }));
                  }}
                  className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Ex.: Lâmpada queimada no corredor"
                  required
                />

                <div className="flex justify-between gap-3 text-xs font-semibold text-slate-500">
                  <span>Use um título objetivo.</span>
                  <span>{formulario.titulo.trim().length}/80 caracteres</span>
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Categoria
                </span>

                <input
                  type="text"
                  value={formulario.categoria}
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      categoria: event.target.value,
                    }))
                  }
                  className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Ex.: Iluminação"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Prioridade
                </span>

                <select
                  value={formulario.prioridade}
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      prioridade: event.target.value as PrioridadeOcorrencia,
                    }))
                  }
                  className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Descrição
                </span>

                <textarea
                  maxLength={600}
                  value={formulario.descricao}
                  onChange={(event) => {
                    setErroFormulario('');
                    setFormulario((atual) => ({
                      ...atual,
                      descricao: event.target.value,
                    }));
                  }}
                  className="min-h-36 resize-y rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-medium leading-6 text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Descreva o problema com clareza."
                  required
                />

                <div className="flex justify-between gap-3 text-xs font-semibold text-slate-500">
                  <span>Explique o problema com clareza.</span>
                  <span>{formulario.descricao.trim().length}/600 caracteres</span>
                </div>
              </label>

              {possuiRascunhoOcorrencia ? (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Rascunho salvo automaticamente
                </div>
              ) : null}

              <button
                type="submit"
                disabled={salvando || !formularioOcorrenciaValido || !online}
                className="mt-2 flex h-14 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {salvando ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                {salvando
                  ? 'Registrando...'
                  : formularioOcorrenciaValido
                    ? 'Registrar ocorrência'
                    : 'Preencha os campos obrigatórios'}
              </button>

              <button
                type="button"
                onClick={limparFormularioOcorrencia}
                disabled={salvando}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Limpar formulário
              </button>
            </form>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <ClipboardList className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-950">
                  Minhas ocorrências
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Filtre e acompanhe o status das solicitações já enviadas.
                </p>
              </div>
            </div>

            <div className="mb-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Filter className="h-4 w-4 text-orange-600" />
                  Filtros

                  {totalFiltrosAtivos > 0 ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white">
                      {totalFiltrosAtivos}
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={limparFiltrosOcorrencias}
                  className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
                >
                  Limpar filtros
                </button>

                <button
                  type="button"
                  onClick={() => setFiltrosAbertos((atual) => !atual)}
                  className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-orange-300 hover:text-orange-700 xl:hidden"
                >
                  {filtrosAbertos ? 'Ocultar filtros' : 'Mostrar filtros'}
                </button>
              </div>

              <div
                className={[
                  'gap-3',
                  filtrosAbertos ? 'grid' : 'hidden',
                  'xl:grid',
                ].join(' ')}
              >
              <label className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  ref={buscaInputRef}
                  type="text"
                  value={filtros.busca}
                  onChange={(event) =>
                    atualizarFiltrosOcorrencias({
                      busca: event.target.value,
                    })
                  }
                  className="h-13 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-14 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Buscar por título, categoria ou descrição"
                />

                {filtros.busca ? (
                  <button
                    type="button"
                    onClick={() =>
                      atualizarFiltrosOcorrencias({
                        busca: '',
                      })
                    }
                    aria-label="Limpar busca"
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold leading-none text-slate-500 shadow-sm transition hover:border-orange-300 hover:text-orange-700"
                  >
                    ×
                  </button>
                ) : null}
              </label>

              <div className="grid gap-3 xl:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Status
                  </span>

                  <select
                    value={filtros.status}
                    onChange={(event) =>
                      atualizarFiltrosOcorrencias({
                        status: event.target.value as FiltrosOcorrencia['status'],
                      })
                    }
                    className="h-13 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="ATIVAS">Abertas + em análise</option>
                    <option value="ABERTA">Aberta</option>
                    <option value="EM_ANALISE">Em análise</option>
                    <option value="EM_ANDAMENTO">Em andamento</option>
                    <option value="AGUARDANDO_MORADOR">Aguardando morador</option>
                    <option value="RESOLVIDA">Resolvida</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Prioridade
                  </span>

                  <select
                    value={filtros.prioridade}
                    onChange={(event) =>
                      atualizarFiltrosOcorrencias({
                        prioridade: event.target.value as FiltrosOcorrencia['prioridade'],
                      })
                    }
                    className="h-13 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="TODAS">Todas</option>
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Ordenar
                  </span>

                  <select
                    value={filtros.ordem}
                    onChange={(event) =>
                      atualizarFiltrosOcorrencias({
                        ordem: event.target.value as FiltrosOcorrencia['ordem'],
                      })
                    }
                    className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="RECENTES">Mais recentes</option>
                    <option value="ANTIGAS">Mais antigas</option>
                  </select>
                </label>
              </div>
              </div>

            </div>
            <FilterSummary
              total={paginacao.total || estado.ocorrencias.length}
              exibidos={ocorrenciasFiltradas.length}
              singular="ocorrência"
              plural="ocorrências"
              filtrosAtivos={[
                filtros.busca
                  ? {
                      label: `Busca: "${filtros.busca}"`,
                      onRemove: () =>
                        atualizarFiltrosOcorrencias({
                          busca: '',
                        }),
                    }
                  : null,
                filtros.status !== 'TODOS'
                  ? {
                      label: `Status: ${
                        filtros.status === 'ATIVAS'
                          ? 'Abertas + em análise'
                          : rotuloStatus[filtros.status]
                      }`,
                      onRemove: () =>
                        atualizarFiltrosOcorrencias({
                          status: 'TODOS',
                        }),
                    }
                  : null,
                filtros.prioridade !== 'TODAS'
                  ? {
                      label: `Prioridade: ${rotuloPrioridade[filtros.prioridade]}`,
                      onRemove: () =>
                        atualizarFiltrosOcorrencias({
                          prioridade: 'TODAS',
                        }),
                    }
                  : null,
                filtros.ordem !== 'RECENTES'
                  ? {
                      label: 'Ordenação: Mais antigas',
                      onRemove: () =>
                        atualizarFiltrosOcorrencias({
                          ordem: 'RECENTES',
                        }),
                    }
                  : null,
              ]}
            />


            <Pagination
              page={paginacao.page}
              totalPages={paginacao.totalPages}
              total={paginacao.total}
              limit={paginacao.limit}
              onPageChange={(page) =>
                setPaginacao((atual) => ({
                  ...atual,
                  page,
                }))
              }
            />

            {ocorrenciasFiltradas.length === 0 ? (
              estado.ocorrencias.length > 0 ? (
                <FilteredEmptyState
                  icon={AlertTriangle}
                  onClear={limparFiltrosOcorrencias}
                />
              ) : (
                <EmptyState
                  icon={AlertTriangle}
                  title="Nenhuma ocorrência encontrada."
                  description="Abra uma ocorrência para começar o acompanhamento."
                />
              )
            ) : (
              <div className="grid gap-4">
                {ocorrenciasFiltradas.map((ocorrencia) => (
                  <div
                    key={ocorrencia.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-base font-bold text-slate-950">
                          {ocorrencia.titulo}
                        </h4>

                        <p className="mt-1 text-sm text-slate-600">
                          {ocorrencia.unidade?.identificador ?? 'Sem unidade'}
                          {' • '}
                          {formatarData(ocorrencia.criadoEm)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <OcorrenciaStatusBadge status={ocorrencia.status} />
                        <OcorrenciaPrioridadeBadge prioridade={ocorrencia.prioridade} />
                      </div>
                    </div>

                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
                      {ocorrencia.descricao}
                    </p>

                    {ocorrencia.categoria ? (
                      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-orange-600">
                        {ocorrencia.categoria}
                      </p>
                    ) : null}

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() =>
                          void alternarAndamentoOcorrencia(ocorrencia.id)
                        }
                        className="inline-flex h-11 items-center justify-center rounded-2xl border border-orange-200 bg-white px-4 text-sm font-bold text-orange-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50"
                      >
                        {andamentosOcorrencias[ocorrencia.id]?.aberto
                          ? 'Ocultar andamento'
                          : 'Ver andamento'}
                      </button>
                    </div>

                    {andamentosOcorrencias[ocorrencia.id]?.aberto ? (
                      <div className="mt-4 rounded-3xl border border-orange-100 bg-white p-4">
                        {andamentosOcorrencias[ocorrencia.id]?.carregando ? (
                          <p className="rounded-2xl bg-orange-50 p-4 text-sm font-bold text-orange-800">
                            Carregando andamento da ocorrência...
                          </p>
                        ) : andamentosOcorrencias[ocorrencia.id]?.erro ? (
                          <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
                            {andamentosOcorrencias[ocorrencia.id]?.erro}
                          </p>
                        ) : andamentosOcorrencias[ocorrencia.id]?.dados ? (
                          <>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                                Situação atual
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <OcorrenciaStatusBadge
                                  status={
                                    andamentosOcorrencias[ocorrencia.id]!
                                      .dados!.status
                                  }
                                />

                                {andamentosOcorrencias[ocorrencia.id]!.dados!
                                  .encerradaEm ? (
                                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                                    Encerrada em{' '}
                                    {formatarData(
                                      andamentosOcorrencias[ocorrencia.id]!
                                        .dados!.encerradaEm!,
                                    )}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-4">
                              <p className="text-sm font-bold text-slate-950">
                                Histórico de acompanhamento
                              </p>

                              {andamentosOcorrencias[ocorrencia.id]!.dados!
                                .historicoStatus.length === 0 ? (
                                <p className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                                  Ainda não há atualizações administrativas registradas.
                                </p>
                              ) : (
                                <div className="mt-3 grid gap-3">
                                  {andamentosOcorrencias[ocorrencia.id]!.dados!
                                    .historicoStatus.map((historico) => (
                                      <article
                                        key={historico.id}
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                      >
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                          <p className="text-sm font-bold text-slate-950">
                                            {historico.statusAnterior
                                              ? `${rotuloStatus[historico.statusAnterior]} → ${rotuloStatus[historico.statusNovo]}`
                                              : rotuloStatus[historico.statusNovo]}
                                          </p>

                                          <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                                            {formatarData(historico.criadoEm)}
                                          </span>
                                        </div>

                                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-orange-600">
                                          {historico.usuario?.nome ??
                                            'Administração do condomínio'}
                                        </p>

                                        {historico.observacao ? (
                                          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                                            {historico.observacao}
                                          </p>
                                        ) : (
                                          <p className="mt-3 text-sm text-slate-500">
                                            Atualização registrada sem observação adicional.
                                          </p>
                                        )}
                                      </article>
                                    ))}
                                </div>
                              )}
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
        </>
      ) : null}
    </AppShell>
  );
}
