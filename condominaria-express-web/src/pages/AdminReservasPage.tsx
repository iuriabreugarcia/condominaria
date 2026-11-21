import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPinned,
  RefreshCcw,
  XCircle,
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
  AdminAreaComum,
  AdminMorador,
  AdminReservaAreaComum,
  AdminUnidade,
  CriarAreaComumAdminPayload,
  CriarReservaAdminPayload,
  RecusarReservaAdminPayload,
  StatusReservaAdmin,
} from '../types/api';

const papeisGestaoReservas = new Set([
  'ADMINISTRADOR',
  'SINDICO',
]);

function obterMensagemErro(error: unknown, fallback: string) {
  const mensagem =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : '';

  const normalizada = mensagem.trim().toLowerCase();

  if (
    !normalizada ||
    normalizada.includes('internal server error') ||
    normalizada.includes('prismaclient') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('cannot read')
  ) {
    return fallback;
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

function rotuloStatus(status: StatusReservaAdmin) {
  switch (status) {
    case 'SOLICITADA':
      return 'Solicitada';
    case 'APROVADA':
      return 'Aprovada';
    case 'RECUSADA':
      return 'Recusada';
    case 'CANCELADA':
      return 'Cancelada';
    case 'CONCLUIDA':
      return 'Concluída';
    default:
      return status;
  }
}

function classeStatus(status: StatusReservaAdmin) {
  switch (status) {
    case 'SOLICITADA':
      return 'bg-amber-100 text-amber-800';
    case 'APROVADA':
      return 'bg-emerald-100 text-emerald-800';
    case 'RECUSADA':
      return 'bg-rose-100 text-rose-800';
    case 'CANCELADA':
      return 'bg-slate-200 text-slate-700';
    case 'CONCLUIDA':
      return 'bg-sky-100 text-sky-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function reservaJaTerminou(reserva: Pick<AdminReservaAreaComum, 'fimEm'>) {
  return new Date(reserva.fimEm).getTime() <= Date.now();
}


function ReservaStatusBadge({ status }: { status: StatusReservaAdmin }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${classeStatus(
        status,
      )}`}
    >
      {rotuloStatus(status)}
    </span>
  );
}

function AreaAprovacaoBadge({ exigeAprovacao }: { exigeAprovacao: boolean }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${
        exigeAprovacao
          ? 'bg-orange-100 text-orange-800'
          : 'bg-emerald-100 text-emerald-800'
      }`}
    >
      {exigeAprovacao ? 'Exige aprovação' : 'Aprovação automática'}
    </span>
  );
}

function AreaDisponibilidadeBadge({
  permiteReserva,
}: {
  permiteReserva: boolean;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${
        permiteReserva
          ? 'bg-sky-100 text-sky-800'
          : 'bg-slate-200 text-slate-700'
      }`}
    >
      {permiteReserva ? 'Reservável' : 'Reservas desativadas'}
    </span>
  );
}

function ResumoReservasCard({
  titulo,
  valor,
  descricao,
  icon,
  destaque = 'orange',
}: {
  titulo: string;
  valor: number;
  descricao: string;
  icon: ReactNode;
  destaque?: 'orange' | 'emerald' | 'amber' | 'slate';
}) {
  const estilos = {
    orange: 'border-orange-100 bg-orange-50 text-orange-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return (
    <article
	  className="
		  rounded-3xl
		  border border-slate-200
		  bg-slate-50
		  p-4 sm:p-5
		  transition
		  hover:border-orange-200
	  "
	>
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-2xl border ${estilos[destaque]}`}
      >
        {icon}
      </div>

      <p className="mt-4 text-sm font-bold text-slate-600">
        {titulo}
      </p>
      <p className="mt-1 text-3xl font-bold text-slate-950">
        {valor}
      </p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        {descricao}
      </p>
    </article>
  );
}

function descricaoReserva(reserva: AdminReservaAreaComum | undefined) {
  if (!reserva) {
    return 'esta reserva';
  }

  const titulo = reserva.titulo || reserva.areaComum.nome || `reserva #${reserva.id}`;
  const unidade = reserva.unidade?.identificador
    ? ` • Unidade ${reserva.unidade.identificador}`
    : '';

  return `${titulo}${unidade}`;
}


export function AdminReservasPage() {
  usePageTitle('Reservas Administrativas');

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

  const [areasComuns, setAreasComuns] = useState<AdminAreaComum[]>([]);
  const [reservas, setReservas] = useState<AdminReservaAreaComum[]>([]);
  const [unidades, setUnidades] = useState<AdminUnidade[]>([]);
  const [moradores, setMoradores] = useState<AdminMorador[]>([]);

  const [carregando, setCarregando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState('');
  const [erroAcao, setErroAcao] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const [enviandoArea, setEnviandoArea] = useState(false);
  const [enviandoReserva, setEnviandoReserva] = useState(false);
  const [acaoReservaId, setAcaoReservaId] = useState<number | null>(null);

  const [areaForm, setAreaForm] = useState({
    nome: '',
    descricao: '',
    capacidade: '',
    exigeAprovacao: true,
    permiteReserva: true,
    observacoes: '',
  });

  const [reservaForm, setReservaForm] = useState({
    areaComumId: '',
    unidadeId: '',
    moradorId: '',
    titulo: '',
    inicioEm: '',
    fimEm: '',
    observacoes: '',
  });

  const [motivosRecusa, setMotivosRecusa] = useState<Record<number, string>>(
    {},
  );

  const condominioSelecionado =
    condominiosAdministrativos.find(
      (vinculo) => vinculo.condominio.id === condominioId,
    ) ?? null;

  const podeGerirReservas =
    usuario.superAdmin ||
    Boolean(
      condominioSelecionado &&
        papeisGestaoReservas.has(condominioSelecionado.papel),
    );

  const resumo = useMemo(() => {
    const solicitadas = reservas.filter(
      (reserva) => reserva.status === 'SOLICITADA',
    ).length;

    const aprovadas = reservas.filter(
      (reserva) => reserva.status === 'APROVADA',
    ).length;

    const concluidas = reservas.filter(
      (reserva) => reserva.status === 'CONCLUIDA',
    ).length;

    const proximas = reservas.filter((reserva) => {
      const inicio = new Date(reserva.inicioEm).getTime();
      return inicio >= Date.now() &&
        ['SOLICITADA', 'APROVADA'].includes(reserva.status);
    }).length;

    return {
      areasComuns: areasComuns.length,
      reservas: reservas.length,
      solicitadas,
      aprovadas,
      concluidas,
      proximas,
    };
  }, [areasComuns, reservas]);

  const reservasAgendaOrdenadas = useMemo(() => {
    return [...reservas]
      .filter((reserva) =>
        ['SOLICITADA', 'APROVADA'].includes(reserva.status),
      )
      .sort(
        (a, b) =>
          new Date(a.inicioEm).getTime() -
          new Date(b.inicioEm).getTime(),
      )
      .slice(0, 8);
  }, [reservas]);

  async function carregarDados(id: number) {
    if (!id) {
      return;
    }

    setCarregando(true);
    setErroCarregamento('');

    try {
      const [
        areasResposta,
        reservasResposta,
        unidadesResposta,
        moradoresResposta,
      ] = await Promise.all([
        apiRequest<AdminAreaComum[]>(
          `/condominios/${id}/areas-comuns`,
        ),
        apiRequest<AdminReservaAreaComum[]>(
          `/condominios/${id}/reservas`,
        ),
        apiRequest<AdminUnidade[]>(
          `/condominios/${id}/unidades`,
        ),
        apiRequest<AdminMorador[]>(
          `/condominios/${id}/moradores`,
        ),
      ]);

      setAreasComuns(areasResposta);
      setReservas(reservasResposta);
      setUnidades(unidadesResposta);
      setMoradores(moradoresResposta);
    } catch (error) {
      setErroCarregamento(
        obterMensagemErro(
          error,
          'Não foi possível carregar áreas comuns e reservas.',
        ),
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarDados(condominioId);
  }, [condominioId]);

  async function cadastrarAreaComum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviandoArea) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setEnviandoArea(true);

    const payload: CriarAreaComumAdminPayload = {
      nome: areaForm.nome.trim(),
      exigeAprovacao: areaForm.exigeAprovacao,
      permiteReserva: areaForm.permiteReserva,
    };

    if (areaForm.descricao.trim()) {
      payload.descricao = areaForm.descricao.trim();
    }

    if (areaForm.capacidade.trim()) {
      payload.capacidade = Number(areaForm.capacidade);
    }

    if (areaForm.observacoes.trim()) {
      payload.observacoes = areaForm.observacoes.trim();
    }

    try {
      await apiRequest<AdminAreaComum>(
        `/condominios/${condominioId}/areas-comuns`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setAreaForm({
        nome: '',
        descricao: '',
        capacidade: '',
        exigeAprovacao: true,
        permiteReserva: true,
        observacoes: '',
      });

      setMensagemSucesso('Área comum cadastrada com sucesso.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível cadastrar a área comum.',
        ),
      );
    } finally {
      setEnviandoArea(false);
    }
  }

  async function cadastrarReserva(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviandoReserva) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setEnviandoReserva(true);

    const payload: CriarReservaAdminPayload = {
      areaComumId: Number(reservaForm.areaComumId),
      inicioEm: new Date(reservaForm.inicioEm).toISOString(),
      fimEm: new Date(reservaForm.fimEm).toISOString(),
    };

    if (reservaForm.unidadeId) {
      payload.unidadeId = Number(reservaForm.unidadeId);
    }

    if (reservaForm.moradorId) {
      payload.moradorId = Number(reservaForm.moradorId);
    }

    if (reservaForm.titulo.trim()) {
      payload.titulo = reservaForm.titulo.trim();
    }

    if (reservaForm.observacoes.trim()) {
      payload.observacoes = reservaForm.observacoes.trim();
    }

    try {
      await apiRequest<AdminReservaAreaComum>(
        `/condominios/${condominioId}/reservas`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setReservaForm({
        areaComumId: '',
        unidadeId: '',
        moradorId: '',
        titulo: '',
        inicioEm: '',
        fimEm: '',
        observacoes: '',
      });

      setMensagemSucesso('Reserva cadastrada com sucesso.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível cadastrar a reserva.',
        ),
      );
    } finally {
      setEnviandoReserva(false);
    }
  }

  async function aprovarReserva(reservaId: number) {
    if (!condominioId || acaoReservaId !== null) {
      return;
    }

    const reserva = reservas.find((item) => item.id === reservaId);
    const confirmar = window.confirm(
      `Confirmar aprovação de ${descricaoReserva(reserva)}?`,
    );

    if (!confirmar) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoReservaId(reservaId);

    try {
      await apiRequest(
        `/condominios/${condominioId}/reservas/${reservaId}/aprovar`,
        {
          method: 'PATCH',
        },
      );

      setMensagemSucesso('Reserva aprovada com sucesso.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível aprovar a reserva.',
        ),
      );
    } finally {
      setAcaoReservaId(null);
    }
  }

  async function recusarReserva(reservaId: number) {
    if (!condominioId || acaoReservaId !== null) {
      return;
    }

    const motivo = motivosRecusa[reservaId]?.trim();

    if (!motivo || motivo.length < 3) {
      setErroAcao('Informe um motivo de recusa com ao menos 3 caracteres.');
      return;
    }

    const reserva = reservas.find((item) => item.id === reservaId);
    const confirmar = window.confirm(
      `Confirmar recusa de ${descricaoReserva(reserva)}?`,
    );

    if (!confirmar) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoReservaId(reservaId);

    const payload: RecusarReservaAdminPayload = {
      motivoRecusa: motivo,
    };

    try {
      await apiRequest(
        `/condominios/${condominioId}/reservas/${reservaId}/recusar`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso('Reserva recusada com sucesso.');
      setMotivosRecusa((atual) => ({
        ...atual,
        [reservaId]: '',
      }));

      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível recusar a reserva.',
        ),
      );
    } finally {
      setAcaoReservaId(null);
    }
  }

  async function concluirReserva(reservaId: number) {
    if (!condominioId || acaoReservaId !== null) {
      return;
    }

    const reserva = reservas.find((item) => item.id === reservaId);
    const confirmar = window.confirm(
      `Confirmar conclusão de ${descricaoReserva(reserva)}?`,
    );

    if (!confirmar) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoReservaId(reservaId);

    try {
      await apiRequest(
        `/condominios/${condominioId}/reservas/${reservaId}/concluir`,
        {
          method: 'PATCH',
        },
      );

      setMensagemSucesso('Reserva concluída com sucesso.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível concluir a reserva.',
        ),
      );
    } finally {
      setAcaoReservaId(null);
    }
  }

  async function cancelarReserva(reservaId: number) {
    if (!condominioId || acaoReservaId !== null) {
      return;
    }

    const reserva = reservas.find((item) => item.id === reservaId);
    const confirmar = window.confirm(
      `Confirmar cancelamento de ${descricaoReserva(reserva)}?`,
    );

    if (!confirmar) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoReservaId(reservaId);

    try {
      await apiRequest(
        `/condominios/${condominioId}/reservas/${reservaId}/cancelar`,
        {
          method: 'PATCH',
        },
      );

      setMensagemSucesso('Reserva cancelada com sucesso.');
      await carregarDados(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível cancelar a reserva.',
        ),
      );
    } finally {
      setAcaoReservaId(null);
    }
  }

  return (
    <AdminShell
      usuario={usuario}
      condominiosAdministrativos={condominiosAdministrativos}
    >
      <section className="rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Reservas e áreas comuns
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Gestão dos espaços do condomínio
            </h2>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600 sm:text-base">
              Cadastre áreas reserváveis, acompanhe solicitações e aprove,
              recuse ou cancele reservas conforme a operação do condomínio.
            </p>
          </div>
 
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-slate-50 p-4 space-y-3">
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

      <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <ResumoReservasCard
          titulo="Áreas comuns"
          valor={resumo.areasComuns}
          descricao="Espaços cadastrados para uso dos moradores"
          icon={<MapPinned className="h-5 w-5" />}
          destaque="orange"
        />

        <ResumoReservasCard
          titulo="Reservas"
          valor={resumo.reservas}
          descricao="Total de solicitações registradas"
          icon={<CalendarDays className="h-5 w-5" />}
          destaque="slate"
        />

        <ResumoReservasCard
          titulo="Solicitadas"
          valor={resumo.solicitadas}
          descricao="Aguardando análise da administração"
          icon={<Clock3 className="h-5 w-5" />}
          destaque="amber"
        />

        <ResumoReservasCard
          titulo="Aprovadas"
          valor={resumo.aprovadas}
          descricao="Reservas liberadas para utilização"
          icon={<CheckCircle2 className="h-5 w-5" />}
          destaque="emerald"
        />
      </section>

      {carregando ? (
        <section className="mt-6 flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700 shadow-sm">
          <LoaderCircle className="h-5 w-5 animate-spin text-orange-500" />
          Carregando áreas comuns e reservas...
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

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Áreas comuns
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Cadastrar espaço
          </h3>

          {podeGerirReservas ? (
            <form
              onSubmit={cadastrarAreaComum}
              className="mt-5 grid gap-4"
            >
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Nome
                </span>
                <input
                  value={areaForm.nome}
                  onChange={(event) =>
                    setAreaForm((atual) => ({
                      ...atual,
                      nome: event.target.value,
                    }))
                  }
                  placeholder="Ex.: Salão de Festas"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Descrição
                </span>
                <input
                  value={areaForm.descricao}
                  onChange={(event) =>
                    setAreaForm((atual) => ({
                      ...atual,
                      descricao: event.target.value,
                    }))
                  }
                  placeholder="Opcional"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Capacidade
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={areaForm.capacidade}
                    onChange={(event) =>
                      setAreaForm((atual) => ({
                        ...atual,
                        capacidade: event.target.value,
                      }))
                    }
                    placeholder="Opcional"
                    className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Observações
                  </span>
                  <input
                    value={areaForm.observacoes}
                    onChange={(event) =>
                      setAreaForm((atual) => ({
                        ...atual,
                        observacoes: event.target.value,
                      }))
                    }
                    placeholder="Opcional"
                    className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={areaForm.exigeAprovacao}
                  onChange={(event) =>
                    setAreaForm((atual) => ({
                      ...atual,
                      exigeAprovacao: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                />
                <span className="text-sm font-semibold text-slate-800">
                  Exige aprovação da administração
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={areaForm.permiteReserva}
                  onChange={(event) =>
                    setAreaForm((atual) => ({
                      ...atual,
                      permiteReserva: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                />
                <span className="text-sm font-semibold text-slate-800">
                  Permitir reservas
                </span>
              </label>

              <button
                type="submit"
                disabled={enviandoArea}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {enviandoArea ? 'Salvando...' : 'Cadastrar área comum'}
              </button>
            </form>
          ) : (
            <p className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Seu perfil pode consultar áreas comuns, mas não pode cadastrá-las.
            </p>
          )}

          <div className="mt-6 grid gap-3">
            {areasComuns.map((area) => (
              <div
                key={area.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
              >
                <p className="text-base font-bold text-slate-950">
                  {area.nome}
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {area.descricao || 'Sem descrição.'}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-white px-3 py-1 text-slate-700 shadow-sm">
                    Capacidade: {area.capacidade ?? '—'}
                  </span>
                  <AreaAprovacaoBadge exigeAprovacao={area.exigeAprovacao} />
                  <AreaDisponibilidadeBadge permiteReserva={area.permiteReserva} />
                </div>
              </div>
            ))}

            {areasComuns.length === 0 && !carregando ? (
              <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Nenhuma área comum cadastrada.
              </p>
            ) : null}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Nova reserva
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Cadastrar reserva manual
          </h3>

          {podeGerirReservas ? (
            <form
              onSubmit={cadastrarReserva}
              className="mt-5 grid gap-4"
            >
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Área comum
                </span>
                <select
                  value={reservaForm.areaComumId}
                  onChange={(event) =>
                    setReservaForm((atual) => ({
                      ...atual,
                      areaComumId: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                >
                  <option value="">Selecione</option>
                  {areasComuns.map((area) => (
                    <option
                      key={area.id}
                      value={area.id}
                    >
                      {area.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Título
                </span>
                <input
                  value={reservaForm.titulo}
                  onChange={(event) =>
                    setReservaForm((atual) => ({
                      ...atual,
                      titulo: event.target.value,
                    }))
                  }
                  placeholder="Opcional"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Início
                  </span>
                  <input
                    type="datetime-local"
                    value={reservaForm.inicioEm}
                    onChange={(event) =>
                      setReservaForm((atual) => ({
                        ...atual,
                        inicioEm: event.target.value,
                      }))
                    }
                    className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    required
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Fim
                  </span>
                  <input
                    type="datetime-local"
                    value={reservaForm.fimEm}
                    onChange={(event) =>
                      setReservaForm((atual) => ({
                        ...atual,
                        fimEm: event.target.value,
                      }))
                    }
                    className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Unidade
                  </span>
                  <select
                    value={reservaForm.unidadeId}
                    onChange={(event) =>
                      setReservaForm((atual) => ({
                        ...atual,
                        unidadeId: event.target.value,
                      }))
                    }
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="">Não informar</option>
                    {unidades.map((unidade) => (
                      <option
                        key={unidade.id}
                        value={unidade.id}
                      >
                        {unidade.identificador}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Morador
                  </span>
                  <select
                    value={reservaForm.moradorId}
                    onChange={(event) =>
                      setReservaForm((atual) => ({
                        ...atual,
                        moradorId: event.target.value,
                      }))
                    }
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="">Não informar</option>
                    {moradores.map((morador) => (
                      <option
                        key={morador.id}
                        value={morador.id}
                      >
                        {morador.nome}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Observações
                </span>
                <input
                  value={reservaForm.observacoes}
                  onChange={(event) =>
                    setReservaForm((atual) => ({
                      ...atual,
                      observacoes: event.target.value,
                    }))
                  }
                  placeholder="Opcional"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <button
                type="submit"
                disabled={enviandoReserva || areasComuns.length === 0}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {enviandoReserva ? 'Salvando...' : 'Cadastrar reserva'}
              </button>
            </form>
          ) : (
            <p className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Seu perfil pode consultar reservas, mas não pode cadastrá-las.
            </p>
          )}
        </article>
      </section>

      <section className="mt-6 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div
		  className="
			flex flex-col gap-3
			md:flex-row md:items-start md:justify-between
		  "
		>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Calendário de reservas
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Agenda rápida das próximas reservas
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Acompanhe solicitações e reservas aprovadas em ordem cronológica para evitar conflito operacional nos espaços comuns.
            </p>
          </div>

          <span className="w-fit rounded-full bg-orange-50 px-4 py-2 text-xs font-bold text-orange-800">
            {resumo.proximas} próxima(s)
          </span>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {reservasAgendaOrdenadas.map((reserva) => (
            <article
  key={reserva.id}
  className="
    w-full
    min-w-0
    rounded-[2rem]
    border
    border-slate-200
    bg-white
    p-4
    shadow-sm
    transition
    hover:border-orange-200
    hover:shadow-md
    sm:p-6
  "
>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p
					  className="
						text-xs font-semibold uppercase
						tracking-[0.08em]
						text-slate-500
						leading-5
						break-words
					  "
					>
                    {reserva.areaComum.nome}
                  </p>
                  <h4
					  className="
						mt-1
						text-base sm:text-lg
						font-bold
						text-slate-950
						leading-6
						break-words
					  "
					>
                    {reserva.titulo || 'Reserva de área comum'}
                  </h4>
                </div>
				
				<div className="self-start md:self-auto">
				  <ReservaStatusBadge status={reserva.status} />
				</div>
				
              </div>
 
			    <div
				  className="
					mt-4
					grid
					grid-cols-1
					gap-2
					sm:grid-cols-2
				  "
				>
                <span className="min-w-0 overflow-hidden rounded-2xl bg-white px-3 py-2 shadow-sm">Início: {formatarData(reserva.inicioEm)}</span>
                <span className="min-w-0 overflow-hidden rounded-2xl bg-white px-3 py-2 shadow-sm">Fim: {formatarData(reserva.fimEm)}</span>
                <span className="min-w-0 overflow-hidden rounded-2xl bg-white px-3 py-2 shadow-sm">Unidade: {reserva.unidade?.identificador ?? 'Não informada'}</span>
                <span className="min-w-0 overflow-hidden rounded-2xl bg-white px-3 py-2 shadow-sm">Morador: {reserva.morador?.nome ?? 'Não informado'}</span>
              </div>

              {podeGerirReservas && reserva.status === 'APROVADA' ? (
                reservaJaTerminou(reserva) ? (
                  <button
                    type="button"
                    onClick={() => void concluirReserva(reserva.id)}
                    disabled={acaoReservaId === reserva.id}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Concluir reserva
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="A reserva só pode ser concluída após o horário final."
                    className="mt-4 inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 opacity-80"
                  >
                    <Clock3 className="h-4 w-4" />
                    Concluir após o término
                  </button>
                )
              ) : null}
            </article>
          ))}

          {reservasAgendaOrdenadas.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 lg:col-span-2">
              Nenhuma reserva solicitada ou aprovada para exibir na agenda rápida.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
          Solicitações e reservas
        </p>
        <h3 className="mt-2 text-2xl font-bold text-slate-950">
          Agenda de reservas
        </h3>

        <div className="mt-5 grid gap-4">
          {reservas.map((reserva) => (
<article
  key={reserva.id}
  className="
    w-full
    min-w-0
    rounded-[2rem]
    border
    border-slate-200
    bg-white
    p-4
    shadow-sm
    transition
    hover:border-orange-200
    hover:shadow-md
    sm:p-6
  "
>
<div
  className="
    flex
    flex-col
    gap-4
    w-full
    xl:flex-row
    xl:items-start
    xl:justify-between
  "
>
			  
				  <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <h4 className="text-base font-bold text-slate-950">
                      {reserva.titulo || reserva.areaComum.nome}
                    </h4>

					<div className="self-start md:self-auto">
					  <ReservaStatusBadge status={reserva.status} />
					</div>
					
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Área: {reserva.areaComum.nome}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <span className="
  min-w-0
  rounded-2xl
  bg-white
  px-3
  py-2
  text-sm
  font-semibold
  leading-6
  text-slate-700
  break-words
">
                      Início: {formatarData(reserva.inicioEm)}
                    </span>
                    <span className="
  min-w-0
  rounded-2xl
  bg-white
  px-3 py-2
  text-sm font-semibold
  text-slate-700
  leading-5
  break-words
					">
                      Fim: {formatarData(reserva.fimEm)}
                    </span>
                    <span className="
					      rounded-2xl
  min-w-0
  rounded-2xl
  bg-white
  px-3 py-2
  text-sm font-semibold
  text-slate-700
  leading-5
  break-words
					">
                      Unidade: {reserva.unidade?.identificador ?? 'Não informada'}
                    </span>
                    <span className="
  min-w-0
  rounded-2xl
  bg-white
  px-3 py-2
  text-sm font-semibold
  text-slate-700
  leading-5
  break-words
					">
                      Morador: {reserva.morador?.nome ?? 'Não informado'}
                    </span>
                  </div>

                  {reserva.observacoes ? (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Observações: {reserva.observacoes}
                    </p>
                  ) : null}

                  {reserva.motivoRecusa ? (
                    <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                      Motivo da recusa: {reserva.motivoRecusa}
                    </p>
                  ) : null}
                </div>

				{podeGerirReservas ? (
				  <div
					className="
					w-full
					lg:w-[320px]
					xl:w-[340px]
					xl:flex-shrink-0
					rounded-3xl
					border
					border-slate-200
					bg-slate-50
					p-4
					"
				  >
                    {reserva.status === 'SOLICITADA' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void aprovarReserva(reserva.id)}
                          disabled={acaoReservaId === reserva.id}
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprovar reserva
                        </button>

                        <label className="mt-3 grid gap-2">
                          <span className="text-sm font-semibold text-slate-700">
                            Motivo da recusa
                          </span>
                          <input
                            value={motivosRecusa[reserva.id] ?? ''}
                            onChange={(event) =>
                              setMotivosRecusa((atual) => ({
                                ...atual,
                                [reserva.id]: event.target.value,
                              }))
                            }
                            placeholder="Informe o motivo"
                            className="h-11 rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => void recusarReserva(reserva.id)}
                          disabled={acaoReservaId === reserva.id}
                          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" />
                          Recusar reserva
                        </button>
                      </>
                    ) : null}

                    {reserva.status === 'APROVADA' ||
                    reserva.status === 'SOLICITADA' ? (
                      <button
                        type="button"
                        onClick={() => void cancelarReserva(reserva.id)}
                        disabled={acaoReservaId === reserva.id}
                        className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600 disabled:opacity-60 ${
                          reserva.status === 'SOLICITADA' ? 'mt-3' : ''
                        }`}
                      >
                        <Ban className="h-4 w-4" />
                        Cancelar reserva
                      </button>
                    ) : null}

                    {reserva.status === 'APROVADA' ? (
                      reservaJaTerminou(reserva) ? (
                        <button
                          type="button"
                          onClick={() => void concluirReserva(reserva.id)}
                          disabled={acaoReservaId === reserva.id}
                          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Concluir reserva
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="A reserva só pode ser concluída após o horário final."
                          className="mt-3 inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 opacity-80"
                        >
                          <Clock3 className="h-4 w-4" />
                          Concluir após o término
                        </button>
                      )
                    ) : null}

                    {reserva.status !== 'SOLICITADA' &&
                    reserva.status !== 'APROVADA' ? (
                      <p className="text-sm leading-6 text-slate-600">
                        Esta reserva não possui ações pendentes.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          ))}

          {reservas.length === 0 && !carregando ? (
            <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Nenhuma reserva cadastrada.
            </p>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}
