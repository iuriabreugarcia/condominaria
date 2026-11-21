import {
  CalendarDays,
  CheckCircle2,
  Filter,
  Megaphone,
  Search,
  Star,
} from 'lucide-react';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { PageSkeleton } from '../components/PageSkeleton';
import { PageHeader } from '../components/PageHeader';
import { FilterSummary } from '../components/FilterSummary';
import { FilteredEmptyState } from '../components/FilteredEmptyState';
import {
  EmptyState,
  ErrorState,
} from '../components/FeedbackState';
import { usePortal } from '../context/PortalContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSearchShortcut } from '../hooks/useSearchShortcut';
import { useCloseFiltersShortcut } from '../hooks/useCloseFiltersShortcut';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useRefreshOnReconnect } from '../hooks/useRefreshOnReconnect';
import { usePortalConfiguracoes } from '../hooks/usePortalConfiguracoes';
import { apiRequest, ApiError } from '../lib/api';
import { obterMoradorAtivo } from '../lib/portal';
import type {
  ComunicadoPortal,
  PortalMoradorMeResponse,
} from '../types/api';

type EstadoPagina = {
  carregando: boolean;
  erro: string;
  contexto: PortalMoradorMeResponse | null;
  comunicados: ComunicadoPortal[];
  paginacao: PaginacaoPortal;
};

type FiltrosComunicado = {
  busca: string;
  destaque: 'TODOS' | 'SIM' | 'NAO';
  ordem: 'RECENTES' | 'ANTIGOS' | 'DESTAQUES';
  leitura: 'TODOS' | 'LIDOS' | 'NAO_LIDOS';
};

type ResumoComunicados = {
  total: number;
  lidos: number;
  naoLidos: number;
  destaques: number;
  expirando: number;
};

const filtrosIniciais: FiltrosComunicado = {
  busca: '',
  destaque: 'TODOS',
  ordem: 'RECENTES',
  leitura: 'TODOS',
};

type ApiListResponse<T> = {
  items?: T[];
  data?: T[];
  total?: number | string;
  page?: number | string;
  limit?: number | string;
  totalPages?: number | string;
};

type PaginacaoPortal = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const LIMITE_PAGINA_PORTAL = 10;

const paginacaoInicialPortal: PaginacaoPortal = {
  page: 1,
  limit: LIMITE_PAGINA_PORTAL,
  total: 0,
  totalPages: 1,
};

function numeroSeguro(valor: number | string | null | undefined, fallback = 0) {
  const numero = Number(valor ?? fallback);

  return Number.isFinite(numero) ? numero : fallback;
}

function normalizarRespostaPaginada<T>(
  resposta: T[] | ApiListResponse<T>,
  paginaFallback: number,
  limiteFallback = LIMITE_PAGINA_PORTAL,
) {
  if (Array.isArray(resposta)) {
    return {
      items: resposta,
      paginacao: {
        page: paginaFallback,
        limit: limiteFallback,
        total: resposta.length,
        totalPages: Math.max(1, Math.ceil(resposta.length / limiteFallback)),
      },
    };
  }

  const items = resposta.items ?? resposta.data ?? [];
  const total = numeroSeguro(resposta.total, items.length);
  const page = Math.max(1, numeroSeguro(resposta.page, paginaFallback));
  const limit = Math.max(1, numeroSeguro(resposta.limit, limiteFallback));
  const totalPages = Math.max(
    1,
    numeroSeguro(resposta.totalPages, Math.ceil(total / limit) || 1),
  );

  return {
    items,
    paginacao: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

function montarQueryStringPortal(
  parametros: Record<string, string | number | null | undefined>,
) {
  const searchParams = new URLSearchParams();

  Object.entries(parametros).forEach(([chave, valor]) => {
    const normalizado = String(valor ?? '').trim();

    if (normalizado) {
      searchParams.set(chave, normalizado);
    }
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}

function PaginacaoPortal({
  paginacao,
  onChange,
}: {
  paginacao: PaginacaoPortal;
  onChange: (pagina: number) => void;
}) {
  if (paginacao.totalPages <= 1) {
    return null;
  }

  const paginaAtual = Math.min(
    Math.max(1, paginacao.page),
    paginacao.totalPages,
  );

  const paginas = Array.from(
    {
      length: Math.min(5, paginacao.totalPages),
    },
    (_, index) => {
      const inicio = Math.min(
        Math.max(1, paginaAtual - 2),
        Math.max(1, paginacao.totalPages - 4),
      );

      return inicio + index;
    },
  ).filter((pagina) => pagina <= paginacao.totalPages);

  const inicioRegistro = Math.min(
    paginacao.total,
    (paginaAtual - 1) * paginacao.limit + 1,
  );
  const fimRegistro = Math.min(paginacao.total, paginaAtual * paginacao.limit);

  return (
    <nav
      className="mt-5 flex min-w-0 flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      aria-label="Paginação"
    >
      <p className="text-sm font-semibold text-slate-500">
        Exibindo{' '}
        <span className="font-bold text-slate-800">
          {inicioRegistro}-{fimRegistro}
        </span>{' '}
        de <span className="font-bold text-slate-800">{paginacao.total}</span>
      </p>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={paginaAtual <= 1}
          onClick={() => onChange(paginaAtual - 1)}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Anterior
        </button>

        {paginas.map((pagina) => {
          const ativa = pagina === paginaAtual;

          return (
            <button
              key={pagina}
              type="button"
              onClick={() => onChange(pagina)}
              className={[
                'inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-bold transition',
                ativa
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              ].join(' ')}
              aria-current={ativa ? 'page' : undefined}
            >
              {pagina}
            </button>
          );
        })}

        <button
          type="button"
          disabled={paginaAtual >= paginacao.totalPages}
          onClick={() => onChange(paginaAtual + 1)}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}


function formatarData(data: string | null | undefined) {
  if (!data) {
    return 'Data não informada';
  }

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) {
    return 'Data não informada';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(dataObj);
}

function normalizarBusca(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function mensagemErroAmigavel(error: unknown, fallback: string) {
  const mensagem =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : '';

  const normalizada = mensagem.toLowerCase();

  if (
    normalizada.includes('internal server error') ||
    normalizada.includes('prisma') ||
    normalizada.includes('p20') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('cannot read')
  ) {
    return 'Não foi possível carregar os comunicados agora. A administração técnica já pode verificar a estrutura do sistema.';
  }

  if (
    normalizada.includes('failed to fetch') ||
    normalizada.includes('network') ||
    normalizada.includes('timeout')
  ) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
  }

  return mensagem || fallback;
}

function estaExpirando(expiraEm: string | null | undefined) {
  if (!expiraEm) {
    return false;
  }

  const data = new Date(expiraEm).getTime();

  if (Number.isNaN(data)) {
    return false;
  }

  const agora = Date.now();
  const seteDias = 7 * 24 * 60 * 60 * 1000;

  return data >= agora && data <= agora + seteDias;
}

function LeituraStatusBadge({ lida }: { lida: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-sm',
        lida
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-amber-100 text-amber-800',
      ].join(' ')}
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
      {lida ? 'Lido' : 'Não lido'}
    </span>
  );
}

function DestaqueBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
      <Star className="h-3.5 w-3.5" />
      Destaque
    </span>
  );
}

function DataComunicadoBadge({ data }: { data: string | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
      <CalendarDays className="h-3.5 w-3.5" />
      {formatarData(data)}
    </span>
  );
}

function ResumoComunicadoCard({
  titulo,
  valor,
  descricao,
  destaque = 'neutro',
  icon,
  onClick,
}: {
  titulo: string;
  valor: number;
  descricao: string;
  destaque?: 'neutro' | 'orange' | 'amber' | 'emerald' | 'blue';
  icon: ReactNode;
  onClick?: () => void;
}) {
  const estilos = {
    neutro: 'border-slate-200 bg-white text-slate-950',
    orange: 'border-orange-100 bg-orange-50 text-orange-950',
    amber: 'border-amber-100 bg-amber-50 text-amber-950',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-950',
    blue: 'border-blue-100 bg-blue-50 text-blue-950',
  } as const;

  const conteudo = (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-current shadow-sm">
          {icon}
        </div>
        <span className="text-2xl font-bold">{valor}</span>
      </div>

      <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-70">
        {titulo}
      </p>
      <p className="mt-1 text-sm font-semibold leading-5 opacity-80">
        {descricao}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          'rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md',
          estilos[destaque],
        ].join(' ')}
      >
        {conteudo}
      </button>
    );
  }

  return (
    <div
      className={[
        'rounded-3xl border p-4 shadow-sm',
        estilos[destaque],
      ].join(' ')}
    >
      {conteudo}
    </div>
  );
}

export function ComunicadosPage() {
  const buscaInputRef = useRef<HTMLInputElement | null>(null);
  usePageTitle('Comunicados');

  const [recarregarToken, setRecarregarToken] = useState(0);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [estado, setEstado] = useState<EstadoPagina>({
    carregando: true,
    erro: '',
    contexto: null,
    comunicados: [],
    paginacao: paginacaoInicialPortal,
  });

  const [filtros, setFiltros] = useState<FiltrosComunicado>(filtrosIniciais);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [acaoLeituraId, setAcaoLeituraId] = useState<number | null>(null);

  const {
    contexto,
    moradorAtivo: moradorContexto,
    carregando: carregandoPortal,
    erro: erroPortal,
  } = usePortal();
  const { configuracoes: configuracoesPortal } = usePortalConfiguracoes();

  useEffect(() => {
    const buscaParam = searchParams.get('busca') ?? '';
    const destaqueParam = searchParams.get('destaque');
    const ordemParam = searchParams.get('ordem');
    const leituraParam = searchParams.get('leitura');

    const destaque: FiltrosComunicado['destaque'] =
      destaqueParam === 'SIM' || destaqueParam === 'NAO'
        ? destaqueParam
        : 'TODOS';

    const ordem: FiltrosComunicado['ordem'] =
      ordemParam === 'ANTIGOS' || ordemParam === 'DESTAQUES'
        ? ordemParam
        : 'RECENTES';

    const leitura: FiltrosComunicado['leitura'] =
      leituraParam === 'LIDOS' || leituraParam === 'NAO_LIDOS'
        ? leituraParam
        : 'TODOS';

    setFiltros((atual) => ({
      ...atual,
      busca: buscaParam,
      destaque,
      ordem,
      leitura,
    }));
  }, [searchParams]);

  function atualizarUrlComunicados(proximos: FiltrosComunicado) {
    const params = new URLSearchParams();

    if (proximos.busca.trim()) {
      params.set('busca', proximos.busca.trim());
    }

    if (proximos.destaque !== 'TODOS') {
      params.set('destaque', proximos.destaque);
    }

    if (proximos.ordem !== 'RECENTES') {
      params.set('ordem', proximos.ordem);
    }

    if (proximos.leitura !== 'TODOS') {
      params.set('leitura', proximos.leitura);
    }

    setSearchParams(params, { replace: true });
  }

  function atualizarFiltrosComunicados(
    parcial: Partial<FiltrosComunicado>,
  ) {
    const proximos = {
      ...filtros,
      ...parcial,
    };

    setFiltros(proximos);
    setPaginaAtual(1);
    atualizarUrlComunicados(proximos);
  }

  function limparFiltrosComunicados() {
    setFiltros(filtrosIniciais);
    setPaginaAtual(1);
    setSearchParams({}, { replace: true });
  }

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
        setEstado((atual) => ({
          ...atual,
          carregando: false,
          erro: 'Nenhum perfil de morador disponível para o portal.',
          contexto: null,
        }));
        return;
      }

      try {
        const queryString = montarQueryStringPortal({
          q: filtros.busca,
          destaque:
            filtros.destaque === 'TODOS'
              ? undefined
              : filtros.destaque === 'SIM'
                ? '1'
                : '0',
          page: paginaAtual,
          limit: LIMITE_PAGINA_PORTAL,
        });

        const comunicadosResponse = await apiRequest<
          ComunicadoPortal[] | ApiListResponse<ComunicadoPortal>
        >(
          `/portal-morador/condominios/${moradorContexto.condominioId}/comunicados${queryString}`,
        );

        const { items: comunicados, paginacao } =
          normalizarRespostaPaginada<ComunicadoPortal>(
            comunicadosResponse,
            paginaAtual,
          );

        setEstado({
          carregando: false,
          erro: '',
          contexto,
          comunicados,
          paginacao,
        });
        setUltimaAtualizacao(new Date());
      } catch (error) {
        setEstado({
          carregando: false,
          erro: mensagemErroAmigavel(
            error,
            'Não foi possível carregar os comunicados.',
          ),
          contexto,
          comunicados: [],
          paginacao: paginacaoInicialPortal,
        });
      }
    }

    void carregar();
  }, [
    carregandoPortal,
    contexto,
    erroPortal,
    filtros.busca,
    filtros.destaque,
    moradorContexto,
    paginaAtual,
    recarregarToken,
  ]);

  const morador = estado.contexto
    ? obterMoradorAtivo(estado.contexto)
    : null;

  const comunicadosFiltrados = useMemo(() => {
    const busca = normalizarBusca(filtros.busca);

    return [...estado.comunicados]
      .filter((comunicado) => {
        if (filtros.destaque === 'SIM' && !comunicado.destaque) {
          return false;
        }

        if (filtros.destaque === 'NAO' && comunicado.destaque) {
          return false;
        }

        if (filtros.leitura === 'LIDOS' && !comunicado.lida) {
          return false;
        }

        if (filtros.leitura === 'NAO_LIDOS' && comunicado.lida) {
          return false;
        }

        if (!busca) {
          return true;
        }

        const conteudo = normalizarBusca([
          comunicado.titulo,
          comunicado.conteudo,
        ].join(' '));

        return conteudo.includes(busca);
      })
      .sort((a, b) => {
        const dataA = new Date(a.publicadoEm ?? a.criadoEm).getTime();
        const dataB = new Date(b.publicadoEm ?? b.criadoEm).getTime();

        if (filtros.ordem === 'DESTAQUES') {
          if (a.destaque !== b.destaque) {
            return a.destaque ? -1 : 1;
          }

          return dataB - dataA;
        }

        if (filtros.ordem === 'ANTIGOS') {
          return dataA - dataB;
        }

        return dataB - dataA;
      });
  }, [estado.comunicados, filtros]);

  const resumo = useMemo<ResumoComunicados>(() => {
    const lidos = estado.comunicados.filter((comunicado) => comunicado.lida).length;
    const destaques = estado.comunicados.filter((comunicado) => comunicado.destaque).length;
    const expirando = estado.comunicados.filter((comunicado) =>
      estaExpirando(comunicado.expiraEm),
    ).length;

    return {
      total: estado.comunicados.length,
      lidos,
      naoLidos: estado.comunicados.length - lidos,
      destaques,
      expirando,
    };
  }, [estado.comunicados]);

  async function marcarComunicadoComoLido(comunicadoId: number) {
    if (!morador || acaoLeituraId !== null) {
      return;
    }

    setAcaoLeituraId(comunicadoId);

    try {
      await apiRequest(
        `/portal-morador/condominios/${morador.condominioId}/comunicados/${comunicadoId}/lida`,
        {
          method: 'PATCH',
        },
      );

      setEstado((atual) => ({
        ...atual,
        comunicados: atual.comunicados.map((comunicado) =>
          comunicado.id === comunicadoId
            ? {
                ...comunicado,
                lida: true,
                lidoEm: new Date().toISOString(),
              }
            : comunicado,
        ),
      }));
    } catch (error) {
      setEstado((atual) => ({
        ...atual,
        erro: mensagemErroAmigavel(
          error,
          'Não foi possível confirmar a leitura do comunicado.',
        ),
      }));
    } finally {
      setAcaoLeituraId(null);
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

  useAutoRefresh({
    enabled: !estado.carregando,
    intervalMs: 120000,
    onRefresh: atualizarDadosPagina,
  });

  useRefreshOnReconnect({
    enabled: !estado.carregando,
    onReconnect: atualizarDadosPagina,
  });

  useSearchShortcut({
    inputRef: buscaInputRef,
  });

  useCloseFiltersShortcut({
    aberto: filtrosAbertos,
    onClose: () => setFiltrosAbertos(false),
  });

  const principalNaoLido = comunicadosFiltrados.find(
    (comunicado) => !comunicado.lida,
  );

  return (
    <AppShell
      nomeCondominio={morador?.condominio.nome}
      nomeMorador={morador?.nome}
      perfis={estado.contexto?.moradores ?? []}
    >
      <PageHeader
        title="Comunicados"
        description="Consulte avisos publicados pelo condomínio e acompanhe as informações oficiais da administração."
        ultimaAtualizacao={ultimaAtualizacao}
        carregando={estado.carregando}
        onRefresh={atualizarDadosPagina}
      />

      {estado.carregando ? <PageSkeleton cards={2} linhas={4} /> : null}

      {!estado.carregando ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ResumoComunicadoCard
            titulo="Comunicados"
            valor={resumo.total}
            descricao="Total disponível no portal"
            icon={<Megaphone className="h-5 w-5" />}
            onClick={() => atualizarFiltrosComunicados({ leitura: 'TODOS' })}
          />
          <ResumoComunicadoCard
            titulo="Não lidos"
            valor={resumo.naoLidos}
            descricao="Demandam sua leitura"
            destaque="amber"
            icon={<CheckCircle2 className="h-5 w-5" />}
            onClick={() => atualizarFiltrosComunicados({ leitura: 'NAO_LIDOS' })}
          />
          <ResumoComunicadoCard
            titulo="Lidos"
            valor={resumo.lidos}
            descricao="Leitura confirmada"
            destaque="emerald"
            icon={<CheckCircle2 className="h-5 w-5" />}
            onClick={() => atualizarFiltrosComunicados({ leitura: 'LIDOS' })}
          />
          <ResumoComunicadoCard
            titulo="Destaques"
            valor={resumo.destaques}
            descricao="Avisos priorizados"
            destaque="orange"
            icon={<Star className="h-5 w-5" />}
            onClick={() => atualizarFiltrosComunicados({ destaque: 'SIM' })}
          />
          <ResumoComunicadoCard
            titulo="Expirando"
            valor={resumo.expirando}
            descricao="Encerram em até 7 dias"
            destaque="blue"
            icon={<CalendarDays className="h-5 w-5" />}
          />
        </section>
      ) : null}

      {principalNaoLido ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">
                Leitura pendente
              </p>
              <p className="mt-1 font-bold">
                Você ainda não confirmou a leitura de “{principalNaoLido.titulo}”.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void marcarComunicadoComoLido(principalNaoLido.id)}
              disabled={acaoLeituraId === principalNaoLido.id}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {acaoLeituraId === principalNaoLido.id
                ? 'Confirmando...'
                : 'Confirmar leitura'}
            </button>
          </div>
        </section>
      ) : null}

      {configuracoesPortal?.assinaturaComunicados ? (
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 shadow-sm md:p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Assinatura padrão da comunicação
          </p>
          <p className="mt-2 whitespace-pre-line">
            {configuracoesPortal.assinaturaComunicados}
          </p>
        </section>
      ) : null}

      {estado.erro ? (
        <ErrorState
          message={estado.erro}
          actionLabel="Tentar novamente"
          onAction={atualizarDadosPagina}
        />
      ) : null}

      {!estado.carregando ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <Megaphone className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-950">
                Comunicados do condomínio
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Avisos, informações e atualizações publicadas pela administração.
              </p>
            </div>
          </div>

          <div className="mb-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Filter className="h-4 w-4 text-orange-600" />
                Filtros
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={limparFiltrosComunicados}
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

            <div
              className={[
                'gap-3',
                filtrosAbertos ? 'grid' : 'hidden',
                'xl:grid xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.75fr))]',
              ].join(' ')}
            >
              <label className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  ref={buscaInputRef}
                  type="text"
                  value={filtros.busca}
                  onChange={(event) =>
                    atualizarFiltrosComunicados({
                      busca: event.target.value,
                    })
                  }
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-14 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Buscar por título ou conteúdo"
                />

                {filtros.busca ? (
                  <button
                    type="button"
                    onClick={() =>
                      atualizarFiltrosComunicados({
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

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Destaque
                </span>
                <select
                  value={filtros.destaque}
                  onChange={(event) =>
                    atualizarFiltrosComunicados({
                      destaque: event.target.value as FiltrosComunicado['destaque'],
                    })
                  }
                  className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="TODOS">Todos</option>
                  <option value="SIM">Apenas destaques</option>
                  <option value="NAO">Sem destaque</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Leitura
                </span>
                <select
                  value={filtros.leitura}
                  onChange={(event) =>
                    atualizarFiltrosComunicados({
                      leitura: event.target.value as FiltrosComunicado['leitura'],
                    })
                  }
                  className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="TODOS">Todos</option>
                  <option value="NAO_LIDOS">Não lidos</option>
                  <option value="LIDOS">Lidos</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Ordenar
                </span>
                <select
                  value={filtros.ordem}
                  onChange={(event) =>
                    atualizarFiltrosComunicados({
                      ordem: event.target.value as FiltrosComunicado['ordem'],
                    })
                  }
                  className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="RECENTES">Mais recentes</option>
                  <option value="ANTIGOS">Mais antigos</option>
                  <option value="DESTAQUES">Destaques primeiro</option>
                </select>
              </label>
            </div>
          </div>

          <FilterSummary
            total={estado.paginacao.total}
            exibidos={comunicadosFiltrados.length}
            singular="comunicado"
            plural="comunicados"
            filtrosAtivos={[
              filtros.busca
                ? {
                    label: `Busca: "${filtros.busca}"`,
                    onRemove: () =>
                      atualizarFiltrosComunicados({
                        busca: '',
                      }),
                  }
                : null,
              filtros.destaque !== 'TODOS'
                ? {
                    label: `Destaque: ${
                      filtros.destaque === 'SIM'
                        ? 'Apenas destaques'
                        : 'Sem destaque'
                    }`,
                    onRemove: () =>
                      atualizarFiltrosComunicados({
                        destaque: 'TODOS',
                      }),
                  }
                : null,
              filtros.leitura !== 'TODOS'
                ? {
                    label: `Leitura: ${
                      filtros.leitura === 'LIDOS' ? 'Lidos' : 'Não lidos'
                    }`,
                    onRemove: () =>
                      atualizarFiltrosComunicados({
                        leitura: 'TODOS',
                      }),
                  }
                : null,
              filtros.ordem !== 'RECENTES'
                ? {
                    label: `Ordenação: ${
                      filtros.ordem === 'ANTIGOS'
                        ? 'Mais antigos'
                        : 'Destaques primeiro'
                    }`,
                    onRemove: () =>
                      atualizarFiltrosComunicados({
                        ordem: 'RECENTES',
                      }),
                  }
                : null,
            ]}
          />

          {comunicadosFiltrados.length === 0 ? (
            estado.comunicados.length > 0 ? (
              <FilteredEmptyState
                icon={Megaphone}
                onClear={limparFiltrosComunicados}
              />
            ) : (
              <EmptyState
                icon={Megaphone}
                title="Nenhum comunicado encontrado."
                description="Quando houver novidades, elas aparecerão aqui."
              />
            )
          ) : (
            <div className="grid gap-4">
              {comunicadosFiltrados.map((comunicado) => (
                <article
                  key={comunicado.id}
                  className={[
                    'rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                    comunicado.destaque
                      ? 'border-orange-200 bg-orange-50'
                      : comunicado.lida
                        ? 'border-slate-200 bg-white'
                        : 'border-amber-200 bg-amber-50/60',
                  ].join(' ')}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {comunicado.destaque ? <DestaqueBadge /> : null}
                        <DataComunicadoBadge
                          data={comunicado.publicadoEm ?? comunicado.criadoEm}
                        />
                        <LeituraStatusBadge lida={comunicado.lida} />
                      </div>

                      <h4 className="text-lg font-bold text-slate-950">
                        {comunicado.titulo}
                      </h4>
                    </div>
                  </div>

                  <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
                    {comunicado.conteudo}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      {comunicado.lida && comunicado.lidoEm
                        ? `Leitura confirmada em ${formatarData(comunicado.lidoEm)}`
                        : 'Leitura ainda não confirmada'}
                    </p>

                    {!comunicado.lida ? (
                      <button
                        type="button"
                        onClick={() => void marcarComunicadoComoLido(comunicado.id)}
                        disabled={acaoLeituraId === comunicado.id}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {acaoLeituraId === comunicado.id
                          ? 'Confirmando...'
                          : 'Marcar como lido'}
                      </button>
                    ) : null}
                  </div>

                  {comunicado.expiraEm ? (
                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Disponível até {formatarData(comunicado.expiraEm)}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}

          <PaginacaoPortal
            paginacao={estado.paginacao}
            onChange={setPaginaAtual}
          />
        </section>
      ) : null}
    </AppShell>
  );
}
