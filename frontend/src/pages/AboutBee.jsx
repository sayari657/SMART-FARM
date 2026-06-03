import { useState, useEffect } from 'react';
import { useToast }   from '../hooks/useToast';
import { useBeeNav }  from '../hooks/useBeeNav';
import { useBeeData } from '../hooks/useBeeData';
import beeIconImg  from '../assets/bee/bee-icon.png';
import beeSketchImg from '../assets/bee/bee-sketch.png';
import {
  LayoutDashboard, MapPin, Hexagon, Bell, RefreshCw,
  ChevronRight, CheckCircle, XCircle, AlertTriangle, ArrowLeft,
  Droplets, Package, CalendarClock,
} from 'lucide-react';
import { COLORS } from '../components/bee/BeeConstants';
import DashboardTab    from '../components/bee/DashboardTab';
import EmplacementsTab from '../components/bee/EmplacementsTab';
import HiveDetailView  from '../components/bee/HiveDetailView';
import InventaireTab   from '../components/bee/InventaireTab';
import ProductionTab   from '../components/bee/ProductionTab';
import StockTab        from '../components/bee/StockTab';
import PrevisionsTab   from '../components/bee/PrevisionsTab';
import ExpertAssistant from '../components/expert/ExpertAssistant';

/* ── Image paths (watercolor assets) ─────────────────────────────────── */
const IMG_HONEYCOMB = '/images/bee/bee-honeycomb.jpg';
const IMG_WATERCOLOR = '/images/bee/bee-watercolor.jpg';
const IMG_SKETCH    = beeSketchImg;

/* ── Warm organic palette ────────────────────────────────────────────── */
const W = {
  cream:    '#FEF9EE',
  parchment:'#FDF4DC',
  warm:     '#FFFDF5',
  border:   '#F0DEB4',
  borderSoft:'#F5E6C8',
  honey:    '#D97706',
  honeyDk:  '#92400E',
  honeyLt:  '#FEF3C7',
  honeyGlow:'rgba(217,119,6,0.12)',
  text:     '#2C1A0E',
  textMd:   '#6B4226',
  textMuted:'#A07850',
  green:    '#059669',
  red:      '#EF4444',
  orange:   '#F97316',
};

/* ── Nav tab definitions ─────────────────────────────────────────────── */
const NAV_TABS = [
  { id: 'dashboard',  label: "Vue d'ensemble", icon: LayoutDashboard, emoji: '🏡' },
  { id: 'sites',      label: 'Sites GIS',       icon: MapPin,          emoji: '📍' },
  { id: 'inventaire', label: 'Inventaire',       icon: Hexagon,         emoji: '🔶' },
  { id: 'production', label: 'Production',       icon: Droplets,        emoji: '🍯' },
  { id: 'stock',      label: 'Stock',            icon: Package,         emoji: '📦' },
  { id: 'previsions', label: 'Missions',         icon: CalendarClock,   emoji: '🗓️' },
];

/* ── Toast ───────────────────────────────────────────────────────────── */
const TOAST_MAP = {
  success: [CheckCircle,   W.green ],
  error:   [XCircle,       W.red   ],
  warning: [AlertTriangle, W.orange],
};

function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{ position:'fixed', bottom:28, right:28, zIndex:9999,
      display:'flex', flexDirection:'column', gap:10 }}>
      {toasts.map(t => {
        const [Icon, color] = TOAST_MAP[t.type] || TOAST_MAP.success;
        return (
          <div key={t.id} style={{
            background:'#fffdf7', border:`1px solid ${color}30`,
            borderLeft:`3px solid ${color}`, borderRadius:14,
            padding:'13px 18px', display:'flex', alignItems:'center', gap:12,
            boxShadow:'0 12px 40px rgba(139,68,14,0.12)', minWidth:280, maxWidth:380,
            animation:'slideIn .2s ease',
          }}>
            <Icon size={16} color={color}/>
            <span style={{ color:W.text, fontSize:13, fontWeight:600, flex:1 }}>{t.msg}</span>
            <button onClick={() => onRemove(t.id)}
              style={{ background:'none', border:'none', color:W.textMuted,
                cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

/* ── Watercolor blob (pure CSS organic shape) ────────────────────────── */
function WaxBlob({ x, y, size, opacity = 0.07, color = W.honey }) {
  return (
    <div style={{
      position:'absolute', left:x, top:y, width:size, height:size * 0.85,
      background:color, borderRadius:'62% 38% 46% 54% / 60% 44% 56% 40%',
      opacity, pointerEvents:'none', filter:'blur(2px)',
    }}/>
  );
}

/* ── Honeycomb SVG tile ──────────────────────────────────────────────── */
function HoneycombPattern({ opacity = 0.04 }) {
  return (
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%',
      opacity, pointerEvents:'none' }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="hx" x="0" y="0" width="40" height="46" patternUnits="userSpaceOnUse">
          <polygon points="20,2 36,11 36,35 20,44 4,35 4,11"
            fill="none" stroke="#D97706" strokeWidth="1"/>
        </pattern>
        <pattern id="hx2" x="20" y="23" width="40" height="46" patternUnits="userSpaceOnUse">
          <polygon points="20,2 36,11 36,35 20,44 4,35 4,11"
            fill="none" stroke="#D97706" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hx)"/>
      <rect width="100%" height="100%" fill="url(#hx2)"/>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════ */
export default function AboutBee() {
  const [modalActive,  setModalActive] = useState(null);
  const [filterApiary, setFilterApiary] = useState('');
  const [prodForm,     setProdForm]    = useState({ production_date:'', apiary_id:'', honey_kg:'', pollen_kg:'' });
  const [stock,        setStock]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('bee_stock') || '{}'); } catch { return {}; }
  });
  const [previsions, setPrevisions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bee_previsions') || '[]'); } catch { return []; }
  });

  const { toasts, toast, dismiss }                    = useToast();
  const { activePage, setActivePage,
          selectedHive, setSelectedHive,
          openHive, closeHive }                       = useBeeNav();
  const { emplacements, ruches, productions, visites,
          loading, syncing, stats, refresh,
          addApiary, removeApiary, addProduction }    = useBeeData(toast);

  useEffect(() => {
    if (selectedHive) {
      const updated = ruches.find(r => r.id === selectedHive.id);
      if (updated) setSelectedHive(updated);
    }
  }, [ruches]); // eslint-disable-line

  const handleAddApiary = async fd => { const ok = await addApiary(fd); if (ok) setModalActive(null); };
  const handleDeleteApiary = async id => { if (!confirm('Supprimer ce site et ses ruches ?')) return; await removeApiary(id); };
  const handleAction = (tab, sub) => {
    if (tab === 'sync') { refresh(); return; }
    if (['production','stock','previsions'].includes(tab)) { setActivePage(tab); return; }
    setActivePage(tab==='emplacements'||tab==='sites' ? 'sites' : (tab==='ruches'||tab==='inventaire') ? 'inventaire' : 'dashboard');
    if (sub === 'addEmp') setModalActive('emplacement');
  };
  const handleAddProd = async () => {
    const ok = await addProduction(prodForm);
    if (ok) { setProdForm({ production_date:'', apiary_id:'', honey_kg:'', pollen_kg:'' }); setModalActive(null); }
  };
  const handleStockUpdate = (id, delta) => {
    setStock(prev => {
      const u = { ...prev, [id]: Math.max(0, (prev[id]||0) + delta) };
      localStorage.setItem('bee_stock', JSON.stringify(u));
      return u;
    });
  };
  const handleAddPrevision = p => {
    const next = [...previsions, { ...p, id:Date.now(), tasks:p.tasks.map((t,i) => ({ id:i, text:t, status:'todo' })) }];
    setPrevisions(next);
    localStorage.setItem('bee_previsions', JSON.stringify(next));
  };
  const handleUpdateTask = (prevId, taskId, status) => {
    const next = previsions.map(p => p.id === prevId
      ? { ...p, tasks: p.tasks.map(t => t.id===taskId ? { ...t, status } : t) }
      : p);
    setPrevisions(next);
    localStorage.setItem('bee_previsions', JSON.stringify(next));
  };

  const alertCount = parseInt(stats.alertes) || 0;
  const currentTab = NAV_TABS.find(t => t.id === activePage);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column',
      background:W.cream, fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow:'hidden', color:W.text }}>

      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:rgba(240,222,180,.3); border-radius:10px; }
        ::-webkit-scrollbar-thumb { background:rgba(217,119,6,.3); border-radius:10px; }
        ::-webkit-scrollbar-thumb:hover { background:rgba(217,119,6,.55); }
        @keyframes spin    { to{ transform:rotate(360deg); } }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes sway    { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
        @keyframes badge   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @keyframes waxPulse{ 0%,100%{opacity:.07} 50%{opacity:.13} }
        .bee-page-enter { animation: fadeUp .28s cubic-bezier(.22,1,.36,1) both; }
        .bee-nav-btn { transition: all .18s cubic-bezier(.22,1,.36,1) !important; }
        .bee-nav-btn:hover { transform:translateY(-2px) !important; }
        .bee-tab-content { animation: fadeUp .22s ease both; }
        .hive-card { transition: transform .22s cubic-bezier(.22,1,.36,1), border-color .2s, box-shadow .22s; }
        .hive-card:hover { transform:translateY(-5px); box-shadow:0 18px 44px rgba(217,119,6,.14) !important; }
        .action-btn { transition: transform .15s ease, box-shadow .15s ease; }
        .action-btn:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(217,119,6,.25) !important; }
        select option { background:#FEF9EE !important; color:#2C1A0E !important; }
        input::placeholder, textarea::placeholder { color:#A07850 !important; }
      `}</style>

      <ToastContainer toasts={toasts} onRemove={dismiss}/>

      {/* ══════════════════════════════════════════════════════════
          HEADER — warm honey gradient + watercolor decoration
      ══════════════════════════════════════════════════════════ */}
      <header style={{
        flexShrink:0, position:'relative', overflow:'hidden',
        background:'linear-gradient(135deg, #78350f 0%, #92400e 20%, #b45309 50%, #d97706 80%, #fbbf24 100%)',
        zIndex:200,
      }}>
        {/* Honeycomb pattern overlay */}
        <HoneycombPattern opacity={0.06}/>

        {/* Organic wax blobs */}
        <WaxBlob x="-40px" y="-30px" size={160} opacity={0.12} color="#fbbf24"/>
        <WaxBlob x="55%" y="-50px" size={200} opacity={0.08} color="#92400e"/>
        <WaxBlob x="78%" y="-20px" size={120} opacity={0.10} color="#fef3c7"/>

        {/* Watercolor bee image — right side decoration */}
        <div style={{
          position:'absolute', right:0, top:0, bottom:0, width:220, overflow:'hidden',
          maskImage:'linear-gradient(to left, rgba(0,0,0,.35) 0%, transparent 100%)',
          WebkitMaskImage:'linear-gradient(to left, rgba(0,0,0,.35) 0%, transparent 100%)',
          pointerEvents:'none',
        }}>
          <img src={IMG_WATERCOLOR} alt="" style={{ width:'100%', height:'100%',
            objectFit:'cover', objectPosition:'center', opacity:.4,
            mixBlendMode:'luminosity' }}/>
        </div>

        {/* Main header content */}
        <div style={{ position:'relative', zIndex:2, padding:'0 20px',
          display:'flex', alignItems:'center', gap:0, height:70 }}>

          {/* Brand */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginRight:20, flexShrink:0 }}>
            <div style={{ position:'relative', width:44, height:44, flexShrink:0 }}>
              <img src={IMG_SKETCH} alt="bee"
                style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover',
                  border:'2px solid rgba(255,255,255,.5)',
                  boxShadow:'0 2px 12px rgba(139,68,14,.4)' }}
                onError={e => { e.target.style.display='none'; }}/>
              <div style={{ position:'absolute', inset:0, borderRadius:'50%',
                background:'rgba(217,119,6,.2)', display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:22 }}
                id="bee-icon-fallback">🐝</div>
            </div>
            <div>
              <div style={{ color:'#fff', fontWeight:900, fontSize:16, letterSpacing:'.5px',
                lineHeight:1, textShadow:'0 1px 3px rgba(0,0,0,.25)' }}>APICRAFT</div>
              <div style={{ color:'rgba(255,255,255,.65)', fontSize:9, letterSpacing:'2.5px',
                fontWeight:700, lineHeight:1, marginTop:3 }}>APICULTURE · IA</div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width:1, height:30, background:'rgba(255,255,255,.22)', marginRight:16, flexShrink:0 }}/>

          {/* Tab nav */}
          <nav style={{ display:'flex', height:'100%', gap:4, flex:1, alignItems:'center',
            overflowX:'auto', paddingBottom:2, scrollbarWidth:'none' }}>
            {NAV_TABS.map(tab => {
              const isActive = activePage === tab.id && !selectedHive;
              return (
                <button key={tab.id} onClick={() => { setActivePage(tab.id); closeHive(); }}
                  className="bee-nav-btn"
                  style={{
                    display:'flex', alignItems:'center', gap:7, padding:'7px 14px',
                    borderRadius:99, cursor:'pointer', flexShrink:0, transition:'all .18s',
                    background: isActive
                      ? 'rgba(255,255,255,.92)'
                      : 'rgba(255,255,255,.10)',
                    border: `1.5px solid ${isActive ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.18)'}`,
                    color: isActive ? W.honeyDk : 'rgba(255,255,255,.85)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize:13,
                    boxShadow: isActive ? '0 3px 14px rgba(0,0,0,.15)' : 'none',
                    position:'relative',
                  }}>
                  <span style={{ fontSize:15 }}>{tab.emoji}</span>
                  <span>{tab.label}</span>
                  {tab.id === 'dashboard' && alertCount > 0 && (
                    <span style={{ position:'absolute', top:-6, right:-6, width:17, height:17,
                      borderRadius:'50%', background:W.red, color:'#fff', fontSize:9,
                      fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center',
                      animation:'badge 1.5s ease-in-out infinite', border:'2px solid #fff' }}>
                      {alertCount}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Hive breadcrumb */}
            {selectedHive && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 12px', fontSize:13 }}>
                <button onClick={closeHive} style={{ background:'rgba(255,255,255,.15)',
                  border:'1px solid rgba(255,255,255,.3)', borderRadius:8, color:'#fff',
                  cursor:'pointer', padding:'5px 10px', fontSize:12,
                  display:'flex', alignItems:'center', gap:6, fontWeight:700 }}>
                  <ArrowLeft size={13}/> Inventaire
                </button>
                <ChevronRight size={12} color="rgba(255,255,255,.6)"/>
                <span style={{ color:'#fff', fontWeight:900, fontSize:13 }}>{selectedHive.identifier}</span>
              </div>
            )}
          </nav>

          {/* Right actions */}
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            {/* Honey counter */}
            <div style={{ height:34, padding:'0 12px', borderRadius:99,
              background:'rgba(255,255,255,.90)', border:'1px solid rgba(255,255,255,.65)',
              display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 8px rgba(0,0,0,.1)' }}>
              <span style={{ fontSize:16 }}>🍯</span>
              <span style={{ color:W.honeyDk, fontWeight:800, fontSize:12 }}>{stats.totalMiel}</span>
            </div>
            {alertCount > 0 && (
              <div style={{ height:34, padding:'0 12px', borderRadius:99, background:W.red,
                display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 8px rgba(239,68,68,.35)' }}>
                <Bell size={12} color="#fff" style={{ animation:'badge 2s ease-in-out infinite' }}/>
                <span style={{ color:'#fff', fontSize:12, fontWeight:800 }}>{alertCount}</span>
              </div>
            )}
            <button onClick={() => refresh()} disabled={syncing}
              style={{ height:34, padding:'0 14px', borderRadius:99, cursor:'pointer',
                background:'rgba(255,255,255,.90)', border:'1px solid rgba(255,255,255,.65)',
                color:W.honeyDk, fontSize:12, fontWeight:700,
                display:'flex', alignItems:'center', gap:6, transition:'all .2s' }}>
              <RefreshCw size={12} style={{ animation:syncing?'spin 0.8s linear infinite':'none' }}/>
              {syncing ? 'Sync…' : 'Actualiser'}
            </button>
          </div>
        </div>

        {/* Organic wave bottom border */}
        <svg viewBox="0 0 1440 24" style={{ display:'block', width:'100%', height:24,
          position:'relative', zIndex:3 }} preserveAspectRatio="none">
          <path d="M0,12 C240,24 480,0 720,12 C960,24 1200,0 1440,12 L1440,24 L0,24 Z"
            fill={W.cream}/>
        </svg>
      </header>

      {/* ══════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════ */}
      <main style={{ flex:1, overflowY:'auto', position:'relative', background:W.cream }}>

        {/* Global organic blobs — subtle background decoration */}
        <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
          <WaxBlob x="80%" y="15%" size={300} opacity={0.04}/>
          <WaxBlob x="-5%" y="50%" size={200} opacity={0.05} color={W.honeyDk}/>
          <WaxBlob x="60%" y="70%" size={250} opacity={0.04}/>
        </div>

        <div style={{ position:'relative', zIndex:1,
          padding:'clamp(12px,3vw,28px) clamp(12px,3vw,32px)' }}>

          {/* ── Loading state ── */}
          {loading && !syncing ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', height:'65vh', gap:20 }}>
              <div style={{ position:'relative', width:120, height:120 }}>
                <img src={IMG_HONEYCOMB} alt="loading"
                  style={{ width:120, height:120, borderRadius:'50%', objectFit:'cover',
                    opacity:.65, boxShadow:'0 8px 32px rgba(139,68,14,.2)', animation:'sway 3s ease-in-out infinite' }}/>
                <div style={{ position:'absolute', inset:-4, borderRadius:'50%',
                  border:`3px solid transparent`, borderTopColor:W.honey,
                  animation:'spin 1.2s linear infinite' }}/>
              </div>
              <div style={{ color:W.textMd, fontWeight:700, fontSize:15 }}>
                Chargement des données apicoles…
              </div>
              <div style={{ fontSize:12, color:W.textMuted }}>
                🐝 Connexion à la ruche…
              </div>
            </div>

          ) : selectedHive ? (
            <div className="bee-page-enter">
              <HiveDetailView hive={selectedHive} emplacements={emplacements}
                onBack={() => setSelectedHive(null)} toast={toast}/>
            </div>

          ) : (
            <div className="bee-page-enter">

              {/* ── DASHBOARD HERO ── */}
              {activePage === 'dashboard' && (
                <div style={{ marginBottom:32 }}>

                  {/* Full storytelling hero card */}
                  <div style={{ position:'relative', borderRadius:24, overflow:'hidden',
                    minHeight:280, background:'#2c1a0e',
                    boxShadow:'0 12px 48px rgba(139,68,14,.25)', marginBottom:24 }}>

                    {/* Hero image — Image 1 (bee on honeycomb) */}
                    <img src={IMG_HONEYCOMB} alt="bee on honeycomb"
                      style={{ position:'absolute', inset:0, width:'100%', height:'100%',
                        objectFit:'cover', opacity:.55 }}/>

                    {/* Dark left gradient for text readability */}
                    <div style={{ position:'absolute', inset:0,
                      background:'linear-gradient(105deg, rgba(44,26,14,.9) 0%, rgba(44,26,14,.6) 45%, rgba(44,26,14,.1) 100%)' }}/>

                    {/* Honeycomb overlay */}
                    <HoneycombPattern opacity={0.08}/>

                    {/* Hero content */}
                    <div style={{ position:'relative', zIndex:2, padding:'36px 40px',
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                      flexWrap:'wrap', gap:24 }}>

                      {/* Left: storytelling text */}
                      <div style={{ maxWidth:480 }}>
                        <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:16,
                          background:'rgba(251,191,36,.15)', border:'1px solid rgba(251,191,36,.3)',
                          borderRadius:99, padding:'5px 14px' }}>
                          <span style={{ fontSize:12 }}>🐝</span>
                          <span style={{ fontSize:10, color:'#fcd34d', fontWeight:800,
                            letterSpacing:.8, textTransform:'uppercase' }}>
                            APICRAFT · APICULTURE INTELLIGENTE
                          </span>
                        </div>

                        <h1 style={{ fontSize:'clamp(24px,4vw,38px)', fontWeight:900, color:'#fff',
                          lineHeight:1.15, margin:'0 0 12px', letterSpacing:'-.03em',
                          textShadow:'0 2px 12px rgba(0,0,0,.3)' }}>
                          L'apiculture<br/>
                          <span style={{ color:'#fbbf24' }}>réinventée par l'IA</span>
                        </h1>

                        <p style={{ fontSize:14, color:'rgba(255,255,255,.72)', lineHeight:1.7,
                          margin:'0 0 24px', maxWidth:360 }}>
                          Surveillez vos colonies en temps réel, anticipez les récoltes
                          et optimisez chaque ruche avec l'intelligence artificielle.
                        </p>

                        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6,
                            background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)',
                            borderRadius:99, padding:'6px 14px', fontSize:12, color:'rgba(255,255,255,.8)' }}>
                            🏡 {emplacements.length} sites actifs
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:6,
                            background:'rgba(251,191,36,.15)', border:'1px solid rgba(251,191,36,.3)',
                            borderRadius:99, padding:'6px 14px', fontSize:12, color:'#fcd34d', fontWeight:600 }}>
                            🐝 {ruches.length} ruches monitorées
                          </div>
                          {alertCount > 0 && (
                            <div style={{ display:'flex', alignItems:'center', gap:6,
                              background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.3)',
                              borderRadius:99, padding:'6px 14px', fontSize:12, color:'#fca5a5', fontWeight:600 }}>
                              ⚠ {alertCount} alerte{alertCount>1?'s':''}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: KPI tiles */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        {[
                          { val:stats.totalMiel, label:'Miel récolté', icon:'🍯', color:'#fbbf24' },
                          { val:stats.sante,     label:'Santé moy.',   icon:'💚', color:'#4ade80' },
                          { val:ruches.length,   label:'Ruches',       icon:'🔶', color:'#fb923c' },
                          { val:emplacements.length, label:'Sites GIS',icon:'📍', color:'#60a5fa' },
                        ].map(({ val, label, icon, color }) => (
                          <div key={label} style={{
                            background:'rgba(255,255,255,.10)', backdropFilter:'blur(8px)',
                            border:'1px solid rgba(255,255,255,.18)', borderRadius:16,
                            padding:'14px 18px', textAlign:'center', minWidth:110,
                          }}>
                            <div style={{ fontSize:24, marginBottom:4 }}>{icon}</div>
                            <div style={{ fontSize:22, fontWeight:900, color, lineHeight:1,
                              fontVariantNumeric:'tabular-nums' }}>{val}</div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,.55)',
                              fontWeight:600, marginTop:3, textTransform:'uppercase', letterSpacing:.5 }}>
                              {label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Watercolor secondary strip — Image 2 */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:16 }}>

                    {/* Main tab content placeholder — passes through to DashboardTab below */}
                    <div style={{ background:W.warm, borderRadius:16,
                      border:`1px solid ${W.border}`, padding:'20px 22px',
                      boxShadow:'0 2px 8px rgba(139,68,14,.06)' }}>
                      <div style={{ fontSize:11, color:W.textMuted, fontWeight:700,
                        textTransform:'uppercase', letterSpacing:.7, marginBottom:4 }}>
                        🌿 Écosystème apicole
                      </div>
                      <h3 style={{ fontSize:15, fontWeight:800, color:W.text, margin:'0 0 8px' }}>
                        Tableau de bord opérationnel
                      </h3>
                      <p style={{ fontSize:12, color:W.textMuted, lineHeight:1.7, margin:0 }}>
                        Données en temps réel — synchronisées avec vos capteurs IoT et
                        enrichies par l'analyse prédictive COLOSS.
                      </p>
                    </div>

                    {/* Image 3 — watercolor sketch as story card */}
                    <div style={{ position:'relative', borderRadius:16, overflow:'hidden',
                      boxShadow:'0 4px 20px rgba(139,68,14,.12)', minHeight:120 }}>
                      <img src={IMG_WATERCOLOR} alt="watercolor bees"
                        style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
                      <div style={{ position:'absolute', inset:0,
                        background:'linear-gradient(to top, rgba(44,26,14,.75) 0%, transparent 55%)' }}/>
                      <div style={{ position:'absolute', bottom:14, left:14, right:14 }}>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,.9)', fontWeight:700,
                          lineHeight:1.5 }}>
                          🌸 Pollinisation & biodiversité
                        </div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', marginTop:2 }}>
                          Suivi des floraisons & prévisions de récolte
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── NON-DASHBOARD SLIM HEADER ── */}
              {activePage !== 'dashboard' && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  marginBottom:24, paddingBottom:20, borderBottom:`1px solid ${W.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                    {/* Small watercolor accent image */}
                    <div style={{ width:52, height:52, borderRadius:14, overflow:'hidden', flexShrink:0,
                      boxShadow:'0 3px 12px rgba(139,68,14,.15)' }}>
                      <img src={IMG_SKETCH} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}
                        onError={e => e.target.style.display='none'}/>
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:W.honey, fontWeight:800,
                        letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:4 }}>
                        APICRAFT · {currentTab?.emoji} {currentTab?.label}
                      </div>
                      <h2 style={{ fontSize:22, fontWeight:900, color:W.text, margin:0, letterSpacing:'-.02em' }}>
                        {currentTab?.label}
                      </h2>
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ padding:'7px 16px', borderRadius:99,
                      background:W.honeyLt, border:`1px solid ${W.border}` }}>
                      <span>🍯</span>
                      <span style={{ color:W.honeyDk, fontWeight:800, fontSize:12, marginLeft:6 }}>
                        {stats.totalMiel}
                      </span>
                    </div>
                    {alertCount > 0 && (
                      <div style={{ padding:'7px 16px', borderRadius:99,
                        background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)' }}>
                        <span style={{ color:W.red, fontWeight:800, fontSize:12 }}>
                          ⚠ {alertCount} alerte{alertCount>1?'s':''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB CONTENT ── */}
              <div className="bee-tab-content">
                {activePage==='dashboard' && (
                  <DashboardTab ruches={ruches} emplacements={emplacements} stats={stats}
                    onAction={handleAction} onSync={refresh} isProcessing={syncing}/>
                )}
                {activePage==='sites' && (
                  <EmplacementsTab emplacements={emplacements} onAction={handleAction}
                    handleAddEmp={handleAddApiary} onDelete={handleDeleteApiary}
                    modalActive={modalActive} setModalActive={setModalActive}
                    onSelectSite={site => { setFilterApiary(String(site.id)); setActivePage('inventaire'); }}/>
                )}
                {activePage==='inventaire' && (
                  <InventaireTab ruches={ruches} emplacements={emplacements}
                    filterApiary={filterApiary} onClearFilter={() => setFilterApiary('')}
                    onSelectHive={h => { openHive(h); setActivePage('inventaire'); }}
                    onAddRuche={refresh} toast={toast}/>
                )}
                {activePage==='production' && (
                  <ProductionTab productions={productions} emplacements={emplacements}
                    ruches={ruches} visites={visites} stock={stock}
                    modalActive={modalActive} setModalActive={setModalActive}
                    prodForm={prodForm} setProdForm={setProdForm}
                    handleAddProd={handleAddProd} onSync={refresh} syncing={syncing}/>
                )}
                {activePage==='stock' && (
                  <StockTab stock={stock} visites={visites} ruches={ruches} onUpdate={handleStockUpdate}/>
                )}
                {activePage==='previsions' && (
                  <PrevisionsTab emplacements={emplacements} ruches={ruches}
                    previsions={previsions} onAdd={handleAddPrevision} onUpdateTask={handleUpdateTask}/>
                )}
              </div>

            </div>
          )}
        </div>
      </main>

      <ExpertAssistant species="bee" color={COLORS.accent}/>
    </div>
  );
}
