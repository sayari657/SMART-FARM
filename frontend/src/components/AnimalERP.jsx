import { useState, useEffect } from 'react';
import {
  TrendingUp, Wallet, Package, Users, Egg, Bird, Droplets, Heart,
  Zap, RefreshCw, AlertTriangle, CheckCircle, Bell,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api, { poultryAPI, workerTasksAPI, alertsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const C = {
  primary:   '#7c3aed',
  success:   '#10b981',
  warning:   '#f59e0b',
  error:     '#ef4444',
  text:      '#1f2937',
  muted:     '#6b7280',
  border:    '#e5e7eb',
  surface:   '#ffffff',
  bg:        '#f9fafb',
};

const MODULES = [
  { id: 'analytics', label: '📊 Reporting',         icon: TrendingUp },
  { id: 'flock',     label: '🐔 Batch Management',  icon: Bird       },
  { id: 'feed',      label: '🌾 Feed & Nutrition',  icon: Droplets   },
  { id: 'health',    label: '💊 Health Records',    icon: Heart      },
  { id: 'eggs',      label: '🥚 Egg Production',    icon: Egg        },
  { id: 'finance',   label: '💰 Sales & Finance',   icon: Wallet     },
  { id: 'inventory', label: '📦 Inventory',          icon: Package    },
  { id: 'workforce', label: '👨‍🌾 Workforce',         icon: Users      },
  { id: 'alerts',    label: '🔔 Alertes',            icon: Bell       },
];

// ── Batch Workspace ───────────────────────────────────────────────────────────

function BatchWorkspace({ batch, farmId, color, inventory, onRefresh }) {
  const [activeModule, setActiveModule] = useState('analytics');
  const [confirmDel,   setConfirmDel]   = useState(false);
  const [deleting,     setDeleting]     = useState(false);

  const age = (() => {
    if (!batch?.arrival_date) return null;
    const ms = Date.now() - new Date(batch.arrival_date).getTime();
    return Math.max(1, Math.floor(ms / 86400000) + 1);
  })();

  const statusColor = batch.status === 'active' ? '#10b981' : '#94a3b8';

  const handleDeleteBatch = async () => {
    setDeleting(true);
    try {
      await poultryAPI.batches.delete(batch.id);
      toast.success(`Lot "${batch.name}" supprimé`);
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur suppression lot'); setDeleting(false); }
  };

  return (
    <div className="fade-in">

      {/* ── Batch header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 14, paddingBottom: 22, marginBottom: 22,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: color + '18', border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bird size={24} color={color} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 900, fontSize: 16 }}>{batch.name}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, color: statusColor, background: statusColor + '15', padding: '2px 9px', borderRadius: 999 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                {batch.status?.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              {batch.breed || batch.batch_type}
              {batch.current_quantity != null && ` · ${batch.current_quantity.toLocaleString()} têtes`}
              {age != null && ` · J${age} d'élevage`}
              {batch.supplier && ` · ${batch.supplier}`}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {age != null && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1 }}>J{age}</div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 800, letterSpacing: 1 }}>ÉLEVAGE</div>
            </div>
          )}
          {confirmDel ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.error }}>Supprimer ?</span>
              <button onClick={handleDeleteBatch} disabled={deleting}
                style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: C.error, color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                {deleting ? '…' : 'Oui'}
              </button>
              <button onClick={() => setConfirmDel(false)}
                style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                Non
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} title="Supprimer ce lot"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18, padding: '4px 8px', borderRadius: 8 }}>
              🗑
            </button>
          )}
        </div>
      </div>

      {/* ── Module tabs ── */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: `2px solid ${C.border}`, marginBottom: 28, scrollbarWidth: 'none' }}>
        {MODULES.map(m => (
          <button key={m.id} onClick={() => setActiveModule(m.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', border: 'none', background: 'transparent',
            borderBottom: `2px solid ${activeModule === m.id ? color : 'transparent'}`,
            marginBottom: -2, cursor: 'pointer', whiteSpace: 'nowrap',
            color: activeModule === m.id ? color : C.muted,
            fontWeight: activeModule === m.id ? 800 : 600, fontSize: 12,
            transition: 'all .15s',
          }}>
            <m.icon size={13} />
            {m.label.split(' ').slice(1).join(' ')}
          </button>
        ))}
      </div>

      {/* ── Module content ── */}
      {activeModule === 'analytics' && <AnalyticsModule color={color} batchId={batch.id} farmId={farmId} currentBatch={batch} />}
      {activeModule === 'flock'     && <FlockEditModule color={color} batch={batch} onRefresh={onRefresh} />}
      {activeModule === 'feed'      && <FeedModule      color={color} batchId={batch.id} />}
      {activeModule === 'health'    && <HealthModule    color={color} batchId={batch.id} />}
      {activeModule === 'eggs'      && <EggModule       color={color} batchId={batch.id} />}
      {activeModule === 'finance'   && <FinanceModule   color={color} batchId={batch.id} />}
      {activeModule === 'inventory' && <InventoryModule color={color} inventory={inventory} onRefresh={onRefresh} farmId={farmId} />}
      {activeModule === 'workforce' && <WorkforceModule color={color} farmId={farmId} />}
      {activeModule === 'alerts'    && <AlertsModule    color={color} onResolved={() => {}} />}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function AnimalERP({ species, color = C.primary }) {
  const { farmId } = useAuth();
  const [batches,         setBatches]         = useState([]);
  const [inventory,       setInventory]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [alertCount,      setAlertCount]      = useState(0);
  const [globalStats,     setGlobalStats]     = useState({ totalBirds: 0, activeBatches: 0 });
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [showNewBatch,    setShowNewBatch]    = useState(false);

  useEffect(() => { loadInitialData(); }, [species, farmId]);

  const loadInitialData = async () => {
    setLoading(true);
    const fid = farmId || 1;
    try {
      const [batchRes, invRes] = await Promise.all([
        poultryAPI.batches.list(fid),
        poultryAPI.inventory.list(fid),
      ]);
      const bl = batchRes.data || [];
      setBatches(bl);
      setInventory(invRes.data || []);
      const active = bl.filter(b => b.status === 'active');
      setGlobalStats({
        totalBirds:    active.reduce((s, b) => s + (b.current_quantity || 0), 0),
        activeBatches: active.length,
      });
      setSelectedBatchId(prev =>
        prev && bl.some(b => b.id === prev) ? prev : (bl.length > 0 ? bl[0].id : null)
      );
    } catch (e) { console.error('ERP load error', e); }
    try {
      const ar = await alertsAPI.list();
      setAlertCount((ar.data || []).filter(a => !a.is_resolved).length);
    } catch (_) {}
    setLoading(false);
  };

  return (
    <div className="fade-in">

      {/* ── Global stats bar ── */}
      <div style={{
        background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 20, padding: '18px 28px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,.15)',
      }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#475569', letterSpacing: 2.5, marginBottom: 4 }}>SMART FARM AI</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>Poultry ERP</div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { value: globalStats.totalBirds.toLocaleString(), label: 'OISEAUX ACTIFS', clr: color },
            { value: globalStats.activeBatches, label: 'LOTS ACTIFS', clr: '#10b981' },
            { value: alertCount || '0', label: 'ALERTES', clr: alertCount > 0 ? C.error : '#475569' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,.07)', borderRadius: 12, padding: '10px 16px', border: '1px solid rgba(255,255,255,.06)', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.clr, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 9, color: '#475569', fontWeight: 800, marginTop: 3, letterSpacing: 1.2 }}>{s.label}</div>
            </div>
          ))}
          <button
            onClick={() => setShowNewBatch(v => !v)}
            style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: color, color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            {showNewBatch ? '✕ Annuler' : '+ Nouveau lot'}
          </button>
        </div>
      </div>

      {/* ── New batch panel ── */}
      {showNewBatch && (
        <div style={{ background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, padding: '24px 28px', marginBottom: 24 }}>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 24, borderRadius: 999, background: color }} />
            Nouvel Arrivage
          </div>
          <FlockModule color={color} onRefresh={() => { loadInitialData(); setShowNewBatch(false); }} batches={batches} farmId={farmId} />
        </div>
      )}

      {/* ── Batch tab bar ── */}
      {!loading && batches.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none',
          paddingBottom: 0, marginBottom: 0,
        }}>
          {batches.map(b => {
            const isActive = b.id === selectedBatchId;
            const bAge = (() => {
              if (!b.arrival_date) return null;
              const ms = Date.now() - new Date(b.arrival_date).getTime();
              return Math.max(1, Math.floor(ms / 86400000) + 1);
            })();
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBatchId(b.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
                  padding: '10px 18px',
                  background: isActive ? C.surface : C.bg,
                  border: `1px solid ${isActive ? color : C.border}`,
                  borderBottom: isActive ? `1px solid ${C.surface}` : `1px solid ${C.border}`,
                  borderRadius: isActive ? '12px 12px 0 0' : 10,
                  cursor: 'pointer', fontWeight: isActive ? 800 : 600,
                  fontSize: 12, color: isActive ? color : C.muted,
                  marginBottom: isActive ? -1 : 0,
                  zIndex: isActive ? 2 : 1, position: 'relative',
                  transition: 'all .15s',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: b.status === 'active' ? '#10b981' : '#94a3b8' }} />
                {b.name}
                {bAge != null && (
                  <span style={{ fontSize: 10, background: isActive ? color + '18' : C.border, color: isActive ? color : C.muted, borderRadius: 999, padding: '1px 7px', fontWeight: 800 }}>
                    J{bAge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Workspace panel ── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, flexDirection: 'column', gap: 14 }}>
          <RefreshCw size={30} className="spin" color={color} />
          <div style={{ fontWeight: 700, color: C.muted }}>Chargement des données...</div>
        </div>
      ) : batches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: C.muted }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🐔</div>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Aucun lot enregistré</div>
          <div style={{ fontSize: 14 }}>Cliquez sur <strong>+ Nouveau lot</strong> pour démarrer votre premier élevage.</div>
        </div>
      ) : (() => {
        const selectedBatch = batches.find(b => b.id === selectedBatchId);
        if (!selectedBatch) return null;
        return (
          <div key={selectedBatch.id} style={{
            background: C.surface, borderRadius: 16, border: `1px solid ${color}`,
            padding: '28px 28px', position: 'relative', zIndex: 1,
          }}>
            <BatchWorkspace
              batch={selectedBatch}
              farmId={farmId || 1}
              color={color}
              inventory={inventory}
              onRefresh={loadInitialData}
            />
          </div>
        );
      })()}
    </div>
  );
}

// ── MODULES ───────────────────────────────────────────────────────────────────

function FlockModule({ color, onRefresh, batches, farmId }) {
  const [form, setForm] = useState({ name: '', batch_type: 'broiler', breed: '', initial_quantity: '', supplier: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.initial_quantity) { toast.error('Nom et Quantité requis'); return; }
    setSaving(true);
    try {
      await poultryAPI.batches.create({ ...form, initial_quantity: Number(form.initial_quantity), farm_id: farmId || 1 });
      setForm({ name: '', batch_type: 'broiler', breed: '', initial_quantity: '', supplier: '', notes: '' });
      toast.success('Lot créé avec succès');
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur création lot'); }
    setSaving(false);
  };

  return (
    <div className="fade-in">
      <SectionHeader title="🐔 Batch Management" sub="Créez et gérez le cycle de vie de vos lots (Arrivage → Vente)." />
      <div className="grid-2" style={{ gap: 32, marginBottom: 32 }}>
        <div className="glass-panel">
          <div className="panel-title">Nouvel Arrivage</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Nom du Lot" placeholder="ex: Lot-2026-A" value={form.name} onChange={v => setForm({ ...form, name: v })} />
            <Field label="Type" type="select"
              options={[{ v: 'broiler', l: 'Chair (Poulet)' }, { v: 'layer', l: 'Pondeuse' }, { v: 'breeder', l: 'Reproducteur' }, { v: 'autre', l: 'Autre' }]}
              value={form.batch_type} onChange={v => setForm({ ...form, batch_type: v, notes: '' })} />
            {form.batch_type === 'autre' && (
              <Field label="Préciser le type" placeholder="ex: Dinde, Caille, Pintade…" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
            )}
            <Field label="Race / Souche" placeholder="Ross 308" value={form.breed} onChange={v => setForm({ ...form, breed: v })} />
            <div className="grid-2" style={{ gap: 12 }}>
              <Field label="Quantité Initiale" type="number" value={form.initial_quantity} onChange={v => setForm({ ...form, initial_quantity: v })} />
              <Field label="Fournisseur" value={form.supplier} onChange={v => setForm({ ...form, supplier: v })} />
            </div>
            <button className="btn-erp-primary" onClick={handleSubmit} disabled={saving} style={{ background: color }}>
              {saving ? 'Enregistrement...' : "Valider l'Arrivage"}
            </button>
          </div>
        </div>

        <div className="card-inner">
          <div style={{ fontWeight: 900, marginBottom: 14 }}>Lots Actifs ({batches.filter(b => b.status === 'active').length})</div>
          {batches.filter(b => b.status === 'active').map(b => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 14px', background: C.bg, borderRadius: 10, marginBottom: 8, borderLeft: `4px solid ${color}` }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{b.breed || b.batch_type}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 900, color, fontSize: 15 }}>{(b.current_quantity || 0).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: C.muted }}>têtes</div>
              </div>
            </div>
          ))}
          {batches.filter(b => b.status !== 'active').length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, marginBottom: 8 }}>LOTS TERMINÉS</div>
              {batches.filter(b => b.status !== 'active').slice(0, 3).map(b => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: C.bg, borderRadius: 8, marginBottom: 6, opacity: 0.7 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{b.name}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{b.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FlockEditModule({ color, batch, onRefresh }) {
  const [form, setForm] = useState({
    current_quantity: batch.current_quantity ?? '',
    status:           batch.status           || 'active',
    notes:            batch.notes            || '',
    breed:            batch.breed            || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await poultryAPI.batches.update(batch.id, {
        current_quantity: Number(form.current_quantity) || undefined,
        status: form.status,
        notes:  form.notes || null,
      });
      toast.success('Lot mis à jour');
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur mise à jour lot'); }
    setSaving(false);
  };

  return (
    <div className="fade-in">
      <SectionHeader title="🐔 Batch Management" sub="Modifiez l'effectif, le statut et les notes du lot." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        <div className="glass-panel">
          <div className="panel-title">Modifier ce Lot</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Race / Souche" value={form.breed} onChange={v => setForm({ ...form, breed: v })} />
            <div className="grid-2" style={{ gap: 12 }}>
              <Field label="Effectif actuel" type="number" value={String(form.current_quantity)} onChange={v => setForm({ ...form, current_quantity: v })} />
              <Field label="Statut" type="select"
                options={[{ v: 'active', l: 'Actif' }, { v: 'sold', l: 'Vendu' }, { v: 'closed', l: 'Clôturé' }]}
                value={form.status} onChange={v => setForm({ ...form, status: v })} />
            </div>
            <Field label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
            <button className="btn-erp-primary" onClick={handleSave} disabled={saving} style={{ background: color }}>
              {saving ? 'Enregistrement...' : '💾 Enregistrer les modifications'}
            </button>
          </div>
        </div>
        <div className="card-inner" style={{ borderLeft: `4px solid ${color}44` }}>
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Informations du lot</div>
          {[
            ['Type',              batch.batch_type],
            ['Fournisseur',       batch.supplier || '—'],
            ['Date d\'arrivage',  fmt(batch.arrival_date)],
            ['Quantité initiale', (batch.initial_quantity || 0).toLocaleString()],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <span style={{ color: C.muted }}>{k}</span>
              <span style={{ fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeedModule({ color, batchId }) {
  const [form, setForm]   = useState({ feed_type: 'Croissance', quantity_kg: '', average_weight_g: '', cost_per_kg: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [logs, setLogs]   = useState([]);

  const load = () => {
    if (batchId) poultryAPI.feed.list(batchId).then(r => setLogs(r.data || [])).catch(() => {});
  };
  useEffect(() => { load(); }, [batchId]);

  const handleSubmit = async () => {
    if (!batchId) { toast.error("Sélectionnez un lot d'abord"); return; }
    setSaving(true);
    try {
      const qty = Number(form.quantity_kg);
      const wg  = Number(form.average_weight_g);
      const fcr = wg > 0 ? parseFloat((qty / (wg / 1000)).toFixed(2)) : null;
      await poultryAPI.feed.create({
        batch_id: batchId, feed_type: form.feed_type,
        quantity_kg: qty, average_weight_g: wg || null,
        fcr_calculated: fcr, cost_per_kg: Number(form.cost_per_kg) || null,
        notes: form.notes || null,
      });
      setForm({ feed_type: 'Croissance', quantity_kg: '', average_weight_g: '', cost_per_kg: '', notes: '' });
      toast.success('Ration enregistrée');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur alimentation'); }
    setSaving(false);
  };

  const handleDeleteFeed = async (id) => {
    try {
      await poultryAPI.feed.delete(id);
      toast.success('Ration supprimée');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur suppression'); }
  };

  const validLogs = logs.filter(l => l.fcr_calculated);
  const avgFcr    = validLogs.length ? (validLogs.reduce((s, l) => s + l.fcr_calculated, 0) / validLogs.length).toFixed(2) : null;
  const fcrAlert  = avgFcr && parseFloat(avgFcr) > 1.8;

  return (
    <div className="fade-in">
      <SectionHeader title="🌾 Feed & Nutrition" sub="Suivi de la consommation journalière et analyse de l'indice de conversion (FCR)." />

      {fcrAlert && (
        <AlertBanner color={C.warning} icon={AlertTriangle}>
          FCR moyen ({avgFcr}) au-dessus du seuil 1.8 — vérifiez l'alimentation.
        </AlertBanner>
      )}

      <div className="grid-2-1" style={{ gap: 28, marginBottom: 24 }}>
        <div className="glass-panel">
          <div className="panel-title">Nouvelle Ration</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Type d'Aliment" type="select"
              options={[{ v: 'Démarrage', l: 'Démarrage' }, { v: 'Croissance', l: 'Croissance' }, { v: 'Finition', l: 'Finition' }, { v: 'Autre', l: 'Autre' }]}
              value={form.feed_type} onChange={v => setForm({ ...form, feed_type: v, notes: '' })} />
            {form.feed_type === 'Autre' && (
              <Field label="Préciser l'aliment" placeholder="ex: Complément vitaminé, Aliment fermenté…" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
            )}
            <Field label="Quantité Consommée (kg)" type="number" placeholder="ex: 250" value={form.quantity_kg} onChange={v => setForm({ ...form, quantity_kg: v })} />
            <Field label="Poids Moyen Observé (g)" type="number" placeholder="ex: 1 200" value={form.average_weight_g} onChange={v => setForm({ ...form, average_weight_g: v })} />
            <Field label="Coût / kg (TND)" type="number" placeholder="ex: 0.85" value={form.cost_per_kg} onChange={v => setForm({ ...form, cost_per_kg: v })} />
            <button className="btn-erp-primary" onClick={handleSubmit} disabled={saving} style={{ background: color }}>
              {saving ? 'Enregistrement...' : 'Enregistrer la Ration'}
            </button>
          </div>
        </div>
        <div className="card-inner" style={{ background: color + '06', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: C.muted, letterSpacing: 1 }}>FCR MOYEN</div>
          <div style={{ fontSize: 46, fontWeight: 900, color: fcrAlert ? C.warning : color }}>{avgFcr ?? '—'}</div>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{logs.length} ration(s) enregistrée(s)</p>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="card-inner">
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Historique des Rations ({logs.length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Date', 'Type', 'Qté (kg)', 'Poids (g)', 'FCR', 'Coût/kg', ''].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 800, color: C.muted, fontSize: 10, letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...logs].reverse().slice(0, 15).map(l => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{fmt(l.date)}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{l.feed_type}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{l.quantity_kg}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{l.average_weight_g ?? '—'}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                      {l.fcr_calculated
                        ? <span style={{ fontWeight: 900, color: l.fcr_calculated > 1.8 ? C.error : C.success }}>{l.fcr_calculated.toFixed(2)}</span>
                        : '—'}
                    </td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{l.cost_per_kg ? `${l.cost_per_kg} TND` : '—'}</td>
                    <td style={{ padding: '9px 4px' }}>
                      <button onClick={() => handleDeleteFeed(l.id)} title="Supprimer"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, fontSize: 15, padding: '3px 7px', borderRadius: 6, opacity: 0.7 }}>🗑</button>
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

function HealthModule({ color, batchId }) {
  const [form, setForm]   = useState({ event_type: 'Vaccination', description: '', medicine_used: '', dosage: '', vet_name: '', cost: '' });
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState([]);

  const load = () => {
    if (batchId) poultryAPI.health.list(batchId).then(r => setRecords(r.data || [])).catch(() => {});
  };
  useEffect(() => { load(); }, [batchId]);

  const handleSubmit = async () => {
    if (!batchId) { toast.error('Sélectionnez un lot'); return; }
    setSaving(true);
    try {
      await poultryAPI.health.create({ ...form, cost: Number(form.cost) || 0, batch_id: batchId });
      setForm({ event_type: 'Vaccination', description: '', medicine_used: '', dosage: '', vet_name: '', cost: '' });
      toast.success('Acte sanitaire enregistré');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur santé'); }
    setSaving(false);
  };

  const handleDeleteHealth = async (id) => {
    try {
      await poultryAPI.health.delete(id);
      toast.success('Acte supprimé');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur suppression'); }
  };

  const evtColor = t => ({ Vaccination: color, Traitement: C.warning, 'Visite Vétérinaire': C.primary }[t] ?? C.muted);
  const totalCost = records.reduce((s, r) => s + (r.cost || 0), 0);

  return (
    <div className="fade-in">
      <SectionHeader title="💊 Health & Veterinary" sub="Carnet vaccinal, journal vétérinaire et traçabilité médicament par lot." />
      <div className="grid-2" style={{ gap: 28, marginBottom: 24 }}>
        <div className="glass-panel">
          <div className="panel-title">Nouvel Acte Sanitaire</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <Field label="Type d'évènement" type="select"
              options={[{ v: 'Vaccination', l: 'Vaccination' }, { v: 'Traitement', l: 'Traitement' }, { v: 'Visite Vétérinaire', l: 'Visite Vétérinaire' }, { v: 'Autre', l: 'Autre' }]}
              value={form.event_type} onChange={v => setForm({ ...form, event_type: v })} />
            <Field label="Description" placeholder="ex: Rappel Newcastle" value={form.description} onChange={v => setForm({ ...form, description: v })} />
            <div className="grid-2" style={{ gap: 12 }}>
              <Field label="Médicament / Vaccin" value={form.medicine_used} onChange={v => setForm({ ...form, medicine_used: v })} />
              <Field label="Dosage" value={form.dosage} onChange={v => setForm({ ...form, dosage: v })} />
            </div>
            <div className="grid-2" style={{ gap: 12 }}>
              <Field label="Vétérinaire" value={form.vet_name} onChange={v => setForm({ ...form, vet_name: v })} />
              <Field label="Coût (TND)" type="number" value={form.cost} onChange={v => setForm({ ...form, cost: v })} />
            </div>
            <button className="btn-erp-primary" onClick={handleSubmit} disabled={saving} style={{ background: color }}>
              {saving ? 'Enregistrement...' : "Enregistrer l'acte"}
            </button>
          </div>
        </div>

        <div className="card-inner">
          <div style={{ fontWeight: 900, marginBottom: 14 }}>Résumé Sanitaire</div>
          {[
            { label: 'Vaccinations',        count: records.filter(r => r.event_type === 'Vaccination').length,        clr: color },
            { label: 'Traitements',         count: records.filter(r => r.event_type === 'Traitement').length,         clr: C.warning },
            { label: 'Visites Vétérinaires',count: records.filter(r => r.event_type === 'Visite Vétérinaire').length, clr: C.primary },
            { label: 'Coût total santé',    count: `${totalCost.toFixed(0)} TND`,                                     clr: C.error },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.muted }}>{s.label}</span>
              <span style={{ fontWeight: 900, color: s.clr }}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {records.length > 0 && (
        <div className="card-inner">
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Historique Sanitaire ({records.length} actes)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...records].reverse().slice(0, 15).map(r => (
              <div key={r.id} style={{ display: 'flex', gap: 12, padding: '11px 14px', background: C.bg, borderRadius: 10, borderLeft: `4px solid ${evtColor(r.event_type)}`, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{r.event_type} — {r.description}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {r.medicine_used && `${r.medicine_used} ${r.dosage ? `· ${r.dosage}` : ''} · `}
                    {r.vet_name && `Dr. ${r.vet_name} · `}
                    {fmt(r.date)}
                  </div>
                </div>
                {r.cost > 0 && <div style={{ fontWeight: 900, color: C.error, fontSize: 13 }}>{r.cost} TND</div>}
                <button onClick={() => handleDeleteHealth(r.id)} title="Supprimer"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, fontSize: 15, padding: '3px 7px', borderRadius: 6, opacity: 0.7, flexShrink: 0 }}>🗑</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EggModule({ color, batchId }) {
  const [form, setForm]       = useState({ total_eggs: '', broken_eggs: '', grade_a_count: '' });
  const [submitting, setSubmitting] = useState(false);
  const [logs, setLogs]       = useState([]);

  const load = () => {
    if (batchId) poultryAPI.eggs.list(batchId).then(r => setLogs(r.data || [])).catch(() => {});
  };
  useEffect(() => { load(); }, [batchId]);

  const handleSubmit = async () => {
    if (!batchId) { toast.error('Sélectionnez un lot'); return; }
    setSubmitting(true);
    try {
      await poultryAPI.eggs.create({
        batch_id: batchId, date: new Date().toISOString(),
        total_eggs:    Number(form.total_eggs),
        broken_eggs:   Number(form.broken_eggs)   || 0,
        grade_a_count: Number(form.grade_a_count) || 0,
      });
      setForm({ total_eggs: '', broken_eggs: '', grade_a_count: '' });
      toast.success('Collecte enregistrée');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erreur production œufs"); }
    setSubmitting(false);
  };

  const handleDeleteEgg = async (id) => {
    try {
      await poultryAPI.eggs.delete(id);
      toast.success('Collecte supprimée');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur suppression'); }
  };

  const lastLog    = logs.length ? logs[logs.length - 1] : null;
  const latestRate = lastLog?.production_rate;
  const totalEggs  = logs.reduce((s, l) => s + (l.total_eggs || 0), 0);
  const rateAlert  = latestRate !== null && latestRate !== undefined && latestRate < 70;

  return (
    <div className="fade-in">
      <SectionHeader title="🥚 Egg Production" sub="Suivi quotidien de la ponte, qualité et taux de production." />

      {rateAlert && (
        <AlertBanner color={C.warning} icon={AlertTriangle}>
          Taux de ponte ({latestRate?.toFixed(1)}%) en dessous du seuil — vérifiez l'éclairage et l'alimentation.
        </AlertBanner>
      )}

      <div className="grid-2" style={{ gap: 28, marginBottom: 24 }}>
        <div className="glass-panel">
          <div className="panel-title">Collecte Journalière</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Total Œufs Collectés" type="number" value={form.total_eggs} onChange={v => setForm({ ...form, total_eggs: v })} />
            <div className="grid-2" style={{ gap: 12 }}>
              <Field label="Œufs Cassés / Défectueux" type="number" value={form.broken_eggs} onChange={v => setForm({ ...form, broken_eggs: v })} />
              <Field label="Grade A (Standard)" type="number" value={form.grade_a_count} onChange={v => setForm({ ...form, grade_a_count: v })} />
            </div>
            <button className="btn-erp-primary" onClick={handleSubmit} disabled={submitting} style={{ background: color }}>
              {submitting ? 'Enregistrement...' : 'Valider la collecte'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card-inner" style={{ flex: 1, textAlign: 'center', background: color + '06', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: C.muted, letterSpacing: 1 }}>TAUX DE PONTE</div>
            <div style={{ fontSize: 44, fontWeight: 900, color: rateAlert ? C.warning : color }}>
              {latestRate !== undefined && latestRate !== null ? `${latestRate.toFixed(1)}%` : '—'}
            </div>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
              {rateAlert ? '⚠️ En dessous du seuil (70%)' : 'Performance normale'}
            </p>
          </div>
          <div className="card-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: C.muted }}>Total cumulé ({logs.length} jours)</span>
            <span style={{ fontWeight: 900, color, fontSize: 17 }}>{totalEggs.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="card-inner">
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Historique de Ponte ({logs.length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Date', 'Total Œufs', 'Cassés', 'Grade A', 'Taux Ponte', ''].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 800, color: C.muted, fontSize: 10, letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...logs].reverse().slice(0, 15).map(l => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{fmt(l.date)}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{l.total_eggs}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{l.broken_eggs}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{l.grade_a_count}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                      {l.production_rate
                        ? <span style={{ fontWeight: 900, color: l.production_rate < 70 ? C.warning : C.success }}>{l.production_rate.toFixed(1)}%</span>
                        : '—'}
                    </td>
                    <td style={{ padding: '9px 4px' }}>
                      <button onClick={() => handleDeleteEgg(l.id)} title="Supprimer"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, fontSize: 15, padding: '3px 7px', borderRadius: 6, opacity: 0.7 }}>🗑</button>
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

function FinanceModule({ color, batchId }) {
  const [form, setForm]   = useState({ product_type: 'Live Birds', quantity: '', unit_price: '', customer_name: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [sales, setSales] = useState([]);

  const load = () => {
    if (batchId) poultryAPI.sales.list(batchId).then(r => setSales(r.data || [])).catch(() => {});
  };
  useEffect(() => { load(); }, [batchId]);

  const handleSubmit = async () => {
    if (!batchId) { toast.error('Sélectionnez un lot'); return; }
    setSaving(true);
    try {
      const qty   = Number(form.quantity);
      const price = Number(form.unit_price);
      await poultryAPI.sales.create({ ...form, batch_id: batchId, quantity: qty, unit_price: price, total_amount: qty * price });
      setForm({ product_type: 'Live Birds', quantity: '', unit_price: '', customer_name: '', notes: '' });
      toast.success('Vente enregistrée');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur vente'); }
    setSaving(false);
  };

  const handleDeleteSale = async (id) => {
    try {
      await poultryAPI.sales.delete(id);
      toast.success('Vente supprimée');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur suppression'); }
  };

  const totalRevenue = sales.reduce((s, v) => s + (v.total_amount || 0), 0);
  const liveTotal    = Number(form.quantity) * Number(form.unit_price);

  return (
    <div className="fade-in">
      <SectionHeader title="💰 Sales & Finance" sub="Enregistrement des ventes et bilan de rentabilité par lot." />
      <div className="grid-2" style={{ gap: 28, marginBottom: 24 }}>
        <div className="glass-panel">
          <div className="panel-title">Nouvelle Vente</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Type de Produit" type="select"
              options={[{ v: 'Live Birds', l: 'Volailles Vives' }, { v: 'Eggs', l: 'Œufs' }, { v: 'Manure', l: 'Fumier' }, { v: 'Autre', l: 'Autre' }]}
              value={form.product_type} onChange={v => setForm({ ...form, product_type: v, notes: '' })} />
            {form.product_type === 'Autre' && (
              <Field label="Préciser le produit" placeholder="ex: Plumes, Sous-produits, Poussins…" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
            )}
            <Field label="Client" placeholder="Grossiste / Marché / Particulier" value={form.customer_name} onChange={v => setForm({ ...form, customer_name: v })} />
            <div className="grid-2" style={{ gap: 12 }}>
              <Field label="Quantité" type="number" value={form.quantity} onChange={v => setForm({ ...form, quantity: v })} />
              <Field label="Prix Unitaire (TND)" type="number" value={form.unit_price} onChange={v => setForm({ ...form, unit_price: v })} />
            </div>
            {form.quantity && form.unit_price && liveTotal > 0 && (
              <div style={{ padding: '11px 14px', background: color + '0a', borderRadius: 10, fontWeight: 900, color, fontSize: 14 }}>
                Total : {liveTotal.toFixed(2)} TND
              </div>
            )}
            <button className="btn-erp-primary" onClick={handleSubmit} disabled={saving} style={{ background: color }}>
              {saving ? 'Enregistrement...' : 'Enregistrer la Vente'}
            </button>
          </div>
        </div>

        <div className="card-inner" style={{ borderLeft: `5px solid ${C.success}` }}>
          <div style={{ fontWeight: 900, marginBottom: 18 }}>Bilan du Lot</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: C.muted }}>Nombre de ventes</span>
            <span style={{ fontWeight: 900, color }}>{sales.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: C.muted }}>Chiffre d'affaires</span>
            <span style={{ fontWeight: 900, color: C.success, fontSize: 18 }}>{totalRevenue.toFixed(0)} TND</span>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            {sales.slice(-3).map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.bg}` }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{s.customer_name || 'Client inconnu'}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{s.product_type} · {fmt(s.date)}</div>
                </div>
                <span style={{ fontWeight: 900, color: C.success, fontSize: 13 }}>{s.total_amount?.toFixed(0)} TND</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {sales.length > 0 && (
        <div className="card-inner">
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Historique des Ventes ({sales.length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Date', 'Produit', 'Client', 'Qté', 'Prix Unit.', 'Total', ''].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 800, color: C.muted, fontSize: 10, letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...sales].reverse().slice(0, 15).map(s => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{fmt(s.date)}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{s.product_type}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{s.customer_name || '—'}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{s.quantity}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{s.unit_price} TND</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 900, color: C.success }}>{s.total_amount?.toFixed(0)} TND</span>
                    </td>
                    <td style={{ padding: '9px 4px' }}>
                      <button onClick={() => handleDeleteSale(s.id)} title="Supprimer"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, fontSize: 15, padding: '3px 7px', borderRadius: 6, opacity: 0.7 }}>🗑</button>
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

function InventoryModule({ inventory, onRefresh, farmId }) {
  const [form, setForm]         = useState({ item_name: '', category: 'feed', custom_category: '', quantity: '', unit: 'kg', min_threshold: '' });

  const handleDeleteInventory = async (id) => {
    try {
      await poultryAPI.inventory.delete(id);
      toast.success('Article supprimé');
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur suppression'); }
  };

  const handleAdd = async () => {
    if (!form.item_name || !form.quantity) return;
    const category = form.category === 'other' ? (form.custom_category.trim() || 'Autre') : form.category;
    try {
      await poultryAPI.inventory.create({ item_name: form.item_name, category, quantity: Number(form.quantity), unit: form.unit, min_threshold: Number(form.min_threshold) || 0, farm_id: farmId || 1 });
      setForm({ item_name: '', category: 'feed', custom_category: '', quantity: '', unit: 'kg', min_threshold: '' });
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur inventaire'); }
  };

  const lowStock = inventory.filter(i => i.quantity < (i.min_threshold || 0));

  return (
    <div className="fade-in">
      <SectionHeader title="📦 Stocks & Approvisionnement" sub="Gérez vos stocks critiques d'aliments et de vaccins pour éviter les ruptures." />

      {lowStock.length > 0 && (
        <AlertBanner color={C.error} icon={AlertTriangle}>
          {lowStock.length} article(s) en stock critique : {lowStock.map(i => i.item_name).join(', ')}
        </AlertBanner>
      )}

      <div className="grid-3" style={{ gap: 16, marginBottom: 28 }}>
        {inventory.map(item => {
          const critical = item.quantity < (item.min_threshold || 0);
          return (
            <div key={item.id} className="card-inner" style={{ borderBottom: critical ? `3px solid ${C.error}` : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{item.item_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Package size={14} color={C.muted} />
                  <button onClick={() => handleDeleteInventory(item.id)} title="Supprimer"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, fontSize: 14, padding: '2px 4px', borderRadius: 6, opacity: 0.6, lineHeight: 1 }}>🗑</button>
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{item.quantity} <span style={{ fontSize: 12, color: C.muted }}>{item.unit}</span></div>
              {item.min_threshold > 0 && (
                <div style={{ fontSize: 11, color: critical ? C.error : C.muted, fontWeight: 700, marginTop: 4 }}>
                  {critical ? '⚠️ STOCK CRITIQUE !' : `Seuil : ${item.min_threshold} ${item.unit}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="glass-panel">
        <div className="panel-title">Entrée de Stock</div>
        <div className="grid-4" style={{ gap: 12 }}>
          <Field label="Nom de l'article" value={form.item_name} onChange={v => setForm({ ...form, item_name: v })} />
          <Field label="Catégorie" type="select"
            options={[{ v: 'feed', l: 'Aliment' }, { v: 'medicine', l: 'Santé' }, { v: 'equipment', l: 'Matériel' }, { v: 'other', l: 'Autre' }]}
            value={form.category} onChange={v => setForm({ ...form, category: v, custom_category: '' })} />
          <Field label="Quantité" type="number" value={form.quantity} onChange={v => setForm({ ...form, quantity: v })} />
          <Field label="Seuil Alerte" type="number" value={form.min_threshold} onChange={v => setForm({ ...form, min_threshold: v })} />
        </div>
        {form.category === 'other' && (
          <div style={{ marginTop: 12 }}>
            <Field label="Préciser la catégorie" placeholder="ex: Désinfectant, Litière, Emballage…" value={form.custom_category} onChange={v => setForm({ ...form, custom_category: v })} />
          </div>
        )}
        <button className="btn-erp-secondary" onClick={handleAdd} style={{ marginTop: 16 }}>Enregistrer dans l'inventaire</button>
      </div>
    </div>
  );
}

function WorkforceModule({ color, farmId }) {
  const [tasks,           setTasks]           = useState([]);
  const [workers,         setWorkers]         = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState(new Set());
  const [form,            setForm]            = useState({ title: '', category: 'feeding', priority: 'normal', description: '' });
  const [saving,          setSaving]          = useState(false);

  const load = () => {
    workerTasksAPI.list({ farm_id: farmId || 1 }).then(r => setTasks(r.data || [])).catch(() => {});
  };

  useEffect(() => {
    load();
    workerTasksAPI.listWorkers(farmId || 1).then(r => setWorkers(r.data || [])).catch(() => {});
  }, []);

  const toggleWorker = (id) => {
    setSelectedWorkers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const workerName = (id) => {
    const w = workers.find(w => w.id === id);
    return w ? (w.full_name || w.username) : null;
  };

  const handleCreate = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      const base = { ...form, farm_id: farmId || 1 };
      if (selectedWorkers.size === 0) {
        // No worker selected → create one unassigned task
        await workerTasksAPI.create({ ...base, worker_id: null });
      } else {
        // One task per selected worker, all in parallel
        await Promise.all(
          [...selectedWorkers].map(wid => workerTasksAPI.create({ ...base, worker_id: wid }))
        );
      }
      setForm({ title: '', category: 'feeding', priority: 'normal', description: '' });
      setSelectedWorkers(new Set());
      toast.success('Tâche(s) créée(s)');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur création tâche'); }
    setSaving(false);
  };

  const updateStatus = async (id, status) => {
    try {
      await workerTasksAPI.updateStatus(id, status);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    } catch (_) {}
  };

  const sColor  = { pending: C.warning, done: C.success, blocked: C.error };
  const prioTag = { low: '#94a3b8', normal: C.primary, urgent: C.error };

  return (
    <div className="fade-in">
      <SectionHeader title="👨‍🌾 Workforce & Tasks" sub="Assignation et suivi des tâches du personnel de ferme." />
      <div className="grid-2" style={{ gap: 28 }}>

        {/* ── Task list ── */}
        <div>
          <div style={{ fontWeight: 900, marginBottom: 12 }}>
            Tâches ({tasks.length})
            <span style={{ marginLeft: 8, fontSize: 11, color: C.muted }}>
              ✅ {tasks.filter(t => t.status === 'done').length} terminées · ⏳ {tasks.filter(t => t.status === 'pending').length} en attente
            </span>
          </div>
          {tasks.length === 0 ? (
            <div className="card-inner" style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: 28 }}>
              Aucune tâche enregistrée.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.map(t => {
                const name = workerName(t.worker_id);
                return (
                  <div key={t.id} className="card-inner" style={{ borderLeft: `4px solid ${sColor[t.status] ?? C.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 13 }}>{t.title}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          <span style={{ fontSize: 10, background: `${C.primary}15`, color: C.primary, borderRadius: 5, padding: '2px 7px', fontWeight: 700 }}>{t.category}</span>
                          <span style={{ fontSize: 10, background: `${prioTag[t.priority]}18`, color: prioTag[t.priority], borderRadius: 5, padding: '2px 7px', fontWeight: 700 }}>{t.priority}</span>
                          {name && (
                            <span style={{ fontSize: 10, background: '#f0fdf4', color: '#15803d', borderRadius: 5, padding: '2px 7px', fontWeight: 700 }}>
                              👷 {name}
                            </span>
                          )}
                        </div>
                      </div>
                      <select
                        value={t.status}
                        onChange={e => updateStatus(t.id, e.target.value)}
                        style={{ border: `1px solid ${sColor[t.status] ?? C.border}`, borderRadius: 8, padding: '4px 8px', fontSize: 10, fontWeight: 900, color: sColor[t.status], background: 'white', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <option value="pending">En attente</option>
                        <option value="done">Terminé</option>
                        <option value="blocked">Bloqué</option>
                      </select>
                    </div>
                    {t.description && <p style={{ fontSize: 11, color: C.muted, margin: '6px 0 0', lineHeight: 1.5 }}>{t.description}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Create form ── */}
        <div className="glass-panel">
          <div className="panel-title">Nouvelle Tâche</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <Field label="Titre de la tâche" placeholder="ex: Vaccination Lot A" value={form.title} onChange={v => setForm({ ...form, title: v })} />

            {/* Multi-worker picker */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: 'block', marginBottom: 6 }}>
                Assigner à
                {selectedWorkers.size > 0 && (
                  <span style={{ marginLeft: 7, fontWeight: 900, color: color, fontSize: 11 }}>
                    {selectedWorkers.size} sélectionné{selectedWorkers.size > 1 ? 's' : ''}
                    {selectedWorkers.size > 1 && <span style={{ color: C.muted, fontWeight: 500 }}> — {selectedWorkers.size} tâches créées</span>}
                  </span>
                )}
              </label>
              {workers.length === 0 ? (
                <div style={{ fontSize: 12, color: C.muted, padding: '8px 0' }}>Aucun ouvrier enregistré pour cette ferme.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {workers.map(w => {
                    const sel = selectedWorkers.has(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleWorker(w.id)}
                        style={{
                          padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', transition: 'all .15s',
                          border: `1.5px solid ${sel ? color : C.border}`,
                          background: sel ? color : 'white',
                          color:      sel ? 'white' : C.text,
                          boxShadow:  sel ? `0 2px 8px ${color}44` : 'none',
                        }}
                      >
                        {sel ? '✓ ' : ''}{w.full_name || w.username}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Field label="Catégorie" type="select"
              options={[{ v: 'feeding', l: 'Alimentation' }, { v: 'health', l: 'Santé' }, { v: 'cleaning', l: 'Nettoyage' }, { v: 'other', l: 'Autre' }]}
              value={form.category} onChange={v => setForm({ ...form, category: v })} />
            <Field label="Priorité" type="select"
              options={[{ v: 'low', l: 'Basse' }, { v: 'normal', l: 'Normale' }, { v: 'urgent', l: 'Urgente' }]}
              value={form.priority} onChange={v => setForm({ ...form, priority: v })} />
            <Field label="Description (optionnel)" placeholder="Détails de la tâche..." value={form.description} onChange={v => setForm({ ...form, description: v })} />
            <button className="btn-erp-primary" onClick={handleCreate} disabled={saving} style={{ background: color }}>
              {saving
                ? 'Création...'
                : selectedWorkers.size > 1
                  ? `Créer ${selectedWorkers.size} tâches`
                  : 'Créer la Tâche'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function AlertsModule({ color, onResolved }) {
  const [alerts, setAlerts] = useState([]);
  const [busy, setBusy]     = useState(true);

  useEffect(() => {
    alertsAPI.list()
      .then(r => setAlerts((r.data || []).filter(a => !a.is_resolved)))
      .catch(() => setAlerts([]))
      .finally(() => setBusy(false));
  }, []);

  const resolve = async (id) => {
    try {
      await alertsAPI.resolve(id, 'manager');
      setAlerts(prev => prev.filter(a => a.id !== id));
      onResolved?.();
    } catch (_) {}
  };

  const sevColor = { critical: C.error, warning: C.warning, info: color };

  return (
    <div className="fade-in">
      <SectionHeader title="🔔 Alertes Intelligentes" sub="Règles FCR/mortalité automatiques — seuils configurables par le moteur de règles." />

      {/* Active rules */}
      <div className="card-inner" style={{ marginBottom: 20, background: C.bg }}>
        <div style={{ fontWeight: 900, marginBottom: 12 }}>Règles Actives</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { rule: 'FCR > 1.8',         type: 'warning',  desc: 'Efficacité alimentaire dégradée' },
            { rule: 'Mortalité > 5%',    type: 'critical', desc: 'Taux de mortalité anormal' },
            { rule: 'Stock < seuil min', type: 'warning',  desc: 'Rupture inventaire imminente' },
          ].map(r => (
            <div key={r.rule} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: sevColor[r.type], flexShrink: 0 }} />
              <span style={{ fontWeight: 800, fontSize: 13 }}>{r.rule}</span>
              <span style={{ color: C.muted, fontSize: 12 }}>— {r.desc}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 900, color: sevColor[r.type], background: sevColor[r.type] + '18', padding: '2px 9px', borderRadius: 999 }}>
                {r.type.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Alert list */}
      {busy ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Chargement des alertes...</div>
      ) : alerts.length === 0 ? (
        <div className="card-inner" style={{ textAlign: 'center', padding: 40 }}>
          <CheckCircle size={32} color={C.success} style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 800, color: C.success, marginBottom: 4 }}>Aucune alerte active</div>
          <div style={{ fontSize: 13, color: C.muted }}>Tous les indicateurs sont dans les seuils normaux.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map(a => (
            <div key={a.id} className="card-inner" style={{ borderLeft: `4px solid ${sevColor[a.severity] ?? C.warning}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: sevColor[a.severity] ?? C.warning, marginBottom: 3 }}>
                    {a.severity === 'critical' ? '🚨' : '⚠️'} {a.message}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {new Date(a.timestamp).toLocaleString('fr-FR')} · Sévérité : {a.severity}
                  </div>
                </div>
                <button onClick={() => resolve(a.id)} className="btn-erp-secondary" style={{ fontSize: 11, marginLeft: 14, flexShrink: 0 }}>
                  Résoudre
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsModule({ color, batchId, farmId, currentBatch }) {
  const [prediction,   setPrediction]   = useState(null);
  const [pnl,          setPnl]          = useState(null);
  const [feedLogs,     setFeedLogs]     = useState([]);
  const [eggLogs,      setEggLogs]      = useState([]);
  const [healthLogs,   setHealthLogs]   = useState([]);
  const [sales,        setSales]        = useState([]);
  const [tasks,        setTasks]        = useState([]);
  const [inventory,    setInventory]    = useState([]);
  const [showDarija,   setShowDarija]   = useState(false);

  useEffect(() => {
    if (!batchId) return;
    poultryAPI.feed.list(batchId).then(r => setFeedLogs(r.data || [])).catch(() => {});
    poultryAPI.eggs.list(batchId).then(r => setEggLogs(r.data || [])).catch(() => {});
    poultryAPI.health.list(batchId).then(r => setHealthLogs(r.data || [])).catch(() => {});
    poultryAPI.sales.list(batchId).then(r => setSales(r.data || [])).catch(() => {});
    api.get(`/poultry/predict/${batchId}`).then(r => setPrediction(r.data)).catch(() => {});
    api.get(`/poultry/batches/${batchId}/pnl`).then(r => setPnl(r.data)).catch(() => {});
  }, [batchId]);

  useEffect(() => {
    const fid = farmId || 1;
    workerTasksAPI.list({ farm_id: fid }).then(r => setTasks(r.data || [])).catch(() => {});
    poultryAPI.inventory.list(fid).then(r => setInventory(r.data || [])).catch(() => {});
  }, [farmId]);

  // ── KPI computations ─────────────────────────────────────────────────────
  const totalFeedKg    = feedLogs.reduce((s, l) => s + (l.quantity_kg || 0), 0);
  const validFcr       = feedLogs.filter(l => l.fcr_calculated);
  const avgFcr         = validFcr.length ? validFcr.reduce((s, l) => s + l.fcr_calculated, 0) / validFcr.length : null;
  const totalEggs      = eggLogs.reduce((s, l) => s + (l.total_eggs || 0), 0);
  const totalRevenue   = sales.reduce((s, v) => s + (v.total_amount || 0), 0);
  const doneTasks      = tasks.filter(t => t.status === 'done').length;
  const criticalStock  = inventory.filter(i => i.quantity < (i.min_threshold || 0)).length;
  const totalHealthCost = healthLogs.reduce((s, r) => s + (r.cost || 0), 0);
  const fcrAlert       = avgFcr !== null && avgFcr > 1.8;

  const fcrData = feedLogs
    .filter(l => l.fcr_calculated)
    .map((l, i) => ({ day: `J${i + 1}`, fcr: parseFloat(l.fcr_calculated.toFixed(2)), target: 1.6 }));

  const eggData = eggLogs.map((l, i) => ({
    day: `J${i + 1}`, eggs: l.total_eggs,
    rate: l.production_rate ? parseFloat(l.production_rate.toFixed(1)) : null,
  }));

  const revenueData = sales.map((s, i) => ({
    label: s.customer_name ? s.customer_name.slice(0, 10) : `V${i + 1}`,
    total: s.total_amount,
  }));

  const KPIS = [
    { label: 'Feed Total',     value: `${totalFeedKg.toFixed(1)} kg`,                          icon: '🌾', clr: '#0891b2',             alert: false },
    { label: 'FCR Moyen',      value: avgFcr !== null ? avgFcr.toFixed(2) : '—',               icon: '⚡', clr: fcrAlert ? C.warning : color, alert: fcrAlert },
    { label: 'Œufs Total',    value: totalEggs.toLocaleString(),                               icon: '🥚', clr: C.success,             alert: false },
    { label: 'CA Total',       value: `${totalRevenue.toFixed(0)} TND`,                        icon: '💰', clr: C.success,             alert: false },
    { label: 'Tâches',         value: `${doneTasks}/${tasks.length}`,                          icon: '✅', clr: color,                 alert: false },
    { label: 'Stock Critique', value: criticalStock > 0 ? `${criticalStock} article(s)` : 'OK', icon: '⚠️', clr: criticalStock > 0 ? C.error : C.success, alert: criticalStock > 0 },
  ];

  return (
    <div className="fade-in">
      <SectionHeader title="📊 Production Dashboard" sub="Vue consolidée des performances du lot — feed, ponte, finances, santé et ressources." />

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 28 }}>
        {KPIS.map(k => (
          <div key={k.label} className="card-inner" style={{ textAlign: 'center', padding: '14px 10px', border: k.alert ? `1.5px solid ${k.clr}44` : undefined, background: k.alert ? k.clr + '06' : undefined }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: k.clr, lineHeight: 1.1 }}>{k.value}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 5, fontWeight: 700, letterSpacing: '.04em' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginBottom: 28 }}>
        <div className="glass-panel" style={{ height: 320 }}>
          <div className="panel-title">FCR par saisie ({fcrData.length})</div>
          {fcrData.length === 0 ? (
            <Empty text="Aucune donnée d'alimentation disponible" />
          ) : (
            <ResponsiveContainer width="100%" height="82%">
              <LineChart data={fcrData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} domain={[1, 'auto']} />
                <Tooltip />
                <Legend verticalAlign="top" height={32} />
                <Line name="FCR Réel" type="monotone" dataKey="fcr" stroke={color} strokeWidth={3} dot={{ r: 5, fill: color }} />
                <Line name="Objectif (1.6)" type="monotone" dataKey="target" stroke="#cbd5e1" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-panel" style={{ height: 320 }}>
          <div className="panel-title">Chiffre d'Affaires ({revenueData.length} ventes)</div>
          {revenueData.length === 0 ? (
            <Empty text="Aucune vente enregistrée" />
          ) : (
            <ResponsiveContainer width="100%" height="82%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} TND`, 'Montant']} />
                <Bar name="Total (TND)" dataKey="total" fill={C.success} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Health summary + AI Prediction ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        <div className="card-inner">
          <div style={{ fontWeight: 900, marginBottom: 14 }}>Résumé Sanitaire ({healthLogs.length} actes)</div>
          {[
            { label: 'Vaccinations',          count: healthLogs.filter(r => r.event_type === 'Vaccination').length,         clr: color },
            { label: 'Traitements',           count: healthLogs.filter(r => r.event_type === 'Traitement').length,          clr: C.warning },
            { label: 'Visites Vétérinaires',  count: healthLogs.filter(r => r.event_type === 'Visite Vétérinaire').length,  clr: '#7c3aed' },
            { label: 'Coût total santé',      count: `${totalHealthCost.toFixed(0)} TND`,                                   clr: C.error },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.muted }}>{s.label}</span>
              <span style={{ fontWeight: 900, color: s.clr }}>{s.count}</span>
            </div>
          ))}
        </div>

        {prediction ? (
          <div className="card-inner" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Zap color="#f59e0b" size={20} fill="#f59e0b" />
              <span style={{ fontWeight: 900, letterSpacing: 1, fontSize: 13 }}>PRÉDICTION IA</span>
              {prediction.model_status === 'placeholder' && (
                <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 900, letterSpacing: 1, padding: '3px 8px', borderRadius: 20, background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44' }}>
                  CALIBRATION
                </span>
              )}
            </div>
            {prediction.model_status === 'placeholder' ? (
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b', marginBottom: 10 }}>
                  Modèle en cours d'entraînement
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
                  Le modèle se calibre sur les données réelles de vos lots.<br />
                  Disponible après <strong style={{ color: '#f1f5f9' }}>3 cycles complets</strong> enregistrés.
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 16 }}>
                  {[
                    { label: 'POIDS PRÉDIT',  value: `${prediction.predicted_weight_g}g` },
                    { label: 'FCR PRÉDIT',    value: prediction.predicted_fcr },
                    { label: 'CONFIANCE',     value: `${Math.round((prediction.confidence_score || 0) * 100)}%` },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800 }}>{s.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 900 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 14, background: 'rgba(255,255,255,.06)', borderRadius: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>RECOMMANDATION</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{prediction.recommendation}</div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="glass-panel" style={{ height: 280 }}>
            <div className="panel-title">Production Œufs / jour ({eggData.length})</div>
            {eggData.length === 0 ? (
              <Empty text="Aucune donnée de ponte disponible" />
            ) : (
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={eggData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar name="Œufs collectés" dataKey="eggs" fill={color} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>

      {/* ── P&L Summary ── */}
      {pnl && (
        <div className="card-inner" style={{ marginTop: 28 }}>
          <div style={{ fontWeight: 900, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>💹 Compte de Résultat — Lot #{batchId}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'Charges Alimentation', value: `${pnl.total_feed_cost.toFixed(0)} TND`,   clr: C.warning },
              { label: 'Charges Santé',        value: `${pnl.total_health_cost.toFixed(0)} TND`, clr: C.error   },
              { label: 'Chiffre d\'Affaires',  value: `${pnl.total_revenue.toFixed(0)} TND`,     clr: C.success },
              { label: 'Marge Nette',          value: `${pnl.margin.toFixed(0)} TND (${pnl.margin_pct.toFixed(1)}%)`, clr: pnl.margin >= 0 ? C.success : C.error },
            ].map(s => (
              <div key={s.label} className="card-inner" style={{ textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: s.clr }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 14, fontSize: 12, color: C.muted }}>
            <span>Taux de mortalité : <strong style={{ color: pnl.mortality_rate > 5 ? C.error : C.text }}>{pnl.mortality_rate.toFixed(1)}%</strong></span>
            {pnl.avg_fcr != null && <span>FCR moyen : <strong style={{ color: pnl.avg_fcr > 1.8 ? C.warning : C.success }}>{pnl.avg_fcr.toFixed(2)}</strong></span>}
          </div>
        </div>
      )}

      {/* ── Rapport Journalier Darija ── */}
      <DarijaReport
        color={color}
        currentBatch={currentBatch}
        feedLogs={feedLogs}
        eggLogs={eggLogs}
        healthLogs={healthLogs}
        avgFcr={avgFcr}
        show={showDarija}
        onToggle={() => setShowDarija(v => !v)}
      />
    </div>
  );
}

function DarijaReport({ color, currentBatch, feedLogs, eggLogs, healthLogs, avgFcr, show, onToggle }) {
  // Collect all unique dates from all log types, sorted descending
  const allDates = [...new Set([
    ...feedLogs.map(l => l.date?.slice(0, 10)),
    ...eggLogs.map(l => l.date?.slice(0, 10)),
    ...healthLogs.map(l => l.date?.slice(0, 10)),
  ].filter(Boolean))].sort((a, b) => b.localeCompare(a));

  const buildDayText = (dateStr) => {
    const feed   = feedLogs.filter(l => l.date?.slice(0, 10) === dateStr);
    const eggs   = eggLogs.filter(l => l.date?.slice(0, 10) === dateStr);
    const health = healthLogs.filter(l => l.date?.slice(0, 10) === dateStr);
    const totalFeed   = feed.reduce((s, l) => s + (l.quantity_kg || 0), 0);
    const totalEggs   = eggs.reduce((s, l) => s + (l.total_eggs || 0), 0);
    const totalDeaths = health.reduce((s, l) => s + (l.deaths_today || 0), 0);
    const birdCount   = currentBatch?.current_quantity;
    const batchName   = currentBatch?.name || 'القطيع';

    const lines = [
      `📅 تقرير يوم: ${new Date(dateStr + 'T12:00:00').toLocaleDateString('ar-TN', { weekday: 'long', day: 'numeric', month: 'long' })}`,
      `🐔 القطيع: ${batchName}`,
      ``,
      birdCount != null  ? `🐣 العدد: ${birdCount.toLocaleString('ar-TN')} طير` : null,
      totalFeed > 0      ? `🌾 العلف اليوم: ${totalFeed.toFixed(1)} كلغ` : `🌾 العلف: ما زدتش بعد`,
      totalEggs > 0      ? `🥚 البيض اليوم: ${totalEggs.toLocaleString('ar-TN')} بيضة` : `🥚 البيض: ما عنداش اليوم`,
      totalDeaths > 0    ? `⚠️ الوفيات: ${totalDeaths} طير — لازم تشوف السبب` : `✅ الوفيات: ما فماش`,
      avgFcr != null     ? `📊 معدل التحويل: ${avgFcr.toFixed(2)} — ${avgFcr < 1.7 ? 'مليح بارشا 👍' : avgFcr < 2.0 ? 'عادي' : '⚠️ عالي — يأكل بارشا'}` : null,
      ``,
      `— Smart Farm AI 🤖`,
    ].filter(l => l !== null).join('\n');
    return lines;
  };

  return (
    <div style={{ marginTop: 28 }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '13px 20px',
          background: show ? color + '12' : C.bg,
          border: `1px solid ${show ? color + '44' : C.border}`,
          borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer',
          color: C.text, width: '100%', transition: 'all .2s',
        }}
      >
        <span style={{ fontSize: 20 }}>📝</span>
        <span>تقارير يومية — بالدارجة</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: C.muted, fontWeight: 600 }}>
          {show ? '▲ إخفاء' : '▼ عرض'}
        </span>
      </button>

      {show && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {allDates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted, direction: 'rtl', fontSize: 14 }}>
              ما عنداش بيانات بعد — أضف سجلات علف أو بيض أو صحة
            </div>
          ) : allDates.map(dateStr => {
            const feed   = feedLogs.filter(l => l.date?.slice(0, 10) === dateStr);
            const eggs   = eggLogs.filter(l => l.date?.slice(0, 10) === dateStr);
            const health = healthLogs.filter(l => l.date?.slice(0, 10) === dateStr);
            const totalFeed   = feed.reduce((s, l) => s + (l.quantity_kg || 0), 0);
            const totalEggs   = eggs.reduce((s, l) => s + (l.total_eggs || 0), 0);
            const totalDeaths = health.reduce((s, l) => s + (l.deaths_today || 0), 0);
            const isToday = dateStr === new Date().toISOString().slice(0, 10);
            const txt = buildDayText(dateStr);

            return (
              <div key={dateStr} style={{
                background: '#0f172a', borderRadius: 14, overflow: 'hidden',
                border: `1px solid ${isToday ? color + '66' : 'rgba(255,255,255,.08)'}`,
              }}>
                {/* Card header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,.08)',
                  background: isToday ? color + '22' : 'rgba(255,255,255,.04)',
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isToday && (
                      <span style={{ fontSize: 9, fontWeight: 900, background: color, color: 'white', borderRadius: 999, padding: '2px 8px', letterSpacing: 1 }}>
                        اليوم
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>
                      {new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {totalDeaths > 0 && <span style={{ fontSize: 10, background: '#ef4444', color: 'white', borderRadius: 999, padding: '2px 8px', fontWeight: 800 }}>⚠️ {totalDeaths} وفاة</span>}
                    {totalEggs > 0   && <span style={{ fontSize: 10, background: '#f59e0b22', color: '#f59e0b', borderRadius: 999, padding: '2px 8px', fontWeight: 800, border: '1px solid #f59e0b44' }}>🥚 {totalEggs}</span>}
                    {totalFeed > 0   && <span style={{ fontSize: 10, background: '#10b98122', color: '#10b981', borderRadius: 999, padding: '2px 8px', fontWeight: 800, border: '1px solid #10b98144' }}>🌾 {totalFeed.toFixed(1)}kg</span>}
                  </div>
                </div>
                {/* Card body — Arabic RTL */}
                <div style={{ padding: '16px 18px', direction: 'rtl', textAlign: 'right', fontFamily: 'sans-serif', fontSize: 14, lineHeight: 2.0, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                  {txt}
                </div>
                {/* Card footer — actions */}
                <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(txt); toast.success('تم النسخ'); }}
                    style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: color, color: 'white', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                  >
                    📋 نسخ
                  </button>
                  <button
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank')}
                    style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: '#25d366', color: 'white', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                  >
                    📱 واتساب
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Shared micro-components ───────────────────────────────────────────────────

function BatchKpi({ label, value }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: C.muted }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>{title}</div>
      <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function AlertBanner({ color, icon: Icon, children }) {
  return (
    <div style={{ background: color + '12', border: `1px solid ${color}44`, borderRadius: 12, padding: '11px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
      <Icon size={15} color={color} style={{ flexShrink: 0 }} />
      <span style={{ fontWeight: 700, fontSize: 13, color }}>{children}</span>
    </div>
  );
}

function DataTable({ cols, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.bg }}>
            {cols.map(h => (
              <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 800, color: C.muted, fontSize: 10, letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, type = 'text', placeholder, options = [], value, onChange }) {
  return (
    <div style={{ width: '100%' }}>
      <label style={{ fontSize: 10, fontWeight: 900, color: C.muted, display: 'block', marginBottom: 5, letterSpacing: 0.4 }}>
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70%', color: C.muted, fontSize: 13 }}>
      {text}
    </div>
  );
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('fr-FR'); } catch (_) { return '—'; }
}
