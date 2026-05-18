import {
  Wallet, Plus, X, Trash2, TrendingUp,
  MapPin, Calendar, BarChart2
} from 'lucide-react';
import { COLORS, EXPENSE_CATEGORIES } from './BeeConstants';

const getCat = (id) => EXPENSE_CATEGORIES.find(c => c.id === id) || EXPENSE_CATEGORIES[5];

export default function DepensesTab({
  depenses = [], emplacements = [],
  modalActive, setModalActive,
  depenseForm, setDepenseForm,
  handleAddDepense, onDelete
}) {
  const total = depenses.reduce((s, d) => s + (parseFloat(d.montantReel) || 0), 0);
  const byCategory = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    sum: depenses.filter(d => d.type === cat.id).reduce((s, d) => s + (parseFloat(d.montantReel) || 0), 0)
  })).filter(c => c.sum > 0);

  const inputStyle = {
    width: '100%', height: 48,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12, padding: '0 16px',
    color: 'white', outline: 'none', fontSize: 14
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: 0 }}>Finances & Dépenses</h1>
          <p style={{ color: COLORS.textMuted, marginTop: 4, fontSize: 13 }}>Suivi comptable des coûts d'exploitation</p>
        </div>
        <button
          onClick={() => setModalActive('depenses')}
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, color: 'white', border: 'none', padding: '12px 28px', borderRadius: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, boxShadow: `0 4px 20px ${COLORS.accent}40`, cursor: 'pointer' }}
        >
          <Plus size={20} /> Ajouter Dépense
        </button>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 20 }}>
        <div style={{ background: COLORS.surface, borderRadius: 24, padding: 24, border: `1px solid ${COLORS.border}`, gridColumn: '1 / 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${COLORS.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={20} color={COLORS.accent} />
            </div>
            <span style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700 }}>TOTAL DÉPENSES</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'white' }}>{total.toFixed(2)} <span style={{ fontSize: 16, color: COLORS.textMuted }}>DT</span></div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{depenses.length} écriture(s) comptable(s)</div>
        </div>

        <div style={{ background: COLORS.surface, borderRadius: 24, padding: 24, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <BarChart2 size={18} color={COLORS.info} />
            <span style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700 }}>RÉPARTITION</span>
          </div>
          {byCategory.length === 0 ? (
            <p style={{ color: COLORS.textMuted, fontSize: 13 }}>Aucune donnée</p>
          ) : byCategory.slice(0, 3).map(cat => (
            <div key={cat.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>{cat.id}</span>
                <span style={{ color: cat.color, fontSize: 12, fontWeight: 800 }}>{cat.sum.toFixed(1)} DT</span>
              </div>
              <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${total > 0 ? (cat.sum / total) * 100 : 0}%`, background: cat.color, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: COLORS.surface, borderRadius: 24, padding: 24, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <TrendingUp size={18} color={COLORS.success} />
            <span style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700 }}>CATÉGORIES ACTIVES</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EXPENSE_CATEGORIES.map(cat => {
              const active = depenses.some(d => d.type === cat.id);
              return (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: active ? `${cat.color}18` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? cat.color + '40' : COLORS.border}` }}>
                  <cat.icon size={12} color={active ? cat.color : COLORS.textMuted} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: active ? cat.color : COLORS.textMuted }}>{cat.id}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Entries list */}
      {depenses.length === 0 ? (
        <div style={{ height: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: COLORS.textMuted, background: COLORS.surface, borderRadius: 32, border: `2px dashed ${COLORS.border}` }}>
          <Wallet size={52} strokeWidth={1} style={{ opacity: 0.4 }} />
          <p style={{ fontWeight: 600, fontSize: 16 }}>Aucune écriture comptable.</p>
          <p style={{ fontSize: 13 }}>Cliquez sur "Ajouter Dépense" pour commencer le suivi.</p>
        </div>
      ) : (
        <div style={{ background: COLORS.surface, borderRadius: 28, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                {['CATÉGORIE', 'MONTANT', 'DATE', 'SITE', 'DESCRIPTION', 'ACTION'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depenses.map(d => {
                const cat = getCat(d.type);
                const site = emplacements.find(e => String(e.id) === String(d.empId));
                return (
                  <tr key={d.id} style={{ borderTop: `1px solid ${COLORS.border}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${cat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <cat.icon size={16} color={cat.color} />
                        </div>
                        <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{d.type}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ color: COLORS.accent, fontWeight: 900, fontSize: 16 }}>{parseFloat(d.montantReel || 0).toFixed(2)}</span>
                      <span style={{ color: COLORS.textMuted, fontSize: 11, marginLeft: 4 }}>DT</span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLORS.textMuted, fontSize: 13 }}>
                        <Calendar size={12} /> {d.date || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLORS.textMuted, fontSize: 13 }}>
                        <MapPin size={12} /> {site?.name || 'Frais Généraux'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: COLORS.textMuted, fontSize: 13, maxWidth: 180 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {d.description || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(d.id)}
                          style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(239,68,68,0.1)', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════ MODAL NOUVELLE DÉPENSE ═══════ */}
      {modalActive === 'depenses' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: COLORS.surface, width: 500, borderRadius: 32, border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>

            <div style={{ padding: '24px 32px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${COLORS.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={20} color={COLORS.accent} />
                </div>
                <h2 style={{ color: 'white', fontSize: 18, fontWeight: 900, margin: 0 }}>Nouvelle Dépense</h2>
              </div>
              <button onClick={() => setModalActive(null)} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 22 }}>

              {/* Amount */}
              <div>
                <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>MONTANT (DT) *</label>
                <input
                  type="number" min="0" step="0.01"
                  placeholder="0.00"
                  value={depenseForm.montantReel}
                  onChange={e => setDepenseForm({ ...depenseForm, montantReel: e.target.value })}
                  style={{ ...inputStyle, fontSize: 20, fontWeight: 800, height: 56, border: `1px solid ${COLORS.accent}50` }}
                />
              </div>

              {/* Category */}
              <div>
                <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px', marginBottom: 12, display: 'block' }}>CATÉGORIE</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setDepenseForm({ ...depenseForm, type: cat.id })}
                      style={{
                        padding: '12px 8px', borderRadius: 14, cursor: 'pointer',
                        border: depenseForm.type === cat.id ? `2px solid ${cat.color}` : `1px solid ${COLORS.border}`,
                        background: depenseForm.type === cat.id ? `${cat.color}15` : 'rgba(255,255,255,0.02)',
                        color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, transition: 'all 0.15s'
                      }}
                    >
                      <cat.icon size={18} color={depenseForm.type === cat.id ? cat.color : COLORS.textMuted} />
                      <span style={{ fontSize: 9, fontWeight: 800, color: depenseForm.type === cat.id ? cat.color : COLORS.textMuted, textAlign: 'center', lineHeight: 1.2 }}>{cat.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date + Site */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>DATE</label>
                  <input type="date" value={depenseForm.date} onChange={e => setDepenseForm({ ...depenseForm, date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>SITE (optionnel)</label>
                  <select value={depenseForm.empId} onChange={e => setDepenseForm({ ...depenseForm, empId: e.target.value })} style={inputStyle}>
                    <option value="">Frais généraux</option>
                    {emplacements.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>DESCRIPTION</label>
                <textarea
                  value={depenseForm.description}
                  onChange={e => setDepenseForm({ ...depenseForm, description: e.target.value })}
                  placeholder="Détail de la dépense..."
                  style={{ width: '100%', height: 72, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '12px 16px', color: 'white', resize: 'none', outline: 'none', fontSize: 13 }}
                />
              </div>

              <button
                onClick={() => handleAddDepense(depenseForm)}
                style={{ height: 58, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, borderRadius: 16, border: 'none', color: 'white', fontWeight: 900, cursor: 'pointer', fontSize: 15, boxShadow: `0 8px 24px ${COLORS.accent}40`, transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Enregistrer dans la Comptabilité
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
