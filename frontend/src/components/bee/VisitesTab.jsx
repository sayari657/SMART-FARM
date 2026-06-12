import { useRef, useState, useEffect } from 'react';
import jsQR from 'jsqr';
import {
  QrCode, Calendar, Plus, X, Trash2, MapPin,
  Search, CheckCircle, Hash, ArrowLeft, ChevronDown
} from 'lucide-react';
import { COLORS } from './BeeConstants';
import { cacheVisit } from '../../services/offlineVisitCache';
import FullscreenVisitForm from './FullscreenVisitForm';
import HiveHistoryPanel from './HiveHistoryPanel';
import { beeApi } from '../../services/beeApi';

/* ══════════════════════════════════════════
   QR Scanner modal
══════════════════════════════════════════ */
function QRScannerModal({ ruches, onFound, onClose }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const [error, setError] = useState('');
  const [hint,  setHint]  = useState('');

  useEffect(() => {
    let stream;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        scan();
      })
      .catch(() => setError("Impossible d'accéder à la caméra."));

    function scan() {
      rafRef.current = requestAnimationFrame(() => {
        const v = videoRef.current, c = canvasRef.current;
        if (!v || !c || v.readyState < 2) { scan(); return; }
        c.width = v.videoWidth; c.height = v.videoHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(v, 0, 0);
        const img  = ctx.getImageData(0, 0, c.width, c.height);
        const code = jsQR(img.data, img.width, img.height);
        if (code) {
          const text = code.data.trim();
          setHint(text);
          stream?.getTracks().forEach(t => t.stop());
          cancelAnimationFrame(rafRef.current);
          const hive = ruches.find(r => r.identifier === text) ||
                       ruches.find(r => String(r.id) === text);
          onFound(hive || null, text);
        } else { scan(); }
      });
    }
    return () => { cancelAnimationFrame(rafRef.current); stream?.getTracks().forEach(t => t.stop()); };
  }, []); // eslint-disable-line

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: COLORS.surface, borderRadius: 28, padding: 24, maxWidth: 400, width: '100%',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)', border: `1px solid ${COLORS.borderHigh}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: COLORS.accent + '20',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={18} color={COLORS.accent} />
            </div>
            <div>
              <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 15 }}>Scanner QR</div>
              <div style={{ color: COLORS.textMuted, fontSize: 11 }}>Pointez vers l'étiquette</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        {error ? (
          <div style={{ color: COLORS.error, textAlign: 'center', padding: 28, fontSize: 13 }}>{error}</div>
        ) : (
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '1' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: 160, height: 160, border: `3px solid ${COLORS.accent}`,
                borderRadius: 18, boxShadow: `0 0 0 9999px rgba(0,0,0,0.45)` }} />
            </div>
          </div>
        )}
        {hint && (
          <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 10, textAlign: 'center',
            background: COLORS.success + '12', color: COLORS.success, fontSize: 12, fontWeight: 700 }}>
            ✓ Détecté : {hint}
          </div>
        )}
        <button onClick={onClose} style={{ width: '100%', marginTop: 14, height: 42, borderRadius: 12,
          background: 'rgba(0,0,0,0.06)', border: `1px solid ${COLORS.border}`,
          color: COLORS.textMuted, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Hive Picker modal  (QR  ou  Numéro)
══════════════════════════════════════════ */
function HivePickerModal({ ruches, emplacements, onSelect, onClose }) {
  const [mode,       setMode]   = useState(null);   // 'qr' | 'manual'
  const [manualVal,  setManual] = useState('');
  const [matchErr,   setMatchErr] = useState('');

  const confirmManual = () => {
    const v = manualVal.trim();
    if (!v) return;
    const hive = ruches.find(r => r.identifier?.toLowerCase() === v.toLowerCase()) ||
                 ruches.find(r => String(r.id) === v);
    if (!hive) { setMatchErr(`Aucune ruche trouvée pour "${v}"`); return; }
    onSelect(hive);
  };

  const handleQR = (hive, raw) => {
    if (!hive) { setMode('manual'); setManual(raw); setMatchErr(`Aucune ruche "${raw}"`); }
    else        { onSelect(hive); }
  };

  return (
    <>
      {mode === 'qr' && <QRScannerModal ruches={ruches} onFound={handleQR} onClose={() => setMode(null)} />}

      <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: COLORS.surface, borderRadius: 28, padding: 32, maxWidth: 440, width: '100%',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)', border: `1px solid ${COLORS.borderHigh}` }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 18 }}>Identifier la ruche</div>
              <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 3 }}>
                Scannez le QR ou saisissez le numéro
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Two big option buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            <button onClick={() => setMode('qr')}
              style={{ padding: '22px 12px', borderRadius: 18, cursor: 'pointer',
                border: `2px solid ${COLORS.accent}40`,
                background: `linear-gradient(135deg,${COLORS.accent}12,${COLORS.accent}05)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.border = `2px solid ${COLORS.accent}`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.border = `2px solid ${COLORS.accent}40`; e.currentTarget.style.transform = 'none'; }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: COLORS.accent + '20',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QrCode size={26} color={COLORS.accent} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 13 }}>Scanner QR Code</div>
                <div style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 3, lineHeight: 1.4 }}>
                  Caméra sur l'étiquette
                </div>
              </div>
            </button>

            <button onClick={() => { setMode('manual'); setMatchErr(''); }}
              style={{ padding: '22px 12px', borderRadius: 18, cursor: 'pointer',
                border: `2px solid ${COLORS.info}40`,
                background: `linear-gradient(135deg,${COLORS.info}12,${COLORS.info}05)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.border = `2px solid ${COLORS.info}`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.border = `2px solid ${COLORS.info}40`; e.currentTarget.style.transform = 'none'; }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: COLORS.info + '20',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Hash size={26} color={COLORS.info} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 13 }}>Numéro de ruche</div>
                <div style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 3, lineHeight: 1.4 }}>
                  Saisie manuelle
                </div>
              </div>
            </button>
          </div>

          {/* Manual input */}
          {mode === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input autoFocus value={manualVal}
                  onChange={e => { setManual(e.target.value); setMatchErr(''); }}
                  onKeyDown={e => e.key === 'Enter' && confirmManual()}
                  placeholder="ex: HIVE-0001"
                  style={{ flex: 1, height: 44, background: COLORS.bg2,
                    border: `1.5px solid ${matchErr ? COLORS.error : COLORS.border}`,
                    borderRadius: 12, padding: '0 14px', color: COLORS.text,
                    outline: 'none', fontSize: 14, fontWeight: 700 }} />
                <button onClick={confirmManual}
                  style={{ height: 44, padding: '0 18px', borderRadius: 12, cursor: 'pointer',
                    background: `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})`,
                    border: 'none', color: 'white', fontWeight: 800, fontSize: 13 }}>
                  OK
                </button>
              </div>
              {matchErr && <div style={{ color: COLORS.error, fontSize: 11, fontWeight: 600 }}>{matchErr}</div>}

              {/* Suggestions */}
              {manualVal.length >= 1 && !matchErr && (
                <div style={{ background: COLORS.bg2, borderRadius: 12, border: `1px solid ${COLORS.border}`,
                  maxHeight: 200, overflowY: 'auto' }}>
                  {ruches
                    .filter(r => r.identifier?.toLowerCase().includes(manualVal.toLowerCase()))
                    .slice(0, 10)
                    .map(r => {
                      const site = emplacements.find(e => e.id === r.apiary_id);
                      return (
                        <button key={r.id} onClick={() => onSelect(r)}
                          style={{ width: '100%', padding: '9px 14px', background: 'none',
                            border: 'none', borderBottom: `1px solid ${COLORS.border}`,
                            cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: COLORS.text, fontWeight: 800, fontSize: 13 }}>{r.identifier}</span>
                          <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{site?.name || ''}</span>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════
   Hive View  =  full-page form  +  history below
══════════════════════════════════════════ */
function HiveView({ hive, emplacements, onBack, onChangeHive }) {
  const [tick,       setTick]      = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [allHives,   setAllHives]  = useState([]);
  const apiary = emplacements.find(e => e.id === hive.apiary_id);

  useEffect(() => {
    beeApi.getHives().then(r => r.ok && r.json().then(setAllHives));
  }, []);

  const handleSubmit = async (payload) => {
    const res = await beeApi.createVisit(payload);
    if (!res.ok) {
      console.error('createVisit failed:', res.status, await res.text().catch(() => ''));
      return false;
    }
    setTick(t => t + 1);
    const saved = await res.json().catch(() => null);
    if (saved?.id) {
      cacheVisit(payload.hive_id, saved);
      const prev = await beeApi.previewVisit(payload)
        .then(r => r.ok ? r.json() : null).catch(() => null);
      if (prev && Object.keys(prev?.hive_updates || {}).length > 0)
        await beeApi.applyVisit(saved.id).catch(() => {});
    }
    return true;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {showPicker && (
        <HivePickerModal
          ruches={allHives} emplacements={emplacements}
          onSelect={h => { setShowPicker(false); onChangeHive(h); }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* ── Nav bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', color: COLORS.textMuted,
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <ArrowLeft size={16} /> Toutes les visites
        </button>
        <button onClick={() => setShowPicker(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6,
            background: COLORS.bg2, border: `1px solid ${COLORS.border}`,
            borderRadius: 10, padding: '7px 14px', cursor: 'pointer',
            color: COLORS.textMuted, fontSize: 12, fontWeight: 700 }}>
          <Hash size={13} /> Changer de ruche <ChevronDown size={12} />
        </button>
      </div>

      {/* ── Fullscreen stepper form ── */}
      <FullscreenVisitForm hive={hive} apiary={apiary} onSubmit={handleSubmit} />

      {/* ── History below ── */}
      <div style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 24, padding: '28px 32px',
        minHeight: 300,
      }}>
        <HiveHistoryPanel hive={hive} refreshTick={tick} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Health badge (table list)
══════════════════════════════════════════ */
const HEALTH_COLORS = {
  health: COLORS.success, warning: COLORS.honey,
  urgent: COLORS.error,   treatment: COLORS.info,
};
const HEALTH_LABELS = {
  health: '💚 Bonne', warning: '🟡 Surveiller',
  urgent: '🔴 Urgent', treatment: '💊 Traitement',
};
function HealthBadge({ state }) {
  const c   = HEALTH_COLORS[state] || COLORS.textMuted;
  const lbl = HEALTH_LABELS[state] || state;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
      background: c + '18', color: c, padding: '4px 10px',
      borderRadius: 7, fontSize: 11, fontWeight: 800 }}>{lbl}</span>
  );
}

/* ══════════════════════════════════════════
   Main VisitesTab
══════════════════════════════════════════ */
export default function VisitesTab({
  visites = [], ruches = [], emplacements = [],
  /* legacy props kept for compatibility */
  isAddingVisit, setIsAddingVisit,
  visiteForm = {}, setVisiteForm,
  handleAddVisite, onDelete
}) {
  const [selectedHive, setSelectedHive] = useState(null);
  const [showPicker,   setShowPicker]   = useState(false);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterHealth, setFilterHealth] = useState('');

  const openHive = (hive) => { setSelectedHive(hive); setShowPicker(false); };

  const filteredVisites = visites.filter(v => {
    const ruche = ruches.find(r => r.id === (v.hive_id || v.rucheId));
    const matchSearch = !searchTerm || (ruche?.identifier || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchHealth = !filterHealth || v.health_state === filterHealth;
    return matchSearch && matchHealth;
  });

  /* ── Hive View ── */
  if (selectedHive) {
    return (
      <HiveView
        hive={selectedHive}
        emplacements={emplacements}
        onBack={() => setSelectedHive(null)}
        onChangeHive={openHive}
      />
    );
  }

  /* ── List View ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {showPicker && (
        <HivePickerModal
          ruches={ruches}
          emplacements={emplacements}
          onSelect={openHive}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: COLORS.text, margin: 0 }}>Visites</h1>
          <p style={{ color: COLORS.textMuted, marginTop: 3, fontSize: 13 }}>
            {filteredVisites.length} visite{filteredVisites.length !== 1 ? 's' : ''} enregistrée{filteredVisites.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowPicker(true)}
          style={{ background: `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})`,
            color: 'white', border: 'none', padding: '12px 24px', borderRadius: 14,
            fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center',
            gap: 8, boxShadow: `0 4px 20px ${COLORS.accent}40`, fontSize: 14 }}>
          <Plus size={18} /> Nouvelle Visite
        </button>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%',
            transform: 'translateY(-50%)', color: COLORS.textMuted }} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher par ruche…"
            style={{ width: '100%', height: 42, paddingLeft: 40, background: COLORS.surface,
              border: `1px solid ${COLORS.border}`, borderRadius: 11,
              color: COLORS.text, outline: 'none', fontSize: 13 }} />
        </div>
        <select value={filterHealth} onChange={e => setFilterHealth(e.target.value)}
          style={{ height: 42, padding: '0 14px', background: COLORS.surface,
            border: `1px solid ${COLORS.border}`, borderRadius: 11,
            color: COLORS.text, outline: 'none', fontSize: 13 }}>
          <option value="">Tous les états</option>
          <option value="health">💚 Bonne santé</option>
          <option value="warning">🟡 Surveiller</option>
          <option value="urgent">🔴 Urgent</option>
          <option value="treatment">💊 Traitement</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: COLORS.surface, borderRadius: 24, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
              {['DATE', 'RUCHE', 'SITE', 'REINE', 'POP', 'MIEL', 'CADRES', 'ÉTAT', 'ACTIONS'].map(h => (
                <th key={h} style={{ padding: '14px 16px', textAlign: 'left',
                  color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredVisites.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: '48px 0', textAlign: 'center', color: COLORS.textMuted }}>
                  <CheckCircle size={36} style={{ margin: '0 auto 14px', display: 'block', opacity: 0.25 }} />
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Aucune visite enregistrée</div>
                  <div style={{ fontSize: 12, marginTop: 5 }}>Cliquez sur "Nouvelle Visite" pour commencer</div>
                </td>
              </tr>
            ) : filteredVisites.map(v => {
              const ruche = ruches.find(r => r.id === (v.hive_id || v.rucheId));
              const site  = emplacements.find(e => e.id === (v.apiary_id || ruche?.apiary_id));
              const LDOT  = { FAIBLE: '🔴', MOYEN: '🟡', FORT: '🟢' };
              return (
                <tr key={v.id}
                  onClick={() => ruche && openHive(ruche)}
                  style={{ borderTop: `1px solid ${COLORS.border}`, transition: 'background .12s',
                    cursor: ruche ? 'pointer' : 'default' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={12} color={COLORS.textMuted} />
                      {v.visit_date || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ color: COLORS.accent, fontWeight: 900, fontSize: 13 }}>
                      {ruche?.identifier || v.hive_id || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: COLORS.textMuted, fontSize: 12 }}>
                      <MapPin size={11} /> {site?.name || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13 }}>
                    {v.reine === true  ? <span style={{ color: COLORS.success, fontWeight: 700 }}>✓ OUI</span>
                    : v.reine === false ? <span style={{ color: COLORS.error,   fontWeight: 700 }}>✗ NON</span>
                    : <span style={{ color: COLORS.textMuted }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12 }}>
                    {v.population ? `${LDOT[v.population] || ''} ${v.population}` : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12 }}>
                    {v.honey_level ? `${LDOT[v.honey_level] || ''} ${v.honey_level}` : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: COLORS.info, fontWeight: 700 }}>
                    {v.nb_cadres || '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <HealthBadge state={v.health_state || 'health'} />
                  </td>
                  <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                    {onDelete && (
                      <button onClick={() => onDelete(v.id)}
                        style={{ width: 30, height: 30, borderRadius: 8,
                          background: 'rgba(239,68,68,0.08)', border: 'none',
                          color: COLORS.error, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
