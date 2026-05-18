import { useState, useCallback, useEffect, useMemo } from 'react';
import { beeApi } from '../services/beeApi';

export function useBeeData(toast) {
  const [emplacements, setEmplacements] = useState([]);
  const [ruches,       setRuches]       = useState([]);
  const [productions,  setProductions]  = useState([]);
  const [visites,      setVisites]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [syncing,      setSyncing]      = useState(false);

  /* stats dérivées — recalculées automatiquement, jamais stale */
  const stats = useMemo(() => {
    const honey     = productions.reduce((a, p) => a + (parseFloat(p.honey_kg) || 0), 0);
    const avgHealth = ruches.length
      ? (ruches.reduce((a, r) => a + (r.health_score || 0), 0) / ruches.length) * 10
      : 100;
    const critiques = ruches.filter(r => (r.health_score || 10) < 4).length;
    return {
      totalMiel: `${honey.toFixed(1)} kg`,
      sante:     `${Math.round(avgHealth)}%`,
      alertes:   critiques.toString(),
    };
  }, [productions, ruches]);

  const refresh = useCallback(async (showSpin = true) => {
    if (showSpin) setSyncing(true);
    setLoading(true);
    try {
      const [apiariesRes, hivesRes, productionsRes, visitsRes] = await Promise.all([
        beeApi.getApiaries(),
        beeApi.getHives(),
        beeApi.getProductions(),
        beeApi.getVisits(),
      ]);
      setEmplacements(apiariesRes.ok    ? await apiariesRes.json()    : []);
      setRuches(      hivesRes.ok       ? await hivesRes.json()       : []);
      setProductions( productionsRes.ok ? await productionsRes.json() : []);
      setVisites(     visitsRes.ok      ? await visitsRes.json()      : []);
    } catch {
      toast('Erreur de connexion au serveur', 'error');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [toast]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refresh(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  return {
    emplacements, ruches, productions, visites,
    loading, syncing, stats,
    refresh,
    addApiary, removeApiary, addProduction,
  };
}
