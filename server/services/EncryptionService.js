const crypto = require('crypto');
const fs = require('fs');
const { pipeline } = require('stream/promises');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.algorithm = 'aes-256-gcm';
    this.SettingsService = require('./SettingsService');
  }

  async getKey() {
      const settings = await this.SettingsService.getAll();
      const keyString = settings.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY || 'default-insecure-key-change-this-in-prod';
      return crypto.scryptSync(keyString, 'salt', 32);
  }

  /**
   * Encrypts a read input stream and writes to an output stream.
   * Prepends the IV and AuthTag to the output stream.
   * Format: [IV (16 bytes)] [AuthTag (16 bytes)] [Encrypted Data...]
   * @param {ReadableStream} inputStream 
   * @param {WritableStream} outputStream 
   */
  async encryptStream(inputStream, outputStream) {
    const key = await this.getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    // Write IV to output first
    outputStream.write(iv);
    
    // We can't write AuthTag yet because it's generated after encryption.
    // So usually with GCM streams in Node, we can't easily prepend the AuthTag *before* the data if we stream it directly 
    // unless we use a specific protocol or structure.
    // 
    // Standard approach for GCM stream is:
    // IV (16) + EncryptedChunk + ... + AuthTag (16) at the end? 
    // Or we can save AuthTag separately. 
    //
    // However, `crypto.createCipheriv` stream doesn't emit auth tag until `final`.
    // So we will append AuthTag at the end of the stream.
    // 
    // Format: [IV (16 bytes)] [Encrypted Data...] [AuthTag (16 bytes)]
    
    return new Promise((resolve, reject) => {
      cipher.on('error', reject);
      outputStream.on('error', reject);
      
      // Pipe input -> cipher -> output (but we need to intervene to write auth tag at end)
      
      inputStream.pipe(cipher, { end: false });
      
      cipher.on('data', (chunk) => {
        outputStream.write(chunk);
      });
      
      cipher.on('end', () => {
        const authTag = cipher.getAuthTag();
        outputStream.write(authTag);
        outputStream.end();
        resolve();
      });
    });
  }

  /**
   * Decrypts a stream.
   * Expects format: [IV (16 bytes)] [Encrypted Data...] [AuthTag (16 bytes)]
   * This is tricky with streams because we need the last 16 bytes for AuthTag.
   * 
   * Alternative simpler approach for files:
   * 1. Read IV (start).
   * 2. We need AuthTag to verify. GCM *requires* AuthTag to decrypt correctly/verify.
   * 
   * If strictly streaming, we have to look ahead or buffer, which is hard.
   * 
   * EASIER APPROACH FOR STREAMING: 
   * Since we are dealing with files, we can read the file info.
   * But we want to support streaming potentially.
   * 
   * Let's stick to a simpler format if possible, OR just handle the "Authtag at end" logic by using a transform stream that buffers the last 16 bytes.
   */
  createDecryptStream(inputStream) {
     // This is complex to implement perfectly from scratch for streams without buffering everything or using specific libraries.
     // To keep it "production ready" and robust without external dependencies like `sodium-native` for streams:
     // 
     // We will use a Transform stream that buffers the last 16 bytes to use as AuthTag.
     
     // actually, let's use a simpler approach if we control the storage:
     // Maybe store AuthTag in metadata? No, that's messy.
     // 
     // Let's implement the "IV at start, AuthTag at end" reader.
     
     let ivRead = false;
     let iv = null;
     let decipher = null;
     
     // We need to implement a custom logic or use a wrapper.
     // Let's use a simple approach: We assume we can read the file for restore. 
     // If we are restoring from a file, we can read the first 16 bytes and the last 16 bytes first.
  }
  
  /**
   * Encrypt file (simpler wrapper around stream)
   */
  async encryptFile(inputPath, outputPath) {
      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);
      await this.encryptStream(input, output);
  }

  /**
   * Decrypt file
   */
  async decryptFile(inputPath, outputPath) {
      // 1. Read IV (first 16 bytes)
      // 2. Read AuthTag (last 16 bytes)
      // 3. Decrypt the middle
      
      const stats = await fs.promises.stat(inputPath);
      const totalSize = stats.size;
      
      if (totalSize < 32) throw new Error('File too short to be encrypted');
      
      const fd = await fs.promises.open(inputPath, 'r');
      
      // Read IV
      const iv = Buffer.alloc(16);
      await fd.read(iv, 0, 16, 0);
      
      // Read AuthTag
      const authTag = Buffer.alloc(16);
      await fd.read(authTag, 0, 16, totalSize - 16);
      
      await fd.close();
      
      const key = await this.getKey();
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      const input = fs.createReadStream(inputPath, { start: 16, end: totalSize - 17 }); // end is inclusive in fs.createReadStream options? No, end is inclusive. So totalSize - 1 (last byte) - 16 (auth tag) = totalSize - 17.
      const output = fs.createWriteStream(outputPath);
      
      return new Promise((resolve, reject) => {
          input.pipe(decipher).pipe(output)
              .on('finish', resolve)
              .on('error', reject);
      });
  }
}

module.exports = new EncryptionService();
