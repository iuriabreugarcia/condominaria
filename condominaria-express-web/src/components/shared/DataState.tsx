import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

type DataStateProps = {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  children: ReactNode;
};

export function DataState({
  loading = false,
  error = null,
  empty = false,
  loadingMessage = 'Carregando informações...',
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription = 'Quando houver informações cadastradas, elas aparecerão aqui.',
  onRetry,
  children,
}: DataStateProps) {
  if (loading) {
    return <LoadingState message={loadingMessage} />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={onRetry}
      />
    );
  }

  if (empty) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return <>{children}</>;
}
