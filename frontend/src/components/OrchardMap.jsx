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
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../utils/errors';
import { TREE_DISEASES, TREE_TREATMENTS } from '../data/orchardCatalog';
import toast from 'react-hot-toast';

const STATUS = {
  healthy:  { label: 'Sain',          color: '#16a34a' },
  watch:    { label: 'À surveiller',  color: '#d97706' },
  diseased: { label: 'Maladie',       color: '#ef4444' },
  treated:  { label: 'Traité',        color: '#2563eb' },
};
// Verger ciblé — la carte satellite s'ouvre et reste focalisée sur cette zone.
const ORCHARD_ZONE = [36.5554600, 10.4968230];
const ZONE_PAD = 0.03; // ~3 km de marge autour du verger
const ZONE_BOUNDS = [
  [ORCHARD_ZONE[0] - ZONE_PAD, ORCHARD_ZONE[1] - ZONE_PAD],
  [ORCHARD_ZONE[0] + ZONE_PAD, ORCHARD_ZONE[1] + ZONE_PAD],
];
const inZone = ([la, ln]) =>
  la >= ZONE_BOUNDS[0][0] && la <= ZONE_BOUNDS[1][0] &&
  ln >= ZONE_BOUNDS[0][1] && ln <= ZONE_BOUNDS[1][1];
const DEFAULT_CENTER = ORCHARD_ZONE; // verger 36.5554600, 10.4968230

const SPECIES = [
  { v: 'olive',  e: '🫒', k: 'olive' },
  { v: 'orange', e: '🍊', k: 'orange' },
  { v: 'lemon',  e: '🍋', k: 'lemon' },
  { v: '',       e: '🌳', k: 'other' },
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
  const { t: tr } = useTranslation();
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
  // Harvest & revenue estimation (multi-photo)
  const [hFiles, setHFiles]       = useState([]);   // File[]
  const [hPreviews, setHPreviews] = useState([]);   // object URLs
  const [hSpecies, setHSpecies]   = useState('');
  const [hTrees, setHTrees]       = useState('');   // number of trees in orchard
  const [hPrice, setHPrice]       = useState('');   // price per kg
  const [hBusy, setHBusy]         = useState(false);
  const [hResult, setHResult]     = useState(null);

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
      // On reste focalisé sur le verger : recentrage seulement si les arbres sont dans la zone.
      if (inZone([la, ln])) setCenter([la, ln]);
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
      } catch (e) { alert(tr('orchardmap.err_add')); }
      finally { setBusy(false); }
    }, () => { setBusy(false); alert('Position GPS refusée'); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const runDetect = async (bounds) => {
    setDetecting(true);
    const tid = toast.loading('Détection IA en cours… (jusqu\'à 1-2 min sur grande zone)');
    try {
      const { data } = await orchardAPI.detect(bounds, farmId, effectiveSpecies());
      toast.dismiss(tid);
      if (data.detected > 0) { toast.success(tr('orchardmap.detected', { n: data.detected, engine: data.engine })); await load(); }
      else toast('Aucun arbre détecté — cadrez une zone avec des arbres verts visibles');
    } catch (e) { toast.dismiss(tid); toast.error(getErrorMessage(e, tr('orchardmap.err_detect'))); }
    finally { setDetecting(false); }
  };

  // ── Harvest & revenue estimation (up to 10 photos) ──────────────────────────
  const onHarvestFiles = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (!incoming.length) return;
    const merged = [...hFiles, ...incoming].slice(0, 10);
    setHFiles(merged);
    setHPreviews(merged.map(f => URL.createObjectURL(f)));
    setHResult(null);
    e.target.value = '';
  };

  const removeHFile = (i) => {
    const merged = hFiles.filter((_, idx) => idx !== i);
    setHFiles(merged);
    setHPreviews(merged.map(f => URL.createObjectURL(f)));
    setHResult(null);
  };

  const runHarvest = async () => {
    if (!hFiles.length) { toast('Ajoutez 1 à 10 photos de vos arbres'); return; }
    setHBusy(true);
    const tid = toast.loading(`Analyse de ${hFiles.length} photo(s)…`);
    try {
      const { data } = await orchardAPI.harvestBatch(hFiles, {
        species: hSpecies, numTrees: Number(hTrees) || 0, pricePerKg: Number(hPrice) || 0,
      });
      setHResult(data);
      toast.dismiss(tid);
      toast.success(`≈ ${data.total_kg} kg` + (data.total_price ? ` · ${data.total_price} ${data.currency}` : ''));
    } catch (e) { toast.dismiss(tid); toast.error(getErrorMessage(e, tr('orchardmap.err_analyze'))); }
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
          <Trees size={18} color="#16a34a" /> {tr('orchardmap.title')}
        </div>
        <div style={{ flex: 1 }} />
        {Object.entries(STATUS).map(([k, s]) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#475569' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} /> {tr('orchardmap.status_' + k)} {counts[k] || 0}
          </span>
        ))}
        {/* Tree type selector */}
        <select value={species} onChange={e => setSpecies(e.target.value)} title={tr('orchardmap.type_tree')}
          style={{ height: 38, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', padding: '0 10px', fontSize: 13, fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
          {SPECIES.map(s => <option key={s.v || 'autre'} value={s.v}>{s.e} {tr('orchardmap.sp_' + s.k)}</option>)}
        </select>
        {species === '' && (
          <input value={customSpecies} onChange={e => setCustomSpecies(e.target.value)}
            placeholder={tr('orchardmap.name_ph')}
            style={{ height: 38, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', padding: '0 12px', fontSize: 13, width: 180, outline: 'none' }} />
        )}
        <button onClick={load} title={tr('orchardmap.refresh')} style={iconBtn}>
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
        <button onClick={() => { setZoneCorners([]); setZoneMode(z => !z); }}
          title={tr('orchardmap.zone_draw_title')}
          style={{ ...primaryBtn, background: zoneMode ? '#ef4444' : 'linear-gradient(135deg,#0891b2,#0e7490)', opacity: detecting ? .6 : 1 }}>
          <Square size={15} /> {zoneMode ? tr('orchardmap.zone_cancel') : tr('orchardmap.zone_detect')}
        </button>
        <button onClick={detectAI} disabled={detecting} title={tr('orchardmap.detect_view_title')}
          style={{ ...primaryBtn, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', opacity: detecting ? .6 : 1 }}>
          {detecting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <ScanSearch size={15} />}
          {tr('orchardmap.detect_view')}
        </button>
        <button onClick={addAtGps} disabled={busy} style={{ ...primaryBtn, opacity: busy ? .6 : 1 }}>
          {busy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <MapPin size={15} />}
          {tr('orchardmap.add_gps')}
        </button>
      </div>

      {zoneMode && (
        <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#0e7490', fontWeight: 600 }}>
          {tr('orchardmap.zone_hint')}
          {zoneCorners.length === 1 && tr('orchardmap.zone_first_corner')}
        </div>
      )}

      {unplaced > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#92400e' }}>
          {tr('orchardmap.unplaced', { count: unplaced })}
        </div>
      )}

      {/* map */}
      <div style={{ height: '68vh', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <MapContainer center={center} zoom={17} minZoom={14} maxZoom={20}
          maxBounds={ZONE_BOUNDS} maxBoundsViscosity={1.0}
          style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles © Esri — World Imagery"
            // Esri n'a pas d'imagerie au-delà de z18 sur les zones rurales (tuiles
            // grises « Map data not yet available »). On plafonne le zoom natif à 18 :
            // au-delà, Leaflet agrandit les tuiles z18 au lieu d'en demander d'inexistantes.
            maxNativeZoom={18}
            maxZoom={20}
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
                <Tooltip direction="top">{t.label || t.species || tr('orchardmap.tree_n', { id: t.id })} · {tr('orchardmap.status_' + t.status)}</Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* ── Harvest & revenue estimation ───────────────────────────────────── */}
      <div style={hv.card}>
        <div style={hv.head}>
          <div style={hv.headIcon}><Apple size={20} color="#fff" /></div>
          <div>
            <div style={hv.title}>{tr('orchardmap.harvest_title')}</div>
            <div style={hv.sub}>{tr('orchardmap.harvest_sub')}</div>
          </div>
        </div>

        <div style={hv.body}>
          {/* uploader */}
          <div style={hv.uploadCol}>
            <label style={{ ...hv.dropzone, ...(hFiles.length >= 10 ? { opacity: .6, cursor: 'not-allowed' } : {}) }}>
              <Camera size={22} color="#0e7490" />
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{hFiles.length ? tr('orchardmap.photo_count', { n: hFiles.length }) : tr('orchardmap.add_photos')}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{tr('orchardmap.closeup_hint')}</div>
              <input type="file" accept="image/*" capture="environment" multiple onChange={onHarvestFiles} style={{ display: 'none' }} disabled={hFiles.length >= 10} />
            </label>
            {hPreviews.length > 0 && (
              <div style={hv.thumbs}>
                {hPreviews.map((src, i) => (
                  <div key={i} style={hv.thumbWrap}>
                    <img src={src} alt="" style={hv.thumb} />
                    {hResult?.per_image?.[i] && <span style={hv.thumbBadge}>{hResult.per_image[i].count}</span>}
                    <button onClick={() => removeHFile(i)} style={hv.thumbX} title={tr('orchardmap.remove')}><X size={11} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* controls */}
          <div style={hv.controls}>
            <div style={hv.fieldRow}>
              <div style={{ flex: '1 1 130px' }}>
                <div style={lbl}>{tr('orchardmap.fruit_type')}</div>
                <select value={hSpecies} onChange={e => setHSpecies(e.target.value)} style={hv.input}>
                  <option value="">{tr('orchardmap.auto_ai')}</option>
                  <option value="olive">{tr('orchardmap.fruit_olive')}</option>
                  <option value="orange">{tr('orchardmap.fruit_orange')}</option>
                  <option value="lemon">{tr('orchardmap.fruit_lemon')}</option>
                  <option value="other">{tr('orchardmap.fruit_other')}</option>
                </select>
              </div>
              <div style={{ flex: '1 1 110px' }}>
                <div style={lbl}>{tr('orchardmap.num_trees')}</div>
                <input type="number" min="0" value={hTrees} onChange={e => setHTrees(e.target.value)} placeholder="ex: 120" style={hv.input} />
              </div>
              <div style={{ flex: '1 1 110px' }}>
                <div style={lbl}>{tr('orchardmap.price_kg')}</div>
                <input type="number" min="0" step="0.1" value={hPrice} onChange={e => setHPrice(e.target.value)} placeholder="ex: 2.5" style={hv.input} />
              </div>
            </div>
            <button onClick={runHarvest} disabled={hBusy || !hFiles.length}
              style={{ ...hv.cta, opacity: (hBusy || !hFiles.length) ? .55 : 1 }}>
              {hBusy ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
              {tr('orchardmap.analyze_estimate')}
            </button>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {tr('orchardmap.formula_note')}
            </div>
          </div>
        </div>

        {/* results */}
        {hResult && (
          <div style={hv.results}>
            <div style={hv.kpis}>
              <Kpi label={tr('orchardmap.kpi_fruits_avg')} value={hResult.avg_fruits_per_tree} sub={tr('orchardmap.kpi_sampled', { n: hResult.sampled })} color="#0891b2" />
              <Kpi label={tr('orchardmap.kpi_kg_tree')} value={`${hResult.avg_kg_per_tree} kg`} color="#0f172a" />
              <Kpi label={tr('orchardmap.kpi_trees')} value={hResult.num_trees} color="#7c3aed" />
              <Kpi label={tr('orchardmap.kpi_total_kg')} value={`${hResult.total_kg} kg`} color="#16a34a" big />
              {hResult.total_price > 0 && <Kpi label={tr('orchardmap.kpi_revenue')} value={`${hResult.total_price.toLocaleString()} ${hResult.currency}`} color="#15803d" big />}
            </div>
            <div style={hv.formula}>
              {tr('orchardmap.fruit_' + hResult.fruit_type, hResult.fruit_type)} · {hResult.avg_kg_per_tree} {tr('orchardmap.kg_per_tree')} × {hResult.num_trees} {tr('orchardmap.trees_word')} = <b>{hResult.total_kg} kg</b>
              {hResult.total_price > 0 && <> &nbsp;×&nbsp; {hResult.price_per_kg} {hResult.currency}/kg = <b>{hResult.total_price.toLocaleString()} {hResult.currency}</b></>}
            </div>
          </div>
        )}
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
                <div style={{ fontWeight: 900, fontSize: 16 }}>{selected.label || selected.species || tr('orchardmap.tree_n', { id: selected.id })}</div>
                <div style={{ fontSize: 12, opacity: .9 }}>
                  {tr('orchardmap.status_' + (selected.status || 'healthy'))}
                  {selected.disease ? ` · ${selected.disease}` : ''}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff' }}><X size={18} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* tree species */}
              <div>
                <div style={lbl}>{tr('orchardmap.type_tree')}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {SPECIES.map(sp => {
                    // "Autre" is active when the tree's species is empty or a custom (unknown) value
                    const active = sp.v ? selected.species === sp.v : !KNOWN_SPECIES.includes(selected.species || '');
                    return (
                      <button key={sp.v || 'autre'} onClick={() => setTreeSpecies(sp.v)} disabled={busy}
                        style={{ padding: '8px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                          background: active ? '#16a34a' : '#fff', color: active ? '#fff' : '#475569',
                          border: `1.5px solid ${active ? '#16a34a' : '#e2e8f0'}` }}>
                        {sp.e} {tr('orchardmap.sp_' + sp.k)}
                      </button>
                    );
                  })}
                </div>
                {/* "Autre" → free-text name for this tree */}
                {!KNOWN_SPECIES.includes(selected.species || '') && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveName()}
                      placeholder={tr('orchardmap.name_ph')}
                      style={{ flex: 1, height: 38, borderRadius: 10, border: '1px solid #e2e8f0', padding: '0 12px', fontSize: 13, outline: 'none' }} />
                    <button onClick={saveName} disabled={busy} style={{ ...primaryBtn, padding: '0 16px' }}>OK</button>
                  </div>
                )}
              </div>

              {/* status */}
              <div>
                <div style={lbl}>{tr('orchardmap.status_word')}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(STATUS).map(([k, s]) => (
                    <button key={k} onClick={() => setStatus(k)} disabled={busy}
                      style={{ padding: '8px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                        background: selected.status === k ? s.color : '#fff', color: selected.status === k ? '#fff' : '#475569',
                        border: `1.5px solid ${selected.status === k ? s.color : '#e2e8f0'}` }}>
                      {tr('orchardmap.status_' + k)}
                    </button>
                  ))}
                </div>
              </div>

              {/* actions */}
              <div>
                <div style={lbl}>{tr('orchardmap.actions_word')}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setActionMode('disease'); setActionLabel(''); }} style={actBtn('#ef4444')}><Stethoscope size={15} /> {tr('orchardmap.report_disease')}</button>
                  <button onClick={() => { setActionMode('treatment'); setActionLabel(''); }} style={actBtn('#2563eb')}><SprayCan size={15} /> {tr('orchardmap.treatment')}</button>
                  <button onClick={() => { setActionMode('observation'); setActionNote(''); }} style={actBtn('#d97706')}><Eye size={15} /> {tr('orchardmap.observation')}</button>
                </div>

                {actionMode && (
                  <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    {actionMode === 'observation' ? (
                      <textarea value={actionNote} onChange={e => setActionNote(e.target.value)}
                        placeholder={tr('orchardmap.obs_note_ph')} rows={3}
                        style={{ width: '100%', boxSizing: 'border-box', borderRadius: 8, border: '1px solid #e2e8f0', padding: 10, fontFamily: 'inherit', resize: 'none' }} />
                    ) : (
                      <select value={actionLabel} onChange={e => setActionLabel(e.target.value)}
                        style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', padding: 10 }}>
                        <option value="">{actionMode === 'disease' ? tr('orchardmap.choose_disease') : tr('orchardmap.choose_treatment')}</option>
                        {(actionMode === 'disease' ? speciesDiseases : TREE_TREATMENTS).map(o => (
                          <option key={o.key} value={o.fr}>{o.fr}</option>
                        ))}
                      </select>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={submitAction} disabled={busy || (actionMode !== 'observation' && !actionLabel) || (actionMode === 'observation' && !actionNote.trim())}
                        style={{ ...primaryBtn, flex: 1, justifyContent: 'center' }}>{tr('orchardmap.save')}</button>
                      <button onClick={() => setActionMode(null)} style={iconBtn}><X size={16} /></button>
                    </div>
                  </div>
                )}
              </div>

              {/* history */}
              <div>
                <div style={lbl}>{tr('orchardmap.history')}</div>
                {(!selected.events || selected.events.length === 0) ? (
                  <div style={{ fontSize: 13, color: '#94a3b8', padding: '8px 0' }}>{tr('orchardmap.no_events')}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selected.events.map(ev => (
                      <div key={ev.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                            {tr('orchardmap.ev_' + ev.type, ev.type)}{ev.label ? ` — ${ev.label}` : ''}
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
                <Trash2 size={16} /> {tr('orchardmap.delete_tree')}
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

function Kpi({ label, value, sub, color, big }) {
  return (
    <div style={{ flex: '1 1 130px', minWidth: 120, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: big ? 24 : 20, fontWeight: 900, color: color || '#0f172a', marginTop: 2, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const hv = {
  card: { background: 'linear-gradient(180deg,#ffffff,#f8fafc)', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,.06)' },
  head: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', background: 'linear-gradient(135deg,#0e7490,#0891b2)' },
  headIcon: { width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontWeight: 900, fontSize: 16, color: '#fff' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,.85)', marginTop: 1 },
  body: { display: 'flex', gap: 18, flexWrap: 'wrap', padding: 18 },
  uploadCol: { display: 'flex', flexDirection: 'column', gap: 12, width: 280 },
  dropzone: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, height: 120, borderRadius: 14, border: '2px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', textAlign: 'center' },
  thumbs: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  thumbWrap: { position: 'relative', width: 60, height: 60 },
  thumb: { width: 60, height: 60, objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8f0' },
  thumbBadge: { position: 'absolute', bottom: -4, left: -4, background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 900, borderRadius: 8, padding: '1px 6px', border: '2px solid #fff' },
  thumbX: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: '2px solid #fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  controls: { flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 12 },
  fieldRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  input: { width: '100%', boxSizing: 'border-box', height: 40, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', padding: '0 12px', fontSize: 14, fontWeight: 600, color: '#0f172a', outline: 'none' },
  cta: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' },
  results: { borderTop: '1px solid #e2e8f0', padding: 18, display: 'flex', flexDirection: 'column', gap: 12, background: '#f8fafc' },
  kpis: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  formula: { fontSize: 13, color: '#475569', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px' },
};

const EVENT_LABEL = { disease: '🦠 Maladie', treatment: '💊 Traitement', observation: '👁 Observation', note: '📝 Note' };
const lbl = { fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', marginBottom: 8 };
const iconBtn = { width: 38, height: 38, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' };
const primaryBtn = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' };
const actBtn = (c) => ({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: 10, background: `${c}12`, border: `1px solid ${c}40`, color: c, fontWeight: 700, fontSize: 12, cursor: 'pointer' });
