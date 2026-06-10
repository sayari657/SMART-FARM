/**
 * HiveInspectPage — QR Code Landing Page
 *
 * Opened when a worker/owner scans the hive's QR code.
 * Two tabs:
 *   📝 Nouvelle Inspection  — fast sliding form (4 steps)
 *   📋 Historique           — timeline of past inspections
 *
 * Columns: Date | Reine | Oeufs | Couvain | Population |
 *          Miel | Pollen | Nb_Cadres | Action_Observation
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle,
  Clock, AlertTriangle, RefreshCw, ChevronRight,
  ClipboardList, History, Leaf,
} from 'lucide-react';
import { beeApi } from '../services/beeApi';
import { normalizeDetail } from '../utils/errors';

/* ── Colors ── */
const H = {
  bg:      '#FFFDF5',
  surface: '#FFFFFF',
  border:  '#F0DEB4',
  accent:  '#D97706',
  accentDk:'#92400E',
  success: '#059669',
  error:   '#EF4444',
  warn:    '#F59E0B',
  text:    '#1C1917',
  muted:   '#78716C',
  dim:     '#A8A29E',
};

/* ── Trilevel options ── */
const TRI = [
  { val: 'Faible', emoji: '🔴', color: '#ef4444', bg: '#fef2f2', bd: '#fecaca' },
  { val: 'Moyen',  emoji: '🟡', color: '#f59e0b', bg: '#fffbeb', bd: '#fde68a' },
  { val: 'Fort',   emoji: '🟢', color: '#059669', bg: '#f0fdf4', bd: '#bbf7d0' },
];

/* ── Steps ── */
const STEPS = [
  { id: 1, emoji: '👑', title: 'Reine & Couvain',  sub: 'Reine · Œufs · Couvain · Pente' },
  { id: 2, emoji: '🍯', title: 'Ressources',         sub: 'Population · Miel · Pollen · Cadres' },
  { id: 3, emoji: '📝', title: 'Observations',       sub: 'Actions effectuées · Notes terrain' },
  { id: 4, emoji: '✅', title: 'Confirmation',       sub: 'Vérifier et enregistrer' },
];

const BLANK = {
  date: new Date().toISOString().slice(0, 10),
  reine:       true,
  oeufs:       false,
  couvain:     false,
  pente_ok:    true,
  population:  'Moyen',
  miel:        'Moyen',
  pollen:      'Moyen',
  nb_cadres:   10,
  action_observation: '',
};

/* ── Helpers ── */
const triNum = (s) => s === 'Fort' ? 8 : s === 'Moyen' ? 5 : 2;

function healthState(f) {
  if (!f.reine || !f.couvain) return 'urgent';
  if (f.population === 'Faible' && f.miel === 'Faible') return 'urgent';
  if (f.population === 'Faible' || !f.oeufs) return 'warning';
  return 'health';
}

/* ── Sub-components ── */

function YesNo({ label, value, onChange, yesIcon = '✓', noIcon = '✗', yesColor = H.success, noColor = H.error, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: H.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {[{ v: true, l: 'Oui', icon: yesIcon, color: yesColor }, { v: false, l: 'Non', icon: noIcon, color: noColor }].map(o => (
          <button key={String(o.v)} onClick={() => onChange(o.v)} style={{
            flex: 1, padding: '14px 0', borderRadius: 16, cursor: 'pointer',
            border: `${value === o.v ? 3 : 1.5}px solid ${value === o.v ? o.color : H.border}`,
            background: value === o.v ? `${o.color}15` : H.bg,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            transition: 'all .18s', fontWeight: 900,
            boxShadow: value === o.v ? `0 4px 14px ${o.color}25` : 'none',
          }}>
            <span style={{ fontSize: 22 }}>{o.icon}</span>
            <span style={{ fontSize: 14, color: value === o.v ? o.color : H.muted }}>{o.l}</span>
          </button>
        ))}
      </div>
      {hint && <div style={{ fontSize: 11, color: H.dim, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

function TriSelector({ label, emoji, value, onChange }) {
  const sel = TRI.find(t => t.val === value) || TRI[1];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: H.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
        {emoji} {label}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {TRI.map(o => (
          <button key={o.val} onClick={() => onChange(o.val)} style={{
            flex: 1, padding: '11px 4px', borderRadius: 14, cursor: 'pointer',
            border: `${value === o.val ? 2.5 : 1.5}px solid ${value === o.val ? o.color : H.border}`,
            background: value === o.val ? o.bg : H.bg,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            transition: 'all .15s', fontWeight: value === o.val ? 900 : 600,
            boxShadow: value === o.val ? `0 3px 12px ${o.color}25` : 'none',
          }}>
            <span style={{ fontSize: 18 }}>{o.emoji}</span>
            <span style={{ fontSize: 11, color: value === o.val ? o.color : H.muted }}>{o.val}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function NavRow({ onPrev, onNext, nextLabel = 'Suivant', nextColor = H.accent, disabled = false }) {
  return (
    <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
      {onPrev && (
        <button onClick={onPrev} style={{
          height: 50, padding: '0 18px', borderRadius: 14, cursor: 'pointer',
          border: `1.5px solid ${H.border}`, background: H.bg,
          color: H.muted, fontWeight: 700, fontSize: 14,
          display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <ArrowLeft size={15}/> Retour
        </button>
      )}
      <button onClick={onNext} disabled={disabled} style={{
        flex: 1, height: 50, borderRadius: 14, cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? H.border : `linear-gradient(135deg, ${nextColor}, ${H.accentDk})`,
        border: 'none', color: disabled ? H.muted : '#fff',
        fontWeight: 800, fontSize: 15,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: disabled ? 'none' : `0 4px 16px ${nextColor}40`,
        transition: 'all .2s',
      }}>
        {nextLabel} {!disabled && <ArrowRight size={15}/>}
      </button>
    </div>
  );
}

/* ── History card ── */
function VisitCard({ v, hive }) {
  const stateColor = { health: H.success, warning: H.warn, urgent: H.error, treatment: '#7c3aed' };
  const stateLabel = { health: '✅ Saine', warning: '⚠ Surveillance', urgent: '🔴 Urgent', treatment: '💊 Traitement' };
  const color = stateColor[v.health_state] || H.muted;

  const rows = [
    v.has_queen    != null && { l: 'Reine',      v: v.has_queen  ? 'Oui' : 'Non',    c: v.has_queen  ? H.success : H.error },
    v.has_eggs     != null && { l: 'Œufs',       v: v.has_eggs   ? 'Oui' : 'Non' },
    v.has_brood    != null && { l: 'Couvain',    v: v.has_brood  ? 'Oui' : 'Non' },
    v.population        && { l: 'Population',  v: v.population },
    v.miel              && { l: 'Miel',        v: v.miel        },
    v.pollen            && { l: 'Pollen',      v: v.pollen      },
    v.nb_cadres    != null && { l: 'Cadres',     v: String(v.nb_cadres) },
  ].filter(Boolean);

  return (
    <div style={{
      background: H.surface, borderRadius: 16,
      border: `1px solid ${H.border}`, marginBottom: 12,
      overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.05)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: rows.length > 0 || v.notes ? `1px solid ${H.border}` : 'none',
        background: `${color}08`,
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: H.text }}>
            {v.visit_date ? new Date(v.visit_date + 'T00:00:00').toLocaleDateString('fr-FR', {
              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            }) : '—'}
          </div>
          {v.created_by_name && (
            <div style={{ fontSize: 11, color: H.muted, marginTop: 2 }}>par {v.created_by_name}</div>
          )}
        </div>
        <span style={{
          padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 800,
          background: `${color}15`, color, border: `1px solid ${color}30`,
        }}>
          {stateLabel[v.health_state] || '—'}
        </span>
      </div>

      {/* Grid of values */}
      {rows.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: 0, padding: '10px 14px 6px',
        }}>
          {rows.map(r => (
            <div key={r.l} style={{ padding: '4px 4px', borderBottom: `1px solid ${H.border}20` }}>
              <div style={{ fontSize: 10, color: H.dim, fontWeight: 600 }}>{r.l}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: r.c || H.text, marginTop: 1 }}>{r.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {v.notes && (
        <div style={{ padding: '8px 16px 12px', fontSize: 12, color: H.muted, lineHeight: 1.6 }}>
          📝 {v.notes}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
export default function HiveInspectPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [tab,     setTab]     = useState('inspect'); // 'inspect' | 'history'
  const [hive,    setHive]    = useState(null);
  const [visits,  setVisits]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [step,    setStep]    = useState(1);
  const [dir,     setDir]     = useState('right');
  const [animKey, setAnimKey] = useState(0);
  const [form,    setForm]    = useState(BLANK);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState('');

  /* ── Fetch hive info ── */
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const [hr, vr] = await Promise.all([
          beeApi.getHive(id),
          beeApi.getVisitsByHive(id, 30),
        ]);
        if (hr.ok) { const d = await hr.json(); setHive(d); }
        if (vr.ok) { const d = await vr.json(); setVisits(Array.isArray(d) ? d : []); }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* Reset form when starting a new inspection */
  const startNew = () => {
    setForm({ ...BLANK, date: new Date().toISOString().slice(0, 10) });
    setStep(1); setDir('right'); setAnimKey(k => k + 1);
    setSuccess(false); setError('');
    setTab('inspect');
  };

  const slide = (d) => { setDir(d); setAnimKey(k => k + 1); };
  const next  = () => { slide('right'); setStep(s => s + 1); };
  const prev  = () => { slide('left');  setStep(s => s - 1); };

  /* ── Submit ── */
  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      const payload = {
        hive_id:      Number(id),
        apiary_id:    hive?.apiary_id,
        visit_date:   form.date,
        health_state: healthState(form),
        honey_level:  triNum(form.miel),
        force_level:  triNum(form.population),
        /* extended fields */
        has_queen:  form.reine,
        has_eggs:   form.oeufs,
        has_brood:  form.couvain,
        population: form.population,
        miel:       form.miel,
        pollen:     form.pollen,
        nb_cadres:  form.nb_cadres,
        notes:      form.action_observation,
      };
      const res = await beeApi.createVisit(payload);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(normalizeDetail(d.detail) || 'Erreur lors de l\'enregistrement.');
        return;
      }
      const newVisit = await res.json();
      setVisits(prev => [{ ...newVisit, ...payload }, ...prev]);
      setSuccess(true);
    } catch (e) {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: H.bg, flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 44, height: 44, border: `4px solid ${H.border}`, borderTopColor: H.accent, borderRadius: '50%', animation: 'spin .8s linear infinite' }}/>
      <div style={{ color: H.muted, fontSize: 13 }}>Chargement de la ruche…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!hive) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: H.bg, flexDirection: 'column', gap: 12, padding: 24, textAlign: 'center' }}>
      <span style={{ fontSize: 48 }}>🔍</span>
      <div style={{ fontWeight: 800, fontSize: 18, color: H.text }}>Ruche introuvable</div>
      <div style={{ color: H.muted, fontSize: 13 }}>La ruche #{id} n'existe pas ou vous n'y avez pas accès.</div>
      <button onClick={() => navigate(-1)} style={{ marginTop: 8, padding: '10px 24px', borderRadius: 12, background: H.accent, border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        Retour
      </button>
    </div>
  );

  const hiveType = hive.hive_type || 'Ruche';
  const siteName = hive.apiary_name || `Site #${hive.apiary_id}`;
  const currentStep = STEPS[step - 1];

  return (
    <div style={{ minHeight: '100dvh', background: H.bg, fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", maxWidth: 520, margin: '0 auto' }}>
      <style>{`
        @keyframes slideInRight { from{transform:translateX(50px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes slideInLeft  { from{transform:translateX(-50px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{transform:translateY(10px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${H.accentDk} 0%, ${H.accent} 100%)`,
        padding: '16px 18px 20px', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button onClick={() => navigate(-1)} style={{
            background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 10,
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', flexShrink: 0,
          }}>
            <ArrowLeft size={18}/>
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>
              SMART FARM AI · APICRAFT
            </div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 18, letterSpacing: '-.3px', marginTop: 1 }}>
              🐝 {hive.identifier}
            </div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, marginTop: 2 }}>
              {hiveType} · {siteName}
              {hive.has_queen !== false && ' · 👑'}
            </div>
          </div>

          {/* Stats pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            <div style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,.18)', fontSize: 10, fontWeight: 700, color: '#fff', textAlign: 'center' }}>
              {visits.length} inspection{visits.length !== 1 ? 's' : ''}
            </div>
            {hive.health_score != null && (
              <div style={{ padding: '3px 10px', borderRadius: 99, background: hive.health_score >= 7 ? '#dcfce7' : hive.health_score >= 4 ? '#fef3c7' : '#fee2e2', fontSize: 10, fontWeight: 800, color: hive.health_score >= 7 ? '#059669' : hive.health_score >= 4 ? '#d97706' : '#dc2626', textAlign: 'center' }}>
                {hive.health_score?.toFixed(1)}/10
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'inspect', label: '📝 Inspection',  icon: ClipboardList },
            { id: 'history', label: `📋 Historique (${visits.length})`, icon: History },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, height: 38, borderRadius: 12, cursor: 'pointer',
              background: tab === t.id ? '#fff' : 'rgba(255,255,255,.12)',
              border: 'none', color: tab === t.id ? H.accent : 'rgba(255,255,255,.75)',
              fontWeight: tab === t.id ? 800 : 600, fontSize: 12,
              transition: 'all .2s',
              boxShadow: tab === t.id ? '0 4px 12px rgba(0,0,0,.15)' : 'none',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ════ TAB: INSPECTION ════ */}
      {tab === 'inspect' && (
        <div style={{ padding: '20px 16px 40px' }}>

          {/* Success screen */}
          {success ? (
            <div style={{ animation: 'fadeUp .3s ease', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ textAlign: 'center', padding: '28px 20px', borderRadius: 20, background: '#f0fdf4', border: '2px solid #86efac' }}>
                <div style={{ fontSize: 56, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: H.success }}>Inspection enregistrée !</div>
                <div style={{ fontSize: 13, color: '#15803d', marginTop: 6 }}>
                  {hive.identifier} · {form.date}
                </div>
              </div>

              {/* Summary */}
              <div style={{ background: H.surface, borderRadius: 16, border: `1px solid ${H.border}`, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: H.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Récapitulatif</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                  {[
                    { l: 'Reine',      v: form.reine   ? 'Oui ✓' : 'Non ✗',  c: form.reine   ? H.success : H.error },
                    { l: 'Œufs',       v: form.oeufs   ? 'Oui ✓' : 'Non ✗',  c: form.oeufs   ? H.success : H.muted },
                    { l: 'Couvain',    v: form.couvain ? 'Oui ✓' : 'Non ✗',  c: form.couvain ? H.success : H.muted },
                    { l: 'Pente',      v: form.pente_ok ? 'OK ✓' : 'À régler' },
                    { l: 'Population', v: form.population },
                    { l: 'Miel',       v: form.miel    },
                    { l: 'Pollen',     v: form.pollen  },
                    { l: 'Cadres',     v: String(form.nb_cadres) },
                  ].map(r => (
                    <div key={r.l} style={{ padding: '5px 0', borderBottom: `1px solid ${H.border}30` }}>
                      <div style={{ fontSize: 10, color: H.dim }}>{r.l}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: r.c || H.text }}>{r.v}</div>
                    </div>
                  ))}
                </div>
                {form.action_observation && (
                  <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 10, background: `${H.accent}08`, border: `1px solid ${H.border}`, fontSize: 12, color: H.muted, lineHeight: 1.6 }}>
                    📝 {form.action_observation}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={startNew} style={{
                  flex: 1, height: 50, borderRadius: 14, cursor: 'pointer',
                  background: `linear-gradient(135deg, ${H.accent}, ${H.accentDk})`,
                  border: 'none', color: '#fff', fontWeight: 800, fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: `0 4px 16px ${H.accent}40`,
                }}>
                  + Nouvelle inspection
                </button>
                <button onClick={() => setTab('history')} style={{
                  height: 50, padding: '0 18px', borderRadius: 14, cursor: 'pointer',
                  border: `1.5px solid ${H.border}`, background: H.bg,
                  color: H.muted, fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  <History size={15}/> Voir
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                {STEPS.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 3 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: s.id < step ? H.success : s.id === step ? H.accent : H.border,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .25s', flexShrink: 0,
                        boxShadow: s.id === step ? `0 0 12px ${H.accent}50` : 'none',
                      }}>
                        {s.id < step
                          ? <Check size={14} color="#fff" strokeWidth={3}/>
                          : <span style={{ fontSize: 11, color: s.id === step ? '#fff' : H.muted }}>{s.emoji}</span>
                        }
                      </div>
                      <span style={{ fontSize: 8, fontWeight: 700, color: s.id === step ? H.accent : s.id < step ? H.success : H.dim, whiteSpace: 'nowrap' }}>
                        {s.title.split(' ')[0]}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{ height: 2, flex: 1, maxWidth: 28, background: s.id < step ? H.success : H.border, margin: '0 2px', marginBottom: 18, transition: 'background .25s' }}/>
                    )}
                  </div>
                ))}
              </div>

              {/* Date selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '10px 14px', borderRadius: 12, background: H.surface, border: `1px solid ${H.border}` }}>
                <span style={{ fontSize: 16 }}>🗓</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: H.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Date d'inspection</div>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    style={{ border: 'none', background: 'transparent', color: H.text, fontSize: 14, fontWeight: 700, outline: 'none', width: '100%', marginTop: 2 }}/>
                </div>
              </div>

              {/* Animated step content */}
              <div
                key={animKey}
                style={{
                  animation: `${dir === 'right' ? 'slideInRight' : 'slideInLeft'} 0.28s cubic-bezier(0.25,0.46,0.45,0.94)`,
                  background: H.surface, borderRadius: 20, border: `1.5px solid ${H.border}`,
                  padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 18,
                  marginBottom: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 9, fontWeight: 900, color: H.accent, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 3 }}>
                    ÉTAPE {step}/{STEPS.length}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: H.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {currentStep.emoji} {currentStep.title}
                  </div>
                  <div style={{ fontSize: 12, color: H.muted, marginTop: 2 }}>{currentStep.sub}</div>
                </div>

                {/* ── STEP 1: Reine & Couvain ── */}
                {step === 1 && (
                  <>
                    <YesNo label="👑 Reine (Oui / Non)" value={form.reine} onChange={v => setForm(f => ({ ...f, reine: v }))}
                      yesIcon="👑" noIcon="✗" hint="Présence de la reine = critère de santé N°1"/>
                    <YesNo label="🥚 Œufs (Oui / Non)"  value={form.oeufs} onChange={v => setForm(f => ({ ...f, oeufs: v }))}
                      yesIcon="🥚" noIcon="—" hint="Œufs = ponte active dans les 3 derniers jours"/>
                    <YesNo label="🐛 Couvain (Oui / Non)" value={form.couvain} onChange={v => setForm(f => ({ ...f, couvain: v }))}
                      yesIcon="🐛" noIcon="—" yesColor={H.accent}
                      hint="Couvain operculé ou larvaire — cycle sain"/>
                    <YesNo label="📐 Pente en règle" value={form.pente_ok} onChange={v => setForm(f => ({ ...f, pente_ok: v }))}
                      hint="Légère inclinaison vers l'entrée pour le drainage"/>
                  </>
                )}

                {/* ── STEP 2: Ressources ── */}
                {step === 2 && (
                  <>
                    <TriSelector label="Population" emoji="🐝" value={form.population} onChange={v => setForm(f => ({ ...f, population: v }))}/>
                    <TriSelector label="Miel"       emoji="🍯" value={form.miel}       onChange={v => setForm(f => ({ ...f, miel: v }))}/>
                    <TriSelector label="Pollen"     emoji="🌸" value={form.pollen}     onChange={v => setForm(f => ({ ...f, pollen: v }))}/>

                    {/* Nb_Cadres */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: H.muted, textTransform: 'uppercase', letterSpacing: 1 }}>🖼️ Nombre de cadres</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button onClick={() => setForm(f => ({ ...f, nb_cadres: Math.max(0, (f.nb_cadres || 0) - 1) }))}
                          style={{ width: 44, height: 44, borderRadius: '50%', border: `1.5px solid ${H.border}`, background: H.bg, cursor: 'pointer', fontSize: 22, fontWeight: 900, color: H.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 44, fontWeight: 900, color: H.accent, lineHeight: 1 }}>{form.nb_cadres}</div>
                          <div style={{ fontSize: 11, color: H.muted }}>
                            {(form.nb_cadres || 0) >= 8 ? '🟢 Optimal' : (form.nb_cadres || 0) >= 5 ? '🟡 Correct' : '🔴 Insuffisant'}
                          </div>
                        </div>
                        <button onClick={() => setForm(f => ({ ...f, nb_cadres: Math.min(30, (f.nb_cadres || 0) + 1) }))}
                          style={{ width: 44, height: 44, borderRadius: '50%', border: `1.5px solid ${H.border}`, background: H.bg, cursor: 'pointer', fontSize: 22, fontWeight: 900, color: H.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                      {/* Quick presets */}
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {[5, 8, 10, 12, 15].map(n => (
                          <button key={n} onClick={() => setForm(f => ({ ...f, nb_cadres: n }))} style={{
                            padding: '4px 12px', borderRadius: 99,
                            border: `1.5px solid ${form.nb_cadres === n ? H.accent : H.border}`,
                            background: form.nb_cadres === n ? `${H.accent}15` : H.bg,
                            color: form.nb_cadres === n ? H.accent : H.muted,
                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          }}>{n}</button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── STEP 3: Observations ── */}
                {step === 3 && (
                  <>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: H.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                        📝 Action / Observation
                      </div>
                      <textarea
                        value={form.action_observation}
                        onChange={e => setForm(f => ({ ...f, action_observation: e.target.value }))}
                        placeholder="Ex : Traitement Apivar posé · Nourrissement sucre · Reine marquée bleue · Couvain sain · Essaimage suspect…"
                        rows={6}
                        style={{
                          width: '100%', padding: '12px 14px', borderRadius: 14,
                          border: `1.5px solid ${H.border}`, background: H.bg,
                          color: H.text, fontSize: 14, resize: 'vertical',
                          outline: 'none', fontFamily: 'inherit', lineHeight: 1.7,
                          boxSizing: 'border-box', transition: 'border-color .2s',
                        }}
                        onFocus={e => e.target.style.borderColor = H.accent}
                        onBlur={e => e.target.style.borderColor = H.border}
                      />
                      <div style={{ fontSize: 11, color: H.dim, marginTop: 5 }}>
                        Traçabilité COLOSS — décrivez actions et observations terrain
                      </div>
                    </div>

                    {/* Quick action chips */}
                    <div>
                      <div style={{ fontSize: 11, color: H.muted, marginBottom: 8, fontWeight: 600 }}>Raccourcis :</div>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        {[
                          'Traitement Apivar', 'Nourrissement sucre', 'Nourrissement candi',
                          'Reine marquée', 'Essaimage observé', 'Couvain sain', 'RAS',
                        ].map(chip => (
                          <button key={chip} onClick={() => setForm(f => ({
                            ...f,
                            action_observation: f.action_observation
                              ? `${f.action_observation} · ${chip}`
                              : chip,
                          }))} style={{
                            padding: '5px 12px', borderRadius: 99,
                            border: `1px solid ${H.border}`, background: H.surface,
                            color: H.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            transition: 'all .15s',
                          }}>
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── STEP 4: Confirmation ── */}
                {step === 4 && (
                  <>
                    {error && (
                      <div style={{ padding: '10px 14px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={14}/> {error}
                      </div>
                    )}

                    <div style={{ padding: '14px 16px', borderRadius: 14, background: `${H.accent}08`, border: `1px solid ${H.border}`, fontSize: 12, color: H.muted, lineHeight: 1.6 }}>
                      <strong style={{ color: H.accent }}>Résumé de l'inspection</strong>
                      {' · '}{hive.identifier} · {new Date(form.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px' }}>
                      {[
                        { l: 'Reine',      v: form.reine   ? 'Oui' : 'Non', c: form.reine   ? H.success : H.error },
                        { l: 'Œufs',       v: form.oeufs   ? 'Oui' : 'Non', c: form.oeufs   ? H.success : H.muted },
                        { l: 'Couvain',    v: form.couvain ? 'Oui' : 'Non', c: form.couvain ? H.success : H.muted },
                        { l: 'Pente',      v: form.pente_ok ? 'OK' : 'À vérif.', c: form.pente_ok ? H.success : H.warn },
                        { l: 'Population', v: form.population },
                        { l: 'Miel',       v: form.miel    },
                        { l: 'Pollen',     v: form.pollen  },
                        { l: 'Nb. Cadres', v: String(form.nb_cadres) },
                      ].map(r => (
                        <div key={r.l} style={{ padding: '6px 0', borderBottom: `1px solid ${H.border}` }}>
                          <div style={{ fontSize: 10, color: H.dim }}>{r.l}</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: r.c || H.text }}>{r.v}</div>
                        </div>
                      ))}
                    </div>

                    {form.action_observation && (
                      <div style={{ padding: '10px 14px', borderRadius: 12, background: `${H.accent}08`, border: `1px solid ${H.border}`, fontSize: 12, color: H.muted, lineHeight: 1.6 }}>
                        📝 {form.action_observation}
                      </div>
                    )}

                    <button onClick={handleSubmit} disabled={submitting} style={{
                      width: '100%', height: 56, borderRadius: 16, cursor: submitting ? 'not-allowed' : 'pointer',
                      background: submitting ? H.border : `linear-gradient(135deg, ${H.success}, #065F46)`,
                      border: 'none', color: submitting ? H.muted : '#fff',
                      fontWeight: 900, fontSize: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      boxShadow: submitting ? 'none' : `0 8px 24px ${H.success}35`,
                      transition: 'all .2s',
                    }}>
                      {submitting ? (
                        <><div style={{ width: 20, height: 20, border: `3px solid rgba(255,255,255,.3)`, borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/> Enregistrement…</>
                      ) : (
                        <><Check size={20}/> Enregistrer l'inspection</>
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* Nav */}
              {step < 4 && (
                <NavRow
                  onPrev={step > 1 ? prev : null}
                  onNext={next}
                />
              )}
              {step === 4 && (
                <button onClick={prev} style={{
                  width: '100%', height: 44, borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${H.border}`, background: H.bg,
                  color: H.muted, fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}>
                  <ArrowLeft size={15}/> Modifier
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ════ TAB: HISTORIQUE ════ */}
      {tab === 'history' && (
        <div style={{ padding: '16px 14px 40px' }}>
          {visits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: H.muted }}>
              <span style={{ fontSize: 48, display: 'block', marginBottom: 14 }}>📋</span>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Aucune inspection</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                Cette ruche n'a pas encore d'historique d'inspections.
              </div>
              <button onClick={() => setTab('inspect')} style={{
                padding: '12px 28px', borderRadius: 14, cursor: 'pointer',
                background: `linear-gradient(135deg, ${H.accent}, ${H.accentDk})`,
                border: 'none', color: '#fff', fontWeight: 800, fontSize: 14,
              }}>
                + Première inspection
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: H.muted }}>
                  {visits.length} inspection{visits.length !== 1 ? 's' : ''} enregistrée{visits.length !== 1 ? 's' : ''}
                </div>
                <button onClick={() => setTab('inspect')} style={{
                  padding: '7px 16px', borderRadius: 10, cursor: 'pointer',
                  background: `linear-gradient(135deg, ${H.accent}, ${H.accentDk})`,
                  border: 'none', color: '#fff', fontWeight: 700, fontSize: 12,
                }}>
                  + Nouveau
                </button>
              </div>
              {visits.map((v, i) => <VisitCard key={v.id || i} v={v} hive={hive} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
