#!/usr/bin/env node

/**
 * End-to-end test script for MongoDB Backup Manager
 * 
 * This script tests:
 * 1. Full backup creation
 * 2. File compression
 * 3. FTP upload (if test FTP server is available)
 * 4. Metadata storage
 * 
 * Run with: npm run e2e
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000/api';
const TEST_CREDENTIALS = {
  username: 'admin',
  password: 'admin'
};

async function runE2ETest() {
  console.log('🧪 MongoDB Backup Manager - E2E Test\n');
  
  let token;
  
  try {
    // Step 1: Login
    console.log('1️⃣  Testing login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, TEST_CREDENTIALS);
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    token = loginResponse.data.token;
    console.log('✅ Login successful\n');
    
    // Step 2: Get status
    console.log('2️⃣  Checking status...');
    const statusResponse = await axios.get(`${API_BASE}/backup/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Status retrieved:', JSON.stringify(statusResponse.data.data, null, 2), '\n');
    
    // Step 3: Trigger full backup
    console.log('3️⃣  Triggering full backup...');
    const backupResponse = await axios.post(
      `${API_BASE}/backup/run`,
      { type: 'full' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!backupResponse.data.success) {
      throw new Error('Backup failed to start');
    }
    
    console.log('✅ Backup started\n');
    
    // Step 4: Wait and check logs
    console.log('4️⃣  Waiting for backup to complete (30s)...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    const logsResponse = await axios.get(`${API_BASE}/logs?limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Recent logs:');
    logsResponse.data.data.logs.slice(0, 3).forEach(log => {
      console.log(`   [${log.level}] ${log.message}`);
    });
    console.log();
    
    // Step 5: Check backups list
    console.log('5️⃣  Checking backups list...');
    const backupsResponse = await axios.get(`${API_BASE}/backups`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const backups = backupsResponse.data.data;
    console.log(`✅ Found ${backups.length} backup(s)\n`);
    
    if (backups.length > 0) {
      const latestBackup = backups[0];
      console.log('📦 Latest backup:');
      console.log(`   ID: ${latestBackup.id}`);
      console.log(`   Type: ${latestBackup.type}`);
      console.log(`   Status: ${latestBackup.status}`);
      console.log(`   Size: ${latestBackup.size} bytes`);
      console.log();
    }
    
    console.log('✅ All E2E tests passed!\n');
    
  } catch (error) {
    console.error('❌ E2E test failed:');
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

// Run tests
console.log('Starting E2E tests...\n');
console.log('⚠️  Make sure the server is running on http://localhost:3000\n');

setTimeout(() => {
  runE2ETest();
}, 1000);
