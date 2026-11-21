export function PrintDocumentFooter() {
  const urlAtual =
    typeof window !== 'undefined'
      ? window.location.href
      : '';

  const caminhoAtual =
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : '';

  const dataImpressao = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());

  return (
    <footer className="mt-8 hidden break-inside-avoid border-t border-slate-300 pt-4 print:block">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700">
        Portal do Morador • Condominaria Express
      </p>

      {caminhoAtual ? (
        <p className="mt-2 text-[11px] font-bold leading-5 text-slate-600">
          Módulo impresso: {caminhoAtual}
        </p>
      ) : null}

      {urlAtual ? (
        <p className="mt-1 break-all text-[11px] font-bold leading-5 text-slate-600">
          Página impressa a partir de: {urlAtual}
        </p>
      ) : null}

      <p className="mt-1 text-[11px] font-bold leading-5 text-slate-600">
        Impressão gerada em: {dataImpressao}
      </p>
    </footer>
  );
}
