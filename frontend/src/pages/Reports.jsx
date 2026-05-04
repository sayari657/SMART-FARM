import React, { useEffect, useState } from 'react';
import { 
  FileText, Download, TrendingUp, AlertTriangle, 
  CheckCircle, Calendar, Zap, Database, 
  BarChart3, BrainCircuit, Waves, Leaf, 
  Activity, ShieldCheck, Printer, Sparkles,
  Sprout, Shield, Info
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { reportsAPI, farmsAPI, animalsAPI, plantsAPI } from '../services/api';

// Images générées
const IMG_ANIMALS = "/brain/bd0df84b-40db-40ce-aca5-7889f371e7ca/farm_animals_premium_1777240383651.png";
const IMG_PLANTS  = "/brain/bd0df84b-40db-40ce-aca5-7889f371e7ca/farm_plants_premium_1777240413214.png";
const IMG_HEADER  = "/brain/bd0df84b-40db-40ce-aca5-7889f371e7ca/smart_farm_analytics_header_1777240434384.png";

const COLORS = {
  primary: '#D97706',
  secondary: '#166534',
  accent: '#0369A1',
  bg: '#FFFBF2',
  card: '#FFFFFF',
  text: '#1C0A00',
  textMuted: '#6B7280'
};

export default function Reports() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState('live'); // 'live' or 'archive'
  const [stats, setStats] = useState({
    farms: 0, animals: 0, plants: 0, hives: 0,
    health: 94, alerts: 0
  });
  
  const [reports, setReports] = useState([]);
  const [farms, setFarms]     = useState([]);

  const handleGenerateIntelligent = async (type) => {
    setGenerating(true);
    try {
      await reportsAPI.generateIntelligent(type);
      const res = await reportsAPI.list();
      setReports(res.data);
      setView('archive');
      alert(`Rapport Intelligent (${type}) généré avec succès !`);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la génération du rapport IA.");
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    
    setLoading(true);
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Rapport_SmartFarm_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("PDF Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [rRes, fRes, aRes, pRes] = await Promise.all([
          reportsAPI.list(),
          farmsAPI.list(),
          animalsAPI.list(),
          plantsAPI.list()
        ]);
        
        setReports(rRes.data);
        setFarms(fRes.data);
        
        setStats({
          farms: fRes.data.length,
          animals: aRes.data.length,
          plants: pRes.data.length,
          hives: 12, // Mocked or fetched from bee API if needed
          health: 94,
          alerts: 3
        });
      } catch (err) {
        console.error("Report Load Error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  return (
    <>
      <Navbar
        title={t('reports_page.title')}
        subtitle={t('reports_page.subtitle')}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
             <button 
              className={`btn ${view === 'live' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setView('live')}
            >
              <Zap size={14} /> {t('reports_page.live_report')}
            </button>
            <button 
              className={`btn ${view === 'archive' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setView('archive')}
            >
              <Database size={14} /> {t('reports_page.archives')}
            </button>
          </div>
        }
      />

      <div className="page-content" style={{ padding: '24px 40px', background: COLORS.bg }} id="report-content">
        
        {/* Strategic Actions Header */}
        <div style={{ 
          display: 'flex', gap: 15, marginBottom: 25, padding: 20, 
          background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
          borderRadius: 20, border: '1px solid rgba(22, 163, 74, 0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
          alignItems: 'center', flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
            <div style={{ padding: 10, background: '#dcfce7', borderRadius: 12 }}>
              <BrainCircuit size={20} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{t('reports_page.ai_ollama')}</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>{t('reports_page.strategic_reports_based_on')} {new Date().toLocaleDateString()}</div>
            </div>
          </div>
          
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => handleGenerateIntelligent('animals')}
            disabled={generating}
            style={{ gap: 8 }}
          >
            <Activity size={14} /> {t('reports_page.animal_report')}
          </button>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => handleGenerateIntelligent('plants')}
            disabled={generating}
            style={{ gap: 8 }}
          >
            <Leaf size={14} /> {t('reports_page.plant_report')}
          </button>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={() => handleGenerateIntelligent('general')}
            disabled={generating}
            style={{ gap: 8, background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
          >
            {generating ? <Zap size={14} className="spin" /> : <Sparkles size={14} />} 
            {t('reports_page.global_ai_report')}
          </button>
          
          <div style={{ width: 1, height: 30, background: '#e2e8f0', margin: '0 10px' }} />
          
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={downloadPDF}
            style={{ gap: 8, borderColor: '#16a34a', color: '#16a34a' }}
          >
            <Printer size={14} /> {t('reports_page.download_pdf')}
          </button>
        </div>

        {view === 'live' ? (
          <LiveReport stats={stats} />
        ) : (
          <ArchiveView reports={reports} loading={loading} />
        )}

      </div>

      <style>{`
        .report-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 24px; }
        .stat-card { background: white; padding: 24px; border-radius: 20px; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
        .section-header { margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
        .premium-img { width: 100%; height: 200px; object-fit: cover; border-radius: 16px; margin-bottom: 16px; transition: transform 0.3s ease; }
        .premium-img:hover { transform: scale(1.02); }
        .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .kpi-item { background: white; padding: 20px; border-radius: 16px; border-bottom: 4px solid var(--p); }
        .badge-pro { padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
      `}</style>
    </>
  );
}

function LiveReport({ stats }) {
  const { t } = useTranslation();
  return (
    <div className="fade-in">
      {/* Header Banner */}
      <div style={{ 
        height: 250, borderRadius: 24, overflow: 'hidden', position: 'relative', 
        marginBottom: 30, background: '#000' 
      }}>
        <img src={IMG_HEADER} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} alt="Report Header" />
        <div style={{ 
          position: 'absolute', bottom: 30, left: 40, color: 'white', zIndex: 10 
        }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>{t('reports_page.integrated_report_title')}</h1>
          <p style={{ opacity: 0.8, fontSize: 16 }}>{t('reports_page.integrated_report_subtitle')}</p>
        </div>
        <div style={{ 
          position: 'absolute', top: 30, right: 40, background: 'rgba(0,0,0,0.4)', 
          backdropFilter: 'blur(10px)', padding: '10px 20px', borderRadius: 100,
          border: '1px solid rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', gap: 10
        }}>
          <Activity size={16} color="#10b981" /> {t('reports_page.system_operational')}
        </div>
      </div>

      {/* KPI Overview */}
      <div className="kpi-row">
        <div className="kpi-item" style={{ '--p': '#10b981' }}>
          <div style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>{t('reports_page.global_health_score')}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981' }}>{stats.health}%</div>
          <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>↑ 2.4% {t('reports_page.vs_last_week')}</div>
        </div>
        <div className="kpi-item" style={{ '--p': '#D97706' }}>
          <div style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>{t('reports_page.animal_biomass')}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.animals} {t('reports_page.units')}</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{t('reports_page.gps_tracking_active')}</div>
        </div>
        <div className="kpi-item" style={{ '--p': '#166534' }}>
          <div style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>{t('reports_page.plant_crops')}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.plants} {t('reports_page.species')}</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{t('reports_page.optimized_irrigation')}</div>
        </div>
        <div className="kpi-item" style={{ '--p': '#0369A1' }}>
          <div style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>{t('reports_page.critical_alerts')}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: stats.alerts > 0 ? '#ef4444' : '#10b981' }}>{stats.alerts}</div>
          <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{stats.alerts > 0 ? t('reports_page.action_required') : t('reports_page.system_stable')}</div>
        </div>
      </div>

      <div className="report-grid">
        {/* Animals Section */}
        <div className="stat-card">
          <div className="section-header">
            <Activity color={COLORS.primary} size={24} />
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>{t('reports_page.zootechnical_report')}</h2>
          </div>
          <img src={IMG_ANIMALS} className="premium-img" alt="Animals" />
          <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 20 }}>
            {t('reports_page.zootechnical_desc')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <MetricRow label={t('reports_page.reproduction_rate')} value="88%" color="#10b981" />
            <MetricRow label={t('reports_page.water_consumption')} value="420L" color="#0369A1" />
            <MetricRow label={t('reports_page.vaccination_up_to_date')} value="95%" color="#10b981" />
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: 24 }}>
            <Download size={14} /> {t('reports_page.download_detailed_pdf')}
          </button>
        </div>

        {/* Plants Section */}
        <div className="stat-card">
          <div className="section-header">
            <Sprout color={COLORS.secondary} size={24} />
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>{t('reports_page.agronomic_report')}</h2>
          </div>
          <img src={IMG_PLANTS} className="premium-img" alt="Plants" />
          <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 20 }}>
            {t('reports_page.agronomic_desc')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <MetricRow label={t('reports_page.water_stress')} value="Bas" color="#10b981" />
            <MetricRow label={t('reports_page.estimated_yield')} value="12.5t" color="#D97706" />
            <MetricRow label={t('reports_page.fertilizer_usage')} value="-15%" color="#10b981" />
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: 24 }}>
            <Download size={14} /> {t('reports_page.soil_yield_analysis')}
          </button>
        </div>

        {/* Technical Insights */}
        <div className="stat-card" style={{ background: '#111827', color: 'white' }}>
          <div className="section-header">
            <Shield color="#fbbf24" size={24} />
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>{t('reports_page.safety_infrastructure')}</h2>
          </div>
          <div style={{ padding: '20px 0' }}>
            <div style={{ fontSize: 40, fontWeight: 900, marginBottom: 10 }}>100%</div>
            <div style={{ opacity: 0.6, fontSize: 13 }}>{t('reports_page.perimeter_integrity')}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            <span className="badge-pro" style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24' }}>{t('reports_page.virtual_barrier_ok')}</span>
            <span className="badge-pro" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>{t('reports_page.active_iot_sensors')}</span>
            <span className="badge-pro" style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6' }}>{t('reports_page.thermal_cameras_on')}</span>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <BarChart3 size={16} color="#fbbf24" />
              <span>{t('reports_page.last_anomaly_analysis')} <b>{t('reports_page.none')}</b></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
      <span style={{ color: COLORS.textMuted }}>{label}</span>
      <span style={{ fontWeight: 800, color: color }}>{value}</span>
    </div>
  );
}

function ArchiveView({ reports, loading }) {
  const { t } = useTranslation();
  const TYPE_COLOR = { daily:'badge-info', weekly:'badge-warning', monthly:'badge-success' };

  return (
    <div className="fade-in card">
      <div className="card-header">
        <div className="card-title">{t('reports_page.generated_reports_history')}</div>
      </div>
      {loading ? <div className="spinner" /> : reports.length === 0 ? (
        <div className="empty-state"><FileText size={40} /><h3>{t('reports_page.no_archived_reports')}</h3></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('reports_page.report_title')}</th>
                <th>{t('reports_page.type')}</th>
                <th>{t('reports_page.period')}</th>
                <th>{t('reports_page.avg_score')}</th>
                <th>{t('reports_page.action')}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <React.Fragment key={r.id}>
                  <tr>
                    <td style={{ fontWeight:600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {r.summary?.ai_insight && <Sparkles size={14} color="#16a34a" />}
                        {r.title}
                      </div>
                    </td>
                    <td><span className={`badge ${TYPE_COLOR[r.report_type]||'badge-neutral'}`}>{r.report_type}</span></td>
                    <td style={{ fontSize:12, color: COLORS.textMuted }}>
                      {new Date(r.period_start).toLocaleDateString()} → {new Date(r.period_end).toLocaleDateString()}
                    </td>
                    <td><span style={{ fontWeight: 700, color: '#10b981' }}>{r.summary?.avg_health_score || r.summary?.avg_health || 0}%</span></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => window.alert(r.summary?.ai_insight || "Pas d'analyse IA disponible.")}>
                        <Info size={12} />
                      </button>
                    </td>
                  </tr>
                  {r.summary?.ai_insight && (
                    <tr>
                      <td colSpan="5" style={{ padding: '10px 20px', background: '#f8fafc' }}>
                        <div style={{ 
                          fontSize: 13, color: '#475569', borderLeft: '3px solid #16a34a', 
                          paddingLeft: 15, fontStyle: 'italic'
                        }}>
                          <b>{t('reports_page.strategic_ai_analysis')}</b><br/>
                          {r.summary.ai_insight}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
