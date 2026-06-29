import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const C = { bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0', muted: '#64748b', text: '#1e293b', purple: '#7c3aed' };

const FLAG_META = {
  cv_monitoring:       { label: 'CV Monitoring (YOLO)', desc: 'Détection animaux/maladies par caméra', group: 'Modules IA' },
  ai_recommendations:  { label: 'Recommandations IA',  desc: 'Suggestions intelligentes basées sur télémétrie', group: 'Modules IA' },
  sovereign_assistant: { label: 'Assistant Souverain',  desc: 'Chatbot IA avec Ollama/Groq', group: 'Modules IA' },
  telemetry_realtime:  { label: 'Télémétrie temps-réel', desc: 'MQTT streaming de capteurs IoT', group: 'Données' },
  export_pdf:          { label: 'Export PDF',           desc: 'Génération rapports PDF', group: 'Données' },
  export_excel:        { label: 'Export Excel',         desc: 'Export tableaux Excel/CSV', group: 'Données' },
  map_center:          { label: 'Map Center',           desc: 'Cartographie GIS des fermes', group: 'Données' },
  pwa_worker_app:      { label: 'PWA Ouvrier',          desc: 'Application mobile ouvriers', group: 'Apps' },
  bee_module:          { label: 'Module Apiculture',    desc: 'Gestion ruches et productions miel', group: 'Modules Métier' },
  poultry_module:      { label: 'Module Volaille',      desc: 'ERP élevage volailles (FCR, santé)', group: 'Modules Métier' },
  plantation_module:   { label: 'Module Plantations',  desc: 'Suivi cultures et arbres', group: 'Modules Métier' },
  maintenance_mode:    { label: '🔴 Mode Maintenance',  desc: 'Bloque tous les logins non-superadmin', group: 'Système', danger: true },
};

function Toggle({ checked, onChange, danger }) {
  return (
    <div onClick={onChange} style={{ width: 42, height: 22, background: checked ? (danger ? '#ef4444' : C.purple) : '#cbd5e1', borderRadius: 11, position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: checked ? 22 : 3, width: 16, height: 16, background: '#fff', borderRadius: '50%', transition: 'left .2s' }} />
    </div>
  );
}

export default function SuperAdminFlags() {
  const [flags, setFlags] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/superadmin/flags');
      setFlags(data);
      setDirty(false);
    } catch { toast.error('Erreur chargement flags'); }
  };

  useEffect(() => { load(); }, []);

  const toggle = (key) => {
    setFlags(f => ({ ...f, [key]: !f[key] }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/superadmin/flags', { flags });
      toast.success('Feature flags sauvegardés');
      setDirty(false);
    } catch { toast.error('Erreur sauvegarde'); }
    finally { setSaving(false); }
  };

  // Group flags
  const groups = {};
  Object.entries(FLAG_META).forEach(([key, meta]) => {
    if (!groups[meta.group]) groups[meta.group] = [];
    groups[meta.group].push({ key, ...meta, value: flags[key] ?? true });
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Feature Flags</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Activer/désactiver les fonctionnalités en temps réel</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ padding: '9px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, color: '#64748b', cursor: 'pointer', fontSize: 13 }}>
            <RefreshCw size={13} />
          </button>
          <button onClick={save} disabled={!dirty || saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: dirty ? C.purple : '#e2e8f0', border: 'none', borderRadius: 8, color: dirty ? '#fff' : '#64748b', fontSize: 13, fontWeight: 600, cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty ? 1 : 0.5 }}>
            <Save size={13} /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {flags.maintenance_mode && (
        <div style={{ background: '#ef444418', border: '1px solid #ef444433', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
          <AlertTriangle size={16} /> MODE MAINTENANCE ACTIF — Tous les logins non-superadmin sont bloqués
        </div>
      )}

      {Object.entries(groups).map(([group, items]) => (
        <div key={group} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>{group}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {items.map(({ key, label, desc, value, danger }, i) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < items.length - 1 ? `1px solid ${C.border}55` : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: danger ? '#ef4444' : C.text }}>{label}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{desc}</div>
                </div>
                <Toggle checked={!!value} onChange={() => toggle(key)} danger={danger} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {dirty && (
        <div style={{ position: 'fixed', bottom: 24, right: 32, background: C.purple, padding: '12px 20px', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: '#fff', fontWeight: 600, boxShadow: '0 8px 32px #7c3aed44' }}>
          Modifications non sauvegardées
          <button onClick={save} style={{ background: '#fff', color: C.purple, border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Sauvegarder
          </button>
        </div>
      )}
    </div>
  );
}
