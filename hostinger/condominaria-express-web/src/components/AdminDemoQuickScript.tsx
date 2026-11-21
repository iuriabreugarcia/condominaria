const passos = [
  {
    titulo: '1. Comece pelo Financeiro',
    texto: 'Mostre cobranças, comprovantes, inadimplência e visão consolidada.',
  },
  {
    titulo: '2. Passe pela Portaria',
    texto: 'Demonstre visitantes, autorizações, encomendas e controle operacional.',
  },
  {
    titulo: '3. Mostre Manutenção',
    texto: 'Abra ocorrências, prestadores, contratos e ordens de serviço.',
  },
  {
    titulo: '4. Feche com Governança',
    texto: 'Apresente assembleias, pautas, votações e documentos oficiais.',
  },
];

export function AdminDemoQuickScript() {
  return (
    <section className="admin-demo-script" data-admin-demo-script="true">
      <div className="admin-demo-script__header">
        <span>Roteiro rápido</span>
        <h2>Apresente a demo em 5 minutos</h2>
        <p>
          Use esta sequência para conduzir uma apresentação objetiva, começando pela dor
          operacional e fechando com governança e portal do morador.
        </p>
      </div>

      <div className="admin-demo-script__steps">
        {passos.map((passo) => (
          <article key={passo.titulo} className="admin-demo-script__step">
            <strong>{passo.titulo}</strong>
            <small>{passo.texto}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
