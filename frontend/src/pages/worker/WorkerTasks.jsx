import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, Clock, ChevronRight, RefreshCw, WifiOff, Milk, Utensils, Stethoscope, Eraser, AlertTriangle } from 'lucide-react';
import { useNetworkSync } from '../../hooks/useNetworkSync';
import offlineDB from '../../db/offlineDB';
import api from '../../services/api';

const CATEGORY_ICONS = {
  milking: { icon: Milk, color: '#3b82f6', bg: '#eff6ff', label: '🥛 Traite' },
  feeding: { icon: Utensils, color: '#10b981', bg: '#ecfdf5', label: '🌾 Alimentation' },
  health: { icon: Stethoscope, color: '#ef4444', bg: '#fef2f2', label: '💉 Soins' },
  cleaning: { icon: Eraser, color: '#f59e0b', bg: '#fffbeb', label: '🧹 Nettoyage' },
  other: { icon: Clock, color: '#6b7280', bg: '#f9fafb', label: '📋 Autre' }
};

function WorkerTasks() {
  const { isOnline } = useNetworkSync();
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isOnline) {
        const { data } = await api.get('/worker-tasks');
        setTasks(data);
      } else {
        const local = await offlineDB.pendingTasks.toArray();
        setTasks(local.map(t => ({ id: t.task_id, title: t.title || `Tâche #${t.task_id}`, status: t.status, category: t.category || 'other' })));
      }
    } catch {
      setError('Impossible de charger les tâches.');
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const toggleTask = async (task) => {
    if (task.status === 'done') return; // Once done, it's locked in this simple view
    
    const newStatus = 'done';
    const doneAt    = new Date().toISOString();
    
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    
    try {
      if (isOnline) {
        await api.put(`/worker-tasks/${task.id}`, { status: newStatus, done_at: doneAt });
      } else {
        await offlineDB.pendingTasks.put({ task_id: task.id, status: newStatus, done_at: doneAt, synced: 0 });
      }
    } catch (err) {
      console.error(err);
      // Rollback or handle error
    }
  };

  return (
    <div style={{ background: '#f3f4f6', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Header */}
      <header style={{ background: '#2563eb', padding: '24px 20px', color: 'white', borderRadius: '0 0 24px 24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Mes Tâches</h1>
            <p style={{ fontSize: 13, opacity: 0.8, margin: '4px 0 0' }}>Ferme AI · Ouvrier : Ali</p>
          </div>
          <button onClick={loadTasks} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <div style={{ padding: '20px' }}>
        {!isOnline && (
          <div style={{ background: '#fffbeb', color: '#92400e', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #fde68a' }}>
            <WifiOff size={16} /> Mode hors-ligne actif
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tasks.map(task => {
            const isDone = task.status === 'done';
            const cat = CATEGORY_ICONS[task.category] || CATEGORY_ICONS.other;
            const Icon = cat.icon;

            return (
              <div 
                key={task.id} 
                onClick={() => !isDone && toggleTask(task)}
                style={{
                  background: isDone ? 'rgba(255,255,255,0.6)' : 'white',
                  borderRadius: 20, padding: 18, border: `1px solid ${isDone ? '#e5e7eb' : '#fff'}`,
                  boxShadow: isDone ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'transform 0.1s', cursor: isDone ? 'default' : 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 14, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.color }}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: isDone ? '#9ca3af' : '#1f2937' }}>{task.title}</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: isDone ? '#d1d5db' : '#6b7280' }}>
                      {cat.label} {task.due_date && '· ' + new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                
                {isDone ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 800, fontSize: 14 }}>
                    <CheckCircle2 size={20} /> <span>✓ FAIT</span>
                  </div>
                ) : (
                  <button style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 12, fontWeight: 800, fontSize: 13 }}>
                    Valider
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {tasks.length === 0 && !loading && (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <div style={{ fontSize: 60, marginBottom: 20 }}>🎉</div>
            <h2 style={{ color: '#1f2937', fontWeight: 900 }}>Bravo !</h2>
            <p style={{ color: '#6b7280' }}>Toutes les tâches sont terminées.</p>
          </div>
        )}
      </div>

      {/* Floating Action Button for Anomalies */}
      <div style={{ position: 'fixed', bottom: 30, left: 20, right: 20 }}>
        <button 
          onClick={() => window.location.href = '/worker/report'}
          style={{ width: '100%', background: '#f59e0b', color: 'white', padding: '18px', borderRadius: 20, border: 'none', fontWeight: 900, fontSize: 16, boxShadow: '0 10px 15px -3px rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          <AlertTriangle size={20} /> + SIGNALER ANOMALIE
        </button>
      </div>

      <style>{`
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      `}</style>
    </div>
  );
}

export default WorkerTasks;
