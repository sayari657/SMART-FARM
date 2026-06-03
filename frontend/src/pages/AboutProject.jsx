import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf, Cpu, Eye, BarChart3, ShieldCheck, Layers,
  Zap, Globe, Database, Wifi, Activity,
  ArrowRight, Star,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import aboutHeroImg from '../assets/about-hero.jpg';

/* ─── Aquarelle images (new, not used elsewhere) ──────────────────── */
import beeImg     from '../assets/bee/bee-aquarelle.jpg';
import cowImg     from '../assets/cow/cow-aquarelle.jpg';
import sheepImg   from '../assets/sheep/sheep-aquarelle.webp';
import goatImg    from '../assets/goat/goat-aquarelle.jpg';
import poultryImg from '../assets/poultry/poultry-aquarelle.jpg';
import rabbitImg  from '../assets/rabbit/rabbit-aquarelle.jpg';

/* ─── Species icon badges ──────────────────────────────────────────── */
import beeIconImg     from '../assets/bee/bee-icon.png';
import cowIconImg     from '../assets/cow/cow-icon.png';
import sheepIconImg   from '../assets/sheep/sheep-icon.png';
import goatIconImg    from '../assets/goat/goat-icon.png';
import poultryIconImg from '../assets/poultry/poultry-icon.png';
import rabbitIconImg  from '../assets/rabbit/rabbit-icon.png';

const LIVESTOCK = [
  {
    sp: 'Bee', key: 'bee', img: beeImg, icon: beeIconImg,
    color: '#d97706', route: '/aboutbee',
    desc: 'Surveillance acoustique des ruches · Diagnostics santé IA · Prévision automatique de récolte du miel.',
    tags: ['Acoustique', 'Récolte IA', 'IoT Ruche'],
  },
  {
    sp: 'Cow', key: 'cow', img: cowImg, icon: cowIconImg,
    color: '#7c3aed', route: '/aboutcow',
    desc: 'Analyse rumination · Prévision production laitière · Monitoring biométrique bovin complet via capteurs MQTT.',
    tags: ['Rumination', 'Lait IA', 'Biométrie'],
  },
  {
    sp: 'Goat', key: 'goat', img: goatImg, icon: goatIconImg,
    color: '#dc2626', route: '/aboutgoat',
    desc: 'Gestion troupeau caprin · Indexation activité par agilité · Suivi production laitière qualité A+.',
    tags: ['Agilité', 'Lait A+', 'Troupeau IA'],
  },
  {
    sp: 'Poultry', key: 'poultry', img: poultryImg, icon: poultryIconImg,
    color: '#0891b2', route: '/aboutpoultry',
    desc: 'Contrôle environnement avicole · Suivi automatisé production œufs · Détection précoce pathologies YOLO v8.',
    tags: ['Environnement', 'YOLO v8', 'Production'],
  },
  {
    sp: 'Rabbit', key: 'rabbit', img: rabbitImg, icon: rabbitIconImg,
    color: '#db2777', route: '/aboutrabbit',
    desc: 'Monitoring reproduction lagomorphe · Indice prolificité optimisé · Gestion intelligente des clapiers IA.',
    tags: ['Reproduction', 'Prolificité', 'IA Clapier'],
  },
  {
    sp: 'Sheep', key: 'sheep', img: sheepImg, icon: sheepIconImg,
    color: '#059669', route: '/aboutsheep',
    desc: 'Analyse comportement de pâturage · Suivi poids et croissance du lot · Prévision qualité laine.',
    tags: ['Pâturage GPS', 'Laine IA', 'Croissance'],
  },
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
  { icon: Cpu,       title: 'IoT & Capteurs',       desc: 'Surveillance environnementale temps réel via protocoles MQTT basse latence et capteurs haute précision (température, humidité, pH, CO₂).', color: '#3b82f6', bg: '#eff6ff' },
  { icon: Eye,       title: 'Vision par Ordinateur', desc: 'Détection YOLO v8 pour le suivi automatisé du bétail, diagnostics santé visuelle et sécurité périmétrique 24h/24.', color: '#10b981', bg: '#f0fdf4' },
  { icon: BarChart3, title: 'Insights Prédictifs',   desc: 'Algorithmes ML et LLM Labess-7B qui prévoient les rendements, identifient les maladies et optimisent les ressources agricoles.', color: '#8b5cf6', bg: '#f5f3ff' },
];

/* ─── Animal Card ──────────────────────────────────────────────────── */
function AnimalCard({ animal, onNavigate }) {
  const [hov, setHov] = useState(false);
  const c = animal.color;

  return (
    <div
      className="ap-animal-card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        border: `1.5px solid ${hov ? c + '50' : 'var(--color-border)'}`,
        boxShadow: hov ? `0 16px 40px ${c}18` : undefined,
        transform: hov ? 'translateY(-5px)' : 'none',
        transition: 'all 0.22s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Aquarelle image — cover for painted backgrounds ── */}
      <div style={{
        width: '100%',
        height: 220,
        overflow: 'hidden',
        position: 'relative',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <img
          src={animal.img}
          alt={animal.sp}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
            display: 'block',
            transition: 'transform 0.4s ease',
            transform: hov ? 'scale(1.06)' : 'scale(1)',
          }}
        />
        {/* Subtle color vignette on hover */}
        {hov && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `linear-gradient(to top, ${c}22 0%, transparent 60%)`,
          }} />
        )}
      </div>

      {/* ── Card body ── */}
      <div className="ap-animal-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Header: dot + icon + name + LIVE */}
        <div className="ap-animal-header">
          <span className="ap-animal-dot" style={{ background: c }} />
          <img src={animal.icon} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span className="ap-animal-name">{animal.sp}</span>
          <span className="ap-animal-badge" style={{ background: `${c}15`, color: c, border: `1px solid ${c}30` }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: c,
              display: 'inline-block', animation: 'livePulse 2s ease-in-out infinite',
            }} />
            LIVE
          </span>
        </div>

        {/* Description */}
        <p className="ap-animal-desc" style={{ flex: 1 }}>{animal.desc}</p>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
          {animal.tags.map(tag => (
            <span key={tag} style={{
              fontSize: 10, fontWeight: 700, color: c,
              background: `${c}0f`, border: `1px solid ${c}25`,
              padding: '2px 9px', borderRadius: 99, letterSpacing: 0.3,
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* En savoir plus button */}
        <button
          onClick={() => onNavigate(animal.route)}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '10px 16px', borderRadius: 10,
            border: `1.5px solid ${c}30`,
            background: hov ? `${c}12` : `${c}08`,
            color: c, fontSize: 12, fontWeight: 800,
            cursor: 'pointer', transition: 'all 0.15s',
            letterSpacing: 0.2,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = `${c}1e`;
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = hov ? `${c}12` : `${c}08`;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          En savoir plus <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

/* ─── Main page ────────────────────────────────────────────────────── */
const AboutProject = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const rtl = i18n.language === 'ar';

  return (
    <>
      <Navbar title={t('project.title')} subtitle={t('project.subtitle')} />

      <div className="page-content ap-page" style={{ direction: rtl ? 'rtl' : 'ltr' }}>

        {/* ═══════════ HERO ═══════════ */}
        <div className="ap-hero">
          <img
            src={aboutHeroImg}
            alt="Smart Farm AI"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              pointerEvents: 'none',
            }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(120deg, rgba(10,50,20,.78) 0%, rgba(16,83,45,.62) 55%, rgba(20,120,60,.30) 100%)',
            pointerEvents: 'none',
          }} />
          <div className="ap-hero-bg" />
          <div className="ap-hero-content" style={{ position: 'relative', zIndex: 3 }}>
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
                { val: '6',  label: 'Espèces', icon: '🐾' },
                { val: '2',  label: 'Nœuds IoT', icon: '📡' },
                { val: 'v8', label: 'YOLO',    icon: '🎯' },
                { val: '7B', label: 'LLM',     icon: '🧠' },
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
              { icon: Database,    label: 'Backend',   tech: 'FastAPI + PostgreSQL', color: '#16a34a', desc: 'API asynchrone optimisée pour le traitement haute fréquence des données de télémesure.' },
              { icon: Globe,       label: 'Frontend',  tech: 'React 18 + Three.js',  color: '#0ea5e9', desc: 'Dashboard immersif avec jumeaux numériques 3D accélérés matériellement.' },
              { icon: Wifi,        label: 'IoT Layer', tech: 'MQTT + Wokwi Sim',     color: '#8b5cf6', desc: 'Deux nœuds capteurs (sol/irrigation + ruche/météo) avec fallback simulé.' },
              { icon: Eye,         label: 'CV Engine', tech: 'YOLO v8 + OpenCV',     color: '#f59e0b', desc: '5 catégories de détection : feuilles, citronnier, oranger, olivier, insectes.' },
              { icon: Activity,    label: 'AI Engine', tech: 'Labess-7B + RAG',      color: '#dc2626', desc: 'LLM souverain Tunisien générant des analyses en Darija avec contexte UTAP.' },
              { icon: ShieldCheck, label: 'Security',  tech: 'JWT + RBAC',           color: '#06b6d4', desc: "Authentification robuste avec contrôle d'accès basé sur les rôles (Admin/Ouvrier)." },
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

        {/* ═══════════ LIVESTOCK — Écosystème du Bétail ═══════════ */}
        <div className="ap-section-label">
          {t('project.livestock_title', 'ÉCOSYSTÈME DU BÉTAIL NUMÉRIQUE')}
        </div>
        <p className="ap-section-sub">
          Monitoring haute précision pour 6 espèces d'élevage — images frontales · badges LIVE · accès module direct
        </p>

        <div className="ap-livestock-grid">
          {LIVESTOCK.map(animal => (
            <AnimalCard key={animal.key} animal={animal} onNavigate={navigate} />
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

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.45; transform: scale(0.75); }
        }
      `}</style>
    </>
  );
};

export default AboutProject;
