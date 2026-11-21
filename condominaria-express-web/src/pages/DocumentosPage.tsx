import type { ReactNode } from 'react';
import {
  Archive,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Search,
  ShieldCheck,
  Star,
  Tags,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { EmptyState, ErrorState } from '../components/FeedbackState';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/shared/Pagination';
import { usePortal } from '../context/PortalContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { ApiError, apiRequest } from '../lib/api';
import type { DocumentoCondominioPortal, StatusDocumentoCondominio } from '../types/api';


type ApiListResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

type PaginacaoState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const LIMITE_POR_PAGINA = 10;

function paginacaoInicial(): PaginacaoState {
  return {
    page: 1,
    limit: LIMITE_POR_PAGINA,
    total: 0,
    totalPages: 1,
  };
}

function normalizarListaPaginada<T>(resposta: T[] | ApiListResponse<T>) {
  if (Array.isArray(resposta)) {
    return {
      items: resposta,
      paginacao: {
        page: 1,
        limit: resposta.length || LIMITE_POR_PAGINA,
        total: resposta.length,
        totalPages: 1,
      },
    };
  }

  const items = resposta.items ?? [];
  const total = Number(resposta.total ?? items.length);
  const page = Number(resposta.page ?? 1);
  const limit = Number(resposta.limit ?? LIMITE_POR_PAGINA);
  const totalPages = Number(resposta.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit))));

  return {
    items,
    paginacao: {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: Number.isFinite(limit) && limit > 0 ? limit : LIMITE_POR_PAGINA,
      total: Number.isFinite(total) ? total : items.length,
      totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
    },
  };
}

function montarQueryPaginada(page: number, limit = LIMITE_POR_PAGINA) {
  const params = new URLSearchParams({
    page: String(Math.max(1, page)),
    limit: String(Math.max(1, limit)),
  });

  return `?${params.toString()}`;
}

type StatusFiltro = 'TODOS' | 'DESTAQUES' | StatusDocumentoCondominio;
type OrdenacaoFiltro = 'RECENTES' | 'ANTIGOS' | 'TITULO';
type BadgeVariant = 'orange' | 'slate' | 'emerald' | 'red' | 'blue';

function normalizarBusca(valor: string | null | undefined) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function dataTimestamp(valor: string | null | undefined) {
  if (!valor) {
    return 0;
  }

  const timestamp = new Date(valor).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatarData(valor: string | null | undefined) {
  if (!valor) {
    return '—';
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(data);
}

function mensagemErroAmigavel(error: unknown) {
  const mensagem = error instanceof ApiError || error instanceof Error
    ? error.message
    : String(error ?? '');

  const normalizada = mensagem.toLowerCase();

  if (
    normalizada.includes('internal server error') ||
    normalizada.includes('prisma') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('p2022')
  ) {
    return 'Não foi possível carregar os documentos agora. A administração técnica já pode verificar a estrutura do sistema.';
  }

  if (normalizada.includes('failed to fetch') || normalizada.includes('network')) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
  }

  return mensagem.trim() || 'Não foi possível carregar os documentos.';
}

function labelStatus(status: StatusDocumentoCondominio | string | null | undefined) {
  const normalizado = String(status ?? '').trim().toUpperCase();

  const labels: Record<string, string> = {
    RASCUNHO: 'Rascunho',
    PUBLICADO: 'Publicado',
    ARQUIVADO: 'Arquivado',
  };

  return labels[normalizado] ?? String(status ?? 'Documento');
}

function variantStatus(status: StatusDocumentoCondominio | string | null | undefined): BadgeVariant {
  const normalizado = String(status ?? '').trim().toUpperCase();

  if (normalizado === 'PUBLICADO') {
    return 'emerald';
  }

  if (normalizado === 'ARQUIVADO') {
    return 'red';
  }

  if (normalizado === 'RASCUNHO') {
    return 'slate';
  }

  return 'blue';
}

function badgeClasses(variant: BadgeVariant) {
  const variants: Record<BadgeVariant, string> = {
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  };

  return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${variants[variant]}`;
}

function DocumentoStatusBadge({
  status,
}: {
  status: StatusDocumentoCondominio | string | null | undefined;
}) {
  return (
    <span className={badgeClasses(variantStatus(status))}>
      <ShieldCheck className="h-3.5 w-3.5" />
      {labelStatus(status)}
    </span>
  );
}

function DocumentoDestaqueBadge({ destaque }: { destaque: boolean }) {
  if (!destaque) {
    return null;
  }

  return (
    <span className={badgeClasses('orange')}>
      <Star className="h-3.5 w-3.5" />
      Destaque
    </span>
  );
}

function DocumentoCategoriaBadge({ categoria }: { categoria: string | null | undefined }) {
  return (
    <span className={badgeClasses('slate')}>
      <Tags className="h-3.5 w-3.5" />
      {categoria?.trim() || 'Documento'}
    </span>
  );
}

function ResumoDocumentoCard({
  titulo,
  valor,
  detalhe,
  variant = 'slate',
  icon,
}: {
  titulo: string;
  valor: number;
  detalhe: string;
  variant?: BadgeVariant;
  icon: ReactNode;
}) {
  const variants: Record<BadgeVariant, string> = {
    orange: 'border-orange-100 bg-orange-50 text-orange-700',
    slate: 'border-slate-200 bg-white text-slate-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
  };

  return (
    <article className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            {titulo}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{valor}</p>
        </div>

        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${variants[variant]}`}>
          {icon}
        </div>
      </div>

      <p className="mt-3 text-sm font-semibold leading-5 text-slate-500">
        {detalhe}
      </p>
    </article>
  );
}

function DocumentoCard({ documento }: { documento: DocumentoCondominioPortal }) {
  const dataPrincipal = documento.publicadoEm ?? documento.atualizadoEm;

  return (
    <article className="flex min-w-0 flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
          <FileText className="h-5 w-5" />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <DocumentoDestaqueBadge destaque={documento.destaque} />
          <DocumentoStatusBadge status={documento.status} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-bold leading-tight text-slate-950">
          {documento.titulo}
        </h3>

        <div className="mt-3 flex flex-wrap gap-2">
          <DocumentoCategoriaBadge categoria={documento.categoria} />
          <span className={badgeClasses('blue')}>
            <Clock3 className="h-3.5 w-3.5" />
            {formatarData(dataPrincipal)}
          </span>
        </div>

        {documento.descricao ? (
          <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">
            {documento.descricao}
          </p>
        ) : (
          <p className="mt-4 text-sm font-semibold leading-6 text-slate-400">
            Sem descrição adicional informada pela administração.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <a
          href={documento.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir
        </a>

        <a
          href={documento.url}
          download
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
        >
          <Download className="h-4 w-4" />
          Baixar
        </a>
      </div>
    </article>
  );
}

export function DocumentosPage() {
  usePageTitle('Documentos');

  const {
    contexto,
    moradorAtivo,
    carregando: carregandoPortal,
    erro: erroPortal,
  } = usePortal();

  const [documentos, setDocumentos] = useState<DocumentoCondominioPortal[]>([]);
  const [paginacao, setPaginacao] = useState<PaginacaoState>(paginacaoInicial());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('TODAS');
  const [status, setStatus] = useState<StatusFiltro>('TODOS');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoFiltro>('RECENTES');

  useEffect(() => {
    async function carregar() {
      if (carregandoPortal) {
        return;
      }

      if (erroPortal) {
        setCarregando(false);
        setErro(mensagemErroAmigavel(erroPortal));
        return;
      }

      if (!moradorAtivo) {
        setCarregando(false);
        setErro('Nenhum perfil de morador disponível para carregar os documentos.');
        return;
      }

      setCarregando(true);
      setErro('');

      try {
        const resposta = await apiRequest<DocumentoCondominioPortal[] | ApiListResponse<DocumentoCondominioPortal>>(
          `/condominios/${moradorAtivo.condominioId}/documentos/portal${montarQueryPaginada(paginacao.page)}`,
        );

        const { items, paginacao: paginacaoResposta } = normalizarListaPaginada(resposta);

        setDocumentos(items);
        setPaginacao(paginacaoResposta);
      } catch (error) {
        setErro(mensagemErroAmigavel(error));
        setDocumentos([]);
      } finally {
        setCarregando(false);
      }
    }

    void carregar();
  }, [carregandoPortal, erroPortal, moradorAtivo, paginacao.page]);

  const categorias = useMemo(() => {
    const valores = new Set<string>();

    for (const documento of documentos) {
      if (documento.categoria?.trim()) {
        valores.add(documento.categoria.trim());
      }
    }

    return Array.from(valores).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [documentos]);

  const documentosFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca);

    return documentos
      .filter((documento) => {
        if (status === 'DESTAQUES' && !documento.destaque) {
          return false;
        }

        if (status !== 'TODOS' && status !== 'DESTAQUES' && documento.status !== status) {
          return false;
        }

        if (categoria !== 'TODAS' && documento.categoria !== categoria) {
          return false;
        }

        if (!termo) {
          return true;
        }

        return [
          documento.titulo,
          documento.categoria,
          documento.descricao,
          documento.url,
        ].some((valor) => normalizarBusca(valor).includes(termo));
      })
      .sort((a, b) => {
        if (ordenacao === 'TITULO') {
          return a.titulo.localeCompare(b.titulo, 'pt-BR');
        }

        const dataA = dataTimestamp(a.publicadoEm ?? a.atualizadoEm);
        const dataB = dataTimestamp(b.publicadoEm ?? b.atualizadoEm);

        if (ordenacao === 'ANTIGOS') {
          return dataA - dataB;
        }

        return dataB - dataA;
      });
  }, [busca, categoria, documentos, ordenacao, status]);

  const documentosPublicados = useMemo(
    () => documentos.filter((documento) => documento.status === 'PUBLICADO'),
    [documentos],
  );

  const destaques = useMemo(
    () => documentos.filter((documento) => documento.destaque).slice(0, 3),
    [documentos],
  );

  const documentosRecentes = useMemo(() => {
    const agora = Date.now();
    const trintaDias = 30 * 24 * 60 * 60 * 1000;

    return documentos.filter((documento) => {
      const timestamp = dataTimestamp(documento.publicadoEm ?? documento.atualizadoEm);
      return timestamp > 0 && agora - timestamp <= trintaDias;
    });
  }, [documentos]);

  return (
    <AppShell
      nomeCondominio={moradorAtivo?.condominio.nome}
      nomeMorador={moradorAtivo?.nome}
      perfis={contexto?.moradores ?? []}
    >
      <PageHeader
        title="Documentos"
        description="Consulte regimento, convenção, atas, prestação de contas, manuais e arquivos publicados pela administração."
        ultimaAtualizacao={null}
        carregando={carregando}
        onRefresh={() => {
          window.location.reload();
        }}
        nomeCondominio={moradorAtivo?.condominio.nome}
        nomeMorador={moradorAtivo?.nome}
      />

      {carregando ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-600 shadow-sm">
          Carregando documentos...
        </div>
      ) : erro ? (
        <ErrorState message={erro} />
      ) : (
        <div className="grid gap-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResumoDocumentoCard
              titulo="Documentos"
              valor={documentos.length}
              detalhe="Arquivos disponíveis para consulta"
              icon={<FileText className="h-5 w-5" />}
              variant="orange"
            />

            <ResumoDocumentoCard
              titulo="Publicados"
              valor={documentosPublicados.length}
              detalhe="Visíveis no portal do morador"
              icon={<ShieldCheck className="h-5 w-5" />}
              variant="emerald"
            />

            <ResumoDocumentoCard
              titulo="Destaques"
              valor={documentos.filter((documento) => documento.destaque).length}
              detalhe="Materiais priorizados pela administração"
              icon={<Star className="h-5 w-5" />}
              variant="orange"
            />

            <ResumoDocumentoCard
              titulo="Categorias"
              valor={categorias.length}
              detalhe="Tipos de documento organizados"
              icon={<Archive className="h-5 w-5" />}
              variant="blue"
            />
          </section>

          {documentosRecentes.length > 0 ? (
            <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-emerald-700">
                    <Clock3 className="h-4 w-4" />
                    Atualizações recentes
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
                    {documentosRecentes.length} documento(s) publicado(s) ou atualizado(s) nos últimos 30 dias.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {destaques.length > 0 ? (
            <section className="rounded-[2rem] border border-orange-100 bg-orange-50 p-5 shadow-sm md:p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-orange-700">
                <Star className="h-4 w-4" />
                Documentos em destaque
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {destaques.map((documento) => (
                  <a
                    key={documento.id}
                    href={documento.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-3xl border border-orange-100 bg-white p-4 transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <p className="text-sm font-bold text-orange-950">{documento.titulo}</p>
                    <p className="mt-2 text-xs font-bold text-orange-700">
                      {documento.categoria ?? 'Documento'} • {formatarData(documento.publicadoEm ?? documento.atualizadoEm)}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_180px_180px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={busca}
                  onChange={(event) => {
                    setBusca(event.target.value);
                    setPaginacao((atual) => ({ ...atual, page: 1 }));
                  }}
                  className="h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Buscar por título, categoria ou descrição"
                />
              </label>

              <select
                value={categoria}
                onChange={(event) => {
                    setCategoria(event.target.value);
                    setPaginacao((atual) => ({ ...atual, page: 1 }));
                  }}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="TODAS">Todas as categorias</option>
                {categorias.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>

              <select
                value={status}
                onChange={(event) => {
                    setStatus(event.target.value as StatusFiltro);
                    setPaginacao((atual) => ({ ...atual, page: 1 }));
                  }}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="TODOS">Todos</option>
                <option value="DESTAQUES">Só destaques</option>
                <option value="PUBLICADO">Publicados</option>
                <option value="RASCUNHO">Rascunhos</option>
                <option value="ARQUIVADO">Arquivados</option>
              </select>

              <select
                value={ordenacao}
                onChange={(event) => {
                    setOrdenacao(event.target.value as OrdenacaoFiltro);
                    setPaginacao((atual) => ({ ...atual, page: 1 }));
                  }}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="RECENTES">Mais recentes</option>
                <option value="ANTIGOS">Mais antigos</option>
                <option value="TITULO">Título</option>
              </select>
            </div>
          </section>

          {documentosFiltrados.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum documento encontrado."
              description="Ajuste os filtros ou aguarde novas publicações da administração."
            />
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {documentosFiltrados.map((documento) => (
                  <DocumentoCard key={documento.id} documento={documento} />
                ))}
              </section>

              <Pagination
                page={paginacao.page}
                totalPages={paginacao.totalPages}
                total={paginacao.total}
                limit={paginacao.limit}
                onPageChange={(page) =>
                  setPaginacao((atual) => ({
                    ...atual,
                    page,
                  }))
                }
              />
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
