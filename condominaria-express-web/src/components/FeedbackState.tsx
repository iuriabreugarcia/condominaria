import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  X,
} from 'lucide-react';

type LoadingStateProps = {
  message?: string;
};

type ErrorStateProps = {
  message: string;
  onClose?: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

type SuccessStateProps = {
  message: string;
  onClose?: () => void;
};

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function LoadingState({
  message = 'Carregando...',
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:hidden"
    >
      <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
        <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-orange-600" />
        <span>{message}</span>
      </div>
    </div>
  );
}

export function ErrorState({
  message,
  onClose,
  actionLabel,
  onAction,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm print:hidden"
    >
      <div className="flex min-w-0 flex-col gap-4 text-sm font-bold text-red-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span className="min-w-0 break-words">{message}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 bg-white px-3 text-xs font-bold text-red-700 transition hover:bg-red-100"
            >
              {actionLabel}
            </button>
          ) : null}

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar mensagem de erro"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-200 bg-white text-red-700 transition hover:bg-red-100"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SuccessState({
  message,
  onClose,
}: SuccessStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm print:hidden"
    >
      <div className="flex min-w-0 flex-col gap-4 text-sm font-bold text-emerald-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span className="min-w-0 break-words">{message}</span>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar mensagem de sucesso"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 transition hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm ring-1 ring-slate-100">
        <Icon className="h-7 w-7" />
      </div>

      <h4 className="mt-4 break-words text-base font-bold text-slate-950">
        {title}
      </h4>

      <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}
