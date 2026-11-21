import {
  BadgeCheck,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleCheckBig,
  ClipboardList,
  FileCheck2,
  Filter,
  LoaderCircle,
  Search,
  Send,
  ShieldCheck,
  Vote,
} from 'lucide-react';
import type { ComponentType, FormEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { EmptyState, ErrorState, SuccessState } from '../components/FeedbackState';
import { FilteredEmptyState } from '../components/FilteredEmptyState';
import { FilterSummary } from '../components/FilterSummary';
import { PageHeader } from '../components/PageHeader';
import { PageSkeleton } from '../components/PageSkeleton';
import { usePortal } from '../context/PortalContext';
import { useCloseFiltersShortcut } from '../hooks/useCloseFiltersShortcut';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSearchShortcut } from '../hooks/useSearchShortcut';
import { ApiError, apiRequest } from '../lib/api';
import { obterMoradorAtivo } from '../lib/portal';

function listaSeguraPortal<T = any>(valor: unknown): T[] {
  const votacoesAbertasExtraidas = extrairVotacoesAbertasPortal(valor);

  if (votacoesAbertasExtraidas.length > 0) {
    return votacoesAbertasExtraidas as T[];
  }

if (Array.isArray(valor)) {
    return valor as T[];
  }

  if (valor && typeof valor === 'object') {
    const obj = valor as Record<string, unknown>;

    const chavesPossiveis = [
      'itens',
      'votacoes',
      'votacoesAbertas',
      'assembleias',
      'abertas',
      'pendentes',
      'votadas',
      'encerradas',
      'exibidas',
    ];

    for (const chave of chavesPossiveis) {
      if (Array.isArray(obj[chave])) {
        return obj[chave] as T[];
      }
    }
  }

  return [];
}

function extrairVotacoesAbertasPortal(valor: unknown): any[] {
  if (Array.isArray(valor)) {
    return valor;
  }

  if (!valor || typeof valor !== 'object') {
    return [];
  }

  const obj = valor as Record<string, unknown>;

  for (const chave of ['itens', 'votacoes', 'votacoesAbertas', 'abertas']) {
    if (Array.isArray(obj[chave])) {
      return obj[chave] as any[];
    }
  }

  return [];
}



import type {
  AssembleiaPortal,
  ComprovanteParticipacaoVotacaoEncerradaPortal,
  OpcaoVotacaoPortal,
  PortalMoradorMeResponse,
  RegistrarVotoPortalPayload,
  ResultadoVotacaoPortal,
  UnidadeDisponivelPortal,
  VotacaoAbertaPortal,
  VotoCriadoPortal,
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

function normalizarListaPaginada<T>(resposta: T[] | ApiListResponse<T> | Record<string, unknown>) {
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

  const objeto = (resposta ?? {}) as ApiListResponse<T> & {
    itens?: T[];
    votacoes?: T[];
    votacoesAbertas?: T[];
    abertas?: T[];
  };

  const items =
    objeto.items ??
    objeto.itens ??
    objeto.votacoes ??
    objeto.votacoesAbertas ??
    objeto.abertas ??
    [];

  const itemsNormalizados = items.map((item: any) =>
    item && typeof item === 'object'
      ? normalizarVotacaoAbertaPortal(item)
      : item,
  );

  const total = Number(objeto.total ?? itemsNormalizados.length);
  const page = Number(objeto.page ?? 1);
  const limit = Number(objeto.limit ?? LIMITE_POR_PAGINA);
  const totalPages = Number(
    objeto.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit))),
  );

  return {
    items: itemsNormalizados,
    paginacao: {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: Number.isFinite(limit) && limit > 0 ? limit : LIMITE_POR_PAGINA,
      total: Number.isFinite(total) ? total : itemsNormalizados.length,
      totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
    },
  };
}


function normalizarVotacaoAbertaPortal<T extends Record<string, any>>(votacao: T): T {
  return {
    ...votacao,
    votos: listaSeguraPortal(votacao?.votos),
    opcoes: listaSeguraPortal(votacao?.opcoes),
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
  votacoes: VotacaoAbertaPortal[];
  assembleias: AssembleiaPortal[];
};

type FormularioVoto = {
  unidadeId: string;
  opcaoId: string;
  observacoes: string;
};

type FormulariosPorVotacao = Record<number, FormularioVoto>;

type VotoPendenteConfirmacaoPortal = {
  votacao: VotacaoAbertaPortal;
  unidadeId: number;
  opcaoId: number;
  unidadeTexto: string;
  opcaoTexto: string;
  observacoes: string;
};

type EstadoResultadoVotacao = {
  carregando: boolean;
  erro: string;
  resultado: ResultadoVotacaoPortal | null;
};

type EstadoComprovanteVotacaoEncerrada = {
  carregando: boolean;
  erro: string;
  dados: ComprovanteParticipacaoVotacaoEncerradaPortal | null;
};

type VotacaoEncerradaPortal = {
  votacaoId: number;
  titulo: string;
  encerradaEm: string | null;
  assembleiaId: number;
  assembleiaTitulo: string;
  pautaTitulo: string;
  pautaDescricao: string | null;
};

type FiltrosVotacao = {
  busca: string;
  situacao: 'TODAS' | 'VOTADAS' | 'PENDENTES';
  ordem: 'RECENTES' | 'ANTIGAS';
};

type ResumoVotacaoCardProps = {
  titulo: string;
  valor: number;
  descricao: string;
  icon: ComponentType<{ className?: string }>;
  variant?: 'orange' | 'green' | 'blue' | 'slate' | 'amber';
};

type BadgeProps = {
  children: ReactNode;
  variant?: 'orange' | 'green' | 'blue' | 'slate' | 'amber' | 'red';
};



function valorIndicaPerfilPortaria(valor: unknown): boolean {
  const texto = String(valor ?? '').toUpperCase().trim();
  return texto === 'PORTEIRO' || texto === 'PORTARIA';
}

function objetoPossuiPerfilPortaria(valor: unknown, visitados = new WeakSet<object>()): boolean {
  if (!valor) return false;

  if (typeof valor === 'string') {
    return valorIndicaPerfilPortaria(valor);
  }

  if (typeof valor !== 'object') {
    return false;
  }

  if (visitados.has(valor as object)) {
    return false;
  }

  visitados.add(valor as object);

  const objeto = valor as Record<string, unknown>;

  for (const chave of ['papel', 'perfil', 'role', 'tipo', 'cargo']) {
    if (valorIndicaPerfilPortaria(objeto[chave])) {
      return true;
    }
  }

  for (const chave of Object.keys(objeto)) {
    if (objetoPossuiPerfilPortaria(objeto[chave], visitados)) {
      return true;
    }
  }

  return false;
}

function mensagemVotoPerfilPortaria(error: unknown, fallback: string) {
  const mensagem = mensagemErroAmigavel(error, fallback);
  const texto = mensagem.toLowerCase();

  if (
    texto.includes('não tem permissão') ||
    texto.includes('sem permissão') ||
    texto.includes('forbidden') ||
    texto.includes('portaria não participa') ||
    texto.includes('porteiro')
  ) {
    return 'Perfil de portaria não participa de votações.';
  }

  return mensagem;
}

const formularioInicial: FormularioVoto = {
  unidadeId: '',
  opcaoId: '',
  observacoes: '',
};

const filtrosIniciais: FiltrosVotacao = {
  busca: '',
  situacao: 'TODAS',
  ordem: 'RECENTES',
};

function formatarDataHora(data?: string | null) {
  if (!data) {
    return 'Data não informada';
  }

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) {
    return 'Data inválida';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
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

function buscarOpcao(opcoes: OpcaoVotacaoPortal[], opcaoId: number) {
  return opcoes.find((opcao: any) => opcao.id === opcaoId);
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
    normalizada.includes('unknown column') ||
    normalizada.includes('cannot read properties')
  ) {
    return 'Não foi possível carregar as informações agora. A administração já pode verificar a estrutura do sistema.';
  }

  return mensagem || fallback;
}

function badgeClasses(variant: BadgeProps['variant'] = 'slate') {
  const variants = {
    orange: 'bg-orange-50 text-orange-700 ring-orange-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
  } as const;

  return variants[variant];
}

function Badge({ children, variant = 'slate' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ring-1 ${badgeClasses(
        variant,
      )}`}
    >
      {children}
    </span>
  );
}

function VotacaoStatusBadge({ status }: { status: string | null | undefined }) {
  const normalizado = String(status ?? '').trim().toUpperCase();

  if (normalizado === 'ABERTA') {
    return (
      <Badge variant="green">
        <CircleCheckBig className="h-3.5 w-3.5" />
        Aberta para votação
      </Badge>
    );
  }

  if (normalizado === 'ENCERRADA') {
    return (
      <Badge variant="blue">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Encerrada
      </Badge>
    );
  }

  if (normalizado === 'CANCELADA') {
    return <Badge variant="red">Cancelada</Badge>;
  }

  return <Badge>{normalizado || 'Status não informado'}</Badge>;
}

function ParticipacaoBadge({ votada }: { votada: boolean }) {
  return votada ? (
    <Badge variant="green">
      <BadgeCheck className="h-3.5 w-3.5" />
      Voto registrado
    </Badge>
  ) : (
    <Badge variant="amber">
      <Vote className="h-3.5 w-3.5" />
      Aguardando voto
    </Badge>
  );
}

function ResumoVotacaoCard({
  titulo,
  valor,
  descricao,
  icon: Icon,
  variant = 'slate',
}: ResumoVotacaoCardProps) {
  const variantClasses = {
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  } as const;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            {titulo}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{valor}</p>
        </div>

        <span
          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${variantClasses[variant]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
        {descricao}
      </p>
    </article>
  );
}

function InfoVotacaoItem({ label, valor }: { label: string; valor: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <div className="mt-1 text-sm font-bold leading-6 text-slate-700">
        {valor}
      </div>
    </div>
  );
}

export function VotacoesPage() {
  const buscaInputRef = useRef<HTMLInputElement | null>(null);
  usePageTitle('Votações');

  const [recarregarToken, setRecarregarToken] = useState(0);
  const [paginacao, setPaginacao] = useState<PaginacaoState>(paginacaoInicial());
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [estado, setEstado] = useState<EstadoPagina>({
    carregando: true,
    erro: '',
    contexto: null,
    unidades: [],
    votacoes: [],
    assembleias: [],
  });
  const [formularios, setFormularios] = useState<FormulariosPorVotacao>({});
  const [filtros, setFiltros] = useState<FiltrosVotacao>(filtrosIniciais);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [votacaoSalvandoId, setVotacaoSalvandoId] = useState<number | null>(null);
  const [votoPendenteConfirmacao, setVotoPendenteConfirmacao] =
    useState<VotoPendenteConfirmacaoPortal | null>(null);
  const [erroConfirmacaoVoto, setErroConfirmacaoVoto] = useState('');
  const [perfilPortariaBloqueadoNaSessao, setPerfilPortariaBloqueadoNaSessao] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [resultadosEncerrados, setResultadosEncerrados] =
    useState<Record<number, EstadoResultadoVotacao>>({});
  const [comprovantesEncerrados, setComprovantesEncerrados] =
    useState<Record<number, EstadoComprovanteVotacaoEncerrada>>({});

  const {
    contexto,
    moradorAtivo: moradorContexto,
    carregando: carregandoPortal,
    erro: erroPortal,
  } = usePortal();

  const perfilPortariaSemDireitoVoto =
    perfilPortariaBloqueadoNaSessao ||
    objetoPossuiPerfilPortaria(contexto) ||
    objetoPossuiPerfilPortaria(moradorContexto);

  useSearchShortcut({ inputRef: buscaInputRef });
  useCloseFiltersShortcut({
    aberto: filtrosAbertos,
    onClose: () => setFiltrosAbertos(false),
  });

  useEffect(() => {
    const buscaParam = searchParams.get('busca') ?? '';
    const situacaoParam = searchParams.get('situacao');
    const ordemParam = searchParams.get('ordem');

    const situacao: FiltrosVotacao['situacao'] =
      situacaoParam === 'VOTADAS' || situacaoParam === 'PENDENTES'
        ? situacaoParam
        : 'TODAS';

    const ordem: FiltrosVotacao['ordem'] =
      ordemParam === 'ANTIGAS' ? ordemParam : 'RECENTES';

    setFiltros((atual) => ({
      ...atual,
      busca: buscaParam,
      situacao,
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

    return () => {
      window.clearTimeout(timer);
    };
  }, [mensagemSucesso]);

  const morador = estado.contexto ? obterMoradorAtivo(estado.contexto) : null;

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
        const [unidades, votacoes, assembleias] = await Promise.all([
          apiRequest<UnidadeDisponivelPortal[]>(
            `/portal-morador/condominios/${moradorContexto.condominioId}/unidades`,
          ),
          apiRequest<VotacaoAbertaPortal[] | ApiListResponse<VotacaoAbertaPortal>>(
            `/portal-morador/condominios/${moradorContexto.condominioId}/votacoes/abertas${montarQueryPaginada(paginacao.page)}`,
          ),
          apiRequest<AssembleiaPortal[]>(
            `/portal-morador/condominios/${moradorContexto.condominioId}/assembleias`,
          ),
        ]);

        const { items: votacoesNormalizadas, paginacao: paginacaoResposta } = normalizarListaPaginada(votacoes);
        setPaginacao(paginacaoResposta);

        const unidadePrincipal =
          unidades.find((item: any) => item.principal) ?? unidades[0];

        const formulariosIniciais = Object.fromEntries(
          votacoesNormalizadas.map((votacao: any) => [
            votacao.id,
            {
              unidadeId: unidadePrincipal ? String(unidadePrincipal.unidade.id) : '',
              opcaoId: '',
              observacoes: '',
            },
          ]),
        ) as FormulariosPorVotacao;

        setEstado({
          carregando: false,
          erro: '',
          contexto,
          unidades,
          votacoes: votacoesNormalizadas,
          assembleias,
        });
        setUltimaAtualizacao(new Date());
        setFormularios(formulariosIniciais);
      } catch (error) {
        setEstado({
          carregando: false,
          erro: mensagemErroAmigavel(error, 'Não foi possível carregar as votações.'),
          contexto,
          unidades: [],
          votacoes: [],
          assembleias: [],
        });
      }
    }

    void carregar();
  }, [carregandoPortal, contexto, erroPortal, moradorContexto, paginacao.page, recarregarToken]);

  function atualizarUrlVotacoes(proximos: FiltrosVotacao) {
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

  function atualizarFiltrosVotacoes(parcial: Partial<FiltrosVotacao>) {
    const proximos = {
      ...filtros,
      ...parcial,
    };
    setPaginacao((atual) => ({
      ...atual,
      page: 1,
    }));

    setFiltros(proximos);
    atualizarUrlVotacoes(proximos);
  }

  function limparFiltrosVotacoes() {
    setPaginacao((atual) => ({
      ...atual,
      page: 1,
    }));
    setFiltros(filtrosIniciais);
    setSearchParams({}, { replace: true });
  }

  function atualizarFormulario(
    votacaoId: number,
    campo: keyof FormularioVoto,
    valor: string,
  ) {
    setFormularios((atual) => ({
      ...atual,
      [votacaoId]: {
        ...(atual[votacaoId] ?? formularioInicial),
        [campo]: valor,
      },
    }));
  }

  function votacaoTemVotoDoMorador(votacao: VotacaoAbertaPortal) {
    const unidadesDoMorador = listaSeguraPortal(estado.unidades).map((item: any) => item.unidade.id);
    return listaSeguraPortal(votacao.votos).some((voto) => unidadesDoMorador.includes(voto.unidadeId));
  }

  function votoDaUnidade(votacao: VotacaoAbertaPortal, unidadeId: string) {
    const id = Number(unidadeId);
    if (!id) {
      return null;
    }

    const votos = listaSeguraPortal(votacao.votos);
    const votoNaLista = votos.find((voto: any) => Number(voto.unidadeId) === id);

    if (votoNaLista) {
      return votoNaLista;
    }

    const votoMorador =
      (votacao as any).votoMorador ??
      (votacao as any).votoAtual ??
      (votacao as any).meuVoto ??
      null;

    if (votoMorador && Number(votoMorador.unidadeId) === id) {
      return votoMorador;
    }

    if ((votacao as any).jaVotou === true && listaSeguraPortal(estado.unidades).length === 1) {
      return {
        id: 0,
        unidadeId: id,
        registradoEm: (votacao as any).registradoEm ?? null,
      };
    }

    return null;
  }

  const votacoesFiltradas = useMemo(() => {
    const busca = normalizarBusca(filtros.busca);

    return [...listaSeguraPortal(estado.votacoes)]
      .filter((votacao: any) => {
        const possuiVoto = votacaoTemVotoDoMorador(votacao);

        if (filtros.situacao === 'VOTADAS' && !possuiVoto) {
          return false;
        }

        if (filtros.situacao === 'PENDENTES' && possuiVoto) {
          return false;
        }

        if (!busca) {
          return true;
        }

        const conteudo = normalizarBusca(
          [
            votacao.titulo,
            votacao.descricao ?? '',
            votacao.assembleia.titulo,
            votacao.pauta.titulo,
            votacao.pauta.descricao ?? '',
            listaSeguraPortal(votacao.opcoes).map((opcao: any) => opcao.descricao).join(' '),
          ].join(' '),
        );

        return conteudo.includes(busca);
      })
      .sort((a, b) => {
        const diferenca =
          new Date(b.abertaEm ?? b.criadoEm).getTime() -
          new Date(a.abertaEm ?? a.criadoEm).getTime();

        return filtros.ordem === 'ANTIGAS' ? -diferenca : diferenca;
      });
  }, [estado.votacoes, estado.unidades, filtros]);

  const votacoesEncerradas = useMemo<VotacaoEncerradaPortal[]>(() => {
    return listaSeguraPortal(estado.assembleias).flatMap((assembleia: any) =>
        listaSeguraPortal(assembleia.pautas)
          .filter((pauta: any) => pauta.votacao?.status === 'ENCERRADA')
          .map((pauta: any) => ({
            votacaoId: pauta.votacao!.id,
            titulo: pauta.votacao!.titulo,
            encerradaEm: pauta.votacao!.encerradaEm,
            assembleiaId: assembleia.id,
            assembleiaTitulo: assembleia.titulo,
            pautaTitulo: pauta.titulo,
            pautaDescricao: pauta.descricao,
          })),
      )
      .sort((a, b) => {
        const dataA = a.encerradaEm ? new Date(a.encerradaEm).getTime() : 0;
        const dataB = b.encerradaEm ? new Date(b.encerradaEm).getTime() : 0;
        return dataB - dataA;
      });
  }, [estado.assembleias]);

  const resumo = useMemo(() => {
    const votadas = listaSeguraPortal(estado.votacoes).filter((votacao: any) => votacaoTemVotoDoMorador(votacao)).length;
    const pendentes = Math.max(listaSeguraPortal(estado.votacoes).length - votadas, 0);

    return {
      abertas: listaSeguraPortal(estado.votacoes).length,
      filtradas: votacoesFiltradas.length,
      votadas,
      pendentes,
      encerradas: votacoesEncerradas.length,
    };
  }, [estado.votacoes, votacoesFiltradas.length, votacoesEncerradas.length]);

  async function registrarVoto(event: FormEvent<HTMLFormElement>, votacao: VotacaoAbertaPortal) {
    event.preventDefault();

    if (perfilPortariaSemDireitoVoto) {
      setPerfilPortariaBloqueadoNaSessao(true);
      setErroConfirmacaoVoto('Perfil de portaria não participa de votações.');
      setMensagemSucesso('');
      return;
    }

    if (!morador) {
      return;
    }

    const formulario = formularios[votacao.id] ?? formularioInicial;
    const unidadeId = Number(formulario.unidadeId);
    const opcaoId = Number(formulario.opcaoId);

    if (!unidadeId || !opcaoId) {
      setEstado((atual) => ({
        ...atual,
        erro: 'Selecione a unidade e a opção antes de confirmar o voto.',
      }));
      return;
    }

    const votoExistente = votoDaUnidade(votacao, String(unidadeId));

    if (votoExistente) {
      setMensagemSucesso('Participação já registrada para esta unidade.');
      setEstado((atual) => ({
        ...atual,
        erro: '',
      }));
      return;
    }

    const opcaoSelecionada = buscarOpcao(
      listaSeguraPortal(votacao.opcoes),
      opcaoId,
    );
    const unidadeSelecionada = listaSeguraPortal(estado.unidades).find(
      (item: any) => item.unidade.id === unidadeId,
    );

    setEstado((atual) => ({ ...atual, erro: '' }));
    setErroConfirmacaoVoto('');
    setVotoPendenteConfirmacao({
      votacao,
      unidadeId,
      opcaoId,
      unidadeTexto:
        unidadeSelecionada?.unidade.identificador ?? ('Unidade #' + unidadeId),
      opcaoTexto: opcaoSelecionada?.descricao ?? ('Opção #' + opcaoId),
      observacoes: formulario.observacoes.trim(),
    });
  }

  async function confirmarVotoPendentePortal(
    pendente = votoPendenteConfirmacao,
  ) {
    if (!morador || !pendente) {
      setErroConfirmacaoVoto('Não foi possível identificar o voto pendente. Revise e tente novamente.');
      return;
    }

    const {
      votacao,
      unidadeId,
      opcaoId,
      opcaoTexto,
      observacoes,
    } = pendente;

    setVotacaoSalvandoId(votacao.id);
    setMensagemSucesso('');
    setErroConfirmacaoVoto('');
    setEstado((atual) => ({ ...atual, erro: '' }));

    try {
      const payload: RegistrarVotoPortalPayload = {
        opcaoId,
        unidadeId,
      };

      const observacoesLimpas = observacoes.trim();

      if (observacoesLimpas) {
        payload.observacoes = observacoesLimpas;
      }

      const votoCriado = await apiRequest<VotoCriadoPortal>(
        '/portal-morador/condominios/' +
          morador.condominioId +
          '/votacoes/' +
          votacao.id +
          '/votos',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setEstado((atual) => ({
        ...atual,
        votacoes: listaSeguraPortal(atual.votacoes).map((item: any) => {
          if (item.id !== votacao.id) {
            return item;
          }

          return {
            ...item,
            votos: [
              ...listaSeguraPortal(item.votos),
              {
                id: votoCriado.id,
                opcaoId: votoCriado.opcaoId,
                unidadeId: votoCriado.unidadeId,
                registradoEm: votoCriado.registradoEm,
              },
            ],
          };
        }),
      }));

      setFormularios((atual) => ({
        ...atual,
        [votacao.id]: {
          ...atual[votacao.id],
          opcaoId: '',
          observacoes: '',
        },
      }));

      setMensagemSucesso('Voto registrado com sucesso: ' + opcaoTexto + '.');
      setErroConfirmacaoVoto('');
      setVotoPendenteConfirmacao(null);
    } catch (error) {
      const mensagem = mensagemVotoPerfilPortaria(error, 'Não foi possível registrar o voto.');

      if (mensagem.includes('Perfil de portaria não participa de votações.')) {
        setPerfilPortariaBloqueadoNaSessao(true);
      }

      if (mensagem.toLowerCase().includes('já registrou voto')) {
        setMensagemSucesso('Participação já registrada para esta unidade.');
        setErroConfirmacaoVoto('');
        setVotoPendenteConfirmacao(null);
        atualizarDadosPagina();
        return;
      }

      setErroConfirmacaoVoto(mensagem);
      setEstado((atual) => ({
        ...atual,
        erro: mensagem,
      }));
    } finally {
      setVotacaoSalvandoId(null);
    }
  }

  function abrirComprovanteParticipacaoVoto(
    votacao: VotacaoAbertaPortal,
    voto: VotacaoAbertaPortal['votos'][number],
  ) {
    const unidade = listaSeguraPortal(estado.unidades).find(
      (item: any) => item.unidade.id === voto.unidadeId,
    )?.unidade;

    const sanitizar = (valor: unknown) =>
      String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const nomeCondominio = morador?.condominio.nome ?? 'Condomínio não informado';
    const nomeMorador = morador?.nome ?? 'Morador não informado';
    const unidadeTexto = unidade?.identificador ?? `Unidade #${voto.unidadeId}`;
    const codigoComprovante = `PART-VOTO-${String(voto.id || voto.unidadeId || votacao.id).padStart(6, '0')}`;
    const dataRegistro = formatarDataHora(voto.registradoEm);
    const dataEmissao = formatarDataHora(new Date().toISOString());

    const janela = window.open('', '_blank', 'width=1040,height=860');

    if (!janela) {
      setEstado((atual) => ({
        ...atual,
        erro: 'O navegador bloqueou a janela do comprovante. Permita pop-ups para este site e tente novamente.',
      }));
      return;
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Comprovante de Participação - ${sanitizar(codigoComprovante)}</title>
<style>
  :root {
    color-scheme: light;
    --ink: #0f172a;
    --muted: #64748b;
    --line: #e2e8f0;
    --soft: #f8fafc;
    --orange: #f97316;
    --orange-dark: #c2410c;
    --green: #166534;
    --green-soft: #f0fdf4;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 28px;
    background: #f8fafc;
    color: var(--ink);
    font-family: Arial, Helvetica, sans-serif;
  }

  .acoes {
    max-width: 920px;
    margin: 0 auto 16px;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .acoes button {
    min-height: 42px;
    border-radius: 14px;
    border: 1px solid #cbd5e1;
    background: #fff;
    color: var(--ink);
    font-weight: 700;
    padding: 0 16px;
    cursor: pointer;
  }

  .acoes button.primary {
    background: var(--orange);
    color: #fff;
    border-color: var(--orange);
  }

  .doc {
    max-width: 920px;
    margin: 0 auto;
    background: #fff;
    border-radius: 30px;
    padding: 42px;
    box-shadow: 0 18px 50px rgba(15, 23, 42, .08);
  }

  .topo {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    border-bottom: 1px solid var(--line);
    padding-bottom: 24px;
    margin-bottom: 28px;
  }

  .marca {
    color: var(--orange-dark);
    text-transform: uppercase;
    letter-spacing: .18em;
    font-size: 12px;
    font-weight: 700;
    margin: 0 0 10px;
  }

  h1 {
    font-size: 28px;
    line-height: 1.2;
    margin: 0;
  }

  .sub {
    margin: 10px 0 0;
    color: var(--muted);
    line-height: 1.5;
  }

  .protocolo {
    min-width: 230px;
    border: 1px solid #fed7aa;
    background: #fff7ed;
    border-radius: 22px;
    padding: 16px;
    text-align: right;
  }

  .rotulo {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .14em;
    font-size: 11px;
    font-weight: 700;
    margin: 0;
  }

  .valor {
    margin-top: 8px;
    font-weight: 700;
    line-height: 1.5;
    word-break: break-word;
  }

  .alerta {
    margin: 0 0 24px;
    border: 1px solid #bbf7d0;
    background: var(--green-soft);
    border-radius: 22px;
    padding: 18px;
    color: var(--green);
    line-height: 1.55;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .card {
    border: 1px solid var(--line);
    background: var(--soft);
    border-radius: 20px;
    padding: 16px;
  }

  .full {
    grid-column: 1 / -1;
  }

  .sigilo {
    margin-top: 24px;
    border: 1px solid #fed7aa;
    background: #fff7ed;
    border-radius: 22px;
    padding: 18px;
    color: #9a3412;
    line-height: 1.55;
  }

  .rodape {
    margin-top: 28px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
    color: var(--muted);
    font-size: 12px;
    line-height: 1.6;
  }

  @media (max-width: 720px) {
    body {
      padding: 14px;
    }

    .doc {
      padding: 24px;
      border-radius: 24px;
    }

    .topo {
      flex-direction: column;
    }

    .protocolo {
      text-align: left;
    }

    .grid {
      grid-template-columns: 1fr;
    }
  }

  @media print {
    body {
      background: #fff;
      padding: 0;
    }

    .acoes {
      display: none;
    }

    .doc {
      max-width: none;
      box-shadow: none;
      border-radius: 0;
      padding: 0;
    }
  }
</style>
</head>
<body>
  <div class="acoes">
    <button class="primary" onclick="window.print()">Imprimir comprovante</button>
    <button onclick="navigator.clipboard && navigator.clipboard.writeText('${sanitizar(codigoComprovante)}').then(() => this.textContent = 'Protocolo copiado')">Copiar protocolo</button>
    <button onclick="window.close()">Fechar</button>
  </div>

  <main class="doc">
    <section class="topo">
      <div>
        <p class="marca">Condominaria Express</p>
        <h1>Comprovante de Participação em Votação</h1>
        <p class="sub">${sanitizar(nomeCondominio)}</p>
      </div>

      <aside class="protocolo">
        <p class="rotulo">Protocolo</p>
        <div class="valor">${sanitizar(codigoComprovante)}</div>
      </aside>
    </section>

    <section class="alerta">
      <strong>Participação registrada.</strong><br />
      Este comprovante confirma que a unidade indicada participou da votação. A opção escolhida permanece preservada por sigilo.
    </section>

    <section class="grid">
      <article class="card full">
        <p class="rotulo">Votação</p>
        <div class="valor">${sanitizar(votacao.titulo)}</div>
      </article>

      <article class="card">
        <p class="rotulo">Assembleia</p>
        <div class="valor">${sanitizar(votacao.assembleia.titulo)}</div>
      </article>

      <article class="card">
        <p class="rotulo">Pauta</p>
        <div class="valor">${sanitizar(votacao.pauta.titulo)}</div>
      </article>

      <article class="card">
        <p class="rotulo">Morador</p>
        <div class="valor">${sanitizar(nomeMorador)}</div>
      </article>

      <article class="card">
        <p class="rotulo">Unidade</p>
        <div class="valor">${sanitizar(unidadeTexto)}</div>
      </article>

      <article class="card">
        <p class="rotulo">Data/hora do voto</p>
        <div class="valor">${sanitizar(dataRegistro)}</div>
      </article>

      <article class="card">
        <p class="rotulo">Emissão do comprovante</p>
        <div class="valor">${sanitizar(dataEmissao)}</div>
      </article>
    </section>

    <section class="sigilo">
      <strong>Sigilo da votação:</strong> este documento comprova a participação, mas não exibe a opção escolhida.
      Para auditoria administrativa, utilize os relatórios oficiais do módulo Governança.
    </section>

    <footer class="rodape">
      Documento emitido eletronicamente pelo Portal do Morador. Protocolo: ${sanitizar(codigoComprovante)}.
    </footer>
  </main>
</body>
</html>`;

    janela.document.open();
    janela.document.write(html);
    janela.document.close();
    janela.focus();
  }

  async function abrirComprovanteParticipacaoEncerrada(
    assembleiaId: number,
    votacaoId: number,
  ) {
    if (!moradorContexto) {
      return;
    }

    setComprovantesEncerrados((atual) => ({
      ...atual,
      [votacaoId]: {
        carregando: true,
        erro: '',
        dados: atual[votacaoId]?.dados ?? null,
      },
    }));

    try {
      const dados = await apiRequest<ComprovanteParticipacaoVotacaoEncerradaPortal>(
        `/portal-morador/condominios/${moradorContexto.condominioId}/assembleias/${assembleiaId}/votacoes/${votacaoId}/comprovante`,
      );

      setComprovantesEncerrados((atual) => ({
        ...atual,
        [votacaoId]: {
          carregando: false,
          erro: '',
          dados,
        },
      }));

      if (dados.participacoes.length === 0) {
        setComprovantesEncerrados((atual) => ({
          ...atual,
          [votacaoId]: {
            carregando: false,
            erro: 'Não há participação registrada para suas unidades nesta votação encerrada.',
            dados,
          },
        }));
        return;
      }

      const janela = window.open('', '_blank', 'width=1040,height=860');

      if (!janela) {
        setComprovantesEncerrados((atual) => ({
          ...atual,
          [votacaoId]: {
            carregando: false,
            erro: 'O navegador bloqueou a janela do comprovante. Permita pop-ups para este site e tente novamente.',
            dados,
          },
        }));
        return;
      }

      const participacoesHtml = dados.participacoes
        .map((participacao) => {
          const unidadeTexto = participacao.unidade.bloco
            ? `${participacao.unidade.bloco.nome} • ${participacao.unidade.identificador}`
            : participacao.unidade.identificador;

          return `<article class="card"><p class="rotulo">Unidade</p><div class="valor">${unidadeTexto}</div><p class="rotulo">Registro</p><div class="valor">${formatarDataHora(
            participacao.registradoEm,
          )}</div><p class="rotulo">Código</p><div class="valor">PART-VOTO-${String(
            participacao.id,
          ).padStart(6, '0')}</div></article>`;
        })
        .join('');

      janela.document.open();
      janela.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" />
<title>Comprovante de Participação Encerrada</title><style>body{font-family:Arial,Helvetica,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:24px}.acoes{max-width:900px;margin:0 auto 16px;display:flex;justify-content:flex-end;gap:8px}.acoes button{height:42px;border-radius:14px;border:1px solid #cbd5e1;background:#fff;font-weight:700;padding:0 16px;cursor:pointer}.acoes button:first-child{background:#f97316;color:#fff;border-color:#f97316}.doc{max-width:900px;margin:0 auto;background:#fff;border-radius:28px;padding:42px;box-shadow:0 18px 50px rgba(15,23,42,.08)}.marca{color:#c2410c;text-transform:uppercase;letter-spacing:.18em;font-size:12px;font-weight:700}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{border:1px solid #e2e8f0;border-radius:18px;padding:16px;margin-top:12px}.rotulo{color:#64748b;text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700}.valor{margin:8px 0 14px;font-weight:700;line-height:1.5}.alerta{margin:24px 0;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:22px;padding:18px;color:#166534}@media print{body{background:#fff;padding:0}.acoes{display:none}.doc{box-shadow:none;border-radius:0;padding:0}}</style></head><body><div class="acoes"><button onclick="window.print()">Imprimir</button><button onclick="window.close()">Fechar</button></div><main class="doc"><p class="marca">Condominaria Express</p><h1>Comprovante de Participação em Votação Encerrada</h1><p>${moradorContexto.condominio.nome}</p><section class="alerta"><strong>Participação registrada.</strong><br/>Este comprovante confirma a participação e preserva o sigilo da opção escolhida.</section><h2>${dados.votacao.titulo}</h2><p><strong>Assembleia:</strong> ${dados.votacao.assembleia.titulo}</p><p><strong>Pauta:</strong> ${dados.votacao.pauta.titulo}</p><div class="grid">${participacoesHtml}</div></main></body></html>`);
      janela.document.close();
      janela.focus();
    } catch (error) {
      setComprovantesEncerrados((atual) => ({
        ...atual,
        [votacaoId]: {
          carregando: false,
          erro: mensagemErroAmigavel(error, 'Não foi possível carregar o comprovante da votação encerrada.'),
          dados: null,
        },
      }));
    }
  }

  async function carregarResultadoEncerrado(assembleiaId: number, votacaoId: number) {
    if (!moradorContexto) {
      return;
    }

    setResultadosEncerrados((atual) => ({
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

      setResultadosEncerrados((atual) => ({
        ...atual,
        [votacaoId]: {
          carregando: false,
          erro: '',
          resultado,
        },
      }));
    } catch (error) {
      setResultadosEncerrados((atual) => ({
        ...atual,
        [votacaoId]: {
          carregando: false,
          erro: mensagemErroAmigavel(error, 'Não foi possível carregar a apuração da votação.'),
          resultado: null,
        },
      }));
    }
  }

  return (
    <AppShell
      nomeCondominio={morador?.condominio.nome}
      nomeMorador={morador?.nome}
      perfis={estado.contexto?.moradores ?? []}
    >
      <PageHeader
        title="Votações"
        description="Participe das deliberações abertas e consulte seu histórico de participação com segurança."
        ultimaAtualizacao={ultimaAtualizacao}
        carregando={estado.carregando}
        onRefresh={atualizarDadosPagina}
      />

      {estado.carregando ? <PageSkeleton cards={2} linhas={4} /> : null}

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

      {!estado.carregando ? (
        <div className="grid gap-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ResumoVotacaoCard
              titulo="Abertas"
              valor={resumo.abertas}
              descricao="Votações liberadas para participação."
              icon={Vote}
              variant="orange"
            />
            <ResumoVotacaoCard
              titulo="Pendentes"
              valor={resumo.pendentes}
              descricao="Ainda aguardam sua participação."
              icon={ClipboardList}
              variant="amber"
            />
            <ResumoVotacaoCard
              titulo="Votadas"
              valor={resumo.votadas}
              descricao="Participações já registradas."
              icon={BadgeCheck}
              variant="green"
            />
            <ResumoVotacaoCard
              titulo="Encerradas"
              valor={resumo.encerradas}
              descricao="Resultados disponíveis para consulta."
              icon={BarChart3}
              variant="blue"
            />
            <ResumoVotacaoCard
              titulo="Exibidas"
              valor={resumo.filtradas}
              descricao="Resultado conforme os filtros atuais."
              icon={Filter}
              variant="slate"
            />
          </section>

          {resumo.pendentes > 0 ? (
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
              Existem {resumo.pendentes} votação(ões) aguardando sua participação.
              {perfilPortariaSemDireitoVoto
                    ? 'Perfil de portaria não participa de votações. Acompanhe as votações apenas para ciência operacional.'
                    : 'Revise as pautas antes de confirmar o voto.'}
            </section>
          ) : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <CircleCheckBig className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-950">Votações em aberto</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Participe das deliberações liberadas para o Portal do Morador.
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
                    onClick={limparFiltrosVotacoes}
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
                      atualizarFiltrosVotacoes({ busca: event.target.value })
                    }
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-14 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="Buscar votação, assembleia, pauta ou opção"
                  />
                  {filtros.busca ? (
                    <button
                      type="button"
                      onClick={() => atualizarFiltrosVotacoes({ busca: '' })}
                      aria-label="Limpar busca"
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold leading-none text-slate-500 shadow-sm transition hover:border-orange-300 hover:text-orange-700"
                    >
                      ×
                    </button>
                  ) : null}
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Situação
                    </span>
                    <select
                      value={filtros.situacao}
                      onChange={(event) =>
                        atualizarFiltrosVotacoes({
                          situacao: event.target.value as FiltrosVotacao['situacao'],
                        })
                      }
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="TODAS">Todas</option>
                      <option value="PENDENTES">Pendentes</option>
                      <option value="VOTADAS">Votadas</option>
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Ordem
                    </span>
                    <select
                      value={filtros.ordem}
                      onChange={(event) =>
                        atualizarFiltrosVotacoes({
                          ordem: event.target.value as FiltrosVotacao['ordem'],
                        })
                      }
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="RECENTES">Mais recentes</option>
                      <option value="ANTIGAS">Mais antigas</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <FilterSummary
            total={paginacao.total || listaSeguraPortal(estado.votacoes).length}
            exibidos={votacoesFiltradas.length}
            singular="votação"
            plural="votações"
            filtrosAtivos={[
              filtros.busca
                ? {
                    label: `Busca: "${filtros.busca}"`,
                    onRemove: () =>
                      atualizarFiltrosVotacoes({
                        busca: '',
                      }),
                  }
                : null,
              filtros.situacao !== 'TODAS'
                ? {
                    label: `Situação: ${
                      filtros.situacao === 'VOTADAS'
                        ? 'Com voto registrado'
                        : 'Sem voto registrado'
                    }`,
                    onRemove: () =>
                      atualizarFiltrosVotacoes({
                        situacao: 'TODAS',
                      }),
                  }
                : null,
              filtros.ordem !== 'RECENTES'
                ? {
                    label: 'Ordenação: Abertas mais antigas',
                    onRemove: () =>
                      atualizarFiltrosVotacoes({
                        ordem: 'RECENTES',
                      }),
                  }
                : null,
            ]}
          />

            {votacoesFiltradas.length === 0 ? (
              listaSeguraPortal(estado.votacoes).length > 0 ? (
                <FilteredEmptyState icon={Vote} onClear={limparFiltrosVotacoes} />
              ) : (
                <EmptyState
                  icon={Vote}
                  title="Nenhuma votação em aberto."
                  description="Quando houver uma assembleia com votação ativa, ela aparecerá aqui."
                />
              )
            ) : (
              <div className="mt-5 grid gap-5">
                {votacoesFiltradas.map((votacao: any) => {
                  const formulario = formularios[votacao.id] ?? formularioInicial;
                  const votoRegistradoUnidade = votoDaUnidade(
                    votacao,
                    formulario.unidadeId,
                  );
                  const votoRegistrado = votoDaUnidade(votacao, formulario.unidadeId);
                  const votadaPeloMorador = votacaoTemVotoDoMorador(votacao);
                  const opcaoRegistrada = votoRegistrado
                    ? buscarOpcao(votacao.opcoes, votoRegistrado.opcaoId)
                    : null;
                  const podeVotar = Boolean(formulario.unidadeId && formulario.opcaoId && !votoRegistrado && !perfilPortariaSemDireitoVoto);

                  return (
                    <article
                      key={votacao.id}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex flex-wrap gap-2">
                            <VotacaoStatusBadge status={votacao.status} />
                            <ParticipacaoBadge votada={votadaPeloMorador} />
                            <Badge>
                              <CalendarClock className="h-3.5 w-3.5" />
                              Aberta em {formatarDataHora(votacao.abertaEm)}
                            </Badge>
                          </div>

                          <h4 className="text-xl font-bold text-slate-950">{votacao.titulo}</h4>
                          {votacao.descricao ? (
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {votacao.descricao}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <InfoVotacaoItem label="Assembleia" valor={votacao.assembleia.titulo} />
                        <InfoVotacaoItem label="Pauta" valor={votacao.pauta.titulo} />
                        {votacao.pauta.descricao ? (
                          <div className="md:col-span-2">
                            <InfoVotacaoItem label="Descrição da pauta" valor={votacao.pauta.descricao} />
                          </div>
                        ) : null}
                      </div>

                      <section
                        className={`mt-5 rounded-3xl border p-4 ${
                          votoRegistrado
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-orange-200 bg-orange-50/70'
                        }`}
                      >
                        <p className={`text-xs font-bold uppercase tracking-[0.14em] ${
                          votoRegistrado ? 'text-emerald-700' : 'text-orange-700'
                        }`}>
                          Minha participação nesta votação
                        </p>

                        <p className={`mt-2 text-sm font-semibold leading-6 ${
                          votoRegistrado ? 'text-emerald-950' : 'text-orange-950'
                        }`}>
                          {votoRegistrado
                            ? 'Participação registrada para a unidade selecionada. A área de votação fica bloqueada para evitar duplicidade.'
                            : 'Selecione sua unidade, escolha uma opção e confirme o registro da participação.'}
                        </p>

                        <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                          Participação preservada por sigilo: o comprovante confirma o registro, sem expor publicamente a opção escolhida.
                        </p>
                      </section>

                      {votoRegistrado ? (
                        <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-bold text-emerald-950">
                                Voto registrado em {formatarDataHora(votoRegistrado.registradoEm)}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-emerald-800">
                                Opção registrada: {opcaoRegistrada?.descricao ?? 'Opção preservada'}.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => abrirComprovanteParticipacaoVoto(votacao, votoRegistrado)}
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
                            >
                              <FileCheck2 className="h-4 w-4" />
                              Ver comprovante
                            </button>
                          </div>
                        </section>
                      ) : (
                        <form
                          onSubmit={(event) => registrarVoto(event, votacao)}
                          className="mt-5 mb-28 grid gap-4 rounded-3xl border border-orange-100 bg-orange-50/50 p-4 pb-6 sm:mb-20 lg:mb-8"
                        >
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="grid gap-2">
                              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                                Unidade
                              </span>
                              <select
                                value={formulario.unidadeId}
                                onChange={(event) =>
                                  atualizarFormulario(votacao.id, 'unidadeId', event.target.value)
                                }
                                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              >
                                <option value="">Selecione a unidade</option>
                                {listaSeguraPortal(estado.unidades).map((unidade: any) => (
                                  <option key={unidade.unidade.id} value={unidade.unidade.id}>
                                    {unidade.unidade.identificador}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="grid gap-2">
                              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                                Observações opcionais
                              </span>
                              <input
                                type="text"
                                value={formulario.observacoes}
                                onChange={(event) =>
                                  atualizarFormulario(votacao.id, 'observacoes', event.target.value)
                                }
                                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                disabled={Boolean(votoRegistradoUnidade)}
                        placeholder="Ex.: voto registrado após ciência da pauta"
                              />
                            </label>
                          </div>

                          <div className="grid gap-3">
                            
                    {votoRegistradoUnidade ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">
                        Participação já registrada para esta unidade.
                        <span className="block font-normal text-emerald-700">
                          Esta unidade já possui participação registrada nesta votação. A área de votação fica bloqueada para esta unidade para evitar duplicidade. Se houver outra unidade vinculada, selecione-a acima.
                        </span>
                      </div>
                    ) : null}

<p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                              Opções de voto
                            </p>
                            {listaSeguraPortal(votacao.opcoes).map((opcao: any) => (
                              <label
                                key={opcao.id}
                                className={`flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition ${
                                  votoRegistradoUnidade
                                    ? 'cursor-not-allowed opacity-60'
                                    : 'cursor-pointer hover:border-orange-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`votacao-${votacao.id}`}
                                  value={opcao.id}
                                  checked={formulario.opcaoId === String(opcao.id)}
                                  onChange={(event) =>
                                    atualizarFormulario(votacao.id, 'opcaoId', event.target.value)
                                  }
                                  disabled={Boolean(votoRegistradoUnidade)}
                                  className="mt-1 h-4 w-4 accent-orange-600"
                                />
                                <span className="text-sm font-bold leading-6 text-slate-700">
                                  {opcao.descricao}
                                </span>
                              </label>
                            ))}
                          </div>

                          <div className="rounded-2xl border border-orange-200 bg-white p-3 text-xs font-semibold leading-5 text-orange-800">
                            <ShieldCheck className="mr-1 inline h-4 w-4" />
                            Confirme com atenção. Após registrar o voto, a participação fica vinculada à unidade selecionada.
                          </div>

                          <button
                            type="submit"
                            disabled={!podeVotar || votacaoSalvandoId === votacao.id}
                            className="relative z-10 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:min-w-[260px] sm:justify-self-start"
                          >
                            {votacaoSalvandoId === votacao.id ? (
                              <LoaderCircle className="h-5 w-5 animate-spin" />
                            ) : (
                              <Send className="h-5 w-5" />
                            )}
                            {votacaoSalvandoId === votacao.id ? 'Registrando voto...' : 'Confirmar e registrar'}
                          </button>
                        </form>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-950">
                  Resultados de votações encerradas
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Consulte a apuração das votações que já foram concluídas.
                </p>
              </div>
            </div>

            {votacoesEncerradas.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Nenhum resultado encerrado disponível."
                description="Quando uma votação for concluída, a apuração aparecerá aqui."
              />
            ) : (
              <div className="grid gap-5">
                {votacoesEncerradas.map((votacao: any) => {
                  const estadoResultado = resultadosEncerrados[votacao.votacaoId];
                  const estadoComprovante = comprovantesEncerrados[votacao.votacaoId];

                  return (
                    <article
                      key={votacao.votacaoId}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex flex-wrap gap-2">
                            <VotacaoStatusBadge status="ENCERRADA" />
                            <Badge>
                              <CalendarClock className="h-3.5 w-3.5" />
                              Encerrada em {formatarDataHora(votacao.encerradaEm)}
                            </Badge>
                          </div>

                          <h4 className="text-xl font-bold text-slate-950">{votacao.titulo}</h4>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                          <button
                            type="button"
                            onClick={() =>
                              void carregarResultadoEncerrado(
                                votacao.assembleiaId,
                                votacao.votacaoId,
                              )
                            }
                            disabled={estadoResultado?.carregando}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60"
                          >
                            {estadoResultado?.carregando ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <BarChart3 className="h-4 w-4" />
                            )}
                            {estadoResultado?.resultado ? 'Atualizar apuração' : 'Ver apuração'}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void abrirComprovanteParticipacaoEncerrada(
                                votacao.assembleiaId,
                                votacao.votacaoId,
                              )
                            }
                            disabled={estadoComprovante?.carregando}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
                          >
                            {estadoComprovante?.carregando ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileCheck2 className="h-4 w-4" />
                            )}
                            Ver comprovante
                          </button>
                        </div>
                      </div>

                      {estadoComprovante?.erro ? (
                        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                          {estadoComprovante.erro}
                        </p>
                      ) : null}

                      <div className="mt-5 grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 lg:grid-cols-2">
                        <InfoVotacaoItem label="Assembleia" valor={votacao.assembleiaTitulo} />
                        <InfoVotacaoItem
                          label="Pauta"
                          valor={
                            <>
                              <span className="block font-bold text-slate-950">{votacao.pautaTitulo}</span>
                              {votacao.pautaDescricao ? (
                                <span className="mt-2 block text-sm font-semibold leading-6 text-slate-600">
                                  {votacao.pautaDescricao}
                                </span>
                              ) : null}
                            </>
                          }
                        />
                      </div>

                      {estadoResultado?.erro ? (
                        <div className="mt-4 rounded-3xl border border-red-200 bg-red-50 p-4">
                          <p className="text-sm font-bold text-red-800">{estadoResultado.erro}</p>
                        </div>
                      ) : null}

                      {estadoResultado?.resultado ? (
                        <section className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                            Apuração
                          </p>
                          <p className="mt-2 text-sm font-bold text-emerald-950">
                            Total de votos: {estadoResultado.resultado.totalVotos}
                          </p>

                          <div className="mt-4 grid gap-3">
                            {listaSeguraPortal(estadoResultado.resultado.opcoes).map((opcao: any) => (
                              <article
                                key={opcao.id}
                                className="rounded-2xl border border-emerald-200 bg-white p-4"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="font-bold text-slate-950">{opcao.descricao}</p>
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
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : null}
    
      {votoPendenteConfirmacao ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void confirmarVotoPendentePortal(votoPendenteConfirmacao);
            }}
            className="w-full max-w-xl rounded-[2rem] border border-orange-100 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-700">
                  Confirmação de voto
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-950">
                  Revise seu voto antes de registrar
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Após confirmar, a participação ficará vinculada à unidade selecionada.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setVotoPendenteConfirmacao(null)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg font-bold text-slate-500 transition hover:bg-slate-50"
                aria-label="Fechar confirmação"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Votação
                </p>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-950">
                  {votoPendenteConfirmacao.votacao.titulo}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Unidade
                  </p>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-950">
                    {votoPendenteConfirmacao.unidadeTexto}
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-700">
                    Opção escolhida
                  </p>
                  <p className="mt-1 text-sm font-bold leading-6 text-orange-950">
                    {votoPendenteConfirmacao.opcaoTexto}
                  </p>
                </div>
              </div>

              {votoPendenteConfirmacao.observacoes ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Observações
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                    {votoPendenteConfirmacao.observacoes}
                  </p>
                </div>
              ) : null}
            </div>

            {erroConfirmacaoVoto ? (
              <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold leading-6 text-rose-800">
                {erroConfirmacaoVoto.includes('já registrou voto')
                  ? 'Esta unidade já possui participação registrada. Atualize os dados para consultar o status.'
                  : erroConfirmacaoVoto}
              </p>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
              <button
                type="button"
                onClick={() => setVotoPendenteConfirmacao(null)}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Revisar
              </button>

              <button
                type="submit"
                disabled={votacaoSalvandoId === votoPendenteConfirmacao.votacao.id}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-wait disabled:opacity-70"
              >
                {votacaoSalvandoId === votoPendenteConfirmacao.votacao.id ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                {votacaoSalvandoId === votoPendenteConfirmacao.votacao.id
                  ? 'Registrando...'
                  : 'Confirmar e registrar'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

</AppShell>
  );
}
