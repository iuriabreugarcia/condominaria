type DemoExperienceBannerProps = {
  area: 'admin' | 'portal';
  isDemo?: boolean;
};

function detectarDemoLocal(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const marcadores = [
    'demo-condominaria',
    'Condomínio Demonstração Bacuri',
    'admin.demo@demo.local',
    'ana.souza@demo.local',
    'carlos.lima@demo.local',
  ];

  try {
    const partes: string[] = [window.location.href];

    for (let indice = 0; indice < window.localStorage.length; indice += 1) {
      const chave = window.localStorage.key(indice);

      if (!chave) {
        continue;
      }

      partes.push(chave);
      partes.push(window.localStorage.getItem(chave) ?? '');
    }

    const conteudo = partes.join(' ');

    return marcadores.some((marcador) => conteudo.includes(marcador));
  } catch {
    return false;
  }
}

const adminAtalhos = [
  ['Financeiro', '/portal/admin/financeiro'],
  ['Ocorrências', '/portal/admin/ocorrencias'],
  ['Reservas', '/portal/admin/reservas'],
  ['Portaria', '/portal/admin/portaria'],
  ['Comunicados', '/portal/admin/comunicacao'],
  ['Governança', '/portal/admin/governanca'],
  ['Documentos', '/portal/admin/documentos'],
  ['Contratos', '/portal/admin/contratos'],
];

const portalAtalhos = [
  ['Cobranças', '/portal/cobrancas'],
  ['Ocorrências', '/portal/ocorrencias'],
  ['Reservas', '/portal/reservas'],
  ['Visitantes', '/portal/visitantes'],
  ['Encomendas', '/portal/encomendas'],
  ['Comunicados', '/portal/comunicados'],
  ['Assembleias', '/portal/assembleias'],
  ['Votações', '/portal/votacoes?situacao=PENDENTES'],
];

export function DemoExperienceBanner({
  area,
  isDemo,
}: DemoExperienceBannerProps) {
  const demoAtivo = isDemo ?? detectarDemoLocal();

  if (!demoAtivo) {
    return null;
  }

  const atalhos = area === 'admin' ? adminAtalhos : portalAtalhos;

  return (
    <section className="demo-experience-banner rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-slate-50 p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-600">
            Ambiente demonstrativo
          </p>

          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
            Demonstração comercial com dados fictícios enriquecidos
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            Este ambiente reúne financeiro, ocorrências, reservas, portaria,
            comunicados, documentos, contratos, manutenção, assembleias e
            votações para uma apresentação guiada do Condominaria Express.
          </p>

          <p className="mt-3 rounded-2xl border border-orange-100 bg-white/80 p-3 text-sm leading-6 text-orange-900">
            Os dados são exclusivos do condomínio demo, sem expor credenciais,
            e não se misturam ao Condomínio Bacuri Digital real.
          </p>
        </div>

        <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:w-[360px] lg:flex-none">
          {atalhos.map(([label, href]) => (
            <a
              key={`${area}-${label}`}
              href={href}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
