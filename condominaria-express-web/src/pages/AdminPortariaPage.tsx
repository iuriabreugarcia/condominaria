import {
  BadgeCheck,
  BriefcaseBusiness,
  DoorOpen,
  LoaderCircle,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  Truck,
  UserRoundPlus,
  UsersRound,
} from 'lucide-react';
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAdminRouteContext } from '../components/AdminProtectedRoute';
import { AdminShell } from '../components/AdminShell';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  apiRequest,
  ApiError,
} from '../lib/api';
import type {
  AdminAcessoPrestador,
  AdminAcessoVisitante,
  AdminAutorizacaoPrestador,
  AdminAutorizacaoVisitante,
  AdminEncomendaPortaria,
  AdminMorador,
  AdminPrestador,
  AdminUnidade,
  AdminVisitante,
  CriarAutorizacaoPrestadorAdminPayload,
  CriarAutorizacaoVisitanteAdminPayload,
  CriarEncomendaAdminPayload,
  CriarPrestadorAdminPayload,
  CriarVisitanteAdminPayload,
  DevolverEncomendaAdminPayload,
  RegistrarEntradaAdminPayload,
  RegistrarSaidaAdminPayload,
  RetirarEncomendaAdminPayload,
} from '../types/api';

const papeisPortaria = new Set([
  'ADMINISTRADOR',
  'SINDICO',
  'PORTEIRO',
]);

const papeisAutorizacaoPrestador = new Set([
  'ADMINISTRADOR',
  'SINDICO',
]);

function obterMensagemErro(error: unknown, fallback: string) {
  const mensagem =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : '';

  const normalizada = mensagem.trim().toLowerCase();

  if (!normalizada) {
    return fallback;
  }

  if (
    normalizada.includes('internal server error') ||
    normalizada.includes('prismaclientknownrequesterror') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('cannot read properties')
  ) {
    return `${fallback} A equipe técnica pode verificar os logs da API para mais detalhes.`;
  }

  if (
    normalizada.includes('failed to fetch') ||
    normalizada.includes('networkerror') ||
    normalizada.includes('network request failed')
  ) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
  }

  return mensagem;
}

function formatarData(valor: string | null) {
  if (!valor) {
    return '—';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
}


function rotuloStatusAutorizacaoVisitante(status: string, fimEm?: string) {
  if (status === 'CANCELADA') {
    return 'Cancelada';
  }

  if (status === 'ENCERRADA') {
    return 'Encerrada';
  }

  if (fimEm && new Date(fimEm).getTime() < Date.now()) {
    return 'Expirada';
  }

  return 'Ativa';
}

function classeStatusAutorizacaoVisitante(status: string, fimEm?: string) {
  if (status === 'CANCELADA') {
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  if (status === 'ENCERRADA') {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }

  if (fimEm && new Date(fimEm).getTime() < Date.now()) {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  }

  return 'bg-emerald-100 text-emerald-800 border-emerald-200';
}

function autorizacaoVisitanteVigente(status: string, inicioEm: string, fimEm: string) {
  const agora = Date.now();
  return (
    status === 'ATIVA' &&
    new Date(inicioEm).getTime() <= agora &&
    new Date(fimEm).getTime() >= agora
  );
}

function autorizacaoVisitanteCancelavel(status: string, fimEm: string) {
  return status === 'ATIVA' && new Date(fimEm).getTime() >= Date.now();
}

function rotuloStatusEncomenda(status: string) {
  switch (status) {
    case 'RECEBIDA':
      return 'Aguardando retirada';
    case 'RETIRADA':
      return 'Retirada';
    case 'DEVOLVIDA':
      return 'Devolvida';
    default:
      return status;
  }
}

function classeStatusEncomenda(status: string) {
  switch (status) {
    case 'RECEBIDA':
      return 'bg-amber-100 text-amber-800';
    case 'RETIRADA':
      return 'bg-emerald-100 text-emerald-800';
    case 'DEVOLVIDA':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

type StatusPillProps = {
  children: ReactNode;
  className: string;
  withBorder?: boolean;
};

function StatusPill({
  children,
  className,
  withBorder = false,
}: StatusPillProps) {
  return (
    <span
      className={[
        'inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold',
        withBorder ? 'border' : '',
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

function AutorizacaoVisitanteStatusBadge({
  status,
  fimEm,
}: {
  status: string;
  fimEm?: string;
}) {
  return (
    <StatusPill
      className={classeStatusAutorizacaoVisitante(status, fimEm)}
      withBorder
    >
      {rotuloStatusAutorizacaoVisitante(status, fimEm)}
    </StatusPill>
  );
}

function EncomendaStatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <StatusPill className={classeStatusEncomenda(status)}>
      {rotuloStatusEncomenda(status)}
    </StatusPill>
  );
}

function ResumoPortariaCard({
  titulo,
  valor,
  icon,
  variant = 'neutral',
}: {
  titulo: string;
  valor: number;
  icon: ReactNode;
  variant?: 'neutral' | 'success' | 'danger';
}) {
  const variantes = {
    neutral: 'border-slate-200 bg-white text-slate-950',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-950',
    danger: 'border-rose-100 bg-rose-50 text-rose-950',
  };

  const textoSecundario = {
    neutral: 'text-slate-600',
    success: 'text-emerald-800',
    danger: 'text-rose-800',
  };

  return (
    <article className={`rounded-3xl border p-5 shadow-sm ${variantes[variant]}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/75 shadow-sm">
        {icon}
      </div>
      <p className={`mt-4 text-sm font-semibold ${textoSecundario[variant]}`}>
        {titulo}
      </p>
      <p className="mt-1 text-3xl font-bold">
        {valor}
      </p>
    </article>
  );
}

export function AdminPortariaPage() {
  usePageTitle('Portaria Administrativa');

  const {
    usuario,
    condominiosAdministrativos,
  } = useAdminRouteContext();

  const condominioInicial =
    condominiosAdministrativos.find((vinculo) => vinculo.principal)
      ?.condominio.id ??
    condominiosAdministrativos[0]?.condominio.id ??
    0;

  const [condominioId, setCondominioId] = useState(condominioInicial);

  const [visitantes, setVisitantes] = useState<AdminVisitante[]>([]);
  const [autorizacoesVisitantes, setAutorizacoesVisitantes] = useState<
    AdminAutorizacaoVisitante[]
  >([]);
  const [acessosVisitantes, setAcessosVisitantes] = useState<
    AdminAcessoVisitante[]
  >([]);

  const [prestadores, setPrestadores] = useState<AdminPrestador[]>([]);
  const [autorizacoesPrestadores, setAutorizacoesPrestadores] = useState<
    AdminAutorizacaoPrestador[]
  >([]);
  const [acessosPrestadores, setAcessosPrestadores] = useState<
    AdminAcessoPrestador[]
  >([]);

  const [encomendas, setEncomendas] = useState<AdminEncomendaPortaria[]>([]);
  const [unidades, setUnidades] = useState<AdminUnidade[]>([]);
  const [moradores, setMoradores] = useState<AdminMorador[]>([]);

  const [carregando, setCarregando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState('');
  const [erroAcao, setErroAcao] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const [enviandoVisitante, setEnviandoVisitante] = useState(false);
  const [enviandoAutorizacaoVisitante, setEnviandoAutorizacaoVisitante] =
    useState(false);
  const [enviandoPrestador, setEnviandoPrestador] = useState(false);
  const [enviandoAutorizacaoPrestador, setEnviandoAutorizacaoPrestador] =
    useState(false);
  const [enviandoEncomenda, setEnviandoEncomenda] = useState(false);

  const [acaoVisitanteId, setAcaoVisitanteId] = useState<number | null>(null);
  const [acaoAcessoVisitanteId, setAcaoAcessoVisitanteId] =
    useState<number | null>(null);
  const [acaoPrestadorId, setAcaoPrestadorId] = useState<number | null>(null);
  const [acaoAcessoPrestadorId, setAcaoAcessoPrestadorId] =
    useState<number | null>(null);
  const [acaoEncomendaId, setAcaoEncomendaId] = useState<number | null>(null);

  const [visitanteForm, setVisitanteForm] = useState({
    nome: '',
    documento: '',
    telefone: '',
    observacoes: '',
  });

  const [autorizacaoVisitanteForm, setAutorizacaoVisitanteForm] = useState({
    visitanteId: '',
    unidadeId: '',
    moradorId: '',
    inicioEm: '',
    fimEm: '',
    observacoes: '',
  });

  const [entradaVisitanteObs, setEntradaVisitanteObs] = useState<
    Record<number, string>
  >({});
  const [saidaVisitanteObs, setSaidaVisitanteObs] = useState<
    Record<number, string>
  >({});

  const [prestadorForm, setPrestadorForm] = useState({
    nome: '',
    empresa: '',
    tipoServico: '',
    documento: '',
    telefone: '',
    observacoes: '',
  });

  const [autorizacaoPrestadorForm, setAutorizacaoPrestadorForm] = useState({
    prestadorId: '',
    unidadeId: '',
    moradorId: '',
    inicioEm: '',
    fimEm: '',
    observacoes: '',
  });

  const [entradaPrestadorObs, setEntradaPrestadorObs] = useState<
    Record<number, string>
  >({});
  const [saidaPrestadorObs, setSaidaPrestadorObs] = useState<
    Record<number, string>
  >({});

  const [encomendaForm, setEncomendaForm] = useState({
    unidadeId: '',
    moradorId: '',
    descricao: '',
    remetente: '',
    codigoRastreio: '',
    destinatarioNome: '',
    observacoes: '',
  });

  const [retiradaEncomendaForm, setRetiradaEncomendaForm] = useState<
    Record<
      number,
      {
        retiradoPorNome: string;
        observacoesRetirada: string;
      }
    >
  >({});

  const [devolucaoEncomendaForm, setDevolucaoEncomendaForm] = useState<
    Record<number, string>
  >({});

  const condominioSelecionado =
    condominiosAdministrativos.find(
      (vinculo) => vinculo.condominio.id === condominioId,
    ) ?? null;

  const podeOperarPortaria =
    usuario.superAdmin ||
    Boolean(
      condominioSelecionado &&
        papeisPortaria.has(condominioSelecionado.papel),
    );

  const podeAutorizarPrestador =
    usuario.superAdmin ||
    Boolean(
      condominioSelecionado &&
        papeisAutorizacaoPrestador.has(condominioSelecionado.papel),
    );

  const encomendasRecebidas = encomendas.filter(
    (encomenda) => encomenda.status === 'RECEBIDA',
  );

  const encomendasRetiradas = encomendas.filter(
    (encomenda) => encomenda.status === 'RETIRADA',
  );

  const encomendasDevolvidas = encomendas.filter(
    (encomenda) => encomenda.status === 'DEVOLVIDA',
  );

  const encomendasFinalizadasRecentes = [...encomendas]
    .filter((encomenda) => encomenda.status !== 'RECEBIDA')
    .sort((a, b) =>
      new Date(b.retiradoEm ?? b.devolvidoEm ?? b.recebidoEm).getTime() -
      new Date(a.retiradoEm ?? a.devolvidoEm ?? a.recebidoEm).getTime(),
    )
    .slice(0, 8);

  const resumo = useMemo(
    () => ({
      visitantes: visitantes.length,
      autorizacoesVisitantes: autorizacoesVisitantes.length,
      acessosVisitantes: acessosVisitantes.length,
      prestadores: prestadores.length,
      autorizacoesPrestadores: autorizacoesPrestadores.length,
      acessosPrestadores: acessosPrestadores.length,
      encomendasRecebidas: encomendasRecebidas.length,
      encomendasRetiradas: encomendasRetiradas.length,
      encomendasDevolvidas: encomendasDevolvidas.length,
    }),
    [
      acessosPrestadores.length,
      acessosVisitantes.length,
      autorizacoesPrestadores.length,
      autorizacoesVisitantes.length,
      encomendasRecebidas.length,
      encomendasRetiradas.length,
      encomendasDevolvidas.length,
      prestadores.length,
      visitantes.length,
    ],
  );

  async function carregarDados(id: number) {
    if (!id) {
      return;
    }

    setCarregando(true);
    setErroCarregamento('');

    try {
      const [
        visitantesResposta,
        autorizacoesVisitantesResposta,
        acessosVisitantesResposta,
        prestadoresResposta,
        autorizacoesPrestadoresResposta,
        acessosPrestadoresResposta,
        encomendasResposta,
        unidadesResposta,
        moradoresResposta,
      ] = await Promise.all([
        apiRequest<AdminVisitante[]>(
          `/condominios/${id}/portaria/visitantes`,
        ),
        apiRequest<AdminAutorizacaoVisitante[]>(
          `/condominios/${id}/portaria/autorizacoes`,
        ),
        apiRequest<AdminAcessoVisitante[]>(
          `/condominios/${id}/portaria/acessos/em-aberto`,
        ),
        apiRequest<AdminPrestador[]>(
          `/condominios/${id}/prestadores`,
        ),
        apiRequest<AdminAutorizacaoPrestador[]>(
          `/condominios/${id}/prestadores/autorizacoes/ativas`,
        ),
        apiRequest<AdminAcessoPrestador[]>(
          `/condominios/${id}/prestadores/acessos/em-aberto`,
        ),
        apiRequest<AdminEncomendaPortaria[]>(
          `/condominios/${id}/encomendas`,
        ),
        apiRequest<AdminUnidade[]>(
          `/condominios/${id}/unidades`,
        ),
        apiRequest<AdminMorador[]>(
          `/condominios/${id}/moradores`,
        ),
      ]);

      setVisitantes(visitantesResposta);
      setAutorizacoesVisitantes(autorizacoesVisitantesResposta);
      setAcessosVisitantes(acessosVisitantesResposta);
      setPrestadores(prestadoresResposta);
      setAutorizacoesPrestadores(autorizacoesPrestadoresResposta);
      setAcessosPrestadores(acessosPrestadoresResposta);
      setEncomendas(encomendasResposta);
      setUnidades(unidadesResposta);
      setMoradores(moradoresResposta);
    } catch (error) {
      setErroCarregamento(
        obterMensagemErro(
          error,
          'Não foi possível carregar os dados da portaria.',
        ),
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarDados(condominioId);
  }, [condominioId]);

  async function cadastrarVisitante(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviandoVisitante) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setEnviandoVisitante(true);

    const payload: CriarVisitanteAdminPayload = {
      nome: visitanteForm.nome.trim(),
    };

    if (visitanteForm.documento.trim()) {
      payload.documento = visitanteForm.documento.trim();
    }

    if (visitanteForm.telefone.trim()) {
      payload.telefone = visitanteForm.telefone.trim();
    }

    if (visitanteForm.observacoes.trim()) {
      payload.observacoes = visitanteForm.observacoes.trim();
    }

    try {
      await apiRequest<AdminVisitante>(
        `/condominios/${condominioId}/portaria/visitantes`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setVisitanteForm({
        nome: '',
        documento: '',
        telefone: '',
        observacoes: '',
      });

      setMensagemSucesso('Visitante cadastrado com sucesso.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível cadastrar o visitante.',
        ),
      );
    } finally {
      setEnviandoVisitante(false);
    }
  }

  async function autorizarVisitante(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviandoAutorizacaoVisitante) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setEnviandoAutorizacaoVisitante(true);

    const payload: CriarAutorizacaoVisitanteAdminPayload = {
      visitanteId: Number(autorizacaoVisitanteForm.visitanteId),
      unidadeId: Number(autorizacaoVisitanteForm.unidadeId),
      inicioEm: new Date(autorizacaoVisitanteForm.inicioEm).toISOString(),
      fimEm: new Date(autorizacaoVisitanteForm.fimEm).toISOString(),
    };

    if (autorizacaoVisitanteForm.moradorId) {
      payload.moradorId = Number(autorizacaoVisitanteForm.moradorId);
    }

    if (autorizacaoVisitanteForm.observacoes.trim()) {
      payload.observacoes = autorizacaoVisitanteForm.observacoes.trim();
    }

    try {
      await apiRequest<AdminAutorizacaoVisitante>(
        `/condominios/${condominioId}/portaria/autorizacoes`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setAutorizacaoVisitanteForm({
        visitanteId: '',
        unidadeId: '',
        moradorId: '',
        inicioEm: '',
        fimEm: '',
        observacoes: '',
      });

      setMensagemSucesso('Autorização de visitante criada.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível criar a autorização do visitante.',
        ),
      );
    } finally {
      setEnviandoAutorizacaoVisitante(false);
    }
  }


  async function cancelarAutorizacaoVisitante(autorizacaoId: number) {
    if (!condominioId || acaoVisitanteId !== null) {
      return;
    }

    const confirmou = window.confirm(
      'Deseja realmente cancelar esta autorização de visitante?',
    );

    if (!confirmou) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoVisitanteId(autorizacaoId);

    try {
      await apiRequest(
        `/condominios/${condominioId}/portaria/autorizacoes/${autorizacaoId}/cancelar`,
        {
          method: 'PATCH',
        },
      );

      setMensagemSucesso('Autorização de visitante cancelada.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível cancelar a autorização do visitante.',
        ),
      );
    } finally {
      setAcaoVisitanteId(null);
    }
  }

  async function registrarEntradaVisitante(autorizacaoId: number) {
    if (!condominioId || acaoVisitanteId !== null) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoVisitanteId(autorizacaoId);

    const payload: RegistrarEntradaAdminPayload = {};

    const observacoes = entradaVisitanteObs[autorizacaoId]?.trim();

    if (observacoes) {
      payload.observacoesEntrada = observacoes;
    }

    try {
      await apiRequest(
        `/condominios/${condominioId}/portaria/autorizacoes/${autorizacaoId}/entrada`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso('Entrada de visitante registrada.');
      setEntradaVisitanteObs((atual) => ({
        ...atual,
        [autorizacaoId]: '',
      }));

      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível registrar a entrada do visitante.',
        ),
      );
    } finally {
      setAcaoVisitanteId(null);
    }
  }

  async function registrarSaidaVisitante(registroId: number) {
    if (!condominioId || acaoAcessoVisitanteId !== null) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoAcessoVisitanteId(registroId);

    const payload: RegistrarSaidaAdminPayload = {};

    const observacoes = saidaVisitanteObs[registroId]?.trim();

    if (observacoes) {
      payload.observacoesSaida = observacoes;
    }

    try {
      await apiRequest(
        `/condominios/${condominioId}/portaria/acessos/${registroId}/saida`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso('Saída de visitante registrada.');
      setSaidaVisitanteObs((atual) => ({
        ...atual,
        [registroId]: '',
      }));

      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível registrar a saída do visitante.',
        ),
      );
    } finally {
      setAcaoAcessoVisitanteId(null);
    }
  }

  async function cadastrarPrestador(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviandoPrestador) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setEnviandoPrestador(true);

    const payload: CriarPrestadorAdminPayload = {
      nome: prestadorForm.nome.trim(),
    };

    if (prestadorForm.empresa.trim()) {
      payload.empresa = prestadorForm.empresa.trim();
    }

    if (prestadorForm.tipoServico.trim()) {
      payload.tipoServico = prestadorForm.tipoServico.trim();
    }

    if (prestadorForm.documento.trim()) {
      payload.documento = prestadorForm.documento.trim();
    }

    if (prestadorForm.telefone.trim()) {
      payload.telefone = prestadorForm.telefone.trim();
    }

    if (prestadorForm.observacoes.trim()) {
      payload.observacoes = prestadorForm.observacoes.trim();
    }

    try {
      await apiRequest<AdminPrestador>(
        `/condominios/${condominioId}/prestadores`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setPrestadorForm({
        nome: '',
        empresa: '',
        tipoServico: '',
        documento: '',
        telefone: '',
        observacoes: '',
      });

      setMensagemSucesso('Prestador cadastrado com sucesso.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível cadastrar o prestador.',
        ),
      );
    } finally {
      setEnviandoPrestador(false);
    }
  }

  async function autorizarPrestador(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviandoAutorizacaoPrestador) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setEnviandoAutorizacaoPrestador(true);

    const payload: CriarAutorizacaoPrestadorAdminPayload = {
      prestadorId: Number(autorizacaoPrestadorForm.prestadorId),
      inicioEm: new Date(autorizacaoPrestadorForm.inicioEm).toISOString(),
      fimEm: new Date(autorizacaoPrestadorForm.fimEm).toISOString(),
    };

    if (autorizacaoPrestadorForm.unidadeId) {
      payload.unidadeId = Number(autorizacaoPrestadorForm.unidadeId);
    }

    if (autorizacaoPrestadorForm.moradorId) {
      payload.moradorId = Number(autorizacaoPrestadorForm.moradorId);
    }

    if (autorizacaoPrestadorForm.observacoes.trim()) {
      payload.observacoes = autorizacaoPrestadorForm.observacoes.trim();
    }

    try {
      await apiRequest<AdminAutorizacaoPrestador>(
        `/condominios/${condominioId}/prestadores/autorizacoes`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setAutorizacaoPrestadorForm({
        prestadorId: '',
        unidadeId: '',
        moradorId: '',
        inicioEm: '',
        fimEm: '',
        observacoes: '',
      });

      setMensagemSucesso('Autorização de prestador criada.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível criar a autorização do prestador.',
        ),
      );
    } finally {
      setEnviandoAutorizacaoPrestador(false);
    }
  }

  async function registrarEntradaPrestador(autorizacaoId: number) {
    if (!condominioId || acaoPrestadorId !== null) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoPrestadorId(autorizacaoId);

    const payload: RegistrarEntradaAdminPayload = {};

    const observacoes = entradaPrestadorObs[autorizacaoId]?.trim();

    if (observacoes) {
      payload.observacoesEntrada = observacoes;
    }

    try {
      await apiRequest(
        `/condominios/${condominioId}/prestadores/autorizacoes/${autorizacaoId}/entrada`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso('Entrada de prestador registrada.');
      setEntradaPrestadorObs((atual) => ({
        ...atual,
        [autorizacaoId]: '',
      }));

      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível registrar a entrada do prestador.',
        ),
      );
    } finally {
      setAcaoPrestadorId(null);
    }
  }

  async function registrarSaidaPrestador(registroId: number) {
    if (!condominioId || acaoAcessoPrestadorId !== null) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoAcessoPrestadorId(registroId);

    const payload: RegistrarSaidaAdminPayload = {};

    const observacoes = saidaPrestadorObs[registroId]?.trim();

    if (observacoes) {
      payload.observacoesSaida = observacoes;
    }

    try {
      await apiRequest(
        `/condominios/${condominioId}/prestadores/acessos/${registroId}/saida`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso('Saída de prestador registrada.');
      setSaidaPrestadorObs((atual) => ({
        ...atual,
        [registroId]: '',
      }));

      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível registrar a saída do prestador.',
        ),
      );
    } finally {
      setAcaoAcessoPrestadorId(null);
    }
  }

  async function cadastrarEncomenda(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviandoEncomenda) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setEnviandoEncomenda(true);

    const payload: CriarEncomendaAdminPayload = {
      unidadeId: Number(encomendaForm.unidadeId),
      descricao: encomendaForm.descricao.trim(),
    };

    if (encomendaForm.moradorId) {
      payload.moradorId = Number(encomendaForm.moradorId);
    }

    if (encomendaForm.remetente.trim()) {
      payload.remetente = encomendaForm.remetente.trim();
    }

    if (encomendaForm.codigoRastreio.trim()) {
      payload.codigoRastreio = encomendaForm.codigoRastreio.trim();
    }

    if (encomendaForm.destinatarioNome.trim()) {
      payload.destinatarioNome = encomendaForm.destinatarioNome.trim();
    }

    if (encomendaForm.observacoes.trim()) {
      payload.observacoes = encomendaForm.observacoes.trim();
    }

    try {
      await apiRequest<AdminEncomendaPortaria>(
        `/condominios/${condominioId}/encomendas`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setEncomendaForm({
        unidadeId: '',
        moradorId: '',
        descricao: '',
        remetente: '',
        codigoRastreio: '',
        destinatarioNome: '',
        observacoes: '',
      });

      setMensagemSucesso('Encomenda registrada com sucesso.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível registrar a encomenda.',
        ),
      );
    } finally {
      setEnviandoEncomenda(false);
    }
  }

  async function retirarEncomenda(encomendaId: number) {
    if (!condominioId || acaoEncomendaId !== null) {
      return;
    }

    const formulario = retiradaEncomendaForm[encomendaId];

    if (!formulario?.retiradoPorNome.trim()) {
      setErroAcao('Informe o nome de quem retirou a encomenda.');
      return;
    }

    const confirmou = window.confirm(
      `Confirmar retirada da encomenda por ${formulario.retiradoPorNome.trim()}?`,
    );

    if (!confirmou) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoEncomendaId(encomendaId);

    const payload: RetirarEncomendaAdminPayload = {
      retiradoPorNome: formulario.retiradoPorNome.trim(),
    };

    if (formulario.observacoesRetirada.trim()) {
      payload.observacoesRetirada = formulario.observacoesRetirada.trim();
    }

    try {
      await apiRequest(
        `/condominios/${condominioId}/encomendas/${encomendaId}/retirar`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso('Retirada de encomenda registrada.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível registrar a retirada da encomenda.',
        ),
      );
    } finally {
      setAcaoEncomendaId(null);
    }
  }

  async function devolverEncomenda(encomendaId: number) {
    if (!condominioId || acaoEncomendaId !== null) {
      return;
    }

    const motivo = devolucaoEncomendaForm[encomendaId]?.trim();

    if (!motivo || motivo.length < 3) {
      setErroAcao('Informe o motivo da devolução.');
      return;
    }

    const confirmou = window.confirm(
      'Confirmar devolução desta encomenda?',
    );

    if (!confirmou) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoEncomendaId(encomendaId);

    const payload: DevolverEncomendaAdminPayload = {
      motivoDevolucao: motivo,
    };

    try {
      await apiRequest(
        `/condominios/${condominioId}/encomendas/${encomendaId}/devolver`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso('Encomenda devolvida com sucesso.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível registrar a devolução da encomenda.',
        ),
      );
    } finally {
      setAcaoEncomendaId(null);
    }
  }

  return (
    <AdminShell
      usuario={usuario}
      condominiosAdministrativos={condominiosAdministrativos}
    >
      <section className="rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Portaria e controle de acesso
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Visitantes, prestadores e encomendas
            </h2>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600 sm:text-base">
              Organize autorizações, registre entradas e saídas e acompanhe
              encomendas recebidas pela portaria.
            </p>
          </div>

          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                Condomínio ativo
              </span>

              <select
                value={condominioId}
                onChange={(event) =>
                  setCondominioId(Number(event.target.value))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                {condominiosAdministrativos.map((vinculo) => (
                  <option
                    key={vinculo.id}
                    value={vinculo.condominio.id}
                  >
                    {vinculo.condominio.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <ResumoPortariaCard
          titulo="Visitantes"
          valor={resumo.visitantes}
          icon={<UsersRound className="h-5 w-5 text-orange-600" />}
        />

        <ResumoPortariaCard
          titulo="Autorizações ativas"
          valor={resumo.autorizacoesVisitantes + resumo.autorizacoesPrestadores}
          icon={<ShieldCheck className="h-5 w-5 text-orange-600" />}
        />

        <ResumoPortariaCard
          titulo="Acessos em aberto"
          valor={resumo.acessosVisitantes + resumo.acessosPrestadores}
          icon={<DoorOpen className="h-5 w-5 text-orange-600" />}
        />

        <ResumoPortariaCard
          titulo="Encomendas recebidas"
          valor={resumo.encomendasRecebidas}
          icon={<PackageCheck className="h-5 w-5 text-orange-600" />}
        />

        <ResumoPortariaCard
          titulo="Encomendas retiradas"
          valor={resumo.encomendasRetiradas}
          icon={<BadgeCheck className="h-5 w-5 text-emerald-700" />}
          variant="success"
        />

        <ResumoPortariaCard
          titulo="Devolvidas"
          valor={resumo.encomendasDevolvidas}
          icon={<RefreshCcw className="h-5 w-5 text-rose-700" />}
          variant="danger"
        />
      </section>

      {carregando ? (
        <section className="mt-6 flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700 shadow-sm">
          <LoaderCircle className="h-5 w-5 animate-spin text-orange-500" />
          Carregando dados da portaria...
        </section>
      ) : null}

      {erroCarregamento ? (
        <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
          <p className="text-sm font-bold">
            Não foi possível carregar os dados.
          </p>
          <p className="mt-2 text-sm leading-6">
            {erroCarregamento}
          </p>
          <button
            type="button"
            onClick={() => void carregarDados(condominioId)}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-2xl bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            <RefreshCcw className="h-4 w-4" />
            Tentar novamente
          </button>
        </section>
      ) : null}

      {erroAcao ? (
        <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800">
          {erroAcao}
        </section>
      ) : null}

      {mensagemSucesso ? (
        <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">
          {mensagemSucesso}
        </section>
      ) : null}

      {!podeOperarPortaria ? (
        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          Seu perfil não possui permissão operacional de portaria neste condomínio.
        </section>
      ) : null}

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Visitantes
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Cadastrar visitante
          </h3>

          {podeOperarPortaria ? (
            <form onSubmit={cadastrarVisitante} className="mt-5 grid gap-4">
              <input
                value={visitanteForm.nome}
                onChange={(event) =>
                  setVisitanteForm((atual) => ({
                    ...atual,
                    nome: event.target.value,
                  }))
                }
                placeholder="Nome completo"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                required
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  value={visitanteForm.documento}
                  onChange={(event) =>
                    setVisitanteForm((atual) => ({
                      ...atual,
                      documento: event.target.value,
                    }))
                  }
                  placeholder="Documento"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                <input
                  value={visitanteForm.telefone}
                  onChange={(event) =>
                    setVisitanteForm((atual) => ({
                      ...atual,
                      telefone: event.target.value,
                    }))
                  }
                  placeholder="Telefone"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <input
                value={visitanteForm.observacoes}
                onChange={(event) =>
                  setVisitanteForm((atual) => ({
                    ...atual,
                    observacoes: event.target.value,
                  }))
                }
                placeholder="Observações"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <button
                type="submit"
                disabled={enviandoVisitante}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                <UserRoundPlus className="h-4 w-4" />
                {enviandoVisitante ? 'Salvando...' : 'Cadastrar visitante'}
              </button>
            </form>
          ) : null}

          <div className="mt-6 grid gap-3">
            {visitantes.map((visitante) => (
              <div
                key={visitante.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="font-bold text-slate-950">{visitante.nome}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {visitante.documento || 'Sem documento'}
                  {visitante.telefone ? ` • ${visitante.telefone}` : ''}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Autorização de visitante
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Liberar acesso
          </h3>

          {podeOperarPortaria ? (
            <form onSubmit={autorizarVisitante} className="mt-5 grid gap-4">
              <select
                value={autorizacaoVisitanteForm.visitanteId}
                onChange={(event) =>
                  setAutorizacaoVisitanteForm((atual) => ({
                    ...atual,
                    visitanteId: event.target.value,
                  }))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                required
              >
                <option value="">Selecione o visitante</option>
                {visitantes.map((visitante) => (
                  <option key={visitante.id} value={visitante.id}>
                    {visitante.nome}
                  </option>
                ))}
              </select>

              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  value={autorizacaoVisitanteForm.unidadeId}
                  onChange={(event) =>
                    setAutorizacaoVisitanteForm((atual) => ({
                      ...atual,
                      unidadeId: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                >
                  <option value="">Unidade</option>
                  {unidades.map((unidade) => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.identificador}
                    </option>
                  ))}
                </select>

                <select
                  value={autorizacaoVisitanteForm.moradorId}
                  onChange={(event) =>
                    setAutorizacaoVisitanteForm((atual) => ({
                      ...atual,
                      moradorId: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Morador opcional</option>
                  {moradores.map((morador) => (
                    <option key={morador.id} value={morador.id}>
                      {morador.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="datetime-local"
                  value={autorizacaoVisitanteForm.inicioEm}
                  onChange={(event) =>
                    setAutorizacaoVisitanteForm((atual) => ({
                      ...atual,
                      inicioEm: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                />

                <input
                  type="datetime-local"
                  value={autorizacaoVisitanteForm.fimEm}
                  onChange={(event) =>
                    setAutorizacaoVisitanteForm((atual) => ({
                      ...atual,
                      fimEm: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                />
              </div>

              <input
                value={autorizacaoVisitanteForm.observacoes}
                onChange={(event) =>
                  setAutorizacaoVisitanteForm((atual) => ({
                    ...atual,
                    observacoes: event.target.value,
                  }))
                }
                placeholder="Observações"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <button
                type="submit"
                disabled={enviandoAutorizacaoVisitante}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <BadgeCheck className="h-4 w-4" />
                {enviandoAutorizacaoVisitante
                  ? 'Salvando...'
                  : 'Criar autorização'}
              </button>
            </form>
          ) : null}
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Visitantes autorizados
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Autorizações ativas
          </h3>

          <div className="mt-5 grid gap-4">
            {autorizacoesVisitantes.map((autorizacao) => {
              const podeRegistrarEntrada = autorizacaoVisitanteVigente(
                autorizacao.status,
                autorizacao.inicioEm,
                autorizacao.fimEm,
              );
              const podeCancelar = autorizacaoVisitanteCancelavel(
                autorizacao.status,
                autorizacao.fimEm,
              );

              return (
                <div
                  key={autorizacao.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-950">
                        {autorizacao.visitante.nome}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {autorizacao.unidade.identificador} • até{' '}
                        {formatarData(autorizacao.fimEm)}
                      </p>
                      {autorizacao.morador ? (
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Morador: {autorizacao.morador.nome}
                        </p>
                      ) : null}
                    </div>

                    <AutorizacaoVisitanteStatusBadge
                      status={autorizacao.status}
                      fimEm={autorizacao.fimEm}
                    />
                  </div>

                  {podeRegistrarEntrada ? (
                    <>
                      <input
                        value={entradaVisitanteObs[autorizacao.id] ?? ''}
                        onChange={(event) =>
                          setEntradaVisitanteObs((atual) => ({
                            ...atual,
                            [autorizacao.id]: event.target.value,
                          }))
                        }
                        placeholder="Observações de entrada"
                        className="mt-3 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          void registrarEntradaVisitante(autorizacao.id)
                        }
                        disabled={acaoVisitanteId === autorizacao.id}
                        className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                      >
                        Registrar entrada
                      </button>
                    </>
                  ) : (
                    <p className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600">
                      Entrada disponível apenas dentro do período autorizado.
                    </p>
                  )}

                  {podeCancelar ? (
                    <button
                      type="button"
                      onClick={() =>
                        void cancelarAutorizacaoVisitante(autorizacao.id)
                      }
                      disabled={acaoVisitanteId === autorizacao.id}
                      className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-700 disabled:opacity-60"
                    >
                      Cancelar autorização
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Visitantes no condomínio
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Acessos em aberto
          </h3>

          <div className="mt-5 grid gap-4">
            {acessosVisitantes.map((acesso) => (
              <div
                key={acesso.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="font-bold text-slate-950">
                  {acesso.visitante.nome}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Entrada em {formatarData(acesso.entradaEm)} •{' '}
                  {acesso.unidade.identificador}
                </p>

                <input
                  value={saidaVisitanteObs[acesso.id] ?? ''}
                  onChange={(event) =>
                    setSaidaVisitanteObs((atual) => ({
                      ...atual,
                      [acesso.id]: event.target.value,
                    }))
                  }
                  placeholder="Observações de saída"
                  className="mt-3 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                <button
                  type="button"
                  onClick={() => void registrarSaidaVisitante(acesso.id)}
                  disabled={acaoAcessoVisitanteId === acesso.id}
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  Registrar saída
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Prestadores
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Cadastrar prestador
          </h3>

          {podeOperarPortaria ? (
            <form onSubmit={cadastrarPrestador} className="mt-5 grid gap-4">
              <input
                value={prestadorForm.nome}
                onChange={(event) =>
                  setPrestadorForm((atual) => ({
                    ...atual,
                    nome: event.target.value,
                  }))
                }
                placeholder="Nome"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                required
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  value={prestadorForm.empresa}
                  onChange={(event) =>
                    setPrestadorForm((atual) => ({
                      ...atual,
                      empresa: event.target.value,
                    }))
                  }
                  placeholder="Empresa"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                <input
                  value={prestadorForm.tipoServico}
                  onChange={(event) =>
                    setPrestadorForm((atual) => ({
                      ...atual,
                      tipoServico: event.target.value,
                    }))
                  }
                  placeholder="Tipo de serviço"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  value={prestadorForm.documento}
                  onChange={(event) =>
                    setPrestadorForm((atual) => ({
                      ...atual,
                      documento: event.target.value,
                    }))
                  }
                  placeholder="Documento"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                <input
                  value={prestadorForm.telefone}
                  onChange={(event) =>
                    setPrestadorForm((atual) => ({
                      ...atual,
                      telefone: event.target.value,
                    }))
                  }
                  placeholder="Telefone"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <input
                value={prestadorForm.observacoes}
                onChange={(event) =>
                  setPrestadorForm((atual) => ({
                    ...atual,
                    observacoes: event.target.value,
                  }))
                }
                placeholder="Observações"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <button
                type="submit"
                disabled={enviandoPrestador}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                <BriefcaseBusiness className="h-4 w-4" />
                {enviandoPrestador ? 'Salvando...' : 'Cadastrar prestador'}
              </button>
            </form>
          ) : null}
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Autorização de prestador
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Liberar serviço
          </h3>

          {podeAutorizarPrestador ? (
            <form onSubmit={autorizarPrestador} className="mt-5 grid gap-4">
              <select
                value={autorizacaoPrestadorForm.prestadorId}
                onChange={(event) =>
                  setAutorizacaoPrestadorForm((atual) => ({
                    ...atual,
                    prestadorId: event.target.value,
                  }))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                required
              >
                <option value="">Selecione o prestador</option>
                {prestadores.map((prestador) => (
                  <option key={prestador.id} value={prestador.id}>
                    {prestador.nome}
                  </option>
                ))}
              </select>

              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  value={autorizacaoPrestadorForm.unidadeId}
                  onChange={(event) =>
                    setAutorizacaoPrestadorForm((atual) => ({
                      ...atual,
                      unidadeId: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Unidade opcional</option>
                  {unidades.map((unidade) => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.identificador}
                    </option>
                  ))}
                </select>

                <select
                  value={autorizacaoPrestadorForm.moradorId}
                  onChange={(event) =>
                    setAutorizacaoPrestadorForm((atual) => ({
                      ...atual,
                      moradorId: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Morador opcional</option>
                  {moradores.map((morador) => (
                    <option key={morador.id} value={morador.id}>
                      {morador.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="datetime-local"
                  value={autorizacaoPrestadorForm.inicioEm}
                  onChange={(event) =>
                    setAutorizacaoPrestadorForm((atual) => ({
                      ...atual,
                      inicioEm: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                />

                <input
                  type="datetime-local"
                  value={autorizacaoPrestadorForm.fimEm}
                  onChange={(event) =>
                    setAutorizacaoPrestadorForm((atual) => ({
                      ...atual,
                      fimEm: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                />
              </div>

              <input
                value={autorizacaoPrestadorForm.observacoes}
                onChange={(event) =>
                  setAutorizacaoPrestadorForm((atual) => ({
                    ...atual,
                    observacoes: event.target.value,
                  }))
                }
                placeholder="Observações"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <button
                type="submit"
                disabled={enviandoAutorizacaoPrestador}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <BadgeCheck className="h-4 w-4" />
                {enviandoAutorizacaoPrestador
                  ? 'Salvando...'
                  : 'Criar autorização'}
              </button>
            </form>
          ) : (
            <p className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              A autorização de prestadores está liberada para Administrador,
              Síndico e Super Admin.
            </p>
          )}
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Prestadores autorizados
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Entradas disponíveis
          </h3>

          <div className="mt-5 grid gap-4">
            {autorizacoesPrestadores.map((autorizacao) => (
              <div
                key={autorizacao.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="font-bold text-slate-950">
                  {autorizacao.prestador.nome}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {autorizacao.prestador.empresa || 'Sem empresa'} • até{' '}
                  {formatarData(autorizacao.fimEm)}
                </p>

                <input
                  value={entradaPrestadorObs[autorizacao.id] ?? ''}
                  onChange={(event) =>
                    setEntradaPrestadorObs((atual) => ({
                      ...atual,
                      [autorizacao.id]: event.target.value,
                    }))
                  }
                  placeholder="Observações de entrada"
                  className="mt-3 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    void registrarEntradaPrestador(autorizacao.id)
                  }
                  disabled={acaoPrestadorId === autorizacao.id}
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                >
                  Registrar entrada
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Prestadores no condomínio
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Acessos em aberto
          </h3>

          <div className="mt-5 grid gap-4">
            {acessosPrestadores.map((acesso) => (
              <div
                key={acesso.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="font-bold text-slate-950">
                  {acesso.prestador.nome}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Entrada em {formatarData(acesso.entradaEm)}
                </p>

                <input
                  value={saidaPrestadorObs[acesso.id] ?? ''}
                  onChange={(event) =>
                    setSaidaPrestadorObs((atual) => ({
                      ...atual,
                      [acesso.id]: event.target.value,
                    }))
                  }
                  placeholder="Observações de saída"
                  className="mt-3 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                <button
                  type="button"
                  onClick={() => void registrarSaidaPrestador(acesso.id)}
                  disabled={acaoAcessoPrestadorId === acesso.id}
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  Registrar saída
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Encomendas
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Registrar recebimento
          </h3>

          {podeOperarPortaria ? (
            <form onSubmit={cadastrarEncomenda} className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  value={encomendaForm.unidadeId}
                  onChange={(event) =>
                    setEncomendaForm((atual) => ({
                      ...atual,
                      unidadeId: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                >
                  <option value="">Unidade</option>
                  {unidades.map((unidade) => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.identificador}
                    </option>
                  ))}
                </select>

                <select
                  value={encomendaForm.moradorId}
                  onChange={(event) =>
                    setEncomendaForm((atual) => ({
                      ...atual,
                      moradorId: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Morador opcional</option>
                  {moradores.map((morador) => (
                    <option key={morador.id} value={morador.id}>
                      {morador.nome}
                    </option>
                  ))}
                </select>
              </div>

              <input
                value={encomendaForm.descricao}
                onChange={(event) =>
                  setEncomendaForm((atual) => ({
                    ...atual,
                    descricao: event.target.value,
                  }))
                }
                placeholder="Descrição da encomenda"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                required
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  value={encomendaForm.remetente}
                  onChange={(event) =>
                    setEncomendaForm((atual) => ({
                      ...atual,
                      remetente: event.target.value,
                    }))
                  }
                  placeholder="Remetente"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                <input
                  value={encomendaForm.codigoRastreio}
                  onChange={(event) =>
                    setEncomendaForm((atual) => ({
                      ...atual,
                      codigoRastreio: event.target.value,
                    }))
                  }
                  placeholder="Código de rastreio"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <input
                value={encomendaForm.destinatarioNome}
                onChange={(event) =>
                  setEncomendaForm((atual) => ({
                    ...atual,
                    destinatarioNome: event.target.value,
                  }))
                }
                placeholder="Destinatário"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <input
                value={encomendaForm.observacoes}
                onChange={(event) =>
                  setEncomendaForm((atual) => ({
                    ...atual,
                    observacoes: event.target.value,
                  }))
                }
                placeholder="Observações"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <button
                type="submit"
                disabled={enviandoEncomenda}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                <Truck className="h-4 w-4" />
                {enviandoEncomenda ? 'Salvando...' : 'Registrar encomenda'}
              </button>
            </form>
          ) : null}
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Encomendas recebidas
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Retirada ou devolução
          </h3>

          <div className="mt-5 grid gap-4">
            {encomendasRecebidas.map((encomenda) => {
              const retirada = retiradaEncomendaForm[encomenda.id] ?? {
                retiradoPorNome: '',
                observacoesRetirada: '',
              };

              return (
                <div
                  key={encomenda.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-bold text-slate-950">
                    {encomenda.descricao}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {encomenda.unidade.identificador} • recebida em{' '}
                    {formatarData(encomenda.recebidoEm)}
                  </p>

                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                    <p>
                      <strong>Destinatário:</strong>{' '}
                      {encomenda.morador?.nome ??
                        encomenda.destinatarioNome ??
                        'Não informado'}
                    </p>
                    {encomenda.remetente ? (
                      <p>
                        <strong>Remetente:</strong> {encomenda.remetente}
                      </p>
                    ) : null}
                    {encomenda.codigoRastreio ? (
                      <p>
                        <strong>Rastreio:</strong> {encomenda.codigoRastreio}
                      </p>
                    ) : null}
                    {encomenda.recebidoPorUsuario ? (
                      <p>
                        <strong>Recebida por:</strong>{' '}
                        {encomenda.recebidoPorUsuario.nome}
                      </p>
                    ) : null}
                  </div>

                  <input
                    value={retirada.retiradoPorNome}
                    onChange={(event) =>
                      setRetiradaEncomendaForm((atual) => ({
                        ...atual,
                        [encomenda.id]: {
                          ...retirada,
                          retiradoPorNome: event.target.value,
                        },
                      }))
                    }
                    placeholder="Nome de quem retirou"
                    className="mt-3 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />

                  <input
                    value={retirada.observacoesRetirada}
                    onChange={(event) =>
                      setRetiradaEncomendaForm((atual) => ({
                        ...atual,
                        [encomenda.id]: {
                          ...retirada,
                          observacoesRetirada: event.target.value,
                        },
                      }))
                    }
                    placeholder="Observações da retirada"
                    className="mt-3 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />

                  <button
                    type="button"
                    onClick={() => void retirarEncomenda(encomenda.id)}
                    disabled={acaoEncomendaId === encomenda.id}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                  >
                    Registrar retirada
                  </button>

                  <input
                    value={devolucaoEncomendaForm[encomenda.id] ?? ''}
                    onChange={(event) =>
                      setDevolucaoEncomendaForm((atual) => ({
                        ...atual,
                        [encomenda.id]: event.target.value,
                      }))
                    }
                    placeholder="Motivo da devolução"
                    className="mt-4 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />

                  <button
                    type="button"
                    onClick={() => void devolverEncomenda(encomenda.id)}
                    disabled={acaoEncomendaId === encomenda.id}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-60"
                  >
                    Registrar devolução
                  </button>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
          Histórico de encomendas
        </p>
        <h3 className="mt-2 text-2xl font-bold text-slate-950">
          Retiradas e devoluções recentes
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Consulte as baixas mais recentes registradas pela portaria, com responsável,
          data, observação e motivo de devolução quando houver.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {encomendasFinalizadasRecentes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-600">
              Nenhuma retirada ou devolução registrada ainda.
            </div>
          ) : (
            encomendasFinalizadasRecentes.map((encomenda) => (
              <article
                key={encomenda.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <EncomendaStatusBadge status={encomenda.status} />
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                    {encomenda.unidade.identificador}
                  </span>
                </div>

                <p className="mt-3 font-bold text-slate-950">
                  {encomenda.descricao}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Recebida em {formatarData(encomenda.recebidoEm)}
                </p>

                {encomenda.status === 'RETIRADA' ? (
                  <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
                    <p>
                      <strong>Retirada em:</strong> {formatarData(encomenda.retiradoEm)}
                    </p>
                    <p>
                      <strong>Retirada por:</strong>{' '}
                      {encomenda.retiradoPorNome ?? 'Não informado'}
                    </p>
                    {encomenda.observacoesRetirada ? (
                      <p>
                        <strong>Observações:</strong>{' '}
                        {encomenda.observacoesRetirada}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {encomenda.status === 'DEVOLVIDA' ? (
                  <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm leading-6 text-rose-900">
                    <p>
                      <strong>Devolvida em:</strong> {formatarData(encomenda.devolvidoEm)}
                    </p>
                    <p>
                      <strong>Motivo:</strong>{' '}
                      {encomenda.motivoDevolucao ?? 'Não informado'}
                    </p>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </AdminShell>
  );
}
