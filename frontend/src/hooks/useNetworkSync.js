import { useState, useEffect } from 'react';
import offlineDB from '../db/offlineDB';
import api from '../services/api';

export function useNetworkSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const updatePendingCount = async () => {
    try {
      const reports = await offlineDB.pendingReports.where('synced').equals(0).count();
      const tasks = await offlineDB.pendingTasks.where('synced').equals(0).count();
      setPendingCount(reports + tasks);
    } catch (e) {
      console.error(e);
    }
  };

  const syncData = async () => {
    if (!navigator.onLine) return;

    setSyncing(true);
    try {
      // 1. Sync pending worker reports
      const reports = await offlineDB.pendingReports.where('synced').equals(0).toArray();
      for (const report of reports) {
        try {
          await api.post('/worker/reports', {
            type: report.type || 'other',
            notes: report.notes,
            photo_b64: report.photo_b64,
            created_at: report.created_at,
          });
          await offlineDB.pendingReports.update(report.id, { synced: 1 });
        } catch (err) {
          console.error('Sync report failed:', err);
        }
      }

      // 2. Sync pending task status updates → worker tasks
      const tasks = await offlineDB.pendingTasks.where('synced').equals(0).toArray();
      for (const task of tasks) {
        try {
          await api.put(`/worker-tasks/${task.task_id}`, {
            status: task.status,
            done_at: task.done_at,
          });
          await offlineDB.pendingTasks.update(task.id, { synced: 1 });
        } catch (err) {
          console.error('Sync task failed:', err);
        }
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      await updatePendingCount();
      setSyncing(false);
    }
  };

  useEffect(() => {
    updatePendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      syncData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(updatePendingCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, syncing, pendingCount, syncData };
}
