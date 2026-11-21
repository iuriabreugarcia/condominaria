import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Wrench,
  XCircle,
} from 'lucide-react';
import type { ManutencaoResumo } from '../../../types/adminModules';
import { StatCard } from '../../shared';

type ManutencaoResumoCardsProps = {
  resumo?: ManutencaoResumo | null;
};

function numero(valor: number | string | null | undefined) {
  const n = Number(valor ?? 0);

  if (!Number.isFinite(n)) {
    return 0;
  }

  return n;
}

export function ManutencaoResumoCards({
  resumo,
}: ManutencaoResumoCardsProps) {
  const total = numero(resumo?.total);
  const abertas = numero(resumo?.abertas ?? resumo?.pendentes);
  const andamento = numero(resumo?.emAndamento);
  const agendadas = numero(resumo?.agendadas);
  const concluidas = numero(resumo?.concluidas);
  const canceladas = numero(resumo?.canceladas);
  const urgentes = numero(resumo?.urgentes);

  return (
    <section className="mb-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Ordens"
        value={total}
        description="Total de solicitações registradas"
        icon={<ClipboardList className="h-5 w-5" />}
        variant="orange"
      />

      <StatCard
        title="Abertas"
        value={abertas}
        description="Aguardando triagem ou execução"
        icon={<Wrench className="h-5 w-5" />}
        variant="blue"
      />

      <StatCard
        title="Em andamento"
        value={andamento}
        description="Serviços em execução"
        icon={<Clock3 className="h-5 w-5" />}
        variant="slate"
      />

      <StatCard
        title="Agendadas"
        value={agendadas}
        description="Com data prevista"
        icon={<CalendarClock className="h-5 w-5" />}
        variant="blue"
      />

      <StatCard
        title="Concluídas"
        value={concluidas}
        description="Finalizadas pela administração"
        icon={<CheckCircle2 className="h-5 w-5" />}
        variant="green"
      />

      <StatCard
        title="Canceladas"
        value={canceladas}
        description="Encerradas sem execução"
        icon={<XCircle className="h-5 w-5" />}
        variant="red"
      />

      <StatCard
        title="Urgentes"
        value={urgentes}
        description="Demandam atenção imediata"
        icon={<AlertTriangle className="h-5 w-5" />}
        variant="red"
      />
    </section>
  );
}
