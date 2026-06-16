/**
 * OrchardMap — geographic orchard view (replaces the row×col planigramme grid).
 * Trees are shown at their real GPS position on a free Esri satellite basemap,
 * colour-coded by health status. Tap a tree → full management panel (status,
 * report disease / treatment / observation, history, delete). Workers can add a
 * tree at their live GPS position. Backend-persisted + farm-scoped (orchardAPI).
 */
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Rectangle, useMap, useMapEvents } from 'react-leaflet';
import {
  Trees, MapPin, RefreshCw, X, Trash2, Stethoscope, SprayCan, Eye, Loader2, ScanSearch, Square,
  Apple, Camera, Sparkles,
} from 'lucide-react';
import { orchardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';
import { TREE_DISEASES, TREE_TREATMENTS } from '../data/orchardCatalog';
import toast from 'react-hot-toast';

const STATUS = {
  healthy:  { label: 'Sain',          color: '#16a34a' },
  watch:    { label: 'À surveiller',  color: '#d97706' },
  diseased: { label: 'Maladie',       color: '#ef4444' },
  treated:  { label: 'Traité',        color: '#2563eb' },
};
const DEFAULT_CENTER = [36.8065, 10.1815]; // Tunis

const SPECIES = [
  { v: 'olive',  l: '🫒 Olivier' },
  { v: 'orange', l: '🍊 Oranger' },
  { v: 'lemon',  l: '🍋 Citronnier' },
  { v: '',       l: '🌳 Autre' },
];

function ZoneSelector({ active, corners, setCorners, onComplete }) {
  useMapEvents({
    click(e) {
      if (!active) return;
      const pt = [e.latlng.lat, e.latlng.lng];
      const next = [...corners, pt];
      if (next.length >= 2) { onComplete(next); setCorners([]); }
      else setCorners(next);
    },
  });
  return null;
}

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, map.getZoom() < 16 ? 18 : map.getZoom(), { duration: 0.8 }); }, [center?.[0], center?.[1]]); // eslint-disable-line
  return null;
}

function SetMapRef({ mapRef }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map]); // eslint-disable-line
  return null;
}

export default function OrchardMap() {
  const { farmId } = useAuth();
  const [trees, setTrees]       = useState([]);
  const [selected, setSelected] = useState(null);   // full tree with events
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(false);
  const [center, setCenter]     = useState(DEFAULT_CENTER);
  const [actionMode, setActionMode] = useState(null); // disease|treatment|observation
  const [actionLabel, setActionLabel] = useState('');
  const [actionNote, setActionNote]   = useState('');
  const [detecting, setDetecting]   = useState(false);
  const [species, setSpecies]       = useState('olive');
  const [customSpecies, setCustomSpecies] = useState('');  // toolbar "Autre" name
  const [nameInput, setNameInput]   = useState('');        // per-tree "Autre" name
  const [zoneMode, setZoneMode]     = useState(false);
  const [zoneCorners, setZoneCorners] = useState([]);
  const mapRef = useRef(null);
  // Harvest estimation by photo
  const [hFile, setHFile]       = useState(null);
  const [hPreview, setHPreview] = useState('');
  const [hSpecies, setHSpecies] = useState('');
  const [hBusy, setHBusy]       = useState(false);
  const [hResult, setHResult]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await orchardAPI.trees(farmId);
      setTrees(Array.isArray(data) ? data : []);
    } catch { /* offline / empty */ }
    finally { setLoading(false); }
  }, [farmId]);

  useEffect(() => { load(); }, [load]);

  const placed   = useMemo(() => trees.filter(t => t.lat != null && t.lng != null), [trees]);
  const unplaced = trees.length - placed.length;

  useEffect(() => {
    if (placed.length) {
      const la = placed.reduce((s, t) => s + t.lat, 0) / placed.length;
      const ln = placed.reduce((s, t) => s + t.lng, 0) / placed.length;
      setCenter([la, ln]);
    }
  }, [placed.length]); // eslint-disable-line

  const openTree = async (id) => {
    setActionMode(null);
    try { const { data } = await orchardAPI.tree(id); setSelected(data); }
    catch { /* */ }
  };

  const addAtGps = () => {
    if (!navigator.geolocation) { alert('GPS non disponible'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { data } = await orchardAPI.create({
          farm_id: farmId || undefined,
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          source: 'gps', status: 'healthy', species: effectiveSpecies(),
        });
        setCenter([data.lat, data.lng]);
        await load();
        openTree(data.id);
      } catch (e) { alert("Échec de l'ajout de l'arbre"); }
      finally { setBusy(false); }
    }, () => { setBusy(false); alert('Position GPS refusée'); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const runDetect = async (bounds) => {
    setDetecting(true);
    const tid = toast.loading('Détection IA en cours… (jusqu\'à 1-2 min sur grande zone)');
    try {
      const { data } = await orchardAPI.detect(bounds, farmId, effectiveSpecies());
      toast.dismiss(tid);
      if (data.detected > 0) { toast.success(`${data.detected} ${SPECIES.find(s => s.v === species)?.l || 'arbre'}(s) détecté(s) · moteur ${data.engine}`); await load(); }
      else toast('Aucun arbre détecté — cadrez une zone avec des arbres verts visibles');
    } catch (e) { toast.dismiss(tid); toast.error(getErrorMessage(e, 'Échec de la détection')); }
    finally { setDetecting(false); }
  };

  // ── Harvest estimation by photo ──────────────────────────────────────────
  const onHarvestFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setHFile(f); setHResult(null);
    setHPreview(URL.createObjectURL(f));
  };

  const runHarvest = async () => {
    if (!hFile) { toast("Choisissez d'abord une photo de l'arbre / branche"); return; }
    setHBusy(true);
    const tid = toast.loading('Analyse de la photo… (comptage des fruits)');
    try {
      const { data } = await orchardAPI.harvest(hFile, hSpecies);
      setHResult(data);
      toast.dismiss(tid);
      toast.success(`${data.count} fruit(s) · ≈ ${data.harvest_kg} kg`);
    } catch (e) { toast.dismiss(tid); toast.error(getErrorMessage(e, "Échec de l'analyse")); }
    finally { setHBusy(false); }
  };

  // Detect on the whole current view
  const detectAI = () => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    runDetect({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
  };

  // Detect inside a user-drawn rectangle zone (2 corner clicks)
  const onZoneComplete = (corners) => {
    setZoneMode(false);
    const lats = corners.map(c => c[0]); const lngs = corners.map(c => c[1]);
    runDetect({ north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lngs), west: Math.min(...lngs) });
  };

  const setStatus = async (status) => {
    if (!selected) return;
    setBusy(true);
    try { const { data } = await orchardAPI.update(selected.id, { status }); setSelected(data); await load(); }
    finally { setBusy(false); }
  };

  const setTreeSpecies = async (sp) => {
    if (!selected) return;
    setBusy(true);
    try { const { data } = await orchardAPI.update(selected.id, { species: sp || null }); setSelected(data); await load(); }
    finally { setBusy(false); }
  };

  // Sync the per-tree custom-name field when a tree is opened
  useEffect(() => { setNameInput(selected?.label || ''); }, [selected?.id]); // eslint-disable-line

  const saveName = async () => {
    if (!selected) return;
    setBusy(true);
    try { const { data } = await orchardAPI.update(selected.id, { label: nameInput.trim() || null }); setSelected(data); await load(); }
    finally { setBusy(false); }
  };

  // For batch detection / GPS add: known species, or the typed custom name when "Autre"
  const effectiveSpecies = () => (species || (customSpecies.trim() || undefined));
  const KNOWN_SPECIES = ['olive', 'orange', 'lemon'];

  const submitAction = async () => {
    if (!selected || !actionMode) return;
    setBusy(true);
    try {
      const payload = { type: actionMode };
      if (actionMode === 'observation') payload.note = actionNote;
      else payload.label = actionLabel;
      const { data } = await orchardAPI.addEvent(selected.id, payload);
      setSelected(data); await load();
      setActionMode(null); setActionLabel(''); setActionNote('');
    } finally { setBusy(false); }
  };

  const delEvent = async (eid) => {
    setBusy(true);
    try { await orchardAPI.delEvent(eid); await openTree(selected.id); await load(); }
    finally { setBusy(false); }
  };

  const delTree = async () => {
    if (!selected || !window.confirm("Supprimer cet arbre et tout son historique ?")) return;
    setBusy(true);
    try { await orchardAPI.remove(selected.id); setSelected(null); await load(); }
    finally { setBusy(false); }
  };

  const speciesDiseases = (selected?.species)
    ? TREE_DISEASES.filter(d => d.species?.includes(selected.species))
    : TREE_DISEASES;

  const counts = useMemo(() => {
    const c = { healthy: 0, watch: 0, diseased: 0, treated: 0 };
    trees.forEach(t => { c[t.status] = (c[t.status] || 0) + 1; });
    return c;
  }, [trees]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#0f172a' }}>
          <Trees size={18} color="#16a34a" /> Verger — carte satellite
        </div>
        <div style={{ flex: 1 }} />
        {Object.entries(STATUS).map(([k, s]) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#475569' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} /> {s.label} {counts[k] || 0}
          </span>
        ))}
        {/* Tree type selector */}
        <select value={species} onChange={e => setSpecies(e.target.value)} title="Type d'arbre"
          style={{ height: 38, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', padding: '0 10px', fontSize: 13, fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
          {SPECIES.map(s => <option key={s.v || 'autre'} value={s.v}>{s.l}</option>)}
        </select>
        {species === '' && (
          <input value={customSpecies} onChange={e => setCustomSpecies(e.target.value)}
            placeholder="Nom de l'arbre (ex: Figuier)"
            style={{ height: 38, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', padding: '0 12px', fontSize: 13, width: 180, outline: 'none' }} />
        )}
        <button onClick={load} title="Rafraîchir" style={iconBtn}>
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
        <button onClick={() => { setZoneCorners([]); setZoneMode(z => !z); }}
          title="Dessiner une zone : cliquez 2 coins sur la carte"
          style={{ ...primaryBtn, background: zoneMode ? '#ef4444' : 'linear-gradient(135deg,#0891b2,#0e7490)', opacity: detecting ? .6 : 1 }}>
          <Square size={15} /> {zoneMode ? 'Annuler la zone' : 'Détecter une zone'}
        </button>
        <button onClick={detectAI} disabled={detecting} title="Détecter sur toute la vue satellite actuelle"
          style={{ ...primaryBtn, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', opacity: detecting ? .6 : 1 }}>
          {detecting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <ScanSearch size={15} />}
          Détecter (vue)
        </button>
        <button onClick={addAtGps} disabled={busy} style={{ ...primaryBtn, opacity: busy ? .6 : 1 }}>
          {busy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <MapPin size={15} />}
          Ajouter à ma position GPS
        </button>
      </div>

      {zoneMode && (
        <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#0e7490', fontWeight: 600 }}>
          📐 Cliquez <b>2 coins</b> sur la carte pour délimiter la zone à détecter ({SPECIES.find(s => s.v === species)?.l}).
          {zoneCorners.length === 1 && ' — 1ᵉʳ coin posé, cliquez le 2ᵉ.'}
        </div>
      )}

      {unplaced > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#92400e' }}>
          ⚠ {unplaced} arbre(s) hérités de l'ancien planigramme sans position GPS — replacez-les via « Ajouter à ma position GPS » sur le terrain.
        </div>
      )}

      {/* map */}
      <div style={{ height: '68vh', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <MapContainer center={center} zoom={17} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles © Esri — World Imagery"
            maxZoom={21}
          />
          <Recenter center={center} />
          <SetMapRef mapRef={mapRef} />
          <ZoneSelector active={zoneMode} corners={zoneCorners} setCorners={setZoneCorners} onComplete={onZoneComplete} />
          {zoneCorners.length === 1 && (
            <CircleMarker center={zoneCorners[0]} radius={6} pathOptions={{ color: '#0891b2', fillColor: '#0891b2', fillOpacity: 1 }} />
          )}
          {placed.map(t => {
            const s = STATUS[t.status] || STATUS.healthy;
            return (
              <CircleMarker key={t.id} center={[t.lat, t.lng]} radius={9}
                pathOptions={{ color: '#fff', weight: 2, fillColor: s.color, fillOpacity: 0.9 }}
                eventHandlers={{ click: () => openTree(t.id) }}>
                <Tooltip direction="top">{t.label || t.species || `Arbre ${t.id}`} · {s.label}</Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* harvest estimation by photo */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#0f172a', flexWrap: 'wrap' }}>
          <Apple size={18} color="#ef4444" /> Estimation de récolte par photo
          <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>— comptez les fruits d'un arbre / d'une branche, quel que soit le type</span>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* upload + controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 240 }}>
            <label style={{ ...primaryBtn, background: 'linear-gradient(135deg,#0891b2,#0e7490)', cursor: 'pointer', justifyContent: 'center' }}>
              <Camera size={15} /> {hFile ? 'Changer la photo' : 'Choisir une photo'}
              <input type="file" accept="image/*" capture="environment" onChange={onHarvestFile} style={{ display: 'none' }} />
            </label>
            <select value={hSpecies} onChange={e => setHSpecies(e.target.value)} title="Type de fruit"
              style={{ height: 38, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', padding: '0 10px', fontSize: 13, fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
              <option value="">🤖 Auto (l'IA détecte le type)</option>
              <option value="olive">🫒 Olive</option>
              <option value="orange">🍊 Orange</option>
              <option value="lemon">🍋 Citron</option>
              <option value="other">🍎 Autre fruit</option>
            </select>
            <button onClick={runHarvest} disabled={hBusy || !hFile}
              style={{ ...primaryBtn, justifyContent: 'center', opacity: (hBusy || !hFile) ? .6 : 1 }}>
              {hBusy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={15} />}
              Estimer la récolte
            </button>
          </div>
          {/* preview */}
          {hPreview && (
            <img src={hPreview} alt="aperçu" style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 12, border: '1px solid #e2e8f0' }} />
          )}
          {/* result */}
          {hResult && (
            <div style={{ flex: 1, minWidth: 230, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Stat label="Fruits comptés" value={hResult.count} accent="#0f172a" />
                <Stat label="Récolte estimée" value={`≈ ${hResult.harvest_kg} kg`} accent="#16a34a" />
                <Stat label="Type" value={FRUIT_FR[hResult.fruit_type] || hResult.fruit_type} accent="#0891b2" />
                <Stat label="Confiance" value={`${Math.round((hResult.confidence || 0) * 100)}%`} accent="#7c3aed" />
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Moteur : <b>{hResult.method === 'vision-llm' ? 'Vision IA' : 'OpenCV (couleur)'}</b>
                {' · '}contrôle OpenCV : {hResult.cv_count} · maturité : {hResult.ripeness}
                {' · '}poids moyen ≈ {hResult.avg_fruit_g} g/fruit
              </div>
              {hResult.notes && (
                <div style={{ fontSize: 12, color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 10px' }}>{hResult.notes}</div>
              )}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          Astuce : un gros plan net d'un arbre ou d'une branche donne le meilleur comptage. Récolte (kg) = nombre de fruits × poids moyen du fruit.
        </div>
      </div>

      {/* management panel (drawer) */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px,92vw)', zIndex: 1001,
            background: '#fff', boxShadow: '-8px 0 30px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column' }}>
            {/* header */}
            <div style={{ padding: '16px 18px', background: (STATUS[selected.status] || STATUS.healthy).color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{selected.label || selected.species || `Arbre ${selected.id}`}</div>
                <div style={{ fontSize: 12, opacity: .9 }}>
                  {(STATUS[selected.status] || STATUS.healthy).label}
                  {selected.disease ? ` · ${selected.disease}` : ''}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff' }}><X size={18} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* tree species */}
              <div>
                <div style={lbl}>Type d'arbre</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {SPECIES.map(sp => {
                    // "Autre" is active when the tree's species is empty or a custom (unknown) value
                    const active = sp.v ? selected.species === sp.v : !KNOWN_SPECIES.includes(selected.species || '');
                    return (
                      <button key={sp.v || 'autre'} onClick={() => setTreeSpecies(sp.v)} disabled={busy}
                        style={{ padding: '8px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                          background: active ? '#16a34a' : '#fff', color: active ? '#fff' : '#475569',
                          border: `1.5px solid ${active ? '#16a34a' : '#e2e8f0'}` }}>
                        {sp.l}
                      </button>
                    );
                  })}
                </div>
                {/* "Autre" → free-text name for this tree */}
                {!KNOWN_SPECIES.includes(selected.species || '') && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveName()}
                      placeholder="Nom de l'arbre (ex: Figuier, Grenadier…)"
                      style={{ flex: 1, height: 38, borderRadius: 10, border: '1px solid #e2e8f0', padding: '0 12px', fontSize: 13, outline: 'none' }} />
                    <button onClick={saveName} disabled={busy} style={{ ...primaryBtn, padding: '0 16px' }}>OK</button>
                  </div>
                )}
              </div>

              {/* status */}
              <div>
                <div style={lbl}>Statut</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(STATUS).map(([k, s]) => (
                    <button key={k} onClick={() => setStatus(k)} disabled={busy}
                      style={{ padding: '8px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                        background: selected.status === k ? s.color : '#fff', color: selected.status === k ? '#fff' : '#475569',
                        border: `1.5px solid ${selected.status === k ? s.color : '#e2e8f0'}` }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* actions */}
              <div>
                <div style={lbl}>Actions</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setActionMode('disease'); setActionLabel(''); }} style={actBtn('#ef4444')}><Stethoscope size={15} /> Signaler maladie</button>
                  <button onClick={() => { setActionMode('treatment'); setActionLabel(''); }} style={actBtn('#2563eb')}><SprayCan size={15} /> Traitement</button>
                  <button onClick={() => { setActionMode('observation'); setActionNote(''); }} style={actBtn('#d97706')}><Eye size={15} /> Observation</button>
                </div>

                {actionMode && (
                  <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    {actionMode === 'observation' ? (
                      <textarea value={actionNote} onChange={e => setActionNote(e.target.value)}
                        placeholder="Note d'observation…" rows={3}
                        style={{ width: '100%', boxSizing: 'border-box', borderRadius: 8, border: '1px solid #e2e8f0', padding: 10, fontFamily: 'inherit', resize: 'none' }} />
                    ) : (
                      <select value={actionLabel} onChange={e => setActionLabel(e.target.value)}
                        style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', padding: 10 }}>
                        <option value="">{actionMode === 'disease' ? 'Choisir une maladie…' : 'Choisir un traitement…'}</option>
                        {(actionMode === 'disease' ? speciesDiseases : TREE_TREATMENTS).map(o => (
                          <option key={o.key} value={o.fr}>{o.fr}</option>
                        ))}
                      </select>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={submitAction} disabled={busy || (actionMode !== 'observation' && !actionLabel) || (actionMode === 'observation' && !actionNote.trim())}
                        style={{ ...primaryBtn, flex: 1, justifyContent: 'center' }}>Enregistrer</button>
                      <button onClick={() => setActionMode(null)} style={iconBtn}><X size={16} /></button>
                    </div>
                  </div>
                )}
              </div>

              {/* history */}
              <div>
                <div style={lbl}>Historique</div>
                {(!selected.events || selected.events.length === 0) ? (
                  <div style={{ fontSize: 13, color: '#94a3b8', padding: '8px 0' }}>Aucun événement enregistré</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selected.events.map(ev => (
                      <div key={ev.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                            {EVENT_LABEL[ev.type] || ev.type}{ev.label ? ` — ${ev.label}` : ''}
                          </div>
                          {ev.note && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{ev.note}</div>}
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                            {ev.created_at ? new Date(ev.created_at).toLocaleString() : ''}
                          </div>
                        </div>
                        <button onClick={() => delEvent(ev.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* delete */}
            <div style={{ padding: 14, borderTop: '1px solid #e2e8f0' }}>
              <button onClick={delTree} disabled={busy}
                style={{ width: '100%', padding: 12, borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca',
                  color: '#b91c1c', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Trash2 size={16} /> Supprimer l'arbre
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const FRUIT_FR = { olive: '🫒 Olive', orange: '🍊 Orange', lemon: '🍋 Citron', other: '🍎 Autre' };

function Stat({ label, value, accent }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '8px 12px', minWidth: 92 }}>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: accent || '#0f172a' }}>{value}</div>
    </div>
  );
}

const EVENT_LABEL = { disease: '🦠 Maladie', treatment: '💊 Traitement', observation: '👁 Observation', note: '📝 Note' };
const lbl = { fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', marginBottom: 8 };
const iconBtn = { width: 38, height: 38, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' };
const primaryBtn = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' };
const actBtn = (c) => ({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: 10, background: `${c}12`, border: `1px solid ${c}40`, color: c, fontWeight: 700, fontSize: 12, cursor: 'pointer' });
