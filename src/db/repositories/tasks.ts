import Database from 'better-sqlite3';
import { Task } from '../schema';
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

export class TaskRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new task record
   */
  createTask(
    id: string,
    name: string,
    inputPath: string,
    metadata?: Record<string, any>
  ): Task {
    const createdAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, name, input_path, status, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      name,
      inputPath,
      'pending',
      createdAt,
      metadata ? JSON.stringify(metadata) : null
    );

    logger.debug('Task created', { id, name });

    return this.getTask(id)!;
  }

  /**
   * Get a task by ID
   */
  getTask(id: string): Task | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return this.mapRow(row);
  }

  /**
   * List all tasks with optional filtering
   */
  listTasks(
    status?: string,
    limit: number = 100,
    offset: number = 0
  ): Task[] {
    let query = 'SELECT * FROM tasks';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Update task status
   */
  updateTaskStatus(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): void {
    const stmt = this.db.prepare(
      'UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?'
    );

    const completedAt =
      status === 'completed' || status === 'failed'
        ? new Date().toISOString()
        : null;

    stmt.run(status, completedAt, id);

    logger.debug('Task status updated', { id, status });
  }

  /**
   * Update task with output path
   */
  updateTaskOutput(id: string, outputPath: string): void {
    const stmt = this.db.prepare(
      'UPDATE tasks SET output_path = ? WHERE id = ?'
    );

    stmt.run(outputPath, id);

    logger.debug('Task output path updated', { id, outputPath });
  }

  /**
   * Delete a task
   */
  deleteTask(id: string): void {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run(id);

    logger.debug('Task deleted', { id });
  }

  /**
   * Get task count by status
   */
  getTaskCountByStatus(): Record<string, number> {
    const stmt = this.db.prepare(
      'SELECT status, COUNT(*) as count FROM tasks GROUP BY status'
    );
    const rows = stmt.all() as any[];

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.status] = row.count;
    }

    return result;
  }

  /**
   * Map database row to Task interface
   */
  private mapRow(row: any): Task {
    return {
      id: row.id,
      name: row.name,
      input_path: row.input_path,
      output_path: row.output_path,
      status: row.status,
      created_at: row.created_at,
      completed_at: row.completed_at,
      metadata: row.metadata,
    };
  }
}
