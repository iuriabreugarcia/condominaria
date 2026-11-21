import type { ReactNode } from 'react';
import { ActionButton } from './ActionButton';
import { Modal } from './Modal';

type ConfirmDialogVariant = 'danger' | 'primary' | 'success';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const confirmVariant =
    variant === 'danger' ? 'danger' : variant === 'success' ? 'success' : 'primary';

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      size="sm"
      onClose={loading ? undefined : onCancel}
      footer={
        <>
          <ActionButton
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </ActionButton>

          <ActionButton
            variant={confirmVariant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </ActionButton>
        </>
      }
    >
      {children ? (
        <div className="text-sm font-semibold leading-relaxed text-slate-600">
          {children}
        </div>
      ) : null}
    </Modal>
  );
}
