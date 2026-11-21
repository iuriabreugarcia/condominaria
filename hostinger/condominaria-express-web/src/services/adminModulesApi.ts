import { api } from '../lib/http';
import type {
  AdminFilters,
  ApiListResponse,
  ApiMessageResponse,
  Contrato,
  ContratoPayload,
  Documento,
  DocumentoPayload,
  Id,
  ManutencaoOrdem,
  ManutencaoPayload,
  ManutencaoResumo,
  Prestador,
  PrestadorPayload,
  RelatorioResumo,
} from '../types/adminModules';
import { adminRoutes } from './adminRoutes';

type ListLike<T> = T[] | ApiListResponse<T>;

function numeroSeguro(valor: unknown, fallback: number) {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : fallback;
}

function normalizeListResponse<T>(response: ListLike<T>): ApiListResponse<T> {
  if (Array.isArray(response)) {
    return {
      items: response,
      total: response.length,
      page: 1,
      limit: response.length,
      totalPages: 1,
    };
  }

  const items = response.items ?? [];
  const total = numeroSeguro(response.total, items.length);
  const page = Math.max(1, numeroSeguro(response.page, 1));
  const limit = Math.max(0, numeroSeguro(response.limit, items.length));
  const totalPages = Math.max(1, numeroSeguro(response.totalPages, 1));

  return {
    items,
    total,
    page,
    limit,
    totalPages,
  };
}

function findById<T extends { id: Id }>(items: T[], id: Id) {
  return items.find((item) => String(item.id) === String(id)) ?? null;
}

export const documentosApi = {
  async listar(condominioId: Id, filtros: AdminFilters = {}) {
    const response = await api.get<ListLike<Documento>>(
      adminRoutes.documentos.listar(condominioId),
      filtros,
    );

    return normalizeListResponse(response);
  },

  async listarPortal(condominioId: Id, filtros: AdminFilters = {}) {
    const response = await api.get<ListLike<Documento>>(
      adminRoutes.documentos.portal(condominioId),
      filtros,
    );

    return normalizeListResponse(response);
  },

  async buscar(condominioId: Id, documentoId: Id) {
    const lista = await documentosApi.listar(condominioId);
    const documento = findById(lista.items, documentoId);

    if (!documento) {
      throw new Error('Documento não encontrado.');
    }

    return documento;
  },

  criar(condominioId: Id, payload: DocumentoPayload) {
    return api.post<Documento | ApiMessageResponse>(
      adminRoutes.documentos.listar(condominioId),
      payload,
    );
  },

  atualizar(condominioId: Id, documentoId: Id, payload: Partial<DocumentoPayload>) {
    return api.patch<Documento | ApiMessageResponse>(
      adminRoutes.documentos.detalhe(condominioId, documentoId),
      payload,
    );
  },

  publicar(condominioId: Id, documentoId: Id) {
    return api.patch<Documento | ApiMessageResponse>(
      adminRoutes.documentos.publicar(condominioId, documentoId),
    );
  },

  arquivar(condominioId: Id, documentoId: Id) {
    return api.patch<Documento | ApiMessageResponse>(
      adminRoutes.documentos.arquivar(condominioId, documentoId),
    );
  },

  alterarStatus(condominioId: Id, documentoId: Id, status: string) {
    const statusNormalizado = String(status).trim().toUpperCase();

    if (['PUBLICADO', 'ATIVO'].includes(statusNormalizado)) {
      return documentosApi.publicar(condominioId, documentoId);
    }

    if (['ARQUIVADO', 'INATIVO'].includes(statusNormalizado)) {
      return documentosApi.arquivar(condominioId, documentoId);
    }

    return documentosApi.atualizar(condominioId, documentoId, { status });
  },

  async remover() {
    throw new Error('Remoção definitiva de documentos não está disponível. Use arquivar.');
  },
};

export const manutencaoApi = {
  async listar(condominioId: Id, filtros: AdminFilters = {}) {
    const response = await api.get<ListLike<ManutencaoOrdem>>(
      adminRoutes.manutencoes.listar(condominioId),
      filtros,
    );

    return normalizeListResponse(response);
  },

  resumo(condominioId: Id) {
    return api.get<ManutencaoResumo>(adminRoutes.manutencoes.resumo(condominioId));
  },

  async buscar(condominioId: Id, ordemId: Id) {
    const lista = await manutencaoApi.listar(condominioId);
    const ordem = findById(lista.items, ordemId);

    if (!ordem) {
      throw new Error('Ordem de manutenção não encontrada.');
    }

    return ordem;
  },

  criar(condominioId: Id, payload: ManutencaoPayload) {
    return api.post<ManutencaoOrdem | ApiMessageResponse>(
      adminRoutes.manutencoes.listar(condominioId),
      payload,
    );
  },

  atualizar(condominioId: Id, ordemId: Id, payload: Partial<ManutencaoPayload>) {
    return api.patch<ManutencaoOrdem | ApiMessageResponse>(
      adminRoutes.manutencoes.detalhe(condominioId, ordemId),
      payload,
    );
  },

  alterarStatus(condominioId: Id, ordemId: Id, status: string) {
    return api.patch<ManutencaoOrdem | ApiMessageResponse>(
      adminRoutes.manutencoes.status(condominioId, ordemId),
      { status },
    );
  },

  async remover() {
    throw new Error('Remoção definitiva de ordens de manutenção não está disponível. Use cancelamento/status.');
  },
};

export const contratosApi = {
  async listar(condominioId: Id, filtros: AdminFilters = {}) {
    const response = await api.get<ListLike<Contrato>>(
      adminRoutes.contratos.listar(condominioId),
      filtros,
    );

    return normalizeListResponse(response);
  },

  resumo(condominioId: Id) {
    return api.get<unknown>(adminRoutes.contratos.resumo(condominioId));
  },

  async buscar(condominioId: Id, contratoId: Id) {
    const lista = await contratosApi.listar(condominioId);
    const contrato = findById(lista.items, contratoId);

    if (!contrato) {
      throw new Error('Contrato não encontrado.');
    }

    return contrato;
  },

  criar(condominioId: Id, payload: ContratoPayload) {
    return api.post<Contrato | ApiMessageResponse>(
      adminRoutes.contratos.listar(condominioId),
      payload,
    );
  },

  atualizar(condominioId: Id, contratoId: Id, payload: Partial<ContratoPayload>) {
    return api.patch<Contrato | ApiMessageResponse>(
      adminRoutes.contratos.detalhe(condominioId, contratoId),
      payload,
    );
  },

  alterarStatus(condominioId: Id, contratoId: Id, status: string) {
    return api.patch<Contrato | ApiMessageResponse>(
      adminRoutes.contratos.status(condominioId, contratoId),
      { status },
    );
  },

  async remover() {
    throw new Error('Remoção definitiva de contratos não está disponível. Use alteração de status.');
  },
};

export const prestadoresApi = {
  async listar(condominioId: Id, filtros: AdminFilters = {}) {
    const response = await api.get<ListLike<Prestador>>(
      adminRoutes.prestadores.listar(condominioId),
      filtros,
    );

    return normalizeListResponse(response);
  },

  buscar(condominioId: Id, prestadorId: Id) {
    return api.get<Prestador>(
      adminRoutes.prestadores.detalhe(condominioId, prestadorId),
    );
  },

  criar(condominioId: Id, payload: PrestadorPayload) {
    return api.post<Prestador | ApiMessageResponse>(
      adminRoutes.prestadores.listar(condominioId),
      payload,
    );
  },

  atualizar(condominioId: Id, prestadorId: Id, payload: Partial<PrestadorPayload>) {
    return api.patch<Prestador | ApiMessageResponse>(
      adminRoutes.prestadores.detalhe(condominioId, prestadorId),
      payload,
    );
  },

  alterarStatus(condominioId: Id, prestadorId: Id, status: string) {
    return api.patch<Prestador | ApiMessageResponse>(
      adminRoutes.prestadores.status(condominioId, prestadorId),
      { status },
    );
  },

  async remover() {
    throw new Error('Remoção definitiva de prestadores não está disponível. Use alteração de status.');
  },
};

export const relatoriosApi = {
  resumo(condominioId: Id, filtros: AdminFilters = {}) {
    return api.get<RelatorioResumo>(
      adminRoutes.relatorios.geral(condominioId),
      filtros,
    );
  },

  geral(condominioId: Id, filtros: AdminFilters = {}) {
    return api.get<RelatorioResumo>(
      adminRoutes.relatorios.geral(condominioId),
      filtros,
    );
  },

  auditoria(condominioId: Id, filtros: AdminFilters = {}) {
    return api.get<unknown>(
      adminRoutes.relatorios.auditoria(condominioId),
      filtros,
    );
  },
};
