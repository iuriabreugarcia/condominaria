import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  ArrowRight,
  Building2,
  CalendarDays,
  CircleCheckBig,
  ClipboardList,
  FileText,
  Gavel,
  LoaderCircle,
  Megaphone,
  PackageCheck,
  ReceiptText,
  ShieldAlert,
  Settings,
  TrendingDown,
  TrendingUp,
  UserCog,
  UsersRound,
  WalletCards,
  Wrench,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminRouteContext } from '../components/AdminProtectedRoute';
import { AdminShell } from '../components/AdminShell';
import { usePageTitle } from '../hooks/usePageTitle';
import { apiRequest, ApiError } from '../lib/api';
import type {
  AdminAssembleiaLista,
  AdminCobrancaCondominial,
  AdminOcorrencia,
  AdminResumoCobrancas,
  AdminResumoFinanceiro,
  AdminResumoVotacoesAssembleia,
} from '../types/api';
import { DemoExperienceBanner } from '../components/DemoExperienceBanner';
import { AdminDemoJourneyCards } from '../components/AdminDemoJourneyCards';
import { AdminDemoQuickScript } from '../components/AdminDemoQuickScript';

const modulos = [
  {
    titulo: 'Estrutura',
    descricao:
      'Condomínios, blocos, unidades e moradores organizados em uma base administrativa central.',
    icon: UsersRound,
    to: '/admin/estrutura',
    etiqueta: 'Cadastros-base',
  },
  {
    titulo: 'Usuários',
    descricao:
      'Permissões, vínculos de acesso, papéis administrativos e usuários do portal.',
    icon: UserCog,
    to: '/admin/usuarios',
    etiqueta: 'Segurança',
  },
  {
    titulo: 'Auditoria',
    descricao:
      'Rastreabilidade de ações críticas, acessos, alterações operacionais e eventos administrativos.',
    icon: ShieldAlert,
    to: '/admin/auditoria',
    etiqueta: 'Rastreabilidade',
  },
  {
    titulo: 'Relatórios',
    descricao:
      'Indicadores executivos, exportações e impressão de relatórios por período e módulo.',
    icon: BarChart3,
    to: '/admin/relatorios',
    etiqueta: 'Gestão e análise',
  },
  {
    titulo: 'Configurações',
    descricao:
      'Dados do condomínio, identidade do portal, instruções operacionais e parâmetros gerais.',
    icon: Settings,
    to: '/admin/configuracoes',
    etiqueta: 'Administração',
  },
  {
    titulo: 'Financeiro',
    descricao:
      'Receitas, despesas, cobranças, inadimplência, auditoria financeira e recibos.',
    icon: WalletCards,
    to: '/admin/financeiro',
    etiqueta: 'Gestão financeira',
  },
  {
    titulo: 'Portaria',
    descricao:
      'Visitantes, prestadores, acessos em aberto e encomendas sob controle.',
    icon: PackageCheck,
    to: '/admin/portaria',
    etiqueta: 'Controle de acesso',
  },
  {
    titulo: 'Prestadores',
    descricao:
      'Fornecedores, contatos de serviço, manutenção e empresas recorrentes do condomínio.',
    icon: Briefcase,
    to: '/admin/prestadores',
    etiqueta: 'Serviços',
  },
  {
    titulo: 'Manutenção',
    descricao:
      'Ordens de serviço, manutenções programadas, prestadores responsáveis e vencimentos técnicos.',
    icon: Wrench,
    to: '/admin/manutencao',
    etiqueta: 'Patrimônio',
  },
  {
    titulo: 'Contratos',
    descricao:
      'Contratos recorrentes, vencimentos, renovação, prestadores responsáveis e alertas executivos.',
    icon: ReceiptText,
    to: '/admin/contratos',
    etiqueta: 'Vencimentos',
  },
  {
    titulo: 'Reservas',
    descricao:
      'Áreas comuns, solicitações, aprovações e controle de reservas administrativas.',
    icon: CalendarDays,
    to: '/admin/reservas',
    etiqueta: 'Operação',
  },
  {
    titulo: 'Ocorrências',
    descricao:
      'Demandas dos moradores, solicitações operacionais e acompanhamento administrativo com histórico.',
    icon: AlertTriangle,
    to: '/admin/ocorrencias',
    etiqueta: 'Atendimento',
  },
  {
    titulo: 'Documentos',
    descricao:
      'Regimento, convenção, atas, prestação de contas e documentos oficiais do condomínio.',
    icon: FileText,
    to: '/admin/documentos',
    etiqueta: 'Arquivo digital',
  },
  {
    titulo: 'Comunicação',
    descricao:
      'Comunicados, avisos e comunicação oficial entre administração e moradores.',
    icon: Megaphone,
    to: '/admin/comunicacao',
    etiqueta: 'Relacionamento',
  },
  {
    titulo: 'Governança',
    descricao:
      'Assembleias, pautas, votações, deliberações e apuração de resultados.',
    icon: Gavel,
    to: '/admin/governanca',
    etiqueta: 'Decisão condominial',
  },
];

type ResumoOcorrenciasDashboardAdmin = {
  carregando: boolean;
  erro: string;
  total: number;
  emAcompanhamento: number;
  urgentesEmAberto: number;
  resolvidas: number;
};

type PagamentoDashboardFinanceiro = {
  id: number;
  descricao: string;
  valor: string | number;
  pagoEm: string;
  unidade: string;
  morador: string;
  condominio: string;
};

type UnidadeInadimplenteDashboard = {
  chave: string;
  condominio: string;
  unidade: string;
  moradores: string[];
  quantidade: number;
  valor: number;
  vencimentoMaisAntigo: string;
};

type AssembleiaGovernancaDashboard = {
  id: number;
  condominioId: number;
  condominio: string;
  titulo: string;
  status: AdminAssembleiaLista['status'];
  primeiraChamadaEm: string;
  pautas: number;
  votacoes: number;
};

type ResumoGovernancaDashboardAdmin = {
  carregando: boolean;
  erro: string;
  totalAssembleias: number;
  convocadas: number;
  emAndamento: number;
  encerradas: number;
  votacoesAbertas: number;
  proximasAssembleias: AssembleiaGovernancaDashboard[];
};

type ResumoFinanceiroDashboardAdmin = {
  carregando: boolean;
  erro: string;
  receitaPrevista: number;
  receitaPaga: number;
  despesaLancada: number;
  despesaPaga: number;
  saldoPrevisto: number;
  saldoPago: number;
  cobrancasPendentes: number;
  cobrancasPagas: number;
  vencidasPendentes: number;
  quantidadeVencidas: number;
  taxaInadimplenciaPeriodo: number;
  ultimosPagamentos: PagamentoDashboardFinanceiro[];
  topUnidadesInadimplentes: UnidadeInadimplenteDashboard[];
};

const recursosAtivos = [
  {
    titulo: 'Portal do Morador integrado',
    descricao:
      'A administração opera em conjunto com o portal público autenticado dos moradores.',
    icon: Building2,
  },
  {
    titulo: 'Fluxos operacionais conectados',
    descricao:
      'Reservas, portaria, financeiro e governança já possuem rotas administrativas dedicadas.',
    icon: ClipboardList,
  },
  {
    titulo: 'Administração em evolução',
    descricao:
      'A base está pronta para novos refinamentos, relatórios e automações gerenciais.',
    icon: CircleCheckBig,
  },
];


const atalhosExecutivos = [
  {
    titulo: 'Manutenções',
    descricao: 'Ordens de serviço, prioridades e serviços programados.',
    to: '/admin/manutencao',
    icon: Wrench,
    destaque: 'Patrimônio',
  },
  {
    titulo: 'Contratos',
    descricao: 'Vencimentos, prestadores e contratos recorrentes.',
    to: '/admin/contratos',
    icon: ReceiptText,
    destaque: 'Gestão',
  },
  {
    titulo: 'Documentos',
    descricao: 'Arquivos publicados para administração e moradores.',
    to: '/admin/documentos',
    icon: FileText,
    destaque: 'Portal',
  },
  {
    titulo: 'Prestadores',
    descricao: 'Contatos, fornecedores e empresas de serviço.',
    to: '/admin/prestadores',
    icon: Briefcase,
    destaque: 'Serviços',
  },
  {
    titulo: 'Comunicação',
    descricao: 'Comunicados, avisos, leituras e ocorrências.',
    to: '/admin/comunicacao',
    icon: Megaphone,
    destaque: 'Moradores',
  },
  {
    titulo: 'Relatórios',
    descricao: 'Indicadores, exportações e visão executiva por período.',
    to: '/admin/relatorios',
    icon: BarChart3,
    destaque: 'Análise',
  },
];

function dataLocalInput(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function formatarMoeda(valor: string | number | null | undefined) {
  return Number(valor ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
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

function formatarData(valor: string | null | undefined) {
  if (!valor) {
    return '—';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(new Date(valor));
}

function formatarDataHora(valor: string | null | undefined) {
  if (!valor) {
    return '—';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
}


function mensagemErroAmigavelDashboard(error: unknown, fallback: string) {
  const mensagem =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : fallback;

  const normalizada = mensagem.trim().toLowerCase();

  if (
    normalizada.includes('internal server error') ||
    normalizada.includes('prismaclientknownrequesterror') ||
    normalizada.includes('p20') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('cannot read properties')
  ) {
    return 'Não foi possível carregar este indicador agora. Verifique a estrutura técnica do módulo ou tente novamente em instantes.';
  }

  if (
    normalizada.includes('failed to fetch') ||
    normalizada.includes('networkerror') ||
    normalizada.includes('network request failed')
  ) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
  }

  if (normalizada.includes('unauthorized') || normalizada.includes('401')) {
    return 'Sua sessão expirou. Faça login novamente para continuar.';
  }

  if (normalizada.includes('forbidden') || normalizada.includes('403')) {
    return 'Você não tem permissão para carregar este indicador.';
  }

  return mensagem || fallback;
}

function rotuloStatusAssembleiaDashboard(status: AdminAssembleiaLista['status']) {
  switch (status) {
    case 'RASCUNHO':
      return 'Rascunho';
    case 'CONVOCADA':
      return 'Convocada';
    case 'EM_ANDAMENTO':
      return 'Em andamento';
    case 'ENCERRADA':
      return 'Encerrada';
    case 'CANCELADA':
      return 'Cancelada';
    default:
      return status;
  }
}

function classeStatusAssembleiaDashboard(status: AdminAssembleiaLista['status']) {
  switch (status) {
    case 'CONVOCADA':
      return 'bg-sky-100 text-sky-800';
    case 'EM_ANDAMENTO':
      return 'bg-amber-100 text-amber-800';
    case 'ENCERRADA':
      return 'bg-emerald-100 text-emerald-800';
    case 'CANCELADA':
      return 'bg-rose-100 text-rose-800';
    case 'RASCUNHO':
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function cobrancaEstaVencida(cobranca: AdminCobrancaCondominial) {
  if (cobranca.status !== 'PENDENTE') {
    return false;
  }

  const vencimento = cobranca.vencimentoEm.includes('T')
    ? new Date(cobranca.vencimentoEm)
    : new Date(`${cobranca.vencimentoEm}T23:59:59`);

  return vencimento.getTime() < Date.now();
}

function resumoFinanceiroVazio(): ResumoFinanceiroDashboardAdmin {
  return {
    carregando: true,
    erro: '',
    receitaPrevista: 0,
    receitaPaga: 0,
    despesaLancada: 0,
    despesaPaga: 0,
    saldoPrevisto: 0,
    saldoPago: 0,
    cobrancasPendentes: 0,
    cobrancasPagas: 0,
    vencidasPendentes: 0,
    quantidadeVencidas: 0,
    taxaInadimplenciaPeriodo: 0,
    ultimosPagamentos: [],
    topUnidadesInadimplentes: [],
  };
}

export function AdminDashboardPage() {
  usePageTitle('Painel Administrativo');

  const {
    usuario,
    condominiosAdministrativos,
  } = useAdminRouteContext();

  const [resumoOcorrencias, setResumoOcorrencias] =
    useState<ResumoOcorrenciasDashboardAdmin>({
      carregando: true,
      erro: '',
      total: 0,
      emAcompanhamento: 0,
      urgentesEmAberto: 0,
      resolvidas: 0,
    });

  const [resumoFinanceiroDashboard, setResumoFinanceiroDashboard] =
    useState<ResumoFinanceiroDashboardAdmin>(() => resumoFinanceiroVazio());

  const [resumoGovernancaDashboard, setResumoGovernancaDashboard] =
    useState<ResumoGovernancaDashboardAdmin>({
      carregando: true,
      erro: '',
      totalAssembleias: 0,
      convocadas: 0,
      emAndamento: 0,
      encerradas: 0,
      votacoesAbertas: 0,
      proximasAssembleias: [],
    });

  const condominiosDashboard = useMemo(
    () =>
      condominiosAdministrativos.map((vinculo) => ({
        id: vinculo.condominio.id,
        nome: vinculo.condominio.nome,
      })),
    [condominiosAdministrativos],
  );

  const idsCondominiosAdministrativos = useMemo(
    () => condominiosDashboard.map((condominio) => condominio.id),
    [condominiosDashboard],
  );

  const periodoFinanceiroDashboard = useMemo(() => {
    const agora = new Date();
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

    return {
      inicio: dataLocalInput(inicio),
      fim: dataLocalInput(fim),
    };
  }, []);

  useEffect(() => {
    let componenteAtivo = true;

    async function carregarResumoOcorrencias() {
      if (idsCondominiosAdministrativos.length === 0) {
        if (componenteAtivo) {
          setResumoOcorrencias({
            carregando: false,
            erro: '',
            total: 0,
            emAcompanhamento: 0,
            urgentesEmAberto: 0,
            resolvidas: 0,
          });
        }

        return;
      }

      setResumoOcorrencias((atual) => ({
        ...atual,
        carregando: true,
        erro: '',
      }));

      try {
        const respostas = await Promise.all(
          idsCondominiosAdministrativos.map((condominioId) =>
            apiRequest<AdminOcorrencia[]>(
              `/condominios/${condominioId}/ocorrencias`,
            ),
          ),
        );

        const ocorrencias = respostas.flat();

        const emAcompanhamento = ocorrencias.filter(
          (ocorrencia) =>
            ocorrencia.status === 'ABERTA' ||
            ocorrencia.status === 'EM_ANALISE' ||
            ocorrencia.status === 'EM_ANDAMENTO' ||
            ocorrencia.status === 'AGUARDANDO_MORADOR',
        ).length;

        const urgentesEmAberto = ocorrencias.filter(
          (ocorrencia) =>
            ocorrencia.prioridade === 'URGENTE' &&
            (ocorrencia.status === 'ABERTA' ||
              ocorrencia.status === 'EM_ANALISE' ||
              ocorrencia.status === 'EM_ANDAMENTO' ||
              ocorrencia.status === 'AGUARDANDO_MORADOR'),
        ).length;

        const resolvidas = ocorrencias.filter(
          (ocorrencia) => ocorrencia.status === 'RESOLVIDA',
        ).length;

        if (componenteAtivo) {
          setResumoOcorrencias({
            carregando: false,
            erro: '',
            total: ocorrencias.length,
            emAcompanhamento,
            urgentesEmAberto,
            resolvidas,
          });
        }
      } catch (error) {
        const mensagem = mensagemErroAmigavelDashboard(
          error,
          'Não foi possível carregar o resumo das ocorrências.',
        );

        if (componenteAtivo) {
          setResumoOcorrencias((atual) => ({
            ...atual,
            carregando: false,
            erro: mensagem,
          }));
        }
      }
    }

    void carregarResumoOcorrencias();

    return () => {
      componenteAtivo = false;
    };
  }, [idsCondominiosAdministrativos]);

  useEffect(() => {
    let componenteAtivo = true;

    async function carregarResumoFinanceiroDashboard() {
      if (condominiosDashboard.length === 0) {
        if (componenteAtivo) {
          setResumoFinanceiroDashboard({
            ...resumoFinanceiroVazio(),
            carregando: false,
          });
        }

        return;
      }

      setResumoFinanceiroDashboard((atual) => ({
        ...atual,
        carregando: true,
        erro: '',
      }));

      try {
        const respostas = await Promise.all(
          condominiosDashboard.map(async (condominio) => {
            const [financeiro, cobrancasResumo, cobrancas] = await Promise.all([
              apiRequest<AdminResumoFinanceiro>(
                `/condominios/${condominio.id}/financeiro/resumo?inicio=${encodeURIComponent(
                  periodoFinanceiroDashboard.inicio,
                )}&fim=${encodeURIComponent(periodoFinanceiroDashboard.fim)}`,
              ),
              apiRequest<AdminResumoCobrancas>(
                `/condominios/${condominio.id}/cobrancas/resumo?inicio=${encodeURIComponent(
                  periodoFinanceiroDashboard.inicio,
                )}&fim=${encodeURIComponent(periodoFinanceiroDashboard.fim)}`,
              ),
              apiRequest<AdminCobrancaCondominial[]>(
                `/condominios/${condominio.id}/cobrancas`,
              ),
            ]);

            return {
              condominio,
              financeiro,
              cobrancasResumo,
              cobrancas,
            };
          }),
        );

        const acumulado = respostas.reduce(
          (total, resposta) => {
            const gruposFinanceiro = resposta.financeiro.grupos ?? [];
            const gruposCobrancas = resposta.cobrancasResumo.grupos ?? [];

            const receitaPrevista = gruposFinanceiro
              .filter(
                (grupo) =>
                  grupo.tipo === 'RECEITA' && grupo.status !== 'CANCELADO',
              )
              .reduce(
                (subtotal, grupo) => subtotal + Number(grupo._sum.valor ?? 0),
                0,
              );

            const receitaPaga = gruposFinanceiro
              .filter(
                (grupo) => grupo.tipo === 'RECEITA' && grupo.status === 'PAGO',
              )
              .reduce(
                (subtotal, grupo) => subtotal + Number(grupo._sum.valor ?? 0),
                0,
              );

            const despesaLancada = gruposFinanceiro
              .filter(
                (grupo) =>
                  grupo.tipo === 'DESPESA' && grupo.status !== 'CANCELADO',
              )
              .reduce(
                (subtotal, grupo) => subtotal + Number(grupo._sum.valor ?? 0),
                0,
              );

            const despesaPaga = gruposFinanceiro
              .filter(
                (grupo) => grupo.tipo === 'DESPESA' && grupo.status === 'PAGO',
              )
              .reduce(
                (subtotal, grupo) => subtotal + Number(grupo._sum.valor ?? 0),
                0,
              );

            const cobrancasPendentes = gruposCobrancas
              .filter((grupo) => grupo.status === 'PENDENTE')
              .reduce(
                (subtotal, grupo) => subtotal + Number(grupo._sum.valor ?? 0),
                0,
              );

            const cobrancasPagas = gruposCobrancas
              .filter((grupo) => grupo.status === 'PAGO')
              .reduce(
                (subtotal, grupo) => subtotal + Number(grupo._sum.valor ?? 0),
                0,
              );

            total.receitaPrevista += receitaPrevista;
            total.receitaPaga += receitaPaga;
            total.despesaLancada += despesaLancada;
            total.despesaPaga += despesaPaga;
            total.cobrancasPendentes += cobrancasPendentes;
            total.cobrancasPagas += cobrancasPagas;
            total.vencidasPendentes += Number(
              resposta.cobrancasResumo.vencidasPendentes._sum.valor ?? 0,
            );
            total.quantidadeVencidas +=
              resposta.cobrancasResumo.vencidasPendentes._count._all ?? 0;

            return total;
          },
          {
            receitaPrevista: 0,
            receitaPaga: 0,
            despesaLancada: 0,
            despesaPaga: 0,
            cobrancasPendentes: 0,
            cobrancasPagas: 0,
            vencidasPendentes: 0,
            quantidadeVencidas: 0,
          },
        );

        const todasCobrancas = respostas.flatMap((resposta) =>
          resposta.cobrancas.map((cobranca) => ({
            cobranca,
            condominio: resposta.condominio.nome,
          })),
        );

        const ultimosPagamentos = todasCobrancas
          .filter(({ cobranca }) => cobranca.status === 'PAGO' && cobranca.pagoEm)
          .sort(
            (a, b) =>
              new Date(b.cobranca.pagoEm ?? '').getTime() -
              new Date(a.cobranca.pagoEm ?? '').getTime(),
          )
          .slice(0, 5)
          .map(({ cobranca, condominio }) => ({
            id: cobranca.id,
            descricao: cobranca.descricao,
            valor: cobranca.valor,
            pagoEm: cobranca.pagoEm ?? '',
            unidade: cobranca.unidade.identificador,
            morador: cobranca.morador?.nome ?? 'Não vinculado',
            condominio,
          }));

        const mapaInadimplencia = new Map<string, UnidadeInadimplenteDashboard>();

        todasCobrancas
          .filter(({ cobranca }) => cobrancaEstaVencida(cobranca))
          .forEach(({ cobranca, condominio }) => {
            const chave = `${condominio}-${cobranca.unidade.id}`;
            const atual = mapaInadimplencia.get(chave);
            const morador = cobranca.morador?.nome;
            const valor = Number(cobranca.valor ?? 0);

            if (!atual) {
              mapaInadimplencia.set(chave, {
                chave,
                condominio,
                unidade: cobranca.unidade.identificador,
                moradores: morador ? [morador] : [],
                quantidade: 1,
                valor,
                vencimentoMaisAntigo: cobranca.vencimentoEm,
              });

              return;
            }

            atual.quantidade += 1;
            atual.valor += valor;

            if (morador && !atual.moradores.includes(morador)) {
              atual.moradores.push(morador);
            }

            if (
              new Date(cobranca.vencimentoEm).getTime() <
              new Date(atual.vencimentoMaisAntigo).getTime()
            ) {
              atual.vencimentoMaisAntigo = cobranca.vencimentoEm;
            }
          });

        const topUnidadesInadimplentes = [...mapaInadimplencia.values()]
          .sort((a, b) => {
            if (b.valor !== a.valor) {
              return b.valor - a.valor;
            }

  return (
              new Date(a.vencimentoMaisAntigo).getTime() -
              new Date(b.vencimentoMaisAntigo).getTime()
            );
          })
          .slice(0, 5);

        const baseCobrancasValidas =
          acumulado.cobrancasPendentes + acumulado.cobrancasPagas;

        if (componenteAtivo) {
          setResumoFinanceiroDashboard({
            carregando: false,
            erro: '',
            receitaPrevista: acumulado.receitaPrevista,
            receitaPaga: acumulado.receitaPaga,
            despesaLancada: acumulado.despesaLancada,
            despesaPaga: acumulado.despesaPaga,
            saldoPrevisto: acumulado.receitaPrevista - acumulado.despesaLancada,
            saldoPago: acumulado.receitaPaga - acumulado.despesaPaga,
            cobrancasPendentes: acumulado.cobrancasPendentes,
            cobrancasPagas: acumulado.cobrancasPagas,
            vencidasPendentes: acumulado.vencidasPendentes,
            quantidadeVencidas: acumulado.quantidadeVencidas,
            taxaInadimplenciaPeriodo:
              baseCobrancasValidas > 0
                ? (acumulado.vencidasPendentes / baseCobrancasValidas) * 100
                : 0,
            ultimosPagamentos,
            topUnidadesInadimplentes,
          });
        }
      } catch (error) {
        const mensagem = mensagemErroAmigavelDashboard(
          error,
          'Não foi possível carregar o resumo financeiro.',
        );

        if (componenteAtivo) {
          setResumoFinanceiroDashboard((atual) => ({
            ...atual,
            carregando: false,
            erro: mensagem,
          }));
        }
      }
    }

    void carregarResumoFinanceiroDashboard();

    return () => {
      componenteAtivo = false;
    };
  }, [condominiosDashboard, periodoFinanceiroDashboard]);

  useEffect(() => {
    let componenteAtivo = true;

    async function carregarResumoGovernancaDashboard() {
      if (condominiosDashboard.length === 0) {
        if (componenteAtivo) {
          setResumoGovernancaDashboard({
            carregando: false,
            erro: '',
            totalAssembleias: 0,
            convocadas: 0,
            emAndamento: 0,
            encerradas: 0,
            votacoesAbertas: 0,
            proximasAssembleias: [],
          });
        }

        return;
      }

      setResumoGovernancaDashboard((atual) => ({
        ...atual,
        carregando: true,
        erro: '',
      }));

      try {
        const respostas = await Promise.all(
          condominiosDashboard.map(async (condominio) => {
            const [assembleias, resumoVotacoes] = await Promise.all([
              apiRequest<AdminAssembleiaLista[]>(
                `/condominios/${condominio.id}/assembleias`,
              ),
              apiRequest<AdminResumoVotacoesAssembleia>(
                `/condominios/${condominio.id}/votacoes-assembleia/resumo-admin`,
              ).catch(() => ({
                abertas: 0,
                encerradas: 0,
                rascunho: 0,
                canceladas: 0,
                totalVotacoes: 0,
                totalVotos: 0,
                assembleiasComVotacaoAberta: 0,
                votacoesAbertasPorAssembleia: [],
              })),
            ]);

            return {
              condominio,
              assembleias,
              resumoVotacoes,
            };
          }),
        );

        const assembleias = respostas.flatMap((resposta) =>
          resposta.assembleias.map((assembleia) => {
            const votacoesAbertas =
              resposta.resumoVotacoes.votacoesAbertasPorAssembleia.find(
                (item) => item.assembleiaId === assembleia.id,
              )?.abertas ?? 0;

            return {
              id: assembleia.id,
              condominioId: resposta.condominio.id,
              condominio: resposta.condominio.nome,
              titulo: assembleia.titulo,
              status: assembleia.status,
              primeiraChamadaEm: assembleia.primeiraChamadaEm,
              pautas: assembleia._count?.pautas ?? 0,
              votacoes: votacoesAbertas,
            };
          }),
        );

        const proximasAssembleias = assembleias
          .filter(
            (assembleia) =>
              assembleia.status === 'CONVOCADA' ||
              assembleia.status === 'EM_ANDAMENTO',
          )
          .sort(
            (a, b) =>
              new Date(a.primeiraChamadaEm).getTime() -
              new Date(b.primeiraChamadaEm).getTime(),
          )
          .slice(0, 5);

        if (componenteAtivo) {
          setResumoGovernancaDashboard({
            carregando: false,
            erro: '',
            totalAssembleias: assembleias.length,
            convocadas: assembleias.filter(
              (assembleia) => assembleia.status === 'CONVOCADA',
            ).length,
            emAndamento: assembleias.filter(
              (assembleia) => assembleia.status === 'EM_ANDAMENTO',
            ).length,
            encerradas: assembleias.filter(
              (assembleia) => assembleia.status === 'ENCERRADA',
            ).length,
            votacoesAbertas: respostas.reduce(
              (total, resposta) => total + resposta.resumoVotacoes.abertas,
              0,
            ),
            proximasAssembleias,
          });
        }
      } catch (error) {
        const mensagem = mensagemErroAmigavelDashboard(
          error,
          'Não foi possível carregar o resumo de governança.',
        );

        if (componenteAtivo) {
          setResumoGovernancaDashboard((atual) => ({
            ...atual,
            carregando: false,
            erro: mensagem,
          }));
        }
      }
    }

    void carregarResumoGovernancaDashboard();

    return () => {
      componenteAtivo = false;
    };
  }, [condominiosDashboard]);

  return (
    <AdminShell
      usuario={usuario}
      condominiosAdministrativos={condominiosAdministrativos}
    >

        {/* Jornada demo comercial do Admin. */}
        <AdminDemoJourneyCards />

        <AdminDemoQuickScript />

      <DemoExperienceBanner area="admin" />
      <section className="rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-7 min-w-0 overflow-hidden">
        <div className="admin-dashboard-mobile-text-fix flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Central administrativa
            </p>

            <h2 className="mt-2 max-w-4xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Painel administrativo consolidado para operação completa do condomínio.
            </h2>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600 sm:text-base min-w-0 max-w-full break-words whitespace-normal overflow-hidden">
              A área administrativa da Condominaria Express reúne estrutura,
              financeiro, portaria, reservas, ocorrências, comunicação e governança
              em uma navegação única.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px] xl:grid-cols-1">
            <div className="rounded-3xl border border-orange-100 bg-orange-50 p-4 text-orange-950 min-w-0 overflow-hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-orange-700">
                Usuário ativo
              </p>

              <p className="mt-2 text-lg font-bold">
                {usuario.nome}
              </p>

              <p className="mt-1 text-sm text-slate-600 min-w-0 max-w-full break-words whitespace-normal overflow-hidden">
                {usuario.superAdmin
                  ? 'Super Admin'
                  : 'Perfil administrativo autorizado'}
              </p>
            </div>

            <div className="rounded-3xl border border-orange-100 bg-orange-50 p-4 min-w-0 overflow-hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-orange-700">
                Condomínios administrativos
              </p>

              <p className="mt-2 text-3xl font-bold text-orange-950">
                {usuario.superAdmin
                  ? 'Global'
                  : condominiosAdministrativos.length}
              </p>
            </div>
          </div>
        </div>


          {Boolean(
            resumoOcorrencias.erro ||
              resumoFinanceiroDashboard.erro ||
              resumoGovernancaDashboard.erro,
          ) ? (
            <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold leading-6 text-amber-900 min-w-0 overflow-hidden max-w-full whitespace-normal break-words">
              Alguns indicadores não foram carregados completamente. Os módulos continuam acessíveis pelos atalhos abaixo.
            </div>
          ) : null}

      </section>


      <section className="admin-dashboard-acoes-rapidas rounded-[2rem] border border-orange-100 bg-gradient-to-br from-white via-orange-50/50 to-white p-5 shadow-sm sm:p-6 min-w-0 overflow-hidden mt-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Ações rápidas
            </p>

            <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Módulos administrativos prioritários
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 min-w-0 max-w-full break-words whitespace-normal overflow-hidden">
              Atalhos para os módulos profissionais já padronizados, ajudando a administração
              a agir mais rápido nos fluxos de rotina do condomínio.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-orange-700 shadow-sm min-w-0 overflow-hidden">
            Operação integrada
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {atalhosExecutivos.map((atalho) => {
            const Icon = atalho.icon;

            return (
              <Link
                key={atalho.to}
                to={atalho.to}
                className="group rounded-3xl border border-white bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md min-w-0 overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-500 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>

                  <span className="inline-flex w-fit items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.06em] text-slate-600">
                    {atalho.destaque}
                  </span>
                </div>

                <h4 className="mt-4 text-base font-bold text-slate-950">
                  {atalho.titulo}
                </h4>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 min-w-0 max-w-full whitespace-normal break-words">
                  {atalho.descricao}
                </p>

                <span className="mt-4 inline-flex items-start gap-2 text-sm font-bold text-orange-600 min-w-0 max-w-full whitespace-normal break-words">
                  Abrir módulo
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className=" rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Central de notificações
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Notificações administrativas
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 min-w-0 max-w-full break-words whitespace-normal overflow-hidden">
              Alertas operacionais para priorizar financeiro, ocorrências e acompanhamento administrativo.
            </p>
          </div>

          <Link
            to="/admin/financeiro"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-800 transition hover:bg-orange-100 min-w-0 overflow-hidden max-w-full whitespace-normal break-words"
          >
            Abrir financeiro
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Link
            to="/admin/financeiro"
            className="rounded-3xl border border-rose-100 bg-rose-50 p-4 transition hover:-translate-y-1 hover:shadow-md min-w-0 overflow-hidden"
          >
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-rose-700">
              Cobranças vencidas
            </p>
            <p className="mt-2 text-3xl font-bold text-rose-950">
              {resumoFinanceiroDashboard.carregando ? '—' : resumoFinanceiroDashboard.quantidadeVencidas}
            </p>
            <p className="mt-1 text-sm leading-6 text-rose-800 min-w-0 max-w-full whitespace-normal break-words">
              Títulos pendentes com vencimento ultrapassado.
            </p>
          </Link>

          <Link
            to="/admin/ocorrencias"
            className="rounded-3xl border border-orange-100 bg-orange-50 p-4 transition hover:-translate-y-1 hover:shadow-md min-w-0 overflow-hidden"
          >
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
              Ocorrências urgentes
            </p>
            <p className="mt-2 text-3xl font-bold text-orange-950">
              {resumoOcorrencias.carregando ? '—' : resumoOcorrencias.urgentesEmAberto}
            </p>
            <p className="mt-1 text-sm leading-6 text-orange-800 min-w-0 max-w-full whitespace-normal break-words">
              Demandas de maior prioridade em aberto.
            </p>
          </Link>

          <Link
            to="/admin/governanca"
            className="rounded-3xl border border-sky-100 bg-sky-50 p-4 transition hover:-translate-y-1 hover:shadow-md min-w-0 overflow-hidden"
          >
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-sky-700">
              Assembleias ativas
            </p>
            <p className="mt-2 text-3xl font-bold text-sky-950">
              {resumoGovernancaDashboard.carregando
                ? '—'
                : resumoGovernancaDashboard.convocadas +
                  resumoGovernancaDashboard.emAndamento}
            </p>
            <p className="mt-1 text-sm leading-6 text-sky-800 min-w-0 max-w-full whitespace-normal break-words">
              Convocações e assembleias em andamento.
            </p>
          </Link>

          <Link
            to="/admin/financeiro"
            className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-1 hover:shadow-md min-w-0 overflow-hidden"
          >
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Valor vencido
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {resumoFinanceiroDashboard.carregando
                ? '—'
                : formatarMoeda(resumoFinanceiroDashboard.vencidasPendentes)}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600 min-w-0 max-w-full break-words whitespace-normal overflow-hidden">
              Total financeiro vencido em aberto.
            </p>
          </Link>
        </div>
      </section>

      <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-7 min-w-0 overflow-hidden admin-dashboard-governanca mt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-sky-600">
              Dashboard de governança
            </p>

            <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Assembleias e votações em acompanhamento
            </h3>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 min-w-0 max-w-full break-words whitespace-normal overflow-hidden">
              Acompanhe convocações, assembleias em andamento, votações abertas e próximas decisões condominiais.
            </p>
          </div>

          <Link
            to="/admin/governanca"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-bold text-white transition hover:bg-sky-700 min-w-0 max-w-full whitespace-normal break-words"
          >
            Abrir governança
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {resumoGovernancaDashboard.erro ? (
          <p className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 min-w-0 overflow-hidden max-w-full whitespace-normal break-words">
            {resumoGovernancaDashboard.erro}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-sky-100 bg-sky-50 p-5 min-w-0 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-700">
              Convocadas
            </p>
            <p className="mt-3 text-3xl font-bold text-sky-950">
              {resumoGovernancaDashboard.carregando ? (
                <LoaderCircle className="h-6 w-6 animate-spin text-orange-500" />
              ) : (
                resumoGovernancaDashboard.convocadas
              )}
            </p>
          </article>

          <article className="rounded-3xl border border-amber-100 bg-amber-50 p-5 min-w-0 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">
              Em andamento
            </p>
            <p className="mt-3 text-3xl font-bold text-amber-950">
              {resumoGovernancaDashboard.carregando ? (
                <LoaderCircle className="h-6 w-6 animate-spin text-orange-500" />
              ) : (
                resumoGovernancaDashboard.emAndamento
              )}
            </p>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-orange-50 p-5 min-w-0 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-orange-700">
              Votações abertas
            </p>
            <p className="mt-3 text-3xl font-bold text-orange-950">
              {resumoGovernancaDashboard.carregando ? (
                <LoaderCircle className="h-6 w-6 animate-spin text-orange-500" />
              ) : (
                resumoGovernancaDashboard.votacoesAbertas
              )}
            </p>
          </article>

          <article className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 min-w-0 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
              Encerradas
            </p>
            <p className="mt-3 text-3xl font-bold text-emerald-950">
              {resumoGovernancaDashboard.carregando ? (
                <LoaderCircle className="h-6 w-6 animate-spin text-orange-500" />
              ) : (
                resumoGovernancaDashboard.encerradas
              )}
            </p>
          </article>
        </div>

        <article className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 min-w-0 overflow-hidden">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Próximas assembleias
              </p>
              <h4 className="mt-1 text-lg font-bold text-slate-950">
                Convocações e decisões prioritárias
              </h4>
            </div>
            <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
              {resumoGovernancaDashboard.proximasAssembleias.length} item(ns)
            </span>
          </div>

          {resumoGovernancaDashboard.proximasAssembleias.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500 min-w-0 max-w-full whitespace-normal break-words">
              Nenhuma assembleia convocada ou em andamento no momento.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {resumoGovernancaDashboard.proximasAssembleias.map((assembleia) => (
                <Link
                  key={`${assembleia.condominioId}-${assembleia.id}`}
                  to="/admin/governanca"
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-200 hover:shadow-sm min-w-0 overflow-hidden"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-950 min-w-0 max-w-full whitespace-normal break-words">
                        {assembleia.titulo}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {assembleia.condominio} • {formatarDataHora(assembleia.primeiraChamadaEm)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${classeStatusAssembleiaDashboard(
                          assembleia.status,
                        )}`}
                      >
                        {rotuloStatusAssembleiaDashboard(assembleia.status)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {assembleia.pautas} pauta(s)
                      </span>
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                        {assembleia.votacoes} votação(ões)
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-7 min-w-0 overflow-hidden admin-dashboard-financeiro mt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Dashboard financeiro
            </p>

            <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Visão executiva do mês
            </h3>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 min-w-0 max-w-full break-words whitespace-normal overflow-hidden">
              Indicadores consolidados de receitas, despesas, cobranças, inadimplência
              e pagamentos entre {formatarData(periodoFinanceiroDashboard.inicio)} e{' '}
              {formatarData(periodoFinanceiroDashboard.fim)}.
            </p>
          </div>

          <Link
            to="/admin/financeiro"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 min-w-0 max-w-full whitespace-normal break-words"
          >
            Abrir financeiro
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {resumoFinanceiroDashboard.erro ? (
          <p className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 min-w-0 overflow-hidden max-w-full whitespace-normal break-words">
            {resumoFinanceiroDashboard.erro}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 min-w-0 overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
                Receitas do mês
              </p>
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-emerald-950">
              {resumoFinanceiroDashboard.carregando ? (
                <LoaderCircle className="h-6 w-6 animate-spin text-orange-500" />
              ) : (
                formatarMoeda(resumoFinanceiroDashboard.receitaPaga)
              )}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-800">
              Previsto: {formatarMoeda(resumoFinanceiroDashboard.receitaPrevista)}
            </p>
          </article>

          <article className="rounded-3xl border border-rose-100 bg-rose-50 p-5 min-w-0 overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-rose-700">
                Despesas do mês
              </p>
              <TrendingDown className="h-5 w-5 text-rose-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-rose-950">
              {resumoFinanceiroDashboard.carregando ? (
                <LoaderCircle className="h-6 w-6 animate-spin text-orange-500" />
              ) : (
                formatarMoeda(resumoFinanceiroDashboard.despesaPaga)
              )}
            </p>
            <p className="mt-1 text-xs font-semibold text-rose-800">
              Lançado: {formatarMoeda(resumoFinanceiroDashboard.despesaLancada)}
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 min-w-0 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Saldo realizado
            </p>
            <p className="mt-3 text-2xl font-bold text-slate-950">
              {resumoFinanceiroDashboard.carregando ? (
                <LoaderCircle className="h-6 w-6 animate-spin text-orange-500" />
              ) : (
                formatarMoeda(resumoFinanceiroDashboard.saldoPago)
              )}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              Previsto: {formatarMoeda(resumoFinanceiroDashboard.saldoPrevisto)}
            </p>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-orange-50 p-5 min-w-0 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-orange-700">
              Taxa de inadimplência
            </p>
            <p className="mt-3 text-2xl font-bold text-orange-950">
              {resumoFinanceiroDashboard.carregando ? (
                <LoaderCircle className="h-6 w-6 animate-spin text-orange-500" />
              ) : (
                `${formatarPercentualBR(resumoFinanceiroDashboard.taxaInadimplenciaPeriodo)}`
              )}
            </p>
            <p className="mt-1 text-xs font-semibold text-orange-800">
              {resumoFinanceiroDashboard.quantidadeVencidas} título(s) vencido(s)
            </p>
          </article>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-amber-100 bg-amber-50 p-5 min-w-0 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">
              Cobranças em aberto
            </p>
            <p className="mt-3 text-2xl font-bold text-amber-950">
              {formatarMoeda(resumoFinanceiroDashboard.cobrancasPendentes)}
            </p>
          </article>

          <article className="rounded-3xl border border-rose-100 bg-white p-5 min-w-0 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-rose-700">
              Vencido em aberto
            </p>
            <p className="mt-3 text-2xl font-bold text-rose-700">
              {formatarMoeda(resumoFinanceiroDashboard.vencidasPendentes)}
            </p>
          </article>

          <article className="rounded-3xl border border-emerald-100 bg-white p-5 min-w-0 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
              Cobranças pagas
            </p>
            <p className="mt-3 text-2xl font-bold text-emerald-700">
              {formatarMoeda(resumoFinanceiroDashboard.cobrancasPagas)}
            </p>
          </article>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 min-w-0 overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Últimos pagamentos
                </p>
                <h4 className="mt-1 text-lg font-bold text-slate-950">
                  Baixas recentes
                </h4>
              </div>
              <ReceiptText className="h-5 w-5 text-orange-500" />
            </div>

            <div className="mt-4 grid gap-3">
              {resumoFinanceiroDashboard.ultimosPagamentos.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600 min-w-0 max-w-full break-words whitespace-normal overflow-hidden">
                  Nenhum pagamento registrado no período.
                </p>
              ) : (
                resumoFinanceiroDashboard.ultimosPagamentos.map((pagamento) => (
                  <div
                    key={`${pagamento.condominio}-${pagamento.id}`}
                    className="rounded-2xl border border-white bg-white p-4 shadow-sm min-w-0 overflow-hidden"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-bold text-slate-950">
                          {pagamento.descricao}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600 min-w-0 max-w-full break-words whitespace-normal overflow-hidden">
                          {pagamento.unidade} • {pagamento.morador}
                        </p>
                      </div>
                      <p className="shrink-0 whitespace-nowrap text-sm font-bold text-emerald-700">
                        {formatarMoeda(pagamento.valor)}
                      </p>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      {pagamento.condominio} • Pago em {formatarDataHora(pagamento.pagoEm)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-rose-100 bg-rose-50 p-5 min-w-0 overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-rose-700">
                  Top inadimplência
                </p>
                <h4 className="mt-1 text-lg font-bold text-slate-950">
                  Unidades com maior valor vencido
                </h4>
              </div>
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>

            <div className="mt-4 grid gap-3">
              {resumoFinanceiroDashboard.topUnidadesInadimplentes.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-rose-200 bg-white p-4 text-sm font-semibold text-rose-800 min-w-0 overflow-hidden max-w-full whitespace-normal break-words">
                  Nenhuma unidade inadimplente no momento.
                </p>
              ) : (
                resumoFinanceiroDashboard.topUnidadesInadimplentes.map((item) => (
                  <div
                    key={item.chave}
                    className="rounded-2xl border border-white bg-white p-4 shadow-sm min-w-0 overflow-hidden"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-bold text-slate-950">
                          {item.unidade}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600 min-w-0 max-w-full break-words whitespace-normal overflow-hidden">
                          {item.moradores.length > 0
                            ? item.moradores.join(', ')
                            : 'Morador não vinculado'}
                        </p>
                      </div>
                      <p className="shrink-0 whitespace-nowrap text-sm font-bold text-rose-700">
                        {formatarMoeda(item.valor)}
                      </p>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      {item.condominio} • {item.quantidade} título(s) • Mais antigo:{' '}
                      {formatarData(item.vencimentoMaisAntigo)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 min-w-0 overflow-hidden admin-dashboard-monitor-operacional mt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Monitor operacional
            </p>

            <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Monitoramento das ocorrências
            </h3>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 min-w-0 max-w-full break-words whitespace-normal overflow-hidden">
              Visão consolidada das demandas registradas pelos moradores nos condomínios sob sua administração.
            </p>
          </div>

          <Link
            to="/admin/ocorrencias"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 min-w-0 max-w-full whitespace-normal break-words"
          >
            Abrir ocorrências
          </Link>
        </div>

        {resumoOcorrencias.erro ? (
          <p className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 min-w-0 overflow-hidden max-w-full whitespace-normal break-words">
            {resumoOcorrencias.erro}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 min-w-0 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Total registradas
            </p>

            <p className="mt-3 text-3xl font-bold text-slate-950">
              {resumoOcorrencias.carregando ? (
                <LoaderCircle className="h-7 w-7 animate-spin text-orange-500" />
              ) : (
                resumoOcorrencias.total
              )}
            </p>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-orange-50 p-5 min-w-0 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-orange-700">
              Em acompanhamento
            </p>

            <p className="mt-3 text-3xl font-bold text-orange-950">
              {resumoOcorrencias.carregando ? (
                <LoaderCircle className="h-7 w-7 animate-spin text-orange-500" />
              ) : (
                resumoOcorrencias.emAcompanhamento
              )}
            </p>
          </article>

          <article className="rounded-3xl border border-rose-100 bg-rose-50 p-5 min-w-0 overflow-hidden">
            <div className="flex items-start gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-rose-700">
              <ShieldAlert className="h-4 w-4" />
              Urgentes abertas
            </div>

            <p className="mt-3 text-3xl font-bold text-rose-950">
              {resumoOcorrencias.carregando ? (
                <LoaderCircle className="h-7 w-7 animate-spin text-orange-500" />
              ) : (
                resumoOcorrencias.urgentesEmAberto
              )}
            </p>
          </article>

          <article className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 min-w-0 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
              Resolvidas
            </p>

            <p className="mt-3 text-3xl font-bold text-emerald-950">
              {resumoOcorrencias.carregando ? (
                <LoaderCircle className="h-7 w-7 animate-spin text-orange-500" />
              ) : (
                resumoOcorrencias.resolvidas
              )}
            </p>
          </article>
        </div>
      </section>

      <section className="admin-dashboard-modulos-disponiveis mt-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Módulos disponíveis
          </p>

          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Acesse diretamente cada área administrativa
          </h3>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modulos.map((modulo) => {
            const Icon = modulo.icon;

            return (
              <Link
                key={modulo.to}
                to={modulo.to}
                className="group rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md min-w-0 overflow-hidden"
              >
                <div className="inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-500 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>

                <span className="mt-4 inline-flex w-fit items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.68rem] font-semibold text-slate-700">
                  {modulo.etiqueta}
                </span>

                <h4 className="mt-4 text-xl font-bold text-slate-950">
                  {modulo.titulo}
                </h4>

                <p className="mt-3 text-sm leading-7 text-slate-600 min-w-0 max-w-full break-words whitespace-normal overflow-hidden">
                  {modulo.descricao}
                </p>

                <span className="mt-5 inline-flex text-sm font-bold text-orange-600 transition group-hover:text-orange-700 min-w-0 max-w-full whitespace-normal break-words">
                  Abrir módulo →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 min-w-0 overflow-hidden admin-dashboard-base-operacional mt-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Base operacional
          </p>

          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            O que já está estruturado no painel
          </h3>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {recursosAtivos.map((recurso) => {
            const Icon = recurso.icon;

            return (
              <article
                key={recurso.titulo}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 min-w-0 overflow-hidden"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>

                <h4 className="mt-4 text-lg font-bold text-slate-950">
                  {recurso.titulo}
                </h4>

                <p className="mt-2 text-sm leading-7 text-slate-600 min-w-0 max-w-full break-words whitespace-normal overflow-hidden">
                  {recurso.descricao}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </AdminShell>
  );
}
