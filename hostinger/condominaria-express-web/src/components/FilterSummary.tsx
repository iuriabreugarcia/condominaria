import { X } from 'lucide-react';

type FilterChip = {
  label: string;
  onRemove?: () => void;
};

type FilterSummaryProps = {
  total: number;
  exibidos: number;
  singular: string;
  plural: string;
  filtrosAtivos?: Array<FilterChip | null | undefined | false>;
};

export function FilterSummary({
  total,
  exibidos,
  singular,
  plural,
  filtrosAtivos = [],
}: FilterSummaryProps) {
  const filtros = filtrosAtivos.filter(
    (item): item is FilterChip =>
      Boolean(
        item &&
        typeof item === 'object' &&
        item.label.trim().length > 0,
      ),
  );

  const rotuloRegistro = exibidos === 1 ? singular : plural;

  return (
    <>
      <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-slate-900">
            {exibidos} de {total} {rotuloRegistro} exibido{exibidos === 1 ? '' : 's'}
          </p>

          {filtros.length > 0 ? (
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-600">
              {filtros.length} filtro{filtros.length === 1 ? '' : 's'} ativo{filtros.length === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>

        {filtros.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {filtros.map((filtro) =>
              filtro.onRemove ? (
                <button
                  key={filtro.label}
                  type="button"
                  onClick={filtro.onRemove}
                  className="inline-flex max-w-full items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800 transition hover:bg-orange-200"
                  aria-label={`Remover filtro ${filtro.label}`}
                >
                  <span className="truncate">{filtro.label}</span>
                  <X className="h-3.5 w-3.5 shrink-0" />
                </button>
              ) : (
                <span
                  key={filtro.label}
                  className="inline-flex max-w-full rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800"
                >
                  <span className="truncate">{filtro.label}</span>
                </span>
              ),
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Nenhum filtro aplicado.
          </p>
        )}
      </div>

      {filtros.length > 0 ? (
        <section className="mb-5 hidden rounded-2xl border border-slate-300 p-4 print:block">
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-800">
            Filtros aplicados
          </h3>

          <p className="mt-2 text-xs font-bold text-slate-700">
            {exibidos} de {total} {rotuloRegistro} exibido{exibidos === 1 ? '' : 's'}
          </p>

          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-bold text-slate-800">
            {filtros.map((filtro) => (
              <li key={filtro.label}>
                {filtro.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
