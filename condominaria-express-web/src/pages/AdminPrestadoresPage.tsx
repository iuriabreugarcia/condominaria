import {
  Ban,
  Briefcase,
  CheckCircle2,
  ClipboardCopy,
  Download,
  LoaderCircle,
  MessageCircle,
  Phone,
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
  AdminPrestador,
  AlterarStatusPrestadorAdminPayload,
  AtualizarPrestadorAdminPayload,
  CriarPrestadorAdminPayload,
} from '../types/api';

type FiltroStatus = 'TODOS' | 'ATIVOS' | 'INATIVOS';

type FormPrestador = {
  id: number | null;
  nome: string;
  empresa: string;
  tipoServico: string;
  tipoDocumento: string;
  documento: string;
  telefone: string;
  observacoes: string;
};

const formularioVazio: FormPrestador = {
  id: null,
  nome: '',
  empresa: '',
  tipoServico: '',
  tipoDocumento: '',
  documento: '',
  telefone: '',
  observacoes: '',
};

const tiposDocumento = [
  { valor: '', rotulo: 'Não informado' },
  { valor: 'CPF', rotulo: 'CPF' },
  { valor: 'RG', rotulo: 'RG' },
  { valor: 'CNH', rotulo: 'CNH' },
  { valor: 'PASSAPORTE', rotulo: 'Passaporte' },
  { valor: 'OUTRO', rotulo: 'Outro' },
];

function normalizarCsv(valor: unknown) {
  return `"${String(valor ?? '').replace(/"/g, '""')}"`;
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

function textoBuscaPrestador(prestador: AdminPrestador) {
  return [
    prestador.nome,
    prestador.empresa,
    prestador.tipoServico,
    prestador.documento,
    prestador.telefone,
    prestador.observacoes,
    prestador.ativo ? 'ativo' : 'inativo',
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pt-BR');
}


function PrestadorStatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em]',
        ativo
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
          : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
      ].join(' ')}
    >
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  );
}

function ResumoPrestadorCard({
  titulo,
  valor,
  detalhe,
  variante = 'slate',
}: {
  titulo: string;
  valor: number;
  detalhe: string;
  variante?: 'slate' | 'emerald' | 'amber' | 'sky';
}) {
  const variantes = {
    slate: 'border-slate-200 bg-slate-50 text-slate-950',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-100 bg-amber-50 text-amber-800',
    sky: 'border-sky-100 bg-sky-50 text-sky-800',
  };

  const subtitulos = {
    slate: 'text-slate-500',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    sky: 'text-sky-700',
  };

  return (
    <div className={`rounded-2xl border p-4 ${variantes[variante]}`}>
      <p className={`text-xs font-bold uppercase tracking-[0.08em] ${subtitulos[variante]}`}>
        {titulo}
      </p>
      <p className="mt-1 text-2xl font-bold">{valor}</p>
      <p className="mt-1 text-xs font-semibold opacity-80">{detalhe}</p>
    </div>
  );
}

// data-admin-prestadores-responsive-fix="true"
export function AdminPrestadoresPage() {
  usePageTitle('Prestadores e fornecedores');

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
  const [prestadores, setPrestadores] = useState<AdminPrestador[]>([]);
  const [formulario, setFormulario] = useState<FormPrestador>(formularioVazio);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<FiltroStatus>('TODOS');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  useEffect(() => {
    if (!condominioId && condominiosDisponiveis.length > 0) {
      setCondominioId(condominiosDisponiveis[0].id);
    }
  }, [condominioId, condominiosDisponiveis]);

  async function carregarPrestadores() {
    if (!condominioId) {
      setPrestadores([]);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro('');

    try {
      const dados = await apiRequest<AdminPrestador[]>(
        `/condominios/${condominioId}/prestadores`,
      );

      setPrestadores(dados);
    } catch (error) {
      const mensagem =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível carregar prestadores.';

      setErro(mensagem);
      setPrestadores([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarPrestadores();
    setFormulario(formularioVazio);
  }, [condominioId]);

  const prestadoresFiltrados = useMemo(() => {
    const buscaNormalizada = busca.trim().toLocaleLowerCase('pt-BR');

    return prestadores
      .filter((prestador) => {
        if (status === 'ATIVOS') {
          return prestador.ativo;
        }

        if (status === 'INATIVOS') {
          return !prestador.ativo;
        }

        return true;
      })
      .filter((prestador) => {
        if (!buscaNormalizada) {
          return true;
        }

        return textoBuscaPrestador(prestador).includes(buscaNormalizada);
      });
  }, [busca, prestadores, status]);

  const resumo = useMemo(
    () => ({
      total: prestadores.length,
      ativos: prestadores.filter((prestador) => prestador.ativo).length,
      inativos: prestadores.filter((prestador) => !prestador.ativo).length,
      comTelefone: prestadores.filter((prestador) => Boolean(prestador.telefone))
        .length,
    }),
    [prestadores],
  );

  const formularioEditando = formulario.id !== null;
  const podeSalvar = formulario.nome.trim().length >= 3 && !salvando;

  function atualizarFormulario(campo: keyof FormPrestador, valor: string) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function editarPrestador(prestador: AdminPrestador) {
    setFormulario({
      id: prestador.id,
      nome: prestador.nome,
      empresa: prestador.empresa ?? '',
      tipoServico: prestador.tipoServico ?? '',
      tipoDocumento: prestador.tipoDocumento ?? '',
      documento: prestador.documento ?? '',
      telefone: prestador.telefone ?? '',
      observacoes: prestador.observacoes ?? '',
    });
    setMensagemSucesso('');
    setErro('');
  }

  function limparFormulario() {
    setFormulario(formularioVazio);
    setMensagemSucesso('');
    setErro('');
  }

  function montarPayload(): CriarPrestadorAdminPayload {
    return {
      nome: formulario.nome.trim(),
      empresa: formulario.empresa.trim() || undefined,
      tipoServico: formulario.tipoServico.trim() || undefined,
      tipoDocumento: formulario.tipoDocumento || undefined,
      documento: formulario.documento.trim() || undefined,
      telefone: formulario.telefone.trim() || undefined,
      observacoes: formulario.observacoes.trim() || undefined,
    };
  }

  async function salvarPrestador(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || !podeSalvar) {
      return;
    }

    setSalvando(true);
    setErro('');
    setMensagemSucesso('');

    try {
      if (formularioEditando && formulario.id) {
        const payload: AtualizarPrestadorAdminPayload = montarPayload();
        await apiRequest<AdminPrestador>(
          `/condominios/${condominioId}/prestadores/${formulario.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          },
        );
        setMensagemSucesso('Prestador atualizado com sucesso.');
      } else {
        await apiRequest<AdminPrestador>(
          `/condominios/${condominioId}/prestadores`,
          {
            method: 'POST',
            body: JSON.stringify(montarPayload()),
          },
        );
        setMensagemSucesso('Prestador cadastrado com sucesso.');
      }

      setFormulario(formularioVazio);
      await carregarPrestadores();
    } catch (error) {
      const mensagem =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível salvar o prestador.';

      setErro(mensagem);
    } finally {
      setSalvando(false);
    }
  }

  async function alterarStatus(prestador: AdminPrestador) {
    if (!condominioId) {
      return;
    }

    const payload: AlterarStatusPrestadorAdminPayload = {
      ativo: !prestador.ativo,
    };

    const acao = payload.ativo ? 'ativar' : 'inativar';
    const confirmar = window.confirm(
      `Confirmar ${acao} o prestador "${prestador.nome}"?`,
    );

    if (!confirmar) {
      return;
    }

    setErro('');
    setMensagemSucesso('');

    try {
      await apiRequest<AdminPrestador>(
        `/condominios/${condominioId}/prestadores/${prestador.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso(
        payload.ativo
          ? 'Prestador ativado com sucesso.'
          : 'Prestador inativado com sucesso.',
      );
      await carregarPrestadores();
    } catch (error) {
      const mensagem =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível alterar o status do prestador.';

      setErro(mensagem);
    }
  }

  async function copiarContato(prestador: AdminPrestador) {
    const contato = [
      `Prestador: ${prestador.nome}`,
      prestador.empresa ? `Empresa: ${prestador.empresa}` : null,
      prestador.tipoServico ? `Serviço: ${prestador.tipoServico}` : null,
      prestador.documento ? `Documento: ${prestador.documento}` : null,
      prestador.telefone ? `Telefone: ${prestador.telefone}` : null,
      prestador.observacoes ? `Observações: ${prestador.observacoes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(contato);
      setMensagemSucesso('Contato copiado.');
    } catch {
      setErro('Não foi possível copiar o contato.');
    }
  }

  function abrirWhatsapp(prestador: AdminPrestador) {
    const telefone = normalizarTelefone(prestador.telefone);

    if (!telefone) {
      setErro('Este prestador não possui telefone cadastrado.');
      return;
    }

    const mensagem = encodeURIComponent(
      `Olá, ${prestador.nome}! Aqui é da administração do condomínio.`,
    );

    window.open(`https://wa.me/${telefone}?text=${mensagem}`, '_blank', 'noopener,noreferrer');
  }

  function exportarCsv() {
    const linhas = [
      ['Nome', 'Empresa', 'Serviço', 'Documento', 'Telefone', 'Status', 'Observações'],
      ...prestadoresFiltrados.map((prestador) => [
        prestador.nome,
        prestador.empresa ?? '',
        prestador.tipoServico ?? '',
        prestador.documento ?? '',
        prestador.telefone ?? '',
        prestador.ativo ? 'Ativo' : 'Inativo',
        prestador.observacoes ?? '',
      ]),
    ];

    const csv = linhas
      .map((linha) => linha.map((celula) => normalizarCsv(celula)).join(';'))
      .join('\n');

    const blob = new Blob([`\ufeff${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prestadores-condominio.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function imprimirLista() {
    const conteudo = prestadoresFiltrados
      .map(
        (prestador) => `
          <tr>
            <td>${prestador.nome}</td>
            <td>${prestador.empresa ?? '—'}</td>
            <td>${prestador.tipoServico ?? '—'}</td>
            <td>${prestador.telefone ?? '—'}</td>
            <td>${prestador.ativo ? 'Ativo' : 'Inativo'}</td>
          </tr>`,
      )
      .join('');

    const janela = window.open('', '_blank', 'width=960,height=720');

    if (!janela) {
      return;
    }

    janela.document.write(`
      <html>
        <head>
          <title>Prestadores do condomínio</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            p { color: #475569; margin-top: 0; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 9px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Prestadores e fornecedores</h1>
          <p>Gerado em ${formatarDataHora(new Date().toISOString())}</p>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Empresa</th>
                <th>Serviço</th>
                <th>Telefone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${conteudo}</tbody>
          </table>
        </body>
      </html>
    `);
    janela.document.close();
    janela.focus();
    janela.print();
  }

  return (
    <AdminShell usuario={usuario} condominiosAdministrativos={condominiosAdministrativos}>
      <div className="space-y-6">
        <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.06em] text-orange-700">
                Prestadores e fornecedores
              </span>
              <h1 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">
                Contatos de serviço do condomínio
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Cadastre empresas e profissionais de manutenção, limpeza,
                segurança, fornecedores recorrentes e contatos úteis da operação.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[340px]">
              <ResumoPrestadorCard
                titulo="Cadastrados"
                valor={resumo.total}
                detalhe="contatos cadastrados"
              />
              <ResumoPrestadorCard
                titulo="Ativos"
                valor={resumo.ativos}
                detalhe="aptos para acionamento"
                variante="emerald"
              />
              <ResumoPrestadorCard
                titulo="Inativos"
                valor={resumo.inativos}
                detalhe="fora da operação"
                variante="amber"
              />
              <ResumoPrestadorCard
                titulo="Com telefone"
                valor={resumo.comTelefone}
                detalhe="com WhatsApp ou contato"
                variante="sky"
              />
            </div>
          </div>
        </section>

        <section className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.55fr)]">
          <form
            onSubmit={salvarPrestador}
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {formularioEditando ? 'Editar prestador' : 'Novo prestador'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Mantenha os contatos operacionais sempre atualizados.
                </p>
              </div>

              {formularioEditando ? (
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-orange-200 hover:text-orange-600"
                  aria-label="Cancelar edição"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid min-w-0 gap-4">
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                Nome do contato/profissional
                <input
                  value={formulario.nome}
                  onChange={(event) => atualizarFormulario('nome', event.target.value)}
                  className="h-11 w-full min-w-0 max-w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Ex.: Técnico do elevador"
                />
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                Empresa / razão social
                <input
                  value={formulario.empresa}
                  onChange={(event) => atualizarFormulario('empresa', event.target.value)}
                  className="h-11 w-full min-w-0 max-w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Ex.: Manutenção Alfa"
                />
              </label>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                  Tipo de serviço
                  <input
                    value={formulario.tipoServico}
                    onChange={(event) => atualizarFormulario('tipoServico', event.target.value)}
                    className="h-11 w-full min-w-0 max-w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="Limpeza, elevador, segurança..."
                  />
                </label>

                <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                  Telefone / WhatsApp
                  <input
                    value={formulario.telefone}
                    onChange={(event) => atualizarFormulario('telefone', event.target.value)}
                    className="h-11 w-full min-w-0 max-w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="(00) 00000-0000"
                  />
                </label>
              </div>

              <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)]">
                <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                  Documento
                  <select
                    value={formulario.tipoDocumento}
                    onChange={(event) => atualizarFormulario('tipoDocumento', event.target.value)}
                    className="h-11 w-full min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    {tiposDocumento.map((tipo) => (
                      <option key={tipo.valor || 'vazio'} value={tipo.valor}>
                        {tipo.rotulo}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                  Número do documento
                  <input
                    value={formulario.documento}
                    onChange={(event) => atualizarFormulario('documento', event.target.value)}
                    className="h-11 w-full min-w-0 max-w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="CPF, CNPJ, RG ou identificação interna"
                  />
                </label>
              </div>

              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                Observações
                <textarea
                  value={formulario.observacoes}
                  onChange={(event) => atualizarFormulario('observacoes', event.target.value)}
                  rows={4}
                  className="w-full min-w-0 max-w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Contrato, horário de atendimento, responsável, cobertura, SLA..."
                />
              </label>
            </div>

            {erro ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {erro}
              </div>
            ) : null}

            {mensagemSucesso ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {mensagemSucesso}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!podeSalvar}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {salvando ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : formularioEditando ? (
                <Save className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {formularioEditando ? 'Salvar alterações' : 'Cadastrar prestador'}
            </button>
          </form>

          <section className="admin-prestadores-lista rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Prestadores cadastrados
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {prestadoresFiltrados.length} de {prestadores.length} registro(s) exibido(s).
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={exportarCsv}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={imprimirLista}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Buscar por nome, empresa, serviço, telefone..."
                />
              </label>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as FiltroStatus)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="TODOS">Todos</option>
                <option value="ATIVOS">Ativos</option>
                <option value="INATIVOS">Inativos</option>
              </select>

              <select
                value={condominioId ?? ''}
                onChange={(event) => setCondominioId(Number(event.target.value))}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                {condominiosDisponiveis.map((condominio) => (
                  <option key={condominio.id} value={condominio.id}>
                    {condominio.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 space-y-3">
              {carregando ? (
                <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 px-4 py-10 text-sm font-semibold text-slate-600">
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Carregando prestadores...
                </div>
              ) : prestadoresFiltrados.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                  <Briefcase className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-sm font-bold text-slate-700">
                    Nenhum prestador encontrado.
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Cadastre contatos recorrentes ou ajuste os filtros de busca.
                  </p>
                </div>
              ) : (
                prestadoresFiltrados.map((prestador) => (
                  <article
                    key={prestador.id}
                    className="admin-prestadores-lista-card grid min-w-0 w-full gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md lg:grid-cols-[minmax(0,1fr)_220px]"
                  >
                    <div className="admin-prestadores-lista-card__inner contents">
                      <div className="admin-prestadores-lista-card__conteudo min-w-0 w-full">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-950">
                            {prestador.nome}
                          </h3>
                          <PrestadorStatusBadge ativo={prestador.ativo} />
                        </div>

                        <p className="mt-1 text-sm text-slate-600">
                          {prestador.empresa ?? 'Sem empresa informada'}
                          {prestador.tipoServico ? ` • ${prestador.tipoServico}` : ''}
                        </p>

                        <div className="admin-prestadores-lista-card__meta mt-3 grid min-w-0 w-full gap-2 text-sm text-slate-600 sm:grid-cols-2">
                          <span className="inline-flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400" />
                            {prestador.telefone ?? 'Telefone não informado'}
                          </span>
                          <span>
                            Documento: {prestador.documento ?? '—'}
                          </span>
                        </div>

                        {prestador.observacoes ? (
                          <p className="admin-prestadores-lista-card__observacao mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                            {prestador.observacoes}
                          </p>
                        ) : null}
                      </div>

                      <div className="admin-prestadores-lista-card__acoes grid min-w-0 w-full gap-2 sm:grid-cols-2 lg:grid-cols-1">
                        <button
                          type="button"
                          onClick={() => editarPrestador(prestador)}
                          className="inline-flex h-10 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-700 transition hover:bg-orange-100"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void copiarContato(prestador)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                        >
                          <ClipboardCopy className="h-4 w-4" />
                          Copiar contato
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirWhatsapp(prestador)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => void alterarStatus(prestador)}
                          className={[
                            'inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition',
                            prestador.ativo
                              ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                          ].join(' ')}
                        >
                          {prestador.ativo ? (
                            <Ban className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          {prestador.ativo ? 'Inativar' : 'Ativar'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </AdminShell>
  );
}
