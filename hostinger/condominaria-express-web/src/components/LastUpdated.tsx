import { Clock3 } from 'lucide-react';

type LastUpdatedProps = {
  value: Date | null;
};

export function LastUpdated({
  value,
}: LastUpdatedProps) {
  if (!value) {
    return null;
  }

  const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
      <Clock3 className="h-3.5 w-3.5 text-orange-600" />
      Última atualização: {dataFormatada}
    </div>
  );
}
