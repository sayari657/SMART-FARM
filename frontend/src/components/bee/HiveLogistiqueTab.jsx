import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Package, Activity, Boxes } from 'lucide-react';
import { COLORS } from './BeeConstants';
import { beeApi } from '../../services/beeApi';
import { Section, StepperInput } from './HiveShared.jsx';

export default function LogistiqueTab({ hive, toast }) {
  const [stock, setStock]     = useState(null);
  const [visites, setVisites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replenish, setReplenish] = useState({ sirop: 0, pate: 0, traitement: 0, cadres: 0 });
  const [showReplenish, setShowReplenish] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rs, rv] = await Promise.all([
      beeApi.getHiveStock(hive.id),
      beeApi.getVisitsByHive(hive.id, 20),
    ]);
    if (rs.ok) setStock(await rs.json());
    if (rv.ok) setVisites(await rv.json());
    setLoading(false);
  }, [hive.id]);

  useEffect(() => { load(); }, [load]);

  const handleReplenish = async () => {
    const res = await beeApi.replenishHiveStock(hive.id, replenish);
    if (res.ok) {
      const data = await res.json();
      setStock(data.hive_stock);
      if (data.global_alerts?.length) data.global_alerts.forEach(a => toast(a, 'warning'));
      toast('Stock ruche réapprovisionné', 'success');
      setShowReplenish(false);
      setReplenish({ sirop: 0, pate: 0, traitement: 0, cadres: 0 });
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.detail || 'Erreur réapprovisionnement', 'error');
    }
  };

  const totals = visites.reduce((acc, v) => ({
    sirop: acc.sirop + (v.needs_sirop || 0),
    pate:  acc.pate  + (v.needs_pate  || 0),
    traitement: acc.traitement + (v.needs_traitement || 0),
  }), { sirop: 0, pate: 0, traitement: 0 });

  const last = visites[0];

  if (loading) return <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: 40 }}>Chargement…</div>;

  const stockItems = [
    { key: 'sirop',      label: 'Sirop',      unit: 'L',       color: COLORS.info,    min: stock?.sirop_min || 2 },
    { key: 'pate',       label: 'Pâte',       unit: 'kg',      color: COLORS.success, min: stock?.pate_min || 1 },
    { key: 'traitement', label: 'Traitement', unit: 'dose(s)', color: COLORS.error,   min: stock?.traitement_min || 1 },
    { key: 'cadres',     label: 'Cadres',     unit: '',        color: COLORS.accent,  min: 0 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 18 }}>Stock & Logistique</div>
        <button onClick={() => setShowReplenish(s => !s)}
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, color: 'white', border: 'none', padding: '9px 18px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
          <RefreshCw size={13} /> Réapprovisionner
        </button>
      </div>

      <Section title="Stock Ruche" icon={Package} color={COLORS.info}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {stockItems.map(item => {
            const val = stock?.[item.key] ?? 0;
            const low = val < item.min;
            return (
              <div key={item.key} style={{ padding: '14px 16px', borderRadius: 14,
                background: low ? COLORS.error + '0a' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${low ? COLORS.error + '40' : COLORS.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: item.color, fontSize: 11, fontWeight: 800 }}>{item.label}</span>
                  {low && <span style={{ fontSize: 9, color: COLORS.error, fontWeight: 800, background: COLORS.error + '20', padding: '2px 6px', borderRadius: 6 }}>BAS</span>}
                </div>
                <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 22 }}>
                  {typeof val === 'number' ? val.toFixed(item.key === 'sirop' || item.key === 'pate' ? 1 : 0) : val}
                  <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 4 }}>{item.unit}</span>
                </div>
                {item.min > 0 && (
                  <div style={{ height: 3, borderRadius: 3, background: 'rgba(0,0,0,0.08)', marginTop: 8 }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(100, (val / (item.min * 3)) * 100)}%`,
                      background: low ? COLORS.error : item.color }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {showReplenish && (
        <Section title="Réapprovisionnement depuis entrepôt" icon={RefreshCw} color={COLORS.success}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <StepperInput label="Sirop (L)" value={replenish.sirop} step={5}
              onChange={v => setReplenish(r => ({ ...r, sirop: v }))} color={COLORS.info} />
            <StepperInput label="Pâte (kg)" value={replenish.pate} step={1}
              onChange={v => setReplenish(r => ({ ...r, pate: v }))} color={COLORS.success} />
            <StepperInput label="Traitement" value={replenish.traitement}
              onChange={v => setReplenish(r => ({ ...r, traitement: v }))} color={COLORS.error} />
            <StepperInput label="Cadres" value={replenish.cadres}
              onChange={v => setReplenish(r => ({ ...r, cadres: v }))} color={COLORS.accent} />
            <button onClick={handleReplenish}
              style={{ height: 46, borderRadius: 12, background: `linear-gradient(135deg, ${COLORS.success}, #065f46)`, border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', marginTop: 4 }}>
              Transférer vers ruche
            </button>
          </div>
        </Section>
      )}

      <Section title="Consommation cumulée (toutes visites)" icon={Activity}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          {[
            { label: 'Sirop total', value: `${totals.sirop.toFixed(1)} L`, color: COLORS.info },
            { label: 'Pâte totale', value: `${totals.pate.toFixed(1)} kg`, color: COLORS.success },
            { label: 'Traitements', value: totals.traitement, color: COLORS.error },
          ].map(item => (
            <div key={item.label} style={{ padding: 14, borderRadius: 12, background: 'rgba(0,0,0,0.03)', border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
              <div style={{ color: item.color, fontWeight: 900, fontSize: 20 }}>{item.value}</div>
              <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 700, marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </Section>

      {last && (
        <Section title="Besoins estimés (dernière visite)" icon={Boxes}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Sirop sucré', val: last.needs_sirop, unit: 'L', color: COLORS.info },
              { label: 'Pâte protéinée', val: last.needs_pate, unit: 'kg', color: COLORS.success },
              { label: 'Traitement Varroa', val: last.needs_traitement, unit: 'app.', color: COLORS.error },
            ].map(n => (
              <div key={n.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderRadius: 11,
                background: n.val > 0 ? n.color + '0a' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${n.val > 0 ? n.color + '30' : COLORS.border}` }}>
                <span style={{ color: COLORS.text, fontWeight: 600, fontSize: 13 }}>{n.label}</span>
                <span style={{ color: n.val > 0 ? n.color : COLORS.textMuted, fontWeight: 800 }}>
                  {n.val > 0 ? `${n.val} ${n.unit} requis` : 'RAS'}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
