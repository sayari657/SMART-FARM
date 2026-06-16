import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, AlertTriangle, Heart, Droplets, Trash2, BookOpen, RefreshCw } from 'lucide-react';
import { workerTasksAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function WorkerInstructions() {
  const navigate       = useNavigate();
  const { farmId }     = useAuth();
  const { t }          = useTranslation();
  const [activeTab, setActiveTab]       = useState('feeding');
  const [dynTasks, setDynTasks]         = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const CATEGORIES = [
    { id: 'feeding',   label: t('worker.instructions.category.feeding'),   color: '#16a34a' },
    { id: 'health',    label: t('worker.instructions.category.health'),    color: '#ef4444' },
    { id: 'cleaning',  label: t('worker.instructions.category.cleaning'),  color: '#f59e0b' },
    { id: 'emergency', label: t('worker.instructions.category.emergency'), color: '#dc2626' },
    { id: 'tasks',     label: t('worker.instructions.category.tasks'),     color: '#0891b2' },
  ];

  const STATIC_ICONS = {
    feeding:   ['⏰', '💧', '📦', '📱', '🚫', '🌡️'],
    health:    ['👁️', '📊', '💉', '📋', '🦠', '🧤'],
    cleaning:  ['🪣', '🗑️', '⏳', '💦', '🥾', '🧴'],
    emergency: ['💀', '🌀', '🔥', '🦠', '💡', '📞'],
  };

  const getItems = (catId) => {
    const keyMap = {
      feeding: 'feeding_items',
      health: 'health_items',
      cleaning: 'cleaning_items',
      emergency: 'emergency_items',
    };
    const key = keyMap[catId];
    if (!key) return [];
    const items = t(`worker.instructions.${key}`, { returnObjects: true });
    if (!Array.isArray(items)) return [];
    const icons = STATIC_ICONS[catId] || [];
    return items.map((text, i) => ({ icon: icons[i] || '•', text }));
  };

  useEffect(() => {
    if (activeTab !== 'tasks') return;
    setLoadingTasks(true);
    workerTasksAPI.list({ farm_id: farmId || 1 })
      .then(r => setDynTasks((r.data || []).filter(t => t.category === 'instruction')))
      .catch(() => setDynTasks([]))
      .finally(() => setLoadingTasks(false));
  }, [activeTab]);

  const cat      = CATEGORIES.find(c => c.id === activeTab);
  const catColor = cat?.color ?? '#0891b2';

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', paddingBottom: 90 }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0891b2 0%, #0369a1 100%)',
        padding: '16px 18px 24px', color: 'white',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 10, padding: '7px 10px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, marginBottom: 14 }}
        >
          <ArrowLeft size={15} /> {t('worker.instructions.back')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={22} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: '-0.3px' }}>{t('worker.instructions.title')}</h1>
            <div style={{ fontSize: 12, opacity: .8, marginTop: 2 }}>{t('worker.instructions.subtitle')}</div>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e2e8f0',
        overflowX: 'auto', display: 'flex', gap: 0, padding: '0 4px',
        scrollbarWidth: 'none',
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

        {/* Section header */}
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
              {activeTab === 'tasks'
                ? t('worker.instructions.custom_tasks')
                : t('worker.instructions.standard_proto')}
            </div>
          </div>
        </div>

        {/* Static instructions */}
        {activeTab !== 'tasks' && (
          <div>
            {getItems(activeTab).map((item, i) => (
              <InstructionCard key={i} icon={item.icon} text={item.text} color={catColor} />
            ))}
          </div>
        )}

        {/* Dynamic tasks from owner */}
        {activeTab === 'tasks' && (
          <div>
            {loadingTasks ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <RefreshCw size={24} color="#0891b2" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : dynTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: '#94a3b8' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t('worker.instructions.no_custom')}</div>
                <div style={{ fontSize: 13 }}>{t('worker.instructions.no_custom_desc')}</div>
              </div>
            ) : (
              dynTasks.map(task => (
                <div key={task.id} style={{
                  background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                  borderLeft: `4px solid #0891b2`, boxShadow: '0 2px 8px rgba(0,0,0,.05)',
                }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: task.description ? 5 : 0 }}>{task.title}</div>
                  {task.description && (
                    <p style={{ fontSize: 13, lineHeight: 1.65, color: '#475569', margin: 0 }}>{task.description}</p>
                  )}
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 7 }}>
                    {task.priority === 'urgent' && <span style={{ color: '#ef4444', fontWeight: 700, marginRight: 8 }}>{t('worker.instructions.urgent')}</span>}
                    {t('worker.instructions.added_on')} {task.created_at ? new Date(task.created_at).toLocaleDateString() : '—'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

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
