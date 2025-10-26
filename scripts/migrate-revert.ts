import { initDB, AppDataSource } from '../db/data-source.js';

async function main() {
  await initDB();
  console.log('[migrate:revert] Reverting last migration...');
  await AppDataSource.undoLastMigration();
  console.log('[migrate:revert] Done');
}

main().catch((err) => {
  console.error('[migrate:revert] Failed:', err);
  process.exit(1);
});