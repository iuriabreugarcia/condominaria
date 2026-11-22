import { useEffect, useState } from 'react';

type DemoConfig = { emails: Record<string, string>; password: string };


const perfisDemo = [
  {
    papel: 'Administrador',
    chave: 'ADMIN',
    email: import.meta.env.VITE_DEMO_EMAIL_ADMIN,
    descricao: 'Visão completa do painel administrativo.',
  },
  {
    papel: 'Síndico',
    chave: 'SINDICO',
    email: import.meta.env.VITE_DEMO_EMAIL_SINDICO,
    descricao: 'Gestão diária, comunicados, ocorrências e governança.',
  },
  {
    papel: 'Financeiro',
    chave: 'FINANCEIRO',
    email: import.meta.env.VITE_DEMO_EMAIL_FINANCEIRO,
    descricao: 'Cobranças, comprovantes e indicadores financeiros.',
  },
  {
    papel: 'Portaria',
    chave: 'PORTARIA',
    email: import.meta.env.VITE_DEMO_EMAIL_PORTARIA,
    descricao: 'Visitantes, encomendas e ciência operacional.',
  },
  {
    papel: 'Manutenção',
    chave: 'MANUTENCAO',
    email: import.meta.env.VITE_DEMO_EMAIL_MANUTENCAO,
    descricao: 'Ocorrências, prestadores e ordens de serviço.',
  },
  {
    papel: 'Comunicação',
    chave: 'COMUNICACAO',
    email: import.meta.env.VITE_DEMO_EMAIL_COMUNICACAO,
    descricao: 'Comunicados, documentos e relacionamento.',
  },
  {
    papel: 'Conselho',
    chave: 'CONSELHO',
    email: import.meta.env.VITE_DEMO_EMAIL_CONSELHO,
    descricao: 'Acompanhamento institucional e governança.',
  },
  {
    papel: 'Morador',
    chave: 'MORADOR',
    email: import.meta.env.VITE_DEMO_EMAIL_MORADOR,
    descricao: 'Portal do Morador, cobranças, reservas e votações.',
  },
  {
    papel: 'Morador 2',
    chave: 'MORADOR_2',
    email: import.meta.env.VITE_DEMO_EMAIL_MORADOR_2,
    descricao: 'Segundo morador para testes paralelos.',
  },
];

interface DemoLoginProfilesProps {
  onSelectProfile: (email: string, senha: string) => void;
}

export function DemoLoginProfiles({ onSelectProfile }: DemoLoginProfilesProps) {
  const [demoConfig, setDemoConfig] = useState<DemoConfig>();

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}demo-config.json`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : undefined)
      .then((config: DemoConfig | undefined) => {
        if (config?.emails && Object.keys(config.emails).length) setDemoConfig(config);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const senhaDemoPublica = demoConfig?.password ?? import.meta.env.VITE_PUBLIC_DEMO_PASSWORD ?? '';
  const perfisDisponiveis = perfisDemo
    .map((perfil) => ({ ...perfil, email: demoConfig?.emails[perfil.chave] ?? perfil.email }))
    .filter((perfil) => perfil.email?.trim());

  if (!perfisDisponiveis.length) {
    return null;
  }

  return (
    <section className="demo-login-panel" aria-label="Perfis demo disponíveis">
      <div className="demo-login-panel__header">
        <span className="demo-login-panel__eyebrow">Ambiente demonstrativo</span>
        <h2>Escolha um perfil demo</h2>
        <p>
          Use os acessos abaixo para apresentar o Condominaria Express por tipo de
          usuário. {senhaDemoPublica ? <>Senha de demonstração: <strong>{senhaDemoPublica}</strong></> : 'Informe a senha do perfil para continuar.'}
        </p>
      </div>

      <div className="demo-login-panel__grid">
        {perfisDisponiveis.map((perfil) => (
          <button
            key={perfil.email}
            type="button"
            className="demo-login-card"
            onClick={() => onSelectProfile(perfil.email, senhaDemoPublica)}
            title={`Preencher login de ${perfil.papel}`}
          >
            <span className="demo-login-card__role">{perfil.papel}</span>
            <strong className="demo-login-card__email" title={perfil.email}>{perfil.email}</strong>
            <small>{perfil.descricao}</small>
          </button>
        ))}
      </div>

      <p className="demo-login-panel__note">
        {senhaDemoPublica ? 'Clique em um perfil para preencher o e-mail e a senha.' : 'Clique em um perfil para preencher o e-mail.'}
      </p>
    </section>
  );
}
