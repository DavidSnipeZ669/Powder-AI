import Database from 'better-sqlite3';
import { Result } from '../schema';
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

export class ResultRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new result record
   */
  createResult(
    id: string,
    taskId: string,
    outputPath: string,
    metadata?: Record<string, any>
  ): Result {
    const createdAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO results (id, task_id, output_path, metadata, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      taskId,
      outputPath,
      metadata ? JSON.stringify(metadata) : null,
      createdAt
    );

    logger.debug('Result created', { id, taskId });

    return this.getResult(id)!;
  }

  /**
   * Get a result by ID
   */
  getResult(id: string): Result | null {
    const stmt = this.db.prepare('SELECT * FROM results WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return this.mapRow(row);
  }

  /**
   * Get results for a specific task
   */
  getResultsByTaskId(taskId: string): Result[] {
    const stmt = this.db.prepare(
      'SELECT * FROM results WHERE task_id = ? ORDER BY created_at DESC'
    );
    const rows = stmt.all(taskId) as any[];

    return rows.map((row) => this.mapRow(row));
  }

  /**
   * List all results with pagination
   */
  listResults(limit: number = 100, offset: number = 0): Result[] {
    const stmt = this.db.prepare(
      'SELECT * FROM results ORDER BY created_at DESC LIMIT ? OFFSET ?'
    );
    const rows = stmt.all(limit, offset) as any[];

    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Delete a result
   */
  deleteResult(id: string): void {
    const stmt = this.db.prepare('DELETE FROM results WHERE id = ?');
    stmt.run(id);

    logger.debug('Result deleted', { id });
  }

  /**
   * Delete all results for a task
   */
  deleteResultsByTaskId(taskId: string): void {
    const stmt = this.db.prepare('DELETE FROM results WHERE task_id = ?');
    stmt.run(taskId);

    logger.debug('Task results deleted', { taskId });
  }

  /**
   * Get result count
   */
  getResultCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM results');
    const row = stmt.get() as any;

    return row.count;
  }

  /**
   * Map database row to Result interface
   */
  private mapRow(row: any): Result {
    return {
      id: row.id,
      task_id: row.task_id,
      output_path: row.output_path,
      metadata: row.metadata,
      created_at: row.created_at,
    };
  }
}
