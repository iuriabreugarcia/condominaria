import { RefreshCw } from 'lucide-react';

type RefreshButtonProps = {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
};

export function RefreshButton({
  onClick,
  loading = false,
  disabled = false,
  label = 'Atualizar dados',
}: RefreshButtonProps) {
  const bloqueado = loading || disabled;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={bloqueado}
      aria-busy={loading}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw
        className={['h-4 w-4', loading ? 'animate-spin' : ''].join(' ')}
        aria-hidden="true"
      />

      <span aria-live="polite">
        {loading ? 'Atualizando...' : label}
      </span>
    </button>
  );
}
