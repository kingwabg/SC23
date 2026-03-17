import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || '';
const POSTGRES_SSL = process.env.POSTGRES_SSL === 'true';
const STATE_TABLE = process.env.PG_STATE_TABLE || 'app_state';

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: POSTGRES_SSL ? { rejectUnauthorized: false } : undefined,
});

try {
  const client = await pool.connect();
  const nowResult = await client.query('SELECT NOW() AS now');
  const stateTableResult = await client.query(
    'SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1) AS exists',
    [STATE_TABLE],
  );

  console.log(JSON.stringify({
    ok: true,
    now: nowResult.rows[0]?.now || null,
    stateTable: STATE_TABLE,
    stateTableExists: stateTableResult.rows[0]?.exists === true,
  }, null, 2));

  client.release();
  await pool.end();
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    message: error.message,
    code: error.code || null,
  }, null, 2));
  await pool.end().catch(() => {});
  process.exit(1);
}
