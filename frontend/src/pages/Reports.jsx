import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  FileText, Download, Zap, Database, BarChart3, BrainCircuit, Leaf,
  Activity, Printer, Sparkles, Sprout, Shield, Info, RefreshCw,
  Heart, AlertCircle, Target, TrendingUp, TrendingDown,
  Search, ChevronDown, ChevronUp, X, Eye, Calendar, Award,
  CheckCircle2, ArrowRight,
  Brain, AlertOctagon, AlertTriangle, Lightbulb,
  Play, Flame, Check, MessageCircle, Building2, Filter, Bell, Wind,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
  BarChart, Bar as RBar,
} from 'recharts';
import Navbar from '../components/Navbar';
import reportsHeroImg from '../assets/reports-hero.jpg';
import api, { reportsAPI, dashboardAPI, alertsAPI, anomalyAPI, recsAPI, orchardAPI, cvAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

import IMG_HEADER  from '../assets/report-integre.jpg';
import IMG_ANIMALS from '../assets/report-zoo.jpg';
import IMG_PLANTS  from '../assets/report-agro.jpg';

/* ── Reports design tokens ─────────────────────────────────────────── */
const C = {
  page:    '#f8f9fa',
  surface: '#ffffff',
  raised:  '#f1f5f9',
  border:  '#e2e8f0',
  subtle:  '#f8fafc',
  muted:   '#94a3b8',
  dim:     '#64748b',
  sub:     '#475569',
  text:    '#0f172a',
  accent:  '#4f46e5',
  accentLt:'#eef2ff',
  ok:      '#10b981',
  okLt:    '#ecfdf5',
  warn:    '#f59e0b',
  warnLt:  '#fffbeb',
  danger:  '#ef4444',
  dangerLt:'#fef2f2',
  dark:    '#0f172a',
  darkSurf:'#1e293b',
  darkBdr: 'rgba(255,255,255,.08)',
};

/* ── AI / Recs design tokens ───────────────────────────────────────── */
const T = {
  bg:      '#f8fafc',
  surface: '#ffffff',
  raised:  '#f1f5f9',
  border:  '#e2e8f0',
  muted:   '#94a3b8',
  dim:     '#64748b',
  sub:     '#475569',
  text:    '#0f172a',
  white:   '#ffffff',
  primary: '#4f46e5',
  green:   '#10b981',
  red:     '#ef4444',
  amber:   '#f59e0b',
  sky:     '#0ea5e9',
  purple:  '#8b5cf6',
  indigo:  '#4f46e5',
};

const R = 12;

const TYPE_COLOR = {
  daily: C.accent, weekly: C.warn, monthly: C.ok,
  general: C.accent, animals: C.warn, plants: C.ok,
};

const URGENCY = {
  critical: { color: '#ef4444', bg: '#fef2f2', label: 'Critique', icon: AlertOctagon,  dot: '🔴' },
  high:     { color: '#f59e0b', bg: '#fffbeb', label: 'Haute',    icon: AlertTriangle, dot: '🟡' },
  medium:   { color: '#0ea5e9', bg: '#f0f9ff', label: 'Moyenne',  icon: Info,          dot: '🔵' },
  low:      { color: '#10b981', bg: '#ecfdf5', label: 'Basse',    icon: Lightbulb,     dot: '🟢' },
};

const ALERT_ICONS = {
  fire_detection: Flame,
  health: Heart,
  test: Shield,
  default: AlertTriangle,
};

const PLANTS = [
  'Herbe','Blé','Orge','Luzerne','Trèfle','Maïs',
  'Tournesol','Sorgho','Olive','Agrumes','Tomate','Pomme de terre',
];

/* ── Helpers ───────────────────────────────────────────────────────── */
const fmt    = (n) => n != null ? n : '—';
const fmtPct = (n) => n != null ? `${Math.round(n)}%` : '—';
const statusColor = (v) => v >= 80 ? C.ok : v >= 60 ? C.warn : C.danger;
const statusBg    = (v) => v >= 80 ? C.okLt : v >= 60 ? C.warnLt : C.dangerLt;
const ago = (ts) => {
  if (!ts) return '';
  const d = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (d < 1)    return "à l'instant";
  if (d < 60)   return `${d}m`;
  if (d < 1440) return `${Math.floor(d / 60)}h`;
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};
const scoreColor = (v) => v >= 80 ? T.green : v >= 60 ? T.amber : T.red;

/* ── Badge (unified) ───────────────────────────────────────────────── */
function Badge({ children, color = C.accent, small }) {
  return (
    <span style={{
      fontSize: small ? 9 : 10, fontWeight: 700, letterSpacing: 0.5,
      color, background: `${color}18`, border: `1px solid ${color}28`,
      padding: small ? '2px 7px' : '3px 9px', borderRadius: 99,
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

/* ── Progress Bar ──────────────────────────────────────────────────── */
function Bar({ value, max = 100, color = C.accent }) {
  const w = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ height: 4, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .5s ease' }}/>
    </div>
  );
}

/* ── KPI Tile (Reports) ────────────────────────────────────────────── */
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

/* ── Section Title ─────────────────────────────────────────────────── */
function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{children}</h2>
      {sub && <p style={{ fontSize: 12, color: C.muted, margin: '3px 0 0' }}>{sub}</p>}
    </div>
  );
}

/* ── AI Insight Modal ──────────────────────────────────────────────── */
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

/* ── Pill (AI section) ─────────────────────────────────────────────── */
function Pill({ label, count, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
      borderRadius: 99, border: `1px solid ${active ? color : T.border}`,
      background: active ? `${color}10` : T.white, color: active ? color : T.dim,
      fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
      transition: 'all .15s', outline: 'none',
      boxShadow: active ? `0 0 0 3px ${color}18` : 'none',
    }}>
      {label}
      {count != null && (
        <span style={{
          fontSize: 10, background: active ? `${color}20` : T.raised,
          color: active ? color : T.muted, padding: '0 6px', borderRadius: 99, fontWeight: 700,
        }}>{count}</span>
      )}
    </button>
  );
}

/* ── LiveDot ───────────────────────────────────────────────────────── */
function LiveDot({ status, light }) {
  const c = { connected: T.green, connecting: T.amber, disconnected: T.red }[status] || T.muted;
  const textColor = light ? 'rgba(255,255,255,.9)' : c;
  const bg        = light ? 'rgba(255,255,255,.15)' : `${c}12`;
  const bd        = light ? 'rgba(255,255,255,.25)' : `${c}25`;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10, fontWeight: 700, color: textColor,
      background: bg, border: `1px solid ${bd}`, padding: '4px 10px', borderRadius: 99,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: light ? '#4ade80' : c,
        animation: status === 'connected' ? 'livePulse 2s infinite' : 'none',
      }} />
      {status === 'connected' ? 'LIVE' : status === 'connecting' ? 'Connexion…' : 'Hors-ligne'}
    </span>
  );
}

/* ── KPI Card (AI section) ─────────────────────────────────────────── */
function KpiCard({ label, value, color, icon: Icon, pulse }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: T.white, borderRadius: 14, padding: '16px 18px',
        border: `1px solid ${hov ? color + '40' : T.border}`,
        boxShadow: hov ? `0 8px 24px ${color}12` : '0 1px 4px rgba(0,0,0,.05)',
        transform: hov ? 'translateY(-2px)' : 'none',
        transition: 'all .2s', position: 'relative', overflow: 'hidden',
      }}>
      {pulse && <span style={{ position:'absolute', top:10, right:10, width:6, height:6, borderRadius:'50%', background:color, animation:'livePulse 2s infinite' }} />}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <div style={{ background:`${color}12`, borderRadius:8, padding:6 }}>
          <Icon size={12} color={color} />
        </div>
        <span style={{ fontSize:9, color:T.muted, fontWeight:700, letterSpacing:0.6, textTransform:'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize:24, fontWeight:900, color, lineHeight:1 }}>{value}</div>
    </div>
  );
}

/* ── AI Recommendation Card ────────────────────────────────────────── */
function AiRecommendationCard({ rec }) {
  const cfg = {
    weather:       { color: T.sky,    icon: Wind,     label: 'Météo' },
    sovereign_rag: { color: T.purple, icon: Brain,    label: 'RAG Souverain' },
    operational:   { color: T.green,  icon: Activity, label: 'Opérationnel' },
    ai_analysis:   { color: T.amber,  icon: Zap,      label: 'Analyse IA' },
  }[rec.type] || { color: T.indigo, icon: Lightbulb, label: rec.type || 'IA' };
  const Icon = cfg.icon;
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: T.white, border: `1px solid ${hov ? cfg.color + '50' : T.border}`,
        borderTop: `3px solid ${cfg.color}`, borderRadius: 14, padding: '18px 20px',
        transition: 'all .2s', cursor: 'default',
        boxShadow: hov ? `0 8px 24px ${cfg.color}14` : '0 1px 4px rgba(0,0,0,.05)',
        transform: hov ? 'translateY(-2px)' : 'none',
      }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <div style={{ background:`${cfg.color}12`, borderRadius:8, padding:'6px 7px' }}>
          <Icon size={13} color={cfg.color} />
        </div>
        <Badge color={cfg.color}>{cfg.label}</Badge>
      </div>
      <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:8, lineHeight:1.4 }}>{rec.title}</div>
      <div style={{ fontSize:12, color:T.dim, lineHeight:1.65, marginBottom:10 }}>
        <span style={{ color:cfg.color, fontWeight:600 }}>↳ </span>{rec.action}
      </div>
      <div style={{ fontSize:11, color:T.dim, lineHeight:1.5, padding:'8px 10px',
        background:T.raised, borderRadius:8, borderLeft:`3px solid ${cfg.color}40` }}>
        {rec.reason}
      </div>
    </div>
  );
}

/* ── RecRow ────────────────────────────────────────────────────────── */
function RecRow({ rec, onAction }) {
  const [acting, setActing] = useState(false);
  const [open, setOpen]     = useState(false);
  const u = URGENCY[rec.urgency_level] || URGENCY.medium;
  const Icon = u.icon;
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.border}`,
      borderLeft: `4px solid ${rec.is_actioned ? T.border : u.color}`,
      borderRadius: 12, marginBottom: 8, overflow: 'hidden',
      opacity: rec.is_actioned ? 0.6 : 1, boxShadow: '0 1px 3px rgba(0,0,0,.04)',
    }}>
      <div style={{ padding:'12px 16px', display:'flex', gap:12, alignItems:'center', cursor:'pointer' }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ background:u.bg, borderRadius:8, padding:7, flexShrink:0 }}>
          <Icon size={13} color={u.color} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:2 }}>
            <Badge color={u.color} small>{u.label}</Badge>
            {rec.unit_name && <span style={{ fontSize:10, color:T.dim }}>{rec.unit_name}</span>}
          </div>
          <div style={{ fontSize:13, color:T.text, fontWeight:500, lineHeight:1.4,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace: open ? 'normal' : 'nowrap' }}>
            {rec.recommendation_text}
          </div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
          {rec.confidence_score != null && (
            <span style={{ fontSize:11, fontWeight:700, color:scoreColor(rec.confidence_score) }}>
              {Math.round(rec.confidence_score)}%
            </span>
          )}
          <span style={{ fontSize:10, color:T.muted }}>{ago(rec.timestamp)}</span>
          {open ? <ChevronUp size={13} color={T.muted} /> : <ChevronDown size={13} color={T.muted} />}
        </div>
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${T.border}`, padding:'12px 16px', background:T.raised }}>
          {rec.probable_cause && (
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Cause probable</div>
              <p style={{ fontSize:12, color:T.dim, margin:0, lineHeight:1.6 }}>{rec.probable_cause}</p>
            </div>
          )}
          <div style={{ fontSize:13, color:T.text, lineHeight:1.65, marginBottom:12 }}>{rec.recommendation_text}</div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            {rec.is_actioned
              ? <span style={{ fontSize:11, color:T.green, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                  <Check size={11} /> Traité
                </span>
              : <button
                  onClick={async (e) => { e.stopPropagation(); setActing(true); try { await onAction(rec.id); } finally { setActing(false); } }}
                  disabled={acting}
                  style={{ padding:'7px 18px', borderRadius:8, border:'none', background:u.color, color:'#fff',
                    fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6,
                    opacity:acting ? 0.6 : 1, transition:'opacity .2s' }}>
                  {acting ? 'Traitement…' : <><CheckCircle2 size={12} /> Marquer traité</>}
                </button>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── AlertRow ──────────────────────────────────────────────────────── */
function AlertRow({ alert, onResolve }) {
  const [resolving, setResolving] = useState(false);
  const sevColor = { critical: T.red, warning: T.amber, info: T.sky }[alert.severity] || T.muted;
  const sevBg    = { critical: '#fef2f2', warning: '#fffbeb', info: '#f0f9ff' }[alert.severity] || T.raised;
  const Icon     = ALERT_ICONS[alert.alert_type] || ALERT_ICONS.default;
  return (
    <div style={{ display:'flex', gap:12, alignItems:'flex-start',
      padding:'14px 16px', background:T.white, border:`1px solid ${T.border}`,
      borderLeft:`4px solid ${alert.is_resolved ? T.border : sevColor}`,
      borderRadius:12, marginBottom:8, opacity:alert.is_resolved ? 0.55 : 1,
      boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
      <div style={{ background:sevBg, borderRadius:8, padding:8, flexShrink:0, marginTop:1 }}>
        <Icon size={13} color={sevColor} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:5, flexWrap:'wrap' }}>
          <Badge color={sevColor} small>{alert.severity}</Badge>
          <span style={{ fontSize:10, color:T.dim, background:T.raised, padding:'1px 7px', borderRadius:6, border:`1px solid ${T.border}` }}>
            {alert.alert_type?.replace(/_/g,' ')}
          </span>
          <span style={{ fontSize:10, color:T.muted, marginLeft:'auto' }}>{ago(alert.timestamp)}</span>
        </div>
        <div style={{ fontSize:13, color:T.text, lineHeight:1.5, marginBottom:8 }}>{alert.message}</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:10, color:T.muted }}>
            {alert.farm_name}{alert.unit_name && ` · ${alert.unit_name}`}
          </span>
          {!alert.is_resolved
            ? <button onClick={async () => { setResolving(true); try { await onResolve(alert.id); } finally { setResolving(false); } }}
                disabled={resolving}
                style={{ padding:'5px 14px', borderRadius:8, border:`1px solid ${T.green}30`,
                  background:'#ecfdf5', color:T.green, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                {resolving ? '…' : '✓ Résoudre'}
              </button>
            : <span style={{ fontSize:10, color:T.green, fontWeight:600 }}>✓ Résolu</span>}
        </div>
      </div>
    </div>
  );
}

/* ── Domain Card ───────────────────────────────────────────────────── */
function DomainCard({ icon: Icon, color, title, sub, image, metrics }) {
  const { t } = useTranslation();
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:C.surface, borderRadius:R, padding:'22px',
        border:`1px solid ${hov?color+'30':C.border}`,
        boxShadow: hov?`0 8px 24px ${color}0d`:'0 1px 3px rgba(0,0,0,.04)',
        transform: hov?'translateY(-2px)':'none', transition:'all .2s',
        display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <div style={{ background:`${color}12`, borderRadius:8, padding:8 }}><Icon size={14} color={color}/></div>
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
        <Download size={11}/> {t("common.download_pdf", "Télécharger PDF")}
      </button>
    </div>
  );
}

/* ── LiveView ──────────────────────────────────────────────────────── */
function LiveView({ stats, analytics, alerts, anomalies, recs, agro, cvStats }) {
  const { t } = useTranslation();
  const unresolved = alerts.filter(a => !a.is_resolved);
  const alertPie = Object.entries(
    alerts.reduce((acc, a) => { acc[a.alert_type||'autre'] = (acc[a.alert_type||'autre']||0)+1; return acc; }, {})
  ).slice(0, 5).map(([name, value], i) => ({
    name: name.replace(/_/g,' '), value,
    fill: [C.danger, C.warn, C.accent, '#8b5cf6', C.ok][i],
  }));

  // ── Synthèse exécutive — KPIs dérivés des données réelles ──
  const _now = Date.now();
  const anomalies7d = anomalies.filter(a => a.timestamp && (_now - new Date(a.timestamp).getTime()) < 7 * 864e5).length;
  const criticalRecs = recs.filter(r => ['critical', 'high'].includes(r.urgency_level)).length;
  const hSeries = analytics.map(d => d['santé']).filter(v => typeof v === 'number');
  const healthDelta = hSeries.length >= 2 ? Math.round(hSeries[hSeries.length - 1] - hSeries[0]) : null;
  const summary = [
    { label: t('reports.kpi_health', 'Score santé'),     value: `${stats.health}%`,      color: statusColor(stats.health),       delta: healthDelta, deltaGood: (healthDelta || 0) >= 0, icon: Heart },
    { label: t('reports.kpi_animals', 'Unités animales'), value: fmt(stats.animals),       color: C.warn,                            icon: Activity },
    { label: t('reports.kpi_open_alerts', 'Alertes ouvertes'), value: unresolved.length,   color: unresolved.length ? C.danger : C.ok, icon: Bell },
    { label: t('reports.kpi_anomalies7', 'Anomalies (7j)'), value: anomalies7d,            color: anomalies7d ? C.warn : C.ok,       icon: AlertTriangle },
    { label: t('reports.kpi_prio_recs', 'Recos prioritaires'), value: criticalRecs,        color: criticalRecs ? C.danger : C.ok,    icon: Lightbulb },
  ];

  // ── Sécurité — score réel dérivé des alertes ouvertes + anomalies récentes ──
  const anomalies24h  = anomalies.filter(a => a.timestamp && (_now - new Date(a.timestamp).getTime()) < 864e5).length;
  const cvDetections  = cvStats?.disease_alerts_7d ?? cvStats?.total_detections ?? null;
  const securityScore = Math.max(0, Math.min(100, 100 - unresolved.length * 8 - anomalies24h * 5));

  return (
    <div className="rp-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ height:200, borderRadius:R, overflow:'hidden', position:'relative', boxShadow:'0 2px 12px rgba(0,0,0,.08)' }}>
        <img src={IMG_HEADER} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="header"/>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right,rgba(15,23,42,.7) 0%,transparent 55%)' }}/>
        <div style={{ position:'absolute', bottom:24, left:28, color:'#fff' }}>
          <h2 style={{ fontSize:20, fontWeight:800, margin:'0 0 4px', letterSpacing:-.2 }}>
            {t("reports.hero", "Rapport Intégré Smart Farm")}
          </h2>
          <p style={{ margin:0, fontSize:12, opacity:.75 }}>Analyse complète · {new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <div style={{ position:'absolute', top:16, right:18, background:'rgba(15,23,42,.55)',
          backdropFilter:'blur(8px)', padding:'5px 12px', borderRadius:99,
          border:'1px solid rgba(255,255,255,.15)', color:'#fff', display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:C.ok, display:'inline-block', animation:'pulse 2s infinite' }}/>
          Système opérationnel
        </div>
      </div>

      {/* ── Synthèse exécutive (KPIs réels + tendance) ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
        {summary.map(k => (
          <div key={k.label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:R, padding:'16px 18px', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:10.5, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.5 }}>{k.label}</span>
              <k.icon size={15} color={k.color}/>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
              <span style={{ fontSize:26, fontWeight:900, color:C.text, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{k.value}</span>
              {k.delta != null && (
                <span style={{ display:'inline-flex', alignItems:'center', gap:2, fontSize:11, fontWeight:800, color:k.deltaGood?C.ok:C.danger }}>
                  {k.deltaGood ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}{k.delta>0?'+':''}{k.delta}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {analytics.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:16 }}>
          <div style={{ background:C.surface, borderRadius:R, padding:'22px 24px', border:`1px solid ${C.border}`, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
            <SectionTitle sub="Score santé & alertes quotidiennes">Tendance 14 jours</SectionTitle>
            <ResponsiveContainer width="100%" height={155}>
              <LineChart data={analytics} margin={{ left:-24, right:8, top:4, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="day" tick={{ fill:C.muted, fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:C.muted, fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, fontSize:11, boxShadow:'0 4px 12px rgba(0,0,0,.08)' }} labelStyle={{ color:C.text, fontWeight:700 }}/>
                <Line type="monotone" dataKey="santé"   stroke={C.ok}     strokeWidth={2} dot={false} name="Score santé"/>
                <Line type="monotone" dataKey="alertes" stroke={C.danger} strokeWidth={1.5} dot={false} strokeDasharray="4 3" name="Alertes"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ background:C.surface, borderRadius:R, padding:'18px 20px', border:`1px solid ${C.border}`, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
              <div style={{ fontSize:11, fontWeight:600, color:C.muted, marginBottom:12 }}>Score santé global</div>
              <div style={{ textAlign:'center', marginBottom:12 }}>
                <div style={{ fontSize:44, fontWeight:900, color:statusColor(stats.health), lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{stats.health}%</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
                  {stats.health>=80?'Excellent':stats.health>=60?'Acceptable':'À surveiller'}
                </div>
              </div>
              <Bar value={stats.health} color={statusColor(stats.health)}/>
            </div>
            {alertPie.length > 0 && (
              <div style={{ background:C.surface, borderRadius:R, padding:'16px 18px', border:`1px solid ${C.border}`, boxShadow:'0 1px 3px rgba(0,0,0,.04)', flex:1 }}>
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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        <DomainCard icon={Activity} color={C.warn} title="Rapport Zootechnique" sub="Analyse temps réel" image={IMG_ANIMALS}
          metrics={[
            { label:'Unités animales',      value:fmt(stats.animals),   color:C.warn, pct:null },
            { label:'Score santé moyen',    value:fmtPct(stats.health), color:statusColor(stats.health), pct:stats.health },
            { label:'Alertes non résolues', value:unresolved.length,    color:unresolved.length>0?C.danger:C.ok, pct:null },
          ]}/>
        <DomainCard icon={Sprout} color={C.ok} title="Rapport Agronomique" sub="Verger & santé des arbres" image={IMG_PLANTS}
          metrics={[
            { label:'Arbres suivis',      value:fmt(agro?.total ?? 0),                       color:C.ok,                                       pct:null },
            { label:'Arbres sains',       value:`${agro?.healthyPct ?? 0}%`,                 color:statusColor(agro?.healthyPct ?? 0),         pct:agro?.healthyPct ?? 0 },
            { label:'Maladies détectées', value:fmt((agro?.diseased ?? 0) + (agro?.watch ?? 0)), color:(agro?.diseased ?? 0) > 0 ? C.danger : C.ok, pct:null },
          ]}/>
        <div style={{ background:C.dark, borderRadius:R, padding:'22px', border:`1px solid ${C.darkBdr}`, boxShadow:'0 2px 12px rgba(0,0,0,.12)', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <div style={{ background:'rgba(251,191,36,.15)', borderRadius:8, padding:7 }}>
              <Shield size={14} color="#fbbf24"/>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#f1f5f9' }}>Sécurité & Infrastructure</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.35)' }}>Périmètre · IoT · Caméras</div>
            </div>
          </div>
          <div style={{ background:C.darkSurf, borderRadius:R-2, padding:'16px', marginBottom:14, textAlign:'center' }}>
            <div style={{ fontSize:40, fontWeight:900, lineHeight:1, color: securityScore>=80?'#4ade80':securityScore>=50?'#fbbf24':'#f87171' }}>{securityScore}%</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:4 }}>Score sécurité · alertes + anomalies</div>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
            {[
              { l:`${unresolved.length} alertes ouvertes`, c: unresolved.length?'#f87171':'#4ade80', bg: unresolved.length?'rgba(248,113,113,.12)':'rgba(74,222,128,.12)' },
              { l:`${anomalies7d} anomalies 7j`,           c: anomalies7d?'#fbbf24':'#4ade80',         bg: anomalies7d?'rgba(251,191,36,.12)':'rgba(74,222,128,.12)' },
              ...(cvDetections != null ? [{ l:`${cvDetections} détections IA`, c:'#60a5fa', bg:'rgba(96,165,250,.12)' }] : []),
            ].map(p => <span key={p.l} style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, padding:'3px 10px', borderRadius:99, background:p.bg, color:p.c }}>{p.l}</span>)}
          </div>
          <div style={{ background:C.darkSurf, borderRadius:R-2, padding:'10px 14px', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,.5)' }}>Anomalies 24h</span>
            <span style={{ fontSize:16, fontWeight:800, color: anomalies.length>0?'#fbbf24':'#4ade80' }}>{anomalies.length}</span>
          </div>
          {anomalies.slice(0,2).map(a => (
            <div key={a.id} style={{ borderLeft:`2px solid #fbbf24`, paddingLeft:10, marginBottom:8 }}>
              <div style={{ fontSize:11, color:'#e2e8f0', fontWeight:600 }}>{a.anomaly_type}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.35)' }}>{a.description?.slice(0,55)}…</div>
            </div>
          ))}
          <div style={{ marginTop:'auto', paddingTop:14, borderTop:`1px solid ${C.darkBdr}`, fontSize:11, color:'rgba(255,255,255,.35)', display:'flex', alignItems:'center', gap:6 }}>
            <BarChart3 size={12} color="#fbbf24"/>
            Dernière anomalie : <strong style={{color:'#f1f5f9'}}>{anomalies[0] ? new Date(anomalies[0].timestamp).toLocaleDateString('fr-FR') : 'Aucune'}</strong>
          </div>
        </div>
      </div>
      {recs.length > 0 && (
        <div style={{ background:C.surface, borderRadius:R, padding:'20px 22px', border:`1px solid ${C.border}`, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
          <SectionTitle sub={`${recs.length} recommandation${recs.length>1?'s':''} actives`}>Recommandations IA</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
            {recs.slice(0, 6).map(r => {
              const uc = r.urgency_level==='critical'?C.danger:r.urgency_level==='high'?C.warn:C.accent;
              return (
                <div key={r.id} style={{ background:C.subtle, borderRadius:R-2, padding:'12px 14px',
                  borderLeft:`3px solid ${uc}`, border:`1px solid ${C.border}`, borderLeftWidth:3 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:uc, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>{r.urgency_level||'info'}</div>
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

/* ── ArchiveView ───────────────────────────────────────────────────── */
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
        <div style={{ background:C.surface, borderRadius:R, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 110px 180px 80px 100px', gap:12,
            padding:'11px 20px', background:C.subtle, borderBottom:`1px solid ${C.border}` }}>
            {['Rapport','Type','Période','Score','Actions'].map(h => (
              <span key={h} style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.7 }}>{h}</span>
            ))}
          </div>
          {reports.map((r) => {
            const score = r.summary?.avg_health_score || r.summary?.avg_health || 0;
            const isExp = expanded === r.id;
            return (
              <React.Fragment key={r.id}>
                <div onClick={() => setExpanded(isExp ? null : r.id)}
                  style={{ display:'grid', gridTemplateColumns:'1fr 110px 180px 80px 100px', gap:12,
                    padding:'13px 20px', borderBottom:`1px solid ${C.border}`,
                    alignItems:'center', cursor:'pointer', transition:'background .1s',
                    background: isExp ? C.accentLt : 'transparent' }}
                  onMouseEnter={e => !isExp && (e.currentTarget.style.background = C.subtle)}
                  onMouseLeave={e => !isExp && (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                    {r.summary?.ai_insight && <Sparkles size={11} color={C.accent}/>}
                    <span style={{ fontSize:13, fontWeight:600, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</span>
                  </div>
                  <Badge color={TYPE_COLOR[r.report_type]||C.muted}>{r.report_type}</Badge>
                  <span style={{ fontSize:11, color:C.dim, display:'flex', alignItems:'center', gap:4 }}>
                    <Calendar size={9}/>
                    {new Date(r.period_start).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})} →{' '}
                    {new Date(r.period_end).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}
                  </span>
                  <span style={{ fontSize:16, fontWeight:900, color:statusColor(score), fontVariantNumeric:'tabular-nums' }}>{score}%</span>
                  <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => onView(r)} style={btn('outline')}><Eye size={10}/> Voir</button>
                    <button onClick={() => setExpanded(isExp?null:r.id)} style={{ ...btn('outline'), padding:'7px 8px' }}>
                      {isExp ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
                    </button>
                  </div>
                </div>
                {isExp && (
                  <div style={{ padding:'14px 20px 16px 44px', background:C.accentLt, borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ borderLeft:`3px solid ${C.accent}`, paddingLeft:14 }}>
                      <span style={{ fontSize:9, fontWeight:700, color:C.accent, textTransform:'uppercase', letterSpacing:.6, display:'block', marginBottom:6 }}>Analyse IA stratégique</span>
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

/* ══════════════════════════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════════════════════════ */
export default function Reports() {
  const { t } = useTranslation();
  const { farmId, farms: authFarms } = useAuth();

  const [mainTab, setMainTab] = useState('reports');

  /* shared */
  const [loading, setLoading]     = useState(true);
  const [recs, setRecs]           = useState([]);
  const [alerts, setAlerts]       = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [dashStats, setDashStats] = useState(null);

  /* reports-specific */
  const [generating, setGenerating]         = useState(false);
  const [genType, setGenType]               = useState(null);
  const [pdfLoading, setPdfLoading]         = useState(false);
  const [view, setView]                     = useState('live');
  const [selectedReport, setSelectedReport] = useState(null);
  const [stats, setStats]         = useState({ animals: 0, health: 0, alerts: 0 });
  const [agro, setAgro]           = useState(null);   // verger réel (orchardAPI.trees)
  const [cvStats, setCvStats]     = useState(null);   // détections IA (cvAPI.plantStats)
  const [analytics, setAnalytics] = useState([]);
  const [reports, setReports]     = useState([]);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveSort, setArchiveSort]     = useState('date_desc');

  /* ai-specific */
  const [recTab, setRecTab]               = useState('ai');
  const [aiResult, setAiResult]           = useState(null);
  const [aiLoading, setAiLoading]         = useState(false);
  const [selectedFarm, setFarm]           = useState(farmId || null);
  const [selectedPlant, setPlant]         = useState('Herbe');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [showResolved, setShowResolved]   = useState(false);
  const [wsStatus, setWsStatus]           = useState('connecting');
  const [recSearch, setRecSearch]         = useState('');
  const pollRef = useRef(null);

  useEffect(() => { if (farmId) setFarm(farmId); }, [farmId]);

  /* ── unified data load ── */
  const loadAll = useCallback(async () => {
    const fid = selectedFarm || farmId;
    if (!fid) return;
    setLoading(true);
    try {
      const [rRes, sRes, aRes, alRes, anRes, rcRes, orRes, cvRes] = await Promise.allSettled([
        reportsAPI.list(fid),
        dashboardAPI.stats(fid),
        dashboardAPI.analytics(30, fid),
        alertsAPI.list(fid),
        anomalyAPI.recent(50, fid),
        recsAPI.list(showResolved, fid),
        orchardAPI.trees(fid),
        cvAPI.plantStats(),
      ]);
      if (rRes.status  === 'fulfilled') setReports(rRes.value.data || []);
      if (alRes.status === 'fulfilled') setAlerts(alRes.value.data || []);
      if (anRes.status === 'fulfilled') setAnomalies(anRes.value.data || []);
      if (rcRes.status === 'fulfilled') setRecs(rcRes.value.data || []);
      if (cvRes.status === 'fulfilled') setCvStats(cvRes.value.data || null);
      if (orRes.status === 'fulfilled') {
        const trees = Array.isArray(orRes.value.data) ? orRes.value.data : [];
        const cnt = (k) => trees.filter(t => t.status === k).length;
        const total = trees.length;
        const healthy = cnt('healthy');
        setAgro({
          total, healthy, diseased: cnt('diseased'), treated: cnt('treated'), watch: cnt('watch'),
          healthyPct: total ? Math.round((healthy / total) * 100) : 0,
        });
      }
      if (sRes.status  === 'fulfilled') {
        const s = sRes.value.data;
        setDashStats(s);
        setStats({ animals: s.total_units ?? 0, health: s.avg_health_score ?? 0, alerts: s.active_alerts ?? 0 });
      }
      if (aRes.status === 'fulfilled') {
        const raw = aRes.value.data;
        const arr = Array.isArray(raw) ? raw : (raw?.daily_trends || []);
        setAnalytics(arr.slice(-14).map((d, i) => ({
          day: d.date ? new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : `J${i + 1}`,
          santé:   Math.round(d.avg_health ?? d.health_score ?? 0),
          alertes: d.alert_count ?? d.alerts ?? 0,
        })));
      }
    } catch {}
    finally { setLoading(false); }
  }, [farmId, selectedFarm, showResolved]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    pollRef.current = setInterval(loadAll, 30_000);
    return () => clearInterval(pollRef.current);
  }, [loadAll]);

  /* WebSocket */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setWsStatus('disconnected'); return; }
    let ws, timer;
    const connect = () => {
      setWsStatus('connecting');
      try {
        ws = new WebSocket(`${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/events?token=${token}`);
        ws.onopen    = () => setWsStatus('connected');
        ws.onmessage = e => { try { const m = JSON.parse(e.data); if (['recommendation','alert','anomaly'].includes(m.type)) loadAll(); } catch {} };
        ws.onerror   = () => setWsStatus('disconnected');
        ws.onclose   = () => { setWsStatus('disconnected'); timer = setTimeout(connect, 5000); };
      } catch { setWsStatus('disconnected'); }
    };
    connect();
    return () => { clearTimeout(timer); ws?.close(); };
  }, []);

  /* AI generation */
  const generateAI = async () => {
    if (!selectedFarm) return;
    setAiLoading(true); setAiResult(null);
    try {
      const { data } = await recsAPI.generate(
        selectedFarm,
        selectedPlant.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      );
      setAiResult(data);
    } catch {}
    finally { setAiLoading(false); }
  };
  useEffect(() => { if (selectedFarm) generateAI(); }, [selectedFarm]);

  /* Reports actions */
  const handleGenerate = async (type) => {
    setGenerating(true); setGenType(type);
    try {
      await reportsAPI.generateIntelligent(type, farmId);
      const res = await reportsAPI.list(farmId);
      setReports(res.data); setView('archive');
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

  /* AI/Recs actions */
  const handleRecAction = async (id) => {
    await recsAPI.action(id);
    setRecs(p => p.map(r => r.id === id ? { ...r, is_actioned: true } : r));
  };
  const handleResolve = async (id) => {
    await alertsAPI.resolve(id, 'owner');
    setAlerts(p => p.map(a => a.id === id ? { ...a, is_resolved: true } : a));
  };
  const handleExport = () => {
    const unresolvedAlerts = alerts.filter(a => !a.is_resolved);
    const b = new Blob([JSON.stringify({ recs, alerts: unresolvedAlerts, ai: aiResult, ts: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `recs_${Date.now()}.json`; a.click();
  };

  /* derived */
  const unresolved = alerts.filter(a => !a.is_resolved);
  const critical   = alerts.filter(a => a.severity === 'critical' && !a.is_resolved);

  const filteredReports = reports
    .filter(r => !archiveSearch || r.title?.toLowerCase().includes(archiveSearch.toLowerCase()) || r.report_type?.includes(archiveSearch))
    .sort((a, b) => {
      if (archiveSort === 'date_desc') return new Date(b.period_end) - new Date(a.period_end);
      if (archiveSort === 'date_asc')  return new Date(a.period_end) - new Date(b.period_end);
      return (b.summary?.avg_health_score||0) - (a.summary?.avg_health_score||0);
    });

  const filteredRecs = recs.filter(r => {
    if (!showResolved && r.is_actioned) return false;
    if (urgencyFilter !== 'all' && r.urgency_level !== urgencyFilter) return false;
    if (recSearch) return (r.recommendation_text + (r.probable_cause || '') + (r.unit_name || '')).toLowerCase().includes(recSearch.toLowerCase());
    return true;
  });
  const filteredAlerts = (showResolved ? alerts : unresolved).filter(a =>
    !recSearch || a.message?.toLowerCase().includes(recSearch.toLowerCase())
  );
  const alertTypeData = Object.entries(
    alerts.reduce((acc, a) => { acc[a.alert_type] = (acc[a.alert_type] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

  const GEN_BTNS = [
    { type:'animals', label:'Rapport Animaux',   icon:Activity },
    { type:'plants',  label:'Rapport Plantes',   icon:Leaf     },
    { type:'general', label:'Rapport Global IA', icon:Sparkles, primary:true },
  ];
  const AI_TABS = [
    { id:'ai',        label:'IA Souveraine',   count: aiResult?.recommendations?.length,       color: T.purple },
    { id:'db',        label:'Recommandations', count: recs.filter(r=>!r.is_actioned).length,    color: T.indigo },
    { id:'alerts',    label:'Alertes',         count: unresolved.length,                        color: T.red    },
    { id:'anomalies', label:'Anomalies',       count: anomalies.length,                         color: T.amber  },
    { id:'analyse',   label:'Analyse',         count: null,                                     color: T.green  },
  ];
  const FEATURES = [
    { icon: Sparkles,   color: T.purple, title: 'IA Souveraine',      desc: 'RAG UTAP/AVFA · Ollama · Open-Meteo — analyses sans cloud externe' },
    { icon: Bell,       color: T.red,    title: 'Alertes Temps-Réel', desc: 'WebSocket live · détection incendie · santé animale · seuils IoT' },
    { icon: TrendingUp, color: T.green,  title: 'Analyse Prédictive', desc: 'Isolation Forest · scores de confiance · distribution urgences' },
  ];

  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden',
      background:C.page, fontFamily:"'Inter', system-ui, sans-serif" }}>

      {/* Navbar */}
      <Navbar
        title={mainTab === 'reports' ? t("reports.title", "Rapports Intelligents") : t("recs.title", "Intelligence Agronomique")}
        subtitle={mainTab === 'reports' ? "Analyse stratégique · Export · IA Souveraine" : "Recommandations · Alertes · Anomalies"}
        actions={mainTab === 'reports' ? (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={downloadPDF} disabled={pdfLoading} style={btn('ghost')}>
              {pdfLoading ? <RefreshCw size={12} style={{animation:'spin .8s linear infinite'}}/> : <Printer size={12}/>} {t("common.pdf","PDF")}
            </button>
            <button onClick={downloadExcel} style={btn('ghost-green')}><Download size={12}/> {t("common.excel","Excel")}</button>
          </div>
        ) : (
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <LiveDot status={wsStatus} />
            <button onClick={loadAll} style={{ padding:'7px 10px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:9, color:T.dim, cursor:'pointer', display:'flex' }}>
              <RefreshCw size={13} />
            </button>
            <button onClick={handleExport} style={{ padding:'7px 14px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:9, color:T.dim, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600 }}>
              <Download size={12} /> Export
            </button>
          </div>
        )}
      />

      {/* Top-level tab bar */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, background:C.surface, padding:'0 36px', flexShrink:0 }}>
        {[{id:'reports',label:'Rapports',icon:FileText},{id:'ai',label:'Conseils IA',icon:Brain}].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setMainTab(id)}
            style={{
              display:'flex', alignItems:'center', gap:7,
              padding:'13px 20px', background:'none', border:'none',
              borderBottom: mainTab===id ? `2px solid ${C.accent}` : '2px solid transparent',
              marginBottom:-1, cursor:'pointer',
              fontSize:13, fontWeight: mainTab===id ? 700 : 500,
              color: mainTab===id ? C.accent : C.dim,
              transition:'all .15s', outline:'none',
            }}>
            <Icon size={14}/> {label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: RAPPORTS ═══════════════════════════════════════════════ */}
      {mainTab === 'reports' && (
        <div id="report-print-area" style={{ flex:1, overflowY:'auto', overscrollBehaviorY:'contain' }}>
          {/* Hero banner */}
          <div style={{ position:'relative', overflow:'hidden', borderBottom:`1px solid ${C.border}`, minHeight:120 }}>
            <img src={reportsHeroImg} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', pointerEvents:'none' }}/>
            <div style={{ position:'absolute', inset:0, pointerEvents:'none', background:'linear-gradient(120deg, rgba(8,30,50,.82) 0%, rgba(15,50,80,.68) 55%, rgba(20,70,100,.35) 100%)' }}/>
            <div style={{ position:'relative', zIndex:2, padding:'28px 36px 24px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:24, flexWrap:'wrap' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <div style={{ background:'rgba(255,255,255,.18)', backdropFilter:'blur(6px)', borderRadius:8, padding:7, border:'1px solid rgba(255,255,255,.25)' }}>
                      <BrainCircuit size={15} color="#fff"/>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.8)', textTransform:'uppercase', letterSpacing:.7 }}>AI Reporting Engine</span>
                  </div>
                  <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px', letterSpacing:-.3, textShadow:'0 2px 10px rgba(0,0,0,.3)' }}>
                    {t("reports.hero","Rapport Intégré Smart Farm")}
                  </h1>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,.65)', margin:0 }}>
                    {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
                    {' · '}Ollama · RAG UTAP/AVFA · Open-Meteo
                  </p>
                </div>
                <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ display:'flex', background:'rgba(255,255,255,.15)', backdropFilter:'blur(8px)', borderRadius:10, padding:4, border:'1px solid rgba(255,255,255,.25)', gap:3 }}>
                    {[{id:'live',label:'Live',icon:Zap},{id:'archive',label:'Archives',icon:Database}].map(({ id, label, icon: Icon }) => (
                      <button key={id} onClick={() => setView(id)}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'none',
                          background: view===id ? 'rgba(255,255,255,.25)' : 'transparent', color:'#fff',
                          fontSize:12, fontWeight: view===id?700:500, cursor:'pointer', transition:'all .15s',
                          boxShadow: view===id ? '0 1px 3px rgba(0,0,0,.15)' : 'none' }}>
                        <Icon size={12}/> {label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    {GEN_BTNS.map(({ type, label, icon: Icon, primary }) => (
                      <button key={type} onClick={() => handleGenerate(type)} disabled={generating} style={primary ? btn('accent') : btn('outline')}>
                        {generating && genType === type ? <RefreshCw size={12} style={{animation:'spin .8s linear infinite'}}/> : <Icon size={12}/>}
                        {generating && genType === type ? 'Génération…' : label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KPI row */}
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

          <div style={{ padding:'28px 36px' }}>
            {view === 'live'
              ? <LiveView stats={stats} analytics={analytics} alerts={alerts} anomalies={anomalies} recs={recs} agro={agro} cvStats={cvStats}/>
              : <ArchiveView reports={filteredReports} loading={loading}
                  search={archiveSearch} onSearch={setArchiveSearch}
                  sort={archiveSort} onSort={setArchiveSort}
                  onView={setSelectedReport}/>}
          </div>

          <footer style={{ borderTop:`1px solid ${C.border}`, padding:'14px 36px', display:'flex', justifyContent:'space-between', alignItems:'center', background:C.surface }}>
            <span style={{ fontSize:11, color:C.muted }}>Smart Farm AI · Ollama · RAG UTAP/AVFA · Open-Meteo</span>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={downloadPDF} style={btn('ghost')}><Printer size={11}/> {t("common.pdf","PDF")}</button>
              <button onClick={downloadExcel} style={btn('ghost-green')}><Download size={11}/> {t("common.excel","Excel")}</button>
            </div>
          </footer>
        </div>
      )}

      {/* ═══ TAB: CONSEILS IA ════════════════════════════════════════════ */}
      {mainTab === 'ai' && (
        <div style={{ flex:1, overflowY:'auto', overscrollBehaviorY:'contain' }}>

          {/* Hero */}
          <div style={{ background:'linear-gradient(135deg, #3730a3 0%, #4f46e5 45%, #7c3aed 100%)', padding:'36px 32px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-80, right:-60, width:260, height:260, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />
            <div style={{ position:'absolute', bottom:-60, left:'35%', width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }} />
            <div style={{ position:'relative', zIndex:2, display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:32, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:280 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <div style={{ background:'rgba(255,255,255,.15)', borderRadius:99, padding:'5px 13px', display:'flex', alignItems:'center', gap:6, border:'1px solid rgba(255,255,255,.2)' }}>
                    <Sparkles size={11} color="#fff" />
                    <span style={{ fontSize:10, color:'#fff', fontWeight:800, letterSpacing:0.8, textTransform:'uppercase' }}>IA Souveraine</span>
                  </div>
                  <LiveDot status={wsStatus} light />
                </div>
                <h1 style={{ fontSize:30, fontWeight:900, color:'#fff', margin:'0 0 10px', letterSpacing:-.5, lineHeight:1.2 }}>Intelligence Agronomique</h1>
                <p style={{ fontSize:14, color:'rgba(255,255,255,.72)', maxWidth:460, lineHeight:1.75, margin:'0 0 24px' }}>
                  Recommandations IA temps-réel, alertes intelligentes et analyse prédictive pour optimiser chaque décision de votre exploitation agricole.
                </p>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  <button onClick={generateAI} disabled={aiLoading || !selectedFarm}
                    style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 22px', borderRadius:10, border:'none',
                      background:'rgba(255,255,255,.95)', color:T.indigo, fontSize:13, fontWeight:700,
                      cursor: aiLoading || !selectedFarm ? 'not-allowed' : 'pointer',
                      boxShadow:'0 4px 14px rgba(0,0,0,.22)', opacity: aiLoading || !selectedFarm ? 0.65 : 1, transition:'all .2s' }}>
                    {aiLoading ? <><RefreshCw size={13} style={{animation:'spin .8s linear infinite'}}/> Analyse en cours…</> : <><Play size={13} /> Analyser la Ferme</>}
                  </button>
                  <button onClick={loadAll}
                    style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 22px', borderRadius:10,
                      border:'1px solid rgba(255,255,255,.3)', background:'rgba(255,255,255,.1)',
                      color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all .2s' }}>
                    <RefreshCw size={13} /> Actualiser
                  </button>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10, minWidth:200 }}>
                <div style={{ background:'rgba(255,255,255,.12)', borderRadius:14, padding:'14px 16px', border:'1px solid rgba(255,255,255,.18)' }}>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.7, marginBottom:7, display:'flex', alignItems:'center', gap:4 }}>
                    <Building2 size={10} /> Exploitation
                  </div>
                  <select value={selectedFarm || ''} onChange={e => setFarm(+e.target.value)}
                    style={{ width:'100%', padding:'7px 10px', background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.25)', borderRadius:8, color:'#fff', fontSize:13, cursor:'pointer', outline:'none' }}>
                    {authFarms.map(f => <option key={f.id} value={f.id} style={{background:'#3730a3'}}>{f.name}</option>)}
                  </select>
                </div>
                {aiResult?.overall_status && (
                  <div style={{ background:'rgba(255,255,255,.12)', borderRadius:14, padding:'12px 16px', border:'1px solid rgba(255,255,255,.18)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background: aiResult.overall_status==='Nominal'?'#4ade80':T.amber }} />
                      <span style={{ fontSize:13, color:'#fff', fontWeight:700 }}>{aiResult.overall_status}</span>
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.55)' }}>{aiResult.recommendations?.length||0} analyse(s) · Ferme #{aiResult.farm_id}</div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ position:'relative', zIndex:2, display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginTop:28 }}>
              {FEATURES.map(({ icon: Icon, color, title, desc }) => (
                <div key={title} style={{ background:'rgba(255,255,255,.09)', borderRadius:14, padding:'14px 16px', border:'1px solid rgba(255,255,255,.14)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <div style={{ background:'rgba(255,255,255,.15)', borderRadius:8, padding:6 }}><Icon size={13} color="#fff" /></div>
                    <span style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{title}</span>
                  </div>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,.58)', margin:0, lineHeight:1.6 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* KPI bar */}
          <div style={{ padding:'24px 32px', borderBottom:`1px solid ${T.border}`, background:T.bg }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:12 }}>
              {[
                { label:'Recommandations IA', value: aiResult?.recommendations?.length ?? '—', color:T.purple, icon:Sparkles },
                { label:'Critiques',          value: critical.length, color: critical.length>0?T.red:T.muted, icon:AlertOctagon, pulse:critical.length>0 },
                { label:'Non résolues',       value: unresolved.length, color:T.amber, icon:AlertCircle },
                { label:'Traitées',           value: recs.filter(r=>r.is_actioned).length, color:T.green, icon:CheckCircle2 },
                { label:'Anomalies 24h',      value: anomalies.length, color:T.sky, icon:Activity },
                { label:'Score santé',        value: dashStats?.avg_health_score ?? '—', color:T.indigo, icon:Target },
              ].map(item => <KpiCard key={item.label} {...item} />)}
            </div>
          </div>

          {/* Main content */}
          <div style={{ padding:'24px 32px' }}>
            {/* Controls */}
            <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:20, flexWrap:'wrap' }}>
              <div style={{ position:'relative', flex:1, maxWidth:320 }}>
                <input value={recSearch} onChange={e => setRecSearch(e.target.value)} placeholder="Rechercher…"
                  style={{ width:'100%', padding:'9px 12px 9px 36px', background:T.white, border:`1px solid ${T.border}`, borderRadius:10, color:T.text, fontSize:13, outline:'none', boxSizing:'border-box', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }} />
                <Filter size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:T.muted, pointerEvents:'none' }} />
                {recSearch && <button onClick={() => setRecSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:T.muted }}><X size={11}/></button>}
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <Pill label="Tout" count={recs.length} active={urgencyFilter==='all'} color={T.indigo} onClick={() => setUrgencyFilter('all')} />
                {Object.entries(URGENCY).map(([k,v]) => (
                  <Pill key={k} label={v.dot+' '+v.label} count={recs.filter(r=>r.urgency_level===k).length} active={urgencyFilter===k} color={v.color} onClick={() => setUrgencyFilter(k)} />
                ))}
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:T.dim, cursor:'pointer', marginLeft:'auto', whiteSpace:'nowrap' }}>
                <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} style={{ accentColor:T.indigo }} />
                Afficher traités
              </label>
            </div>

            {/* Inner tabs */}
            <div style={{ display:'flex', gap:0, borderBottom:`2px solid ${T.border}`, marginBottom:20, overflowX:'auto' }}>
              {AI_TABS.map(tabItem => (
                <button key={tabItem.id} onClick={() => setRecTab(tabItem.id)}
                  style={{
                    padding:'10px 20px', background:'transparent', border:'none',
                    borderBottom: recTab===tabItem.id ? `2px solid ${tabItem.color}` : '2px solid transparent',
                    marginBottom:-2, cursor:'pointer', whiteSpace:'nowrap',
                    display:'flex', alignItems:'center', gap:7,
                    fontSize:13, fontWeight: recTab===tabItem.id ? 700 : 500,
                    color: recTab===tabItem.id ? tabItem.color : T.dim, transition:'all .15s', outline:'none',
                  }}>
                  {tabItem.label}
                  {tabItem.count != null && (
                    <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99,
                      background: recTab===tabItem.id ? `${tabItem.color}15` : T.raised,
                      color: recTab===tabItem.id ? tabItem.color : T.muted }}>
                      {tabItem.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Bento grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 268px', gap:20, alignItems:'start' }}>
              {/* Left: tab content */}
              <div style={{ minWidth:0 }}>
                {recTab==='ai' && (
                  <div>
                    {aiLoading && (
                      <div style={{ textAlign:'center', padding:'70px 0' }}>
                        <div style={{ width:52, height:52, borderRadius:'50%', background:`${T.purple}12`, display:'inline-flex', alignItems:'center', justifyContent:'center', animation:'livePulse 1.5s infinite', marginBottom:16 }}>
                          <Brain size={24} color={T.purple} />
                        </div>
                        <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:6 }}>Analyse souveraine en cours…</div>
                        <div style={{ fontSize:12, color:T.muted }}>RAG UTAP/AVFA · Météo Open-Meteo · Ollama Llava</div>
                      </div>
                    )}
                    {!aiLoading && !aiResult && (
                      <div style={{ textAlign:'center', padding:'70px 0', color:T.muted }}>
                        <Sparkles size={40} style={{ opacity:.2, marginBottom:14, color:T.purple }} />
                        <div style={{ fontSize:16, fontWeight:700, color:T.dim }}>Lancez l'analyse souveraine</div>
                        <div style={{ fontSize:13, marginTop:6 }}>Sélectionnez une culture et cliquez sur "Analyser"</div>
                      </div>
                    )}
                    {!aiLoading && aiResult && (
                      <div>
                        <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'13px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ width:8, height:8, borderRadius:'50%', background: aiResult.overall_status==='Nominal'?T.green:T.amber }} />
                            <span style={{ fontSize:14, fontWeight:700, color:T.text }}>{aiResult.overall_status}</span>
                          </div>
                          <span style={{ fontSize:12, color:T.muted }}>{aiResult.recommendations?.length||0} analyse(s) · Ferme #{aiResult.farm_id}</span>
                          {aiResult.output_derja && aiResult.output_derja!=='Khidma Ola' && (
                            <span style={{ fontSize:11, color:T.purple, display:'flex', alignItems:'center', gap:4 }}><MessageCircle size={11}/> Darija disponible</span>
                          )}
                        </div>
                        {aiResult.output_derja && aiResult.output_derja!=='Khidma Ola' && (
                          <div style={{ background:`${T.purple}08`, border:`1px solid ${T.purple}25`, borderRadius:12, padding:'14px 18px', marginBottom:16 }}>
                            <div style={{ fontSize:10, fontWeight:700, color:T.purple, textTransform:'uppercase', letterSpacing:0.7, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                              <MessageCircle size={11}/> ملخص بالدارجة التونسية
                            </div>
                            <div style={{ fontSize:14, color:T.text, lineHeight:1.8, direction:'rtl' }}>{aiResult.output_derja}</div>
                          </div>
                        )}
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:14 }}>
                          {aiResult.recommendations?.map((r,i) => <AiRecommendationCard key={i} rec={r}/>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {recTab==='db' && (
                  <div>
                    {loading && <div style={{ textAlign:'center', padding:60, color:T.muted }}>Chargement…</div>}
                    {!loading && filteredRecs.length===0 && (
                      <div style={{ textAlign:'center', padding:'70px 0', color:T.muted }}>
                        <Lightbulb size={40} style={{ opacity:.2, marginBottom:14 }}/>
                        <div style={{ fontSize:15, fontWeight:700, color:T.dim }}>Aucune recommandation</div>
                        <div style={{ fontSize:13, marginTop:6 }}>Les recommandations sont générées automatiquement par le monitoring</div>
                      </div>
                    )}
                    {filteredRecs.map(r => <RecRow key={r.id} rec={r} onAction={handleRecAction}/>)}
                  </div>
                )}

                {recTab==='alerts' && (
                  <div>
                    {alerts.length > 0 && (
                      <div style={{ display:'flex', gap:16, padding:'12px 16px', background:T.white, border:`1px solid ${T.border}`, borderRadius:12, marginBottom:16, flexWrap:'wrap', alignItems:'center', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                        <div style={{ display:'flex', height:6, flex:1, borderRadius:3, overflow:'hidden', minWidth:120 }}>
                          {[{s:'critical',c:T.red},{s:'warning',c:T.amber},{s:'info',c:T.sky}].map(({s,c})=>{
                            const n=alerts.filter(a=>a.severity===s).length;
                            const pct=n/alerts.length*100;
                            return pct>0&&<div key={s} style={{width:`${pct}%`,background:c}} title={`${s}: ${n}`}/>;
                          })}
                        </div>
                        {[{s:'critical',c:T.red,l:'Critique'},{s:'warning',c:T.amber,l:'Alerte'},{s:'info',c:T.sky,l:'Info'}].map(({s,c,l})=>{
                          const n=alerts.filter(a=>a.severity===s).length;
                          return n>0&&<span key={s} style={{fontSize:11,color:T.dim,display:'flex',alignItems:'center',gap:5}}>
                            <span style={{width:7,height:7,borderRadius:'50%',background:c}}/>{l}: <strong style={{color:T.text}}>{n}</strong>
                          </span>;
                        })}
                        <span style={{fontSize:11,color:T.muted,marginLeft:'auto'}}>{unresolved.length} non résolue(s)</span>
                      </div>
                    )}
                    {filteredAlerts.length===0
                      ? <div style={{textAlign:'center',padding:'60px 0',color:T.muted}}>
                          <CheckCircle2 size={40} color={T.green} style={{opacity:.35,marginBottom:12}}/>
                          <div style={{fontSize:14,fontWeight:600,color:T.dim}}>Aucune alerte active</div>
                        </div>
                      : filteredAlerts.map(a => <AlertRow key={a.id} alert={a} onResolve={handleResolve}/>)}
                  </div>
                )}

                {recTab==='anomalies' && (
                  <div>
                    {anomalies.length===0
                      ? <div style={{textAlign:'center',padding:'70px 0',color:T.muted}}>
                          <Shield size={40} color={T.green} style={{opacity:.3,marginBottom:14}}/>
                          <div style={{fontSize:15,fontWeight:700,color:T.dim}}>Aucune anomalie détectée</div>
                          <div style={{fontSize:13,marginTop:6}}>Le monitoring temps-réel est actif</div>
                        </div>
                      : anomalies.map(a => (
                          <div key={a.id} style={{ background:T.white, border:`1px solid ${T.border}`, borderLeft:`4px solid ${T.amber}`, borderRadius:12, padding:'13px 16px', marginBottom:8, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                              <Badge color={T.amber}>{a.anomaly_type}</Badge>
                              <span style={{fontSize:10,color:T.muted}}>{ago(a.timestamp)}</span>
                            </div>
                            <div style={{fontSize:13,color:T.text}}>{a.description}</div>
                            {a.isolation_score!=null && <div style={{fontSize:11,color:T.muted,marginTop:5}}>Score: <strong style={{color:T.amber}}>{(a.isolation_score*100).toFixed(1)}%</strong> · {a.severity}</div>}
                          </div>
                        ))}
                  </div>
                )}

                {recTab==='analyse' && (
                  <div>
                    {recs.length>0 && (
                      <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:14,padding:'20px 22px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
                        <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:0.6,marginBottom:12}}>Distribution urgences</div>
                        <div style={{display:'flex',height:10,borderRadius:5,overflow:'hidden',marginBottom:12}}>
                          {Object.entries(URGENCY).map(([k,v])=>{
                            const n=recs.filter(r=>r.urgency_level===k).length;
                            const pct=recs.length>0?(n/recs.length)*100:0;
                            return pct>0&&<div key={k} style={{width:`${pct}%`,background:v.color}} title={`${v.label}: ${n}`}/>;
                          })}
                        </div>
                        <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
                          {Object.entries(URGENCY).map(([k,v])=>{
                            const n=recs.filter(r=>r.urgency_level===k).length;
                            return <div key={k} style={{fontSize:12,color:T.dim,display:'flex',alignItems:'center',gap:7}}>
                              <span style={{width:8,height:8,borderRadius:'50%',background:v.color}}/>{v.label}: <strong style={{color:T.text}}>{n}</strong>
                            </div>;
                          })}
                        </div>
                      </div>
                    )}
                    {dashStats && (
                      <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:14,padding:'20px 22px',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
                        <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:0.6,marginBottom:16}}>Statistiques ferme</div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                          {Object.entries(dashStats).filter(([,v])=>typeof v==='number').slice(0,9).map(([k,v])=>(
                            <div key={k} style={{background:T.raised,borderRadius:10,padding:'12px 14px',textAlign:'center',border:`1px solid ${T.border}`}}>
                              <div style={{fontSize:22,fontWeight:900,color:T.text}}>{v}</div>
                              <div style={{fontSize:9,color:T.muted,marginTop:3,textTransform:'uppercase',letterSpacing:0.4}}>{k.replace(/_/g,' ')}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {!dashStats && recs.length===0 && (
                      <div style={{textAlign:'center',padding:'70px 0',color:T.muted}}>
                        <TrendingUp size={40} style={{opacity:.2,marginBottom:14}}/>
                        <div style={{fontSize:15,fontWeight:600,color:T.dim}}>Données insuffisantes</div>
                        <div style={{fontSize:13,marginTop:6}}>Générez des recommandations IA d'abord</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right sidebar */}
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ background:'linear-gradient(160deg, #1e1b4b, #312e81)', border:'1px solid rgba(99,102,241,.3)', borderRadius:16, overflow:'hidden' }}>
                  <div style={{ padding:'15px 17px', borderBottom:'1px solid rgba(99,102,241,.2)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                      <div style={{ background:'rgba(165,180,252,.18)', borderRadius:8, padding:7 }}>
                        <Sparkles size={14} color="#a5b4fc" />
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#e0e7ff' }}>Moteur IA Souverain</div>
                        <div style={{ fontSize:10, color:'rgba(99,102,241,.8)' }}>Ollama · RAG UTAP · Open-Meteo</div>
                      </div>
                    </div>
                    {aiResult?.overall_status && (
                      <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background: aiResult.overall_status==='Nominal'?'#4ade80':T.amber }} />
                        <span style={{ fontSize:11, color:'#c7d2fe', fontWeight:600 }}>{aiResult.overall_status}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding:'13px 17px' }}>
                    <label style={{ fontSize:10, color:'#818cf8', fontWeight:700, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Culture / Espèce</label>
                    <select value={selectedPlant} onChange={e => setPlant(e.target.value)}
                      style={{ width:'100%', padding:'7px 10px', marginBottom:10, background:'rgba(99,102,241,.18)', border:'1px solid rgba(99,102,241,.3)', borderRadius:7, color:'#c7d2fe', fontSize:12, cursor:'pointer', outline:'none' }}>
                      {PLANTS.map(p => <option key={p} value={p} style={{background:'#1e1b4b'}}>{p}</option>)}
                    </select>
                    <button onClick={generateAI} disabled={aiLoading || !selectedFarm}
                      style={{ width:'100%', padding:'9px', borderRadius:9, border:'none', cursor:'pointer',
                        background: aiLoading ? 'rgba(99,102,241,.3)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        color:'#fff', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                        boxShadow: aiLoading ? 'none' : '0 4px 14px rgba(79,70,229,.45)', transition:'all .2s', opacity: !selectedFarm ? 0.6 : 1 }}>
                      {aiLoading ? <><RefreshCw size={13} style={{animation:'spin .8s linear infinite'}}/> Analyse…</> : <><Play size={13}/> Analyser</>}
                    </button>
                  </div>
                </div>

                {alertTypeData.length > 0 && (
                  <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:14, padding:'14px 16px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:0.6, marginBottom:12 }}>Alertes par type</div>
                    <ResponsiveContainer width="100%" height={90}>
                      <BarChart data={alertTypeData} layout="vertical" margin={{left:0,right:0,top:0,bottom:0}}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={88} tick={{fill:T.dim,fontSize:10}} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{background:T.white,border:`1px solid ${T.border}`,borderRadius:8,fontSize:11,color:T.text}} />
                        <RBar dataKey="value" radius={[0,4,4,0]}>
                          {alertTypeData.map((_,i) => <Cell key={i} fill={[T.red,T.amber,T.sky][i%3]}/>)}
                        </RBar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:14, padding:'14px 16px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:0.6, marginBottom:12 }}>Système</div>
                  {[
                    { label:'Recommandations totales', value: recs.length,                         color: T.indigo },
                    { label:'Traitées',                value: recs.filter(r=>r.is_actioned).length, color: T.green  },
                    { label:'Alertes actives',         value: unresolved.length,                    color: T.amber  },
                    { label:'Anomalies détectées',     value: anomalies.length,                     color: T.sky    },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${T.border}` }}>
                      <span style={{ fontSize:12, color:T.dim }}>{label}</span>
                      <span style={{ fontSize:14, fontWeight:800, color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <footer style={{ borderTop:`1px solid ${T.border}`, padding:'16px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', background:T.white }}>
            <div style={{ display:'flex', gap:16, alignItems:'center' }}>
              <span style={{ fontSize:12, color:T.muted, fontWeight:500 }}>Smart Farm AI — Intelligence Agronomique</span>
              <LiveDot status={wsStatus} />
            </div>
            <button onClick={handleExport}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:9, border:`1px solid ${T.border}`, background:T.white, color:T.dim, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.background=T.raised; e.currentTarget.style.borderColor=T.indigo; e.currentTarget.style.color=T.indigo; }}
              onMouseLeave={e => { e.currentTarget.style.background=T.white; e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.dim; }}>
              <Download size={12}/> Exporter les données
            </button>
          </footer>
        </div>
      )}

      {selectedReport && <InsightModal report={selectedReport} onClose={() => setSelectedReport(null)}/>}

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        .rp-in { animation: fadeUp .25s ease forwards; }
      `}</style>
    </div>
  );
}

/* ── Button style helper ───────────────────────────────────────────── */
function btn(variant) {
  const base = { display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8,
    fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s', outline:'none' };
  if (variant === 'accent')      return { ...base, background:C.accent, border:'none', color:'#fff', boxShadow:`0 2px 8px ${C.accent}30` };
  if (variant === 'outline')     return { ...base, background:C.surface, border:`1px solid ${C.border}`, color:C.dim };
  if (variant === 'ghost')       return { ...base, background:C.surface, border:`1px solid ${C.border}`, color:C.dim };
  if (variant === 'ghost-green') return { ...base, background:C.okLt, border:`1px solid ${C.ok}30`, color:C.ok };
  return base;
}
