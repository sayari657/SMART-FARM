import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { beeApi } from '../services/beeApi';

/* ── Offline queue ─────────────────────────────────────────────────
   Pending requests are stored in localStorage as JSON.
   On reconnect, they are replayed in order.
─────────────────────────────────────────────────────────────────── */
const QUEUE_KEY = 'bee_offline_queue';
const getQueue  = ()    => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } };
const saveQueue = (q)   => localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
const pushQueue = (item) => saveQueue([...getQueue(), item]);

/* ── Offline read cache — last snapshots so the page works with no network ── */
const CACHE_KEYS = { ruches: 'bee_cache_ruches', visites: 'bee_cache_visites',
                     emplacements: 'bee_cache_emplacements', productions: 'bee_cache_productions' };
const readCache  = (k, max = 100) => { try { return JSON.parse(localStorage.getItem(CACHE_KEYS[k]) || '[]'); } catch { return []; } };
const writeCache = (k, v, max = 100) => { try { localStorage.setItem(CACHE_KEYS[k], JSON.stringify((v || []).slice(0, max))); } catch {} };

export function useBeeData(toast) {
  const [emplacements, setEmplacements] = useState([]);
  const [ruches,       setRuches]       = useState([]);
  const [productions,  setProductions]  = useState([]);
  const [visites,      setVisites]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [syncing,      setSyncing]      = useState(false);
  const [isOnline,     setIsOnline]     = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(() => getQueue().length);
  const syncRef = useRef(false);

  /* stats dérivées */
  const stats = useMemo(() => {
    const honey     = productions.reduce((a, p) => a + (parseFloat(p.honey_kg) || 0), 0);
    const avgHealth = ruches.length
      ? (ruches.reduce((a, r) => a + (r.health_score || 0), 0) / ruches.length) * 10
      : 100;
    // Alerts are data-driven: critical hives (health < 4/10) PLUS the most recent
    // inspections flagged urgent/treatment. (Previously only checked hive health,
    // so a hive marked "urgent" during a visit never raised an alert.)
    const URGENT = new Set(['urgent', 'critique', 'critical', 'malade', 'treatment']);
    const criticalHives = ruches.filter(r => (r.health_score ?? 10) < 4).length;
    const urgentVisits  = visites.filter(v => URGENT.has(String(v.health_state || '').toLowerCase())).length;
    const critiques = criticalHives + urgentVisits;
    return {
      totalMiel: `${honey.toFixed(1)} kg`,
      sante:     `${Math.round(avgHealth)}%`,
      alertes:   critiques.toString(),
    };
  }, [productions, ruches, visites]);

  /* ── Refresh from server (offline → load last cached snapshot) ── */
  const refresh = useCallback(async (showSpin = true) => {
    if (!navigator.onLine) {
      // No network: hydrate from the offline cache so the page still works,
      // and prepend any visits queued offline (not yet synced).
      const queuedVisits = getQueue()
        .filter(it => it.url?.includes('/visits') && it.method === 'POST')
        .map(it => { try { return { ...JSON.parse(it.body), _offline: true }; } catch { return null; } })
        .filter(Boolean);
      setEmplacements(readCache('emplacements'));
      setRuches(readCache('ruches'));
      setProductions(readCache('productions'));
      setVisites([...queuedVisits, ...readCache('visites')]);
      setLoading(false);
      return;
    }
    if (showSpin) setSyncing(true);
    setLoading(true);
    try {
      const [apiariesRes, hivesRes, productionsRes, visitsRes] = await Promise.all([
        beeApi.getApiaries(),
        beeApi.getHives(),
        beeApi.getProductions(),
        beeApi.getVisits(),
      ]);
      const emp  = apiariesRes.ok    ? await apiariesRes.json()    : [];
      const hiv  = hivesRes.ok       ? await hivesRes.json()       : [];
      const prod = productionsRes.ok ? await productionsRes.json() : [];
      const vis  = visitsRes.ok      ? await visitsRes.json()      : [];
      setEmplacements(emp);  setRuches(hiv);  setProductions(prod);  setVisites(vis);
      // Cache fresh snapshots for offline use
      writeCache('emplacements', emp);  writeCache('ruches', hiv);
      writeCache('productions', prod);  writeCache('visites', vis);
    } catch {
      /* silent — offline banner handles visibility */
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []); // eslint-disable-line

  /* ── Replay offline queue when back online ── */
  const replayQueue = useCallback(async () => {
    if (syncRef.current) return;
    const queue = getQueue();
    if (queue.length === 0) return;
    syncRef.current = true;
    setSyncing(true);
    const failed = [];
    for (const item of queue) {
      try {
        const res = await beeApi.call(item.url, { method: item.method, body: item.body });
        if (!res.ok) { failed.push(item); continue; }
        // Visit synced → run the cascade (updates hive health, stock, production)
        if (item.url?.includes('/visits') && item.method === 'POST') {
          const saved = await res.json().catch(() => null);
          if (saved?.id) await beeApi.applyVisit(saved.id).catch(() => {});
        }
      } catch {
        failed.push(item);
      }
    }
    saveQueue(failed);
    setPendingCount(failed.length);
    syncRef.current = false;
    setSyncing(false);
    if (failed.length < queue.length) {
      toast(`${queue.length - failed.length} opération(s) synchronisée(s)`, 'success');
      refresh();
    }
  }, [refresh, toast]);

  /* ── Online/offline listeners ── */
  useEffect(() => {
    const handleOnline  = () => { setIsOnline(true);  replayQueue(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [replayQueue]);

  useEffect(() => { refresh(false); }, []); // eslint-disable-line

  /* ── Emplacements ── */
  const addApiary = useCallback(async (formData) => {
    const res = await beeApi.createApiary({
      ...formData,
      latitude:  formData.latitude  ? parseFloat(formData.latitude)  : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
    });
    if (res.ok) { await refresh(); toast('Site créé'); return true; }
    toast('Erreur création site', 'error');
    return false;
  }, [refresh, toast]);

  const removeApiary = useCallback(async (id) => {
    await beeApi.deleteApiary(id);
    await refresh();
    toast('Site supprimé', 'warning');
  }, [refresh, toast]);

  /* ── Production ── */
  const addProduction = useCallback(async (prodForm) => {
    if (!prodForm.apiary_id) return false;
    const res = await beeApi.createProduction({
      ...prodForm,
      honey_kg:  parseFloat(prodForm.honey_kg)  || 0,
      pollen_kg: parseFloat(prodForm.pollen_kg) || 0,
      apiary_id: parseInt(prodForm.apiary_id),
    });
    if (res.ok) { toast('Récolte enregistrée'); await refresh(); return true; }
    toast('Erreur récolte', 'error');
    return false;
  }, [refresh, toast]);

  /* ── Visite — createVisit + applyVisit cascade ── */
  const addVisit = useCallback(async (visitForm) => {
    if (!visitForm.hive_id) {
      toast('Sélectionnez une ruche', 'error');
      return false;
    }

    const payload = {
      hive_id:          Number(visitForm.hive_id),
      apiary_id:        visitForm.apiary_id ? Number(visitForm.apiary_id) : undefined,
      visit_date:       visitForm.visit_date || new Date().toISOString().split('T')[0],
      health_state:     visitForm.health_state || 'health',
      temperature:      visitForm.temperature ? parseFloat(visitForm.temperature) : null,
      honey_level:      visitForm.honey_level || 'Moyen',
      needs_sirop:      Number(visitForm.needs_sirop)      || 0,
      needs_pate:       Number(visitForm.needs_pate)        || 0,
      needs_traitement: Number(visitForm.needs_traitement)  || 0,
      harvest_kg:       parseFloat(visitForm.harvest_kg)    || 0,
      pollen_kg:        parseFloat(visitForm.pollen_kg)     || 0,
      notes:            visitForm.notes     || '',
      photo_url:        visitForm.photo_url || '',
      gps_coords:       visitForm.gps_coords || '',
    };

    /* Offline mode — queue the mutation */
    if (!navigator.onLine) {
      pushQueue({
        url:    `${import.meta.env.VITE_API_URL || '/api/v1'}/bee/history/visits`,
        method: 'POST',
        body:   JSON.stringify(payload),
      });
      setPendingCount(q => q + 1);
      toast('Visite sauvegardée hors-ligne · sera synchronisée au retour', 'warning');
      /* Optimistic local update + persist to cache so it survives a reload */
      const offlineVisit = { ...payload, id: Date.now(), _offline: true };
      setVisites(prev => [offlineVisit, ...prev]);
      writeCache('visites', [offlineVisit, ...readCache('visites')]);
      return true;
    }

    /* Online mode — save + apply cascade */
    try {
      const res = await beeApi.createVisit(payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err?.detail || 'Erreur lors de l\'enregistrement', 'error');
        return false;
      }
      const saved = await res.json();
      toast('Inspection enregistrée ✓', 'success');

      /* Apply cascade: updates ruche health, stock, production */
      if (saved?.id) {
        beeApi.applyVisit(saved.id).catch(() => {});
      }

      /* Refresh all data without blocking the UI */
      refresh(false);
      return true;
    } catch {
      toast('Erreur réseau — réessayez', 'error');
      return false;
    }
  }, [refresh, toast]);

  return {
    emplacements, ruches, productions, visites,
    loading, syncing, isOnline, pendingCount, stats,
    refresh,
    addApiary, removeApiary, addProduction, addVisit,
  };
}
