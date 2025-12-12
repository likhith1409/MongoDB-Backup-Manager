const express = require('express');
const router = express.Router();
const AuthService = require('../services/AuthService');
const authMiddleware = require('../middleware/auth');
const { loginValidation } = require('../middleware/validate');

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', loginValidation, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await AuthService.login(username, password);
    
    if (result.success) {
      return res.json({
        success: true,
        token: result.token,
        username: result.username,
        isFirstLogin: result.isFirstLogin,
        message: 'Login successful'
      });
    } else {
      return res.status(401).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId || 1;
    const profile = AuthService.getUserProfile(userId);
    
    if (profile) {
      return res.json({
        success: true,
        data: profile
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

/**
 * POST /api/auth/change-password
 * Update user credentials (username and password)
 */
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newUsername, newPassword } = req.body;
    
    // Validation
    if (!currentPassword || !newUsername || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new username, and new password are required'
      });
    }
    
    if (newUsername.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    const userId = req.user.userId || 1;
    const result = await AuthService.updateCredentials(userId, currentPassword, newUsername.trim(), newPassword);
    
    if (result.success) {
      return res.json({
        success: true,
        message: result.message
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update credentials'
    });
  }
});

/**
 * POST /api/auth/skip-first-login
 * Skip the first login password change modal
 */
router.post('/skip-first-login', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId || 1;
    const success = AuthService.markFirstLoginComplete(userId);
    
    if (success) {
      return res.json({
        success: true,
        message: 'First login marked as complete'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to update'
      });
    }
  } catch (error) {
    console.error('Skip first login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to skip first login'
    });
  }
});

module.exports = router;
