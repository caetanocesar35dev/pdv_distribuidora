// Executado pelo entrypoint ANTES do `prisma migrate deploy`.
//
// Em bancos onde as tabelas de vasilhames foram criadas antes de existir a migration
// 20261017011937_vasilhames (via `prisma db push`), o deploy falharia tentando criá-las de novo.
// Este script detecta esse caso e marca a migration como já aplicada (`migrate resolve --applied`).
// Em bancos novos ou já em dia, não faz nada.
require('dotenv/config');
const { execSync } = require('child_process');
const { Pool } = require('pg');

const MIGRATION = '20261017011937_vasilhames';

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows: [state] } = await pool.query(`
      SELECT
        to_regclass('public."_prisma_migrations"') IS NOT NULL AS has_migrations_table,
        to_regclass('public."BottleType"') IS NOT NULL AS has_bottle_type,
        to_regclass('public."CustomerBottleBalance"') IS NOT NULL AS has_bottle_balance,
        to_regclass('public."BottleMovement"') IS NOT NULL AS has_bottle_movement,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'bottleTypeId'
        ) AS has_product_column
    `);

    if (!state.has_migrations_table || !state.has_bottle_type) {
      return; // banco novo ou sem vasilhames: o migrate deploy cria tudo normalmente
    }

    const { rows } = await pool.query('SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1', [MIGRATION]);
    if (rows.length > 0) {
      return; // migration já registrada: nada a fazer
    }

    if (!state.has_bottle_balance || !state.has_bottle_movement || !state.has_product_column) {
      console.error(
        `[ERRO] As tabelas de vasilhames existem só em parte neste banco. ` +
        `Não é seguro marcar a migration ${MIGRATION} como aplicada automaticamente. Verifique o banco manualmente.`,
      );
      process.exit(1);
    }

    console.log(`Tabelas de vasilhames já existem: marcando a migration ${MIGRATION} como aplicada...`);
    execSync(`npx prisma migrate resolve --applied ${MIGRATION}`, { stdio: 'inherit' });
  } finally {
    await pool.end();
  }
})().catch((err) => {
  console.error('[ERRO] Falha ao verificar a migration de vasilhames:', err.message);
  process.exit(1);
});
