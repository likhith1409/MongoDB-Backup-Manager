const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const Database = require('better-sqlite3');

class SettingsService {
  constructor() {
    this.encryptionKey = process.env.SETTINGS_ENCRYPTION_KEY || 'default_key_change_me_to_32_chars_min';
    this.algorithm = 'aes-256-cbc';
    this.dbPath = path.join(process.cwd(), 'data', 'settings.db');
    this.jsonPath = path.join(process.cwd(), 'data', 'settings.json');
    this.db = null;
    this.useSqlite = true;
    
    this.defaultSettings = {
      mongoUrl: process.env.MONGO_URL || '',
      ftpHost: process.env.FTP_HOST || '',
      ftpPort: parseInt(process.env.FTP_PORT) || 21,
      ftpUser: process.env.FTP_USER || '',
      ftpPassword: process.env.FTP_PASSWORD || '',
      ftpSecure: process.env.FTP_SECURE === 'true',
      ftpBasePath: process.env.FTP_BASE_PATH || '/backups',
      keepLocalBackups: process.env.KEEP_LOCAL_BACKUPS === 'true',
      keepLastNBackups: parseInt(process.env.KEEP_LAST_N_BACKUPS) || 30,
      retentionDays: parseInt(process.env.RETENTION_DAYS) || 30,
      backupCron: process.env.BACKUP_CRON || '0 2 * * *',
      scheduleEnabled: false
    };
  }

  async init() {
    try {
      // Ensure data directory exists
      await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
      
      // Try to initialize SQLite
      try {
        this.db = new Database(this.dbPath);
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          )
        `);
        this.useSqlite = true;
        console.log('Settings service initialized with SQLite');
      } catch (sqliteError) {
        console.warn('SQLite unavailable, falling back to JSON:', sqliteError.message);
        this.useSqlite = false;
      }
      
      // Load or create initial settings
      const existingSettings = await this.getAll();
      if (!existingSettings || Object.keys(existingSettings).length === 0) {
        await this.saveAll(this.defaultSettings);
      }
    } catch (error) {
      console.error('Failed to initialize settings service:', error);
      throw error;
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(text) {
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Get all settings (decrypted)
   */
  async getAll() {
    try {
      if (this.useSqlite && this.db) {
        const rows = this.db.prepare('SELECT key, value FROM settings').all();
        const settings = {};
        
        for (const row of rows) {
          try {
            settings[row.key] = JSON.parse(row.value);
          } catch {
            settings[row.key] = row.value;
          }
        }
        
        // Decrypt sensitive fields
        if (settings.ftpPassword) {
          settings.ftpPassword = this.decrypt(settings.ftpPassword);
        }
        if (settings.mongoUrl) {
          settings.mongoUrl = this.decrypt(settings.mongoUrl);
        }
        
        return settings;
      } else {
        // JSON fallback
        try {
          const data = await fs.readFile(this.jsonPath, 'utf8');
          const settings = JSON.parse(data);
          
          // Decrypt sensitive fields
          if (settings.ftpPassword) {
            settings.ftpPassword = this.decrypt(settings.ftpPassword);
          }
          if (settings.mongoUrl) {
            settings.mongoUrl = this.decrypt(settings.mongoUrl);
          }
          
          return settings;
        } catch (error) {
          return {};
        }
      }
    } catch (error) {
      console.error('Failed to get settings:', error);
      return this.defaultSettings;
    }
  }

  /**
   * Get all settings with sensitive fields masked for API response
   */
  async getAllSafe() {
    const settings = await this.getAll();
    return {
      ...settings,
      mongoUrl: settings.mongoUrl ? '***' : '',
      ftpPassword: settings.ftpPassword ? '***' : ''
    };
  }

  /**
   * Save all settings
   */
  async saveAll(settings) {
    try {
      // Get current settings to preserve encrypted values
      const currentSettings = await this.getAll();
      const toSave = { ...settings };
      
      // Only encrypt if the value has changed and is not masked
      if (toSave.ftpPassword) {
        if (toSave.ftpPassword === '***') {
          // Preserve existing encrypted value
          const existing = await this.getRawEncrypted('ftpPassword');
          toSave.ftpPassword = existing || this.encrypt('');
        } else if (toSave.ftpPassword !== currentSettings.ftpPassword) {
          // New value, encrypt it
          toSave.ftpPassword = this.encrypt(toSave.ftpPassword);
        } else {
          // Same value, get encrypted version
          const existing = await this.getRawEncrypted('ftpPassword');
          toSave.ftpPassword = existing || this.encrypt(toSave.ftpPassword);
        }
      }
      
      if (toSave.mongoUrl) {
        if (toSave.mongoUrl === '***') {
          // Preserve existing encrypted value
          const existing = await this.getRawEncrypted('mongoUrl');
          toSave.mongoUrl = existing || this.encrypt('');
        } else if (toSave.mongoUrl !== currentSettings.mongoUrl) {
          // New value, encrypt it
          toSave.mongoUrl = this.encrypt(toSave.mongoUrl);
        } else {
          // Same value, get encrypted version
          const existing = await this.getRawEncrypted('mongoUrl');
          toSave.mongoUrl = existing || this.encrypt(toSave.mongoUrl);
        }
      }
      
      if (this.useSqlite && this.db) {
        const stmt = this.db.prepare(
          'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
        );
        
        const now = Date.now();
        for (const [key, value] of Object.entries(toSave)) {
          stmt.run(key, JSON.stringify(value), now);
        }
      } else {
        // JSON fallback
        await fs.writeFile(this.jsonPath, JSON.stringify(toSave, null, 2), 'utf8');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  /**
   * Get raw encrypted value (without decryption)
   */
  async getRawEncrypted(key) {
    try {
      if (this.useSqlite && this.db) {
        const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        if (row) {
          try {
            return JSON.parse(row.value);
          } catch {
            return row.value;
          }
        }
      } else {
        try {
          const data = await fs.readFile(this.jsonPath, 'utf8');
          const settings = JSON.parse(data);
          return settings[key];
        } catch {
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get raw encrypted value:', error);
      return null;
    }
  }

  /**
   * Get a specific setting
   */
  async get(key) {
    const settings = await this.getAll();
    return settings[key];
  }

  /**
   * Save a specific setting
   */
  async set(key, value) {
    const settings = await this.getAll();
    settings[key] = value;
    return await this.saveAll(settings);
  }
  /**
   * Reset all settings to defaults
   */
  async resetToDefaults() {
    try {
      if (this.useSqlite && this.db) {
        this.db.prepare('DELETE FROM settings').run();
      } else {
        await fs.unlink(this.jsonPath).catch(() => {});
      }
      
      await this.saveAll(this.defaultSettings);
      return true;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      return false;
    }
  }
}

module.exports = new SettingsService();
