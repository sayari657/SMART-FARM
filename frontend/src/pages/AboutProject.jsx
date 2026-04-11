import React from 'react';
import { 
  Leaf, 
  Cpu, 
  Eye, 
  BarChart3, 
  ShieldCheck, 
  Layers, 
  Zap, 
  Globe 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import ThreeTile from '../components/ThreeTile';
import ThreeAnimalModel from '../components/ThreeAnimalModel';

const LIVESTOCK = [
  { sp: 'Bee', url: '/models/bee.glb', color: '#fbbf24', desc: 'Precision apiary monitoring with acoustic health diagnostics and automated harvest forecasting.' },
  { sp: 'Cow', url: '/models/cow.glb', color: '#7c3aed', desc: 'Comprehensive dairy & beef tracking: rumination analysis, milk yield forecasting, and biometric monitoring.' },
  { sp: 'Goat', url: '/models/goat.glb', color: '#dc2626', desc: 'Active herd management with agility-based activity indexing and milk production tracking.' },
  { sp: 'Poultry', url: '/models/poultry.glb', color: '#0891b2', desc: 'Automated environmental & egg production oversight for large-scale poultry facilities.', rotation: [0, Math.PI, 0] },
  { sp: 'Sheep', url: '/models/sheep.glb', color: '#059669', desc: 'Advanced grazing behavior analysis and livestock health telemetry for high-quality wool and meat production.' }
];

const AboutProject = () => {
  const { t, i18n } = useTranslation();

  return (
    <>
      <Navbar 
        title={t('project.title')} 
        subtitle={t('project.subtitle')} 
      />
      
      <div className="page-content" style={{ maxWidth: '1000px', margin: '0 auto', direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>
        
        {/* Mission Section */}
        <section className="card" style={{ padding: 40, marginBottom: 32, textAlign: 'center', background: 'linear-gradient(135deg, var(--color-surface) 0%, #f0fdf4 100%)' }}>
          <div style={{ display: 'inline-flex', padding: 16, background: 'var(--color-primary)', borderRadius: 20, color: 'white', marginBottom: 24 }}>
            <Leaf size={40} />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16, color: 'var(--color-text-1)' }}>{t('project.mission_title')}</h1>
          <p style={{ fontSize: 18, color: 'var(--color-text-2)', lineHeight: 1.6, maxWidth: '700px', margin: '0 auto' }}>
            {t('project.mission_desc')}
          </p>
        </section>

        {/* Core Pillars */}
        <div className="grid-3" style={{ gap: 24, marginBottom: 48 }}>
          {[
            { 
              icon: Cpu, 
              title: t('project.pillar_iot'), 
              desc: 'Real-time environmental and health monitoring using low-latency MQTT protocols and high-precision sensors.',
              color: '#3b82f6'
            },
            { 
              icon: Eye, 
              title: t('project.pillar_cv'), 
              desc: 'Advanced YOLO-based object detection for automated livestock tracking, health diagnostics, and security.',
              color: '#10b981'
            },
            { 
              icon: BarChart3, 
              title: 'Predictive Insights', 
              desc: 'Machine learning algorithms that forecast yields, identify disease patterns, and optimize resources.',
              color: '#8b5cf6'
            }
          ].map((pillar, i) => (
            <ThreeTile key={i}>
              <div style={{ padding: '32px 24px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ padding: 12, background: `${pillar.color}15`, borderRadius: 12, color: pillar.color, marginBottom: 16 }}>
                  <pillar.icon size={28} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{pillar.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-3)', lineHeight: 1.5 }}>{pillar.desc}</p>
              </div>
            </ThreeTile>
          ))}
        </div>

        {/* System Architecture */}
        <div className="card" style={{ marginBottom: 48 }}>
          <div className="card-header" style={{ textAlign: i18n.language === 'ar' ? 'right' : 'left' }}>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Layers size={20} color="var(--color-primary)" /> {t('project.system_arch')}
            </h2>
            <p className="card-subtitle">Modern full-stack pipeline for scalable agro-intelligence</p>
          </div>
          <div style={{ padding: 32 }}>
            <div className="grid-2" style={{ gap: 40 }}>
              <div>
                <h4 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--color-text-1)', textAlign: i18n.language === 'ar' ? 'right' : 'left' }}>High-Performance Backend</h4>
                <p style={{ color: 'var(--color-text-2)', marginBottom: 16, fontSize: 15, textAlign: i18n.language === 'ar' ? 'right' : 'left' }}>
                  Powered by <strong>FastAPI</strong> and <strong>PostgreSQL</strong>, our backend is optimized for 
                  asynchronous processing of high-frequency telemetry data.
                </p>
              </div>
              <div>
                <h4 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--color-text-1)', textAlign: i18n.language === 'ar' ? 'right' : 'left' }}>Immersive Frontend</h4>
                <p style={{ color: 'var(--color-text-2)', marginBottom: 16, fontSize: 15, textAlign: i18n.language === 'ar' ? 'right' : 'left' }}>
                  A sophisticated <strong>React</strong> dashboard featuring hardware-accelerated 3D digital twins.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Livestock Ecosystem Section */}
        <div style={{ marginBottom: 64 }}>
           <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, marginBottom: 8, color: 'var(--color-text-1)' }}>{t('project.livestock_title')}</h2>
           <p style={{ textAlign: 'center', color: 'var(--color-text-3)', marginBottom: 40 }}>High-precision monitoring across multiple species</p>
           
           <div className="grid-3" style={{ gap: 24 }}>
              {LIVESTOCK.map((animal) => (
                <div key={animal.sp} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                     <ThreeAnimalModel modelUrl={animal.url} rotation={animal.rotation} />
                  </div>
                  <div style={{ padding: 20 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                       <div style={{ width: 8, height: 8, borderRadius: '50%', background: animal.color }} />
                       <h4 style={{ fontWeight: 700, fontSize: 16 }}>Managed {animal.sp}</h4>
                     </div>
                     <p style={{ fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.5 }}>{animal.desc}</p>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingBottom: 64 }}>
          <ShieldCheck size={24} color="var(--success)" style={{ display: 'block', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--color-text-3)', fontSize: 14 }}>
            &copy; 2026 Smart Farm AI Enterprise. <br/>
            Version 3.0.0-Stable
          </p>
        </div>

      </div>
    </>
  );
};

export default AboutProject;
