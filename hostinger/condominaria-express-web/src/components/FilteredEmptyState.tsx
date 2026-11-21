import type { LucideIcon } from 'lucide-react';

type FilteredEmptyStateProps = {
  icon: LucideIcon;
  title?: string;
  description?: string;
  onClear: () => void;
};

export function FilteredEmptyState({
  icon: Icon,
  title = 'Nenhum resultado encontrado com os filtros atuais.',
  description = 'Remova ou ajuste os filtros para visualizar mais registros.',
  onClear,
}: FilteredEmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm ring-1 ring-slate-100">
        <Icon className="h-7 w-7" />
      </div>

      <h4 className="mt-4 break-words text-base font-bold text-slate-950">
        {title}
      </h4>

      <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-slate-600">
        {description}
      </p>

      <button
        type="button"
        onClick={onClear}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-orange-200 bg-white px-5 text-sm font-bold text-orange-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
      >
        Limpar filtros
      </button>
    </div>
  );
}
