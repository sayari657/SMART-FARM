import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText, Download, Zap, Database, BarChart3, BrainCircuit, Leaf,
  Activity, Printer, Sparkles, Sprout, Shield, Info, RefreshCw,
  Heart, AlertCircle, Target, TrendingUp, TrendingDown,
  Search, ChevronDown, ChevronUp, X, Eye, Calendar, Award,
  CheckCircle2, ArrowRight,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import Navbar from '../components/Navbar';
import reportsHeroImg from '../assets/reports-hero.jpg';
import api, { reportsAPI, dashboardAPI, alertsAPI, anomalyAPI, recsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

import IMG_HEADER  from '../assets/report-integre.jpg';
import IMG_ANIMALS from '../assets/report-zoo.jpg';
import IMG_PLANTS  from '../assets/report-agro.jpg';

/* ─────────────────────────────────────────────────────────────────────
   Design tokens — strict SaaS enterprise palette
   • accent  = indigo #4f46e5 (one colour only)
   • status  = green / amber / red (KPIs only)
   • darks   = #0f172a / #1e293b  (never pure black)
───────────────────────────────────────────────────────────────────── */
const C = {
  /* neutrals */
  page:    '#f8f9fa',
  surface: '#ffffff',
  raised:  '#f1f5f9',
  border:  '#e2e8f0',
  subtle:  '#f8fafc',
  muted:   '#94a3b8',
  dim:     '#64748b',
  sub:     '#475569',
  text:    '#0f172a',
  /* accent — single brand colour */
  accent:  '#4f46e5',
  accentLt:'#eef2ff',
  /* status — only for KPI indicators */
  ok:      '#10b981',
  okLt:    '#ecfdf5',
  warn:    '#f59e0b',
  warnLt:  '#fffbeb',
  danger:  '#ef4444',
  dangerLt:'#fef2f2',
  /* darks for dark-card variant */
  dark:    '#0f172a',
  darkSurf:'#1e293b',
  darkBdr: 'rgba(255,255,255,.08)',
};

const R = 12;  /* global border-radius */

const TYPE_COLOR = {
  daily: C.accent, weekly: C.warn, monthly: C.ok,
  general: C.accent, animals: C.warn, plants: C.ok,
};

/* ── helpers ────────────────────────────────────────────────────────── */
const fmt    = (n) => n != null ? n : '—';
const fmtPct = (n) => n != null ? `${Math.round(n)}%` : '—';
const statusColor = (v) => v >= 80 ? C.ok : v >= 60 ? C.warn : C.danger;
const statusBg    = (v) => v >= 80 ? C.okLt : v >= 60 ? C.warnLt : C.dangerLt;

/* ── Badge ──────────────────────────────────────────────────────────── */
function Badge({ children, color = C.accent }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: .5, color,
      background: `${color}15`, border: `1px solid ${color}25`,
      padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

/* ── Thin progress bar ──────────────────────────────────────────────── */
function Bar({ value, max = 100, color = C.accent }) {
  const w = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ height: 4, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .5s ease' }}/>
    </div>
  );
}

/* ── KPI tile ───────────────────────────────────────────────────────── */
function KpiTile({ label, value, sub, color, bg, icon: Icon, trend }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: C.surface, borderRadius: R, padding: '20px 22px',
        border: `1px solid ${hov ? color + '40' : C.border}`,
        boxShadow: hov ? `0 6px 20px ${color}10` : '0 1px 3px rgba(0,0,0,.04)',
        transform: hov ? 'translateY(-2px)' : 'none', transition: 'all .18s',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ background: bg || `${color}12`, borderRadius: 8, padding: 8 }}>
          <Icon size={14} color={color}/>
        </div>
        {trend != null && (
          <span style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? C.ok : C.danger,
            display: 'flex', alignItems: 'center', gap: 2 }}>
            {trend >= 0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1, marginBottom: 4,
        fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ── Section title ──────────────────────────────────────────────────── */
function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{children}</h2>
      {sub && <p style={{ fontSize: 12, color: C.muted, margin: '3px 0 0' }}>{sub}</p>}
    </div>
  );
}

/* ── AI Insight Modal ───────────────────────────────────────────────── */
function InsightModal({ report, onClose }) {
  if (!report) return null;
  const score = report.summary?.avg_health_score || report.summary?.avg_health || 0;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(3px)',
      zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: C.surface, borderRadius: R + 4, padding: '28px', width: 560, maxWidth: '94vw',
        maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.14)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <Sparkles size={13} color={C.accent}/>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: .7 }}>
                Analyse IA stratégique
              </span>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>{report.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: C.raised, border: 'none', borderRadius: 8,
            padding: '6px 8px', cursor: 'pointer', color: C.dim, display: 'flex' }}>
            <X size={14}/>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          <Badge color={TYPE_COLOR[report.report_type] || C.muted}>{report.report_type}</Badge>
          <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={10}/>
            {new Date(report.period_start).toLocaleDateString('fr-FR')} → {new Date(report.period_end).toLocaleDateString('fr-FR')}
          </span>
          <span style={{ fontSize: 11, color: statusColor(score), fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Award size={10}/> {score}%
          </span>
        </div>

        {report.summary?.ai_insight ? (
          <div style={{ background: C.subtle, border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${C.accent}`, borderRadius: R, padding: '16px 18px' }}>
            <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.8, margin: 0 }}>
              {report.summary.ai_insight}
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '36px 0', color: C.muted }}>
            <Info size={28} style={{ opacity: .3, marginBottom: 8 }}/>
            <div style={{ fontSize: 13 }}>Pas d'analyse IA disponible</div>
          </div>
        )}

        {report.summary && Object.entries(report.summary)
          .filter(([k, v]) => k !== 'ai_insight' && typeof v === 'number').length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase',
              letterSpacing: .6, marginBottom: 10 }}>Indicateurs</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {Object.entries(report.summary)
                .filter(([k, v]) => k !== 'ai_insight' && typeof v === 'number')
                .slice(0, 9).map(([k, v]) => (
                  <div key={k} style={{ background: C.subtle, borderRadius: R - 2, padding: '10px',
                    textAlign: 'center', border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{v}</div>
                    <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: .4, marginTop: 2 }}>
                      {k.replace(/_/g, ' ')}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════════════ */
export default function Reports() {
  const { t } = useTranslation();
  const { farmId } = useAuth();

  const [loading, setLoading]             = useState(true);
  const [generating, setGenerating]       = useState(false);
  const [genType, setGenType]             = useState(null);
  const [pdfLoading, setPdfLoading]       = useState(false);
  const [view, setView]                   = useState('live');
  const [selectedReport, setSelectedReport] = useState(null);

  const [stats, setStats]         = useState({ animals: 0, health: 0, alerts: 0 });
  const [analytics, setAnalytics] = useState([]);
  const [reports, setReports]     = useState([]);
  const [alerts, setAlerts]       = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [recs, setRecs]           = useState([]);

  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveSort, setArchiveSort]     = useState('date_desc');

  /* ── data load ──────────────────────────────────────────────────── */
  const loadAll = useCallback(async () => {
    if (!farmId) return;
    setLoading(true);
    try {
      const [rRes, sRes, aRes, alRes, anRes, rcRes] = await Promise.allSettled([
        reportsAPI.list(farmId),
        dashboardAPI.stats(farmId),
        dashboardAPI.analytics(30, farmId),
        alertsAPI.list(farmId),
        anomalyAPI.recent(50, farmId),
        recsAPI.list(false, farmId),
      ]);
      if (rRes.status  === 'fulfilled') setReports(rRes.value.data || []);
      if (alRes.status === 'fulfilled') setAlerts(alRes.value.data || []);
      if (anRes.status === 'fulfilled') setAnomalies(anRes.value.data || []);
      if (rcRes.status === 'fulfilled') setRecs(rcRes.value.data || []);
      if (sRes.status  === 'fulfilled') {
        const s = sRes.value.data;
        setStats({ animals: s.total_units ?? 0, health: s.avg_health_score ?? 0, alerts: s.active_alerts ?? 0 });
      }
      if (aRes.status === 'fulfilled') {
        const raw = aRes.value.data;
        const arr = Array.isArray(raw) ? raw : (raw?.daily_trends || []);
        setAnalytics(arr.slice(-14).map((d, i) => ({
          day: d.date
            ? new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
            : `J${i + 1}`,
          santé:   Math.round(d.avg_health ?? d.health_score ?? 0),
          alertes: d.alert_count ?? d.alerts ?? 0,
        })));
      }
    } catch {}
    finally { setLoading(false); }
  }, [farmId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── actions ────────────────────────────────────────────────────── */
  const handleGenerate = async (type) => {
    setGenerating(true); setGenType(type);
    try {
      await reportsAPI.generateIntelligent(type, farmId);
      const res = await reportsAPI.list(farmId);
      setReports(res.data);
      setView('archive');
      toast.success(`Rapport "${type}" généré`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la génération');
    } finally { setGenerating(false); setGenType(null); }
  };

  const downloadPDF = async () => {
    const el = document.getElementById('report-print-area');
    if (!el) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: true });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, (canvas.height * w) / canvas.width);
      pdf.save(`Rapport_SmartFarm_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF téléchargé');
    } catch { toast.error('Erreur PDF'); }
    finally { setPdfLoading(false); }
  };

  const downloadExcel = async () => {
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        api.get('/bee/history/hives').catch(() => ({ data: [] })),
        api.get('/bee/history/visits').catch(() => ({ data: [] })),
        api.get('/bee/history/productions').catch(() => ({ data: [] })),
        api.get('/bee/expenses').catch(() => ({ data: [] })),
      ]);
      const wb = XLSX.utils.book_new();
      [
        ['Ruches',     (r1.data||[]).map(h => ({ ID:h.identifier, Santé:h.health_score, Statut:h.is_active?'Active':'Inactive' }))],
        ['Visites',    (r2.data||[]).map(v => ({ Date:v.visit_date, Score:v.health_score, Temp:v.temperature }))],
        ['Production', (r3.data||[]).map(p => ({ Date:p.production_date, 'Miel kg':p.honey_kg }))],
        ['Dépenses',   (r4.data||[]).map(d => ({ Date:d.expense_date, Cat:d.category, Montant:d.amount }))],
        ['Rapports',   reports.map(r => ({ Titre:r.title, Type:r.report_type, Score:r.summary?.avg_health_score??0 }))],
      ].forEach(([name, data]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), name));
      XLSX.writeFile(wb, `SmartFarm_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel exporté');
    } catch { toast.error('Erreur Excel'); }
  };

  /* ── derived ────────────────────────────────────────────────────── */
  const unresolved   = alerts.filter(a => !a.is_resolved);
  const critical     = alerts.filter(a => a.severity === 'critical' && !a.is_resolved);

  const filteredReports = reports
    .filter(r => !archiveSearch ||
      r.title?.toLowerCase().includes(archiveSearch.toLowerCase()) ||
      r.report_type?.includes(archiveSearch))
    .sort((a, b) => {
      if (archiveSort === 'date_desc') return new Date(b.period_end) - new Date(a.period_end);
      if (archiveSort === 'date_asc')  return new Date(a.period_end) - new Date(b.period_end);
      return (b.summary?.avg_health_score||0) - (a.summary?.avg_health_score||0);
    });

  const GEN_BTNS = [
    { type:'animals', label:'Rapport Animaux',  icon:Activity },
    { type:'plants',  label:'Rapport Plantes',  icon:Leaf     },
    { type:'general', label:'Rapport Global IA',icon:Sparkles, primary:true },
  ];

  /* ── render ─────────────────────────────────────────────────────── */
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden',
      background:C.page, fontFamily:"'Inter', system-ui, sans-serif" }}>

      <Navbar
        title="Rapports Intelligents"
        subtitle="Analyse stratégique · Export · IA Souveraine"
        actions={
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={downloadPDF} disabled={pdfLoading}
              style={btn('ghost')}>
              {pdfLoading ? <RefreshCw size={12} style={{animation:'spin .8s linear infinite'}}/> : <Printer size={12}/>} PDF
            </button>
            <button onClick={downloadExcel} style={btn('ghost-green')}>
              <Download size={12}/> Excel
            </button>
          </div>
        }
      />

      <div id="report-print-area"
        style={{ flex:1, overflowY:'auto', overscrollBehaviorY:'contain' }}>

        {/* ── PAGE HEADER — Watercolor Banner ───────────────────── */}
        <div style={{ position:'relative', overflow:'hidden', borderBottom:`1px solid ${C.border}`, minHeight:120 }}>
          {/* Full-bleed watercolor image */}
          <img src={reportsHeroImg} alt="" style={{
            position:'absolute', inset:0, width:'100%', height:'100%',
            objectFit:'cover', objectPosition:'center', pointerEvents:'none',
          }}/>
          {/* Dark overlay for legibility */}
          <div style={{
            position:'absolute', inset:0, pointerEvents:'none',
            background:'linear-gradient(120deg, rgba(8,30,50,.82) 0%, rgba(15,50,80,.68) 55%, rgba(20,70,100,.35) 100%)',
          }}/>

          <div style={{ position:'relative', zIndex:2, padding:'28px 36px 24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:24, flexWrap:'wrap' }}>

            {/* Left: title + meta */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ background:'rgba(255,255,255,.18)', backdropFilter:'blur(6px)', borderRadius:8, padding:7, border:'1px solid rgba(255,255,255,.25)' }}>
                  <BrainCircuit size={15} color="#fff"/>
                </div>
                <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.8)', textTransform:'uppercase', letterSpacing:.7 }}>
                  AI Reporting Engine
                </span>
              </div>
              <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px', letterSpacing:-.3, textShadow:'0 2px 10px rgba(0,0,0,.3)' }}>
                Rapport Intégré Smart Farm
              </h1>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.65)', margin:0 }}>
                {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
                {' · '}Ollama · RAG UTAP/AVFA · Open-Meteo
              </p>
            </div>

            {/* Right: actions */}
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              {/* View toggle */}
              <div style={{ display:'flex', background:'rgba(255,255,255,.15)', backdropFilter:'blur(8px)', borderRadius:10, padding:4, border:'1px solid rgba(255,255,255,.25)', gap:3 }}>
                {[{id:'live',label:'Live',icon:Zap},{id:'archive',label:'Archives',icon:Database}].map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setView(id)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8,
                      border:'none', background: view===id ? 'rgba(255,255,255,.25)' : 'transparent',
                      color: '#fff',
                      fontSize:12, fontWeight: view===id?700:500, cursor:'pointer', transition:'all .15s',
                      boxShadow: view===id ? '0 1px 3px rgba(0,0,0,.15)' : 'none' }}>
                    <Icon size={12}/> {label}
                  </button>
                ))}
              </div>

              {/* AI generation buttons */}
              <div style={{ display:'flex', gap:8 }}>
                {GEN_BTNS.map(({ type, label, icon: Icon, primary }) => (
                  <button key={type} onClick={() => handleGenerate(type)} disabled={generating}
                    style={primary ? btn('accent') : btn('outline')}>
                    {generating && genType === type
                      ? <RefreshCw size={12} style={{animation:'spin .8s linear infinite'}}/>
                      : <Icon size={12}/>}
                    {generating && genType === type ? 'Génération…' : label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* ── KPI ROW ───────────────────────────────────────────── */}
        <div style={{ padding:'20px 36px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12 }}>
            <KpiTile label="Score santé"       value={fmtPct(stats.health)}   color={statusColor(stats.health)} bg={statusBg(stats.health)} icon={Heart}        sub="Cheptel global"/>
            <KpiTile label="Unités animales"   value={fmt(stats.animals)}     color={C.accent}  icon={Activity}    sub="Toutes espèces"/>
            <KpiTile label="Alertes actives"   value={unresolved.length}      color={unresolved.length>0?C.danger:C.ok} bg={unresolved.length>0?C.dangerLt:C.okLt} icon={AlertCircle} sub={critical.length>0?`${critical.length} critiques`:'Aucune critique'}/>
            <KpiTile label="Anomalies 24h"     value={anomalies.length}       color={anomalies.length>0?C.warn:C.muted} bg={anomalies.length>0?C.warnLt:C.raised} icon={Target}      sub="Isolation Forest"/>
            <KpiTile label="Recommandations"   value={recs.length}            color={C.accent}  icon={Sparkles}    sub="IA souveraine"/>
            <KpiTile label="Rapports archivés" value={reports.length}         color={C.accent}  icon={FileText}    sub="Disponibles"/>
          </div>
        </div>

        {/* ── CONTENT ───────────────────────────────────────────── */}
        <div style={{ padding:'28px 36px' }}>
          {view === 'live'
            ? <LiveView stats={stats} analytics={analytics} alerts={alerts} anomalies={anomalies} recs={recs}/>
            : <ArchiveView reports={filteredReports} loading={loading}
                search={archiveSearch} onSearch={setArchiveSearch}
                sort={archiveSort} onSort={setArchiveSort}
                onView={setSelectedReport}/>}
        </div>

        {/* ── FOOTER ────────────────────────────────────────────── */}
        <footer style={{ borderTop:`1px solid ${C.border}`, padding:'14px 36px', display:'flex',
          justifyContent:'space-between', alignItems:'center', background:C.surface }}>
          <span style={{ fontSize:11, color:C.muted }}>Smart Farm AI · Ollama · RAG UTAP/AVFA · Open-Meteo</span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={downloadPDF} style={btn('ghost')}>
              <Printer size={11}/> PDF
            </button>
            <button onClick={downloadExcel} style={btn('ghost-green')}>
              <Download size={11}/> Excel
            </button>
          </div>
        </footer>
      </div>

      {selectedReport && <InsightModal report={selectedReport} onClose={() => setSelectedReport(null)}/>}

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .rp-in { animation: fadeUp .25s ease forwards; }
      `}</style>
    </div>
  );
}

/* ── button style helper ────────────────────────────────────────────── */
function btn(variant) {
  const base = { display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8,
    fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s', outline:'none' };
  if (variant === 'accent')      return { ...base, background:C.accent, border:'none', color:'#fff', boxShadow:`0 2px 8px ${C.accent}30` };
  if (variant === 'outline')     return { ...base, background:C.surface, border:`1px solid ${C.border}`, color:C.dim };
  if (variant === 'ghost')       return { ...base, background:C.surface, border:`1px solid ${C.border}`, color:C.dim };
  if (variant === 'ghost-green') return { ...base, background:C.okLt, border:`1px solid ${C.ok}30`, color:C.ok };
  return base;
}

/* ══════════════════════════════════════════════════════════════════════
   Live View
══════════════════════════════════════════════════════════════════════ */
function LiveView({ stats, analytics, alerts, anomalies, recs }) {
  const unresolved = alerts.filter(a => !a.is_resolved);

  const alertPie = Object.entries(
    alerts.reduce((acc, a) => { acc[a.alert_type||'autre'] = (acc[a.alert_type||'autre']||0)+1; return acc; }, {})
  ).slice(0, 5).map(([name, value], i) => ({
    name: name.replace(/_/g,' '), value,
    fill: [C.danger, C.warn, C.accent, '#8b5cf6', C.ok][i],
  }));

  return (
    <div className="rp-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Banner image */}
      <div style={{ height:200, borderRadius:R, overflow:'hidden', position:'relative',
        boxShadow:'0 2px 12px rgba(0,0,0,.08)' }}>
        <img src={IMG_HEADER} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="header"/>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right,rgba(15,23,42,.7) 0%,transparent 55%)' }}/>
        <div style={{ position:'absolute', bottom:24, left:28, color:'#fff' }}>
          <h2 style={{ fontSize:20, fontWeight:800, margin:'0 0 4px', letterSpacing:-.2 }}>
            Rapport Intégré Smart Farm
          </h2>
          <p style={{ margin:0, fontSize:12, opacity:.75 }}>
            Analyse complète · {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div style={{ position:'absolute', top:16, right:18, background:'rgba(15,23,42,.55)',
          backdropFilter:'blur(8px)', padding:'5px 12px', borderRadius:99,
          border:'1px solid rgba(255,255,255,.15)', color:'#fff', display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:C.ok, display:'inline-block', animation:'pulse 2s infinite' }}/>
          Système opérationnel
        </div>
      </div>

      {/* Chart + gauge row */}
      {analytics.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:16 }}>

          {/* 14-day trend */}
          <div style={{ background:C.surface, borderRadius:R, padding:'22px 24px',
            border:`1px solid ${C.border}`, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
            <SectionTitle sub="Score santé & alertes quotidiennes">Tendance 14 jours</SectionTitle>
            <ResponsiveContainer width="100%" height={155}>
              <LineChart data={analytics} margin={{ left:-24, right:8, top:4, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="day" tick={{ fill:C.muted, fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:C.muted, fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip
                  contentStyle={{ background:C.surface, border:`1px solid ${C.border}`,
                    borderRadius:8, fontSize:11, boxShadow:'0 4px 12px rgba(0,0,0,.08)' }}
                  labelStyle={{ color:C.text, fontWeight:700 }}/>
                <Line type="monotone" dataKey="santé"   stroke={C.ok}     strokeWidth={2} dot={false} name="Score santé"/>
                <Line type="monotone" dataKey="alertes" stroke={C.danger} strokeWidth={1.5} dot={false} strokeDasharray="4 3" name="Alertes"/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Score + pie */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ background:C.surface, borderRadius:R, padding:'18px 20px',
              border:`1px solid ${C.border}`, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
              <div style={{ fontSize:11, fontWeight:600, color:C.muted, marginBottom:12 }}>Score santé global</div>
              <div style={{ textAlign:'center', marginBottom:12 }}>
                <div style={{ fontSize:44, fontWeight:900, color:statusColor(stats.health),
                  lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{stats.health}%</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
                  {stats.health>=80?'Excellent':stats.health>=60?'Acceptable':'À surveiller'}
                </div>
              </div>
              <Bar value={stats.health} color={statusColor(stats.health)}/>
            </div>

            {alertPie.length > 0 && (
              <div style={{ background:C.surface, borderRadius:R, padding:'16px 18px',
                border:`1px solid ${C.border}`, boxShadow:'0 1px 3px rgba(0,0,0,.04)', flex:1 }}>
                <div style={{ fontSize:11, fontWeight:600, color:C.muted, marginBottom:10 }}>Types d'alertes</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <ResponsiveContainer width={72} height={72}>
                    <PieChart>
                      <Pie data={alertPie} cx="50%" cy="50%" innerRadius={20} outerRadius={34} dataKey="value" stroke="none">
                        {alertPie.map((d, i) => <Cell key={i} fill={d.fill}/>)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
                    {alertPie.slice(0, 4).map(d => (
                      <div key={d.name} style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ width:7, height:7, borderRadius:2, background:d.fill, flexShrink:0 }}/>
                        <span style={{ fontSize:10, color:C.dim, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</span>
                        <span style={{ fontSize:10, fontWeight:700, color:C.text }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3-column domain cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>

        {/* Animals */}
        <DomainCard
          icon={Activity} color={C.warn}
          title="Rapport Zootechnique" sub="Analyse temps réel"
          image={IMG_ANIMALS}
          metrics={[
            { label:'Unités animales',      value:fmt(stats.animals),   color:C.warn, pct:null },
            { label:'Score santé moyen',    value:fmtPct(stats.health), color:statusColor(stats.health), pct:stats.health },
            { label:'Alertes non résolues', value:unresolved.length,    color:unresolved.length>0?C.danger:C.ok, pct:null },
          ]}
        />

        {/* Plants */}
        <DomainCard
          icon={Sprout} color={C.ok}
          title="Rapport Agronomique" sub="Cultures & rendements"
          image={IMG_PLANTS}
          metrics={[
            { label:'Stress hydrique',    value:'Bas',    color:C.ok,   pct:15 },
            { label:'Rendement estimé',   value:'12.5 t', color:C.warn, pct:null },
            { label:'Usage fertilisants', value:'−15%',   color:C.ok,   pct:85 },
          ]}
        />

        {/* Security */}
        <div style={{ background:C.dark, borderRadius:R, padding:'22px', border:`1px solid ${C.darkBdr}`,
          boxShadow:'0 2px 12px rgba(0,0,0,.12)', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <div style={{ background:'rgba(251,191,36,.15)', borderRadius:8, padding:7 }}>
              <Shield size={14} color="#fbbf24"/>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#f1f5f9' }}>Sécurité & Infrastructure</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.35)' }}>Périmètre · IoT · Caméras</div>
            </div>
          </div>

          {/* Big metric */}
          <div style={{ background:C.darkSurf, borderRadius:R-2, padding:'16px', marginBottom:14, textAlign:'center' }}>
            <div style={{ fontSize:40, fontWeight:900, color:'#f1f5f9', lineHeight:1 }}>100%</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:4 }}>Intégrité périmètre</div>
          </div>

          {/* Status pills */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
            {[
              { l:'Barrière OK',       c:'#fbbf24', bg:'rgba(251,191,36,.12)' },
              { l:'IoT actifs',        c:'#4ade80', bg:'rgba(74,222,128,.12)' },
              { l:'Caméras ON',        c:'#60a5fa', bg:'rgba(96,165,250,.12)' },
            ].map(p => (
              <span key={p.l} style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:.5,
                padding:'3px 10px', borderRadius:99, background:p.bg, color:p.c }}>{p.l}</span>
            ))}
          </div>

          {/* Anomaly count */}
          <div style={{ background:C.darkSurf, borderRadius:R-2, padding:'10px 14px', marginBottom:12,
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,.5)' }}>Anomalies 24h</span>
            <span style={{ fontSize:16, fontWeight:800,
              color: anomalies.length>0?'#fbbf24':'#4ade80' }}>{anomalies.length}</span>
          </div>

          {anomalies.slice(0,2).map(a => (
            <div key={a.id} style={{ borderLeft:`2px solid #fbbf24`, paddingLeft:10, marginBottom:8 }}>
              <div style={{ fontSize:11, color:'#e2e8f0', fontWeight:600 }}>{a.anomaly_type}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.35)' }}>{a.description?.slice(0,55)}…</div>
            </div>
          ))}

          <div style={{ marginTop:'auto', paddingTop:14, borderTop:`1px solid ${C.darkBdr}`,
            fontSize:11, color:'rgba(255,255,255,.35)', display:'flex', alignItems:'center', gap:6 }}>
            <BarChart3 size={12} color="#fbbf24"/>
            Dernière anomalie : <strong style={{color:'#f1f5f9'}}>
              {anomalies[0] ? new Date(anomalies[0].timestamp).toLocaleDateString('fr-FR') : 'Aucune'}
            </strong>
          </div>
        </div>
      </div>

      {/* Recommendations strip */}
      {recs.length > 0 && (
        <div style={{ background:C.surface, borderRadius:R, padding:'20px 22px',
          border:`1px solid ${C.border}`, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <SectionTitle sub={`${recs.length} recommandation${recs.length>1?'s':''} actives`}>
              Recommandations IA
            </SectionTitle>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
            {recs.slice(0, 6).map(r => {
              const uc = r.urgency_level==='critical'?C.danger:r.urgency_level==='high'?C.warn:C.accent;
              return (
                <div key={r.id} style={{ background:C.subtle, borderRadius:R-2, padding:'12px 14px',
                  borderLeft:`3px solid ${uc}`, border:`1px solid ${C.border}`, borderLeftWidth:3 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:uc, textTransform:'uppercase',
                    letterSpacing:.5, marginBottom:4 }}>{r.urgency_level||'info'}</div>
                  <div style={{ fontSize:12, color:C.text, lineHeight:1.5 }}>
                    {r.recommendation_text?.slice(0, 80)}{r.recommendation_text?.length>80?'…':''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Domain Card (Animals / Plants) ─────────────────────────────────── */
function DomainCard({ icon: Icon, color, title, sub, image, metrics }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:C.surface, borderRadius:R, padding:'22px',
        border:`1px solid ${hov?color+'30':C.border}`,
        boxShadow: hov?`0 8px 24px ${color}0d`:'0 1px 3px rgba(0,0,0,.04)',
        transform: hov?'translateY(-2px)':'none', transition:'all .2s',
        display:'flex', flexDirection:'column' }}>

      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <div style={{ background:`${color}12`, borderRadius:8, padding:8 }}>
          <Icon size={14} color={color}/>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{title}</div>
          <div style={{ fontSize:10, color:C.muted }}>{sub}</div>
        </div>
      </div>

      <div style={{ borderRadius:R-2, overflow:'hidden', marginBottom:16, height:140 }}>
        <img src={image} style={{ width:'100%', height:'100%', objectFit:'cover',
          transition:'transform .35s', display:'block' }} alt={title}
          onMouseEnter={e => e.currentTarget.style.transform='scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}/>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
        {metrics.map(m => (
          <div key={m.label}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:11, color:C.dim }}>{m.label}</span>
              <span style={{ fontSize:12, fontWeight:800, color:m.color }}>{m.value}</span>
            </div>
            {m.pct != null && <Bar value={m.pct} color={m.color}/>}
          </div>
        ))}
      </div>

      <button style={{ marginTop:16, width:'100%', padding:'9px', borderRadius:R-2,
        border:`1px solid ${color}25`, background:`${color}08`, color,
        fontSize:11, fontWeight:700, cursor:'pointer', display:'flex',
        alignItems:'center', justifyContent:'center', gap:5, transition:'background .15s' }}
        onMouseEnter={e => e.currentTarget.style.background=`${color}15`}
        onMouseLeave={e => e.currentTarget.style.background=`${color}08`}>
        <Download size={11}/> Télécharger PDF
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Archive View
══════════════════════════════════════════════════════════════════════ */
function ArchiveView({ reports, loading, search, onSearch, sort, onSort, onView }) {
  const [expanded, setExpanded] = useState(null);

  if (loading) return (
    <div style={{ textAlign:'center', padding:'80px 0' }}>
      <div style={{ width:36, height:36, border:`2px solid ${C.border}`, borderTopColor:C.accent,
        borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 14px' }}/>
      <div style={{ fontSize:13, color:C.muted }}>Chargement des archives…</div>
    </div>
  );

  return (
    <div className="rp-in">
      {/* Controls */}
      <div style={{ display:'flex', gap:12, marginBottom:20, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, maxWidth:360 }}>
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Rechercher un rapport…"
            style={{ width:'100%', padding:'9px 12px 9px 36px', background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:R-2, color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }}
            onFocus={e => { e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accent}15`; }}
            onBlur={e => { e.target.style.borderColor=C.border; e.target.style.boxShadow='none'; }}/>
          <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.muted, pointerEvents:'none' }}/>
          {search && <button onClick={() => onSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.muted }}><X size={11}/></button>}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[{v:'date_desc',l:'Plus récents'},{v:'date_asc',l:'Plus anciens'},{v:'score',l:'Meilleur score'}].map(({ v, l }) => (
            <button key={v} onClick={() => onSort(v)}
              style={{ padding:'7px 12px', borderRadius:R-2, cursor:'pointer', fontSize:11, fontWeight:sort===v?700:500,
                border:`1px solid ${sort===v?C.accent:C.border}`, background:sort===v?C.accentLt:C.surface,
                color:sort===v?C.accent:C.dim, transition:'all .12s' }}>
              {l}
            </button>
          ))}
        </div>
        <span style={{ marginLeft:'auto', fontSize:11, color:C.muted }}>{reports.length} rapport{reports.length!==1?'s':''}</span>
      </div>

      {reports.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 0', color:C.muted }}>
          <FileText size={44} style={{ opacity:.15, marginBottom:16 }}/>
          <div style={{ fontSize:15, fontWeight:700, color:C.dim, marginBottom:6 }}>Aucun rapport archivé</div>
          <div style={{ fontSize:13 }}>{search?'Aucun résultat pour cette recherche':'Générez un rapport IA pour le voir ici'}</div>
        </div>
      ) : (
        <div style={{ background:C.surface, borderRadius:R, border:`1px solid ${C.border}`,
          overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>

          {/* Head */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 110px 180px 80px 100px', gap:12,
            padding:'11px 20px', background:C.subtle, borderBottom:`1px solid ${C.border}` }}>
            {['Rapport','Type','Période','Score','Actions'].map(h => (
              <span key={h} style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.7 }}>
                {h}
              </span>
            ))}
          </div>

          {reports.map((r, idx) => {
            const score = r.summary?.avg_health_score || r.summary?.avg_health || 0;
            const isExp = expanded === r.id;
            return (
              <React.Fragment key={r.id}>
                <div
                  onClick={() => setExpanded(isExp ? null : r.id)}
                  style={{ display:'grid', gridTemplateColumns:'1fr 110px 180px 80px 100px', gap:12,
                    padding:'13px 20px', borderBottom:`1px solid ${C.border}`,
                    alignItems:'center', cursor:'pointer', transition:'background .1s',
                    background: isExp ? C.accentLt : 'transparent' }}
                  onMouseEnter={e => !isExp && (e.currentTarget.style.background = C.subtle)}
                  onMouseLeave={e => !isExp && (e.currentTarget.style.background = 'transparent')}>

                  <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                    {r.summary?.ai_insight && <Sparkles size={11} color={C.accent}/>}
                    <span style={{ fontSize:13, fontWeight:600, color:C.text,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</span>
                  </div>

                  <Badge color={TYPE_COLOR[r.report_type]||C.muted}>{r.report_type}</Badge>

                  <span style={{ fontSize:11, color:C.dim, display:'flex', alignItems:'center', gap:4 }}>
                    <Calendar size={9}/>
                    {new Date(r.period_start).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})} →{' '}
                    {new Date(r.period_end).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}
                  </span>

                  <span style={{ fontSize:16, fontWeight:900, color:statusColor(score),
                    fontVariantNumeric:'tabular-nums' }}>{score}%</span>

                  <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => onView(r)} style={btn('outline')}>
                      <Eye size={10}/> Voir
                    </button>
                    <button onClick={() => setExpanded(isExp?null:r.id)}
                      style={{ ...btn('outline'), padding:'7px 8px' }}>
                      {isExp ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
                    </button>
                  </div>
                </div>

                {isExp && (
                  <div style={{ padding:'14px 20px 16px 44px', background:C.accentLt,
                    borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ borderLeft:`3px solid ${C.accent}`, paddingLeft:14 }}>
                      <span style={{ fontSize:9, fontWeight:700, color:C.accent, textTransform:'uppercase',
                        letterSpacing:.6, display:'block', marginBottom:6 }}>Analyse IA stratégique</span>
                      <p style={{ fontSize:12, color:C.sub, lineHeight:1.8, margin:0 }}>
                        {r.summary?.ai_insight || 'Pas d\'analyse IA disponible pour ce rapport.'}
                      </p>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
