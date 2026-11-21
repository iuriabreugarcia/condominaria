# Condominaria Express

Sistema de gestão de condomínios com painel administrativo e portal do morador. A interface usa React e Vite. A API usa NestJS e Prisma.

## Telas principais

As capturas usam dados fictícios do ambiente de demonstração.

| Painel administrativo | Portal do morador |
| --- | --- |
| ![Painel administrativo com acesso aos módulos de gestão](docs/screenshots/painel-administrativo.jpg) | ![Portal do morador com alertas e atalhos](docs/screenshots/portal-do-morador.jpg) |
| Visão geral da operação do condomínio. | Alertas, cobranças, comunicados e serviços da unidade. |

| Financeiro | Portaria |
| --- | --- |
| ![Módulo financeiro com cobranças e lançamentos](docs/screenshots/financeiro.jpg) | ![Módulo de portaria com visitantes e encomendas](docs/screenshots/portaria.jpg) |
| Categorias, lançamentos e acompanhamento de cobranças. | Visitantes, autorizações de acesso e encomendas. |

| Reservas | Governança |
| --- | --- |
| ![Painel de gestão das reservas de espaços comuns](docs/screenshots/reservas.jpg) | ![Painel de governança com assembleias e votações](docs/screenshots/governanca.jpg) |
| Espaços comuns, agenda e reservas. | Assembleias, pautas e votações. |

## Frontend

Execute `npm ci` e `npm run build` em `condominaria-express-web/` para gerar o portal. Os atalhos de demonstração aparecem ao configurar os e-mails de teste nas variáveis `VITE_DEMO_EMAIL_*`. Informe a senha no formulário de login.

## Implantação conjunta na Hostinger

Use a raiz do repositório (`./`), npm, Node.js 22 ou 24, o comando de build `npm run build` e o arquivo de entrada `server.js`. O build gera o cliente Prisma, compila a API e inclui o frontend na saída servida pelo NestJS.

Configure `DATABASE_URL` e `JWT_SECRET` nas variáveis de ambiente do site. A raiz redireciona para `/portal/` e o frontend usa `/api` na mesma origem. Após implantar, confira `/api/health`, abra `/portal/login` e teste o login.
