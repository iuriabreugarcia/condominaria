import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { classNames } from '../../lib/classNames';

type ActionButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'ghost';

type ActionButtonSize = 'sm' | 'md' | 'lg';

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  icon?: ReactNode;
  loading?: boolean;
};

const variants: Record<ActionButtonVariant, string> = {
  primary: 'bg-orange-600 text-white shadow-sm hover:bg-orange-700',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
  success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950',
};

const sizes: Record<ActionButtonSize, string> = {
  sm: 'min-h-9 rounded-xl px-3 text-xs',
  md: 'min-h-11 rounded-2xl px-4 text-sm',
  lg: 'min-h-12 rounded-2xl px-5 text-sm',
};

export function ActionButton({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  children,
  className,
  type = 'button',
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={classNames(
        'inline-flex max-w-full select-none items-center justify-center gap-2 font-bold leading-none transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}

      {children ? <span className="min-w-0 truncate">{children}</span> : null}
    </button>
  );
}
