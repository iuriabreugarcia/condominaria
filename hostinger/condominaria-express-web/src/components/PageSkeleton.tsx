type PageSkeletonProps = {
  cards?: number;
  linhas?: number;
};

export function PageSkeleton({
  cards = 3,
  linhas = 4,
}: PageSkeletonProps) {
  return (
    <div className="grid animate-pulse gap-6 print:hidden">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="h-11 w-11 rounded-2xl bg-slate-200" />
            <div className="mt-5 h-4 w-28 rounded-full bg-slate-200" />
            <div className="mt-4 h-9 w-20 rounded-full bg-slate-200" />
            <div className="mt-4 h-4 w-36 rounded-full bg-slate-100" />
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="h-6 w-48 max-w-full rounded-full bg-slate-200" />
        <div className="mt-3 h-4 w-72 max-w-full rounded-full bg-slate-100" />

        <div className="mt-6 grid gap-3">
          {Array.from({ length: linhas }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="h-4 w-40 max-w-full rounded-full bg-slate-200" />
              <div className="mt-3 h-4 w-full rounded-full bg-slate-100" />
              <div className="mt-2 h-4 w-3/4 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
