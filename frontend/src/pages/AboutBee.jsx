import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, MapPin, Hexagon, ClipboardCheck as VisitIcon, Droplets, Wallet, Sparkles, Search, X, Menu, Boxes, CalendarClock
} from 'lucide-react';

// Importation des sous-composants modulaires
import { COLORS } from '../components/bee/BeeConstants';
import DashboardTab from '../components/bee/DashboardTab';
import EmplacementsTab from '../components/bee/EmplacementsTab';
import RuchesTab from '../components/bee/RuchesTab';
import VisitesTab from '../components/bee/VisitesTab';
import ProductionTab from '../components/bee/ProductionTab';
import DepensesTab from '../components/bee/DepensesTab';
import StockTab from '../components/bee/StockTab';
import PrevisionsTab from '../components/bee/PrevisionsTab';

const useOfflineSyncState = (key, initialValue) => {
  const [state, setState] = useState(() => {
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : initialValue;
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)); }, [key, state]);
  return [state, setState];
};

const GlobalStyles = () => (
  <style>{`
    select option { background-color: #1e293b !important; color: #f8fafc !important; padding: 12px !important; }
    select:focus { border-color: #d97706 !important; box-shadow: 0 0 0 2px rgba(217,119,6,0.2) !important; }
    input::placeholder, select::placeholder { color: #94a3b8 !important; opacity: 0.6; }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #0f172a; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; border: 2px solid #0f172a; }
    ::-webkit-scrollbar-thumb:hover { background: #d97706; }
    @media (max-width: 1024px) {
      .sidebar-desktop { display: none !important; }
      .main-content { padding: 20px !important; }
      .search-bar { width: 160px !important; }
    }
    @media (min-width: 1025px) { .mobile-only { display: none !important; } }
  `}</style>
);

export default function AboutBee() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [modalActive, setModalActive] = useState(null);
  const [isAddingVisit, setIsAddingVisit] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- Gestion de l'état global ---
  const [emplacements, setEmplacements] = useOfflineSyncState('bee_emplacements', [
    { id: 1, nom: 'Grombalia Nord', lat: 36.6, lng: 10.5, typeFleur: 'Oranger', saison: 'Printemps', production: 120 },
    { id: 2, nom: 'Haouaria Côte', lat: 37.0, lng: 11.0, typeFleur: 'Thym', saison: 'Eté', production: 80 }
  ]);
  const [ruches, setRuches] = useOfflineSyncState('bee_ruches', []);
  const [visites, setVisites] = useOfflineSyncState('bee_visites', []);
  const [productions, setProductions] = useOfflineSyncState('bee_productions', []);
  const [depenses, setDepenses] = useOfflineSyncState('bee_depenses_list', []);
  const [stock, setStock] = useOfflineSyncState('bee_stock', { sirop: 50, pate: 20, traitement: 15, cadres: 40, hausse: 10, equipement: 100 });
  const [previsions, setPrevisions] = useOfflineSyncState('bee_previsions', []);
  
  // Coûts unitaires pour l'automatisation des dépenses
  const COUTS_UNITAIRES = { sirop: 2.5, pate: 5.0, traitement: 12.0 };

  // --- Moteur de mise à jour automatique ---
  const processVisitImpact = (visite) => {
    // 1. Mise à jour de la ruche
    setRuches(prev => prev.map(r => {
      if (r.name === visite.rucheId) {
        return { 
          ...r, 
          sante: visite.etat === 'health' ? 10 : visite.etat === 'urgent' ? 2 : 5, 
          miel: visite.miel === 'Abondant' ? 10 : visite.miel === 'Moyen' ? 6 : 2,
          lastVisit: visite.date
        };
      }
      return r;
    }));

    // 2. Décrémentation du stock (Simulation de consommation par visite)
    setStock(prev => ({
      ...prev,
      sirop: Math.max(0, prev.sirop - (visite.needs?.sirop || 0)),
      pate: Math.max(0, prev.pate - (visite.needs?.pate || 0)),
      traitement: Math.max(0, prev.traitement - (visite.needs?.traitement || 0))
    }));

    // 3. Ajout automatique à la production si récolte signalée
    if (visite.recolteKgs > 0) {
      const siteId = ruches.find(r => r.name === visite.rucheId)?.empId;
      setProductions(prev => [...prev, {
        id: Date.now(),
        date: visite.date,
        empId: siteId,
        miel: visite.recolteKgs,
        pollen: visite.pollenKgs || 0
      }]);
    }

    // 4. Ajout automatique aux dépenses (Nouveau : Conformité Point 9)
    const coutTotal = (visite.needs?.sirop || 0) * COUTS_UNITAIRES.sirop +
                      (visite.needs?.pate || 0) * COUTS_UNITAIRES.pate +
                      (visite.needs?.traitement || 0) * COUTS_UNITAIRES.traitement;
    
    if (coutTotal > 0) {
      const siteId = ruches.find(r => r.name === visite.rucheId)?.empId;
      setDepenses(prev => [...prev, {
        id: Date.now() + 1, // Petit offset pour ID unique
        date: visite.date,
        type: 'Alimentation/Soins',
        empId: siteId,
        montantPrevu: coutTotal,
        montantReel: coutTotal, // On a utilisé le stock, donc payé
        description: `Consommation auto-enregistrée via visite ruche ${visite.rucheId}`
      }]);
    }
  };

  const stats = useMemo(() => ({
    totalMiel: productions.reduce((acc, p) => acc + parseFloat(p.miel || 0), 0) + ' kg',
    sante: visites.length === 0 ? '92%' : Math.round((visites.filter(v => v.etat === 'health').length / visites.length) * 100) + '%',
    alertes: visites.filter(v => v.etat === 'urgent' || v.etat === 'warning').length,
    lowStock: Object.values(stock).some(v => v < 10)
  }), [productions, visites, stock]);

  // --- Formulaires locaux ---
  const [previewImage, setPreviewImage] = useState(null);
  const [empForm, setEmpForm] = useState({ nom: '', saison: 'Printemps', fleur: '', lat: '', lng: '' });
  const [rucheForm, setRucheForm] = useState({ qr: `HIVE-${(ruches.length + 1).toString().padStart(4, '0')}`, empId: '', active: true });
  const [prodForm, setProdForm] = useState({ date: new Date().toISOString().split('T')[0], empId: '', miel: 0, pollen: 0 });
  const [visiteForm, setVisiteForm] = useState({ 
    date: new Date().toLocaleDateString('fr-FR'), 
    gps: '', 
    rucheId: '', 
    etat: 'health', 
    temp: 32, 
    miel: 'Moyen', 
    photo: null, 
    notes: '', 
    needs: { sirop: 0, pate: 0, traitement: 0 }, 
    recolteKgs: 0,
    pollenKgs: 0 // CHAMP MANQUANT QUI CAUSAIT LE CRASH
  });
  const [depenseForm, setDepenseForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'Alimentation', empId: '', montantPrevu: 0, montantReel: 0, description: '' });

  const captureGPS = (type) => navigator.geolocation && navigator.geolocation.getCurrentPosition((pos) => {
    const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
    if (type === 'emp') setEmpForm({ ...empForm, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) });
    else setVisiteForm({ ...visiteForm, gps: coords });
  });

  const handleActionNavigation = (tab, subAction) => {
    setActiveTab(tab);
    if (subAction === 'addVisit') setIsAddingVisit(true);
    if (subAction === 'addRuche') setModalActive('ruche');
    if (subAction === 'addEmp') setModalActive('emplacement');
  };

  const handlers = {
    addEmp: () => { if (!empForm.nom) return; setEmplacements([...emplacements, { ...empForm, id: Date.now(), production: 0 }]); setModalActive(null); },
    deleteEmp: (id) => {
      if (confirm("Supprimer cet emplacement supprimera l'historique associé. Confirmer ?")) {
        setEmplacements(emplacements.filter(e => e.id !== id));
      }
    },
    addRuche: () => { if (!rucheForm.empId) return; setRuches([...ruches, { id: Date.now(), name: rucheForm.qr, empId: rucheForm.empId, sante: 10, miel: 2, force: 5, active: rucheForm.active }]); setModalActive(null); setRucheForm({ ...rucheForm, qr: `HIVE-${(ruches.length + 2).toString().padStart(4, '0')}` }); },
    deleteRuche: (id) => {
      if (confirm("Voulez-vous vraiment supprimer cette ruche ?")) {
        setRuches(ruches.filter(r => r.id !== id));
      }
    },
    addVisite: () => { 
      if (!visiteForm.rucheId) return; 
      const newVisit = { ...visiteForm, id: Date.now() };
      setVisites([...visites, newVisit]); 
      processVisitImpact(newVisit);
      setIsAddingVisit(false); 
      setVisiteForm({ 
        date: new Date().toLocaleDateString('fr-FR'), 
        gps: '', 
        rucheId: '', 
        etat: 'health', 
        temp: 32, 
        miel: 'Moyen', 
        photo: null, 
        notes: '', 
        needs: { sirop: 0, pate: 0, traitement: 0 }, 
        recolteKgs: 0,
        pollenKgs: 0 
      });
    },
    updateRucheStat: (id, field, delta) => {
      setRuches(prev => prev.map(r => r.id === id ? { ...r, [field]: Math.max(1, Math.min(10, (r[field] || 5) + delta)) } : r));
    },
    updateStock: (item, delta) => {
      setStock(prev => ({ ...prev, [item]: Math.max(0, prev[item] + delta) }));
    },
    addPrevision: (payload) => {
      const newPrev = { 
        ...payload, 
        id: Date.now(), 
        status: 'pending',
        tasks: payload.tasks && payload.tasks.length > 0 
          ? payload.tasks.map((t, idx) => ({ id: idx, text: t, status: 'todo' }))
          : [
              { id: 1, text: 'Inspection générale', status: 'todo' },
              { id: 2, text: 'Nettoyage plateau', status: 'todo' }
            ]
      };
      setPrevisions([...previsions, newPrev]);
    },
    updatePrevTask: (prevId, taskId, newStatus) => {
      setPrevisions(prevs => prevs.map(p => {
        if (p.id === prevId) {
          return { 
            ...p, 
            tasks: p.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
          };
        }
        return p;
      }));
    },
    addProd: () => { if (!prodForm.empId) return; setProductions([...productions, { ...prodForm, id: Date.now() }]); setModalActive(null); },
    addDepense: () => { if (!depenseForm.montantReel && !depenseForm.montantPrevu) return; setDepenses([...depenses, { ...depenseForm, id: Date.now() }]); setModalActive(null); }
  };

  const menuItems = [
    {id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard},
    {id: 'emplacements', label: 'Sites GIS', icon: MapPin},
    {id: 'ruches', label: 'Ruches', icon: Hexagon},
    {id: 'visites', label: 'Visites', icon: VisitIcon},
    {id: 'stock', label: 'Stock & Logistique', icon: Boxes},
    {id: 'previsions', label: 'Prévisions', icon: CalendarClock},
    {id: 'production', label: 'Production', icon: Droplets},
    {id: 'depenses', label: 'Dépenses', icon: Wallet}
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', background: COLORS.bg, fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>
      <GlobalStyles />
      <div className="sidebar-desktop" style={{ width: 280, height: '100%', background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
         <div style={{ padding: '0 24px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles color="white" size={24}/></div>
            <div>
               <div style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>SMART-BEE</div>
               <div style={{ color: COLORS.textMuted, fontSize: 10 }}>EDITION ENTREPRISE</div>
            </div>
         </div>
         <div style={{ flex: 1 }}>
            {menuItems.map(it => (
               <button key={it.id} onClick={() => { setActiveTab(it.id); setIsAddingVisit(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', background: activeTab === it.id ? 'rgba(217,119,6,0.1)' : 'transparent', color: activeTab === it.id ? COLORS.accent : COLORS.textMuted, border: 'none', borderLeft: activeTab === it.id ? `4px solid ${COLORS.accent}` : '4px solid transparent', cursor: 'pointer', textAlign: 'left', fontWeight: activeTab === it.id ? 700 : 500 }}>
                  <it.icon size={20} /><span>{it.label}</span>
                  {it.id === 'stock' && stats.lowStock && <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: COLORS.error }} />}
               </button>
            ))}
         </div>
      </div>

      {isMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} onClick={() => setIsMenuOpen(false)}>
          <div style={{ width: 280, height: '100%', background: COLORS.surface, display: 'flex', flexDirection: 'column', padding: '24px 0', animation: 'slideIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
             <style>{`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
             <div style={{ padding: '0 24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles color="white" size={18}/></div>
                  <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>SMART-BEE</div>
                </div>
                <button onClick={() => setIsMenuOpen(false)} style={{ background: 'none', border: 'none', color: COLORS.textMuted }}><X size={24}/></button>
             </div>
             <div style={{ flex: 1 }}>
                {menuItems.map(it => (
                   <button key={it.id} onClick={() => { setActiveTab(it.id); setIsAddingVisit(false); setIsMenuOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', background: activeTab === it.id ? 'rgba(217,119,6,0.1)' : 'transparent', color: activeTab === it.id ? COLORS.accent : COLORS.textMuted, border: 'none', borderLeft: activeTab === it.id ? `4px solid ${COLORS.accent}` : '4px solid transparent', cursor: 'pointer', textAlign: 'left', fontWeight: activeTab === it.id ? 700 : 500 }}>
                      <it.icon size={20} /><span>{it.label}</span>
                   </button>
                ))}
             </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ height: 80, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', padding: '0 40px', justifyContent: 'space-between', background: COLORS.bg, position: 'sticky', top: 0, zIndex: 100 }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <button className="mobile-only" onClick={() => setIsMenuOpen(true)} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: 'white', padding: 8, borderRadius: 10, cursor: 'pointer' }}><Menu size={24} /></button>
              <div className="search-bar" style={{ position: 'relative', width: 400 }}>
                 <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted }}/>
                 <input style={{ width: '100%', height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, paddingLeft: 48, color: 'white' }} placeholder="Intelligence Search..."/>
              </div>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="sidebar-desktop" style={{ textAlign: 'right' }}>
                 <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Coordonnateur</div>
                 <div style={{ color: COLORS.textMuted, fontSize: 11 }}>Gestion de Production</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900 }}>AI</div>
           </div>
        </div>

        <div className="main-content" style={{ padding: 40 }}>
           {activeTab === 'dashboard' && <DashboardTab ruches={ruches} isProcessing={false} previewImage={previewImage} onImport={() => {}} onAction={handleActionNavigation} stats={stats} />}
           {activeTab === 'emplacements' && <EmplacementsTab emplacements={emplacements} modalActive={modalActive} setModalActive={setModalActive} empForm={empForm} setEmpForm={setEmpForm} captureGPS={() => captureGPS('emp')} handleAddEmp={handlers.addEmp} onDelete={handlers.deleteEmp} />}
           {activeTab === 'ruches' && <RuchesTab ruches={ruches} emplacements={emplacements} visites={visites} productions={productions} modalActive={modalActive} setModalActive={setModalActive} rucheForm={rucheForm} setRucheForm={setRucheForm} handleAddRuche={handlers.addRuche} onUpdateStat={handlers.updateRucheStat} onDelete={handlers.deleteRuche} />}
           {activeTab === 'visites' && <VisitesTab visites={visites} ruches={ruches} isAddingVisit={isAddingVisit} setIsAddingVisit={setIsAddingVisit} visiteForm={visiteForm} setVisiteForm={setVisiteForm} captureGPS={() => captureGPS('visite')} handleAddVisite={handlers.addVisite} />}
           {activeTab === 'stock' && <StockTab stock={stock} visites={visites} ruches={ruches} onUpdate={handlers.updateStock} />}
           {activeTab === 'previsions' && <PrevisionsTab emplacements={emplacements} ruches={ruches} previsions={previsions} onAdd={handlers.addPrevision} onUpdateTask={handlers.updatePrevTask} />}
           {activeTab === 'production' && <ProductionTab productions={productions} emplacements={emplacements} modalActive={modalActive} setModalActive={setModalActive} prodForm={prodForm} setProdForm={setProdForm} handleAddProd={handlers.addProd} />}
           {activeTab === 'depenses' && <DepensesTab depenses={depenses} emplacements={emplacements} modalActive={modalActive} setModalActive={setModalActive} depenseForm={depenseForm} setDepenseForm={setDepenseForm} handleAddDepense={handlers.addDepense} />}
        </div>
      </div>
    </div>
  );
}
