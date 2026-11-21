import {
  CalendarCheck2,
  CalendarDays,
  CircleCheckBig,
  Clock3,
  Filter,
  Info,
  LoaderCircle,
  MapPinned,
  PlusCircle,
  Search,
  Send,
  XCircle,
} from 'lucide-react';
import {
  useCallback,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { EmptyState, ErrorState, SuccessState } from '../components/FeedbackState';
import { FilteredEmptyState } from '../components/FilteredEmptyState';
import { FilterSummary } from '../components/FilterSummary';
import { PageHeader } from '../components/PageHeader';
import { PageSkeleton } from '../components/PageSkeleton';
import { Pagination } from '../components/shared/Pagination';
import { usePortal } from '../context/PortalContext';
import { usePortalConfiguracoes } from '../hooks/usePortalConfiguracoes';
import { useCloseFiltersShortcut } from '../hooks/useCloseFiltersShortcut';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSearchShortcut } from '../hooks/useSearchShortcut';
import { ApiError, apiRequest } from '../lib/api';
import { carregarRascunho, limparRascunho, salvarRascunho } from '../lib/formDraft';
import type {
  AreaComumReservavelPortal,
  CriarReservaPortalPayload,
  ReservaPortal,
  StatusReservaAreaComum,
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
  areasComuns: AreaComumReservavelPortal[];
  reservas: ReservaPortal[];
};

type FormularioReserva = {
  areaComumId: string;
  unidadeId: string;
  titulo: string;
  inicioEm: string;
  fimEm: string;
  observacoes: string;
};

type FiltrosReserva = {
  busca: string;
  status: 'TODAS' | StatusReservaAreaComum;
  areaComumId: 'TODAS' | string;
  ordem: 'PROXIMAS' | 'DISTANTES';
};

const CHAVE_RASCUNHO_RESERVA = 'condominaria:portal:reservas:rascunho';

const formularioInicial: FormularioReserva = {
  areaComumId: '',
  unidadeId: '',
  titulo: '',
  inicioEm: '',
  fimEm: '',
  observacoes: '',
};

const filtrosIniciais: FiltrosReserva = {
  busca: '',
  status: 'TODAS',
  areaComumId: 'TODAS',
  ordem: 'PROXIMAS',
};

const rotuloStatus: Record<StatusReservaAreaComum, string> = {
  SOLICITADA: 'Solicitada',
  APROVADA: 'Aprovada',
  RECUSADA: 'Recusada',
  CANCELADA: 'Cancelada',
  CONCLUIDA: 'Concluída',
};


const classeCardStatus: Record<StatusReservaAreaComum, string> = {
  SOLICITADA: 'border-amber-200 bg-amber-50/60',
  APROVADA: 'border-emerald-200 bg-emerald-50/60',
  RECUSADA: 'border-red-200 bg-red-50/60',
  CANCELADA: 'border-slate-200 bg-slate-50',
  CONCLUIDA: 'border-blue-200 bg-blue-50/60',
};

const STATUS_CONFLITO: StatusReservaAreaComum[] = ['SOLICITADA', 'APROVADA'];

function formatarDataHora(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(data));
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
  }).format(new Date(data));
}

function converterParaIso(valor: string) {
  return new Date(valor).toISOString();
}

function dataHoraLocalMinima() {
  const agora = new Date();
  agora.setSeconds(0, 0);

  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  const hora = String(agora.getHours()).padStart(2, '0');
  const minuto = String(agora.getMinutes()).padStart(2, '0');

  return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
}

function validarPeriodoReserva(inicioEm: string, fimEm: string) {
  if (!inicioEm || !fimEm) {
    return 'Informe a data e o horário de início e fim da reserva.';
  }

  const inicio = new Date(inicioEm);
  const fim = new Date(fimEm);
  const agora = new Date();

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return 'Informe datas válidas para a reserva.';
  }

  if (inicio < agora) {
    return 'A reserva não pode começar em uma data ou horário já passado.';
  }

  if (fim <= inicio) {
    return 'O horário final deve ser posterior ao horário inicial.';
  }

  return '';
}

function normalizarBusca(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function periodosSobrepostos(
  inicioA: Date,
  fimA: Date,
  inicioB: Date,
  fimB: Date,
) {
  return inicioA < fimB && fimA > inicioB;
}

function reservaEstaFutura(reserva: ReservaPortal) {
  return new Date(reserva.fimEm).getTime() >= Date.now();
}

function podeCancelarReserva(reserva: ReservaPortal) {
  return (
    reserva.status === 'SOLICITADA' &&
    new Date(reserva.inicioEm).getTime() > Date.now()
  );
}

function calcularDuracao(inicioEm: string, fimEm: string) {
  if (!inicioEm || !fimEm) {
    return '';
  }

  const inicio = new Date(inicioEm).getTime();
  const fim = new Date(fimEm).getTime();

  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim <= inicio) {
    return '';
  }

  const minutos = Math.round((fim - inicio) / 60000);
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  if (horas > 0 && resto > 0) {
    return `${horas}h${String(resto).padStart(2, '0')}`;
  }

  if (horas > 0) {
    return `${horas}h`;
  }

  return `${minutos}min`;
}

function mensagemErroAmigavel(error: unknown, fallback: string) {
  const mensagem =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : fallback;

  const normalizada = mensagem.toLowerCase();

  if (
    normalizada.includes('internal server error') ||
    normalizada.includes('prisma') ||
    normalizada.includes('p20') ||
    normalizada.includes('unknown column')
  ) {
    return 'Não foi possível processar as reservas agora. Tente novamente em instantes ou avise a administração.';
  }

  if (normalizada.includes('failed to fetch') || normalizada.includes('network')) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
  }

  return mensagem || fallback;
}

function ReservaStatusBadge({
  status,
}: {
  status: StatusReservaAreaComum;
}) {
  const classes: Record<StatusReservaAreaComum, string> = {
    SOLICITADA: 'border-amber-200 bg-amber-50 text-amber-800',
    APROVADA: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    RECUSADA: 'border-red-200 bg-red-50 text-red-700',
    CANCELADA: 'border-slate-200 bg-slate-100 text-slate-700',
    CONCLUIDA: 'border-blue-200 bg-blue-50 text-blue-800',
  };

  return (
    <span
      className={[
        'inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold shadow-sm',
        classes[status],
      ].join(' ')}
    >
      {rotuloStatus[status]}
    </span>
  );
}

function ReservaSituacaoBadge({
  reserva,
}: {
  reserva: ReservaPortal;
}) {
  if (reserva.status === 'APROVADA') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
        <CircleCheckBig className="h-4 w-4" />
        Reserva aprovada
      </div>
    );
  }

  if (reserva.status === 'SOLICITADA') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
        <Clock3 className="h-4 w-4" />
        Aguardando análise
      </div>
    );
  }

  if (reserva.status === 'CANCELADA') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
        <XCircle className="h-4 w-4" />
        Cancelada
      </div>
    );
  }

  if (reserva.status === 'RECUSADA') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
        <XCircle className="h-4 w-4" />
        Recusada
      </div>
    );
  }

  if (reserva.status === 'CONCLUIDA') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
        <CircleCheckBig className="h-4 w-4" />
        Concluída
      </div>
    );
  }

  return null;
}

function ResumoReservaCard({
  titulo,
  valor,
  detalhe,
  icon,
  classe,
}: {
  titulo: string;
  valor: number;
  detalhe: string;
  icon: ReactNode;
  classe: string;
}) {
  return (
    <article className={[
      'rounded-3xl border p-4 shadow-sm',
      classe,
    ].join(' ')} >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em]">{titulo}</p>
          <p className="mt-2 text-2xl font-bold">{valor}</p>
          <p className="mt-1 text-xs font-semibold opacity-80">{detalhe}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          {icon}
        </div>
      </div>
    </article>
  );
}

export function ReservasPage() {
  const online = useOnlineStatus();
  usePageTitle('Reservas');

  const [recarregarToken, setRecarregarToken] = useState(0);
  const [paginacao, setPaginacao] = useState<PaginacaoState>(paginacaoInicial());
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { contexto, moradorAtivo, carregando: carregandoPortal, erro: erroPortal } = usePortal();
  const { configuracoes: configuracoesPortal } = usePortalConfiguracoes();

  const [estado, setEstado] = useState<EstadoPagina>({
    carregando: true,
    erro: '',
    unidades: [],
    areasComuns: [],
    reservas: [],
  });

  const [formulario, setFormulario] = useState<FormularioReserva>(() =>
    carregarRascunho(CHAVE_RASCUNHO_RESERVA, formularioInicial),
  );
  const [filtros, setFiltros] = useState<FiltrosReserva>(filtrosIniciais);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [reservaCancelandoId, setReservaCancelandoId] = useState<number | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [erroFormulario, setErroFormulario] = useState('');

  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const buscaInputRef = useRef<HTMLInputElement | null>(null);

  const totalFiltrosAtivos = [
    filtros.busca.trim(),
    filtros.status !== 'TODAS',
    filtros.areaComumId !== 'TODAS',
    filtros.ordem !== 'PROXIMAS',
  ].filter(Boolean).length;

  useSearchShortcut({ inputRef: buscaInputRef });
  useCloseFiltersShortcut({
    aberto: filtrosAbertos,
    onClose: () => setFiltrosAbertos(false),
  });

  useEffect(() => {
    if (totalFiltrosAtivos > 0) {
      setFiltrosAbertos(true);
    }
  }, [totalFiltrosAtivos]);

  useEffect(() => {
    const buscaParam = searchParams.get('busca') ?? '';
    const statusParam = searchParams.get('status');
    const areaComumParam = searchParams.get('areaComumId');
    const ordemParam = searchParams.get('ordem');

    const status: FiltrosReserva['status'] =
      statusParam === 'SOLICITADA' ||
      statusParam === 'APROVADA' ||
      statusParam === 'RECUSADA' ||
      statusParam === 'CANCELADA' ||
      statusParam === 'CONCLUIDA'
        ? statusParam
        : 'TODAS';

    const areaComumId: FiltrosReserva['areaComumId'] =
      areaComumParam && areaComumParam.trim() ? areaComumParam : 'TODAS';

    const ordem: FiltrosReserva['ordem'] =
      ordemParam === 'DISTANTES' ? ordemParam : 'PROXIMAS';

    setFiltros((atual) => ({
      ...atual,
      busca: buscaParam,
      status,
      areaComumId,
      ordem,
    }));
  }, [searchParams]);

  useEffect(() => {
    if (!mensagemSucesso) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setMensagemSucesso('');
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [mensagemSucesso]);

  useEffect(() => {
    salvarRascunho(CHAVE_RASCUNHO_RESERVA, formulario);
  }, [formulario]);

  useEffect(() => {
    if (erroFormulario || mensagemSucesso) {
      feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      feedbackRef.current?.focus({ preventScroll: true });
    }
  }, [erroFormulario, mensagemSucesso]);

  useEffect(() => {
    async function carregar() {
      if (carregandoPortal) {
        return;
      }

      if (erroPortal) {
        setEstado((atual) => ({ ...atual, carregando: false, erro: erroPortal }));
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
        const [unidades, areasComuns, reservas] = await Promise.all([
          apiRequest<UnidadeDisponivelPortal[]>(
            `/portal-morador/condominios/${moradorAtivo.condominioId}/unidades`,
          ),
          apiRequest<AreaComumReservavelPortal[]>(
            `/portal-morador/condominios/${moradorAtivo.condominioId}/areas-comuns/reservaveis`,
          ),
          apiRequest<ReservaPortal[] | ApiListResponse<ReservaPortal>>(
            `/portal-morador/condominios/${moradorAtivo.condominioId}/reservas${montarQueryPaginada(paginacao.page)}`,
          ),
        ]);

        const { items: reservasNormalizadas, paginacao: paginacaoResposta } = normalizarListaPaginada(reservas);
        setPaginacao(paginacaoResposta);

        const unidadePrincipal = unidades.find((item) => item.principal) ?? unidades[0];
        const primeiraArea = areasComuns[0];

        setEstado({ carregando: false, erro: '', unidades, areasComuns, reservas: reservasNormalizadas });
        setUltimaAtualizacao(new Date());

        setFormulario((atual) => ({
          ...atual,
          unidadeId: atual.unidadeId || (unidadePrincipal ? String(unidadePrincipal.unidade.id) : ''),
          areaComumId: atual.areaComumId || (primeiraArea ? String(primeiraArea.id) : ''),
        }));
      } catch (error) {
        setEstado({
          carregando: false,
          erro: mensagemErroAmigavel(error, 'Não foi possível carregar as reservas.'),
          unidades: [],
          areasComuns: [],
          reservas: [],
        });
      }
    }

    void carregar();
  }, [carregandoPortal, contexto, erroPortal, moradorAtivo, recarregarToken]);

  function atualizarUrlReservas(proximos: FiltrosReserva) {
    const params = new URLSearchParams();

    if (proximos.busca.trim()) {
      params.set('busca', proximos.busca.trim());
    }

    if (proximos.status !== 'TODAS') {
      params.set('status', proximos.status);
    }

    if (proximos.areaComumId !== 'TODAS') {
      params.set('areaComumId', proximos.areaComumId);
    }

    if (proximos.ordem !== 'PROXIMAS') {
      params.set('ordem', proximos.ordem);
    }

    setSearchParams(params, { replace: true });
  }

  function atualizarFiltrosReservas(parcial: Partial<FiltrosReserva>) {
    const proximos = { ...filtros, ...parcial };
    setPaginacao((atual) => ({
      ...atual,
      page: 1,
    }));
    setFiltros(proximos);
    atualizarUrlReservas(proximos);
  }

  function limparFiltrosReservas() {
    setPaginacao((atual) => ({
      ...atual,
      page: 1,
    }));
    setFiltros({ ...filtrosIniciais, busca: '' });
    setSearchParams({}, { replace: true });
  }

  const dataMinimaReserva = dataHoraLocalMinima();
  const areaSelecionada = estado.areasComuns.find(
    (area) => String(area.id) === formulario.areaComumId,
  );

  const resumoReservas = useMemo(() => {
    const abertas = estado.reservas.filter((reserva) =>
      ['SOLICITADA', 'APROVADA'].includes(reserva.status),
    ).length;
    const solicitadas = estado.reservas.filter(
      (reserva) => reserva.status === 'SOLICITADA',
    ).length;
    const aprovadas = estado.reservas.filter(
      (reserva) => reserva.status === 'APROVADA',
    ).length;
    const concluidas = estado.reservas.filter(
      (reserva) => reserva.status === 'CONCLUIDA',
    ).length;

    return { abertas, solicitadas, aprovadas, concluidas };
  }, [estado.reservas]);

  const reservasFiltradas = useMemo(() => {
    const busca = normalizarBusca(filtros.busca);

    return [...estado.reservas]
      .filter((reserva) => {
        if (filtros.status !== 'TODAS' && reserva.status !== filtros.status) {
          return false;
        }

        if (filtros.areaComumId !== 'TODAS' && String(reserva.areaComumId) !== filtros.areaComumId) {
          return false;
        }

        if (!busca) {
          return true;
        }

        const conteudo = normalizarBusca(
          [
            reserva.titulo ?? '',
            reserva.areaComum.nome,
            reserva.unidade?.identificador ?? '',
            reserva.observacoes ?? '',
          ].join(' '),
        );

        return conteudo.includes(busca);
      })
      .sort((a, b) => {
        const diferenca = new Date(a.inicioEm).getTime() - new Date(b.inicioEm).getTime();
        return filtros.ordem === 'DISTANTES' ? -diferenca : diferenca;
      });
  }, [estado.reservas, filtros]);

  const reservasDaAreaSelecionada = useMemo(() => {
    if (!formulario.areaComumId) {
      return [];
    }

    return estado.reservas
      .filter((reserva) => {
        return (
          String(reserva.areaComumId) === formulario.areaComumId &&
          STATUS_CONFLITO.includes(reserva.status) &&
          reservaEstaFutura(reserva)
        );
      })
      .sort((a, b) => new Date(a.inicioEm).getTime() - new Date(b.inicioEm).getTime());
  }, [estado.reservas, formulario.areaComumId]);

  const conflitosFormulario = useMemo(() => {
    const erroPeriodo = validarPeriodoReserva(formulario.inicioEm, formulario.fimEm);

    if (!formulario.areaComumId || erroPeriodo) {
      return [];
    }

    const inicio = new Date(formulario.inicioEm);
    const fim = new Date(formulario.fimEm);

    return estado.reservas.filter((reserva) => {
      return (
        String(reserva.areaComumId) === formulario.areaComumId &&
        STATUS_CONFLITO.includes(reserva.status) &&
        periodosSobrepostos(inicio, fim, new Date(reserva.inicioEm), new Date(reserva.fimEm))
      );
    });
  }, [estado.reservas, formulario.areaComumId, formulario.fimEm, formulario.inicioEm]);

  const proximaReservaAprovada = useMemo(() => {
    return estado.reservas
      .filter((reserva) => reserva.status === 'APROVADA' && new Date(reserva.fimEm).getTime() >= Date.now())
      .sort((a, b) => new Date(a.inicioEm).getTime() - new Date(b.inicioEm).getTime())[0];
  }, [estado.reservas]);

  const possuiRascunhoReserva =
    Boolean(formulario.titulo.trim()) ||
    Boolean(formulario.inicioEm) ||
    Boolean(formulario.fimEm) ||
    Boolean(formulario.observacoes.trim());

  const erroPeriodoReserva = validarPeriodoReserva(formulario.inicioEm, formulario.fimEm);

  const formularioReservaValido =
    Boolean(formulario.areaComumId) &&
    Boolean(formulario.unidadeId) &&
    Boolean(formulario.inicioEm) &&
    Boolean(formulario.fimEm) &&
    !erroPeriodoReserva &&
    conflitosFormulario.length === 0;

  const duracaoReserva = calcularDuracao(formulario.inicioEm, formulario.fimEm);

  const atualizarDadosPagina = useCallback(() => {
    setEstado((atual) => ({ ...atual, carregando: true, erro: '' }));
    setRecarregarToken((atual) => atual + 1);
  }, []);

  function descartarRascunhoReserva() {
    const confirmou = window.confirm('Deseja realmente descartar o rascunho desta reserva?');

    if (!confirmou) {
      return;
    }

    limparRascunho(CHAVE_RASCUNHO_RESERVA);
    setFormulario((atual) => ({
      ...formularioInicial,
      areaComumId: atual.areaComumId,
      unidadeId: atual.unidadeId,
    }));
    setErroFormulario('');
    setMensagemSucesso('');
  }

  function limparFormularioReserva() {
    const confirmou = window.confirm('Deseja realmente limpar os dados preenchidos desta reserva?');

    if (!confirmou) {
      return;
    }

    setFormulario((atual) => ({
      ...formularioInicial,
      areaComumId: atual.areaComumId,
      unidadeId: atual.unidadeId,
    }));
    setErroFormulario('');
    setMensagemSucesso('');
    limparRascunho(CHAVE_RASCUNHO_RESERVA);
  }

  async function solicitarReserva(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!moradorAtivo) {
      return;
    }

    if (!online) {
      setMensagemSucesso('');
      setErroFormulario('Sem conexão com a internet. Aguarde a reconexão para solicitar a reserva.');
      return;
    }

    if (erroPeriodoReserva) {
      setMensagemSucesso('');
      setErroFormulario(erroPeriodoReserva);
      return;
    }

    if (conflitosFormulario.length > 0) {
      setMensagemSucesso('');
      setErroFormulario('O período informado possui conflito com outra reserva ou solicitação da mesma área.');
      return;
    }

    setErroFormulario('');
    setSalvando(true);
    setMensagemSucesso('');
    setEstado((atual) => ({ ...atual, erro: '' }));

    try {
      const payload: CriarReservaPortalPayload = {
        areaComumId: Number(formulario.areaComumId),
        unidadeId: Number(formulario.unidadeId),
        inicioEm: converterParaIso(formulario.inicioEm),
        fimEm: converterParaIso(formulario.fimEm),
      };

      const titulo = formulario.titulo.trim();
      const observacoes = formulario.observacoes.trim();

      if (titulo) {
        payload.titulo = titulo;
      }

      if (observacoes) {
        payload.observacoes = observacoes;
      }

      const novaReserva = await apiRequest<ReservaPortal>(
        `/portal-morador/condominios/${moradorAtivo.condominioId}/reservas`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setEstado((atual) => ({
        ...atual,
        reservas: [novaReserva, ...atual.reservas],
      }));

      setFormulario((atual) => ({
        ...formularioInicial,
        areaComumId: atual.areaComumId,
        unidadeId: atual.unidadeId,
      }));

      limparRascunho(CHAVE_RASCUNHO_RESERVA);
      setErroFormulario('');
      setMensagemSucesso('Reserva solicitada com sucesso. Acompanhe o status na lista.');
    } catch (error) {
      setEstado((atual) => ({
        ...atual,
        erro: mensagemErroAmigavel(error, 'Não foi possível solicitar a reserva.'),
      }));
    } finally {
      setSalvando(false);
    }
  }

  async function cancelarReserva(reserva: ReservaPortal) {
    if (!moradorAtivo || !podeCancelarReserva(reserva)) {
      return;
    }

    const confirmou = window.confirm(
      `Deseja cancelar a solicitação de reserva de ${reserva.areaComum.nome} em ${formatarDataHora(reserva.inicioEm)}?`,
    );

    if (!confirmou) {
      return;
    }

    setReservaCancelandoId(reserva.id);
    setErroFormulario('');
    setMensagemSucesso('');

    try {
      const atualizada = await apiRequest<ReservaPortal>(
        `/condominios/${moradorAtivo.condominioId}/reservas/${reserva.id}/cancelar-portal`,
        {
          method: 'PATCH',
        },
      );

      setEstado((atual) => ({
        ...atual,
        reservas: atual.reservas.map((item) =>
          item.id === atualizada.id ? atualizada : item,
        ),
      }));
      setMensagemSucesso('Solicitação de reserva cancelada com sucesso.');
    } catch (error) {
      setErroFormulario(
        mensagemErroAmigavel(error, 'Não foi possível cancelar a solicitação da reserva.'),
      );
    } finally {
      setReservaCancelandoId(null);
    }
  }

  return (
    <AppShell
      nomeCondominio={moradorAtivo?.condominio.nome}
      nomeMorador={moradorAtivo?.nome}
      perfis={contexto?.moradores ?? []}
    >
      <PageHeader
        title="Reservas"
        description="Solicite áreas comuns, acompanhe aprovações e consulte os agendamentos."
        ultimaAtualizacao={ultimaAtualizacao}
        carregando={estado.carregando}
        onRefresh={atualizarDadosPagina}
        actions={
          <a
            href="#nova-reserva"
            className="inline-flex h-11 items-center justify-center rounded-full bg-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
          >
            Solicitar reserva
          </a>
        }
      />

      {estado.carregando ? <PageSkeleton cards={3} linhas={4} /> : null}

      {configuracoesPortal?.politicaReservas ? (
        <section className="rounded-3xl border border-orange-100 bg-orange-50 p-4 text-sm leading-6 text-orange-950 shadow-sm md:p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-orange-700">
            Política geral de reservas
          </p>
          <p className="mt-2 whitespace-pre-line">{configuracoesPortal.politicaReservas}</p>
        </section>
      ) : null}

      <div ref={feedbackRef} tabIndex={-1} className="scroll-mt-28 outline-none" />

      {estado.erro ? (
        <ErrorState message={estado.erro} actionLabel="Tentar novamente" onAction={atualizarDadosPagina} />
      ) : null}

      {mensagemSucesso ? (
        <SuccessState message={mensagemSucesso} onClose={() => setMensagemSucesso('')} />
      ) : null}

      {erroFormulario ? (
        <ErrorState message={erroFormulario} onClose={() => setErroFormulario('')} />
      ) : null}

      {!estado.carregando ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ResumoReservaCard
              titulo="Solicitações abertas"
              valor={resumoReservas.abertas}
              detalhe="solicitadas ou aprovadas"
              icon={<CalendarDays className="h-5 w-5 text-orange-600" />}
              classe="border-orange-100 bg-orange-50 text-orange-950"
            />
            <ResumoReservaCard
              titulo="Pendentes"
              valor={resumoReservas.solicitadas}
              detalhe="aguardando aprovação"
              icon={<Clock3 className="h-5 w-5 text-amber-600" />}
              classe="border-amber-100 bg-amber-50 text-amber-950"
            />
            <ResumoReservaCard
              titulo="Aprovadas"
              valor={resumoReservas.aprovadas}
              detalhe="confirmadas pela administração"
              icon={<CircleCheckBig className="h-5 w-5 text-emerald-600" />}
              classe="border-emerald-100 bg-emerald-50 text-emerald-950"
            />
            <ResumoReservaCard
              titulo="Concluídas"
              valor={resumoReservas.concluidas}
              detalhe="histórico finalizado"
              icon={<CalendarCheck2 className="h-5 w-5 text-blue-600" />}
              classe="border-blue-100 bg-blue-50 text-blue-950"
            />
          </section>

          {proximaReservaAprovada ? (
            <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                    <CalendarCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Próxima reserva aprovada</p>
                    <h3 className="mt-1 text-lg font-bold text-emerald-950">
                      {proximaReservaAprovada.areaComum.nome}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-emerald-800">
                      {formatarDataHora(proximaReservaAprovada.inicioEm)} → {formatarDataHora(proximaReservaAprovada.fimEm)}
                    </p>
                  </div>
                </div>
                <a
                  href="#minhas-reservas"
                  className="inline-flex h-10 items-center justify-center rounded-2xl bg-white px-4 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100"
                >
                  Ver detalhes
                </a>
              </div>
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <article id="nova-reserva" className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 print:hidden" tabIndex={-1}>
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <PlusCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-950">Solicitar reserva</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Escolha a área comum e consulte conflitos antes de enviar.</p>
                </div>
              </div>

              {possuiRascunhoReserva ? (
                <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold">Rascunho de reserva salvo.</p>
                      <p className="mt-1 leading-6">Seu preenchimento foi preservado neste navegador.</p>
                    </div>
                    <button
                      type="button"
                      onClick={descartarRascunhoReserva}
                      className="w-fit rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
                    >
                      Descartar rascunho
                    </button>
                  </div>
                </div>
              ) : null}

              <form onSubmit={solicitarReserva} className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">Área comum</span>
                  <select
                    value={formulario.areaComumId}
                    onChange={(event) => {
                      setErroFormulario('');
                      setFormulario((atual) => ({ ...atual, areaComumId: event.target.value }));
                    }}
                    className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    required
                  >
                    <option value="">Selecione</option>
                    {estado.areasComuns.map((area) => (
                      <option key={area.id} value={area.id}>{area.nome}</option>
                    ))}
                  </select>
                </label>

                {areaSelecionada ? (
                  <div className="rounded-3xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-950">
                    <div className="flex items-start gap-3">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                      <div>
                        <p className="font-bold">Regras da área</p>
                        <p className="mt-1 leading-6">
                          {areaSelecionada.descricao || areaSelecionada.observacoes || 'Consulte a disponibilidade antes de solicitar. A aprovação depende da administração do condomínio.'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-800 shadow-sm">
                            {areaSelecionada.exigeAprovacao ? 'Exige aprovação' : 'Aprovação automática'}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-800 shadow-sm">
                            Capacidade: {areaSelecionada.capacidade ?? 'não informada'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">Unidade</span>
                  <select
                    value={formulario.unidadeId}
                    onChange={(event) => setFormulario((atual) => ({ ...atual, unidadeId: event.target.value }))}
                    className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    required
                  >
                    <option value="">Selecione</option>
                    {estado.unidades.map((item) => (
                      <option key={item.vinculoId} value={item.unidade.id}>{item.unidade.identificador}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">Título</span>
                  <input
                    type="text"
                    maxLength={80}
                    value={formulario.titulo}
                    onChange={(event) => setFormulario((atual) => ({ ...atual, titulo: event.target.value }))}
                    className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="Ex.: Aniversário da família"
                  />
                  <div className="flex justify-between gap-3 text-xs font-semibold text-slate-500">
                    <span>Opcional, mas útil para identificar a reserva.</span>
                    <span>{formulario.titulo.trim().length}/80 caracteres</span>
                  </div>
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-700">Início</span>
                    <input
                      type="datetime-local"
                      min={dataMinimaReserva}
                      value={formulario.inicioEm}
                      onChange={(event) => {
                        setErroFormulario('');
                        setFormulario((atual) => ({ ...atual, inicioEm: event.target.value }));
                      }}
                      className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      required
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-700">Fim</span>
                    <input
                      type="datetime-local"
                      min={formulario.inicioEm || dataMinimaReserva}
                      value={formulario.fimEm}
                      onChange={(event) => {
                        setErroFormulario('');
                        setFormulario((atual) => ({ ...atual, fimEm: event.target.value }));
                      }}
                      className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      required
                    />
                  </label>
                </div>

                {formulario.inicioEm && formulario.fimEm ? (
                  <div className={[
                    'rounded-3xl border p-4 text-sm',
                    conflitosFormulario.length > 0
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : erroPeriodoReserva
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800',
                  ].join(' ')}>
                    <p className="font-bold">
                      {conflitosFormulario.length > 0
                        ? 'Período indisponível'
                        : erroPeriodoReserva
                          ? 'Período pendente de ajuste'
                          : 'Período disponível'}
                    </p>
                    <p className="mt-1 leading-6">
                      {conflitosFormulario.length > 0
                        ? `Encontramos ${conflitosFormulario.length} conflito(s) para esta área comum.`
                        : erroPeriodoReserva || `Duração aproximada: ${duracaoReserva || 'não calculada'}.`}
                    </p>
                    {conflitosFormulario.length > 0 ? (
                      <div className="mt-3 grid gap-2">
                        {conflitosFormulario.slice(0, 3).map((conflito) => (
                          <div key={conflito.id} className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-red-800 shadow-sm">
                            {formatarDataHora(conflito.inicioEm)} → {formatarDataHora(conflito.fimEm)} · {rotuloStatus[conflito.status]}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {reservasDaAreaSelecionada.length > 0 ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-950">Agenda da área selecionada</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Próximas reservas e solicitações que podem gerar conflito.</p>
                    <div className="mt-3 grid gap-2">
                      {reservasDaAreaSelecionada.slice(0, 4).map((reserva) => (
                        <div key={reserva.id} className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                          {formatarData(reserva.inicioEm)} · {formatarDataHora(reserva.inicioEm)} → {formatarDataHora(reserva.fimEm)} · {rotuloStatus[reserva.status]}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : areaSelecionada ? (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                    Nenhuma reserva futura conflitante encontrada para esta área.
                  </div>
                ) : null}

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">Observações</span>
                  <textarea
                    maxLength={400}
                    value={formulario.observacoes}
                    onChange={(event) => setFormulario((atual) => ({ ...atual, observacoes: event.target.value }))}
                    className="min-h-32 resize-y rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-medium leading-6 text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="Informe detalhes importantes da solicitação."
                  />
                  <div className="flex justify-between gap-3 text-xs font-semibold text-slate-500">
                    <span>Informe detalhes adicionais, se necessário.</span>
                    <span>{formulario.observacoes.trim().length}/400 caracteres</span>
                  </div>
                </label>

                {possuiRascunhoReserva ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Rascunho salvo automaticamente
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={salvando || !formularioReservaValido || !online}
                  className="mt-2 flex h-14 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {salvando ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  {salvando
                    ? 'Enviando...'
                    : !online
                      ? 'Sem conexão'
                      : conflitosFormulario.length > 0
                        ? 'Período indisponível'
                        : formularioReservaValido
                          ? 'Solicitar reserva'
                          : 'Informe um período válido'}
                </button>

                <button
                  type="button"
                  onClick={limparFormularioReserva}
                  disabled={salvando}
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Limpar formulário
                </button>
              </form>
            </article>

            <article id="minhas-reservas" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-950">Minhas reservas</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Filtre e acompanhe solicitações e reservas registradas.</p>
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
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={limparFiltrosReservas}
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
                </div>

                <div className={['gap-3', filtrosAbertos ? 'grid' : 'hidden', 'xl:grid'].join(' ')}>
                  <label className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={buscaInputRef}
                      type="text"
                      value={filtros.busca}
                      onChange={(event) => atualizarFiltrosReservas({ busca: event.target.value })}
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-14 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      placeholder="Buscar por título, área, unidade ou observações"
                    />
                    {filtros.busca ? (
                      <button
                        type="button"
                        onClick={() => atualizarFiltrosReservas({ busca: '' })}
                        aria-label="Limpar busca"
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold leading-none text-slate-500 shadow-sm transition hover:border-orange-300 hover:text-orange-700"
                      >
                        ×
                      </button>
                    ) : null}
                  </label>

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Status</span>
                      <select
                        value={filtros.status}
                        onChange={(event) => atualizarFiltrosReservas({ status: event.target.value as FiltrosReserva['status'] })}
                        className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      >
                        <option value="TODAS">Todas</option>
                        <option value="SOLICITADA">Solicitada</option>
                        <option value="APROVADA">Aprovada</option>
                        <option value="RECUSADA">Recusada</option>
                        <option value="CANCELADA">Cancelada</option>
                        <option value="CONCLUIDA">Concluída</option>
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Área comum</span>
                      <select
                        value={filtros.areaComumId}
                        onChange={(event) => atualizarFiltrosReservas({ areaComumId: event.target.value })}
                        className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      >
                        <option value="TODAS">Todas</option>
                        {estado.areasComuns.map((area) => (
                          <option key={area.id} value={area.id}>{area.nome}</option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Ordenar</span>
                      <select
                        value={filtros.ordem}
                        onChange={(event) => atualizarFiltrosReservas({ ordem: event.target.value as FiltrosReserva['ordem'] })}
                        className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      >
                        <option value="PROXIMAS">Início mais próximo</option>
                        <option value="DISTANTES">Início mais distante</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <FilterSummary
                total={paginacao.total || estado.reservas.length}
                exibidos={reservasFiltradas.length}
                singular="reserva"
                plural="reservas"
                filtrosAtivos={[
                  filtros.busca
                    ? { label: `Busca: "${filtros.busca}"`, onRemove: () => atualizarFiltrosReservas({ busca: '' }) }
                    : null,
                  filtros.status !== 'TODAS'
                    ? { label: `Status: ${rotuloStatus[filtros.status]}`, onRemove: () => atualizarFiltrosReservas({ status: 'TODAS' }) }
                    : null,
                  filtros.areaComumId !== 'TODAS'
                    ? {
                        label: `Área: ${estado.areasComuns.find((area) => String(area.id) === filtros.areaComumId)?.nome ?? 'Selecionada'}`,
                        onRemove: () => atualizarFiltrosReservas({ areaComumId: 'TODAS' }),
                      }
                    : null,
                  filtros.ordem !== 'PROXIMAS'
                    ? { label: 'Ordenação: Início mais distante', onRemove: () => atualizarFiltrosReservas({ ordem: 'PROXIMAS' }) }
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

              {reservasFiltradas.length === 0 ? (
                estado.reservas.length > 0 ? (
                  <FilteredEmptyState icon={CalendarDays} onClear={limparFiltrosReservas} />
                ) : (
                  <EmptyState icon={CalendarDays} title="Nenhuma reserva encontrada." description="Use o formulário ao lado para solicitar uma." />
                )
              ) : (
                <div className="grid gap-4">
                  {reservasFiltradas.map((reserva) => (
                    <div key={reserva.id} className={['rounded-3xl border p-4', classeCardStatus[reserva.status]].join(' ')}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h4 className="text-base font-bold text-slate-950">{reserva.titulo ?? reserva.areaComum.nome}</h4>
                          <p className="mt-1 text-sm text-slate-600">{reserva.areaComum.nome}</p>
                        </div>
                        <ReservaStatusBadge status={reserva.status} />
                      </div>

                      <div className="mt-4 grid gap-3 rounded-2xl border border-white bg-white p-4 text-sm text-slate-700 shadow-sm">
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-orange-500" />
                          <span>{formatarDataHora(reserva.inicioEm)} → {formatarDataHora(reserva.fimEm)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPinned className="h-4 w-4 text-orange-500" />
                          <span>{reserva.unidade?.identificador ?? 'Unidade não informada'}</span>
                        </div>
                      </div>

                      {reserva.observacoes ? (
                        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{reserva.observacoes}</p>
                      ) : null}

                      {reserva.motivoRecusa ? (
                        <p className="mt-4 rounded-2xl border border-red-200 bg-white p-3 text-sm font-semibold leading-6 text-red-700">
                          Motivo da recusa: {reserva.motivoRecusa}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <ReservaSituacaoBadge reserva={reserva} />

                        {podeCancelarReserva(reserva) ? (
                          <button
                            type="button"
                            onClick={() => void cancelarReserva(reserva)}
                            disabled={reservaCancelandoId === reserva.id}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {reservaCancelandoId === reserva.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                            Cancelar solicitação
                          </button>
                        ) : null}
                      </div>
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
