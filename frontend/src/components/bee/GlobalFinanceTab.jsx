import { useState, useEffect, useCallback } from 'react';
import {
  Wallet, Plus, Trash2, TrendingUp, TrendingDown,
  RefreshCw, AlertCircle, BarChart2
} from 'lucide-react';
import { COLORS, EXPENSE_CATEGORIES } from './BeeConstants';
import { beeApi } from '../../services/beeApi';

const DEPENSE_TYPES = EXPENSE_CATEGORIES.map(c => c.id);
const getCat = id => EXPENSE_CATEGORIES.find(c => c.id === id) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];

const inputSt = {
  width: '100%', height: 44,
  background: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 12, padding: '0 14px',
  color: COLORS.text, outline: 'none', fontSize: 14,
};

function KPI({ label, value, color, sub }) {
  return (
    <div style={{
      background: COLORS.surface, borderRadius: 16,
      border: `1px solid ${COLORS.border}`, padding: '18px 20px',
    }}>
      <div style={{ color: COLORS.textMuted, fontSize: 9, fontWeight: 800, letterSpacing: '1.2px' }}>{label}</div>
      <div style={{ color, fontWeight: 900, fontSize: 22, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default function GlobalFinanceTab({ ruches = [], emplacements = [] }) {
  const [depenses,  setDepenses]  = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);
  const [form, setForm] = useState({
    category: 'Alimentation', amount: '', amount_planned: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '', hive_id: '',
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [rd, rs] = await Promise.all([
      beeApi.getExpensesAll(),
      beeApi.getExpensesSummaryAll(),
    ]);
    if (rd.ok) setDepenses(await rd.json());
    if (rs.ok) setSummary(await rs.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { showToast('Montant invalide', 'warning'); return; }
    setSaving(true);
    const res = await beeApi.createExpense({
      ...form,
      hive_id: form.hive_id ? parseInt(form.hive_id) : null,
      amount: parseFloat(form.amount),
      amount_planned: form.amount_planned ? parseFloat(form.amount_planned) : null,
    });
    setSaving(false);
    if (res.ok) {
      showToast('Dépense enregistrée ✓');
      setForm({ category: 'Alimentation', amount: '', amount_planned: '', expense_date: new Date().toISOString().split('T')[0], description: '', hive_id: '' });
      setShowForm(false);
      load();
    } else showToast('Erreur enregistrement', 'error');
  };

  const del = async (id) => {
    await beeApi.deleteExpense(id);
    showToast('Supprimée', 'warning');
    load();
  };

  /* ── helpers ── */
  const hiveLabel = (hiveId) => {
    const h = ruches.find(r => r.id === hiveId);
    return h ? h.identifier : `#${hiveId}`;
  };
  const apiaryLabel = (apiaryId) => {
    const a = emplacements.find(e => e.id === apiaryId);
    return a ? a.name : `Site #${apiaryId}`;
  };
  const fmt = (n) => n != null ? `${parseFloat(n).toFixed(2)} TND` : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          background: toast.type === 'error' ? COLORS.error : toast.type === 'warning' ? COLORS.honey : COLORS.success,
          color: 'white', padding: '12px 22px', borderRadius: 14,
          fontWeight: 800, fontSize: 13,
          boxShadow: '0 4px 24px rgba(0,0,0,.2)',
          animation: 'popIn .2s ease both',
        }}>{toast.msg}</div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: COLORS.text, margin: 0 }}>Finance Globale</h1>
          <p style={{ color: COLORS.textMuted, marginTop: 4, fontSize: 13 }}>
            Financement & dépenses de toutes les ruches
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} disabled={loading}
            style={{ height: 42, width: 42, borderRadius: 12, border: `1px solid ${COLORS.border}`,
              background: COLORS.surface, color: COLORS.textMuted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button onClick={() => setShowForm(s => !s)}
            style={{ height: 42, padding: '0 22px', borderRadius: 12,
              background: `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})`,
              border: 'none', color: 'white', fontWeight: 800, fontSize: 14,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: `0 4px 18px ${COLORS.accent}40` }}>
            <Plus size={16} /> Ajouter Dépense
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      {summary && (() => {
        const previewAmt = showForm && parseFloat(form.amount) > 0 ? parseFloat(form.amount) : 0;
        const newTotal   = (summary.total_expenses ?? 0) + previewAmt;
        const hasPreview = previewAmt > 0;
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
            <KPI label="DÉPENSES"
              value={hasPreview ? fmt(newTotal) : fmt(summary.total_expenses)}
              color={COLORS.error}
              sub={hasPreview ? `+${fmt(previewAmt)} en cours` : null}
            />
            <KPI label="MIEL PRODUIT"  value={`${(summary.total_honey_kg ?? 0).toFixed(1)} kg`} color={COLORS.accent} />
            <KPI label="REVENU ESTIMÉ" value={fmt(summary.total_revenue_tnd)} color={COLORS.success} sub={`${summary.honey_price_kg} TND/kg`} />
            <KPI label="PROFIT ESTIMÉ" value={fmt(summary.profit_tnd)}
              color={(summary.profit_tnd ?? 0) >= 0 ? COLORS.success : COLORS.error}
              sub={(summary.profit_tnd ?? 0) >= 0 ? '📈 Bénéfice' : '📉 Déficit'}
            />
          </div>
        );
      })()}

      {/* ── Par catégorie ── */}
      {summary?.by_category && Object.keys(summary.by_category).length > 0 && (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: '20px 24px' }}>
          <div style={{ fontWeight: 900, color: COLORS.text, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={16} color={COLORS.accent} /> Dépenses par catégorie
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {Object.entries(summary.by_category)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, total]) => {
                const c = getCat(cat);
                return (
                  <div key={cat} style={{
                    padding: '8px 14px', borderRadius: 12,
                    background: (c.color || COLORS.accent) + '12',
                    border: `1px solid ${(c.color || COLORS.accent)}30`,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 16 }}>{c.icon ? null : '📦'}</span>
                    <span style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700 }}>{cat}</span>
                    <span style={{ color: c.color || COLORS.accent, fontWeight: 900, fontSize: 13 }}>{total.toFixed(0)} TND</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Par ruche (top hives) ── */}
      {summary?.by_hive && Object.keys(summary.by_hive).length > 0 && (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: '20px 24px' }}>
          <div style={{ fontWeight: 900, color: COLORS.text, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            🐝 Coût par ruche
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(summary.by_hive)
              .sort((a, b) => b[1].total - a[1].total)
              .slice(0, 8)
              .map(([hiveId, data]) => {
                const maxVal = Math.max(...Object.values(summary.by_hive).map(d => d.total));
                const pct = maxVal > 0 ? (data.total / maxVal) * 100 : 0;
                return (
                  <div key={hiveId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 90, color: COLORS.accent, fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                      {hiveLabel(parseInt(hiveId))}
                    </div>
                    <div style={{ flex: 1, height: 10, background: COLORS.border, borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${COLORS.accent},${COLORS.accentDark})`, borderRadius: 5 }} />
                    </div>
                    <div style={{ width: 80, color: COLORS.error, fontWeight: 800, fontSize: 12, textAlign: 'right', flexShrink: 0 }}>
                      {data.total.toFixed(0)} TND
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Par site ── */}
      {summary?.by_apiary && Object.keys(summary.by_apiary).length > 0 && (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: '20px 24px' }}>
          <div style={{ fontWeight: 900, color: COLORS.text, fontSize: 14, marginBottom: 14 }}>📍 Coût par site</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {Object.entries(summary.by_apiary).map(([apiaryId, total]) => (
              <div key={apiaryId} style={{
                padding: '8px 14px', borderRadius: 12,
                background: COLORS.info + '10', border: `1px solid ${COLORS.info}25`,
                display: 'flex', gap: 8, alignItems: 'center',
              }}>
                <span style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700 }}>{apiaryLabel(parseInt(apiaryId))}</span>
                <span style={{ color: COLORS.info, fontWeight: 900, fontSize: 13 }}>{parseFloat(total).toFixed(0)} TND</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add Form ── */}
      {showForm && (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.accent}40`, borderRadius: 20, padding: '24px 28px' }}>
          <div style={{ fontWeight: 900, color: COLORS.text, fontSize: 15, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wallet size={16} color={COLORS.accent} /> Nouvelle dépense
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
            {/* Ruche selector */}
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>RUCHE (optionnel)</label>
              <select value={form.hive_id} onChange={e => setForm(f => ({ ...f, hive_id: e.target.value }))} style={inputSt}>
                <option value="">— Toutes ruches —</option>
                {ruches.map(r => (
                  <option key={r.id} value={r.id}>{r.identifier}</option>
                ))}
              </select>
            </div>
            {/* Catégorie */}
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>CATÉGORIE</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputSt}>
                {DEPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {/* Dépense */}
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>DÉPENSE (TND) *</label>
              <input type="number" min="0" step="0.1" placeholder="0.00" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                style={{ ...inputSt, borderColor: form.amount ? COLORS.error + '80' : COLORS.border }} />
            </div>
            {/* Date */}
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>DATE</label>
              <input type="date" value={form.expense_date}
                onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} style={inputSt} />
            </div>
          </div>

          {/* ── Live preview strip ── */}
          {parseFloat(form.amount) > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12,
              padding: '12px 18px', borderRadius: 14,
              background: COLORS.error + '08',
              border: `1px dashed ${COLORS.error}30`,
            }}>
              <span style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 800, letterSpacing: '1px' }}>DÉPENSE</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: COLORS.error }}>
                {parseFloat(form.amount).toFixed(2)} TND
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <input type="text" placeholder="Description (optionnel)…" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ ...inputSt, flex: 1 }} />
            <button onClick={handleSubmit} disabled={saving}
              style={{ height: 44, padding: '0 24px', borderRadius: 12,
                background: `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})`,
                border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer',
                opacity: saving ? 0.7 : 1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving ? '…' : <><Plus size={14} /> Enregistrer</>}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ height: 44, padding: '0 16px', borderRadius: 12,
                background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                color: COLORS.textMuted, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', color: COLORS.textMuted, padding: '48px 0', fontSize: 13 }}>
          Chargement…
        </div>
      ) : depenses.length === 0 ? (
        <div style={{
          height: 180, background: COLORS.surface,
          border: `2px dashed ${COLORS.border}`, borderRadius: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <Wallet size={40} color={COLORS.border} strokeWidth={1} />
          <div style={{ color: COLORS.textMuted, fontWeight: 700, fontSize: 14 }}>Aucune dépense enregistrée</div>
          <div style={{ color: COLORS.textMuted, fontSize: 12 }}>Cliquez sur "Ajouter Dépense" pour commencer</div>
        </div>
      ) : (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                {['DATE', 'RUCHE', 'CATÉGORIE', 'RÉEL', 'PRÉVU', 'DESCRIPTION', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: COLORS.textMuted, fontSize: 9, fontWeight: 800, letterSpacing: '1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depenses.map(d => {
                const cat = getCat(d.category);
                return (
                  <tr key={d.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: '12px 16px', color: COLORS.textMuted, fontSize: 12 }}>{d.expense_date}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {d.hive_id
                        ? <span style={{ color: COLORS.accent, fontWeight: 800, fontSize: 12 }}>{hiveLabel(d.hive_id)}</span>
                        : <span style={{ color: COLORS.textMuted, fontSize: 11 }}>Général</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 9px', borderRadius: 7,
                        background: (cat.color || COLORS.accent) + '15',
                        color: cat.color || COLORS.accent,
                        fontSize: 10, fontWeight: 800,
                      }}>{d.category}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: COLORS.error, fontWeight: 800, fontSize: 13 }}>
                      {d.amount.toFixed(2)} TND
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: d.amount_planned ? COLORS.info : COLORS.textMuted, fontWeight: d.amount_planned ? 700 : 400 }}>
                      {d.amount_planned ? `${d.amount_planned.toFixed(2)} TND` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: COLORS.textMuted, fontSize: 12, maxWidth: 200 }}>
                      {d.description || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => del(d.id)}
                        style={{ width: 28, height: 28, borderRadius: 7,
                          background: 'rgba(239,68,68,0.08)', border: 'none',
                          color: COLORS.error, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
