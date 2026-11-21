const http = require('http');
const https = require('https');

const BASE_URL =
  process.env.SMOKE_API_URL ||
  process.env.API_URL ||
  'https://api.condominaria.bacuridigital.com/api';

const CONDOMINIO_ID = process.env.SMOKE_CONDOMINIO_ID || '1';
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 20000);
const RETRIES = Number(process.env.SMOKE_RETRIES || 2);
const DRY_RUN = process.env.SMOKE_DRY_RUN === '1';

function limparBaseUrl(base) {
  let valor = String(base || '').trim();

  while (valor.endsWith('/')) {
    valor = valor.slice(0, -1);
  }

  return valor;
}

function limparPath(path) {
  let valor = String(path || '').trim();

  while (valor.startsWith('/')) {
    valor = valor.slice(1);
  }

  return valor;
}

function montarUrl(path) {
  return new URL(`${limparBaseUrl(BASE_URL)}/${limparPath(path)}`);
}

const endpoints = [
  {
    nome: 'Global condomínios protegido',
    grupo: 'core',
    metodo: 'GET',
    path: '/condominios',
    esperado: [401, 403],
  },
  {
    nome: 'Global usuários protegido',
    grupo: 'core',
    metodo: 'GET',
    path: '/usuarios',
    esperado: [401, 403],
  },
  {
    nome: 'Condomínio base',
    grupo: 'core',
    metodo: 'GET',
    path: `/condominios/${CONDOMINIO_ID}`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Documentos admin',
    grupo: 'core',
    metodo: 'GET',
    path: `/condominios/${CONDOMINIO_ID}/documentos`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Documentos portal',
    grupo: 'core',
    metodo: 'GET',
    path: `/condominios/${CONDOMINIO_ID}/documentos/portal`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Manutenções resumo',
    grupo: 'core',
    metodo: 'GET',
    path: `/condominios/${CONDOMINIO_ID}/manutencoes/resumo`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Manutenções admin',
    grupo: 'core',
    metodo: 'GET',
    path: `/condominios/${CONDOMINIO_ID}/manutencoes`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Contratos admin',
    grupo: 'core',
    metodo: 'GET',
    path: `/condominios/${CONDOMINIO_ID}/contratos`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Prestadores admin',
    grupo: 'core',
    metodo: 'GET',
    path: `/condominios/${CONDOMINIO_ID}/prestadores`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Relatórios admin',
    grupo: 'opcional',
    metodo: 'GET',
    path: `/condominios/${CONDOMINIO_ID}/relatorios/geral`,
    esperado: [200, 401, 403, 404],
  },
  {
    nome: 'Auditoria admin',
    grupo: 'opcional',
    metodo: 'GET',
    path: `/condominios/${CONDOMINIO_ID}/auditoria`,
    esperado: [200, 401, 403, 404],
  },
  {
    nome: 'Comprovante cobrança admin',
    grupo: 'core',
    metodo: 'GET',
    path: `/condominios/${CONDOMINIO_ID}/cobrancas/1/comprovante`,
    esperado: [200, 400, 401, 403, 404],
  },
  {
    nome: 'Comprovante cobrança portal morador',
    grupo: 'core',
    metodo: 'PATCH',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/cobrancas/1/comprovante`,
    esperado: [200, 400, 401, 403],
    body: {
      arquivoNome: 'smoke-teste.pdf',
      arquivoTipo: 'application/pdf',
      arquivoDados: 'data:application/pdf;base64,U01PS0U=',
      observacao: 'Teste automático de rota de comprovante.',
    },
  },
  {
    nome: 'Portal morador - notificações',
    grupo: 'core',
    metodo: 'GET',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/notificacoes`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Portal morador - preferências de notificações',
    grupo: 'core',
    metodo: 'GET',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/notificacoes/preferencias`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Portal morador - atualizar preferências de notificações',
    grupo: 'core',
    metodo: 'PATCH',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/notificacoes/preferencias`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Portal morador - contexto',
    grupo: 'core',
    metodo: 'GET',
    path: '/portal-morador/me',
    esperado: [200, 401, 403],
  },
  {
    nome: 'Portal morador - dashboard',
    grupo: 'core',
    metodo: 'GET',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/dashboard`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Portal morador - comunicados',
    grupo: 'core',
    metodo: 'GET',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/comunicados`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Portal morador - cobranças',
    grupo: 'core',
    metodo: 'GET',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/cobrancas`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Portal morador - encomendas',
    grupo: 'core',
    metodo: 'GET',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/encomendas`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Portal morador - reservas',
    grupo: 'core',
    metodo: 'GET',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/reservas`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Portal morador - ocorrências',
    grupo: 'core',
    metodo: 'GET',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/ocorrencias`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Portal morador - visitantes',
    grupo: 'core',
    metodo: 'GET',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/visitantes/autorizacoes`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Portal morador - visitantes recentes',
    grupo: 'core',
    metodo: 'GET',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/visitantes/recentes`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Portal morador - unidades',
    grupo: 'core',
    metodo: 'GET',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/unidades`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Portal morador - áreas reserváveis',
    grupo: 'core',
    metodo: 'GET',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/areas-comuns/reservaveis`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Portal morador - assembleias',
    grupo: 'core',
    metodo: 'GET',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/assembleias`,
    esperado: [200, 401, 403],
  },
  {
    nome: 'Portal morador - votações abertas',
    grupo: 'core',
    metodo: 'GET',
    path: `/portal-morador/condominios/${CONDOMINIO_ID}/votacoes/abertas`,
    esperado: [200, 401, 403],
  },
];

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = montarUrl(endpoint.path);
    const client = url.protocol === 'http:' ? http : https;
    const bodyPayload = endpoint.body ? JSON.stringify(endpoint.body) : null;

    const headers = {
      Accept: 'application/json,text/plain,*/*',
      'User-Agent': 'CondominariaSmokeTest/1.2',
    };

    if (bodyPayload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyPayload);
    }

    const req = client.request(
      url,
      {
        method: endpoint.metodo,
        timeout: TIMEOUT_MS,
        headers,
      },
      (res) => {
        let body = '';

        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          body += chunk;

          if (body.length > 700) {
            body = body.slice(0, 700);
          }
        });

        res.on('end', () => {
          resolve({
            endpoint,
            url: url.toString(),
            status: res.statusCode || 0,
            body: body.trim(),
            erro: '',
          });
        });
      },
    );

    req.on('timeout', () => {
      req.destroy(new Error('Timeout ao conectar na API.'));
    });

    req.on('error', (error) => {
      resolve({
        endpoint,
        url: url.toString(),
        status: 0,
        body: error.message || 'Erro de conexão.',
        erro: error.message || 'Erro de conexão.',
      });
    });

    if (bodyPayload) {
      req.write(bodyPayload);
    }

    req.end();
  });
}

async function testarComRetry(endpoint) {
  let ultimoResultado = null;

  for (let tentativa = 0; tentativa <= RETRIES; tentativa += 1) {
    const resultado = await requestEndpoint(endpoint);

    ultimoResultado = {
      ...resultado,
      tentativa: tentativa + 1,
    };

    if (endpoint.esperado.includes(resultado.status)) {
      return {
        ...ultimoResultado,
        ok: true,
      };
    }

    const podeRepetir =
      resultado.status === 0 ||
      resultado.status === 408 ||
      resultado.status === 429 ||
      resultado.status >= 500;

    if (!podeRepetir || tentativa === RETRIES) {
      return {
        ...ultimoResultado,
        ok: false,
      };
    }

    await esperar(700 * (tentativa + 1));
  }

  return {
    ...ultimoResultado,
    ok: false,
  };
}

async function main() {
  console.log('');
  console.log('========================================');
  console.log('SMOKE TEST API - CONDOMINARIA EXPRESS');
  console.log('========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Base resolvida: ${limparBaseUrl(BASE_URL)}`);
  console.log(`Condomínio ID: ${CONDOMINIO_ID}`);
  console.log(`Timeout: ${TIMEOUT_MS}ms`);
  console.log(`Retries: ${RETRIES}`);
  console.log('');

  if (DRY_RUN) {
    console.log('');
    console.log('========================================');
    console.log('SMOKE URL DRY RUN');
    console.log('========================================');
    console.log('');

    const problemas = [];

    for (const endpoint of endpoints) {
      const url = montarUrl(endpoint.path).toString();
      const pathname = new URL(url).pathname;

      console.log(`${endpoint.metodo} ${endpoint.path} -> ${url}`);

      if (!pathname.startsWith('/api/')) {
        problemas.push({
          endpoint: endpoint.nome,
          path: endpoint.path,
          url,
          pathname,
          problema: 'URL resolvida sem prefixo /api',
        });
      }
    }

    if (problemas.length > 0) {
      console.log('');
      console.log('PROBLEMAS ENCONTRADOS:');
      console.table(problemas);
      process.exit(1);
    }

    console.log('');
    console.log('OK: todas as URLs do smoke preservam o prefixo /api.');
    return;
  }

  const resultados = [];

  for (const endpoint of endpoints) {
    const resultado = await testarComRetry(endpoint);
    resultados.push(resultado);

    const statusTexto = resultado.ok ? 'OK' : 'FALHA';
    const retryTexto =
      resultado.tentativa > 1 ? ` tentativa ${resultado.tentativa}` : '';

    console.log(
      `${statusTexto.padEnd(6)} ${String(resultado.status).padEnd(4)} ${endpoint.metodo} ${endpoint.path} - ${endpoint.nome} (${endpoint.grupo}${retryTexto})`,
    );
  }

  const falhas = resultados.filter(
    (item) => !item.ok && item.endpoint.grupo === 'core',
  );

  if (falhas.length > 0) {
    console.log('');
    console.log('FALHAS ENCONTRADAS:');
    console.table(
      falhas.map((item) => ({
        endpoint: item.endpoint.nome,
        metodo: item.endpoint.metodo,
        path: item.endpoint.path,
        url: item.url,
        status: item.status,
        tentativa: item.tentativa,
        body: item.body || item.erro || '-',
      })),
    );

    process.exit(1);
  }

  console.log('');
  console.log('OK: nenhum endpoint core/admin/portal testado retornou erro inesperado.');
}

main().catch((error) => {
  console.error('ERRO inesperado no smoke test:', error);
  process.exit(1);
});
