import { type RefObject, useEffect } from 'react';

type UseSearchShortcutParams = {
  inputRef: RefObject<HTMLInputElement | null>;
  enabled?: boolean;
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

export function useSearchShortcut({
  inputRef,
  enabled = true,
}: UseSearchShortcutParams) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function lidarComAtalhos(event: KeyboardEvent) {
      if (
        event.key === '/' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !usuarioDigitandoEmCampo()
      ) {
        event.preventDefault();

        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }

      if (
        event.key === 'Escape' &&
        document.activeElement === inputRef.current
      ) {
        inputRef.current?.blur();
      }
    }

    window.addEventListener('keydown', lidarComAtalhos);

    return () => {
      window.removeEventListener('keydown', lidarComAtalhos);
    };
  }, [enabled, inputRef]);
}
