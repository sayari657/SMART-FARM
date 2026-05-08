import Dexie from 'dexie';
import { poultryAPI } from './api';

// ── DATABASE INITIALIZATION ──────────────────────────────────────────────────
export const db = new Dexie('PoultryOfflineDB');
db.version(1).stores({
  pendingLogs: '++id, type, data, timestamp'
});

// ── SYNC SERVICE ─────────────────────────────────────────────────────────────
export const poultrySyncService = {
  
  /**
   * Enregistre une action localement si offline, ou tente l'envoi direct.
   */
  async logData(type, data) {
    if (!navigator.onLine) {
      console.warn(`[Offline] Storage in queue: ${type}`);
      return await db.pendingLogs.add({
        type,
        data,
        timestamp: Date.now()
      });
    }

    // Si Online, on tente l'envoi direct via l'API existante
    try {
      return await this._sendToServer(type, data);
    } catch (err) {
      // En cas d'erreur réseau impromptue, on bascule en local
      return await db.pendingLogs.add({ type, data, timestamp: Date.now() });
    }
  },

  /**
   * Synchronise toutes les données en attente.
   */
  async syncPending() {
    const logs = await db.pendingLogs.toArray();
    if (logs.length === 0) return;

    console.log(`[Sync] Attempting to sync ${logs.length} logs...`);
    
    for (const log of logs) {
      try {
        await this._sendToServer(log.type, log.data);
        await db.pendingLogs.delete(log.id); // Supprimer après succès
        console.log(`[Sync] Success for log ${log.id}`);
      } catch (err) {
        console.error(`[Sync] Failed for log ${log.id}, will retry later.`);
        break; // On arrête pour ce cycle si erreur
      }
    }
  },

  /**
   * Mapping interne vers les endpoints réels.
   */
  async _sendToServer(type, data) {
    switch (type) {
      case 'feed':   return await poultryAPI.feed.create(data);
      case 'eggs':   return await poultryAPI.eggs.create(data);
      case 'health': return await poultryAPI.health.create(data);
      case 'sales':  return await poultryAPI.sales.create(data);
      default: throw new Error(`Unknown log type: ${type}`);
    }
  }
};

// Auto-sync listener
window.addEventListener('online', () => {
  console.log('[Network] Back online! Starting sync...');
  poultrySyncService.syncPending();
});
