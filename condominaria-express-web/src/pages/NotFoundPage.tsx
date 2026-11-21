import { ArrowLeft, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

export function NotFoundPage() {
  usePageTitle('Página não encontrada');

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm md:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-100 text-orange-700">
          <TriangleAlert className="h-8 w-8" />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-orange-700">
          Erro 404
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          Página não encontrada
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600">
          O endereço acessado não existe, foi removido ou ainda não está disponível no Portal do Morador.
        </p>

        <div className="mt-7 flex justify-center">
          <Link
            to="/dashboard"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-orange-500 px-6 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
