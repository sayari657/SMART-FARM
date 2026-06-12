import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, Sprout, SprayCan, ChevronLeft, ChevronRight,
  Bell, BellRing, Loader2, MapPin, Snowflake, AlertTriangle,
  CheckCircle2, X, Wheat, Thermometer, Microscope, TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { calendarAPI, alertsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const T = {
  surface:    '#ffffff',
  surfaceAlt: '#f8fafc',
  border:     '#e2e8f0',
  green:      '#16a34a',
  greenLt:    '#dcfce7',
  amber:      '#d97706',
  amberLt:    '#fef3c7',
  red:        '#dc2626',
  redLt:      '#fee2e2',
  blue:       '#2563eb',
  blueLt:     '#dbeafe',
  textPri:    '#0f172a',
  textSec:    '#475569',
  textMut:    '#94a3b8',
  shadow:     '0 1px 3px rgba(0,0,0,0.06),0 2px 8px rgba(0,0,0,0.05)',
  shadowMd:   '0 4px 12px rgba(0,0,0,0.07),0 8px 24px rgba(0,0,0,0.06)',
};

const ZONES = [
  { id: 'nord',   label: 'Nord',    desc: 'Tell · Kroumirie' },
  { id: 'centre', label: 'Centre',  desc: 'Dorsale · Steppes' },
  { id: 'cotier', label: 'Côtier',  desc: 'Sahel · Cap Bon' },
  { id: 'sud',    label: 'Sud',     desc: 'Jeffara · Oasis' },
];

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const STAGE_COLORS = {
  semis: T.green, pepiniere: T.green, plantation: T.green, transplantation: T.green,
  repiquage: T.green, levee: T.green, tallage: T.green,
  floraison: T.amber, nouaison: T.amber, pollinisation: T.amber, debourrement: T.amber,
  epiaison: T.amber, croissance: T.amber, veraison: T.amber, ensachage: T.amber,
  recolte: T.blue, taille: T.red,
};

const cropLabel = (c) => (c || '').replace(/_/g, ' ').replace(/^\w/, (s) => s.toUpperCase());

const GDD_CROPS = ['olivier', 'vigne', 'agrumes', 'tomate', 'ble_dur', 'amandier'];
const RISK_COLORS = { critical: '#dc2626', high: '#ea580c', moderate: '#d97706', low: '#16a34a' };

export default function CropCalendar() {
  const { t } = useTranslation();
  const { farmId, user } = useAuth();

  const [zone,       setZone]       = useState('nord');
  const [month,      setMonth]      = useState(new Date().getMonth() + 1);
  const [crops,      setCrops]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [phenoAlerts, setPheno]     = useState([]);
  const [autoZone,   setAutoZone]   = useState(null);
  const [timeline,   setTimeline]   = useState(null);   // {culture, calendrier_mensuel,...}
  const [tlLoading,  setTlLoading]  = useState(false);
  const [notifying,  setNotifying]  = useState(false);
  const [notified,   setNotified]   = useState(null);   // {recipients, whatsapp_sent}
  const [gddCrop,    setGddCrop]    = useState('olivier');
  const [gdd,        setGdd]        = useState(null);    // phénologie degrés-jours
  const [gddLoading, setGddLoading] = useState(false);
  const [risks,      setRisks]      = useState([]);      // indices risque maladie

  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';

  // Cultures + actions du mois sélectionné
  useEffect(() => {
    let alive = true;
    setLoading(true);
    calendarAPI.crops(zone, month)
      .then((r) => { if (alive) setCrops(Array.isArray(r.data?.crops) ? r.data.crops : []); })
      .catch(() => { if (alive) setCrops([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [zone, month]);

  // Alertes phénologiques de la ferme (zone auto-détectée par latitude + météo gel)
  useEffect(() => {
    if (!farmId) return;
    calendarAPI.alerts(farmId)
      .then((r) => {
        setPheno(Array.isArray(r.data?.alerts) ? r.data.alerts : []);
        if (r.data?.zone) { setAutoZone(r.data.zone); setZone(r.data.zone); }
      })
      .catch(() => setPheno([]));
    calendarAPI.diseaseRisk(farmId)
      .then((r) => setRisks(Array.isArray(r.data?.risks) ? r.data.risks : []))
      .catch(() => setRisks([]));
  }, [farmId]);

  // Phénologie GDD (modèle degrés-jours ERA5) pour la culture sélectionnée
  useEffect(() => {
    if (!farmId) return;
    let alive = true;
    setGddLoading(true);
    calendarAPI.gdd(farmId, gddCrop)
      .then((r) => { if (alive) setGdd(r.data?.error ? null : r.data); })
      .catch(() => { if (alive) setGdd(null); })
      .finally(() => { if (alive) setGddLoading(false); });
    return () => { alive = false; };
  }, [farmId, gddCrop]);

  const openTimeline = useCallback(async (crop) => {
    setTlLoading(true);
    try {
      const r = await calendarAPI.timeline(crop, zone);
      setTimeline(r.data);
    } catch { setTimeline(null); }
    finally { setTlLoading(false); }
  }, [zone]);

  // Envoie les actions + traitements du mois à la ferme (owner + ouvriers, WhatsApp + push)
  const notifyFarm = async () => {
    if (!farmId || notifying || !crops.length) return;
    setNotifying(true);
    setNotified(null);
    try {
      const lines = crops.slice(0, 8).map((c) => {
        const treats = (c.traitements_preventifs || [])
          .map((tr) => ` → ${tr.traitement} (${tr.cible})`).join('');
        return `• ${cropLabel(c.culture)} [${c.stade}] : ${c.action}${treats}`;
      });
      const title = `${t('crop_calendar.notif_title')} — ${MONTHS_FR[month - 1]}`;
      const res = await alertsAPI.notify(farmId, title, lines.join('\n'), 'all');
      setNotified(res.data);
    } catch {
      setNotified({ error: true });
    } finally { setNotifying(false); }
  };

  const frostAlerts = phenoAlerts.filter((a) => a.severity === 'critical');
  const treatCount  = crops.reduce((n, c) => n + (c.traitements_preventifs?.length || 0), 0);

  return (
    <div style={{ marginBottom: 40 }}>
      {/* ── Header ── */}
      <div style={{
        background: T.surface, border: `1.5px solid ${T.border}`,
        borderLeft: `5px solid ${T.green}`, borderRadius: 16,
        padding: '16px 22px', marginBottom: 16, boxShadow: T.shadowMd,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg,${T.green},#15803d)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 5px 15px ${T.green}44`, flexShrink: 0 }}>
          <CalendarDays size={24} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: T.textPri, letterSpacing: -0.4 }}>{t('crop_calendar.title')}</h2>
            <span style={{ fontSize: 8, padding: '2px 9px', borderRadius: 99, background: T.greenLt, color: T.green, border: `1px solid ${T.green}44`, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>FAO · AVFA · CRDA</span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textMut }}>{t('crop_calendar.subtitle')}</p>
        </div>

        {/* Bouton notifier la ferme */}
        {isOwner && farmId && (
          <button onClick={notifyFarm} disabled={notifying || !crops.length} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
            background: notifying ? T.surfaceAlt : `linear-gradient(135deg,${T.green},#15803d)`,
            border: 'none', borderRadius: 11, color: notifying ? T.textMut : '#fff',
            fontSize: 11, fontWeight: 800, cursor: notifying ? 'default' : 'pointer',
            boxShadow: notifying ? 'none' : `0 4px 12px ${T.green}44`,
          }}>
            {notifying
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> {t('crop_calendar.sending')}</>
              : <><BellRing size={13} /> {t('crop_calendar.notify_farm')}</>}
          </button>
        )}
      </div>

      {/* Confirmation d'envoi */}
      {notified && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
          background: notified.error ? T.redLt : T.greenLt, borderRadius: 12, marginBottom: 14,
          border: `1.5px solid ${notified.error ? T.red : T.green}44`, fontSize: 12, fontWeight: 700,
          color: notified.error ? T.red : T.green,
        }}>
          {notified.error ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          {notified.error
            ? t('crop_calendar.notify_error')
            : `${t('crop_calendar.notify_ok')} — ${notified.recipients} ${t('crop_calendar.recipients')}, ${notified.whatsapp_sent} WhatsApp`}
          <button onClick={() => setNotified(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', lineHeight: 0 }}><X size={14} /></button>
        </div>
      )}

      {/* ── Alertes gel critiques (météo temps réel) ── */}
      {frostAlerts.map((a, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
          background: T.redLt, border: `1.5px solid ${T.red}55`, borderRadius: 13,
          marginBottom: 14, boxShadow: T.shadow,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', border: `1.5px solid ${T.red}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Snowflake size={17} color={T.red} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.red }}>{a.message}</div>
            {a.action_immediate && <div style={{ fontSize: 10, color: T.textSec, marginTop: 2 }}>⚡ {a.action_immediate}</div>}
          </div>
          <span style={{ fontSize: 8, padding: '3px 10px', borderRadius: 99, background: T.red, color: '#fff', fontWeight: 900, letterSpacing: 0.8 }}>CRITIQUE</span>
        </div>
      ))}

      {/* ── Modèle GDD (degrés-jours) + Risques maladies météo-pilotés ── */}
      {farmId && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 14, marginBottom: 16 }}>

          {/* Phénologie GDD */}
          <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderTop: `3px solid ${T.blue}`, borderRadius: 14, padding: '14px 16px', boxShadow: T.shadow }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: T.blueLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Thermometer size={15} color={T.blue} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.textPri }}>{t('crop_calendar.gdd_title')}</div>
                <div style={{ fontSize: 8.5, color: T.textMut }}>ERA5 · Open-Meteo · base {gdd?.t_base ?? 10}°C</div>
              </div>
              <select value={gddCrop} onChange={(e) => setGddCrop(e.target.value)} style={{
                fontSize: 10, fontWeight: 700, color: T.textSec, background: T.surfaceAlt,
                border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '4px 8px', cursor: 'pointer',
              }}>
                {GDD_CROPS.map((c) => <option key={c} value={c}>{cropLabel(c)}</option>)}
              </select>
            </div>
            {gddLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Loader2 size={15} color={T.blue} style={{ animation: 'spin 1s linear infinite' }} /></div>
            ) : !gdd ? (
              <div style={{ fontSize: 10, color: T.textMut, padding: '8px 0' }}>{t('crop_calendar.gdd_unavailable')}</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
                  <span style={{ fontSize: 26, fontWeight: 900, color: T.blue, letterSpacing: -1 }}>{Math.round(gdd.gdd_cum)}</span>
                  <span style={{ fontSize: 10, color: T.textMut, fontWeight: 700 }}>DJ {t('crop_calendar.gdd_since')} {gdd.since?.slice(5)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, background: T.greenLt, color: T.green, padding: '2px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {(gdd.stade_actuel?.stade || '').replace(/_/g, ' ')}
                  </span>
                  {gdd.stade_suivant && (
                    <span style={{ fontSize: 9, color: T.textMut }}>
                      → {(gdd.stade_suivant.stade || '').replace(/_/g, ' ')} ({Math.round(gdd.stade_suivant.gdd_restants)} DJ)
                    </span>
                  )}
                </div>
                {gdd.progression_pct != null && (
                  <div style={{ height: 6, background: T.blueLt, borderRadius: 99, overflow: 'hidden', marginBottom: 7 }}>
                    <div style={{ width: `${Math.min(100, gdd.progression_pct)}%`, height: '100%', background: `linear-gradient(90deg,${T.blue}88,${T.blue})`, borderRadius: 99 }} />
                  </div>
                )}
                <div style={{ fontSize: 10.5, color: T.textSec, lineHeight: 1.5 }}>
                  <TrendingUp size={10} color={T.blue} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  {gdd.stade_actuel?.action}
                </div>
              </>
            )}
          </div>

          {/* Risques maladies */}
          <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderTop: `3px solid ${T.amber}`, borderRadius: 14, padding: '14px 16px', boxShadow: T.shadow }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: T.amberLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Microscope size={15} color={T.amber} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.textPri }}>{t('crop_calendar.risk_title')}</div>
                <div style={{ fontSize: 8.5, color: T.textMut }}>{t('crop_calendar.risk_subtitle')}</div>
              </div>
            </div>
            {risks.length === 0 ? (
              <div style={{ fontSize: 10, color: T.textMut, padding: '8px 0' }}>{t('crop_calendar.gdd_unavailable')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {risks.slice(0, 5).map((r, i) => {
                  const rc = RISK_COLORS[r.niveau] || T.green;
                  return (
                    <div key={i} title={`${r.justification} — ${r.recommandation}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: T.textSec }}>{r.maladie}</span>
                        <span style={{ fontSize: 10, fontWeight: 900, color: rc }}>{r.score}%</span>
                      </div>
                      <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${r.score}%`, height: '100%', background: rc, borderRadius: 99, transition: 'width 0.5s ease' }} />
                      </div>
                      {(r.niveau === 'high' || r.niveau === 'critical') && (
                        <div style={{ fontSize: 9, color: rc, marginTop: 2, fontWeight: 600 }}>💊 {r.recommandation}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sélecteurs zone + mois ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ZONES.map((z) => (
            <button key={z.id} onClick={() => setZone(z.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '7px 14px', borderRadius: 11, cursor: 'pointer',
              background: zone === z.id ? T.greenLt : T.surface,
              border: `1.5px solid ${zone === z.id ? T.green : T.border}`,
              boxShadow: T.shadow,
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: zone === z.id ? T.green : T.textSec, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={10} /> {z.label}
                {autoZone === z.id && <span style={{ fontSize: 7, background: T.green, color: '#fff', borderRadius: 99, padding: '1px 6px', fontWeight: 900 }}>{t('crop_calendar.my_farm')}</span>}
              </span>
              <span style={{ fontSize: 8, color: T.textMut }}>{z.desc}</span>
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 11, padding: '5px 8px', boxShadow: T.shadow }}>
          <button onClick={() => setMonth((m) => (m === 1 ? 12 : m - 1))} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textSec }}><ChevronLeft size={13} /></button>
          <span style={{ fontSize: 12, fontWeight: 800, color: T.textPri, minWidth: 86, textAlign: 'center' }}>{MONTHS_FR[month - 1]}</span>
          <button onClick={() => setMonth((m) => (m === 12 ? 1 : m + 1))} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textSec }}><ChevronRight size={13} /></button>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: T.green, background: T.greenLt, padding: '4px 12px', borderRadius: 99, border: `1px solid ${T.green}33` }}>
            {crops.length} {t('crop_calendar.cultures')}
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, color: T.amber, background: T.amberLt, padding: '4px 12px', borderRadius: 99, border: `1px solid ${T.amber}33` }}>
            {treatCount} {t('crop_calendar.treatments')}
          </span>
        </div>
      </div>

      {/* ── Cartes cultures du mois ── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '38px 0', color: T.textMut, fontSize: 12 }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('crop_calendar.loading')}
        </div>
      ) : crops.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '34px 0', background: T.surface, borderRadius: 14, border: `2px dashed ${T.border}`, color: T.textMut, fontSize: 12 }}>
          {t('crop_calendar.no_crops')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,280px),1fr))', gap: 12 }}>
          {crops.map((c, i) => {
            const sc = STAGE_COLORS[c.stade] || T.green;
            return (
              <div key={`${c.culture}-${c.stade}-${i}`} style={{
                background: T.surface, border: `1.5px solid ${T.border}`, borderTop: `3px solid ${sc}`,
                borderRadius: 14, padding: '14px 16px', boxShadow: T.shadow,
                animation: `slideUp 0.25s ease ${i * 0.03}s both`, cursor: 'pointer',
              }}
              onClick={() => openTimeline(c.culture)}
              title={t('crop_calendar.see_timeline')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${sc}18`, border: `1.5px solid ${sc}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {c.stade === 'recolte' ? <Wheat size={15} color={sc} /> : <Sprout size={15} color={sc} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: T.textPri }}>{cropLabel(c.culture)}</div>
                    <div style={{ fontSize: 8, color: sc, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>{c.stade}</div>
                  </div>
                  <span style={{ fontSize: 8, color: T.textMut, fontWeight: 700, flexShrink: 0 }}>
                    {MONTHS_FR[c.mois_debut - 1]?.slice(0, 3)} → {MONTHS_FR[c.mois_fin - 1]?.slice(0, 3)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: T.textSec, lineHeight: 1.55 }}>{c.action}</div>
                {(c.traitements_preventifs || []).map((tr, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 8, padding: '7px 10px', background: T.amberLt, borderRadius: 9, border: `1px solid ${T.amber}33` }}>
                    <SprayCan size={12} color={T.amber} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: T.amber }}>{tr.traitement}</div>
                      <div style={{ fontSize: 9, color: T.textSec }}>{t('crop_calendar.target')} : {tr.cible}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal timeline 12 mois ── */}
      {(timeline || tlLoading) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => { setTimeline(null); setTlLoading(false); }}>
          <div style={{ width: '100%', maxWidth: 760, maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: T.surface, borderRadius: 20, overflow: 'hidden', border: `1.5px solid ${T.border}` }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '14px 22px', borderBottom: `1.5px solid ${T.border}`, background: T.surfaceAlt, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CalendarDays size={17} color={T.green} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.textPri }}>
                  {tlLoading ? t('crop_calendar.loading') : `${cropLabel(timeline?.culture)} — ${t('crop_calendar.annual_timeline')}`}
                </div>
                <div style={{ fontSize: 9, color: T.textMut }}>{t('crop_calendar.zone')} : {timeline?.zone || zone}</div>
              </div>
              <button onClick={() => { setTimeline(null); setTlLoading(false); }} style={{ background: T.surfaceAlt, border: `1.5px solid ${T.border}`, color: T.textSec, cursor: 'pointer', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
            </div>
            <div style={{ padding: 18, overflowY: 'auto' }}>
              {tlLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><Loader2 size={20} color={T.green} style={{ animation: 'spin 1s linear infinite' }} /></div>
              ) : timeline?.error ? (
                <div style={{ textAlign: 'center', color: T.textMut, fontSize: 12, padding: 20 }}>{timeline.error}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(timeline?.calendrier_mensuel || {}).map(([m, data]) => (
                    <div key={m} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: T.surfaceAlt, borderRadius: 11, border: `1px solid ${T.border}` }}>
                      <div style={{ width: 72, flexShrink: 0, fontSize: 11, fontWeight: 900, color: +m === new Date().getMonth() + 1 ? T.green : T.textSec }}>
                        {MONTHS_FR[+m - 1]}
                        {+m === new Date().getMonth() + 1 && <div style={{ fontSize: 7, color: T.green, fontWeight: 800 }}>● {t('crop_calendar.current')}</div>}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(data.actions || []).map((a, i) => (
                          <div key={i} style={{ fontSize: 11, color: T.textSec }}>
                            <span style={{ fontWeight: 800, color: STAGE_COLORS[a.stade] || T.green, textTransform: 'uppercase', fontSize: 9, letterSpacing: 0.6 }}>{a.stade}</span> — {a.action}
                          </div>
                        ))}
                        {(data.traitements || []).map((tr, i) => (
                          <div key={i} style={{ fontSize: 10, color: T.amber, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <SprayCan size={10} /> {tr.traitement} → {tr.cible}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Alertes phénologiques info (liées page Alertes) ── */}
      {phenoAlerts.filter((a) => a.severity === 'info').length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: T.textMut }}>
          <Bell size={11} color={T.green} />
          {phenoAlerts.filter((a) => a.severity === 'info').length} {t('crop_calendar.pheno_in_alerts')}
        </div>
      )}
    </div>
  );
}
