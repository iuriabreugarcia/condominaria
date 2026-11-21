import {
  Banknote,
  Building2,
  ClipboardCheck,
  Megaphone,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const jornadas = [
  {
    titulo: 'Financeiro',
    descricao: 'Cobranças, comprovantes, inadimplência e lançamentos.',
    rota: '/admin/financeiro',
    icone: Banknote,
  },
  {
    titulo: 'Portaria',
    descricao: 'Visitantes, autorizações, acessos e encomendas.',
    rota: '/admin/portaria',
    icone: ShieldCheck,
  },
  {
    titulo: 'Manutenção',
    descricao: 'Ocorrências, prestadores, contratos e ordens de serviço.',
    rota: '/admin/manutencao',
    icone: Wrench,
  },
  {
    titulo: 'Governança',
    descricao: 'Assembleias, pautas, votações e documentos oficiais.',
    rota: '/admin/governanca',
    icone: ClipboardCheck,
  },
  {
    titulo: 'Comunicação',
    descricao: 'Comunicados, documentos e relacionamento com moradores.',
    rota: '/admin/comunicacao',
    icone: Megaphone,
  },
  {
    titulo: 'Portal do Morador',
    descricao: 'Acompanhe a experiência do morador na visão pública.',
    rota: '/dashboard',
    icone: Building2,
  },
];

export function AdminDemoJourneyCards() {
  return (
    <section className="admin-demo-journey" data-admin-demo-journey="true">
      <div className="admin-demo-journey__header">
        <span>Demonstração guiada</span>
        <h2>Explore os módulos principais da demo</h2>
        <p>
          Use estes atalhos para apresentar rapidamente a operação completa do
          Condominaria Express para síndico, administração, portaria e moradores.
        </p>
      </div>

      <div className="admin-demo-journey__grid">
        {jornadas.map((item) => {
          const Icone = item.icone;

          return (
            <Link
              key={item.rota}
              to={item.rota}
              className="admin-demo-journey__card"
            >
              <span className="admin-demo-journey__icon">
                <Icone aria-hidden="true" />
              </span>

              <strong>{item.titulo}</strong>
              <small>{item.descricao}</small>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
