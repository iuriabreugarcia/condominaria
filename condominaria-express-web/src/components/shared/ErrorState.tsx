import type { ReactNode } from 'react';
import { ActionButton } from './ActionButton';
import { classNames } from '../../lib/classNames';

type ErrorStateProps = {
  title?: string;
  message?: string;
  actionLabel?: string;
  icon?: ReactNode;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title = 'Não foi possível carregar os dados',
  message = 'Verifique sua conexão ou tente novamente em instantes.',
  actionLabel = 'Tentar novamente',
  icon,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={classNames(
        'flex min-h-[240px] min-w-0 flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50/70 p-6 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm ring-1 ring-rose-100">
          {icon}
        </div>
      ) : (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-bold text-rose-600 shadow-sm ring-1 ring-rose-100">
          !
        </div>
      )}

      <h3 className="max-w-2xl break-words text-lg font-bold text-rose-950">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-rose-700">
        {message}
      </p>

      {onRetry ? (
        <ActionButton
          variant="danger"
          className="mt-4"
          onClick={onRetry}
        >
          {actionLabel}
        </ActionButton>
      ) : null}
    </div>
  );
}
