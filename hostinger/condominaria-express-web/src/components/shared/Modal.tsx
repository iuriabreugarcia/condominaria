import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { classNames } from '../../lib/classNames';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

type ModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  onClose?: () => void;
};

const sizes: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  onClose,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className={classNames(
          'max-h-[92vh] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl',
          sizes[size],
        )}
      >
        {(title || description || onClose) ? (
          <header className="flex min-w-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              {title ? (
                <h2
                  id="modal-title"
                  className="text-lg font-bold tracking-tight text-slate-950"
                >
                  {title}
                </h2>
              ) : null}

              {description ? (
                <p
                  id="modal-description"
                  className="mt-1 text-sm font-semibold leading-relaxed text-slate-500"
                >
                  {description}
                </p>
              ) : null}
            </div>

            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                aria-label="Fechar modal"
              >
                ×
              </button>
            ) : null}
          </header>
        ) : null}

        <div className="max-h-[65vh] min-w-0 overflow-y-auto px-4 py-4 sm:px-5">
          {children}
        </div>

        {footer ? (
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
