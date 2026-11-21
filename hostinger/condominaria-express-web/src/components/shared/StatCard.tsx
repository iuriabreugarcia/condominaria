import type { ReactNode } from 'react';
import { classNames } from '../../lib/classNames';

type StatCardVariant = 'orange' | 'blue' | 'green' | 'red' | 'slate';

type StatCardProps = {
  title: string;
  value: ReactNode;
  description?: string;
  icon?: ReactNode;
  variant?: StatCardVariant;
  className?: string;
};

const variants: Record<StatCardVariant, string> = {
  orange: 'bg-orange-50 text-orange-700 ring-orange-100',
  blue: 'bg-sky-50 text-sky-700 ring-sky-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  red: 'bg-rose-50 text-rose-700 ring-rose-100',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export function StatCard({
  title,
  value,
  description,
  icon,
  variant = 'orange',
  className,
}: StatCardProps) {
  return (
    <article
      className={classNames(
        'group min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md sm:p-5',
        className,
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {title}
          </p>

          <strong className="mt-2 block min-w-0 truncate text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {value}
          </strong>

          {description ? (
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-500">
              {description}
            </p>
          ) : null}
        </div>

        {icon ? (
          <div
            className={classNames(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 transition group-hover:scale-[1.03]',
              variants[variant],
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </article>
  );
}
