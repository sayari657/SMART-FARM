import React, { useEffect, useState } from 'react';
import { Brain, RefreshCw, ExternalLink, CheckCircle, Database, FlaskConical } from 'lucide-react';
import api from '../../services/api';

const C = { bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0', muted: '#64748b', text: '#1e293b', purple: '#7c3aed' };

const STAGE_COLORS = { Production: '#22c55e', Staging: '#f59e0b', Archived: '#ef4444', None: '#475569' };

const EXP_COLORS = {
  'SmartFarm_Animal_Detection': '#06b6d4',
  'SmartFarm_Plant_Detection':  '#22c55e',
  'SmartFarm_Alert_Detection':  '#ef4444',
  'SmartFarm_Poultry_ML':       '#f59e0b',
  'Farm_Anomaly_Detection':     C.purple,
};

function ModelCard({ name, version, stage, run_id, created_at }) {
  const stageColor = STAGE_COLORS[stage] || '#475569';
  const category = name.split('_')[0];
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.3, flex: 1, marginRight: 8 }}>{name}</div>
        <span style={{ fontSize: 10, fontWeight: 700, color: stageColor, background: `${stageColor}20`, padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase', flexShrink: 0 }}>{stage || 'None'}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <span style={{ fontSize: 10, color: C.muted }}>v{version || '1'}</span>
        {run_id && <span style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>{run_id?.slice(0, 8)}…</span>}
      </div>
      {created_at && <div style={{ fontSize: 10, color: '#334155' }}>{new Date(created_at).toLocaleDateString('fr-FR')}</div>}
    </div>
  );
}

export default function SuperAdminModels() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeExp, setActiveExp] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/superadmin/ai-models');
      setData(d);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const byExperiment = {};
  if (data?.models) {
    data.models.forEach(m => {
      const expId = m.run_id ? data.recent_runs?.find(r => r.id === m.run_id)?.experiment_id : null;
      const expName = expId != null ? data.experiments?.find(e => String(e.id) === String(expId))?.name : 'Other';
      const key = expName || 'Other';
      if (!byExperiment[key]) byExperiment[key] = [];
      byExperiment[key].push(m);
    });
  }

  const experiments = data?.experiments || [];
  const filteredModels = activeExp
    ? data?.models?.filter(m => {
        const r = data.recent_runs?.find(r => r.id === m.run_id);
        const exp = r ? data.experiments?.find(e => String(e.id) === String(r.experiment_id)) : null;
        return exp?.name === activeExp;
      }) || []
    : data?.models || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Modèles AI — MLflow</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            {data?.total_models || 0} modèles enregistrés · {data?.total_experiments || 0} expériences
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="http://localhost:5000" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: `${C.purple}20`, border: `1px solid ${C.purple}44`, borderRadius: 8, color: C.purple, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <ExternalLink size={13} /> Ouvrir MLflow
          </a>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontSize: 13 }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { icon: Brain, label: 'Modèles enregistrés', value: data?.total_models, color: C.purple },
          { icon: FlaskConical, label: 'Expériences', value: data?.total_experiments, color: '#06b6d4' },
          { icon: CheckCircle, label: 'En Production', value: data?.models?.filter(m => m.stage === 'Production').length, color: '#22c55e' },
          { icon: Database, label: 'Runs récents', value: data?.recent_runs?.length, color: '#f59e0b' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: `${color}20`, borderRadius: 8, padding: 8 }}><Icon size={16} color={color} /></div>
            <div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{value ?? '—'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Experiment filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveExp(null)}
          style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${!activeExp ? C.purple : C.border}`, background: !activeExp ? `${C.purple}20` : 'transparent', color: !activeExp ? C.text : C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Tous
        </button>
        {experiments.map(exp => (
          <button key={exp.id} onClick={() => setActiveExp(activeExp === exp.name ? null : exp.name)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${activeExp === exp.name ? (EXP_COLORS[exp.name] || C.purple) : C.border}`, background: activeExp === exp.name ? `${EXP_COLORS[exp.name] || C.purple}20` : 'transparent', color: activeExp === exp.name ? C.text : C.muted, fontSize: 12, cursor: 'pointer' }}>
            {exp.name.replace('SmartFarm_', '')}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Chargement depuis MLflow…</div>
      ) : data?.error ? (
        <div style={{ background: '#ef444418', border: '1px solid #ef444433', borderRadius: 10, padding: '16px 20px', color: '#ef4444', fontSize: 13 }}>
          Erreur MLflow : {data.error}. Assurez-vous que MLflow UI tourne sur :5000.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {filteredModels.map((m, i) => (
            <ModelCard key={`${m.name}-${i}`} {...m} />
          ))}
          {filteredModels.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: C.muted }}>Aucun modèle trouvé</div>
          )}
        </div>
      )}
    </div>
  );
}
