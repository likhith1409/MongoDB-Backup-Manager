const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const LogService = require('./LogService');

class FtpService {
  constructor() {
    this.maxRetries = 3;
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Get FTP configuration from settings
   */
  async getConfig(overrides = {}) {
    const SettingsService = require('./SettingsService');
    const settings = await SettingsService.getAll();
    
    // Merge saved settings with overrides (overrides take precedence)
    const host = overrides.ftpHost || settings.ftpHost || '';
    const port = overrides.ftpPort || settings.ftpPort || 21;
    const user = overrides.ftpUser || settings.ftpUser || '';
    const password = overrides.ftpPassword || settings.ftpPassword || '';
    const secure = overrides.ftpSecure !== undefined ? overrides.ftpSecure : (settings.ftpSecure || false);
    const basePath = overrides.ftpBasePath || settings.ftpBasePath || '/backups';

    // Sanitize host: remove protocol prefixes and trailing slashes
    const cleanHost = host.replace(/^https?:\/\//i, '').replace(/\/+$/, '');

    return {
      host: cleanHost,
      port: parseInt(port),
      user,
      password,
      secure,
      basePath
    };
  }

  /**
   * Create FTP client with configuration
   */
  async createClient(configOverrides = {}) {
    const config = await this.getConfig(configOverrides);
    const client = new ftp.Client(this.timeout);
    
    client.ftp.verbose = false; // Set to true for debugging
    
    return { client, config };
  }

  /**
   * Upload file to FTP with retry logic
   * @param {string} localPath - Local file path
   * @param {string} remotePath - Remote file path (relative to basePath)
   * @returns {Promise<{success: boolean, message: string, remotePath?: string}>}
   */
  async upload(localPath, remotePath) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const { client, config } = await this.createClient();
        
        await LogService.log('info', `FTP upload attempt ${attempt}/${this.maxRetries}`, {
          details: { localPath, remotePath }
        });
        
        await client.access({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          secure: config.secure
        });
        
        // Ensure remote directory exists
        const remoteDir = path.dirname(remotePath);
        const fullRemotePath = path.posix.join(config.basePath, remotePath);
        const fullRemoteDir = path.dirname(fullRemotePath);
        
        try {
          await client.ensureDir(fullRemoteDir);
        } catch (dirError) {
          // Try to create directory structure manually
          const dirs = fullRemoteDir.split('/').filter(d => d);
          let currentPath = '';
          for (const dir of dirs) {
            currentPath += '/' + dir;
            try {
              await client.send('MKD ' + currentPath);
            } catch {
              // Directory might already exist
            }
          }
        }
        
        // Upload file
        await client.uploadFrom(localPath, fullRemotePath);
        
        // Verify upload
        const size = await client.size(fullRemotePath);
        const localSize = fs.statSync(localPath).size;
        
        client.close();
        
        if (size === localSize) {
          await LogService.log('success', 'FTP upload successful', {
            details: { localPath, remotePath: fullRemotePath, size }
          });
          
          return {
            success: true,
            message: 'Upload successful',
            remotePath: fullRemotePath
          };
        } else {
          throw new Error(`Size mismatch: local ${localSize}, remote ${size}`);
        }
        
      } catch (error) {
        lastError = error;
        await LogService.log('warning', `FTP upload attempt ${attempt} failed: ${error.message}`, {
          details: { localPath, remotePath, error: error.message }
        });
        
        if (attempt < this.maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    await LogService.log('error', 'FTP upload failed after all retries', {
      details: { localPath, remotePath, error: lastError.message }
    });
    
    return {
      success: false,
      message: `Upload failed: ${lastError.message}`
    };
  }

  /**
   * Download file from FTP
   * @param {string} remotePath - Remote file path
   * @param {string} localPath - Local destination path
   */
  async download(remotePath, localPath) {
    try {
      const { client, config } = await this.createClient();
      
      await client.access({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        secure: config.secure
      });
      
      // Ensure local directory exists
      await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
      
      // Download file
      await client.downloadTo(localPath, remotePath);
      
      client.close();
      
      await LogService.log('success', 'FTP download successful', {
        details: { remotePath, localPath }
      });
      
      return { success: true, message: 'Download successful' };
    } catch (error) {
      await LogService.log('error', `FTP download failed: ${error.message}`, {
        details: { remotePath, localPath, error: error.message }
      });
      
      return { success: false, message: error.message };
    }
  }

  /**
   * Delete file from FTP
   * @param {string} remotePath - Remote file path
   */
  async delete(remotePath) {
    try {
      const { client, config } = await this.createClient();
      
      await client.access({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        secure: config.secure
      });
      
      await client.remove(remotePath);
      
      client.close();
      
      await LogService.log('info', 'FTP file deleted', {
        details: { remotePath }
      });
      
      return { success: true };
    } catch (error) {
      await LogService.log('error', `FTP delete failed: ${error.message}`, {
        details: { remotePath, error: error.message }
      });
      
      return { success: false, message: error.message };
    }
  }

  /**
   * List files in FTP directory
   * @param {string} remotePath - Remote directory path
   */
  async list(remotePath = '/') {
    try {
      const { client, config } = await this.createClient();
      
      await client.access({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        secure: config.secure
      });
      
      const fullPath = path.posix.join(config.basePath, remotePath);
      const files = await client.list(fullPath);
      
      client.close();
      
      return { success: true, files };
    } catch (error) {
      await LogService.log('error', `FTP list failed: ${error.message}`, {
        details: { remotePath, error: error.message }
      });
      
      return { success: false, files: [], message: error.message };
    }
  }

  /**
   * Test FTP connection
   */
  async testConnection(configOverrides = {}) {
    const startTime = Date.now();
    let client = null;
    
    try {
      const { client: ftpClient, config } = await this.createClient(configOverrides);
      client = ftpClient;
      
      // Validate configuration
      if (!config.host || !config.user) {
        return {
          success: false,
          message: 'FTP configuration incomplete',
          details: {
            error: 'Missing required fields (host or user)',
            host: config.host || 'Not configured',
            port: config.port,
            user: config.user || 'Not configured',
            basePath: config.basePath
          }
        };
      }
      
      // Attempt connection
      await client.access({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        secure: config.secure
      });
      
      // Try to access base path
      try {
        await client.list(config.basePath);
      } catch (listError) {
        // Base path might not exist yet, try to create it
        try {
          await client.ensureDir(config.basePath);
        } catch (dirError) {
          console.warn('Could not create base path:', dirError.message);
        }
      }
      
      const duration = Date.now() - startTime;
      
      client.close();
      
      await LogService.log('success', 'FTP connection test successful', {
        details: {
          host: config.host,
          port: config.port,
          basePath: config.basePath,
          duration: `${duration}ms`
        }
      });
      
      return {
        success: true,
        message: 'Connection successful',
        details: {
          host: config.host,
          port: config.port,
          user: config.user,
          basePath: config.basePath,
          duration: `${duration}ms`,
          status: 'Connected and ready'
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (client) {
        try {
          client.close();
        } catch {}
      }
      
      // Determine error type for better messaging
      let errorType = 'Connection failed';
      let troubleshooting = [];
      
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        errorType = 'Host not found';
        troubleshooting.push('Check if the FTP host address is correct');
        troubleshooting.push('Verify you have internet connectivity');
      } else if (error.message.includes('ECONNREFUSED')) {
        errorType = 'Connection refused';
        troubleshooting.push('Check if the FTP port is correct');
        troubleshooting.push('Verify the FTP server is running');
        troubleshooting.push('Check firewall settings');
      } else if (error.message.includes('530') || error.message.includes('Login')) {
        errorType = 'Authentication failed';
        troubleshooting.push('Verify username and password are correct');
        troubleshooting.push('Check if the account is active');
      } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorType = 'Connection timeout';
        troubleshooting.push('Check network connectivity');
        troubleshooting.push('Verify firewall allows FTP connections');
        troubleshooting.push('Try increasing timeout value');
      }
      
      await LogService.log('error', `FTP connection test failed: ${errorType}`, {
        details: {
          error: error.message,
          type: errorType,
          duration: `${duration}ms`
        }
      });
      
      return {
        success: false,
        message: errorType,
        details: {
          error: error.message,
          type: errorType,
          duration: `${duration}ms`,
          troubleshooting
        }
      };
    }
  }
}

module.exports = new FtpService();
