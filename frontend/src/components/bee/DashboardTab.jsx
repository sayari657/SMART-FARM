import React from 'react';
import { 
  Hexagon, Droplets, Heart, AlertCircle, Eye, Upload, Activity, ArrowUpRight, ClipboardCheck as VisitIcon, Plus, MapPin
} from 'lucide-react';
import { COLORS } from './BeeConstants';

const AIPulse = () => (
  <svg viewBox="0 0 100 20" style={{ width: '100%', height: 40 }}>
    <path d="M0 10 Q 5 0, 10 10 T 20 10 T 30 10 T 40 10 T 50 10 T 60 10 T 70 10 T 80 10 T 90 10 T 100 10" fill="none" stroke={COLORS.accent} strokeWidth="0.5">
      <animate attributeName="d" dur="2s" repeatCount="indefinite" values="M0 10 Q 5 0, 10 10 T 20 10 T 30 10 T 40 10 T 50 10 T 60 10 T 70 10 T 80 10 T 90 10 T 100 10; M0 10 Q 5 20, 10 10 T 20 10 T 30 10 T 40 10 T 50 10 T 60 10 T 70 10 T 80 10 T 90 10 T 100 10; M0 10 Q 5 0, 10 10 T 20 10 T 30 10 T 40 10 T 50 10 T 60 10 T 70 10 T 80 10 T 90 10 T 100 10" />
    </path>
  </svg>
);

const BeeHealthSonar = () => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 30 }}>
    {[...Array(12)].map((_, i) => (
      <div 
        key={i} 
        style={{ 
          width: 3, 
          background: COLORS.accent, 
          borderRadius: 10, 
          height: '40%',
          animation: `beePulse ${0.6 + Math.random() * 0.4}s infinite ease-in-out` 
        }} 
      />
    ))}
    <style>{`
      @keyframes beePulse {
        0%, 100% { height: 30%; }
        50% { height: 90%; }
      }
    `}</style>
  </div>
);

export default function DashboardTab({ ruches, isProcessing, previewImage, onImport, onAction, stats }) {
  const kpis = [
    { label: 'Ruches Actives', val: ruches.filter(r => r.active).length, trend: '+0', icon: Hexagon, color: COLORS.accent },
    { label: 'Récolte Totale', val: stats?.totalMiel || '0 kg', trend: '+15%', icon: Droplets, color: COLORS.info },
    { label: 'Santé Globale', val: stats?.sante || '92%', trend: 'Stable', icon: Heart, color: COLORS.success },
    { label: 'Alertes Actives', val: stats?.alertes || '0', trend: '-1', icon: AlertCircle, color: COLORS.error }
  ];

  const quickActions = [
    { label: 'Nouvelle Visite', icon: VisitIcon, tab: 'visites', subAction: 'addVisit' },
    { label: 'Ajouter Ruche', icon: Plus, tab: 'ruches', subAction: 'addRuche' },
    { label: 'Ajouter Emplacement', icon: MapPin, tab: 'emplacements', subAction: 'addEmp' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: COLORS.surface, borderRadius: 20, padding: 24, border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${k.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={20} color={k.color} />
              </div>
              <div style={{ fontSize: 11, color: COLORS.success, fontWeight: 700 }}>{k.trend}</div>
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginTop: 4 }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div style={{ background: COLORS.surface, borderRadius: 24, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={16} color={COLORS.accent} />
              <span style={{ fontWeight: 700, fontSize: 14, color: 'white' }}>Smart Vision Feed (YOLO)</span>
            </div>
            <button onClick={onImport} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Upload size={12} /> Importer
            </button>
          </div>
          <div style={{ height: 350, background: '#000', position: 'relative' }}>
            {isProcessing && <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.accent, fontSize: 13 }}>Analyse Vision...</div>}
            {previewImage ? <img src={previewImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted }}>Pas de flux vidéo actif</div>}
            <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(0,0,0,0.4)', padding: 12, borderRadius: 12, backdropFilter: 'blur(5px)' }}>
              <div style={{ fontSize: 9, color: COLORS.accent, fontWeight: 800, marginBottom: 4 }}>POULS IA</div>
              <AIPulse />
            </div>
          </div>
        </div>

        <div style={{ background: COLORS.surface, borderRadius: 24, border: `1px solid ${COLORS.border}`, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <Activity size={18} color={COLORS.info} />
            <span style={{ fontWeight: 700, color: 'white' }}>Intelligence Audio</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Système', msg: 'Santé ruches 92%', color: COLORS.success },
              { label: 'Alerte', msg: 'Vibration anormale détectée (H24)', color: COLORS.error },
              { label: 'Météo', msg: 'Température optimale pour pollinisation', color: COLORS.info }
            ].map((log, i) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 3, height: 36, borderRadius: 2, background: log.color }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{log.label}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{log.msg}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32, padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid ' + COLORS.border, display: 'flex', justifyContent: 'center' }}>
            <BeeHealthSonar />
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.textMuted, letterSpacing: '1px', marginBottom: 20 }}>ACTIONS RAPIDES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {quickActions.map(act => (
            <button 
              key={act.label} 
              onClick={() => onAction(act.tab, act.subAction)}
              style={{ 
                background: COLORS.accent, 
                border: 'none', 
                borderRadius: 20, 
                padding: '24px', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                cursor: 'pointer', 
                boxShadow: '0 10px 20px -5px rgba(217,119,6,0.2)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <act.icon size={24} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 16 }}>{act.label}</span>
              </div>
              <ArrowUpRight size={20} style={{ opacity: 0.7 }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
