const fs = require('fs').promises;
const { existsSync } = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const tar = require('tar');
const { MongoClient } = require('mongodb');
const BackupService = require('./BackupService'); // To get metadata
const EncryptionService = require('./EncryptionService');
const FtpService = require('./FtpService');
const LogService = require('./LogService');
const SettingsService = require('./SettingsService');

class RestoreService {
  constructor() {
    this.restoreDir = path.join(process.cwd(), 'data', 'restore_temp');
    this.currentRestore = null;
  }

  async init() {
     await fs.mkdir(this.restoreDir, { recursive: true });
  }

  /**
   * Restore a specific backup by ID
   * Auto-resolves dependencies (e.g. Full backup + 3 Incrementals)
   */
  async restoreBackup(backupId) {
    const targetBackup = BackupService.getBackupById(backupId);
    if (!targetBackup) {
      throw new Error('Backup not found');
    }

    await LogService.log('info', `Starting restore for backup: ${backupId}`, { type: targetBackup.type });

    // Identify chain
    let chain = [];
    
    if (targetBackup.type === 'full') {
      chain.push(targetBackup);
    } else {
      // It's incremental. Find the base full backup.
      const fullBackup = BackupService.db.prepare(
        'SELECT * FROM backups WHERE type = ? AND timestamp < ? AND status = ? ORDER BY timestamp DESC LIMIT 1'
      ).get('full', targetBackup.timestamp, 'completed');

      if (!fullBackup) {
         throw new Error('No base full backup found for this incremental backup');
      }

      chain.push(fullBackup);

      // Find intermediate incrementals
      const incrementals = BackupService.db.prepare(
        'SELECT * FROM backups WHERE type = ? AND timestamp > ? AND timestamp <= ? AND status = ? ORDER BY timestamp ASC'
      ).all('incremental', fullBackup.timestamp, targetBackup.timestamp, 'completed');
      
      chain = chain.concat(incrementals);
    }

    await LogService.log('info', `Restore chain identified with ${chain.length} backups`, { 
        chain: chain.map(b => b.id) 
    });

    this.currentRestore = { 
      targetBackupId: backupId, 
      chainLength: chain.length, 
      currentStep: 0,
      status: 'in_progress'
    };

    // Execute chain
    for (let i = 0; i < chain.length; i++) {
      this.currentRestore.currentStep = i + 1;
      await this.restoreSingleBackup(chain[i]);
    }

    this.currentRestore = null;
    await LogService.log('success', 'Restore completed successfully');
    return { success: true, filesRestored: chain.length };
  }

  /**
   * Restore to a specific point in time (PITR)
   * Automatically calculates and applies the backup chain
   */
  async restoreToPointInTime(targetTimestamp) {
    const targetTs = typeof targetTimestamp === 'string' 
      ? new Date(targetTimestamp).getTime() 
      : targetTimestamp;

    if (isNaN(targetTs)) {
      throw new Error('Invalid target timestamp');
    }

    await LogService.log('info', `Starting Point-in-Time restore to: ${new Date(targetTs).toISOString()}`);

    // Get the backup chain for this point in time
    const chainInfo = BackupService.getBackupChain(targetTs);
    
    await LogService.log('info', `PITR chain: 1 full backup + ${chainInfo.incrementalCount} incremental backups`, {
      fullBackup: chainInfo.fullBackup.id,
      incrementalCount: chainInfo.incrementalCount
    });

    this.currentRestore = { 
      targetTimestamp: targetTs, 
      chainLength: chainInfo.chain.length, 
      currentStep: 0,
      status: 'in_progress',
      type: 'pitr'
    };

    // Execute each backup in the chain
    for (let i = 0; i < chainInfo.chain.length; i++) {
      const backupInfo = chainInfo.chain[i];
      const backup = BackupService.getBackupById(backupInfo.id);
      
      if (!backup) {
        throw new Error(`Backup not found in chain: ${backupInfo.id}`);
      }

      this.currentRestore.currentStep = i + 1;
      await LogService.log('info', `Restoring backup ${i + 1}/${chainInfo.chain.length}: ${backup.type}`);
      await this.restoreSingleBackup(backup);
    }

    this.currentRestore = null;
    await LogService.log('success', `Point-in-Time restore completed to ${new Date(targetTs).toISOString()}`);
    
    return { 
      success: true, 
      targetTime: new Date(targetTs).toISOString(),
      filesRestored: chainInfo.chain.length,
      fullBackupId: chainInfo.fullBackup.id,
      incrementalCount: chainInfo.incrementalCount
    };
  }

  /**
   * Get current restore status
   */
  getCurrentStatus() {
    return this.currentRestore;
  }

  /**
   * Preview restore chain for a point in time (without executing)
   */
  previewRestore(targetTimestamp) {
    return BackupService.getBackupChain(targetTimestamp);
  }

  /**
   * Restore a single backup file
   */
  async restoreSingleBackup(backup) {
     const settings = await SettingsService.getAll();
     const mongoUrl = settings.mongoUrl;
     if (!mongoUrl) throw new Error('MongoDB URL not configured');

     let localPath = backup.local_path;
     let tempFtpPath = null;
     
     // If file is missing locally, try to download from FTP
     if (!localPath || !existsSync(localPath)) {
        if (backup.ftp_path) {
          await LogService.log('info', `Local file missing for ${backup.id}, downloading from FTP...`);
          tempFtpPath = path.join(this.restoreDir, `ftp_${backup.id}_${Date.now()}.gz`);
          
          const ftpResult = await FtpService.download(backup.ftp_path, tempFtpPath);
          if (!ftpResult.success) {
            throw new Error(`Failed to download backup from FTP: ${ftpResult.message}`);
          }
          
          localPath = tempFtpPath;
          await LogService.log('success', `Downloaded backup from FTP: ${backup.ftp_path}`);
        } else {
          throw new Error(`Backup file not found locally and no FTP path available: ${backup.filename}`);
        }
     }

     // Prepare file for restore (Decryption if needed)
     let processedPath = localPath;
     let tempDecryptedPath = null;

     if (backup.encrypted) {
        tempDecryptedPath = path.join(this.restoreDir, `decrypted_${backup.id}`);
        // Add extension based on type
        if (backup.type === 'full') tempDecryptedPath += '.gz';
        else tempDecryptedPath += '.oplog.gz';

        await LogService.log('info', `Decrypting ${backup.id}...`);
        await EncryptionService.decryptFile(localPath, tempDecryptedPath);
        processedPath = tempDecryptedPath;
     }

     try {
       if (backup.type === 'full') {
          await this.runMongorestore(mongoUrl, processedPath);
       } else {
          await this.applyIncremental(mongoUrl, processedPath);
       }
     } finally {
        // Cleanup temp files
        if (tempDecryptedPath) {
            await fs.unlink(tempDecryptedPath).catch(() => {});
        }
        if (tempFtpPath) {
            await fs.unlink(tempFtpPath).catch(() => {});
        }
     }
  }

  async fileExists(filePath) {
      try {
          await fs.stat(filePath);
          return true;
      } catch {
          return false;
      }
  }

  /**
   * Run mongorestore for full backup
   */
  async runMongorestore(mongoUrl, filePath) {
      await LogService.log('info', 'Running mongorestore...');
      return new Promise((resolve, reject) => {
          const args = [
              `--uri=${mongoUrl}`,
              `--archive=${filePath}`,
              '--gzip',
              '--drop' // Overwrites existing data
          ];

          const restore = spawn('mongorestore', args);
          
          let stderr = '';
          restore.stderr.on('data', d => stderr += d.toString());
          
          restore.on('close', code => {
              if (code === 0) resolve();
              else reject(new Error(`mongorestore failed: ${stderr}`));
          });
          
          restore.on('error', reject);
      });
  }

  /**
   * Apply incremental backup (Oplog Slice)
   * 
   * Strategy: 
   * 1. Restore the oplog archive to a temporary database (contains local.oplog.rs)
   * 2. Read oplog entries and apply operations to the real database
   * 3. Clean up the temp database
   */
  async applyIncremental(mongoUrl, filePath) {
      await LogService.log('info', 'Applying incremental oplog slice...');
      
      const tempDbName = `_oplog_restore_temp_${Date.now()}`;
      let client = null;
      
      try {
          // Step 1: Restore the oplog archive to temp database
          // This restores local.oplog.rs to tempDbName.oplog.rs
          await LogService.log('info', 'Restoring oplog to temporary database...');
          await this.restoreOplogToTempDb(mongoUrl, filePath, tempDbName);
          
          // Step 2: Connect to MongoDB and apply oplog entries
          await LogService.log('info', 'Connecting to MongoDB to apply oplog entries...');
          client = new MongoClient(mongoUrl);
          await client.connect();
          
          // The oplog was from local.oplog.rs, restored to tempDbName.oplog (collection renamed)
          const tempDb = client.db(tempDbName);
          
          // Try to find the oplog collection (it might be named 'oplog' or 'oplog.rs')
          const collections = await tempDb.listCollections().toArray();
          console.log('[RestoreService] Temp DB collections:', collections.map(c => c.name));
          
          let oplogCollectionName = null;
          for (const col of collections) {
              if (col.name.includes('oplog')) {
                  oplogCollectionName = col.name;
                  break;
              }
          }
          
          if (!oplogCollectionName) {
              await LogService.log('warning', 'No oplog collection found in temp database. Skipping incremental restore.');
              return;
          }
          
          const oplogCollection = tempDb.collection(oplogCollectionName);
          const oplogCount = await oplogCollection.countDocuments();
          
          await LogService.log('info', `Found ${oplogCount} oplog entries to apply`);
          
          if (oplogCount === 0) {
              await LogService.log('warning', 'Oplog is empty. No changes to apply.');
              return;
          }
          
          // Step 3: Apply each oplog entry
          let appliedCount = 0;
          let skippedCount = 0;
          let errorCount = 0;
          
          const cursor = oplogCollection.find().sort({ ts: 1 }); // Apply in order
          
          while (await cursor.hasNext()) {
              const op = await cursor.next();
              
              try {
                  const applied = await this.applyOplogEntry(client, op);
                  if (applied) {
                      appliedCount++;
                  } else {
                      skippedCount++;
                  }
              } catch (err) {
                  console.error('[RestoreService] Error applying oplog entry:', err.message);
                  errorCount++;
              }
          }
          
          await LogService.log('success', `Incremental restore completed: ${appliedCount} applied, ${skippedCount} skipped, ${errorCount} errors`);
          
          // Step 4: Drop temp database
          await tempDb.dropDatabase();
          await LogService.log('info', 'Cleaned up temporary database');
          
      } catch (error) {
          await LogService.log('error', `Incremental restore failed: ${error.message}`);
          throw error;
      } finally {
          if (client) {
              // Try to cleanup temp database even on error
              try {
                  await client.db(tempDbName).dropDatabase();
              } catch (e) {}
              await client.close();
          }
      }
  }

  /**
   * Restore oplog archive to a temporary database
   */
  restoreOplogToTempDb(mongoUrl, archivePath, tempDbName) {
      return new Promise((resolve, reject) => {
          // Restore local.oplog.rs as tempDbName.oplog
          const args = [
              `--uri=${mongoUrl}`,
              `--archive=${archivePath}`,
              '--gzip',
              '--nsFrom=local.oplog.rs',
              `--nsTo=${tempDbName}.oplog`
          ];
          
          console.log('[Command] mongorestore (oplog to temp)', args.join(' '));
          
          const proc = spawn('mongorestore', args);
          let stderr = '';
          
          proc.stderr.on('data', d => {
              stderr += d.toString();
              console.log('[mongorestore]', d.toString());
          });
          
          proc.on('close', code => {
              if (code === 0) {
                  resolve();
              } else {
                  // Don't reject on non-zero - sometimes it says "0 documents" but that's ok
                  console.log('[RestoreService] mongorestore exit code:', code, 'stderr:', stderr);
                  resolve(); // Continue anyway and check for data
              }
          });
          
          proc.on('error', reject);
      });
  }

  /**
   * Apply a single oplog entry to the database
   */
  async applyOplogEntry(client, op) {
      // Oplog entry structure:
      // { ts, t, h, v, op, ns, ui, wall, o, o2 }
      // op: 'i' (insert), 'u' (update), 'd' (delete), 'c' (command), 'n' (noop)
      // ns: namespace like "test.incre" or "test.$cmd" for commands
      // o: the document or update spec
      // o2: the query for update/delete (contains _id)
      
      const { op: opType, ns, o, o2 } = op;
      
      // Debug: Log every oplog entry
      console.log(`[Oplog] Processing: op=${opType}, ns=${ns}, o=${JSON.stringify(o).substring(0, 100)}`);
      
      // Skip noops
      if (opType === 'n') {
          console.log('[Oplog] Skipping noop');
          return false;
      }
      
      // Skip if no namespace
      if (!ns) {
          console.log('[Oplog] Skipping: no namespace');
          return false;
      }
      
      // Handle applyOps commands specially - these contain nested operations!
      // applyOps comes from transactions and bulk writes
      if (opType === 'c' && o && o.applyOps && Array.isArray(o.applyOps)) {
          console.log(`[Oplog] Found applyOps with ${o.applyOps.length} nested operations`);
          let appliedCount = 0;
          
          for (const nestedOp of o.applyOps) {
              // Apply each nested operation
              const nestedApplied = await this.applyNestedOp(client, nestedOp);
              if (nestedApplied) appliedCount++;
          }
          
          console.log(`[Oplog] Applied ${appliedCount}/${o.applyOps.length} nested operations`);
          return appliedCount > 0;
      }
      
      // Skip system namespaces (but we already handled applyOps above)
      if (ns.startsWith('config.') || ns.startsWith('local.')) {
          console.log(`[Oplog] Skipping system namespace: ${ns}`);
          return false;
      }
      
      // Skip admin.$cmd that's NOT applyOps (already handled above)
      if (ns.startsWith('admin.')) {
          console.log(`[Oplog] Skipping admin namespace: ${ns}`);
          return false;
      }

      // Handle commands (like createCollection, createIndexes, drop, etc.)
      if (opType === 'c') {
          console.log(`[Oplog] Command operation: ${JSON.stringify(o)}`);
          
          // Commands have ns like "dbName.$cmd"
          const dbName = ns.split('.')[0];
          
          try {
              // Try to run the command
              if (o.create) {
                  // createCollection
                  console.log(`[Oplog] Creating collection: ${dbName}.${o.create}`);
                  await client.db(dbName).createCollection(o.create);
                  return true;
              } else if (o.drop) {
                  // SKIP DROP COMMANDS - we don't want to delete data during restore!
                  console.log(`[Oplog] SKIPPING DROP command (would delete ${dbName}.${o.drop})`);
                  return false;
              } else if (o.dropDatabase) {
                  // SKIP dropDatabase - we definitely don't want this during restore!
                  console.log(`[Oplog] SKIPPING dropDatabase command for ${dbName}`);
                  return false;
              } else if (o.createIndexes) {
                  // Skip index creation for now (complex)
                  console.log('[Oplog] Skipping createIndexes command');
                  return false;
              } else {
                  console.log(`[Oplog] Unknown command, skipping: ${JSON.stringify(o)}`);
                  return false;
              }
          } catch (err) {
              console.log(`[Oplog] Command error (likely already exists): ${err.message}`);
              return false;
          }
      }
      
      // Parse namespace for regular operations
      const [dbName, ...collParts] = ns.split('.');
      const collName = collParts.join('.'); // Handle collection names with dots
      
      if (!dbName || !collName || collName === '$cmd') {
          console.log(`[Oplog] Skipping invalid namespace: ${ns}`);
          return false;
      }
      
      const collection = client.db(dbName).collection(collName);
      
      try {
          switch (opType) {
              case 'i': // Insert
                  console.log(`[Oplog] Inserting into ${ns}`);
                  await collection.insertOne(o);
                  return true;
                  
              case 'u': // Update
                  if (o2 && o2._id) {
                      console.log(`[Oplog] Updating in ${ns}, _id=${o2._id}`);
                      // Check if o contains update operators or is a full document
                      const hasOperators = Object.keys(o).some(k => k.startsWith('$'));
                      if (hasOperators) {
                          await collection.updateOne({ _id: o2._id }, o);
                      } else {
                          // MongoDB 5.0+ uses 'diff' format, need to handle it
                          if (o.diff) {
                              // Modern oplog format with diff
                              console.log('[Oplog] Update with diff format, attempting replaceOne');
                              // We can't directly apply diff, try to fetch and merge
                              return false;
                          }
                          await collection.replaceOne({ _id: o2._id }, o, { upsert: true });
                      }
                      return true;
                  }
                  console.log('[Oplog] Update missing o2._id');
                  return false;
                  
              case 'd': // Delete
                  if (o && o._id) {
                      console.log(`[Oplog] Deleting from ${ns}, _id=${o._id}`);
                      await collection.deleteOne({ _id: o._id });
                      return true;
                  }
                  console.log('[Oplog] Delete missing o._id');
                  return false;
                  
              default:
                  console.log(`[Oplog] Unknown operation type: ${opType}`);
                  return false;
          }
      } catch (err) {
          // Handle duplicate key errors gracefully (document might already exist)
          if (err.code === 11000) {
              console.log(`[Oplog] Duplicate key in ${ns}, document already exists`);
              return false;
          }
          console.error(`[Oplog] Error: ${err.message}`);
          throw err;
      }
  }

  /**
   * Apply a nested operation from inside an applyOps command
   * These have a different structure: { op, ns, o, o2 }
   */
  async applyNestedOp(client, nestedOp) {
      const { op: opType, ns, o, o2 } = nestedOp;
      
      // Skip system namespaces
      if (!ns || ns.startsWith('admin.') || ns.startsWith('config.') || ns.startsWith('local.')) {
          return false;
      }
      
      // Parse namespace
      const [dbName, ...collParts] = ns.split('.');
      const collName = collParts.join('.');
      
      if (!dbName || !collName) {
          return false;
      }
      
      const collection = client.db(dbName).collection(collName);
      
      try {
          switch (opType) {
              case 'i': // Insert
                  console.log(`[Oplog/Nested] Inserting into ${ns}`);
                  await collection.insertOne(o);
                  return true;
                  
              case 'u': // Update
                  if (o2 && o2._id) {
                      console.log(`[Oplog/Nested] Updating in ${ns}`);
                      const hasOperators = Object.keys(o).some(k => k.startsWith('$'));
                      if (hasOperators) {
                          await collection.updateOne({ _id: o2._id }, o);
                      } else {
                          await collection.replaceOne({ _id: o2._id }, o, { upsert: true });
                      }
                      return true;
                  }
                  return false;
                  
              case 'd': // Delete - skip during restore
                  console.log(`[Oplog/Nested] SKIPPING delete in ${ns}`);
                  return false;
                  
              default:
                  return false;
          }
      } catch (err) {
          if (err.code === 11000) {
              console.log(`[Oplog/Nested] Duplicate key in ${ns}, skipping`);
              return false;
          }
          console.error(`[Oplog/Nested] Error: ${err.message}`);
          return false;
      }
  }
}

module.exports = new RestoreService();



