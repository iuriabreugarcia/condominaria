import {
  Archive,
  ExternalLink,
  LoaderCircle,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Star,
} from 'lucide-react';
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AdminShell } from '../components/AdminShell';
import { useAdminRouteContext } from '../components/AdminProtectedRoute';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  ApiError,
  apiRequest,
} from '../lib/api';
import type {
  AdminDocumentoCondominio,
  DocumentoCondominioPayload,
  StatusDocumentoCondominio,
} from '../types/api';

type FiltroStatus = 'TODOS' | StatusDocumentoCondominio;

const categoriasSugeridas = [
  'Regimento interno',
  'Convenção',
  'Ata de assembleia',
  'Prestação de contas',
  'Comunicado em PDF',
  'Manual',
  'Normas',
  'Outros',
];

function friendlyErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const mensagem = String(error.message ?? '').trim();
    const normalizada = mensagem.toLowerCase();

    if (
      normalizada.includes('internal server error') ||
      normalizada.includes('unknown column') ||
      normalizada.includes('prismaclientknownrequesterror') ||
      normalizada.includes('p2022') ||
      normalizada.includes('cannot read properties')
    ) {
      return 'Não foi possível concluir a ação agora. Verifique a estrutura dos documentos no sistema.';
    }

    return mensagem || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function formatarData(valor: string | null) {
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

function rotuloStatus(status: StatusDocumentoCondominio) {
  switch (status) {
    case 'PUBLICADO':
      return 'Publicado';
    case 'ARQUIVADO':
      return 'Arquivado';
    case 'RASCUNHO':
    default:
      return 'Rascunho';
  }
}

function classeStatus(status: StatusDocumentoCondominio) {
  switch (status) {
    case 'PUBLICADO':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'ARQUIVADO':
      return 'border-slate-200 bg-slate-100 text-slate-700';
    case 'RASCUNHO':
    default:
      return 'border-amber-200 bg-amber-50 text-amber-800';
  }
}

function acaoRotulo(acao: 'publicar' | 'arquivar') {
  return acao === 'publicar' ? 'publicar' : 'arquivar';
}

function mensagemSucessoAcao(acao: 'publicar' | 'arquivar') {
  return acao === 'publicar'
    ? 'Documento publicado para os moradores.'
    : 'Documento arquivado.';
}

function DocumentoStatusBadge({
  status,
}: {
  status: StatusDocumentoCondominio;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${classeStatus(status)}`}
    >
      {rotuloStatus(status)}
    </span>
  );
}

function ResumoDocumentoCard({
  titulo,
  valor,
  descricao,
  variant = 'slate',
}: {
  titulo: string;
  valor: number;
  descricao: string;
  variant?: 'slate' | 'green' | 'amber' | 'orange';
}) {
  const variantes = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    orange: 'border-orange-100 bg-orange-50 text-orange-700',
  };

  return (
    <article className={`rounded-3xl border p-4 ${variantes[variant]}`}>
      <p className="text-xs font-bold uppercase tracking-[0.08em]">
        {titulo}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-950">
        {valor}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-500">
        {descricao}
      </p>
    </article>
  );
}

function normalizarBusca(valor: string | null | undefined) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function AdminDocumentosPage() {
  usePageTitle('Documentos do Condomínio');

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
  const [documentos, setDocumentos] = useState<AdminDocumentoCondominio[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [erroAcao, setErroAcao] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [acaoDocumentoId, setAcaoDocumentoId] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<FiltroStatus>('TODOS');
  const [categoria, setCategoria] = useState('TODAS');
  const [formulario, setFormulario] = useState({
    titulo: '',
    categoria: 'Regimento interno',
    descricao: '',
    url: '',
    publicoMoradores: true,
    destaque: false,
  });

  const categorias = useMemo(() => {
    const valores = new Set<string>();

    for (const item of documentos) {
      if (item.categoria?.trim()) {
        valores.add(item.categoria.trim());
      }
    }

    for (const item of categoriasSugeridas) {
      valores.add(item);
    }

    return Array.from(valores).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [documentos]);

  const documentosFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca);

    return documentos.filter((documento) => {
      if (status !== 'TODOS' && documento.status !== status) {
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
        documento.criadoPorUsuario?.nome,
      ].some((valor) => normalizarBusca(valor).includes(termo));
    });
  }, [busca, categoria, documentos, status]);

  const resumo = useMemo(() => ({
    total: documentos.length,
    publicados: documentos.filter((item) => item.status === 'PUBLICADO').length,
    rascunhos: documentos.filter((item) => item.status === 'RASCUNHO').length,
    arquivados: documentos.filter((item) => item.status === 'ARQUIVADO').length,
    destaques: documentos.filter((item) => item.destaque).length,
  }), [documentos]);

  async function carregarDocumentos(id: number) {
    if (!id) {
      return;
    }

    setCarregando(true);
    setErro('');

    try {
      const resposta = await apiRequest<AdminDocumentoCondominio[]>(
        `/condominios/${id}/documentos`,
      );

      setDocumentos(resposta);
    } catch (error) {
      setErro(friendlyErrorMessage(error, 'Não foi possível carregar os documentos.'));
      setDocumentos([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarDocumentos(condominioId);
  }, [condominioId]);

  async function salvarDocumento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || salvando) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');

    const titulo = formulario.titulo.trim();
    const url = formulario.url.trim();

    if (titulo.length < 3) {
      setErroAcao('Informe um título com pelo menos 3 caracteres.');
      return;
    }

    if (!url) {
      setErroAcao('Informe o link ou caminho público do arquivo.');
      return;
    }

    setSalvando(true);

    const payload: DocumentoCondominioPayload = {
      titulo,
      categoria: formulario.categoria.trim(),
      descricao: formulario.descricao.trim(),
      url,
      publicoMoradores: formulario.publicoMoradores,
      destaque: formulario.destaque,
    };

    try {
      await apiRequest<AdminDocumentoCondominio>(
        `/condominios/${condominioId}/documentos`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setFormulario({
        titulo: '',
        categoria: 'Regimento interno',
        descricao: '',
        url: '',
        publicoMoradores: true,
        destaque: false,
      });

      setMensagemSucesso('Documento cadastrado como rascunho.');
      await carregarDocumentos(condominioId);
    } catch (error) {
      setErroAcao(friendlyErrorMessage(error, 'Não foi possível cadastrar o documento.'));
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarStatusDocumento(
    documentoId: number,
    acao: 'publicar' | 'arquivar',
  ) {
    if (!condominioId) {
      return;
    }

    const documento = documentos.find((item) => item.id === documentoId);
    const titulo = documento?.titulo?.trim() || `documento #${documentoId}`;
    const confirmar = window.confirm(
      `Confirmar ${acaoRotulo(acao)} o documento "${titulo}"?`,
    );

    if (!confirmar) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setAcaoDocumentoId(documentoId);

    try {
      await apiRequest(
        `/condominios/${condominioId}/documentos/${documentoId}/${acao}`,
        {
          method: 'PATCH',
        },
      );

      setMensagemSucesso(mensagemSucessoAcao(acao));
      await carregarDocumentos(condominioId);
    } catch (error) {
      setErroAcao(friendlyErrorMessage(error, 'Não foi possível atualizar o documento.'));
    } finally {
      setAcaoDocumentoId(null);
    }
  }

  return (
    <AdminShell usuario={usuario} condominiosAdministrativos={condominiosAdministrativos}>
      <div className="grid gap-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-600">
                Arquivo digital
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                Documentos do condomínio
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Publique regimento interno, convenção, atas, prestação de contas,
                manuais e documentos oficiais para consulta dos moradores.
              </p>
            </div>

            <label className="grid gap-2 text-sm font-semibold text-slate-700 lg:min-w-[280px]">
              Condomínio
              <select
                value={condominioId}
                onChange={(event) => setCondominioId(Number(event.target.value))}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                {condominiosAdministrativos.map((vinculo) => (
                  <option key={vinculo.condominio.id} value={vinculo.condominio.id}>
                    {vinculo.condominio.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResumoDocumentoCard
              titulo="Total"
              valor={resumo.total}
              descricao="arquivos cadastrados"
            />
            <ResumoDocumentoCard
              titulo="Publicados"
              valor={resumo.publicados}
              descricao="visíveis conforme configuração"
              variant="green"
            />
            <ResumoDocumentoCard
              titulo="Rascunhos"
              valor={resumo.rascunhos}
              descricao="aguardando publicação"
              variant="amber"
            />
            <ResumoDocumentoCard
              titulo="Destaques"
              valor={resumo.destaques}
              descricao={`${resumo.arquivados} arquivado(s)`}
              variant="orange"
            />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form
            onSubmit={salvarDocumento}
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-950">Novo documento</h3>
                <p className="text-sm text-slate-600">
                  Cadastre o link ou caminho público do arquivo.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Título
                <input
                  value={formulario.titulo}
                  onChange={(event) => setFormulario((atual) => ({ ...atual, titulo: event.target.value }))}
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Ex.: Regimento Interno atualizado"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Categoria
                <input
                  value={formulario.categoria}
                  onChange={(event) => setFormulario((atual) => ({ ...atual, categoria: event.target.value }))}
                  list="categorias-documentos"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
                <datalist id="categorias-documentos">
                  {categorias.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Link/caminho do arquivo
                <input
                  value={formulario.url}
                  onChange={(event) => setFormulario((atual) => ({ ...atual, url: event.target.value }))}
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="https://... ou /uploads/documentos/..."
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Descrição
                <textarea
                  value={formulario.descricao}
                  onChange={(event) => setFormulario((atual) => ({ ...atual, descricao: event.target.value }))}
                  rows={4}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Resumo do conteúdo do documento."
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formulario.publicoMoradores}
                    onChange={(event) => setFormulario((atual) => ({ ...atual, publicoMoradores: event.target.checked }))}
                    className="h-4 w-4 accent-orange-500"
                  />
                  Visível no portal
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formulario.destaque}
                    onChange={(event) => setFormulario((atual) => ({ ...atual, destaque: event.target.checked }))}
                    className="h-4 w-4 accent-orange-500"
                  />
                  Destaque
                </label>
              </div>

              {erroAcao ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {erroAcao}
                </div>
              ) : null}

              {mensagemSucesso ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {mensagemSucesso}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={salvando}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Cadastrar documento
              </button>
            </div>
          </form>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Documentos cadastrados</h3>
                <p className="text-sm text-slate-600">
                  Gerencie publicação, destaque e visibilidade dos arquivos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void carregarDocumentos(condominioId)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
              >
                <RefreshCcw className="h-4 w-4" />
                Atualizar
              </button>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_200px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Buscar documento"
                />
              </label>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as FiltroStatus)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="TODOS">Todos os status</option>
                <option value="PUBLICADO">Publicados</option>
                <option value="RASCUNHO">Rascunhos</option>
                <option value="ARQUIVADO">Arquivados</option>
              </select>

              <select
                value={categoria}
                onChange={(event) => setCategoria(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="TODAS">Todas as categorias</option>
                {categorias.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {carregando ? (
              <div className="mt-6 flex items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm font-semibold text-slate-600">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Carregando documentos...
              </div>
            ) : erro ? (
              <div className="mt-6 rounded-3xl border border-rose-100 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
                {erro}
              </div>
            ) : documentosFiltrados.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-600">
                Nenhum documento encontrado.
              </div>
            ) : (
              <div className="mt-6 grid gap-3">
                {documentosFiltrados.map((documento) => (
                  <article
                    key={documento.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <DocumentoStatusBadge status={documento.status} />

                          {documento.destaque ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                              <Star className="h-3.5 w-3.5" />
                              Destaque
                            </span>
                          ) : null}

                          {documento.publicoMoradores ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                              Portal
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                              Interno
                            </span>
                          )}
                        </div>

                        <h4 className="mt-3 text-lg font-bold text-slate-950">{documento.titulo}</h4>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {documento.categoria ?? 'Sem categoria'} • Atualizado em {formatarData(documento.atualizadoEm)}
                        </p>
                        {documento.descricao ? (
                          <p className="mt-2 text-sm leading-6 text-slate-600">{documento.descricao}</p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                        <a
                          href={documento.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Abrir
                        </a>

                        {documento.status !== 'PUBLICADO' ? (
                          <button
                            type="button"
                            disabled={acaoDocumentoId === documento.id}
                            onClick={() => void atualizarStatusDocumento(documento.id, 'publicar')}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
                          >
                            {acaoDocumentoId === documento.id ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            Publicar
                          </button>
                        ) : null}

                        {documento.status !== 'ARQUIVADO' ? (
                          <button
                            type="button"
                            disabled={acaoDocumentoId === documento.id}
                            onClick={() => void atualizarStatusDocumento(documento.id, 'arquivar')}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 disabled:opacity-60"
                          >
                            {acaoDocumentoId === documento.id ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <Archive className="h-4 w-4" />
                            )}
                            Arquivar
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </AdminShell>
  );
}
