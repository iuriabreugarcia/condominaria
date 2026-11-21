import { classNames } from '../../lib/classNames';

type LoadingStateProps = {
  message?: string;
  className?: string;
};

export function LoadingState({
  message = 'Carregando informações...',
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={classNames(
        'flex min-h-[220px] min-w-0 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm',
        className,
      )}
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-600" />

      <p className="mt-4 text-sm font-bold text-slate-600">
        {message}
      </p>
    </div>
  );
}
