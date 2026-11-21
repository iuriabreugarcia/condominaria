import { useEffect } from 'react';

type UseCloseFiltersShortcutParams = {
  aberto: boolean;
  onClose: () => void;
};

function usuarioDigitandoEmCampo() {
  const elementoAtivo = document.activeElement;

  if (!(elementoAtivo instanceof HTMLElement)) {
    return false;
  }

  const tag = elementoAtivo.tagName.toLowerCase();

  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    elementoAtivo.isContentEditable
  );
}

export function useCloseFiltersShortcut({
  aberto,
  onClose,
}: UseCloseFiltersShortcutParams) {
  useEffect(() => {
    if (!aberto) {
      return;
    }

    function fecharComEsc(event: KeyboardEvent) {
      if (event.key !== 'Escape' || usuarioDigitandoEmCampo()) {
        return;
      }

      onClose();
    }

    window.addEventListener('keydown', fecharComEsc);

    return () => {
      window.removeEventListener('keydown', fecharComEsc);
    };
  }, [aberto, onClose]);
}
