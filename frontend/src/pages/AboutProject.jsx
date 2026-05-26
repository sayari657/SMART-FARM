import React from 'react';
import {
  Leaf, Cpu, Eye, BarChart3, ShieldCheck, Layers,
  Zap, Globe, GitBranch, Database, Wifi, Activity,
  ArrowRight, CheckCircle2, Star,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import ThreeTile from '../components/ThreeTile';
import ThreeAnimalModel from '../components/ThreeAnimalModel';

const LIVESTOCK = [
  { sp: 'Bee',     url: '/models/bee.glb',     color: '#fbbf24', emoji: '🐝', desc: 'Precision apiary monitoring with acoustic health diagnostics and automated harvest forecasting.' },
  { sp: 'Cow',     url: '/models/cow.glb',     color: '#7c3aed', emoji: '🐄', desc: 'Comprehensive dairy & beef tracking: rumination analysis, milk yield forecasting, and biometric monitoring.', rotation: [0, Math.PI / 2, 0] },
  { sp: 'Goat',    url: '/models/goat.glb',    color: '#dc2626', emoji: '🐐', desc: 'Active herd management with agility-based activity indexing and milk production tracking.', rotation: [0, Math.PI / 2, 0] },
  { sp: 'Poultry', url: '/models/poultry.glb', color: '#0891b2', emoji: '🐔', desc: 'Automated environmental & egg production oversight for large-scale poultry facilities.', rotation: [0, Math.PI / 2, 0] },
  { sp: 'Rabbit',  url: '/models/rabbit.glb',  color: '#f472b6', emoji: '🐰', desc: 'Optimized lagomorph breeding monitoring: litter health tracking, feed efficiency, and environmental controls.' },
  { sp: 'Sheep',   url: '/models/sheep.glb',   color: '#059669', emoji: '🐑', desc: 'Advanced grazing behavior analysis and livestock health telemetry for high-quality wool and meat.' },
];

const TECH_STACK = [
  { label: 'FastAPI',     color: '#16a34a', bg: 'rgba(22,163,74,.12)' },
  { label: 'React 18',    color: '#0ea5e9', bg: 'rgba(14,165,233,.12)' },
  { label: 'PostgreSQL',  color: '#3b82f6', bg: 'rgba(59,130,246,.12)' },
  { label: 'YOLO v8',     color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
  { label: 'Three.js',    color: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
  { label: 'MQTT/IoT',    color: '#06b6d4', bg: 'rgba(6,182,212,.12)'  },
  { label: 'Open-Meteo',  color: '#10b981', bg: 'rgba(16,185,129,.12)' },
  { label: 'Labess-7B',   color: '#f97316', bg: 'rgba(249,115,22,.12)' },
];

const PILLARS = [
  { icon: Cpu,      title: 'IoT & Capteurs',      desc: 'Surveillance environnementale temps réel via protocoles MQTT basse latence et capteurs haute précision.', color: '#3b82f6', bg: '#eff6ff' },
  { icon: Eye,      title: 'Vision par Ordinateur', desc: 'Détection YOLO v8 pour le suivi automatisé du bétail, les diagnostics de santé et la sécurité périmétrique.', color: '#10b981', bg: '#f0fdf4' },
  { icon: BarChart3,title: 'Insights Prédictifs',  desc: 'Algorithmes ML qui prévisionnent les rendements, identifient les maladies et optimisent les ressources.', color: '#8b5cf6', bg: '#f5f3ff' },
];

const AboutProject = () => {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';

  return (
    <>
      <Navbar title={t('project.title')} subtitle={t('project.subtitle')} />

      <div className="page-content ap-page" style={{ direction: rtl ? 'rtl' : 'ltr' }}>

        {/* ═══════════ HERO ═══════════ */}
        <div className="ap-hero">
          <div className="ap-hero-bg" />
          <div className="ap-hero-content">
            <div className="ap-hero-eyebrow">
              <span className="ap-hero-dot" />
              SMART FARM AI — ENTERPRISE PLATFORM v3.0
            </div>
            <h1 className="ap-hero-title">{t('project.mission_title', 'Intelligence Agronomique Souveraine')}</h1>
            <p className="ap-hero-desc">{t('project.mission_desc', 'Plateforme de supervision intelligente combinant IoT, computer vision et IA prédictive pour une agriculture de précision.')}</p>

            <div className="ap-tech-chips">
              {TECH_STACK.map(({ label, color, bg }) => (
                <span key={label} className="ap-tech-chip" style={{ color, background: bg, border: `1px solid ${color}30` }}>
                  {label}
                </span>
              ))}
            </div>

            <div className="ap-hero-stats">
              {[
                { val: '6',   label: 'Espèces', icon: '🐾' },
                { val: '2',   label: 'Nœuds IoT', icon: '📡' },
                { val: 'v8',  label: 'YOLO',    icon: '🎯' },
                { val: '7B',  label: 'LLM',     icon: '🧠' },
              ].map(({ val, label, icon }) => (
                <div key={label} className="ap-stat">
                  <span className="ap-stat-icon">{icon}</span>
                  <span className="ap-stat-val">{val}</span>
                  <span className="ap-stat-label">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════ PILLARS ═══════════ */}
        <div className="ap-section-label">PILIERS TECHNOLOGIQUES</div>
        <div className="ap-pillars">
          {PILLARS.map((p, i) => (
            <div key={i} className="ap-pillar-card">
              <div className="ap-pillar-icon" style={{ background: p.bg, color: p.color }}>
                <p.icon size={26} />
              </div>
              <h3 className="ap-pillar-title">{p.title}</h3>
              <p className="ap-pillar-desc">{p.desc}</p>
              <div className="ap-pillar-more" style={{ color: p.color }}>
                En savoir plus <ArrowRight size={12} />
              </div>
            </div>
          ))}
        </div>

        {/* ═══════════ ARCHITECTURE ═══════════ */}
        <div className="ap-section-label">ARCHITECTURE SYSTÈME</div>
        <div className="ap-arch-card">
          <div className="ap-arch-header">
            <Layers size={18} color="#16a34a" />
            <div>
              <div className="ap-arch-title">{t('project.system_arch', 'Pipeline Agro-Intelligence Moderne')}</div>
              <div className="ap-arch-sub">Full-stack haute performance · Asynchrone · Scalable</div>
            </div>
          </div>
          <div className="ap-arch-grid">
            {[
              { icon: Database,   label: 'Backend',    tech: 'FastAPI + PostgreSQL',  color: '#16a34a', desc: 'API asynchrone optimisée pour le traitement haute fréquence des données de télémesure.' },
              { icon: Globe,      label: 'Frontend',   tech: 'React 18 + Three.js',   color: '#0ea5e9', desc: 'Dashboard immersif avec jumeaux numériques 3D accélérés matériellement.' },
              { icon: Wifi,       label: 'IoT Layer',  tech: 'MQTT + Wokwi Sim',      color: '#8b5cf6', desc: 'Deux nœuds capteurs (sol/irrigation + ruche/météo) avec fallback simulé.' },
              { icon: Eye,        label: 'CV Engine',  tech: 'YOLO v8 + OpenCV',      color: '#f59e0b', desc: '5 catégories de détection : feuilles, citronnier, oranger, olivier, insectes.' },
              { icon: Activity,   label: 'AI Engine',  tech: 'Labess-7B + RAG',       color: '#dc2626', desc: 'LLM souverain Tunisien générant des analyses en Darija avec contexte UTAP.' },
              { icon: ShieldCheck,label: 'Security',   tech: 'JWT + RBAC',            color: '#06b6d4', desc: "Authentification robuste avec contrôle d'accès basé sur les rôles (Admin/Ouvrier)." },
            ].map(({ icon: Icon, label, tech, color, desc }) => (
              <div key={label} className="ap-arch-item">
                <div className="ap-arch-item-icon" style={{ background: `${color}15`, color }}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className="ap-arch-item-label">{label}</div>
                  <div className="ap-arch-item-tech" style={{ color }}>{tech}</div>
                  <div className="ap-arch-item-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════ LIVESTOCK ═══════════ */}
        <div className="ap-section-label">{t('project.livestock_title', 'ÉCOSYSTÈME BÉTAIL NUMÉRIQUE')}</div>
        <p className="ap-section-sub">Monitoring haute précision pour 6 espèces d'élevage</p>

        <div className="ap-livestock-grid">
          {LIVESTOCK.map((animal) => (
            <div key={animal.sp} className="ap-animal-card">
              <div className="ap-animal-model-wrap">
                <ThreeAnimalModel modelUrl={animal.url} rotation={animal.rotation} />
              </div>
              <div className="ap-animal-body">
                <div className="ap-animal-header">
                  <span className="ap-animal-dot" style={{ background: animal.color }} />
                  <span className="ap-animal-emoji">{animal.emoji}</span>
                  <span className="ap-animal-name">{animal.sp}</span>
                  <span className="ap-animal-badge" style={{ background: `${animal.color}18`, color: animal.color }}>
                    <CheckCircle2 size={9} /> LIVE
                  </span>
                </div>
                <p className="ap-animal-desc">{animal.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ═══════════ FOOTER ═══════════ */}
        <div className="ap-footer">
          <div className="ap-footer-logo">
            <Leaf size={20} color="#16a34a" />
            <span>Smart Farm AI Enterprise</span>
          </div>
          <div className="ap-footer-badges">
            <span className="ap-footer-badge"><Star size={10} /> v3.0.0-Stable</span>
            <span className="ap-footer-badge"><ShieldCheck size={10} /> Production Ready</span>
            <span className="ap-footer-badge"><Zap size={10} /> AI-Powered</span>
          </div>
          <div className="ap-footer-copy">&copy; 2026 Smart Farm AI Enterprise · All rights reserved</div>
        </div>

      </div>
    </>
  );
};

export default AboutProject;
