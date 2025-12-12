require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// Services
const AuthService = require('./services/AuthService');
const SettingsService = require('./services/SettingsService');
const LogService = require('./services/LogService');
const BackupService = require('./services/BackupService');
const ScheduleService = require('./services/ScheduleService');
const RestoreService = require('./services/RestoreService');

// Middleware
const authMiddleware = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');
const backupRoutes = require('./routes/backup');
const settingsRoutes = require('./routes/settings');
const logsRoutes = require('./routes/logs');
const healthRoutes = require('./routes/health');
const restoreRoutes = require('./routes/restore');

const app = express();
const PORT = process.env.PORT || 5552;
const HOST = process.env.HOST || '0.0.0.0';

// Initialize services
async function initializeServices() {
  try {
    console.log('Initializing services...');
    
    await AuthService.init();
    await SettingsService.init();
    await LogService.init();
    await BackupService.init();
    await RestoreService.init();
    await ScheduleService.init();
    
    console.log('All services initialized successfully');
    
    await LogService.log('info', 'MongoDB Backup Manager started');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

function configureApp(appInstance, isUiServer = false) {
  // Middleware
  appInstance.use(helmet({
    contentSecurityPolicy: false,
  }));
  appInstance.use(compression());
  appInstance.use(cors());
  appInstance.use(express.json());
  appInstance.use(express.urlencoded({ extended: true }));

  // Request logging
  appInstance.use((req, res, next) => {
    // Cleaner logging: don't log every static file asset
    if (!req.path.startsWith('/assets/')) {
        console.log(`[${isUiServer ? 'UI' : 'API'}] ${req.method} ${req.path}`);
    }
    next();
  });

  // API Routes (Mounted on both)
  appInstance.use('/api/auth', authRoutes);
  appInstance.use('/health', healthRoutes);
  appInstance.use('/api/backup', authMiddleware, backupRoutes);
  appInstance.use('/api/backups', authMiddleware, backupRoutes);
  appInstance.use('/api/settings', authMiddleware, settingsRoutes);
  appInstance.use('/api/logs', authMiddleware, logsRoutes);
  appInstance.use('/api/restore', authMiddleware, restoreRoutes);

  // Serve frontend routes (ONLY for UI Server in Production)
  if (isUiServer && process.env.NODE_ENV === 'production') {
    const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
    appInstance.use(express.static(clientBuildPath));
    appInstance.get('*', (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  } else if (!isUiServer) {
     // For API server, 404 for unknown non-API routes
     appInstance.use('/api/*', (req, res) => {
        res.status(404).json({ success: false, message: 'API endpoint not found' });
     });
     appInstance.get('/', (req, res) => {
        res.json({ message: 'MongoDB Backup Manager API is running. Access UI at port 5551.' });
     });
  }

  // Error handling
  appInstance.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  });
}

// Graceful shutdown
const shutdown = async () => {
    console.log('Shutting down gracefully...');
    await ScheduleService.stopSchedule();
    await LogService.log('info', 'MongoDB Backup Manager stopped');
    process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function startServer() {
  await initializeServices();
  
  // 1. Main API Server (5552)
  const apiApp = express();
  configureApp(apiApp, false);
  
  apiApp.listen(PORT, HOST, () => {
    console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
    console.log(`║   MongoDB Backup Manager v1.0.0                                  ║`);
    console.log(`╠══════════════════════════════════════════════════════════════════╣`);
    console.log(`║   API Server: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}                            ║`);

    // 2. UI Server (5551) - Only in Production
    // In dev, Vite handles the UI on 5551
    if (process.env.NODE_ENV === 'production') {
        const UI_PORT = 5551;
        const uiApp = express();
        configureApp(uiApp, true);
        
        uiApp.listen(UI_PORT, HOST, () => {
            console.log(`║   UI Server:  http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${UI_PORT}                            ║`);
            console.log(`╚══════════════════════════════════════════════════════════════════╝\n`);
        });
    } else {
        console.log(`║   UI Dev:     http://localhost:5551 (Managed by Vite)            ║`);
        console.log(`╚══════════════════════════════════════════════════════════════════╝\n`);
    }
  });
}

startServer();
