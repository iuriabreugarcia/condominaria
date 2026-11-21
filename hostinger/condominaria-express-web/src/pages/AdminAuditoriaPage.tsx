import {
  CalendarDays,
  Download,
  Filter,
  LoaderCircle,
  Printer,
  Search,
  ShieldAlert,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAdminRouteContext } from '../components/AdminProtectedRoute';
import { AdminShell } from '../components/AdminShell';
import { usePageTitle } from '../hooks/usePageTitle';
import { apiRequest, ApiError } from '../lib/api';
import type {
  AdminAuditoriaGeralResponse,
  AdminAuditoriaItem,
  AdminAuditoriaModulo,
  AdminAuditoriaNivel,
} from '../types/api';

const modulosAuditoria: Array<{
  valor: AdminAuditoriaModulo | 'TODOS';
  rotulo: string;
}> = [
  { valor: 'TODOS', rotulo: 'Todos os módulos' },
  { valor: 'USUARIOS', rotulo: 'Usuários' },
  { valor: 'FINANCEIRO', rotulo: 'Financeiro' },
  { valor: 'COMUNICACAO', rotulo: 'Comunicação' },
  { valor: 'OCORRENCIAS', rotulo: 'Ocorrências' },
  { valor: 'RESERVAS', rotulo: 'Reservas' },
  { valor: 'PORTARIA', rotulo: 'Portaria' },
  { valor: 'ENCOMENDAS', rotulo: 'Encomendas' },
  { valor: 'GOVERNANCA', rotulo: 'Governança' },
];

const niveisAuditoria: Array<{
  valor: AdminAuditoriaNivel | 'TODOS';
  rotulo: string;
}> = [
  { valor: 'TODOS', rotulo: 'Todos os níveis' },
  { valor: 'INFO', rotulo: 'Informativo' },
  { valor: 'SUCESSO', rotulo: 'Sucesso' },
  { valor: 'ATENCAO', rotulo: 'Atenção' },
  { valor: 'CRITICO', rotulo: 'Crítico' },
];

function dataLocalInput(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function formatarDataHora(valor: string | null | undefined) {
  if (!valor) {
    return '—';
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
}

function rotuloNivel(nivel: AdminAuditoriaNivel) {
  const mapa: Record<AdminAuditoriaNivel, string> = {
    INFO: 'Informativo',
    SUCESSO: 'Sucesso',
    ATENCAO: 'Atenção',
    CRITICO: 'Crítico',
  };

  return mapa[nivel] ?? nivel;
}

function classeNivel(nivel: AdminAuditoriaNivel) {
  const mapa: Record<AdminAuditoriaNivel, string> = {
    INFO: 'border-slate-200 bg-slate-50 text-slate-700',
    SUCESSO: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    ATENCAO: 'border-amber-200 bg-amber-50 text-amber-700',
    CRITICO: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  return mapa[nivel] ?? mapa.INFO;
}

function moduloClasse(modulo: string | null | undefined) {
  const normalizado = String(modulo ?? '').trim().toUpperCase();

  if (normalizado.includes('FINANCEIRO')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalizado.includes('PORTARIA') || normalizado.includes('ENCOMENDAS')) {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (normalizado.includes('OCORRENCIAS')) {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (normalizado.includes('RESERVAS')) {
    return 'border-violet-200 bg-violet-50 text-violet-700';
  }

  if (normalizado.includes('GOVERNANCA')) {
    return 'border-orange-200 bg-orange-50 text-orange-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function normalizarCsv(valor: unknown) {
  return `"${String(valor ?? '').replace(/"/g, '""')}"`;
}

function friendlyErrorMessage(
  error: unknown,
  fallback = 'Não foi possível carregar a auditoria geral.',
) {
  const mensagem =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : fallback;

  const limpa = mensagem.trim();
  const normalizada = limpa.toLowerCase();

  if (!limpa) {
    return fallback;
  }

  if (
    normalizada.includes('internal server error') ||
    normalizada.includes('prismaclientknownrequesterror') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('p2022') ||
    normalizada.includes('cannot read properties')
  ) {
    return 'Não foi possível carregar a auditoria agora. Verifique a estrutura técnica do módulo ou tente novamente em instantes.';
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
    return 'Você não tem permissão para acessar a auditoria deste condomínio.';
  }

  return limpa;
}

function ResumoAuditoriaCard({
  titulo,
  valor,
  descricao,
  variante = 'slate',
}: {
  titulo: string;
  valor: number | string;
  descricao: string;
  variante?: 'slate' | 'orange' | 'emerald' | 'rose';
}) {
  const classes: Record<typeof variante, string> = {
    slate: 'border-slate-200 bg-slate-50 text-slate-950',
    orange: 'border-orange-100 bg-orange-50 text-orange-950',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-950',
    rose: 'border-rose-100 bg-rose-50 text-rose-950',
  };

  const labelClasses: Record<typeof variante, string> = {
    slate: 'text-slate-500',
    orange: 'text-orange-700',
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
  };

  return (
    <article className={`rounded-3xl border p-4 ${classes[variante]}`}>
      <p className={`text-xs font-bold uppercase tracking-[0.08em] ${labelClasses[variante]}`}>
        {titulo}
      </p>
      <p className="mt-2 text-2xl font-bold">{valor}</p>
      <p className="mt-1 text-xs font-semibold opacity-75">{descricao}</p>
    </article>
  );
}

function NivelBadge({
  nivel,
}: {
  nivel: AdminAuditoriaNivel;
}) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${classeNivel(nivel)}`}>
      {rotuloNivel(nivel)}
    </span>
  );
}

function ModuloBadge({
  children,
}: {
  children: string;
}) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${moduloClasse(children)}`}>
      {children || 'Módulo'}
    </span>
  );
}

function UsuarioAuditoriaCard({
  item,
}: {
  item: AdminAuditoriaItem;
}) {
  return (
    <div className="min-w-[210px] rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
      <div className="flex items-center gap-2 font-semibold text-slate-800">
        <UserRound className="h-4 w-4 text-slate-400" />
        <span className="truncate">{item.usuario?.nome ?? 'Sistema'}</span>
      </div>

      <p className="mt-1 truncate text-xs text-slate-500">
        {item.usuario?.email ?? 'Ação automática'}
      </p>

      {item.referencia ? (
        <p className="mt-2 break-words text-xs font-semibold text-slate-500">
          Ref.: {item.referencia}
        </p>
      ) : null}
    </div>
  );
}

export function AdminAuditoriaPage() {
  usePageTitle('Auditoria geral');

  const {
    usuario,
    condominiosAdministrativos,
  } = useAdminRouteContext();

  const hoje = useMemo(() => new Date(), []);
  const inicioPadrao = useMemo(() => {
    const data = new Date(hoje);
    data.setDate(data.getDate() - 30);
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
  const [modulo, setModulo] = useState<AdminAuditoriaModulo | 'TODOS'>('TODOS');
  const [nivel, setNivel] = useState<AdminAuditoriaNivel | 'TODOS'>('TODOS');
  const [usuarioId, setUsuarioId] = useState('TODOS');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [resposta, setResposta] = useState<AdminAuditoriaGeralResponse | null>(null);

  useEffect(() => {
    if (!condominioId && condominiosDisponiveis.length > 0) {
      setCondominioId(condominiosDisponiveis[0].id);
    }
  }, [condominioId, condominiosDisponiveis]);

  useEffect(() => {
    let ativo = true;

    async function carregarAuditoria() {
      if (!condominioId) {
        setResposta(null);
        setCarregando(false);
        return;
      }

      setCarregando(true);
      setErro('');

      const parametros = new URLSearchParams();
      parametros.set('inicio', inicio);
      parametros.set('fim', fim);

      if (modulo !== 'TODOS') {
        parametros.set('modulo', modulo);
      }

      if (nivel !== 'TODOS') {
        parametros.set('nivel', nivel);
      }

      if (usuarioId !== 'TODOS') {
        parametros.set('usuarioId', usuarioId);
      }

      if (busca.trim()) {
        parametros.set('busca', busca.trim());
      }

      try {
        const dados = await apiRequest<AdminAuditoriaGeralResponse>(
          `/condominios/${condominioId}/auditoria?${parametros.toString()}`,
        );

        if (ativo) {
          setResposta(dados);
        }
      } catch (error) {
        if (ativo) {
          setErro(friendlyErrorMessage(error));
          setResposta(null);
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregarAuditoria();

    return () => {
      ativo = false;
    };
  }, [busca, condominioId, fim, inicio, modulo, nivel, usuarioId]);

  const itens = resposta?.itens ?? [];
  const usuarios = resposta?.usuarios ?? [];
  const resumo = resposta?.resumo;
  const totalCriticosAtencao = (resumo?.porNivel ?? [])
    .filter((item) => item.nivel === 'CRITICO' || item.nivel === 'ATENCAO')
    .reduce((total, item) => total + item.total, 0);

  function limparFiltros() {
    setInicio(inicioPadrao);
    setFim(fimPadrao);
    setModulo('TODOS');
    setNivel('TODOS');
    setUsuarioId('TODOS');
    setBusca('');
  }

  function exportarCsv() {
    if (itens.length === 0) {
      return;
    }

    const linhas = [
      [
        'Data',
        'Módulo',
        'Nível',
        'Ação',
        'Título',
        'Descrição',
        'Usuário',
        'E-mail',
        'Referência',
      ],
      ...itens.map((item) => [
        formatarDataHora(item.criadoEm),
        item.moduloRotulo,
        rotuloNivel(item.nivel),
        item.acao,
        item.titulo,
        item.descricao,
        item.usuario?.nome ?? 'Sistema',
        item.usuario?.email ?? '',
        item.referencia ?? '',
      ]),
    ];

    const conteudo = linhas
      .map((linha) => linha.map(normalizarCsv).join(';'))
      .join('\n');

    const blob = new Blob([`\uFEFF${conteudo}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `auditoria-geral-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function imprimirRelatorio() {
    if (itens.length === 0) {
      return;
    }

    const janela = window.open('', '_blank', 'width=1100,height=760');

    if (!janela) {
      setErro('Não foi possível abrir a janela de impressão.');
      return;
    }

    const linhas = itens
      .map(
        (item) => `
          <tr>
            <td>${formatarDataHora(item.criadoEm)}</td>
            <td>${item.moduloRotulo}</td>
            <td>${rotuloNivel(item.nivel)}</td>
            <td>${item.acao}</td>
            <td>${item.titulo}</td>
            <td>${item.usuario?.nome ?? 'Sistema'}</td>
          </tr>
        `,
      )
      .join('');

    janela.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Auditoria geral</title>
          <style>
            body { color: #0f172a; font-family: Arial, sans-serif; margin: 0; padding: 32px; }
            h1 { margin: 0 0 6px; }
            p { color: #475569; margin: 0 0 24px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border-bottom: 1px solid #e2e8f0; font-size: 12px; padding: 9px; text-align: left; vertical-align: top; }
            th { background: #fff7ed; color: #9a3412; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <h1>Auditoria geral</h1>
          <p>Relatório gerado em ${formatarDataHora(new Date().toISOString())}</p>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Módulo</th>
                <th>Nível</th>
                <th>Ação</th>
                <th>Título</th>
                <th>Usuário</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </body>
      </html>
    `);

    janela.document.close();
    janela.focus();
    window.setTimeout(() => janela.print(), 300);
  }

  return (
    <AdminShell
      usuario={usuario}
      condominiosAdministrativos={condominiosAdministrativos}
    >
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.06em] text-orange-700">
              Auditoria geral
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Rastreabilidade operacional do condomínio
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Acompanhe ações críticas realizadas nos módulos administrativos,
              com filtros por período, usuário, módulo e nível.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={exportarCsv}
              disabled={itens.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 text-sm font-bold text-orange-800 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>

            <button
              type="button"
              onClick={imprimirRelatorio}
              disabled={itens.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ResumoAuditoriaCard
            titulo="Eventos"
            valor={resumo?.total ?? 0}
            descricao="registros no período"
          />

          <ResumoAuditoriaCard
            titulo="Hoje"
            valor={resumo?.hoje ?? 0}
            descricao="ações registradas hoje"
            variante="orange"
          />

          <ResumoAuditoriaCard
            titulo="Usuários"
            valor={resumo?.usuarios ?? 0}
            descricao="usuários envolvidos"
            variante="emerald"
          />

          <ResumoAuditoriaCard
            titulo="Críticos/Atenção"
            valor={totalCriticosAtencao}
            descricao="exigem revisão administrativa"
            variante="rose"
          />
        </div>
      </section>

      <section className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-950">Filtros da auditoria</h3>
            <p className="text-sm text-slate-500">Refine a análise antes de exportar ou imprimir.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <select
            value={condominioId ?? ''}
            onChange={(event) => setCondominioId(Number(event.target.value))}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          >
            {condominiosDisponiveis.map((condominio) => (
              <option key={condominio.id} value={condominio.id}>
                {condominio.nome}
              </option>
            ))}
          </select>

          <label className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={inicio}
              onChange={(event) => setInicio(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={fim}
              onChange={(event) => setFim(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <select
            value={modulo}
            onChange={(event) => setModulo(event.target.value as AdminAuditoriaModulo | 'TODOS')}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          >
            {modulosAuditoria.map((item) => (
              <option key={item.valor} value={item.valor}>
                {item.rotulo}
              </option>
            ))}
          </select>

          <select
            value={nivel}
            onChange={(event) => setNivel(event.target.value as AdminAuditoriaNivel | 'TODOS')}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          >
            {niveisAuditoria.map((item) => (
              <option key={item.valor} value={item.valor}>
                {item.rotulo}
              </option>
            ))}
          </select>

          <select
            value={usuarioId}
            onChange={(event) => setUsuarioId(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          >
            <option value="TODOS">Todos os usuários</option>
            {usuarios.map((usuarioFiltro) => (
              <option key={usuarioFiltro.id} value={usuarioFiltro.id}>
                {usuarioFiltro.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por ação, descrição, usuário, módulo ou referência"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <button
            type="button"
            onClick={limparFiltros}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
          >
            <X className="h-4 w-4" />
            Limpar filtros
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Eventos auditáveis</h3>
            <p className="text-sm text-slate-500">{itens.length} registro(s) encontrados no período.</p>
          </div>
          {carregando ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Carregando
            </span>
          ) : null}
        </div>

        {erro ? (
          <div className="mt-5 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {erro}
          </div>
        ) : null}

        {!carregando && !erro && itens.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-bold text-slate-700">Nenhum evento encontrado.</p>
            <p className="mt-1 text-sm text-slate-500">Ajuste os filtros ou amplie o período da auditoria.</p>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          {itens.map((item: AdminAuditoriaItem) => (
            <article
              key={item.id}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-100 hover:shadow-md"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <ModuloBadge>{item.moduloRotulo}</ModuloBadge>
                    <NivelBadge nivel={item.nivel} />
                    <span className="text-xs font-semibold text-slate-500">
                      {formatarDataHora(item.criadoEm)}
                    </span>
                  </div>

                  <h4 className="mt-3 text-base font-bold text-slate-950">{item.titulo}</h4>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.descricao}</p>

                  {item.detalhes ? (
                    <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                      {item.detalhes}
                    </p>
                  ) : null}
                </div>

                <UsuarioAuditoriaCard item={item} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
