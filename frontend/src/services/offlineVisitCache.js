const MAX = 5;
const key = hiveId => `bee_visits_offline_${hiveId}`;

export function cacheVisit(hiveId, visit) {
  try {
    const stored = JSON.parse(localStorage.getItem(key(hiveId)) || '[]');
    const next = [visit, ...stored].slice(0, MAX);
    localStorage.setItem(key(hiveId), JSON.stringify(next));
  } catch {}
}

export function getCachedVisits(hiveId) {
  try {
    return JSON.parse(localStorage.getItem(key(hiveId)) || '[]');
  } catch { return []; }
}

export function clearCache(hiveId) {
  try { localStorage.removeItem(key(hiveId)); } catch {}
}
