import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Send, Paperclip, X, MessagesSquare, Loader2 } from 'lucide-react';
import { chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#1F3864';
const GREEN = '#15803D';
const MAX_BYTES = 25 * 1024 * 1024; // 25 Mo

export default function Messages() {
  const { t } = useTranslation();
  const { user } = useAuth() || {};
  const myId = user?.id;

  const [farms, setFarms] = useState([]);
  const [farmId, setFarmId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [attach, setAttach] = useState(null);   // { b64, type, name }
  const [sending, setSending] = useState(false);

  const lastIdRef = useRef(0);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const scrollDown = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);

  // ── Charger la liste des fermes (conversations) ───────────────────────────
  useEffect(() => {
    chatAPI.farms()
      .then(({ data }) => {
        setFarms(data || []);
        if (data && data.length) setFarmId(data[0].id);
        else setLoading(false);
      })
      .catch(() => { setFarms([]); setLoading(false); });
  }, []);

  // ── Charger les messages de la ferme sélectionnée ─────────────────────────
  const loadAll = useCallback((fid) => {
    setLoading(true);
    chatAPI.list(fid, 0)
      .then(({ data }) => {
        setMessages(data || []);
        lastIdRef.current = data && data.length ? data[data.length - 1].id : 0;
        scrollDown();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (farmId == null) return;
    setMessages([]); lastIdRef.current = 0;
    loadAll(farmId);
  }, [farmId, loadAll]);

  // ── Polling temps quasi-réel (nouveaux messages uniquement) ───────────────
  useEffect(() => {
    if (farmId == null) return undefined;
    const tick = () => {
      chatAPI.list(farmId, lastIdRef.current)
        .then(({ data }) => {
          if (data && data.length) {
            setMessages((prev) => [...prev, ...data]);
            lastIdRef.current = data[data.length - 1].id;
            scrollDown();
          }
        })
        .catch(() => {});
    };
    const id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, [farmId]);

  // ── Pièce jointe (image / vidéo) ──────────────────────────────────────────
  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) { toast.error(t('chat.too_large', 'Fichier trop volumineux (max 25 Mo)')); return; }
    const isVideo = file.type.startsWith('video');
    const isImage = file.type.startsWith('image');
    if (!isVideo && !isImage) { toast.error(t('chat.bad_type', 'Image ou vidéo uniquement')); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAttach({ b64: ev.target.result, type: isVideo ? 'video' : 'image', name: file.name });
    reader.onerror = () => toast.error(t('chat.read_error', 'Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  };

  // ── Envoi ─────────────────────────────────────────────────────────────────
  const send = async () => {
    const body = text.trim();
    if ((!body && !attach) || sending || farmId == null) return;
    setSending(true);
    try {
      const payload = { farm_id: farmId, text: body || null };
      if (attach) { payload.attachment_b64 = attach.b64; payload.attachment_type = attach.type; payload.attachment_name = attach.name; }
      const { data } = await chatAPI.send(payload);
      setMessages((prev) => [...prev, data]);
      lastIdRef.current = data.id;
      setText(''); setAttach(null);
      scrollDown();
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('chat.send_error', 'Envoi impossible'));
    } finally {
      setSending(false);
    }
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const fmtTime = (iso) => { try { return new Date(iso).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }); } catch { return ''; } };

  // ── États vides ───────────────────────────────────────────────────────────
  if (!loading && farms.length === 0) {
    return (
      <div style={{ maxWidth: 760, margin: '40px auto', textAlign: 'center', color: 'var(--color-text-3,#64748b)' }}>
        <MessagesSquare size={48} color={GREEN} style={{ marginBottom: 12 }} />
        <h2 style={{ color: NAVY, margin: '0 0 8px' }}>{t('chat.title', 'Messagerie')}</h2>
        <p>{t('chat.no_farm', "Aucune conversation : vous n'êtes lié à aucune ferme pour le moment.")}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '8px 4px 0', display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 150px)', minHeight: 420 }}>
      {/* En-tête + sélecteur de ferme */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
          <MessagesSquare size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: NAVY }}>{t('chat.title', 'Messagerie')}</h2>
          <div style={{ fontSize: 11, color: 'var(--color-text-3,#64748b)' }}>{t('chat.subtitle', 'Propriétaire ↔ Ouvriers')}</div>
        </div>
        {farms.length > 1 && (
          <select value={farmId ?? ''} onChange={(e) => setFarmId(Number(e.target.value))}
                  style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 600, color: NAVY, background: '#fff', maxWidth: 200 }}>
            {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
      </div>

      {/* Fil de discussion */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--glass-bg,#f8fafc)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && messages.length === 0 ? (
          <div style={{ margin: 'auto', color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 size={18} className="animate-spin" /> {t('chat.loading', 'Chargement…')}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8' }}>
            <MessagesSquare size={40} style={{ marginBottom: 8, opacity: 0.5 }} />
            <div>{t('chat.empty', 'Aucun message. Démarrez la discussion 👇')}</div>
          </div>
        ) : messages.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '78%', background: mine ? GREEN : '#fff', color: mine ? '#fff' : '#1e293b', border: mine ? 'none' : '1px solid rgba(0,0,0,0.08)', borderRadius: 14, borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4, padding: '8px 11px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                {!mine && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 3 }}>
                    {m.sender_name || '—'}
                    <span style={{ fontSize: 9, fontWeight: 700, marginLeft: 6, padding: '1px 6px', borderRadius: 8, background: m.sender_role === 'worker' ? '#fef3c7' : '#dbeafe', color: m.sender_role === 'worker' ? '#92400e' : '#1e40af' }}>
                      {m.sender_role === 'worker' ? t('chat.role_worker', 'Ouvrier') : t('chat.role_owner', 'Propriétaire')}
                    </span>
                  </div>
                )}
                {m.attachment_b64 && m.attachment_type === 'image' && (
                  <img src={m.attachment_b64} alt={m.attachment_name || 'image'} style={{ maxWidth: '100%', borderRadius: 8, marginBottom: m.text ? 6 : 0, display: 'block' }} />
                )}
                {m.attachment_b64 && m.attachment_type === 'video' && (
                  <video src={m.attachment_b64} controls style={{ maxWidth: '100%', borderRadius: 8, marginBottom: m.text ? 6 : 0, display: 'block' }} />
                )}
                {m.text && <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</div>}
                <div style={{ fontSize: 9, opacity: 0.7, marginTop: 3, textAlign: 'right' }}>{fmtTime(m.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Aperçu pièce jointe */}
      {attach && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: 8, background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10 }}>
          {attach.type === 'image'
            ? <img src={attach.b64} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
            : <video src={attach.b64} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />}
          <span style={{ flex: 1, fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attach.name}</span>
          <button onClick={() => setAttach(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><X size={18} /></button>
        </div>
      )}

      {/* Composer */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 8, paddingBottom: 6 }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={onPickFile} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} title={t('chat.attach', 'Joindre image / vidéo')}
                style={{ width: 42, height: 42, borderRadius: 12, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: NAVY, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paperclip size={20} />
        </button>
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} rows={1}
                  placeholder={t('chat.placeholder', 'Écrivez un message…')}
                  style={{ flex: 1, resize: 'none', minHeight: 42, maxHeight: 120, padding: '11px 12px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.15)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
        <button onClick={send} disabled={sending || (!text.trim() && !attach)} title={t('chat.send', 'Envoyer')}
                style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: (sending || (!text.trim() && !attach)) ? '#94a3b8' : GREEN, color: '#fff', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
}
