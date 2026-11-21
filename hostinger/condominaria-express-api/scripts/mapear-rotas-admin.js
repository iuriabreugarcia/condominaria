const fs = require('fs');
const path = require('path');

const raiz = path.join(process.cwd(), 'src');

const termos = [
  'manutencao',
  'manutenção',
  'manutencoes',
  'contratos',
  'prestadores',
  'documentos',
  'relatorios',
  'auditoria',
];

function listarArquivos(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const caminho = path.join(dir, item.name);

    if (item.isDirectory()) {
      if (['node_modules', 'dist', 'tmp'].includes(item.name)) return [];
      return listarArquivos(caminho);
    }

    if (!item.name.endsWith('.ts')) return [];
    return [caminho];
  });
}

function extrairLinhas(arquivo) {
  const texto = fs.readFileSync(arquivo, 'utf8');
  const linhas = texto.split('\n');
  const achados = [];

  linhas.forEach((linha, index) => {
    const normalizada = linha.toLowerCase();
    const contemTermo = termos.some((termo) => normalizada.includes(termo));
    const contemDecorador =
      linha.includes('@Controller') ||
      linha.includes('@Get') ||
      linha.includes('@Post') ||
      linha.includes('@Patch') ||
      linha.includes('@Delete') ||
      linha.includes('@Put');

    if (contemTermo || contemDecorador) {
      achados.push({
        arquivo: path.relative(process.cwd(), arquivo),
        linha: index + 1,
        conteudo: linha.trim(),
      });
    }
  });

  return achados;
}

function main() {
  const arquivos = listarArquivos(raiz);
  const resultados = arquivos.flatMap(extrairLinhas);

  console.log('');
  console.log('========================================');
  console.log('MAPEAMENTO DE ROTAS ADMINISTRATIVAS');
  console.log('========================================');
  console.log('');

  if (resultados.length === 0) {
    console.log('Nenhuma rota encontrada com os termos pesquisados.');
    return;
  }

  console.table(resultados);

  const arquivoSaida = path.join(process.cwd(), 'tmp', 'rotas-admin-diagnostico.json');
  fs.mkdirSync(path.dirname(arquivoSaida), { recursive: true });
  fs.writeFileSync(arquivoSaida, JSON.stringify(resultados, null, 2), 'utf8');

  console.log('');
  console.log(`OK: diagnóstico salvo em ${arquivoSaida}`);
}

main();
