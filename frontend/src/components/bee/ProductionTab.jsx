import { useMemo, useState, useEffect } from 'react';
import {
  Droplets, Plus, MapPin, TrendingUp, Flower2,
  Award, Calendar, X, BarChart2, Leaf, ChevronDown,
  RefreshCw, Trash2, ArrowUpRight
} from 'lucide-react';
import { COLORS } from './BeeConstants';

const API = 'http://localhost:8000/api/v1/bee/history';

/* ── Helpers ────────────────────────────────────────────────── */
const fmt = (n) => Number(n || 0).toFixed(1);

/* ── Mini bar chart SVG ──────────────────────────────────────── */
function MiniBarChart({ data = [], color = COLORS.accent, height = 80 }) {
  if (!data.length) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, fontSize: 12 }}>
      Aucune donnée
    </div>
  );
  const max = Math.max(...data.map(d => d.value), 0.1);
  const w = 100 / data.length;
  return (
    <svg viewBox={`0 0 100 ${height}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      {data.map((d, i) => {
        const barH = (d.value / max) * (height - 16);
        const x = i * w + w * 0.15;
        const barW = w * 0.7;
        const y = height - barH - 14;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={2} fill={color} opacity={0.85} />
            <text x={x + barW / 2} y={height - 2} textAnchor="middle" fontSize={6} fill={COLORS.textMuted}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Progress bar ────────────────────────────────────────────── */
function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
    </div>
  );
}

/* ── Site production card ───────────────────────────────────── */
function SiteCard({ site, total, onSelect, isSelected }) {
  const pct = total > 0 ? ((site.totalMiel / total) * 100).toFixed(0) : 0;
  return (
    <div
      onClick={() => onSelect(site.id)}
      style={{
        background: isSelected ? `${COLORS.accent}12` : COLORS.surface,
        border: `1px solid ${isSelected ? COLORS.accent + '60' : COLORS.border}`,
        borderRadius: 24,
        padding: 24,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `${COLORS.accent}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MapPin size={18} color={COLORS.accent} />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{site.name || site.nom}</div>
            <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>{site.flower_type || site.typeFleur} · {site.season || site.saison}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: COLORS.accent, fontWeight: 900, fontSize: 20 }}>{fmt(site.totalMiel)} <span style={{ fontSize: 12, color: COLORS.textMuted }}>kg</span></div>
          <div style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 2 }}>{site.totalRecoltes} récolte{site.totalRecoltes !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <ProgressBar value={site.totalMiel} max={total || 1} color={COLORS.accent} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ color: COLORS.textMuted, fontSize: 11 }}>Part de la production totale</span>
        <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>{pct}%</span>
      </div>
    </div>
  );
}

/* ── Harvest row ────────────────────────────────────────────── */
function HarvestRow({ p, emplacements, onDelete }) {
  const emp = emplacements.find(e => Number(e.id) === Number(p.empId));
  const stateColor = { health: COLORS.success || '#22c55e', warning: '#f59e0b', urgent: COLORS.error }['health'] || COLORS.success;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1.5fr 1fr 1fr 1fr auto',
      gap: 12,
      alignItems: 'center',
      padding: '14px 20px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${COLORS.border}`,
      marginBottom: 8,
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Calendar size={13} color={COLORS.textMuted} />
        <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{p.production_date || p.date}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MapPin size={13} color={COLORS.accent} />
        <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{emp?.name || emp?.nom || '—'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Droplets size={13} color={COLORS.info} />
        <span style={{ color: 'white', fontWeight: 700 }}>{fmt(p.honey_kg || p.miel)} kg</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Leaf size={13} color={COLORS.success || '#22c55e'} />
        <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{fmt(p.pollen_kg || p.pollen)} kg</span>
      </div>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: `${COLORS.success || '#22c55e'}15`,
        color: COLORS.success || '#22c55e',
        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: stateColor }} />
        Validé
      </div>
      <button
        onClick={() => onDelete(p.id)}
        style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 4, borderRadius: 8, display: 'flex' }}
        onMouseEnter={e => e.currentTarget.style.color = COLORS.error}
        onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function ProductionTab({
  productions, emplacements, ruches, visites, stock, setProductions,
  modalActive, setModalActive,
  prodForm, setProdForm, handleAddProd, onSync, syncing
}) {
  const [selectedSite, setSelectedSite] = useState(null);
  const [dbStats, setDbStats] = useState(null);


  /* Charger les stats depuis l'API */
  const loadStats = async () => {
    try {
      const r = await fetch(`${API}/apiaries`);
      if (r.ok) setDbStats(await r.json());
    } catch (_) {}
  };

  useEffect(() => { loadStats(); }, [productions]);

  /* Stats locales (localStorage) */
  const statsParSite = useMemo(() => emplacements.map(emp => {
    const sp = productions.filter(p => Number(p.apiary_id) === Number(emp.id));
    return {
      ...emp,
      totalMiel: sp.reduce((s, p) => s + parseFloat(p.honey_kg || 0), 0),
      totalPollen: sp.reduce((s, p) => s + parseFloat(p.pollen_kg || 0), 0),
      totalRecoltes: sp.length,
    };
  }), [productions, emplacements]);

  const statsParFleur = useMemo(() => {
    const f = {};
    productions.forEach(p => {
      const emp = emplacements.find(e => Number(e.id) === Number(p.apiary_id));
      const fleur = emp?.flower_type || emp?.typeFleur || 'Inconnu';
      if (!f[fleur]) f[fleur] = { honey: 0, pollen: 0, count: 0 };
      f[fleur].honey += parseFloat(p.honey_kg || 0);
      f[fleur].pollen += parseFloat(p.pollen_kg || 0);
      f[fleur].count++;
    });
    return Object.entries(f).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.honey - a.honey);
  }, [productions, emplacements]);

  const totalGlobal = useMemo(() => productions.reduce((a, p) => a + parseFloat(p.honey_kg || 0), 0), [productions]);
  const totalPollen = useMemo(() => productions.reduce((a, p) => a + parseFloat(p.pollen_kg || 0), 0), [productions]);

  /* Chart data : regrouper par mois */
  const chartData = useMemo(() => {
    const months = {};
    productions.forEach(p => {
      const date = p.production_date || p.date || '';
      const key = date.substring(0, 7);
      if (!months[key]) months[key] = 0;
      months[key] += parseFloat(p.honey_kg || 0);
    });
    const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return Object.entries(months)
      .slice(-8)
      .map(([k, value]) => {
        const mNum = parseInt(k.split('-')[1]) - 1;
        return { label: MONTH_LABELS[mNum] || k, value };
      });
  }, [productions]);

  /* Sync vers l'API */
  const handleSync = async () => {
    await onSync();
    await loadStats();
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette récolte ?')) return;
    await fetch(`${API}/productions/${id}`, { method: 'DELETE' });
    if (onSync) onSync();
  };

  const filteredProductions = selectedSite
    ? productions.filter(p => Number(p.apiary_id) === Number(selectedSite))
    : productions;

  const topSite = statsParSite.reduce((best, s) => s.totalMiel > (best?.totalMiel || 0) ? s : best, null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: 'white', margin: 0 }}>Production & Récoltes</h1>
          <p style={{ color: COLORS.textMuted, marginTop: 6, fontSize: 13 }}>
            Analytique des rendements · {productions.length} récolte{productions.length !== 1 ? 's' : ''} enregistrée{productions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSync}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`,
              color: COLORS.textMuted, padding: '10px 18px', borderRadius: 12, cursor: 'pointer', fontSize: 13,
            }}
          >
            <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Sync...' : 'Sync DB'}
          </button>
          <button
            onClick={() => setModalActive('production')}
            style={{
              background: COLORS.accent, color: 'white', border: 'none',
              padding: '10px 24px', borderRadius: 14, fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(217,119,6,0.35)',
            }}
          >
            <Plus size={18} /> Nouvelle Récolte
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16 }}>
        {[
          {
            label: 'Production Totale', value: `${fmt(totalGlobal)} kg`,
            sub: 'miel récolté', icon: Droplets, color: COLORS.accent,
          },
          {
            label: 'Pollen Récolté', value: `${fmt(totalPollen)} kg`,
            sub: 'toutes récoltes', icon: Leaf, color: COLORS.info,
          },
          {
            label: 'Meilleur Site', value: topSite?.nom || '—',
            sub: topSite ? `${fmt(topSite.totalMiel)} kg` : 'aucun', icon: Award, color: '#f59e0b',
          },
          {
            label: 'Historique DB', value: dbStats ? `${fmt(dbStats.total_honey_kg)} kg` : '—',
            sub: dbStats ? `${dbStats.total_visits} visites` : 'non synchronisé', icon: BarChart2, color: COLORS.success || '#22c55e',
          },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: COLORS.surface, borderRadius: 20, padding: 22,
            border: `1px solid ${COLORS.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11,
                background: `${kpi.color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <kpi.icon size={18} color={kpi.color} />
              </div>
              <ArrowUpRight size={14} color={COLORS.textMuted} style={{ opacity: 0.4 }} />
            </div>
            <div style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{kpi.label}</div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 22, marginTop: 4, lineHeight: 1.1 }}>{kpi.value}</div>
            <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 4 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Graphique + Floraisons ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>

        {/* Bar chart mensuel */}
        <div style={{ background: COLORS.surface, borderRadius: 28, padding: 28, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TrendingUp size={18} color={COLORS.accent} />
                <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>Courbe de production</span>
              </div>
              <p style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>Miel récolté par période</p>
            </div>
            <div style={{
              background: `${COLORS.accent}15`, color: COLORS.accent,
              fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20,
            }}>
              {fmt(totalGlobal)} kg total
            </div>
          </div>
          {chartData.length > 0 ? (
            <MiniBarChart data={chartData} color={COLORS.accent} height={120} />
          ) : (
            <div style={{
              height: 120, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 10,
              background: 'rgba(255,255,255,0.02)', borderRadius: 16,
            }}>
              <BarChart2 size={32} color={COLORS.textMuted} style={{ opacity: 0.3 }} />
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>Ajoutez des récoltes pour voir le graphique</p>
            </div>
          )}
        </div>

        {/* Floraisons */}
        <div style={{ background: COLORS.surface, borderRadius: 28, padding: 28, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Flower2 size={18} color={COLORS.success || '#22c55e'} />
            <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>Par Floraison</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {statsParFleur.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>Aucune donnée</p>
            )}
            {statsParFleur.map((f, i) => (
              <div key={f.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: [COLORS.accent, COLORS.info, COLORS.success || '#22c55e', '#f59e0b'][i % 4],
                    }} />
                    <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>Miel de {f.name}</span>
                  </div>
                  <span style={{ color: COLORS.accent, fontWeight: 800, fontSize: 13 }}>{fmt(f.honey)} kg</span>
                </div>
                <ProgressBar
                  value={f.honey}
                  max={Math.max(...statsParFleur.map(x => x.honey), 0.1)}
                  color={[COLORS.accent, COLORS.info, COLORS.success || '#22c55e', '#f59e0b'][i % 4]}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sites de production ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: 18, margin: 0 }}>Sites de Production</h2>
          {selectedSite && (
            <button
              onClick={() => setSelectedSite(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`,
                color: COLORS.textMuted, padding: '6px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 12,
              }}
            >
              <X size={12} /> Voir tous les sites
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {statsParSite.map(s => (
            <SiteCard
              key={s.id}
              site={s}
              total={totalGlobal}
              onSelect={setSelectedSite}
              isSelected={selectedSite === s.id}
            />
          ))}
          {statsParSite.length === 0 && (
            <p style={{ color: COLORS.textMuted, fontSize: 13 }}>Aucun site enregistré. Ajoutez des emplacements dans « Sites GIS ».</p>
          )}
        </div>
      </div>

      {/* ── Journal des récoltes ── */}
      <div style={{ background: COLORS.surface, borderRadius: 28, border: `1px solid ${COLORS.border}`, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={18} color={COLORS.info} />
            <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>Journal des Récoltes</span>
            {selectedSite && (
              <span style={{
                background: `${COLORS.accent}20`, color: COLORS.accent,
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              }}>
                {emplacements.find(e => e.id === selectedSite)?.name || emplacements.find(e => e.id === selectedSite)?.nom}
              </span>
            )}
          </div>
          <span style={{ color: COLORS.textMuted, fontSize: 12 }}>
            {filteredProductions.length} enregistrement{filteredProductions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredProductions.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 0',
            border: `1px dashed ${COLORS.border}`, borderRadius: 16,
          }}>
            <Droplets size={40} color={COLORS.textMuted} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ color: COLORS.textMuted, fontSize: 14 }}>Aucune récolte enregistrée</p>
            <button
              onClick={() => setModalActive('production')}
              style={{
                marginTop: 16, background: COLORS.accent, border: 'none',
                color: 'white', padding: '10px 24px', borderRadius: 12,
                cursor: 'pointer', fontWeight: 700, fontSize: 13,
              }}
            >
              + Enregistrer la première récolte
            </button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.5fr 1fr 1fr 1fr auto',
              gap: 12, padding: '0 20px 12px',
              borderBottom: `1px solid ${COLORS.border}`, marginBottom: 8,
            }}>
              {['Date', 'Site', 'Miel', 'Pollen', 'Statut', ''].map((h, i) => (
                <span key={i} style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
              ))}
            </div>
            {[...filteredProductions].reverse().map(p => (
              <HarvestRow key={p.id} p={p} emplacements={emplacements} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal nouvelle récolte ── */}
      {modalActive === 'production' && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: COLORS.surface, width: 480, borderRadius: 32,
            border: `1px solid ${COLORS.border}`, overflow: 'hidden',
            boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
          }}>
            {/* Header modal */}
            <div style={{
              padding: '24px 32px', borderBottom: `1px solid ${COLORS.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: `${COLORS.accent}08`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: COLORS.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Droplets size={20} color="white" />
                </div>
                <div>
                  <h2 style={{ color: 'white', fontSize: 18, fontWeight: 800, margin: 0 }}>Nouvelle Récolte</h2>
                  <p style={{ color: COLORS.textMuted, fontSize: 12, margin: 0, marginTop: 2 }}>Enregistrement de production</p>
                </div>
              </div>
              <button
                onClick={() => setModalActive(null)}
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'white', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Date */}
              <div>
                <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Date de récolte</label>
                <input
                  type="date"
                  value={prodForm.production_date || ''}
                  onChange={e => setProdForm({ ...prodForm, production_date: e.target.value })}
                  style={{ width: '100%', height: 48, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              {/* Emplacement */}
              <div>
                <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Site apicole</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={prodForm.apiary_id || ''}
                    onChange={e => setProdForm({ ...prodForm, apiary_id: e.target.value })}
                    style={{ width: '100%', height: 48, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: prodForm.apiary_id ? 'white' : COLORS.textMuted, fontSize: 14, boxSizing: 'border-box', appearance: 'none' }}
                  >
                    <option value="">Sélectionner un site</option>
                    {emplacements.map(e => <option key={e.id} value={e.id}>{e.name || e.nom} — {e.flower_type || e.typeFleur}</option>)}
                  </select>
                  <ChevronDown size={16} color={COLORS.textMuted} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Quantités */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <Droplets size={11} style={{ marginRight: 4 }} />Miel (kg)
                  </label>
                  <input
                    type="number" min="0" step="0.1"
                    value={prodForm.honey_kg || ''}
                    onChange={e => setProdForm({ ...prodForm, honey_kg: e.target.value })}
                    style={{ width: '100%', height: 48, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <Leaf size={11} style={{ marginRight: 4 }} />Pollen (kg)
                  </label>
                  <input
                    type="number" min="0" step="0.1"
                    value={prodForm.pollen_kg || ''}
                    onChange={e => setProdForm({ ...prodForm, pollen_kg: e.target.value })}
                    style={{ width: '100%', height: 48, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <button
                onClick={handleAddProd}
                disabled={!prodForm.apiary_id}
                style={{
                  height: 54, background: prodForm.apiary_id ? COLORS.accent : 'rgba(255,255,255,0.06)',
                  borderRadius: 16, border: 'none', color: prodForm.apiary_id ? 'white' : COLORS.textMuted,
                  fontWeight: 800, fontSize: 15, cursor: prodForm.apiary_id ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                }}
              >
                Enregistrer la récolte
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
