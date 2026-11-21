import { classNames } from '../../lib/classNames';

type PaginationProps = {
  page: number;
  totalPages: number;
  total?: number;
  limit?: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function gerarPaginas(page: number, totalPages: number) {
  const inicio = Math.max(1, page - 2);
  const fim = Math.min(totalPages, page + 2);

  return Array.from({ length: fim - inicio + 1 }, (_, index) => inicio + index);
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  className,
}: PaginationProps) {
  const paginaAtual = Math.min(Math.max(1, page), Math.max(1, totalPages));
  const totalPaginas = Math.max(1, totalPages);
  const paginas = gerarPaginas(paginaAtual, totalPaginas);

  if (totalPaginas <= 1 && !total) {
    return null;
  }

  const inicioRegistro =
    total && limit ? Math.min(total, (paginaAtual - 1) * limit + 1) : null;

  const fimRegistro =
    total && limit ? Math.min(total, paginaAtual * limit) : null;

  return (
    <nav
      className={classNames(
        'mt-5 flex min-w-0 flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      aria-label="Paginação"
    >
      <div className="text-sm font-bold text-slate-500">
        {inicioRegistro && fimRegistro && total ? (
          <>
            Exibindo{' '}
            <span className="font-bold text-slate-800">
              {inicioRegistro}-{fimRegistro}
            </span>{' '}
            de <span className="font-bold text-slate-800">{total}</span>
          </>
        ) : (
          <>
            Página <span className="font-bold text-slate-800">{paginaAtual}</span>{' '}
            de <span className="font-bold text-slate-800">{totalPaginas}</span>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={paginaAtual <= 1}
          onClick={() => onPageChange(Math.max(1, paginaAtual - 1))}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Anterior
        </button>

        {paginas.map((numeroPagina) => {
          const ativo = numeroPagina === paginaAtual;

          return (
            <button
              key={numeroPagina}
              type="button"
              onClick={() => onPageChange(numeroPagina)}
              className={classNames(
                'inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-bold transition',
                ativo
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
              aria-current={ativo ? 'page' : undefined}
            >
              {numeroPagina}
            </button>
          );
        })}

        <button
          type="button"
          disabled={paginaAtual >= totalPaginas}
          onClick={() => onPageChange(Math.min(totalPaginas, paginaAtual + 1))}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}
