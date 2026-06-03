import React, { useEffect, useState } from 'react';
import { Cpu, Database, Wifi, RefreshCw, Send, AlertTriangle, CheckCircle, Download, HardDrive } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const C = { bg: '#0a0e14', card: '#0d1520', border: '#1a2535', muted: '#4b6380', text: '#e2e8f0', purple: '#7c3aed' };
const CARD = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 18 };
const INPUT = { width: '100%', padding: '9px 12px', background: C.bg, border: `1px solid #2a3a50`, borderRadius: 8, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' };

function StatusChip({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: ok ? '#22c55e18' : '#ef444418', border: `1px solid ${ok ? '#22c55e33' : '#ef444433'}`, borderRadius: 8 }}>
      {ok ? <CheckCircle size={14} color="#22c55e" /> : <AlertTriangle size={14} color="#ef4444" />}
      <span style={{ fontSize: 12, fontWeight: 600, color: ok ? '#22c55e' : '#ef4444' }}>{label}</span>
    </div>
  );
}

export default function SuperAdminSystem() {
  const [health, setHealth]         = useState(null);
  const [pwa, setPwa]               = useState(null);
  const [newVer, setNewVer]         = useState('');
  const [changelog, setChangelog]   = useState('');
  const [forceReload, setForceReload] = useState(false);
  const [pushing, setPushing]       = useState(false);
  const [backing, setBacking]       = useState(false);

  const loadHealth = async () => {
    try {
      const [h, v] = await Promise.all([
        api.get('/superadmin/system/health'),
        api.get('/superadmin/pwa/version'),
      ]);
      setHealth(h.data);
      setPwa(v.data);
      setNewVer(v.data.version);
    } catch { toast.error('Erreur système'); }
  };

  useEffect(() => { loadHealth(); }, []);

  const pushVersion = async () => {
    if (!newVer.trim()) return toast.error('Entrez un numéro de version');
    setPushing(true);
    try {
      await api.post('/superadmin/pwa/version', { version: newVer.trim(), changelog: changelog.trim(), force: forceReload });
      toast.success(`Version ${newVer} déployée${forceReload ? ' (rechargement forcé)' : ''}`);
      setChangelog('');
      loadHealth();
    } catch { toast.error('Erreur déploiement'); }
    finally { setPushing(false); }
  };

  const backupDB = async () => {
    setBacking(true);
    try {
      const response = await api.post('/superadmin/system/backup', {}, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartfarm_backup_${new Date().toISOString().slice(0,10)}.db`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup téléchargé');
    } catch { toast.error('Erreur backup'); }
    finally { setBacking(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Système & Maintenance</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Santé de la plateforme, PWA et base de données</p>
        </div>
        <button onClick={loadHealth} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontSize: 13 }}>
          <RefreshCw size={13} /> Vérifier
        </button>
      </div>

      {/* Status grid */}
      <div style={CARD}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, marginBottom: 14, textTransform: 'uppercase' }}>Statut services</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <StatusChip ok={health?.database === 'ok'} label={`Base de données ${health?.database === 'ok' ? '— OK' : '— ERREUR'}`} />
          <StatusChip ok={health?.api === 'ok'} label="API FastAPI — OK" />
          <StatusChip ok={!!health?.pwa_version} label={`PWA v${health?.pwa_version || '?'}`} />
          {health?.maintenance_mode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: '#f59e0b18', border: '1px solid #f59e0b33', borderRadius: 8 }}>
              <AlertTriangle size={14} color="#f59e0b" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>MAINTENANCE MODE</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 12, color: C.muted }}>
          {health?.db_size_mb !== undefined && (
            <span><HardDrive size={12} style={{ marginRight: 4 }} />DB : {health.db_size_mb} Mo</span>
          )}
          {health?.total_audit_logs !== undefined && (
            <span>Audit : {health.total_audit_logs} actions</span>
          )}
          {health?.server_time && (
            <span>Serveur : {new Date(health.server_time).toLocaleString('fr-FR')}</span>
          )}
        </div>
      </div>

      {/* PWA Version */}
      <div style={CARD}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>Contrôle version PWA</div>
        <p style={{ fontSize: 12, color: '#334155', marginBottom: 16, lineHeight: 1.5 }}>
          Publiez une nouvelle version. Les ouvriers verront un banner "Mise à jour disponible".
          Avec <span style={{ color: '#ef4444', fontWeight: 600 }}>Rechargement forcé</span>, la PWA se recharge automatiquement.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Version actuelle</label>
            <div style={{ padding: '10px 14px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 18, fontWeight: 800, color: '#22c55e' }}>
              v{pwa?.version || '—'}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Nouvelle version</label>
            <input value={newVer} onChange={e => setNewVer(e.target.value)} placeholder="ex: 3.1.0" style={INPUT} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Changelog</label>
          <textarea value={changelog} onChange={e => setChangelog(e.target.value)} placeholder="Nouveautés de cette version…" rows={3}
            style={{ ...INPUT, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: forceReload ? '#ef4444' : C.muted }}>
            <input type="checkbox" checked={forceReload} onChange={e => setForceReload(e.target.checked)} style={{ accentColor: '#ef4444', width: 15, height: 15 }} />
            Rechargement forcé (tous les clients)
          </label>
          <button onClick={pushVersion} disabled={pushing}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: C.purple, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: pushing ? 'not-allowed' : 'pointer', opacity: pushing ? 0.6 : 1 }}>
            <Send size={14} /> {pushing ? 'Déploiement…' : 'Déployer'}
          </button>
        </div>
        {pwa?.updated_at && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: C.bg, borderRadius: 8, fontSize: 11, color: C.muted, display: 'flex', gap: 16 }}>
            <span>Déployée le : {new Date(pwa.updated_at).toLocaleString('fr-FR')}</span>
            <span>Force reload : <span style={{ color: pwa.force ? '#ef4444' : '#22c55e' }}>{pwa.force ? 'Oui' : 'Non'}</span></span>
          </div>
        )}
      </div>

      {/* DB Backup */}
      <div style={CARD}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>Sauvegarde Base de Données</div>
        <p style={{ fontSize: 12, color: '#334155', marginBottom: 14, lineHeight: 1.5 }}>
          Téléchargez une copie complète de la base de données SQLite incluant tous les tenants, fermes, animaux et données IoT.
        </p>
        <button onClick={backupDB} disabled={backing}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: '#22c55e', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: backing ? 'not-allowed' : 'pointer', opacity: backing ? 0.6 : 1 }}>
          <Download size={14} /> {backing ? 'Préparation…' : 'Télécharger le backup'}
        </button>
      </div>
    </div>
  );
}
