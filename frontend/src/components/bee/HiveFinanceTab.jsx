import { useState, useCallback, useEffect } from 'react';
import { Wallet, Plus, Trash2 } from 'lucide-react';
import { COLORS } from './BeeConstants';
import { beeApi } from '../../services/beeApi';
import { DEPENSE_TYPES, Section, inputSt } from './HiveShared.jsx';

export default function FinanceTab({ hive, toast }) {
  const [depenses, setDepenses]   = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm] = useState({ category: 'Alimentation', amount: '', amount_planned: '', expense_date: new Date().toISOString().split('T')[0], description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rd, rs] = await Promise.all([
        beeApi.getExpensesByHive(hive.id),
        beeApi.getExpensesSummary(hive.id),
      ]);
      if (rd.ok) setDepenses(await rd.json());
      if (rs.ok) setSummary(await rs.json());
    } catch (err) {
      console.error("Finance load error:", err);
      toast("Erreur lors du chargement des finances", "error");
    } finally {
      setLoading(false);
    }
  }, [hive.id, toast]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast('Montant invalide', 'warning'); return; }
    const res = await beeApi.createExpense({
      ...form,
      hive_id: hive.id,
      amount: parseFloat(form.amount),
      amount_planned: form.amount_planned ? parseFloat(form.amount_planned) : null,
    });
    if (res.ok) {
      toast('Dépense enregistrée'); load();
      setForm({ category: 'Alimentation', amount: '', amount_planned: '', expense_date: new Date().toISOString().split('T')[0], description: '' });
      setShowForm(false);
    } else toast('Erreur enregistrement', 'error');
  };

  const deleteDepense = async (id) => {
    await beeApi.deleteExpense(id);
    load(); toast('Supprimée', 'warning');
  };

  if (loading) return <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: 40 }}>Chargement…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 18 }}>Finance & Dépenses</div>
        <button onClick={() => setShowForm(s => !s)}
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, color: 'white', border: 'none', padding: '9px 18px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
          <Plus size={14} /> Ajouter Dépense
        </button>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          {[
            { label: 'TOTAL RÉEL', value: `${summary.total_expenses.toFixed(0)} TND`, color: COLORS.error },
            { label: 'TOTAL PRÉVU', value: summary.total_planned > 0 ? `${summary.total_planned.toFixed(0)} TND` : '— TND', color: COLORS.info },
            { label: 'ÉCART', value: summary.ecart != null ? `${summary.ecart > 0 ? '+' : ''}${summary.ecart.toFixed(0)} TND` : '— TND', color: summary.ecart > 0 ? COLORS.error : COLORS.gradeA },
            { label: 'MIEL PRODUIT', value: `${summary.total_honey_kg.toFixed(1)} kg`, color: COLORS.accent },
          ].map(k => (
            <div key={k.label} style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: '14px 16px' }}>
              <div style={{ color: COLORS.textMuted, fontSize: 9, fontWeight: 800, letterSpacing: '1px' }}>{k.label}</div>
              <div style={{ color: k.color, fontWeight: 900, fontSize: 18, marginTop: 4 }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {summary?.by_category && Object.keys(summary.by_category).length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(summary.by_category).map(([cat, total]) => (
            <div key={cat} style={{ padding: '6px 12px', borderRadius: 10, background: COLORS.accent + '10', border: `1px solid ${COLORS.border}` }}>
              <span style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 700 }}>{cat} </span>
              <span style={{ color: COLORS.accent, fontWeight: 800, fontSize: 12 }}>{total.toFixed(0)} TND</span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Section title="Nouvelle dépense" icon={Wallet}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>CATÉGORIE</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputSt}>
                {DEPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>MONTANT RÉEL (TND) *</label>
              <input type="number" min="0" step="0.1" placeholder="0.00" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inputSt} />
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>MONTANT PRÉVU (TND)</label>
              <input type="number" min="0" step="0.1" placeholder="0.00" value={form.amount_planned}
                onChange={e => setForm(f => ({ ...f, amount_planned: e.target.value }))} style={{ ...inputSt, borderColor: COLORS.info + '50' }} />
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>DATE</label>
              <input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} style={inputSt} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="text" placeholder="Description…" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ ...inputSt, flex: 1 }} />
            <button onClick={handleSubmit}
              style={{ height: 44, padding: '0 22px', borderRadius: 12, background: COLORS.accent, border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Enregistrer
            </button>
          </div>
        </Section>
      )}

      {depenses.length === 0 ? (
        <div style={{ height: 140, background: 'rgba(0,0,0,0.03)', border: `2px dashed ${COLORS.border}`, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: COLORS.textMuted }}>
          <Wallet size={34} strokeWidth={1} style={{ opacity: 0.4 }} />
          <div style={{ fontWeight: 600, fontSize: 13 }}>Aucune dépense enregistrée</div>
        </div>
      ) : (
        <div style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.04)' }}>
                {['CATÉGORIE', 'RÉEL', 'PRÉVU', 'DATE', 'DESCRIPTION', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: COLORS.textMuted, fontSize: 9, fontWeight: 800, letterSpacing: '1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depenses.map(d => (
                <tr key={d.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '3px 9px', borderRadius: 7, background: COLORS.accent + '15', color: COLORS.accent, fontSize: 10, fontWeight: 800 }}>{d.category}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: COLORS.error, fontWeight: 800 }}>{d.amount.toFixed(2)} TND</td>
                  <td style={{ padding: '10px 14px', color: d.amount_planned ? COLORS.info : COLORS.textMuted, fontSize: 12, fontWeight: d.amount_planned ? 700 : 400 }}>{d.amount_planned ? `${d.amount_planned.toFixed(2)} TND` : '—'}</td>
                  <td style={{ padding: '10px 14px', color: COLORS.textMuted, fontSize: 12 }}>{d.expense_date}</td>
                  <td style={{ padding: '10px 14px', color: COLORS.textMuted, fontSize: 12 }}>{d.description || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => deleteDepense(d.id)}
                      style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(239,68,68,0.1)', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={11} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
