import { useState, useMemo } from 'react';
import {
  Plus, Hexagon, MapPin, Activity, Droplets,
  ShieldCheck, AlertCircle, ChevronRight, X,
  Minus, Trash2, TrendingUp
} from 'lucide-react';
import { COLORS } from './BeeConstants';
import { beeApi } from '../../services/beeApi';
import HiveConsoleModal from './HiveConsoleModal';

const healthColor = (score) => score >= 7 ? COLORS.success : score >= 4 ? COLORS.honey : COLORS.error;

export default function RuchesTab({
  ruches = [], emplacements = [], modalActive, setModalActive,
  rucheForm, setRucheForm, handleAddRuche, onUpdateStat, onDelete,
  filterEmpId, setFilterEmpId,
}) {
  const [consoleHive,       setConsoleHive]       = useState(null);
  const [hiveDetails,       setHiveDetails]       = useState(null);
  const [activeConsoleTab,  setActiveConsoleTab]  = useState('overview');
  const [loadingDetails,    setLoadingDetails]    = useState(false);

  const openConsole = async (hive) => {
    setConsoleHive(hive);
    setActiveConsoleTab('overview');
    setHiveDetails(null);
    setLoadingDetails(true);
    try {
      const res = await beeApi.getHive(hive.id);
      if (res.ok) setHiveDetails(await res.json());
    } catch (err) {
      console.error('Error fetching hive details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredRuches = useMemo(() => {
    if (!filterEmpId) return ruches;
    return ruches.filter(r => String(r.apiary_id) === String(filterEmpId));
  }, [ruches, filterEmpId]);

  const inputStyle = {
    width: '100%', height: 50,
    background: COLORS.overlay04,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12, padding: '0 16px',
    color: 'white', outline: 'none', fontSize: 14,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: 0 }}>
              {filterEmpId
                ? `Ruches — ${emplacements.find(e => String(e.id) === String(filterEmpId))?.name || 'Site'}`
                : 'Inventaire des Ruches'}
            </h1>
            <p style={{ color: COLORS.textMuted, marginTop: 4, fontSize: 13 }}>
              {filteredRuches.length} ruche(s) · {filteredRuches.filter(r => r.is_active).length} active(s)
            </p>
          </div>
          {filterEmpId && (
            <button onClick={() => setFilterEmpId(null)} style={{ background: `${COLORS.accent}15`, border: `1px solid ${COLORS.accent}40`, color: COLORS.accent, padding: '7px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              ✕ Réinitialiser le filtre
            </button>
          )}
        </div>
        <button
          onClick={() => setModalActive('ruche')}
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, color: 'white', border: 'none', padding: '12px 28px', borderRadius: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, boxShadow: `0 4px 20px ${COLORS.accent}40`, cursor: 'pointer' }}
        >
          <Plus size={20} /> Nouvelle Ruche
        </button>
      </div>

      {/* KPI summary row */}
      {ruches.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16 }}>
          {[
            { label: 'Total Ruches', val: filteredRuches.length,                                                                                                    color: COLORS.accent,  icon: Hexagon },
            { label: 'Actives',      val: filteredRuches.filter(r => r.is_active).length,                                                                           color: COLORS.success, icon: TrendingUp },
            { label: 'Santé moy.',   val: filteredRuches.length ? (filteredRuches.reduce((a, r) => a + (r.health_score || 0), 0) / filteredRuches.length).toFixed(1) + '/10' : '—', color: COLORS.info, icon: ShieldCheck },
            { label: 'En alerte',    val: filteredRuches.filter(r => (r.health_score || 10) < 4).length,                                                            color: COLORS.error,   icon: AlertCircle },
          ].map((k, i) => (
            <div key={i} style={{ background: COLORS.surface, borderRadius: 18, padding: '18px 20px', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <k.icon size={20} color={k.color} />
              </div>
              <div>
                <div style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700 }}>{k.label}</div>
                <div style={{ color: 'white', fontSize: 20, fontWeight: 900 }}>{k.val}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hive cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {filteredRuches.length === 0 ? (
          <div style={{ gridColumn: '1/-1', padding: '80px 0', textAlign: 'center', background: COLORS.surface, borderRadius: 32, border: `2px dashed ${COLORS.border}` }}>
            <Hexagon size={48} color={COLORS.textMuted} style={{ marginBottom: 16, opacity: 0.4 }} />
            <p style={{ color: COLORS.textMuted, fontSize: 16, fontWeight: 600 }}>Aucune ruche trouvée.</p>
            <p style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>Cliquez sur "Nouvelle Ruche" pour commencer</p>
          </div>
        ) : filteredRuches.map(r => {
          const site = emplacements.find(e => String(e.id) === String(r.apiary_id));
          const hScore = r.health_score ?? 10;
          const hColor = healthColor(hScore);

          return (
            <div key={r.id}
              style={{ background: COLORS.surface, borderRadius: 28, border: `1px solid ${COLORS.border}`, overflow: 'hidden', transition: 'transform 0.2s, border-color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = COLORS.accent + '50'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = COLORS.border; }}
            >
              {/* Card header */}
              <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: r.is_active ? `${COLORS.success}18` : COLORS.overlay04, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <Hexagon size={24} color={r.is_active ? COLORS.success : COLORS.textMuted} />
                    {r.is_active && <div style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: COLORS.success, boxShadow: `0 0 6px ${COLORS.success}` }} />}
                  </div>
                  <div>
                    <div style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>{r.identifier}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <MapPin size={11} color={COLORS.textMuted} />
                      <span style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600 }}>{site?.name || 'Site non défini'}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: r.is_active ? COLORS.success : COLORS.textMuted, background: r.is_active ? `${COLORS.success}15` : COLORS.overlay06, padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => onDelete(r.id)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { id: 'health_score', label: 'Santé',  val: r.health_score ?? 10, color: hColor,        icon: ShieldCheck },
                  { id: 'honey_level',  label: 'Miel',   val: r.honey_level  ?? 5,  color: COLORS.accent, icon: Droplets },
                  { id: 'force_level',  label: 'Force',  val: r.force_level  ?? 5,  color: '#8b5cf6',     icon: Activity },
                ].map(metric => (
                  <div key={metric.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <metric.icon size={14} color={metric.color} />
                      <span style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600 }}>{metric.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 60, height: 4, borderRadius: 4, background: COLORS.overlay06, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(metric.val / 10) * 100}%`, background: metric.color, borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                      <button onClick={() => onUpdateStat(r.id, metric.id, -1)} style={{ width: 26, height: 26, borderRadius: 7, background: COLORS.overlay04, border: `1px solid ${COLORS.border}`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Minus size={12} />
                      </button>
                      <span style={{ color: 'white', fontWeight: 900, fontSize: 16, minWidth: 20, textAlign: 'center' }}>{metric.val}</span>
                      <button onClick={() => onUpdateStat(r.id, metric.id, 1)} style={{ width: 26, height: 26, borderRadius: 7, background: `${metric.color}20`, border: `1px solid ${metric.color}40`, color: metric.color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: COLORS.overlay03, border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 700 }}>TYPE</div>
                    <div style={{ fontSize: 12, color: 'white', fontWeight: 700, marginTop: 2 }}>{r.hive_type || 'Standard'}</div>
                  </div>
                  <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: COLORS.overlay03, border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 700 }}>REINE</div>
                    <div style={{ fontSize: 12, color: 'white', fontWeight: 700, marginTop: 2 }}>{r.queen_year || '—'}</div>
                  </div>
                  <button
                    onClick={() => openConsole(r)}
                    style={{ flex: 2, padding: '8px 12px', borderRadius: 10, background: `${COLORS.accent}12`, border: `1px solid ${COLORS.accent}30`, color: COLORS.accent, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    Console <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Console modal */}
      {consoleHive && (
        <HiveConsoleModal
          hive={consoleHive}
          emplacements={emplacements}
          hiveDetails={hiveDetails}
          loadingDetails={loadingDetails}
          activeTab={activeConsoleTab}
          setActiveTab={setActiveConsoleTab}
          onClose={() => setConsoleHive(null)}
        />
      )}

      {/* Modal Nouvelle Ruche */}
      {modalActive === 'ruche' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: COLORS.surface, width: 460, borderRadius: 32, border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '24px 32px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${COLORS.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Hexagon size={20} color={COLORS.accent} />
                </div>
                <h2 style={{ color: 'white', fontSize: 18, fontWeight: 900, margin: 0 }}>Nouvelle Ruche</h2>
              </div>
              <button onClick={() => setModalActive(null)} style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.overlay06, border: `1px solid ${COLORS.border}`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>IDENTIFIANT (QR)</label>
                <input type="text" value={rucheForm.identifier} onChange={e => setRucheForm({ ...rucheForm, identifier: e.target.value })} style={inputStyle} placeholder="ex: HIVE-2024-A1" />
              </div>
              <div>
                <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>EMPLACEMENT</label>
                <select value={rucheForm.apiary_id} onChange={e => setRucheForm({ ...rucheForm, apiary_id: e.target.value })} style={inputStyle}>
                  <option value="">Sélectionner un site...</option>
                  {emplacements.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>TYPE</label>
                  <select value={rucheForm.hive_type} onChange={e => setRucheForm({ ...rucheForm, hive_type: e.target.value })} style={{ ...inputStyle, height: 44 }}>
                    {['Langstroth', 'Dadant', 'Warré', 'TBH', 'Autre'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>ANNÉE REINE</label>
                  <input type="number" value={rucheForm.queen_year} onChange={e => setRucheForm({ ...rucheForm, queen_year: e.target.value })} style={{ ...inputStyle, height: 44 }} placeholder={new Date().getFullYear()} />
                </div>
              </div>
              <div>
                <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>NOTES</label>
                <textarea value={rucheForm.notes || ''} onChange={e => setRucheForm({ ...rucheForm, notes: e.target.value })} placeholder="Observations initiales..." style={{ width: '100%', height: 80, background: COLORS.overlay04, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '12px 16px', color: 'white', resize: 'none', outline: 'none', fontSize: 13 }} />
              </div>
              <button
                onClick={() => handleAddRuche(rucheForm)}
                style={{ height: 58, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, borderRadius: 16, border: 'none', color: 'white', fontWeight: 900, cursor: 'pointer', fontSize: 15, boxShadow: `0 8px 24px ${COLORS.accent}40`, transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Enregistrer la Ruche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
