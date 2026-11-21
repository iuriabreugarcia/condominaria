import {
  Check,
  Copy,
} from 'lucide-react';
import { useState } from 'react';

type CopyButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
};

function copiarComFallback(valor: string) {
  const textarea = document.createElement('textarea');

  textarea.value = valor;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';

  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  const copiado = document.execCommand('copy');

  document.body.removeChild(textarea);

  return copiado;
}

export function CopyButton({
  value,
  label = 'Copiar',
  copiedLabel = 'Copiado',
}: CopyButtonProps) {
  const [copiado, setCopiado] = useState(false);

  async function copiarTexto() {
    let sucesso = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        sucesso = true;
      } else {
        sucesso = copiarComFallback(value);
      }
    } catch {
      sucesso = copiarComFallback(value);
    }

    setCopiado(sucesso);

    if (sucesso) {
      window.setTimeout(() => {
        setCopiado(false);
      }, 1800);
    }
  }

  return (
    <button
      type="button"
      onClick={copiarTexto}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
      aria-label={copiado ? copiedLabel : label}
    >
      {copiado ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}

      {copiado ? copiedLabel : label}
    </button>
  );
}
