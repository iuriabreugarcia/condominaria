import type { ReactNode } from 'react';
import { classNames } from '../../lib/classNames';

type PageToolbarProps = {
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageToolbar({
  children,
  actions,
  className,
}: PageToolbarProps) {
  return (
    <section
      className={classNames(
        'mb-5 min-w-0 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        {children ? (
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {children}
          </div>
        ) : null}

        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
