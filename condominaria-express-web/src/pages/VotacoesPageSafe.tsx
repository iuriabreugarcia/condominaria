import { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Building2,
  RefreshCw,
} from 'lucide-react';

import { VotacoesPage as VotacoesPageOriginal } from './VotacoesPage';

type BoundaryState = {
  hasError: boolean;
  message: string;
};

class VotacoesErrorBoundary extends Component<
  { children: ReactNode },
  BoundaryState
> {
  state: BoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return {
      hasError: true,
      message:
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as votações agora.',
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[portal-votacoes]', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-[#fff7ed] px-4 py-16 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-orange-100 bg-white p-8 shadow-sm">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <AlertTriangle size={28} />
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">
            Portal do Morador
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Votações temporariamente indisponíveis
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            A área de votações recebeu um formato de dados inesperado. O restante
            do Portal do Morador continua funcionando normalmente.
          </p>

          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                A tela está protegida para não derrubar o portal. Após a revisão
                técnica, use o botão abaixo para recarregar.
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
            >
              <RefreshCw size={18} />
              Atualizar votações
            </button>

            <a
              href="/portal"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Building2 size={18} />
              Voltar ao início
            </a>
          </div>

          {this.state.message ? (
            <p className="mt-5 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
              Detalhe técnico: {this.state.message}
            </p>
          ) : null}
        </section>
      </main>
    );
  }
}

export function VotacoesPage() {
  return (
    <VotacoesErrorBoundary>
      <VotacoesPageOriginal />
    </VotacoesErrorBoundary>
  );
}

export default VotacoesPage;
