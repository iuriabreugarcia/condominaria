import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Filter,
  History,
  LoaderCircle,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAdminRouteContext } from "../components/AdminProtectedRoute";
import { AdminShell } from "../components/AdminShell";
import { usePageTitle } from "../hooks/usePageTitle";
import { apiRequest, ApiError } from "../lib/api";
import type {
  AdminOcorrencia,
  AtualizarStatusOcorrenciaAdminPayload,
  PrioridadeOcorrenciaAdmin,
  StatusOcorrenciaAdmin,
} from "../types/api";

type HistoricoStatusOcorrenciaAdmin = {
  id: number;
  ocorrenciaId: number;
  usuarioId: number | null;
  statusAnterior: StatusOcorrenciaAdmin | null;
  statusNovo: StatusOcorrenciaAdmin;
  observacao: string | null;
  criadoEm: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
  } | null;
};

type AdminOcorrenciaDetalhe = AdminOcorrencia & {
  historicoStatus: HistoricoStatusOcorrenciaAdmin[];
};

type StatusFiltro = "TODOS" | "ATIVAS" | StatusOcorrenciaAdmin;
type PrioridadeFiltro = "TODAS" | PrioridadeOcorrenciaAdmin;
type OrdemFiltro = "RECENTES" | "ANTIGAS";

type FiltrosOcorrencias = {
  busca: string;
  status: StatusFiltro;
  prioridade: PrioridadeFiltro;
  ordem: OrdemFiltro;
};

const filtrosIniciais: FiltrosOcorrencias = {
  busca: "",
  status: "ATIVAS",
  prioridade: "TODAS",
  ordem: "RECENTES",
};

const papeisQueAtualizamOcorrencias = new Set(["ADMINISTRADOR", "SINDICO"]);

const rotulosStatus: Record<StatusOcorrenciaAdmin, string> = {
  ABERTA: "Aberta",
  EM_ANALISE: "Em análise",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_MORADOR: "Aguardando morador",
  RESOLVIDA: "Resolvida",
  CANCELADA: "Cancelada",
};

const rotulosPrioridade: Record<PrioridadeOcorrenciaAdmin, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

function obterMensagemErro(error: unknown, fallback: string) {
  const mensagem =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "";

  const mensagemLimpa = mensagem.trim();
  const normalizada = mensagemLimpa.toLowerCase();

  if (!mensagemLimpa) {
    return fallback;
  }

  if (
    normalizada.includes("internal server error") ||
    normalizada.includes("prismaclientknownrequesterror") ||
    normalizada.includes("unknown column") ||
    normalizada.includes("p2022") ||
    normalizada.includes("cannot read properties")
  ) {
    return "Não foi possível carregar as ocorrências agora. Verifique a estrutura do sistema ou tente novamente em instantes.";
  }

  if (
    normalizada.includes("failed to fetch") ||
    normalizada.includes("networkerror") ||
    normalizada.includes("network request failed")
  ) {
    return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
  }

  return mensagemLimpa;
}

function formatarDataHora(data: string | null | undefined) {
  if (!data) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

function normalizarTexto(valor: string | null | undefined) {
  return (valor ?? "").trim().toLocaleLowerCase("pt-BR");
}

function statusAtivo(status: StatusOcorrenciaAdmin) {
  return (
    status === "ABERTA" ||
    status === "EM_ANALISE" ||
    status === "EM_ANDAMENTO" ||
    status === "AGUARDANDO_MORADOR"
  );
}

function classeStatus(status: StatusOcorrenciaAdmin) {
  switch (status) {
    case "ABERTA":
      return "bg-orange-100 text-orange-800";
    case "EM_ANALISE":
      return "bg-amber-100 text-amber-800";
    case "EM_ANDAMENTO":
      return "bg-indigo-100 text-indigo-800";
    case "AGUARDANDO_MORADOR":
      return "bg-purple-100 text-purple-800";
    case "RESOLVIDA":
      return "bg-emerald-100 text-emerald-800";
    case "CANCELADA":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function classePrioridade(prioridade: PrioridadeOcorrenciaAdmin) {
  switch (prioridade) {
    case "BAIXA":
      return "bg-slate-100 text-slate-700";
    case "MEDIA":
      return "bg-sky-100 text-sky-800";
    case "ALTA":
      return "bg-orange-100 text-orange-800";
    case "URGENTE":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function OcorrenciaStatusBadge({ status }: { status: StatusOcorrenciaAdmin }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${classeStatus(status)}`}
    >
      {rotulosStatus[status]}
    </span>
  );
}

function OcorrenciaPrioridadeBadge({
  prioridade,
}: {
  prioridade: PrioridadeOcorrenciaAdmin;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${classePrioridade(prioridade)}`}
    >
      {rotulosPrioridade[prioridade]}
    </span>
  );
}

function CategoriaBadge({
  categoria,
}: {
  categoria: string | null | undefined;
}) {
  const texto = categoria?.trim() || "Sem categoria";

  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      {texto}
    </span>
  );
}

function ResumoOcorrenciasCard({
  titulo,
  valor,
  detalhe,
  icon,
  variant = "slate",
}: {
  titulo: string;
  valor: number;
  detalhe: string;
  icon: ReactNode;
  variant?: "slate" | "orange" | "emerald" | "rose" | "indigo";
}) {
  const variantes = {
    slate: "border-slate-200 bg-white text-slate-700",
    orange: "border-orange-100 bg-orange-50 text-orange-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
  } as const;

  return (
    <article
      className={`rounded-3xl border p-5 shadow-sm ${variantes[variant]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl bg-white/75 p-2 shadow-sm">{icon}</div>

        <p className="text-3xl font-bold text-slate-950">{valor}</p>
      </div>

      <p className="mt-4 text-sm font-bold text-slate-900">{titulo}</p>

      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        {detalhe}
      </p>
    </article>
  );
}

export function AdminOcorrenciasPage() {
  usePageTitle("Ocorrências Administrativas");

  const { usuario, condominiosAdministrativos } = useAdminRouteContext();

  const condominioInicial =
    condominiosAdministrativos.find((vinculo) => vinculo.principal)?.condominio
      .id ??
    condominiosAdministrativos[0]?.condominio.id ??
    0;

  const [condominioId, setCondominioId] = useState(condominioInicial);
  const [ocorrencias, setOcorrencias] = useState<AdminOcorrencia[]>([]);
  const [ocorrenciaSelecionadaId, setOcorrenciaSelecionadaId] = useState<
    number | null
  >(null);
  const [ocorrenciaDetalhe, setOcorrenciaDetalhe] =
    useState<AdminOcorrenciaDetalhe | null>(null);

  const [filtros, setFiltros] = useState<FiltrosOcorrencias>(filtrosIniciais);

  const [carregandoLista, setCarregandoLista] = useState(false);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [acaoEmExecucao, setAcaoEmExecucao] = useState(false);

  const [erro, setErro] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  const [statusDestino, setStatusDestino] =
    useState<StatusOcorrenciaAdmin>("ABERTA");
  const [observacaoStatus, setObservacaoStatus] = useState("");

  const vinculoSelecionado =
    condominiosAdministrativos.find(
      (vinculo) => vinculo.condominio.id === condominioId,
    ) ?? null;

  const podeAtualizarStatus =
    usuario.superAdmin ||
    Boolean(
      vinculoSelecionado &&
      papeisQueAtualizamOcorrencias.has(vinculoSelecionado.papel),
    );

  const resumo = useMemo(() => {
    const ativas = ocorrencias.filter((ocorrencia) =>
      statusAtivo(ocorrencia.status),
    ).length;

    const emAndamento = ocorrencias.filter(
      (ocorrencia) => ocorrencia.status === "EM_ANDAMENTO",
    ).length;

    const aguardandoMorador = ocorrencias.filter(
      (ocorrencia) => ocorrencia.status === "AGUARDANDO_MORADOR",
    ).length;

    const resolvidas = ocorrencias.filter(
      (ocorrencia) => ocorrencia.status === "RESOLVIDA",
    ).length;

    const urgentes = ocorrencias.filter(
      (ocorrencia) => ocorrencia.prioridade === "URGENTE",
    ).length;

    return {
      total: ocorrencias.length,
      ativas,
      emAndamento,
      aguardandoMorador,
      resolvidas,
      urgentes,
    };
  }, [ocorrencias]);

  const ocorrenciasFiltradas = useMemo(() => {
    const busca = normalizarTexto(filtros.busca);

    return [...ocorrencias]
      .filter((ocorrencia) => {
        const correspondeStatus =
          filtros.status === "TODOS"
            ? true
            : filtros.status === "ATIVAS"
              ? statusAtivo(ocorrencia.status)
              : ocorrencia.status === filtros.status;

        const correspondePrioridade =
          filtros.prioridade === "TODAS"
            ? true
            : ocorrencia.prioridade === filtros.prioridade;

        const textoBusca = [
          ocorrencia.titulo,
          ocorrencia.descricao,
          ocorrencia.categoria,
          ocorrencia.unidade?.identificador,
          ocorrencia.unidade?.numero,
          ocorrencia.morador?.nome,
          ocorrencia.morador?.email,
        ]
          .map(normalizarTexto)
          .join(" ");

        const correspondeBusca = busca ? textoBusca.includes(busca) : true;

        return correspondeStatus && correspondePrioridade && correspondeBusca;
      })
      .sort((a, b) => {
        const dataA = new Date(a.criadoEm).getTime();
        const dataB = new Date(b.criadoEm).getTime();

        return filtros.ordem === "ANTIGAS" ? dataA - dataB : dataB - dataA;
      });
  }, [filtros, ocorrencias]);

  async function carregarOcorrencias(idCondominio: number) {
    if (!idCondominio) {
      return;
    }

    setCarregandoLista(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const resposta = await apiRequest<AdminOcorrencia[]>(
        `/condominios/${idCondominio}/ocorrencias`,
      );

      setOcorrencias(resposta);

      setOcorrenciaSelecionadaId((atual) => {
        if (atual && resposta.some((ocorrencia) => ocorrencia.id === atual)) {
          return atual;
        }

        return resposta[0]?.id ?? null;
      });
    } catch (error) {
      setOcorrencias([]);
      setOcorrenciaSelecionadaId(null);
      setOcorrenciaDetalhe(null);
      setErro(
        obterMensagemErro(error, "Não foi possível carregar as ocorrências."),
      );
    } finally {
      setCarregandoLista(false);
    }
  }

  async function carregarDetalhe(idCondominio: number, ocorrenciaId: number) {
    if (!idCondominio || !ocorrenciaId) {
      return;
    }

    setCarregandoDetalhe(true);
    setErro("");

    try {
      const resposta = await apiRequest<AdminOcorrenciaDetalhe>(
        `/condominios/${idCondominio}/ocorrencias/${ocorrenciaId}`,
      );

      setOcorrenciaDetalhe(resposta);
      setStatusDestino(resposta.status);
      setObservacaoStatus("");
    } catch (error) {
      setOcorrenciaDetalhe(null);
      setErro(
        obterMensagemErro(
          error,
          "Não foi possível carregar o detalhe da ocorrência.",
        ),
      );
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  useEffect(() => {
    void carregarOcorrencias(condominioId);
  }, [condominioId]);

  useEffect(() => {
    if (!condominioId || !ocorrenciaSelecionadaId) {
      setOcorrenciaDetalhe(null);
      return;
    }

    void carregarDetalhe(condominioId, ocorrenciaSelecionadaId);
  }, [condominioId, ocorrenciaSelecionadaId]);

  async function atualizarStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !ocorrenciaDetalhe ||
      !condominioId ||
      !podeAtualizarStatus ||
      acaoEmExecucao
    ) {
      return;
    }

    if (statusDestino === ocorrenciaDetalhe.status) {
      setErro("Selecione um status diferente do atual.");
      return;
    }

    const confirmarAlteracao = window.confirm(
      `Confirmar alteração da ocorrência "${ocorrenciaDetalhe.titulo}" para ${rotulosStatus[statusDestino]}?`,
    );

    if (!confirmarAlteracao) {
      return;
    }

    setErro("");
    setMensagemSucesso("");
    setAcaoEmExecucao(true);

    const payload: AtualizarStatusOcorrenciaAdminPayload = {
      status: statusDestino,
    };

    if (observacaoStatus.trim()) {
      payload.observacao = observacaoStatus.trim();
    }

    try {
      await apiRequest(
        `/condominios/${condominioId}/ocorrencias/${ocorrenciaDetalhe.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      await carregarOcorrencias(condominioId);
      await carregarDetalhe(condominioId, ocorrenciaDetalhe.id);

      setMensagemSucesso("Status da ocorrência atualizado com sucesso.");
      setObservacaoStatus("");
    } catch (error) {
      setErro(
        obterMensagemErro(
          error,
          "Não foi possível atualizar o status da ocorrência.",
        ),
      );
    } finally {
      setAcaoEmExecucao(false);
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
              Operação administrativa
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Ocorrências do condomínio
            </h2>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600 sm:text-base">
              Consulte as solicitações registradas pelos moradores, acompanhe o
              histórico e atualize o andamento administrativo.
            </p>
          </div>

          <label className="grid w-full max-w-md gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
              Condomínio ativo
            </span>

            <select
              value={condominioId}
              onChange={(event) => {
                setCondominioId(Number(event.target.value));
                setOcorrencias([]);
                setOcorrenciaDetalhe(null);
                setOcorrenciaSelecionadaId(null);
              }}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              {condominiosAdministrativos.map((vinculo) => (
                <option
                  key={vinculo.condominio.id}
                  value={vinculo.condominio.id}
                >
                  {vinculo.condominio.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <ResumoOcorrenciasCard
          titulo="Total"
          valor={resumo.total}
          detalhe="ocorrências registradas"
          icon={<ClipboardList className="h-6 w-6 text-slate-700" />}
        />

        <ResumoOcorrenciasCard
          titulo="Em acompanhamento"
          valor={resumo.ativas}
          detalhe="abertas, em análise ou em andamento"
          icon={<CircleDashed className="h-6 w-6 text-orange-600" />}
          variant="orange"
        />

        <ResumoOcorrenciasCard
          titulo="Aguardando morador"
          valor={resumo.aguardandoMorador}
          detalhe="dependem de retorno do morador"
          icon={<UserRound className="h-6 w-6 text-indigo-600" />}
          variant="indigo"
        />

        <ResumoOcorrenciasCard
          titulo="Resolvidas"
          valor={resumo.resolvidas}
          detalhe="finalizadas pela administração"
          icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" />}
          variant="emerald"
        />

        <ResumoOcorrenciasCard
          titulo="Urgentes"
          valor={resumo.urgentes}
          detalhe="demandam prioridade operacional"
          icon={<ShieldAlert className="h-6 w-6 text-rose-600" />}
          variant="rose"
        />
      </section>

      {erro ? (
        <p className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {erro}
        </p>
      ) : null}

      {mensagemSucesso ? (
        <p className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {mensagemSucesso}
        </p>
      ) : null}

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Filter className="h-4 w-4 text-orange-600" />
          Filtros
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          <label className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filtros.busca}
              onChange={(event) =>
                setFiltros((atual) => ({
                  ...atual,
                  busca: event.target.value,
                }))
              }
              placeholder="Buscar ocorrência, morador ou unidade"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <select
            value={filtros.status}
            onChange={(event) =>
              setFiltros((atual) => ({
                ...atual,
                status: event.target.value as StatusFiltro,
              }))
            }
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          >
            <option value="ATIVAS">Abertas + em análise</option>
            <option value="TODOS">Todos os status</option>
            <option value="ABERTA">Aberta</option>
            <option value="EM_ANALISE">Em análise</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="AGUARDANDO_MORADOR">Aguardando morador</option>
            <option value="RESOLVIDA">Resolvida</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

          <select
            value={filtros.prioridade}
            onChange={(event) =>
              setFiltros((atual) => ({
                ...atual,
                prioridade: event.target.value as PrioridadeFiltro,
              }))
            }
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          >
            <option value="TODAS">Todas as prioridades</option>
            <option value="BAIXA">Baixa</option>
            <option value="MEDIA">Média</option>
            <option value="ALTA">Alta</option>
            <option value="URGENTE">Urgente</option>
          </select>

          <select
            value={filtros.ordem}
            onChange={(event) =>
              setFiltros((atual) => ({
                ...atual,
                ordem: event.target.value as OrdemFiltro,
              }))
            }
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          >
            <option value="RECENTES">Mais recentes</option>
            <option value="ANTIGAS">Mais antigas</option>
          </select>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
                Fila de acompanhamento
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-950">
                Ocorrências
              </h3>
            </div>

            {carregandoLista ? (
              <LoaderCircle className="h-5 w-5 animate-spin text-orange-500" />
            ) : null}
          </div>

          <div className="mt-5 grid gap-3">
            {ocorrenciasFiltradas.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                Nenhuma ocorrência encontrada com os filtros atuais.
              </p>
            ) : (
              ocorrenciasFiltradas.map((ocorrencia) => (
                <button
                  key={ocorrencia.id}
                  type="button"
                  onClick={() => setOcorrenciaSelecionadaId(ocorrencia.id)}
                  className={[
                    "rounded-3xl border p-4 text-left transition",
                    ocorrenciaSelecionadaId === ocorrencia.id
                      ? "border-orange-300 bg-orange-50"
                      : "border-slate-200 bg-slate-50 hover:border-orange-200 hover:bg-orange-50/40",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="font-bold text-slate-950">
                        {ocorrencia.titulo}
                      </h4>

                      <p className="mt-2 text-sm text-slate-600">
                        {ocorrencia.morador?.nome ?? "Morador não informado"}
                        {" • "}
                        {ocorrencia.unidade?.identificador ?? "Sem unidade"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <OcorrenciaStatusBadge status={ocorrencia.status} />

                      <OcorrenciaPrioridadeBadge
                        prioridade={ocorrencia.prioridade}
                      />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Detalhamento
          </p>

          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Ocorrência selecionada
          </h3>

          {carregandoDetalhe ? (
            <p className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
              Carregando detalhes...
            </p>
          ) : ocorrenciaDetalhe ? (
            <>
              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap gap-2">
                  <OcorrenciaStatusBadge status={ocorrenciaDetalhe.status} />

                  <OcorrenciaPrioridadeBadge
                    prioridade={ocorrenciaDetalhe.prioridade}
                  />

                  <CategoriaBadge categoria={ocorrenciaDetalhe.categoria} />
                </div>

                <h4 className="mt-4 text-xl font-bold text-slate-950">
                  {ocorrenciaDetalhe.titulo}
                </h4>

                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                  {ocorrenciaDetalhe.descricao}
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <UserRound className="h-4 w-4 text-orange-600" />
                    Origem
                  </div>

                  <p className="mt-3 text-sm text-slate-700">
                    <strong>Morador:</strong>{" "}
                    {ocorrenciaDetalhe.morador?.nome ?? "Não informado"}
                  </p>

                  <p className="mt-2 text-sm text-slate-700">
                    <strong>Unidade:</strong>{" "}
                    {ocorrenciaDetalhe.unidade?.identificador ??
                      "Não informada"}
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <CalendarClock className="h-4 w-4 text-orange-600" />
                    Datas
                  </div>

                  <p className="mt-3 text-sm text-slate-700">
                    <strong>Abertura:</strong>{" "}
                    {formatarDataHora(ocorrenciaDetalhe.criadoEm)}
                  </p>

                  <p className="mt-2 text-sm text-slate-700">
                    <strong>Atualização:</strong>{" "}
                    {formatarDataHora(ocorrenciaDetalhe.atualizadoEm)}
                  </p>
                </div>
              </div>

              {podeAtualizarStatus ? (
                <form
                  onSubmit={atualizarStatus}
                  className="mt-4 rounded-3xl border border-orange-100 bg-orange-50 p-4"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-orange-950">
                    <BadgeCheck className="h-4 w-4" />
                    Atualizar status
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        "EM_ANALISE",
                        "EM_ANDAMENTO",
                        "AGUARDANDO_MORADOR",
                        "RESOLVIDA",
                      ] as StatusOcorrenciaAdmin[]
                    ).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setStatusDestino(status)}
                        disabled={status === ocorrenciaDetalhe.status}
                        className={`inline-flex h-10 items-center justify-center rounded-2xl border px-3 text-xs font-bold transition ${
                          statusDestino === status
                            ? "border-orange-300 bg-white text-orange-800 shadow-sm"
                            : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-white"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {rotulosStatus[status]}
                      </button>
                    ))}
                  </div>

                  <select
                    value={statusDestino}
                    onChange={(event) =>
                      setStatusDestino(
                        event.target.value as StatusOcorrenciaAdmin,
                      )
                    }
                    className="mt-4 h-12 w-full rounded-2xl border border-orange-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="ABERTA">Aberta</option>
                    <option value="EM_ANALISE">Em análise</option>
                    <option value="EM_ANDAMENTO">Em andamento</option>
                    <option value="AGUARDANDO_MORADOR">
                      Aguardando morador
                    </option>
                    <option value="RESOLVIDA">Resolvida</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>

                  <textarea
                    value={observacaoStatus}
                    onChange={(event) =>
                      setObservacaoStatus(event.target.value)
                    }
                    maxLength={255}
                    placeholder="Observação administrativa opcional"
                    className="mt-3 min-h-24 w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />

                  <button
                    type="submit"
                    disabled={
                      acaoEmExecucao ||
                      statusDestino === ocorrenciaDetalhe.status
                    }
                    className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {acaoEmExecucao ? "Salvando..." : "Salvar status"}
                  </button>
                </form>
              ) : null}

              <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <History className="h-4 w-4 text-orange-600" />
                  Histórico
                </div>

                {ocorrenciaDetalhe.historicoStatus.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    Nenhum histórico registrado.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3">
                    {ocorrenciaDetalhe.historicoStatus.map((historico) => (
                      <div
                        key={historico.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <p className="text-sm font-bold text-slate-900">
                          {historico.statusAnterior
                            ? `${rotulosStatus[historico.statusAnterior]} → ${rotulosStatus[historico.statusNovo]}`
                            : rotulosStatus[historico.statusNovo]}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {historico.usuario?.nome ?? "Sistema"}
                          {" • "}
                          {formatarDataHora(historico.criadoEm)}
                        </p>

                        {historico.observacao ? (
                          <p className="mt-2 text-sm text-slate-600">
                            {historico.observacao}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              Selecione uma ocorrência para visualizar o detalhe.
            </p>
          )}
        </article>
      </section>
    </AdminShell>
  );
}
