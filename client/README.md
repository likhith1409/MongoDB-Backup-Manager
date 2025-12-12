# MongoDB Backup Manager - Frontend

React-based dashboard for managing MongoDB backups, built with Vite and Tailwind CSS.

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client
- **React Router** - Client-side routing

## Project Structure

```
client/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── BackupCard.jsx         # Backup item display
│   │   ├── BackupInspectionModal.jsx  # View backup contents
│   │   ├── Card.jsx               # Generic card wrapper
│   │   ├── ChangePasswordModal.jsx    # Password change form
│   │   ├── ConnectionStatus.jsx   # MongoDB/FTP status
│   │   ├── Modal.jsx              # Modal wrapper
│   │   ├── Navbar.jsx             # Navigation header
│   │   ├── PITRStatusCard.jsx     # Point-in-time recovery status
│   │   ├── StatusBadge.jsx        # Status indicators
│   │   └── Toast.jsx              # Notifications
│   ├── contexts/
│   │   └── AuthContext.jsx        # Authentication state
│   ├── pages/
│   │   ├── Dashboard.jsx          # Main backup management
│   │   ├── Login.jsx              # Authentication page
│   │   ├── Logs.jsx               # Log viewer
│   │   ├── Restore.jsx            # Restore operations
│   │   └── Settings.jsx           # Configuration page
│   ├── utils/
│   │   └── api.js                 # Axios instance with interceptors
│   ├── App.jsx                    # Root component with routing
│   ├── index.css                  # Global styles
│   └── main.jsx                   # Application entry point
├── index.html                     # HTML template
├── vite.config.js                 # Vite configuration
├── tailwind.config.js             # Tailwind configuration
└── package.json
```

## Development

```bash
# Install dependencies
npm install

# Start development server (port 5551)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

The development server proxies API requests to the backend:

| Frontend | Backend |
|----------|---------|
| `http://localhost:5551` | `http://localhost:5552` |

Proxy configuration is in `vite.config.js`:
- `/api/*` → Backend API
- `/health` → Backend health check

## Key Components

### Dashboard
Main page displaying backup list, status cards, and backup controls. Supports full and incremental backups with real-time progress.

### Settings
Configuration page for MongoDB connection, FTP settings, backup schedules, and retention policies.

### Restore
Restore operations including full restore and point-in-time recovery (PITR).

### Logs
Filterable log viewer with real-time updates.

## Building for Production

```bash
npm run build
```

Output is in `dist/` directory, which the backend serves in production mode.
