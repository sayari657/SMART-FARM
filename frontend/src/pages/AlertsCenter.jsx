import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, CheckCircle2, Filter, CloudLightning, Sun, 
  Flame, ShieldAlert, TreePine, Bug, Info, Activity,
  Zap, Bell, ShieldCheck, Clock
} from 'lucide-react';
import Navbar from '../components/Navbar';
import AlertCard from '../components/AlertCard';
import KPIBox from '../components/KPIBox';
import { alertsAPI, farmsAPI, externalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

/* ══════════════════════════════════════════════════════════
   DESIGN TOKENS — Enterprise High-End
   ══════════════════════════════════════════════════════════ */
const T = {
  red:     '#ef4444',
  redLt:   '#fef2f2',
  orange:  '#f97316',
  yellow:  '#eab308',
  green:   '#22c55e',
  blue:    '#3b82f6',
  slate:   '#64748b',
  bg:      '#f8fafc',
  card:    '#ffffff',
  border:  '#e2e8f0',
  textPri: '#0f172a',
  textSec: '#475569',
};

export default function AlertsCenter() {
  const [alerts, setAlerts]   = useState([]);
  const [emergencyData, setEmergencyData] = useState(null);
  const [weatherRisks, setWeatherRisks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('emergency'); // emergency | active | critical | resolved | all
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, eRes] = await Promise.all([
        alertsAPI.list(),
        alertsAPI.emergency()
      ]);
      
      let baseAlerts = aRes.data;
      setEmergencyData(eRes.data);
      
      // Fetch weather risks for the first farm
      const fRes = await farmsAPI.list();
      if(fRes.data.length > 0) {
        try {
          const wRes = await externalAPI.weather.current(fRes.data[0].id);
          const risks = wRes.data?.risks;
          setWeatherRisks(risks);
          
          if (risks) {
            if (risks.heat_stress) baseAlerts.unshift({ id: 'w1', title: t('alerts.heat_stress'), description: t('alerts.heat_stress_desc'), severity: 'critical', entity_type: 'Environment', timestamp: new Date().toISOString(), is_resolved: false });
            if (risks.storm_risk) baseAlerts.unshift({ id: 'w2', title: t('alerts.storm_warning'), description: t('alerts.storm_warning_desc'), severity: 'critical', entity_type: 'Environment', timestamp: new Date().toISOString(), is_resolved: false });
            if (risks.cold_stress) baseAlerts.unshift({ id: 'w3', title: t('alerts.cold_stress'), description: t('alerts.cold_stress_desc'), severity: 'warning', entity_type: 'Environment', timestamp: new Date().toISOString(), is_resolved: false });
          }
        } catch {}
      }
      setAlerts([...baseAlerts]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resolve = async (id) => {
    await alertsAPI.resolve(id, user?.username || 'manager');
    load();
  };

  const counts = {
    active:    alerts.filter(a=>!a.is_resolved).length,
    critical:  alerts.filter(a=>!a.is_resolved&&a.severity==='critical').length,
    resolved:  alerts.filter(a=>a.is_resolved).length,
    fire:      emergencyData?.fire_events?.length || 0,
    emergency: (emergencyData?.fire_events?.length || 0) + (emergencyData?.critical_alerts?.length || 0)
  };

  const FILTERS = [
    { id:'emergency', label: `🚨 ${t('alerts.sovereign_monitor', "Moniteur Souverain")}`, icon: ShieldAlert },
    { id:'active',    label: `${t('alerts.filter_active')} (${counts.active})`, icon: Bell },
    { id:'critical',  label: `${t('alerts.filter_critical')} (${counts.critical})`, icon: AlertTriangle },
    { id:'resolved',  label: `${t('alerts.filter_resolved')} (${counts.resolved})`, icon: ShieldCheck },
    { id:'all',       label: `${t('alerts.filter_all')} (${alerts.length})`, icon: Info },
  ];

  const filtered = alerts.filter(a => {
    if (filter === 'active')   return !a.is_resolved;
    if (filter === 'critical') return !a.is_resolved && a.severity === 'critical';
    if (filter === 'resolved') return a.is_resolved;
    return true;
  });

  return (
    <>
      <Navbar title={t('alerts.center_title')} subtitle={t('alerts.center_subtitle')} />
      <div className="page-content" style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr', background: T.bg, minHeight: '100dvh' }}>

        <div className="kpi-grid" style={{ marginBottom:32 }}>
          <KPIBox icon={ShieldAlert} value={counts.emergency} label="Urgence" colorClass="red" />
          <KPIBox icon={AlertTriangle} value={counts.active}   label={t('alerts.active_alerts')}   colorClass="yellow" />
          <KPIBox icon={Flame} value={counts.fire} label="Détection Feu" colorClass="red" />
          <KPIBox icon={CheckCircle2} value={counts.resolved}  label={t('alerts.resolved_today')}  colorClass="green" />
        </div>

        {/* ── Tabs Navigation ── */}
        <div style={{ 
          display:'flex', gap:8, marginBottom:24, 
          background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)',
          padding: '4px', borderRadius: '12px', border: `1px solid ${T.border}`,
          overflowX: 'auto'
        }}>
          {FILTERS.map(f => {
            const ActiveIcon = f.icon;
            const isActive = filter === f.id;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)}
                style={{ 
                  background: isActive ? '#fff' : 'transparent',
                  border: 'none', 
                  padding: '10px 18px', 
                  borderRadius: '8px',
                  cursor: 'pointer', 
                  fontSize: 13,
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? T.blue : T.slate,
                  boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}>
                <ActiveIcon size={16} />
                {f.label}
              </button>
            );
          })}
        </div>

        {loading && <div className="spinner" style={{ margin: '40px auto' }} />}

        {!loading && filter === 'emergency' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.5s ease' }}>
            
            {/* 1. Fire / Smoke Section */}
            {emergencyData?.fire_events?.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: T.redLt, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.red}22` }}>
                      <Flame color={T.red} size={22} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 900, color: T.textPri, margin: 0 }}>Alerte Incendie / Fumée</h2>
                      <p style={{ fontSize: 12, color: T.slate, margin: 0 }}>Détections critiques par Vision Artificielle</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('/cv')} className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>Scanner Live</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
                  {emergencyData.fire_events.map(e => (
                    <div key={e.id} style={{ 
                      background: '#fff', borderRadius: 16, border: `2px solid ${T.red}`, 
                      overflow: 'hidden', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)',
                      position: 'relative'
                    }}>
                      <div style={{ height: 'clamp(120px, 30vw, 160px)', background: '#000', position: 'relative' }}>
                        {e.thumbnail_url ? (
                          <img src={e.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Fire detection" />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(45deg, #000, #450a0a)' }}>
                            <Flame color={T.red} size={40} />
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: 12, right: 12, background: T.red, color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 900 }}>CRITICAL</div>
                      </div>
                      <div style={{ padding: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: T.textPri, marginBottom: 4 }}>DÉTECTION : {e.object_class.toUpperCase()}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: T.slate }}>
                          <Clock size={12} /> {new Date(e.timestamp).toLocaleTimeString()}
                          <Activity size={12} style={{ marginLeft: 8 }} /> Confiance: {Math.round(e.confidence * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. Critical Tree Diseases */}
            {emergencyData?.tree_diseases?.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid #16a34a22` }}>
                      <TreePine color="#16a34a" size={22} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 900, color: T.textPri, margin: 0 }}>Pathologies Végétales Critiques</h2>
                      <p style={{ fontSize: 12, color: T.slate, margin: 0 }}>Analyses agronomiques nécessitant une intervention</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('/trees')} className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>Gérer Plantations</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {emergencyData.tree_diseases.map(e => (
                    <div key={e.id} style={{ 
                      background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, padding: 12,
                      display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer'
                    }} onClick={() => navigate('/trees')}>
                      <div style={{ width: 60, height: 60, borderRadius: 8, background: '#f8fafc', overflow: 'hidden', flexShrink: 0 }}>
                        {e.thumbnail_url ? <img src={e.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Bug size={24} color={T.slate} style={{ margin: '18px' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.textPri }}>{e.object_class.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: 10, color: T.slate, marginTop: 2 }}>{e.camera_id.toUpperCase()} · {new Date(e.timestamp).toLocaleDateString()}</div>
                        <div style={{ marginTop: 6, fontSize: 9, fontWeight: 800, color: T.red, background: T.redLt, padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>INTERVENTION REQUISE</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3. Global Risks Overlay */}
            {weatherRisks && (weatherRisks.heat_stress || weatherRisks.storm_risk || weatherRisks.cold_stress) && (
              <div style={{ 
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                borderRadius: 16, padding: 20, color: '#fff',
                boxShadow: '0 10px 30px rgba(220, 38, 38, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <CloudLightning size={24} />
                  <span style={{ fontWeight: 800, fontSize: 16 }}>Alertes Météorologiques Extrêmes</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {weatherRisks.heat_stress && <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px 16px', borderRadius: 12, fontSize: 13, flex: 1, minWidth: 200 }}>
                    <Sun size={14} style={{ marginRight: 6 }} /> <b>Heat Stress:</b> Risque élevé pour le bétail.
                  </div>}
                  {weatherRisks.storm_risk && <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px 16px', borderRadius: 12, fontSize: 13, flex: 1, minWidth: 200 }}>
                    <CloudLightning size={14} style={{ marginRight: 6 }} /> <b>Tempête:</b> Sécurisez les installations.
                  </div>}
                </div>
              </div>
            )}

            {/* 4. Critical System/Animal Alerts */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: T.textPri, margin: 0 }}>Alertes Sanitaires Critiques</h2>
                <button onClick={() => navigate('/animals')} className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>Gérer Bétail</button>
              </div>
              {emergencyData?.critical_alerts?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {emergencyData.critical_alerts.map(a => (
                    <AlertCard key={a.id} alert={a} onResolve={resolve} />
                  ))}
                </div>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 16, border: `1px dashed ${T.border}` }}>
                  <ShieldCheck size={40} color={T.green} style={{ marginBottom: 12, opacity: 0.5 }} />
                  <p style={{ color: T.slate, fontSize: 14 }}>Aucune alerte sanitaire critique en cours.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {!loading && filter !== 'emergency' && (
          <>
            {filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: '80px 20px', background: '#fff', borderRadius: 20, marginTop: 20 }}>
                <CheckCircle2 size={48} color={T.green} style={{ marginBottom: 16 }} />
                <h3>{filter === 'resolved' ? t('alerts.no_resolved') : t('alerts.no_active')}</h3>
                <p style={{ color: T.slate }}>{t('alerts.all_good')}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'slideUp 0.4s ease' }}>
                {filtered.map(a => (
                  <AlertCard key={a.id} alert={a} onResolve={!a.is_resolved ? resolve : null} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .spinner {
          width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid ${T.blue};
          border-radius: 50%; animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
