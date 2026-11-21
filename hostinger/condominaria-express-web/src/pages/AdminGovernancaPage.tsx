import {
  BadgeCheck,
  Ban,
  CalendarClock,
  CheckCircle2,
  CircleStop,
  ClipboardList,
  FileText,
  Gavel,
  LoaderCircle,
  PlayCircle,
  Printer,
  RefreshCcw,
  ScrollText,
  Send,
  UsersRound,
  Vote,
  Trash2,
  UserCheck,
} from 'lucide-react';
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { AdminShell } from '../components/AdminShell';
import { useAdminRouteContext } from '../components/AdminProtectedRoute';
import { usePageTitle } from '../hooks/usePageTitle';

function listaSeguraAdminGovernanca<T = any>(valor: unknown): T[] {
  return Array.isArray(valor) ? (valor as T[]) : [];
}


import {
  apiRequest,
  ApiError,
} from '../lib/api';
import type {
  AdminAssembleiaDetalhe,
  AdminAssembleiaLista,
  AdminMorador,
  AdminAuditoriaParticipacaoVotacao,
  AdminResultadoVotacaoAssembleia,
  AdminUnidade,
  AdminVotacaoAssembleiaDetalhe,
  CancelarAssembleiaAdminPayload,
  CriarAssembleiaAdminPayload,
  CriarOpcaoVotacaoAssembleiaAdminPayload,
  CriarPautaAssembleiaAdminPayload,
  CriarVotacaoAssembleiaAdminPayload,
  DeliberarPautaAssembleiaAdminPayload,
  ModalidadeAssembleiaAdmin,
  RegistrarVotoAssembleiaAdminPayload,
  StatusAssembleiaAdmin,
  StatusPautaAssembleiaAdmin,
  StatusVotacaoAssembleiaAdmin,
  AdminPresencaAssembleia,
  AdminResumoQuorumAssembleia,
  CriarPresencaAssembleiaAdminPayload,
} from '../types/api';

const papeisGestaoGovernanca = new Set([
  'ADMINISTRADOR',
  'SINDICO',
]);

function obterMensagemErro(error: unknown, fallback: string) {
  const mensagem =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : fallback;

  const limpa = String(mensagem ?? '').trim();
  const normalizada = limpa.toLowerCase();

  if (
    !limpa ||
    normalizada.includes('internal server error') ||
    normalizada.includes('prismaclientknownrequesterror') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('cannot read properties')
  ) {
    return fallback;
  }

  return limpa;
}

function formatarDataHora(valor: string | null) {
  if (!valor) {
    return '—';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
}

function paraIsoDataHoraLocal(valor: string) {
  return new Date(valor).toISOString();
}

function rotuloModalidade(modalidade: ModalidadeAssembleiaAdmin) {
  switch (modalidade) {
    case 'PRESENCIAL':
      return 'Presencial';
    case 'ONLINE':
      return 'Online';
    case 'HIBRIDA':
      return 'Híbrida';
    default:
      return modalidade;
  }
}

function rotuloStatusAssembleia(status: StatusAssembleiaAdmin) {
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

function rotuloStatusPauta(status: StatusPautaAssembleiaAdmin) {
  switch (status) {
    case 'ABERTA':
      return 'Aberta';
    case 'DELIBERADA':
      return 'Deliberada';
    case 'CANCELADA':
      return 'Cancelada';
    default:
      return status;
  }
}

function rotuloStatusVotacao(status: StatusVotacaoAssembleiaAdmin) {
  switch (status) {
    case 'RASCUNHO':
      return 'Rascunho';
    case 'ABERTA':
      return 'Aberta';
    case 'ENCERRADA':
      return 'Encerrada';
    case 'CANCELADA':
      return 'Cancelada';
    default:
      return status;
  }
}

function classeStatusAssembleia(status: StatusAssembleiaAdmin) {
  switch (status) {
    case 'RASCUNHO':
      return 'bg-slate-100 text-slate-700';
    case 'CONVOCADA':
      return 'bg-sky-100 text-sky-800';
    case 'EM_ANDAMENTO':
      return 'bg-amber-100 text-amber-800';
    case 'ENCERRADA':
      return 'bg-emerald-100 text-emerald-800';
    case 'CANCELADA':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function classeStatusPauta(status: StatusPautaAssembleiaAdmin) {
  switch (status) {
    case 'ABERTA':
      return 'bg-amber-100 text-amber-800';
    case 'DELIBERADA':
      return 'bg-emerald-100 text-emerald-800';
    case 'CANCELADA':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function classeStatusVotacao(status: StatusVotacaoAssembleiaAdmin) {
  switch (status) {
    case 'RASCUNHO':
      return 'bg-slate-100 text-slate-700';
    case 'ABERTA':
      return 'bg-orange-100 text-orange-800';
    case 'ENCERRADA':
      return 'bg-emerald-100 text-emerald-800';
    case 'CANCELADA':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function AssembleiaStatusBadge({
  status,
}: {
  status: StatusAssembleiaAdmin;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${classeStatusAssembleia(
        status,
      )}`}
    >
      {rotuloStatusAssembleia(status)}
    </span>
  );
}

function PautaStatusBadge({
  status,
}: {
  status: StatusPautaAssembleiaAdmin;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${classeStatusPauta(
        status,
      )}`}
    >
      {rotuloStatusPauta(status)}
    </span>
  );
}

function VotacaoStatusBadge({
  status,
  prefixo,
}: {
  status: StatusVotacaoAssembleiaAdmin;
  prefixo?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${classeStatusVotacao(
        status,
      )}`}
    >
      {prefixo ? `${prefixo}: ` : ''}
      {rotuloStatusVotacao(status)}
    </span>
  );
}


type VotacaoFormPorPauta = Record<
  number,
  {
    titulo: string;
    descricao: string;
  }
>;

type OpcaoFormPorVotacao = Record<
  number,
  {
    descricao: string;
    ordem: string;
  }
>;

type VotoFormPorVotacao = Record<
  number,
  {
    opcaoId: string;
    unidadeId: string;
    moradorId: string;
    observacoes: string;
  }
>;

type PresencaAssembleiaForm = {
  unidadeId: string;
  moradorId: string;
  nomeRepresentante: string;
  documentoRepresentante: string;
  porProcuracao: boolean;
  procuracaoObservacoes: string;
  observacoes: string;
};

const presencaAssembleiaFormInicial: PresencaAssembleiaForm = {
  unidadeId: '',
  moradorId: '',
  nomeRepresentante: '',
  documentoRepresentante: '',
  porProcuracao: false,
  procuracaoObservacoes: '',
  observacoes: '',
};

export function AdminGovernancaPage() {
  usePageTitle('Governança Administrativa');

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

  const [assembleias, setAssembleias] = useState<AdminAssembleiaLista[]>([]);
  const [assembleiaSelecionadaId, setAssembleiaSelecionadaId] =
    useState<number | null>(null);
  const [assembleiaDetalhe, setAssembleiaDetalhe] =
    useState<AdminAssembleiaDetalhe | null>(null);

  const [unidades, setUnidades] = useState<AdminUnidade[]>([]);
  const [moradores, setMoradores] = useState<AdminMorador[]>([]);

  const [presencasAssembleia, setPresencasAssembleia] =
    useState<AdminPresencaAssembleia[]>([]);

  const [resumoQuorumAssembleia, setResumoQuorumAssembleia] =
    useState<AdminResumoQuorumAssembleia | null>(null);

  const [votacaoDetalhe, setVotacaoDetalhe] =
    useState<AdminVotacaoAssembleiaDetalhe | null>(null);
  const [resultadoVotacao, setResultadoVotacao] =
    useState<AdminResultadoVotacaoAssembleia | null>(null);
  const [auditoriaParticipacaoVotacao, setAuditoriaParticipacaoVotacao] =
    useState<AdminAuditoriaParticipacaoVotacao | null>(null);

  const [resultadosAtaAssembleia, setResultadosAtaAssembleia] =
    useState<Record<number, AdminResultadoVotacaoAssembleia>>({});

  const [carregandoAtaAssembleia, setCarregandoAtaAssembleia] =
    useState(false);

  const [preparandoPacoteDocumental, setPreparandoPacoteDocumental] =
    useState(false);

  const [carregando, setCarregando] = useState(false);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [carregandoVotacao, setCarregandoVotacao] = useState(false);
  const [carregandoAuditoriaParticipacao, setCarregandoAuditoriaParticipacao] =
    useState(false);
  const [erroAuditoriaParticipacao, setErroAuditoriaParticipacao] =
    useState('');
  const [carregandoPresencas, setCarregandoPresencas] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState('');
  const [erroAcao, setErroAcao] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const [acaoEmExecucao, setAcaoEmExecucao] = useState<string | null>(null);
  const [confirmacaoEncerramentoVotacao, setConfirmacaoEncerramentoVotacao] =
    useState<{
      votacaoId: number;
      titulo: string;
      pautaTitulo: string;
    } | null>(null);
  const [confirmacaoEncerramentoAssembleia, setConfirmacaoEncerramentoAssembleia] =
    useState<{
      id: number;
      titulo: string;
    } | null>(null);

  const [assembleiaForm, setAssembleiaForm] = useState({
    titulo: '',
    descricao: '',
    modalidade: 'PRESENCIAL' as ModalidadeAssembleiaAdmin,
    local: '',
    linkOnline: '',
    primeiraChamadaEm: '',
    segundaChamadaEm: '',
  });

  const [cancelamentoAssembleia, setCancelamentoAssembleia] =
    useState<Record<number, string>>({});

  const [pautaForm, setPautaForm] = useState({
    titulo: '',
    descricao: '',
    ordem: '',
  });

  const [deliberacaoPauta, setDeliberacaoPauta] =
    useState<Record<number, string>>({});

  const [votacaoFormPorPauta, setVotacaoFormPorPauta] =
    useState<VotacaoFormPorPauta>({});

  const [opcaoFormPorVotacao, setOpcaoFormPorVotacao] =
    useState<OpcaoFormPorVotacao>({});

  const [votoFormPorVotacao, setVotoFormPorVotacao] =
    useState<VotoFormPorVotacao>({});

  const [presencaForm, setPresencaForm] =
    useState<PresencaAssembleiaForm>(presencaAssembleiaFormInicial);

  const condominioSelecionado =
    condominiosAdministrativos.find(
      (vinculo) => vinculo.condominio.id === condominioId,
    ) ?? null;

  const podeGerirGovernanca =
    usuario.superAdmin ||
    Boolean(
      condominioSelecionado &&
        papeisGestaoGovernanca.has(condominioSelecionado.papel),
    );

  const resumo = useMemo(() => {
    const rascunhos = assembleias.filter(
      (assembleia) => assembleia.status === 'RASCUNHO',
    ).length;

    const convocadas = assembleias.filter(
      (assembleia) => assembleia.status === 'CONVOCADA',
    ).length;

    const emAndamento = assembleias.filter(
      (assembleia) => assembleia.status === 'EM_ANDAMENTO',
    ).length;

    const encerradas = assembleias.filter(
      (assembleia) => assembleia.status === 'ENCERRADA',
    ).length;

    return {
      total: assembleias.length,
      rascunhos,
      convocadas,
      emAndamento,
      encerradas,
    };
  }, [assembleias]);

  const resumoOperacionalGovernanca = useMemo(() => {
    const pautasDetalhe = listaSeguraAdminGovernanca(assembleiaDetalhe?.pautas);

    const pautasAbertas = pautasDetalhe.filter(
      (pauta) => pauta.status === 'ABERTA',
    ).length;

    const pautasDeliberadas = pautasDetalhe.filter(
      (pauta) => pauta.status === 'DELIBERADA',
    ).length;

    let votacoesAbertas = 0;
    let votacoesEncerradas = 0;

    for (const pauta of pautasDetalhe) {
      const votacao = pauta.votacao;

      if (votacao?.status === 'ABERTA') {
        votacoesAbertas += 1;
      }

      if (votacao?.status === 'ENCERRADA') {
        votacoesEncerradas += 1;
      }
    }

    const percentualQuorum =
      resumoQuorumAssembleia?.percentualPresenca ?? 0;

    return {
      pautas: pautasDetalhe.length,
      pautasAbertas,
      pautasDeliberadas,
      votacoesAbertas,
      votacoesEncerradas,
      presencas: presencasAssembleia.length,
      quorumFormatado: `${percentualQuorum.toFixed(2).replace('.', ',')}%`,
      statusAtual: assembleiaDetalhe
        ? rotuloStatusAssembleia(assembleiaDetalhe.status)
        : 'Nenhuma assembleia selecionada',
    };
  }, [
    assembleiaDetalhe,
    presencasAssembleia.length,
    resumoQuorumAssembleia,
  ]);

  const proximasAcoesGovernanca = useMemo(() => {
    if (!podeGerirGovernanca) {
      return [
        'Perfil em modo consulta: acompanhe assembleias, votações, ata e quórum disponíveis.',
      ];
    }

    if (!assembleiaDetalhe) {
      return [
        'Selecione uma assembleia cadastrada ou crie uma nova assembleia.',
        'Após selecionar, cadastre pautas e prepare a convocação.',
      ];
    }

    switch (assembleiaDetalhe.status) {
      case 'RASCUNHO':
        return [
          'Revise título, datas, modalidade e pautas cadastradas.',
          'Convocar assembleia quando as informações estiverem conferidas.',
        ];
      case 'CONVOCADA':
        return [
          'Registrar presenças das unidades participantes.',
          'Iniciar assembleia quando houver quórum operacional suficiente.',
        ];
      case 'EM_ANDAMENTO':
        return resumoOperacionalGovernanca.votacoesAbertas > 0
          ? [
              'Acompanhar votação aberta e orientar participantes.',
              'Encerrar votação para liberar apuração e resultado consolidado.',
            ]
          : [
              'Deliberar pautas abertas ou criar votação vinculada à pauta.',
              'Encerrar assembleia após concluir presenças, pautas e votações.',
            ];
      case 'ENCERRADA':
        return [
          'Revisar resultados das votações encerradas.',
          'Imprimir ata/resumo e lista de presença para arquivo administrativo.',
        ];
      case 'CANCELADA':
        return [
          'Assembleia cancelada: consulte o motivo e crie nova assembleia se necessário.',
        ];
      default:
        return [
          'Revise o status da assembleia e continue o fluxo administrativo.',
        ];
    }
  }, [
    assembleiaDetalhe,
    podeGerirGovernanca,
    resumoOperacionalGovernanca.votacoesAbertas,
  ]);

  const moradoresPresencaDisponiveis = useMemo(() => {
    const unidadeId = Number(presencaForm.unidadeId);

    if (!unidadeId) {
      return [];
    }

    return moradores.filter((morador) =>
      morador.unidades.some(
        (vinculo) => vinculo.unidade.id === unidadeId,
      ),
    );
  }, [moradores, presencaForm.unidadeId]);

  const paragrafosSinteseAta = useMemo(() => {
    if (!assembleiaDetalhe) {
      return [];
    }

    const nomeCondominio =
      condominioSelecionado?.condominio.nome ?? 'condomínio selecionado';

    const pautas = listaSeguraAdminGovernanca(assembleiaDetalhe.pautas);
    const votacoesEncerradas = pautas.filter(
      (pauta) => pauta.votacao?.status === 'ENCERRADA',
    );

    const paragrafos: string[] = [];

    paragrafos.push(
      `Aos ${formatarDataHora(
        assembleiaDetalhe.primeiraChamadaEm,
      )}, foi registrada a assembleia “${assembleiaDetalhe.titulo}” do ${nomeCondominio}, em modalidade ${rotuloModalidade(
        assembleiaDetalhe.modalidade,
      ).toLowerCase()}, com status atual “${rotuloStatusAssembleia(
        assembleiaDetalhe.status,
      )}”.`,
    );

    if (resumoQuorumAssembleia) {
      paragrafos.push(
        `Quanto ao quórum, foram registradas ${resumoQuorumAssembleia.unidadesPresentes} unidade(s) presente(s) de um total de ${resumoQuorumAssembleia.totalUnidades} unidade(s), correspondendo a ${resumoQuorumAssembleia.percentualPresenca.toFixed(
          2,
        )}% de participação. A relação individualizada das presenças, inclusive eventuais representações por procuração, consta neste documento.`,
      );
    } else {
      paragrafos.push(
        'O resumo de quórum ainda não estava disponível no momento da geração desta ata.',
      );
    }

    if (pautas.length === 0) {
      paragrafos.push(
        'Não havia pautas cadastradas para composição da ordem do dia no momento da geração desta ata.',
      );
    } else {
      const ordemDoDia = pautas
        .map((pauta, indice) => `${indice + 1}. ${pauta.titulo}`)
        .join('; ');

      paragrafos.push(
        `A ordem do dia foi composta por ${pautas.length} pauta(s): ${ordemDoDia}.`,
      );
    }

    if (votacoesEncerradas.length === 0) {
      paragrafos.push(
        'Até a emissão deste documento, não havia votações encerradas com apuração consolidada para registro sintético.',
      );
    } else {
      const resumoVotacoes = votacoesEncerradas
        .map((pauta) => {
          const votacao = pauta.votacao!;
          const resultado = resultadosAtaAssembleia[votacao.id];

          if (!resultado) {
            return `“${votacao.titulo}”, vinculada à pauta “${pauta.titulo}”, com resultado ainda indisponível`;
          }

          return `“${votacao.titulo}”, vinculada à pauta “${pauta.titulo}”, com ${resultado.totalVotos} voto(s) apurado(s)`;
        })
        .join('; ');

      paragrafos.push(
        `Foram identificadas ${votacoesEncerradas.length} votação(ões) encerrada(s): ${resumoVotacoes}. Os resultados detalhados permanecem discriminados na seção de apurações.`,
      );
    }

    paragrafos.push(
      'Esta síntese automática consolida os principais dados administrativos da assembleia, sem substituir a conferência formal das presenças, pautas, deliberações e apurações detalhadas nas seções seguintes.',
    );

    return paragrafos;
  }, [
    assembleiaDetalhe,
    condominioSelecionado,
    resumoQuorumAssembleia,
    resultadosAtaAssembleia,
  ]);

  async function carregarDados(id: number) {
    if (!id) {
      return;
    }

    setCarregando(true);
    setErroCarregamento('');

    try {
      const [
        assembleiasResposta,
        unidadesResposta,
        moradoresResposta,
      ] = await Promise.all([
        apiRequest<AdminAssembleiaLista[]>(
          `/condominios/${id}/assembleias`,
        ),
        apiRequest<AdminUnidade[]>(
          `/condominios/${id}/unidades`,
        ),
        apiRequest<AdminMorador[]>(
          `/condominios/${id}/moradores`,
        ),
      ]);

      setAssembleias(assembleiasResposta);
      setUnidades(unidadesResposta);
      setMoradores(moradoresResposta);

      setAssembleiaSelecionadaId((atual) => {
        if (
          atual &&
          assembleiasResposta.some((assembleia) => assembleia.id === atual)
        ) {
          return atual;
        }

        return assembleiasResposta[0]?.id ?? null;
      });

      if (assembleiasResposta.length === 0) {
        setAssembleiaDetalhe(null);
        setVotacaoDetalhe(null);
        setResultadoVotacao(null);
      }
    } catch (error) {
      setErroCarregamento(
        obterMensagemErro(
          error,
          'Não foi possível carregar os dados de governança.',
        ),
      );
    } finally {
      setCarregando(false);
    }
  }

  async function carregarDetalheAssembleia(
    idCondominio: number,
    assembleiaId: number,
  ) {
    setCarregandoDetalhe(true);

    try {
      const resposta = await apiRequest<AdminAssembleiaDetalhe>(
        `/condominios/${idCondominio}/assembleias/${assembleiaId}`,
      );

      setAssembleiaDetalhe(resposta);
      void carregarPresencasEQuorum(idCondominio, assembleiaId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível carregar o detalhe da assembleia.',
        ),
      );
      setAssembleiaDetalhe(null);
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  async function carregarPresencasEQuorum(
    idCondominio: number,
    assembleiaId: number,
  ) {
    setCarregandoPresencas(true);

    try {
      const [
        presencasResposta,
        quorumResposta,
      ] = await Promise.all([
        apiRequest<AdminPresencaAssembleia[]>(
          `/condominios/${idCondominio}/assembleias/${assembleiaId}/presencas`,
        ),
        apiRequest<AdminResumoQuorumAssembleia>(
          `/condominios/${idCondominio}/assembleias/${assembleiaId}/quorum`,
        ),
      ]);

      setPresencasAssembleia(presencasResposta);
      setResumoQuorumAssembleia(quorumResposta);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível carregar as presenças e o quórum da assembleia.',
        ),
      );

      setPresencasAssembleia([]);
      setResumoQuorumAssembleia(null);
    } finally {
      setCarregandoPresencas(false);
    }
  }

  function rolarParaBlocoGovernanca(
    alvo: 'votacao' | 'resultado' | 'auditoria',
  ) {
    const termos = {
      votacao: 'Detalhes operacionais da votação',
      resultado: 'Apuração consolidada',
      auditoria: 'Auditoria de participação',
    } as const;

    window.setTimeout(() => {
      const candidatos = Array.from(
        document.querySelectorAll<HTMLElement>('article, section'),
      );

      const elemento = candidatos.find((item) =>
        item.textContent?.includes(termos[alvo]),
      );

      elemento?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 120);
  }

  async function carregarVotacao(
    assembleiaId: number,
    votacaoId: number,
  ) {
    if (!condominioId) {
      return;
    }

    setCarregandoVotacao(true);
    setErroAcao('');

    try {
      const resposta = await apiRequest<AdminVotacaoAssembleiaDetalhe>(
        `/condominios/${condominioId}/assembleias/${assembleiaId}/votacoes/${votacaoId}`,
      );

      setVotacaoDetalhe(resposta);
      setResultadoVotacao(null);
      setAuditoriaParticipacaoVotacao(null);
      rolarParaBlocoGovernanca('votacao');

      if (resposta.status === 'ENCERRADA') {
        await carregarResultadoVotacao(assembleiaId, votacaoId);
        await carregarAuditoriaParticipacao(assembleiaId, votacaoId);
      }
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível carregar os detalhes da votação.',
        ),
      );
    } finally {
      setCarregandoVotacao(false);
    }
  }

  async function carregarResultadoVotacao(
    assembleiaId: number,
    votacaoId: number,
  ) {
    if (!condominioId) {
      return;
    }

    setCarregandoVotacao(true);
    setErroAcao('');

    try {
      const resposta = await apiRequest<AdminResultadoVotacaoAssembleia>(
        `/condominios/${condominioId}/assembleias/${assembleiaId}/votacoes/${votacaoId}/resultados`,
      );

      setResultadoVotacao(resposta);
      rolarParaBlocoGovernanca('resultado');

      if (assembleiaDetalhe?.status === 'ENCERRADA') {
        await carregarAuditoriaParticipacao(assembleiaId, votacaoId);
      }
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível carregar o resultado da votação.',
        ),
      );
    } finally {
      setCarregandoVotacao(false);
    }
  }

  async function carregarAuditoriaParticipacao(
    assembleiaId: number,
    votacaoId: number,
  ) {
    if (!condominioId) {
      return;
    }

    setCarregandoAuditoriaParticipacao(true);
    setErroAcao('');
    setErroAuditoriaParticipacao('');
    setAuditoriaParticipacaoVotacao(null);

    try {
      const resposta =
        await apiRequest<AdminAuditoriaParticipacaoVotacao>(
          `/condominios/${condominioId}/assembleias/${assembleiaId}/votacoes/${votacaoId}/auditoria-participacao`,
        );

      setAuditoriaParticipacaoVotacao(resposta);
      rolarParaBlocoGovernanca('auditoria');
      setErroAuditoriaParticipacao('');
    } catch (error) {
      const mensagemAuditoria = obterMensagemErro(
        error,
        'Não foi possível carregar a auditoria de participação da votação.',
      );

      setErroAcao(mensagemAuditoria);
      setErroAuditoriaParticipacao(mensagemAuditoria);
      setAuditoriaParticipacaoVotacao(null);
    } finally {
      setCarregandoAuditoriaParticipacao(false);
    }
  }

  useEffect(() => {
    void carregarDados(condominioId);
  }, [condominioId]);

  useEffect(() => {
    if (!condominioId || !assembleiaSelecionadaId) {
      return;
    }

    void carregarDetalheAssembleia(
      condominioId,
      assembleiaSelecionadaId,
    );
  }, [condominioId, assembleiaSelecionadaId]);

  useEffect(() => {
    let ativo = true;

    async function prepararAtaSelecionada() {
      setResultadosAtaAssembleia({});

      if (!condominioId || !assembleiaDetalhe) {
        setCarregandoAtaAssembleia(false);
        return;
      }

      setCarregandoAtaAssembleia(true);

      try {
        await carregarResultadosAtaAssembleia();
      } catch (error) {
        if (ativo) {
          setErroAcao(
            obterMensagemErro(
              error,
              'Não foi possível pré-carregar todas as apurações da ata.',
            ),
          );
        }
      } finally {
        if (ativo) {
          setCarregandoAtaAssembleia(false);
        }
      }
    }

    void prepararAtaSelecionada();

    return () => {
      ativo = false;
    };
  }, [condominioId, assembleiaDetalhe]);

  async function registrarPresencaAssembleia(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !condominioId ||
      !assembleiaDetalhe ||
      acaoEmExecucao !== null
    ) {
      return;
    }

    if (!presencaForm.unidadeId) {
      setErroAcao('Selecione a unidade presente.');
      return;
    }

    if (
      presencaForm.porProcuracao &&
      !presencaForm.nomeRepresentante.trim()
    ) {
      setErroAcao(
        'Informe o nome do representante para registrar presença por procuração.',
      );
      return;
    }

    const payload: CriarPresencaAssembleiaAdminPayload = {
      unidadeId: Number(presencaForm.unidadeId),
    };

    if (presencaForm.moradorId) {
      payload.moradorId = Number(presencaForm.moradorId);
    }

    if (presencaForm.nomeRepresentante.trim()) {
      payload.nomeRepresentante =
        presencaForm.nomeRepresentante.trim();
    }

    if (presencaForm.documentoRepresentante.trim()) {
      payload.documentoRepresentante =
        presencaForm.documentoRepresentante.trim();
    }

    payload.porProcuracao = presencaForm.porProcuracao;

    if (
      presencaForm.porProcuracao &&
      presencaForm.procuracaoObservacoes.trim()
    ) {
      payload.procuracaoObservacoes =
        presencaForm.procuracaoObservacoes.trim();
    }

    if (presencaForm.observacoes.trim()) {
      payload.observacoes = presencaForm.observacoes.trim();
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoEmExecucao('registrar-presenca');

    try {
      await apiRequest(
        `/condominios/${condominioId}/assembleias/${assembleiaDetalhe.id}/presencas`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setPresencaForm(presencaAssembleiaFormInicial);
      setMensagemSucesso('Presença registrada com sucesso.');

      await carregarPresencasEQuorum(
        condominioId,
        assembleiaDetalhe.id,
      );
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível registrar a presença.',
        ),
      );
    } finally {
      setAcaoEmExecucao(null);
    }
  }

  async function removerPresencaAssembleia(
    presencaId: number,
  ) {
    if (
      !condominioId ||
      !assembleiaDetalhe ||
      acaoEmExecucao !== null
    ) {
      return;
    }

    const confirmar = window.confirm(
      'Deseja remover esta presença da assembleia?',
    );

    if (!confirmar) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoEmExecucao(`remover-presenca-${presencaId}`);

    try {
      await apiRequest(
        `/condominios/${condominioId}/assembleias/${assembleiaDetalhe.id}/presencas/${presencaId}`,
        {
          method: 'DELETE',
        },
      );

      setMensagemSucesso('Presença removida com sucesso.');

      await carregarPresencasEQuorum(
        condominioId,
        assembleiaDetalhe.id,
      );
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível remover a presença.',
        ),
      );
    } finally {
      setAcaoEmExecucao(null);
    }
  }

  async function criarAssembleia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || acaoEmExecucao !== null) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoEmExecucao('criar-assembleia');

    const payload: CriarAssembleiaAdminPayload = {
      titulo: assembleiaForm.titulo.trim(),
      modalidade: assembleiaForm.modalidade,
      primeiraChamadaEm: paraIsoDataHoraLocal(
        assembleiaForm.primeiraChamadaEm,
      ),
    };

    if (assembleiaForm.descricao.trim()) {
      payload.descricao = assembleiaForm.descricao.trim();
    }

    if (assembleiaForm.local.trim()) {
      payload.local = assembleiaForm.local.trim();
    }

    if (assembleiaForm.linkOnline.trim()) {
      payload.linkOnline = assembleiaForm.linkOnline.trim();
    }

    if (assembleiaForm.segundaChamadaEm) {
      payload.segundaChamadaEm = paraIsoDataHoraLocal(
        assembleiaForm.segundaChamadaEm,
      );
    }

    try {
      const novaAssembleia = await apiRequest<AdminAssembleiaDetalhe>(
        `/condominios/${condominioId}/assembleias`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setAssembleiaForm({
        titulo: '',
        descricao: '',
        modalidade: 'PRESENCIAL',
        local: '',
        linkOnline: '',
        primeiraChamadaEm: '',
        segundaChamadaEm: '',
      });

      setMensagemSucesso('Assembleia cadastrada com sucesso.');
      await carregarDados(condominioId);
      setAssembleiaSelecionadaId(novaAssembleia.id);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível cadastrar a assembleia.',
        ),
      );
    } finally {
      setAcaoEmExecucao(null);
    }
  }

  async function confirmarEncerramentoAssembleia() {
    if (confirmacaoEncerramentoAssembleia === null) {
      return;
    }

    await executarAcaoAssembleia(
      confirmacaoEncerramentoAssembleia.id,
      'encerrar',
      'Assembleia encerrada com sucesso.',
      true,
    );

    setConfirmacaoEncerramentoAssembleia(null);
  }

  async function executarAcaoAssembleia(
    assembleiaId: number,
    acao: 'convocar' | 'iniciar' | 'encerrar',
    mensagem: string,
confirmado = false,
  ) {
    if (acao === 'encerrar' && confirmado === false) {
      setErroAcao('');
      setConfirmacaoEncerramentoAssembleia({
        id: assembleiaDetalhe?.id ?? 0,
        titulo: assembleiaDetalhe?.titulo ?? 'Assembleia selecionada',
      });
      return;
    }

    if (!condominioId || acaoEmExecucao !== null) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoEmExecucao(`${acao}-assembleia-${assembleiaId}`);

    try {
      await apiRequest(
        `/condominios/${condominioId}/assembleias/${assembleiaId}/${acao}`,
        {
          method: 'PATCH',
        },
      );

      setMensagemSucesso(mensagem);
      await carregarDados(condominioId);
      await carregarDetalheAssembleia(condominioId, assembleiaId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível executar a ação na assembleia.',
        ),
      );
    } finally {
      setAcaoEmExecucao(null);
    }
  }

  async function cancelarAssembleia(assembleiaId: number) {
    if (!condominioId || acaoEmExecucao !== null) {
      return;
    }

    const motivo = cancelamentoAssembleia[assembleiaId]?.trim();

    if (!motivo || motivo.length < 3) {
      setErroAcao('Informe o motivo do cancelamento da assembleia.');
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoEmExecucao(`cancelar-assembleia-${assembleiaId}`);

    const payload: CancelarAssembleiaAdminPayload = {
      motivoCancelamento: motivo,
    };

    try {
      await apiRequest(
        `/condominios/${condominioId}/assembleias/${assembleiaId}/cancelar`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso('Assembleia cancelada com sucesso.');
      await carregarDados(condominioId);
      await carregarDetalheAssembleia(condominioId, assembleiaId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível cancelar a assembleia.',
        ),
      );
    } finally {
      setAcaoEmExecucao(null);
    }
  }

  async function criarPauta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !condominioId ||
      !assembleiaSelecionadaId ||
      acaoEmExecucao !== null
    ) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoEmExecucao('criar-pauta');

    const payload: CriarPautaAssembleiaAdminPayload = {
      titulo: pautaForm.titulo.trim(),
    };

    if (pautaForm.descricao.trim()) {
      payload.descricao = pautaForm.descricao.trim();
    }

    if (pautaForm.ordem.trim()) {
      payload.ordem = Number(pautaForm.ordem);
    }

    try {
      await apiRequest(
        `/condominios/${condominioId}/assembleias/${assembleiaSelecionadaId}/pautas`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setPautaForm({
        titulo: '',
        descricao: '',
        ordem: '',
      });

      setMensagemSucesso('Pauta criada com sucesso.');
      await carregarDados(condominioId);
      await carregarDetalheAssembleia(
        condominioId,
        assembleiaSelecionadaId,
      );
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível criar a pauta.',
        ),
      );
    } finally {
      setAcaoEmExecucao(null);
    }
  }

  async function deliberarPauta(pautaId: number) {
    if (
      !condominioId ||
      !assembleiaSelecionadaId ||
      acaoEmExecucao !== null
    ) {
      return;
    }

    const deliberacao = deliberacaoPauta[pautaId]?.trim();

    if (!deliberacao || deliberacao.length < 5) {
      setErroAcao('Informe a deliberação da pauta com ao menos 5 caracteres.');
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoEmExecucao(`deliberar-pauta-${pautaId}`);

    const payload: DeliberarPautaAssembleiaAdminPayload = {
      deliberacao,
    };

    try {
      await apiRequest(
        `/condominios/${condominioId}/assembleias/${assembleiaSelecionadaId}/pautas/${pautaId}/deliberar`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso('Pauta deliberada com sucesso.');
      await carregarDados(condominioId);
      await carregarDetalheAssembleia(
        condominioId,
        assembleiaSelecionadaId,
      );
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível deliberar a pauta.',
        ),
      );
    } finally {
      setAcaoEmExecucao(null);
    }
  }

  async function criarVotacao(pautaId: number) {
    if (
      !condominioId ||
      !assembleiaSelecionadaId ||
      acaoEmExecucao !== null
    ) {
      return;
    }

    const formulario = votacaoFormPorPauta[pautaId] ?? {
      titulo: '',
      descricao: '',
    };

    const titulo = formulario.titulo.trim();

    if (titulo.length < 5) {
      setErroAcao('Informe um título de votação com ao menos 5 caracteres.');
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoEmExecucao(`criar-votacao-pauta-${pautaId}`);

    const payload: CriarVotacaoAssembleiaAdminPayload = {
      titulo,
    };

    if (formulario.descricao.trim()) {
      payload.descricao = formulario.descricao.trim();
    }

    try {
      const votacaoCriada = await apiRequest<{ id: number }>(
        `/condominios/${condominioId}/assembleias/${assembleiaSelecionadaId}/pautas/${pautaId}/votacao`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setVotacaoFormPorPauta((atual) => ({
        ...atual,
        [pautaId]: {
          titulo: '',
          descricao: '',
        },
      }));

      setMensagemSucesso('Votação criada com sucesso.');
      await carregarDados(condominioId);
      await carregarDetalheAssembleia(
        condominioId,
        assembleiaSelecionadaId,
      );
      await carregarVotacao(
        assembleiaSelecionadaId,
        votacaoCriada.id,
      );
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível criar a votação.',
        ),
      );
    } finally {
      setAcaoEmExecucao(null);
    }
  }

  async function criarOpcaoVotacao(votacaoId: number) {
    if (
      !condominioId ||
      !assembleiaSelecionadaId ||
      acaoEmExecucao !== null
    ) {
      return;
    }

    const formulario = opcaoFormPorVotacao[votacaoId] ?? {
      descricao: '',
      ordem: '',
    };

    const descricao = formulario.descricao.trim();

    if (!descricao) {
      setErroAcao('Informe a descrição da opção de voto.');
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoEmExecucao(`criar-opcao-votacao-${votacaoId}`);

    const payload: CriarOpcaoVotacaoAssembleiaAdminPayload = {
      descricao,
    };

    if (formulario.ordem.trim()) {
      payload.ordem = Number(formulario.ordem);
    }

    try {
      await apiRequest(
        `/condominios/${condominioId}/assembleias/${assembleiaSelecionadaId}/votacoes/${votacaoId}/opcoes`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setOpcaoFormPorVotacao((atual) => ({
        ...atual,
        [votacaoId]: {
          descricao: '',
          ordem: '',
        },
      }));

      setMensagemSucesso('Opção de voto adicionada.');
      await carregarDetalheAssembleia(
        condominioId,
        assembleiaSelecionadaId,
      );

      if (votacaoDetalhe?.id === votacaoId) {
        await carregarVotacao(
          assembleiaSelecionadaId,
          votacaoId,
        );
      }
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível adicionar a opção de voto.',
        ),
      );
    } finally {
      setAcaoEmExecucao(null);
    }
  }

  async function confirmarEncerramentoVotacao() {
    if (confirmacaoEncerramentoVotacao === null) {
      return;
    }

    await executarAcaoVotacao(
      confirmacaoEncerramentoVotacao.votacaoId,
      'encerrar',
      'Votação encerrada com sucesso.',
      true,
    );

    setConfirmacaoEncerramentoVotacao(null);
  }

  async function executarAcaoVotacao(
    votacaoId: number,
    acao: 'abrir' | 'encerrar',
    mensagem: string,
confirmado = false,
  ) {
    if (acao === 'encerrar' && confirmado === false) {
      const pautaVinculada = listaSeguraAdminGovernanca(
        assembleiaDetalhe?.pautas,
      ).find((pauta: any) => pauta.votacao?.id === votacaoId);

      setErroAcao('');
      setConfirmacaoEncerramentoVotacao({
        votacaoId,
        titulo:
          pautaVinculada?.votacao?.titulo ??
          votacaoDetalhe?.titulo ??
          'Detalhes operacionais da votação',
        pautaTitulo:
          pautaVinculada?.titulo ??
          votacaoDetalhe?.pauta?.titulo ??
          'Pauta vinculada',
      });
      return;
    }

    if (
      !condominioId ||
      !assembleiaSelecionadaId ||
      acaoEmExecucao !== null
    ) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoEmExecucao(`${acao}-votacao-${votacaoId}`);

    try {
      await apiRequest(
        `/condominios/${condominioId}/assembleias/${assembleiaSelecionadaId}/votacoes/${votacaoId}/${acao}`,
        {
          method: 'PATCH',
        },
      );

      setMensagemSucesso(mensagem);
      await carregarDetalheAssembleia(
        condominioId,
        assembleiaSelecionadaId,
      );
      await carregarVotacao(
        assembleiaSelecionadaId,
        votacaoId,
      );

      if (acao === 'encerrar' && confirmado === false) {
        await carregarResultadoVotacao(
          assembleiaSelecionadaId,
          votacaoId,
        );
      }
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível executar a ação na votação.',
        ),
      );
    } finally {
      setAcaoEmExecucao(null);
    }
  }

  async function registrarVoto(votacaoId: number) {
    if (
      !condominioId ||
      !assembleiaSelecionadaId ||
      acaoEmExecucao !== null
    ) {
      return;
    }

    const formulario = votoFormPorVotacao[votacaoId] ?? {
      opcaoId: '',
      unidadeId: '',
      moradorId: '',
      observacoes: '',
    };

    if (!formulario.opcaoId || !formulario.unidadeId) {
      setErroAcao('Selecione a opção de voto e a unidade votante.');
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoEmExecucao(`registrar-voto-${votacaoId}`);

    const payload: RegistrarVotoAssembleiaAdminPayload = {
      opcaoId: Number(formulario.opcaoId),
      unidadeId: Number(formulario.unidadeId),
    };

    if (formulario.moradorId) {
      payload.moradorId = Number(formulario.moradorId);
    }

    if (formulario.observacoes.trim()) {
      payload.observacoes = formulario.observacoes.trim();
    }

    try {
      await apiRequest(
        `/condominios/${condominioId}/assembleias/${assembleiaSelecionadaId}/votacoes/${votacaoId}/votos`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setVotoFormPorVotacao((atual) => ({
        ...atual,
        [votacaoId]: {
          opcaoId: '',
          unidadeId: '',
          moradorId: '',
          observacoes: '',
        },
      }));

      setMensagemSucesso('Voto registrado com sucesso.');
      await carregarDetalheAssembleia(
        condominioId,
        assembleiaSelecionadaId,
      );
      await carregarVotacao(
        assembleiaSelecionadaId,
        votacaoId,
      );
      await carregarResultadoVotacao(
        assembleiaSelecionadaId,
        votacaoId,
      );
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível registrar o voto.',
        ),
      );
    } finally {
      setAcaoEmExecucao(null);
    }
  }

  async function carregarResultadosAtaAssembleia() {
    if (!condominioId || !assembleiaDetalhe) {
      return {};
    }

    const votacoesEncerradas = assembleiaDetalhe.pautas
      .map((pauta) => pauta.votacao)
      .filter(
        (
          votacao,
        ): votacao is NonNullable<typeof votacao> =>
          Boolean(votacao && votacao.status === 'ENCERRADA'),
      );

    if (votacoesEncerradas.length === 0) {
      setResultadosAtaAssembleia({});
      return {};
    }

    const resultados = await Promise.all(
      votacoesEncerradas.map(async (votacao) => {
        const resposta =
          await apiRequest<AdminResultadoVotacaoAssembleia>(
            `/condominios/${condominioId}/assembleias/${assembleiaDetalhe.id}/votacoes/${votacao.id}/resultados`,
          );

        return [votacao.id, resposta] as const;
      }),
    );

    const mapaResultados = Object.fromEntries(resultados) as Record<
      number,
      AdminResultadoVotacaoAssembleia
    >;

    setResultadosAtaAssembleia(mapaResultados);

    return mapaResultados;
  }

  function imprimirResumoAssembleia() {
    if (!assembleiaDetalhe || carregandoAtaAssembleia) {
      return;
    }

    flushSync(() => {
      setErroAcao('');
      setCarregandoAtaAssembleia(true);
    });

    const areaImpressao = document.getElementById(
      'ata-assembleia-impressao',
    );

    if (!areaImpressao) {
      setErroAcao(
        'Não foi possível localizar o conteúdo da ata para impressão.',
      );
      setCarregandoAtaAssembleia(false);
      return;
    }

    const janelaImpressao = window.open(
      '',
      '_blank',
      'width=1100,height=820',
    );

    if (!janelaImpressao) {
      setErroAcao(
        'O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.',
      );
      setCarregandoAtaAssembleia(false);
      return;
    }

    const finalizarPreparacao = () => {
      setCarregandoAtaAssembleia(false);
    };

    const estilosPagina = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((elemento) => elemento.outerHTML)
      .join('\n');

    janelaImpressao.document.open();
    janelaImpressao.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ata / Resumo Administrativo da Assembleia</title>
  ${estilosPagina}
  <style>
    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      padding: 24px;
    }

    #ata-assembleia-impressao {
      display: block !important;
      position: static !important;
      inset: auto !important;
      width: 100% !important;
      min-height: auto !important;
      margin: 0 auto !important;
      padding: 0 !important;
      visibility: visible !important;
      background: #ffffff !important;
      color: #0f172a !important;
    }

    #ata-assembleia-impressao * {
      visibility: visible !important;
    }

    @media print {
      @page {
        size: A4;
        margin: 16mm;
      }

      html,
      body {
        padding: 0 !important;
        background: #ffffff !important;
      }

      #ata-assembleia-impressao {
        width: 100% !important;
        margin: 0 !important;
      }

      #ata-assembleia-impressao .quebra-evitar {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${areaImpressao.outerHTML}
</body>
</html>`);
    janelaImpressao.document.close();

    janelaImpressao.focus();

    window.setTimeout(() => {
      janelaImpressao.print();

      // Mantém o feedback visual perceptível no botão
      // mesmo após a nova janela ganhar foco.
      window.setTimeout(finalizarPreparacao, 5000);
    }, 500);
  }

  // auditoria-legado-pasta-documental: Pacote documental da assembleia | Imprimir pacote documental | Preparando pacote...
  function imprimirPacoteDocumentalAssembleia() {
    if (preparandoPacoteDocumental) {
      return;
    }

    if (!assembleiaDetalhe) {
      return;
    }

    setPreparandoPacoteDocumental(true);

    const finalizarPreparacaoPacote = () => {
      setPreparandoPacoteDocumental(false);
    };

    const documentosPacote = [
      {
        id: 'edital-convocacao-assembleia-impressao',
        titulo: 'Edital de Convocação da Assembleia',
      },
      {
        id: 'lista-presenca-assembleia-impressao',
        titulo: 'Lista de Presença e Quórum da Assembleia',
      },
      {
        id: 'ata-assembleia-impressao',
        titulo: 'Ata / Resumo Administrativo da Assembleia',
      },
    ];

    if (assembleiaDetalhe.status === 'ENCERRADA') {
      documentosPacote.push({
        id: 'termo-encerramento-assembleia-impressao',
        titulo: 'Termo Administrativo de Encerramento da Assembleia',
      });
    }

    const secoesHtml = documentosPacote
      .map((documento) => {
        const areaImpressao = document.getElementById(documento.id);

        if (!areaImpressao) {
          return '';
        }

        const copia = areaImpressao.cloneNode(true) as HTMLElement;

        copia.querySelectorAll('style').forEach((style) => {
          style.remove();
        });

        return `
          <section class="documento-pacote">
            <div class="cabecalho-pacote">
              <span>Pasta documental da assembleia</span>
              <strong>${documento.titulo}</strong>
            </div>
            ${copia.outerHTML}
          </section>
        `;
      })
      .filter(Boolean)
      .join('\n');

    if (!secoesHtml) {
      setErroAcao(
        'Não foi possível localizar os documentos da assembleia para impressão.',
      );
      finalizarPreparacaoPacote();
      return;
    }

    const janelaImpressao = window.open(
      '',
      '_blank',
      'width=1200,height=900',
    );

    if (!janelaImpressao) {
      setErroAcao(
        'O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.',
      );
      finalizarPreparacaoPacote();
      return;
    }

    const estilosPagina = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((elemento) => elemento.outerHTML)
      .join('\n');

    janelaImpressao.document.open();
    janelaImpressao.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pasta Documental da Assembleia</title>
  ${estilosPagina}
  <style>
    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      padding: 24px;
    }

    .documento-pacote {
      display: block;
      margin: 0 auto;
      padding: 0;
      break-after: page;
      page-break-after: always;
    }

    .documento-pacote:last-child {
      break-after: auto;
      page-break-after: auto;
    }

    .cabecalho-pacote {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin: 0 0 18px;
      padding: 12px 0;
      border-bottom: 1px solid #cbd5e1;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .cabecalho-pacote strong {
      color: #0f172a;
      text-align: right;
    }

    #edital-convocacao-assembleia-impressao,
    #lista-presenca-assembleia-impressao,
    #ata-assembleia-impressao,
    #termo-encerramento-assembleia-impressao {
      display: block !important;
      position: static !important;
      inset: auto !important;
      width: 100% !important;
      min-height: auto !important;
      margin: 0 auto !important;
      padding: 0 !important;
      visibility: visible !important;
      background: #ffffff !important;
      color: #0f172a !important;
    }

    #edital-convocacao-assembleia-impressao *,
    #lista-presenca-assembleia-impressao *,
    #ata-assembleia-impressao *,
    #termo-encerramento-assembleia-impressao * {
      visibility: visible !important;
    }

    @media print {
      @page {
        size: A4 landscape;
        margin: 12mm;
      }

      html,
      body {
        padding: 0 !important;
        background: #ffffff !important;
      }

      .cabecalho-pacote {
        margin-bottom: 14px;
      }

      .quebra-evitar {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${secoesHtml}
</body>
</html>`);
    janelaImpressao.document.close();

    janelaImpressao.focus();

    window.setTimeout(() => {
      janelaImpressao.print();

      // Mantém o feedback visual perceptível no botão
      // mesmo após a nova janela ganhar foco.
      window.setTimeout(finalizarPreparacaoPacote, 5000);
    }, 500);
  }

  function imprimirListaPresencaAssembleia() {
    if (!assembleiaDetalhe) {
      return;
    }

    const areaImpressao = document.getElementById(
      'lista-presenca-assembleia-impressao',
    );

    if (!areaImpressao) {
      setErroAcao(
        'Não foi possível localizar a lista de presença para impressão.',
      );
      return;
    }

    const janelaImpressao = window.open(
      '',
      '_blank',
      'width=1100,height=820',
    );

    if (!janelaImpressao) {
      setErroAcao(
        'O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.',
      );
      return;
    }

    const estilosPagina = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((elemento) => elemento.outerHTML)
      .join('\n');

    janelaImpressao.document.open();
    janelaImpressao.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lista de Presença e Quórum da Assembleia</title>
  ${estilosPagina}
  <style>
    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      padding: 24px;
    }

    #lista-presenca-assembleia-impressao {
      display: block !important;
      position: static !important;
      inset: auto !important;
      width: 100% !important;
      min-height: auto !important;
      margin: 0 auto !important;
      padding: 0 !important;
      visibility: visible !important;
      background: #ffffff !important;
      color: #0f172a !important;
    }

    #lista-presenca-assembleia-impressao * {
      visibility: visible !important;
    }

    @media print {
      @page {
        size: A4 landscape;
        margin: 12mm;
      }

      html,
      body {
        padding: 0 !important;
        background: #ffffff !important;
      }

      #lista-presenca-assembleia-impressao {
        width: 100% !important;
        margin: 0 !important;
      }

      #lista-presenca-assembleia-impressao .quebra-evitar {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${areaImpressao.outerHTML}
</body>
</html>`);
    janelaImpressao.document.close();

    janelaImpressao.focus();

    window.setTimeout(() => {
      janelaImpressao.print();
    }, 500);
  }

  function imprimirEditalConvocacaoAssembleia() {
    if (!assembleiaDetalhe) {
      return;
    }

    const areaImpressao = document.getElementById(
      'edital-convocacao-assembleia-impressao',
    );

    if (!areaImpressao) {
      setErroAcao(
        'Não foi possível localizar o edital para impressão.',
      );
      return;
    }

    const janelaImpressao = window.open(
      '',
      '_blank',
      'width=1100,height=820',
    );

    if (!janelaImpressao) {
      setErroAcao(
        'O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.',
      );
      return;
    }

    const estilosPagina = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((elemento) => elemento.outerHTML)
      .join('\n');

    janelaImpressao.document.open();
    janelaImpressao.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Edital de Convocação da Assembleia</title>
  ${estilosPagina}
  <style>
    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      padding: 24px;
    }

    #edital-convocacao-assembleia-impressao {
      display: block !important;
      position: static !important;
      inset: auto !important;
      width: 100% !important;
      min-height: auto !important;
      margin: 0 auto !important;
      padding: 0 !important;
      visibility: visible !important;
      background: #ffffff !important;
      color: #0f172a !important;
    }

    #edital-convocacao-assembleia-impressao * {
      visibility: visible !important;
    }

    @media print {
      @page {
        size: A4;
        margin: 16mm;
      }

      html,
      body {
        padding: 0 !important;
        background: #ffffff !important;
      }

      #edital-convocacao-assembleia-impressao {
        width: 100% !important;
        margin: 0 !important;
      }

      #edital-convocacao-assembleia-impressao .quebra-evitar {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${areaImpressao.outerHTML}
</body>
</html>`);
    janelaImpressao.document.close();

    janelaImpressao.focus();

    window.setTimeout(() => {
      janelaImpressao.print();
    }, 500);
  }

  function imprimirTermoEncerramentoAssembleia() {
    if (!assembleiaDetalhe || assembleiaDetalhe.status !== 'ENCERRADA') {
      return;
    }

    const areaImpressao = document.getElementById(
      'termo-encerramento-assembleia-impressao',
    );

    if (!areaImpressao) {
      setErroAcao(
        'Não foi possível localizar o termo de encerramento para impressão.',
      );
      return;
    }

    const janelaImpressao = window.open(
      '',
      '_blank',
      'width=1100,height=820',
    );

    if (!janelaImpressao) {
      setErroAcao(
        'O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.',
      );
      return;
    }

    const estilosPagina = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((elemento) => elemento.outerHTML)
      .join('\n');

    janelaImpressao.document.open();
    janelaImpressao.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Termo Administrativo de Encerramento da Assembleia</title>
  ${estilosPagina}
  <style>
    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      padding: 24px;
    }

    #termo-encerramento-assembleia-impressao {
      display: block !important;
      position: static !important;
      inset: auto !important;
      width: 100% !important;
      min-height: auto !important;
      margin: 0 auto !important;
      padding: 0 !important;
      visibility: visible !important;
      background: #ffffff !important;
      color: #0f172a !important;
    }

    #termo-encerramento-assembleia-impressao * {
      visibility: visible !important;
    }

    @media print {
      @page {
        size: A4;
        margin: 16mm;
      }

      html,
      body {
        padding: 0 !important;
        background: #ffffff !important;
      }

      #termo-encerramento-assembleia-impressao {
        width: 100% !important;
        margin: 0 !important;
      }

      #termo-encerramento-assembleia-impressao .quebra-evitar {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${areaImpressao.outerHTML}
</body>
</html>`);
    janelaImpressao.document.close();

    janelaImpressao.focus();

    window.setTimeout(() => {
      janelaImpressao.print();
    }, 500);
  }

  function imprimirAuditoriaParticipacaoVotacao() {
    if (!assembleiaDetalhe || !auditoriaParticipacaoVotacao) {
      return;
    }

    const pautaAuditada = listaSeguraAdminGovernanca(assembleiaDetalhe.pautas).find(
      (pauta) =>
        pauta.votacao?.id === auditoriaParticipacaoVotacao.votacaoId,
    );

    const votacaoAuditada = pautaAuditada?.votacao;

    if (!pautaAuditada || !votacaoAuditada) {
      setErroAcao(
        'Não foi possível identificar a votação auditada para impressão.',
      );
      return;
    }

    const escaparHtml = (
      valor: string | number | null | undefined,
    ) =>
      String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const formatarUnidade = (unidade: {
      identificador: string;
      numero: string;
      bloco: {
        nome: string;
      } | null;
    }) =>
      unidade.bloco
        ? `${escaparHtml(unidade.bloco.nome)} • Unidade ${escaparHtml(
            unidade.numero,
          )}`
        : `Unidade ${escaparHtml(unidade.numero)}`;

    const participantesHtml =
      auditoriaParticipacaoVotacao.participantes.length > 0
        ? auditoriaParticipacaoVotacao.participantes
            .map(
              (participante, indice) => `
                <tr>
                  <td>${indice + 1}</td>
                  <td>
                    <strong>${escaparHtml(
                      participante.unidade.identificador,
                    )}</strong><br />
                    <span>${formatarUnidade(participante.unidade)}</span>
                  </td>
                  <td>${escaparHtml(
                    participante.morador?.nome ?? 'Morador não informado',
                  )}</td>
                  <td>${escaparHtml(
                    formatarDataHora(participante.registradoEm),
                  )}</td>
                  <td>
                    ${participante.porProcuracao
                      ? '<span class="badge badge-procuracao">Por procuração</span>'
                      : '<span class="badge badge-direta">Direta</span>'}
                  </td>
                </tr>
              `,
            )
            .join('')
        : `
            <tr>
              <td colspan="5" class="vazio">
                Nenhuma unidade participou desta votação.
              </td>
            </tr>
          `;

    const ausentesHtml =
      auditoriaParticipacaoVotacao.ausentes.length > 0
        ? auditoriaParticipacaoVotacao.ausentes
            .map(
              (unidade, indice) => `
                <tr>
                  <td>${indice + 1}</td>
                  <td>
                    <strong>${escaparHtml(unidade.identificador)}</strong>
                  </td>
                  <td>${formatarUnidade(unidade)}</td>
                </tr>
              `,
            )
            .join('')
        : `
            <tr>
              <td colspan="3" class="vazio">
                Todas as unidades aptas participaram desta votação.
              </td>
            </tr>
          `;

    const janela = window.open(
      '',
      '_blank',
      'width=1180,height=900',
    );

    if (!janela) {
      setErroAcao(
        'O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.',
      );
      return;
    }

    janela.document.open();
    janela.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Auditoria de Participação da Votação</title>
  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      padding: 24px;
    }

    .acoes {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      max-width: 1080px;
      margin: 0 auto 20px;
      padding: 14px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
    }

    .acoes button {
      height: 44px;
      padding: 0 18px;
      border-radius: 16px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f172a;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }

    .acoes button:first-child {
      border-color: #fdba74;
      background: #f97316;
      color: #ffffff;
    }

    .documento {
      max-width: 1080px;
      margin: 0 auto;
      padding: 42px;
      border-radius: 28px;
      background: #ffffff;
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
    }

    .cabecalho {
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 24px;
      text-align: center;
    }

    .marca {
      margin: 0;
      color: #c2410c;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    h1 {
      margin: 14px 0 0;
      font-size: 30px;
      line-height: 1.2;
    }

    .subtitulo {
      margin-top: 12px;
      color: #475569;
      font-size: 14px;
      line-height: 1.6;
    }

    .bloco {
      margin-top: 26px;
      border: 1px solid #cbd5e1;
      border-radius: 24px;
      padding: 22px;
    }

    .rotulo {
      margin: 0;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    h2 {
      margin: 10px 0 0;
      font-size: 22px;
      line-height: 1.35;
    }

    .texto {
      margin: 10px 0 0;
      color: #334155;
      line-height: 1.7;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-top: 20px;
    }

    .card {
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 16px;
      background: #f8fafc;
    }

    .numero {
      margin-top: 8px;
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
    }

    table {
      width: 100%;
      margin-top: 18px;
      border-collapse: collapse;
      overflow: hidden;
      border-radius: 18px;
      border: 1px solid #cbd5e1;
    }

    th,
    td {
      padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      text-align: left;
      font-size: 13px;
      line-height: 1.55;
    }

    th {
      background: #f8fafc;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    tr:last-child td {
      border-bottom: 0;
    }

    td span {
      color: #475569;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }

    .badge-direta {
      background: #dcfce7;
      color: #166534;
    }

    .badge-procuracao {
      background: #ffedd5;
      color: #9a3412;
    }

    .vazio {
      text-align: center;
      color: #64748b;
      font-style: italic;
    }

    .rodape {
      margin-top: 34px;
      border-top: 1px solid #cbd5e1;
      padding-top: 18px;
      color: #64748b;
      font-size: 13px;
      line-height: 1.7;
    }

    @media print {
      @page {
        size: A4;
        margin: 14mm;
      }

      html,
      body {
        background: #ffffff;
        padding: 0;
      }

      .acoes {
        display: none;
      }

      .documento {
        max-width: none;
        margin: 0;
        padding: 0;
        border-radius: 0;
        box-shadow: none;
      }

      .bloco,
      .card,
      tr {
        break-inside: avoid;
      }
    }

    @media (max-width: 820px) {
      .cards {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  </style>
</head>
<body>
  <div class="acoes">
    <button type="button" onclick="window.print()">Imprimir</button>
    <button type="button" onclick="window.close()">Fechar prévia</button>
  </div>

  <main class="documento">
    <header class="cabecalho">
      <p class="marca">Condominaria Express</p>
      <h1>Relatório de Auditoria de Participação</h1>
      <p class="subtitulo">
        Assembleia: ${escaparHtml(assembleiaDetalhe.titulo)}<br />
        Votação: ${escaparHtml(votacaoAuditada.titulo)}
      </p>
    </header>

    <section class="bloco">
      <p class="rotulo">Contexto da auditoria</p>
      <h2>${escaparHtml(pautaAuditada.titulo)}</h2>
      <p class="texto">
        Este relatório registra a participação administrativa da votação auditada,
        sem revelar a opção escolhida por cada unidade.
      </p>
    </section>

    <section class="bloco">
      <p class="rotulo">Resumo consolidado</p>

      <div class="cards">
        <article class="card">
          <p class="rotulo">Unidades aptas</p>
          <div class="numero">
            ${auditoriaParticipacaoVotacao.resumo.totalUnidadesAptas}
          </div>
        </article>

        <article class="card">
          <p class="rotulo">Participantes</p>
          <div class="numero">
            ${auditoriaParticipacaoVotacao.resumo.totalParticipantes}
          </div>
        </article>

        <article class="card">
          <p class="rotulo">Ausentes</p>
          <div class="numero">
            ${auditoriaParticipacaoVotacao.resumo.totalAusentes}
          </div>
        </article>

        <article class="card">
          <p class="rotulo">Participação</p>
          <div class="numero">
            ${auditoriaParticipacaoVotacao.resumo.percentualParticipacao.toFixed(2)}%
          </div>
        </article>
      </div>
    </section>

    <section class="bloco">
      <p class="rotulo">Unidades participantes</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Unidade</th>
            <th>Morador</th>
            <th>Registro</th>
            <th>Modalidade</th>
          </tr>
        </thead>
        <tbody>
          ${participantesHtml}
        </tbody>
      </table>
    </section>

    <section class="bloco">
      <p class="rotulo">Unidades sem participação</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Identificação</th>
            <th>Unidade</th>
          </tr>
        </thead>
        <tbody>
          ${ausentesHtml}
        </tbody>
      </table>
    </section>

    <footer class="rodape">
      Documento emitido pelo Painel Administrativo da Condominaria Express.
    </footer>
  </main>
</body>
</html>`);

    janela.document.close();
    janela.focus();
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
              Governança condominial
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Assembleias, pautas e votações
            </h2>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600 sm:text-base">
              Organize assembleias, registre pautas, conduza votações e acompanhe
              deliberações em um fluxo administrativo centralizado.
            </p>
          </div>

          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                Condomínio ativo
              </span>

              <select
                value={condominioId}
                onChange={(event) => {
                  setCondominioId(Number(event.target.value));
                  setVotacaoDetalhe(null);
                  setResultadoVotacao(null);
                }}
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

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <ScrollText className="h-5 w-5 text-orange-600" />
          <p className="mt-4 text-sm font-semibold text-slate-600">
            Assembleias
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-950">
            {resumo.total}
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <FileText className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-sm font-semibold text-slate-600">
            Rascunhos
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-950">
            {resumo.rascunhos}
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <Send className="h-5 w-5 text-sky-600" />
          <p className="mt-4 text-sm font-semibold text-slate-600">
            Convocadas
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-950">
            {resumo.convocadas}
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <PlayCircle className="h-5 w-5 text-amber-600" />
          <p className="mt-4 text-sm font-semibold text-slate-600">
            Em andamento
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-950">
            {resumo.emAndamento}
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="mt-4 text-sm font-semibold text-slate-600">
            Encerradas
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-950">
            {resumo.encerradas}
          </p>
        </article>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <article className="rounded-[2rem] border border-orange-100 bg-orange-50/70 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-700">
                Resumo operacional
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">
                Assembleia selecionada
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Status atual: <strong>{resumoOperacionalGovernanca.statusAtual}</strong>
              </p>
            </div>

            {assembleiaDetalhe ? (
              <AssembleiaStatusBadge status={assembleiaDetalhe.status} />
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <div className="rounded-2xl border border-white/80 bg-white p-4">
              <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.06em] text-slate-500">
                Pautas
              </p>
              <p className="mt-2 whitespace-nowrap text-2xl font-bold leading-none text-slate-950">
                {resumoOperacionalGovernanca.pautas}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Deliberadas: {resumoOperacionalGovernanca.pautasDeliberadas}
              </p>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white p-4">
              <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.06em] text-slate-500">
                Abertas
              </p>
              <p className="mt-2 whitespace-nowrap text-2xl font-bold leading-none text-slate-950">
                {resumoOperacionalGovernanca.votacoesAbertas}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Encerradas: {resumoOperacionalGovernanca.votacoesEncerradas}
              </p>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white p-4">
              <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.06em] text-slate-500">
                Presenças
              </p>
              <p className="mt-2 whitespace-nowrap text-2xl font-bold leading-none text-slate-950">
                {resumoOperacionalGovernanca.presencas}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                registro(s)
              </p>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white p-4">
              <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.06em] text-slate-500">
                Quórum
              </p>
              <p className="mt-2 whitespace-nowrap text-2xl font-bold leading-none text-slate-950">
                {resumoOperacionalGovernanca.quorumFormatado}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                participação
              </p>
            </div>
          </div>
        </article>

        <article className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
            Próximas ações
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-950">
            Fluxo recomendado
          </h3>

          <ol className="mt-5 grid gap-3">
            {proximasAcoesGovernanca.map((acao, indice) => (
              <li
                key={acao}
                className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                  {indice + 1}
                </span>
                <span>{acao}</span>
              </li>
            ))}
          </ol>
        </article>
      </section>

      {carregando ? (
        <section className="mt-6 flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700 shadow-sm">
          <LoaderCircle className="h-5 w-5 animate-spin text-orange-500" />
          Carregando dados de governança...
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

      {!podeGerirGovernanca ? (
        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          Seu perfil pode consultar governança, mas não possui permissão para
          criar ou operar assembleias e votações.
        </section>
      ) : null}

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <article className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Assembleias cadastradas
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Selecionar assembleia
          </h3>

          <div className="mt-5 grid gap-3">
            {assembleias.map((assembleia) => {
              const selecionada = assembleiaSelecionadaId === assembleia.id;

              return (
                <button
                  key={assembleia.id}
                  type="button"
                  onClick={() => {
                    setAssembleiaSelecionadaId(assembleia.id);
                    setVotacaoDetalhe(null);
                    setResultadoVotacao(null);
                  }}
                  className={`rounded-3xl border p-4 text-left transition ${
                    selecionada
                      ? 'border-orange-300 bg-orange-50 shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:border-orange-200 hover:bg-orange-50/40'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">
                        {assembleia.titulo}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {rotuloModalidade(assembleia.modalidade)} •{' '}
                        {formatarDataHora(assembleia.primeiraChamadaEm)}
                      </p>
                    </div>

                    <AssembleiaStatusBadge status={assembleia.status} />
                  </div>

                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    {assembleia._count.pautas} pauta(s)
                  </p>
                </button>
              );
            })}

            {assembleias.length === 0 && !carregando ? (
              <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Nenhuma assembleia cadastrada.
              </p>
            ) : null}
          </div>
        </article>

        <article className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Nova assembleia
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Criar registro
          </h3>

          {podeGerirGovernanca ? (
            <form onSubmit={criarAssembleia} className="mt-5 grid gap-4">
              <input
                value={assembleiaForm.titulo}
                onChange={(event) =>
                  setAssembleiaForm((atual) => ({
                    ...atual,
                    titulo: event.target.value,
                  }))
                }
                placeholder="Título da assembleia"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                required
              />

              <textarea
                value={assembleiaForm.descricao}
                onChange={(event) =>
                  setAssembleiaForm((atual) => ({
                    ...atual,
                    descricao: event.target.value,
                  }))
                }
                placeholder="Descrição opcional"
                className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <select
                value={assembleiaForm.modalidade}
                onChange={(event) =>
                  setAssembleiaForm((atual) => ({
                    ...atual,
                    modalidade:
                      event.target.value as ModalidadeAssembleiaAdmin,
                  }))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="PRESENCIAL">Presencial</option>
                <option value="ONLINE">Online</option>
                <option value="HIBRIDA">Híbrida</option>
              </select>

              <input
                value={assembleiaForm.local}
                onChange={(event) =>
                  setAssembleiaForm((atual) => ({
                    ...atual,
                    local: event.target.value,
                  }))
                }
                placeholder="Local da assembleia"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <input
                value={assembleiaForm.linkOnline}
                onChange={(event) =>
                  setAssembleiaForm((atual) => ({
                    ...atual,
                    linkOnline: event.target.value,
                  }))
                }
                placeholder="Link online"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <label className="grid gap-2">
                <span className="text-[11px] font-bold uppercase leading-4 tracking-[0.06em] text-slate-500">
                  Primeira chamada
                </span>
                <input
                  type="datetime-local"
                  value={assembleiaForm.primeiraChamadaEm}
                  onChange={(event) =>
                    setAssembleiaForm((atual) => ({
                      ...atual,
                      primeiraChamadaEm: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[11px] font-bold uppercase leading-4 tracking-[0.06em] text-slate-500">
                  Segunda chamada
                </span>
                <input
                  type="datetime-local"
                  value={assembleiaForm.segundaChamadaEm}
                  onChange={(event) =>
                    setAssembleiaForm((atual) => ({
                      ...atual,
                      segundaChamadaEm: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <button
                type="submit"
                disabled={acaoEmExecucao === 'criar-assembleia'}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                <CalendarClock className="h-4 w-4" />
                {acaoEmExecucao === 'criar-assembleia'
                  ? 'Salvando...'
                  : 'Cadastrar assembleia'}
              </button>
            </form>
          ) : null}
        </article>
      </section>
      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
              Assembleia selecionada
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              {assembleiaDetalhe?.titulo ?? 'Nenhuma assembleia selecionada'}
            </h3>

            {assembleiaDetalhe ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <AssembleiaStatusBadge status={assembleiaDetalhe.status} />

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {rotuloModalidade(assembleiaDetalhe.modalidade)}
                </span>
              </div>
            ) : null}
          </div>

          {assembleiaDetalhe ? (
            <button
              type="button"
              onClick={imprimirResumoAssembleia}
              disabled={carregandoAtaAssembleia}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-orange-200 hover:text-orange-700 disabled:cursor-wait disabled:opacity-60"
            >
              {carregandoAtaAssembleia ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              {carregandoAtaAssembleia
                ? 'Abrindo ata...'
                : 'Imprimir ata / resumo'}
            </button>
          ) : null}

          {carregandoDetalhe ? (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              <LoaderCircle className="h-4 w-4 animate-spin text-orange-500" />
              Carregando detalhe...
            </div>
          ) : null}
        </div>

        {assembleiaDetalhe ? (
          <>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.06em] text-slate-500">
                  Chamadas
                </p>

                <p className="mt-3 text-sm font-semibold text-slate-800">
                  1ª chamada: {formatarDataHora(assembleiaDetalhe.primeiraChamadaEm)}
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-800">
                  2ª chamada: {formatarDataHora(assembleiaDetalhe.segundaChamadaEm)}
                </p>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.06em] text-slate-500">
                  Local e acesso
                </p>

                <p className="mt-3 text-sm font-semibold text-slate-800">
                  Local: {assembleiaDetalhe.local ?? 'Não informado'}
                </p>

                <p className="mt-2 break-all text-sm font-semibold text-slate-800">
                  Link: {assembleiaDetalhe.linkOnline ?? 'Não informado'}
                </p>
              </article>
            </div>

            {assembleiaDetalhe.descricao ? (
              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.06em] text-slate-500">
                  Descrição
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {assembleiaDetalhe.descricao}
                </p>
              </div>
            ) : null}

            {assembleiaDetalhe ? (
              <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={imprimirPacoteDocumentalAssembleia}
                disabled={preparandoPacoteDocumental}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-600 bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-wait disabled:opacity-70"
              >
                {preparandoPacoteDocumental ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                {preparandoPacoteDocumental
                  ? 'Preparando pasta...'
                  : 'Imprimir pasta documental'}
              </button>
<button
                type="button"
                onClick={imprimirListaPresencaAssembleia}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-orange-200 hover:text-orange-700"
              >
                <Printer className="h-4 w-4" />
                Imprimir lista de presença
              </button>
<button
                type="button"
                onClick={imprimirEditalConvocacaoAssembleia}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-orange-200 hover:text-orange-700"
              >
                <Printer className="h-4 w-4" />
                Imprimir edital / convocação
              </button>
<button
                type="button"
                onClick={imprimirTermoEncerramentoAssembleia}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-orange-200 hover:text-orange-700"
              >
                <Printer className="h-4 w-4" />
                Imprimir termo de encerramento
              </button>
</div>
            ) : null}

            {assembleiaDetalhe.motivoCancelamento ? (
              <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-rose-700">
                  Motivo do cancelamento
                </p>
                <p className="mt-3 text-sm leading-7 text-rose-900">
                  {assembleiaDetalhe.motivoCancelamento}
                </p>
              </div>
            ) : null}

            {podeGerirGovernanca ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="rounded-3xl border border-orange-100 bg-orange-50/70 p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                        Operação da assembleia
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        Ação principal
                      </p>
                    </div>

                    {assembleiaDetalhe ? (
                      <AssembleiaStatusBadge status={assembleiaDetalhe.status} />
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Avance a assembleia conforme o status atual. Use cancelar
                    apenas quando houver justificativa administrativa.
                  </p>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {assembleiaDetalhe.status === 'RASCUNHO' ? (
                      <button
                        type="button"
                        onClick={() =>
                          void executarAcaoAssembleia(
                            assembleiaDetalhe.id,
                            'convocar',
                            'Assembleia convocada com sucesso.',
                          )
                        }
                        disabled={
                          acaoEmExecucao ===
                          `convocar-assembleia-${assembleiaDetalhe.id}`
                        }
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-60"
                      >
                        <Send className="h-4 w-4" />
                        Convocar
                      </button>
                    ) : null}

                    {assembleiaDetalhe.status === 'CONVOCADA' ? (
                      <button
                        type="button"
                        onClick={() =>
                          void executarAcaoAssembleia(
                            assembleiaDetalhe.id,
                            'iniciar',
                            'Assembleia iniciada com sucesso.',
                          )
                        }
                        disabled={
                          acaoEmExecucao ===
                          `iniciar-assembleia-${assembleiaDetalhe.id}`
                        }
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-60"
                      >
                        <PlayCircle className="h-4 w-4" />
                        Iniciar
                      </button>
                    ) : null}

                    {assembleiaDetalhe.status === 'EM_ANDAMENTO' ? (
                      <button
                        type="button"
                        onClick={() =>
                          void executarAcaoAssembleia(
                            assembleiaDetalhe.id,
                            'encerrar',
                            'Assembleia encerrada com sucesso.',
                          )
                        }
                        disabled={
                          acaoEmExecucao ===
                          `encerrar-assembleia-${assembleiaDetalhe.id}`
                        }
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-60"
                      >
                        <CircleStop className="h-4 w-4" />
                        Encerrar
                      </button>
                    ) : null}

                    {assembleiaDetalhe.status !== 'ENCERRADA' &&
                    assembleiaDetalhe.status !== 'CANCELADA' ? (
                      <button
                        type="button"
                        onClick={() =>
                          void cancelarAssembleia(assembleiaDetalhe.id)
                        }
                        disabled={
                          acaoEmExecucao ===
                          `cancelar-assembleia-${assembleiaDetalhe.id}`
                        }
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                      >
                        <Ban className="h-4 w-4" />
                        Cancelar assembleia
                      </button>
                    ) : null}
                  </div>
                </div>

                {assembleiaDetalhe.status !== 'ENCERRADA' &&
                assembleiaDetalhe.status !== 'CANCELADA' ? (
                  <div className="rounded-3xl border border-rose-100 bg-rose-50/70 p-4">
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-rose-700">
                        Ação crítica
                      </span>
                      <input
                        value={
                          cancelamentoAssembleia[assembleiaDetalhe.id] ?? ''
                        }
                        onChange={(event) =>
                          setCancelamentoAssembleia((atual) => ({
                            ...atual,
                            [assembleiaDetalhe.id]: event.target.value,
                          }))
                        }
                        placeholder="Motivo obrigatório para cancelar"
                        className="h-10 rounded-2xl border border-rose-100 bg-white px-3 text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            Cadastre ou selecione uma assembleia para visualizar seus detalhes.
          </p>
        )}
      </section>

              {assembleiaDetalhe ? (
          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
                  Presença e quórum
                </p>

                <h3 className="mt-2 text-2xl font-bold text-slate-950">
                  Controle de participação da assembleia
                </h3>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Registre as unidades presentes, acompanhe o quórum em tempo real
                  e mantenha a base da ata administrativa consolidada.
                </p>
              </div>

              {carregandoPresencas ? (
                <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                  <LoaderCircle className="h-4 w-4 animate-spin text-orange-500" />
                  Atualizando quórum...
                </span>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <UsersRound className="h-5 w-5 text-slate-700" />
                <p className="mt-4 text-sm font-semibold text-slate-600">
                  Unidades totais
                </p>
                <p className="mt-1 text-3xl font-bold text-slate-950">
                  {resumoQuorumAssembleia?.totalUnidades ?? 0}
                </p>
              </article>

              <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                <UserCheck className="h-5 w-5 text-emerald-700" />
                <p className="mt-4 text-sm font-semibold text-emerald-800">
                  Presentes
                </p>
                <p className="mt-1 text-3xl font-bold text-emerald-950">
                  {resumoQuorumAssembleia?.unidadesPresentes ?? 0}
                </p>
              </article>

              <article className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                <UsersRound className="h-5 w-5 text-amber-700" />
                <p className="mt-4 text-sm font-semibold text-amber-800">
                  Ausentes
                </p>
                <p className="mt-1 text-3xl font-bold text-amber-950">
                  {resumoQuorumAssembleia?.unidadesAusentes ?? 0}
                </p>
              </article>

              <article className="rounded-3xl border border-orange-200 bg-orange-50 p-4">
                <UserCheck className="h-5 w-5 text-orange-700" />
                <p className="mt-4 text-sm font-semibold text-orange-800">
                  Quórum
                </p>
                <p className="mt-1 text-3xl font-bold text-orange-950">
                  {(resumoQuorumAssembleia?.percentualPresenca ?? 0).toFixed(2).replace('.', ',')}%
                </p>
              </article>
            </div>

            <div className="mt-6 grid gap-6 2xl:grid-cols-[380px_minmax(0,1fr)]">
              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-950">
                  Registrar presença
                </p>

                {podeGerirGovernanca &&
                (assembleiaDetalhe.status === 'CONVOCADA' ||
                  assembleiaDetalhe.status === 'EM_ANDAMENTO') ? (
                  <form
                    onSubmit={registrarPresencaAssembleia}
                    className="mt-4 grid gap-4"
                  >
                    <select
                      value={presencaForm.unidadeId}
                      onChange={(event) =>
                        setPresencaForm((atual) => ({
                          ...atual,
                          unidadeId: event.target.value,
                          moradorId: '',
                        }))
                      }
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      required
                    >
                      <option value="">Selecione a unidade</option>
                      {unidades
                        .filter((unidade) => unidade.ativo)
                        .map((unidade) => (
                          <option key={unidade.id} value={unidade.id}>
                            {unidade.identificador}
                          </option>
                        ))}
                    </select>

                    <select
                      value={presencaForm.moradorId}
                      onChange={(event) =>
                        setPresencaForm((atual) => ({
                          ...atual,
                          moradorId: event.target.value,
                        }))
                      }
                      disabled={!presencaForm.unidadeId}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="">Morador vinculado, se houver</option>
                      {moradoresPresencaDisponiveis.map((morador) => (
                        <option key={morador.id} value={morador.id}>
                          {morador.nome}
                        </option>
                      ))}
                    </select>

                    <input
                      value={presencaForm.nomeRepresentante}
                      onChange={(event) =>
                        setPresencaForm((atual) => ({
                          ...atual,
                          nomeRepresentante: event.target.value,
                        }))
                      }
                      placeholder="Nome do representante, se aplicável"
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />

                    <input
                      value={presencaForm.documentoRepresentante}
                      onChange={(event) =>
                        setPresencaForm((atual) => ({
                          ...atual,
                          documentoRepresentante: event.target.value,
                        }))
                      }
                      placeholder="Documento do representante"
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />

                    <label className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                      <input
                        type="checkbox"
                        checked={presencaForm.porProcuracao}
                        onChange={(event) =>
                          setPresencaForm((atual) => ({
                            ...atual,
                            porProcuracao: event.target.checked,
                            procuracaoObservacoes: event.target.checked
                              ? atual.procuracaoObservacoes
                              : '',
                          }))
                        }
                        className="mt-1 h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-400"
                      />

                      <span>
                        <span className="block text-sm font-bold text-orange-950">
                          Presença por procuração
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-orange-800">
                          Marque quando a unidade estiver sendo representada formalmente
                          por terceiro.
                        </span>
                      </span>
                    </label>

                    {presencaForm.porProcuracao ? (
                      <textarea
                        value={presencaForm.procuracaoObservacoes}
                        onChange={(event) =>
                          setPresencaForm((atual) => ({
                            ...atual,
                            procuracaoObservacoes: event.target.value,
                          }))
                        }
                        placeholder="Observações da procuração, forma de apresentação ou conferência"
                        className="min-h-24 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    ) : null}

                    <textarea
                      value={presencaForm.observacoes}
                      onChange={(event) =>
                        setPresencaForm((atual) => ({
                          ...atual,
                          observacoes: event.target.value,
                        }))
                      }
                      placeholder="Observações opcionais"
                      className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />

                    <button
                      type="submit"
                      disabled={
                        acaoEmExecucao === 'registrar-presenca' ||
                        carregandoPresencas
                      }
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                    >
                      <UserCheck className="h-4 w-4" />
                      {acaoEmExecucao === 'registrar-presenca'
                        ? 'Registrando...'
                        : 'Registrar presença'}
                    </button>
                  </form>
                ) : (
                  <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-600">
                    Presenças podem ser registradas apenas em assembleias convocadas
                    ou em andamento.
                  </p>
                )}
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold text-slate-950">
                  Lista de presenças
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {presencasAssembleia.length} unidade(s) registrada(s).
                </p>

                {presencasAssembleia.length === 0 ? (
                  <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    Nenhuma presença registrada para esta assembleia.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {presencasAssembleia.map((presenca) => {
                      const representante =
                        presenca.morador?.nome ??
                        presenca.nomeRepresentante ??
                        'Representante não informado';

                      return (
                        <article
                          key={presenca.id}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-base font-bold text-slate-950">
                                {presenca.unidade.identificador}
                              </p>

                              <p className="mt-1 text-sm text-slate-600">
                                {presenca.unidade.bloco
                                  ? `${presenca.unidade.bloco.nome} • Unidade ${presenca.unidade.numero}`
                                  : `Unidade ${presenca.unidade.numero}`}
                              </p>

                              <p className="mt-3 text-sm font-semibold text-slate-800">
                                Presente: {representante}
                              </p>

                              {presenca.porProcuracao ? (
                                <span className="mt-3 inline-flex rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                                  Procuração registrada
                                </span>
                              ) : null}

                              {presenca.documentoRepresentante ? (
                                <p className="mt-1 text-sm text-slate-600">
                                  Documento: {presenca.documentoRepresentante}
                                </p>
                              ) : null}

                              <p className="mt-1 text-sm text-slate-600">
                                Registrado em {formatarDataHora(presenca.registradoEm)}
                              </p>

                              {presenca.procuracaoObservacoes ? (
                                <p className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm leading-6 text-orange-900">
                                  Procuração: {presenca.procuracaoObservacoes}
                                </p>
                              ) : null}

                              {presenca.observacoes ? (
                                <p className="mt-3 rounded-2xl bg-white p-3 text-sm leading-6 text-slate-700">
                                  {presenca.observacoes}
                                </p>
                              ) : null}
                            </div>

                            {podeGerirGovernanca &&
                            assembleiaDetalhe.status !== 'ENCERRADA' &&
                            assembleiaDetalhe.status !== 'CANCELADA' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void removerPresencaAssembleia(presenca.id)
                                }
                                disabled={
                                  acaoEmExecucao ===
                                  `remover-presenca-${presenca.id}`
                                }
                                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-60"
                              >
                                <Trash2 className="h-4 w-4" />
                                {acaoEmExecucao ===
                                `remover-presenca-${presenca.id}`
                                  ? 'Removendo...'
                                  : 'Remover'}
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </article>
            </div>
          </section>
        ) : null}

<section className="admin-governanca-pautas-layout mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)] items-start">
        <article className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Pautas
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Nova pauta
          </h3>

          {podeGerirGovernanca &&
          assembleiaSelecionadaId &&
          assembleiaDetalhe &&
          assembleiaDetalhe.status !== 'ENCERRADA' &&
          assembleiaDetalhe.status !== 'CANCELADA' ? (
            <form onSubmit={criarPauta} className="mt-5 grid gap-4">
              <input
                value={pautaForm.titulo}
                onChange={(event) =>
                  setPautaForm((atual) => ({
                    ...atual,
                    titulo: event.target.value,
                  }))
                }
                placeholder="Título da pauta"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                required
              />

              <textarea
                value={pautaForm.descricao}
                onChange={(event) =>
                  setPautaForm((atual) => ({
                    ...atual,
                    descricao: event.target.value,
                  }))
                }
                placeholder="Descrição opcional"
                className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <input
                type="number"
                min="0"
                value={pautaForm.ordem}
                onChange={(event) =>
                  setPautaForm((atual) => ({
                    ...atual,
                    ordem: event.target.value,
                  }))
                }
                placeholder="Ordem opcional"
                className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <button
                type="submit"
                disabled={acaoEmExecucao === 'criar-pauta'}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                <ClipboardList className="h-4 w-4" />
                {acaoEmExecucao === 'criar-pauta'
                  ? 'Salvando...'
                  : 'Cadastrar pauta'}
              </button>
            </form>
          ) : (
            <p className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Selecione uma assembleia aberta para adicionar pautas.
            </p>
          )}
        </article>

        <article className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Pautas da assembleia
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Deliberações e votações
          </h3>

          <div className="mt-5 grid gap-5">
            {assembleiaDetalhe?.pautas.map((pauta) => {
              const formularioVotacao = votacaoFormPorPauta[pauta.id] ?? {
                titulo: '',
                descricao: '',
              };

              return (
                <section
                  key={pauta.id}
                  className="min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                          Ordem {pauta.ordem}
                        </span>

                        <PautaStatusBadge status={pauta.status} />
                      </div>

                      <h4 className="mt-3 text-xl font-bold text-slate-950">
                        {pauta.titulo}
                      </h4>

                      {pauta.descricao ? (
                        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                          {pauta.descricao}
                        </p>
                      ) : null}
                    </div>

                    {pauta.votacao ? (
                      <VotacaoStatusBadge status={pauta.votacao.status} prefixo="Votação" />
                    ) : null}
                  </div>

                  {pauta.deliberacao ? (
                    <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
                        Deliberação registrada
                      </p>
                      <p className="mt-3 text-sm leading-7 text-emerald-950">
                        {pauta.deliberacao}
                      </p>
                    </div>
                  ) : null}

                  {pauta.status === 'ABERTA' &&
                  assembleiaDetalhe?.status === 'EM_ANDAMENTO' &&
                  podeGerirGovernanca ? (
                    <div className="mt-4 min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-bold text-slate-950">
                        Deliberar pauta
                      </p>

                      <textarea
                        value={deliberacaoPauta[pauta.id] ?? ''}
                        onChange={(event) =>
                          setDeliberacaoPauta((atual) => ({
                            ...atual,
                            [pauta.id]: event.target.value,
                          }))
                        }
                        placeholder="Registre a deliberação final desta pauta"
                        className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />

                      <button
                        type="button"
                        onClick={() => void deliberarPauta(pauta.id)}
                        disabled={
                          acaoEmExecucao === `deliberar-pauta-${pauta.id}`
                        }
                        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <Gavel className="h-4 w-4" />
                        Deliberar pauta
                      </button>
                    </div>
                  ) : null}

                  {!pauta.votacao &&
                  pauta.status === 'ABERTA' &&
                  assembleiaDetalhe &&
                  assembleiaDetalhe.status !== 'ENCERRADA' &&
                  assembleiaDetalhe.status !== 'CANCELADA' &&
                  podeGerirGovernanca ? (
                    <div className="mt-4 rounded-3xl border border-orange-100 bg-orange-50/70 p-4">
                      <p className="text-sm font-bold text-orange-950">
                        Criar votação para esta pauta
                      </p>

                      <div className="mt-3 grid gap-3">
                        <input
                          value={formularioVotacao.titulo}
                          onChange={(event) =>
                            setVotacaoFormPorPauta((atual) => ({
                              ...atual,
                              [pauta.id]: {
                                ...formularioVotacao,
                                titulo: event.target.value,
                              },
                            }))
                          }
                          placeholder="Título da votação"
                          className="h-11 rounded-2xl border border-orange-100 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />

                        <input
                          value={formularioVotacao.descricao}
                          onChange={(event) =>
                            setVotacaoFormPorPauta((atual) => ({
                              ...atual,
                              [pauta.id]: {
                                ...formularioVotacao,
                                descricao: event.target.value,
                              },
                            }))
                          }
                          placeholder="Descrição opcional"
                          className="h-11 rounded-2xl border border-orange-100 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />

                        <button
                          type="button"
                          onClick={() => void criarVotacao(pauta.id)}
                          disabled={
                            acaoEmExecucao ===
                            `criar-votacao-pauta-${pauta.id}`
                          }
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                        >
                          <Vote className="h-4 w-4" />
                          Criar votação
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {pauta.votacao ? (
                    <div className="mt-4 min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.06em] text-slate-500">
                            Votação vinculada
                          </p>
                          <p className="mt-2 text-lg font-bold text-slate-950">
                            {pauta.votacao.titulo}
                          </p>
                          {pauta.votacao.descricao ? (
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {pauta.votacao.descricao}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <VotacaoStatusBadge status={pauta.votacao.status} />

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {pauta.votacao._count.votos} voto(s)
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {listaSeguraAdminGovernanca(pauta.votacao.opcoes).map((opcao) => (
                          <div
                            key={opcao.id}
                            className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <p className="break-words text-sm font-semibold leading-5 text-slate-900">
                              {opcao.descricao}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Ordem {opcao.ordem}
                            </p>
                          </div>
                        ))}

                        {listaSeguraAdminGovernanca(pauta.votacao.opcoes).length === 0 ? (
                          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
                            Nenhuma opção adicionada.
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() =>
                            void carregarVotacao(
                              pauta.assembleiaId,
                              pauta.votacao!.id,
                            )
                          }
                          className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold leading-5 text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:text-sm"
                        >
                          <FileText className="h-4 w-4" />
                          Detalhes da votação
                        </button>

                        {pauta.votacao.status === 'ENCERRADA' ? (
<button
                          type="button"
                          onClick={() =>
                            void carregarResultadoVotacao(
                              pauta.assembleiaId,
                              pauta.votacao!.id,
                            )
                          }
                          className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold leading-5 text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:text-sm"
                        >
                          <BadgeCheck className="h-4 w-4" />
                          Ver apuração
                        </button>
) : null}

                        <button
                          type="button"
                          onClick={() =>
                            void carregarAuditoriaParticipacao(
                              assembleiaDetalhe.id,
                              pauta.votacao!.id,
                            )
                          }
                          disabled={carregandoAuditoriaParticipacao}
                          className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-bold leading-5 text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60 sm:text-sm"
                        >
                          <BadgeCheck className="h-4 w-4" />
                          {carregandoAuditoriaParticipacao
                            ? 'Carregando auditoria...'
                            : 'Auditar participação'}
                        </button>

                        {podeGerirGovernanca &&
                        assembleiaDetalhe?.status === 'EM_ANDAMENTO' &&
                        pauta.votacao.status === 'RASCUNHO' ? (
                          <button
                            type="button"
                            onClick={() =>
                              void executarAcaoVotacao(
                                pauta.votacao!.id,
                                'abrir',
                                'Votação aberta com sucesso.',
                              )
                            }
                            disabled={
                              acaoEmExecucao ===
                              `abrir-votacao-${pauta.votacao.id}`
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                          >
                            <PlayCircle className="h-4 w-4" />
                            Abrir votação
                          </button>
                        ) : null}

                        {podeGerirGovernanca &&
                        pauta.votacao.status === 'ABERTA' ? (
                          <button
                            type="button"
                            onClick={() =>
  setConfirmacaoEncerramentoVotacao({
    votacaoId: pauta.votacao!.id,
    titulo: pauta.votacao!.titulo,
    pautaTitulo: pauta.titulo,
  })
}
                            disabled={
                              acaoEmExecucao ===
                              `encerrar-votacao-${pauta.votacao.id}`
                            }
                            className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-1.5 rounded-2xl bg-orange-600 px-3 py-2 text-center text-xs font-bold leading-5 text-white transition hover:bg-orange-700 disabled:opacity-60 sm:text-sm"
                          >
Encerrar votação
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })}

            {!assembleiaDetalhe?.pautas.length && !carregandoDetalhe ? (
              <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Esta assembleia ainda não possui pautas.
              </p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <article className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
                Detalhes operacionais da votação
              </p>

              <h3 className="mt-2 text-2xl font-bold text-slate-950">
                {votacaoDetalhe?.titulo ?? 'Selecione uma votação'}
              </h3>

              {votacaoDetalhe ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <VotacaoStatusBadge status={votacaoDetalhe.status} />

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {listaSeguraAdminGovernanca(votacaoDetalhe.votos).length} voto(s)
                  </span>
                </div>
              ) : null}
            </div>

            {carregandoVotacao ? (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                <LoaderCircle className="h-4 w-4 animate-spin text-orange-500" />
                Carregando votação...
              </div>
            ) : null}
          </div>

          {votacaoDetalhe ? (
            <>
              {votacaoDetalhe.descricao ? (
                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.06em] text-slate-500">
                    Descrição
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {votacaoDetalhe.descricao}
                  </p>
                </div>
              ) : null}

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      Opções da votação
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      A votação precisa ter ao menos duas opções para ser aberta.
                    </p>
                  </div>

                  {podeGerirGovernanca &&
                  assembleiaDetalhe?.status === 'EM_ANDAMENTO' &&
                  votacaoDetalhe.status === 'RASCUNHO' ? (
                    <button
                      type="button"
                      onClick={() =>
                        void executarAcaoVotacao(
                          votacaoDetalhe.id,
                          'abrir',
                          'Votação aberta com sucesso.',
                        )
                      }
                      disabled={
                        acaoEmExecucao ===
                        `abrir-votacao-${votacaoDetalhe.id}`
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Abrir votação
                    </button>
                  ) : null}

                  {podeGerirGovernanca &&
                  votacaoDetalhe.status === 'ABERTA' ? (
                    <button
                      type="button"
                      onClick={() =>
  setConfirmacaoEncerramentoVotacao({
    votacaoId: votacaoDetalhe.id,
    titulo: votacaoDetalhe.titulo,
    pautaTitulo: votacaoDetalhe.pauta?.titulo ?? 'Pauta vinculada',
  })
}
                      disabled={
                        acaoEmExecucao ===
                        `encerrar-votacao-${votacaoDetalhe.id}`
                      }
                      className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-1.5 rounded-2xl bg-orange-600 px-3 py-2 text-center text-xs font-bold leading-5 text-white transition hover:bg-orange-700 disabled:opacity-60 sm:text-sm"
                    >
Encerrar votação
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {listaSeguraAdminGovernanca(votacaoDetalhe.opcoes).map((opcao) => (
                    <div
                      key={opcao.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <p className="font-bold text-slate-950">
                        {opcao.descricao}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Ordem {opcao.ordem}
                      </p>
                    </div>
                  ))}

                  {listaSeguraAdminGovernanca(votacaoDetalhe.opcoes).length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                      Nenhuma opção de voto cadastrada.
                    </p>
                  ) : null}
                </div>

                {podeGerirGovernanca &&
                votacaoDetalhe.status === 'RASCUNHO' ? (
                  <div className="mt-4 rounded-3xl border border-orange-100 bg-orange-50/70 p-4">
                    <p className="text-sm font-bold text-orange-950">
                      Adicionar opção de voto
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
                      <input
                        value={
                          opcaoFormPorVotacao[votacaoDetalhe.id]?.descricao ??
                          ''
                        }
                        onChange={(event) =>
                          setOpcaoFormPorVotacao((atual) => ({
                            ...atual,
                            [votacaoDetalhe.id]: {
                              descricao: event.target.value,
                              ordem:
                                atual[votacaoDetalhe.id]?.ordem ?? '',
                            },
                          }))
                        }
                        placeholder="Descrição da opção"
                        className="h-11 rounded-2xl border border-orange-100 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />

                      <input
                        type="number"
                        min="0"
                        value={
                          opcaoFormPorVotacao[votacaoDetalhe.id]?.ordem ?? ''
                        }
                        onChange={(event) =>
                          setOpcaoFormPorVotacao((atual) => ({
                            ...atual,
                            [votacaoDetalhe.id]: {
                              descricao:
                                atual[votacaoDetalhe.id]?.descricao ?? '',
                              ordem: event.target.value,
                            },
                          }))
                        }
                        placeholder="Ordem"
                        className="h-11 rounded-2xl border border-orange-100 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => void criarOpcaoVotacao(votacaoDetalhe.id)}
                      disabled={
                        acaoEmExecucao ===
                        `criar-opcao-votacao-${votacaoDetalhe.id}`
                      }
                      className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                    >
                      <BadgeCheck className="h-4 w-4" />
                      Adicionar opção
                    </button>
                  </div>
                ) : null}
              </div>

              {podeGerirGovernanca &&
              votacaoDetalhe.status === 'ABERTA' ? (
                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      Registrar voto
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Cada unidade pode registrar apenas um voto nesta votação.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <select
                      value={
                        votoFormPorVotacao[votacaoDetalhe.id]?.opcaoId ?? ''
                      }
                      onChange={(event) =>
                        setVotoFormPorVotacao((atual) => ({
                          ...atual,
                          [votacaoDetalhe.id]: {
                            opcaoId: event.target.value,
                            unidadeId:
                              atual[votacaoDetalhe.id]?.unidadeId ?? '',
                            moradorId:
                              atual[votacaoDetalhe.id]?.moradorId ?? '',
                            observacoes:
                              atual[votacaoDetalhe.id]?.observacoes ?? '',
                          },
                        }))
                      }
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="">Opção de voto</option>
                      {listaSeguraAdminGovernanca(votacaoDetalhe.opcoes).map((opcao) => (
                        <option key={opcao.id} value={opcao.id}>
                          {opcao.descricao}
                        </option>
                      ))}
                    </select>

                    <select
                      value={
                        votoFormPorVotacao[votacaoDetalhe.id]?.unidadeId ?? ''
                      }
                      onChange={(event) =>
                        setVotoFormPorVotacao((atual) => ({
                          ...atual,
                          [votacaoDetalhe.id]: {
                            opcaoId:
                              atual[votacaoDetalhe.id]?.opcaoId ?? '',
                            unidadeId: event.target.value,
                            moradorId:
                              atual[votacaoDetalhe.id]?.moradorId ?? '',
                            observacoes:
                              atual[votacaoDetalhe.id]?.observacoes ?? '',
                          },
                        }))
                      }
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="">Unidade votante</option>
                      {unidades.map((unidade) => (
                        <option key={unidade.id} value={unidade.id}>
                          {unidade.identificador}
                        </option>
                      ))}
                    </select>

                    <select
                      value={
                        votoFormPorVotacao[votacaoDetalhe.id]?.moradorId ?? ''
                      }
                      onChange={(event) =>
                        setVotoFormPorVotacao((atual) => ({
                          ...atual,
                          [votacaoDetalhe.id]: {
                            opcaoId:
                              atual[votacaoDetalhe.id]?.opcaoId ?? '',
                            unidadeId:
                              atual[votacaoDetalhe.id]?.unidadeId ?? '',
                            moradorId: event.target.value,
                            observacoes:
                              atual[votacaoDetalhe.id]?.observacoes ?? '',
                          },
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

                    <input
                      value={
                        votoFormPorVotacao[votacaoDetalhe.id]?.observacoes ??
                        ''
                      }
                      onChange={(event) =>
                        setVotoFormPorVotacao((atual) => ({
                          ...atual,
                          [votacaoDetalhe.id]: {
                            opcaoId:
                              atual[votacaoDetalhe.id]?.opcaoId ?? '',
                            unidadeId:
                              atual[votacaoDetalhe.id]?.unidadeId ?? '',
                            moradorId:
                              atual[votacaoDetalhe.id]?.moradorId ?? '',
                            observacoes: event.target.value,
                          },
                        }))
                      }
                      placeholder="Observações opcionais"
                      className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void registrarVoto(votacaoDetalhe.id)}
                    disabled={
                      acaoEmExecucao ===
                      `registrar-voto-${votacaoDetalhe.id}`
                    }
                    className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold leading-5 text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:text-sm"
                  >
                    <Vote className="h-4 w-4" />
                    Registrar voto
                  </button>
                </div>
              ) : null}

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-orange-600" />
                  <p className="text-sm font-bold text-slate-950">
                    Votos registrados
                  </p>
                </div>

                <div className="mt-4 grid gap-3">
                  {listaSeguraAdminGovernanca(votacaoDetalhe.votos).map((voto) => (
                    <div
                      key={voto.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-bold text-slate-950">
                            {voto.unidade.identificador}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            Voto: {voto.opcao.descricao}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            Morador: {voto.morador?.nome ?? 'Não informado'}
                          </p>
                        </div>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {formatarDataHora(voto.registradoEm)}
                        </span>
                      </div>

                      {voto.observacoes ? (
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          Observações: {voto.observacoes}
                        </p>
                      ) : null}
                    </div>
                  ))}

                  {listaSeguraAdminGovernanca(votacaoDetalhe.votos).length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                      Nenhum voto registrado nesta votação.
                    </p>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <p className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Clique em “Detalhes da votação” em uma pauta para operar opções e votos.
            </p>
          )}
        </article>

        <article className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
            Apuração consolidada
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Apuração da votação
          </h3>

          {resultadoVotacao ? (
            <>
              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-600">
                  Total de votos
                </p>
                <p className="mt-1 text-4xl font-bold text-slate-950">
                  {resultadoVotacao.totalVotos}
                </p>
              </div>

              <div className="mt-5 grid gap-4">
                {listaSeguraAdminGovernanca(resultadoVotacao.opcoes).map((opcao) => (
                  <div
                    key={opcao.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-950">
                          {opcao.descricao}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {opcao.votos} voto(s)
                        </p>
                      </div>

                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                        {opcao.percentual.toFixed(2).replace(".", ",")}%
                      </span>
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-orange-500"
                        style={{ width: `${opcao.percentual}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Use “Ver apuração” em uma votação para consultar a apuração.
            </p>
          )}
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-emerald-700">
                Auditoria de participação
              </p>

              <h3 className="mt-2 text-2xl font-bold text-slate-950">
                Conferência de unidades votantes
              </h3>
            </div>

            {auditoriaParticipacaoVotacao ? (
              <button
                type="button"
                onClick={imprimirAuditoriaParticipacaoVotacao}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <Printer className="h-4 w-4" />
                Imprimir auditoria
              </button>
            ) : null}
          </div>

          {auditoriaParticipacaoVotacao ? (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.06em] text-slate-500">
                    Unidades aptas
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">
                    {auditoriaParticipacaoVotacao.resumo.totalUnidadesAptas}
                  </p>
                </article>

                <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
                    Participantes
                  </p>
                  <p className="mt-2 text-3xl font-bold text-emerald-950">
                    {auditoriaParticipacaoVotacao.resumo.totalParticipantes}
                  </p>
                </article>

                <article className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">
                    Ausentes
                  </p>
                  <p className="mt-2 text-3xl font-bold text-amber-950">
                    {auditoriaParticipacaoVotacao.resumo.totalAusentes}
                  </p>
                </article>

                <article className="rounded-3xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-orange-700">
                    Participação
                  </p>
                  <p className="mt-2 text-3xl font-bold text-orange-950">
                    {auditoriaParticipacaoVotacao.resumo.percentualParticipacao.toFixed(2)}%
                  </p>
                </article>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <h4 className="text-lg font-bold text-emerald-950">
                    Unidades participantes
                  </h4>

                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    Relação de unidades com participação registrada, sem exibir a opção votada.
                  </p>

                  {auditoriaParticipacaoVotacao.participantes.length === 0 ? (
                    <p className="mt-4 rounded-2xl border border-dashed border-emerald-300 bg-white p-4 text-sm text-emerald-800">
                      Nenhuma unidade participou desta votação.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-3">
                      {auditoriaParticipacaoVotacao.participantes.map((participante) => (
                        <article
                          key={participante.id}
                          className="rounded-2xl border border-emerald-200 bg-white p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-bold text-slate-950">
                                {participante.unidade.identificador}
                              </p>

                              <p className="mt-1 text-sm text-slate-600">
                                {participante.unidade.bloco
                                  ? `${participante.unidade.bloco.nome} • Unidade ${participante.unidade.numero}`
                                  : `Unidade ${participante.unidade.numero}`}
                              </p>

                              <p className="mt-2 text-sm text-slate-700">
                                {participante.morador?.nome
                                  ? `Morador: ${participante.morador.nome}`
                                  : 'Morador não informado'}
                              </p>
                            </div>

                            <div className="flex flex-col items-start gap-2 sm:items-end">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                {formatarDataHora(participante.registradoEm)}
                              </span>

                              {participante.porProcuracao ? (
                                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                                  Presença por procuração
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                                  Participação direta
                                </span>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4">
                  <h4 className="text-lg font-bold text-amber-950">
                    Unidades sem participação
                  </h4>

                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    Relação de unidades aptas que não registraram participação na votação auditada.
                  </p>

                  {auditoriaParticipacaoVotacao.ausentes.length === 0 ? (
                    <p className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-white p-4 text-sm text-amber-800">
                      Todas as unidades aptas participaram desta votação.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-3">
                      {auditoriaParticipacaoVotacao.ausentes.map((unidade) => (
                        <article
                          key={unidade.id}
                          className="rounded-2xl border border-amber-200 bg-white p-4"
                        >
                          <p className="font-bold text-slate-950">
                            {unidade.identificador}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {unidade.bloco
                              ? `${unidade.bloco.nome} • Unidade ${unidade.numero}`
                              : `Unidade ${unidade.numero}`}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : carregandoAuditoriaParticipacao ? (
            <p className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              Carregando auditoria de participação...
            </p>
          ) : erroAuditoriaParticipacao ? (
            <p className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
              {erroAuditoriaParticipacao}
            </p>
          ) : (
            <p className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Use “Auditar participação” em uma votação para consultar as unidades participantes e ausentes.
            </p>
          )}
        </article>
      </section>

      {assembleiaDetalhe?.status === 'ENCERRADA' ? (
        <section
          id="termo-encerramento-assembleia-impressao"
          className="hidden bg-white text-slate-950"
        >
          <style>{`
            #termo-encerramento-assembleia-impressao {
              display: none;
            }

            @media print {
              @page {
                size: A4;
                margin: 16mm;
              }

              body * {
                visibility: hidden !important;
              }

              #termo-encerramento-assembleia-impressao,
              #termo-encerramento-assembleia-impressao * {
                visibility: visible !important;
              }

              #termo-encerramento-assembleia-impressao {
                display: block !important;
                position: absolute;
                inset: 0;
                width: 100%;
                min-height: 100vh;
                margin: 0;
                padding: 0;
                background: #ffffff !important;
                color: #0f172a !important;
              }

              #termo-encerramento-assembleia-impressao .quebra-evitar {
                break-inside: avoid;
              }
            }
          `}</style>

          <div className="mx-auto max-w-5xl bg-white">
            <header className="border-b border-slate-300 pb-6 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-700">
                Condominaria Express
              </p>

              <h1 className="mt-3 text-3xl font-bold text-slate-950">
                Termo Administrativo de Encerramento da Assembleia
              </h1>

              <p className="mt-3 text-sm text-slate-600">
                {condominioSelecionado?.condominio.nome ?? 'Condomínio não informado'}
              </p>
            </header>

            <section className="quebra-evitar mt-6 rounded-3xl border border-slate-300 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                Assembleia encerrada
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                {assembleiaDetalhe.titulo}
              </h2>

              <div className="mt-4 grid gap-3 text-sm text-slate-800 md:grid-cols-2">
                <p>
                  <strong>Status:</strong> {rotuloStatusAssembleia(assembleiaDetalhe.status)}
                </p>
                <p>
                  <strong>Modalidade:</strong> {rotuloModalidade(assembleiaDetalhe.modalidade)}
                </p>
                <p>
                  <strong>1ª chamada:</strong>{' '}
                  {formatarDataHora(assembleiaDetalhe.primeiraChamadaEm)}
                </p>
                <p>
                  <strong>2ª chamada:</strong>{' '}
                  {formatarDataHora(assembleiaDetalhe.segundaChamadaEm)}
                </p>
              </div>
            </section>

            <section className="quebra-evitar mt-5 grid gap-4 md:grid-cols-4">
              <article className="rounded-3xl border border-slate-300 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Unidades totais
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {resumoQuorumAssembleia?.totalUnidades ?? 0}
                </p>
              </article>

              <article className="rounded-3xl border border-slate-300 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Presentes
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {resumoQuorumAssembleia?.unidadesPresentes ?? 0}
                </p>
              </article>

              <article className="rounded-3xl border border-slate-300 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Quórum
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {(resumoQuorumAssembleia?.percentualPresenca ?? 0).toFixed(2).replace('.', ',')}%
                </p>
              </article>

              <article className="rounded-3xl border border-slate-300 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Procurações
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {presencasAssembleia.filter((presenca) => presenca.porProcuracao).length}
                </p>
              </article>
            </section>

                        <section className="quebra-evitar mt-6 rounded-3xl border border-orange-200 bg-orange-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Conferência administrativa do encerramento
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <article className="rounded-2xl border border-white/80 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    Pautas registradas
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {listaSeguraAdminGovernanca(assembleiaDetalhe.pautas).length}
                  </p>
                </article>

                <article className="rounded-2xl border border-white/80 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    Pautas deliberadas
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {listaSeguraAdminGovernanca(assembleiaDetalhe.pautas).filter((pauta) => pauta.status === 'DELIBERADA').length}
                  </p>
                </article>

                <article className="rounded-2xl border border-white/80 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    Votações encerradas
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {listaSeguraAdminGovernanca(assembleiaDetalhe.pautas).filter((pauta) => pauta.votacao?.status === 'ENCERRADA').length}
                  </p>
                </article>
              </div>

              <p className="mt-4 text-sm leading-7 text-orange-950">
                Este termo consolida o encerramento administrativo da assembleia e deve ser arquivado junto à ata, lista de presença, edital de convocação e eventuais comprovantes de votação.
              </p>
            </section>

<section className="quebra-evitar mt-6 rounded-3xl border border-slate-300 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Declaração de encerramento
              </p>

              <p className="mt-4 whitespace-pre-line text-sm leading-8 text-slate-900">
                Fica registrado que a assembleia acima identificada foi encerrada, tendo sido
                conduzida conforme os dados administrativos constantes neste documento e no
                módulo de Governança da Condominaria Express.
              </p>

              <p className="mt-4 whitespace-pre-line text-sm leading-8 text-slate-900">
                Foram registradas {listaSeguraAdminGovernanca(assembleiaDetalhe.pautas).length} pauta(s), das quais{' '}
                {listaSeguraAdminGovernanca(assembleiaDetalhe.pautas).filter((pauta) => pauta.status === 'DELIBERADA').length}{' '}
                se encontram deliberada(s), e{' '}
                {listaSeguraAdminGovernanca(assembleiaDetalhe.pautas).filter(
                  (pauta) => pauta.votacao?.status === 'ENCERRADA',
                ).length}{' '}
                votação(ões) encerrada(s) com apuração disponível ou registrada no documento de ata.
              </p>
            </section>

            <section className="mt-6">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Resumo das pautas
              </p>

              {listaSeguraAdminGovernanca(assembleiaDetalhe.pautas).length === 0 ? (
                <p className="mt-4 rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-700">
                  Nenhuma pauta cadastrada para esta assembleia.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {listaSeguraAdminGovernanca(assembleiaDetalhe.pautas).map((pauta) => (
                    <article
                      key={pauta.id}
                      className="quebra-evitar rounded-3xl border border-slate-300 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                            Ordem {pauta.ordem}
                          </p>
                          <h3 className="mt-2 text-lg font-bold text-slate-950">
                            {pauta.titulo}
                          </h3>
                        </div>

                        <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-bold text-slate-800">
                          {rotuloStatusPauta(pauta.status)}
                        </span>
                      </div>

                      {pauta.deliberacao ? (
                        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-800">
                          {pauta.deliberacao}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="quebra-evitar mt-10 grid gap-10 md:grid-cols-2">
              <div className="border-t border-slate-500 pt-3 text-center">
                <p className="break-words text-sm font-semibold leading-5 text-slate-900">
                  Administração / Síndico responsável
                </p>
              </div>

              <div className="border-t border-slate-500 pt-3 text-center">
                <p className="break-words text-sm font-semibold leading-5 text-slate-900">
                  Responsável pelo registro da ata
                </p>
              </div>
            </section>

                        <section className="quebra-evitar mt-10">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Assinaturas do termo de encerramento
              </p>

              <div className="mt-10 grid gap-10 md:grid-cols-2">
                <div className="border-t border-slate-500 pt-3 text-center">
                  <p className="break-words text-sm font-semibold leading-5 text-slate-900">
                    Administração / Síndico responsável
                  </p>
                </div>

                <div className="border-t border-slate-500 pt-3 text-center">
                  <p className="break-words text-sm font-semibold leading-5 text-slate-900">
                    Responsável pelo encerramento
                  </p>
                </div>
              </div>

              <p className="mt-6 text-xs leading-6 text-slate-600">
                As assinaturas acima confirmam a conferência do encerramento administrativo e dos registros operacionais vinculados à assembleia.
              </p>
            </section>

<footer className="mt-8 border-t border-slate-300 pt-5 text-sm text-slate-600">
              <p>
                Termo emitido pelo módulo de Governança da Condominaria Express. Emitido em {formatarDataHora(new Date().toISOString())}.
              </p>
            </footer>
          </div>
        </section>
      ) : null}

      {assembleiaDetalhe ? (
        <section
          id="edital-convocacao-assembleia-impressao"
          className="hidden bg-white text-slate-950"
        >
          <style>{`
            #edital-convocacao-assembleia-impressao {
              display: none;
            }

            @media print {
              @page {
                size: A4;
                margin: 16mm;
              }

              body * {
                visibility: hidden !important;
              }

              #edital-convocacao-assembleia-impressao,
              #edital-convocacao-assembleia-impressao * {
                visibility: visible !important;
              }

              #edital-convocacao-assembleia-impressao {
                display: block !important;
                position: absolute;
                inset: 0;
                width: 100%;
                min-height: 100vh;
                margin: 0;
                padding: 0;
                background: #ffffff !important;
                color: #0f172a !important;
              }

              #edital-convocacao-assembleia-impressao .quebra-evitar {
                break-inside: avoid;
              }
            }
          `}</style>

          <div className="mx-auto max-w-5xl bg-white">
            <header className="border-b border-slate-300 pb-6 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-700">
                Condominaria Express
              </p>

              <h1 className="mt-3 text-3xl font-bold text-slate-950">
                Edital de Convocação da Assembleia
              </h1>

              <p className="mt-3 text-sm text-slate-600">
                {condominioSelecionado?.condominio.nome ?? 'Condomínio não informado'}
              </p>
            </header>

            <section className="quebra-evitar mt-6 rounded-3xl border border-slate-300 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                Assembleia convocada
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                {assembleiaDetalhe.titulo}
              </h2>

              {assembleiaDetalhe.descricao ? (
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-800">
                  {assembleiaDetalhe.descricao}
                </p>
              ) : null}
            </section>

                        <section className="quebra-evitar mt-6 rounded-3xl border border-orange-200 bg-orange-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Dados formais da convocação
              </p>

              <div className="mt-4 grid gap-3 text-sm leading-7 text-orange-950 md:grid-cols-2">
                <p>
                  <strong>Condomínio:</strong>{' '}
                  {condominioSelecionado?.condominio.nome ?? 'Condomínio não informado'}
                </p>

                <p>
                  <strong>Status da assembleia:</strong>{' '}
                  {rotuloStatusAssembleia(assembleiaDetalhe.status)}
                </p>

                <p>
                  <strong>Modalidade:</strong>{' '}
                  {rotuloModalidade(assembleiaDetalhe.modalidade)}
                </p>

                <p>
                  <strong>Documento emitido em:</strong>{' '}
                  {formatarDataHora(new Date().toISOString())}
                </p>
              </div>
            </section>

<section className="quebra-evitar mt-5 grid gap-4 md:grid-cols-2">
              <article className="rounded-3xl border border-slate-300 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Chamadas
                </p>

                <p className="mt-3 text-sm font-semibold text-slate-900">
                  1ª chamada: {formatarDataHora(assembleiaDetalhe.primeiraChamadaEm)}
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  2ª chamada: {formatarDataHora(assembleiaDetalhe.segundaChamadaEm)}
                </p>
              </article>

              <article className="rounded-3xl border border-slate-300 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Modalidade e acesso
                </p>

                <p className="mt-3 text-sm font-semibold text-slate-900">
                  Modalidade: {rotuloModalidade(assembleiaDetalhe.modalidade)}
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Local: {assembleiaDetalhe.local ?? 'Não informado'}
                </p>

                <p className="mt-2 break-all text-sm font-semibold text-slate-900">
                  Link: {assembleiaDetalhe.linkOnline ?? 'Não informado'}
                </p>
              </article>
            </section>

            <section className="quebra-evitar mt-6 rounded-3xl border border-slate-300 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Texto de convocação
              </p>

              <p className="mt-4 whitespace-pre-line text-sm leading-8 text-slate-900">
                Ficam os condôminos convocados para participar da assembleia acima identificada,
                a realizar-se nas datas, horários e condições informados neste edital, para apreciação,
                discussão e deliberação dos assuntos constantes da ordem do dia.
              </p>
            </section>

                        <section className="quebra-evitar mt-6 rounded-3xl border border-slate-300 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Orientações aos condôminos
              </p>

              <ul className="mt-4 grid gap-2 pl-5 text-sm leading-7 text-slate-900">
                <li>
                  Comparecer na primeira ou segunda chamada, conforme horários indicados neste edital.
                </li>
                <li>
                  Observar a modalidade, local ou link de acesso informados para participação.
                </li>
                <li>
                  Verificar a ordem do dia antes da assembleia e acompanhar as deliberações registradas.
                </li>
                <li>
                  Quando aplicável, apresentar procuração ou documento de representação conforme regras internas do condomínio.
                </li>
              </ul>
            </section>

<section className="mt-6">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Ordem do dia
              </p>

              {listaSeguraAdminGovernanca(assembleiaDetalhe.pautas).length === 0 ? (
                <p className="mt-4 rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-700">
                  Nenhuma pauta cadastrada para esta assembleia.
                </p>
              ) : (
                <ol className="mt-4 grid gap-3 pl-6 text-sm leading-7 text-slate-900">
                  {listaSeguraAdminGovernanca(assembleiaDetalhe.pautas).map((pauta) => (
                    <li key={pauta.id} className="pl-1">
                      <span className="font-bold">{pauta.titulo}</span>
                      {pauta.descricao ? (
                        <span className="block text-slate-700">
                          {pauta.descricao}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>

                        <section className="quebra-evitar mt-8 rounded-3xl border border-slate-300 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Registro administrativo
              </p>

              <p className="mt-4 text-sm leading-8 text-slate-900">
                Este edital deve ser arquivado junto aos documentos da assembleia, lista de presença, ata/resumo administrativo, termo de encerramento e eventuais registros de votação.
              </p>
            </section>

<section className="quebra-evitar mt-10">
              <div className="mx-auto max-w-md border-t border-slate-500 pt-3 text-center">
                <p className="break-words text-sm font-semibold leading-5 text-slate-900">
                  Administração / Síndico responsável
                </p>
              </div>
            </section>

            <footer className="mt-8 border-t border-slate-300 pt-5 text-sm text-slate-600">
              <p>
                Edital emitido pelo módulo de Governança da Condominaria Express. Emitido em {formatarDataHora(new Date().toISOString())}.
              </p>
            </footer>
          </div>
        </section>
      ) : null}

      {assembleiaDetalhe ? (
        <section
          id="lista-presenca-assembleia-impressao"
          className="hidden bg-white text-slate-950"
        >
          <style>{`
            #lista-presenca-assembleia-impressao {
              display: none;
            }

            @media print {
              @page {
                size: A4 landscape;
                margin: 12mm;
              }

              body * {
                visibility: hidden !important;
              }

              #lista-presenca-assembleia-impressao,
              #lista-presenca-assembleia-impressao * {
                visibility: visible !important;
              }

              #lista-presenca-assembleia-impressao {
                display: block !important;
                position: absolute;
                inset: 0;
                width: 100%;
                min-height: 100vh;
                margin: 0;
                padding: 0;
                background: #ffffff !important;
                color: #0f172a !important;
              }

              #lista-presenca-assembleia-impressao .quebra-evitar {
                break-inside: avoid;
              }
            }
          `}</style>

          <div className="mx-auto max-w-7xl bg-white">
            <header className="border-b border-slate-300 pb-6">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-700">
                Condominaria Express
              </p>

              <h1 className="mt-3 text-3xl font-bold text-slate-950">
                Lista de Presença e Quórum da Assembleia
              </h1>

              <p className="mt-3 text-sm text-slate-600">
                Documento de conferência, quórum e coleta de assinaturas dos participantes.
              </p>
            </header>

            <section className="quebra-evitar mt-6 rounded-3xl border border-slate-300 p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    Assembleia
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">
                    {assembleiaDetalhe.titulo}
                  </h2>
                  <p className="mt-2 text-sm text-slate-700">
                    {condominioSelecionado?.condominio.nome ?? 'Condomínio não informado'}
                  </p>
                </div>

                <div className="grid gap-2 text-sm text-slate-800">
                  <p>
                    <strong>Status:</strong>{' '}
                    {rotuloStatusAssembleia(assembleiaDetalhe.status)}
                  </p>
                  <p>
                    <strong>Modalidade:</strong>{' '}
                    {rotuloModalidade(assembleiaDetalhe.modalidade)}
                  </p>
                  <p>
                    <strong>1ª chamada:</strong>{' '}
                    {formatarDataHora(assembleiaDetalhe.primeiraChamadaEm)}
                  </p>
                  <p>
                    <strong>Local:</strong>{' '}
                    {assembleiaDetalhe.local ?? 'Não informado'}
                  </p>
                </div>
              </div>
            </section>

                        <section className="quebra-evitar mt-6 rounded-3xl border border-orange-200 bg-orange-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Conferência de quórum e participação
              </p>

              <div className="mt-4 grid gap-3 text-sm leading-7 text-orange-950 md:grid-cols-2">
                <p>
                  <strong>2ª chamada:</strong>{' '}
                  {formatarDataHora(assembleiaDetalhe.segundaChamadaEm)}
                </p>

                <p>
                  <strong>Link online:</strong>{' '}
                  {assembleiaDetalhe.linkOnline ?? 'Não informado'}
                </p>

                <p>
                  <strong>Presenças por procuração:</strong>{' '}
                  {presencasAssembleia.filter((presenca) => presenca.porProcuracao).length}
                </p>

                <p>
                  <strong>Documento emitido em:</strong>{' '}
                  {formatarDataHora(new Date().toISOString())}
                </p>
              </div>

              <p className="mt-4 text-sm leading-7 text-orange-950">
                Esta lista consolida os registros de presença utilizados para conferência de quórum, participação e coleta de assinatura dos presentes ou representantes.
              </p>
            </section>

<section className="quebra-evitar mt-5 grid gap-4 md:grid-cols-4">
              <article className="rounded-3xl border border-slate-300 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Unidades totais
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {resumoQuorumAssembleia?.totalUnidades ?? 0}
                </p>
              </article>

              <article className="rounded-3xl border border-slate-300 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Presentes
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {resumoQuorumAssembleia?.unidadesPresentes ?? 0}
                </p>
              </article>

              <article className="rounded-3xl border border-slate-300 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Ausentes
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {resumoQuorumAssembleia?.unidadesAusentes ?? 0}
                </p>
              </article>

              <article className="rounded-3xl border border-slate-300 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Quórum
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {(resumoQuorumAssembleia?.percentualPresenca ?? 0).toFixed(2)}%
                </p>
              </article>
            </section>

                        <section className="quebra-evitar mt-6 rounded-3xl border border-slate-300 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Legenda de representação
              </p>

              <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-900 md:grid-cols-2">
                <p>
                  <strong>Procuração: Sim</strong> — participação registrada por representante/procurador.
                </p>

                <p>
                  <strong>Procuração: Não</strong> — participação direta do morador/unidade.
                </p>
              </div>
            </section>

<section className="mt-6">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Relação de presenças
              </p>

              {presencasAssembleia.length === 0 ? (
                <p className="mt-4 rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-700">
                  Nenhuma presença registrada para esta assembleia.
                </p>
              ) : (
                <table className="mt-4 w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border border-slate-300 p-3 text-left font-bold text-slate-900">
                        Unidade
                      </th>
                      <th className="border border-slate-300 p-3 text-left font-bold text-slate-900">
                        Participante / representante
                      </th>
                      <th className="border border-slate-300 p-3 text-left font-bold text-slate-900">
                        Documento
                      </th>
                      <th className="border border-slate-300 p-3 text-left font-bold text-slate-900">
                        Procuração
                      </th>
                      <th className="border border-slate-300 p-3 text-left font-bold text-slate-900">
                        Assinatura
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {presencasAssembleia.map((presenca) => (
                      <tr key={presenca.id} className="quebra-evitar">
                        <td className="border border-slate-300 p-3 align-top font-semibold text-slate-900">
                          <p>{presenca.unidade.identificador}</p>
                          <p className="mt-1 text-xs font-normal text-slate-700">
                            {presenca.unidade.bloco
                              ? `${presenca.unidade.bloco.nome} • Unidade ${presenca.unidade.numero}`
                              : `Unidade ${presenca.unidade.numero}`}
                          </p>
                        </td>

                        <td className="border border-slate-300 p-3 align-top text-slate-900">
                          {presenca.morador?.nome ??
                            presenca.nomeRepresentante ??
                            'Não informado'}
                        </td>

                        <td className="border border-slate-300 p-3 align-top text-slate-900">
                          {presenca.documentoRepresentante ?? 'Não informado'}
                        </td>

                        <td className="border border-slate-300 p-3 align-top text-slate-900">
                          {presenca.porProcuracao ? 'Sim' : 'Não'}
                        </td>

                        <td className="h-20 border border-slate-300 p-3 align-bottom">
                          <div className="h-10 border-b border-slate-500" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

                        <section className="quebra-evitar mt-10">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Conferência administrativa da lista
              </p>

              <div className="mt-10 grid gap-10 md:grid-cols-2">
                <div className="border-t border-slate-500 pt-3 text-center">
                  <p className="break-words text-sm font-semibold leading-5 text-slate-900">
                    Administração / Síndico responsável
                  </p>
                </div>

                <div className="border-t border-slate-500 pt-3 text-center">
                  <p className="break-words text-sm font-semibold leading-5 text-slate-900">
                    Responsável pela conferência de presença
                  </p>
                </div>
              </div>

              <p className="mt-6 text-xs leading-6 text-slate-600">
                As assinaturas acima confirmam a conferência administrativa dos registros de presença, procurações e quórum desta assembleia.
              </p>
            </section>

<footer className="mt-8 border-t border-slate-300 pt-5 text-sm text-slate-600">
              <p>
                Lista emitida pelo módulo de Governança da Condominaria Express. Emitida em {formatarDataHora(new Date().toISOString())}.
              </p>
            </footer>
          </div>
        </section>
      ) : null}

      {assembleiaDetalhe ? (
        <section
          id="ata-assembleia-impressao"
          className="hidden bg-white text-slate-950"
        >
          <style>{`
            #ata-assembleia-impressao {
              display: none;
            }

            @media print {
              @page {
                size: A4;
                margin: 16mm;
              }

              body * {
                visibility: hidden !important;
              }

              #ata-assembleia-impressao,
              #ata-assembleia-impressao * {
                visibility: visible !important;
              }

              #ata-assembleia-impressao {
                display: block !important;
                position: absolute;
                inset: 0;
                width: 100%;
                min-height: 100vh;
                margin: 0;
                padding: 0;
                background: #ffffff !important;
                color: #0f172a !important;
              }

              #ata-assembleia-impressao .quebra-evitar {
                break-inside: avoid;
              }
            }
          `}</style>

          <div className="mx-auto max-w-5xl bg-white">
            <header className="border-b border-slate-300 pb-6">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-700">
                Condominaria Express
              </p>

              <h1 className="mt-3 text-3xl font-bold text-slate-950">
                Ata / Resumo Administrativo da Assembleia
              </h1>

              <p className="mt-3 text-sm text-slate-600">
                Documento gerado para conferência, registro administrativo e arquivamento condominial.
              </p>
            </header>

            <section className="quebra-evitar mt-6 rounded-3xl border border-slate-300 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    Assembleia
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-slate-950">
                    {assembleiaDetalhe.titulo}
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-bold text-slate-800">
                    {rotuloStatusAssembleia(assembleiaDetalhe.status)}
                  </span>

                  <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-bold text-slate-800">
                    {rotuloModalidade(assembleiaDetalhe.modalidade)}
                  </span>
                </div>
              </div>

              {assembleiaDetalhe.descricao ? (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    Descrição
                  </p>

                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-800">
                    {assembleiaDetalhe.descricao}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="quebra-evitar mt-5 grid gap-4 md:grid-cols-2">
              <article className="rounded-3xl border border-slate-300 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Chamadas
                </p>

                <p className="mt-3 text-sm font-semibold text-slate-900">
                  1ª chamada: {formatarDataHora(assembleiaDetalhe.primeiraChamadaEm)}
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  2ª chamada: {formatarDataHora(assembleiaDetalhe.segundaChamadaEm)}
                </p>
              </article>

              <article className="rounded-3xl border border-slate-300 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Local e acesso
                </p>

                <p className="mt-3 text-sm font-semibold text-slate-900">
                  Local: {assembleiaDetalhe.local ?? 'Não informado'}
                </p>

                <p className="mt-2 break-all text-sm font-semibold text-slate-900">
                  Link: {assembleiaDetalhe.linkOnline ?? 'Não informado'}
                </p>
              </article>
            </section>

            {assembleiaDetalhe.motivoCancelamento ? (
              <section className="quebra-evitar mt-5 rounded-3xl border border-rose-300 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-rose-700">
                  Motivo do cancelamento
                </p>

                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-rose-950">
                  {assembleiaDetalhe.motivoCancelamento}
                </p>
              </section>
            ) : null}

                        <section className="mt-6">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Quórum e presenças registradas
              </p>

              <div className="quebra-evitar mt-4 grid gap-4 md:grid-cols-4">
                <article className="rounded-3xl border border-slate-300 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    Unidades totais
                  </p>
                  <p className="mt-3 text-3xl font-bold text-slate-950">
                    {resumoQuorumAssembleia?.totalUnidades ?? 0}
                  </p>
                </article>

                <article className="rounded-3xl border border-slate-300 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    Presentes
                  </p>
                  <p className="mt-3 text-3xl font-bold text-slate-950">
                    {resumoQuorumAssembleia?.unidadesPresentes ?? 0}
                  </p>
                </article>

                <article className="rounded-3xl border border-slate-300 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    Ausentes
                  </p>
                  <p className="mt-3 text-3xl font-bold text-slate-950">
                    {resumoQuorumAssembleia?.unidadesAusentes ?? 0}
                  </p>
                </article>

                <article className="rounded-3xl border border-slate-300 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    Quórum
                  </p>
                  <p className="mt-3 text-3xl font-bold text-slate-950">
                    {(resumoQuorumAssembleia?.percentualPresenca ?? 0).toFixed(2)}%
                  </p>
                </article>
              </div>

              <div className="mt-4 grid gap-4">
                {presencasAssembleia.length === 0 ? (
                  <p className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-700">
                    Nenhuma presença registrada para esta assembleia.
                  </p>
                ) : (
                  presencasAssembleia.map((presenca) => (
                    <article
                      key={presenca.id}
                      className="quebra-evitar rounded-3xl border border-slate-300 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                            Unidade presente
                          </p>

                          <h3 className="mt-2 text-xl font-bold text-slate-950">
                            {presenca.unidade.identificador}
                          </h3>

                          {presenca.unidade.bloco ? (
                            <p className="mt-1 text-sm text-slate-700">
                              {presenca.unidade.bloco.nome} • Unidade {presenca.unidade.numero}
                            </p>
                          ) : (
                            <p className="mt-1 text-sm text-slate-700">
                              Unidade {presenca.unidade.numero}
                            </p>
                          )}
                        </div>

                        <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-bold text-slate-800">
                          Presente
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                            Participante
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {presenca.morador?.nome ??
                              presenca.nomeRepresentante ??
                              'Representante não informado'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                            Documento do representante
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {presenca.documentoRepresentante ?? 'Não informado'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                            Representação por procuração
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {presenca.porProcuracao ? 'Sim' : 'Não'}
                          </p>
                        </div>
                      </div>

                      {presenca.procuracaoObservacoes ? (
                        <div className="mt-4 rounded-2xl border border-orange-200 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                            Observações da procuração
                          </p>
                          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-800">
                            {presenca.procuracaoObservacoes}
                          </p>
                        </div>
                      ) : null}

                      {presenca.observacoes ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                            Observações
                          </p>
                          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-800">
                            {presenca.observacoes}
                          </p>
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="quebra-evitar mt-6 rounded-3xl border border-slate-300 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Síntese formal automática
              </p>

              <div className="mt-4 grid gap-4">
                {paragrafosSinteseAta.map((paragrafo, indice) => (
                  <p
                    key={`sintese-ata-${indice}`}
                    className="whitespace-pre-line text-sm leading-8 text-slate-900"
                  >
                    {paragrafo}
                  </p>
                ))}
              </div>
            </section>

<section className="mt-6">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Pautas e deliberações
              </p>

              <div className="mt-4 grid gap-4">
                {listaSeguraAdminGovernanca(assembleiaDetalhe.pautas).map((pauta) => (
                  <article
                    key={pauta.id}
                    className="quebra-evitar rounded-3xl border border-slate-300 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                          Ordem {pauta.ordem}
                        </p>

                        <h3 className="mt-2 text-xl font-bold text-slate-950">
                          {pauta.titulo}
                        </h3>
                      </div>

                      <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-bold text-slate-800">
                        {rotuloStatusPauta(pauta.status)}
                      </span>
                    </div>

                    {pauta.descricao ? (
                      <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-800">
                        {pauta.descricao}
                      </p>
                    ) : null}

                    {pauta.deliberacao ? (
                      <div className="mt-4 rounded-2xl border border-emerald-300 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">
                          Deliberação registrada
                        </p>

                        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-emerald-950">
                          {pauta.deliberacao}
                        </p>
                      </div>
                    ) : null}

                    {pauta.votacao ? (
                      <div className="mt-4 rounded-2xl border border-slate-300 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                          Votação vinculada
                        </p>

                        <p className="mt-2 text-sm font-semibold text-slate-950">
                          {pauta.votacao.titulo}
                        </p>

                        <p className="mt-1 text-sm text-slate-700">
                          Status: {rotuloStatusVotacao(pauta.votacao.status)}
                        </p>
                      </div>
                    ) : null}
                  </article>
                ))}

                {listaSeguraAdminGovernanca(assembleiaDetalhe.pautas).length === 0 ? (
                  <p className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-700">
                    Nenhuma pauta cadastrada nesta assembleia.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="mt-6">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Apurações das votações encerradas
              </p>

              <div className="mt-4 grid gap-4">
                {assembleiaDetalhe.pautas
                  .filter(
                    (pauta) => pauta.votacao?.status === 'ENCERRADA',
                  )
                  .map((pauta) => {
                    const votacao = pauta.votacao!;
                    const resultado = resultadosAtaAssembleia[votacao.id];

                    return (
                      <article
                        key={votacao.id}
                        className="quebra-evitar rounded-3xl border border-orange-300 p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                              Pauta: {pauta.titulo}
                            </p>

                            <h3 className="mt-2 text-xl font-bold text-slate-950">
                              {votacao.titulo}
                            </h3>
                          </div>

                          <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-bold text-slate-800">
                            Encerrada
                          </span>
                        </div>

                        {resultado ? (
                          <>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                                  Resumo da apuração
                                </p>
                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                  {resultado.totalVotos} voto(s)
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-600">
                                  Total registrado nesta votação.
                                </p>
                              </div>

                              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">
                                  Opção mais votada
                                </p>
                                <p className="mt-2 text-sm font-bold leading-6 text-slate-950">
                                  {listaSeguraAdminGovernanca(resultado.opcoes)
                                    .filter((opcao) => opcao.votos > 0)
                                    .sort((a, b) => b.votos - a.votos)[0]?.descricao ??
                                    "Sem votos registrados"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3">
                              {listaSeguraAdminGovernanca(resultado.opcoes).map((opcao) => (
                                <article
                                  key={opcao.id}
                                  className="rounded-2xl border border-slate-300 p-4"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="font-bold text-slate-950">
                                        {opcao.descricao}
                                      </p>

                                      <p className="mt-1 text-sm text-slate-700">
                                        {opcao.votos} voto(s)
                                      </p>
                                    </div>

                                    <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-bold text-slate-800">
                                      {opcao.percentual.toFixed(2)}%
                                    </span>
                                  </div>
                                </article>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-700">
                            Resultado não disponível no momento da geração da ata.
                          </p>
                        )}
                      </article>
                    );
                  })}

                {listaSeguraAdminGovernanca(assembleiaDetalhe.pautas).every(
                  (pauta) => pauta.votacao?.status !== 'ENCERRADA',
                ) ? (
                  <p className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-700">
                    Esta assembleia ainda não possui votações encerradas para apuração.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="quebra-evitar mt-10">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                Assinaturas e conferência da ata
              </p>

              <div className="mt-10 grid gap-10 md:grid-cols-2">
                <div className="border-t border-slate-500 pt-3 text-center">
                  <p className="break-words text-sm font-semibold leading-5 text-slate-900">
                    Administração / Síndico responsável
                  </p>
                </div>

                <div className="border-t border-slate-500 pt-3 text-center">
                  <p className="break-words text-sm font-semibold leading-5 text-slate-900">
                    Responsável pelo registro da ata
                  </p>
                </div>
              </div>

              <p className="mt-6 text-xs leading-6 text-slate-600">
                As assinaturas acima confirmam a conferência administrativa das informações registradas nesta ata, incluindo presenças, pautas, deliberações e apurações disponíveis no momento da emissão.
              </p>
            </section>

            <footer className="mt-8 border-t border-slate-300 pt-5 text-sm text-slate-600">
              <p>
                Impresso pelo módulo de Governança da Condominaria Express.
              </p>
            </footer>
          </div>
        </section>
      ) : null}
    
      {confirmacaoEncerramentoAssembleia ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <section className="w-full max-w-xl rounded-[2rem] border border-orange-100 bg-white p-5 shadow-2xl sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-700">
              Ação crítica
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">
              Confirmar encerramento da assembleia
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ao encerrar a assembleia, o fluxo administrativo deixa de aceitar novas alterações operacionais normais. Confira presenças, pautas e votações antes de confirmar.
            </p>

            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                Assembleia
              </p>
              <p className="mt-1 text-sm font-bold leading-6 text-slate-950">
                {confirmacaoEncerramentoAssembleia.titulo}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold leading-6 text-orange-900">
              Esta ação deve ser usada somente após concluir presenças, deliberações, votações e conferências administrativas.
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
              <button
                type="button"
                onClick={() => setConfirmacaoEncerramentoAssembleia(null)}
                disabled={
                  acaoEmExecucao ===
                  `encerrar-assembleia-${confirmacaoEncerramentoAssembleia.id}`
                }
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void confirmarEncerramentoAssembleia()}
                disabled={
                  acaoEmExecucao ===
                  `encerrar-assembleia-${confirmacaoEncerramentoAssembleia.id}`
                }
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-orange-600 px-5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-wait disabled:opacity-70"
              >
                {acaoEmExecucao ===
                `encerrar-assembleia-${confirmacaoEncerramentoAssembleia.id}`
                  ? 'Encerrando...'
                  : 'Confirmar encerramento'}
              </button>
            </div>
          </section>
        </div>
      ) : null}


      {confirmacaoEncerramentoVotacao ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <section className="w-full max-w-xl rounded-[2rem] border border-orange-100 bg-white p-5 shadow-2xl sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-700">
              Ação crítica
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">
              Confirmar encerramento da votação
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ao encerrar, a votação deixa de receber novos votos e a apuração passa a ficar disponível para conferência.
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Votação
                </p>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-950">
                  {confirmacaoEncerramentoVotacao.titulo}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Pauta
                </p>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-950">
                  {confirmacaoEncerramentoVotacao.pautaTitulo}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold leading-6 text-orange-900">
              Confira se todos os participantes já tiveram tempo hábil para votar antes de confirmar.
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
              <button
                type="button"
                onClick={() => setConfirmacaoEncerramentoVotacao(null)}
                disabled={
                  acaoEmExecucao ===
                  `encerrar-votacao-${confirmacaoEncerramentoVotacao.votacaoId}`
                }
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void confirmarEncerramentoVotacao()}
                disabled={
                  acaoEmExecucao ===
                  `encerrar-votacao-${confirmacaoEncerramentoVotacao.votacaoId}`
                }
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-orange-600 px-5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-wait disabled:opacity-70"
              >
                {acaoEmExecucao ===
                `encerrar-votacao-${confirmacaoEncerramentoVotacao.votacaoId}`
                  ? 'Encerrando...'
                  : 'Confirmar encerramento'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

</AdminShell>
  );
}
