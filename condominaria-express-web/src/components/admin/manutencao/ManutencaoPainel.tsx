import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { Id, ManutencaoOrdem } from '../../../types/adminModules';
import { useAdminManutencao, useDebouncedValue } from '../../../hooks';
import { PageHeader, Pagination } from '../../shared';
import {
  ManutencaoFiltros,
  type ManutencaoFiltrosValue,
} from './ManutencaoFiltros';
import { ManutencaoLista } from './ManutencaoLista';
import { ManutencaoResumoCards } from './ManutencaoResumoCards';

type ManutencaoPainelProps = {
  condominioId: Id | null | undefined;
  onNovaOrdem?: () => void;
  onEditarOrdem?: (ordem: ManutencaoOrdem) => void;
};

const LIMITE_PADRAO = 10;

export function ManutencaoPainel({
  condominioId,
  onNovaOrdem,
  onEditarOrdem,
}: ManutencaoPainelProps) {
  const [filtros, setFiltros] = useState<ManutencaoFiltrosValue>({});
  const [page, setPage] = useState(1);

  const filtrosDebounced = useDebouncedValue(filtros, 350);

  const filtrosApi = useMemo(
    () => ({
      q: filtrosDebounced.q,
      status: filtrosDebounced.status,
      prioridade: filtrosDebounced.prioridade,
      dataInicio: filtrosDebounced.dataInicio,
      dataFim: filtrosDebounced.dataFim,
      page,
      limit: LIMITE_PADRAO,
    }),
    [
      filtrosDebounced.q,
      filtrosDebounced.status,
      filtrosDebounced.prioridade,
      filtrosDebounced.dataInicio,
      filtrosDebounced.dataFim,
      page,
    ],
  );

  const {
    ordens,
    resumo,
    total,
    page: paginaAtual,
    limit,
    totalPages,
    loading,
    saving,
    error,
    recarregar,
    alterarStatus,
  } = useAdminManutencao({
    condominioId,
    filtros: filtrosApi,
  });

  function handleChangeFiltros(novosFiltros: ManutencaoFiltrosValue) {
    setFiltros(novosFiltros);
    setPage(1);
  }

  function limparFiltros() {
    setFiltros({});
    setPage(1);
  }

  async function handleAlterarStatus(ordem: ManutencaoOrdem, status: string) {
    const titulo = ordem.titulo || `ordem #${ordem.id}`;
    const confirmar = window.confirm(
      `Confirmar alteração da manutenção "${titulo}" para ${status}?`,
    );

    if (!confirmar) {
      return;
    }

    await alterarStatus(ordem.id, status);
  }

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="Administração"
        title="Manutenção"
        description="Acompanhe solicitações, prioridades, execução de serviços e histórico operacional do condomínio."
        actions={
          onNovaOrdem
            ? [
                {
                  label: 'Nova ordem',
                  onClick: onNovaOrdem,
                  icon: <Plus className="h-4 w-4" />,
                },
              ]
            : []
        }
      />

      <ManutencaoResumoCards resumo={resumo} />

      <ManutencaoFiltros
        value={filtros}
        loading={loading}
        onChange={handleChangeFiltros}
        onClear={limparFiltros}
        onRefresh={recarregar}
      />

      <ManutencaoLista
        ordens={ordens}
        loading={loading}
        saving={saving}
        error={error}
        onRetry={recarregar}
        onEditar={onEditarOrdem}
        onAlterarStatus={handleAlterarStatus}
      />

      <Pagination
        page={paginaAtual || page}
        totalPages={totalPages}
        total={total}
        limit={limit || LIMITE_PADRAO}
        onPageChange={setPage}
      />
    </div>
  );
}
