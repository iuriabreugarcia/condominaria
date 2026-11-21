import {
  CircleHelp,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
} from 'react';

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

export function KeyboardShortcutsHelp() {
  const [aberto, setAberto] = useState(false);
  const abrirButtonRef = useRef<HTMLButtonElement | null>(null);
  const fecharButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLElement | null>(null);

  function abrirAjuda() {
    setAberto(true);
  }

  function fecharAjuda() {
    setAberto(false);

    window.setTimeout(() => {
      abrirButtonRef.current?.focus();
    }, 0);
  }

  useEffect(() => {
    function lidarComAtalhos(event: KeyboardEvent) {
      if (
        event.key === '?' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !usuarioDigitandoEmCampo()
      ) {
        event.preventDefault();
        abrirAjuda();
      }

      if (event.key === 'Escape' && aberto) {
        fecharAjuda();
      }
    }

    window.addEventListener('keydown', lidarComAtalhos);

    return () => {
      window.removeEventListener('keydown', lidarComAtalhos);
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) {
      return;
    }

    function manterFocoDentroDoModal(event: KeyboardEvent) {
      if (event.key !== 'Tab') {
        return;
      }

      const modal = modalRef.current;

      if (!modal) {
        return;
      }

      const elementosFocaveis = Array.from(
        modal.querySelectorAll<HTMLElement>(
          [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
          ].join(','),
        ),
      );

      if (elementosFocaveis.length === 0) {
        event.preventDefault();
        fecharButtonRef.current?.focus();
        return;
      }

      const primeiro = elementosFocaveis[0];
      const ultimo =
        elementosFocaveis[elementosFocaveis.length - 1];
      const ativo = document.activeElement;

      if (event.shiftKey && ativo === primeiro) {
        event.preventDefault();
        ultimo.focus();
        return;
      }

      if (!event.shiftKey && ativo === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    }

    window.addEventListener('keydown', manterFocoDentroDoModal);

    return () => {
      window.removeEventListener('keydown', manterFocoDentroDoModal);
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) {
      return;
    }

    function fecharComQualquerCliqueDoMouse(event: MouseEvent) {
      if (event.button !== 0) {
        return;
      }

      fecharAjuda();
    }

    window.addEventListener('mousedown', fecharComQualquerCliqueDoMouse);

    return () => {
      window.removeEventListener('mousedown', fecharComQualquerCliqueDoMouse);
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) {
      return;
    }

    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => {
      fecharButtonRef.current?.focus();
    }, 40);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberto]);

  return (
    <>
      <button
        ref={abrirButtonRef}
        type="button"
        onClick={abrirAjuda}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-label="Abrir atalhos do Portal"
        className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-xl shadow-slate-300/50 transition hover:-translate-y-1 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
      >
        <CircleHelp className="h-4 w-4 text-orange-600" />

        <span className="hidden sm:inline">
          Atalhos
        </span>

        <span className="sm:hidden">
          ?
        </span>
      </button>

      {aberto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-atalhos"
          className="fixed inset-0 z-[140] flex cursor-default items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
        >
          <section
            ref={modalRef}
            className="w-full max-w-xl cursor-default rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl md:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">
                  Produtividade
                </p>

                <h2
                  id="titulo-atalhos"
                  className="mt-2 text-2xl font-bold tracking-tight text-slate-950"
                >
                  Atalhos do Portal
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use o teclado para navegar mais rápido nas páginas com filtros.
                </p>
              </div>

              <button
                ref={fecharButtonRef}
                type="button"
                onClick={fecharAjuda}
                aria-label="Fechar ajuda de atalhos"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              <article className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                    <Search className="h-5 w-5" />
                  </span>

                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      Focar a busca
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Disponível nas páginas com listagens filtráveis.
                    </p>
                  </div>
                </div>

                <kbd className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm">
                  /
                </kbd>
              </article>

              <article className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                    <Search className="h-5 w-5" />
                  </span>

                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      Sair da busca
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Remove o foco do campo de pesquisa.
                    </p>
                  </div>
                </div>

                <kbd className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm">
                  Esc
                </kbd>
              </article>

              <article className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                    <SlidersHorizontal className="h-5 w-5" />
                  </span>

                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      Fechar filtros no mobile
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Funciona quando o painel de filtros estiver aberto.
                    </p>
                  </div>
                </div>

                <kbd className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm">
                  Esc
                </kbd>
              </article>
            </div>

            <p className="mt-5 rounded-2xl bg-orange-50 px-4 py-3 text-xs font-bold leading-5 text-orange-800">
              Dica: pressione <strong>?</strong> em qualquer tela do Portal para abrir esta ajuda novamente.
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}
