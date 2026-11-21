const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

function tableNameOf(model) {
  return model.dbName || model.name;
}

function columnNameOf(field) {
  return field.dbName || field.name;
}

function isDatabaseColumn(field) {
  return field.kind === 'scalar' || field.kind === 'enum';
}

async function queryRows(sql, ...params) {
  return prisma.$queryRawUnsafe(sql, ...params);
}

async function getTables() {
  const rows = await queryRows(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
  `);

  return new Set(rows.map((row) => row.TABLE_NAME));
}

async function getColumns(tableName) {
  const rows = await queryRows(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
  `, tableName);

  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function main() {
  const models = Prisma.dmmf?.datamodel?.models || [];

  if (!models.length) {
    throw new Error('Não foi possível ler os models do Prisma DMMF.');
  }

  const tables = await getTables();
  const problemas = [];
  const ok = [];

  for (const model of models) {
    const tableName = tableNameOf(model);

    if (!tables.has(tableName)) {
      problemas.push({
        tipo: 'TABELA_AUSENTE',
        model: model.name,
        tabela: tableName,
        campo: '-',
        coluna: '-',
      });
      continue;
    }

    const columns = await getColumns(tableName);
    const databaseFields = model.fields.filter(isDatabaseColumn);

    for (const field of databaseFields) {
      const columnName = columnNameOf(field);

      if (!columns.has(columnName)) {
        problemas.push({
          tipo: 'COLUNA_AUSENTE',
          model: model.name,
          tabela: tableName,
          campo: field.name,
          coluna: columnName,
        });
      }
    }

    ok.push({
      model: model.name,
      tabela: tableName,
      colunasModelo: databaseFields.length,
    });
  }

  console.log('');
  console.log('========================================');
  console.log('AUDITORIA PRISMA x BANCO');
  console.log('========================================');
  console.log(`Models verificados: ${models.length}`);
  console.log(`Tabelas no banco: ${tables.size}`);

  if (problemas.length > 0) {
    console.log('');
    console.log('PROBLEMAS ENCONTRADOS:');
    console.table(problemas);
    console.log('');
    console.log('Resumo: existem tabelas ou colunas esperadas pelo Prisma que não existem no banco atual.');
    console.log('Corrija esses pontos antes de publicar novas telas que dependam desses módulos.');
    process.exitCode = 1;
    return;
  }

  console.log('');
  console.log('OK: banco compatível com os models Prisma verificados.');
  console.log('');
  console.table(ok.slice(0, 40));

  if (ok.length > 40) {
    console.log(`... mais ${ok.length - 40} models verificados.`);
  }
}

main()
  .catch((error) => {
    console.error('ERRO NA AUDITORIA PRISMA x BANCO:');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
