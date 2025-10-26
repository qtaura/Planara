import { initDB, AppDataSource } from '../db/data-source.js';

async function main() {
  await initDB();
  console.log('[migrate] Running pending migrations...');
  const results = await AppDataSource.runMigrations();
  for (const r of results) {
    console.log(`Applied migration: ${r.name}`);
  }
  console.log('[migrate] Done');
}

main().catch((err) => {
  console.error('[migrate] Failed:', err);
  process.exit(1);
});
