const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function raw(sql) {
  console.log(`SQL> ${sql}`);
  return prisma.$executeRawUnsafe(sql);
}

async function rows(sql, ...params) {
  return prisma.$queryRawUnsafe(sql, ...params);
}

async function tableExists(tableName) {
  const result = await rows(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
    LIMIT 1
  `, tableName);

  return result.length > 0;
}

async function getColumns(tableName) {
  const result = await rows(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
  `, tableName);

  return new Set(result.map((row) => row.COLUMN_NAME));
}

async function hasColumn(tableName, columnName) {
  const cols = await getColumns(tableName);
  return cols.has(columnName);
}

async function hasIndex(indexName) {
  const result = await rows(`
    SELECT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'documentos_condominio'
      AND INDEX_NAME = ?
    LIMIT 1
  `, indexName);

  return result.length > 0;
}

async function ensureTable() {
  const exists = await tableExists('documentos_condominio');

  if (exists) {
    console.log('OK: tabela documentos_condominio existe.');
    return;
  }

  await raw(`
    CREATE TABLE documentos_condominio (
      id INT NOT NULL AUTO_INCREMENT,
      condominioId INT NOT NULL,
      criadoPorUsuarioId INT NULL,
      titulo VARCHAR(180) NOT NULL,
      categoria VARCHAR(120) NULL,
      descricao TEXT NULL,
      url VARCHAR(500) NOT NULL,
      publicoMoradores TINYINT(1) NOT NULL DEFAULT 1,
      destaque TINYINT(1) NOT NULL DEFAULT 0,
      status ENUM('RASCUNHO','PUBLICADO','ARQUIVADO') NOT NULL DEFAULT 'RASCUNHO',
      publicadoEm DATETIME(3) NULL,
      arquivadoEm DATETIME(3) NULL,
      criadoEm DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      atualizadoEm DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id)
    )
  `);

  console.log('OK: tabela documentos_condominio criada.');
}

async function ensureColumn(target, legacyNames, definition, addDefinition) {
  const columns = await getColumns('documentos_condominio');

  if (columns.has(target)) {
    console.log(`OK: coluna ${target} existe.`);
    return;
  }

  const legacy = legacyNames.find((name) => columns.has(name));

  if (legacy) {
    await raw(`ALTER TABLE documentos_condominio CHANGE COLUMN \`${legacy}\` \`${target}\` ${definition}`);
    console.log(`OK: coluna ${legacy} renomeada para ${target}.`);
    return;
  }

  await raw(`ALTER TABLE documentos_condominio ADD COLUMN \`${target}\` ${addDefinition || definition}`);
  console.log(`OK: coluna ${target} criada.`);
}

async function ensureIndex(indexName, columnName) {
  if (await hasIndex(indexName)) {
    console.log(`OK: índice ${indexName} existe.`);
    return;
  }

  if (!(await hasColumn('documentos_condominio', columnName))) {
    console.log(`AVISO: coluna ${columnName} não existe; índice ${indexName} não criado.`);
    return;
  }

  await raw(`CREATE INDEX \`${indexName}\` ON documentos_condominio (\`${columnName}\`)`);
  console.log(`OK: índice ${indexName} criado.`);
}

async function normalizarDados() {
  if (await hasColumn('documentos_condominio', 'status')) {
    await raw(`
      UPDATE documentos_condominio
      SET status = CASE
        WHEN UPPER(status) IN ('PUBLICADO', 'PUBLICADA') THEN 'PUBLICADO'
        WHEN UPPER(status) IN ('ARQUIVADO', 'ARQUIVADA') THEN 'ARQUIVADO'
        ELSE 'RASCUNHO'
      END
    `);

    await raw(`
      ALTER TABLE documentos_condominio
      MODIFY COLUMN status ENUM('RASCUNHO','PUBLICADO','ARQUIVADO') NOT NULL DEFAULT 'RASCUNHO'
    `);
  }

  if (await hasColumn('documentos_condominio', 'url')) {
    await raw(`
      UPDATE documentos_condominio
      SET url = '#'
      WHERE url IS NULL OR TRIM(url) = ''
    `);
  }

  if (await hasColumn('documentos_condominio', 'titulo')) {
    await raw(`
      UPDATE documentos_condominio
      SET titulo = 'Documento'
      WHERE titulo IS NULL OR TRIM(titulo) = ''
    `);
  }
}

async function main() {
  console.log('Iniciando correção da tabela documentos_condominio...');

  await ensureTable();

  await ensureColumn(
    'condominioId',
    ['condominio_id', 'condominio'],
    'INT NOT NULL',
    'INT NOT NULL DEFAULT 1'
  );

  await ensureColumn(
    'criadoPorUsuarioId',
    ['criado_por_usuario_id', 'usuario_id', 'criado_por'],
    'INT NULL'
  );

  await ensureColumn(
    'titulo',
    ['nome', 'title'],
    'VARCHAR(180) NOT NULL',
    "VARCHAR(180) NOT NULL DEFAULT 'Documento'"
  );

  await ensureColumn(
    'categoria',
    ['tipo'],
    'VARCHAR(120) NULL'
  );

  await ensureColumn(
    'descricao',
    ['description'],
    'TEXT NULL'
  );

  await ensureColumn(
    'url',
    ['arquivo_url', 'arquivoUrl', 'link', 'caminho'],
    'VARCHAR(500) NOT NULL',
    "VARCHAR(500) NOT NULL DEFAULT '#'"
  );

  await ensureColumn(
    'publicoMoradores',
    ['publico_moradores', 'publico', 'visivel_moradores'],
    'TINYINT(1) NOT NULL DEFAULT 1'
  );

  await ensureColumn(
    'destaque',
    ['em_destaque'],
    'TINYINT(1) NOT NULL DEFAULT 0'
  );

  await ensureColumn(
    'status',
    ['situacao'],
    "ENUM('RASCUNHO','PUBLICADO','ARQUIVADO') NOT NULL DEFAULT 'RASCUNHO'"
  );

  await ensureColumn(
    'publicadoEm',
    ['publicado_em', 'data_publicacao'],
    'DATETIME(3) NULL'
  );

  await ensureColumn(
    'arquivadoEm',
    ['arquivado_em', 'data_arquivamento'],
    'DATETIME(3) NULL'
  );

  await ensureColumn(
    'criadoEm',
    ['criado_em', 'created_at'],
    'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)'
  );

  await ensureColumn(
    'atualizadoEm',
    ['atualizado_em', 'updated_at'],
    'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)'
  );

  await normalizarDados();

  await ensureIndex('idx_documentos_condominio_condominioId', 'condominioId');
  await ensureIndex('idx_documentos_condominio_criadoPorUsuarioId', 'criadoPorUsuarioId');
  await ensureIndex('idx_documentos_condominio_status', 'status');
  await ensureIndex('idx_documentos_condominio_categoria', 'categoria');
  await ensureIndex('idx_documentos_condominio_publicoMoradores', 'publicoMoradores');
  await ensureIndex('idx_documentos_condominio_destaque', 'destaque');

  const colunas = await rows(`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'documentos_condominio'
    ORDER BY ORDINAL_POSITION
  `);

  console.log('COLUNAS FINAIS:');
  console.table(colunas);

  console.log('OK: documentos_condominio corrigida para o padrão esperado pelo Prisma.');
}

main()
  .catch((error) => {
    console.error('ERRO AO CORRIGIR documentos_condominio:');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    prisma.$disconnect();
  });
