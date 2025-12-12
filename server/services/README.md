# Backend Services

Core business logic for the MongoDB Backup Manager.

## Service Overview

| Service | Purpose |
|---------|---------|
| `AuthService` | User authentication and password management |
| `BackupService` | Full and incremental backup operations |
| `EncryptionService` | Sensitive data encryption/decryption |
| `FtpService` | FTP upload/download operations |
| `LogService` | Activity logging and log retrieval |
| `RestoreService` | Database restoration operations |
| `ScheduleService` | Cron-based backup scheduling |
| `SettingsService` | Configuration storage and retrieval |

---

## AuthService

Handles user authentication with bcrypt password hashing and JWT tokens.

**Key Methods:**
- `init()` - Initialize default admin user
- `login(username, password)` - Authenticate and return JWT
- `validateToken(token)` - Verify JWT validity
- `changePassword(oldPassword, newPassword)` - Update password

---

## BackupService

Manages full and incremental backup operations using `mongodump`.

**Key Methods:**
- `createFullBackup()` - Complete database dump
- `createIncrementalBackup()` - Oplog-based incremental backup
- `listBackups()` - Get all backups with metadata
- `deleteBackup(id)` - Remove backup files
- `inspectBackup(id)` - View backup contents
- `cleanup()` - Apply retention policies

---

## EncryptionService

AES-256 encryption for storing sensitive configuration.

**Key Methods:**
- `encrypt(data)` - Encrypt string data
- `decrypt(data)` - Decrypt encrypted data

---

## FtpService

FTP client for uploading backups to remote servers.

**Key Methods:**
- `testConnection(config)` - Verify FTP credentials
- `uploadFile(localPath, remotePath)` - Upload backup file
- `listRemoteBackups()` - List remote backups
- `downloadFile(remotePath, localPath)` - Download backup

---

## LogService

SQLite-based activity logging.

**Key Methods:**
- `log(level, message, metadata)` - Write log entry
- `getLogs(filter)` - Retrieve filtered logs
- `clearLogs()` - Remove old logs

---

## RestoreService

Database restoration using `mongorestore`.

**Key Methods:**
- `restore(backupId)` - Full restore from backup
- `pointInTimeRestore(timestamp)` - PITR restore
- `getRestoreStatus()` - Check restore progress

---

## ScheduleService

Cron-based backup scheduler.

**Key Methods:**
- `init()` - Load saved schedules
- `startSchedule(cronExpression, type)` - Start scheduled backups
- `stopSchedule()` - Stop all schedules
- `getScheduleStatus()` - Get current schedule state

---

## SettingsService

Configuration management with encrypted storage.

**Key Methods:**
- `getSetting(key)` - Get single setting
- `getAllSettings()` - Get all settings
- `saveSetting(key, value)` - Save setting
- `saveSettings(settings)` - Save multiple settings
- `reset()` - Reset to defaults

---

## Initialization

All services are initialized at startup in `index.js`:

```javascript
await AuthService.init();
await SettingsService.init();
await LogService.init();
await BackupService.init();
await RestoreService.init();
await ScheduleService.init();
```

Services depend on each other:
- `BackupService` uses `FtpService`, `LogService`, `SettingsService`
- `ScheduleService` uses `BackupService`, `SettingsService`
- `SettingsService` uses `EncryptionService`
