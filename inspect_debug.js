process.chdir('./server');
const service = require('./server/services/BackupService');

async function run() {
  await service.init();
  try {
    // The user's screenshot has this ID
    const id = 'backup_1765460422108_3jmbeeeev'; 
    console.log(`Inspecting ${id}...`);
    const result = await service.inspectBackup(id);
    console.log('Inspection Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
