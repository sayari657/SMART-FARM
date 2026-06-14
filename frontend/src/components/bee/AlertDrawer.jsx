/**
 * AlertDrawer — right-side panel listing active bee alerts, opened from the
 * header bell. Lets the owner dispatch the alerts to the farm owner AND the
 * assigned workers at once (WhatsApp + push) via /alerts/notify (target=all).
 */
import { useMemo, useState } from 'react';
import { X, Bell, Send, AlertTriangle } from 'lucide-react';
import { alertsAPI } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';
import toast from 'react-hot-toast';

const URGENT = new Set(['urgent', 'critique', 'critical', 'malade', 'treatment']);

export default function AlertDrawer({ open, onClose, ruches = [], visites = [], farmId }) {
  const [sending, setSending] = useState(false);

  const alerts = useMemo(() => ([
    ...ruches
      .filter(r => (r.health_score ?? 10) < 4)
      .map(r => ({ key: `h-${r.id}`, icon: '🔶', label: r.identifier || `Ruche ${r.id}`,
                   reason: `Santé critique (${(r.health_score ?? 0).toFixed(1)}/10)` })),
    ...visites
      .filter(v => URGENT.has(String(v.health_state || '').toLowerCase()))
      .slice(0, 20)
      .map(v => ({ key: `v-${v.id}`, icon: '🔴',
                   label: v.visit_name || v.identifier || `Inspection ${v.visit_date || ''}`.trim(),
                   reason: v.notes ? `Urgent — ${v.notes}` : 'Inspection signalée urgente' })),
  ]), [ruches, visites]);

  const dispatch = async () => {
    if (!farmId) { toast.error('Sélectionnez une ferme'); return; }
    if (!alerts.length) { toast('Aucune alerte à envoyer'); return; }
    setSending(true);
    const title = `${alerts.length} alerte${alerts.length > 1 ? 's' : ''} rucher`;
    const message = alerts.map(a => `• ${a.label} — ${a.reason}`).join('\n');
    try {
      const { data } = await alertsAPI.notify(farmId, title, message, 'all');
      const r = data.recipients || 0;
      if (r === 0) toast('Aucun destinataire (propriétaire/ouvriers)');
      else toast.success(`Notifié ${r} destinataire${r > 1 ? 's' : ''} (propriétaire + ouvriers)`
        + (data.email_sent ? ` · ${data.email_sent} e-mail` : '')
        + (data.whatsapp_sent ? ` · ${data.whatsapp_sent} WhatsApp` : '')
        + (data.results?.some(x => x.push_devices > 0) ? ' · push' : ''));
    } catch (e) {
      toast.error(getErrorMessage(e, "Échec de l'envoi"));
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;
  return (
    <>
      {/* overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000 }} />
      {/* panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 92vw)', zIndex: 1001,
        background: '#fff', boxShadow: '-8px 0 30px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column',
        animation: 'slideIn .25s ease', }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* header */}
        <div style={{ padding: '18px 20px', background: 'linear-gradient(135deg,#dc2626,#ea580c)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={20} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Alertes actives</div>
              <div style={{ fontSize: 11, opacity: .85 }}>{alerts.length} alerte{alerts.length > 1 ? 's' : ''}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
              <AlertTriangle size={36} style={{ opacity: .3 }} />
              <p style={{ marginTop: 10, fontWeight: 600 }}>Aucune alerte active</p>
              <p style={{ fontSize: 12 }}>Toutes les ruches sont saines.</p>
            </div>
          ) : alerts.map(a => (
            <div key={a.key} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 12,
              background: '#fef2f2', border: '1px solid #fecaca' }}>
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{a.label}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{a.reason}</div>
              </div>
            </div>
          ))}
        </div>

        {/* dispatch footer */}
        {alerts.length > 0 && (
          <div style={{ padding: 16, borderTop: '1px solid #e2e8f0' }}>
            <button onClick={dispatch} disabled={sending} style={{
              width: '100%', height: 48, borderRadius: 12, border: 'none', cursor: sending ? 'wait' : 'pointer',
              background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 800, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: sending ? .6 : 1 }}>
              <Send size={16} /> {sending ? 'Envoi…' : 'Notifier propriétaire + ouvriers'}
            </button>
            <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
              Envoie au propriétaire et aux ouvriers de la ferme par e-mail + WhatsApp + notification push.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
