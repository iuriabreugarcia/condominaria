import { RotateCcw, Search } from 'lucide-react';
import { ActionButton, PageToolbar, SearchInput, SelectInput, TextInput } from '../../shared';

export type ManutencaoFiltrosValue = {
  q?: string;
  status?: string;
  prioridade?: string;
  dataInicio?: string;
  dataFim?: string;
};

type ManutencaoFiltrosProps = {
  value: ManutencaoFiltrosValue;
  loading?: boolean;
  onChange: (value: ManutencaoFiltrosValue) => void;
  onRefresh?: () => void;
  onClear?: () => void;
};

const statusOptions = [
  { value: 'ABERTA', label: 'Aberta' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'AGENDADA', label: 'Agendada' },
  { value: 'EM_ANDAMENTO', label: 'Em andamento' },
  { value: 'CONCLUIDA', label: 'Concluída' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

const prioridadeOptions = [
  { value: 'BAIXA', label: 'Baixa' },
  { value: 'MEDIA', label: 'Média' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente' },
];

export function ManutencaoFiltros({
  value,
  loading = false,
  onChange,
  onRefresh,
  onClear,
}: ManutencaoFiltrosProps) {
  function atualizar(campo: keyof ManutencaoFiltrosValue, novoValor: string) {
    onChange({
      ...value,
      [campo]: novoValor,
    });
  }

  return (
    <PageToolbar
      actions={
        <>
          {onClear ? (
            <ActionButton
              variant="secondary"
              onClick={onClear}
              disabled={loading}
            >
              Limpar
            </ActionButton>
          ) : null}

          {onRefresh ? (
            <ActionButton
              variant="primary"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={onRefresh}
              loading={loading}
            >
              Atualizar
            </ActionButton>
          ) : null}
        </>
      }
    >
      <div className="min-w-0">
        <label className="mb-1.5 block text-sm font-bold text-slate-800">
          Buscar
        </label>

        <SearchInput
          value={value.q ?? ''}
          placeholder="Buscar por título, local, unidade ou solicitante..."
          onChange={(event) => atualizar('q', event.target.value)}
          onClear={() => atualizar('q', '')}
          aria-label="Buscar manutenção"
        />
      </div>

      <SelectInput
        label="Status"
        name="status"
        value={value.status ?? ''}
        placeholder="Todos"
        options={statusOptions}
        onChange={(event) => atualizar('status', event.target.value)}
      />

      <SelectInput
        label="Prioridade"
        name="prioridade"
        value={value.prioridade ?? ''}
        placeholder="Todas"
        options={prioridadeOptions}
        onChange={(event) => atualizar('prioridade', event.target.value)}
      />

      <TextInput
        label="Início"
        name="dataInicio"
        type="date"
        value={value.dataInicio ?? ''}
        onChange={(event) => atualizar('dataInicio', event.target.value)}
      />

      <TextInput
        label="Fim"
        name="dataFim"
        type="date"
        value={value.dataFim ?? ''}
        onChange={(event) => atualizar('dataFim', event.target.value)}
      />

      <div className="hidden items-end lg:flex">
        <ActionButton
          variant="secondary"
          icon={<Search className="h-4 w-4" />}
          disabled={loading}
          onClick={onRefresh}
          className="w-full"
        >
          Filtrar
        </ActionButton>
      </div>
    </PageToolbar>
  );
}
