const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

const TARGET_MODELS = new Set([
  'ContratoCondominio',
]);

const LEGACY_NAMES = {
  condominioId: ['condominio_id', 'condominio'],
  usuarioId: ['usuario_id', 'user_id'],
  moradorId: ['morador_id'],
  criadoEm: ['criado_em', 'created_at'],
  atualizadoEm: ['atualizado_em', 'updated_at'],
};

function tableNameOf(model) {
  return model.dbName || model.name;
}

function columnNameOf(field) {
  return field.dbName || field.name;
}

function isDatabaseColumn(field) {
  return field.kind === 'scalar' || field.kind === 'enum';
}

function sqlQuote(value) {
  return String(value).replaceAll("'", "''");
}

function enumValues(enumName) {
  const found = Prisma.dmmf.datamodel.enums.find((item) => item.name === enumName);

  if (!found) {
    return ['ATIVO', 'INATIVO'];
  }

  return found.values.map((item) => item.dbName || item.name);
}

function fieldDefaultSql(field) {
  if (field.isUpdatedAt) {
    return 'DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)';
  }

  if (field.default === undefined || field.default === null) {
    return '';
  }

  if (typeof field.default === 'string') {
    if (field.default === 'now') {
      return 'DEFAULT CURRENT_TIMESTAMP(3)';
    }

    return `DEFAULT '${sqlQuote(field.default)}'`;
  }

  if (typeof field.default === 'number') {
    return `DEFAULT ${field.default}`;
  }

  if (typeof field.default === 'boolean') {
    return `DEFAULT ${field.default ? 1 : 0}`;
  }

  if (typeof field.default === 'object' && field.default.name === 'now') {
    return 'DEFAULT CURRENT_TIMESTAMP(3)';
  }

  return '';
}

function columnDefinition(field, mode = 'add') {
  const required = field.isRequired || field.isId;
  const nullableSql = required ? 'NOT NULL' : 'NULL';
  const defaultSql = fieldDefaultSql(field);
  const name = field.name;

  if (field.isId && field.type === 'Int') {
    return 'INT NOT NULL AUTO_INCREMENT';
  }

  if (field.kind === 'enum') {
    const values = enumValues(field.type);
    const enumSql = values.map((value) => `'${sqlQuote(value)}'`).join(',');

    if (defaultSql) {
      return `ENUM(${enumSql}) ${nullableSql} ${defaultSql}`;
    }

    if (required) {
      return `ENUM(${enumSql}) NOT NULL DEFAULT '${sqlQuote(values[0])}'`;
    }

    return `ENUM(${enumSql}) NULL`;
  }

  if (field.type === 'Int') {
    if (required && mode !== 'create') {
      const fallback = name === 'condominioId' ? 1 : 0;
      return `INT NOT NULL DEFAULT ${fallback}`;
    }

    return `INT ${nullableSql}`;
  }

  if (field.type === 'BigInt') {
    if (required && mode !== 'create') {
      return 'BIGINT NOT NULL DEFAULT 0';
    }

    return `BIGINT ${nullableSql}`;
  }

  if (field.type === 'Float') {
    if (required && mode !== 'create') {
      return 'DOUBLE NOT NULL DEFAULT 0';
    }

    return `DOUBLE ${nullableSql}`;
  }

  if (field.type === 'Decimal') {
    if (required && mode !== 'create') {
      return 'DECIMAL(12,2) NOT NULL DEFAULT 0.00';
    }

    return `DECIMAL(12,2) ${nullableSql}`;
  }

  if (field.type === 'Boolean') {
    if (defaultSql) {
      return `TINYINT(1) ${nullableSql} ${defaultSql}`;
    }

    if (required) {
      return 'TINYINT(1) NOT NULL DEFAULT 0';
    }

    return 'TINYINT(1) NULL';
  }

  if (field.type === 'DateTime') {
    if (field.isUpdatedAt || name === 'atualizadoEm') {
      return 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)';
    }

    if (defaultSql) {
      return `DATETIME(3) ${nullableSql} ${defaultSql}`;
    }

    if (required && mode !== 'create') {
      return 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)';
    }

    return `DATETIME(3) ${nullableSql}`;
  }

  if (field.type === 'Json') {
    return `JSON ${required ? 'NOT NULL' : 'NULL'}`;
  }

  if (field.type === 'Bytes') {
    return `LONGBLOB ${nullableSql}`;
  }

  if (field.type === 'String') {
    const lower = name.toLowerCase();

    if (
      lower.includes('descricao') ||
      lower.includes('observacao') ||
      lower.includes('observacoes') ||
      lower.includes('conteudo') ||
      lower.includes('clausula') ||
      lower.includes('objeto')
    ) {
      return required ? 'TEXT NOT NULL' : 'TEXT NULL';
    }

    if (lower.includes('url') || lower.includes('arquivo') || lower.includes('link')) {
      return required
        ? "VARCHAR(500) NOT NULL DEFAULT ''"
        : 'VARCHAR(500) NULL';
    }

    return required
      ? "VARCHAR(255) NOT NULL DEFAULT ''"
      : 'VARCHAR(255) NULL';
  }

  return required ? "VARCHAR(255) NOT NULL DEFAULT ''" : 'VARCHAR(255) NULL';
}

async function rows(sql, ...params) {
  return prisma.$queryRawUnsafe(sql, ...params);
}

async function exec(sql) {
  console.log(`SQL> ${sql}`);
  await prisma.$executeRawUnsafe(sql);
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

async function hasIndex(tableName, indexName) {
  const result = await rows(`
    SELECT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
    LIMIT 1
  `, tableName, indexName);

  return result.length > 0;
}

async function createTableFromModel(model) {
  const tableName = tableNameOf(model);
  const fields = model.fields.filter(isDatabaseColumn);

  const columns = fields.map((field) => {
    const columnName = columnNameOf(field);
    return `\`${columnName}\` ${columnDefinition(field, 'create')}`;
  });

  const idField = fields.find((field) => field.isId);
  const primaryKey = idField ? `, PRIMARY KEY (\`${columnNameOf(idField)}\`)` : '';

  await exec(`
    CREATE TABLE \`${tableName}\` (
      ${columns.join(',\n      ')}
      ${primaryKey}
    )
  `);

  console.log(`OK: tabela ${tableName} criada pelo modelo ${model.name}.`);
}

async function ensureModelTable(model) {
  const tableName = tableNameOf(model);

  if (await tableExists(tableName)) {
    console.log(`OK: tabela ${tableName} existe.`);
    return;
  }

  await createTableFromModel(model);
}

async function ensureModelColumns(model) {
  const tableName = tableNameOf(model);

  if (!(await tableExists(tableName))) {
    await createTableFromModel(model);
    return;
  }

  const fields = model.fields.filter(isDatabaseColumn);

  for (const field of fields) {
    const columnName = columnNameOf(field);
    let columns = await getColumns(tableName);

    if (columns.has(columnName)) {
      continue;
    }

    const legacyCandidates = LEGACY_NAMES[field.name] || [];
    const legacy = legacyCandidates.find((candidate) => columns.has(candidate));

    if (legacy) {
      await exec(
        `ALTER TABLE \`${tableName}\` CHANGE COLUMN \`${legacy}\` \`${columnName}\` ${columnDefinition(field, 'rename')}`
      );
      console.log(`OK: ${tableName}.${legacy} renomeada para ${columnName}.`);
      continue;
    }

    await exec(
      `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition(field, 'add')}`
    );
    console.log(`OK: ${tableName}.${columnName} criada.`);
  }
}

async function ensureHelpfulIndexes(model) {
  const tableName = tableNameOf(model);

  if (!(await tableExists(tableName))) {
    return;
  }

  const columns = await getColumns(tableName);

  const candidates = [
    'condominioId',
    'usuarioId',
    'moradorId',
    'prestadorId',
    'status',
    'categoria',
    'tipo',
    'dataInicio',
    'dataFim',
    'vencimento',
    'criadoEm',
    'atualizadoEm',
  ];

  for (const columnName of candidates) {
    if (!columns.has(columnName)) {
      continue;
    }

    const indexName = `idx_${tableName}_${columnName}`;

    if (await hasIndex(tableName, indexName)) {
      continue;
    }

    await exec(`CREATE INDEX \`${indexName}\` ON \`${tableName}\` (\`${columnName}\`)`);
    console.log(`OK: índice ${indexName} criado.`);
  }
}

async function corrigirNotificacoesPreferencias() {
  const tableName = 'notificacoes_preferencias';

  if (!(await tableExists(tableName))) {
    console.log('AVISO: notificacoes_preferencias não existe. Será tratada via modelo Prisma, se houver.');
    return;
  }

  const campos = [
    {
      name: 'condominioId',
      legacy: ['condominio_id', 'condominio'],
      definition: 'INT NOT NULL DEFAULT 1',
    },
    {
      name: 'usuarioId',
      legacy: ['usuario_id', 'user_id'],
      definition: 'INT NOT NULL DEFAULT 0',
    },
    {
      name: 'moradorId',
      legacy: ['morador_id'],
      definition: 'INT NOT NULL DEFAULT 0',
    },
    {
      name: 'criadoEm',
      legacy: ['criado_em', 'created_at'],
      definition: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)',
    },
    {
      name: 'atualizadoEm',
      legacy: ['atualizado_em', 'updated_at'],
      definition: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)',
    },
  ];

  for (const campo of campos) {
    const columns = await getColumns(tableName);

    if (columns.has(campo.name)) {
      console.log(`OK: ${tableName}.${campo.name} existe.`);
      continue;
    }

    const legacy = campo.legacy.find((candidate) => columns.has(candidate));

    if (legacy) {
      await exec(
        `ALTER TABLE \`${tableName}\` CHANGE COLUMN \`${legacy}\` \`${campo.name}\` ${campo.definition}`
      );
      console.log(`OK: ${tableName}.${legacy} renomeada para ${campo.name}.`);
      continue;
    }

    await exec(
      `ALTER TABLE \`${tableName}\` ADD COLUMN \`${campo.name}\` ${campo.definition}`
    );
    console.log(`OK: ${tableName}.${campo.name} criada.`);
  }

  for (const campo of campos) {
    const indexName = `idx_${tableName}_${campo.name}`;

    if (await hasIndex(tableName, indexName)) {
      continue;
    }

    await exec(`CREATE INDEX \`${indexName}\` ON \`${tableName}\` (\`${campo.name}\`)`);
    console.log(`OK: índice ${indexName} criado.`);
  }
}

async function mostrarResumoTabelas() {
  const tabelas = ['contratos_condominio', 'notificacoes_preferencias'];

  for (const tabela of tabelas) {
    if (!(await tableExists(tabela))) {
      console.log(`AVISO: tabela ${tabela} ainda não existe.`);
      continue;
    }

    const result = await rows(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, tabela);

    console.log(`\nCOLUNAS DE ${tabela}:`);
    console.table(result);
  }
}

async function main() {
  const models = Prisma.dmmf.datamodel.models;

  for (const model of models) {
    if (!TARGET_MODELS.has(model.name)) {
      continue;
    }

    await ensureModelTable(model);
    await ensureModelColumns(model);
    await ensureHelpfulIndexes(model);
  }

  const notificacaoModel = models.find(
    (model) => model.name === 'NotificacaoPreferenciaPortal'
  );

  if (notificacaoModel) {
    await ensureModelColumns(notificacaoModel);
    await ensureHelpfulIndexes(notificacaoModel);
  }

  await corrigirNotificacoesPreferencias();
  await mostrarResumoTabelas();

  console.log('\nOK: contratos_condominio e notificacoes_preferencias corrigidos.');
}

main()
  .catch((error) => {
    console.error('ERRO AO CORRIGIR CONTRATOS/NOTIFICAÇÕES:');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
