import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Download,
  ExternalLink,
  LoaderCircle,
  MessageCircle,
  Plus,
  Printer,
  Save,
  Search,
  X,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useAdminRouteContext } from '../components/AdminProtectedRoute';
import { AdminShell } from '../components/AdminShell';
import { usePageTitle } from '../hooks/usePageTitle';
import { ApiError, apiRequest } from '../lib/api';
import type {
  AdminContratoCondominio,
  AdminContratoPayload,
  AdminContratosResumo,
  AdminContratoStatusPayload,
  AdminPrestador,
  StatusContratoCondominioAdmin,
} from '../types/api';

type FiltroStatusContrato =
  | 'TODOS'
  | StatusContratoCondominioAdmin
  | 'VENCENDO'
  | 'VENCIDO';

type FormContrato = {
  id: number | null;
  titulo: string;
  categoria: string;
  descricao: string;
  numeroContrato: string;
  valorMensal: string;
  prestadorId: string;
  inicioEm: string;
  fimEm: string;
  renovacaoAutomatica: boolean;
  observacoes: string;
  arquivoUrl: string;
};

const formularioVazio: FormContrato = {
  id: null,
  titulo: '',
  categoria: '',
  descricao: '',
  numeroContrato: '',
  valorMensal: '',
  prestadorId: '',
  inicioEm: '',
  fimEm: '',
  renovacaoAutomatica: false,
  observacoes: '',
  arquivoUrl: '',
};

const statusOptions: Array<{ valor: FiltroStatusContrato; rotulo: string }> = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'ATIVO', rotulo: 'Ativos' },
  { valor: 'VENCENDO', rotulo: 'Próximos do vencimento' },
  { valor: 'VENCIDO', rotulo: 'Vencidos' },
  { valor: 'ENCERRADO', rotulo: 'Encerrados' },
  { valor: 'CANCELADO', rotulo: 'Cancelados' },
];

const categoriasSugeridas = [
  'Elevador',
  'Segurança',
  'Limpeza',
  'Jardinagem',
  'Internet',
  'Portaria',
  'Administração',
  'Sistema',
  'Seguro',
  'Manutenção',
  'Fornecedor recorrente',
];

function formatarData(valor: string | null | undefined) {
  if (!valor) {
    return '—';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(new Date(valor));
}

function formatarMoeda(valor: string | number | null | undefined) {
  const numero = Number(valor ?? 0);

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(numero) ? numero : 0);
}

function normalizarCsv(valor: unknown) {
  return `"${String(valor ?? '').replace(/"/g, '""')}"`;
}

function normalizarTelefone(telefone: string | null | undefined) {
  const apenasNumeros = String(telefone ?? '').replace(/\D/g, '');

  if (!apenasNumeros) {
    return '';
  }

  if (apenasNumeros.startsWith('55')) {
    return apenasNumeros;
  }

  return `55${apenasNumeros}`;
}

function statusRotulo(status: StatusContratoCondominioAdmin) {
  const mapa: Record<StatusContratoCondominioAdmin, string> = {
    ATIVO: 'Ativo',
    ENCERRADO: 'Encerrado',
    CANCELADO: 'Cancelado',
  };

  return mapa[status];
}

function contratoVencido(contrato: AdminContratoCondominio) {
  if (contrato.status !== 'ATIVO' || !contrato.fimEm) {
    return false;
  }

  return new Date(contrato.fimEm).getTime() < Date.now();
}

function contratoVencendo(contrato: AdminContratoCondominio) {
  if (contrato.status !== 'ATIVO' || !contrato.fimEm) {
    return false;
  }

  const agora = new Date();
  const limite = new Date(agora);
  limite.setDate(limite.getDate() + 30);

  const fimEm = new Date(contrato.fimEm).getTime();

  return fimEm >= agora.getTime() && fimEm <= limite.getTime();
}

function classeStatusContrato(contrato: AdminContratoCondominio) {
  if (contratoVencido(contrato)) {
    return 'bg-red-50 text-red-700 ring-red-100';
  }

  if (contratoVencendo(contrato)) {
    return 'bg-amber-50 text-amber-700 ring-amber-100';
  }

  const mapa: Record<StatusContratoCondominioAdmin, string> = {
    ATIVO: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    ENCERRADO: 'bg-slate-100 text-slate-700 ring-slate-200',
    CANCELADO: 'bg-rose-50 text-rose-700 ring-rose-100',
  };

  return mapa[contrato.status];
}

function rotuloStatusVisual(contrato: AdminContratoCondominio) {
  if (contratoVencido(contrato)) {
    return 'Vencido';
  }

  if (contratoVencendo(contrato)) {
    return 'Vence em breve';
  }

  return statusRotulo(contrato.status);
}

function ContratoStatusBadge({
  contrato,
  className = '',
}: {
  contrato: AdminContratoCondominio;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${classeStatusContrato(
        contrato,
      )} ${className}`}
    >
      {rotuloStatusVisual(contrato)}
    </span>
  );
}

function textoBuscaContrato(contrato: AdminContratoCondominio) {
  return [
    contrato.titulo,
    contrato.categoria,
    contrato.descricao,
    contrato.numeroContrato,
    contrato.status,
    contrato.prestador?.nome,
    contrato.prestador?.empresa,
    contrato.prestador?.tipoServico,
    contrato.observacoes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pt-BR');
}

function dataParaInputDate(valor: string | null | undefined) {
  if (!valor) {
    return '';
  }

  return valor.slice(0, 10);
}

// data-admin-contratos-responsive-fix="true"
export function AdminContratosPage() {
  usePageTitle('Contratos do condomínio');

  const { usuario, condominiosAdministrativos } = useAdminRouteContext();

  const condominiosDisponiveis = useMemo(
    () =>
      condominiosAdministrativos.map((vinculo) => ({
        id: vinculo.condominio.id,
        nome: vinculo.condominio.nome,
      })),
    [condominiosAdministrativos],
  );

  const [condominioId, setCondominioId] = useState<number | null>(
    condominiosDisponiveis[0]?.id ?? null,
  );
  const [contratos, setContratos] = useState<AdminContratoCondominio[]>([]);
  const [prestadores, setPrestadores] = useState<AdminPrestador[]>([]);
  const [resumo, setResumo] = useState<AdminContratosResumo | null>(null);
  const [formulario, setFormulario] = useState<FormContrato>(formularioVazio);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<FiltroStatusContrato>('TODOS');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  useEffect(() => {
    if (!condominioId && condominiosDisponiveis.length > 0) {
      setCondominioId(condominiosDisponiveis[0].id);
    }
  }, [condominioId, condominiosDisponiveis]);

  async function carregarDados() {
    if (!condominioId) {
      setContratos([]);
      setPrestadores([]);
      setResumo(null);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro('');

    try {
      const [contratosResposta, prestadoresResposta, resumoResposta] =
        await Promise.all([
          apiRequest<AdminContratoCondominio[]>(
            `/condominios/${condominioId}/contratos`,
          ),
          apiRequest<AdminPrestador[]>(`/condominios/${condominioId}/prestadores`),
          apiRequest<AdminContratosResumo>(
            `/condominios/${condominioId}/contratos/resumo`,
          ),
        ]);

      setContratos(contratosResposta);
      setPrestadores(prestadoresResposta);
      setResumo(resumoResposta);
    } catch (error) {
      const mensagem =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível carregar os contratos.';

      setErro(mensagem);
      setContratos([]);
      setResumo(null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarDados();
    setFormulario(formularioVazio);
  }, [condominioId]);

  const contratosFiltrados = useMemo(() => {
    const buscaNormalizada = busca.trim().toLocaleLowerCase('pt-BR');

    return contratos
      .filter((contrato) => {
        if (statusFiltro === 'TODOS') {
          return true;
        }

        if (statusFiltro === 'VENCIDO') {
          return contratoVencido(contrato);
        }

        if (statusFiltro === 'VENCENDO') {
          return contratoVencendo(contrato);
        }

        return contrato.status === statusFiltro;
      })
      .filter((contrato) => {
        if (!buscaNormalizada) {
          return true;
        }

        return textoBuscaContrato(contrato).includes(buscaNormalizada);
      })
      .sort((a, b) => {
        const peso = (contrato: AdminContratoCondominio) => {
          if (contratoVencido(contrato)) {
            return 0;
          }

          if (contratoVencendo(contrato)) {
            return 1;
          }

          if (contrato.status === 'ATIVO') {
            return 2;
          }

          if (contrato.status === 'ENCERRADO') {
            return 3;
          }

          return 4;
        };

        const pesoA = peso(a);
        const pesoB = peso(b);

        if (pesoA !== pesoB) {
          return pesoA - pesoB;
        }

        return (
          new Date(a.fimEm ?? a.atualizadoEm).getTime() -
          new Date(b.fimEm ?? b.atualizadoEm).getTime()
        );
      });
  }, [busca, contratos, statusFiltro]);

  const proximosVencimentos = useMemo(
    () =>
      contratos
        .filter((contrato) => contrato.status === 'ATIVO')
        .filter((contrato) => Boolean(contrato.fimEm))
        .sort(
          (a, b) =>
            new Date(a.fimEm ?? a.atualizadoEm).getTime() -
            new Date(b.fimEm ?? b.atualizadoEm).getTime(),
        )
        .slice(0, 4),
    [contratos],
  );

  const formularioEditando = formulario.id !== null;
  const podeSalvar =
    formulario.titulo.trim().length >= 3 &&
    formulario.inicioEm.trim().length > 0 &&
    !salvando;

  function atualizarFormulario(campo: keyof FormContrato, valor: string | boolean) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function limparFormulario() {
    setFormulario(formularioVazio);
    setErro('');
    setMensagemSucesso('');
  }

  function editarContrato(contrato: AdminContratoCondominio) {
    setFormulario({
      id: contrato.id,
      titulo: contrato.titulo,
      categoria: contrato.categoria ?? '',
      descricao: contrato.descricao ?? '',
      numeroContrato: contrato.numeroContrato ?? '',
      valorMensal: contrato.valorMensal ? String(contrato.valorMensal) : '',
      prestadorId: contrato.prestadorId ? String(contrato.prestadorId) : '',
      inicioEm: dataParaInputDate(contrato.inicioEm),
      fimEm: dataParaInputDate(contrato.fimEm),
      renovacaoAutomatica: contrato.renovacaoAutomatica,
      observacoes: contrato.observacoes ?? '',
      arquivoUrl: contrato.arquivoUrl ?? '',
    });
    setErro('');
    setMensagemSucesso('');
  }

  function montarPayload(): AdminContratoPayload {
    return {
      titulo: formulario.titulo.trim(),
      categoria: formulario.categoria.trim() || undefined,
      descricao: formulario.descricao.trim() || undefined,
      numeroContrato: formulario.numeroContrato.trim() || undefined,
      valorMensal: formulario.valorMensal.trim() || null,
      prestadorId: formulario.prestadorId ? Number(formulario.prestadorId) : null,
      inicioEm: formulario.inicioEm,
      fimEm: formulario.fimEm || null,
      renovacaoAutomatica: formulario.renovacaoAutomatica,
      observacoes: formulario.observacoes.trim() || undefined,
      arquivoUrl: formulario.arquivoUrl.trim() || undefined,
    };
  }

  async function salvarContrato(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || !podeSalvar) {
      return;
    }

    setSalvando(true);
    setErro('');
    setMensagemSucesso('');

    try {
      const payload = montarPayload();

      if (formularioEditando && formulario.id) {
        await apiRequest<AdminContratoCondominio>(
          `/condominios/${condominioId}/contratos/${formulario.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          },
        );
        setMensagemSucesso('Contrato atualizado com sucesso.');
      } else {
        await apiRequest<AdminContratoCondominio>(
          `/condominios/${condominioId}/contratos`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
        );
        setMensagemSucesso('Contrato cadastrado com sucesso.');
      }

      setFormulario(formularioVazio);
      await carregarDados();
    } catch (error) {
      const mensagem =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível salvar o contrato.';

      setErro(mensagem);
    } finally {
      setSalvando(false);
    }
  }

  async function alterarStatus(
    contrato: AdminContratoCondominio,
    status: StatusContratoCondominioAdmin,
  ) {
    if (!condominioId) {
      return;
    }

    const observacao = window.prompt(
      `Observação para alterar o status para ${statusRotulo(status)}:`,
      '',
    );

    if (observacao === null) {
      return;
    }

    const payload: AdminContratoStatusPayload = {
      status,
      observacao: observacao.trim() || undefined,
    };

    try {
      await apiRequest<AdminContratoCondominio>(
        `/condominios/${condominioId}/contratos/${contrato.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso('Status do contrato atualizado.');
      await carregarDados();
    } catch (error) {
      const mensagem =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível atualizar o status do contrato.';

      setErro(mensagem);
    }
  }

  function copiarResumo(contrato: AdminContratoCondominio) {
    const texto = [
      `Contrato: ${contrato.titulo}`,
      contrato.numeroContrato ? `Número: ${contrato.numeroContrato}` : null,
      contrato.categoria ? `Categoria: ${contrato.categoria}` : null,
      contrato.prestador ? `Prestador: ${contrato.prestador.nome}` : null,
      contrato.prestador?.empresa ? `Empresa: ${contrato.prestador.empresa}` : null,
      `Valor mensal: ${formatarMoeda(contrato.valorMensal)}`,
      `Início: ${formatarData(contrato.inicioEm)}`,
      `Vencimento: ${formatarData(contrato.fimEm)}`,
      `Status: ${rotuloStatusVisual(contrato)}`,
      contrato.renovacaoAutomatica ? 'Renovação automática: Sim' : 'Renovação automática: Não',
    ]
      .filter(Boolean)
      .join('\n');

    void navigator.clipboard?.writeText(texto);
    setMensagemSucesso('Resumo do contrato copiado.');
  }

  function abrirWhatsapp(contrato: AdminContratoCondominio) {
    const telefone = normalizarTelefone(contrato.prestador?.telefone);

    if (!telefone) {
      return;
    }

    const mensagem = encodeURIComponent(
      [
        `Olá, ${contrato.prestador?.nome}.`,
        `Sobre o contrato: ${contrato.titulo}.`,
        contrato.fimEm ? `Vencimento: ${formatarData(contrato.fimEm)}.` : null,
        'Podemos confirmar a situação/renovação?',
      ]
        .filter(Boolean)
        .join('\n'),
    );

    window.open(`https://wa.me/${telefone}?text=${mensagem}`, '_blank', 'noopener,noreferrer');
  }

  function exportarCsv() {
    const linhas = [
      [
        'ID',
        'Título',
        'Categoria',
        'Status',
        'Prestador',
        'Empresa',
        'Valor mensal',
        'Início',
        'Vencimento',
        'Renovação automática',
      ],
      ...contratosFiltrados.map((contrato) => [
        contrato.id,
        contrato.titulo,
        contrato.categoria ?? '',
        rotuloStatusVisual(contrato),
        contrato.prestador?.nome ?? '',
        contrato.prestador?.empresa ?? '',
        formatarMoeda(contrato.valorMensal),
        formatarData(contrato.inicioEm),
        formatarData(contrato.fimEm),
        contrato.renovacaoAutomatica ? 'Sim' : 'Não',
      ]),
    ];

    const csv = linhas.map((linha) => linha.map(normalizarCsv).join(';')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contratos-condominio.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function imprimirLista() {
    window.print();
  }

  const nomeCondominio =
    condominiosDisponiveis.find((condominio) => condominio.id === condominioId)?.nome ??
    'Condomínio';

  return (
    <AdminShell usuario={usuario} condominiosAdministrativos={condominiosAdministrativos}>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-orange-600">
                Contratos e vencimentos
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950">
                Contratos do condomínio
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Controle contratos recorrentes, prestadores vinculados, valores,
                vencimentos, renovação automática e alertas para gestão condominial.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={condominioId ?? ''}
                onChange={(event) => setCondominioId(Number(event.target.value) || null)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                {condominiosDisponiveis.map((condominio) => (
                  <option key={condominio.id} value={condominio.id}>
                    {condominio.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void carregarDados()}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {carregando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Atualizar
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResumoCard titulo="Ativos" valor={resumo?.ativos ?? 0} detalhe="contratos vigentes" sucesso />
            <ResumoCard titulo="Vencendo" valor={resumo?.vencendo ?? 0} detalhe="próximos 30 dias" alerta />
            <ResumoCard titulo="Vencidos" valor={resumo?.vencidos ?? 0} detalhe="exigem atenção" perigo />
            <ResumoCard titulo="Valor mensal" valor={formatarMoeda(resumo?.valorMensalAtivo ?? 0)} detalhe="contratos ativos" />
          </div>
        </section>

        {erro ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {erro}
          </div>
        ) : null}

        {mensagemSucesso ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            {mensagemSucesso}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.5fr)]">
          <form
            onSubmit={(event) => void salvarContrato(event)}
            className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-600">
                  Cadastro contratual
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-950">
                  {formularioEditando ? 'Editar contrato' : 'Novo contrato'}
                </h2>
              </div>
              {formularioEditando ? (
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                  aria-label="Limpar edição"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid min-w-0 gap-4">
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                Título
                <input
                  value={formulario.titulo}
                  onChange={(event) => atualizarFormulario('titulo', event.target.value)}
                  placeholder="Ex.: Manutenção do elevador social"
                  className="h-11 w-full min-w-0 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                  Categoria
                  <input
                    value={formulario.categoria}
                    onChange={(event) => atualizarFormulario('categoria', event.target.value)}
                    placeholder="Ex.: Elevador, limpeza, sistema"
                    list="categorias-contratos"
                    className="h-11 w-full min-w-0 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                  <datalist id="categorias-contratos">
                    {categoriasSugeridas.map((categoria) => (
                      <option key={categoria} value={categoria} />
                    ))}
                  </datalist>
                </label>

                <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                  Nº do contrato
                  <input
                    value={formulario.numeroContrato}
                    onChange={(event) => atualizarFormulario('numeroContrato', event.target.value)}
                    placeholder="Opcional"
                    className="h-11 w-full min-w-0 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>
              </div>

              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                Prestador vinculado
                <select
                  value={formulario.prestadorId}
                  onChange={(event) => atualizarFormulario('prestadorId', event.target.value)}
                  className="h-11 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Sem prestador vinculado</option>
                  {prestadores
                    .filter((prestador) => prestador.ativo)
                    .map((prestador) => (
                      <option key={prestador.id} value={prestador.id}>
                        {prestador.nome}
                        {prestador.empresa ? ` • ${prestador.empresa}` : ''}
                      </option>
                    ))}
                </select>
              </label>

              <div className="grid min-w-0 gap-4 sm:grid-cols-3">
                <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                  Valor mensal
                  <input
                    value={formulario.valorMensal}
                    onChange={(event) => atualizarFormulario('valorMensal', event.target.value)}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="h-11 w-full min-w-0 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                  Início
                  <input
                    type="date"
                    value={formulario.inicioEm}
                    onChange={(event) => atualizarFormulario('inicioEm', event.target.value)}
                    className="h-11 w-full min-w-0 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                  Vencimento
                  <input
                    type="date"
                    value={formulario.fimEm}
                    onChange={(event) => atualizarFormulario('fimEm', event.target.value)}
                    className="h-11 w-full min-w-0 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formulario.renovacaoAutomatica}
                  onChange={(event) => atualizarFormulario('renovacaoAutomatica', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
                />
                Renovação automática
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                Link/arquivo do contrato
                <input
                  value={formulario.arquivoUrl}
                  onChange={(event) => atualizarFormulario('arquivoUrl', event.target.value)}
                  placeholder="https://..."
                  className="h-11 w-full min-w-0 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                Descrição
                <textarea
                  value={formulario.descricao}
                  onChange={(event) => atualizarFormulario('descricao', event.target.value)}
                  rows={3}
                  placeholder="Escopo, condições comerciais, cláusulas relevantes e observações sobre renovação."
                  className="w-full min-w-0 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                Observações internas
                <textarea
                  value={formulario.observacoes}
                  onChange={(event) => atualizarFormulario('observacoes', event.target.value)}
                  rows={3}
                  className="w-full min-w-0 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <button
                type="submit"
                disabled={!podeSalvar}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {salvando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {formularioEditando ? 'Salvar alterações' : 'Cadastrar contrato'}
              </button>
            </div>
          </form>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-600">
                    Vencimentos próximos
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-950">
                    Agenda contratual
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportarCsv}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={imprimirLista}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </button>
                </div>
              </div>

              {proximosVencimentos.length > 0 ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {proximosVencimentos.map((contrato) => (
                    <div
                      key={contrato.id}
                      className={`rounded-3xl border p-4 ${
                        contratoVencido(contrato)
                          ? 'border-red-200 bg-red-50'
                          : contratoVencendo(contrato)
                            ? 'border-amber-200 bg-amber-50'
                            : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                            {contrato.categoria ?? 'Contrato'}
                          </p>
                          <h3 className="mt-1 text-base font-bold text-slate-950">
                            {contrato.titulo}
                          </h3>
                        </div>
                        <ContratoStatusBadge contrato={contrato} />
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        Vencimento: {formatarData(contrato.fimEm)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {contrato.prestador?.nome ?? 'Sem prestador vinculado'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                  Nenhum contrato com vencimento cadastrado para {nomeCondominio}.
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-600">
                    Contratos cadastrados
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-950">
                    Gestão de contratos
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600"
                >
                  <Plus className="h-4 w-4" />
                  Novo
                </button>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Buscar por contrato, prestador, categoria ou observação"
                    className="h-11 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <select
                  value={statusFiltro}
                  onChange={(event) => setStatusFiltro(event.target.value as FiltroStatusContrato)}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  {statusOptions.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.rotulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 space-y-3">
                {carregando ? (
                  <div className="flex items-center justify-center rounded-3xl border border-dashed border-slate-200 py-10 text-sm font-semibold text-slate-500">
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Carregando contratos...
                  </div>
                ) : contratosFiltrados.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                    Nenhum contrato encontrado com os filtros atuais.
                  </div>
                ) : (
                  contratosFiltrados.map((contrato) => (
                    <article
                      key={contrato.id}
                      className={`rounded-3xl border p-4 transition ${
                        contratoVencido(contrato)
                          ? 'border-red-200 bg-red-50/70'
                          : contratoVencendo(contrato)
                            ? 'border-amber-200 bg-amber-50/70'
                            : 'border-slate-200 bg-white hover:border-orange-200'
                      }`}
                    >
                      <div className="admin-contract-layout">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <ContratoStatusBadge contrato={contrato} />
                            {contrato.renovacaoAutomatica ? (
                              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 ring-1 ring-sky-100">
                                Renovação automática
                              </span>
                            ) : null}
                            {contratoVencido(contrato) ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Atenção
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-3 text-lg font-bold text-slate-950">
                            {contrato.titulo}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {contrato.descricao ?? 'Sem descrição cadastrada.'}
                          </p>

                          <div className="admin-contract-meta-grid mt-4 grid gap-3">
                            <InfoItem label="Categoria" valor={contrato.categoria ?? 'Não informada'} />
                            <InfoItem label="Prestador" valor={contrato.prestador?.nome ?? 'Não vinculado'} />
                            <InfoItem label="Valor mensal" valor={formatarMoeda(contrato.valorMensal)} />
                            <InfoItem label="Vencimento" valor={formatarData(contrato.fimEm)} />
                          </div>

                          {contrato.observacoes ? (
                            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                              {contrato.observacoes}
                            </div>
                          ) : null}
                        </div>

                        <div className="admin-contract-actions grid gap-2">
                          <button
                            type="button"
                            onClick={() => editarContrato(contrato)}
                            className="inline-flex h-10 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-700 transition hover:bg-orange-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => copiarResumo(contrato)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            <ClipboardCopy className="h-4 w-4" />
                            Copiar
                          </button>
                          {contrato.prestador?.telefone ? (
                            <button
                              type="button"
                              onClick={() => abrirWhatsapp(contrato)}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              <MessageCircle className="h-4 w-4" />
                              WhatsApp
                            </button>
                          ) : null}
                          {contrato.arquivoUrl ? (
                            <a
                              href={contrato.arquivoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Abrir arquivo
                            </a>
                          ) : null}
                          {contrato.status !== 'ATIVO' ? (
                            <button
                              type="button"
                              onClick={() => void alterarStatus(contrato, 'ATIVO')}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Reativar
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => void alterarStatus(contrato, 'ENCERRADO')}
                                className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                              >
                                Encerrar
                              </button>
                              <button
                                type="button"
                                onClick={() => void alterarStatus(contrato, 'CANCELADO')}
                                className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

type ResumoCardProps = {
  titulo: string;
  valor: number | string;
  detalhe: string;
  alerta?: boolean;
  perigo?: boolean;
  sucesso?: boolean;
};

function ResumoCard({ titulo, valor, detalhe, alerta, perigo, sucesso }: ResumoCardProps) {
  const classe = perigo
    ? 'border-red-100 bg-red-50 text-red-700'
    : alerta
      ? 'border-amber-100 bg-amber-50 text-amber-700'
      : sucesso
        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
        : 'border-slate-100 bg-slate-50 text-slate-700';

  return (
    <article className={`min-w-0 rounded-3xl border p-4 shadow-sm ${classe}`}>
      <p className="text-xs font-bold uppercase tracking-[0.06em] opacity-80">
        {titulo}
      </p>
      <strong className="mt-2 block truncate text-2xl font-bold tracking-tight">
        {valor}
      </strong>
      <p className="mt-1 text-xs font-semibold leading-relaxed opacity-75">
        {detalhe}
      </p>
    </article>
  );
}

type InfoItemProps = {
  label: string;
  valor: string | number | null | undefined;
};

function InfoItem({ label, valor }: InfoItemProps) {
  const valorFormatado = String(valor ?? '').trim() || '—';

  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
        {valorFormatado}
      </p>
    </div>
  );
}
