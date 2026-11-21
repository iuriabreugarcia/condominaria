import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  CircleCheckBig,
  ClipboardList,
  ContactRound,
  FileText,
  Building2,
  PackageCheck,
  ScrollText,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { PageSkeleton } from '../components/PageSkeleton';
import { PageHeader } from '../components/PageHeader';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { usePageTitle } from '../hooks/usePageTitle';
import { useRefreshOnReconnect } from '../hooks/useRefreshOnReconnect';
import { EmptyState, ErrorState } from '../components/FeedbackState';
import { usePortal } from '../context/PortalContext';
import { usePortalConfiguracoes } from '../hooks/usePortalConfiguracoes';
import { apiRequest, ApiError } from '../lib/api';
import type {
  CobrancaPortal,
  DashboardMoradorResponse,
  EncomendaPortal,
  OcorrenciaPortal,
  ReservaPortal,
} from '../types/api';
import { DemoExperienceBanner } from '../components/DemoExperienceBanner';

type DashboardState = {
  carregando: boolean;
  erro: string;
  dashboard: DashboardMoradorResponse | null;
  ocorrencias: OcorrenciaPortal[];
  reservas: ReservaPortal[];
  encomendas: EncomendaPortal[];
  cobrancas: CobrancaPortal[];
};

type DashboardIndicator = {
  titulo: string;
  valor: number;
  descricao: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
  variant: 'orange' | 'blue' | 'green' | 'red' | 'slate' | 'violet';
};

type AlertVariant = 'red' | 'orange' | 'blue' | 'amber';

type AlertItem = {
  id: string;
  titulo: string;
  descricao: string;
  quantidade: number;
  to: string;
  destaque: AlertVariant;
};

function formatarData(data: string | null | undefined) {
  if (!data) {
    return '-';
  }

  const parsed = new Date(data);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(parsed);
}

function formatarDataHora(data: string | null | undefined) {
  if (!data) {
    return '-';
  }

  const parsed = new Date(data);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
}

function formatarMoeda(valor: string | number | null | undefined) {
  const numero = typeof valor === 'number' ? valor : Number(valor ?? 0);

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(numero) ? numero : 0);
}

function mensagemErroAmigavel(error: unknown) {
  const mensagem =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Não foi possível carregar o dashboard.';

  const normalizada = mensagem.toLowerCase();

  if (
    normalizada.includes('internal server error') ||
    normalizada.includes('prismaclientknownrequesterror') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('cannot read properties')
  ) {
    return 'Não foi possível carregar o portal agora. A administração técnica já pode verificar a estrutura do sistema.';
  }

  if (
    normalizada.includes('failed to fetch') ||
    normalizada.includes('networkerror') ||
    normalizada.includes('network request failed')
  ) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
  }

  return mensagem || 'Não foi possível carregar o dashboard.';
}

function cobrancaEstaVencida(cobranca: CobrancaPortal) {
  if (cobranca.status !== 'PENDENTE') {
    return false;
  }

  const vencimento = new Date(cobranca.vencimentoEm);
  const hoje = new Date();

  vencimento.setHours(23, 59, 59, 999);

  return vencimento < hoje;
}

function indicadorClasses(variant: DashboardIndicator['variant']) {
  const classes: Record<DashboardIndicator['variant'], string> = {
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
  };

  return classes[variant];
}

function alertaClasses(variant: AlertVariant) {
  const classes: Record<AlertVariant, string> = {
    red: 'border-red-200 bg-red-50 text-red-900',
    orange: 'border-orange-200 bg-white text-orange-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
  };

  return classes[variant];
}

function DashboardIndicatorCard({ indicador }: { indicador: DashboardIndicator }) {
  const Icon = indicador.icon;

  return (
    <Link
      to={indicador.to}
      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">
            {indicador.titulo}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {indicador.valor}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {indicador.descricao}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${indicadorClasses(
            indicador.variant,
          )}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-orange-600 opacity-0 transition group-hover:opacity-100">
        Acessar módulo
      </p>
    </Link>
  );
}

function SectionCard({
  title,
  description,
  to,
  children,
}: {
  title: string;
  description: string;
  to: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>

        <Link
          to={to}
          className="shrink-0 text-sm font-bold text-orange-600 transition hover:text-orange-700"
        >
          Ver todas
        </Link>
      </div>

      {children}
    </article>
  );
}

function Badge({
  children,
  variant = 'slate',
}: {
  children: React.ReactNode;
  variant?: 'slate' | 'orange' | 'green' | 'red' | 'blue';
}) {
  const classes = {
    slate: 'bg-slate-100 text-slate-700',
    orange: 'bg-orange-100 text-orange-800',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
  }[variant];

  return (
    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${classes}`}>
      {children}
    </span>
  );
}

export function DashboardPage() {
  usePageTitle('Dashboard');

  const [recarregarToken, setRecarregarToken] = useState(0);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const {
    contexto,
    moradorAtivo,
    carregando: carregandoPortal,
    erro: erroPortal,
  } = usePortal();
  const { configuracoes: configuracoesPortal } = usePortalConfiguracoes();

  const [state, setState] = useState<DashboardState>({
    carregando: true,
    erro: '',
    dashboard: null,
    ocorrencias: [],
    reservas: [],
    encomendas: [],
    cobrancas: [],
  });

  useEffect(() => {
    async function carregar() {
      if (carregandoPortal) {
        return;
      }

      if (erroPortal) {
        setState((atual) => ({
          ...atual,
          carregando: false,
          erro: erroPortal,
        }));
        return;
      }

      if (!contexto || !moradorAtivo) {
        setState((atual) => ({
          ...atual,
          carregando: false,
          erro: 'Nenhum perfil de morador disponível para o portal.',
        }));
        return;
      }

      setState((atual) => ({
        ...atual,
        carregando: true,
        erro: '',
      }));

      try {
        const condominioId = moradorAtivo.condominioId;

        const [dashboard, ocorrencias, reservas, encomendas, cobrancas] = await Promise.all([
          apiRequest<DashboardMoradorResponse>(
            `/portal-morador/condominios/${condominioId}/dashboard`,
          ),
          apiRequest<OcorrenciaPortal[]>(
            `/portal-morador/condominios/${condominioId}/ocorrencias`,
          ),
          apiRequest<ReservaPortal[]>(
            `/portal-morador/condominios/${condominioId}/reservas`,
          ),
          apiRequest<EncomendaPortal[]>(
            `/portal-morador/condominios/${condominioId}/encomendas`,
          ),
          apiRequest<CobrancaPortal[]>(
            `/portal-morador/condominios/${condominioId}/cobrancas`,
          ),
        ]);

        setState({
          carregando: false,
          erro: '',
          dashboard,
          ocorrencias,
          reservas,
          encomendas,
          cobrancas,
        });
        setUltimaAtualizacao(new Date());
      } catch (error) {
        setState({
          carregando: false,
          erro: mensagemErroAmigavel(error),
          dashboard: null,
          ocorrencias: [],
          reservas: [],
          encomendas: [],
          cobrancas: [],
        });
      }
    }

    void carregar();
  }, [
    carregandoPortal,
    contexto,
    erroPortal,
    moradorAtivo,
    recarregarToken,
  ]);

  const dashboard = state.dashboard;

  const indicadores = useMemo<DashboardIndicator[]>(() => {
    if (!dashboard) {
      return [];
    }

    return [
      {
        titulo: 'Comunicados',
        valor: dashboard.indicadores.comunicadosPublicados,
        descricao: 'publicados',
        icon: BellRing,
        to: '/comunicados',
        variant: 'orange',
      },
      {
        titulo: 'Cobranças',
        valor: dashboard.indicadores.cobrancasPendentes,
        descricao: 'pendentes',
        icon: WalletCards,
        to: '/cobrancas',
        variant: 'red',
      },
      {
        titulo: 'Encomendas',
        valor: dashboard.indicadores.encomendasPendentes,
        descricao: 'aguardando retirada',
        icon: PackageCheck,
        to: '/encomendas',
        variant: 'green',
      },
      {
        titulo: 'Reservas',
        valor: dashboard.indicadores.reservasAtivas,
        descricao: 'ativas',
        icon: CalendarDays,
        to: '/reservas',
        variant: 'blue',
      },
      {
        titulo: 'Assembleias',
        valor: dashboard.indicadores.assembleiasAtivas,
        descricao: 'em acompanhamento',
        icon: ScrollText,
        to: '/assembleias',
        variant: 'violet',
      },
      {
        titulo: 'Votações',
        valor: dashboard.indicadores.votacoesAbertas,
        descricao: 'abertas / pendentes',
        icon: CircleCheckBig,
        to: '/votacoes?situacao=PENDENTES',
        variant: 'green',
      },
      {
        titulo: 'Ocorrências',
        valor: dashboard.indicadores.ocorrenciasAbertas,
        descricao: 'em acompanhamento',
        icon: ClipboardList,
        to: '/ocorrencias',
        variant: 'slate',
      },
    ];
  }, [dashboard]);

  const ocorrenciasRecentes = useMemo(
    () =>
      [...state.ocorrencias]
        .sort(
          (a, b) =>
            new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
        )
        .slice(0, 3),
    [state.ocorrencias],
  );

  const proximasReservas = useMemo(
    () =>
      [...state.reservas]
        .filter((reserva) => reserva.status !== 'CANCELADA')
        .sort(
          (a, b) =>
            new Date(a.inicioEm).getTime() - new Date(b.inicioEm).getTime(),
        )
        .slice(0, 3),
    [state.reservas],
  );

  const encomendasPendentes = useMemo(
    () =>
      [...state.encomendas]
        .filter((encomenda) => encomenda.status === 'RECEBIDA')
        .sort(
          (a, b) =>
            new Date(b.recebidoEm).getTime() - new Date(a.recebidoEm).getTime(),
        )
        .slice(0, 3),
    [state.encomendas],
  );

  const cobrancasPendentes = useMemo(
    () =>
      [...state.cobrancas]
        .filter((cobranca) => cobranca.status === 'PENDENTE')
        .sort(
          (a, b) =>
            new Date(a.vencimentoEm).getTime() - new Date(b.vencimentoEm).getTime(),
        )
        .slice(0, 3),
    [state.cobrancas],
  );

  const cobrancasVencidas = useMemo(
    () => state.cobrancas.filter(cobrancaEstaVencida),
    [state.cobrancas],
  );

  const alertasPrioritarios = useMemo<AlertItem[]>(() => {
    const encomendasAguardando = state.encomendas.filter(
      (encomenda) => encomenda.status === 'RECEBIDA',
    );

    const ocorrenciasAtivas = state.ocorrencias.filter(
      (ocorrencia) =>
        ocorrencia.status === 'ABERTA' ||
        ocorrencia.status === 'EM_ANALISE' ||
        ocorrencia.status === 'EM_ANDAMENTO' ||
        ocorrencia.status === 'AGUARDANDO_MORADOR',
    );

    const reservasSolicitadas = state.reservas.filter(
      (reserva) => reserva.status === 'SOLICITADA',
    );

    const alertas: AlertItem[] = [
      {
        id: 'cobrancas-vencidas',
        titulo: 'Cobranças vencidas',
        descricao: 'Existem valores pendentes com vencimento ultrapassado.',
        quantidade: cobrancasVencidas.length,
        to: '/cobrancas',
        destaque: 'red',
      },
      {
        id: 'encomendas-pendentes',
        titulo: 'Encomendas na portaria',
        descricao: 'Há pacotes aguardando retirada.',
        quantidade: encomendasAguardando.length,
        to: '/encomendas',
        destaque: 'orange',
      },
      {
        id: 'ocorrencias-ativas',
        titulo: 'Ocorrências em andamento',
        descricao: 'Solicitações abertas ou em análise.',
        quantidade: ocorrenciasAtivas.length,
        to: '/ocorrencias',
        destaque: 'blue',
      },
      {
        id: 'reservas-solicitadas',
        titulo: 'Reservas pendentes',
        descricao: 'Solicitações ainda aguardando andamento.',
        quantidade: reservasSolicitadas.length,
        to: '/reservas',
        destaque: 'amber',
      },
    ];

    return alertas.filter((alerta) => alerta.quantidade > 0);
  }, [
    cobrancasVencidas.length,
    state.encomendas,
    state.ocorrencias,
    state.reservas,
  ]);

  const atualizarDadosPagina = useCallback(() => {
    setState((atual) => ({
      ...atual,
      carregando: true,
      erro: '',
    }));

    setRecarregarToken((atual) => atual + 1);
  }, []);

  useAutoRefresh({
    enabled: !state.carregando,
    intervalMs: 120000,
    onRefresh: atualizarDadosPagina,
  });

  useRefreshOnReconnect({
    enabled: !state.carregando,
    onReconnect: atualizarDadosPagina,
  });

  return (
    <AppShell
      nomeCondominio={dashboard?.condominio.nome}
      nomeMorador={dashboard?.morador.nome}
      perfis={contexto?.moradores ?? []}
    >
      <PageHeader
        title="Portal do Morador"
        description="Acompanhe comunicados, cobranças, reservas, ocorrências e movimentações importantes do condomínio."
        ultimaAtualizacao={ultimaAtualizacao}
        carregando={state.carregando}
        onRefresh={atualizarDadosPagina}
      />

      <DemoExperienceBanner
        area="portal"
        isDemo={dashboard?.condominio?.nome === 'Condomínio Demonstração Bacuri'}
      />
{state.carregando ? <PageSkeleton cards={7} linhas={4} /> : null}

      {state.erro ? (
        <ErrorState
          message={state.erro}
          actionLabel="Tentar novamente"
          onAction={atualizarDadosPagina}
        />
      ) : null}

      {dashboard && !state.carregando && !state.erro ? (
        <div className="space-y-6">
          {(configuracoesPortal?.mensagemBoasVindasPortal ||
            configuracoesPortal?.instrucoesGeraisPortal ||
            configuracoesPortal?.contatosUteisPortal) ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <Building2 className="h-6 w-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-600">
                    Bem-vindo ao portal
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-slate-950">
                    {configuracoesPortal?.nomeExibicaoPortal || dashboard.condominio.nome}
                  </h3>
                  {configuracoesPortal?.mensagemBoasVindasPortal ? (
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                      {configuracoesPortal.mensagemBoasVindasPortal}
                    </p>
                  ) : null}
                  {configuracoesPortal?.instrucoesGeraisPortal ? (
                    <p className="mt-3 whitespace-pre-line rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                      {configuracoesPortal.instrucoesGeraisPortal}
                    </p>
                  ) : null}
                  {configuracoesPortal?.contatosUteisPortal ? (
                    <p className="mt-3 whitespace-pre-line rounded-2xl border border-orange-100 bg-orange-50 p-3 text-sm leading-6 text-orange-900">
                      {configuracoesPortal.contatosUteisPortal}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {alertasPrioritarios.length > 0 ? (
            <section className="rounded-3xl border border-orange-200 bg-orange-50 p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                  <AlertTriangle className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-950">
                    Alertas prioritários
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    Itens que merecem atenção no momento.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {alertasPrioritarios.map((alerta) => (
                  <Link
                    key={alerta.id}
                    to={alerta.to}
                    className={`rounded-3xl border p-4 transition hover:-translate-y-1 hover:shadow-md ${alertaClasses(
                      alerta.destaque,
                    )}`}
                  >
                    <p className="text-sm font-bold">
                      {alerta.titulo}
                    </p>
                    <p className="mt-3 text-3xl font-bold">
                      {alerta.quantidade}
                    </p>
                    <p className="mt-2 text-sm leading-6">
                      {alerta.descricao}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {indicadores.map((indicador) => (
              <DashboardIndicatorCard
                key={indicador.titulo}
                indicador={indicador}
              />
            ))}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">
                  Central do morador
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-950">
                  Panorama da unidade
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Principais pendências e próximos eventos reunidos em um só lugar.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {cobrancasVencidas.length > 0 ? (
                  <Badge variant="red">
                    {cobrancasVencidas.length} cobrança(s) vencida(s)
                  </Badge>
                ) : (
                  <Badge variant="green">
                    Financeiro em dia
                  </Badge>
                )}
                <Badge variant="blue">
                  {dashboard.unidades.length} unidade(s)
                </Badge>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <SectionCard
              title="Ocorrências recentes"
              description="Solicitações e acompanhamentos enviados à administração."
              to="/ocorrencias"
            >
              {ocorrenciasRecentes.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Nenhuma ocorrência recente."
                  description="Quando houver movimentações, elas aparecerão aqui."
                />
              ) : (
                <div className="grid gap-3">
                  {ocorrenciasRecentes.map((ocorrencia) => (
                    <div
                      key={ocorrencia.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-950">
                            {ocorrencia.titulo}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {ocorrencia.categoria ?? 'Sem categoria'} • {formatarDataHora(ocorrencia.criadoEm)}
                          </p>
                        </div>
                        <Badge variant="orange">
                          {ocorrencia.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Próximas reservas"
              description="Agendamentos ativos e solicitações recentes."
              to="/reservas"
            >
              {proximasReservas.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Nenhuma reserva próxima."
                  description="Solicitações e aprovações aparecerão aqui."
                />
              ) : (
                <div className="grid gap-3">
                  {proximasReservas.map((reserva) => (
                    <div
                      key={reserva.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-bold text-slate-950">
                            {reserva.titulo ?? reserva.areaComum.nome}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {formatarDataHora(reserva.inicioEm)} até {formatarDataHora(reserva.fimEm)}
                          </p>
                        </div>
                        <Badge variant="blue">
                          {reserva.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Encomendas pendentes"
              description="Recebimentos da portaria aguardando retirada."
              to="/encomendas"
            >
              {encomendasPendentes.length === 0 ? (
                <EmptyState
                  icon={PackageCheck}
                  title="Nenhuma encomenda pendente."
                  description="Recebimentos da portaria aparecerão aqui."
                />
              ) : (
                <div className="grid gap-3">
                  {encomendasPendentes.map((encomenda) => (
                    <div
                      key={encomenda.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="font-bold text-slate-950">
                        {encomenda.descricao ?? encomenda.destinatarioNome ?? 'Encomenda registrada'}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Recebida em {formatarDataHora(encomenda.recebidoEm)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Cobranças pendentes"
              description="Próximos vencimentos e valores em aberto."
              to="/cobrancas"
            >
              {cobrancasPendentes.length === 0 ? (
                <EmptyState
                  icon={WalletCards}
                  title="Nenhuma cobrança pendente."
                  description="Cobranças futuras aparecerão aqui."
                />
              ) : (
                <div className="grid gap-3">
                  {cobrancasPendentes.map((cobranca) => (
                    <div
                      key={cobranca.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 min-w-0 overflow-hidden"
                    >
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 max-w-full">
                          <p className="font-bold text-slate-950 min-w-0 max-w-full break-words">
                            {cobranca.descricao}
                          </p>
                          <p className="mt-1 text-sm text-slate-600 min-w-0 max-w-full break-words">
                            Vence em {formatarData(cobranca.vencimentoEm)}
                          </p>
                        </div>

                        <div className="shrink-0 self-start">
                          <Badge variant={cobrancaEstaVencida(cobranca) ? 'red' : 'orange'}>
                            <span className="dashboard-financeiro-valor whitespace-nowrap">{formatarMoeda(cobranca.valor)}</span>
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <Building2 className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-950">
                    Minhas unidades
                  </h3>
                  <p className="text-sm text-slate-600">
                    Unidades vinculadas ao morador autenticado.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {dashboard.unidades.map((unidade) => (
                  <div
                    key={unidade.id}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-950">
                        {unidade.identificador}
                      </p>
                      <p className="text-sm text-slate-600">
                        {unidade.tipo} • Número {unidade.numero}
                        {unidade.andar !== null ? ` • Andar ${unidade.andar}` : ''}
                      </p>
                    </div>

                    <Badge variant="green">
                      Ativa
                    </Badge>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-950">
                  Ações rápidas
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Acesse os principais fluxos do portal com um clique.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <Link
                  to="/ocorrencias"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dashboard-financeiro-valor"
                >
                  <ClipboardList className="h-5 w-5" />
                  Abrir ocorrência
                </Link>

                <Link
                  to="/reservas"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dashboard-financeiro-valor"
                >
                  <CalendarDays className="h-5 w-5" />
                  Solicitar reserva
                </Link>

                <Link
                  to="/visitantes"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dashboard-financeiro-valor"
                >
                  <UsersRound className="h-5 w-5" />
                  Autorizar visitante
                </Link>

                <Link
                  to="/documentos"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dashboard-financeiro-valor"
                >
                  <FileText className="h-5 w-5" />
                  Ver documentos
                </Link>

                <Link
                  to="/cobrancas"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dashboard-financeiro-valor"
                >
                  <WalletCards className="h-5 w-5" />
                  Ver cobranças
                </Link>

                <Link
                  to="/perfil"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dashboard-financeiro-valor"
                >
                  <ContactRound className="h-5 w-5" />
                  Meu perfil
                </Link>
              </div>
            </article>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
