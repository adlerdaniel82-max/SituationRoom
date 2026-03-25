const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const env = require('../config/env');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../sql/migrations');

async function main() {
  const mode = process.argv.includes('--baseline-existing') ? 'baseline' : 'apply';
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    multipleStatements: true,
    decimalNumbers: true
  });

  try {
    await ensureMigrationsTable(connection);
    const migrationFiles = await getMigrationFiles();
    const appliedRows = await loadAppliedMigrations(connection);
    const appliedMap = new Map(appliedRows.map((row) => [row.version, row]));

    if (mode === 'baseline') {
      let marked = 0;

      for (const migration of migrationFiles) {
        const existing = appliedMap.get(migration.version);
        if (existing) {
          verifyChecksum(existing, migration);
          continue;
        }

        await connection.execute(
          `INSERT INTO schema_migrations (version, name, checksum)
           VALUES (?, ?, ?)`,
          [migration.version, migration.name, migration.checksum]
        );
        marked += 1;
        console.log(`Baseline marked: ${migration.version} ${migration.name}`);
      }

      console.log(`Baseline complete. ${marked} migration(s) recorded.`);
      return;
    }

    let applied = 0;

    for (const migration of migrationFiles) {
      const existing = appliedMap.get(migration.version);
      if (existing) {
        verifyChecksum(existing, migration);
        continue;
      }

      console.log(`Applying: ${migration.version} ${migration.name}`);
      await connection.query(migration.sql);
      await connection.execute(
        `INSERT INTO schema_migrations (version, name, checksum)
         VALUES (?, ?, ?)`,
        [migration.version, migration.name, migration.checksum]
      );
      applied += 1;
    }

    console.log(`Migration run complete. ${applied} migration(s) applied.`);
  } finally {
    await connection.end();
  }
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
}

async function getMigrationFiles() {
  const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();

  const migrations = [];
  for (const file of files) {
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const sql = await fs.readFile(fullPath, 'utf8');
    migrations.push({
      version: file.split('_')[0],
      name: file,
      path: fullPath,
      sql,
      checksum: crypto.createHash('sha256').update(sql).digest('hex')
    });
  }

  return migrations;
}

async function loadAppliedMigrations(connection) {
  const [rows] = await connection.query(`
    SELECT version, name, checksum, applied_at
    FROM schema_migrations
    ORDER BY version ASC
  `);
  return rows;
}

function verifyChecksum(existing, migration) {
  if (existing.checksum !== migration.checksum) {
    throw new Error(
      `Checksum mismatch for migration ${migration.version} (${migration.name}). ` +
      `DB has ${existing.checksum}, file has ${migration.checksum}.`
    );
  }
}

main().catch((error) => {
  console.error(`Migration run failed: ${error.message}`);
  process.exitCode = 1;
});
