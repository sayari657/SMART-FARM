import Dexie from 'dexie';

const db = new Dexie('SmartFarmOffline');

db.version(1).stores({
  pendingVisits:  '++id, farm_id, hive_id, created_at, synced',
  pendingReports: '++id, farm_id, photo_url, notes, created_at, synced',
  pendingTasks:   '++id, task_id, status, done_at, synced',
  cachedAlerts:   '++id, farm_id, severity, timestamp',
  cachedIoT:      '++id, node, metric, value, timestamp',
});

export default db;
