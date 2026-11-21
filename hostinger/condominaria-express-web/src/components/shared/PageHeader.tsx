import type { ReactNode } from 'react';
import { classNames } from '../../lib/classNames';

type PageHeaderAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary';
};

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: PageHeaderAction[];
  children?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions = [],
  children,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={classNames(
        'mb-5 min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-5',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {title}
          </h1>

          {description ? (
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-slate-500">
              {description}
            </p>
          ) : null}
        </div>

        {actions.length > 0 ? (
          <div className="flex min-w-0 shrink-0 flex-wrap gap-2 lg:justify-end">
            {actions.map((action) => {
              const baseClass =
                'inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2';

              const variantClass =
                action.variant === 'secondary'
                  ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  : 'bg-orange-600 text-white shadow-sm hover:bg-orange-700';

              const content = (
                <>
                  {action.icon ? <span className="shrink-0">{action.icon}</span> : null}
                  <span className="min-w-0 truncate">{action.label}</span>
                </>
              );

              if (action.href) {
                return (
                  <a
                    key={`${action.label}-${action.href}`}
                    href={action.href}
                    className={classNames(baseClass, variantClass)}
                  >
                    {content}
                  </a>
                );
              }

              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={classNames(baseClass, variantClass)}
                >
                  {content}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {children ? <div className="mt-4 min-w-0">{children}</div> : null}
    </section>
  );
}
