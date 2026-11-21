import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

function isChunkError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk') ||
    message.includes('dynamically imported module')
  );
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    if (isChunkError(error)) {
      return {
        hasError: true,
        message:
          'O sistema foi atualizado. Atualize a página para carregar a versão mais recente.',
      };
    }

    return {
      hasError: true,
      message:
        'Não foi possível carregar esta tela. Atualize a página ou tente novamente em instantes.',
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Erro capturado pelo AppErrorBoundary:', error, errorInfo);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleBackHome = () => {
    window.location.href = '/portal/';
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-orange-50 px-4 py-10 text-slate-900">
        <section className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-3xl border border-orange-100 bg-white p-6 text-center shadow-xl shadow-orange-100/60">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
              🏢
            </div>

            <h1 className="text-2xl font-bold text-slate-950">
              Condominaria Express
            </h1>

            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
              {this.state.message}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                Atualizar sistema
              </button>

              <button
                type="button"
                onClick={this.handleBackHome}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                Voltar ao início
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }
}
