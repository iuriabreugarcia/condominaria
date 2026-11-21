import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Filter,
  LoaderCircle,
  Search,
  Send,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
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
import { PageSkeleton } from '../components/PageSkeleton';
import { Pagination } from '../components/shared/Pagination';
import { PageHeader } from '../components/PageHeader';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSearchShortcut } from '../hooks/useSearchShortcut';
import { useCloseFiltersShortcut } from '../hooks/useCloseFiltersShortcut';
import { FilterSummary } from '../components/FilterSummary';
import { FilteredEmptyState } from '../components/FilteredEmptyState';
import {
  EmptyState,
  ErrorState,
} from '../components/FeedbackState';
import { usePortal } from '../context/PortalContext';
import { usePortalConfiguracoes } from '../hooks/usePortalConfiguracoes';
import { apiRequest, ApiError } from '../lib/api';
import { obterMoradorAtivo } from '../lib/portal';
import type {
  AutorizacaoVisitantePortal,
  CriarAutorizacaoVisitantePortalPayload,
  PortalMoradorMeResponse,
  UnidadeDisponivelPortal,
  VisitanteRecentePortal,
} from '../types/api';

type ModoVisitante = 'novo' | 'recente';


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
  contexto: PortalMoradorMeResponse | null;
  unidades: UnidadeDisponivelPortal[];
  visitantesRecentes: VisitanteRecentePortal[];
  autorizacoes: AutorizacaoVisitantePortal[];
};

type FormularioAutorizacao = {
  modo: ModoVisitante;
  unidadeId: string;
  visitanteId: string;
  nome: string;
  documento: string;
  telefone: string;
  inicioEm: string;
  fimEm: string;
  observacoes: string;
};

type StatusAutorizacaoCalculado = 'ATIVA' | 'EXPIRADA' | 'CANCELADA' | 'ENCERRADA';

type FiltrosAutorizacao = {
  busca: string;
  status: 'TODAS' | StatusAutorizacaoCalculado;
  ordem: 'RECENTES' | 'ANTIGAS' | 'VENCIMENTO';
};

const formularioInicial: FormularioAutorizacao = {
  modo: 'novo',
  unidadeId: '',
  visitanteId: '',
  nome: '',
  documento: '',
  telefone: '',
  inicioEm: '',
  fimEm: '',
  observacoes: '',
};

const filtrosIniciais: FiltrosAutorizacao = {
  busca: '',
  status: 'TODAS',
  ordem: 'RECENTES',
};

function formatarDataHora(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(data));
}

function mensagemErroAmigavel(
  error: unknown,
  fallback = 'Não foi possível concluir a solicitação.',
) {
  const mensagem = error instanceof ApiError
    ? error.message
    : error instanceof Error
      ? error.message
      : '';

  const texto = String(mensagem ?? '').trim();
  const normalizado = texto.toLowerCase();

  if (
    !texto ||
    normalizado.includes('internal server error') ||
    normalizado.includes('prismaclient') ||
    normalizado.includes('unknown column') ||
    normalizado.includes('p2022')
  ) {
    return fallback;
  }

  if (
    normalizado.includes('failed to fetch') ||
    normalizado.includes('networkerror') ||
    normalizado.includes('network request failed')
  ) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
  }

  if (normalizado.includes('unauthorized') || normalizado.includes('401')) {
    return 'Sua sessão expirou. Faça login novamente para continuar.';
  }

  if (normalizado.includes('forbidden') || normalizado.includes('403')) {
    return 'Você não tem permissão para acessar esta informação.';
  }

  return texto;
}

function converterParaIso(valor: string) {
  return new Date(valor).toISOString();
}

function normalizarBusca(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function somenteDigitos(valor: string) {
  return valor.replace(/\D/g, '');
}

function formatarTelefoneVisitante(valor: string) {
  const digitos = somenteDigitos(valor).slice(0, 11);

  if (digitos.length <= 2) {
    return digitos;
  }

  if (digitos.length <= 6) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  }

  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }

  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

function limitarDocumentoVisitante(valor: string) {
  return valor.slice(0, 30);
}

function dataHoraLocalMinimaVisitante() {
  const agora = new Date();
  agora.setSeconds(0, 0);

  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  const hora = String(agora.getHours()).padStart(2, '0');
  const minuto = String(agora.getMinutes()).padStart(2, '0');

  return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
}

function statusCalculadoAutorizacao(autorizacao: AutorizacaoVisitantePortal): StatusAutorizacaoCalculado {
  if (autorizacao.status === 'CANCELADA' || autorizacao.status === 'ENCERRADA') {
    return autorizacao.status;
  }

  if (new Date(autorizacao.fimEm).getTime() < Date.now()) {
    return 'EXPIRADA';
  }

  return 'ATIVA';
}

function rotuloStatus(status: string) {
  switch (status) {
    case 'ATIVA':
      return 'Autorizado';
    case 'CANCELADA':
      return 'Cancelado';
    case 'ENCERRADA':
      return 'Encerrado';
    case 'EXPIRADA':
      return 'Expirado';
    default:
      return status;
  }
}

function classeStatus(status: string) {
  switch (status) {
    case 'ATIVA':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'CANCELADA':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'ENCERRADA':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'EXPIRADA':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200';
  }
}

function AutorizacaoStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={[
        'inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold',
        classeStatus(status),
      ].join(' ')}
    >
      {rotuloStatus(status)}
    </span>
  );
}

function ResumoVisitanteCard({
  titulo,
  valor,
  descricao,
  variante,
  icon,
}: {
  titulo: string;
  valor: number;
  descricao: string;
  variante: 'orange' | 'emerald' | 'amber' | 'blue' | 'slate';
  icon: ReactNode;
}) {
  const estilos = {
    orange: 'border-orange-100 bg-orange-50 text-orange-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-500',
  } satisfies Record<string, string>;

  const valores = {
    orange: 'text-orange-950',
    emerald: 'text-emerald-950',
    amber: 'text-amber-950',
    blue: 'text-blue-950',
    slate: 'text-slate-950',
  } satisfies Record<string, string>;

  return (
    <article className={['rounded-3xl border p-4 shadow-sm', estilos[variante]].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em]">
            {titulo}
          </p>
          <p className={['mt-2 text-2xl font-bold', valores[variante]].join(' ')}>
            {valor}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          {icon}
        </div>
      </div>
      <p className="mt-2 text-xs font-semibold opacity-80">{descricao}</p>
    </article>
  );
}

function validarAutorizacaoVisitante(formulario: FormularioAutorizacao) {
  if (!formulario.unidadeId) {
    return 'Selecione a unidade para a autorização.';
  }

  if (formulario.modo === 'novo' && !formulario.nome.trim()) {
    return 'Informe o nome do visitante.';
  }

  if (formulario.modo === 'recente' && !formulario.visitanteId) {
    return 'Selecione um visitante recente para reutilizar.';
  }

  if (!formulario.inicioEm || !formulario.fimEm) {
    return 'Informe o período de início e fim da autorização.';
  }

  const inicio = new Date(formulario.inicioEm);
  const fim = new Date(formulario.fimEm);
  const agora = new Date();

  if (
    Number.isNaN(inicio.getTime()) ||
    Number.isNaN(fim.getTime())
  ) {
    return 'Informe datas válidas para a autorização.';
  }

  if (inicio < agora) {
    return 'A autorização não pode começar em uma data ou horário já passado.';
  }

  if (fim <= inicio) {
    return 'O horário final deve ser posterior ao horário inicial.';
  }

  return '';
}

function montarTextoAutorizacao(autorizacao: AutorizacaoVisitantePortal) {
  const linhas = [
    'Autorização de visitante',
    '',
    `Visitante: ${autorizacao.visitante.nome}`,
    `Unidade: ${autorizacao.unidade.identificador}`,
    `Início: ${formatarDataHora(autorizacao.inicioEm)}`,
    `Fim: ${formatarDataHora(autorizacao.fimEm)}`,
  ];

  if (autorizacao.visitante.documento) {
    linhas.push(`Documento: ${autorizacao.visitante.documento}`);
  }

  if (autorizacao.visitante.telefone) {
    linhas.push(`Telefone: ${autorizacao.visitante.telefone}`);
  }

  if (autorizacao.observacoes) {
    linhas.push('', `Observações: ${autorizacao.observacoes}`);
  }

  return linhas.join('\n');
}

export function VisitantesPage() {
  const online = useOnlineStatus();
  const { contexto, moradorAtivo: moradorContexto, carregando: carregandoPortal, erro: erroPortal } = usePortal();
  const { configuracoes: configuracoesPortal } = usePortalConfiguracoes();
  const [searchParams, setSearchParams] = useSearchParams();
  const buscaInputRef = useRef<HTMLInputElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  usePageTitle('Visitantes');

  const [recarregarToken, setRecarregarToken] = useState(0);
  const [paginacao, setPaginacao] = useState<PaginacaoState>(paginacaoInicial());
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [estado, setEstado] = useState<EstadoPagina>({
    carregando: true,
    erro: '',
    contexto: null,
    unidades: [],
    visitantesRecentes: [],
    autorizacoes: [],
  });
  const [formulario, setFormulario] = useState<FormularioAutorizacao>(formularioInicial);
  const [filtros, setFiltros] = useState<FiltrosAutorizacao>(filtrosIniciais);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  useSearchShortcut({ inputRef: buscaInputRef });
  useCloseFiltersShortcut({
    aberto: filtrosAbertos,
    onClose: () => setFiltrosAbertos(false),
  });

  const morador = estado.contexto
    ? obterMoradorAtivo(estado.contexto)
    : null;

  const totalFiltrosAtivos = [
    filtros.busca.trim(),
    filtros.status !== 'TODAS',
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
    const ordemParam = searchParams.get('ordem');

    const status: FiltrosAutorizacao['status'] =
      statusParam === 'ATIVA' ||
      statusParam === 'EXPIRADA' ||
      statusParam === 'CANCELADA' ||
      statusParam === 'ENCERRADA'
        ? statusParam
        : 'TODAS';

    const ordem: FiltrosAutorizacao['ordem'] =
      ordemParam === 'ANTIGAS' || ordemParam === 'VENCIMENTO'
        ? ordemParam
        : 'RECENTES';

    setFiltros((atual) => ({
      ...atual,
      busca: buscaParam,
      status,
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
          unidades: [],
          visitantesRecentes: [],
          autorizacoes: [],
        });
        return;
      }

      setEstado((atual) => ({ ...atual, carregando: true, erro: '' }));

      try {
        const moradorAtual = moradorContexto;
        const [unidades, visitantesRecentes, autorizacoes] = await Promise.all([
          apiRequest<UnidadeDisponivelPortal[]>(
            `/portal-morador/condominios/${moradorAtual.condominioId}/unidades`,
          ),
          apiRequest<VisitanteRecentePortal[]>(
            `/portal-morador/condominios/${moradorAtual.condominioId}/visitantes/recentes`,
          ),
          apiRequest<AutorizacaoVisitantePortal[] | ApiListResponse<AutorizacaoVisitantePortal>>(
            `/portal-morador/condominios/${moradorAtual.condominioId}/visitantes/autorizacoes${montarQueryPaginada(paginacao.page)}`,
          ),
        ]);

        const { items: autorizacoesNormalizadas, paginacao: paginacaoResposta } = normalizarListaPaginada(autorizacoes);
        setPaginacao(paginacaoResposta);

        const unidadePrincipal =
          unidades.find((item) => item.principal) ?? unidades[0];

        setEstado({
          carregando: false,
          erro: '',
          contexto,
          unidades,
          visitantesRecentes,
          autorizacoes: autorizacoesNormalizadas,
        });
        setUltimaAtualizacao(new Date());

        setFormulario((atual) => ({
          ...atual,
          unidadeId: atual.unidadeId || (unidadePrincipal ? String(unidadePrincipal.unidade.id) : ''),
        }));
      } catch (error) {
        setEstado({
          carregando: false,
          erro: mensagemErroAmigavel(
            error,
            'Não foi possível carregar os dados de visitantes.',
          ),
          contexto: null,
          unidades: [],
          visitantesRecentes: [],
          autorizacoes: [],
        });
      }
    }

    void carregar();
  }, [carregandoPortal, contexto, erroPortal, moradorContexto, paginacao.page, recarregarToken]);

  function atualizarUrlVisitantes(proximos: FiltrosAutorizacao) {
    const params = new URLSearchParams();

    if (proximos.busca.trim()) {
      params.set('busca', proximos.busca.trim());
    }

    if (proximos.status !== 'TODAS') {
      params.set('status', proximos.status);
    }

    if (proximos.ordem !== 'RECENTES') {
      params.set('ordem', proximos.ordem);
    }

    setSearchParams(params, { replace: true });
  }

  function atualizarFiltrosVisitantes(parcial: Partial<FiltrosAutorizacao>) {
    const proximos = { ...filtros, ...parcial };
    setPaginacao((atual) => ({
      ...atual,
      page: 1,
    }));
    setFiltros(proximos);
    atualizarUrlVisitantes(proximos);
  }

  function limparFiltrosVisitantes() {
    setPaginacao((atual) => ({
      ...atual,
      page: 1,
    }));
    setSearchParams({}, { replace: true });
  }

  const dataMinimaVisitante = dataHoraLocalMinimaVisitante();
  const erroFormularioVisitante = validarAutorizacaoVisitante(formulario);

  const resumoAutorizacoes = useMemo(() => {
    return estado.autorizacoes.reduce(
      (total, autorizacao) => {
        const status = statusCalculadoAutorizacao(autorizacao);
        total.total += 1;

        if (status === 'ATIVA') {
          total.ativas += 1;
        }

        if (status === 'EXPIRADA' || status === 'ENCERRADA') {
          total.encerradas += 1;
        }

        if (status === 'CANCELADA') {
          total.canceladas += 1;
        }

        const hoje = new Date();
        const fim = new Date(autorizacao.fimEm);

        if (
          status === 'ATIVA' &&
          fim.getFullYear() === hoje.getFullYear() &&
          fim.getMonth() === hoje.getMonth() &&
          fim.getDate() === hoje.getDate()
        ) {
          total.expiramHoje += 1;
        }

        return total;
      },
      {
        total: 0,
        ativas: 0,
        encerradas: 0,
        canceladas: 0,
        expiramHoje: 0,
      },
    );
  }, [estado.autorizacoes]);

  const autorizacoesFiltradas = useMemo(() => {
    const busca = normalizarBusca(filtros.busca);

    return [...estado.autorizacoes]
      .filter((autorizacao) => {
        const status = statusCalculadoAutorizacao(autorizacao);

        if (filtros.status !== 'TODAS' && status !== filtros.status) {
          return false;
        }

        if (!busca) {
          return true;
        }

        const conteudo = normalizarBusca([
          autorizacao.visitante.nome,
          autorizacao.visitante.documento ?? '',
          autorizacao.visitante.telefone ?? '',
          autorizacao.unidade.identificador,
          autorizacao.observacoes ?? '',
        ].join(' '));

        return conteudo.includes(busca);
      })
      .sort((a, b) => {
        if (filtros.ordem === 'VENCIMENTO') {
          return new Date(a.fimEm).getTime() - new Date(b.fimEm).getTime();
        }

        const diferenca = new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
        return filtros.ordem === 'ANTIGAS' ? -diferenca : diferenca;
      });
  }, [estado.autorizacoes, filtros]);

  const proximaAutorizacao = useMemo(() => {
    return [...estado.autorizacoes]
      .filter((autorizacao) => statusCalculadoAutorizacao(autorizacao) === 'ATIVA')
      .sort((a, b) => new Date(a.inicioEm).getTime() - new Date(b.inicioEm).getTime())[0] ?? null;
  }, [estado.autorizacoes]);

  function limparFormularioVisitante() {
    const confirmou = window.confirm('Deseja realmente limpar os dados preenchidos da autorização?');

    if (!confirmou) {
      return;
    }

    setFormulario((atual) => ({
      ...formularioInicial,
      unidadeId: atual.unidadeId,
    }));
    setErroFormulario('');
    setMensagemSucesso('');
  }

  const atualizarDadosPagina = useCallback(() => {
    setEstado((atual) => ({ ...atual, carregando: true, erro: '' }));
    setRecarregarToken((atual) => atual + 1);
  }, []);

  async function copiarTextoAutorizacao(autorizacao: AutorizacaoVisitantePortal) {
    try {
      await navigator.clipboard.writeText(montarTextoAutorizacao(autorizacao));
      setMensagemSucesso('Dados da autorização copiados.');
      setErroFormulario('');
    } catch {
      setErroFormulario('Não foi possível copiar a autorização.');
    }
  }

  function abrirWhatsappVisitante(autorizacao: AutorizacaoVisitantePortal) {
    const telefone = somenteDigitos(autorizacao.visitante.telefone ?? '');

    if (!telefone) {
      return;
    }

    const numero = telefone.startsWith('55') ? telefone : `55${telefone}`;
    const texto = encodeURIComponent(montarTextoAutorizacao(autorizacao));
    window.open(`https://wa.me/${numero}?text=${texto}`, '_blank', 'noopener,noreferrer');
  }

  async function autorizarVisitante(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!online) {
      setMensagemSucesso('');
      setErroFormulario('Sem conexão com a internet. Aguarde a reconexão para autorizar o visitante.');
      return;
    }

    const erroAutorizacao = validarAutorizacaoVisitante(formulario);

    if (erroAutorizacao) {
      setMensagemSucesso('');
      setErroFormulario(erroAutorizacao);
      return;
    }

    if (!morador) {
      setErroFormulario('Nenhum perfil de morador selecionado para criar autorização.');
      return;
    }

    setSalvando(true);
    setMensagemSucesso('');
    setErroFormulario('');
    setEstado((atual) => ({ ...atual, erro: '' }));

    try {
      const payload: CriarAutorizacaoVisitantePortalPayload = {
        unidadeId: Number(formulario.unidadeId),
        inicioEm: converterParaIso(formulario.inicioEm),
        fimEm: converterParaIso(formulario.fimEm),
      };

      const observacoes = formulario.observacoes.trim();

      if (observacoes) {
        payload.observacoes = observacoes;
      }

      if (formulario.modo === 'recente') {
        payload.visitanteId = Number(formulario.visitanteId);
      } else {
        payload.nome = formulario.nome.trim();

        const documento = formulario.documento.trim();
        const telefone = formulario.telefone.trim();

        if (documento) {
          payload.documento = documento;
        }

        if (telefone) {
          payload.telefone = telefone;
        }
      }

      const novaAutorizacao = await apiRequest<AutorizacaoVisitantePortal>(
        `/portal-morador/condominios/${morador.condominioId}/visitantes/autorizacoes`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setEstado((atual) => ({
        ...atual,
        autorizacoes: [novaAutorizacao, ...atual.autorizacoes],
        visitantesRecentes: formulario.modo === 'novo'
          ? [
              {
                ...novaAutorizacao.visitante,
                ativo: true,
              },
              ...atual.visitantesRecentes,
            ]
          : atual.visitantesRecentes,
      }));

      setFormulario((atual) => ({
        ...formularioInicial,
        unidadeId: atual.unidadeId,
      }));

      setMensagemSucesso('Autorização criada com sucesso.');
    } catch (error) {
      setErroFormulario(
        mensagemErroAmigavel(error, 'Não foi possível criar a autorização.'),
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppShell
      nomeCondominio={morador?.condominio.nome}
      nomeMorador={morador?.nome}
      perfis={estado.contexto?.moradores ?? []}
    >
      <PageHeader
        title="Visitantes"
        description="Autorize entradas, reaproveite cadastros recentes e acompanhe liberações ativas."
        ultimaAtualizacao={ultimaAtualizacao}
        carregando={estado.carregando}
        onRefresh={atualizarDadosPagina}
        actions={
          <a
            href="#nova-autorizacao"
            className="inline-flex h-11 items-center justify-center rounded-full bg-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
          >
            Autorizar visitante
          </a>
        }
      />

      {estado.carregando ? <PageSkeleton cards={3} linhas={4} /> : null}

      {configuracoesPortal?.instrucoesVisitantes ? (
        <section className="rounded-3xl border border-orange-100 bg-orange-50 p-4 text-sm leading-6 text-orange-950 shadow-sm md:p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-orange-700">
            Instruções para visitantes
          </p>
          <p className="mt-2 whitespace-pre-line">{configuracoesPortal.instrucoesVisitantes}</p>
        </section>
      ) : null}

      <div ref={feedbackRef} tabIndex={-1} className="scroll-mt-28 outline-none" />

      {estado.erro ? <ErrorState message={estado.erro} /> : null}

      {erroFormulario ? (
        <div className="mb-5 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {erroFormulario}
        </div>
      ) : null}

      {mensagemSucesso ? (
        <div className="mb-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          {mensagemSucesso}
        </div>
      ) : null}

      {!estado.carregando && !estado.erro ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ResumoVisitanteCard
              titulo="Autorizações"
              valor={resumoAutorizacoes.total}
              descricao="Total registrado no portal"
              variante="orange"
              icon={<ShieldCheck className="h-5 w-5" />}
            />
            <ResumoVisitanteCard
              titulo="Ativas"
              valor={resumoAutorizacoes.ativas}
              descricao="Liberações dentro do prazo"
              variante="emerald"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <ResumoVisitanteCard
              titulo="Expiram hoje"
              valor={resumoAutorizacoes.expiramHoje}
              descricao="Atenção ao vencimento"
              variante="amber"
              icon={<Clock3 className="h-5 w-5" />}
            />
            <ResumoVisitanteCard
              titulo="Encerradas"
              valor={resumoAutorizacoes.encerradas}
              descricao="Histórico concluído"
              variante="blue"
              icon={<ClipboardCheck className="h-5 w-5" />}
            />
            <ResumoVisitanteCard
              titulo="Canceladas"
              valor={resumoAutorizacoes.canceladas}
              descricao="Liberações revogadas"
              variante="slate"
              icon={<XCircle className="h-5 w-5" />}
            />
          </section>

          {proximaAutorizacao ? (
            <article className="mt-6 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Próxima autorização</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-950">{proximaAutorizacao.visitante.nome}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {proximaAutorizacao.unidade.identificador} • {formatarDataHora(proximaAutorizacao.inicioEm)} até {formatarDataHora(proximaAutorizacao.fimEm)}
                  </p>
                </div>
                <AutorizacaoStatusBadge status="ATIVA" />
              </div>
            </article>
          ) : null}

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <article id="nova-autorizacao" className="scroll-mt-28 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6" tabIndex={-1}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <UserRoundPlus className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Nova autorização</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">Autorizar visitante</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Libere o acesso de um visitante para sua unidade por período definido.</p>
                </div>
              </div>

              <form onSubmit={autorizarVisitante} className="mt-5 grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setFormulario((atual) => ({ ...atual, modo: 'novo', visitanteId: '' }))}
                    className={[
                      'rounded-2xl border px-4 py-3 text-left transition',
                      formulario.modo === 'novo'
                        ? 'border-orange-300 bg-orange-50 text-orange-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-orange-200',
                    ].join(' ')}
                  >
                    <p className="font-bold">Novo visitante</p>
                    <p className="mt-1 text-xs leading-5">Cadastre nome, documento e telefone.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormulario((atual) => ({ ...atual, modo: 'recente', nome: '', documento: '', telefone: '' }))}
                    className={[
                      'rounded-2xl border px-4 py-3 text-left transition',
                      formulario.modo === 'recente'
                        ? 'border-orange-300 bg-orange-50 text-orange-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-orange-200',
                    ].join(' ')}
                  >
                    <p className="font-bold">Visitante recente</p>
                    <p className="mt-1 text-xs leading-5">Reutilize um cadastro já autorizado.</p>
                  </button>
                </div>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Unidade</span>
                  <select
                    value={formulario.unidadeId}
                    onChange={(event) => setFormulario((atual) => ({ ...atual, unidadeId: event.target.value }))}
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    required
                  >
                    <option value="">Selecione a unidade</option>
                    {estado.unidades.map((unidade) => (
                      <option key={unidade.unidade.id} value={unidade.unidade.id}>
                        {unidade.unidade.identificador}
                      </option>
                    ))}
                  </select>
                </label>

                {formulario.modo === 'recente' ? (
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Visitante</span>
                    <select
                      value={formulario.visitanteId}
                      onChange={(event) => setFormulario((atual) => ({ ...atual, visitanteId: event.target.value }))}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      required
                    >
                      <option value="">Selecione o visitante</option>
                      {estado.visitantesRecentes.map((visitante) => (
                        <option key={visitante.id} value={visitante.id}>
                          {visitante.nome}{visitante.documento ? ` • ${visitante.documento}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 sm:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Nome do visitante</span>
                      <input
                        value={formulario.nome}
                        onChange={(event) => setFormulario((atual) => ({ ...atual, nome: event.target.value }))}
                        placeholder="Nome completo"
                        className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        required
                      />
                    </label>
                    <input
                      value={formulario.documento}
                      onChange={(event) => setFormulario((atual) => ({ ...atual, documento: limitarDocumentoVisitante(event.target.value) }))}
                      placeholder="Documento"
                      className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                    <input
                      value={formulario.telefone}
                      onChange={(event) => setFormulario((atual) => ({ ...atual, telefone: formatarTelefoneVisitante(event.target.value) }))}
                      placeholder="Telefone"
                      className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Início</span>
                    <input
                      type="datetime-local"
                      min={dataMinimaVisitante}
                      value={formulario.inicioEm}
                      onChange={(event) => setFormulario((atual) => ({ ...atual, inicioEm: event.target.value }))}
                      className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      required
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Fim</span>
                    <input
                      type="datetime-local"
                      min={formulario.inicioEm || dataMinimaVisitante}
                      value={formulario.fimEm}
                      onChange={(event) => setFormulario((atual) => ({ ...atual, fimEm: event.target.value }))}
                      className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      required
                    />
                  </label>
                </div>

                <textarea
                  value={formulario.observacoes}
                  onChange={(event) => setFormulario((atual) => ({ ...atual, observacoes: event.target.value }))}
                  placeholder="Observações para a portaria"
                  rows={3}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                {erroFormularioVisitante ? (
                  <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    {erroFormularioVisitante}
                  </p>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={salvando}
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {salvando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {salvando ? 'Salvando...' : 'Criar autorização'}
                  </button>
                  <button
                    type="button"
                    onClick={limparFormularioVisitante}
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                  >
                    Limpar
                  </button>
                </div>
              </form>
            </article>

            <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Histórico</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">Autorizações</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Filtre e acompanhe visitantes já autorizados para sua unidade.</p>
                </div>
                <UsersRound className="h-5 w-5 text-orange-500" />
              </div>

              <div className="mt-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
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

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={limparFiltrosVisitantes}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
                    >
                      Limpar filtros
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltrosAbertos((atual) => !atual)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-orange-300 hover:text-orange-700 xl:hidden"
                    >
                      {filtrosAbertos ? 'Ocultar' : 'Mostrar'}
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
                      onChange={(event) => atualizarFiltrosVisitantes({ busca: event.target.value })}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-12 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      placeholder="Buscar por visitante, documento, telefone ou unidade"
                    />
                    {filtros.busca ? (
                      <button
                        type="button"
                        onClick={() => atualizarFiltrosVisitantes({ busca: '' })}
                        aria-label="Limpar busca"
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold leading-none text-slate-500 shadow-sm transition hover:border-orange-300 hover:text-orange-700"
                      >
                        ×
                      </button>
                    ) : null}
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={filtros.status}
                      onChange={(event) => atualizarFiltrosVisitantes({ status: event.target.value as FiltrosAutorizacao['status'] })}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="TODAS">Todas</option>
                      <option value="ATIVA">Ativas</option>
                      <option value="EXPIRADA">Expiradas</option>
                      <option value="ENCERRADA">Encerradas</option>
                      <option value="CANCELADA">Canceladas</option>
                    </select>
                    <select
                      value={filtros.ordem}
                      onChange={(event) => atualizarFiltrosVisitantes({ ordem: event.target.value as FiltrosAutorizacao['ordem'] })}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="RECENTES">Mais recentes</option>
                      <option value="ANTIGAS">Mais antigas</option>
                      <option value="VENCIMENTO">Vencimento próximo</option>
                    </select>
                  </div>
                </div>
              </div>

              <FilterSummary
                total={paginacao.total || estado.autorizacoes.length}
                exibidos={autorizacoesFiltradas.length}
                singular="autorização"
                plural="autorizações"
                filtrosAtivos={[
                  filtros.busca
                    ? {
                        label: `Busca: "${filtros.busca}"`,
                        onRemove: () => atualizarFiltrosVisitantes({ busca: '' }),
                      }
                    : null,
                  filtros.status !== 'TODAS'
                    ? {
                        label: `Status: ${rotuloStatus(filtros.status)}`,
                        onRemove: () => atualizarFiltrosVisitantes({ status: 'TODAS' }),
                      }
                    : null,
                  filtros.ordem !== 'RECENTES'
                    ? {
                        label: filtros.ordem === 'ANTIGAS' ? 'Ordenação: mais antigas' : 'Ordenação: vencimento próximo',
                        onRemove: () => atualizarFiltrosVisitantes({ ordem: 'RECENTES' }),
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

              {autorizacoesFiltradas.length === 0 ? (
                estado.autorizacoes.length > 0 ? (
                  <FilteredEmptyState icon={ClipboardCheck} onClear={limparFiltrosVisitantes} />
                ) : (
                  <EmptyState icon={ClipboardCheck} title="Nenhuma autorização encontrada." description="Use o formulário ao lado para criar a primeira autorização de visitante." />
                )
              ) : (
                <div className="mt-4 grid gap-4">
                  {autorizacoesFiltradas.map((autorizacao) => {
                    const status = statusCalculadoAutorizacao(autorizacao);
                    const podeWhatsApp = Boolean(somenteDigitos(autorizacao.visitante.telefone ?? ''));

                    return (
                      <div key={autorizacao.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h4 className="text-base font-bold text-slate-950">{autorizacao.visitante.nome}</h4>
                            <p className="mt-1 text-sm text-slate-600">{autorizacao.unidade.identificador}</p>
                          </div>
                          <AutorizacaoStatusBadge status={status} />
                        </div>

                        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-orange-500" />
                            <span>{formatarDataHora(autorizacao.inicioEm)} → {formatarDataHora(autorizacao.fimEm)}</span>
                          </div>
                          {autorizacao.visitante.documento ? <p><strong>Documento:</strong> {autorizacao.visitante.documento}</p> : null}
                          {autorizacao.visitante.telefone ? <p><strong>Telefone:</strong> {autorizacao.visitante.telefone}</p> : null}
                          {autorizacao.observacoes ? <p className="whitespace-pre-line"><strong>Observações:</strong> {autorizacao.observacoes}</p> : null}
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => void copiarTextoAutorizacao(autorizacao)}
                            className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                          >
                            Copiar autorização
                          </button>
                          {podeWhatsApp ? (
                            <button
                              type="button"
                              onClick={() => abrirWhatsappVisitante(autorizacao)}
                              className="inline-flex h-10 items-center justify-center rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600"
                            >
                              Enviar WhatsApp
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
