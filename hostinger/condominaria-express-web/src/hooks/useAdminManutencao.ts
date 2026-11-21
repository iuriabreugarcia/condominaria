import { useCallback, useEffect, useMemo, useState } from 'react';
import { manutencaoApi } from '../services';
import { friendlyErrorMessage } from '../lib/friendlyErrorMessage';
import type {
  AdminFilters,
  ApiListResponse,
  Id,
  ManutencaoOrdem,
  ManutencaoResumo,
} from '../types/adminModules';

type UseAdminManutencaoOptions = {
  condominioId: Id | null | undefined;
  filtros?: AdminFilters;
  autoLoad?: boolean;
};

type UseAdminManutencaoState = {
  ordens: ManutencaoOrdem[];
  resumo: ManutencaoResumo | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
};

function normalizarLista(
  response: ApiListResponse<ManutencaoOrdem>,
): Pick<UseAdminManutencaoState, 'ordens' | 'total' | 'page' | 'limit' | 'totalPages'> {
  const items = response.items ?? [];
  const total = Number(response.total ?? items.length);
  const page = Number(response.page ?? 1);
  const limit = Number(response.limit ?? items.length);
  const totalPages = Number(response.totalPages ?? 1);

  return {
    ordens: items,
    total: Number.isFinite(total) ? total : items.length,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : items.length,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
  };
}

export function useAdminManutencao({
  condominioId,
  filtros = {},
  autoLoad = true,
}: UseAdminManutencaoOptions) {
  const [state, setState] = useState<UseAdminManutencaoState>({
    ordens: [],
    resumo: null,
    total: 0,
    page: 1,
    limit: 0,
    totalPages: 1,
    loading: autoLoad,
    saving: false,
    error: null,
  });

  const filtrosMemo = useMemo(
    () => ({
      q: filtros.q,
      status: filtros.status,
      prioridade: filtros.prioridade,
      page: filtros.page,
      limit: filtros.limit,
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
    }),
    [
      filtros.q,
      filtros.status,
      filtros.prioridade,
      filtros.page,
      filtros.limit,
      filtros.dataInicio,
      filtros.dataFim,
    ],
  );

  const carregar = useCallback(async () => {
    if (!condominioId) {
      setState((atual) => ({
        ...atual,
        ordens: [],
        resumo: null,
        total: 0,
        page: 1,
        limit: 0,
        totalPages: 1,
        loading: false,
        error: 'Nenhum condomínio selecionado para carregar as manutenções.',
      }));
      return;
    }

    setState((atual) => ({
      ...atual,
      loading: true,
      error: null,
    }));

    try {
      const [listaResponse, resumoResponse] = await Promise.all([
        manutencaoApi.listar(condominioId, filtrosMemo),
        manutencaoApi.resumo(condominioId),
      ]);

      const lista = normalizarLista(listaResponse);

      setState((atual) => ({
        ...atual,
        ...lista,
        resumo: resumoResponse,
        loading: false,
        error: null,
      }));
    } catch (error) {
      setState((atual) => ({
        ...atual,
        loading: false,
        error: friendlyErrorMessage(
          error,
          'Não foi possível carregar as ordens de manutenção.',
        ),
      }));
    }
  }, [condominioId, filtrosMemo]);

  const alterarStatus = useCallback(
    async (ordemId: Id, status: string) => {
      if (!condominioId) {
        throw new Error('Nenhum condomínio selecionado para alterar a manutenção.');
      }

      setState((atual) => ({
        ...atual,
        saving: true,
        error: null,
      }));

      try {
        await manutencaoApi.alterarStatus(condominioId, ordemId, status);
        await carregar();
      } catch (error) {
        const message = friendlyErrorMessage(
          error,
          'Não foi possível alterar o status da manutenção.',
        );

        setState((atual) => ({
          ...atual,
          saving: false,
          error: message,
        }));

        throw error;
      } finally {
        setState((atual) => ({
          ...atual,
          saving: false,
        }));
      }
    },
    [carregar, condominioId],
  );

  useEffect(() => {
    if (autoLoad) {
      void carregar();
    }
  }, [autoLoad, carregar]);

  return {
    ...state,
    carregar,
    recarregar: carregar,
    alterarStatus,
  };
}
