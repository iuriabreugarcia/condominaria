import {
  AlertTriangle,
  Box,
  CircleCheckBig,
  Clock3,
  Filter,
  PackageCheck,
  RotateCcw,
  ScanBarcode,
  Search,
  Truck,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { EmptyState, ErrorState } from '../components/FeedbackState';
import { FilteredEmptyState } from '../components/FilteredEmptyState';
import { FilterSummary } from '../components/FilterSummary';
import { PageHeader } from '../components/PageHeader';
import { PageSkeleton } from '../components/PageSkeleton';
import { usePortal } from '../context/PortalContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useCloseFiltersShortcut } from '../hooks/useCloseFiltersShortcut';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePortalConfiguracoes } from '../hooks/usePortalConfiguracoes';
import { useRefreshOnReconnect } from '../hooks/useRefreshOnReconnect';
import { useSearchShortcut } from '../hooks/useSearchShortcut';
import { ApiError, apiRequest } from '../lib/api';
import { obterMoradorAtivo } from '../lib/portal';
import type { EncomendaPortal, PortalMoradorMeResponse } from '../types/api';

type EstadoPagina = {
  carregando: boolean;
  erro: string;
  contexto: PortalMoradorMeResponse | null;
  encomendas: EncomendaPortal[];
  paginacao: PaginacaoPortal;
};

type FiltrosEncomenda = {
  busca: string;
  status:
    | 'TODAS'
    | 'RECEBIDA'
    | 'RETIRADA'
    | 'ENTREGUE'
    | 'DEVOLVIDA'
    | 'CANCELADA';
  retirada: 'TODAS' | 'AGUARDANDO' | 'FINALIZADAS';
  ordem: 'RECENTES' | 'ANTIGAS';
};

type ResumoEncomendaCardProps = {
  titulo: string;
  valor: number;
  descricao: string;
  icon: React.ReactNode;
  variante?: 'orange' | 'amber' | 'green' | 'red' | 'blue';
};

type EncomendaStatusBadgeProps = {
  status: string;
};

type EncomendaInfoItemProps = {
  label: string;
  value: string | number | null | undefined;
};

const filtrosIniciais: FiltrosEncomenda = {
  busca: '',
  status: 'TODAS',
  retirada: 'TODAS',
  ordem: 'RECENTES',
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


function formatarDataHora(data?: string | null) {
  if (!data) {
    return 'Não informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(data));
}

function rotuloStatus(status: string) {
  switch (status) {
    case 'RECEBIDA':
      return 'Aguardando retirada';
    case 'RETIRADA':
      return 'Retirada';
    case 'ENTREGUE':
      return 'Entregue';
    case 'DEVOLVIDA':
      return 'Devolvida';
    case 'CANCELADA':
      return 'Cancelada';
    default:
      return status;
  }
}

function varianteStatus(status: string) {
  switch (status) {
    case 'RECEBIDA':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'RETIRADA':
    case 'ENTREGUE':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'DEVOLVIDA':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'CANCELADA':
      return 'border-slate-200 bg-slate-100 text-slate-700';
    default:
      return 'border-blue-200 bg-blue-50 text-blue-800';
  }
}

function iconStatus(status: string) {
  switch (status) {
    case 'RECEBIDA':
      return <Clock3 className="h-3.5 w-3.5" />;
    case 'RETIRADA':
    case 'ENTREGUE':
      return <CircleCheckBig className="h-3.5 w-3.5" />;
    case 'DEVOLVIDA':
    case 'CANCELADA':
      return <AlertTriangle className="h-3.5 w-3.5" />;
    default:
      return <PackageCheck className="h-3.5 w-3.5" />;
  }
}

function EncomendaStatusBadge({ status }: EncomendaStatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold',
        varianteStatus(status),
      ].join(' ')}
    >
      {iconStatus(status)}
      {rotuloStatus(status)}
    </span>
  );
}

function ResumoEncomendaCard({
  titulo,
  valor,
  descricao,
  icon,
  variante = 'orange',
}: ResumoEncomendaCardProps) {
  const variantes = {
    orange: 'bg-orange-50 text-orange-600',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-rose-50 text-rose-700',
    blue: 'bg-blue-50 text-blue-700',
  } satisfies Record<NonNullable<ResumoEncomendaCardProps['variante']>, string>;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md">
      <div className={['mb-4 flex h-11 w-11 items-center justify-center rounded-2xl', variantes[variante]].join(' ')}>
        {icon}
      </div>

      <p className="text-sm font-semibold text-slate-500">{titulo}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{valor}</p>
      <p className="mt-1 text-sm text-slate-600">{descricao}</p>
    </article>
  );
}

function EncomendaInfoItem({ label, value }: EncomendaInfoItemProps) {
  const valor = String(value ?? '').trim() || 'Não informado';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-700">{valor}</p>
    </div>
  );
}

function estaAguardandoRetirada(status: string) {
  return status === 'RECEBIDA';
}

function normalizarBusca(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function mensagemErroAmigavel(error: unknown) {
  const mensagem =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Não foi possível carregar as encomendas.';

  const normalizada = mensagem.toLowerCase();

  if (
    normalizada.includes('internal server error') ||
    normalizada.includes('prisma') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('cannot read')
  ) {
    return 'Não foi possível carregar as encomendas agora. Tente novamente em instantes ou fale com a administração.';
  }

  return mensagem;
}

export function EncomendasPage() {
  // Encomendas do Portal devem usar endpoint portal-morador, não rota administrativa.
  // data-encomendas-endpoint-portal-morador="true"

  const buscaInputRef = useRef<HTMLInputElement | null>(null);

  usePageTitle('Encomendas');

  const [recarregarToken, setRecarregarToken] = useState(0);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [estado, setEstado] = useState<EstadoPagina>({
    carregando: true,
    erro: '',
    contexto: null,
    encomendas: [],
    paginacao: paginacaoInicialPortal,
  });
  const [filtros, setFiltros] = useState<FiltrosEncomenda>(filtrosIniciais);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const {
    contexto,
    moradorAtivo: moradorContexto,
    carregando: carregandoPortal,
    erro: erroPortal,
  } = usePortal();
  const { configuracoes: configuracoesPortal } = usePortalConfiguracoes();

  useEffect(() => {
    const buscaParam = searchParams.get('busca') ?? '';
    const statusParam = searchParams.get('status');
    const retiradaParam = searchParams.get('retirada');
    const ordemParam = searchParams.get('ordem');

    const status: FiltrosEncomenda['status'] =
      statusParam === 'RECEBIDA' ||
      statusParam === 'RETIRADA' ||
      statusParam === 'ENTREGUE' ||
      statusParam === 'DEVOLVIDA' ||
      statusParam === 'CANCELADA'
        ? statusParam
        : 'TODAS';

    const retirada: FiltrosEncomenda['retirada'] =
      retiradaParam === 'AGUARDANDO' || retiradaParam === 'FINALIZADAS'
        ? retiradaParam
        : 'TODAS';

    const ordem: FiltrosEncomenda['ordem'] =
      ordemParam === 'ANTIGAS' ? ordemParam : 'RECENTES';

    setFiltros((atual) => ({
      ...atual,
      busca: buscaParam,
      status,
      retirada,
      ordem,
    }));
  }, [searchParams]);

  function atualizarUrlEncomendas(proximos: FiltrosEncomenda) {
    const params = new URLSearchParams();

    if (proximos.busca.trim()) {
      params.set('busca', proximos.busca.trim());
    }

    if (proximos.status !== 'TODAS') {
      params.set('status', proximos.status);
    }

    if (proximos.retirada !== 'TODAS') {
      params.set('retirada', proximos.retirada);
    }

    if (proximos.ordem !== 'RECENTES') {
      params.set('ordem', proximos.ordem);
    }

    setSearchParams(params, { replace: true });
  }

  function atualizarFiltrosEncomendas(parcial: Partial<FiltrosEncomenda>) {
    const proximos = {
      ...filtros,
      ...parcial,
    };

    setFiltros(proximos);
    setPaginaAtual(1);
    atualizarUrlEncomendas(proximos);
  }

  function limparFiltrosEncomendas() {
    setFiltros(filtrosIniciais);
    setPaginaAtual(1);
    setSearchParams({}, { replace: true });
  }

  const atualizarDadosPagina = useCallback(() => {
    setEstado((atual) => ({
      ...atual,
      carregando: true,
      erro: '',
    }));

    setRecarregarToken((atual) => atual + 1);
  }, []);

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
          status: filtros.status !== 'TODAS' ? filtros.status : undefined,
          page: paginaAtual,
          limit: LIMITE_PAGINA_PORTAL,
        });

        const encomendasResponse = await apiRequest<
          EncomendaPortal[] | ApiListResponse<EncomendaPortal>
        >(
          `/portal-morador/condominios/${moradorContexto.condominioId}/encomendas${queryString}`,
        );

        const { items: encomendas, paginacao } =
          normalizarRespostaPaginada<EncomendaPortal>(
            encomendasResponse,
            paginaAtual,
          );

        setEstado({
          carregando: false,
          erro: '',
          contexto,
          encomendas,
          paginacao,
        });
        setUltimaAtualizacao(new Date());
      } catch (error) {
        setEstado({
          carregando: false,
          erro: mensagemErroAmigavel(error),
          contexto: null,
          encomendas: [],
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
    filtros.status,
    moradorContexto,
    paginaAtual,
    recarregarToken,
  ]);

  const morador = estado.contexto ? obterMoradorAtivo(estado.contexto) : null;

  const encomendasFiltradas = useMemo(() => {
    const busca = normalizarBusca(filtros.busca);

    return [...estado.encomendas]
      .filter((encomenda) => {
        if (filtros.status !== 'TODAS' && encomenda.status !== filtros.status) {
          return false;
        }

        const aguardando = estaAguardandoRetirada(encomenda.status);

        if (filtros.retirada === 'AGUARDANDO' && !aguardando) {
          return false;
        }

        if (filtros.retirada === 'FINALIZADAS' && aguardando) {
          return false;
        }

        if (!busca) {
          return true;
        }

        const conteudo = normalizarBusca(
          [
            encomenda.descricao ?? '',
            encomenda.nomeDestinatario ?? '',
            encomenda.remetente ?? '',
            encomenda.transportadora ?? '',
            encomenda.codigoRastreio ?? '',
            encomenda.unidade.identificador,
            encomenda.observacoes ?? '',
          ].join(' '),
        );

        return conteudo.includes(busca);
      })
      .sort((a, b) => {
        const diferenca =
          new Date(b.recebidoEm).getTime() - new Date(a.recebidoEm).getTime();

        return filtros.ordem === 'ANTIGAS' ? -diferenca : diferenca;
      });
  }, [estado.encomendas, filtros]);

  const resumo = useMemo(() => {
    const aguardando = estado.encomendas.filter((encomenda) =>
      estaAguardandoRetirada(encomenda.status),
    );

    const retiradas = estado.encomendas.filter(
      (encomenda) => encomenda.status === 'RETIRADA' || encomenda.status === 'ENTREGUE',
    );

    const devolvidas = estado.encomendas.filter(
      (encomenda) => encomenda.status === 'DEVOLVIDA' || encomenda.status === 'CANCELADA',
    );

    return {
      total: estado.encomendas.length,
      aguardando: aguardando.length,
      finalizadas: retiradas.length,
      devolvidas: devolvidas.length,
    };
  }, [estado.encomendas]);

  const proximaEncomenda = useMemo(
    () =>
      encomendasFiltradas.find((encomenda) =>
        estaAguardandoRetirada(encomenda.status),
      ) ?? null,
    [encomendasFiltradas],
  );

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

  return (
    <AppShell
      nomeCondominio={morador?.condominio.nome}
      nomeMorador={morador?.nome}
      perfis={estado.contexto?.moradores ?? []}
    >
      <PageHeader
        title="Encomendas"
        description="Veja os recebimentos registrados pela portaria e acompanhe retiradas."
        ultimaAtualizacao={ultimaAtualizacao}
        carregando={estado.carregando}
        onRefresh={atualizarDadosPagina}
      />

      {estado.carregando ? <PageSkeleton cards={3} linhas={4} /> : null}

      {configuracoesPortal?.instrucoesEncomendas ? (
        <section className="rounded-3xl border border-orange-100 bg-orange-50 p-4 text-sm leading-6 text-orange-950 shadow-sm md:p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-orange-700">
            Instruções para encomendas
          </p>
          <p className="mt-2 whitespace-pre-line">
            {configuracoesPortal.instrucoesEncomendas}
          </p>
        </section>
      ) : null}

      {!estado.carregando && resumo.aguardando > 0 ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
                <Box className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-950">
                  {resumo.aguardando} encomenda{resumo.aguardando === 1 ? '' : 's'} aguardando retirada
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Procure a portaria com documento de identificação. Confira as instruções do condomínio antes da retirada.
                </p>
              </div>
            </div>

            {proximaEncomenda ? (
              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-amber-900 shadow-sm">
                Próxima: {proximaEncomenda.descricao ?? proximaEncomenda.codigoRastreio ?? 'encomenda registrada'}
              </div>
            ) : null}
          </div>
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
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ResumoEncomendaCard
              titulo="Total"
              valor={resumo.total}
              descricao="encomendas registradas"
              icon={<PackageCheck className="h-5 w-5" />}
              variante="orange"
            />
            <ResumoEncomendaCard
              titulo="Aguardando retirada"
              valor={resumo.aguardando}
              descricao="disponíveis na portaria"
              icon={<Box className="h-5 w-5" />}
              variante="amber"
            />
            <ResumoEncomendaCard
              titulo="Finalizadas"
              valor={resumo.finalizadas}
              descricao="retiradas ou entregues"
              icon={<CircleCheckBig className="h-5 w-5" />}
              variante="green"
            />
            <ResumoEncomendaCard
              titulo="Devolvidas/canceladas"
              valor={resumo.devolvidas}
              descricao="baixadas sem retirada"
              icon={<Truck className="h-5 w-5" />}
              variante="red"
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <PackageCheck className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-950">
                    Minhas encomendas
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Filtre e acompanhe pacotes recebidos pela portaria.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={atualizarDadosPagina}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
              >
                <RotateCcw className="h-4 w-4" />
                Atualizar
              </button>
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
                    onClick={limparFiltrosEncomendas}
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
                    onChange={(event) =>
                      atualizarFiltrosEncomendas({
                        busca: event.target.value,
                      })
                    }
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-14 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="Buscar por encomenda, rastreio, remetente ou unidade"
                  />

                  {filtros.busca ? (
                    <button
                      type="button"
                      onClick={() => atualizarFiltrosEncomendas({ busca: '' })}
                      aria-label="Limpar busca"
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold leading-none text-slate-500 shadow-sm transition hover:border-orange-300 hover:text-orange-700"
                    >
                      ×
                    </button>
                  ) : null}
                </label>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Status
                    </span>
                    <select
                      value={filtros.status}
                      onChange={(event) =>
                        atualizarFiltrosEncomendas({
                          status: event.target.value as FiltrosEncomenda['status'],
                        })
                      }
                      className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="TODAS">Todas</option>
                      <option value="RECEBIDA">Recebidas</option>
                      <option value="RETIRADA">Retiradas</option>
                      <option value="ENTREGUE">Entregues</option>
                      <option value="DEVOLVIDA">Devolvidas</option>
                      <option value="CANCELADA">Canceladas</option>
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Retirada
                    </span>
                    <select
                      value={filtros.retirada}
                      onChange={(event) =>
                        atualizarFiltrosEncomendas({
                          retirada: event.target.value as FiltrosEncomenda['retirada'],
                        })
                      }
                      className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="TODAS">Todas</option>
                      <option value="AGUARDANDO">Aguardando retirada</option>
                      <option value="FINALIZADAS">Finalizadas</option>
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Ordenar
                    </span>
                    <select
                      value={filtros.ordem}
                      onChange={(event) =>
                        atualizarFiltrosEncomendas({
                          ordem: event.target.value as FiltrosEncomenda['ordem'],
                        })
                      }
                      className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="RECENTES">Recebidas mais recentes</option>
                      <option value="ANTIGAS">Recebidas mais antigas</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <FilterSummary
              total={estado.paginacao.total}
              exibidos={encomendasFiltradas.length}
              singular="encomenda"
              plural="encomendas"
              filtrosAtivos={[
                filtros.busca
                  ? {
                      label: `Busca: "${filtros.busca}"`,
                      onRemove: () => atualizarFiltrosEncomendas({ busca: '' }),
                    }
                  : null,
                filtros.status !== 'TODAS'
                  ? {
                      label: `Status: ${rotuloStatus(filtros.status)}`,
                      onRemove: () => atualizarFiltrosEncomendas({ status: 'TODAS' }),
                    }
                  : null,
                filtros.retirada !== 'TODAS'
                  ? {
                      label: `Retirada: ${
                        filtros.retirada === 'AGUARDANDO' ? 'Aguardando' : 'Finalizadas'
                      }`,
                      onRemove: () => atualizarFiltrosEncomendas({ retirada: 'TODAS' }),
                    }
                  : null,
                filtros.ordem !== 'RECENTES'
                  ? {
                      label: 'Ordenação: Recebidas mais antigas',
                      onRemove: () => atualizarFiltrosEncomendas({ ordem: 'RECENTES' }),
                    }
                  : null,
              ]}
            />

            {encomendasFiltradas.length === 0 ? (
              estado.encomendas.length > 0 ? (
                <FilteredEmptyState icon={PackageCheck} onClear={limparFiltrosEncomendas} />
              ) : (
                <EmptyState
                  icon={PackageCheck}
                  title="Nenhuma encomenda encontrada."
                  description="Quando a portaria registrar um recebimento, ele aparecerá aqui."
                />
              )
            ) : (
              <div className="grid gap-4">
                {encomendasFiltradas.map((encomenda) => (
                  <article
                    key={encomenda.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <EncomendaStatusBadge status={encomenda.status} />
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                            Unidade {encomenda.unidade.identificador}
                          </span>
                        </div>

                        <h4 className="text-lg font-bold text-slate-950">
                          {encomenda.descricao ??
                            encomenda.nomeDestinatario ??
                            'Encomenda registrada'}
                        </h4>

                        {estaAguardandoRetirada(encomenda.status) ? (
                          <p className="mt-2 inline-flex rounded-2xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
                            Disponível para retirada na portaria.
                          </p>
                        ) : null}
                      </div>

                      {encomenda.codigoRastreio ? (
                        <div className="rounded-3xl bg-white px-5 py-4 shadow-sm">
                          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            <ScanBarcode className="h-4 w-4" />
                            Rastreamento
                          </p>
                          <p className="mt-2 break-all text-sm font-bold text-slate-950">
                            {encomenda.codigoRastreio}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <EncomendaInfoItem label="Remetente" value={encomenda.remetente} />
                      <EncomendaInfoItem label="Transportadora" value={encomenda.transportadora} />
                      <EncomendaInfoItem label="Recebida em" value={formatarDataHora(encomenda.recebidoEm)} />
                      <EncomendaInfoItem label="Retirada em" value={formatarDataHora(encomenda.retiradoEm)} />
                    </div>

                    {encomenda.retiradoPorNome || encomenda.observacoesRetirada ? (
                      <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                        <p className="font-bold">Confirmação de retirada</p>
                        {encomenda.retiradoPorNome ? (
                          <p>Retirada por: {encomenda.retiradoPorNome}</p>
                        ) : null}
                        {encomenda.observacoesRetirada ? (
                          <p>Observações: {encomenda.observacoesRetirada}</p>
                        ) : null}
                      </div>
                    ) : null}

                    {encomenda.motivoDevolucao ? (
                      <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
                        <p className="font-bold">Devolução registrada</p>
                        <p>{encomenda.motivoDevolucao}</p>
                      </div>
                    ) : null}

                    {encomenda.observacoes ? (
                      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
                        {encomenda.observacoes}
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
        </>
      ) : null}
    </AppShell>
  );
}
