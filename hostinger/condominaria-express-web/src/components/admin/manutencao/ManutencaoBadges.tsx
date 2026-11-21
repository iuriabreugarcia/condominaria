import {
  labelPrioridadeManutencao,
  labelStatusManutencao,
  variantePrioridadeManutencao,
  varianteStatusManutencao,
} from '../../../lib';
import { StatusBadge } from '../../shared';

type ManutencaoStatusBadgeProps = {
  status: string | null | undefined;
};

type ManutencaoPrioridadeBadgeProps = {
  prioridade: string | null | undefined;
};

export function ManutencaoStatusBadge({
  status,
}: ManutencaoStatusBadgeProps) {
  return (
    <StatusBadge variant={varianteStatusManutencao(status)}>
      {labelStatusManutencao(status)}
    </StatusBadge>
  );
}

export function ManutencaoPrioridadeBadge({
  prioridade,
}: ManutencaoPrioridadeBadgeProps) {
  return (
    <StatusBadge variant={variantePrioridadeManutencao(prioridade)}>
      {labelPrioridadeManutencao(prioridade)}
    </StatusBadge>
  );
}
