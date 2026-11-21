import type { ReactNode } from 'react';
import { AutoRefreshStatus } from './AutoRefreshStatus';
import { CopyButton } from './CopyButton';
import { LastUpdated } from './LastUpdated';
import { OfflineBadge } from './OfflineBadge';
import { PortalBreadcrumbs } from './PortalBreadcrumbs';
import { RefreshButton } from './RefreshButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ShareButton } from './ShareButton';
import { PrintButton } from './PrintButton';
import { PrintDocumentHeader } from './PrintDocumentHeader';

type PageHeaderProps = {
  title: string;
  description: string;
  ultimaAtualizacao: Date | null;
  carregando: boolean;
  onRefresh: () => void;
  actions?: ReactNode;
  nomeCondominio?: string;
  nomeMorador?: string;
};

export function PageHeader({
  title,
  description,
  ultimaAtualizacao,
  carregando,
  onRefresh,
  actions,
  nomeCondominio,
  nomeMorador,
}: PageHeaderProps) {
  const online = useOnlineStatus();
  const linkAtual =
    typeof window !== 'undefined'
      ? window.location.href
      : '';

  return (
    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 print:border-0 print:p-0">
      <PrintDocumentHeader
        title={title}
        description={description}
        ultimaAtualizacao={ultimaAtualizacao}
        nomeCondominio={nomeCondominio}
        nomeMorador={nomeMorador}
      />

      <div className="print:hidden">
        <PortalBreadcrumbs />
      </div>

      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 print:hidden">
          <h2 className="break-words text-2xl font-bold tracking-tight text-slate-950">
            {title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            {description}
          </p>
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
            {actions}
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex min-w-0 flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:w-auto">
          <LastUpdated value={ultimaAtualizacao} />
          <AutoRefreshStatus />
          <OfflineBadge />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PrintButton
            documentTitle={title}
            nomeCondominio={nomeCondominio}
            disabled={carregando}
          />

          <ShareButton
            title={`${title} | Condominaria Express`}
            text={description}
            url={linkAtual}
          />

          <CopyButton
            value={linkAtual}
            label="Copiar link"
            copiedLabel="Link copiado"
          />

          <RefreshButton
            onClick={onRefresh}
            loading={carregando}
            disabled={!online}
            label={online ? 'Atualizar dados' : 'Sem conexão'}
          />
        </div>
      </div>
    </section>
  );
}
