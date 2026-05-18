import { useState, useCallback, useEffect } from 'react';
import { Droplets, Plus, Activity, TrendingUp, Calendar, Trash2 } from 'lucide-react';
import { COLORS } from './BeeConstants';
import { beeApi } from '../../services/beeApi';
import { Section, inputSt } from './HiveShared.jsx';

export default function RecolteTab({ hive, toast }) {
  const [prods, setProds]   = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ production_date: new Date().toISOString().split('T')[0], honey_kg: 0, pollen_kg: 0, quality_notes: '', flower_type: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [rp, rv] = await Promise.all([
      beeApi.getProductionsByHive(hive.id),
      beeApi.getVisitsByHive(hive.id, 100),
    ]);
    if (rp.ok) setProds(await rp.json());
    if (rv.ok) setVisits(await rv.json());
    setLoading(false);
  }, [hive.id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    const res = await beeApi.createProduction({
      ...form, hive_id: hive.id, apiary_id: hive.apiary_id,
      honey_kg: parseFloat(form.honey_kg) || 0, pollen_kg: parseFloat(form.pollen_kg) || 0,
    });
    if (res.ok) {
      toast('Récolte enregistrée'); load();
      setForm({ production_date: new Date().toISOString().split('T')[0], honey_kg: 0, pollen_kg: 0, quality_notes: '', flower_type: '' });
      setShowForm(false);
    } else toast('Erreur enregistrement récolte', 'error');
  };

  const deleteProd = async (id) => {
    await beeApi.deleteProduction(id);
    load(); toast('Supprimée', 'warning');
  };

  const totalHoney  = [...prods, ...visits.filter(v => v.harvest_kg > 0)].reduce((s, x) => s + (x.honey_kg || x.harvest_kg || 0), 0);
  const totalPollen = [...prods, ...visits.filter(v => v.pollen_kg > 0)].reduce((s, x) => s + (x.pollen_kg || 0), 0);
  const visitHarvest = visits.reduce((s, v) => s + (v.harvest_kg || 0), 0);

  if (loading) return <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: 40 }}>Chargement…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 18 }}>Récoltes</div>
        <button onClick={() => setShowForm(s => !s)}
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, color: 'white', border: 'none', padding: '9px 18px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
          <Plus size={14} /> Enregistrer Récolte
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {[
          { label: 'Miel total (ruche)', value: `${totalHoney.toFixed(1)} kg`, color: COLORS.accent, icon: Droplets },
          { label: 'Pollen total', value: `${totalPollen.toFixed(1)} kg`, color: COLORS.success, icon: Activity },
          { label: 'Miel inspections', value: `${visitHarvest.toFixed(1)} kg`, color: COLORS.info, icon: TrendingUp },
        ].map(k => (
          <div key={k.label} style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
              <k.icon size={14} color={k.color} />
              <span style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 700 }}>{k.label}</span>
            </div>
            <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 20 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <Section title="Nouvelle récolte (ruche)" icon={Droplets}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>DATE</label>
              <input type="date" value={form.production_date} onChange={e => setForm(f => ({ ...f, production_date: e.target.value }))} style={inputSt} />
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>MIEL (kg)</label>
              <input type="number" min="0" step="0.1" value={form.honey_kg} onChange={e => setForm(f => ({ ...f, honey_kg: e.target.value }))} style={inputSt} />
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>POLLEN (kg)</label>
              <input type="number" min="0" step="0.1" value={form.pollen_kg} onChange={e => setForm(f => ({ ...f, pollen_kg: e.target.value }))} style={inputSt} />
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>FLEUR</label>
              <input type="text" placeholder="Oranger, Thym…" value={form.flower_type} onChange={e => setForm(f => ({ ...f, flower_type: e.target.value }))} style={inputSt} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <input type="text" placeholder="Notes qualité…" value={form.quality_notes} onChange={e => setForm(f => ({ ...f, quality_notes: e.target.value }))} style={{ ...inputSt, flex: 1 }} />
            <button onClick={handleSubmit}
              style={{ height: 44, padding: '0 22px', borderRadius: 12, background: COLORS.accent, border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Enregistrer
            </button>
          </div>
        </Section>
      )}

      {prods.length > 0 && (
        <Section title="Productions enregistrées (ruche)" icon={TrendingUp}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {prods.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderRadius: 11, background: 'rgba(0,0,0,0.03)', border: `1px solid ${COLORS.border}` }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{p.production_date}</span>
                  {p.flower_type && <span style={{ fontSize: 10, color: COLORS.success, background: COLORS.success + '15', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>{p.flower_type}</span>}
                </div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <span style={{ color: COLORS.accent, fontWeight: 800 }}>{p.honey_kg}kg miel</span>
                  {p.pollen_kg > 0 && <span style={{ color: COLORS.success, fontWeight: 700 }}>{p.pollen_kg}kg pollen</span>}
                  <button onClick={() => deleteProd(p.id)}
                    style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(239,68,68,0.1)', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {visits.filter(v => v.harvest_kg > 0).length > 0 && (
        <Section title="Récoltes par inspection" icon={Calendar}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {visits.filter(v => v.harvest_kg > 0 || v.pollen_kg > 0).map(v => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 11, background: 'rgba(0,0,0,0.03)', border: `1px solid ${COLORS.border}` }}>
                <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{v.visit_date}</span>
                <div style={{ display: 'flex', gap: 12 }}>
                  {v.harvest_kg > 0 && <span style={{ color: COLORS.accent, fontWeight: 800, fontSize: 13 }}>🍯 {v.harvest_kg}kg</span>}
                  {v.pollen_kg > 0 && <span style={{ color: COLORS.success, fontWeight: 800, fontSize: 13 }}>🌼 {v.pollen_kg}kg</span>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
