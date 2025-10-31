import Database from 'better-sqlite3';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

/**
 * Database migration system for schema evolution
 * Each migration should be idempotent (safe to run multiple times)
 */

interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db: Database.Database) => {
      // Initial schema is created in schema.ts
      logger.info('Migration 1: initial_schema applied');
    },
  },
];

/**
 * Track applied migrations in database
 */
function ensureMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);
}

/**
 * Get the current migration version
 */
function getCurrentVersion(db: Database.Database): number {
  ensureMigrationsTable(db);

  const stmt = db.prepare(
    'SELECT MAX(version) as version FROM schema_migrations'
  );
  const row = stmt.get() as any;

  return row.version || 0;
}

/**
 * Run all pending migrations
 */
export function runMigrations(db: Database.Database): void {
  const currentVersion = getCurrentVersion(db);

  logger.info('Running database migrations', { currentVersion });

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      try {
        logger.info('Applying migration', {
          version: migration.version,
          name: migration.name,
        });

        migration.up(db);

        // Record migration
        const stmt = db.prepare(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
        );
        stmt.run(
          migration.version,
          migration.name,
          new Date().toISOString()
        );

        logger.info('Migration applied successfully', {
          version: migration.version,
        });
      } catch (error) {
        logger.error('Migration failed', {
          version: migration.version,
          name: migration.name,
          error: (error as Error).message,
        });
        throw error;
      }
    }
  }

  logger.info('All migrations completed');
}
