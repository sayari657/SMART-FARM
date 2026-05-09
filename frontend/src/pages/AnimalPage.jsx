import { useState, useEffect, useCallback } from 'react';
import {
  Activity, AlertTriangle, TrendingUp, Bell, BarChart2,
  Heart, DollarSign, Eye, Calendar, CheckCircle, Shield,
  Users, ChevronRight, Droplets, Zap, Package,
  Milk, Beef, Stethoscope, Plus, X, Save, Bird,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import AIScanner from '../components/AIScanner';
import ExpertAssistant from '../components/expert/ExpertAssistant';
import { animalsAPI, workerTasksAPI, farmWorkersAPI, farmsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ANIM_CSS = `
  @keyframes ap-fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ap-pulse  { 0%,100%{opacity:1} 50%{opacity:.55} }
  .ap-f1{animation:ap-fadeUp .45s ease both}
  .ap-f2{animation:ap-fadeUp .45s .08s ease both}
  .ap-f3{animation:ap-fadeUp .45s .16s ease both}
  .ap-pulse{animation:ap-pulse 2s infinite}
  @media(max-width:900px){
    .ap-2col{grid-template-columns:1fr !important}
    .ap-sticky{position:static !important}
    .ap-5kpi{grid-template-columns:repeat(2,1fr) !important}
    .ap-feat{grid-template-columns:1fr 1fr !important}
    .ap-stats4{grid-template-columns:1fr 1fr !important}
  }
  @media(max-width:600px){
    .ap-feat{grid-template-columns:1fr !important}
    .ap-5kpi{grid-template-columns:1fr 1fr !important}
  }
`;

// ─── Hero images per species ─────────────────────────────────────────────────
const HERO_IMG = {
  cow:    null,
  sheep:  '/sheep_monitoring_ia.png',
  goat:   '/goat_monitoring_ia.png',
  rabbit: '/rabbit_monitoring_ia.png',
};

// ─── Species config ──────────────────────────────────────────────────────────
const SC = {
  cow: {
    color:'#1d4ed8', dark:'#1e40af', emoji:'🐄',
    name:'Bovins', nameEn:'Cattle', nameAr:'الأبقار',
    title:'Gestion des Bovins', subtitle:'Suivi laitier, reproduction et santé — optimisé par IA',
    apiSpecies:'cow', totalDays:305, cycleLabel:'Cycle Lactation (305 j)',
    stats:[
      {label:'Vaches Actives',    icon:Activity,     color:'#1d4ed8'},
      {label:'Production / Jour', icon:Droplets,     color:'#0ea5e9'},
      {label:'Mortalité',         icon:AlertTriangle,color:'#f59e0b'},
      {label:'Taux Gestation',    icon:Heart,        color:'#10b981'},
    ],
    features:[
      {icon:Milk,       color:'#1d4ed8',title:'Suivi Laitier',      desc:'Production journalière par animal, courbes de lactation et alertes de chute.'},
      {icon:Heart,      color:'#10b981',title:'Santé & Vaccins',    desc:'Carnet vaccinal BVD/IBR/Leptospirose, journal vétérinaire et alertes.'},
      {icon:Activity,   color:'#0ea5e9',title:'Reproduction',       desc:'Suivi chaleurs, insémination, gestation et vêlages.'},
      {icon:BarChart2,  color:'#7c3aed',title:'Analytique',         desc:'Courbes lactation, index laitiers et rentabilité par animal.'},
      {icon:Users,      color:'#f59e0b',title:'Équipe & Tâches',    desc:'Assignation traites, soins et nettoyage — historique complet.'},
      {icon:DollarSign, color:'#059669',title:'Comptabilité',       desc:'Ventes lait/animaux, frais aliments et vétérinaires en temps réel.'},
    ],
    phases:[
      {phase:'Transition',      days:'J1–J21',    p1:'15–20 kg MS/j', p2:'2,8–3,1 UFL',  p3:'PDIE 110g/UFL', color:'#1d4ed8'},
      {phase:'Pic Production',  days:'J22–J90',   p1:'22–26 kg MS/j', p2:'3,0–3,2 UFL',  p3:'PDIE 115g/UFL', color:'#0ea5e9'},
      {phase:'Milieu Lactation',days:'J91–J200',  p1:'18–22 kg MS/j', p2:'2,7–2,9 UFL',  p3:'PDIE 105g/UFL', color:'#7c3aed'},
      {phase:'Fin Lactation',   days:'J201–J305', p1:'14–18 kg MS/j', p2:'2,5–2,7 UFL',  p3:'Tarir J270',    color:'#059669'},
    ],
    phaseLabels:['Ration','Énergie','Protéine'],
    lifecycle:[
      {key:'transition', label:'Transition',    minDay:1,   maxDay:21 },
      {key:'peak',       label:'Pic Lait',       minDay:22,  maxDay:90 },
      {key:'mid',        label:'Milieu',          minDay:91,  maxDay:200},
      {key:'late',       label:'Fin Lactation',  minDay:201, maxDay:270},
      {key:'dry',        label:'Tarissement',    minDay:271, maxDay:305},
    ],
    vaccines:[
      {day:1,  vaccine:'IBR + BVD (Bovilis)',   route:'Injection IM', note:'Primovaccination'},
      {day:21, vaccine:'IBR + BVD rappel',       route:'Injection IM', note:'3 sem. après J1'},
      {day:90, vaccine:'Leptospirose',           route:'Injection SC', note:'Bovilis Leptavoid'},
      {day:180,vaccine:'Fièvre aphteuse (FMDV)', route:'Injection IM', note:'Zone à risque'},
      {day:270,vaccine:'Rappel annuel BVD',      route:'Injection IM', note:'Avant tarissement'},
      {day:290,vaccine:'Colibacillose veau',     route:'Injection IM', note:'Vaches gestantes'},
    ],
    perfTable:[
      {age:'Mois 1', v1:'22 L',v2:'550 kg',v3:'3,8%',v4:'3,3%'},
      {age:'Mois 2', v1:'28 L',v2:'700 kg',v3:'3,9%',v4:'3,2%'},
      {age:'Mois 3', v1:'30 L',v2:'750 kg',v3:'4,0%',v4:'3,2%'},
      {age:'Mois 6', v1:'26 L',v2:'650 kg',v3:'4,1%',v4:'3,3%'},
      {age:'Mois 10',v1:'18 L',v2:'450 kg',v3:'4,2%',v4:'3,4%'},
    ],
    perfCols:['Période','Lait/j','Poids vif','TB (%)','TP (%)'],
    quickEntries:['milk','health','feed','repro','sale'],
    kpis:[
      {icon:'🐄',label:'Effectif',   key:'count'},
      {icon:'🥛',label:'Lait/Jour',  key:'production'},
      {icon:'📉',label:'Mortalité',  key:'deaths'},
      {icon:'💰',label:'CA Cumulé',  key:'revenue'},
      {icon:'💉',label:'Prochain vac',key:'nextvac'},
    ],
  },
  sheep:{
    color:'#7c3aed', dark:'#6d28d9', emoji:'🐑',
    name:'Ovins', nameEn:'Sheep', nameAr:'الأغنام',
    title:'Gestion des Ovins', subtitle:'Reproduction, laine et santé — suivi complet du troupeau',
    apiSpecies:'sheep', totalDays:210, cycleLabel:'Cycle Reproductif (210 j)',
    stats:[
      {label:'Brebis Actives',  icon:Activity,     color:'#7c3aed'},
      {label:'Agneaux/Saison',  icon:TrendingUp,   color:'#10b981'},
      {label:'Mortalité',       icon:AlertTriangle,color:'#f59e0b'},
      {label:'Taux Mise-Bas',   icon:Heart,        color:'#0ea5e9'},
    ],
    features:[
      {icon:Heart,      color:'#7c3aed',title:'Suivi Reproduction', desc:'Cycles de lutte, gestation, mise-bas et sevrage — alertes automatiques.'},
      {icon:Activity,   color:'#10b981',title:'Santé Troupeau',     desc:'Clavelée, brucellose, piétin — protocoles préventifs et alertes.'},
      {icon:Beef,       color:'#f59e0b',title:'Gestion Agneaux',    desc:'Pesées, croissance et sélection des reproducteurs.'},
      {icon:BarChart2,  color:'#0ea5e9',title:'Analytique Laine',   desc:'Suivi tonte, qualité laine et rendement par animal.'},
      {icon:Users,      color:'#f59e0b',title:'Équipe & Tâches',    desc:'Planning berger, traitements et calendrier.'},
      {icon:DollarSign, color:'#059669',title:'Rentabilité',        desc:'Vente agneaux, laine et lait — bilan par troupeau.'},
    ],
    phases:[
      {phase:'Lutte / Saillie', days:'J1–J30',   p1:'Effet bélier',   p2:'1 bélier/30',   p3:'Sync. hormonale',color:'#7c3aed'},
      {phase:'Gestation Début', days:'J31–J90',  p1:'1,8 kg MS/j',    p2:'Min. stress',    p3:'Échographie J45',color:'#6d28d9'},
      {phase:'Gestation Fin',   days:'J91–J145', p1:'2,2 kg MS/j',    p2:'+30% besoins',  p3:'Vitamines A/D/E',color:'#10b981'},
      {phase:'Mise-Bas/Allait.',days:'J146–J210',p1:'2,5 kg MS/j',    p2:'Surveillance 24h',p3:'Colostrum J1',  color:'#0ea5e9'},
    ],
    phaseLabels:['Alimentation','Paramètre','Action clé'],
    lifecycle:[
      {key:'lutte',     label:'Lutte',        minDay:1,  maxDay:30 },
      {key:'gest1',     label:'Gest. Début',  minDay:31, maxDay:90 },
      {key:'gest2',     label:'Gest. Fin',    minDay:91, maxDay:145},
      {key:'lactation', label:'Allaitement',  minDay:146,maxDay:210},
    ],
    vaccines:[
      {day:1,  vaccine:'Clavelée (Capripox)',     route:'Injection SC', note:'Avant lutte'},
      {day:14, vaccine:'Brucellose (Rev.1)',       route:'Injection SC', note:'Femelles < 6 mois'},
      {day:60, vaccine:'Entérotoxémie (Covexin)', route:'Injection SC', note:'En gestation'},
      {day:120,vaccine:'Pasteurellose',            route:'Injection SC', note:'Avant mise-bas'},
      {day:150,vaccine:'Toxémie gestation',        route:'Prophylaxie',  note:'Propylène glycol'},
      {day:200,vaccine:'Fièvre aphteuse',          route:'Injection IM', note:'Rappel annuel'},
    ],
    perfTable:[
      {age:'Naissance',v1:'4,2 kg',v2:'—',    v3:'Colostrum',  v4:'—'},
      {age:'J7',       v1:'5,8 kg',v2:'225 g/j',v3:'Lait mat.',v4:'—'},
      {age:'J21',      v1:'8,5 kg',v2:'340 g/j',v3:'Lait+démar.',v4:'1,3'},
      {age:'J42',      v1:'13 kg', v2:'450 g/j',v3:'Démarrage', v4:'1,5'},
      {age:'J70',      v1:'20 kg', v2:'600 g/j',v3:'Croissance', v4:'1,8'},
    ],
    perfCols:['Âge','Poids','GMQ','Alimentation','IC'],
    quickEntries:['repro','health','feed','weight','sale'],
    kpis:[
      {icon:'🐑',label:'Brebis',    key:'count'},
      {icon:'🐣',label:'Agneaux',   key:'production'},
      {icon:'📉',label:'Mortalité', key:'deaths'},
      {icon:'💰',label:'CA Cumulé', key:'revenue'},
      {icon:'💉',label:'Prochain vac',key:'nextvac'},
    ],
  },
  goat:{
    color:'#dc2626', dark:'#b91c1c', emoji:'🐐',
    name:'Caprins', nameEn:'Goats', nameAr:'الماعز',
    title:'Gestion des Caprins', subtitle:'Lait, reproduction et santé — pilotage précis du troupeau',
    apiSpecies:'goat', totalDays:305, cycleLabel:'Cycle Caprin (305 j)',
    stats:[
      {label:'Chèvres Actives', icon:Activity,     color:'#dc2626'},
      {label:'Lait / Jour',     icon:Droplets,     color:'#0ea5e9'},
      {label:'Mortalité',       icon:AlertTriangle,color:'#f59e0b'},
      {label:'Chevrettes Nées', icon:Heart,        color:'#10b981'},
    ],
    features:[
      {icon:Milk,       color:'#dc2626',title:'Production Laitière', desc:'Suivi traite quotidienne, taux butyreux et protéique.'},
      {icon:Heart,      color:'#10b981',title:'Reproduction',        desc:'Lutte, gestation, chevrotage et lactation.'},
      {icon:Stethoscope,color:'#7c3aed',title:'Santé Troupeau',      desc:'Brucellose, CAEV, pied pourri — alertes préventives.'},
      {icon:BarChart2,  color:'#0ea5e9',title:'Analytique',          desc:'Courbes de lactation, index et rentabilité.'},
      {icon:Users,      color:'#f59e0b',title:'Équipe & Tâches',     desc:'Planning traite, soins et calendrier chevriers.'},
      {icon:DollarSign, color:'#059669',title:'Comptabilité',        desc:'Ventes lait, fromage et animaux en temps réel.'},
    ],
    phases:[
      {phase:'Lutte / Saillie', days:'J1–J25',   p1:'Effet bouc',   p2:'1 bouc/25',      p3:'Sync. progestag.',color:'#dc2626'},
      {phase:'Gestation Début', days:'J26–J80',  p1:'1,5 kg MS/j',  p2:'Min. stress',     p3:'Écho J40',       color:'#b91c1c'},
      {phase:'Gestation Fin',   days:'J81–J145', p1:'1,8 kg MS/j',  p2:'+25% besoins',   p3:'Vitamines A/D/E',color:'#10b981'},
      {phase:'Lactation',       days:'J146–J305',p1:'2,2 kg MS/j',  p2:'2 traites/jour',  p3:'Sevrage J60',    color:'#0ea5e9'},
    ],
    phaseLabels:['Alimentation','Paramètre','Action clé'],
    lifecycle:[
      {key:'lutte',     label:'Lutte',        minDay:1,  maxDay:25 },
      {key:'gest1',     label:'Gest. Début',  minDay:26, maxDay:80 },
      {key:'gest2',     label:'Gest. Fin',    minDay:81, maxDay:145},
      {key:'lactation', label:'Lactation',    minDay:146,maxDay:305},
    ],
    vaccines:[
      {day:1,  vaccine:'Clavelée (Capripox)',      route:'Injection SC',   note:'Avant lutte'},
      {day:14, vaccine:'Brucellose (Rev.1)',        route:'Injection SC',   note:'Femelles < 6 mois'},
      {day:60, vaccine:'Entérotoxémie + Tétanos',  route:'Injection SC',   note:'En gestation'},
      {day:120,vaccine:'Pasteurellose',             route:'Injection SC',   note:'Avant chevrotage'},
      {day:180,vaccine:'Fièvre aphteuse',           route:'Injection IM',   note:'Zone à risque'},
      {day:270,vaccine:'Rappel annuel CAEV',        route:'Contrôle séro.', note:'Arthrite-Encéphalite'},
    ],
    perfTable:[
      {age:'Naissance',v1:'3,2 kg',v2:'—',     v3:'Colostrum',   v4:'—'},
      {age:'J7',       v1:'4,5 kg',v2:'185 g/j',v3:'Lait mat.',  v4:'—'},
      {age:'J21',      v1:'7,0 kg',v2:'300 g/j',v3:'Lait+démar.',v4:'1,2'},
      {age:'J42',      v1:'11 kg', v2:'400 g/j',v3:'Démarrage',  v4:'1,4'},
      {age:'J90',      v1:'22 kg', v2:'550 g/j',v3:'Croissance', v4:'1,7'},
    ],
    perfCols:['Âge','Poids','GMQ','Alimentation','IC'],
    quickEntries:['milk','health','feed','repro','sale'],
    kpis:[
      {icon:'🐐',label:'Effectif',   key:'count'},
      {icon:'🥛',label:'Lait/Jour',  key:'production'},
      {icon:'📉',label:'Mortalité',  key:'deaths'},
      {icon:'💰',label:'CA Cumulé',  key:'revenue'},
      {icon:'💉',label:'Prochain vac',key:'nextvac'},
    ],
  },
  rabbit:{
    color:'#0d9488', dark:'#0f766e', emoji:'🐰',
    name:'Cuniculture', nameEn:'Rabbits', nameAr:'الأرانب',
    title:'Gestion des Lapins', subtitle:'Reproduction intensive, santé et performance — cycle court optimisé',
    apiSpecies:'rabbit', totalDays:63, cycleLabel:'Cycle Cunicole (63 j)',
    stats:[
      {label:'Lapines Actives',  icon:Activity,     color:'#0d9488'},
      {label:'Lapereaux/Mois',   icon:TrendingUp,   color:'#10b981'},
      {label:'Mortalité',        icon:AlertTriangle,color:'#f59e0b'},
      {label:'GMQ Moyen',        icon:Zap,          color:'#7c3aed'},
    ],
    features:[
      {icon:Heart,      color:'#0d9488',title:'Reproduction',        desc:'Cycles 42 jours, taux de fertilité, lapereaux sevrés.'},
      {icon:TrendingUp, color:'#10b981',title:'Croissance',          desc:'GMQ, pesées hebdomadaires et indice de consommation.'},
      {icon:Activity,   color:'#7c3aed',title:'Santé Lapins',        desc:'Myxomatose, VHD, entéropathie — protocoles préventifs.'},
      {icon:BarChart2,  color:'#0ea5e9',title:'Analytique',          desc:'Productivité numérique, taux de sevrage et rentabilité.'},
      {icon:Users,      color:'#f59e0b',title:'Équipe & Tâches',     desc:'Visites, traitements, saillie et abattage planifiés.'},
      {icon:DollarSign, color:'#059669',title:'Rentabilité',         desc:'Coût lapin produit, marge brute et seuil de rentabilité.'},
    ],
    phases:[
      {phase:'Saillie',           days:'J1',         p1:'Ratio 1:8',      p2:'Matin de préf.',  p3:'Palpage J12',    color:'#0d9488'},
      {phase:'Gestation',         days:'J2–J28',     p1:'180 g/j',        p2:'Nid J27',         p3:'Repos digestif', color:'#0f766e'},
      {phase:'Mise-Bas/Allait.',  days:'J29–J35',    p1:'300 g/j',        p2:'Colostrum J1',    p3:'8–10 lapereaux', color:'#10b981'},
      {phase:'Lactation/Sevr.',   days:'J36–J63',    p1:'350 g/j (pic)',  p2:'Sevrage J35',     p3:'Aliment grow.',  color:'#7c3aed'},
    ],
    phaseLabels:['Alimentation','Action','Note'],
    lifecycle:[
      {key:'saillie',   label:'Saillie',       minDay:1,  maxDay:1 },
      {key:'gestation', label:'Gestation',     minDay:2,  maxDay:28},
      {key:'mise_bas',  label:'Mise-Bas',      minDay:29, maxDay:35},
      {key:'lactation', label:'Lact./Sevr.',   minDay:36, maxDay:63},
    ],
    vaccines:[
      {day:1,  vaccine:'Myxomatose (vaccin vivant)',  route:'ID ou SC',      note:'Dès 5 semaines'},
      {day:28, vaccine:'VHD (Pestivirose)',            route:'Injection SC',  note:'Lapereaux > 6 sem.'},
      {day:35, vaccine:'Myxo + VHD bivalent',         route:'Injection SC',  note:'Mères avant saillie'},
      {day:56, vaccine:'Rappel VHD',                   route:'Injection SC',  note:'Semestriel'},
    ],
    perfTable:[
      {age:'Naissance',v1:'55 g',  v2:'—',     v3:'Lait mat.',     v4:'—'},
      {age:'J7',       v1:'130 g', v2:'107 g/j',v3:'Lait mat.',    v4:'—'},
      {age:'J21',      v1:'280 g', v2:'100 g/j',v3:'Lait+granulé',v4:'—'},
      {age:'J35',      v1:'600 g', v2:'45 g/j', v3:'Granulé grow.',v4:'2,8'},
      {age:'J77',      v1:'2700 g',v2:'55 g/j', v3:'Granulé fattg.',v4:'3,2'},
    ],
    perfCols:['Âge','Poids','GMQ','Alimentation','IC'],
    quickEntries:['repro','health','weight','feed','sale'],
    kpis:[
      {icon:'🐰',label:'Lapines',   key:'count'},
      {icon:'🐣',label:'Lapereaux', key:'production'},
      {icon:'📉',label:'Mortalité', key:'deaths'},
      {icon:'💰',label:'CA Cumulé', key:'revenue'},
      {icon:'💉',label:'Prochain vac',key:'nextvac'},
    ],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getBatchAge(d) {
  if (!d) return null;
  return Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 86400000) + 1);
}

function SectionHeader({ title, accent }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
      <div style={{ width:4, height:22, borderRadius:999, background:accent, flexShrink:0 }} />
      <h2 style={{ fontSize:17, fontWeight:800, margin:0 }}>{title}</h2>
    </div>
  );
}

function TabBtn({ id, label, icon:Icon, active, onClick, color }) {
  return (
    <button onClick={() => onClick(id)} style={{
      display:'flex', alignItems:'center', gap:6,
      padding:'9px 18px', borderRadius:999, border:'none',
      background: active ? color : 'transparent',
      color: active ? 'white' : 'var(--color-text-2)',
      fontWeight: active ? 700 : 500, fontSize:13,
      cursor:'pointer', transition:'all .18s',
      boxShadow: active ? `0 3px 10px ${color}44` : 'none',
      whiteSpace:'nowrap',
    }}>
      <Icon size={14} />{label}
    </button>
  );
}

// ─── AperçuTab ────────────────────────────────────────────────────────────────
function AperçuTab({ cfg, animals, onGoToAnimaux }) {
  const C = cfg.color;
  const liveCount = animals.length;

  return (
    <div>
      {/* Hero gradient */}
      <div className="ap-f1" style={{
        background:`linear-gradient(135deg, ${C} 0%, ${cfg.dark} 60%, ${C}cc 100%)`,
        borderRadius:20, padding:'52px 44px', marginBottom:28,
        position:'relative', overflow:'hidden', color:'white',
      }}>
        {/* Decorative circles */}
        <div style={{position:'absolute',top:-50,right:-50,width:180,height:180,borderRadius:'50%',background:'rgba(255,255,255,.06)'}} />
        <div style={{position:'absolute',bottom:-30,left:-30,width:140,height:140,borderRadius:'50%',background:'rgba(255,255,255,.04)'}} />
        {/* Species hero image */}
        {HERO_IMG[cfg.apiSpecies] && (
          <img
            src={HERO_IMG[cfg.apiSpecies]}
            alt={cfg.name}
            style={{
              position:'absolute', right:0, top:0, height:'100%', width:'45%',
              objectFit:'cover', opacity:.18,
              maskImage:'linear-gradient(to left, rgba(0,0,0,.8), transparent)',
              WebkitMaskImage:'linear-gradient(to left, rgba(0,0,0,.8), transparent)',
            }}
          />
        )}
        {/* Emoji fallback (cow) */}
        {!HERO_IMG[cfg.apiSpecies] && (
          <div style={{position:'absolute',right:60,top:'50%',transform:'translateY(-50%)',fontSize:120,opacity:.1,userSelect:'none'}}>
            {cfg.emoji}
          </div>
        )}
        <div style={{position:'relative',zIndex:2,maxWidth:600}}>
          <div className="ap-f1" style={{
            display:'inline-flex', alignItems:'center', gap:6,
            background:'rgba(255,255,255,.15)', backdropFilter:'blur(8px)',
            borderRadius:999, padding:'5px 14px', marginBottom:18,
            fontSize:12, fontWeight:600, border:'1px solid rgba(255,255,255,.2)',
          }}>
            {cfg.emoji} Smart Farm AI — {cfg.name}
          </div>
          <h1 className="ap-f2" style={{fontSize:34,fontWeight:900,lineHeight:1.2,margin:'0 0 14px'}}>
            {cfg.title}
          </h1>
          <p className="ap-f3" style={{fontSize:14,opacity:.88,lineHeight:1.75,margin:'0 0 28px'}}>
            {cfg.subtitle}
          </p>
          {liveCount > 0 && (
            <div className="ap-f3" style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:28}}>
              {[
                {v:liveCount.toLocaleString(), l:'animaux suivis'},
                {v:'IA Active', l:'surveillance'},
                {v:'Temps réel', l:'alertes'},
              ].map(k => (
                <div key={k.l} className="ap-pulse" style={{
                  background:'rgba(255,255,255,.15)', backdropFilter:'blur(6px)',
                  borderRadius:999, padding:'5px 14px',
                  fontSize:13, fontWeight:700, border:'1px solid rgba(255,255,255,.25)',
                }}>
                  <span style={{fontWeight:900}}>{k.v}</span>
                  <span style={{opacity:.8, marginLeft:5}}>{k.l}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={onGoToAnimaux} style={{
            background:'white', color:C, border:'none',
            borderRadius:999, padding:'11px 26px',
            fontWeight:800, fontSize:14, cursor:'pointer',
            display:'inline-flex', alignItems:'center', gap:8,
            boxShadow:'0 4px 20px rgba(0,0,0,.15)',
          }}>
            Gérer les {cfg.name} <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="ap-f2 ap-stats4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:28}}>
        {cfg.stats.map((s, i) => (
          <div key={s.label} className="card" style={{textAlign:'center',padding:'20px 14px'}}>
            <div style={{width:44,height:44,borderRadius:12,margin:'0 auto 12px',
              background:`${s.color}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <s.icon size={20} color={s.color} />
            </div>
            <div style={{fontSize:26,fontWeight:800,color:s.color}}>
              {i === 0 ? (liveCount || '—') : '—'}
            </div>
            <div style={{fontSize:12,color:'var(--color-text-3)',marginTop:4,fontWeight:500}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="ap-f3">
        <SectionHeader title="Fonctionnalités du Module" accent={C} />
        <div className="ap-feat" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:32}}>
          {cfg.features.map(f => (
            <div key={f.title} className="card" style={{borderLeft:`3px solid ${f.color}`,padding:20}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div style={{width:36,height:36,borderRadius:8,background:`${f.color}18`,
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <f.icon size={17} color={f.color} />
                </div>
                <span style={{fontWeight:700,fontSize:14}}>{f.title}</span>
              </div>
              <p style={{fontSize:12,color:'var(--color-text-3)',lineHeight:1.6,margin:0}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Animal list preview */}
      {liveCount > 0 && (
        <div>
          <SectionHeader title={`Registre — ${cfg.name} (${liveCount})`} accent={C} />
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
            {animals.slice(0, 12).map(a => (
              <div key={a.id} className="card" style={{padding:16,borderLeft:`3px solid ${C}`}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontWeight:700,fontSize:14}}>{a.name || `#${a.id}`}</span>
                  {a.tag_id && <span style={{fontSize:11,color:'var(--color-text-3)',background:'var(--color-surface-2)',padding:'2px 8px',borderRadius:6}}>#{a.tag_id}</span>}
                </div>
                {a.status && <div style={{fontSize:11,fontWeight:700,color:C,background:`${C}12`,padding:'3px 9px',borderRadius:999,display:'inline-block'}}>{a.status}</div>}
                {a.breed && <div style={{fontSize:11,color:'var(--color-text-3)',marginTop:5}}>{a.breed}</div>}
              </div>
            ))}
            {liveCount > 12 && (
              <div className="card" style={{padding:16,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--color-text-3)',fontSize:13,fontWeight:600}}>
                +{liveCount - 12} autres
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vision section */}
      <div style={{marginTop:36}}>
        <div style={{
          background:`linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`,
          borderRadius:20, padding:'40px 44px', color:'white',
          display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:24,
        }}>
          <div>
            <div style={{fontSize:11,fontWeight:900,color:'#64748b',letterSpacing:2,marginBottom:10}}>VISION SMART FARM AI</div>
            <h3 style={{fontSize:22,fontWeight:900,margin:'0 0 10px'}}>Élevage 4.0 — 100% Souverain</h3>
            <p style={{fontSize:13,color:'#94a3b8',lineHeight:1.75,margin:0,maxWidth:460}}>
              Plateforme d'intelligence artificielle dédiée à l'élevage professionnel.
              Données locales, alertes en temps réel, et recommandations IA sans dépendance cloud.
            </p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
            {[
              {v:'100%',l:'Données Souveraines'},
              {v:'IA',  l:'Surveillance Active'},
              {v:'24/7',l:'Alertes Temps Réel'},
              {v:'Multi',l:'Espèces Supportées'},
            ].map(m => (
              <div key={m.l} style={{textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:900,color:C}}>{m.v}</div>
                <div style={{fontSize:11,opacity:.7,marginTop:3}}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Entry Forms ────────────────────────────────────────────────────────
function QuickEntryPanel({ cfg, animals, farmId, workers, onSaved }) {
  const C = cfg.color;
  const entries = cfg.quickEntries;
  const [type, setType]     = useState(entries[0]);
  const [form, setForm]     = useState({});
  const [animalId, setAnimalId] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const entryLabels = {
    milk:'🥛 Traite', health:'🏥 Santé', feed:'🌾 Ration',
    repro:'🐄 Repro', weight:'⚖️ Pesée', sale:'💰 Vente',
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (type === 'sale') {
        await farmsAPI.addFinance(farmId || 1, {
          type: 'revenue', category: 'sales',
          amount: parseFloat(form.total_amount) || 0,
          notes: `${form.product_type || cfg.name} — ${form.customer_name || ''}`,
          date: today,
        });
      } else {
        const aid = animalId || animals[0]?.id;
        if (!aid) { toast.error('Sélectionnez un animal'); setSaving(false); return; }
        await animalsAPI.addLog(aid, { type, date: today, ...form });
      }
      toast.success('Enregistré !');
      setForm({});
      onSaved?.();
    } catch { toast.error('Erreur d\'enregistrement'); }
    setSaving(false);
  };

  const inp = { width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid var(--color-border-light)', fontSize:13, background:'var(--color-surface)', color:'var(--color-text-1)', outline:'none', boxSizing:'border-box' };
  const lbl = { fontSize:11, fontWeight:700, color:'#64748b', marginBottom:4, display:'block' };

  const btnColor = type === 'health' ? '#ef4444' : type === 'sale' ? '#059669' : C;

  return (
    <div style={{background:'var(--color-surface)',borderRadius:18,border:`1px solid ${C}28`,overflow:'hidden',boxShadow:`0 4px 20px ${C}10`}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg, ${C}, ${cfg.dark})`,padding:'16px 20px',display:'flex',alignItems:'center',gap:12}}>
        <span style={{fontSize:20}}>⚡</span>
        <div>
          <div style={{fontWeight:800,fontSize:14,color:'white'}}>Saisie rapide</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.65)'}}>
            {new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
          </div>
        </div>
      </div>

      <div style={{padding:'16px 18px'}}>
        {/* Type pills */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
          {entries.map(e => (
            <button key={e} onClick={() => { setType(e); setForm({}); }}
              style={{padding:'6px 12px',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .15s',
                border:`1.5px solid ${type===e ? (e==='health'?'#ef4444':e==='sale'?'#059669':C) : 'var(--color-border-light)'}`,
                background: type===e ? (e==='health'?'#ef444412':e==='sale'?'#05986912':`${C}12`) : 'transparent',
                color: type===e ? (e==='health'?'#ef4444':e==='sale'?'#059669':C) : 'var(--color-text-2)',
              }}>
              {entryLabels[e] || e}
            </button>
          ))}
        </div>

        {/* Animal selector (not for sale) */}
        {type !== 'sale' && (
          <div style={{marginBottom:12}}>
            <label style={lbl}>Animal</label>
            <select value={animalId} onChange={e => setAnimalId(e.target.value)} style={inp}>
              <option value="">— Choisir —</option>
              {animals.map(a => <option key={a.id} value={a.id}>{a.name || `#${a.id}`}{a.tag_id ? ` · ${a.tag_id}` : ''}</option>)}
            </select>
          </div>
        )}

        {/* MILK form */}
        {type === 'milk' && (
          <>
            <div style={{marginBottom:10}}><label style={lbl}>Litres produits *</label><input type="number" min="0" step="0.1" style={inp} value={form.quantity_l||''} onChange={e=>set('quantity_l',e.target.value)} placeholder="Ex : 18.5" /></div>
            <div style={{marginBottom:10}}><label style={lbl}>Qualité / Notes</label><input style={inp} value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="RAS / Colostrum" /></div>
          </>
        )}

        {/* HEALTH form */}
        {type === 'health' && (
          <>
            <div style={{marginBottom:10}}><label style={lbl}>Morts (têtes)</label><input type="number" min="0" style={inp} value={form.deaths_today||''} onChange={e=>set('deaths_today',e.target.value)} placeholder="0" /></div>
            <div style={{marginBottom:10}}><label style={lbl}>Symptômes observés</label><input style={inp} value={form.symptoms||''} onChange={e=>set('symptoms',e.target.value)} placeholder="Toux, diarrhée, abattement…" /></div>
            <div style={{marginBottom:10}}><label style={lbl}>Traitement</label><input style={inp} value={form.treatment||''} onChange={e=>set('treatment',e.target.value)} placeholder="Antibiotique, vitamines…" /></div>
            <div style={{marginBottom:12}}><label style={lbl}>Coût vétérinaire (TND)</label><input type="number" min="0" step="0.5" style={inp} value={form.cost||''} onChange={e=>set('cost',e.target.value)} placeholder="0.00" /></div>
            {parseInt(form.deaths_today||0) > 0 && (
              <div style={{background:'#fff1f2',border:'1px solid #fca5a5',borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:12,color:'#b91c1c'}}>
                ⚠️ {form.deaths_today} mort(s) enregistré(s) — vérifiez l'effectif.
              </div>
            )}
          </>
        )}

        {/* FEED form */}
        {type === 'feed' && (
          <>
            <div style={{marginBottom:10}}><label style={lbl}>Type d'aliment</label><input style={inp} value={form.feed_type||''} onChange={e=>set('feed_type',e.target.value)} placeholder="Foin, concentré, ensilage…" /></div>
            <div style={{marginBottom:10}}><label style={lbl}>Quantité (kg) *</label><input type="number" min="0" step="0.5" style={inp} value={form.quantity_kg||''} onChange={e=>set('quantity_kg',e.target.value)} /></div>
            <div style={{marginBottom:12}}><label style={lbl}>Coût / kg (TND)</label><input type="number" min="0" step="0.01" style={inp} value={form.cost_per_kg||''} onChange={e=>set('cost_per_kg',e.target.value)} /></div>
          </>
        )}

        {/* REPRO form */}
        {type === 'repro' && (
          <>
            <div style={{marginBottom:10}}>
              <label style={lbl}>Type d'événement</label>
              <select style={inp} value={form.event||''} onChange={e=>set('event',e.target.value)}>
                <option value="">— Sélectionner —</option>
                {cfg.apiSpecies==='cow'    && <><option value="Chaleur">Chaleur détectée</option><option value="IA">Insémination artificielle</option><option value="Gestation">Gestation confirmée</option><option value="Vêlage">Vêlage</option></>}
                {cfg.apiSpecies==='sheep'  && <><option value="Lutte">Mise à la lutte</option><option value="Gestation">Gestation confirmée</option><option value="Agnelage">Agnelage</option><option value="Sevrage">Sevrage agneaux</option></>}
                {cfg.apiSpecies==='goat'   && <><option value="Lutte">Mise à la lutte</option><option value="Gestation">Gestation confirmée</option><option value="Chevrotage">Chevrotage</option><option value="Sevrage">Sevrage chevrettes</option></>}
                {cfg.apiSpecies==='rabbit' && <><option value="Saillie">Saillie</option><option value="Mise-Bas">Mise-Bas</option><option value="Sevrage">Sevrage lapereaux</option><option value="Palpage">Palpage gestation</option></>}
              </select>
            </div>
            {cfg.apiSpecies==='rabbit' && type==='repro' && form.event==='Mise-Bas' && (
              <div style={{marginBottom:10}}><label style={lbl}>Nombre de lapereaux</label><input type="number" min="0" style={inp} value={form.nb_offspring||''} onChange={e=>set('nb_offspring',e.target.value)} placeholder="8" /></div>
            )}
            <div style={{marginBottom:12}}><label style={lbl}>Notes</label><input style={inp} value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Observations…" /></div>
          </>
        )}

        {/* WEIGHT form */}
        {type === 'weight' && (
          <>
            <div style={{marginBottom:10}}>
              <label style={lbl}>{cfg.apiSpecies==='rabbit'?'Poids (g)':'Poids (kg)'} *</label>
              <input type="number" min="0" step={cfg.apiSpecies==='rabbit'?'1':'0.1'} style={inp}
                value={form.weight||''} onChange={e=>set('weight',e.target.value)} />
            </div>
            <div style={{marginBottom:12}}><label style={lbl}>Notes</label><input style={inp} value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Évolution…" /></div>
          </>
        )}

        {/* SALE form */}
        {type === 'sale' && (
          <>
            <div style={{marginBottom:10}}>
              <label style={lbl}>Produit</label>
              <input style={inp} value={form.product_type||''} onChange={e=>set('product_type',e.target.value)}
                placeholder={cfg.apiSpecies==='cow'?'Lait / Veau':cfg.apiSpecies==='rabbit'?'Lapins vifs':'Agneaux / Lait'} />
            </div>
            <div style={{marginBottom:10}}><label style={lbl}>Quantité *</label>
              <input type="number" min="0" style={inp} value={form.quantity||''} onChange={e=>{
                const q=parseFloat(e.target.value)||0; const p=parseFloat(form.unit_price)||0;
                setForm(f=>({...f,quantity:e.target.value,total_amount:(q*p).toFixed(2)}));
              }} />
            </div>
            <div style={{marginBottom:10}}><label style={lbl}>Prix unitaire (TND)</label>
              <input type="number" min="0" step="0.01" style={inp} value={form.unit_price||''} onChange={e=>{
                const p=parseFloat(e.target.value)||0; const q=parseFloat(form.quantity)||0;
                setForm(f=>({...f,unit_price:e.target.value,total_amount:(q*p).toFixed(2)}));
              }} />
            </div>
            <div style={{marginBottom:10}}><label style={lbl}>Total (TND)</label>
              <input type="number" readOnly style={{...inp,background:'#f8fafc'}} value={form.total_amount||'0.00'} />
            </div>
            <div style={{marginBottom:12}}><label style={lbl}>Client</label>
              <input style={inp} value={form.customer_name||''} onChange={e=>set('customer_name',e.target.value)} placeholder="Nom du client" />
            </div>
          </>
        )}

        <button onClick={submit} disabled={saving} style={{
          width:'100%', padding:11, borderRadius:10, border:'none',
          background: saving ? '#94a3b8' : btnColor,
          color:'white', fontWeight:800, fontSize:14,
          cursor: saving ? 'not-allowed' : 'pointer',
          boxShadow:`0 3px 10px ${btnColor}33`, transition:'all .2s',
        }}>
          {saving ? 'Enregistrement…' : '✓ Enregistrer'}
        </button>
      </div>
    </div>
  );
}

// ─── TodayWorkspace ───────────────────────────────────────────────────────────
function TodayWorkspace({ cfg, animals, farmId, workers }) {
  const C = cfg.color;
  const [cycleStart, setCycleStart]   = useState(() => localStorage.getItem(`ap_cycle_${cfg.apiSpecies}`) || '');
  const [cycleInput, setCycleInput]   = useState(() => localStorage.getItem(`ap_cycle_${cfg.apiSpecies}`) || '');
  const [selectedAnimalId, setSelId]  = useState('');
  const [finance, setFinance]         = useState({ total_revenues: 0, total_expenses: 0 });
  const [tasks, setTasks]             = useState([]);
  const [pushed, setPushed]           = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`ap_pushed_${cfg.apiSpecies}`) || '[]')); }
    catch { return new Set(); }
  });

  useEffect(() => {
    farmsAPI.getFinance(farmId || 1).then(r => setFinance(r.data?.summary || {})).catch(() => {});
    workerTasksAPI.list({ farm_id: farmId || 1 }).then(r => setTasks(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [farmId]);

  const age         = getBatchAge(cycleStart);
  const totalDays   = cfg.totalDays;
  const revenue     = finance.total_revenues || 0;
  const curPhaseIdx = age != null ? cfg.lifecycle.findIndex(lc => age >= lc.minDay && age <= lc.maxDay) : -1;
  const curPhase    = curPhaseIdx >= 0 ? cfg.phases[curPhaseIdx] : null;
  const nextVaccine = age != null ? cfg.vaccines.filter(v => v.day > age).sort((a,b)=>a.day-b.day)[0] : null;
  const pendingTasks = tasks.filter(tk => tk.status === 'pending').slice(0, 3);

  const saveCycle = () => {
    if (!cycleInput) return;
    localStorage.setItem(`ap_cycle_${cfg.apiSpecies}`, cycleInput);
    setCycleStart(cycleInput);
    toast.success('Cycle enregistré');
  };

  const pushVaccineTask = async (v) => {
    const key = `${cfg.apiSpecies}-${v.day}`;
    if (pushed.has(key)) return;
    try {
      await workerTasksAPI.create({ title:`💉 ${v.vaccine} — ${cfg.name}`, description:`${v.route} — ${v.note}`, due_date:new Date().toISOString().slice(0,10), priority:'high', farm_id:farmId||1 });
      const np = new Set([...pushed, key]);
      setPushed(np);
      localStorage.setItem(`ap_pushed_${cfg.apiSpecies}`, JSON.stringify([...np]));
      toast.success('Tâche vaccin créée !');
    } catch { toast.error('Erreur création tâche'); }
  };

  // Build actions
  const actions = [];
  if (nextVaccine && age != null && nextVaccine.day - age <= 3) {
    actions.push({ id:'vax', priority:'critical', icon:'💉', title:`Vaccin imminent — J${nextVaccine.day}`, desc:nextVaccine.vaccine, cta:'Planifier', onCta:() => pushVaccineTask(nextVaccine) });
  }
  if (pendingTasks.length > 0) {
    actions.push({ id:'tasks', priority:'high', icon:'📋', title:`${pendingTasks.length} tâche(s) en attente`, desc:pendingTasks.map(tk=>tk.title).join(' · '), cta:'Voir', onCta:() => {} });
  }
  if (!cycleStart) {
    actions.push({ id:'cycle', priority:'normal', icon:'📅', title:'Cycle non démarré', desc:'Définissez une date de début pour activer le suivi de phase.', cta:'Définir', onCta:() => {} });
  }
  if (animals.length === 0) {
    actions.push({ id:'add', priority:'normal', icon:'➕', title:'Aucun animal enregistré', desc:`Ajoutez des ${cfg.name.toLowerCase()} dans l'onglet Animaux.`, cta:'Ajouter', onCta:() => {} });
  }

  const priorityBg     = { critical:'#fef2f2', high:`${C}08`, normal:'var(--color-surface-2)' };
  const priorityBorder = { critical:'#fecaca', high:`${C}22`, normal:'var(--color-border-light)' };

  const stepDate = (d) => {
    if (!cycleStart || d == null) return null;
    const dt = new Date(cycleStart + 'T12:00:00');
    dt.setDate(dt.getDate() + d);
    return dt.toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
  };

  return (
    <div>
      {/* Enterprise Command Bar */}
      <div style={{
        background:'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius:20, padding:'20px 28px', marginBottom:22,
        display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:14,
        boxShadow:'0 4px 24px rgba(0,0,0,.14)',
      }}>
        <div>
          <div style={{fontSize:10,fontWeight:900,color:'#64748b',letterSpacing:2,marginBottom:10}}>
            🔒 ESPACE OPÉRATIONNEL — {cfg.name.toUpperCase()}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <select value={selectedAnimalId} onChange={e=>setSelId(e.target.value)}
              style={{background:'rgba(255,255,255,.08)',border:`1.5px solid ${C}55`,borderRadius:12,
                padding:'9px 18px',fontSize:14,fontWeight:700,color:'white',cursor:'pointer',outline:'none'}}>
              <option value="" style={{background:'#1e293b'}}>— Sélectionner un animal —</option>
              {animals.map(a => <option key={a.id} value={a.id} style={{background:'#1e293b'}}>{a.name||`#${a.id}`}{a.tag_id?` · ${a.tag_id}`:''}</option>)}
            </select>
            {selectedAnimalId && (() => {
              const a = animals.find(x=>String(x.id)===String(selectedAnimalId));
              return a ? (
                <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,.06)',borderRadius:999,padding:'6px 14px',border:'1px solid rgba(255,255,255,.1)'}}>
                  <span style={{width:7,height:7,borderRadius:'50%',background:'#10b981',display:'inline-block'}} />
                  <span style={{fontSize:12,color:'#94a3b8',fontWeight:700}}>{a.breed||a.status||cfg.name}</span>
                </div>
              ) : null;
            })()}
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:12,color:'#64748b',marginBottom:4}}>
            {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
          </div>
          {age != null ? (
            <div style={{lineHeight:1}}>
              <span style={{fontSize:44,fontWeight:900,color:C}}>J{age}</span>
              <span style={{fontSize:13,fontWeight:600,color:'#64748b',marginLeft:8}}>du cycle</span>
            </div>
          ) : (
            <span style={{fontSize:12,color:'#475569',fontStyle:'italic'}}>Cycle non défini</span>
          )}
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="ap-5kpi" style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:14,marginBottom:22}}>
        {cfg.kpis.map((k, i) => {
          const val = k.key==='count' ? String(animals.length||'—') :
                      k.key==='revenue' ? (revenue>0?`${revenue.toFixed(0)} TND`:'—') :
                      k.key==='nextvac' ? (nextVaccine?`J${nextVaccine.day}`:'✓ OK') : '—';
          const clr = k.key==='nextvac' && nextVaccine && age!=null && nextVaccine.day<=age ? '#ef4444' :
                      k.key==='revenue' && revenue>0 ? '#059669' : i===0 ? C : '#94a3b8';
          return (
            <div key={k.label} style={{
              background:'var(--color-surface)', borderRadius:16, padding:'18px 20px',
              border:`1px solid ${clr}18`, borderTop:`3px solid ${clr}`,
              boxShadow:'0 1px 8px rgba(0,0,0,.04)',
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <span style={{fontSize:20}}>{k.icon}</span>
                <span style={{fontSize:9,fontWeight:800,color:clr,background:`${clr}12`,padding:'3px 8px',borderRadius:999,letterSpacing:'.05em'}}>
                  {k.label.toUpperCase()}
                </span>
              </div>
              <div style={{fontSize:22,fontWeight:900,color:clr,lineHeight:1,marginBottom:5}}>{val}</div>
              <div style={{fontSize:11,color:'var(--color-text-3)',fontWeight:600}}>{k.label}</div>
            </div>
          );
        })}
      </div>

      {/* Cycle setter */}
      <div style={{marginBottom:22,background:'var(--color-surface)',borderRadius:16,padding:'14px 20px',
        border:`1px solid ${C}22`,display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
        <Calendar size={17} color={C} />
        <span style={{fontWeight:700,fontSize:13}}>Début de cycle :</span>
        <input type="date" value={cycleInput} onChange={e=>setCycleInput(e.target.value)}
          style={{padding:'7px 12px',borderRadius:8,border:'1px solid var(--color-border-light)',fontSize:13,outline:'none',background:'var(--color-surface)',color:'var(--color-text-1)'}} />
        <button onClick={saveCycle} style={{padding:'7px 18px',borderRadius:9,border:'none',background:C,color:'white',fontWeight:700,fontSize:12,cursor:'pointer'}}>
          Enregistrer
        </button>
        {curPhase && (
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,background:`${curPhase.color}12`,border:`1px solid ${curPhase.color}30`,borderRadius:10,padding:'7px 14px'}}>
            <span style={{width:8,height:8,borderRadius:3,background:curPhase.color,display:'inline-block'}} />
            <span style={{fontWeight:700,fontSize:12,color:curPhase.color}}>{curPhase.phase}</span>
          </div>
        )}
      </div>

      {/* Two-column body */}
      <div className="ap-2col" style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:22,alignItems:'start'}}>

        {/* LEFT */}
        <div style={{display:'flex',flexDirection:'column',gap:20}}>

          {/* Actions */}
          <div style={{background:'var(--color-surface)',borderRadius:18,border:'1px solid var(--color-border-light)',overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid var(--color-border-light)',display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:4,height:20,borderRadius:999,background:C}} />
              <span style={{fontWeight:800,fontSize:14}}>Actions du jour</span>
              {actions.length > 0 && (
                <span style={{marginLeft:'auto',background:actions.some(a=>a.priority==='critical')?'#ef4444':C,color:'white',borderRadius:999,padding:'2px 10px',fontSize:11,fontWeight:800}}>
                  {actions.length}
                </span>
              )}
            </div>
            <div style={{padding:'16px 18px'}}>
              {actions.length === 0 ? (
                <div style={{background:'#dcfce7',border:'1px solid #bbf7d0',borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',gap:12}}>
                  <span style={{fontSize:22}}>✅</span>
                  <div>
                    <div style={{fontWeight:800,color:'#15803d',fontSize:14}}>Tout est à jour</div>
                    <div style={{fontSize:12,color:'#166534'}}>Aucune action urgente détectée pour aujourd'hui.</div>
                  </div>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {actions.map(a => (
                    <div key={a.id} style={{borderRadius:12,padding:'14px 16px',display:'flex',gap:14,alignItems:'flex-start',
                      background:priorityBg[a.priority],
                      borderLeft:`4px solid ${a.priority==='critical'?'#ef4444':a.priority==='high'?C:'#cbd5e1'}`,
                      border:`1px solid ${priorityBorder[a.priority]}`,
                    }}>
                      <div style={{width:40,height:40,borderRadius:12,background:a.priority==='critical'?'#fee2e2':`${C}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
                        {a.icon}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:3}}>
                          <span style={{fontWeight:700,fontSize:13}}>{a.title}</span>
                          <span style={{fontSize:9,fontWeight:900,padding:'2px 8px',borderRadius:999,flexShrink:0,marginLeft:8,
                            background:a.priority==='critical'?'#fee2e2':`${C}15`,
                            color:a.priority==='critical'?'#b91c1c':C}}>
                            {a.priority.toUpperCase()}
                          </span>
                        </div>
                        <div style={{fontSize:11,color:'#64748b',marginBottom:8,lineHeight:1.5}}>{a.desc}</div>
                        <button onClick={a.onCta} style={{padding:'5px 14px',borderRadius:8,border:'none',fontSize:12,fontWeight:700,background:a.priority==='critical'?'#ef4444':C,color:'white',cursor:'pointer'}}>
                          {a.cta} →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lifecycle */}
          <div style={{background:'var(--color-surface)',borderRadius:18,border:'1px solid var(--color-border-light)',overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid var(--color-border-light)',display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:4,height:20,borderRadius:999,background:C}} />
              <span style={{fontWeight:800,fontSize:14}}>{cfg.cycleLabel}</span>
            </div>
            <div style={{padding:'20px 22px',overflowX:'auto'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:0,minWidth:cfg.lifecycle.length*120}}>
                {cfg.lifecycle.map((step, idx) => {
                  const isPast    = age!=null && age>step.maxDay;
                  const isCurrent = idx===curPhaseIdx;
                  const dotClr    = isPast?'#059669':isCurrent?C:'#cbd5e1';
                  const date      = stepDate(step.minDay - 1);
                  return (
                    <div key={step.key} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',position:'relative'}}>
                      {idx>0 && <div style={{position:'absolute',left:0,top:16,width:'50%',height:2,background:isPast?'#059669':'#e2e8f0',zIndex:0}} />}
                      {idx<cfg.lifecycle.length-1 && <div style={{position:'absolute',right:0,top:16,width:'50%',height:2,background:isPast?'#059669':'#e2e8f0',zIndex:0}} />}
                      <div style={{width:32,height:32,borderRadius:'50%',
                        background:isCurrent?C:isPast?'#059669':'white',
                        border:`2px solid ${dotClr}`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        position:'relative',zIndex:1,fontSize:13,
                        boxShadow:isCurrent?`0 0 0 4px ${C}22`:'none',
                      }}>
                        {isPast ? <span style={{color:'white',fontWeight:900}}>✓</span>
                          : isCurrent ? <span style={{color:'white',fontWeight:900,fontSize:11}}>●</span>
                          : <span style={{color:'#cbd5e1'}}>○</span>}
                      </div>
                      <div style={{fontSize:11,fontWeight:isCurrent?800:600,color:isCurrent?C:isPast?'#059669':'#94a3b8',marginTop:6,textAlign:'center',lineHeight:1.3}}>
                        {step.label}
                      </div>
                      {date && <div style={{fontSize:9,color:'#cbd5e1',marginTop:2}}>{date}</div>}
                      {isCurrent && <div style={{marginTop:4,fontSize:9,fontWeight:900,color:C,background:`${C}15`,padding:'2px 8px',borderRadius:999}}>MAINTENANT</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Next vaccine quick card */}
          {nextVaccine && (
            <div style={{background:'var(--color-surface)',borderRadius:18,border:'1px solid #10b98122',borderLeft:'4px solid #10b981',overflow:'hidden'}}>
              <div style={{padding:'14px 20px',display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:24}}>💉</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13,marginBottom:2}}>Prochain vaccin — J{nextVaccine.day}</div>
                  <div style={{fontSize:12,color:'var(--color-text-3)'}}>{nextVaccine.vaccine} · {nextVaccine.route}</div>
                </div>
                <button onClick={()=>pushVaccineTask(nextVaccine)}
                  disabled={pushed.has(`${cfg.apiSpecies}-${nextVaccine.day}`)}
                  style={{padding:'7px 16px',borderRadius:9,border:'none',
                    background:pushed.has(`${cfg.apiSpecies}-${nextVaccine.day}`)?'#dcfce7':'#10b981',
                    color:pushed.has(`${cfg.apiSpecies}-${nextVaccine.day}`)?'#15803d':'white',
                    fontWeight:700,fontSize:12,cursor:'pointer'}}>
                  {pushed.has(`${cfg.apiSpecies}-${nextVaccine.day}`)?'✓ Planifié':'Planifier'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — sticky */}
        <div className="ap-sticky" style={{position:'sticky',top:80}}>
          <QuickEntryPanel cfg={cfg} animals={animals} farmId={farmId} workers={workers} onSaved={()=>{
            farmsAPI.getFinance(farmId||1).then(r=>setFinance(r.data?.summary||{})).catch(()=>{});
          }} />
        </div>

      </div>
    </div>
  );
}

// ─── AnimauxTab ───────────────────────────────────────────────────────────────
function AnimauxTab({ cfg, animals, farmId, onRefresh }) {
  const C = cfg.color;
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState({ name:'',tag_id:'',status:'',breed:'',notes:'' });
  const [saving, setSaving]           = useState(false);
  const [financeItems, setFinItems]   = useState([]);
  const [showFin, setShowFin]         = useState(false);
  const [finForm, setFinForm]         = useState({ type:'expense',category:'feed',amount:'',notes:'' });

  useEffect(() => {
    farmsAPI.getFinance(farmId||1).then(r=>setFinItems(r.data?.items||[])).catch(()=>{});
  }, [farmId]);

  const totalRev = financeItems.filter(f=>f.type==='revenue').reduce((s,f)=>s+(f.amount||0),0);
  const totalExp = financeItems.filter(f=>f.type==='expense').reduce((s,f)=>s+(f.amount||0),0);

  const saveAnimal = async () => {
    if (!form.name) { toast.error('Nom requis'); return; }
    setSaving(true);
    try {
      await animalsAPI.create({ ...form, species:cfg.apiSpecies, farm_id:farmId||1 });
      toast.success('Animal ajouté !');
      setForm({ name:'',tag_id:'',status:'',breed:'',notes:'' });
      setShowForm(false);
      onRefresh();
    } catch { toast.error('Erreur'); }
    setSaving(false);
  };

  const saveFin = async () => {
    if (!finForm.amount) return;
    try {
      await farmsAPI.addFinance(farmId||1, { ...finForm, date:new Date().toISOString().slice(0,10) });
      toast.success('Transaction enregistrée');
      setFinForm({ type:'expense',category:'feed',amount:'',notes:'' });
      setShowFin(false);
      farmsAPI.getFinance(farmId||1).then(r=>setFinItems(r.data?.items||[])).catch(()=>{});
    } catch { toast.error('Erreur'); }
  };

  const deleteAnimal = async (id) => {
    if (!confirm('Supprimer cet animal ?')) return;
    try { await animalsAPI.delete(id); toast.success('Supprimé'); onRefresh(); } catch { toast.error('Erreur'); }
  };

  const inp = { width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid var(--color-border-light)',fontSize:13,background:'var(--color-surface)',color:'var(--color-text-1)',outline:'none',boxSizing:'border-box' };

  return (
    <div>
      {/* Finance summary */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:28}}>
        {[
          {label:'Revenus',      value:`${totalRev.toFixed(0)} TND`, color:'#059669', icon:'💰'},
          {label:'Dépenses',     value:`${totalExp.toFixed(0)} TND`, color:'#ef4444', icon:'📤'},
          {label:'Bénéfice Net', value:`${(totalRev-totalExp).toFixed(0)} TND`, color:(totalRev-totalExp)>=0?'#059669':'#ef4444', icon:'📊'},
        ].map(k=>(
          <div key={k.label} style={{background:'var(--color-surface)',borderRadius:16,padding:'18px 20px',borderTop:`3px solid ${k.color}`,border:`1px solid ${k.color}18`}}>
            <div style={{fontSize:20,marginBottom:8}}>{k.icon}</div>
            <div style={{fontSize:22,fontWeight:900,color:k.color}}>{k.value}</div>
            <div style={{fontSize:12,color:'var(--color-text-3)',fontWeight:600,marginTop:4}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Actions row */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:10}}>
        <SectionHeader title={`Registre — ${cfg.name} (${animals.length})`} accent={C} />
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setShowFin(v=>!v)}
            style={{padding:'8px 16px',borderRadius:10,border:`1px solid #059669`,background:showFin?'#059669':'transparent',color:showFin?'white':'#059669',fontWeight:700,fontSize:13,cursor:'pointer'}}>
            💰 Transaction
          </button>
          <button onClick={()=>setShowForm(v=>!v)}
            style={{padding:'8px 16px',borderRadius:10,border:`1px solid ${C}`,background:showForm?C:'transparent',color:showForm?'white':C,fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
            <Plus size={14} />Ajouter
          </button>
        </div>
      </div>

      {showFin && (
        <div className="card" style={{marginBottom:20,padding:20,border:`1px solid #05986922`}}>
          <div style={{fontWeight:800,fontSize:14,marginBottom:14}}>💰 Nouvelle Transaction</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:4,display:'block'}}>Type</label>
              <select value={finForm.type} onChange={e=>setFinForm(f=>({...f,type:e.target.value}))} style={inp}>
                <option value="expense">Dépense</option><option value="revenue">Revenu</option>
              </select>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:4,display:'block'}}>Catégorie</label>
              <select value={finForm.category} onChange={e=>setFinForm(f=>({...f,category:e.target.value}))} style={inp}>
                <option value="feed">Alimentation</option><option value="vet">Vétérinaire</option>
                <option value="sales">Ventes</option><option value="labor">Main d'œuvre</option>
              </select>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:4,display:'block'}}>Montant (TND)</label>
              <input type="number" value={finForm.amount} onChange={e=>setFinForm(f=>({...f,amount:e.target.value}))} style={inp} placeholder="0.00" />
            </div>
          </div>
          <input value={finForm.notes} onChange={e=>setFinForm(f=>({...f,notes:e.target.value}))} style={inp} placeholder="Notes…" />
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <button onClick={saveFin} style={{padding:'8px 20px',borderRadius:9,border:'none',background:'#059669',color:'white',fontWeight:700,fontSize:13,cursor:'pointer'}}>Enregistrer</button>
            <button onClick={()=>setShowFin(false)} style={{padding:'8px 16px',borderRadius:9,border:'1px solid var(--color-border-light)',background:'transparent',fontWeight:600,fontSize:13,cursor:'pointer'}}>Annuler</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card" style={{marginBottom:20,padding:20,border:`1px solid ${C}22`}}>
          <div style={{fontWeight:800,fontSize:14,marginBottom:14}}>{cfg.emoji} Nouvel Animal</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
            {[['name','Nom / Identifiant'],['tag_id','Tag / N° Boucle'],['breed','Race'],['status','Statut']].map(([k,l])=>(
              <div key={k}>
                <label style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:4,display:'block'}}>{l}</label>
                <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={inp} placeholder={l} />
              </div>
            ))}
          </div>
          <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={inp} placeholder="Notes…" />
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <button onClick={saveAnimal} disabled={saving} style={{padding:'8px 20px',borderRadius:9,border:'none',background:saving?'#94a3b8':C,color:'white',fontWeight:700,fontSize:13,cursor:'pointer'}}>
              {saving?'Enregistrement…':'Ajouter'}
            </button>
            <button onClick={()=>setShowForm(false)} style={{padding:'8px 16px',borderRadius:9,border:'1px solid var(--color-border-light)',background:'transparent',fontWeight:600,fontSize:13,cursor:'pointer'}}>Annuler</button>
          </div>
        </div>
      )}

      {animals.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px 0',color:'var(--color-text-3)'}}>
          <div style={{fontSize:48,marginBottom:12}}>{cfg.emoji}</div>
          <div style={{fontWeight:700,fontSize:16}}>Aucun animal enregistré</div>
          <div style={{fontSize:13,marginTop:6}}>Cliquez sur "Ajouter" pour commencer.</div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:14}}>
          {animals.map(a=>(
            <div key={a.id} className="card" style={{padding:18,borderLeft:`3px solid ${C}`,position:'relative'}}>
              <button onClick={()=>deleteAnimal(a.id)}
                style={{position:'absolute',top:10,right:10,background:'none',border:'none',cursor:'pointer',color:'#cbd5e1',fontSize:16,lineHeight:1}}>×</button>
              <div style={{fontWeight:800,fontSize:15,marginBottom:5}}>{a.name||`Animal #${a.id}`}</div>
              {a.tag_id && <div style={{fontSize:11,color:'var(--color-text-3)',marginBottom:6}}>Tag: {a.tag_id}</div>}
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {a.status && <span style={{fontSize:11,fontWeight:700,color:C,background:`${C}12`,padding:'3px 9px',borderRadius:999}}>{a.status}</span>}
                {a.breed && <span style={{fontSize:11,color:'var(--color-text-3)',background:'var(--color-surface-2)',padding:'3px 9px',borderRadius:999}}>{a.breed}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {financeItems.length > 0 && (
        <div style={{marginTop:28}}>
          <SectionHeader title="Historique Financier" accent="#059669" />
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{background:'#05986910',borderBottom:'2px solid #05986925'}}>
                  {['Date','Type','Catégorie','Montant','Notes'].map(h=>(
                    <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:700,fontSize:11,color:'#059669',textTransform:'uppercase',letterSpacing:'.05em'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {financeItems.slice(0,20).map((f,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid var(--color-border-light)',background:i%2===0?'transparent':'var(--color-surface-2)'}}>
                    <td style={{padding:'9px 14px',color:'var(--color-text-3)'}}>{f.date?.slice(0,10)||'—'}</td>
                    <td style={{padding:'9px 14px'}}>
                      <span style={{fontSize:11,fontWeight:700,padding:'2px 9px',borderRadius:999,
                        background:f.type==='revenue'?'#dcfce7':'#fee2e2',
                        color:f.type==='revenue'?'#15803d':'#b91c1c'}}>
                        {f.type==='revenue'?'Revenu':'Dépense'}
                      </span>
                    </td>
                    <td style={{padding:'9px 14px',color:'var(--color-text-2)'}}>{f.category}</td>
                    <td style={{padding:'9px 14px',fontWeight:700,color:f.type==='revenue'?'#059669':'#ef4444'}}>
                      {f.type==='revenue'?'+':'-'}{f.amount?.toFixed(2)} TND
                    </td>
                    <td style={{padding:'9px 14px',color:'var(--color-text-3)'}}>{f.notes||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SurveillanceTab ──────────────────────────────────────────────────────────
function SurveillanceTab({ cfg }) {
  const C = cfg.color;
  return (
    <div>
      <div style={{marginBottom:20}}>
        <h2 style={{fontSize:18,fontWeight:800,marginBottom:5}}>Surveillance IA — {cfg.name}</h2>
        <p style={{fontSize:13,color:'var(--color-text-3)'}}>
          Vision par ordinateur YOLO v11 — détection et analyse comportementale en temps réel.
        </p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:14,marginBottom:22}}>
        {[
          {icon:Eye,          title:'Détection Comportement', desc:`Identification comportements anormaux : isolement, léthargie, agitation dans le troupeau ${cfg.name}.`},
          {icon:Shield,       title:'Prédiction Maladies',    desc:'Analyse visuelle des symptômes avec confiance > 85%. Alerte précoce avant propagation.'},
          {icon:AlertTriangle,title:'Alertes Temps Réel',     desc:'Notification instantanée lors de comportements critiques ou anomalies détectées.'},
        ].map(d=>(
          <div key={d.title} className="card" style={{padding:18,borderLeft:`3px solid ${C}`}}>
            <div style={{display:'flex',gap:11,alignItems:'flex-start'}}>
              <div style={{width:36,height:36,borderRadius:8,background:`${C}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <d.icon size={17} color={C} />
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{d.title}</div>
                <p style={{fontSize:12,color:'var(--color-text-3)',margin:0,lineHeight:1.6}}>{d.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <AIScanner category="livestock" title={`Analyser ${cfg.emoji} ${cfg.name} par IA`} color={C} />
    </div>
  );
}

// ─── ProtocolsTab ─────────────────────────────────────────────────────────────
function ProtocolsTab({ cfg, farmId, workers }) {
  const C = cfg.color;
  const [cycleStart] = useState(() => localStorage.getItem(`ap_cycle_${cfg.apiSpecies}`) || '');
  const [vacCalMonth, setVacCalMonth] = useState(() => { const d=new Date(); return {year:d.getFullYear(),month:d.getMonth()}; });
  const [pushed, setPushed]           = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`ap_pushed_${cfg.apiSpecies}`) || '[]')); }
    catch { return new Set(); }
  });
  const [selectedWorkerId, setWorkerId] = useState('');
  const [editingPerf, setEditingPerf]   = useState(false);
  const [perfDraft, setPerfDraft]       = useState(cfg.perfTable);
  const [currentPerf, setCurrentPerf]   = useState(cfg.perfTable);

  const age         = getBatchAge(cycleStart);
  const totalDays   = cfg.totalDays;
  const curPhaseIdx = age!=null ? cfg.lifecycle.findIndex(lc=>age>=lc.minDay&&age<=lc.maxDay) : -1;
  const curPhase    = curPhaseIdx>=0 ? cfg.phases[curPhaseIdx] : null;

  const pushVaccineTask = async (v) => {
    const key = `${cfg.apiSpecies}-${v.day}`;
    if (pushed.has(key)) return;
    try {
      await workerTasksAPI.create({
        title:`💉 ${v.vaccine} — ${cfg.name}`,
        description:`${v.route} — ${v.note}`,
        due_date:new Date().toISOString().slice(0,10),
        priority:'high', farm_id:farmId||1,
        ...(selectedWorkerId?{assigned_to:selectedWorkerId}:{}),
      });
      const np = new Set([...pushed,key]);
      setPushed(np);
      localStorage.setItem(`ap_pushed_${cfg.apiSpecies}`, JSON.stringify([...np]));
      toast.success('Tâche vaccin créée !');
    } catch { toast.error('Erreur'); }
  };

  // Calendar
  const renderCalendar = () => {
    const startD    = cycleStart ? new Date(cycleStart+'T12:00:00') : null;
    const {year,month} = vacCalMonth;
    const firstDow  = (new Date(year,month,1).getDay()+6)%7;
    const lastDate  = new Date(year,month+1,0).getDate();
    const today     = new Date(); today.setHours(12,0,0,0);
    const firstOfM  = new Date(year,month,1);
    const monthName = firstOfM.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});

    const getVax = (d) => {
      if (!startD) return [];
      const cd = new Date(year,month,d); cd.setHours(12,0,0,0);
      const diff = Math.round((cd-startD)/86400000)+1;
      return cfg.vaccines.filter(v=>v.day===diff);
    };

    const cells = [];
    for (let i=0;i<firstDow;i++) cells.push(null);
    for (let d=1;d<=lastDate;d++) cells.push(d);
    while(cells.length%7!==0) cells.push(null);
    const weeks=[];
    for(let i=0;i<cells.length;i+=7) weeks.push(cells.slice(i,i+7));

    return (
      <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
          <button onClick={()=>setVacCalMonth(m=>{const d=new Date(m.year,m.month-1,1);return{year:d.getFullYear(),month:d.getMonth()};})}
            style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:'#64748b',padding:'4px 10px',borderRadius:8}}>‹</button>
          <span style={{fontWeight:800,fontSize:14,color:'#1e293b',textTransform:'capitalize'}}>{monthName}</span>
          <button onClick={()=>setVacCalMonth(m=>{const d=new Date(m.year,m.month+1,1);return{year:d.getFullYear(),month:d.getMonth()};})}
            style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:'#64748b',padding:'4px 10px',borderRadius:8}}>›</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',background:'#f1f5f9'}}>
          {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=>(
            <div key={d} style={{padding:'8px 4px',textAlign:'center',fontSize:10,fontWeight:800,color:'#64748b',letterSpacing:.5}}>{d}</div>
          ))}
        </div>
        {weeks.map((wk,wi)=>(
          <div key={wi} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid #f1f5f9'}}>
            {wk.map((d,di)=>{
              if (!d) return <div key={di} style={{minHeight:72,background:'#fafafa'}} />;
              const cellDate=new Date(year,month,d); cellDate.setHours(12,0,0,0);
              const isToday=cellDate.getTime()===today.getTime();
              const vaxRows=getVax(d);
              return (
                <div key={di} style={{minHeight:72,padding:'6px 5px',borderRight:'1px solid #f1f5f9',
                  background:isToday?`${C}08`:'white',borderTop:isToday?`2px solid ${C}`:'none'}}>
                  <div style={{fontSize:12,fontWeight:isToday?900:500,color:isToday?C:'#374151',marginBottom:3}}>{d}</div>
                  {vaxRows.map((v,vi)=>{
                    const key=`${cfg.apiSpecies}-${v.day}`;
                    const isDone=pushed.has(key);
                    return (
                      <div key={vi} style={{background:isDone?'#dcfce7':`${C}15`,borderRadius:5,padding:'3px 5px',marginBottom:3}}>
                        <div style={{fontSize:9,fontWeight:700,color:isDone?'#15803d':C,lineHeight:1.3}}>
                          💉 {v.vaccine.slice(0,18)}
                        </div>
                        <button onClick={()=>pushVaccineTask(v)} disabled={isDone}
                          style={{fontSize:8,fontWeight:800,border:'none',borderRadius:4,padding:'2px 6px',marginTop:3,
                            background:isDone?'#bbf7d0':C,color:isDone?'#15803d':'white',cursor:isDone?'default':'pointer'}}>
                          {isDone?'✓ OK':'Planif.'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
        <div style={{padding:'12px 18px',background:'#f8fafc',borderTop:'1px solid #e2e8f0',display:'flex',gap:16,flexWrap:'wrap',alignItems:'center'}}>
          <span style={{fontSize:11,fontWeight:700,color:'#475569'}}>Programme :</span>
          {cfg.vaccines.sort((a,b)=>a.day-b.day).map(v=>{
            const key=`${cfg.apiSpecies}-${v.day}`;
            const done=pushed.has(key);
            return (
              <span key={key} style={{display:'flex',alignItems:'center',gap:5}}>
                <span style={{width:7,height:7,borderRadius:'50%',background:done?'#10b981':C,flexShrink:0}} />
                <span style={{fontSize:11,color:done?'#10b981':'#475569',fontWeight:done?700:400}}>J{v.day}</span>
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const inp2 = {padding:'6px 10px',borderRadius:7,border:'1px solid var(--color-border-light)',fontSize:12,background:'var(--color-surface)',color:'var(--color-text-1)',outline:'none'};

  return (
    <div>
      {/* Section A: Phase Tracker */}
      <div style={{marginBottom:32}}>
        <SectionHeader title={`${cfg.cycleLabel} — Suivi Phase`} accent={C} />
        <div className="card" style={{padding:'24px 28px'}}>
          {age!=null ? (
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div>
                  <div style={{fontSize:13,color:'var(--color-text-3)',marginBottom:3}}>Phase actuelle</div>
                  <div style={{fontWeight:900,fontSize:18,color:C}}>{curPhase?.phase||'Cycle terminé'}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:44,fontWeight:900,color:C,lineHeight:1}}>J{age}</div>
                  <div style={{fontSize:11,color:'var(--color-text-3)',marginTop:2}}>sur {totalDays} jours</div>
                </div>
              </div>
              <div style={{background:'#e0f2fe',borderRadius:999,height:10,marginBottom:8}}>
                <div style={{width:`${Math.min(100,(age/totalDays)*100)}%`,height:10,borderRadius:999,
                  background:age>=totalDays?'#059669':`linear-gradient(90deg, ${cfg.dark}, ${C})`,transition:'width .4s'}} />
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--color-text-3)',marginBottom:20}}>
                <span>Jour 1</span>
                <span style={{fontWeight:700,color:C}}>Aujourd'hui : J{age}</span>
                <span>Jour {totalDays}</span>
              </div>
            </>
          ) : (
            <div style={{textAlign:'center',padding:'20px 0',color:'var(--color-text-3)'}}>
              <div style={{fontSize:32,marginBottom:8}}>📅</div>
              <div style={{fontWeight:700}}>Définissez une date de début dans l'onglet "Aujourd'hui"</div>
            </div>
          )}

          {/* Phase cards */}
          <div style={{display:'grid',gridTemplateColumns:`repeat(${cfg.phases.length},1fr)`,gap:10}}>
            {cfg.phases.map((ph,i)=>{
              const lc=cfg.lifecycle[i];
              const isCurrent=lc&&age!=null&&age>=lc.minDay&&age<=lc.maxDay;
              return (
                <div key={ph.phase} style={{background:isCurrent?`${ph.color}15`:'white',borderRadius:10,padding:'10px 12px',
                  border:`${isCurrent?2:1.5}px solid ${ph.color}${isCurrent?'55':'22'}`}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:7}}>
                    <span style={{width:10,height:10,borderRadius:3,background:ph.color,flexShrink:0}} />
                    <span style={{fontSize:11,fontWeight:900,color:ph.color}}>{ph.phase}</span>
                    {isCurrent&&<span style={{marginLeft:'auto',fontSize:8,fontWeight:900,color:ph.color,background:`${ph.color}18`,padding:'1px 6px',borderRadius:999}}>ACTUEL</span>}
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8',marginBottom:6}}>{ph.days}</div>
                  {[[cfg.phaseLabels[0],ph.p1],[cfg.phaseLabels[1],ph.p2],[cfg.phaseLabels[2],ph.p3]].map(([lbl,val])=>(
                    <div key={lbl} style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                      <span style={{fontSize:10,color:'#94a3b8'}}>{lbl}</span>
                      <span style={{fontSize:10,fontWeight:800,color:ph.color}}>{val}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section B: Vaccination */}
      <div style={{marginBottom:32}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:10}}>
          <SectionHeader title="Calendrier Vaccinal" accent="#10b981" />
          {workers.length > 0 && (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:12,color:'var(--color-text-3)'}}>Assigner à :</span>
              <select value={selectedWorkerId} onChange={e=>setWorkerId(e.target.value)}
                style={{...inp2,minWidth:150}}>
                <option value="">— Ouvrier —</option>
                {workers.map(w=><option key={w.id} value={w.id}>{w.full_name||w.username}</option>)}
              </select>
            </div>
          )}
        </div>
        {renderCalendar()}
        {/* Vaccine table */}
        <div className="card" style={{padding:0,overflow:'hidden',marginTop:16}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{background:`${C}10`,borderBottom:`2px solid ${C}25`}}>
                {['Jour','Vaccin','Voie','Note',''].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:700,fontSize:11,textTransform:'uppercase',letterSpacing:'.05em',color:C}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cfg.vaccines.sort((a,b)=>a.day-b.day).map((v,i)=>{
                const key=`${cfg.apiSpecies}-${v.day}`;
                const isDone=pushed.has(key);
                return (
                  <tr key={i} style={{borderBottom:'1px solid var(--color-border-light)',background:isDone?'#f0fdf4':i%2===0?'transparent':'var(--color-surface-2)'}}>
                    <td style={{padding:'10px 14px',fontWeight:900,color:C}}>J{v.day}</td>
                    <td style={{padding:'10px 14px',fontWeight:600}}>{v.vaccine}</td>
                    <td style={{padding:'10px 14px',color:'var(--color-text-3)'}}>{v.route}</td>
                    <td style={{padding:'10px 14px',color:'var(--color-text-3)'}}>{v.note}</td>
                    <td style={{padding:'10px 14px'}}>
                      <button onClick={()=>pushVaccineTask(v)} disabled={isDone}
                        style={{padding:'4px 12px',borderRadius:6,border:'none',fontSize:11,fontWeight:700,
                          background:isDone?'#dcfce7':C,color:isDone?'#15803d':'white',cursor:isDone?'default':'pointer'}}>
                        {isDone?'✓ OK':'Planifier'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section C: Performance Table */}
      <div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:10}}>
          <SectionHeader title="Tables de Performance Cibles" accent="#7c3aed" />
          <div style={{display:'flex',gap:8}}>
            {editingPerf ? (
              <>
                <button onClick={()=>{setCurrentPerf(perfDraft);setEditingPerf(false);toast.success('Sauvegardé');}}
                  style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#10b981',color:'white',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                  <Save size={12} style={{marginRight:5,verticalAlign:'middle'}} />Sauvegarder
                </button>
                <button onClick={()=>{setPerfDraft(currentPerf);setEditingPerf(false);}}
                  style={{padding:'6px 14px',borderRadius:8,border:'1px solid var(--color-border-light)',background:'transparent',fontWeight:600,fontSize:12,cursor:'pointer'}}>
                  <X size={12} />
                </button>
              </>
            ) : (
              <button onClick={()=>{setPerfDraft(currentPerf);setEditingPerf(true);}}
                style={{padding:'6px 14px',borderRadius:8,border:'1px solid var(--color-border-light)',background:'transparent',fontWeight:600,fontSize:12,cursor:'pointer'}}>
                Modifier
              </button>
            )}
          </div>
        </div>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{background:`${C}10`,borderBottom:`2px solid ${C}25`}}>
                {cfg.perfCols.map(h=>(
                  <th key={h} style={{padding:'10px 16px',textAlign:'left',fontWeight:700,fontSize:11,textTransform:'uppercase',letterSpacing:'.05em',color:C}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(editingPerf?perfDraft:currentPerf).map((row,idx)=>(
                <tr key={idx} style={{borderBottom:'1px solid var(--color-border-light)',background:idx%2===0?'transparent':'var(--color-surface-2)'}}>
                  {Object.values(row).map((val,ci)=>(
                    <td key={ci} style={{padding:'10px 16px',fontWeight:ci===0?700:400,color:ci===0?C:'var(--color-text-1)'}}>
                      {editingPerf ? (
                        <input value={val} onChange={e=>{
                          const keys=Object.keys(row);
                          setPerfDraft(d=>d.map((r,i)=>i===idx?{...r,[keys[ci]]:e.target.value}:r));
                        }} style={{padding:'5px 8px',borderRadius:6,border:'1px solid var(--color-border-light)',fontSize:12,width:'100%',outline:'none',background:'var(--color-surface)'}} />
                      ):val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main AnimalPage ──────────────────────────────────────────────────────────
const TABS = [
  {id:'apercu',       label:'Aperçu',         icon:Activity },
  {id:'today',        label:"Aujourd'hui",    icon:CheckCircle},
  {id:'animaux',      label:'Animaux & ERP',  icon:Package  },
  {id:'surveillance', label:'Surveillance IA',icon:Eye      },
  {id:'protocols',    label:'Protocoles',     icon:Calendar },
];

export default function AnimalPage({ species }) {
  const cfg = SC[species];
  if (!cfg) return <div style={{padding:40}}>Espèce inconnue: {species}</div>;

  const { i18n } = useTranslation();
  const { farmId } = useAuth();
  const [activeTab, setActiveTab] = useState('apercu');
  const [animals, setAnimals]     = useState([]);
  const [workers, setWorkers]     = useState([]);
  const [loading, setLoading]     = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [animRes, wrkRes] = await Promise.all([
        animalsAPI.list({ species:cfg.apiSpecies, farm_id:farmId||1 }),
        farmWorkersAPI.list(farmId||1).catch(()=>({data:[]})),
      ]);
      setAnimals(Array.isArray(animRes.data) ? animRes.data : []);
      setWorkers(Array.isArray(wrkRes.data) ? wrkRes.data : []);
    } catch { setAnimals([]); }
    setLoading(false);
  }, [farmId, cfg.apiSpecies]);

  useEffect(() => { loadData(); }, [loadData]);

  const isAr = i18n.language === 'ar';

  return (
    <>
      <style>{ANIM_CSS}</style>
      <Navbar title={cfg.title} subtitle={cfg.subtitle} />
      <div className="page-content" style={{ direction: isAr ? 'rtl' : 'ltr' }}>

        {/* Tab bar */}
        <div style={{
          display:'flex', gap:4, flexWrap:'wrap',
          background:'var(--color-surface-2)', borderRadius:999,
          padding:4, marginBottom:28,
          width:'fit-content',
          border:'1px solid var(--color-border-light)',
        }}>
          {TABS.map(tab => (
            <TabBtn key={tab.id} {...tab} active={activeTab===tab.id} onClick={setActiveTab} color={cfg.color} />
          ))}
        </div>

        {loading ? (
          <div style={{display:'flex',justifyContent:'center',padding:80}}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            {activeTab==='apercu'       && <AperçuTab       cfg={cfg} animals={animals} onGoToAnimaux={()=>setActiveTab('animaux')} />}
            {activeTab==='today'        && <TodayWorkspace  cfg={cfg} animals={animals} farmId={farmId} workers={workers} />}
            {activeTab==='animaux'      && <AnimauxTab      cfg={cfg} animals={animals} farmId={farmId} onRefresh={loadData} />}
            {activeTab==='surveillance' && <SurveillanceTab cfg={cfg} />}
            {activeTab==='protocols'    && <ProtocolsTab    cfg={cfg} farmId={farmId} workers={workers} />}
          </>
        )}
      </div>
      <ExpertAssistant defaultSpecies={cfg.apiSpecies} />
    </>
  );
}
