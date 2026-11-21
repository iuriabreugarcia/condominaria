import type { ReactNode } from 'react';
import { classNames } from '../../lib/classNames';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={classNames(
        'flex min-h-[220px] min-w-0 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm ring-1 ring-slate-100">
          {icon}
        </div>
      ) : null}

      <h3 className="max-w-2xl break-words text-lg font-bold text-slate-950">
        {title}
      </h3>

      {description ? (
        <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-500">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
