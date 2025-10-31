import Database from 'better-sqlite3';
import { Config } from '../schema';
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

export class ConfigRepository {
  constructor(private db: Database.Database) {}

  /**
   * Get a configuration value
   */
  getValue(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM config WHERE key = ?');
    const row = stmt.get(key) as any;

    return row ? row.value : null;
  }

  /**
   * Get a configuration value as JSON
   */
  getJsonValue(key: string): Record<string, any> | null {
    const value = this.getValue(key);
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      logger.error('Failed to parse config JSON', { key, error });
      return null;
    }
  }

  /**
   * Set a configuration value
   */
  setValue(key: string, value: string): void {
    const updatedAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO config (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
    `);

    stmt.run(key, value, updatedAt, value, updatedAt);

    logger.debug('Config value set', { key });
  }

  /**
   * Set a configuration value as JSON
   */
  setJsonValue(key: string, value: Record<string, any>): void {
    this.setValue(key, JSON.stringify(value));
  }

  /**
   * Get all configuration values
   */
  getAllConfig(): Config[] {
    const stmt = this.db.prepare('SELECT * FROM config');
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      key: row.key,
      value: row.value,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Delete a configuration value
   */
  deleteValue(key: string): void {
    const stmt = this.db.prepare('DELETE FROM config WHERE key = ?');
    stmt.run(key);

    logger.debug('Config value deleted', { key });
  }

  /**
   * Check if a configuration key exists
   */
  hasKey(key: string): boolean {
    const stmt = this.db.prepare(
      'SELECT 1 FROM config WHERE key = ? LIMIT 1'
    );
    const row = stmt.get(key);

    return row !== undefined;
  }
}
