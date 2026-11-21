import type { ReactNode } from 'react';
import { classNames } from '../../lib/classNames';

type StatusBadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'orange';

type StatusBadgeProps = {
  children: ReactNode;
  variant?: StatusBadgeVariant;
  className?: string;
  title?: string;
};

const variantes: Record<StatusBadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
};

function titleFromChildren(children: ReactNode) {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }

  return undefined;
}

export function StatusBadge({
  children,
  variant = 'neutral',
  className,
  title,
}: StatusBadgeProps) {
  return (
    <span
      className={classNames(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase leading-none tracking-[0.08em] ring-1',
        variantes[variant],
        className,
      )}
      title={title ?? titleFromChildren(children)}
    >
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}
