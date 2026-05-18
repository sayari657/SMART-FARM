import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Bot, User, Sparkles, BookOpen, Mic, Volume2, MicOff,
  Plus, Trash2, MessageSquare, Paperclip, X, Loader2, Scan, Image as ImageIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { agentAPI, cvAPI } from '../services/api';

/* ─── Keyword → YOLO category ───────────────────────────── */
const KEYWORD_MAP = [
  { keys: ['ruche','abeille','miel','essaim','rayon','nid','néctar','pollen','apic'], cat: 'bee' },
  { keys: ['olive','olivier','oléic'],                                                cat: 'olive' },
  { keys: ['insecte','ravageur','punaise','criquet','chenille','coccinelle'],          cat: 'insects' },
  { keys: ['volaille','poulet','dinde','coq','poule'],                                cat: 'poultry' },
  { keys: ['vache','boeuf','bétail','bovin','taureau','mouton','chèvre','ovins'],     cat: 'livestock' },
  { keys: ['plante','feuille','culture','blé','maïs','soja','maladie','tâche'],       cat: 'leaves' },
];
const pickCategory = (text = '') => {
  const t = text.toLowerCase();
  for (const { keys, cat } of KEYWORD_MAP) {
    if (keys.some(k => t.includes(k))) return cat;
  }
  return ''; // general farm assistant by default
};

/* ─── Palette "Sovereign AI" — light enterprise theme ────── */
const S = {
  pageBg:      '#f1f5f9',
  sidebarBg:   '#ffffff',
  sideBorder:  '#e2e8f0',
  convActive:  '#dcfce7',
  convHover:   '#f8fafc',
  chatBg:      '#f8fafc',
  userBubble:  'linear-gradient(135deg,#16a34a,#15803d)',
  botBubble:   '#ffffff',
  botBorder:   '#e2e8f0',
  botText:     '#0f172a',
  userText:    '#ffffff',
  input:       '#ffffff',
  inputBorder: '#e2e8f0',
  accent:      '#16a34a',
  accentLight: '#15803d',
  accentGlow:  'rgba(22,163,74,0.2)',
  muted:       '#94a3b8',
  textDim:     '#94a3b8',
  success:     '#22c55e',
  warn:        '#f59e0b',
};

const STORAGE_KEY = 'sovereign_conversations';
const YOLO_TIMEOUT_MS = 2000; // hard cap — if detection takes longer, skip it

const loadConvs = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
};
const makeConv = () => ({
  id: Date.now(),
  title: 'Nouvelle discussion',
  createdAt: new Date().toISOString(),
  messages: [],
});

/* ─── Component ──────────────────────────────────────────── */
export default function SovereignAssistant() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [conversations, setConversations] = useState(() => {
    const saved = loadConvs();
    return saved.length ? saved : [makeConv()];
  });
  const [activeId, setActiveId] = useState(() => {
    const saved = loadConvs();
    return saved.length ? saved[0].id : null;
  });
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [elapsed, setElapsed]       = useState(0);
  const [lastQuery, setLastQuery]   = useState(null); // {input, image} for retry
  const [isLite, setIsLite]         = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const chatEndRef    = useRef(null);
  const fileInputRef  = useRef(null);
  const recognitionRef = useRef(null);
  const textareaRef   = useRef(null);
  const abortRef      = useRef(null); // AbortController for current request
  const elapsedTimer  = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); } catch {}
  }, [conversations]);

  useEffect(() => {
    if (conversations.length && !conversations.find(c => c.id === activeId)) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeId, loading]);

  // Elapsed time counter while waiting for LLM
  useEffect(() => {
    if (loading) {
      setElapsed(0);
      elapsedTimer.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(elapsedTimer.current);
      setElapsed(0);
    }
    return () => clearInterval(elapsedTimer.current);
  }, [loading]);

  const activeConv = conversations.find(c => c.id === activeId);
  const messages   = activeConv?.messages || [];

  const updateConv = (id, fn) =>
    setConversations(prev => prev.map(c => c.id === id ? fn(c) : c));

  const addMessage = (msg) =>
    updateConv(activeId, c => ({ ...c, messages: [...c.messages, msg] }));

  const cancelRequest = () => {
    abortRef.current?.abort();
    setLoading(false);
    setLoadingStage('');
  };

  const createConv = () => {
    cancelRequest();
    const conv = makeConv();
    setConversations(prev => [conv, ...prev]);
    setActiveId(conv.id);
    setInput('');
    setAttachedImage(null);
  };

  const deleteConv = (id, e) => {
    e.stopPropagation();
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      if (!next.length) {
        const fresh = makeConv();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const autoTitle = (text) =>
    updateConv(activeId, c =>
      c.title === 'Nouvelle discussion'
        ? { ...c, title: text.slice(0, 40) + (text.length > 40 ? '…' : '') }
        : c
    );

  /* ── STT ── */
  const toggleListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Reconnaissance vocale non supportée.'); return; }
    if (isListening) { recognitionRef.current?.stop(); return; }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = isRtl ? 'ar-TN' : (i18n.language === 'fr' ? 'fr-FR' : 'en-US');
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setIsListening(true);
    rec.onend   = () => setIsListening(false);
    rec.onresult = e => setInput(p => p + (p ? ' ' : '') + e.results[0][0].transcript);
    rec.start();
  };

  /* ── TTS ── */
  const speak = (text) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = isRtl ? 'ar-SA' : (i18n.language === 'fr' ? 'fr-FR' : 'en-US');
    window.speechSynthesis.speak(utter);
  };

  /* ── Image compress (640px max for faster transfer) ── */
  const handleImageAttach = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 640 / Math.max(img.width, img.height));
        canvas.width  = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        setAttachedImage({ dataUrl: canvas.toDataURL('image/jpeg', 0.7), name: file.name });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /* ── Fast single-model YOLO with hard timeout ── */
  const analyzeImageFast = async (dataUrl, queryText) => {
    const category = pickCategory(queryText);
    const timeout  = new Promise(resolve => setTimeout(() => resolve(null), YOLO_TIMEOUT_MS));
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'img.jpg', { type: 'image/jpeg' });
      const race = await Promise.race([cvAPI.detect(file, category), timeout]);
      if (race && race.data?.detections?.length) {
        return { detections: race.data.detections, category };
      }
    } catch {}
    return { detections: [], category };
  };

  /* ── Send (or retry) ── */
  const handleSend = async (retryPayload = null) => {
    const sentInput = retryPayload?.input ?? input;
    const sentImage = retryPayload?.image ?? attachedImage;

    if ((!sentInput.trim() && !sentImage) || loading) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const sig = controller.signal;

    if (!retryPayload) {
      const userMsg = {
        id: Date.now(),
        type: 'user',
        text: sentInput,
        imageUrl: sentImage?.dataUrl || null,
        isVoice: isListening,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      if (messages.length === 0 && sentInput.trim()) autoTitle(sentInput);
      else if (messages.length === 0 && sentImage) autoTitle('📷 ' + (sentImage.name || 'Image'));
      addMessage(userMsg);
      setInput('');
      setAttachedImage(null);
    }

    // Save for retry
    setLastQuery({ input: sentInput, image: sentImage });
    setLoading(true);
    setLoadingStage('thinking');

    // 180s hard timeout
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 180000)
    );

    try {
      let res;

      const doWork = async () => {
        if (sentImage) {
          setLoadingStage('vision');
          const b64 = sentImage.dataUrl.split(',')[1];
          const species = pickCategory(sentInput);
          return agentAPI.analyzeImage(b64, sentInput || null, species, sig);
        }
        return agentAPI.chat(sentInput, undefined, sig);
      };

      res = await Promise.race([doWork(), timeout]);

      const data = res.data;
      setIsLite(data.is_lite);
      addMessage({
        id: Date.now() + 1,
        type: 'bot',
        text: data.response_derja || t('assistant.error'),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || [],
        hadImage: !!sentImage,
      });
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return; // user cancelled
      const isTimeout = err.message === 'TIMEOUT';
      addMessage({
        id: Date.now() + 2,
        type: 'bot',
        isError: true,
        isTimeout,
        text: isTimeout
          ? `⏱ L'agent IA n'a pas répondu après 180 secondes. Le modèle est peut-être en cours de chargement.`
          : `❌ ${t('assistant.error') || 'Erreur de connexion à l\'agent IA.'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  /* ── auto-resize textarea ── */
  const handleInputChange = (e) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; }
  };

  /* ─────────────────── RENDER ─────────────────────────── */
  return (
    <>
      <style>{`
        .sov-page    { display:flex; height:100dvh; overflow:hidden; background:${S.pageBg}; }
        .sov-sidebar { width:260px; flex-shrink:0; background:${S.sidebarBg}; border-inline-end:1px solid ${S.sideBorder}; display:flex; flex-direction:column; z-index: 10; }
        .sov-main    { flex:1; display:flex; flex-direction:column; overflow:hidden; background: url('/models%20designe/wmremove-transformed.jpeg') center/cover no-repeat ${S.chatBg}; position: relative; }
        .sov-main::before { content: ''; position: absolute; inset: 0; background: rgba(248, 250, 252, 0.85); z-index: 0; pointer-events: none; }
        .sov-msgs    { flex:1; overflow-y:auto; padding:32px 24px; display:flex; flex-direction:column; gap:24px; z-index: 1; position: relative; }
        .sov-msgs    { flex:1; overflow-y:auto; padding:32px 24px; display:flex; flex-direction:column; gap:24px; }
        .sov-msgs::-webkit-scrollbar { width:4px; }
        .sov-msgs::-webkit-scrollbar-track { background:transparent; }
        .sov-msgs::-webkit-scrollbar-thumb { background:${S.muted}44; border-radius:4px; }
        .conv-item   { padding:9px 10px; border-radius:10px; cursor:pointer; display:flex; align-items:flex-start; gap:8px; margin-bottom:2px; transition:background 0.15s; }
        .conv-item:hover { background:${S.convHover}; }
        .conv-item.active { background:${S.convActive}; }
        .sov-input-bar { padding:16px 24px calc(20px + env(safe-area-inset-bottom)); background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); border-top:1px solid ${S.sideBorder}; }
        .sov-textarea  { flex:1; resize:none; outline:none; border:none; background:transparent; color:${S.botText}; font-size:14px; font-family:inherit; line-height:1.55; max-height:120px; overflow-y:auto; }
        .sov-textarea::placeholder { color:${S.muted}; }
        .sov-btn { border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; border-radius:12px; transition:all 0.2s; flex-shrink:0; }
        .sov-new-btn { width:100%; padding:10px 14px; border-radius:12px; border:1px dashed ${S.sideBorder}; background:transparent; color:${S.accentLight}; cursor:pointer; display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; transition:background 0.15s; }
        .sov-new-btn:hover { background:${S.convHover}; border-color:${S.accent}; }
        @keyframes micPulse { 0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,0.5)} 50%{box-shadow:0 0 0 8px rgba(22,163,74,0)} }
        @keyframes botGlow  { 0%,100%{opacity:0.7} 50%{opacity:1} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanPulse{ 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes dotBounce{ 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
      `}</style>

      <Navbar
        title={t('sidebar.assistant')}
        subtitle="Interactive Agricultural Intelligence"
        actions={
          <button
            className="btn btn-secondary btn-sm sov-toggle-btn"
            onClick={() => setSidebarOpen(o => !o)}
            title="Discussions"
          >
            <MessageSquare size={14} /> Discussions
          </button>
        }
      />

      {/* Mobile overlay for conversation list */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:149, display:'none' }}
          className="sov-overlay"
        />
      )}

      <div className="sov-page" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>

        {/* ══ SIDEBAR ══════════════════════════════════════ */}
        <div className={`sov-sidebar${sidebarOpen ? ' sov-open' : ''}`}>
          <div style={{ padding: '16px 14px 10px' }}>
            <button className="sov-new-btn" onClick={createConv}>
              <Plus size={15} /> Nouvelle discussion
            </button>
          </div>

          <div style={{ padding: '2px 20px 8px', fontSize: 10, color: S.muted, textTransform: 'uppercase', letterSpacing: 1.2 }}>
            Discussions ({conversations.length})
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`conv-item${conv.id === activeId ? ' active' : ''}`}
                onClick={() => { setActiveId(conv.id); setSidebarOpen(false); }}
              >
                <MessageSquare size={12} color={conv.id === activeId ? S.accentLight : S.muted} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: conv.id === activeId ? S.accentLight : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.title}
                  </div>
                  <div style={{ fontSize: 10, color: S.textDim, marginTop: 2 }}>
                    {conv.messages.length} msg · {new Date(conv.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button onClick={e => deleteConv(conv.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, padding: 3, borderRadius: 6, flexShrink: 0, opacity: 0 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                  title="Supprimer"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>

          {/* Bottom info */}
          <div style={{ padding: '12px 18px', borderTop: `1px solid ${S.sideBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: S.success, boxShadow: `0 0 6px ${S.success}` }} />
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                {isLite ? 'Mode Lite' : 'Intelligence Souveraine'}
              </span>
            </div>
            <div style={{ fontSize: 10, color: S.textDim, display: 'flex', alignItems: 'center', gap: 5 }}>
              <BookOpen size={9} color={S.muted} /> UTAP/AVFA Knowledge Pack
            </div>
          </div>
        </div>

        {/* ══ MAIN CHAT ════════════════════════════════════ */}
        <div className="sov-main">

          {/* Messages */}
          <div className="sov-msgs">

            {/* Empty state (Removed to show only the logo background) */}

            {/* Message bubbles */}
            {messages.map((msg, idx) => (
              <div key={msg.id} style={{
                display: 'flex',
                gap: 12,
                flexDirection: msg.type === 'user'
                  ? (isRtl ? 'row' : 'row-reverse')
                  : (isRtl ? 'row-reverse' : 'row'),
                alignItems: 'flex-start',
                animation: 'slideUp 0.25s ease',
                maxWidth: '100%',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: msg.type === 'user'
                    ? S.userBubble
                    : `linear-gradient(135deg, #e0f2fe, #bae6fd)`,
                  border: msg.type === 'bot' ? `1px solid ${S.botBorder}` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: msg.type === 'bot' ? `0 0 12px ${S.accentGlow}` : 'none',
                }}>
                  {msg.type === 'user'
                    ? <User size={15} color="white" />
                    : <Bot size={15} color={S.accentLight} />}
                </div>

                {/* Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, maxWidth: '72%' }}>
                  {/* Image */}
                  {msg.imageUrl && (
                    <div style={{ borderRadius: 14, overflow: 'hidden', maxWidth: 280, border: `1px solid ${S.botBorder}`, boxShadow: `0 2px 8px rgba(0,0,0,0.08)` }}>
                      <img src={msg.imageUrl} alt="joint" style={{ width: '100%', display: 'block' }} />
                    </div>
                  )}
                  {/* Text bubble */}
                  {msg.text && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: msg.type === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                      background: msg.isError
                        ? 'rgba(239,68,68,0.12)'
                        : (msg.type === 'user' ? S.userBubble : S.botBubble),
                      color: msg.isError ? '#fca5a5' : (msg.type === 'user' ? S.userText : S.botText),
                      border: msg.isError
                        ? '1px solid rgba(239,68,68,0.35)'
                        : (msg.type === 'bot' ? `1px solid ${S.botBorder}` : 'none'),
                      fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap',
                      boxShadow: msg.type === 'user' && !msg.isError
                        ? `0 4px 20px rgba(22,163,74,0.2)`
                        : `0 2px 8px rgba(0,0,0,0.06)`,
                    }}>
                      {msg.text}
                      {msg.type === 'bot' && !msg.isError && (
                        <button onClick={() => speak(msg.text)} title="Écouter" style={{
                          background: 'none', border: 'none', marginLeft: 8,
                          cursor: 'pointer', opacity: 0.45, verticalAlign: 'middle',
                          color: S.accentLight,
                        }}>
                          <Volume2 size={12} />
                        </button>
                      )}
                      {/* Retry button on error messages */}
                      {msg.isError && lastQuery && (
                        <button
                          onClick={() => handleSend(lastQuery)}
                          style={{
                            display: 'block', marginTop: 10,
                            padding: '6px 14px', borderRadius: 8,
                            background: 'rgba(22,163,74,.12)',
                            border: `1px solid ${S.botBorder}`,
                            color: S.accent, cursor: 'pointer',
                            fontSize: 12, fontWeight: 700,
                          }}
                        >
                          🔄 Réessayer
                        </button>
                      )}
                    </div>
                  )}
                  {/* Meta row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: msg.type === 'bot' ? 2 : 0, paddingRight: msg.type === 'user' ? 2 : 0, justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.isVoice && <Mic size={9} color={S.muted} />}
                    {msg.hadImage && <Scan size={9} color={S.accentLight} title="Image analysée: Vision + OCR + RAG" />}
                    <span style={{ fontSize: 10, color: S.textDim }}>{msg.time}</span>
                  </div>
                  {/* Sources */}
                  {msg.sources?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {msg.sources.map((s, i) => (
                        <span key={i} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 10, background: 'rgba(22,163,74,.1)', color: S.accent, border: `1px solid ${S.botBorder}`, cursor: 'help' }} title={s}>
                          <BookOpen size={8} style={{ marginRight: 3, verticalAlign: 'middle' }} />RAG {i + 1}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', animation: 'slideUp 0.2s ease' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: `1px solid ${S.botBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Loader2 size={15} color={S.accentLight} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '4px 18px 18px 18px', background: S.botBubble, border: `1px solid ${S.botBorder}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0, 0.15, 0.3].map((delay, i) => (
                      <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: S.accent, animation: `dotBounce 1.2s ${delay}s ease infinite` }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 13, color: S.muted }}>
                    {loadingStage === 'vision' && elapsed < 8
                      ? `Vision + OCR en cours… ${elapsed}s`
                      : elapsed < 5 ? "Réflexion en cours…"
                      : elapsed < 15 ? `En cours… ${elapsed}s`
                      : elapsed < 30 ? `Modèle en cours de chargement… ${elapsed}s`
                      : elapsed < 60 ? `Analyse visuelle avec Ollama… ${elapsed}s`
                      : `Encore un instant… ${elapsed}s / 180s`}
                  </span>
                  {elapsed >= 8 && (
                    <button
                      onClick={cancelRequest}
                      style={{
                        padding: '4px 10px', borderRadius: 8,
                        background: 'rgba(239,68,68,0.15)',
                        border: '1px solid rgba(239,68,68,0.35)',
                        color: '#fca5a5', cursor: 'pointer',
                        fontSize: 11, fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ✕ Annuler
                    </button>
                  )}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* ══ INPUT BAR ═══════════════════════════════════ */}
          <div className="sov-input-bar">
            {/* Image preview */}
            {attachedImage && (
              <div style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '6px 12px', borderRadius: 10, border: `1px solid ${S.botBorder}` }}>
                <ImageIcon size={13} color={S.accentLight} />
                <img src={attachedImage.dataUrl} alt="preview" style={{ height: 38, borderRadius: 6, border: `1px solid ${S.botBorder}` }} />
                <span style={{ fontSize: 11, color: S.muted, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachedImage.name}</span>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 8, background: 'rgba(22,163,74,.12)', color: S.accent, fontWeight: 700 }}>Vision + OCR</span>
                <button onClick={() => setAttachedImage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, padding: 2 }}>
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Main input row */}
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-end',
              background: S.input,
              border: `1px solid ${S.inputBorder}`,
              borderRadius: 16,
              padding: '10px 12px',
              boxShadow: `0 0 20px rgba(22,163,74,0.06)`,
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocusCapture={e => e.currentTarget.style.borderColor = S.accent}
            onBlurCapture={e => e.currentTarget.style.borderColor = S.inputBorder}
            >
              {/* Mic */}
              <button onClick={toggleListening} className="sov-btn" title={isListening ? 'Arrêter' : 'Dicter'} style={{
                width: 36, height: 36,
                background: isListening ? 'rgba(22,163,74,0.15)' : 'transparent',
                color: isListening ? S.accent : S.muted,
                animation: isListening ? 'micPulse 1s ease-in-out infinite' : 'none',
              }}>
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              {/* Image attach */}
              <button onClick={() => fileInputRef.current.click()} className="sov-btn" title="Joindre & analyser une image" style={{
                width: 36, height: 36,
                background: attachedImage ? 'rgba(22,163,74,0.12)' : 'transparent',
                color: attachedImage ? S.accent : S.muted,
              }}>
                <Paperclip size={16} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageAttach} />

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                className="sov-textarea"
                value={input}
                onChange={handleInputChange}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={attachedImage ? 'Posez une question sur cette image (facultatif)…' : 'Posez votre question…'}
                rows={1}
                dir={isRtl ? 'rtl' : 'ltr'}
              />

              {/* Send */}
              <button onClick={handleSend}
                disabled={loading || (!input.trim() && !attachedImage)}
                className="sov-btn"
                style={{
                  width: 36, height: 36,
                  background: (!input.trim() && !attachedImage) || loading
                    ? 'rgba(22,163,74,0.1)'
                    : `linear-gradient(135deg, ${S.accent}, ${S.accentLight})`,
                  color: 'white',
                  boxShadow: (!input.trim() && !attachedImage) ? 'none' : `0 4px 14px ${S.accentGlow}`,
                }}>
                <Send size={15} />
              </button>
            </div>

            {/* Hint bar */}
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: S.textDim, padding: '0 4px' }}>
              <span>Entrée pour envoyer · Maj+Entrée pour saut · Images analysées par Vision + OCR</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: S.muted }}>
                <Sparkles size={9} color={isLite ? S.warn : S.accent} />
                {isLite ? 'Lite (Labess-7B)' : 'Enterprise (Labess-7B)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
