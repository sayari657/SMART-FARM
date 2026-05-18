import { Droplets, Leaf, X, ChevronDown } from 'lucide-react';
import { COLORS } from './BeeConstants';

export default function ProductionModal({ emplacements, prodForm, setProdForm, handleAddProd, onClose }) {
  return (
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
        {/* Header */}
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
              <h2 style={{ color: COLORS.text, fontSize: 18, fontWeight: 800, margin: 0 }}>Nouvelle Récolte</h2>
              <p style={{ color: COLORS.textMuted, fontSize: 12, margin: 0, marginTop: 2 }}>Enregistrement de production</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(0,0,0,0.06)', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}
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
              style={{ width: '100%', height: 48, background: COLORS.bg2, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: COLORS.text, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {/* Site */}
          <div>
            <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Site apicole</label>
            <div style={{ position: 'relative' }}>
              <select
                value={prodForm.apiary_id || ''}
                onChange={e => setProdForm({ ...prodForm, apiary_id: e.target.value })}
                style={{ width: '100%', height: 48, background: COLORS.bg2, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: COLORS.text, fontSize: 14, boxSizing: 'border-box', appearance: 'none' }}
              >
                <option value="">Sélectionner un site</option>
                {emplacements.map(e => <option key={e.id} value={e.id}>{e.name || e.nom} — {e.flower_type || e.typeFleur}</option>)}
              </select>
              <ChevronDown size={16} color={COLORS.textMuted} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Quantities */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <Droplets size={11} style={{ marginRight: 4 }} />Miel (kg)
              </label>
              <input
                type="number" min="0" step="0.1"
                value={prodForm.honey_kg || ''}
                onChange={e => setProdForm({ ...prodForm, honey_kg: e.target.value })}
                style={{ width: '100%', height: 48, background: COLORS.bg2, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: COLORS.text, fontSize: 14, boxSizing: 'border-box' }}
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
                style={{ width: '100%', height: 48, background: COLORS.bg2, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: COLORS.text, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <button
            onClick={handleAddProd}
            disabled={!prodForm.apiary_id}
            style={{
              height: 54,
              background: prodForm.apiary_id ? COLORS.accent : 'rgba(0,0,0,0.08)',
              borderRadius: 16, border: 'none',
              color: prodForm.apiary_id ? 'white' : COLORS.textMuted,
              fontWeight: 800, fontSize: 15,
              cursor: prodForm.apiary_id ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            Enregistrer la récolte
          </button>
        </div>
      </div>
    </div>
  );
}
