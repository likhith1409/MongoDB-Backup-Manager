# MongoDB Backup Manager - Backend

Express.js API server handling backup operations, scheduling, authentication, and FTP uploads.

## Tech Stack

- **Express.js** - Web framework
- **better-sqlite3** - Local database for settings/logs
- **JWT** - Token-based authentication
- **node-cron** - Backup scheduling
- **basic-ftp** - FTP client
- **MongoDB Driver** - Database operations

## Project Structure

```
server/
├── index.js                # Application entry point
├── middleware/
│   └── auth.js             # JWT authentication middleware
├── routes/
│   ├── auth.js             # Login/logout/password endpoints
│   ├── backup.js           # Backup operations
│   ├── health.js           # Health check endpoint
│   ├── logs.js             # Log retrieval
│   ├── restore.js          # Restore operations
│   └── settings.js         # Configuration management
├── services/
│   ├── AuthService.js      # User authentication
│   ├── BackupService.js    # Full & incremental backups
│   ├── EncryptionService.js # Credential encryption
│   ├── FtpService.js       # FTP upload/download
│   ├── LogService.js       # Activity logging
│   ├── RestoreService.js   # Database restoration
│   ├── ScheduleService.js  # Cron job management
│   └── SettingsService.js  # Configuration storage
├── tests/
│   └── ...                 # Jest unit tests
├── data/                   # SQLite database (gitignored)
├── logs/                   # Log files (gitignored)
└── package.json
```

## API Endpoints

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/login` | User login |

### Protected Endpoints (Require JWT)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/logout` | User logout |
| POST | `/api/auth/change-password` | Change password |
| GET | `/api/backup/list` | List all backups |
| POST | `/api/backup/full` | Start full backup |
| POST | `/api/backup/incremental` | Start incremental backup |
| GET | `/api/backup/:id/inspect` | Inspect backup contents |
| DELETE | `/api/backup/:id` | Delete backup |
| POST | `/api/restore/:id` | Restore from backup |
| POST | `/api/restore/pitr` | Point-in-time restore |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |
| POST | `/api/settings/test-ftp` | Test FTP connection |
| POST | `/api/settings/reset` | Reset to defaults |
| GET | `/api/logs` | Get logs |

## Development

```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Environment Variables

See `.env.example` in the root directory for all configuration options.

Key variables:
- `PORT` - Server port (default: 5552)
- `HOST` - Bind address (default: 0.0.0.0)
- `MONGO_URL` - MongoDB connection string
- `JWT_SECRET` - Token signing secret
- `SETTINGS_ENCRYPTION_KEY` - Credential encryption key

## Data Storage

The server uses SQLite for:
- User credentials (hashed)
- Application settings (encrypted)
- Backup logs and metadata

Database location: `server/data/backup.db`

## Security

- Passwords are hashed with bcrypt
- Sensitive settings encrypted with AES-256
- JWT tokens expire after 24 hours
- All backup routes require authentication
