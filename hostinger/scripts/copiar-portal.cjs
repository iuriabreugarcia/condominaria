const { cpSync } = require('node:fs');
const { resolve } = require('node:path');

cpSync(
  resolve(__dirname, '../condominaria-express-web/dist'),
  resolve(__dirname, '../condominaria-express-api/dist/portal'),
  { recursive: true },
);

for (const entry of ['comercial', 'status.html', 'release.json', 'release-history.json']) {
  cpSync(
    resolve(__dirname, '../portal', entry),
    resolve(__dirname, '../condominaria-express-api/dist/portal', entry),
    { recursive: true },
  );
}
