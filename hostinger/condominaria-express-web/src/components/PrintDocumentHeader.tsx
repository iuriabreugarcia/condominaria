type PrintDocumentHeaderProps = {
  title: string;
  description?: string;
  ultimaAtualizacao?: Date | null;
  nomeCondominio?: string;
  nomeMorador?: string;
};

export function PrintDocumentHeader({
  title,
  description,
  ultimaAtualizacao,
  nomeCondominio,
  nomeMorador,
}: PrintDocumentHeaderProps) {
  const formatadorDataHora = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const dataGeracao = formatadorDataHora.format(new Date());

  const dadosAtualizadosEm = ultimaAtualizacao
    ? formatadorDataHora.format(ultimaAtualizacao)
    : null;

  return (
    <header className="hidden border-b border-slate-300 pb-5 print:block">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">
        Condominaria Express
      </p>

      {nomeCondominio ? (
        <p className="mt-2 text-sm font-bold text-slate-800">
          {nomeCondominio}
        </p>
      ) : null}

      {nomeMorador ? (
        <p className="mt-1 text-xs font-bold text-slate-700">
          Morador: {nomeMorador}
        </p>
      ) : null}

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
        {title}
      </h1>

      {description ? (
        <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-700">
          {description}
        </p>
      ) : null}

      <div className="mt-3 space-y-1 text-xs font-bold text-slate-600">
        {dadosAtualizadosEm ? (
          <p>
            Dados atualizados em {dadosAtualizadosEm}
          </p>
        ) : null}

        <p>
          Documento gerado em {dataGeracao}
        </p>
      </div>
    </header>
  );
}
