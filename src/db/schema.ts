import Database from 'better-sqlite3';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
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

// Database types
export interface Task {
  id: string;
  name: string;
  input_path: string;
  output_path?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  metadata?: string; // JSON string
}

export interface Result {
  id: string;
  task_id: string;
  output_path: string;
  metadata?: string; // JSON string
  created_at: string;
}

export interface Config {
  key: string;
  value: string;
  updated_at: string;
}

/**
 * Initialize database connection and create tables
 */
export async function initializeDatabase(): Promise<Database.Database> {
  const dbPath = path.join(os.homedir(), '.powder-ai', 'data.db');

  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  logger.info('Opening database', { path: dbPath });

  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  createTables(db);

  logger.info('Database initialized successfully');

  return db;
}

/**
 * Create all required tables
 */
function createTables(db: Database.Database): void {
  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      input_path TEXT NOT NULL,
      output_path TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      completed_at TEXT,
      metadata TEXT
    )
  `);

  logger.debug('Tasks table created or verified');

  // Results table
  db.exec(`
    CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      output_path TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  logger.debug('Results table created or verified');

  // Config table
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  logger.debug('Config table created or verified');

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_results_task_id ON results(task_id);
  `);

  logger.debug('Indexes created or verified');
}

/**
 * Get database instance singleton
 */
let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    throw new Error(
      'Database not initialized. Call initializeDatabase() first.'
    );
  }
  return dbInstance;
}

export function setDatabase(db: Database.Database): void {
  dbInstance = db;
}
