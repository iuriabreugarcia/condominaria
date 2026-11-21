import { Share2 } from 'lucide-react';
import {
  useEffect,
  useState,
} from 'react';

type ShareButtonProps = {
  title: string;
  text?: string;
  url: string;
};

export function ShareButton({
  title,
  text,
  url,
}: ShareButtonProps) {
  const [disponivel, setDisponivel] = useState(false);

  useEffect(() => {
    setDisponivel(
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function',
    );
  }, []);

  async function compartilhar() {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
    } catch {
      // O usuário pode cancelar o compartilhamento.
    }
  }

  if (!disponivel) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={compartilhar}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
    >
      <Share2 className="h-3.5 w-3.5" />
      Compartilhar
    </button>
  );
}
