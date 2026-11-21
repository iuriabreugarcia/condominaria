import type { InputHTMLAttributes } from 'react';
import { classNames } from '../../lib/classNames';

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  onClear?: () => void;
};

export function SearchInput({
  value,
  onClear,
  className,
  placeholder = 'Buscar...',
  ...props
}: SearchInputProps) {
  const hasValue = String(value ?? '').length > 0;

  return (
    <div className="relative min-w-0">
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        className={classNames(
          'min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-11 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden',
          className,
        )}
        {...props}
      />

      {hasValue && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-lg font-bold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          aria-label="Limpar busca"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
