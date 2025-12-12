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

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for simplicity, enable in production
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/health', healthRoutes);

// Protected routes
app.use('/api/backup', authMiddleware, backupRoutes);
app.use('/api/backups', authMiddleware, backupRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/logs', authMiddleware, logsRoutes);
app.use('/api/restore', authMiddleware, restoreRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
  
  app.use(express.static(clientBuildPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  await ScheduleService.stopSchedule();
  await LogService.log('info', 'MongoDB Backup Manager stopped');
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  
  await ScheduleService.stopSchedule();
  await LogService.log('info', 'MongoDB Backup Manager stopped');
  
  process.exit(0);
});

// Start server
async function startServer() {
  await initializeServices();
  
  // URL for the UI (Client)
  const CLIENT_PORT = 5551;
  
  // Start the main server (API + Static files if configured)
  app.listen(PORT, HOST, () => {
    // Start a second server specifically for the UI port to match local dev experience
    // This allows accessing http://localhost:5551 even in production/docker
    app.listen(CLIENT_PORT, HOST, () => {
      console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
      console.log(`║   MongoDB Backup Manager v1.0.0                                  ║`);
      console.log(`╠══════════════════════════════════════════════════════════════════╣`);
      console.log(`║   UI:       http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${CLIENT_PORT}                                  ║`);
      console.log(`║   API:      http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}                                  ║`);
      console.log(`╚══════════════════════════════════════════════════════════════════╝\n`);
    });
  });
}

startServer();
