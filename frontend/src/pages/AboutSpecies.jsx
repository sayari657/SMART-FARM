import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Thermometer, Activity, Calendar, Plus, Milk, Footprints, Heart,
  Briefcase, Users, ClipboardList, Stethoscope, Wallet, Eye, TrendingUp,
  Droplets, CheckCircle2, AlertTriangle, Clock, Trash2, Save, X, FileText,
  Settings, Layers, Hash, ArrowRightLeft, ShieldCheck, Zap, Camera, Image as ImageIcon,
  RefreshCw, ChevronRight, Egg, Bird, PawPrint, Cloud
} from 'lucide-react';
import Navbar from '../components/Navbar';
import AIScanner from '../components/AIScanner';
import AnimalERP from '../components/AnimalERP';
import { animalsAPI, workerTasksAPI, farmsAPI, cvAPI, anomalyAPI } from '../services/api';
import ExpertAssistant from '../components/expert/ExpertAssistant';

const COLORS = {
  primary: '#7c3aed',
  secondary: '#ede9fe',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  text: '#1f2937',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  surface: '#ffffff',
  bg: '#f9fafb'
};

const SPECIES_CONFIG = {
  poultry: {
    name: 'Poultry',
    icon: Egg,
    color: '#fbbf24',
    bgLight: '#fffbeb',
    kpi: 'PRODUCTION OEUFS',
    kpiValue: '1,240 p/j',
    kpiSub: 'Capacité 92%',
    breeds: ['Leghorn', 'Rhode Island Red', 'Sussex', 'Cou Nu'],
    img: '/poultry_monitoring_ia.png'
  },
  sheep: {
    name: 'Sheep',
    icon: Cloud,
    color: '#6366f1',
    bgLight: '#eef2ff',
    kpi: 'POIDS MOYEN LOT',
    kpiValue: '54.5 kg',
    kpiSub: '+1.2kg cette semaine',
    breeds: ['Merinos', 'Barbarine', 'Ouled Djellal', "D'man"],
    img: '/sheep_monitoring_ia.png'
  },
  goat: {
    name: 'Goat',
    icon: Milk,
    color: '#ec4899',
    bgLight: '#fdf2f8',
    kpi: 'PROD. LAITIÈRE',
    kpiValue: '3.2 L/j/chèvre',
    kpiSub: 'Qualité A+',
    breeds: ['Alpine', 'Saanen', 'Damascène', 'Locale'],
    img: '/goat_monitoring_ia.png'
  },
  rabbit: {
    name: 'Rabbit',
    icon: PawPrint,
    color: '#14b8a6',
    bgLight: '#f0fdfa',
    kpi: 'INDICE PROLIFICITÉ',
    kpiValue: '8.4',
    kpiSub: 'Lapereaux / Portée',
    breeds: ['Néo-Zélandais', 'Californien', 'Bouscat', 'Papillon'],
    img: '/rabbit_monitoring_ia.png'
  }
};

export default function AboutSpecies({ speciesType }) {
  const navigate = useNavigate();
  const config = SPECIES_CONFIG[speciesType] || SPECIES_CONFIG.poultry;
  
  const [activeTab, setActiveTab] = useState('ai');
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [financeItems, setFinanceItems] = useState([]);
  const [financeSummary, setFinanceSummary] = useState({ total_expenses: 0, total_revenues: 0, net_profit: 0 });
  const [recentEvents, setRecentEvents] = useState([]);
  const [anomalies, setAnomalies] = useState([]);

  const [activeModal, setActiveModal] = useState(null);
  const [formFinance, setFormFinance] = useState({ type: 'expense', category: 'feed', amount: '', notes: '' });
  const [formTask, setFormTask] = useState({ title: '', category: 'feeding', due_date: '', priority: 'normal' });
  const [formAnimal, setFormAnimal] = useState({ name: '', tag_id: '', status: 'active', breed: config.breeds[0] });

  useEffect(() => { loadAll(); }, [speciesType]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [unitsRes, finance, events, anom] = await Promise.all([
        animalsAPI.list({ species: speciesType }),
        farmsAPI.getFinance(1),
        cvAPI.recent(20),
        anomalyAPI.recent(10)
      ]);
      setUnits(unitsRes.data);
      setFinanceItems(finance.data.items);
      setFinanceSummary(finance.data.summary);
      setRecentEvents(events.data.filter(e => e.object_class?.toLowerCase() === speciesType || (speciesType === 'poultry' && e.object_class === 'bird')));
      setAnomalies(anom.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSaveAnimal = async () => {
    await animalsAPI.create({ ...formAnimal, species: speciesType, farm_id: 1 });
    setActiveModal(null);
    loadAll();
  };

  return (
    <>
      <Navbar title={`Smart Farm AI - ${config.name}`} subtitle={`Gouvernance et Pilotage Opérationnel ${config.name}`} />

      <div className="page-content" style={{ background: COLORS.bg, minHeight: '100dvh', paddingBottom: 100 }}>
        
        {/* ACTIONS */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, overflowX: 'auto', paddingBottom: 10 }}>
          <QuickActionBtn icon={Plus} label={`Nouveau ${config.name}`} onClick={() => setActiveModal('animal')} color={config.color} />
          <QuickActionBtn icon={TrendingUp} label="Saisir Finance" onClick={() => setActiveModal('finance')} color={COLORS.success} />
          <QuickActionBtn icon={ClipboardList} label="Nouvelle Tâche" onClick={() => setActiveModal('task')} color={COLORS.warning} />
        </div>

        {/* TABS MENU */}
        <div style={{ display: 'flex', background: COLORS.surface, padding: 6, borderRadius: 16, border: `1px solid ${COLORS.border}`, marginBottom: 32, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {[
            { id: 'governance', label: 'GOUVERNANCE', icon: Briefcase },
            { id: 'operational', label: 'EXPLOITATION', icon: Layers },
            { id: 'individual', label: 'INDIVIDUEL', icon: Stethoscope },
            { id: 'ai', label: 'SURVEILLANCE IA', icon: Eye },
            ...(speciesType === 'poultry' ? [{ id: 'architecture', label: 'VISION EXPERTE', icon: ShieldCheck }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: activeTab === tab.id ? config.color : 'transparent',
                color: activeTab === tab.id ? 'white' : COLORS.textMuted,
                fontWeight: 800, fontSize: 13, transition: 'all 0.2s'
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        {activeTab === 'architecture' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div className="card" style={{ background: `linear-gradient(135deg, ${config.color}, #4c1d95)`, color: 'white', padding: '40px 60px', borderRadius: 24, boxShadow: '0 10px 30px -10px rgba(124, 58, 237, 0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 900 }}>{config.name} Management System</div>
                <ShieldCheck size={60} style={{ opacity: 0.3 }} />
              </div>
            </div>

            <AnimalERP species={speciesType} color={config.color} />
          </div>
        )}

        {activeTab === 'governance' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div className="grid-3" style={{ gap: 24 }}>
              <LocalStatCard label="SOLDE EXPLOITATION" value={`${financeSummary.net_profit.toLocaleString()} TND`} sub="Bénéfice net actuel" icon={Wallet} color={COLORS.success} />
              <LocalStatCard label={config.kpi} value={config.kpiValue} sub={config.kpiSub} icon={TrendingUp} color={config.color} />
              <LocalStatCard label="INDICE DE SANTÉ" value="98%" sub="Troupeau stable" icon={Zap} color={COLORS.warning} />
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div className="grid-2-1" style={{ gap: 24 }}>
              <div className="card" style={{ padding: 0 }}>
                <AIScanner category={speciesType === 'poultry' ? 'bird' : speciesType} title={`Surveillance IA ${config.name}`} color={config.color} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="card" style={{ padding: 20 }}>
                  <div className="card-title" style={{ fontSize: 14, marginBottom: 16 }}>Détections Récentes</div>
                  {recentEvents.slice(0, 5).map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{e.object_class}</span>
                      <span style={{ fontSize: 13, color: COLORS.success }}>{Math.round(e.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'operational' && (
          <div className="fade-in">
            <div className="card">
              <div className="card-header"><div className="card-title">Lots & Troupes</div></div>
              <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                <GroupCard name={`Lot ${config.name} A`} count={units.length} status="Actif" info={config.kpiValue} color={config.color} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'individual' && (
          <div className="fade-in">
            <div className="card">
              <div className="card-header"><div className="card-title">Registre {config.name}</div></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Identification</th><th>Race</th><th>Actions</th></tr></thead>
                  <tbody>
                    {units.map(unit => (
                      <tr key={unit.id}>
                        <td><div style={{fontWeight: 800}}>{unit.name}</div><code style={{fontSize: 10, color: config.color}}>{unit.tag_id || 'ID-'+unit.id}</code></td>
                        <td>{unit.breed || config.breeds[0]}</td>
                        <td><button className="btn btn-sm btn-secondary" onClick={() => navigate(`/animals/${unit.id}`)}>Détails</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL ANIMAL */}
        {activeModal === 'animal' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div className="card" style={{ width: 450, padding: 0, overflow: 'hidden' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: config.color, color: 'white' }}>
                <div className="card-title" style={{ color: 'white' }}>NOUVEL ANIMAL</div>
                <button onClick={() => setActiveModal(null)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div><label style={labelStyle}>NOM / TAG</label><input type="text" className="input" style={inputStyle} value={formAnimal.name} onChange={e => setFormAnimal({...formAnimal, name: e.target.value})} /></div>
                <div><label style={labelStyle}>RACE</label><select className="input" style={inputStyle} value={formAnimal.breed} onChange={e => setFormAnimal({...formAnimal, breed: e.target.value})}>{config.breeds.map(b => <option key={b}>{b}</option>)}</select></div>
                <button className="btn btn-primary" onClick={handleSaveAnimal} style={{ height: 50, background: config.color }}>Ajouter à l'exploitation</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ExpertAssistant species={speciesType} color={config.color} />
    </>
  );
}

// Internal sub-components
function QuickActionBtn({ icon: Icon, label, onClick, color }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderRadius: 14, border: 'none', background: COLORS.surface, color: COLORS.text, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>
      <div style={{ background: color + '15', padding: 6, borderRadius: 8 }}><Icon size={16} color={color} /></div>
      {label}
    </button>
  );
}

function LocalStatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="card" style={{ padding: 24, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: COLORS.textMuted, letterSpacing: '1px' }}>{label}</div>
        <Icon size={20} color={color} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: COLORS.text }}>{value}</div>
      <div style={{ fontSize: 12, color: COLORS.success, fontWeight: 600, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function GroupCard({ name, count, status, info, color }) {
  return (
    <div style={{ background: COLORS.bg, padding: 20, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 800, fontSize: 15 }}>{name}</span>
        <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 10, background: color + '15', color: color, fontWeight: 900 }}>{status}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900 }}>{count} <span style={{ fontSize: 12, color: COLORS.textMuted }}>unités</span></div>
      <div style={{ marginTop: 12, fontSize: 12, color: COLORS.textMuted }}>Stat: <span style={{ fontWeight: 700, color: COLORS.text }}>{info}</span></div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '14px 16px', borderRadius: 12, border: `1px solid ${COLORS.border}`, background: COLORS.bg, fontSize: 14, fontWeight: 600, outline: 'none', boxSizing: 'border-box' };
const labelStyle = { fontSize: 11, fontWeight: 800, color: COLORS.textMuted, display: 'block', marginBottom: 8, letterSpacing: '1px' };

function ArchCard({ icon: Icon, title, desc }) {
  return (
    <div className="card" style={{ padding: 24, transition: 'transform 0.2s', cursor: 'default' }}>
      <div style={{ background: COLORS.bg, width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Icon size={24} color={COLORS.primary} />
      </div>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: COLORS.text }}>{title}</div>
      <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5, margin: 0 }}>{desc}</p>
    </div>
  );
}

function FeatureBox({ title, desc }) {
  return (
    <div style={{ borderLeft: `4px solid ${COLORS.primary}`, paddingLeft: 20 }}>
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: COLORS.text }}>{title}</div>
      <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>{desc}</p>
    </div>
  );
}
