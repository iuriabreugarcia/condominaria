import type { ReactNode } from 'react';
import { classNames } from '../../lib/classNames';

type SectionCardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  description,
  children,
  aside,
  className,
}: SectionCardProps) {
  return (
    <section
      className={classNames(
        'min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5',
        className,
      )}
    >
      {(title || description || aside) ? (
        <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {title ? (
              <h2 className="break-words text-lg font-bold tracking-tight text-slate-950">
                {title}
              </h2>
            ) : null}

            {description ? (
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">
                {description}
              </p>
            ) : null}
          </div>

          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
      ) : null}

      <div className="min-w-0">{children}</div>
    </section>
  );
}
