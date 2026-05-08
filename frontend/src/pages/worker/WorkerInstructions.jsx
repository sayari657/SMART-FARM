import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Heart, Droplets, Trash2, BookOpen, RefreshCw } from 'lucide-react';
import { workerTasksAPI } from '../../services/api';

// ── Static instruction data ───────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'feeding',   label: '🌾 Alimentation', color: '#16a34a' },
  { id: 'health',    label: '💊 Santé',         color: '#ef4444' },
  { id: 'cleaning',  label: '🧹 Nettoyage',     color: '#f59e0b' },
  { id: 'emergency', label: '🚨 Urgences',       color: '#dc2626' },
  { id: 'tasks',     label: '📝 Consignes',      color: '#0891b2' },
];

const STATIC_INSTRUCTIONS = {
  feeding: [
    { icon: '⏰', text: 'Vérifier les niveaux des mangeoires avant 07h00 chaque matin.' },
    { icon: '💧', text: 'S\'assurer que l\'eau propre est disponible en permanence — nettoyer les abreuvoirs si trouble.' },
    { icon: '📦', text: 'Respecter les phases d\'alimentation : Démarrage (J1–J14), Croissance (J15–J28), Finition (J29+).' },
    { icon: '📱', text: 'Enregistrer la quantité consommée dans l\'ERP chaque matin (module 🌾 Feed).' },
    { icon: '🚫', text: 'Ne jamais mélanger les aliments de phases différentes sans autorisation du responsable.' },
    { icon: '🌡️', text: 'En cas de chaleur excessive (>32°C), augmenter la fréquence d\'abreuvement.' },
  ],
  health: [
    { icon: '👁️', text: 'Observer le comportement à chaque passage : entassement, léthargie, bec ouvert = alerte.' },
    { icon: '📊', text: 'Signaler toute mortalité supérieure à 3 têtes par jour immédiatement au responsable.' },
    { icon: '💉', text: 'Ne jamais administrer un vaccin ou médicament sans validation écrite du responsable.' },
    { icon: '📋', text: 'Enregistrer tout acte sanitaire dans l\'ERP (module 💊 Health) le jour même.' },
    { icon: '🦠', text: 'En cas de symptômes respiratoires (toux, jetage), isoler les sujets suspects immédiatement.' },
    { icon: '🧤', text: 'Porter les EPI (gants, masque) lors de toute manipulation de médicaments ou vaccins.' },
  ],
  cleaning: [
    { icon: '🪣', text: 'Désinfecter les abreuvoirs toutes les 48 heures avec solution chlorée à 0.5%.' },
    { icon: '🗑️', text: 'Collecter les cadavres chaque matin et les déposer dans le bac dédié (sac fermé).' },
    { icon: '⏳', text: 'Vide sanitaire minimum 14 jours entre deux lots — ne pas raccourcir ce délai.' },
    { icon: '💦', text: 'Litière humide → signaler immédiatement via l\'app (Signaler), retourner la litière.' },
    { icon: '🥾', text: 'EPI obligatoires en bâtiment : surbottes + masque + tenue dédiée. Déchausser à la sortie.' },
    { icon: '🧴', text: 'Pédiluve à l\'entrée : vérifier niveau et concentration quotidiennement.' },
  ],
  emergency: [
    { icon: '💀', text: 'Mortalité massive (>20 têtes/heure) : appeler le vétérinaire + alerter le responsable immédiatement. NE PAS attendre.' },
    { icon: '🌀', text: 'Panne de ventilation : ouvrir les trappes manuelles, appeler maintenance, sortir les animaux si T° > 35°C.' },
    { icon: '🔥', text: 'Incendie : alerter le 197 (pompiers), couper l\'électricité, évacuer les volailles par zone si possible.' },
    { icon: '🦠', text: 'Suspicion maladie contagieuse (IA, Newcastle) : isoler le lot, bloquer entrées, alerter UTAP au +216 71 841 222.' },
    { icon: '💡', text: 'Panne électrique : allumer les générateurs de secours, vérifier ventilateurs et chauffage.' },
    { icon: '📞', text: 'Numéros d\'urgence : Responsable ferme | Vétérinaire | UTAP | Pompiers 197 — affichés à l\'entrée.' },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorkerInstructions() {
  const navigate       = useNavigate();
  const [activeTab, setActiveTab]       = useState('feeding');
  const [dynTasks, setDynTasks]         = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    if (activeTab !== 'tasks') return;
    setLoadingTasks(true);
    workerTasksAPI.list({ farm_id: 1 })
      .then(r => setDynTasks((r.data || []).filter(t => t.category === 'instruction')))
      .catch(() => setDynTasks([]))
      .finally(() => setLoadingTasks(false));
  }, [activeTab]);

  const cat      = CATEGORIES.find(c => c.id === activeTab);
  const catColor = cat?.color ?? '#0891b2';

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0891b2 0%, #0369a1 100%)',
        padding: '16px 18px 24px', color: 'white', position: 'relative',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 10, padding: '7px 10px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, marginBottom: 14 }}
        >
          <ArrowLeft size={15} /> Retour
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={22} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: '-0.3px' }}>Protocoles & Consignes</h1>
            <div style={{ fontSize: 12, opacity: .8, marginTop: 2 }}>Guides de travail — Smart Farm AI</div>
          </div>
        </div>
      </div>

      {/* Category tabs (horizontal scroll) */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e2e8f0',
        overflowX: 'auto', display: 'flex', gap: 0, padding: '0 4px',
        scrollbarWidth: 'none', WebkitScrollbar: { display: 'none' },
      }}>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveTab(c.id)}
            style={{
              flexShrink: 0, padding: '13px 14px', border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: 13, fontWeight: activeTab === c.id ? 800 : 500,
              color: activeTab === c.id ? c.color : '#64748b',
              borderBottom: `2.5px solid ${activeTab === c.id ? c.color : 'transparent'}`,
              transition: 'all .15s', whiteSpace: 'nowrap',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 14px' }}>

        {/* Section title */}
        <div style={{
          background: catColor + '12', border: `1px solid ${catColor}30`,
          borderRadius: 12, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: catColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CatIcon id={activeTab} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: catColor }}>{cat?.label}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
              {activeTab === 'tasks' ? 'Consignes personnalisées de votre responsable' : 'Protocoles standard Smart Farm AI'}
            </div>
          </div>
        </div>

        {/* Static instructions */}
        {activeTab !== 'tasks' && (
          <div>
            {(STATIC_INSTRUCTIONS[activeTab] || []).map((item, i) => (
              <InstructionCard key={i} icon={item.icon} text={item.text} color={catColor} />
            ))}
          </div>
        )}

        {/* Dynamic tasks (consignes from owner) */}
        {activeTab === 'tasks' && (
          <div>
            {loadingTasks ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <RefreshCw size={24} color="#0891b2" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : dynTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: '#94a3b8' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Aucune consigne personnalisée</div>
                <div style={{ fontSize: 13 }}>Votre responsable n'a pas encore ajouté de consignes.</div>
              </div>
            ) : (
              dynTasks.map(t => (
                <div key={t.id} style={{
                  background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                  borderLeft: `4px solid #0891b2`, boxShadow: '0 2px 8px rgba(0,0,0,.05)',
                }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: t.description ? 5 : 0 }}>{t.title}</div>
                  {t.description && (
                    <p style={{ fontSize: 13, lineHeight: 1.65, color: '#475569', margin: 0 }}>{t.description}</p>
                  )}
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 7 }}>
                    {t.priority === 'urgent' && <span style={{ color: '#ef4444', fontWeight: 700, marginRight: 8 }}>🔴 URGENT</span>}
                    Ajouté le {t.created_at ? new Date(t.created_at).toLocaleDateString('fr-FR') : '—'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mini helpers ──────────────────────────────────────────────────────────────

function InstructionCard({ icon, text, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 10,
      borderLeft: `4px solid ${color}`, boxShadow: '0 2px 8px rgba(0,0,0,.05)',
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{icon}</span>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: '#1f2937', margin: 0 }}>{text}</p>
    </div>
  );
}

function CatIcon({ id }) {
  const props = { size: 16, color: 'white' };
  if (id === 'feeding')   return <Droplets  {...props} />;
  if (id === 'health')    return <Heart     {...props} />;
  if (id === 'cleaning')  return <Trash2    {...props} />;
  if (id === 'emergency') return <AlertTriangle {...props} />;
  return <BookOpen {...props} />;
}
