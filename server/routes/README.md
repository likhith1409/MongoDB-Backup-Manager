# API Routes

REST API endpoint definitions for the MongoDB Backup Manager.

## Authentication

All routes except `/health` and `/api/auth/login` require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Auth Routes (`/api/auth`)

### POST `/api/auth/login`
Authenticate user and receive JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST `/api/auth/logout`
Invalidate current session.

### POST `/api/auth/change-password`
Change the admin password.

**Request:**
```json
{
  "currentPassword": "oldpass",
  "newPassword": "newpass"
}
```

---

## Backup Routes (`/api/backup`)

### GET `/api/backup/list`
List all available backups.

**Response:**
```json
{
  "success": true,
  "backups": [
    {
      "id": "full_20241201_120000",
      "type": "full",
      "timestamp": "2024-12-01T12:00:00.000Z",
      "size": 10485760,
      "status": "completed"
    }
  ]
}
```

### POST `/api/backup/full`
Trigger a full database backup.

**Response:**
```json
{
  "success": true,
  "message": "Full backup started",
  "backupId": "full_20241201_120000"
}
```

### POST `/api/backup/incremental`
Trigger an incremental (oplog) backup.

### GET `/api/backup/:id/inspect`
View contents of a backup.

**Response:**
```json
{
  "success": true,
  "backup": {
    "id": "full_20241201_120000",
    "databases": ["mydb"],
    "collections": ["users", "orders"],
    "documentCounts": { "users": 1000, "orders": 5000 }
  }
}
```

### DELETE `/api/backup/:id`
Delete a backup.

---

## Restore Routes (`/api/restore`)

### POST `/api/restore/:id`
Restore from a specific backup.

**Request:**
```json
{
  "targetDatabase": "mydb",
  "drop": true
}
```

### POST `/api/restore/pitr`
Point-in-time restore.

**Request:**
```json
{
  "timestamp": "2024-12-01T12:00:00.000Z"
}
```

### GET `/api/restore/status`
Get current restore operation status.

---

## Settings Routes (`/api/settings`)

### GET `/api/settings`
Get current configuration.

**Response:**
```json
{
  "success": true,
  "settings": {
    "mongoUrl": "mongodb://...",
    "ftpEnabled": false,
    "backupCron": "0 2 * * *",
    "retentionDays": 30
  }
}
```

### PUT `/api/settings`
Update configuration.

**Request:**
```json
{
  "ftpHost": "ftp.example.com",
  "ftpUser": "user",
  "ftpPassword": "pass"
}
```

### POST `/api/settings/test-ftp`
Test FTP connection with provided or saved credentials.

**Request:**
```json
{
  "host": "ftp.example.com",
  "port": 21,
  "user": "ftpuser",
  "password": "ftppass"
}
```

### POST `/api/settings/reset`
Reset all settings to defaults.

---

## Log Routes (`/api/logs`)

### GET `/api/logs`
Retrieve activity logs.

**Query Parameters:**
- `level` - Filter by log level (info, warn, error)
- `limit` - Max entries to return
- `offset` - Pagination offset

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "level": "info",
      "message": "Full backup completed",
      "timestamp": "2024-12-01T12:00:00.000Z"
    }
  ]
}
```

---

## Health Routes (`/health`)

### GET `/health`
Health check endpoint (no auth required).

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-01T12:00:00.000Z"
}
```

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `404` - Resource not found
- `500` - Internal server error
