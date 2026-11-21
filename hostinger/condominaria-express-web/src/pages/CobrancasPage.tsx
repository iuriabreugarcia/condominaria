import {
  CalendarDays,
  Copy,
  CircleCheckBig,
  CircleX,
  Clock3,
  Filter,
  KeyRound,
  Printer,
  ReceiptText,
  Search,
  TriangleAlert,
  Upload,
  WalletCards,
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSearchShortcut } from '../hooks/useSearchShortcut';
import { useCloseFiltersShortcut } from '../hooks/useCloseFiltersShortcut';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { PageSkeleton } from '../components/PageSkeleton';
import { PageHeader } from '../components/PageHeader';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useRefreshOnReconnect } from '../hooks/useRefreshOnReconnect';
import { FilterSummary } from '../components/FilterSummary';
import { FilteredEmptyState } from '../components/FilteredEmptyState';
import {
  EmptyState,
  ErrorState,
} from '../components/FeedbackState';
import { usePortal } from '../context/PortalContext';
import { apiRequest, ApiError } from '../lib/api';
import { obterMoradorAtivo } from '../lib/portal';
import type {
  CobrancaPortal,
  PortalConfiguracoesPagamentoCondominio,
  PortalMoradorMeResponse,
  StatusCobrancaPortal,
} from '../types/api';

type EstadoPagina = {
  carregando: boolean;
  erro: string;
  contexto: PortalMoradorMeResponse | null;
  configuracoesPagamento: PortalConfiguracoesPagamentoCondominio | null;
  cobrancas: CobrancaPortal[];
  paginacao: PaginacaoPortal;
};

type FiltrosCobranca = {
  busca: string;
  status: 'TODAS' | StatusCobrancaPortal;
  vencimento: 'TODAS' | 'VENCIDAS' | 'A_VENCER';
  ordem: 'VENCIMENTO_ASC' | 'VENCIMENTO_DESC' | 'VALOR_DESC' | 'VALOR_ASC';
};

type ComprovanteForm = {
  arquivoNome: string;
  arquivoTipo: string;
  arquivoDados: string;
  arquivoTamanho: number;
  observacao: string;
  enviando: boolean;
  mensagem: string;
  erro: string;
};

const rotuloStatus: Record<StatusCobrancaPortal, string> = {
  PENDENTE: 'Pendente',
  PAGO: 'Paga',
  CANCELADA: 'Cancelada',
};


const filtrosIniciais: FiltrosCobranca = {
  busca: '',
  status: 'TODAS',
  vencimento: 'TODAS',
  ordem: 'VENCIMENTO_ASC',
};

function inferirTipoArquivoComprovante(nomeArquivo: string) {
  const nome = nomeArquivo.toLowerCase();

  if (nome.endsWith('.jpg') || nome.endsWith('.jpeg')) return 'image/jpeg';
  if (nome.endsWith('.png')) return 'image/png';
  if (nome.endsWith('.webp')) return 'image/webp';
  if (nome.endsWith('.pdf')) return 'application/pdf';

  return '';
}

function formatarTamanhoArquivoComprovante(bytes: number) {
  if (!bytes) return '';

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2).replace('.', ',')} MB`;
}

function lerArquivoComprovanteComoDataUrl(arquivo: File) {
  return new Promise<string>((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = () => {
      const resultado = String(leitor.result ?? '');

      if (!resultado.startsWith('data:')) {
        reject(new Error('O arquivo foi lido, mas o formato retornado é inválido.'));
        return;
      }

      resolve(resultado);
    };

    leitor.onerror = () => reject(new Error('Falha ao ler o arquivo selecionado.'));
    leitor.readAsDataURL(arquivo);
  });
}

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


function formatarMoeda(valor: string | number) {
  const numero = typeof valor === 'number'
    ? valor
    : Number(valor);

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(numero) ? numero : 0);
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(new Date(data));
}

function formatarCompetencia(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(data));
}

function normalizarBusca(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

function formatarDataOpcional(data: string | null) {
  return data ? formatarData(data) : '—';
}

function escaparHtml(valor: string | number | null | undefined) {
  return String(valor ?? '').replace(/[&<>"']/g, (caractere) => {
    const mapa: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return mapa[caractere] ?? caractere;
  });
}

function configuracaoPagamentoTemDados(
  configuracoes: PortalConfiguracoesPagamentoCondominio | null,
) {
  return Boolean(
    configuracoes?.pixChave ||
      configuracoes?.beneficiarioPagamento ||
      configuracoes?.bancoPagamento ||
      configuracoes?.instrucoesPagamento ||
      configuracoes?.mensagemCobrancaPadrao,
  );
}

function rotuloSituacaoCobranca(cobranca: CobrancaPortal) {
  if (cobrancaEstaVencida(cobranca)) {
    return 'Vencida';
  }

  return rotuloStatus[cobranca.status];
}

function mensagemErroAmigavel(error: unknown, fallback: string) {
  const mensagem =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : '';

  const normalizada = mensagem.trim().toLowerCase();

  if (
    normalizada.includes('internal server error') ||
    normalizada.includes('prismaclientknownrequesterror') ||
    normalizada.includes('p2022') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('cannot read properties')
  ) {
    return 'Não foi possível carregar as informações agora. Tente novamente em instantes ou fale com a administração.';
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
    return 'Você não tem permissão para acessar estas cobranças.';
  }

  return mensagem.trim() || fallback;
}

function CobrancaStatusBadge({
  status,
  vencida,
}: {
  status: StatusCobrancaPortal;
  vencida?: boolean;
}) {
  const classe = vencida
    ? 'bg-red-600 text-white'
    : status === 'PAGO'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'CANCELADA'
        ? 'bg-slate-200 text-slate-700'
        : 'bg-amber-100 text-amber-800';

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold',
        classe,
      ].join(' ')}
    >
      <IconeStatus status={status} vencida={Boolean(vencida)} />
      {vencida ? 'Vencida' : rotuloStatus[status]}
    </span>
  );
}

function ComprovanteStatusBadge({
  status,
}: {
  status: CobrancaPortal['comprovanteStatus'];
}) {
  if (!status) {
    return null;
  }

  const classe =
    status === 'APROVADO'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'RECUSADO'
        ? 'bg-red-100 text-red-800'
        : 'bg-orange-100 text-orange-800';

  const rotulo =
    status === 'ENVIADO'
      ? 'Aguardando análise'
      : status === 'APROVADO'
        ? 'Aprovado'
        : 'Recusado';

  return (
    <span
      className={[
        'w-fit rounded-full px-3 py-1 text-xs font-bold',
        classe,
      ].join(' ')}
    >
      {rotulo}
    </span>
  );
}


function IconeStatus({
  status,
  vencida,
}: {
  status: StatusCobrancaPortal;
  vencida: boolean;
}) {
  if (vencida) {
    return <TriangleAlert className="h-5 w-5" />;
  }

  if (status === 'PAGO') {
    return <CircleCheckBig className="h-5 w-5" />;
  }

  if (status === 'CANCELADA') {
    return <CircleX className="h-5 w-5" />;
  }

  return <Clock3 className="h-5 w-5" />;
}

export function CobrancasPage() {
  const buscaInputRef = useRef<HTMLInputElement | null>(null);
  usePageTitle('Cobranças');
  const [recarregarToken, setRecarregarToken] = useState(0);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [estado, setEstado] = useState<EstadoPagina>({
    carregando: true,
    erro: '',
    contexto: null,
    configuracoesPagamento: null,
    cobrancas: [],
    paginacao: paginacaoInicialPortal,
  });

  const [filtros, setFiltros] =
    useState<FiltrosCobranca>(filtrosIniciais);
  const [paginaAtual, setPaginaAtual] = useState(1);

  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [mensagemAcao, setMensagemAcao] = useState('');
  const [erroAcao, setErroAcao] = useState('');
  const [comprovantesForm, setComprovantesForm] = useState<Record<number, ComprovanteForm>>({});

  useEffect(() => {
    const buscaParam = searchParams.get('busca') ?? '';
    const statusParam = searchParams.get('status');
    const vencimentoParam = searchParams.get('vencimento');
    const ordemParam = searchParams.get('ordem');

    const status: FiltrosCobranca['status'] =
      statusParam === 'PENDENTE' ||
      statusParam === 'PAGO' ||
      statusParam === 'CANCELADA'
        ? statusParam
        : 'TODAS';

    const vencimento: FiltrosCobranca['vencimento'] =
      vencimentoParam === 'VENCIDAS' ||
      vencimentoParam === 'A_VENCER'
        ? vencimentoParam
        : 'TODAS';

    const ordem: FiltrosCobranca['ordem'] =
      ordemParam === 'VENCIMENTO_DESC' ||
      ordemParam === 'VALOR_DESC' ||
      ordemParam === 'VALOR_ASC'
        ? ordemParam
        : 'VENCIMENTO_ASC';

    setFiltros((atual) => ({
      ...atual,
      busca: buscaParam,
      status,
      vencimento,
      ordem,
    }));
  }, [searchParams]);

  useEffect(() => {
    if (!mensagemAcao && !erroAcao) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMensagemAcao('');
      setErroAcao('');
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [erroAcao, mensagemAcao]);

  function atualizarUrlCobrancas(proximos: FiltrosCobranca) {
    const params = new URLSearchParams();

    if (proximos.busca.trim()) {
      params.set('busca', proximos.busca.trim());
    }


    if (proximos.status !== 'TODAS') {
      params.set('status', proximos.status);
    }

    if (proximos.vencimento !== 'TODAS') {
      params.set('vencimento', proximos.vencimento);
    }

    if (proximos.ordem !== 'VENCIMENTO_ASC') {
      params.set('ordem', proximos.ordem);
    }

    setSearchParams(params, { replace: true });
  }

  function atualizarFiltrosCobrancas(
    parcial: Partial<FiltrosCobranca>,
  ) {
    const proximos = {
      ...filtros,
      ...parcial,
    };

    setFiltros(proximos);
    setPaginaAtual(1);
    atualizarUrlCobrancas(proximos);
  }

  function limparFiltrosCobrancas() {
    setFiltros({
      ...filtrosIniciais,
      busca: '',
    });
    setPaginaAtual(1);
    setSearchParams({}, { replace: true });
  }

  const {
    contexto,
    moradorAtivo: moradorContexto,
    carregando: carregandoPortal,
    erro: erroPortal,
  } = usePortal();

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
        const morador = moradorContexto;

        const queryString = montarQueryStringPortal({
          q: filtros.busca,
          status: filtros.status !== 'TODAS' ? filtros.status : undefined,
          page: paginaAtual,
          limit: LIMITE_PAGINA_PORTAL,
        });

        const [cobrancasResponse, configuracoesPagamento] = await Promise.all([
          apiRequest<CobrancaPortal[] | ApiListResponse<CobrancaPortal>>(
            `/portal-morador/condominios/${morador.condominioId}/cobrancas${queryString}`,
          ),
          apiRequest<PortalConfiguracoesPagamentoCondominio>(
            `/condominios/${morador.condominioId}/financeiro/configuracoes-pagamento-portal`,
          ).catch(() => null),
        ]);

        const { items: cobrancas, paginacao } =
          normalizarRespostaPaginada<CobrancaPortal>(
            cobrancasResponse,
            paginaAtual,
          );

        setEstado({
          carregando: false,
          erro: '',
          contexto,
          configuracoesPagamento,
          cobrancas,
          paginacao,
        });
        setUltimaAtualizacao(new Date());
      } catch (error) {
        setEstado({
          carregando: false,
          erro: mensagemErroAmigavel(error, 'Não foi possível carregar as cobranças.'),
          contexto: null,
          configuracoesPagamento: null,
          cobrancas: [],
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

  const morador = estado.contexto
    ? obterMoradorAtivo(estado.contexto)
    : null;

  const cobrancasFiltradas = useMemo(() => {
    const busca = normalizarBusca(filtros.busca);

    return [...estado.cobrancas]
      .filter((cobranca) => {
        if (
          filtros.status !== 'TODAS' &&
          cobranca.status !== filtros.status
        ) {
          return false;
        }

        const vencida = cobrancaEstaVencida(cobranca);

        if (
          filtros.vencimento === 'VENCIDAS' &&
          !vencida
        ) {
          return false;
        }

        if (
          filtros.vencimento === 'A_VENCER' &&
          (
            cobranca.status !== 'PENDENTE' ||
            vencida
          )
        ) {
          return false;
        }

        if (!busca) {
          return true;
        }

        const conteudo = normalizarBusca([
          cobranca.descricao,
          cobranca.unidade.identificador,
          cobranca.observacoes ?? '',
        ].join(' '));

        return conteudo.includes(busca);
      })
      .sort((a, b) => {
        if (filtros.ordem === 'VALOR_DESC') {
          return Number(b.valor) - Number(a.valor);
        }

        if (filtros.ordem === 'VALOR_ASC') {
          return Number(a.valor) - Number(b.valor);
        }

        const diferenca =
          new Date(a.vencimentoEm).getTime() -
          new Date(b.vencimentoEm).getTime();

        return filtros.ordem === 'VENCIMENTO_DESC'
          ? -diferenca
          : diferenca;
      });
  }, [estado.cobrancas, filtros]);

  const resumo = useMemo(() => {
    const pendentes = estado.cobrancas.filter(
      (cobranca) => cobranca.status === 'PENDENTE',
    );

    const pagas = estado.cobrancas.filter(
      (cobranca) => cobranca.status === 'PAGO',
    );

    const vencidas = pendentes.filter(cobrancaEstaVencida);

    const comprovantesEmAnalise = estado.cobrancas.filter(
      (cobranca) => cobranca.comprovanteStatus === 'ENVIADO',
    );

    const totalPendente = pendentes.reduce(
      (total, cobranca) => total + Number(cobranca.valor),
      0,
    );

    const totalVencido = vencidas.reduce(
      (total, cobranca) => total + Number(cobranca.valor),
      0,
    );

    const totalPago = pagas.reduce(
      (total, cobranca) => total + Number(cobranca.valor),
      0,
    );

    return {
      quantidadeTotal: estado.cobrancas.length,
      pendentes: pendentes.length,
      pagas: pagas.length,
      vencidas: vencidas.length,
      comprovantesEmAnalise: comprovantesEmAnalise.length,
      totalPendente,
      totalPago,
      totalVencido,
    };
  }, [estado.cobrancas]);

  const configuracoesPagamento = estado.configuracoesPagamento;

  function montarLinhasPagamento() {
    if (!configuracoesPagamento) {
      return [];
    }

    const linhas: string[] = [];

    if (configuracoesPagamento.mensagemCobrancaPadrao) {
      linhas.push(configuracoesPagamento.mensagemCobrancaPadrao);
    }

    if (configuracoesPagamento.pixChave) {
      linhas.push(
        `Pix${configuracoesPagamento.pixTipo ? ` (${configuracoesPagamento.pixTipo})` : ''}: ${configuracoesPagamento.pixChave}`,
      );
    }

    if (configuracoesPagamento.beneficiarioPagamento) {
      linhas.push(`Beneficiário: ${configuracoesPagamento.beneficiarioPagamento}`);
    }

    if (configuracoesPagamento.bancoPagamento) {
      linhas.push(`Banco/observação: ${configuracoesPagamento.bancoPagamento}`);
    }

    if (configuracoesPagamento.instrucoesPagamento) {
      linhas.push(`Instruções: ${configuracoesPagamento.instrucoesPagamento}`);
    }

    return linhas;
  }

  function montarMensagemPagamento(cobranca: CobrancaPortal) {
    const linhasPagamento = montarLinhasPagamento();
    const nomeCondominio = morador?.condominio.nome ?? 'Condomínio';
    const nomeMorador = morador?.nome ?? 'Morador';

    return [
      `Olá, ${nomeMorador}.`,
      '',
      `Segue a cobrança do ${nomeCondominio}:`,
      `Unidade: ${cobranca.unidade.identificador}`,
      `Descrição: ${cobranca.descricao}`,
      `Valor: ${formatarMoeda(cobranca.valor)}`,
      `Competência: ${formatarCompetencia(cobranca.competenciaEm)}`,
      `Vencimento: ${formatarData(cobranca.vencimentoEm)}`,
      `Situação: ${rotuloSituacaoCobranca(cobranca)}`,
      ...(linhasPagamento.length > 0 ? ['', 'Dados para pagamento:', ...linhasPagamento] : []),
    ].join('\n');
  }

  async function copiarTexto(textoParaCopiar: string, mensagem: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textoParaCopiar);
      } else {
        const campo = document.createElement('textarea');
        campo.value = textoParaCopiar;
        campo.setAttribute('readonly', 'true');
        campo.style.position = 'fixed';
        campo.style.opacity = '0';
        document.body.appendChild(campo);
        campo.select();
        document.execCommand('copy');
        document.body.removeChild(campo);
      }

      setMensagemAcao(mensagem);
      setErroAcao('');
    } catch {
      setErroAcao('Não foi possível copiar as informações.');
      setMensagemAcao('');
    }
  }

  function atualizarComprovanteForm(
    cobrancaId: number,
    parcial: Partial<ComprovanteForm>,
  ) {
    setComprovantesForm((atual) => {
      const existente = atual[cobrancaId];

      return {
        ...atual,
        [cobrancaId]: {
          arquivoNome: existente?.arquivoNome ?? '',
          arquivoTipo: existente?.arquivoTipo ?? '',
          arquivoDados: existente?.arquivoDados ?? '',
          arquivoTamanho: existente?.arquivoTamanho ?? 0,
          observacao: existente?.observacao ?? '',
          enviando: existente?.enviando ?? false,
          mensagem: existente?.mensagem ?? '',
          erro: existente?.erro ?? '',
          ...parcial,
        },
      };
    });
  }

  async function carregarArquivoComprovante(
    cobrancaId: number,
    arquivo: File | null,
  ) {
    setMensagemAcao('');
    setErroAcao('');

    if (!arquivo) {
      atualizarComprovanteForm(cobrancaId, {
        arquivoNome: '',
        arquivoTipo: '',
        arquivoDados: '',
        arquivoTamanho: 0,
        mensagem: '',
        erro: '',
      });
      return;
    }

    const arquivoTipo = arquivo.type || inferirTipoArquivoComprovante(arquivo.name);

    atualizarComprovanteForm(cobrancaId, {
      arquivoNome: arquivo.name,
      arquivoTipo,
      arquivoDados: '',
      arquivoTamanho: arquivo.size,
      mensagem: 'Lendo comprovante...',
      erro: '',
    });

    if (arquivo.size > 3 * 1024 * 1024) {
      const mensagem = 'Envie um comprovante de até 3 MB em imagem ou PDF.';

      atualizarComprovanteForm(cobrancaId, {
        arquivoDados: '',
        mensagem: '',
        erro: mensagem,
      });

      setErroAcao(mensagem);
      return;
    }

    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    if (!tiposPermitidos.includes(arquivoTipo)) {
      const mensagem = 'Envie uma imagem JPG/PNG/WebP ou um PDF.';

      atualizarComprovanteForm(cobrancaId, {
        arquivoTipo,
        arquivoDados: '',
        mensagem: '',
        erro: mensagem,
      });

      setErroAcao(mensagem);
      return;
    }

    try {
      const arquivoDados = await lerArquivoComprovanteComoDataUrl(arquivo);

      atualizarComprovanteForm(cobrancaId, {
        arquivoNome: arquivo.name,
        arquivoTipo,
        arquivoDados,
        arquivoTamanho: arquivo.size,
        mensagem: 'Arquivo anexado. Revise os dados e clique em Enviar comprovante.',
        erro: '',
      });

      setMensagemAcao(`Arquivo "${arquivo.name}" anexado ao comprovante.`);
      setErroAcao('');
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : 'Não foi possível ler o arquivo selecionado.';

      atualizarComprovanteForm(cobrancaId, {
        arquivoDados: '',
        mensagem: '',
        erro: mensagem,
      });

      setErroAcao(mensagem);
      setMensagemAcao('');
    }
  }

  async function enviarComprovantePagamento(cobranca: CobrancaPortal) {
    const form = comprovantesForm[cobranca.id];

    setErroAcao('');
    setMensagemAcao('');

    if (!form?.arquivoDados) {
      const mensagem = 'Selecione o arquivo do comprovante antes de enviar. Aceitamos imagem ou PDF de até 3 MB.';

      atualizarComprovanteForm(cobranca.id, {
        erro: mensagem,
        mensagem: '',
      });

      setErroAcao(mensagem);
      return;
    }

    if (!form.arquivoDados.startsWith('data:')) {
      const mensagem =
        'O arquivo selecionado não foi carregado corretamente. Selecione novamente o comprovante.';

      atualizarComprovanteForm(cobranca.id, {
        arquivoDados: '',
        erro: mensagem,
        mensagem: '',
      });

      setErroAcao(mensagem);
      return;
    }

    atualizarComprovanteForm(cobranca.id, {
      enviando: true,
      erro: '',
      mensagem: 'Enviando comprovante...',
    });

    setMensagemAcao('Enviando comprovante...');

    try {
      await apiRequest(
        `/portal-morador/condominios/${cobranca.condominioId}/cobrancas/${cobranca.id}/comprovante`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            arquivoNome: form.arquivoNome,
            arquivoTipo: form.arquivoTipo,
            arquivoDados: form.arquivoDados,
            observacao: form.observacao,
          }),
        },
      );

      setMensagemAcao('Comprovante enviado para análise.');
      setErroAcao('');
      setComprovantesForm((atual) => {
        const proximo = { ...atual };
        delete proximo[cobranca.id];
        return proximo;
      });
      atualizarDadosPagina();
    } catch (error) {
      const mensagem = mensagemErroAmigavel(
        error,
        'Não foi possível enviar o comprovante.',
      );

      setErroAcao(mensagem);
      setMensagemAcao('');
      atualizarComprovanteForm(cobranca.id, {
        enviando: false,
        mensagem: '',
        erro: mensagem,
      });
    }
  }

  function imprimirReciboPortal(cobranca: CobrancaPortal) {
    const janela = window.open('', '_blank', 'width=920,height=720');

    if (!janela) {
      setErroAcao('Não foi possível abrir a janela de impressão.');
      return;
    }

    const linhasPagamento = montarLinhasPagamento();

    janela.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Recibo de pagamento</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 32px; color: #0f172a; font-family: Arial, sans-serif; }
            header { border-bottom: 2px solid #fb923c; margin-bottom: 24px; padding-bottom: 16px; }
            .marca { color: #f97316; font-size: 11px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
            h1 { margin: 8px 0 0; font-size: 26px; }
            .card { border: 1px solid #e2e8f0; border-radius: 18px; margin-bottom: 14px; padding: 16px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
            small { color: #64748b; display: block; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
            strong { display: block; margin-top: 6px; }
            .valor { color: #047857; font-size: 26px; font-weight: 700; }
            .assinatura { margin-top: 42px; text-align: center; }
            .assinatura span { border-top: 1px solid #94a3b8; display: inline-block; padding-top: 10px; width: 320px; }
            @media print { body { padding: 18px; } }
          </style>
        </head>
        <body>
          <header>
            <div class="marca">Condominaria Express</div>
            <h1>Recibo de pagamento</h1>
            <p>${escaparHtml(morador?.condominio.nome ?? 'Condomínio')}</p>
          </header>

          <section class="card">
            <small>Valor pago</small>
            <div class="valor">${escaparHtml(formatarMoeda(cobranca.valor))}</div>
          </section>

          <section class="card grid">
            <div><small>Cobrança</small><strong>#${escaparHtml(cobranca.id)}</strong></div>
            <div><small>Status</small><strong>${escaparHtml(rotuloStatus[cobranca.status])}</strong></div>
            <div><small>Descrição</small><strong>${escaparHtml(cobranca.descricao)}</strong></div>
            <div><small>Unidade</small><strong>${escaparHtml(cobranca.unidade.identificador)}</strong></div>
            <div><small>Morador</small><strong>${escaparHtml(morador?.nome ?? '—')}</strong></div>
            <div><small>Competência</small><strong>${escaparHtml(formatarCompetencia(cobranca.competenciaEm))}</strong></div>
            <div><small>Vencimento</small><strong>${escaparHtml(formatarData(cobranca.vencimentoEm))}</strong></div>
            <div><small>Pagamento</small><strong>${escaparHtml(formatarDataOpcional(cobranca.pagoEm))}</strong></div>
          </section>

          ${linhasPagamento.length > 0 ? `
            <section class="card">
              <small>Dados de pagamento do condomínio</small>
              <p>${linhasPagamento.map(escaparHtml).join('<br />')}</p>
            </section>
          ` : ''}

          ${cobranca.observacoes ? `
            <section class="card">
              <small>Observações</small>
              <p>${escaparHtml(cobranca.observacoes)}</p>
            </section>
          ` : ''}

          <div class="assinatura">
            <span>${escaparHtml(morador?.condominio.nome ?? 'Condomínio')}</span>
          </div>
        </body>
      </html>
    `);

    janela.document.close();
    janela.focus();

    window.setTimeout(() => {
      janela.print();
    }, 300);
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

  return (
    <AppShell
      nomeCondominio={morador?.condominio.nome}
      nomeMorador={morador?.nome}
    
      perfis={estado.contexto?.moradores ?? []}
    >
            <PageHeader
        title="Cobranças"
        description="Visualize valores, vencimentos e acompanhe cobranças pendentes ou concluídas."
        ultimaAtualizacao={ultimaAtualizacao}
        carregando={estado.carregando}
        onRefresh={atualizarDadosPagina}
      />

      {mensagemAcao ? (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800 shadow-sm">
          {mensagemAcao}
        </div>
      ) : null}

      {erroAcao ? (
        <div className="rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-800 shadow-sm">
          {erroAcao}
        </div>
      ) : null}

        {estado.carregando ? (
        <PageSkeleton cards={4} linhas={4} />
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
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-3xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
                <Clock3 className="h-5 w-5" />
              </div>

              <p className="text-sm font-semibold text-amber-700">
                Em aberto
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {formatarMoeda(resumo.totalPendente)}
              </p>
              <p className="mt-1 text-sm text-amber-800">
                {resumo.pendentes} pendente(s)
              </p>
            </article>

            <article className="rounded-3xl border border-red-100 bg-red-50 p-5 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-red-700 shadow-sm">
                <TriangleAlert className="h-5 w-5" />
              </div>

              <p className="text-sm font-semibold text-red-700">
                Vencidas
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {formatarMoeda(resumo.totalVencido)}
              </p>
              <p className="mt-1 text-sm text-red-800">
                {resumo.vencidas} em atraso
              </p>
            </article>

            <article className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                <CircleCheckBig className="h-5 w-5" />
              </div>

              <p className="text-sm font-semibold text-emerald-700">
                Pagas
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {formatarMoeda(resumo.totalPago)}
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                {resumo.pagas} paga(s)
              </p>
            </article>

            <article className="rounded-3xl border border-orange-100 bg-orange-50 p-5 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-orange-700 shadow-sm">
                <ReceiptText className="h-5 w-5" />
              </div>

              <p className="text-sm font-semibold text-orange-700">
                Comprovantes em análise
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-950">
                {resumo.comprovantesEmAnalise}
              </p>
              <p className="mt-1 text-sm text-orange-800">
                aguardando validação da administração
              </p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
                <WalletCards className="h-5 w-5" />
              </div>

              <p className="text-sm font-semibold text-slate-500">
                Pagamento
              </p>
              <p className="mt-2 text-lg font-bold text-slate-950">
                {configuracoesPagamento?.pixChave ? 'Pix disponível' : 'Consultar condomínio'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                dados exibidos nas pendências
              </p>
            </article>
          </section>

          <section className="rounded-3xl border border-orange-100 bg-orange-50 px-5 py-4 text-sm font-semibold leading-6 text-orange-900 shadow-sm">
            Priorize cobranças vencidas ou em aberto. Quando enviar um comprovante, ele ficará em análise pela administração até a baixa ou eventual recusa.
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <WalletCards className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-950">
                  Minhas cobranças
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Consulte valores lançados para sua unidade.
                </p>
              </div>
            </div>

            <div className="mb-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Filter className="h-4 w-4 text-orange-600" />
                  Filtros
                </div>

                <button
                  type="button"
                  onClick={limparFiltrosCobrancas}
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
                    atualizarFiltrosCobrancas({
                      busca: event.target.value,
                    })
                  }
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-14 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Buscar por descrição, unidade ou observações"
                />

                {filtros.busca ? (
                  <button
                    type="button"
                    onClick={() =>
                      atualizarFiltrosCobrancas({
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

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Status
                  </span>

                  <select
                    value={filtros.status}
                    onChange={(event) =>
                      atualizarFiltrosCobrancas({
                        status: event.target.value as FiltrosCobranca['status'],
                      })
                    }
                    className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="TODAS">Todas</option>
                    <option value="PENDENTE">Pendentes</option>
                    <option value="PAGO">Pagas</option>
                    <option value="CANCELADA">Canceladas</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Vencimento
                  </span>

                  <select
                    value={filtros.vencimento}
                    onChange={(event) =>
                      atualizarFiltrosCobrancas({
                        vencimento: event.target.value as FiltrosCobranca['vencimento'],
                      })
                    }
                    className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="TODAS">Todas</option>
                    <option value="VENCIDAS">Vencidas</option>
                    <option value="A_VENCER">A vencer</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Ordenar
                  </span>

                  <select
                    value={filtros.ordem}
                    onChange={(event) =>
                      atualizarFiltrosCobrancas({
                        ordem: event.target.value as FiltrosCobranca['ordem'],
                      })
                    }
                    className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="VENCIMENTO_ASC">Vencimento mais próximo</option>
                    <option value="VENCIMENTO_DESC">Vencimento mais distante</option>
                    <option value="VALOR_DESC">Maior valor</option>
                    <option value="VALOR_ASC">Menor valor</option>
                  </select>
                </label>
              </div>
              </div>

            </div>
            <FilterSummary
              total={estado.paginacao.total}
              exibidos={cobrancasFiltradas.length}
              singular="cobrança"
              plural="cobranças"
              filtrosAtivos={[
                filtros.busca
                  ? {
                      label: `Busca: "${filtros.busca}"`,
                      onRemove: () =>
                        atualizarFiltrosCobrancas({
                          busca: '',
                        }),
                    }
                  : null,
                filtros.status !== 'TODAS'
                  ? {
                      label: `Status: ${rotuloStatus[filtros.status]}`,
                      onRemove: () =>
                        atualizarFiltrosCobrancas({
                          status: 'TODAS',
                        }),
                    }
                  : null,
                filtros.vencimento !== 'TODAS'
                  ? {
                      label: `Vencimento: ${
                        filtros.vencimento === 'VENCIDAS'
                          ? 'Vencidas'
                          : 'A vencer'
                      }`,
                      onRemove: () =>
                        atualizarFiltrosCobrancas({
                          vencimento: 'TODAS',
                        }),
                    }
                  : null,
                filtros.ordem !== 'VENCIMENTO_ASC'
                  ? {
                      label: `Ordenação: ${
                        filtros.ordem === 'VENCIMENTO_DESC'
                          ? 'Vencimento mais distante'
                          : filtros.ordem === 'VALOR_DESC'
                            ? 'Maior valor'
                            : 'Menor valor'
                      }`,
                      onRemove: () =>
                        atualizarFiltrosCobrancas({
                          ordem: 'VENCIMENTO_ASC',
                        }),
                    }
                  : null,
              ]}
            />

            {cobrancasFiltradas.length === 0 ? (
              estado.cobrancas.length > 0 ? (
                <FilteredEmptyState
                  icon={ReceiptText}
                  onClear={limparFiltrosCobrancas}
                />
              ) : (
                <EmptyState
                  icon={ReceiptText}
                  title="Nenhuma cobrança encontrada."
                  description="As cobranças do condomínio aparecerão aqui."
                />
              )
            ) : (
              <div className="grid gap-4">
                {cobrancasFiltradas.map((cobranca) => {
                  const vencida = cobrancaEstaVencida(cobranca);

                  return (
                    <article
                      key={cobranca.id}
                      className={[
                        'rounded-3xl border p-5 shadow-sm',
                        vencida
                          ? 'border-red-200 bg-red-50'
                          : 'border-slate-200 bg-slate-50',
                      ].join(' ')}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <CobrancaStatusBadge
                              status={cobranca.status}
                              vencida={vencida}
                            />

                            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                              {cobranca.unidade.identificador}
                            </span>
                          </div>

                          <h4 className="text-lg font-bold text-slate-950">
                            {cobranca.descricao}
                          </h4>

                          <p className="mt-2 text-sm text-slate-600">
                            Competência: {formatarCompetencia(cobranca.competenciaEm)}
                          </p>
                        </div>

                        <div className="rounded-3xl bg-white px-5 py-4 text-right shadow-sm">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            Valor
                          </p>
                          <p className="mt-1 text-3xl font-bold text-slate-950">
                            {formatarMoeda(cobranca.valor)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 md:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-orange-500" />
                          <span>
                            Vencimento: {formatarData(cobranca.vencimentoEm)}
                          </span>
                        </div>

                        {cobranca.pagoEm ? (
                          <div className="flex items-center gap-2">
                            <CircleCheckBig className="h-4 w-4 text-emerald-600" />
                            <span>
                              Pago em: {formatarData(cobranca.pagoEm)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-slate-500" />
                            <span>
                              Pagamento ainda não identificado.
                            </span>
                          </div>
                        )}
                      </div>

                      {cobranca.status === 'PENDENTE' &&
                      configuracaoPagamentoTemDados(configuracoesPagamento) ? (
                        <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm leading-6 text-orange-950">
                          <div className="mb-2 flex items-center gap-2 font-bold text-orange-800">
                            <KeyRound className="h-4 w-4" />
                            Dados para pagamento
                          </div>

                          <div className="grid gap-2 md:grid-cols-2">
                            {configuracoesPagamento?.pixChave ? (
                              <p>
                                <strong>Pix:</strong>{' '}
                                {configuracoesPagamento.pixChave}
                              </p>
                            ) : null}

                            {configuracoesPagamento?.beneficiarioPagamento ? (
                              <p>
                                <strong>Beneficiário:</strong>{' '}
                                {configuracoesPagamento.beneficiarioPagamento}
                              </p>
                            ) : null}

                            {configuracoesPagamento?.bancoPagamento ? (
                              <p>
                                <strong>Banco/observação:</strong>{' '}
                                {configuracoesPagamento.bancoPagamento}
                              </p>
                            ) : null}
                          </div>

                          {configuracoesPagamento?.instrucoesPagamento ? (
                            <p className="mt-2 whitespace-pre-line">
                              {configuracoesPagamento.instrucoesPagamento}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {cobranca.status === 'PENDENTE' ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-bold text-slate-950">
                                Comprovante de pagamento
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                Envie imagem ou PDF após realizar o pagamento.
                              </p>
                            </div>

                            <ComprovanteStatusBadge
                              status={cobranca.comprovanteStatus}
                            />
                          </div>

                          {cobranca.comprovanteStatus === 'RECUSADO' &&
                          cobranca.comprovanteMotivoRecusa ? (
                            <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                              Motivo da recusa: {cobranca.comprovanteMotivoRecusa}
                            </p>
                          ) : null}

                          {cobranca.comprovanteStatus !== 'ENVIADO' ? (
                            <div className="mt-4 grid gap-3">
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                onChange={(event) => {
                                  const arquivoSelecionado =
                                    event.currentTarget.files?.[0] ?? null;

                                  void carregarArquivoComprovante(
                                    cobranca.id,
                                    arquivoSelecionado,
                                  );

                                  event.currentTarget.value = '';
                                }}
                                className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                              />

                              {comprovantesForm[cobranca.id]?.arquivoNome ? (
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                                  Arquivo selecionado:{' '}
                                  {comprovantesForm[cobranca.id]?.arquivoNome}
                                  {comprovantesForm[cobranca.id]?.arquivoTamanho
                                    ? ` • ${formatarTamanhoArquivoComprovante(
                                        comprovantesForm[cobranca.id]
                                          ?.arquivoTamanho ?? 0,
                                      )}`
                                    : ''}
                                </div>
                              ) : (
                                <p className="text-xs font-semibold text-slate-500">
                                  Selecione uma imagem JPG/PNG/WebP ou PDF de até 3 MB.
                                </p>
                              )}

                              {comprovantesForm[cobranca.id]?.mensagem ? (
                                <p className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
                                  {comprovantesForm[cobranca.id]?.mensagem}
                                </p>
                              ) : null}

                              {comprovantesForm[cobranca.id]?.erro ? (
                                <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                                  {comprovantesForm[cobranca.id]?.erro}
                                </p>
                              ) : null}

                              <textarea
                                value={comprovantesForm[cobranca.id]?.observacao ?? ''}
                                onChange={(event) =>
                                  atualizarComprovanteForm(cobranca.id, {
                                    observacao: event.target.value,
                                  })
                                }
                                maxLength={255}
                                rows={2}
                                placeholder="Observação opcional sobre o pagamento"
                                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              />

                              <button
                                type="button"
                                onClick={() => void enviarComprovantePagamento(cobranca)}
                                disabled={
                                  Boolean(comprovantesForm[cobranca.id]?.enviando) ||
                                  !comprovantesForm[cobranca.id]?.arquivoDados
                                }
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Upload className="h-4 w-4" />
                                {comprovantesForm[cobranca.id]?.enviando
                                  ? 'Enviando...'
                                  : 'Enviar comprovante'}
                              </button>
                            </div>
                          ) : (
                            <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                              Comprovante enviado em {formatarDataOpcional(cobranca.comprovanteEnviadoEm)} e em análise pela administração. Você será orientado caso o comprovante seja recusado.
                            </p>
                          )}
                        </div>
                      ) : null}

                      {cobranca.observacoes ? (
                        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
                          {cobranca.observacoes}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {cobranca.status === 'PENDENTE' && configuracoesPagamento?.pixChave ? (
                          <button
                            type="button"
                            onClick={() =>
                              copiarTexto(
                                configuracoesPagamento.pixChave ?? '',
                                'Chave Pix copiada.',
                              )
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 text-sm font-bold text-orange-800 transition hover:bg-orange-50"
                          >
                            <Copy className="h-4 w-4" />
                            Copiar Pix
                          </button>
                        ) : null}

                        {cobranca.status === 'PENDENTE' ? (
                          <button
                            type="button"
                            onClick={() =>
                              copiarTexto(
                                montarMensagemPagamento(cobranca),
                                'Dados de pagamento copiados.',
                              )
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600"
                          >
                            <Copy className="h-4 w-4" />
                            Copiar dados de pagamento
                          </button>
                        ) : null}

                        {cobranca.status === 'PAGO' ? (
                          <button
                            type="button"
                            onClick={() => imprimirReciboPortal(cobranca)}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
                          >
                            <Printer className="h-4 w-4" />
                            Imprimir recibo
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
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
