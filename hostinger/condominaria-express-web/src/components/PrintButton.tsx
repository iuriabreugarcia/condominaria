import {
  LoaderCircle,
  Printer,
} from 'lucide-react';

type PrintButtonProps = {
  documentTitle?: string;
  nomeCondominio?: string;
  disabled?: boolean;
};

function normalizarTituloArquivo(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function dataHoraParaNomeArquivo() {
  const agora = new Date();

  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const ano = agora.getFullYear();

  const horas = String(agora.getHours()).padStart(2, '0');
  const minutos = String(agora.getMinutes()).padStart(2, '0');

  return `${dia}-${mes}-${ano} ${horas}-${minutos}`;
}

export function PrintButton({
  documentTitle = 'Portal do Morador',
  nomeCondominio,
  disabled = false,
}: PrintButtonProps) {
  function imprimirPagina() {
    if (disabled) {
      return;
    }

    const tituloAnterior = document.title;

    const partesTitulo = [
      normalizarTituloArquivo(documentTitle),
      nomeCondominio
        ? normalizarTituloArquivo(nomeCondominio)
        : '',
      dataHoraParaNomeArquivo(),
      'Condominaria Express',
    ].filter(Boolean);

    document.title = partesTitulo.join(' - ');

    function restaurarTitulo() {
      document.title = tituloAnterior;
    }

    window.addEventListener('afterprint', restaurarTitulo, {
      once: true,
    });

    window.print();

    window.setTimeout(() => {
      restaurarTitulo();
    }, 1500);
  }

  return (
    <button
      type="button"
      onClick={imprimirPagina}
      disabled={disabled}
      aria-busy={disabled}
      aria-label={
        disabled
          ? 'Preparando impressão. Aguarde o carregamento dos dados.'
          : 'Imprimir esta página'
      }
      title={
        disabled
          ? 'Aguarde o carregamento dos dados para imprimir.'
          : 'Imprimir esta página'
      }
      className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60 print:hidden"
    >
      {disabled ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Printer className="h-3.5 w-3.5" />
      )}

      <span aria-live="polite">
        {disabled ? 'Preparando...' : 'Imprimir'}
      </span>
    </button>
  );
}
