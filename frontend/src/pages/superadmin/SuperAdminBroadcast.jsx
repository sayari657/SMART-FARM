import React, { useEffect, useState } from 'react';
import { Radio, Send, Trash2, RefreshCw, Users, Building2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const C = { bg: '#0a0e14', card: '#0d1520', border: '#1a2535', muted: '#4b6380', text: '#e2e8f0', purple: '#7c3aed' };

const TARGET_OPTS = [
  { value: 'all',    label: 'Tous les utilisateurs', icon: Radio,     color: C.purple },
  { value: 'owner',  label: 'Propriétaires seulement', icon: Building2, color: '#22c55e' },
  { value: 'worker', label: 'Ouvriers seulement',    icon: Users,     color: '#06b6d4' },
];

export default function SuperAdminBroadcast() {
  const [broadcasts, setBroadcasts] = useState({ items: [], total: 0 });
  const [form, setForm] = useState({ title: '', body: '', target: 'all' });
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/superadmin/broadcasts');
      setBroadcasts(data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!form.title.trim() || !form.body.trim()) return toast.error('Titre et message requis');
    setSending(true);
    try {
      await api.post('/superadmin/broadcasts', form);
      toast.success('Message diffusé');
      setForm({ title: '', body: '', target: 'all' });
      load();
    } catch { toast.error('Erreur envoi'); }
    finally { setSending(false); }
  };

  const del = async (id) => {
    if (!confirm('Supprimer ce broadcast ?')) return;
    try {
      await api.delete(`/superadmin/broadcasts/${id}`);
      toast.success('Supprimé');
      load();
    } catch {}
  };

  const TARGET_COLORS = { all: C.purple, owner: '#22c55e', worker: '#06b6d4' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
      {/* Compose */}
      <div>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Broadcast</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Envoyer un message à tous les utilisateurs</p>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Destinataires</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {TARGET_OPTS.map(({ value, label, icon: Icon, color }) => (
                <button key={value} onClick={() => setForm(f => ({ ...f, target: value }))}
                  style={{ flex: 1, padding: '10px 8px', borderRadius: 8, border: `1px solid ${form.target === value ? color : C.border}`, background: form.target === value ? `${color}18` : 'transparent', color: form.target === value ? color : C.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Titre *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Maintenance planifiée ce soir"
              style={{ width: '100%', padding: '9px 12px', background: C.bg, border: `1px solid #2a3a50`, borderRadius: 8, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Message *</label>
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Détails du message…" rows={4}
              style={{ width: '100%', padding: '9px 12px', background: C.bg, border: `1px solid #2a3a50`, borderRadius: 8, color: C.text, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>

          <button onClick={send} disabled={sending}
            style={{ width: '100%', padding: '11px', background: C.purple, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: sending ? 0.7 : 1 }}>
            <Send size={15} /> {sending ? 'Envoi…' : 'Diffuser le message'}
          </button>

          <div style={{ marginTop: 12, padding: '10px 14px', background: C.bg, borderRadius: 8, fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
            Les messages sont visibles dans la PWA worker et le dashboard owner lors du prochain rafraîchissement.
            L'endpoint public : <code style={{ color: C.purple }}>/api/v1/superadmin/broadcasts/public/owner</code>
          </div>
        </div>
      </div>

      {/* History */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>Historique ({broadcasts.total})</h2>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, color: C.muted, cursor: 'pointer', fontSize: 12 }}>
            <RefreshCw size={12} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {broadcasts.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted, fontSize: 13 }}>Aucun broadcast envoyé</div>
          ) : broadcasts.items.map(b => (
            <div key={b.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, marginRight: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{b.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: TARGET_COLORS[b.target] || C.muted, background: `${TARGET_COLORS[b.target] || C.muted}20`, padding: '1px 7px', borderRadius: 5, textTransform: 'uppercase' }}>{b.target}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{b.body}</div>
                  <div style={{ fontSize: 10, color: '#334155', marginTop: 6 }}>
                    {b.created_at ? new Date(b.created_at).toLocaleString('fr-FR') : '—'}
                  </div>
                </div>
                <button onClick={() => del(b.id)}
                  style={{ padding: 6, background: '#ef444418', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#ef4444', display: 'flex', flexShrink: 0 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
