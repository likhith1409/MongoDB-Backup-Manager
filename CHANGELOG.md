# Changelog

All notable changes to MongoDB Backup Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-12

### Added
- Full MongoDB database backups with compression
- Incremental backups using oplog
- Point-in-time recovery (PITR) support
- FTP upload for remote backup storage
- Web-based dashboard for backup management
- JWT-based authentication
- Cron-based backup scheduling
- Backup retention policies
- Backup inspection and verification
- Log viewer with filtering
- Connection status monitoring
- Docker support with multi-stage builds
- Systemd service configuration

### Security
- Encrypted credential storage
- Password hashing with bcrypt
- Secure token-based authentication

---

## [Unreleased]

### Planned
- SFTP/SSH support for remote storage
- S3/Azure/GCS cloud storage integration
- Email notifications for backup status
- Multi-user support with roles
- Backup encryption at rest
- API rate limiting
