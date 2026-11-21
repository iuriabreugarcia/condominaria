import {
  CalendarClock,
  CheckCircle2,
  MapPin,
  Pencil,
  PlayCircle,
  UserRound,
  XCircle,
} from 'lucide-react';
import type { ManutencaoOrdem } from '../../../types/adminModules';
import { formatCurrency, formatDateTime } from '../../../lib';
import { ActionButton, KeyValueList } from '../../shared';
import {
  ManutencaoPrioridadeBadge,
  ManutencaoStatusBadge,
} from './ManutencaoBadges';

type ManutencaoOrdemCardProps = {
  ordem: ManutencaoOrdem;
  saving?: boolean;
  onEditar?: (ordem: ManutencaoOrdem) => void;
  onAlterarStatus?: (ordem: ManutencaoOrdem, status: string) => void;
};

function texto(valor: unknown, fallback = '-') {
  const normalizado = String(valor ?? '').trim();

  return normalizado || fallback;
}

export function ManutencaoOrdemCard({
  ordem,
  saving = false,
  onEditar,
  onAlterarStatus,
}: ManutencaoOrdemCardProps) {
  const valorEstimado = ordem.valorEstimado ?? null;
  const valorFinal = ordem.valorFinal ?? null;

  return (
    <article className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md sm:p-5">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap gap-2">
            <ManutencaoStatusBadge status={ordem.status} />
            <ManutencaoPrioridadeBadge prioridade={ordem.prioridade} />
          </div>

          <h2 className="text-lg font-bold tracking-tight text-slate-950">
            {texto(ordem.titulo, 'Ordem de manutenção')}
          </h2>

          {ordem.descricao ? (
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              {ordem.descricao}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {onEditar ? (
            <ActionButton
              variant="secondary"
              size="sm"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => onEditar(ordem)}
            >
              Editar
            </ActionButton>
          ) : null}

          {onAlterarStatus ? (
            <>
              <ActionButton
                variant="secondary"
                size="sm"
                icon={<PlayCircle className="h-4 w-4" />}
                disabled={saving}
                onClick={() => onAlterarStatus(ordem, 'EM_ANDAMENTO')}
              >
                Iniciar
              </ActionButton>

              <ActionButton
                variant="success"
                size="sm"
                icon={<CheckCircle2 className="h-4 w-4" />}
                disabled={saving}
                onClick={() => onAlterarStatus(ordem, 'CONCLUIDA')}
              >
                Concluir
              </ActionButton>

              <ActionButton
                variant="danger"
                size="sm"
                icon={<XCircle className="h-4 w-4" />}
                disabled={saving}
                onClick={() => onAlterarStatus(ordem, 'CANCELADA')}
              >
                Cancelar
              </ActionButton>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <KeyValueList
          items={[
            {
              label: 'Local',
              value: (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {texto(ordem.local)}
                </span>
              ),
            },
            {
              label: 'Solicitante',
              value: (
                <span className="inline-flex items-center gap-1">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  {texto(ordem.solicitante)}
                </span>
              ),
            },
            {
              label: 'Unidade',
              value: texto(ordem.unidade),
            },
            {
              label: 'Prestador',
              value: texto(ordem.prestadorNome),
            },
            {
              label: 'Solicitação',
              value: (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-4 w-4 text-slate-400" />
                  {formatDateTime(ordem.dataSolicitacao ?? ordem.criadoEm)}
                </span>
              ),
            },
            {
              label: 'Conclusão',
              value: formatDateTime(ordem.dataConclusao),
            },
            {
              label: 'Valor estimado',
              value: valorEstimado === null ? '-' : formatCurrency(valorEstimado),
            },
            {
              label: 'Valor final',
              value: valorFinal === null ? '-' : formatCurrency(valorFinal),
            },
          ]}
        />
      </div>
    </article>
  );
}
