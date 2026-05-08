import { useState, useEffect } from 'react';
import {
  Bird, Egg, AlertTriangle, TrendingUp, Activity, Bell, BarChart2,
  Heart, DollarSign, Eye, Calendar,
  CheckCircle, Shield, Layers, Users, ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import AnimalERP from '../components/AnimalERP';
import AIScanner from '../components/AIScanner';
import ExpertAssistant from '../components/expert/ExpertAssistant';
import { farmsAPI, workerTasksAPI, farmWorkersAPI, poultryAPI, settingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C       = '#0891b2';   // poultry cyan (matches SPECIES_COLORS.poultry)
const C_DARK  = '#0369a1';

// ─── Static data ──────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Élevages Actifs',        value: '3',     icon: Bird,          color: C },
  { label: 'Production Œufs / Jour', value: '2 840', icon: Egg,           color: '#059669' },
  { label: 'Mortalité Moyenne',      value: '2.3%',  icon: AlertTriangle, color: '#f59e0b' },
  { label: 'FCR Moyen',              value: '1.67',  icon: TrendingUp,    color: '#7c3aed' },
];

const FEATURES = [
  { icon: Activity,   title: 'Surveillance Temps Réel', color: C,
    desc: 'Suivi en temps réel de la production, FCR et mortalité — actualisé à chaque saisie.' },
  { icon: Bell,       title: 'Alertes Intelligentes',    color: '#ef4444',
    desc: 'Seuils configurables + règles FCR/mortalité → alertes push instantanées.' },
  { icon: BarChart2,  title: 'Analytique Production',    color: '#7c3aed',
    desc: 'Courbes œufs, poids vif, FCR par lot avec export PDF/CSV.' },
  { icon: Heart,      title: 'Suivi Santé & Vaccins',    color: '#10b981',
    desc: 'Carnet vaccinal, journal vétérinaire, traçabilité médicament par lot.' },
  { icon: Users,      title: 'Gestion Équipe & Tâches',  color: '#f59e0b',
    desc: 'Assignation des tâches, suivi du personnel de ferme et historique d\'activité.' },
  { icon: DollarSign, title: 'Gestion Financière',       color: '#06b6d4',
    desc: 'Ventes, achats aliments, frais vétérinaires — bilan rentabilité en temps réel.' },
];

const AI_DETECTIONS = [
  { icon: Bird,          title: 'Détection Comportement',
    desc: 'YOLO v11 identifie les comportements anormaux : entassement, léthargie, agitation.' },
  { icon: Shield,        title: 'Prédiction Maladies',
    desc: 'Analyse visuelle des symptômes respiratoires avec confiance > 85%.' },
  { icon: AlertTriangle, title: 'Alertes Critiques',
    desc: 'Notification instantanée en cas de forte mortalité ou fièvre détectée.' },
];

// ─── Protocol / timetable data ────────────────────────────────────────────────
const INCUBATION_PHASES = [
  { phase: 'Incubation Initiale', days: 'J1 – J7',   temp: '37.8°C', humidity: '60–65%', turning: '4× / jour',  color: C },
  { phase: 'Développement',       days: 'J8 – J14',  temp: '37.6°C', humidity: '55–60%', turning: '3× / jour',  color: C_DARK },
  { phase: 'Pré-éclosion',        days: 'J15 – J18', temp: '37.4°C', humidity: '65–70%', turning: 'Arrêter',    color: '#7c3aed' },
  { phase: 'Éclosion',            days: 'J19 – J21', temp: '37.2°C', humidity: '75–80%', turning: '—',          color: '#059669' },
];

const VACCINES = {
  broiler: [
    { day:  1, vaccine: 'Marek (Hatchery)',              route: 'Injection SC',    note: "À l'écloserie" },
    { day:  7, vaccine: 'Newcastle + Bronchite (ND+IB)', route: 'Spray / Eau',     note: 'Ma5 + H120' },
    { day: 14, vaccine: 'Gumboro (IBD)',                 route: 'Eau de boisson',  note: 'D78 ou Bursine' },
    { day: 18, vaccine: 'Newcastle rappel (ND)',         route: 'Eau de boisson',  note: 'Clone 30' },
    { day: 21, vaccine: 'Gumboro rappel (IBD)',          route: 'Eau de boisson',  note: 'Si nécessaire' },
    { day: 28, vaccine: 'Newcastle final (ND)',          route: 'Eau de boisson',  note: 'Avant abattage' },
  ],
  layer: [
    { day:   1, vaccine: 'Marek (Hatchery)',              route: 'Injection SC',   note: "À l'écloserie" },
    { day:   7, vaccine: 'Newcastle + Bronchite (ND+IB)', route: 'Spray',          note: 'Ma5 + H120' },
    { day:  14, vaccine: 'Gumboro (IBD)',                 route: 'Eau de boisson', note: 'D78' },
    { day:  21, vaccine: 'Newcastle rappel',              route: 'Eau de boisson', note: 'Clone 30' },
    { day:  42, vaccine: 'Marek rappel',                  route: 'Injection',      note: 'Si recommandé' },
    { day:  56, vaccine: 'ND + IB rappel',                route: 'Spray',          note: 'Avant ponte' },
    { day:  84, vaccine: 'EDS 76',                        route: 'Injection',      note: 'Syndrome chute ponte' },
    { day: 112, vaccine: 'ND + IB avant ponte',           route: 'Eau de boisson', note: '4 sem. avant 1ère ponte' },
  ],
};

const FCR_TABLE = [
  { age: 'J7',  poids:  190, cumul:   170, fcr: 0.89 },
  { age: 'J14', poids:  475, cumul:   580, fcr: 1.22 },
  { age: 'J21', poids:  960, cumul:  1420, fcr: 1.48 },
  { age: 'J28', poids: 1580, cumul:  2740, fcr: 1.73 },
  { age: 'J35', poids: 2300, cumul:  4500, fcr: 1.96 },
  { age: 'J42', poids: 2950, cumul:  6600, fcr: 2.24 },
];

// ─── CSS keyframe animations (injected once) ─────────────────────────────────
const ANIM_CSS = `
  @keyframes poultry-fadeUp {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes poultry-pulse {
    0%, 100% { opacity: 1;   }
    50%       { opacity: .6; }
  }
  .p-fade-1 { animation: poultry-fadeUp .5s      ease both; }
  .p-fade-2 { animation: poultry-fadeUp .5s .1s  ease both; }
  .p-fade-3 { animation: poultry-fadeUp .5s .2s  ease both; }
  .p-pulse  { animation: poultry-pulse  2s        infinite; }
`;

// ─── Reusable micro-components ────────────────────────────────────────────────

function TabBtn({ id, label, icon: Icon, active, onClick, activeColor }) {
  const ac = activeColor || C;
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '9px 18px', borderRadius: 999, border: 'none',
        background:  active ? ac : 'transparent',
        color:       active ? 'white' : 'var(--color-text-2)',
        fontWeight:  active ? 700 : 500,
        fontSize: 13, cursor: 'pointer', transition: 'all .2s',
        boxShadow: active ? `0 3px 10px ${ac}44` : 'none',
      }}
    >
      <Icon size={14} />{label}
    </button>
  );
}

function StatCard({ value, label, icon: Icon, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '20px 14px' }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, margin: '0 auto 12px',
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color }) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${color}`, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={color} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  );
}

// ─── Tab 1: APERÇU ────────────────────────────────────────────────────────────

function AperçuTab({ onGoToERP }) {
  const { farmId } = useAuth();
  const { t, i18n } = useTranslation();
  const [liveStats, setLiveStats] = useState(null);
  const [batches,   setBatches]   = useState([]);

  useEffect(() => {
    const fid = farmId || 1;
    poultryAPI.stats(fid).then(r => setLiveStats(r.data)).catch(() => {});
    poultryAPI.batches.list(fid).then(r => setBatches(r.data || [])).catch(() => {});
  }, [farmId]);

  const statLabels = [
    t('poultry.apercu.stat_farms'),
    t('poultry.apercu.stat_eggs'),
    t('poultry.apercu.stat_mortality'),
    t('poultry.apercu.stat_fcr'),
  ];

  const displayStats = liveStats ? [
    { ...STATS[0], value: String(liveStats.active_batches), label: statLabels[0] },
    { ...STATS[1], value: liveStats.eggs_today.toLocaleString(), label: statLabels[1] },
    { ...STATS[2], value: `${liveStats.mortality_rate}%`, label: statLabels[2] },
    { ...STATS[3], value: liveStats.avg_fcr != null ? String(liveStats.avg_fcr) : '—', label: statLabels[3] },
  ] : STATS.map((s, i) => ({ ...s, label: statLabels[i] }));

  const featuresList = [
    { icon: Activity,   color: C,         title: t('poultry.apercu.feat_realtime'),  desc: t('poultry.apercu.feat_realtime_desc')  },
    { icon: Bell,       color: '#ef4444', title: t('poultry.apercu.feat_alerts'),    desc: t('poultry.apercu.feat_alerts_desc')    },
    { icon: BarChart2,  color: '#7c3aed', title: t('poultry.apercu.feat_analytics'), desc: t('poultry.apercu.feat_analytics_desc') },
    { icon: Heart,      color: '#10b981', title: t('poultry.apercu.feat_health'),    desc: t('poultry.apercu.feat_health_desc')    },
    { icon: Users,      color: '#f59e0b', title: t('poultry.apercu.feat_team'),      desc: t('poultry.apercu.feat_team_desc')      },
    { icon: DollarSign, color: '#06b6d4', title: t('poultry.apercu.feat_finance'),   desc: t('poultry.apercu.feat_finance_desc')   },
  ];

  const getBatchAge = (b) => {
    if (!b?.arrival_date) return null;
    const ms = Date.now() - new Date(b.arrival_date).getTime();
    return Math.max(1, Math.floor(ms / 86400000) + 1);
  };

  return (
    <div>

      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${C} 0%, #06b6d4 55%, ${C_DARK} 100%)`,
        borderRadius: 16, padding: '52px 44px', marginBottom: 28,
        position: 'relative', overflow: 'hidden', color: 'white',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 600 }}>
          <div className="p-fade-1" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(8px)',
            borderRadius: 999, padding: '5px 14px', marginBottom: 18,
            fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,.2)',
          }}>
            <Bird size={13} /> {t('poultry.apercu.badge')}
          </div>

          <h1 className="p-fade-2" style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.2, margin: '0 0 14px' }}>
            Smart Poultry<br />ERP System
          </h1>

          <p className="p-fade-3" style={{ fontSize: 14, opacity: .88, lineHeight: 1.75, margin: '0 0 28px' }}>
            {t('poultry.apercu.hero_desc')}
          </p>

          {/* Live KPI pills — only shown when real data loaded */}
          {liveStats && (
            <div className="p-fade-3" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
              {[
                { v: liveStats.total_birds?.toLocaleString() ?? liveStats.active_batches, l: t('poultry.apercu.pill_birds') },
                { v: liveStats.active_batches > 0 && liveStats.total_birds > 0
                    ? `${(liveStats.eggs_today / liveStats.total_birds * 100).toFixed(1)}%`
                    : '—',
                  l: t('poultry.apercu.pill_rate') },
                { v: `${liveStats.active_batches} lot${liveStats.active_batches !== 1 ? 's' : ''}`, l: t('poultry.apercu.pill_lots') },
              ].map(k => (
                <div key={k.l} className="p-pulse" style={{
                  background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(6px)',
                  borderRadius: 999, padding: '5px 14px',
                  fontSize: 13, fontWeight: 700, border: '1px solid rgba(255,255,255,.25)',
                }}>
                  <span style={{ fontWeight: 900 }}>{k.v}</span>
                  <span style={{ opacity: .8, marginLeft: 5 }}>{k.l}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onGoToERP}
            style={{
              background: 'white', color: C, border: 'none',
              borderRadius: 999, padding: '11px 26px',
              fontWeight: 800, fontSize: 14, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,.18)', transition: 'transform .15s',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
            onMouseOut={e  => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {t('poultry.apercu.hero_btn')} <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 28 }}>
        {displayStats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Live batch status cards */}
      {batches.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{t('poultry.apercu.batches_title')}</h2>
            <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{batches.filter(b => b.status === 'active').length} {t('poultry.apercu.batches_active')} · {batches.length} {t('poultry.apercu.batches_total')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {batches.map(b => {
              const age       = getBatchAge(b);
              const maxDays   = b.batch_type === 'layer' ? 112 : 42;
              const pct       = age != null ? Math.min(100, (age / maxDays) * 100) : 0;
              const isActive  = b.status === 'active';
              const clr       = isActive ? C : '#94a3b8';
              return (
                <div key={b.id} className="card" style={{ padding: 18, borderTop: `3px solid ${clr}`, cursor: 'pointer' }} onClick={onGoToERP}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>{b.breed || b.batch_type}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {age != null && <div style={{ fontSize: 22, fontWeight: 900, color: clr, lineHeight: 1 }}>J{age}</div>}
                      <span style={{ fontSize: 9, fontWeight: 800, color: isActive ? '#10b981' : '#94a3b8', background: isActive ? '#dcfce7' : '#f1f5f9', padding: '2px 8px', borderRadius: 999 }}>
                        {b.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {/* Lifecycle bar */}
                  {age != null && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ height: 5, background: 'var(--color-surface-2)', borderRadius: 999 }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: isActive ? `linear-gradient(90deg, ${C_DARK}, ${C})` : '#94a3b8' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--color-text-3)', marginTop: 3, fontWeight: 600 }}>
                        <span>J1</span>
                        <span>J{maxDays}</span>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--color-text-3)' }}>{t('poultry.apercu.effectif')}</span>
                    <span style={{ fontWeight: 800, color: clr }}>{b.current_quantity?.toLocaleString() ?? '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Features */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 5 }}>{t('poultry.apercu.features_title')}</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 18 }}>
          {t('poultry.apercu.features_sub')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 14 }}>
          {featuresList.map(f => <FeatureCard key={f.title} {...f} />)}
        </div>
      </div>

      {/* Vision section */}
      <div style={{
        padding: 30, borderRadius: 14,
        background: 'linear-gradient(135deg, var(--sidebar-bg), #1e3a4c)',
        color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Users size={18} color={C} />
          <span style={{ fontWeight: 800, fontSize: 16 }}>{t('poultry.apercu.vision_title')}</span>
        </div>
        <p style={{ fontSize: 13, opacity: .85, lineHeight: 1.75, margin: '0 0 18px' }}>
          {t('poultry.apercu.vision_desc')}
        </p>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {[
            { v: '3 ans',   l: t('poultry.apercu.stat_rd')           },
            { v: '12',      l: t('poultry.apercu.stat_farms_pilot')   },
            { v: '40',      l: t('poultry.apercu.stat_classes')       },
            { v: '100%',    l: t('poultry.apercu.stat_sovereign')     },
          ].map(m => (
            <div key={m.l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#67e8f9' }}>{m.v}</div>
              <div style={{ fontSize: 11, opacity: .7 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: SURVEILLANCE IA ───────────────────────────────────────────────────

function SurveillanceTab() {
  const { t } = useTranslation();
  const detections = [
    { icon: Bird,          title: t('poultry.surveillance.det_behavior'), desc: t('poultry.surveillance.det_behavior_desc') },
    { icon: Shield,        title: t('poultry.surveillance.det_disease'),  desc: t('poultry.surveillance.det_disease_desc')  },
    { icon: AlertTriangle, title: t('poultry.surveillance.det_alerts'),   desc: t('poultry.surveillance.det_alerts_desc')   },
  ];
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 5 }}>{t('poultry.surveillance.title')}</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
          {t('poultry.surveillance.subtitle')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 22 }}>
        {detections.map(d => (
          <div key={d.title} className="card" style={{ padding: 18, borderLeft: `3px solid ${C}` }}>
            <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${C}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <d.icon size={17} color={C} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{d.title}</div>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)', margin: 0, lineHeight: 1.6 }}>{d.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AIScanner category="livestock" title={t('poultry.surveillance.scanner_title')} color={C} />
    </div>
  );
}

// ─── Tab 4: PROTOCOLES & CALENDRIER ──────────────────────────────────────────

function ProtocolsTab() {
  const { farmId } = useAuth();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'en' ? 'en-US' : 'fr-FR';
  // ── Batch loading ─────────────────────────────────────────────────────────
  const [batches,         setBatches]         = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);

  useEffect(() => {
    poultryAPI.batches.list(farmId || 1)
      .then(r => {
        const bl = r.data || [];
        setBatches(bl);
        if (bl.length > 0) setSelectedBatchId(bl[0].id);
      })
      .catch(() => {});
  }, []);

  const selectedBatch = batches.find(b => b.id === selectedBatchId) ?? null;

  // ── Incubation state ──────────────────────────────────────────────────────
  const [incubPhases, setIncubPhases] = useState(() =>
    JSON.parse(localStorage.getItem('poultry_incubation_phases') || 'null') ?? INCUBATION_PHASES
  );
  const [editingIncub,   setEditingIncub]   = useState(false);
  const [incubDraft,     setIncubDraft]     = useState([]);
  const [incubStartDate, setIncubStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [calViewMonth,   setCalViewMonth]   = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });

  // ── Vaccines state ────────────────────────────────────────────────────────
  const [vaccines, setVaccines] = useState(() => ({
    broiler: JSON.parse(localStorage.getItem('poultry_vaccines_broiler') || 'null') ?? VACCINES.broiler,
    layer:   JSON.parse(localStorage.getItem('poultry_vaccines_layer')   || 'null') ?? VACCINES.layer,
  }));
  const [editingVaccines, setEditingVaccines] = useState(false);
  const [vaccineDraft,    setVaccineDraft]    = useState([]);

  // ── FCR state ─────────────────────────────────────────────────────────────
  const [fcrRows,    setFcrRows]    = useState(() =>
    JSON.parse(localStorage.getItem('poultry_fcr_table') || 'null') ?? FCR_TABLE
  );
  const [editingFcr, setEditingFcr] = useState(false);
  const [fcrDraft,   setFcrDraft]   = useState([]);

  // ── Load protocol data from backend (overrides localStorage on mount) ──────
  const _saveToBackend = (key, value) =>
    settingsAPI.upsert({ farm_id: farmId || 1, key, value: JSON.stringify(value) }).catch(() => {});

  useEffect(() => {
    const fid = farmId || 1;
    settingsAPI.list(fid).then(r => {
      const s = r.data || [];
      const get = (key, def) => {
        const found = s.find(x => x.key === key);
        if (found) { try { return JSON.parse(found.value); } catch { return def; } }
        // Migrate from localStorage on first API load
        const local = localStorage.getItem(key);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            settingsAPI.upsert({ farm_id: fid, key, value: local }).catch(() => {});
            return parsed;
          } catch { return def; }
        }
        return def;
      };
      setVaccines({
        broiler: get('poultry_vaccines_broiler', VACCINES.broiler),
        layer:   get('poultry_vaccines_layer',   VACCINES.layer),
      });
      setIncubPhases(get('poultry_incubation_phases', INCUBATION_PHASES));
      setFcrRows(get('poultry_fcr_table', FCR_TABLE));
    }).catch(() => {}); // fallback: keep localStorage-initialized defaults
  }, [farmId]);

  // ── Workers ───────────────────────────────────────────────────────────────
  const [workers,          setWorkers]          = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);

  useEffect(() => {
    farmWorkersAPI.list(farmId || 1)
      .then(r => {
        const wl = r.data || [];
        setWorkers(wl);
        if (wl.length > 0) setSelectedWorkerId(wl[0].worker_id ?? wl[0].id);
      })
      .catch(() => {});
  }, [farmId]);

  // Sync vaccine calendar month with incubStartDate
  const [vacCalMonth, setVacCalMonth] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  useEffect(() => {
    const d = new Date(incubStartDate + 'T12:00:00');
    setVacCalMonth({ year: d.getFullYear(), month: d.getMonth() });
  }, [incubStartDate]);

  // ── Vaccine push state (persisted per batch) ──────────────────────────────
  const [batchType, setBatchType] = useState('broiler');
  const [pushing,   setPushing]   = useState(null);
  const [pushed,    setPushed]    = useState(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`poultry_vax_pushed_${selectedBatchId}`) || '[]';
      setPushed(new Set(JSON.parse(raw)));
    } catch { setPushed(new Set()); }
  }, [selectedBatchId]);

  // Sync incubation start date from batch arrival date or saved override
  useEffect(() => {
    if (!selectedBatchId) return;
    const saved = localStorage.getItem(`incub_start_${selectedBatchId}`);
    const batch = batches.find(b => b.id === selectedBatchId);
    const dateStr = saved || batch?.arrival_date?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    setIncubStartDate(dateStr);
    const d = new Date(dateStr + 'T12:00:00');
    setCalViewMonth({ year: d.getFullYear(), month: d.getMonth() });
  }, [selectedBatchId, batches]);

  const handleIncubStartChange = (dateStr) => {
    setIncubStartDate(dateStr);
    if (selectedBatchId) localStorage.setItem(`incub_start_${selectedBatchId}`, dateStr);
    const d = new Date(dateStr + 'T12:00:00');
    setCalViewMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  // ── Phase tracker helpers ─────────────────────────────────────────────────
  const parseDayRange = (str) => {
    const m = String(str).match(/J?(\d+)\s*[–\-]\s*J?(\d+)/);
    return m ? { start: parseInt(m[1]), end: parseInt(m[2]) } : null;
  };
  const getBatchAge = (batch) => {
    if (!batch?.arrival_date) return null;
    const ms = Date.now() - new Date(batch.arrival_date).getTime();
    return Math.max(1, Math.floor(ms / 86400000) + 1);
  };
  const getCurrentPhaseIdx = (phases, day) => {
    for (let i = 0; i < phases.length; i++) {
      const r = parseDayRange(phases[i].days);
      if (r && day >= r.start && day <= r.end) return i;
    }
    const last = parseDayRange(phases[phases.length - 1]?.days);
    return (last && day > last.end) ? phases.length : -1;
  };
  const getTotalIncubDays = (phases) => {
    const last = parseDayRange(phases[phases.length - 1]?.days);
    return last ? last.end : 21;
  };

  // ── Push task ─────────────────────────────────────────────────────────────
  const pushVaccineTask = async (row, workerId) => {
    const key = `${batchType}-${row.day}`;
    if (pushed.has(key) || pushing) return;
    setPushing(key);
    const vacDate = new Date(new Date(incubStartDate + 'T12:00:00').getTime() + (row.day - 1) * 86400000);
    const worker  = workers.find(w => (w.worker_id ?? w.id) === (workerId ?? selectedWorkerId));
    try {
      await workerTasksAPI.create({
        title:       `💉 Vaccination J${row.day} — ${row.vaccine}`,
        category:    'health',
        priority:    'urgent',
        farm_id:     farmId || 1,
        worker_id:   workerId ?? selectedWorkerId ?? undefined,
        due_date:    vacDate.toISOString().slice(0, 10),
        description: `Voie: ${row.route}. ${row.note}${worker ? ` · Responsable: ${worker.full_name ?? worker.username}` : ''}`,
      });
      setPushed(prev => {
        const next = new Set([...prev, key]);
        localStorage.setItem(`poultry_vax_pushed_${selectedBatchId}`, JSON.stringify([...next]));
        return next;
      });
      toast.success(`Tâche créée${worker ? ` → ${worker.full_name ?? worker.username}` : ''}`);
    } catch (_) { toast.error('Erreur création tâche'); }
    finally { setPushing(null); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const inputStyle = {
    border: '1px solid var(--color-border-light)', borderRadius: 6,
    padding: '4px 8px', fontSize: 12,
    background: 'var(--color-surface-2)', width: '100%',
    color: 'var(--color-text-1)',
  };

  const startEditIncub    = () => { setIncubDraft(incubPhases.map(p => ({ ...p }))); setEditingIncub(true); };
  const saveIncub         = () => {
    setIncubPhases(incubDraft);
    localStorage.setItem('poultry_incubation_phases', JSON.stringify(incubDraft));
    _saveToBackend('poultry_incubation_phases', incubDraft);
    setEditingIncub(false);
  };
  const cancelIncub       = () => setEditingIncub(false);
  const loadDefaultsIncub = () => setIncubDraft(INCUBATION_PHASES.map(p => ({ ...p })));

  const currentVaccines      = vaccines[batchType];
  const startEditVaccines    = () => { setVaccineDraft(currentVaccines.map(v => ({ ...v }))); setEditingVaccines(true); };
  const saveVaccines         = () => {
    const updated = { ...vaccines, [batchType]: vaccineDraft };
    setVaccines(updated);
    localStorage.setItem(`poultry_vaccines_${batchType}`, JSON.stringify(vaccineDraft));
    _saveToBackend(`poultry_vaccines_${batchType}`, vaccineDraft);
    setEditingVaccines(false);
  };
  const cancelVaccines       = () => setEditingVaccines(false);
  const loadDefaultsVaccines = () => setVaccineDraft(VACCINES[batchType].map(v => ({ ...v })));

  const startEditFcr    = () => { setFcrDraft(fcrRows.map(r => ({ ...r }))); setEditingFcr(true); };
  const saveFcr         = () => {
    setFcrRows(fcrDraft);
    localStorage.setItem('poultry_fcr_table', JSON.stringify(fcrDraft));
    _saveToBackend('poultry_fcr_table', fcrDraft);
    setEditingFcr(false);
  };
  const cancelFcr       = () => setEditingFcr(false);
  const loadDefaultsFcr = () => setFcrDraft(FCR_TABLE.map(r => ({ ...r })));

  // ── Shared action bar ─────────────────────────────────────────────────────
  const ActionBar = ({ editing, onEdit, onSave, onCancel, onDefaults }) => (
    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
      {editing ? (
        <>
          <button onClick={onDefaults} style={{ padding: '5px 11px', border: '1px solid var(--color-border-light)', borderRadius: 6, fontSize: 12, background: 'var(--color-surface-2)', cursor: 'pointer', color: 'var(--color-text-2)' }}>{t('poultry.protocols.incub_defaults')}</button>
          <button onClick={onCancel}   style={{ padding: '5px 11px', border: '1px solid var(--color-border-light)', borderRadius: 6, fontSize: 12, background: 'var(--color-surface-2)', cursor: 'pointer', color: 'var(--color-text-2)' }}>{t('poultry.protocols.incub_cancel')}</button>
          <button onClick={onSave}     style={{ padding: '5px 14px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, background: C, color: 'white', cursor: 'pointer' }}>{t('poultry.protocols.incub_save')}</button>
        </>
      ) : (
        <button onClick={onEdit} style={{ padding: '5px 14px', border: `1px solid ${C}44`, borderRadius: 6, fontSize: 12, fontWeight: 600, background: `${C}10`, color: C, cursor: 'pointer' }}>{t('poultry.protocols.incub_edit')}</button>
      )}
    </div>
  );

  // ── Batch Phase Tracker ──────────────────────────────────────────────────
  const renderPhaseTracker = (batch) => {
    const dayAge     = getBatchAge(batch);
    if (!dayAge) return null;
    const phaseIdx   = getCurrentPhaseIdx(incubPhases, dayAge);
    const totalDays  = getTotalIncubDays(incubPhases);
    const isFinished = phaseIdx >= incubPhases.length;
    const curPhase   = (!isFinished && phaseIdx >= 0) ? incubPhases[phaseIdx] : null;
    const eclosionDate = new Date(new Date(batch.arrival_date).getTime() + totalDays * 86400000);
    const pushedCount  = [...pushed].filter(k => k.startsWith(`${batchType}-`)).length;
    const totalVax     = (vaccines[batchType] || []).length;
    const progressPct  = Math.min(100, (dayAge / totalDays) * 100);

    return (
      <div style={{ background: 'var(--color-surface)', border: `1.5px solid ${C}28`, borderRadius: 20, padding: 24, marginBottom: 28, boxShadow: `0 4px 20px ${C}12` }}>

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: C, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>
              {t('poultry.protocols.tracker_here')}
            </div>
            <div style={{ fontWeight: 900, fontSize: 17 }}>{batch.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 3 }}>
              {t('poultry.protocols.tracker_arrival')} : {new Date(batch.arrival_date).toLocaleDateString(dateLocale)}
              {batch.batch_type && ` · ${batch.batch_type}`}
              {batch.breed && ` · ${batch.breed}`}
              {batch.current_quantity != null && ` · ${batch.current_quantity.toLocaleString()} têtes`}
            </div>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0, marginLeft: 16, background: isFinished ? '#dcfce7' : `${C}12`, borderRadius: 16, padding: '12px 20px', border: `1.5px solid ${isFinished ? '#bbf7d0' : C + '30'}` }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: isFinished ? '#059669' : C, lineHeight: 1 }}>J{dayAge}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>/ {totalDays}j</div>
          </div>
        </div>

        {/* Continuous progress bar */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ position: 'relative', height: 12, background: 'var(--color-surface-2)', borderRadius: 999, overflow: 'visible', marginBottom: 6 }}>
            <div style={{
              width: `${progressPct}%`, height: '100%', borderRadius: 999,
              background: isFinished ? '#059669' : `linear-gradient(90deg, ${C_DARK}, ${C})`,
              transition: 'width .5s ease', position: 'relative',
            }}>
              {!isFinished && (
                <div style={{
                  position: 'absolute', right: -1, top: -6, width: 24, height: 24,
                  borderRadius: '50%', background: C, border: '3px solid white',
                  boxShadow: `0 2px 8px ${C}66`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 9, color: 'white', fontWeight: 900 }}>●</span>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-3)', fontWeight: 600 }}>
            <span>J1</span>
            <span style={{ fontWeight: 900, color: C }}>J{dayAge}</span>
            <span>J{totalDays}</span>
          </div>
        </div>

        {/* Completion banner */}
        {isFinished && (
          <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>🎉</span>
            <div>
              <div style={{ fontWeight: 800, color: '#15803d', fontSize: 13 }}>{t('poultry.protocols.tracker_hatch_done')}</div>
              <div style={{ fontSize: 11, color: '#166534' }}>
                {t('poultry.protocols.tracker_lot')} {batch.name} · {eclosionDate.toLocaleDateString(dateLocale)}
              </div>
            </div>
          </div>
        )}

        {/* Current phase — big card */}
        {curPhase && (
          <div style={{
            background: `linear-gradient(135deg, ${curPhase.color}15, ${curPhase.color}08)`,
            border: `1.5px solid ${curPhase.color}44`, borderRadius: 14,
            padding: '16px 20px', marginBottom: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="p-pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: curPhase.color, display: 'inline-block' }} />
                  <span style={{ fontWeight: 900, fontSize: 15, color: curPhase.color }}>{curPhase.phase}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{curPhase.days}</div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { icon: '🌡', label: t('poultry.protocols.phase_col_temp'),     value: curPhase.temp },
                  { icon: '💧', label: t('poultry.protocols.phase_col_humidity'), value: curPhase.humidity },
                  { icon: '🔄', label: t('poultry.protocols.phase_col_turning'),  value: curPhase.turning },
                ].map(p => (
                  <div key={p.label} style={{ textAlign: 'center', background: 'white', borderRadius: 10, padding: '8px 14px', boxShadow: `0 1px 4px ${curPhase.color}20` }}>
                    <div style={{ fontSize: 18 }}>{p.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: curPhase.color }}>{p.value}</div>
                    <div style={{ fontSize: 9, color: 'var(--color-text-3)', fontWeight: 700 }}>{p.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Segmented phase bar */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
          {incubPhases.map((ph, idx) => {
            const r       = parseDayRange(ph.days);
            const dur     = r ? (r.end - r.start + 1) : 1;
            const isDone  = isFinished || idx < phaseIdx;
            const isCurr  = !isFinished && idx === phaseIdx;
            return (
              <div key={idx} title={ph.phase} style={{
                flex: dur, height: 22, borderRadius: 5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800, overflow: 'hidden', whiteSpace: 'nowrap',
                background: isDone ? ph.color + 'cc' : isCurr ? ph.color : ph.color + '20',
                border: isCurr ? `2px solid ${ph.color}` : '2px solid transparent',
                color: isDone || isCurr ? 'white' : ph.color,
                transition: 'all .3s',
              }}>
                {isDone ? '✓' : isCurr ? '●' : ''}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
          {incubPhases.map((ph, idx) => {
            const r   = parseDayRange(ph.days);
            const dur = r ? (r.end - r.start + 1) : 1;
            return (
              <div key={idx} style={{ flex: dur, fontSize: 9, color: 'var(--color-text-3)', fontWeight: 600, textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {ph.phase}
              </div>
            );
          })}
        </div>

        {/* Vaccine progress footer */}
        <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)', flexShrink: 0 }}>
            {t('poultry.protocols.vaccines_label')} :
            <span style={{ color: '#059669', marginLeft: 6 }}>✓ {pushedCount}</span>
            <span style={{ color: 'var(--color-text-3)' }}> / {totalVax}</span>
          </span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(vaccines[batchType] || []).map(row => {
              const key  = `${batchType}-${row.day}`;
              const done = pushed.has(key);
              const isToday = row.day === dayAge;
              return (
                <span key={key} style={{
                  padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                  background: isToday ? C : done ? '#dcfce7' : '#f1f5f9',
                  color: isToday ? 'white' : done ? '#15803d' : '#94a3b8',
                  border: `1px solid ${isToday ? C : done ? '#bbf7d0' : '#e2e8f0'}`,
                }}>
                  {done ? '✓' : '○'} J{row.day}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>

      {/* ── Lot Privacy Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${C}12, ${C}06)`,
        border: `1px solid ${C}28`, borderRadius: 18, padding: '18px 22px', marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
          {t('poultry.protocols.section_label')}
        </div>
        {batches.length === 0 ? (
          <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic' }}>{t('poultry.protocols.no_batch')}</span>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {batches.map(b => {
              const active = b.id === selectedBatchId;
              const bAge   = getBatchAge(b);
              return (
                <button key={b.id} onClick={() => setSelectedBatchId(b.id)}
                  style={{
                    padding: '9px 18px', borderRadius: 12, cursor: 'pointer', transition: 'all .2s',
                    border: `1.5px solid ${active ? C : 'var(--color-border-light)'}`,
                    background: active ? C : 'var(--color-surface)',
                    color: active ? 'white' : 'var(--color-text-1)',
                    fontWeight: 700, fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                  }}
                >
                  <span>{b.name}</span>
                  <span style={{ fontSize: 10, opacity: .75, fontWeight: 600 }}>
                    {b.batch_type}{bAge != null ? ` · J${bAge}` : ''}{b.current_quantity != null ? ` · ${b.current_quantity.toLocaleString()} têtes` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Phase tracker card ── */}
      {selectedBatch && renderPhaseTracker(selectedBatch)}

      {/* ── Section A: Incubation ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 4, height: 44, borderRadius: 999, background: C, flexShrink: 0, marginTop: 2 }} />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>{t('poultry.protocols.incub_title')}</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>{t('poultry.protocols.incub_sub')}</p>
            </div>
          </div>
          <ActionBar editing={editingIncub} onEdit={startEditIncub} onSave={saveIncub} onCancel={cancelIncub} onDefaults={loadDefaultsIncub} />
        </div>

        {editingIncub ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: `${C}10`, borderBottom: `2px solid ${C}30` }}>
                  {[t('poultry.protocols.phase_col_phase'), t('poultry.protocols.phase_col_days'), t('poultry.protocols.phase_col_temp'), t('poultry.protocols.phase_col_humidity'), t('poultry.protocols.phase_col_turning'), t('poultry.protocols.phase_col_color'), ''].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: C, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incubDraft.map((ph, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-light)', background: idx % 2 === 0 ? 'transparent' : 'var(--color-surface-2)' }}>
                    <td style={{ padding: '6px 8px', minWidth: 130 }}><input value={ph.phase}    style={inputStyle} onChange={e => setIncubDraft(d => d.map((p, i) => i === idx ? { ...p, phase:    e.target.value } : p))} /></td>
                    <td style={{ padding: '6px 8px', minWidth: 100 }}><input value={ph.days}     style={inputStyle} onChange={e => setIncubDraft(d => d.map((p, i) => i === idx ? { ...p, days:     e.target.value } : p))} /></td>
                    <td style={{ padding: '6px 8px', minWidth: 80  }}><input value={ph.temp}     style={inputStyle} onChange={e => setIncubDraft(d => d.map((p, i) => i === idx ? { ...p, temp:     e.target.value } : p))} /></td>
                    <td style={{ padding: '6px 8px', minWidth: 90  }}><input value={ph.humidity} style={inputStyle} onChange={e => setIncubDraft(d => d.map((p, i) => i === idx ? { ...p, humidity: e.target.value } : p))} /></td>
                    <td style={{ padding: '6px 8px', minWidth: 100 }}><input value={ph.turning}  style={inputStyle} onChange={e => setIncubDraft(d => d.map((p, i) => i === idx ? { ...p, turning:  e.target.value } : p))} /></td>
                    <td style={{ padding: '6px 8px' }}>
                      <input type="color" value={ph.color} style={{ width: 36, height: 28, border: '1px solid var(--color-border-light)', borderRadius: 4, cursor: 'pointer', padding: 2 }}
                        onChange={e => setIncubDraft(d => d.map((p, i) => i === idx ? { ...p, color: e.target.value } : p))} />
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <button onClick={() => setIncubDraft(d => d.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18, lineHeight: 1 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-border-light)' }}>
              <button onClick={() => setIncubDraft(d => [...d, { phase: 'Nouvelle phase', days: 'J??–J??', temp: '37.0°C', humidity: '60%', turning: '—', color: C }])}
                style={{ padding: '5px 14px', border: `1px dashed ${C}`, borderRadius: 6, fontSize: 12, fontWeight: 600, background: `${C}08`, color: C, cursor: 'pointer' }}>
                {t('poultry.protocols.incub_add_phase')}
              </button>
            </div>
          </div>
        ) : (() => {
          // ── Helpers ──
          const totalIncubDays = getTotalIncubDays(incubPhases);
          const startD = new Date(incubStartDate + 'T12:00:00');
          const today  = new Date(); today.setHours(12, 0, 0, 0);

          const getIncubDay = (cellDate) => {
            const cd = new Date(cellDate); cd.setHours(12, 0, 0, 0);
            const diff = Math.round((cd - startD) / 86400000);
            return diff >= 0 && diff < totalIncubDays ? diff + 1 : null;
          };
          const getPhase = (incubDay) =>
            incubDay ? (incubPhases.find(ph => { const r = parseDayRange(ph.days); return r && incubDay >= r.start && incubDay <= r.end; }) ?? null) : null;

          // Build 6-week grid for calViewMonth
          const { year, month } = calViewMonth;
          const firstOfMonth = new Date(year, month, 1);
          const firstDow = (firstOfMonth.getDay() + 6) % 7; // Mon=0
          const lastDate = new Date(year, month + 1, 0).getDate();
          const cells = [];
          for (let i = firstDow - 1; i >= 0; i--)  cells.push({ date: new Date(year, month, -i),     inMonth: false });
          for (let d = 1; d <= lastDate; d++)        cells.push({ date: new Date(year, month, d),      inMonth: true  });
          while (cells.length < 42)                  cells.push({ date: new Date(year, month + 1, cells.length - firstDow - lastDate + 1), inMonth: false });
          const weeks = Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

          const monthName = firstOfMonth.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });
          const endD = new Date(startD.getTime() + (totalIncubDays - 1) * 86400000);

          return (
            <div>
              {/* ── Start-date picker ── */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                padding: '14px 18px', borderRadius: 14, marginBottom: 18,
                background: `${C}0c`, border: `1px solid ${C}28`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C, letterSpacing: '.06em' }}>
                  {t('poultry.protocols.incub_start_label')}
                </div>
                <input
                  type="date" value={incubStartDate}
                  onChange={e => handleIncubStartChange(e.target.value)}
                  style={{
                    border: `1.5px solid ${C}55`, borderRadius: 10, padding: '7px 14px',
                    fontSize: 14, fontWeight: 700, color: 'var(--color-text-1)',
                    background: 'var(--color-surface)', outline: 'none', cursor: 'pointer',
                  }}
                />
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginLeft: 4 }}>
                  {t('poultry.protocols.incub_hatch')} :
                  <strong style={{ color: C, marginLeft: 5 }}>
                    {endD.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </strong>
                </div>
                {/* Phase legend inline */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
                  {incubPhases.map(ph => (
                    <div key={ph.phase} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: ph.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: ph.color }}>{ph.phase}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── White calendar ── */}
              <div style={{
                background: 'white', borderRadius: 18, overflow: 'hidden',
                boxShadow: '0 2px 16px rgba(0,0,0,.08)', border: '1px solid #e2e8f0',
              }}>
                {/* Calendar header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9', background: 'white',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', textTransform: 'capitalize' }}>
                    {monthName}
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {incubPhases.map(ph => (
                      <div key={ph.phase} style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: ph.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{ph.phase}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => setCalViewMonth(({ year: y, month: m }) => m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 })}
                      style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 16, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >‹</button>
                    <button
                      onClick={() => setCalViewMonth(({ year: y, month: m }) => m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 })}
                      style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 16, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >›</button>
                  </div>
                </div>

                {/* Day-of-week headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8fafc', padding: '8px 12px 6px', borderBottom: '1px solid #f1f5f9' }}>
                  {['lun','mar','mer','jeu','ven','sam','dim'].map(k => (
                    <div key={k} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '.05em' }}>
                      {t(`poultry.protocols.${k}`)}
                    </div>
                  ))}
                </div>

                {/* Week rows */}
                <div style={{ padding: '8px 12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {weeks.map((week, wi) => (
                    <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                      {week.map(({ date, inMonth }, di) => {
                        const incubDay = getIncubDay(date);
                        const ph       = getPhase(incubDay);
                        const isToday  = date.toDateString() === today.toDateString();
                        const isStart  = date.toDateString() === startD.toDateString();
                        const isEnd    = date.toDateString() === endD.toDateString();
                        const isPast   = incubDay != null && date < today;
                        const clr      = ph?.color ?? null;

                        return (
                          <div key={di} style={{
                            borderRadius: 10, padding: '6px 4px', textAlign: 'center',
                            minHeight: incubDay ? 100 : 38,
                            background: incubDay
                              ? (isPast ? clr + '18' : clr + '0e')
                              : 'transparent',
                            border: isToday
                              ? `2px solid ${C}`
                              : incubDay
                                ? `1.5px solid ${clr}44`
                                : `1px solid transparent`,
                            boxShadow: isToday ? `0 0 10px ${C}33` : 'none',
                            opacity: !inMonth && !incubDay ? 0.22 : 1,
                            transition: 'all .15s',
                          }}>
                            {/* Today ring */}
                            {isToday && (
                              <div style={{
                                width: 24, height: 24, borderRadius: '50%', background: C,
                                margin: '0 auto 2px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <span style={{ fontSize: 12, fontWeight: 900, color: 'white' }}>{date.getDate()}</span>
                              </div>
                            )}

                            {/* Day number */}
                            {!isToday && (
                              <div style={{
                                fontSize: incubDay ? 18 : 13,
                                fontWeight: incubDay ? 800 : 400,
                                color: incubDay
                                  ? (isPast ? clr + 'bb' : clr)
                                  : (inMonth ? '#94a3b8' : '#cbd5e1'),
                                lineHeight: 1, marginBottom: incubDay ? 2 : 0,
                              }}>
                                {date.getDate()}
                              </div>
                            )}

                            {/* Incubation day badge */}
                            {incubDay && (
                              <div style={{
                                fontSize: 9, fontWeight: 900, letterSpacing: .4,
                                color: clr, marginBottom: 4,
                              }}>
                                {isStart ? '🥚 J1' : isEnd ? `J${incubDay} ✓` : `J${incubDay}`}
                              </div>
                            )}

                            {/* Phase params pills */}
                            {incubDay && ph && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {[['🌡', ph.temp], ['💧', ph.humidity], ['🔄', ph.turning]].map(([ic, val]) => (
                                  <div key={ic} style={{
                                    background: clr + '18', borderRadius: 5, padding: '2px 4px',
                                    fontSize: 8, fontWeight: 700, color: clr,
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    border: `1px solid ${clr}22`,
                                  }}>
                                    {ic} {val}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Footer: phase legend */}
                <div style={{
                  borderTop: '1px solid #f1f5f9', background: '#f8fafc',
                  padding: '14px 18px',
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10,
                }}>
                  {incubPhases.map(ph => (
                    <div key={ph.phase} style={{
                      background: 'white', borderRadius: 10, padding: '10px 12px',
                      border: `1.5px solid ${ph.color}33`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: ph.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 900, color: ph.color }}>{ph.phase}</span>
                        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>{ph.days}</span>
                      </div>
                      {[['🌡', t('poultry.protocols.phase_col_temp'), ph.temp], ['💧', t('poultry.protocols.phase_col_humidity'), ph.humidity], ['🔄', t('poultry.protocols.phase_col_turning'), ph.turning]].map(([ic, lbl, val]) => (
                        <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>{ic} {lbl}</span>
                          <span style={{ fontSize: 10, fontWeight: 800, color: ph.color }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Section B: Vaccination ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 4, height: 44, borderRadius: 999, background: '#10b981', flexShrink: 0, marginTop: 2 }} />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>{t('poultry.protocols.vax_title')}</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>
                {t('poultry.protocols.vax_sub')}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 0, background: 'var(--color-surface-2)', borderRadius: 999, padding: 3, border: '1px solid var(--color-border-light)', opacity: editingVaccines ? 0.45 : 1 }}>
              {[{ id: 'broiler', label: t('poultry.protocols.chair') }, { id: 'layer', label: t('poultry.protocols.ponte') }].map(tt => (
                <button key={tt.id} disabled={editingVaccines} onClick={() => setBatchType(tt.id)}
                  style={{ padding: '6px 18px', border: 'none', borderRadius: 999, cursor: editingVaccines ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700,
                    background: batchType === tt.id ? C : 'transparent',
                    color:      batchType === tt.id ? 'white' : 'var(--color-text-2)',
                    transition: 'all .18s' }}>
                  {tt.label}
                </button>
              ))}
            </div>
            <ActionBar editing={editingVaccines} onEdit={startEditVaccines} onSave={saveVaccines} onCancel={cancelVaccines} onDefaults={loadDefaultsVaccines} />
          </div>
        </div>

        {editingVaccines ? (
          /* ── Edit mode: raw table ── */
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: `${C}10`, borderBottom: `2px solid ${C}30` }}>
                  {[t('poultry.protocols.vax_col_day'), t('poultry.protocols.vax_col_vaccine'), t('poultry.protocols.vax_col_route'), t('poultry.protocols.vax_col_note'), ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: C, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vaccineDraft.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-light)', background: idx % 2 === 0 ? 'transparent' : 'var(--color-surface-2)' }}>
                    <td style={{ padding: '6px 8px', width: 70 }}><input type="number" value={row.day} style={inputStyle} onChange={e => setVaccineDraft(d => d.map((v, i) => i === idx ? { ...v, day: +e.target.value } : v))} /></td>
                    <td style={{ padding: '6px 8px' }}><input value={row.vaccine} style={inputStyle} onChange={e => setVaccineDraft(d => d.map((v, i) => i === idx ? { ...v, vaccine: e.target.value } : v))} /></td>
                    <td style={{ padding: '6px 8px', minWidth: 120 }}><input value={row.route} style={inputStyle} onChange={e => setVaccineDraft(d => d.map((v, i) => i === idx ? { ...v, route: e.target.value } : v))} /></td>
                    <td style={{ padding: '6px 8px' }}><input value={row.note} style={inputStyle} onChange={e => setVaccineDraft(d => d.map((v, i) => i === idx ? { ...v, note: e.target.value } : v))} /></td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}><button onClick={() => setVaccineDraft(d => d.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18, lineHeight: 1 }}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-border-light)' }}>
              <button onClick={() => setVaccineDraft(d => [...d, { day: 0, vaccine: 'Nouveau vaccin', route: 'Eau de boisson', note: '' }])}
                style={{ padding: '5px 14px', border: `1px dashed ${C}`, borderRadius: 6, fontSize: 12, fontWeight: 600, background: `${C}08`, color: C, cursor: 'pointer' }}>
                {t('poultry.protocols.vax_add')}
              </button>
            </div>
          </div>
        ) : (() => {
          /* ── Read mode: white calendar ── */
          const today = new Date(); today.setHours(12, 0, 0, 0);
          const startD = new Date(incubStartDate + 'T12:00:00');
          const batchDayAge = selectedBatch ? getBatchAge(selectedBatch) : null;

          const getVaxForDate = (cellDate) => {
            const cd = new Date(cellDate); cd.setHours(12, 0, 0, 0);
            const diff = Math.round((cd - startD) / 86400000) + 1; // J1=1
            return currentVaccines.filter(v => v.day === diff);
          };

          // Build 6-week grid
          const { year, month } = vacCalMonth;
          const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
          const lastDate = new Date(year, month + 1, 0).getDate();
          const cells = [];
          for (let i = firstDow - 1; i >= 0; i--) cells.push({ date: new Date(year, month, -i), inMonth: false });
          for (let d = 1; d <= lastDate; d++)      cells.push({ date: new Date(year, month, d), inMonth: true });
          while (cells.length < 42)                cells.push({ date: new Date(year, month + 1, cells.length - firstDow - lastDate + 1), inMonth: false });
          const weeks = Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
          const monthName = new Date(year, month, 1).toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });

          return (
            <div>
              {/* ── Worker selector bar ── */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                padding: '14px 18px', borderRadius: 14, marginBottom: 14,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#15803d', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>
                  {t('poultry.protocols.vax_worker_label')}
                </div>
                {workers.length === 0 ? (
                  <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>{t('poultry.protocols.vax_no_worker')}</span>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {workers.map(w => {
                      const wid = w.worker_id ?? w.id;
                      const isActive = selectedWorkerId === wid;
                      return (
                        <button key={wid} onClick={() => setSelectedWorkerId(wid)} style={{
                          padding: '7px 14px', borderRadius: 999, cursor: 'pointer', transition: 'all .15s',
                          border: `1.5px solid ${isActive ? '#10b981' : '#d1fae5'}`,
                          background: isActive ? '#10b981' : 'white',
                          color: isActive ? 'white' : '#15803d',
                          fontWeight: 700, fontSize: 12,
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', background: isActive ? 'rgba(255,255,255,.25)' : '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                            {(w.full_name ?? w.username ?? '?').charAt(0).toUpperCase()}
                          </span>
                          {w.full_name ?? w.username}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>
                  {t('poultry.protocols.vax_start_from')} : <strong style={{ color: '#15803d' }}>{new Date(incubStartDate + 'T12:00:00').toLocaleDateString(dateLocale, { day: 'numeric', month: 'long' })}</strong>
                </div>
              </div>

              {/* ── White calendar widget ── */}
              <div style={{
                background: 'white', borderRadius: 18, overflow: 'hidden',
                boxShadow: '0 2px 16px rgba(0,0,0,.08)',
                border: '1px solid #e2e8f0',
              }}>
                {/* Calendar header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9',
                  background: 'white',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', textTransform: 'capitalize' }}>
                    {monthName}
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 8 }}>
                      {currentVaccines.length} vaccin{currentVaccines.length > 1 ? 's' : ''} · {[...pushed].filter(k => k.startsWith(`${batchType}-`)).length} planifié{[...pushed].filter(k => k.startsWith(`${batchType}-`)).length > 1 ? 's' : ''}
                    </span>
                    {[
                      { bg: '#10b981', label: `✓ ${t('poultry.protocols.vax_done')}` },
                      { bg: C,         label: `● ${t('poultry.protocols.today_badge')}` },
                      { bg: '#7c3aed', label: '○ À venir' },
                    ].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 10 }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: l.bg, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{l.label}</span>
                      </div>
                    ))}
                    <button onClick={() => setVacCalMonth(({ year: y, month: m }) => m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 })}
                      style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 16, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                    <button onClick={() => setVacCalMonth(({ year: y, month: m }) => m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 })}
                      style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 16, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                  </div>
                </div>

                {/* Day-of-week headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8fafc', padding: '8px 12px 6px', borderBottom: '1px solid #f1f5f9' }}>
                  {['lun','mar','mer','jeu','ven','sam','dim'].map(k => (
                    <div key={k} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '.05em' }}>{t(`poultry.protocols.${k}`)}</div>
                  ))}
                </div>

                {/* Week rows */}
                <div style={{ padding: '8px 12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {weeks.map((week, wi) => (
                    <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                      {week.map(({ date, inMonth }, di) => {
                        const vaxList = getVaxForDate(date);
                        const isToday = date.toDateString() === today.toDateString();
                        const hasVax  = vaxList.length > 0;
                        const allDone = hasVax && vaxList.every(v => pushed.has(`${batchType}-${v.day}`));
                        const anyToday = hasVax && vaxList.some(v => {
                          const cd = new Date(date); cd.setHours(12,0,0,0);
                          const diff = Math.round((cd - startD) / 86400000) + 1;
                          return batchDayAge === diff;
                        });

                        return (
                          <div key={di} style={{
                            borderRadius: 12, padding: hasVax ? '8px 6px' : '6px 4px',
                            minHeight: hasVax ? 120 : 38,
                            background: hasVax
                              ? (allDone ? '#f0fdf4' : anyToday ? `${C}0c` : '#faf5ff')
                              : 'transparent',
                            border: isToday
                              ? `2px solid ${C}`
                              : hasVax
                                ? `1.5px solid ${allDone ? '#bbf7d0' : anyToday ? C + '44' : '#e9d5ff'}`
                                : `1px solid transparent`,
                            boxShadow: hasVax ? (allDone ? '0 1px 6px #bbf7d020' : anyToday ? `0 2px 12px ${C}22` : '0 1px 6px #e9d5ff40') : 'none',
                            opacity: !inMonth && !hasVax ? 0.22 : 1,
                            transition: 'all .15s',
                          }}>
                            {/* Date number */}
                            {isToday ? (
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: C, margin: '0 auto 3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 900, color: 'white' }}>{date.getDate()}</span>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', fontSize: hasVax ? 16 : 13, fontWeight: hasVax ? 800 : 400, color: hasVax ? '#1e293b' : (inMonth ? '#94a3b8' : '#cbd5e1'), marginBottom: hasVax ? 4 : 0 }}>
                                {date.getDate()}
                              </div>
                            )}

                            {/* Vaccine event cards */}
                            {vaxList.map(row => {
                              const key      = `${batchType}-${row.day}`;
                              const isDone   = pushed.has(key);
                              const isLoad   = pushing === key;
                              const acClr    = isDone ? '#10b981' : anyToday ? C : '#7c3aed';
                              const worker   = workers.find(w => (w.worker_id ?? w.id) === selectedWorkerId);
                              return (
                                <div key={key} style={{ marginTop: 3 }}>
                                  {/* J badge */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, justifyContent: 'center' }}>
                                    <span style={{ fontSize: 9, fontWeight: 900, color: acClr, background: acClr + '15', borderRadius: 999, padding: '1px 7px', border: `1px solid ${acClr}33` }}>
                                      J{row.day}
                                    </span>
                                    {isDone && <span style={{ fontSize: 10 }}>✅</span>}
                                  </div>
                                  {/* Vaccine name */}
                                  <div style={{ fontSize: 9, fontWeight: 700, color: '#374151', textAlign: 'center', lineHeight: 1.3, marginBottom: 3, padding: '0 2px' }}>
                                    {row.vaccine.length > 28 ? row.vaccine.slice(0, 26) + '…' : row.vaccine}
                                  </div>
                                  {/* Route badge */}
                                  <div style={{ fontSize: 8, color: '#6b7280', textAlign: 'center', marginBottom: 5 }}>
                                    {row.route}
                                  </div>
                                  {/* Worker chip */}
                                  {worker && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center', marginBottom: 5 }}>
                                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: acClr + '22', border: `1px solid ${acClr}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: acClr }}>
                                        {(worker.full_name ?? worker.username ?? '?').charAt(0).toUpperCase()}
                                      </span>
                                      <span style={{ fontSize: 8, color: '#6b7280', fontWeight: 600 }}>
                                        {(worker.full_name ?? worker.username ?? '—').split(' ')[0]}
                                      </span>
                                    </div>
                                  )}
                                  {/* Action button */}
                                  <button
                                    onClick={() => pushVaccineTask(row, selectedWorkerId)}
                                    disabled={isDone || isLoad}
                                    style={{
                                      width: '100%', padding: '4px 2px', border: 'none', borderRadius: 7, cursor: isDone ? 'default' : 'pointer',
                                      fontSize: 9, fontWeight: 800, transition: 'all .15s',
                                      background: isDone ? '#dcfce7' : anyToday ? C : '#7c3aed',
                                      color: isDone ? '#15803d' : 'white',
                                      opacity: isLoad ? .6 : 1,
                                    }}
                                  >
                                    {isDone ? `✓ ${t('poultry.protocols.vax_done')}` : isLoad ? '…' : t('poultry.protocols.vax_assign')}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Footer summary */}
                <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 18px', background: '#f8fafc', display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                    {t('poultry.protocols.vax_programme')} :
                  </span>
                  {currentVaccines.sort((a, b) => a.day - b.day).map(v => {
                    const key   = `${batchType}-${v.day}`;
                    const done  = pushed.has(key);
                    const vDate = new Date(startD.getTime() + (v.day - 1) * 86400000);
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: done ? '#10b981' : '#7c3aed', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: done ? '#10b981' : '#475569', fontWeight: done ? 700 : 500 }}>
                          J{v.day} — {vDate.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Section C: FCR & Poids Cible ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 4, height: 44, borderRadius: 999, background: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>{t('poultry.protocols.fcr_title')}</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>{t('poultry.protocols.fcr_sub')}</p>
            </div>
          </div>
          <ActionBar editing={editingFcr} onEdit={startEditFcr} onSave={saveFcr} onCancel={cancelFcr} onDefaults={loadDefaultsFcr} />
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: `${C}10`, borderBottom: `2px solid ${C}30` }}>
                {(editingFcr
                  ? [t('poultry.protocols.fcr_col_age'), 'Poids cible (g)', 'Conso. cumulée (g)', 'FCR cible', '']
                  : [t('poultry.protocols.fcr_col_age'), t('poultry.protocols.fcr_col_weight'), t('poultry.protocols.fcr_col_cumul'), t('poultry.protocols.fcr_col_fcr')]
                ).map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: C }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {editingFcr
                ? fcrDraft.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-light)', background: idx % 2 === 0 ? 'transparent' : 'var(--color-surface-2)' }}>
                      <td style={{ padding: '6px 8px', width: 70 }}><input value={row.age} style={inputStyle} onChange={e => setFcrDraft(d => d.map((r, i) => i === idx ? { ...r, age: e.target.value } : r))} /></td>
                      <td style={{ padding: '6px 8px' }}><input type="number" value={row.poids} step="1" style={inputStyle} onChange={e => setFcrDraft(d => d.map((r, i) => i === idx ? { ...r, poids: +e.target.value } : r))} /></td>
                      <td style={{ padding: '6px 8px' }}><input type="number" value={row.cumul} step="1" style={inputStyle} onChange={e => setFcrDraft(d => d.map((r, i) => i === idx ? { ...r, cumul: +e.target.value } : r))} /></td>
                      <td style={{ padding: '6px 8px', minWidth: 80 }}><input type="number" value={row.fcr} step="0.01" style={inputStyle} onChange={e => setFcrDraft(d => d.map((r, i) => i === idx ? { ...r, fcr: +e.target.value } : r))} /></td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <button onClick={() => setFcrDraft(d => d.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18, lineHeight: 1 }}>×</button>
                      </td>
                    </tr>
                  ))
                : (() => {
                    const maxPoids = Math.max(...fcrRows.map(r => r.poids));
                    const maxCumul = Math.max(...fcrRows.map(r => r.cumul));
                    return fcrRows.map((row, i) => {
                      const fcrClr = row.fcr < 1.5 ? '#059669' : row.fcr < 2.0 ? '#f59e0b' : '#ef4444';
                      return (
                        <tr key={row.age} style={{ borderBottom: '1px solid var(--color-border-light)', background: i % 2 === 0 ? 'transparent' : 'var(--color-surface-2)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 900, color: C, whiteSpace: 'nowrap' }}>{row.age}</td>
                          <td style={{ padding: '12px 16px', minWidth: 160 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5 }}>{row.poids.toLocaleString()} g</div>
                            <div style={{ height: 6, background: 'var(--color-surface-2)', borderRadius: 999 }}>
                              <div style={{ width: `${(row.poids / maxPoids) * 100}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${C_DARK}, ${C})` }} />
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', minWidth: 160, color: 'var(--color-text-3)' }}>
                            <div style={{ fontSize: 13, marginBottom: 5 }}>{row.cumul.toLocaleString()} g</div>
                            <div style={{ height: 6, background: 'var(--color-surface-2)', borderRadius: 999 }}>
                              <div style={{ width: `${(row.cumul / maxCumul) * 100}%`, height: '100%', borderRadius: 999, background: '#7c3aed66' }} />
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', minWidth: 140 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontWeight: 800, fontSize: 16, color: fcrClr, minWidth: 36 }}>{row.fcr}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ height: 8, background: 'var(--color-surface-2)', borderRadius: 999 }}>
                                  <div style={{ width: `${Math.min(100, (row.fcr / 3.0) * 100)}%`, height: '100%', borderRadius: 999, background: fcrClr }} />
                                </div>
                                <div style={{ fontSize: 9, color: fcrClr, fontWeight: 700, marginTop: 3 }}>
                                  {row.fcr < 1.5 ? t('poultry.protocols.fcr_excellent') : row.fcr < 2.0 ? t('poultry.protocols.fcr_normal') : t('poultry.protocols.fcr_high')}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()
              }
            </tbody>
          </table>
          {editingFcr && (
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-border-light)' }}>
              <button onClick={() => setFcrDraft(d => [...d, { age: 'J??', poids: 0, cumul: 0, fcr: 0.00 }])}
                style={{ padding: '5px 14px', border: `1px dashed ${C}`, borderRadius: 6, fontSize: 12, fontWeight: 600, background: `${C}08`, color: C, cursor: 'pointer' }}>
                {t('poultry.protocols.fcr_add')}
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// ─── Tab 0: AUJOURD'HUI (Workspace) ──────────────────────────────────────────

function TodayWorkspace() {
  const { farmId } = useAuth();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'en' ? 'en-US' : 'fr-FR';
  const fid = farmId || 1;

  const [batches,         setBatches]         = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [feedLogs,        setFeedLogs]        = useState([]);
  const [healthLogs,      setHealthLogs]      = useState([]);
  const [eggLogs,         setEggLogs]         = useState([]);
  const [inventory,       setInventory]       = useState([]);
  const [sales,           setSales]           = useState([]);
  const [tasks,           setTasks]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [quickEntry,      setQuickEntry]      = useState(null);
  const [quickForm,       setQuickForm]       = useState({});
  const [submitting,      setSubmitting]      = useState(false);
  const [pushedSet,       setPushedSet]       = useState(new Set());

  useEffect(() => {
    poultryAPI.batches.list(fid)
      .then(r => {
        const bl = r.data || [];
        setBatches(bl);
        if (bl.length > 0) setSelectedBatchId(bl[0].id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [fid]);

  useEffect(() => {
    if (!selectedBatchId) { setPushedSet(new Set()); return; }
    try {
      setPushedSet(new Set(JSON.parse(localStorage.getItem(`poultry_vax_pushed_${selectedBatchId}`) || '[]')));
    } catch { setPushedSet(new Set()); }
  }, [selectedBatchId]);

  useEffect(() => {
    if (!selectedBatchId) return;
    setLoading(true);
    Promise.all([
      poultryAPI.feed.list(selectedBatchId),
      poultryAPI.health.list(selectedBatchId),
      poultryAPI.eggs.list(selectedBatchId),
      poultryAPI.sales.list(selectedBatchId),
      poultryAPI.inventory.list(fid),
      workerTasksAPI.list({ farm_id: fid }),
    ]).then(([f, h, e, s, inv, t]) => {
      setFeedLogs(f.data || []);
      setHealthLogs(h.data || []);
      setEggLogs(e.data || []);
      setSales(s.data || []);
      setInventory(inv.data || []);
      setTasks(t.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedBatchId]);

  const selectedBatch = batches.find(b => b.id === selectedBatchId) ?? null;

  const getBatchAgeLocal = (batch) => {
    if (!batch?.arrival_date) return null;
    const ms = Date.now() - new Date(batch.arrival_date).getTime();
    return Math.max(1, Math.floor(ms / 86400000) + 1);
  };

  const age   = getBatchAgeLocal(selectedBatch);
  const today = new Date().toISOString().slice(0, 10);

  const avgFcrRaw     = feedLogs.filter(l => l.fcr_calculated).map(l => l.fcr_calculated);
  const avgFcr        = avgFcrRaw.length ? (avgFcrRaw.reduce((a, b) => a + b, 0) / avgFcrRaw.length) : null;
  const totalDeaths   = healthLogs.reduce((sum, h) => sum + (h.deaths_today || 0), 0);
  const totalRevenue  = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const criticalStock = inventory.filter(i => i.quantity != null && i.min_threshold != null && i.quantity < i.min_threshold);

  const BATCH_TYPE_VACCINE_MAP = {
    poulet:       'broiler',
    poulet_chair: 'broiler',
    broiler:      'broiler',
    chair:        'broiler',
    pondeuse:     'layer',
    poule_ponte:  'layer',
    layer:        'layer',
  };
  const vaccineKey      = BATCH_TYPE_VACCINE_MAP[(selectedBatch?.batch_type || '').toLowerCase()] ?? 'broiler';
  const vaccineSchedule = VACCINES[vaccineKey] || VACCINES.broiler;

  const nextVaccine = vaccineSchedule.find(v => v.day >= (age || 0) && !pushedSet.has(`${vaccineKey}-${v.day}`));

  // ── Today's action cards ───────────────────────────────────────────────────
  const actions = [];
  if (selectedBatch) {
    if (!feedLogs.some(l => l.date?.startsWith(today)))
      actions.push({ id: 'feed', priority: 'high', icon: '🌾', title: 'Saisir la ration alimentaire', desc: `Aucune saisie d'alimentation pour aujourd'hui.`, cta: 'Saisir', onCta: () => setQuickEntry('feed') });

    const vaccineDueNow = vaccineSchedule.find(v => v.day === age && !pushedSet.has(`${vaccineKey}-${v.day}`));
    if (vaccineDueNow)
      actions.push({ id: 'vaccine', priority: 'critical', icon: '💉', title: `Vaccination J${vaccineDueNow.day} requise`, desc: vaccineDueNow.vaccine, cta: 'Planifier',
        onCta: async () => {
          try {
            await workerTasksAPI.create({ title: `Vaccination J${vaccineDueNow.day} — ${vaccineDueNow.vaccine}`, category: 'health', priority: 'urgent', farm_id: fid, description: `Voie: ${vaccineDueNow.route}. ${vaccineDueNow.note}` });
            const ps = new Set([...pushedSet, `${vaccineKey}-${vaccineDueNow.day}`]);
            localStorage.setItem(`poultry_vax_pushed_${selectedBatchId}`, JSON.stringify([...ps]));
            setPushedSet(ps);
          } catch { toast.error('Erreur création tâche.'); }
        },
      });

    const isLayer = ['layer', 'pondeuse', 'poule_ponte', 'laying'].some(lt => (selectedBatch.batch_type || '').toLowerCase().includes(lt));
    if (isLayer && !eggLogs.some(l => l.date?.startsWith(today)))
      actions.push({ id: 'eggs', priority: 'medium', icon: '🥚', title: 'Collecte des œufs à saisir', desc: `Aucune collecte enregistrée aujourd'hui.`, cta: 'Saisir', onCta: () => setQuickEntry('eggs') });

    if (criticalStock.length > 0)
      actions.push({ id: 'inventory', priority: 'high', icon: '⚠️', title: `${criticalStock.length} article(s) en stock critique`, desc: criticalStock.map(i => i.item_name).join(', '), cta: 'Voir', onCta: () => {} });

    const pending = tasks.filter(tk => tk.status === 'pending');
    if (pending.length > 0)
      actions.push({ id: 'tasks', priority: 'medium', icon: '✅', title: `${pending.length} tâche(s) en attente`, desc: pending.slice(0, 2).map(tk => tk.title).join(' · '), cta: 'Voir', onCta: () => {} });
  }

  // ── Lifecycle timeline ────────────────────────────────────────────────────
  const LIFECYCLE = [
    { key: 'arrival',  label: t('poultry.protocols.tracker_arrival'), minDay: 0,  maxDay: 0   },
    { key: 'start',    label: t('poultry.today.lifecycle_start'),     minDay: 1,  maxDay: 7   },
    { key: 'growth',   label: t('poultry.today.lifecycle_growth'),    minDay: 8,  maxDay: 28  },
    { key: 'presale',  label: t('poultry.today.lifecycle_presale'),   minDay: 29, maxDay: 35  },
    { key: 'sale',     label: t('poultry.today.lifecycle_sale'),      minDay: 36, maxDay: 42  },
    { key: 'closed',   label: t('poultry.today.lifecycle_closed'),    minDay: 43, maxDay: 999 },
  ];
  const curStepIdx = age != null ? LIFECYCLE.findIndex(s => age >= s.minDay && age <= s.maxDay) : 0;
  const arrivalMs  = selectedBatch?.arrival_date ? new Date(selectedBatch.arrival_date).getTime() : null;
  const stepDate   = (minDay) => arrivalMs != null
    ? new Date(arrivalMs + minDay * 86400000).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' })
    : null;

  // ── Quick entry submit ────────────────────────────────────────────────────
  const submitQuickEntry = async () => {
    if (!selectedBatchId || submitting) return;
    setSubmitting(true);
    try {
      if (quickEntry === 'feed') {
        await poultryAPI.feed.create({ batch_id: selectedBatchId, date: today, quantity_kg: 0, ...quickForm });
        setFeedLogs((await poultryAPI.feed.list(selectedBatchId)).data || []);
      } else if (quickEntry === 'health') {
        const deaths = parseInt(quickForm.deaths_today || 0, 10);
        await poultryAPI.health.create({ batch_id: selectedBatchId, date: today, event_type: 'inspection', deaths_today: 0, ...quickForm });
        setHealthLogs((await poultryAPI.health.list(selectedBatchId)).data || []);
        // Reload batch list so current_quantity reflects server-side decrement
        if (deaths > 0) setBatches((await poultryAPI.batches.list(fid)).data || []);
      } else if (quickEntry === 'eggs') {
        await poultryAPI.eggs.create({ batch_id: selectedBatchId, date: today, total_eggs: 0, ...quickForm });
        setEggLogs((await poultryAPI.eggs.list(selectedBatchId)).data || []);
      } else if (quickEntry === 'sale') {
        await poultryAPI.sales.create({ batch_id: selectedBatchId, date: today, product_type: 'poulets', quantity: 0, unit_price: 0, total_amount: 0, ...quickForm });
      }
      setQuickForm({});
      setQuickEntry(null);
      toast.success('Saisie enregistrée !');
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur lors de la saisie.'); }
    finally { setSubmitting(false); }
  };

  const priorityBorder = { critical: '#fca5a5', high: `${C}55`, medium: '#93c5fd' };
  const priorityBg     = { critical: '#fff1f2', high: `${C}08`, medium: '#eff6ff'  };
  const iconBg         = { critical: '#fee2e2', high: `${C}18`, medium: '#dbeafe'  };

  // ── Input style ──────────────────────────────────────────────────────────
  const inp = { border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 11px', fontSize: 13, background: 'white', width: '100%', outline: 'none' };
  const lbl = { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'block' };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div>

      {/* ── Enterprise Command Bar ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 20, padding: '20px 28px', marginBottom: 22,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14,
        boxShadow: '0 4px 24px rgba(0,0,0,.14)',
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#64748b', letterSpacing: 2, marginBottom: 10 }}>
            {t('poultry.today.isolation_label')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <select
              value={selectedBatchId || ''}
              onChange={e => setSelectedBatchId(Number(e.target.value) || null)}
              style={{ background: 'rgba(255,255,255,.08)', border: `1.5px solid ${C}55`, borderRadius: 12,
                padding: '9px 18px', fontSize: 15, fontWeight: 900, color: 'white', cursor: 'pointer', outline: 'none' }}
            >
              <option value="" style={{ background: '#1e293b' }}>{t('poultry.today.choose_lot')}</option>
              {batches.map(b => <option key={b.id} value={b.id} style={{ background: '#1e293b' }}>{b.name} · {b.batch_type}</option>)}
            </select>
            {selectedBatch && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.06)',
                borderRadius: 999, padding: '6px 14px', border: '1px solid rgba(255,255,255,.1)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>
                  {selectedBatch.breed || selectedBatch.batch_type} · {selectedBatch.current_quantity?.toLocaleString() ?? '—'} têtes
                </span>
              </div>
            )}
            {batches.length === 0 && (
              <span style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>{t('poultry.today.no_batch_erp')}</span>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
            {new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          {age != null && (
            <div style={{ lineHeight: 1 }}>
              <span style={{ fontSize: 44, fontWeight: 900, color: C }}> J{age}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginLeft: 8 }}>{t('poultry.today.age_label')}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Enterprise KPI tiles ── */}
      {selectedBatch && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: t('poultry.apercu.effectif'), value: selectedBatch.current_quantity?.toLocaleString() ?? '—',
              icon: '🐔', clr: C,       sub: t('poultry.apercu.effectif') },
            { label: 'FCR Moyen',       value: avgFcr != null ? avgFcr.toFixed(2) : '—',
              icon: '⚡', clr: avgFcr != null && avgFcr > 1.8 ? '#f59e0b' : '#059669',
              sub: avgFcr != null ? (avgFcr > 1.8 ? '↑ Au-dessus seuil' : '✓ Normal') : 'Pas de données' },
            { label: 'Mortalité',       value: totalDeaths > 0 ? String(totalDeaths) : '0',
              icon: '📉', clr: totalDeaths > 0 ? '#ef4444' : '#059669',
              sub: totalDeaths > 0 ? '↑ À surveiller' : '✓ Normal' },
            { label: 'CA Cumulé',       value: totalRevenue > 0 ? `${totalRevenue.toFixed(0)} TND` : '—',
              icon: '💰', clr: '#059669', sub: 'revenus ventes' },
            { label: 'Prochain vaccin', value: nextVaccine ? `J${nextVaccine.day}` : '✓ OK',
              icon: '💉', clr: nextVaccine && age != null && nextVaccine.day <= age ? '#ef4444' : C,
              sub: nextVaccine ? nextVaccine.vaccine.slice(0, 22) : 'Programme à jour' },
          ].map(k => (
            <div key={k.label} style={{
              background: 'var(--color-surface)', borderRadius: 16, padding: '18px 20px',
              border: `1px solid ${k.clr}20`, borderTop: `3px solid ${k.clr}`,
              boxShadow: '0 1px 8px rgba(0,0,0,.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{k.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: k.clr, background: `${k.clr}15`,
                  padding: '3px 8px', borderRadius: 999, letterSpacing: '.05em' }}>
                  {k.label.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: k.clr, lineHeight: 1, marginBottom: 6 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {selectedBatch ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 22, alignItems: 'start' }}>

          {/* ── LEFT COLUMN: Actions + Lifecycle ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Actions card */}
            <div style={{ background: 'var(--color-surface)', borderRadius: 18, border: '1px solid var(--color-border-light)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 4, height: 22, borderRadius: 999, background: C, flexShrink: 0 }} />
                <span style={{ fontWeight: 800, fontSize: 15 }}>{t('poultry.today.actions_title')}</span>
                {actions.length > 0 && (
                  <span style={{ marginLeft: 'auto', background: actions.some(a => a.priority === 'critical') ? '#ef4444' : C, color: 'white', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 800 }}>
                    {actions.length}
                  </span>
                )}
              </div>
              <div style={{ padding: '18px 20px' }}>
                {actions.length === 0 ? (
                  <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 22 }}>✅</span>
                    <div>
                      <div style={{ fontWeight: 800, color: '#15803d', fontSize: 14 }}>{t('poultry.today.all_done')}</div>
                      <div style={{ fontSize: 12, color: '#166534' }}>{t('poultry.today.all_done_sub')}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {actions.map(a => (
                      <div key={a.id} style={{
                        borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start',
                        background: priorityBg[a.priority],
                        borderLeft: `4px solid ${a.priority === 'critical' ? '#ef4444' : a.priority === 'high' ? C : '#60a5fa'}`,
                        border: `1px solid ${priorityBorder[a.priority]}`,
                      }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: iconBg[a.priority], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {a.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{a.title}</span>
                            <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 999, flexShrink: 0, marginLeft: 8,
                              background: a.priority === 'critical' ? '#fee2e2' : `${C}15`,
                              color: a.priority === 'critical' ? '#b91c1c' : C }}>
                              {a.priority.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, lineHeight: 1.5 }}>{a.desc}</div>
                          <button onClick={a.onCta} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, background: a.priority === 'critical' ? '#ef4444' : C, color: 'white', cursor: 'pointer' }}>
                            {a.cta} →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Lifecycle card */}
            <div style={{ background: 'var(--color-surface)', borderRadius: 18, border: '1px solid var(--color-border-light)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 4, height: 22, borderRadius: 999, background: C, flexShrink: 0 }} />
                <span style={{ fontWeight: 800, fontSize: 15 }}>{t('poultry.today.lifecycle_title')}</span>
              </div>
              <div style={{ padding: '20px 22px', overflowX: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 500 }}>
                  {LIFECYCLE.map((step, idx) => {
                    const isPast    = age != null && age > step.maxDay && step.maxDay !== 999;
                    const isCurrent = idx === curStepIdx;
                    const isFuture  = !isPast && !isCurrent;
                    const dotColor  = isPast ? '#059669' : isCurrent ? C : '#cbd5e1';
                    const date      = step.minDay > 0 ? stepDate(step.minDay) : stepDate(0);
                    return (
                      <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                        {idx > 0 && (
                          <div style={{ position: 'absolute', left: 0, top: 16, width: '50%', height: 2, background: isPast ? '#059669' : '#e2e8f0', zIndex: 0 }} />
                        )}
                        {idx < LIFECYCLE.length - 1 && (
                          <div style={{ position: 'absolute', right: 0, top: 16, width: '50%', height: 2, background: (age != null && age > step.maxDay && step.maxDay !== 999) ? '#059669' : '#e2e8f0', zIndex: 0 }} />
                        )}
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: isFuture ? 'white' : dotColor, border: `2px solid ${dotColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, fontSize: 13 }}>
                          {isPast ? <span style={{ color: 'white', fontWeight: 900 }}>✓</span> : isCurrent ? <span style={{ color: 'white', fontWeight: 900, fontSize: 11 }}>●</span> : <span style={{ color: '#cbd5e1' }}>○</span>}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: isCurrent ? 800 : 600, color: isCurrent ? C : isPast ? '#059669' : '#94a3b8', marginTop: 6, textAlign: 'center' }}>{step.label}</div>
                        {date && <div style={{ fontSize: 9, color: '#cbd5e1', marginTop: 2 }}>{date}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN: Quick Entry — sticky ── */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: 'var(--color-surface)', borderRadius: 18, border: `1px solid ${C}28`, overflow: 'hidden', boxShadow: `0 4px 20px ${C}10` }}>
              {/* Cyan gradient header */}
              <div style={{ background: `linear-gradient(135deg, ${C}, ${C_DARK})`, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'white' }}>{t('poultry.today.quick_entry')}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)' }}>
                    {new Date().toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px 18px' }}>
                {/* Entry type selector */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[
                    { id: 'feed',   label: `🌾 ${t('poultry.today.feed')}`   },
                    { id: 'health', label: `🏥 ${t('poultry.today.health')}` },
                    { id: 'eggs',   label: `🥚 ${t('poultry.today.eggs')}`   },
                    { id: 'sale',   label: `💰 ${t('poultry.today.sale')}`   },
                  ].map(btn => (
                    <button key={btn.id} onClick={() => setQuickEntry(quickEntry === btn.id ? null : btn.id)}
                      style={{ padding: '6px 12px', borderRadius: 9, border: `1.5px solid ${quickEntry === btn.id ? C : 'var(--color-border-light)'}`, background: quickEntry === btn.id ? C : 'var(--color-surface)', color: quickEntry === btn.id ? 'white' : 'var(--color-text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Feed form */}
                {quickEntry === 'feed' && (
                  <div className="card" style={{ padding: 16, border: `1px solid ${C}28` }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                      <div><label style={lbl}>Type d'aliment</label><input style={inp} placeholder="Démarrage / Croissance" value={quickForm.feed_type || ''} onChange={e => setQuickForm(f => ({ ...f, feed_type: e.target.value }))} /></div>
                      <div><label style={lbl}>Quantité (kg) *</label><input type="number" min="0" step="0.1" style={inp} value={quickForm.quantity_kg || ''} onChange={e => setQuickForm(f => ({ ...f, quantity_kg: parseFloat(e.target.value) || 0 }))} /></div>
                      <div><label style={lbl}>Poids moyen (g)</label><input type="number" min="0" style={inp} value={quickForm.average_weight_g || ''} onChange={e => setQuickForm(f => ({ ...f, average_weight_g: parseFloat(e.target.value) || undefined }))} /></div>
                      <div><label style={lbl}>Coût / kg (TND)</label><input type="number" min="0" step="0.01" style={inp} value={quickForm.cost_per_kg || ''} onChange={e => setQuickForm(f => ({ ...f, cost_per_kg: parseFloat(e.target.value) || undefined }))} /></div>
                    </div>
                    <button onClick={submitQuickEntry} disabled={submitting} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: C, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: '100%' }}>
                      {submitting ? '…' : t('poultry.today.record_feed')}
                    </button>
                  </div>
                )}

                {/* Health form */}
                {quickEntry === 'health' && (
                  <div className="card" style={{ padding: 16, border: `1px solid #fca5a533` }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                      <div><label style={lbl}>Type d'événement</label>
                        <select style={{ ...inp }} value={quickForm.event_type || 'inspection'} onChange={e => setQuickForm(f => ({ ...f, event_type: e.target.value }))}>
                          <option value="inspection">Inspection</option>
                          <option value="vaccination">Vaccination</option>
                          <option value="traitement">Traitement médical</option>
                          <option value="mortalite">Mortalité</option>
                        </select>
                      </div>
                      <div><label style={lbl}>Mortalité du jour</label><input type="number" min="0" style={{ ...inp, borderColor: quickForm.deaths_today > 0 ? '#fca5a5' : '#e2e8f0' }} value={quickForm.deaths_today || ''} onChange={e => setQuickForm(f => ({ ...f, deaths_today: parseInt(e.target.value) || 0 }))} /></div>
                      <div><label style={lbl}>Traitement</label><input style={inp} placeholder="ex: Tylosine" value={quickForm.treatment || ''} onChange={e => setQuickForm(f => ({ ...f, treatment: e.target.value }))} /></div>
                      <div><label style={lbl}>Coût vétérinaire (TND)</label><input type="number" min="0" step="0.1" style={inp} value={quickForm.cost || ''} onChange={e => setQuickForm(f => ({ ...f, cost: parseFloat(e.target.value) || undefined }))} /></div>
                    </div>
                    {parseInt(quickForm.deaths_today || 0) > 0 && (
                      <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#b91c1c' }}>
                        ⚠️ {quickForm.deaths_today} mort(s) → effectif réduit à {Math.max(0, (selectedBatch.current_quantity || 0) - parseInt(quickForm.deaths_today || 0)).toLocaleString()} têtes.
                      </div>
                    )}
                    <button onClick={submitQuickEntry} disabled={submitting} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: '100%' }}>
                      {submitting ? '…' : t('poultry.today.record_health')}
                    </button>
                  </div>
                )}

                {/* Eggs form */}
                {quickEntry === 'eggs' && (
                  <div className="card" style={{ padding: 16, border: `1px solid ${C}28` }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                      <div><label style={lbl}>Œufs collectés *</label><input type="number" min="0" style={inp} value={quickForm.total_eggs || ''} onChange={e => setQuickForm(f => ({ ...f, total_eggs: parseInt(e.target.value) || 0 }))} /></div>
                      <div><label style={lbl}>Œufs fêlés</label><input type="number" min="0" style={inp} value={quickForm.cracked_eggs || ''} onChange={e => setQuickForm(f => ({ ...f, cracked_eggs: parseInt(e.target.value) || 0 }))} /></div>
                    </div>
                    <button onClick={submitQuickEntry} disabled={submitting} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: C, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: '100%' }}>
                      {submitting ? '…' : t('poultry.today.record_eggs')}
                    </button>
                  </div>
                )}

                {/* Sale form */}
                {quickEntry === 'sale' && (
                  <div className="card" style={{ padding: 16, border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                      <div><label style={lbl}>Produit</label><input style={inp} placeholder="Poulets vifs / Œufs" value={quickForm.product_type || ''} onChange={e => setQuickForm(f => ({ ...f, product_type: e.target.value }))} /></div>
                      <div><label style={lbl}>Quantité *</label><input type="number" min="0" style={inp} value={quickForm.quantity || ''} onChange={e => { const q = parseInt(e.target.value) || 0; const total = q * (parseFloat(quickForm.unit_price) || 0); setQuickForm(f => ({ ...f, quantity: q, total_amount: total })); }} /></div>
                      <div><label style={lbl}>Prix unitaire (TND)</label><input type="number" min="0" step="0.01" style={inp} value={quickForm.unit_price || ''} onChange={e => { const p = parseFloat(e.target.value) || 0; const total = (parseInt(quickForm.quantity) || 0) * p; setQuickForm(f => ({ ...f, unit_price: p, total_amount: total })); }} /></div>
                      <div><label style={lbl}>Total (TND)</label><input type="number" readOnly style={{ ...inp, background: '#f8fafc' }} value={quickForm.total_amount?.toFixed(2) || '0.00'} /></div>
                      <div><label style={lbl}>Client</label><input style={inp} placeholder="Nom client" value={quickForm.customer_name || ''} onChange={e => setQuickForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
                    </div>
                    <button onClick={submitQuickEntry} disabled={submitting} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#059669', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: '100%' }}>
                      {submitting ? '…' : t('poultry.today.record_sale')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-3)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🐔</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{t('poultry.today.no_batch_title')}</div>
          <div style={{ fontSize: 13 }}>{t('poultry.today.no_batch_desc')}</div>
        </div>
      )}
    </div>
  );
}

// ─── Main exported page component ────────────────────────────────────────────

export default function AboutPoultry() {
  const { i18n, t } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [activeTab, setActiveTab]     = useState('apercu');
  const [farmLoading, setFarmLoading] = useState(true);

  useEffect(() => {
    farmsAPI.list()
      .catch(() => {})
      .finally(() => setFarmLoading(false));
  }, []);

  const TABS = [
    { id: 'apercu',       label: t('poultry.tabs.apercu'),       icon: Bird        },
    { id: 'today',        label: t('poultry.tabs.today'),        icon: CheckCircle },
    { id: 'erp',          label: t('poultry.tabs.erp'),          icon: Layers      },
    { id: 'surveillance', label: t('poultry.tabs.surveillance'), icon: Eye         },
    { id: 'protocols',    label: t('poultry.tabs.protocols'),    icon: Calendar    },
  ];

  return (
    <>
      {/* Inject keyframe animations once */}
      <style>{ANIM_CSS}</style>

      <Navbar
        title={t('poultry.page_title')}
        subtitle={t('poultry.page_subtitle')}
      />

      <div
        className="page-content"
        style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}
      >
        {/* Tab navigation pill bar */}
        <div style={{
          display: 'flex', gap: 5, flexWrap: 'wrap',
          background: 'var(--color-surface-2)', borderRadius: 999,
          padding: 4, marginBottom: 28, width: 'fit-content',
          border: '1px solid var(--color-border-light)',
        }}>
          {TABS.map(tab => (
            <TabBtn
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={activeTab === tab.id}
              onClick={setActiveTab}
              activeColor={C}
            />
          ))}
        </div>

        {/* ── AUJOURD'HUI ── */}
        {activeTab === 'today' && <TodayWorkspace />}

        {/* ── APERÇU ── */}
        {activeTab === 'apercu' && (
          <AperçuTab onGoToERP={() => setActiveTab('erp')} />
        )}

        {/* ── ERP SYSTÈME ── */}
        {activeTab === 'erp' && (
          farmLoading
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>
            : <AnimalERP species="poultry" color={C} />
        )}

        {/* ── SURVEILLANCE IA ── */}
        {activeTab === 'surveillance' && <SurveillanceTab />}

        {/* ── PROTOCOLES & CALENDRIER ── */}
        {activeTab === 'protocols' && <ProtocolsTab />}
      </div>

      {/* Floating expert assistant FAB (always visible) */}
      <ExpertAssistant species="poultry" color={C} />
    </>
  );
}
