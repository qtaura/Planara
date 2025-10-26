import fs from 'fs';
import path from 'path';

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const name = process.argv[2];
if (!name) {
  console.error('Usage: npm run migrate:new <name>');
  process.exit(1);
}

const stamp = nowStamp();
const fileName = `${stamp}-${name}.ts`;
const outDir = path.join(process.cwd(), 'migrations');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, fileName);

const tpl = `import { MigrationInterface, QueryRunner } from "typeorm";

export class ${name.replace(/[^a-zA-Z0-9_]/g, '')}${stamp} implements MigrationInterface {
  name = "${name}${stamp}";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // TODO: apply schema changes
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // TODO: revert schema changes
  }
}
`;

fs.writeFileSync(outPath, tpl, 'utf8');
console.log(`[migrate:new] Created ${path.relative(process.cwd(), outPath)}`);
