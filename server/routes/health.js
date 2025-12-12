const express = require('express');
const router = express.Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    const BackupService = require('../services/BackupService');
    const ScheduleService = require('../services/ScheduleService');
    
    const backupStatus = BackupService.getCurrentStatus();
    const scheduleStatus = await ScheduleService.getStatus();
    
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        backup: backupStatus.currentBackup ? 'running' : 'idle',
        schedule: scheduleStatus.enabled ? 'enabled' : 'disabled'
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Health check failed'
    });
  }
});

module.exports = router;
