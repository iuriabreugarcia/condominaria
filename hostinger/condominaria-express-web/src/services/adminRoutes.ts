import type { Id } from '../types/adminModules';

function baseCondominio(condominioId: Id) {
  return `/condominios/${condominioId}`;
}

function detalhe(base: string, id: Id) {
  return `${base}/${id}`;
}

export const adminRoutes = {
  condominio(condominioId: Id) {
    return baseCondominio(condominioId);
  },

  documentos: {
    listar(condominioId: Id) {
      return `${baseCondominio(condominioId)}/documentos`;
    },

    portal(condominioId: Id) {
      return `${baseCondominio(condominioId)}/documentos/portal`;
    },

    detalhe(condominioId: Id, documentoId: Id) {
      return detalhe(this.listar(condominioId), documentoId);
    },

    publicar(condominioId: Id, documentoId: Id) {
      return `${this.detalhe(condominioId, documentoId)}/publicar`;
    },

    arquivar(condominioId: Id, documentoId: Id) {
      return `${this.detalhe(condominioId, documentoId)}/arquivar`;
    },
  },

  manutencoes: {
    listar(condominioId: Id) {
      return `${baseCondominio(condominioId)}/manutencoes`;
    },

    resumo(condominioId: Id) {
      return `${this.listar(condominioId)}/resumo`;
    },

    detalhe(condominioId: Id, ordemId: Id) {
      return detalhe(this.listar(condominioId), ordemId);
    },

    status(condominioId: Id, ordemId: Id) {
      return `${this.detalhe(condominioId, ordemId)}/status`;
    },
  },

  contratos: {
    listar(condominioId: Id) {
      return `${baseCondominio(condominioId)}/contratos`;
    },

    resumo(condominioId: Id) {
      return `${this.listar(condominioId)}/resumo`;
    },

    detalhe(condominioId: Id, contratoId: Id) {
      return detalhe(this.listar(condominioId), contratoId);
    },

    status(condominioId: Id, contratoId: Id) {
      return `${this.detalhe(condominioId, contratoId)}/status`;
    },
  },

  prestadores: {
    listar(condominioId: Id) {
      return `${baseCondominio(condominioId)}/prestadores`;
    },

    detalhe(condominioId: Id, prestadorId: Id) {
      return detalhe(this.listar(condominioId), prestadorId);
    },

    status(condominioId: Id, prestadorId: Id) {
      return `${this.detalhe(condominioId, prestadorId)}/status`;
    },
  },

  relatorios: {
    geral(condominioId: Id) {
      return `${baseCondominio(condominioId)}/relatorios/geral`;
    },

    auditoria(condominioId: Id) {
      return `${baseCondominio(condominioId)}/auditoria`;
    },
  },
};
