import type { ReactNode } from 'react';
import { classNames } from '../../lib/classNames';

type FilterBarProps = {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function FilterBar({ children, actions, className }: FilterBarProps) {
  return (
    <section
      className={classNames(
        'mb-5 min-w-0 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {children}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
