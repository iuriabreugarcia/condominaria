import {
  Archive,
  BellRing,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  Megaphone,
  RefreshCcw,
  Send,
  TriangleAlert,
} from 'lucide-react';
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AdminShell } from '../components/AdminShell';
import { useAdminRouteContext } from '../components/AdminProtectedRoute';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  apiRequest,
  ApiError,
} from '../lib/api';
import type {
  AdminComunicado,
  AdminComunicadoLeiturasResponse,
  AdminOcorrencia,
  AtualizarStatusOcorrenciaAdminPayload,
  CriarComunicadoAdminPayload,
  PrioridadeComunicadoAdmin,
  StatusOcorrenciaAdmin,
} from '../types/api';

const papeisPublicacaoComunicado = new Set([
  'ADMINISTRADOR',
  'SINDICO',
]);

const prioridadesComunicado: Array<{
  value: PrioridadeComunicadoAdmin;
  label: string;
}> = [
  { value: 'BAIXA', label: 'Baixa' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente' },
];

const statusOcorrenciaOpcoes: Array<{
  value: StatusOcorrenciaAdmin;
  label: string;
}> = [
  { value: 'ABERTA', label: 'Aberta' },
  { value: 'EM_ANALISE', label: 'Em análise' },
  { value: 'RESOLVIDA', label: 'Resolvida' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

function mensagemErro(error: unknown, fallback: string) {
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
    normalizada.includes('prismaclient') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('cannot read properties')
  ) {
    return 'Não foi possível concluir a solicitação agora. Verifique a estrutura do sistema ou tente novamente em instantes.';
  }

  if (
    normalizada.includes('failed to fetch') ||
    normalizada.includes('networkerror') ||
    normalizada.includes('network request failed')
  ) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
  }

  if (normalizada.includes('unauthorized') || normalizada.includes('401')) {
    return 'Sua sessão expirou. Faça login novamente para continuar.';
  }

  if (normalizada.includes('forbidden') || normalizada.includes('403')) {
    return 'Você não tem permissão para executar esta ação.';
  }

  return mensagem.trim() || fallback;
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

function rotuloStatusOcorrencia(status: StatusOcorrenciaAdmin) {
  const opcao = statusOcorrenciaOpcoes.find((item) => item.value === status);
  return opcao?.label ?? status;
}

function rotuloPrioridade(valor: string) {
  switch (valor) {
    case 'BAIXA':
      return 'Baixa';
    case 'NORMAL':
      return 'Normal';
    case 'MEDIA':
      return 'Média';
    case 'ALTA':
      return 'Alta';
    case 'URGENTE':
      return 'Urgente';
    default:
      return valor;
  }
}


function normalizarCodigo(valor: string | null | undefined) {
  return String(valor ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

function badgeClasses(variant: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'orange') {
  const base =
    'inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.08em]';

  const variants = {
    neutral: 'border-slate-200 bg-white text-slate-700 shadow-sm',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-rose-200 bg-rose-50 text-rose-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    orange: 'border-orange-200 bg-orange-50 text-orange-800',
  };

  return `${base} ${variants[variant]}`;
}

function ComunicadoStatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const normalizado = normalizarCodigo(status);

  const labels: Record<string, string> = {
    RASCUNHO: 'Rascunho',
    PUBLICADO: 'Publicado',
    ARQUIVADO: 'Arquivado',
  };

  const variants: Record<string, 'neutral' | 'success' | 'warning'> = {
    RASCUNHO: 'warning',
    PUBLICADO: 'success',
    ARQUIVADO: 'neutral',
  };

  return (
    <span className={badgeClasses(variants[normalizado] ?? 'neutral')}>
      {labels[normalizado] ?? String(status ?? '-')}
    </span>
  );
}

function PrioridadeBadge({
  prioridade,
}: {
  prioridade: string | null | undefined;
}) {
  const normalizada = normalizarCodigo(prioridade);

  const variants: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'orange'> = {
    BAIXA: 'success',
    NORMAL: 'neutral',
    MEDIA: 'info',
    ALTA: 'warning',
    URGENTE: 'danger',
  };

  const variant =
    normalizada === 'MEDIA'
      ? 'info'
      : variants[normalizada] ?? 'neutral';

  return (
    <span className={badgeClasses(variant)}>
      {rotuloPrioridade(normalizada)}
    </span>
  );
}

function OcorrenciaStatusBadge({
  status,
}: {
  status: StatusOcorrenciaAdmin;
}) {
  const normalizado = normalizarCodigo(status);

  const variants: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'neutral'> = {
    ABERTA: 'warning',
    EM_ANALISE: 'info',
    RESOLVIDA: 'success',
    CANCELADA: 'danger',
  };

  return (
    <span className={badgeClasses(variants[normalizado] ?? 'neutral')}>
      {rotuloStatusOcorrencia(status)}
    </span>
  );
}

function LeituraStatusBadge({
  lida,
  lidoEm,
}: {
  lida: boolean;
  lidoEm?: string | null;
}) {
  return (
    <span className={badgeClasses(lida ? 'success' : 'warning')}>
      {lida && lidoEm ? `Lido em ${formatarData(lidoEm)}` : 'Não lido'}
    </span>
  );
}

function ResumoComunicacaoCard({
  titulo,
  valor,
  detalhe,
  icon,
  variant = 'neutral',
}: {
  titulo: string;
  valor: number;
  detalhe: string;
  icon: ReactNode;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'orange';
}) {
  const variants = {
    neutral: 'border-slate-200 bg-white text-slate-700',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-100 bg-amber-50 text-amber-800',
    danger: 'border-rose-100 bg-rose-50 text-rose-800',
    info: 'border-sky-100 bg-sky-50 text-sky-800',
    orange: 'border-orange-100 bg-orange-50 text-orange-800',
  };

  return (
    <article className={`rounded-3xl border p-5 shadow-sm ${variants[variant]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-current/80">
            {titulo}
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            {valor}
          </p>
        </div>

        <div className="rounded-2xl bg-white/80 p-2 text-current shadow-sm">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs font-bold leading-relaxed text-current/70">
        {detalhe}
      </p>
    </article>
  );
}

export function AdminComunicacaoPage() {
  usePageTitle('Comunicação Administrativa');

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
  const [comunicados, setComunicados] = useState<AdminComunicado[]>([]);
  const [ocorrencias, setOcorrencias] = useState<AdminOcorrencia[]>([]);

  const [carregando, setCarregando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState('');
  const [erroAcao, setErroAcao] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const [enviandoComunicado, setEnviandoComunicado] = useState(false);
  const [acaoComunicadoId, setAcaoComunicadoId] = useState<number | null>(null);
  const [acaoOcorrenciaId, setAcaoOcorrenciaId] = useState<number | null>(null);
  const [leiturasComunicado, setLeiturasComunicado] =
    useState<AdminComunicadoLeiturasResponse | null>(null);
  const [carregandoLeiturasComunicadoId, setCarregandoLeiturasComunicadoId] =
    useState<number | null>(null);

  const [comunicadoForm, setComunicadoForm] = useState({
    titulo: '',
    conteudo: '',
    categoria: '',
    prioridade: 'NORMAL' as PrioridadeComunicadoAdmin,
    destaque: false,
    expiraEm: '',
  });

  const [statusOcorrenciaForm, setStatusOcorrenciaForm] = useState<Record<
    number,
    {
      status: StatusOcorrenciaAdmin;
      observacao: string;
    }
  >>({});

  const condominioSelecionado =
    condominiosAdministrativos.find(
      (vinculo) => vinculo.condominio.id === condominioId,
    ) ?? null;

  const podePublicarComunicado =
    usuario.superAdmin ||
    Boolean(
      condominioSelecionado &&
        papeisPublicacaoComunicado.has(condominioSelecionado.papel),
    );

  const resumo = useMemo(() => {
    const comunicadosPublicados = comunicados.filter(
      (item) => item.status === 'PUBLICADO',
    ).length;

    const ocorrenciasAbertas = ocorrencias.filter(
      (item) => item.status === 'ABERTA',
    ).length;

    const ocorrenciasAnalise = ocorrencias.filter(
      (item) => item.status === 'EM_ANALISE',
    ).length;

    const leiturasTotais = comunicados.reduce(
      (total, item) => total + (item.leituraResumo?.totalLidas ?? 0),
      0,
    );

    const leiturasPendentes = comunicados.reduce(
      (total, item) => total + (item.leituraResumo?.totalPendentes ?? 0),
      0,
    );

    return {
      comunicados: comunicados.length,
      comunicadosPublicados,
      leiturasTotais,
      leiturasPendentes,
      ocorrencias: ocorrencias.length,
      ocorrenciasPendentes: ocorrenciasAbertas + ocorrenciasAnalise,
    };
  }, [comunicados, ocorrencias]);

  async function carregarDados(id: number) {
    if (!id) {
      return;
    }

    setCarregando(true);
    setErroCarregamento('');

    try {
      const [
        comunicadosResposta,
        ocorrenciasResposta,
      ] = await Promise.all([
        apiRequest<AdminComunicado[]>(
          `/condominios/${id}/comunicados`,
        ),
        apiRequest<AdminOcorrencia[]>(
          `/condominios/${id}/ocorrencias`,
        ),
      ]);

      setComunicados(comunicadosResposta);
      setOcorrencias(ocorrenciasResposta);

      const novosStatus: Record<
        number,
        {
          status: StatusOcorrenciaAdmin;
          observacao: string;
        }
      > = {};

      for (const ocorrencia of ocorrenciasResposta) {
        novosStatus[ocorrencia.id] = {
          status: ocorrencia.status,
          observacao: '',
        };
      }

      setStatusOcorrenciaForm(novosStatus);
    } catch (error) {
      setErroCarregamento(
        mensagemErro(
          error,
          'Não foi possível carregar comunicados e ocorrências.',
        ),
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarDados(condominioId);
  }, [condominioId]);

  async function cadastrarComunicado(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviandoComunicado) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setEnviandoComunicado(true);

    const payload: CriarComunicadoAdminPayload = {
      titulo: comunicadoForm.titulo.trim(),
      conteudo: comunicadoForm.conteudo.trim(),
      prioridade: comunicadoForm.prioridade,
      destaque: comunicadoForm.destaque,
    };

    if (comunicadoForm.categoria.trim()) {
      payload.categoria = comunicadoForm.categoria.trim();
    }

    if (comunicadoForm.expiraEm) {
      payload.expiraEm = new Date(comunicadoForm.expiraEm).toISOString();
    }

    try {
      await apiRequest<AdminComunicado>(
        `/condominios/${condominioId}/comunicados`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setComunicadoForm({
        titulo: '',
        conteudo: '',
        categoria: '',
        prioridade: 'NORMAL',
        destaque: false,
        expiraEm: '',
      });

      setMensagemSucesso('Comunicado cadastrado em rascunho.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        mensagemErro(
          error,
          'Não foi possível cadastrar o comunicado.',
        ),
      );
    } finally {
      setEnviandoComunicado(false);
    }
  }

  async function publicarComunicado(comunicadoId: number) {
    if (!condominioId || acaoComunicadoId !== null) {
      return;
    }

    const comunicado = comunicados.find((item) => item.id === comunicadoId);
    const confirmar = window.confirm(
      `Publicar o comunicado "${comunicado?.titulo ?? comunicadoId}" para os moradores?`,
    );

    if (!confirmar) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoComunicadoId(comunicadoId);

    try {
      await apiRequest(
        `/condominios/${condominioId}/comunicados/${comunicadoId}/publicar`,
        {
          method: 'PATCH',
        },
      );

      setMensagemSucesso('Comunicado publicado com sucesso.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        mensagemErro(
          error,
          'Não foi possível publicar o comunicado.',
        ),
      );
    } finally {
      setAcaoComunicadoId(null);
    }
  }

  async function arquivarComunicado(comunicadoId: number) {
    if (!condominioId || acaoComunicadoId !== null) {
      return;
    }

    const comunicado = comunicados.find((item) => item.id === comunicadoId);
    const confirmar = window.confirm(
      `Arquivar o comunicado "${comunicado?.titulo ?? comunicadoId}"?`,
    );

    if (!confirmar) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoComunicadoId(comunicadoId);

    try {
      await apiRequest(
        `/condominios/${condominioId}/comunicados/${comunicadoId}/arquivar`,
        {
          method: 'PATCH',
        },
      );

      setMensagemSucesso('Comunicado arquivado com sucesso.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        mensagemErro(
          error,
          'Não foi possível arquivar o comunicado.',
        ),
      );
    } finally {
      setAcaoComunicadoId(null);
    }
  }

  async function carregarLeiturasComunicado(comunicadoId: number) {
    if (!condominioId || carregandoLeiturasComunicadoId !== null) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setCarregandoLeiturasComunicadoId(comunicadoId);

    try {
      const resposta = await apiRequest<AdminComunicadoLeiturasResponse>(
        `/condominios/${condominioId}/comunicados/${comunicadoId}/leituras`,
      );

      setLeiturasComunicado(resposta);
    } catch (error) {
      setErroAcao(
        mensagemErro(
          error,
          'Não foi possível carregar as confirmações de leitura.',
        ),
      );
    } finally {
      setCarregandoLeiturasComunicadoId(null);
    }
  }

  async function atualizarStatusOcorrencia(
    ocorrenciaId: number,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!condominioId || acaoOcorrenciaId !== null) {
      return;
    }

    const formulario = statusOcorrenciaForm[ocorrenciaId];

    if (!formulario) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoOcorrenciaId(ocorrenciaId);

    const payload: AtualizarStatusOcorrenciaAdminPayload = {
      status: formulario.status,
    };

    if (formulario.observacao.trim()) {
      payload.observacao = formulario.observacao.trim();
    }

    const ocorrencia = ocorrencias.find((item) => item.id === ocorrenciaId);
    const confirmar = window.confirm(
      `Alterar a ocorrência "${ocorrencia?.titulo ?? ocorrenciaId}" para ${rotuloStatusOcorrencia(payload.status)}?`,
    );

    if (!confirmar) {
      setAcaoOcorrenciaId(null);
      return;
    }

    try {
      await apiRequest(
        `/condominios/${condominioId}/ocorrencias/${ocorrenciaId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso('Status da ocorrência atualizado.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        mensagemErro(
          error,
          'Não foi possível atualizar o status da ocorrência.',
        ),
      );
    } finally {
      setAcaoOcorrenciaId(null);
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
              Comunicação e atendimento
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Comunicados e ocorrências
            </h2>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600 sm:text-base">
              Publique avisos do condomínio e acompanhe as ocorrências
              registradas pelos moradores ou pela equipe interna.
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
        <ResumoComunicacaoCard
          titulo="Comunicados"
          valor={resumo.comunicados}
          detalhe="Total de avisos cadastrados"
          icon={<Megaphone className="h-5 w-5" />}
          variant="orange"
        />

        <ResumoComunicacaoCard
          titulo="Publicados"
          valor={resumo.comunicadosPublicados}
          detalhe="Disponíveis para moradores"
          icon={<BellRing className="h-5 w-5" />}
          variant="info"
        />

        <ResumoComunicacaoCard
          titulo="Leituras"
          valor={resumo.leiturasTotais}
          detalhe="Confirmações registradas"
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="success"
        />

        <ResumoComunicacaoCard
          titulo="Pendentes"
          valor={resumo.leiturasPendentes}
          detalhe="Leituras ainda não confirmadas"
          icon={<TriangleAlert className="h-5 w-5" />}
          variant="warning"
        />

        <ResumoComunicacaoCard
          titulo="Ocorrências"
          valor={resumo.ocorrencias}
          detalhe="Registros de atendimento"
          icon={<ClipboardList className="h-5 w-5" />}
          variant="neutral"
        />

        <ResumoComunicacaoCard
          titulo="Em aberto"
          valor={resumo.ocorrenciasPendentes}
          detalhe="Ocorrências pendentes de conclusão"
          icon={<TriangleAlert className="h-5 w-5" />}
          variant="danger"
        />
      </section>

      {carregando ? (
        <section className="mt-6 flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700 shadow-sm">
          <LoaderCircle className="h-5 w-5 animate-spin text-orange-500" />
          Carregando comunicação...
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

      <section className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Novo comunicado
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Criar aviso
          </h3>

          {podePublicarComunicado ? (
            <form
              onSubmit={cadastrarComunicado}
              className="mt-5 grid gap-4"
            >
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Título
                </span>
                <input
                  value={comunicadoForm.titulo}
                  onChange={(event) =>
                    setComunicadoForm((atual) => ({
                      ...atual,
                      titulo: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Ex.: Manutenção do elevador"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Conteúdo
                </span>
                <textarea
                  value={comunicadoForm.conteudo}
                  onChange={(event) =>
                    setComunicadoForm((atual) => ({
                      ...atual,
                      conteudo: event.target.value,
                    }))
                  }
                  className="min-h-36 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Escreva o comunicado..."
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Categoria
                  </span>
                  <input
                    value={comunicadoForm.categoria}
                    onChange={(event) =>
                      setComunicadoForm((atual) => ({
                        ...atual,
                        categoria: event.target.value,
                      }))
                    }
                    className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="Opcional"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Prioridade
                  </span>
                  <select
                    value={comunicadoForm.prioridade}
                    onChange={(event) =>
                      setComunicadoForm((atual) => ({
                        ...atual,
                        prioridade:
                          event.target.value as PrioridadeComunicadoAdmin,
                      }))
                    }
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    {prioridadesComunicado.map((prioridade) => (
                      <option
                        key={prioridade.value}
                        value={prioridade.value}
                      >
                        {prioridade.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Expiração
                </span>
                <input
                  type="datetime-local"
                  value={comunicadoForm.expiraEm}
                  onChange={(event) =>
                    setComunicadoForm((atual) => ({
                      ...atual,
                      expiraEm: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={comunicadoForm.destaque}
                  onChange={(event) =>
                    setComunicadoForm((atual) => ({
                      ...atual,
                      destaque: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                />
                <span className="text-sm font-semibold text-slate-800">
                  Marcar como destaque
                </span>
              </label>

              <button
                type="submit"
                disabled={enviandoComunicado}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {enviandoComunicado
                  ? 'Salvando...'
                  : 'Salvar comunicado'}
              </button>
            </form>
          ) : (
            <p className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Seu perfil pode consultar comunicados, mas não pode criá-los.
            </p>
          )}
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Comunicados cadastrados
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Publicações
          </h3>

          <div className="mt-5 grid gap-4">
            {comunicados.map((comunicado) => (
              <div
                key={comunicado.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-slate-950">
                      {comunicado.titulo}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <PrioridadeBadge prioridade={comunicado.prioridade} />
                      {comunicado.categoria ? (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                          {comunicado.categoria}
                        </span>
                      ) : null}
                      {comunicado.destaque ? (
                        <span className={badgeClasses('orange')}>
                          Destaque
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <ComunicadoStatusBadge status={comunicado.status} />
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {comunicado.conteudo}
                </p>

                <p className="mt-3 text-xs font-medium text-slate-500">
                  Criado em {formatarData(comunicado.criadoEm)} • Publicado em{' '}
                  {formatarData(comunicado.publicadoEm)}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white bg-white p-3 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      Moradores
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-950">
                      {comunicado.leituraResumo?.totalMoradores ?? 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                      Lidos
                    </p>
                    <p className="mt-1 text-lg font-bold text-emerald-950">
                      {comunicado.leituraResumo?.totalLidas ?? 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">
                      Pendentes
                    </p>
                    <p className="mt-1 text-lg font-bold text-amber-950">
                      {comunicado.leituraResumo?.totalPendentes ?? 0}
                    </p>
                  </div>
                </div>

                {podePublicarComunicado ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {comunicado.status === 'RASCUNHO' ? (
                      <button
                        type="button"
                        onClick={() => void publicarComunicado(comunicado.id)}
                        disabled={acaoComunicadoId === comunicado.id}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Publicar
                      </button>
                    ) : null}

                    {comunicado.status !== 'ARQUIVADO' ? (
                      <button
                        type="button"
                        onClick={() => void arquivarComunicado(comunicado.id)}
                        disabled={acaoComunicadoId === comunicado.id}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600 disabled:opacity-60"
                      >
                        <Archive className="h-4 w-4" />
                        Arquivar
                      </button>
                    ) : null}

                    {comunicado.status === 'PUBLICADO' ? (
                      <button
                        type="button"
                        onClick={() => void carregarLeiturasComunicado(comunicado.id)}
                        disabled={carregandoLeiturasComunicadoId === comunicado.id}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {carregandoLeiturasComunicadoId === comunicado.id
                          ? 'Carregando...'
                          : 'Ver leituras'}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {leiturasComunicado?.comunicado.id === comunicado.id ? (
                  <div className="mt-5 rounded-3xl border border-emerald-100 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-950">
                          Confirmações de leitura
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {leiturasComunicado.resumo.totalLidas} lido(s) de{' '}
                          {leiturasComunicado.resumo.totalMoradores} morador(es)
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setLeiturasComunicado(null)}
                        className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                      >
                        Fechar
                      </button>
                    </div>

                    <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto pr-1">
                      {leiturasComunicado.itens.map((item) => (
                        <div
                          key={item.moradorId}
                          className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-950">
                              {item.nome}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Unidade(s):{' '}
                              {item.unidades.length > 0
                                ? item.unidades
                                    .map((unidade) => unidade.identificador)
                                    .join(', ')
                                : 'Não vinculada'}
                            </p>
                          </div>

                          <LeituraStatusBadge
                            lida={item.lida}
                            lidoEm={item.lidoEm}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}

            {comunicados.length === 0 && !carregando ? (
              <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Nenhum comunicado cadastrado.
              </p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
          Atendimento
        </p>
        <h3 className="mt-2 text-2xl font-bold text-slate-950">
          Ocorrências registradas
        </h3>

        <div className="mt-5 grid gap-4">
          {ocorrencias.map((ocorrencia) => {
            const formulario = statusOcorrenciaForm[ocorrencia.id];

            return (
              <article
                key={ocorrencia.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-slate-950">
                        {ocorrencia.titulo}
                      </h4>

                      <OcorrenciaStatusBadge status={ocorrencia.status} />
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {ocorrencia.descricao}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm">
                        Prioridade:
                        <PrioridadeBadge prioridade={ocorrencia.prioridade} />
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                        Morador: {ocorrencia.morador?.nome ?? 'Não informado'}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                        Unidade: {ocorrencia.unidade?.identificador ?? 'Não informada'}
                      </span>
                    </div>

                    <p className="mt-3 text-xs font-medium text-slate-500">
                      Criada em {formatarData(ocorrencia.criadoEm)}
                    </p>
                  </div>

                  {formulario ? (
                    <form
                      onSubmit={(event) =>
                        void atualizarStatusOcorrencia(ocorrencia.id, event)
                      }
                      className="w-full rounded-3xl border border-slate-200 bg-white p-4 lg:max-w-sm"
                    >
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-700">
                          Novo status
                        </span>
                        <select
                          value={formulario.status}
                          onChange={(event) =>
                            setStatusOcorrenciaForm((atual) => ({
                              ...atual,
                              [ocorrencia.id]: {
                                ...atual[ocorrencia.id],
                                status:
                                  event.target.value as StatusOcorrenciaAdmin,
                              },
                            }))
                          }
                          className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        >
                          {statusOcorrenciaOpcoes.map((status) => (
                            <option
                              key={status.value}
                              value={status.value}
                            >
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="mt-3 grid gap-2">
                        <span className="text-sm font-semibold text-slate-700">
                          Observação
                        </span>
                        <input
                          value={formulario.observacao}
                          onChange={(event) =>
                            setStatusOcorrenciaForm((atual) => ({
                              ...atual,
                              [ocorrencia.id]: {
                                ...atual[ocorrencia.id],
                                observacao: event.target.value,
                              },
                            }))
                          }
                          className="h-11 rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          placeholder="Opcional"
                        />
                      </label>

                      <button
                        type="submit"
                        disabled={acaoOcorrenciaId === ocorrencia.id}
                        className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        Atualizar ocorrência
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}

          {ocorrencias.length === 0 && !carregando ? (
            <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Nenhuma ocorrência registrada.
            </p>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}
