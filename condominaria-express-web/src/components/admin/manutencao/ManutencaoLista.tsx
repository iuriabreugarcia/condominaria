import type { ManutencaoOrdem } from '../../../types/adminModules';
import { DataState } from '../../shared';
import { ManutencaoOrdemCard } from './ManutencaoOrdemCard';

type ManutencaoListaProps = {
  ordens: ManutencaoOrdem[];
  loading?: boolean;
  saving?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onEditar?: (ordem: ManutencaoOrdem) => void;
  onAlterarStatus?: (ordem: ManutencaoOrdem, status: string) => void;
};

export function ManutencaoLista({
  ordens,
  loading = false,
  saving = false,
  error = null,
  onRetry,
  onEditar,
  onAlterarStatus,
}: ManutencaoListaProps) {
  return (
    <DataState
      loading={loading}
      error={error}
      empty={ordens.length === 0}
      loadingMessage="Carregando ordens de manutenção..."
      emptyTitle="Nenhuma manutenção encontrada"
      emptyDescription="Quando houver ordens de manutenção cadastradas, elas aparecerão aqui."
      onRetry={onRetry}
    >
      <div className="grid min-w-0 grid-cols-1 gap-3">
        {ordens.map((ordem) => (
          <ManutencaoOrdemCard
            key={String(ordem.id)}
            ordem={ordem}
            saving={saving}
            onEditar={onEditar}
            onAlterarStatus={onAlterarStatus}
          />
        ))}
      </div>
    </DataState>
  );
}
