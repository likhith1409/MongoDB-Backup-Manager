const fs = require('fs').promises;
const path = require('path');
const Database = require('better-sqlite3');

class LogService {
  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'logs.db');
    this.logFilePath = path.join(process.cwd(), 'logs', 'backup.log');
    this.db = null;
  }

  async init() {
    try {
      // Ensure directories exist
      await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
      await fs.mkdir(path.join(process.cwd(), 'logs'), { recursive: true });
      
      // Initialize SQLite database
      this.db = new Database(this.dbPath);
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          level TEXT NOT NULL,
          message TEXT NOT NULL,
          details TEXT,
          backup_id TEXT,
          type TEXT,
          status TEXT
        )
      `);
      
      // Create index for faster queries
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_timestamp ON logs(timestamp DESC)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_backup_id ON logs(backup_id)');
      
      console.log('Log service initialized');
    } catch (error) {
      console.error('Failed to initialize log service:', error);
      throw error;
    }
  }

  /**
   * Log a message
   * @param {string} level - Log level: info, warning, error, success
   * @param {string} message - Log message
   * @param {object} options - Additional options (details, backup_id, type, status)
   */
  async log(level, message, options = {}) {
    try {
      const timestamp = Date.now();
      const logEntry = {
        timestamp,
        level,
        message,
        details: options.details ? JSON.stringify(options.details) : null,
        backup_id: options.backup_id || null,
        type: options.type || null,
        status: options.status || null
      };
      
      // Write to database
      if (this.db) {
        const stmt = this.db.prepare(`
          INSERT INTO logs (timestamp, level, message, details, backup_id, type, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          logEntry.timestamp,
          logEntry.level,
          logEntry.message,
          logEntry.details,
          logEntry.backup_id,
          logEntry.type,
          logEntry.status
        );
      }
      
      // Write to file
      const dateStr = new Date(timestamp).toISOString();
      const logLine = `[${dateStr}] [${level.toUpperCase()}] ${message}${
        logEntry.details ? ' | ' + logEntry.details : ''
      }\n`;
      await fs.appendFile(this.logFilePath, logLine, 'utf8');
      
      // Also log to console
      console.log(logLine.trim());
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  /**
   * Get logs with pagination and filtering
   * @param {object} options - Query options
   */
  async getLogs(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        level = null,
        type = null,
        status = null,
        backup_id = null,
        from = null,
        to = null
      } = options;
      
      let query = 'SELECT * FROM logs WHERE 1=1';
      const params = [];
      
      if (level) {
        query += ' AND level = ?';
        params.push(level);
      }
      
      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }
      
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      
      if (backup_id) {
        query += ' AND backup_id = ?';
        params.push(backup_id);
      }
      
      if (from) {
        query += ' AND timestamp >= ?';
        params.push(from);
      }
      
      if (to) {
        query += ' AND timestamp <= ?';
        params.push(to);
      }
      
      // Count total
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
      const { count } = this.db.prepare(countQuery).get(...params);
      
      // Get paginated results
      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);
      
      const logs = this.db.prepare(query).all(...params);
      
      // Parse details JSON
      logs.forEach(log => {
        if (log.details) {
          try {
            log.details = JSON.parse(log.details);
          } catch {
            // Keep as string if not valid JSON
          }
        }
      });
      
      return {
        logs,
        total: count,
        page,
        pages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('Failed to get logs:', error);
      return { logs: [], total: 0, page: 1, pages: 0 };
    }
  }

  /**
   * Get log file path for download
   */
  getLogFilePath() {
    return this.logFilePath;
  }

  /**
   * Clear old logs (older than retention days)
   */
  async clearOldLogs(retentionDays = 30) {
    try {
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      
      const stmt = this.db.prepare('DELETE FROM logs WHERE timestamp < ?');
      const result = stmt.run(cutoffTime);
      
      await this.log('info', `Cleared ${result.changes} old log entries`);
      return result.changes;
    } catch (error) {
      console.error('Failed to clear old logs:', error);
      return 0;
    }
  }

  /**
   * Clear all logs from database and file
   */
  async clearAllLogs() {
    try {
      // Clear all logs from database
      const stmt = this.db.prepare('DELETE FROM logs');
      const result = stmt.run();
      
      // Clear the log file
      await fs.writeFile(this.logFilePath, '', 'utf8');
      
      console.log(`Cleared ${result.changes} log entries`);
      return { success: true, cleared: result.changes };
    } catch (error) {
      console.error('Failed to clear all logs:', error);
      throw error;
    }
  }
}

module.exports = new LogService();
