import { AutoRefreshToggle } from './AutoRefreshToggle';
import { SkipToContent } from './SkipToContent';
import { NetworkStatusBanner } from './NetworkStatusBanner';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { FloatingActionsStack } from './FloatingActionsStack';
import { PrintDocumentFooter } from './PrintDocumentFooter';
import { ScrollToTopButton } from './ScrollToTopButton';
import {
  Bell,
  BellRing,
  Building2,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  CircleCheckBig,
  ClipboardList,
  FileText,
  ContactRound,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Megaphone,
  Menu,
  PackageCheck,
  ScrollText,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { clearToken } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { usePortal } from '../context/PortalContext';
import { usePortalConfiguracoes } from '../hooks/usePortalConfiguracoes';
import type { PerfilMoradorPortal } from '../lib/portal';

const USAR_API_NOTIFICACOES_PORTAL = false;



import type {
  AuthMeResponse,
  DashboardMoradorResponse,
  NotificacaoPortalApiItem,
  NotificacoesPortalResponse,
  NotificacoesPreferenciasPortalResponse,
  PreferenciasNotificacoesPortal,
} from '../types/api';

type AppShellProps = {
  children: ReactNode;
  nomeCondominio?: string;
  nomeMorador?: string;
  perfis?: PerfilMoradorPortal[];
};

type ResumoNotificacoes = {
  comunicadosPublicados: number;
  cobrancasPendentes: number;
  encomendasPendentes: number;
  reservasAtivas: number;
  assembleiasAtivas: number;
  votacoesAbertas: number;
  ocorrenciasAbertas: number;
};

type NotificacaoPortalItem = NotificacaoPortalApiItem & {
  icon: typeof Bell;
};

type FiltroNotificacaoPortal =
  | 'TODAS'
  | 'NAO_LIDAS'
  | 'COBRANCAS'
  | 'COMUNICADOS'
  | 'RESERVAS'
  | 'OCORRENCIAS'
  | 'ENCOMENDAS'
  | 'VOTACOES_ASSEMBLEIAS';

const preferenciasPadraoNotificacoesPortal: PreferenciasNotificacoesPortal = {
  COBRANCAS: true,
  COMUNICADOS: true,
  RESERVAS: true,
  OCORRENCIAS: true,
  ENCOMENDAS: true,
  VOTACOES: true,
  ASSEMBLEIAS: true,
};

function notificacaoSempreVisivel(item: Pick<NotificacaoPortalApiItem, 'tipo' | 'label' | 'valor'>) {
  return (
    item.tipo === 'COBRANCAS' &&
    item.valor > 0 &&
    item.label.toLocaleLowerCase('pt-BR').includes('vencida')
  );
}


const papeisAdministrativosPortal = new Set([
  'ADMINISTRADOR',
  'SINDICO',
  'SUBSINDICO',
  'CONSELHEIRO',
  'FINANCEIRO',
  'PORTEIRO',
]);

const navegacao = [
  { to: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { to: '/cobrancas', label: 'Cobranças', icon: WalletCards },
  { to: '/comunicados', label: 'Comunicados', icon: Megaphone },
  { to: '/reservas', label: 'Reservas', icon: CalendarDays },
  { to: '/ocorrencias', label: 'Ocorrências', icon: ClipboardList },
  { to: '/visitantes', label: 'Visitantes', icon: UsersRound },
  { to: '/encomendas', label: 'Encomendas', icon: PackageCheck },
  { to: '/votacoes?situacao=PENDENTES', label: 'Votações', icon: CircleCheckBig },
  { to: '/assembleias', label: 'Assembleias', icon: ScrollText },
  { to: '/documentos', label: 'Docs', icon: FileText },
  { to: '/perfil', label: 'Perfil', icon: ContactRound },
];

function normalizarTextoBusca(valor: string | null | undefined) {
  return String(valor ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function numeroSeguro(valor: number | null | undefined) {
  return Number.isFinite(Number(valor)) ? Number(valor) : 0;
}


function chaveNotificacoesLidasPortal(condominioId?: number | null) {
  return `condominaria:notificacoes-lidas:${condominioId ?? 'sem-condominio'}`;
}

function carregarNotificacoesLidasPortal(condominioId?: number | null) {
  if (typeof window === 'undefined') {
    return new Set<string>();
  }

  try {
    const bruto = window.localStorage.getItem(
      chaveNotificacoesLidasPortal(condominioId),
    );

    const lista = bruto ? JSON.parse(bruto) : [];

    if (!Array.isArray(lista)) {
      return new Set<string>();
    }

    return new Set(lista.map((item) => String(item)));
  } catch {
    return new Set<string>();
  }
}

function salvarNotificacoesLidasPortal(
  condominioId: number | null | undefined,
  ids: Iterable<string>,
) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const lista = Array.from(new Set(Array.from(ids).map((id) => String(id))))
      .filter(Boolean)
      .slice(-500);

    window.localStorage.setItem(
      chaveNotificacoesLidasPortal(condominioId),
      JSON.stringify(lista),
    );
  } catch {
    // localStorage pode estar indisponível em modo privado ou ambiente restrito.
  }
}

function aplicarLeituraLocalNotificacoesPortal<
  T extends { id: string; lida?: boolean },
>(itens: T[], condominioId?: number | null) {
  const lidas = carregarNotificacoesLidasPortal(condominioId);

  return itens.map((item) => ({
    ...item,
    lida: Boolean(item.lida || lidas.has(String(item.id))),
  })) as T[];
}


function registrarNotificacoesLidasLocalPortal(
  condominioId: number | null | undefined,
  ids: string[],
) {
  const lidas = carregarNotificacoesLidasPortal(condominioId);

  for (const id of ids) {
    lidas.add(String(id));
  }

  salvarNotificacoesLidasPortal(condominioId, lidas);
}

function iconeNotificacaoPortal(tipo: string) {
  switch (tipo) {
    case 'COBRANCAS':
      return WalletCards;
    case 'COMUNICADOS':
      return Megaphone;
    case 'RESERVAS':
      return CalendarDays;
    case 'OCORRENCIAS':
      return ClipboardList;
    case 'ENCOMENDAS':
      return PackageCheck;
    case 'VOTACOES':
      return CircleCheckBig;
    case 'ASSEMBLEIAS':
      return ScrollText;
    default:
      return Bell;
  }
}

function rotuloTipoNotificacaoPortal(tipo: string) {
  switch (tipo) {
    case 'COBRANCAS':
      return 'Financeiro';
    case 'COMUNICADOS':
      return 'Comunicação';
    case 'RESERVAS':
    case 'OCORRENCIAS':
    case 'ENCOMENDAS':
      return 'Operação';
    case 'VOTACOES':
    case 'ASSEMBLEIAS':
      return 'Governança';
    default:
      return 'Portal';
  }
}

function severidadeNotificacaoPortal(item: Pick<NotificacaoPortalApiItem, 'tipo' | 'label' | 'valor' | 'prioridade' | 'lida'>) {
  const label = normalizarTextoBusca(item.label);
  const ativa = item.valor > 0;

  if (!ativa || item.lida) {
    return 'neutra';
  }

  if (
    item.prioridade === 'ALTA' ||
    item.tipo === 'OCORRENCIAS' ||
    (item.tipo === 'COBRANCAS' && label.includes('vencid'))
  ) {
    return 'critica';
  }

  if (
    item.tipo === 'COBRANCAS' ||
    item.tipo === 'COMUNICADOS' ||
    item.tipo === 'RESERVAS'
  ) {
    return 'pendente';
  }

  if (item.tipo === 'ENCOMENDAS') {
    return 'informativa';
  }

  if (item.tipo === 'VOTACOES' || item.tipo === 'ASSEMBLEIAS') {
    return 'governanca';
  }

  return 'informativa';
}


export function AppShell({
  children,
  nomeCondominio,
  nomeMorador,
  perfis = [],
}: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    contexto,
    condominioAtivoId,
    trocarCondominio,
    moradorAtivo,
  } = usePortal();
  const { configuracoes: configuracoesPortal } = usePortalConfiguracoes();

  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [carregandoResumo, setCarregandoResumo] = useState(false);
  const [resumo, setResumo] = useState<ResumoNotificacoes | null>(null);
  const [notificacoesPersistentes, setNotificacoesPersistentes] =
    useState<NotificacaoPortalApiItem[]>([]);

  useEffect(() => {
    const idsNotificacoesLidasPersistenciaLocal = notificacoesPersistentes
      .filter((item) => item.lida)
      .map((item) => String(item.id));

    if (idsNotificacoesLidasPersistenciaLocal.length === 0) {
      return;
    }

    registrarNotificacoesLidasLocalPortal(
      moradorAtivo?.condominioId,
      idsNotificacoesLidasPersistenciaLocal,
    );
  }, [moradorAtivo?.condominioId, notificacoesPersistentes]);
  const [idsNotificacoesLidasLocais, setIdsNotificacoesLidasLocais] =
    useState<string[]>([]);
  const [preferenciasNotificacoesPortal, setPreferenciasNotificacoesPortal] =
    useState<PreferenciasNotificacoesPortal>(
      preferenciasPadraoNotificacoesPortal,
    );
  const [filtroNotificacoesPortal, setFiltroNotificacoesPortal] =
    useState<FiltroNotificacaoPortal>('TODAS');
  const [buscaNotificacoesPortal, setBuscaNotificacoesPortal] =
    useState('');
  const [temAcessoAdministrativo, setTemAcessoAdministrativo] =
    useState(false);

  useEffect(() => {
    setMenuMobileAberto(false);
    setNotificacoesAbertas(false);
  }, [location.pathname]);

  useEffect(() => {
    let componenteAtivo = true;

    async function verificarAcessoAdministrativo() {
      try {
        const usuario = await apiRequest<AuthMeResponse>('/auth/me');

        const possuiAcesso =
          usuario.superAdmin ||
          usuario.condominios.some(
            (vinculo) =>
              vinculo.condominio.ativo &&
              papeisAdministrativosPortal.has(vinculo.papel),
          );

        if (componenteAtivo) {
          setTemAcessoAdministrativo(possuiAcesso);
        }
      } catch {
        if (componenteAtivo) {
          setTemAcessoAdministrativo(false);
        }
      }
    }

    void verificarAcessoAdministrativo();
return () => {
      componenteAtivo = false;
    };
  }, []);

  useEffect(() => {
    let componenteAtivo = true;

    async function carregarResumo() {
      if (!moradorAtivo) {
        setResumo(null);
        setNotificacoesPersistentes([]);
        setPreferenciasNotificacoesPortal(
          preferenciasPadraoNotificacoesPortal,
        );
        return;
      }

      setCarregandoResumo(true);

      try {
        const dashboard = await apiRequest<DashboardMoradorResponse>(
          `/portal-morador/condominios/${moradorAtivo.condominioId}/dashboard`,
        );

        if (componenteAtivo) {
          setResumo(dashboard.indicadores);
        }
      } catch {
        if (componenteAtivo) {
          setResumo(null);
        }
      }

      try {
        const notificacoesResposta = ({ itens: [], totalNaoLidas: 0 } as NotificacoesPortalResponse);

        if (componenteAtivo) {
          setNotificacoesPersistentes(
            aplicarLeituraLocalNotificacoesPortal(
              notificacoesResposta.itens,
              moradorAtivo?.condominioId,
            ),
          );
        }
      } catch {
        if (componenteAtivo) {
          setNotificacoesPersistentes([]);
        }
      }

      try {
        const preferenciasResposta: NotificacoesPreferenciasPortalResponse =
          USAR_API_NOTIFICACOES_PORTAL
            ? ({ preferencias: preferenciasPadraoNotificacoesPortal } as NotificacoesPreferenciasPortalResponse)
            : { preferencias: preferenciasPadraoNotificacoesPortal };

        if (componenteAtivo) {
          setPreferenciasNotificacoesPortal({
            ...preferenciasPadraoNotificacoesPortal,
            ...preferenciasResposta.preferencias,
          });
        }
      } catch {
        if (componenteAtivo) {
          setPreferenciasNotificacoesPortal(
            preferenciasPadraoNotificacoesPortal,
          );
        }
      } finally {
        if (componenteAtivo) {
          setCarregandoResumo(false);
        }
      }
    }

    void carregarResumo();

    return () => {
      componenteAtivo = false;
    };
  }, [moradorAtivo]);

  useEffect(() => {
    if (!moradorAtivo) {
      setIdsNotificacoesLidasLocais([]);
      return;
    }

    try {
      const valorSalvo = window.localStorage.getItem(
        `condominaria:notificacoes-lidas:${moradorAtivo.condominioId}`,
      );

      if (!valorSalvo) {
        setIdsNotificacoesLidasLocais([]);
        return;
      }

      const ids = JSON.parse(valorSalvo);

      setIdsNotificacoesLidasLocais(
        Array.isArray(ids)
          ? ids
              .map((id) => String(id))
              .filter((id) => id.trim().length > 0)
          : [],
      );
    } catch {
      setIdsNotificacoesLidasLocais([]);
    }
  }, [moradorAtivo]);

  const nomeCondominioPortal =
    configuracoesPortal?.nomeExibicaoPortal?.trim() ||
    nomeCondominio?.trim() ||
    moradorAtivo?.condominio.nome ||
    'Portal do Morador';

  const logoPortalUrl = configuracoesPortal?.logoUrl?.trim() || '';

  const condominioSelecionado =
    condominioAtivoId ??
    perfis[0]?.condominioId ??
    '';


  function sair() {
    clearToken();
    navigate('/login', { replace: true });
  }

  function selecionarCondominio(valor: string) {
    const condominioId = Number(valor);

    if (!Number.isInteger(condominioId) || condominioId <= 0) {
      return;
    }

    trocarCondominio(condominioId);
  }

  function salvarIdsNotificacoesLidasLocais(ids: string[]) {
    const idsUnicos = Array.from(
      new Set(ids.map((id) => String(id)).filter((id) => id.trim().length > 0)),
    );

    setIdsNotificacoesLidasLocais(idsUnicos);

    if (!moradorAtivo) {
      return;
    }

    try {
      window.localStorage.setItem(
        `condominaria:notificacoes-lidas:${moradorAtivo.condominioId}`,
        JSON.stringify(idsUnicos),
      );
    } catch {
      // A leitura local é apenas fallback; falha de storage não deve quebrar a UI.
    }
  }

  function adicionarIdsNotificacoesLidasLocais(ids: string[]) {
    salvarIdsNotificacoesLidasLocais([
      ...idsNotificacoesLidasLocais,
      ...ids,
    ]);
  }

  

  async function marcarNotificacaoComoLida(id: string) {
    if (!moradorAtivo) {
      adicionarIdsNotificacoesLidasLocais([id]);
      return;
    }

    adicionarIdsNotificacoesLidasLocais([id]);

    setNotificacoesPersistentes((atuais) =>
      atuais.map((item) =>
        item.id === id
          ? {
              ...item,
              lida: true,
            }
          : item,
      ),
    );

    try {
      
    } catch {
      // Mantém a leitura local/otimista. O usuário não deve perder a marcação
      // quando a persistência falhar temporariamente.
    }
  }

  async function marcarTodasNotificacoesComoLidas(ids: string[]) {
    if (ids.length === 0) {
      return;
    }

    const idsSet = new Set(ids);

    adicionarIdsNotificacoesLidasLocais(ids);

    setNotificacoesPersistentes((atuais) =>
      atuais.map((item) =>
        idsSet.has(item.id)
          ? {
              ...item,
              lida: true,
            }
          : item,
      ),
    );

    if (!moradorAtivo) {
      return;
    }

    try {
      
    } catch {
      // Mantém a leitura local/otimista. O fallback local garante a experiência.
    }
  }

  const exibirBotaoAdminPortal =
    Boolean(contexto?.usuario.superAdmin) || temAcessoAdministrativo;

  const idsNotificacoesLidasLocaisSet = useMemo(
    () => new Set(idsNotificacoesLidasLocais),
    [idsNotificacoesLidasLocais],
  );

  const itensNotificacao = useMemo<NotificacaoPortalItem[]>(() => {
    if (notificacoesPersistentes.length > 0) {
      return notificacoesPersistentes.map((item) => ({
        ...item,
        lida: item.lida || idsNotificacoesLidasLocaisSet.has(item.id),
        icon: iconeNotificacaoPortal(item.tipo),
      }));
    }

    if (!resumo) {
      return [];
    }

    const comunicados = numeroSeguro(resumo.comunicadosPublicados);
    const cobrancas = numeroSeguro(resumo.cobrancasPendentes);
    const encomendas = numeroSeguro(resumo.encomendasPendentes);
    const reservas = numeroSeguro(resumo.reservasAtivas);
    const ocorrencias = numeroSeguro(resumo.ocorrenciasAbertas);
    const votacoes = numeroSeguro(resumo.votacoesAbertas);
    const assembleias = numeroSeguro(resumo.assembleiasAtivas);

    return [
      {
        id: `fallback-cobrancas:${cobrancas}`,
        tipo: 'COBRANCAS',
        to: '/cobrancas',
        descricao: 'Acompanhe cobranças pendentes, vencidas e comprovantes enviados para análise.',
        label: 'Cobranças e comprovantes',
        valor: cobrancas,
        icon: WalletCards,
        prioridade: cobrancas > 0 ? 'ALTA' : 'NORMAL',
        lida: idsNotificacoesLidasLocaisSet.has(`fallback-cobrancas:${cobrancas}`),
        criadoEm: null,
        atualizadoEm: null,
      },
      {
        id: `fallback-comunicados:${comunicados}`,
        tipo: 'COMUNICADOS',
        label: 'Comunicados publicados',
        descricao: 'Avisos e comunicados recentes do condomínio.',
        valor: comunicados,
        to: '/comunicados',
        icon: Megaphone,
        prioridade: comunicados > 0 ? 'MEDIA' : 'NORMAL',
        lida: idsNotificacoesLidasLocaisSet.has(`fallback-comunicados:${comunicados}`),
        criadoEm: null,
        atualizadoEm: null,
      },
      {
        id: `fallback-reservas:${reservas}`,
        tipo: 'RESERVAS',
        label: 'Reservas em acompanhamento',
        descricao: 'Acompanhe solicitações pendentes de aprovação, reservas aprovadas e eventuais recusas.',
        to: '/reservas',
        valor: reservas,
        icon: CalendarDays,
        prioridade: reservas > 0 ? 'MEDIA' : 'NORMAL',
        lida: idsNotificacoesLidasLocaisSet.has(`fallback-reservas:${reservas}`),
        criadoEm: null,
        atualizadoEm: null,
      },
      {
        id: `fallback-ocorrencias:${ocorrencias}`,
        tipo: 'OCORRENCIAS',
        label: 'Ocorrências em acompanhamento',
        descricao: 'Acompanhe solicitações abertas, em análise ou em andamento.',
        to: '/ocorrencias',
        valor: ocorrencias,
        icon: ClipboardList,
        prioridade: ocorrencias > 0 ? 'ALTA' : 'NORMAL',
        lida: idsNotificacoesLidasLocaisSet.has(`fallback-ocorrencias:${ocorrencias}`),
        criadoEm: null,
        atualizadoEm: null,
      },
      {
        id: `fallback-encomendas:${encomendas}`,
        tipo: 'ENCOMENDAS',
        label: 'Encomendas aguardando',
        descricao: 'Pacotes aguardando retirada na portaria.',
        valor: encomendas,
        to: '/encomendas',
        icon: PackageCheck,
        prioridade: encomendas > 0 ? 'MEDIA' : 'NORMAL',
        lida: idsNotificacoesLidasLocaisSet.has(`fallback-encomendas:${encomendas}`),
        criadoEm: null,
        atualizadoEm: null,
      },
      {
        id: `fallback-votacoes:${votacoes}`,
        tipo: 'VOTACOES',
        label: 'Votações abertas / pendentes',
        descricao: 'Acompanhe votações disponíveis, votos registrados e comprovantes.',
        valor: votacoes,
        to: '/votacoes',
        icon: CircleCheckBig,
        prioridade: votacoes > 0 ? 'MEDIA' : 'NORMAL',
        lida: idsNotificacoesLidasLocaisSet.has(`fallback-votacoes:${votacoes}`),
        criadoEm: null,
        atualizadoEm: null,
      },
      {
        id: `fallback-assembleias:${assembleias}`,
        tipo: 'ASSEMBLEIAS',
        label: 'Assembleias em acompanhamento',
        descricao: 'Convocações, pautas e assembleias em andamento.',
        valor: assembleias,
        to: '/assembleias',
        icon: ScrollText,
        prioridade: assembleias > 0 ? 'MEDIA' : 'NORMAL',
        lida: idsNotificacoesLidasLocaisSet.has(`fallback-assembleias:${assembleias}`),
        criadoEm: null,
        atualizadoEm: null,
      },
    ];
  }, [idsNotificacoesLidasLocaisSet, notificacoesPersistentes, resumo]);

  const itensNotificacaoPreferidos = useMemo(
    () =>
      itensNotificacao.filter(
        (item) =>
          preferenciasNotificacoesPortal[item.tipo] !== false ||
          notificacaoSempreVisivel(item),
      ),
    [itensNotificacao, preferenciasNotificacoesPortal],
  );

  const notificacoesAtivas = useMemo(
    () => itensNotificacaoPreferidos.filter((item) => item.valor > 0),
    [itensNotificacaoPreferidos],
  );

  const notificacoesNaoLidas = useMemo(
    () =>
      notificacoesAtivas.filter(
        (item) => !item.lida,
      ),
    [notificacoesAtivas],
  );

  const totalNotificacoesNaoLidas = useMemo(
    () => notificacoesNaoLidas.reduce((total, item) => total + item.valor, 0),
    [notificacoesNaoLidas],
  );

  const totalNotificacoesPorTipo = useMemo(() => {
    const totalPorTipo = {
      todas: notificacoesAtivas.reduce((total, item) => total + item.valor, 0),
      naoLidas: notificacoesNaoLidas.reduce(
        (total, item) => total + item.valor,
        0,
      ),
      cobrancas: 0,
      comunicados: 0,
      reservas: 0,
      ocorrencias: 0,
      encomendas: 0,
      votacoesAssembleias: 0,
    };

    notificacoesNaoLidas.forEach((item) => {
      switch (item.tipo) {
        case 'COBRANCAS':
          totalPorTipo.cobrancas += item.valor;
          break;
        case 'COMUNICADOS':
          totalPorTipo.comunicados += item.valor;
          break;
        case 'RESERVAS':
          totalPorTipo.reservas += item.valor;
          break;
        case 'OCORRENCIAS':
          totalPorTipo.ocorrencias += item.valor;
          break;
        case 'ENCOMENDAS':
          totalPorTipo.encomendas += item.valor;
          break;
        case 'VOTACOES':
        case 'ASSEMBLEIAS':
          totalPorTipo.votacoesAssembleias += item.valor;
          break;
        default:
          break;
      }
    });

    return totalPorTipo;
  }, [notificacoesAtivas, notificacoesNaoLidas]);

  const filtrosNotificacoesPortal = useMemo(
    () => [
      {
        chave: 'TODAS' as const,
        label: 'Todas',
        total: totalNotificacoesPorTipo.todas,
      },
      {
        chave: 'NAO_LIDAS' as const,
        label: 'Pendentes',
        total: totalNotificacoesPorTipo.naoLidas,
      },
      {
        chave: 'COBRANCAS' as const,
        label: 'Financeiro',
        total: totalNotificacoesPorTipo.cobrancas,
      },
      {
        chave: 'COMUNICADOS' as const,
        label: 'Comunicação',
        total: totalNotificacoesPorTipo.comunicados,
      },
      {
        chave: 'RESERVAS' as const,
        label: 'Operação',
        total:
          totalNotificacoesPorTipo.reservas +
          totalNotificacoesPorTipo.ocorrencias +
          totalNotificacoesPorTipo.encomendas,
      },
      {
        chave: 'VOTACOES_ASSEMBLEIAS' as const,
        label: 'Governança',
        total: totalNotificacoesPorTipo.votacoesAssembleias,
      },
    ],
    [totalNotificacoesPorTipo],
  );

  const itensNotificacaoFiltrados = useMemo(() => {
    const busca = normalizarTextoBusca(buscaNotificacoesPortal);

    return itensNotificacaoPreferidos
      .filter((item) => {
        const correspondeFiltro = (() => {
        switch (filtroNotificacoesPortal) {
          case 'NAO_LIDAS':
            return item.valor > 0 && !item.lida;
          case 'COBRANCAS':
            return item.tipo === 'COBRANCAS';
          case 'COMUNICADOS':
            return item.tipo === 'COMUNICADOS';
          case 'RESERVAS':
            return (
              item.tipo === 'RESERVAS' ||
              item.tipo === 'OCORRENCIAS' ||
              item.tipo === 'ENCOMENDAS'
            );
          case 'OCORRENCIAS':
            return item.tipo === 'OCORRENCIAS';
          case 'ENCOMENDAS':
            return item.tipo === 'ENCOMENDAS';
          case 'VOTACOES_ASSEMBLEIAS':
            return item.tipo === 'VOTACOES' || item.tipo === 'ASSEMBLEIAS';
          case 'TODAS':
          default:
            return true;
        }
      })();

        if (!correspondeFiltro) {
          return false;
        }

        if (!busca) {
          return true;
        }

        const textoBusca = normalizarTextoBusca(
          [item.tipo, item.label, item.descricao].join(' '),
        );

        return textoBusca.includes(busca);
      })
      .sort((a, b) => {
        const aNaoLida = a.valor > 0 && !a.lida;
        const bNaoLida = b.valor > 0 && !b.lida;

        if (aNaoLida !== bNaoLida) {
          return aNaoLida ? -1 : 1;
        }

        return b.valor - a.valor;
      });
  }, [buscaNotificacoesPortal, filtroNotificacoesPortal, itensNotificacaoPreferidos]);

  const idsNotificacoesFiltradasNaoLidas = useMemo(
    () =>
      itensNotificacaoFiltrados
        .filter((item) => item.valor > 0 && !item.lida)
        .map((item) => item.id),
    [itensNotificacaoFiltrados],
  );

  const filtroNotificacoesAtivo =
    filtroNotificacoesPortal !== 'TODAS' ||
    buscaNotificacoesPortal.trim().length > 0;

  return (
    <>
      <SkipToContent />
      <NetworkStatusBanner />

      <div className="min-h-screen pb-6">
        <header className="sticky top-0 z-40 border-b border-orange-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
            <a
              href="/portal/comercial"
              className="flex min-w-0 items-center gap-3 rounded-2xl transition hover:opacity-80"
              aria-label="Ir para o Portal Comercial"
            >
              {logoPortalUrl ? (
                <img
                  src={logoPortalUrl}
                  alt={nomeCondominioPortal}
                  className="h-11 w-11 shrink-0 rounded-2xl border border-orange-100 object-contain p-1 shadow-sm"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-sm">
                  <Building2 className="h-6 w-6" />
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
                  Portal do Morador
                </p>
                <h1 className="truncate text-lg font-bold text-slate-900">
                  {nomeCondominioPortal}
                </h1>
              </div>
            </a>

            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNotificacoesAbertas((abertas) => !abertas)}
                className="relative hidden h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-orange-200 hover:text-orange-600 lg:flex"
              >
                <Bell className="h-4 w-4" />
                Notificações

                <span
                  className={[
                    'absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold shadow-lg',
                    totalNotificacoesNaoLidas > 0
                      ? 'bg-orange-500 text-white shadow-orange-200'
                      : 'bg-slate-100 text-slate-500 shadow-slate-200',
                  ].join(' ')}
                >
                  {totalNotificacoesNaoLidas > 99
                    ? '99+'
                    : totalNotificacoesNaoLidas}
                </span>
              </button>

              {notificacoesAbertas ? (
                <div className="absolute right-0 top-12 z-[90] hidden max-h-[calc(100vh-7rem)] w-[460px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/50 lg:flex lg:flex-col">
                  <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-600">
                        Central de pendências
                      </p>
                      <h3 className="mt-1 text-base font-bold text-slate-950">
                        Alertas do portal
                      </h3>
                      <p className="mt-1 text-[11px] font-medium text-slate-500">
                        {totalNotificacoesNaoLidas > 0
                          ? `${totalNotificacoesNaoLidas} pendência(s) exigem atenção`
                          : 'Tudo em dia no momento'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setNotificacoesAbertas(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-orange-200 hover:text-orange-600"
                      aria-label="Fechar notificações"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {carregandoResumo ? (
                    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-sm font-medium text-slate-600">
                      <LoaderCircle className="h-4 w-4 animate-spin text-orange-500" />
                      Carregando resumo...
                    </div>
                  ) : itensNotificacao.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                      Não foi possível carregar o resumo neste momento.
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 shrink-0 space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                          {filtrosNotificacoesPortal.map((filtro) => {
                            const ativo = filtroNotificacoesPortal === filtro.chave;

                            return (
                              <button
                                key={filtro.chave}
                                type="button"
                                onClick={() =>
                                  setFiltroNotificacoesPortal(filtro.chave)
                                }
                                className={[
                                  'inline-flex h-9 items-center gap-2 rounded-2xl px-3 text-xs font-bold transition',
                                  ativo
                                    ? 'bg-slate-900 text-white shadow-sm shadow-slate-200'
                                    : 'bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-orange-700',
                                ].join(' ')}
                              >
                                {filtro.label}
                                {filtro.total > 0 ? (
                                  <span
                                    className={[
                                      'rounded-full px-2 py-0.5 text-[11px] font-bold',
                                      ativo
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white text-slate-700 shadow-sm',
                                    ].join(' ')}
                                  >
                                    {filtro.total > 99 ? '99+' : filtro.total}
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                          <input
                            type="search"
                            value={buscaNotificacoesPortal}
                            onChange={(event) =>
                              setBuscaNotificacoesPortal(event.target.value)
                            }
                            placeholder="Buscar notificação"
                            className="h-10 min-w-0 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              setFiltroNotificacoesPortal('TODAS');
                              setBuscaNotificacoesPortal('');
                            }}
                            disabled={!filtroNotificacoesAtivo}
                            className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-orange-200 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Limpar filtro
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void marcarTodasNotificacoesComoLidas(
                                idsNotificacoesFiltradasNaoLidas,
                              )
                            }
                            disabled={idsNotificacoesFiltradasNaoLidas.length === 0}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CheckCheck className="h-4 w-4" />
                            Marcar Lidas
                          </button>
                        </div>

                        <p className="text-[11px] font-medium text-slate-500">
                          Exibindo {itensNotificacaoFiltrados.length} de{' '}
                          {itensNotificacaoPreferidos.length} notificação(ões).
                        </p>
                      </div>

                      <div className="grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
                        {itensNotificacaoFiltrados.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                            Nenhuma notificação encontrada com os filtros aplicados.
                          </div>
                        ) : null}

                        {itensNotificacaoFiltrados.map((item) => {
                          const Icon = item.icon;
                          const ativa = item.valor > 0;
                          const lida = item.lida;
                          const severidade = severidadeNotificacaoPortal(item);

                          return (
                            <article
                              key={item.id}
                              data-severidade={severidade}
                              data-lida={lida ? 'true' : 'false'}
                              className={[
                                'notificacao-portal-card',
                                'rounded-2xl border p-2.5 transition',
                                ativa && !lida
                                  ? 'border-orange-200 bg-orange-50/50 shadow-sm shadow-orange-100'
                                  : 'border-slate-100 bg-white/80 opacity-85',
                              ].join(' ')}
                            >
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="flex min-w-0 items-start gap-2.5">
                                  <div
                                    className={[
                                      'notificacao-portal-icone flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm',
                                      ativa && !lida
                                        ? 'bg-white text-orange-600'
                                        : 'bg-slate-100 text-slate-500',
                                    ].join(' ')}
                                  >
                                    <Icon className="h-4 w-4" />
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="notificacao-portal-tipo rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                        {rotuloTipoNotificacaoPortal(item.tipo)}
                                      </span>
                                      {ativa && !lida ? (
                                        <span className="notificacao-portal-badge-nova rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                                          Nova
                                        </span>
                                      ) : null}
                                      {ativa && lida ? (
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                          Lida
                                        </span>
                                      ) : null}
                                    </div>

                                    <p
                                      className={[
                                        'mt-1.5 text-sm text-slate-900',
                                        lida ? 'font-medium' : 'font-semibold',
                                      ].join(' ')}
                                    >
                                      {item.label}
                                    </p>
                                    <p
                                      className={[
                                        'mt-1 text-xs leading-5',
                                        lida ? 'text-slate-500' : 'text-slate-600',
                                      ].join(' ')}
                                    >
                                      {item.descricao}
                                    </p>
                                  </div>
                                </div>

                                <span
                                  className={[
                                    'notificacao-portal-contador flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2 text-sm font-bold',
                                    item.valor > 0 && !lida
                                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                                      : 'bg-slate-100 text-slate-500',
                                  ].join(' ')}
                                >
                                  {item.valor}
                                </span>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2 pl-0 sm:pl-11">
                                <Link
                                  to={item.to}
                                  onClick={() => setNotificacoesAbertas(false)}
                                  className="inline-flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                                >
                                  Abrir
                                </Link>

                                {ativa ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void marcarNotificacaoComoLida(item.id)
                                    }
                                    disabled={lida}
                                    className="inline-flex h-8 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Check className="h-4 w-4" />
                                    {lida ? 'Lida' : 'Marcar lida'}
                                  </button>
                                ) : null}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {exibirBotaoAdminPortal ? (
                <Link
                  to="/admin"
                  className="hidden h-11 items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-800 shadow-sm transition hover:border-orange-300 hover:bg-orange-100 md:flex"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Painel Admin
                </Link>
              ) : null}

              <button
                type="button"
                onClick={sair}
                className="hidden h-11 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 md:flex"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>

              <button
                type="button"
                onClick={() => setMenuMobileAberto((aberto) => !aberto)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-orange-200 hover:text-orange-600 md:hidden"
                aria-label={menuMobileAberto ? 'Fechar menu' : 'Abrir menu'}
              >
                {menuMobileAberto ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="hidden border-t border-slate-100 md:block">
            <nav className="mx-auto grid w-full max-w-7xl min-w-0 grid-cols-3 gap-2 overflow-hidden px-3 py-3 md:px-5 lg:grid-cols-6 xl:px-6">
              {navegacao.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        'inline-flex min-h-14 min-w-0 select-none items-center justify-center gap-2.5 rounded-2xl px-3 py-2 text-center text-[0.82rem] font-bold leading-tight shadow-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
                        isActive
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:text-orange-600',
                      ].join(' ')
                    }
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 stroke-[2.4]" />
                    <span className="min-w-0 text-center leading-tight tracking-[-0.01em]">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {menuMobileAberto ? (
            <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-3 md:hidden">
              <div className="mb-3 rounded-3xl border border-orange-100 bg-orange-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3 text-sm font-bold text-orange-900">
                  <span className="inline-flex items-center gap-2">
                    <BellRing className="h-4 w-4" />
                    Resumo do portal
                  </span>
                  <span
                    className={[
                      'rounded-full px-2.5 py-1 text-xs font-bold',
                      totalNotificacoesNaoLidas > 0
                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                        : 'bg-slate-100 text-slate-500',
                    ].join(' ')}
                  >
                    {totalNotificacoesNaoLidas}
                  </span>
                </div>

                {carregandoResumo ? (
                  <div className="flex items-center gap-2 text-sm font-semibold text-orange-800">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Carregando alertas...
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {itensNotificacaoPreferidos.map((item) => {
                      const lida = item.lida;
                      const naoLida = item.valor > 0 && !lida;

                      return (
                        <Link
                          key={item.id}
                          to={item.to}
                          className={[
                            'flex items-center justify-between rounded-2xl bg-white px-3 py-2.5 text-sm shadow-sm',
                            naoLida
                              ? 'font-bold text-slate-800'
                              : 'font-semibold text-slate-500',
                          ].join(' ')}
                        >
                          <span>{item.label}</span>
                          <span
                            className={[
                              'rounded-full px-2.5 py-1 text-xs font-bold',
                              naoLida
                                ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                                : 'bg-slate-100 text-slate-500',
                            ].join(' ')}
                          >
                            {item.valor}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <nav className="grid gap-2">
                {navegacao.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        [
                          'flex min-h-12 items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold transition',
                          isActive
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:text-orange-600',
                        ].join(' ')
                      }
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0 stroke-[2.4]" />
                      <span className="min-w-0 leading-tight">{item.label}</span>
                    </NavLink>
                  );
                })}

                {exibirBotaoAdminPortal ? (
                  <Link
                    to="/admin"
                    className="mt-2 flex min-h-12 items-center gap-2.5 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800 transition hover:border-orange-300 hover:bg-orange-100"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Administração
                  </Link>
                ) : null}

                <button
                  type="button"
                  onClick={sair}
                  className="mt-2 flex min-h-12 items-center gap-2.5 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </nav>
            </div>
          ) : null}
        </header>

        <main
          id="conteudo-principal"
          tabIndex={-1}
          className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-8 md:py-8 pb-40 md:pb-10"
        >
          <section className="grid gap-4 rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm lg:grid-cols-[1fr_360px] lg:items-center md:p-6">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-600">
                <UserRound className="h-4 w-4" />
                Área autenticada
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                Olá{nomeMorador ? `, ${nomeMorador}` : ''}.
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {nomeCondominio
                  ? `Você está acessando o portal de ${nomeCondominio}.`
                  : 'Carregando informações do condomínio.'}
              </p>
            </div>

            <div className="grid gap-3">
              {perfis.length > 1 ? (
                <label className="grid gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Condomínio ativo
                  </span>

                  <div className="relative">
                    <select
                      value={condominioSelecionado}
                      onChange={(event) => selecionarCondominio(event.target.value)}
                      className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      {perfis.map((perfil) => (
                        <option
                          key={perfil.condominioId}
                          value={perfil.condominioId}
                        >
                          {perfil.condominio.nome}
                        </option>
                      ))}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </label>
              ) : null}

              <div className="flex items-center gap-3 rounded-3xl bg-orange-50 px-5 py-4 text-sm text-orange-900">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-bold">Acesso do morador ativo</p>
                  <p className="mt-1 text-orange-800">
                    Painel conectado à API do Condominaria Express.
                  </p>
                </div>
              </div>
            </div>
          </section>
        {children}

          <PrintDocumentFooter />
        </main>

        {notificacoesAbertas || menuMobileAberto ? null : (
          <FloatingActionsStack>
            <KeyboardShortcutsHelp />
            <AutoRefreshToggle />
            <ScrollToTopButton />
          </FloatingActionsStack>
        )}
      </div>
    </>
  );
}
