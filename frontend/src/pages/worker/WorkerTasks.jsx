import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, Clock, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useNetworkSync } from '../../hooks/useNetworkSync';
import offlineDB from '../../db/offlineDB';
import api from '../../services/api';

const PRIORITY_COLOR = { high: '#ef4444', urgent: '#ef4444', normal: '#f59e0b', low: '#64748b' };

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
        const { data } = await api.get('/worker/tasks');
        // Merge any pending offline status changes
        const pending = await offlineDB.pendingTasks.where('synced').equals(0).toArray();
        const pendingMap = {};
        pending.forEach(p => { pendingMap[p.task_id] = p.status; });
        const merged = data.map(t => pendingMap[t.id] ? { ...t, status: pendingMap[t.id], _pending: true } : t);
        setTasks(merged);
      } else {
        // Full offline — show only locally queued updates
        const local = await offlineDB.pendingTasks.toArray();
        setTasks(local.map(t => ({ id: t.task_id, title: `Tâche #${t.task_id}`, status: t.status, _pending: true })));
      }
    } catch (e) {
      setError('Impossible de charger les tâches. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const toggleTask = async (task) => {
    const newStatus = task.status === 'pending' ? 'done' : 'pending';
    const doneAt    = newStatus === 'done' ? new Date().toISOString() : null;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, _pending: !isOnline } : t));

    if (isOnline) {
      try {
        await api.put(`/worker/tasks/${task.id}`, { status: newStatus, done_at: doneAt });
      } catch {
        // Queue for later if API call fails
        await offlineDB.pendingTasks.put({ task_id: task.id, status: newStatus, done_at: doneAt, synced: 0 });
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, _pending: true } : t));
      }
    } else {
      await offlineDB.pendingTasks.put({ task_id: task.id, status: newStatus, done_at: doneAt, synced: 0 });
    }
  };

  const pending = tasks.filter(t => t.status === 'pending').length;

  return (
    <div style={{ padding: '24px 20px', background: '#0f172a', minHeight: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            Mes Tâches
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
            {loading ? 'Chargement...' : `${pending} tâche${pending !== 1 ? 's' : ''} à accomplir`}
          </p>
        </div>
        <button
          onClick={loadTasks}
          disabled={loading}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '10px 14px', cursor: 'pointer', color: '#64748b',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 20, color: '#f87171', fontSize: 14
        }}>
          {error}
        </div>
      )}

      {/* Offline notice */}
      {!isOnline && (
        <div style={{
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 14, padding: '12px 16px', marginBottom: 20,
          color: '#fbbf24', fontSize: 13, fontWeight: 600
        }}>
          Hors-ligne — les changements seront synchronisés dès le retour du réseau
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 76, borderRadius: 20,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          ))}
        </div>
      )}

      {/* Task list */}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tasks.map(task => (
            <div
              key={task.id}
              onClick={() => toggleTask(task)}
              style={{
                padding: '16px',
                borderRadius: 20,
                background: task.status === 'done' ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${task.status === 'done' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
                display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer', transition: 'all 0.2s',
                opacity: task.status === 'done' ? 0.7 : 1
              }}
            >
              <div style={{ color: task.status === 'done' ? '#22c55e' : '#475569', flexShrink: 0 }}>
                {task.status === 'done' ? <CheckCircle2 size={26} /> : <Circle size={26} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                  color: task.status === 'done' ? '#94a3b8' : '#f1f5f9',
                  fontWeight: 600, fontSize: 15, margin: 0,
                  textDecoration: task.status === 'done' ? 'line-through' : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {task.title}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                  {task.due_date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 11 }}>
                      <Clock size={11} />
                      <span>{typeof task.due_date === 'string' && task.due_date.includes('T')
                        ? new Date(task.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : task.due_date}
                      </span>
                    </div>
                  )}
                  {task.priority && task.priority !== 'normal' && task.status !== 'done' && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      color: PRIORITY_COLOR[task.priority] || '#64748b',
                      letterSpacing: '0.5px'
                    }}>
                      {task.priority === 'high' || task.priority === 'urgent' ? '⚡ Urgent' : task.priority}
                    </span>
                  )}
                  {task._pending && (
                    <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>● non sync.</span>
                  )}
                </div>
              </div>

              <ChevronRight size={18} color="#1e293b" style={{ flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && tasks.length === 0 && !error && (
        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
          }}>
            <CheckCircle2 size={40} color="#22c55e" />
          </div>
          <p style={{ color: '#f1f5f9', fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>
            Toutes les tâches sont terminées !
          </p>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            Le propriétaire vous assignera bientôt de nouvelles tâches.
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}

export default WorkerTasks;
