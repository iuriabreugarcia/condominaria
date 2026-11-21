import {
  BarChart3,
  Download,
  Filter,
  LoaderCircle,
  Printer,
  Search,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useAdminRouteContext } from '../components/AdminProtectedRoute';
import { AdminShell } from '../components/AdminShell';
import { usePageTitle } from '../hooks/usePageTitle';
import { ApiError, apiRequest } from '../lib/api';
import type {
  AdminRelatorioLinha,
  AdminRelatorioModulo,
  AdminRelatoriosGeralResponse,
} from '../types/api';

const modulosRelatorio: Array<{
  valor: AdminRelatorioModulo | 'TODOS';
  rotulo: string;
}> = [
  { valor: 'TODOS', rotulo: 'Todos os módulos' },
  { valor: 'FINANCEIRO', rotulo: 'Financeiro' },
  { valor: 'ESTRUTURA', rotulo: 'Moradores/unidades' },
  { valor: 'PORTARIA', rotulo: 'Portaria' },
  { valor: 'RESERVAS', rotulo: 'Reservas' },
  { valor: 'OCORRENCIAS', rotulo: 'Ocorrências' },
  { valor: 'COMUNICACAO', rotulo: 'Comunicação' },
  { valor: 'GOVERNANCA', rotulo: 'Governança' },
];

function dataLocalInput(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function formatarData(valor: string | null | undefined) {
  if (!valor) {
    return '—';
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('pt-BR').format(data);
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}


function formatarPercentualBR(valor: string | number | null | undefined) {
  const numero = Number(valor ?? 0);

  if (!Number.isFinite(numero)) {
    return '0%';
  }

  const normalizado = Math.max(0, Math.min(100, numero));

  return `${normalizado.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(normalizado) ? 0 : 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatarValor(linha: Pick<AdminRelatorioLinha, 'tipo' | 'valor'>) {
  if (linha.tipo === 'moeda') {
    return formatarMoeda(Number(linha.valor || 0));
  }

  if (linha.tipo === 'percentual') {
    return formatarPercentualBR(Number(linha.valor || 0));
  }

  return Number(linha.valor || 0).toLocaleString('pt-BR');
}

function normalizarCsv(valor: unknown) {
  return `"${String(valor ?? '').replace(/"/g, '""')}"`;
}

function mensagemErroRelatorios(error: unknown) {
  const mensagem =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Não foi possível carregar os relatórios.';

  const normalizada = mensagem.trim().toLowerCase();

  if (
    normalizada.includes('internal server error') ||
    normalizada.includes('prismaclient') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('cannot read')
  ) {
    return 'Não foi possível carregar os relatórios agora. Verifique a estrutura do sistema ou tente novamente em instantes.';
  }

  return mensagem;
}

function classeModulo(modulo: AdminRelatorioModulo | string) {
  const classes: Record<string, string> = {
    FINANCEIRO: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    ESTRUTURA: 'bg-sky-50 text-sky-700 ring-sky-100',
    PORTARIA: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    RESERVAS: 'bg-violet-50 text-violet-700 ring-violet-100',
    OCORRENCIAS: 'bg-rose-50 text-rose-700 ring-rose-100',
    COMUNICACAO: 'bg-orange-50 text-orange-700 ring-orange-100',
    GOVERNANCA: 'bg-slate-100 text-slate-700 ring-slate-200',
  };

  return classes[modulo] ?? 'bg-slate-100 text-slate-700 ring-slate-200';
}

function classeTipoValor(tipo: AdminRelatorioLinha['tipo']) {
  if (tipo === 'moeda') {
    return 'text-emerald-700';
  }

  if (tipo === 'percentual') {
    return 'text-orange-700';
  }

  return 'text-slate-950';
}

function ModuloBadge({
  modulo,
  rotulo,
}: {
  modulo: AdminRelatorioModulo | string;
  rotulo: string;
}) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1',
        classeModulo(modulo),
      ].join(' ')}
    >
      {rotulo}
    </span>
  );
}

function ResumoRelatorioCard({
  titulo,
  valor,
  detalhe,
  destaque = 'neutro',
  carregando = false,
}: {
  titulo: string;
  valor: ReactNode;
  detalhe: string;
  destaque?: 'neutro' | 'sucesso' | 'alerta' | 'perigo';
  carregando?: boolean;
}) {
  const estilos: Record<
    NonNullable<Parameters<typeof ResumoRelatorioCard>[0]['destaque']>,
    string
  > = {
    neutro: 'border-slate-200 bg-white text-slate-950',
    sucesso: 'border-emerald-100 bg-emerald-50 text-emerald-950',
    alerta: 'border-orange-100 bg-orange-50 text-orange-950',
    perigo: 'border-rose-100 bg-rose-50 text-rose-950',
  };

  return (
    <article
      className={[
        'rounded-3xl border p-5 shadow-sm',
        estilos[destaque],
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-70">
            {titulo}
          </p>
          <p className="mt-3 whitespace-nowrap text-2xl font-bold tracking-tight sm:text-2xl 2xl:text-3xl">
            {carregando ? (
              <LoaderCircle className="h-7 w-7 animate-spin text-orange-500" />
            ) : (
              valor
            )}
          </p>
          <p className="mt-2 text-sm font-semibold leading-relaxed opacity-70">
            {detalhe}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-orange-600 shadow-sm">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

export function AdminRelatoriosPage() {
  usePageTitle('Relatórios');

  const {
    usuario,
    condominiosAdministrativos,
  } = useAdminRouteContext();

  const hoje = useMemo(() => new Date(), []);
  const inicioPadrao = useMemo(() => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return dataLocalInput(data);
  }, [hoje]);
  const fimPadrao = useMemo(() => dataLocalInput(hoje), [hoje]);

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
  const [inicio, setInicio] = useState(inicioPadrao);
  const [fim, setFim] = useState(fimPadrao);
  const [modulo, setModulo] = useState<AdminRelatorioModulo | 'TODOS'>('TODOS');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [relatorio, setRelatorio] = useState<AdminRelatoriosGeralResponse | null>(null);

  useEffect(() => {
    if (!condominioId && condominiosDisponiveis.length > 0) {
      setCondominioId(condominiosDisponiveis[0].id);
    }
  }, [condominioId, condominiosDisponiveis]);

  useEffect(() => {
    let ativo = true;

    async function carregarRelatorio() {
      if (!condominioId) {
        setRelatorio(null);
        setCarregando(false);
        return;
      }

      setCarregando(true);
      setErro('');

      const parametros = new URLSearchParams();
      parametros.set('inicio', inicio);
      parametros.set('fim', fim);

      try {
        const dados = await apiRequest<AdminRelatoriosGeralResponse>(
          `/condominios/${condominioId}/relatorios/geral?${parametros.toString()}`,
        );

        if (ativo) {
          setRelatorio(dados);
        }
      } catch (error) {
        if (ativo) {
          setErro(mensagemErroRelatorios(error));
          setRelatorio(null);
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregarRelatorio();

    return () => {
      ativo = false;
    };
  }, [condominioId, fim, inicio]);

  const linhasFiltradas = useMemo(() => {
    const buscaNormalizada = busca.trim().toLocaleLowerCase('pt-BR');

    return (relatorio?.linhas ?? [])
      .filter((linha) => modulo === 'TODOS' || linha.modulo === modulo)
      .filter((linha) => {
        if (!buscaNormalizada) {
          return true;
        }

        return [
          linha.moduloRotulo,
          linha.indicador,
          linha.observacao,
          formatarValor(linha),
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(buscaNormalizada);
      });
  }, [busca, modulo, relatorio]);

  const secoesFiltradas = useMemo(() => {
    const idsIndicadoresVisiveis = new Set(
      linhasFiltradas.map((linha) => `${linha.modulo}-${linha.indicador}`),
    );

    return (relatorio?.secoes ?? [])
      .filter((secao) => modulo === 'TODOS' || secao.modulo === modulo)
      .map((secao) => ({
        ...secao,
        indicadores: secao.indicadores.filter((indicador) =>
          idsIndicadoresVisiveis.has(`${secao.modulo}-${indicador.rotulo}`),
        ),
      }))
      .filter((secao) => secao.indicadores.length > 0);
  }, [linhasFiltradas, modulo, relatorio]);

  const periodoRotulo = `${formatarData(relatorio?.periodo.inicio ?? inicio)} a ${formatarData(
    relatorio?.periodo.fim ?? fim,
  )}`;

  function limparFiltros() {
    setInicio(inicioPadrao);
    setFim(fimPadrao);
    setModulo('TODOS');
    setBusca('');
  }

  function exportarCsv() {
    const linhasCsv = [
      ['Módulo', 'Indicador', 'Valor', 'Tipo', 'Observação'],
      ...linhasFiltradas.map((linha) => [
        linha.moduloRotulo,
        linha.indicador,
        formatarValor(linha),
        linha.tipo,
        linha.observacao ?? '',
      ]),
    ];

    const csv = linhasCsv
      .map((linha) => linha.map(normalizarCsv).join(';'))
      .join('\n');

    const arquivo = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(arquivo);
    const link = document.createElement('a');

    link.href = url;
    link.download = `relatorios-condominio-${inicio}-${fim}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function imprimirRelatorio() {
    const htmlLinhas = linhasFiltradas
      .map(
        (linha) => `
          <tr>
            <td>${linha.moduloRotulo}</td>
            <td>${linha.indicador}</td>
            <td>${formatarValor(linha)}</td>
            <td>${linha.observacao ?? ''}</td>
          </tr>
        `,
      )
      .join('');

    const janela = window.open('', '_blank', 'width=1100,height=720');

    if (!janela) {
      setErro('Não foi possível abrir a janela de impressão.');
      return;
    }

    janela.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Relatórios executivos</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 32px; font-family: Arial, sans-serif; color: #0f172a; }
            header { border-bottom: 2px solid #fb923c; margin-bottom: 24px; padding-bottom: 16px; }
            .marca { color: #f97316; font-size: 11px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
            h1 { margin: 8px 0 0; font-size: 28px; }
            p { color: #475569; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border-bottom: 1px solid #e2e8f0; font-size: 13px; padding: 10px; text-align: left; vertical-align: top; }
            th { background: #fff7ed; color: #9a3412; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
            @media print { body { padding: 18px; } }
          </style>
        </head>
        <body>
          <header>
            <div class="marca">Condominaria Express</div>
            <h1>Relatórios executivos</h1>
            <p>${relatorio?.condominio.nome ?? ''} • ${periodoRotulo}</p>
          </header>
          <table>
            <thead>
              <tr>
                <th>Módulo</th>
                <th>Indicador</th>
                <th>Valor</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>${htmlLinhas}</tbody>
          </table>
        </body>
      </html>
    `);

    janela.document.close();
    janela.focus();

    window.setTimeout(() => {
      janela.print();
    }, 300);
  }

  return (
    <AdminShell
      usuario={usuario}
      condominiosAdministrativos={condominiosAdministrativos}
    >
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
              Relatórios
            </p>

            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Relatórios executivos do condomínio
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
              Consolide financeiro, estrutura, portaria, reservas, ocorrências,
              comunicação e governança em uma visão única para impressão,
              exportação e tomada de decisão.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {relatorio?.condominio.nome ?? 'Condomínio'}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {periodoRotulo}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {linhasFiltradas.length} indicador(es)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportarCsv}
              disabled={linhasFiltradas.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 text-sm font-bold text-orange-800 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>

            <button
              type="button"
              onClick={imprimirRelatorio}
              disabled={linhasFiltradas.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_160px_220px_auto]">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Condomínio
            </span>
            <select
              value={condominioId ?? ''}
              onChange={(event) => setCondominioId(Number(event.target.value))}
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              {condominiosDisponiveis.map((condominio) => (
                <option key={condominio.id} value={condominio.id}>
                  {condominio.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Início
            </span>
            <input
              type="date"
              value={inicio}
              onChange={(event) => setInicio(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Fim
            </span>
            <input
              type="date"
              value={fim}
              onChange={(event) => setFim(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Módulo
            </span>
            <select
              value={modulo}
              onChange={(event) =>
                setModulo(event.target.value as AdminRelatorioModulo | 'TODOS')
              }
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              {modulosRelatorio.map((item) => (
                <option key={item.valor} value={item.valor}>
                  {item.rotulo}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={limparFiltros}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700 xl:mt-6"
          >
            <X className="h-4 w-4" />
            Limpar
          </button>
        </div>
      </section>

      {erro ? (
        <div className="mt-5 rounded-3xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {erro}
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResumoRelatorioCard
          titulo="Indicadores"
          valor={relatorio?.resumo.indicadores ?? 0}
          detalhe="total filtrado para análise"
          carregando={carregando}
        />

        <ResumoRelatorioCard
          titulo="Saldo realizado"
          valor={formatarMoeda(relatorio?.resumo.saldoRealizado ?? 0)}
          detalhe="resultado financeiro consolidado"
          destaque="sucesso"
          carregando={carregando}
        />

        <ResumoRelatorioCard
          titulo="Inadimplência"
          valor={formatarMoeda(relatorio?.resumo.inadimplenciaValor ?? 0)}
          detalhe="valor pendente no período"
          destaque="perigo"
          carregando={carregando}
        />

        <ResumoRelatorioCard
          titulo="Alertas"
          valor={relatorio?.resumo.alertas ?? 0}
          detalhe="pontos que exigem atenção"
          destaque="alerta"
          carregando={carregando}
        />
      </section>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-600">
              Indicadores por módulo
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">
              {linhasFiltradas.length} indicador(es) no período
            </h3>
          </div>

          <label className="relative block w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar indicador, módulo ou valor"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>
        </div>

        {carregando ? (
          <div className="mt-6 flex items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm font-semibold text-slate-600">
            <LoaderCircle className="mr-2 h-5 w-5 animate-spin text-orange-500" />
            Carregando relatórios...
          </div>
        ) : secoesFiltradas.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <Filter className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              Nenhum indicador encontrado para os filtros atuais.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {secoesFiltradas.map((secao) => (
              <article
                key={secao.modulo}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                    <BarChart3 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <ModuloBadge modulo={secao.modulo} rotulo={secao.rotulo} />

                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                      {secao.descricao}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {secao.indicadores.map((indicador) => (
                    <div
                      key={indicador.chave}
                      className={[
                        'rounded-2xl border bg-white p-4',
                        indicador.destaque
                          ? 'border-orange-100 shadow-sm'
                          : 'border-slate-200',
                      ].join(' ')}
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
                        {indicador.rotulo}
                      </p>
                      <p className="mt-2 text-xl font-bold text-slate-950">
                        {formatarValor({
                          tipo: indicador.tipo,
                          valor: indicador.valor,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-600">
              Base analítica
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">
              Tabela consolidada
            </h3>
          </div>
          <p className="text-sm font-semibold text-slate-500">
            {linhasFiltradas.length} linha(s) exportáveis
          </p>
        </div>

        <p className="mb-3 text-xs text-slate-500 sm:hidden">Deslize a tabela para ver todas as colunas.</p>
        <div className="admin-report-scroll overflow-x-auto" role="region" aria-label="Tabela consolidada — role horizontalmente para ver todas as colunas" tabIndex={0}>
          <table className="admin-report-table min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
                <th className="px-3 py-3">Módulo</th>
                <th className="px-3 py-3">Indicador</th>
                <th className="px-3 py-3">Valor</th>
                <th className="px-3 py-3">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhasFiltradas.map((linha) => (
                <tr key={`${linha.modulo}-${linha.indicador}`} className="align-top">
                  <td className="px-3 py-3">
                    <ModuloBadge modulo={linha.modulo} rotulo={linha.moduloRotulo} />
                  </td>
                  <td className="px-3 py-3 font-semibold text-slate-700">
                    {linha.indicador}
                  </td>
                  <td
                    className={[
                      'px-3 py-3 font-bold',
                      classeTipoValor(linha.tipo),
                    ].join(' ')}
                  >
                    {formatarValor(linha)}
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {linha.observacao ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
