const express = require('express');
const router = express.Router();
const LogService = require('../services/LogService');
const { logsValidation } = require('../middleware/validate');

/**
 * GET /api/logs
 * Get logs with pagination and filtering
 */
router.get('/', logsValidation, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      level,
      type,
      status,
      backup_id,
      from,
      to
    } = req.query;
    
    const result = await LogService.getLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      level,
      type,
      status,
      backup_id,
      from: from ? parseInt(from) : null,
      to: to ? parseInt(to) : null
    });
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get logs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get logs'
    });
  }
});

/**
 * GET /api/logs/download
 * Download log file
 */
router.get('/download', async (req, res) => {
  try {
    const logFilePath = LogService.getLogFilePath();
    
    return res.download(logFilePath, 'backup.log');
  } catch (error) {
    console.error('Download logs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to download logs'
    });
  }
});

/**
 * DELETE /api/logs
 * Clear all logs
 */
router.delete('/', async (req, res) => {
  try {
    const result = await LogService.clearAllLogs();
    
    return res.json({
      success: true,
      message: 'All logs cleared successfully',
      data: result
    });
  } catch (error) {
    console.error('Clear logs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear logs'
    });
  }
});

module.exports = router;
