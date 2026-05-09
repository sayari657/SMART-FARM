import { useState, useEffect } from 'react';
import {
  TrendingUp, Wallet, Package, Users,
  RefreshCw, AlertTriangle, CheckCircle, Bell,
  Heart, Droplets, Activity, PawPrint,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { animalsAPI, farmsAPI, workerTasksAPI, alertsAPI, poultryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const C = {
  primary: '#1d4ed8', success: '#10b981', warning: '#f59e0b',
  error: '#ef4444', text: '#1f2937', muted: '#6b7280',
  border: '#e5e7eb', surface: '#ffffff', bg: '#f9fafb',
};

const SPECIES_META = {
  cow:    { title: 'Bovins ERP',       emoji: '🐄', prodLabel: 'Lait',     prodUnit: 'L',          feedTypes: ['Foin','Ensilage','Concentré','Paille','Autre'] },
  sheep:  { title: 'Ovins ERP',        emoji: '🐑', prodLabel: 'Agneaux',  prodUnit: 'naissances', feedTypes: ['Foin','Paille','Concentré','Orge','Autre'] },
  goat:   { title: 'Caprins ERP',      emoji: '🐐', prodLabel: 'Lait',     prodUnit: 'L',          feedTypes: ['Foin','Paille','Concentré','Alfa','Autre'] },
  rabbit: { title: 'Cuniculture ERP',  emoji: '🐰', prodLabel: 'Lapereaux',prodUnit: 'naissances', feedTypes: ['Granulés','Foin','Légumes','Luzerne','Autre'] },
};

const MODULES = [
  { id: 'analytics',    label: '📊 Reporting',          icon: TrendingUp },
  { id: 'animaux',      label: '🐄 Animal Management',  icon: PawPrint   },
  { id: 'alimentation', label: '🌾 Feed & Nutrition',   icon: Droplets   },
  { id: 'sante',        label: '💊 Health Records',     icon: Heart      },
  { id: 'production',   label: '🥛 Production',         icon: Activity   },
  { id: 'finance',      label: '💰 Sales & Finance',    icon: Wallet     },
  { id: 'inventaire',   label: '📦 Inventory',          icon: Package    },
  { id: 'equipe',       label: '👨🌾 Workforce',         icon: Users      },
  { id: 'alertes',      label: '🔔 Alertes',            icon: Bell       },
];

// Safe error message extractor — prevents Pydantic error arrays from crashing React
const errStr = (e, fallback = 'Erreur') => {
  const d = e?.response?.data?.detail;
  if (!d) return fallback;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map(x => x.msg || x.type || String(x)).join(', ');
  return fallback;
};

// ── Animal Workspace ──────────────────────────────────────────────────────────

function AnimalWorkspace({ animal, farmId, color, species, onRefresh }) {
  const [activeModule, setActiveModule] = useState('analytics');
  const [confirmDel, setConfirmDel]     = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const sm = SPECIES_META[species] || SPECIES_META.cow;

  const statusColor = { active:'#10b981', healthy:'#10b981', sold:'#f59e0b', dead:'#94a3b8', sick:'#ef4444' }[animal.status] ?? '#94a3b8';

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await animalsAPI.delete(animal.id);
      toast.success(`Animal "${animal.name}" supprimé`);
      onRefresh();
    } catch (e) { toast.error(errStr(e, 'Erreur suppression')); setDeleting(false); }
  };

  return (
    <div className="fade-in">
      {/* Animal header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:14, paddingBottom:22, marginBottom:22, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:color+'18', border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>
            {sm.emoji}
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ fontWeight:900, fontSize:16 }}>{animal.name || `#${animal.id}`}</span>
              {animal.identifier && <span style={{ fontSize:11, background:'var(--color-surface-2)', padding:'2px 8px', borderRadius:6, color:C.muted }}>#{animal.identifier}</span>}
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:800, color:statusColor, background:statusColor+'15', padding:'2px 9px', borderRadius:999 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:statusColor }} />
                {(animal.status || 'healthy').toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize:12, color:C.muted }}>
              {animal.species_display || sm.title.split(' ')[0]}
              {animal.health_score != null && ` · Santé ${animal.health_score.toFixed(0)}%`}
              {animal.farm_name && ` · ${animal.farm_name}`}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          {animal.health_score != null && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:32, fontWeight:900, color: animal.health_score >= 70 ? C.success : animal.health_score >= 40 ? C.warning : C.error, lineHeight:1 }}>
                {animal.health_score.toFixed(0)}
              </div>
              <div style={{ fontSize:10, color:C.muted, fontWeight:800, letterSpacing:1 }}>SANTÉ</div>
            </div>
          )}
          {confirmDel ? (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, fontWeight:700, color:C.error }}>Supprimer ?</span>
              <button onClick={handleDelete} disabled={deleting} style={{ padding:'5px 12px', borderRadius:8, border:'none', background:C.error, color:'white', fontWeight:700, fontSize:12, cursor:'pointer' }}>{deleting ? '…' : 'Oui'}</button>
              <button onClick={() => setConfirmDel(false)} style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:'white', fontWeight:700, fontSize:12, cursor:'pointer' }}>Non</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} title="Supprimer" style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:18, padding:'4px 8px', borderRadius:8 }}>🗑</button>
          )}
        </div>
      </div>

      {/* Module tabs */}
      <div style={{ display:'flex', overflowX:'auto', borderBottom:`2px solid ${C.border}`, marginBottom:28, scrollbarWidth:'none' }}>
        {MODULES.map(m => (
          <button key={m.id} onClick={() => setActiveModule(m.id)} style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'10px 16px', border:'none', background:'transparent',
            borderBottom:`2px solid ${activeModule === m.id ? color : 'transparent'}`,
            marginBottom:-2, cursor:'pointer', whiteSpace:'nowrap',
            color:activeModule === m.id ? color : C.muted,
            fontWeight:activeModule === m.id ? 800 : 600, fontSize:12, transition:'all .15s',
          }}>
            <m.icon size={13} />
            {m.label.split(' ').slice(1).join(' ')}
          </button>
        ))}
      </div>

      {/* Module content */}
      {activeModule === 'analytics'    && <LivestockAnalyticsModule color={color} animal={animal} farmId={farmId} species={species} />}
      {activeModule === 'animaux'      && <AnimalEditModule         color={color} animal={animal} onRefresh={onRefresh} />}
      {activeModule === 'alimentation' && <AlimentationModule       color={color} animalId={animal.id} species={species} />}
      {activeModule === 'sante'        && <SanteModule              color={color} animalId={animal.id} />}
      {activeModule === 'production'   && <ProductionModule         color={color} animalId={animal.id} species={species} />}
      {activeModule === 'finance'      && <LivestockFinanceModule   color={color} farmId={farmId} species={species} />}
      {activeModule === 'inventaire'   && <LivestockInventaireModule color={color} farmId={farmId} />}
      {activeModule === 'equipe'       && <EquipeModule             color={color} farmId={farmId} />}
      {activeModule === 'alertes'      && <AlertesModule            color={color} onResolved={() => {}} />}

      {/* ── Rapport Journalier Darija ── */}
      <LivestockDarijaReport color={color} animal={animal} species={species} />
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function LivestockERP({ species = 'cow', color, farmId: propFarmId }) {
  const { farmId: authFarmId } = useAuth();
  const farmId   = propFarmId || authFarmId || 1;
  const sm       = SPECIES_META[species] || SPECIES_META.cow;
  const erpColor = color || C.primary;

  const [animals,       setAnimals]       = useState([]);
  const [animalTypes,   setAnimalTypes]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [alertCount,    setAlertCount]    = useState(0);
  const [globalStats,   setGlobalStats]   = useState({ total: 0, active: 0 });
  const [selectedId,    setSelectedId]    = useState(null);
  const [showNewAnimal, setShowNewAnimal] = useState(false);

  useEffect(() => { loadData(); }, [species, farmId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, typesRes] = await Promise.all([
        animalsAPI.list({ species, farm_id: farmId }),
        animalsAPI.types().catch(() => ({ data: [] })),
      ]);
      const all = Array.isArray(res.data) ? res.data : [];
      setAnimals(all);
      setAnimalTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
      const active = all.filter(a => a.status === 'active' || a.status === 'healthy' || !a.status);
      setGlobalStats({ total: all.length, active: active.length });
      setSelectedId(prev => prev && all.some(a => a.id === prev) ? prev : (all.length > 0 ? all[0].id : null));
    } catch (e) { console.error('LivestockERP load error', e); setAnimals([]); }
    try {
      const ar = await alertsAPI.list();
      setAlertCount((ar.data || []).filter(a => !a.is_resolved).length);
    } catch (_) {}
    setLoading(false);
  };

  return (
    <div className="fade-in">

      {/* ── Dark stats bar ── */}
      <div style={{
        background:'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
        borderRadius:20, padding:'18px 28px', marginBottom:24,
        display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16,
        boxShadow:'0 4px 20px rgba(0,0,0,.15)',
      }}>
        <div>
          <div style={{ fontSize:9, fontWeight:900, color:'#475569', letterSpacing:2.5, marginBottom:4 }}>SMART FARM AI</div>
          <div style={{ fontSize:18, fontWeight:900, color:'white' }}>{sm.emoji} {sm.title}</div>
        </div>
        <div style={{ display:'flex', gap:14, flexWrap:'wrap', alignItems:'center' }}>
          {[
            { value: globalStats.active, label: 'ACTIFS',  clr: erpColor },
            { value: globalStats.total,  label: 'TOTAL',   clr: '#10b981' },
            { value: alertCount || '0',  label: 'ALERTES', clr: alertCount > 0 ? C.error : '#475569' },
          ].map(s => (
            <div key={s.label} style={{ background:'rgba(255,255,255,.07)', borderRadius:12, padding:'10px 16px', border:'1px solid rgba(255,255,255,.06)', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:900, color:s.clr, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:9, color:'#475569', fontWeight:800, marginTop:3, letterSpacing:1.2 }}>{s.label}</div>
            </div>
          ))}
          <button onClick={() => setShowNewAnimal(v => !v)}
            style={{ padding:'10px 20px', borderRadius:12, border:'none', background:erpColor, color:'white', fontWeight:800, fontSize:13, cursor:'pointer' }}>
            {showNewAnimal ? '✕ Annuler' : '+ Nouvel animal'}
          </button>
        </div>
      </div>

      {/* ── New animal panel ── */}
      {showNewAnimal && (
        <div style={{ background:C.surface, borderRadius:20, border:`1px solid ${C.border}`, padding:'24px 28px', marginBottom:24 }}>
          <div style={{ fontWeight:900, fontSize:16, marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:4, height:24, borderRadius:999, background:erpColor }} />
            Enregistrer un Nouvel Animal
          </div>
          <AnimauxCreateModule
            color={erpColor} species={species} farmId={farmId} animalTypes={animalTypes}
            onRefresh={() => { loadData(); setShowNewAnimal(false); }}
          />
        </div>
      )}

      {/* ── Animal tab bar ── */}
      {!loading && animals.length > 0 && (
        <div style={{ display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none', marginBottom:0 }}>
          {animals.map(a => {
            const isActive = a.id === selectedId;
            const stClr = { active:'#10b981', healthy:'#10b981', sold:'#f59e0b', dead:'#94a3b8', sick:'#ef4444' }[a.status] ?? '#94a3b8';
            return (
              <button key={a.id} onClick={() => setSelectedId(a.id)} style={{
                display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap',
                padding:'10px 18px',
                background: isActive ? C.surface : C.bg,
                border: `1px solid ${isActive ? erpColor : C.border}`,
                borderBottom: isActive ? `1px solid ${C.surface}` : `1px solid ${C.border}`,
                borderRadius: isActive ? '12px 12px 0 0' : 10,
                cursor:'pointer', fontWeight: isActive ? 800 : 600,
                fontSize:12, color: isActive ? erpColor : C.muted,
                marginBottom: isActive ? -1 : 0,
                zIndex: isActive ? 2 : 1, position:'relative', transition:'all .15s',
              }}>
                <span style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background:stClr }} />
                {a.name || a.identifier || `#${a.id}`}
                {a.identifier && a.name && (
                  <span style={{ fontSize:10, background: isActive ? erpColor+'18' : C.border, color: isActive ? erpColor : C.muted, borderRadius:999, padding:'1px 7px', fontWeight:800 }}>
                    #{a.identifier}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Workspace panel ── */}
      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:80, flexDirection:'column', gap:14 }}>
          <RefreshCw size={30} className="spin" color={erpColor} />
          <div style={{ fontWeight:700, color:C.muted }}>Chargement des données...</div>
        </div>
      ) : animals.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 20px', color:C.muted }}>
          <div style={{ fontSize:52, marginBottom:16 }}>{sm.emoji}</div>
          <div style={{ fontWeight:900, fontSize:18, marginBottom:8 }}>Aucun animal enregistré</div>
          <div style={{ fontSize:14 }}>Cliquez sur <strong>+ Nouvel animal</strong> pour démarrer.</div>
        </div>
      ) : (() => {
        const sel = animals.find(a => a.id === selectedId);
        if (!sel) return null;
        return (
          <div key={sel.id} style={{ background:C.surface, borderRadius:16, border:`1px solid ${erpColor}`, padding:'28px 28px', position:'relative', zIndex:1 }}>
            <AnimalWorkspace animal={sel} farmId={farmId} color={erpColor} species={species} onRefresh={loadData} />
          </div>
        );
      })()}
    </div>
  );
}

// ── MODULES ───────────────────────────────────────────────────────────────────

function AnimauxCreateModule({ color, species, farmId, animalTypes, onRefresh }) {
  const sm = SPECIES_META[species] || SPECIES_META.cow;
  const speciesTypes = animalTypes.filter(t => t.species === species);
  const defaultTypeId = speciesTypes.length > 0 ? speciesTypes[0].id : null;

  const [form, setForm] = useState({ name:'', identifier:'', status:'healthy', notes:'' });
  const [typeId, setTypeId] = useState(defaultTypeId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (speciesTypes.length > 0 && !typeId) setTypeId(speciesTypes[0].id);
  }, [animalTypes]);

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Nom requis'); return; }
    setSaving(true);
    try {
      let tid = typeId || (speciesTypes[0]?.id);
      
      if (!tid) {
        // Auto-create missing type
        const res = await animalsAPI.createType({
          species: species,
          display_name: sm.title
        });
        tid = res.data.id;
      }
      
      await animalsAPI.create({
        name: form.name,
        identifier: form.identifier || null,
        status: form.status,
        notes: form.notes || null,
        farm_id: farmId || 1,
        type_id: tid,
        health_score: 100.0,
      });
      setForm({ name:'', identifier:'', status:'healthy', notes:'' });
      toast.success('Animal enregistré');
      onRefresh?.();
    } catch (e) { toast.error(errStr(e, 'Erreur création')); }
    setSaving(false);
  };

  return (
    <div className="glass-panel" style={{ maxWidth:600 }}>
      <div className="panel-title">Nouvel Animal — {sm.emoji} {sm.title.split(' ')[0]}</div>
      {speciesTypes.length > 1 && (
        <div style={{ marginBottom:14 }}>
          <Field label="Type / Race" type="select"
            options={speciesTypes.map(t => ({ v: String(t.id), l: t.display_name || t.species }))}
            value={String(typeId || '')} onChange={v => setTypeId(Number(v))} />
        </div>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div className="grid-2" style={{ gap:12 }}>
          <Field label="Nom *" placeholder="ex: Bella, Vache-01…" value={form.name} onChange={v => setForm({...form, name:v})} />
          <Field label="N° Boucle / Identifier" placeholder="ex: BOV-2026-001" value={form.identifier} onChange={v => setForm({...form, identifier:v})} />
        </div>
        <Field label="Statut" type="select"
          options={[{v:'healthy',l:'✅ Sain'},{v:'sick',l:'🤒 Malade'},{v:'sold',l:'💰 Vendu'},{v:'dead',l:'💀 Décédé'}]}
          value={form.status} onChange={v => setForm({...form, status:v})} />
        <Field label="Notes" placeholder="Observations particulières..." value={form.notes} onChange={v => setForm({...form, notes:v})} />
        <button className="btn-erp-primary" onClick={handleSubmit} disabled={saving} style={{ background: color }}>
          {saving ? 'Enregistrement...' : 'Ajouter au troupeau'}
        </button>
      </div>
    </div>
  );
}

function AnimalEditModule({ color, animal, onRefresh }) {
  const [form, setForm] = useState({
    name:         animal.name        || '',
    status:       animal.status      || 'healthy',
    health_score: animal.health_score != null ? String(animal.health_score) : '100',
    notes:        animal.notes       || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await animalsAPI.update(animal.id, {
        name:         form.name || undefined,
        status:       form.status,
        health_score: Number(form.health_score) || undefined,
        notes:        form.notes || null,
      });
      toast.success('Animal mis à jour');
      onRefresh();
    } catch (e) { toast.error(errStr(e, 'Erreur mise à jour')); }
    setSaving(false);
  };

  return (
    <div className="fade-in">
      <SectionHeader title="🐄 Fiche Animal" sub="Modifiez les informations de cet animal." />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:28 }}>
        <div className="glass-panel">
          <div className="panel-title">Modifier</div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Field label="Nom" value={form.name} onChange={v => setForm({...form, name:v})} />
            <div className="grid-2" style={{ gap:12 }}>
              <Field label="Statut" type="select"
                options={[{v:'healthy',l:'✅ Sain'},{v:'active',l:'✅ Actif'},{v:'sick',l:'🤒 Malade'},{v:'sold',l:'💰 Vendu'},{v:'dead',l:'💀 Décédé'}]}
                value={form.status} onChange={v => setForm({...form, status:v})} />
              <Field label="Score santé (0-100)" type="number" value={form.health_score} onChange={v => setForm({...form, health_score:v})} />
            </div>
            <Field label="Notes" value={form.notes} onChange={v => setForm({...form, notes:v})} />
            <button className="btn-erp-primary" onClick={handleSave} disabled={saving} style={{ background:color }}>
              {saving ? 'Enregistrement...' : '💾 Enregistrer'}
            </button>
          </div>
        </div>
        <div className="card-inner" style={{ borderLeft:`4px solid ${color}44` }}>
          <div style={{ fontWeight:900, marginBottom:12 }}>Informations</div>
          {[
            ['ID Système',     `#${animal.id}`],
            ['Espèce',        animal.species_display || animal.species || '—'],
            ['Identifiant',   animal.identifier || '—'],
            ['Tag ID',        animal.tag_id || '—'],
            ['Ferme',         animal.farm_name || '—'],
            ['Enregistré le', animal.created_at ? new Date(animal.created_at).toLocaleDateString('fr-FR') : '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
              <span style={{ color:C.muted }}>{k}</span>
              <span style={{ fontWeight:700 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlimentationModule({ color, animalId, species }) {
  const sm = SPECIES_META[species] || SPECIES_META.cow;
  const [form, setForm]     = useState({ feed_type: sm.feedTypes[0], quantity_kg:'' });
  const [saving, setSaving] = useState(false);
  const [logs, setLogs]     = useState([]);

  const load = () => {
    if (animalId) animalsAPI.getLogs(animalId, 'feed').then(r => setLogs(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  };
  useEffect(() => { load(); }, [animalId]);

  const handleSubmit = async () => {
    if (!form.quantity_kg) { toast.error('Quantité requise'); return; }
    setSaving(true);
    try {
      // Backend accepts: { type, value, unit, notes }
      await animalsAPI.addLog(animalId, {
        type:  'feed',
        value: Number(form.quantity_kg),
        unit:  form.feed_type,       // store feed type in "unit" field
        notes: null,
      });
      setForm({ feed_type: sm.feedTypes[0], quantity_kg:'' });
      toast.success('Ration enregistrée');
      load();
    } catch (e) { toast.error(errStr(e, 'Erreur alimentation')); }
    setSaving(false);
  };

  const totalFeed = logs.reduce((s, l) => s + (l.value || 0), 0);

  return (
    <div className="fade-in">
      <SectionHeader title="🌾 Alimentation" sub="Suivi de la consommation journalière par animal." />
      <div className="grid-2-1" style={{ gap:28, marginBottom:24 }}>
        <div className="glass-panel">
          <div className="panel-title">Nouvelle Ration</div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Field label="Type d'Aliment" type="select"
              options={sm.feedTypes.map(f => ({ v:f, l:f }))}
              value={form.feed_type} onChange={v => setForm({...form, feed_type:v})} />
            <Field label="Quantité (kg)" type="number" placeholder="ex: 5" value={form.quantity_kg} onChange={v => setForm({...form, quantity_kg:v})} />
            <button className="btn-erp-primary" onClick={handleSubmit} disabled={saving} style={{ background:color }}>
              {saving ? 'Enregistrement...' : 'Enregistrer la Ration'}
            </button>
          </div>
        </div>
        <div className="card-inner" style={{ textAlign:'center', background:color+'06', display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <div style={{ fontSize:10, fontWeight:900, color:C.muted, letterSpacing:1 }}>TOTAL CONSOMMÉ</div>
          <div style={{ fontSize:44, fontWeight:900, color, lineHeight:1 }}>{totalFeed.toFixed(1)}</div>
          <div style={{ fontSize:12, color:C.muted }}>kg · {logs.length} ration(s)</div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="card-inner">
          <div style={{ fontWeight:900, marginBottom:12 }}>Historique ({logs.length})</div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:C.bg }}>
                  {['Date','Type','Quantité (kg)'].map(h => (
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontWeight:800, color:C.muted, fontSize:10, letterSpacing:.4, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...logs].slice(0, 15).map((l, i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:'9px 12px', whiteSpace:'nowrap' }}>{fmt(l.timestamp)}</td>
                    <td style={{ padding:'9px 12px', whiteSpace:'nowrap' }}>{l.unit || '—'}</td>
                    <td style={{ padding:'9px 12px', whiteSpace:'nowrap', fontWeight:700, color }}>{l.value ?? '—'} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SanteModule({ color, animalId }) {
  const [form, setForm]     = useState({ event_type:'Vaccination', description:'', medicine:'', cost:'' });
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState([]);

  const load = () => {
    if (animalId) animalsAPI.getLogs(animalId, 'health').then(r => setRecords(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  };
  useEffect(() => { load(); }, [animalId]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // unit = event_type, value = cost, notes = description — medicine
      await animalsAPI.addLog(animalId, {
        type:  'health',
        value: Number(form.cost) || null,
        unit:  form.event_type,
        notes: [form.description, form.medicine].filter(Boolean).join(' — ') || null,
      });
      setForm({ event_type:'Vaccination', description:'', medicine:'', cost:'' });
      toast.success('Acte sanitaire enregistré');
      load();
    } catch (e) { toast.error(errStr(e, 'Erreur santé')); }
    setSaving(false);
  };

  const evtColor = t => ({ Vaccination:color, Traitement:C.warning, 'Visite Vétérinaire':'#7c3aed' }[t] ?? C.muted);
  const totalCost = records.reduce((s, r) => s + (r.value || 0), 0);

  return (
    <div className="fade-in">
      <SectionHeader title="💊 Santé & Vétérinaire" sub="Carnet vaccinal et journal vétérinaire individuel." />
      <div className="grid-2" style={{ gap:28, marginBottom:24 }}>
        <div className="glass-panel">
          <div className="panel-title">Nouvel Acte Sanitaire</div>
          <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <Field label="Type" type="select"
              options={[{v:'Vaccination',l:'Vaccination'},{v:'Traitement',l:'Traitement'},{v:'Visite Vétérinaire',l:'Visite Vétérinaire'},{v:'Autre',l:'Autre'}]}
              value={form.event_type} onChange={v => setForm({...form, event_type:v})} />
            <Field label="Description" placeholder="ex: Vaccin FMD, Déparasitage..." value={form.description} onChange={v => setForm({...form, description:v})} />
            <Field label="Médicament / Vaccin" value={form.medicine} onChange={v => setForm({...form, medicine:v})} />
            <Field label="Coût (TND)" type="number" value={form.cost} onChange={v => setForm({...form, cost:v})} />
            <button className="btn-erp-primary" onClick={handleSubmit} disabled={saving} style={{ background:color }}>
              {saving ? 'Enregistrement...' : "Enregistrer l'acte"}
            </button>
          </div>
        </div>
        <div className="card-inner">
          <div style={{ fontWeight:900, marginBottom:14 }}>Résumé Sanitaire</div>
          {[
            { label:'Vaccinations',         count: records.filter(r => r.unit === 'Vaccination').length,       clr:color },
            { label:'Traitements',          count: records.filter(r => r.unit === 'Traitement').length,        clr:C.warning },
            { label:'Visites Vétérinaires', count: records.filter(r => r.unit === 'Visite Vétérinaire').length,clr:'#7c3aed' },
            { label:'Coût total santé',     count: `${totalCost.toFixed(0)} TND`,                              clr:C.error },
          ].map(s => (
            <div key={s.label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:13, color:C.muted }}>{s.label}</span>
              <span style={{ fontWeight:900, color:s.clr }}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {records.length > 0 && (
        <div className="card-inner">
          <div style={{ fontWeight:900, marginBottom:12 }}>Historique ({records.length} actes)</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {records.slice(0, 15).map((r, i) => (
              <div key={i} style={{ display:'flex', gap:12, padding:'11px 14px', background:C.bg, borderRadius:10, borderLeft:`4px solid ${evtColor(r.unit)}`, alignItems:'center' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:13 }}>{r.unit || 'Acte'}{r.notes ? ` — ${r.notes}` : ''}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{fmt(r.timestamp)}</div>
                </div>
                {r.value > 0 && <div style={{ fontWeight:900, color:C.error, fontSize:13 }}>{r.value} TND</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductionModule({ color, animalId, species }) {
  const sm = SPECIES_META[species] || SPECIES_META.cow;
  const isMilk = sm.prodUnit === 'L';

  const [form, setForm]     = useState({ quantity:'' });
  const [saving, setSaving] = useState(false);
  const [logs, setLogs]     = useState([]);
  const [wForm, setWForm]   = useState({ weight_kg:'' });
  const [wSaving, setWSaving] = useState(false);
  const [wLogs, setWLogs]   = useState([]);

  const load = () => {
    if (!animalId) return;
    animalsAPI.getLogs(animalId, 'production').then(r => setLogs(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    animalsAPI.getLogs(animalId, 'weight').then(r => setWLogs(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  };
  useEffect(() => { load(); }, [animalId]);

  const handleProd = async () => {
    if (!form.quantity) { toast.error('Quantité requise'); return; }
    setSaving(true);
    try {
      await animalsAPI.addLog(animalId, { type:'production', value:Number(form.quantity), unit:sm.prodUnit, notes:null });
      setForm({ quantity:'' });
      toast.success('Production enregistrée');
      load();
    } catch (e) { toast.error(errStr(e, 'Erreur production')); }
    setSaving(false);
  };

  const handleWeight = async () => {
    if (!wForm.weight_kg) { toast.error('Poids requis'); return; }
    setWSaving(true);
    try {
      await animalsAPI.addLog(animalId, { type:'weight', value:Number(wForm.weight_kg), unit:'kg', notes:null });
      setWForm({ weight_kg:'' });
      toast.success('Pesée enregistrée');
      load();
    } catch (e) { toast.error(errStr(e, 'Erreur pesée')); }
    setWSaving(false);
  };

  const totalProd = logs.reduce((s, l) => s + (l.value || 0), 0);
  const avgProd   = logs.length ? (totalProd / logs.length).toFixed(1) : null;
  const prodData  = logs.map((l, i) => ({ day:`J${i+1}`, val: l.value })).reverse();
  const wData     = wLogs.map((l, i) => ({ n:i+1, kg: l.value })).reverse();

  return (
    <div className="fade-in">
      <SectionHeader title={`🥛 Production — ${sm.prodLabel}`} sub={`Suivi ${isMilk ? 'laitier' : 'des naissances'} + pesées.`} />

      <div className="grid-2" style={{ gap:28, marginBottom:28 }}>
        <div className="glass-panel">
          <div className="panel-title">{isMilk ? 'Traite Journalière' : 'Nouvelle Naissance'}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Field label={isMilk ? 'Litres produits (L)' : `Nombre de ${sm.prodLabel}`}
              type="number" placeholder={isMilk ? 'ex: 18' : 'ex: 2'}
              value={form.quantity} onChange={v => setForm({...form, quantity:v})} />
            <button className="btn-erp-primary" onClick={handleProd} disabled={saving} style={{ background:color }}>
              {saving ? 'Enregistrement...' : 'Valider'}
            </button>
          </div>
        </div>
        <div className="card-inner" style={{ textAlign:'center', background:color+'06', display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <div style={{ fontSize:10, fontWeight:900, color:C.muted, letterSpacing:1 }}>TOTAL {sm.prodLabel.toUpperCase()}</div>
          <div style={{ fontSize:44, fontWeight:900, color, lineHeight:1 }}>{totalProd.toLocaleString()}</div>
          <div style={{ fontSize:12, color:C.muted }}>{sm.prodUnit} · {logs.length} sessions · moy. {avgProd ?? '—'}</div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginBottom:24 }}>
        <div className="panel-title">⚖️ Pesée</div>
        <div style={{ display:'flex', gap:14, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:160 }}>
            <Field label="Poids (kg)" type="number" placeholder="ex: 450" value={wForm.weight_kg} onChange={v => setWForm({...wForm, weight_kg:v})} />
          </div>
          <button className="btn-erp-primary" onClick={handleWeight} disabled={wSaving} style={{ background:color, flexShrink:0 }}>
            {wSaving ? '…' : 'Enregistrer pesée'}
          </button>
        </div>
      </div>

      {(prodData.length > 1 || wData.length > 1) && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:28 }}>
          {prodData.length > 1 && (
            <div className="glass-panel" style={{ height:260 }}>
              <div className="panel-title">{sm.prodLabel} par session</div>
              <ResponsiveContainer width="100%" height="82%">
                <BarChart data={prodData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize:11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize:11 }} />
                  <Tooltip formatter={v => [`${v} ${sm.prodUnit}`, sm.prodLabel]} />
                  <Bar dataKey="val" fill={color} radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {wData.length > 1 && (
            <div className="glass-panel" style={{ height:260 }}>
              <div className="panel-title">Évolution du poids</div>
              <ResponsiveContainer width="100%" height="82%">
                <LineChart data={wData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="n" axisLine={false} tickLine={false} tick={{ fontSize:11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize:11 }} />
                  <Tooltip formatter={v => [`${v} kg`, 'Poids']} />
                  <Line type="monotone" dataKey="kg" stroke={color} strokeWidth={3} dot={{ r:5, fill:color }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LivestockFinanceModule({ color, farmId, species }) {
  const sm = SPECIES_META[species] || SPECIES_META.cow;
  const [form, setForm]         = useState({ tx_type:'revenue', category:'sale', amount:'', notes:'' });
  const [saving, setSaving]     = useState(false);
  const [transactions, setTx]   = useState([]);

  const load = () => {
    if (farmId) farmsAPI.getFinance(farmId).then(r => setTx(Array.isArray(r.data?.items) ? r.data.items : [])).catch(() => {});
  };
  useEffect(() => { load(); }, [farmId]);

  const handleSubmit = async () => {
    if (!form.amount) { toast.error('Montant requis'); return; }
    setSaving(true);
    try {
      await farmsAPI.addFinance(farmId, {
        type: form.tx_type, category: form.category,
        amount: Number(form.amount),
        notes: form.notes || `${sm.emoji} ${form.category}`,
      });
      setForm({ tx_type:'revenue', category:'sale', amount:'', notes:'' });
      toast.success('Transaction enregistrée');
      load();
    } catch (e) { toast.error(errStr(e, 'Erreur finance')); }
    setSaving(false);
  };

  const totalRev = transactions.filter(t => t.type === 'revenue').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExp = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div className="fade-in">
      <SectionHeader title="💰 Finance & Ventes" sub="Revenus et dépenses de la ferme." />
      <div className="grid-2" style={{ gap:28, marginBottom:24 }}>
        <div className="glass-panel">
          <div className="panel-title">Nouvelle Transaction</div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="grid-2" style={{ gap:12 }}>
              <Field label="Type" type="select"
                options={[{v:'revenue',l:'Revenu'},{v:'expense',l:'Dépense'}]}
                value={form.tx_type} onChange={v => setForm({...form, tx_type:v})} />
              <Field label="Catégorie" type="select"
                options={[{v:'sale',l:'Vente'},{v:'milk',l:'Vente lait'},{v:'feed',l:'Achat fourrage'},{v:'vet',l:'Frais vétérinaires'},{v:'other',l:'Autre'}]}
                value={form.category} onChange={v => setForm({...form, category:v})} />
            </div>
            <Field label="Montant (TND)" type="number" placeholder="ex: 1500" value={form.amount} onChange={v => setForm({...form, amount:v})} />
            <Field label="Notes" placeholder="Description..." value={form.notes} onChange={v => setForm({...form, notes:v})} />
            <button className="btn-erp-primary" onClick={handleSubmit} disabled={saving} style={{ background:color }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
        <div className="card-inner" style={{ borderLeft:`5px solid ${C.success}` }}>
          <div style={{ fontWeight:900, marginBottom:18 }}>Bilan</div>
          {[
            { label:'Revenus', value:`${totalRev.toFixed(0)} TND`, clr:C.success },
            { label:'Dépenses', value:`${totalExp.toFixed(0)} TND`, clr:C.error },
            { label:'Marge nette', value:`${((totalRev || 0) - (totalExp || 0)).toFixed(0)} TND`, clr:((totalRev || 0) - (totalExp || 0)) >= 0 ? C.success : C.error },
          ].map(s => (
            <div key={s.label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:13, color:C.muted }}>{s.label}</span>
              <span style={{ fontWeight:900, color:s.clr, fontSize:s.label === 'Marge nette' ? 18 : 14 }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {transactions.length > 0 && (
        <div className="card-inner">
          <div style={{ fontWeight:900, marginBottom:12 }}>Historique ({transactions.length})</div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:C.bg }}>
                  {['Date','Type','Catégorie','Notes','Montant'].map(h => (
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontWeight:800, color:C.muted, fontSize:10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 15).map((t, i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:'9px 12px', whiteSpace:'nowrap' }}>{fmt(t.timestamp)}</td>
                    <td style={{ padding:'9px 12px', whiteSpace:'nowrap' }}>
                      <span style={{ fontWeight:800, color:t.type === 'revenue' ? C.success : C.error }}>{t.type === 'revenue' ? '▲' : '▼'} {t.type}</span>
                    </td>
                    <td style={{ padding:'9px 12px' }}>{t.category}</td>
                    <td style={{ padding:'9px 12px' }}>{t.notes || '—'}</td>
                    <td style={{ padding:'9px 12px', whiteSpace:'nowrap' }}>
                      <span style={{ fontWeight:900, color:t.type === 'revenue' ? C.success : C.error }}>{t.amount?.toFixed(0)} TND</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function LivestockInventaireModule({ color, farmId }) {
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState({ item_name:'', category:'feed', quantity:'', unit:'kg', min_threshold:'' });

  const load = () => {
    poultryAPI.inventory.list(farmId || 1).then(r => setInventory(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  };
  useEffect(() => { load(); }, [farmId]);

  const handleAdd = async () => {
    if (!form.item_name || !form.quantity) return;
    try {
      await poultryAPI.inventory.create({ ...form, quantity:Number(form.quantity), min_threshold:Number(form.min_threshold)||0, farm_id:farmId||1 });
      setForm({ item_name:'', category:'feed', quantity:'', unit:'kg', min_threshold:'' });
      load();
    } catch (e) { toast.error(errStr(e, 'Erreur inventaire')); }
  };

  const handleDelete = async (id) => {
    try { await poultryAPI.inventory.delete(id); load(); } catch (_) {}
  };

  const lowStock = inventory.filter(i => i.quantity < (i.min_threshold || 0));

  return (
    <div className="fade-in">
      <SectionHeader title="📦 Stocks & Approvisionnement" sub="Gérez vos stocks de fourrage, médicaments et matériel." />
      {lowStock.length > 0 && (
        <AlertBanner color={C.error} icon={AlertTriangle}>
          {lowStock.length} article(s) en stock critique : {lowStock.map(i => i.item_name).join(', ')}
        </AlertBanner>
      )}
      <div className="grid-3" style={{ gap:16, marginBottom:28 }}>
        {inventory.map(item => {
          const critical = item.quantity < (item.min_threshold || 0);
          return (
            <div key={item.id} className="card-inner" style={{ borderBottom: critical ? `3px solid ${C.error}` : undefined }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div style={{ fontWeight:800, fontSize:13 }}>{item.item_name}</div>
                <button onClick={() => handleDelete(item.id)} style={{ background:'none', border:'none', cursor:'pointer', color:C.error, fontSize:14, opacity:.6 }}>🗑</button>
              </div>
              <div style={{ fontSize:26, fontWeight:900 }}>{item.quantity} <span style={{ fontSize:12, color:C.muted }}>{item.unit}</span></div>
              {item.min_threshold > 0 && (
                <div style={{ fontSize:11, color:critical ? C.error : C.muted, fontWeight:700, marginTop:4 }}>
                  {critical ? '⚠️ STOCK CRITIQUE !' : `Seuil : ${item.min_threshold} ${item.unit}`}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="glass-panel">
        <div className="panel-title">Entrée de Stock</div>
        <div className="grid-4" style={{ gap:12 }}>
          <Field label="Nom de l'article" value={form.item_name} onChange={v => setForm({...form, item_name:v})} />
          <Field label="Catégorie" type="select"
            options={[{v:'feed',l:'Fourrage'},{v:'medicine',l:'Santé'},{v:'equipment',l:'Matériel'},{v:'other',l:'Autre'}]}
            value={form.category} onChange={v => setForm({...form, category:v})} />
          <Field label="Quantité" type="number" value={form.quantity} onChange={v => setForm({...form, quantity:v})} />
          <Field label="Seuil Alerte" type="number" value={form.min_threshold} onChange={v => setForm({...form, min_threshold:v})} />
        </div>
        <button className="btn-erp-secondary" onClick={handleAdd} style={{ marginTop:16 }}>Ajouter au stock</button>
      </div>
    </div>
  );
}

function EquipeModule({ color, farmId }) {
  const [tasks, setTasks]                     = useState([]);
  const [workers, setWorkers]                 = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState(new Set());
  const [form, setForm]                       = useState({ title:'', category:'feeding', priority:'normal', description:'' });
  const [saving, setSaving]                   = useState(false);

  const load = () => workerTasksAPI.list({ farm_id: farmId || 1 }).then(r => setTasks(Array.isArray(r.data) ? r.data : [])).catch(() => {});

  useEffect(() => {
    load();
    workerTasksAPI.listWorkers(farmId || 1).then(r => setWorkers(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const toggle = (id) => setSelectedWorkers(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleCreate = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      const base = { ...form, farm_id: farmId || 1 };
      if (selectedWorkers.size === 0) await workerTasksAPI.create({ ...base, worker_id: null });
      else await Promise.all([...selectedWorkers].map(wid => workerTasksAPI.create({ ...base, worker_id: wid })));
      setForm({ title:'', category:'feeding', priority:'normal', description:'' });
      setSelectedWorkers(new Set());
      toast.success('Tâche(s) créée(s)');
      load();
    } catch (e) { toast.error(errStr(e, 'Erreur création tâche')); }
    setSaving(false);
  };

  const updateStatus = async (id, status) => {
    try { await workerTasksAPI.updateStatus(id, status); setTasks(prev => prev.map(t => t.id === id ? {...t, status} : t)); } catch (_) {}
  };

  const sColor  = { pending:C.warning, done:C.success, blocked:C.error };
  const prioTag = { low:'#94a3b8', normal:color, urgent:C.error };
  const wName   = (id) => { const w = workers.find(w => w.id === id); return w ? (w.full_name || w.username) : null; };

  return (
    <div className="fade-in">
      <SectionHeader title="👨🌾 Équipe & Tâches" sub="Assignation et suivi des tâches du personnel." />
      <div className="grid-2" style={{ gap:28 }}>
        <div>
          <div style={{ fontWeight:900, marginBottom:12 }}>
            Tâches ({tasks.length})
            <span style={{ marginLeft:8, fontSize:11, color:C.muted }}>✅ {tasks.filter(t=>t.status==='done').length} · ⏳ {tasks.filter(t=>t.status==='pending').length}</span>
          </div>
          {tasks.length === 0 ? (
            <div className="card-inner" style={{ textAlign:'center', color:C.muted, padding:28 }}>Aucune tâche.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {tasks.map(t => (
                <div key={t.id} className="card-inner" style={{ borderLeft:`4px solid ${sColor[t.status]??C.border}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:13 }}>{t.title}</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
                        <span style={{ fontSize:10, background:`${color}15`, color, borderRadius:5, padding:'2px 7px', fontWeight:700 }}>{t.category}</span>
                        <span style={{ fontSize:10, background:`${prioTag[t.priority]}18`, color:prioTag[t.priority], borderRadius:5, padding:'2px 7px', fontWeight:700 }}>{t.priority}</span>
                        {wName(t.worker_id) && <span style={{ fontSize:10, background:'#f0fdf4', color:'#15803d', borderRadius:5, padding:'2px 7px', fontWeight:700 }}>👷 {wName(t.worker_id)}</span>}
                      </div>
                    </div>
                    <select value={t.status} onChange={e => updateStatus(t.id, e.target.value)}
                      style={{ border:`1px solid ${sColor[t.status]??C.border}`, borderRadius:8, padding:'4px 8px', fontSize:10, fontWeight:900, color:sColor[t.status], background:'white', cursor:'pointer', flexShrink:0 }}>
                      <option value="pending">En attente</option>
                      <option value="done">Terminé</option>
                      <option value="blocked">Bloqué</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="glass-panel">
          <div className="panel-title">Nouvelle Tâche</div>
          <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <Field label="Titre" placeholder="ex: Vaccination du troupeau" value={form.title} onChange={v => setForm({...form, title:v})} />
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:C.text, display:'block', marginBottom:6 }}>
                Assigner à {selectedWorkers.size > 0 && <span style={{ color, fontSize:11, fontWeight:900 }}>{selectedWorkers.size} sélectionné(s)</span>}
              </label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {workers.map(w => {
                  const sel = selectedWorkers.has(w.id);
                  return (
                    <button key={w.id} type="button" onClick={() => toggle(w.id)} style={{
                      padding:'6px 12px', borderRadius:999, fontSize:12, fontWeight:700, cursor:'pointer',
                      border:`1.5px solid ${sel ? color : C.border}`, background:sel ? color : 'white', color:sel ? 'white' : C.text,
                    }}>
                      {sel ? '✓ ' : ''}{w.full_name || w.username}
                    </button>
                  );
                })}
                {workers.length === 0 && <div style={{ fontSize:12, color:C.muted }}>Aucun ouvrier enregistré.</div>}
              </div>
            </div>
            <Field label="Catégorie" type="select"
              options={[{v:'feeding',l:'Alimentation'},{v:'health',l:'Santé'},{v:'cleaning',l:'Nettoyage'},{v:'other',l:'Autre'}]}
              value={form.category} onChange={v => setForm({...form, category:v})} />
            <Field label="Priorité" type="select"
              options={[{v:'low',l:'Basse'},{v:'normal',l:'Normale'},{v:'urgent',l:'Urgente'}]}
              value={form.priority} onChange={v => setForm({...form, priority:v})} />
            <button className="btn-erp-primary" onClick={handleCreate} disabled={saving} style={{ background:color }}>
              {saving ? 'Création...' : selectedWorkers.size > 1 ? `Créer ${selectedWorkers.size} tâches` : 'Créer la Tâche'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertesModule({ color, onResolved }) {
  const [alerts, setAlerts] = useState([]);
  const [busy, setBusy]     = useState(true);

  useEffect(() => {
    alertsAPI.list().then(r => setAlerts((r.data || []).filter(a => !a.is_resolved))).catch(() => setAlerts([])).finally(() => setBusy(false));
  }, []);

  const resolve = async (id) => {
    try { await alertsAPI.resolve(id, 'manager'); setAlerts(prev => prev.filter(a => a.id !== id)); onResolved?.(); } catch (_) {}
  };

  const sevColor = { critical:C.error, warning:C.warning, info:color };

  return (
    <div className="fade-in">
      <SectionHeader title="🔔 Alertes" sub="Seuils automatiques configurables." />
      {busy ? (
        <div style={{ textAlign:'center', padding:40, color:C.muted }}>Chargement...</div>
      ) : alerts.length === 0 ? (
        <div className="card-inner" style={{ textAlign:'center', padding:40 }}>
          <CheckCircle size={32} color={C.success} style={{ margin:'0 auto 12px' }} />
          <div style={{ fontWeight:800, color:C.success }}>Aucune alerte active</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {alerts.map(a => (
            <div key={a.id} className="card-inner" style={{ borderLeft:`4px solid ${sevColor[a.severity]??C.warning}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, color:sevColor[a.severity]??C.warning, marginBottom:3 }}>
                    {a.severity === 'critical' ? '🚨' : '⚠️'} {a.message}
                  </div>
                  <div style={{ fontSize:11, color:C.muted }}>{new Date(a.timestamp).toLocaleString('fr-FR')}</div>
                </div>
                <button onClick={() => resolve(a.id)} className="btn-erp-secondary" style={{ fontSize:11, marginLeft:14, flexShrink:0 }}>Résoudre</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LivestockAnalyticsModule({ color, animal, farmId, species }) {
  const sm = SPECIES_META[species] || SPECIES_META.cow;
  const [feedLogs,   setFeedLogs]   = useState([]);
  const [healthLogs, setHealthLogs] = useState([]);
  const [prodLogs,   setProdLogs]   = useState([]);
  const [weightLogs, setWeightLogs] = useState([]);
  const [finItems,   setFinItems]   = useState([]);
  const [tasks,      setTasks]      = useState([]);

  useEffect(() => {
    if (!animal?.id) return;
    animalsAPI.getLogs(animal.id, 'feed').then(r => setFeedLogs(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    animalsAPI.getLogs(animal.id, 'health').then(r => setHealthLogs(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    animalsAPI.getLogs(animal.id, 'production').then(r => setProdLogs(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    animalsAPI.getLogs(animal.id, 'weight').then(r => setWeightLogs(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    farmsAPI.getFinance(farmId || 1).then(r => setFinItems(Array.isArray(r.data?.items) ? r.data.items : [])).catch(() => {});
    workerTasksAPI.list({ farm_id: farmId || 1 }).then(r => setTasks(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [animal?.id, farmId]);

  const totalFeed      = feedLogs.reduce((s, l) => s + (l.value || 0), 0);
  const totalProd      = prodLogs.reduce((s, l) => s + (l.value || 0), 0);
  const totalRev       = finItems.filter(t => t.type === 'revenue').reduce((s, t) => s + (t.amount || 0), 0);
  const totalHealthCost= healthLogs.reduce((s, r) => s + (r.value || 0), 0);
  const doneTasks      = tasks.filter(t => t.status === 'done').length;
  const latestWeight   = weightLogs.length ? weightLogs[0]?.value : null;

  const KPIS = [
    { label:'Feed Total',   value:`${totalFeed.toFixed(1)} kg`,              icon:'🌾', clr:'#0891b2' },
    { label:sm.prodLabel,   value:totalProd > 0 ? String(totalProd) : '—',   icon:'🥛', clr:color },
    { label:'Poids actuel', value:latestWeight ? `${latestWeight} kg` : '—', icon:'⚖️', clr:C.success },
    { label:'CA Ferme',     value:`${totalRev.toFixed(0)} TND`,              icon:'💰', clr:C.success },
    { label:'Tâches',       value:`${doneTasks}/${tasks.length}`,            icon:'✅', clr:color },
    { label:'Coût santé',   value:`${totalHealthCost.toFixed(0)} TND`,       icon:'💊', clr:C.error },
  ];

  const feedData = [...feedLogs].reverse().map((l, i) => ({ day:`J${i+1}`, kg:l.value }));
  const prodData = [...prodLogs].reverse().map((l, i) => ({ day:`J${i+1}`, val:l.value }));
  const wData    = [...weightLogs].reverse().map((l, i) => ({ n:i+1, kg:l.value }));

  return (
    <div className="fade-in">
      <SectionHeader title="📊 Tableau de Bord" sub={`${animal.name || `#${animal.id}`} — synthèse de performance`} />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:28 }}>
        {KPIS.map(k => (
          <div key={k.label} className="card-inner" style={{ textAlign:'center', padding:'14px 10px' }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{k.icon}</div>
            <div style={{ fontSize:17, fontWeight:900, color:k.clr, lineHeight:1.1 }}>{k.value}</div>
            <div style={{ fontSize:10, color:C.muted, marginTop:5, fontWeight:700 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:28, marginBottom:28 }}>
        <div className="glass-panel" style={{ height:260 }}>
          <div className="panel-title">Alimentation (kg)</div>
          {feedData.length < 2 ? <Empty text="Pas encore assez de données" /> : (
            <ResponsiveContainer width="100%" height="82%">
              <BarChart data={feedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize:11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize:11 }} />
                <Tooltip formatter={v => [`${v} kg`, 'Ration']} />
                <Bar dataKey="kg" fill={color} radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="glass-panel" style={{ height:260 }}>
          <div className="panel-title">{sm.prodLabel}</div>
          {prodData.length < 2 ? <Empty text="Pas encore assez de données" /> : (
            <ResponsiveContainer width="100%" height="82%">
              <BarChart data={prodData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize:11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize:11 }} />
                <Tooltip formatter={v => [`${v} ${sm.prodUnit}`, sm.prodLabel]} />
                <Bar dataKey="val" fill={C.success} radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:28 }}>
        <div className="glass-panel" style={{ height:240 }}>
          <div className="panel-title">Évolution du poids</div>
          {wData.length < 2 ? <Empty text="Pas encore assez de pesées" /> : (
            <ResponsiveContainer width="100%" height="82%">
              <LineChart data={wData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="n" axisLine={false} tickLine={false} tick={{ fontSize:11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize:11 }} />
                <Tooltip formatter={v => [`${v} kg`, 'Poids']} />
                <Line type="monotone" dataKey="kg" stroke={color} strokeWidth={3} dot={{ r:5, fill:color }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card-inner">
          <div style={{ fontWeight:900, marginBottom:14 }}>Résumé Sanitaire</div>
          {[
            { label:'Vaccinations',         count:healthLogs.filter(r=>r.unit==='Vaccination').length,       clr:color },
            { label:'Traitements',          count:healthLogs.filter(r=>r.unit==='Traitement').length,        clr:C.warning },
            { label:'Visites Vétérinaires', count:healthLogs.filter(r=>r.unit==='Visite Vétérinaire').length,clr:'#7c3aed' },
            { label:'Coût total santé',     count:`${totalHealthCost.toFixed(0)} TND`,                       clr:C.error },
          ].map(s => (
            <div key={s.label} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:13, color:C.muted }}>{s.label}</span>
              <span style={{ fontWeight:900, color:s.clr }}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shared micro-components ───────────────────────────────────────────────────

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ fontSize:22, fontWeight:900, color:C.text }}>{title}</div>
      {sub && <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function AlertBanner({ color, icon: Icon, children }) {
  return (
    <div style={{ background:color+'12', border:`1px solid ${color}44`, borderRadius:12, padding:'11px 16px', marginBottom:20, display:'flex', gap:10, alignItems:'center' }}>
      <Icon size={15} color={color} style={{ flexShrink:0 }} />
      <span style={{ fontWeight:700, fontSize:13, color }}>{children}</span>
    </div>
  );
}

function Field({ label, type = 'text', placeholder, options = [], value, onChange }) {
  return (
    <div style={{ width:'100%' }}>
      <label style={{ fontSize:10, fontWeight:900, color:C.muted, display:'block', marginBottom:5, letterSpacing:.4 }}>
        {label.toUpperCase()}
      </label>
      {type === 'select' ? (
        <select className="input-erp" value={value} onChange={e => onChange?.(e.target.value)}>
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <input type={type} className="input-erp" placeholder={placeholder} value={value ?? ''} onChange={e => onChange?.(e.target.value)} />
      )}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'70%', color:C.muted, fontSize:13 }}>{text}</div>
  );
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('fr-FR'); } catch (_) { return '—'; }
}

// ── Livestock Darija Report ───────────────────────────────────────────────────

function LivestockDarijaReport({ color, animal, species }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState({ feed: [], health: [], prod: [] });
  const sm = SPECIES_META[species] || SPECIES_META.cow;

  useEffect(() => {
    if (show && animal?.id) {
      setLoading(true);
      Promise.all([
        animalsAPI.getLogs(animal.id, 'feed').catch(()=>({data:[]})),
        animalsAPI.getLogs(animal.id, 'health').catch(()=>({data:[]})),
        animalsAPI.getLogs(animal.id, 'production').catch(()=>({data:[]})),
      ]).then(([fRes, hRes, pRes]) => {
        setLogs({
          feed: Array.isArray(fRes.data) ? fRes.data : [],
          health: Array.isArray(hRes.data) ? hRes.data : [],
          prod: Array.isArray(pRes.data) ? pRes.data : [],
        });
        setLoading(false);
      });
    }
  }, [show, animal?.id]);

  const allDates = [...new Set([
    ...logs.feed.map(l => l.timestamp?.slice(0, 10)),
    ...logs.health.map(l => l.timestamp?.slice(0, 10)),
    ...logs.prod.map(l => l.timestamp?.slice(0, 10)),
  ].filter(Boolean))].sort((a, b) => b.localeCompare(a));

  const buildDayText = (dateStr) => {
    const feed = logs.feed.filter(l => l.timestamp?.slice(0, 10) === dateStr);
    const health = logs.health.filter(l => l.timestamp?.slice(0, 10) === dateStr);
    const prod = logs.prod.filter(l => l.timestamp?.slice(0, 10) === dateStr);
    
    const totalFeed = feed.reduce((s, l) => s + (l.value || 0), 0);
    const totalProd = prod.reduce((s, l) => s + (l.value || 0), 0);
    const healthCost = health.reduce((s, l) => s + (l.value || 0), 0);
    const healthActs = health.map(l => l.unit).filter(Boolean).join('، ');

    const lines = [
      `📅 تقرير يوم: ${new Date(dateStr + 'T12:00:00').toLocaleDateString('ar-TN', { weekday: 'long', day: 'numeric', month: 'long' })}`,
      `${sm.emoji} الحيوان: ${animal.name || '#' + animal.id} ${animal.identifier ? '(' + animal.identifier + ')' : ''}`,
      ``,
      totalFeed > 0 ? `🌾 العلف اليوم: ${totalFeed.toFixed(1)} كلغ` : `🌾 العلف: ما سجلناش اليوم`,
      totalProd > 0 ? `📈 الإنتاج (${sm.prodLabel}): ${totalProd.toFixed(1)} ${sm.prodUnit}` : `📈 الإنتاج: مفماش اليوم`,
      health.length > 0 ? `⚠️ الصحة: عملنالها ${healthActs} (تكلفة: ${healthCost} دينار)` : `✅ الصحة: لباس والحمد لله`,
      ``,
      `— Smart Farm AI 🤖`,
    ];
    return lines.join('\n');
  };

  return (
    <div style={{ marginTop: 28 }}>
      <button onClick={() => setShow(v => !v)} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '13px 20px',
        background: show ? color + '12' : C.bg,
        border: `1px solid ${show ? color + '44' : C.border}`,
        borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer',
        color: C.text, width: '100%', transition: 'all .2s',
      }}>
        <span style={{ fontSize: 20 }}>📝</span>
        <span>تقارير يومية — بالدارجة</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: C.muted, fontWeight: 600 }}>
          {show ? '▲ إخفاء' : '▼ عرض'}
        </span>
      </button>

      {show && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: C.muted }}>جاري التحميل...</div>
          ) : allDates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted, direction: 'rtl', fontSize: 14 }}>
              ما عنداش بيانات بعد — أضف سجلات علف أو إنتاج أو صحة
            </div>
          ) : allDates.map(dateStr => {
            const isToday = dateStr === new Date().toISOString().slice(0, 10);
            const txt = buildDayText(dateStr);

            return (
              <div key={dateStr} style={{ background: '#0f172a', borderRadius: 14, overflow: 'hidden', border: `1px solid ${isToday ? color + '66' : 'rgba(255,255,255,.08)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,.08)', background: isToday ? color + '22' : 'rgba(255,255,255,.04)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isToday && <span style={{ fontSize: 9, fontWeight: 900, background: color, color: 'white', borderRadius: 999, padding: '2px 8px', letterSpacing: 1 }}>اليوم</span>}
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
                <div style={{ padding: '16px 18px', direction: 'rtl', textAlign: 'right', fontFamily: 'sans-serif', fontSize: 14, lineHeight: 2.0, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                  {txt}
                </div>
                <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => { navigator.clipboard?.writeText(txt); toast.success('تم النسخ'); }} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: color, color: 'white', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>📋 نسخ</button>
                  <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank')} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: '#25d366', color: 'white', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>📱 واتساب</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
