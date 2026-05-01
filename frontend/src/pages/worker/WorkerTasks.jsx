import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, Clock, ChevronRight, RefreshCw, WifiOff } from 'lucide-react';
import { useNetworkSync } from '../../hooks/useNetworkSync';
import offlineDB from '../../db/offlineDB';
import api from '../../services/api';

const PRIORITY_COLOR = { high: '#ef4444', urgent: '#ef4444', normal: '#f59e0b', low: '#94a3b8' };

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
        const pending = await offlineDB.pendingTasks.where('synced').equals(0).toArray();
        const pendingMap = {};
        pending.forEach(p => { pendingMap[p.task_id] = p.status; });
        setTasks(data.map(t => pendingMap[t.id] ? { ...t, status: pendingMap[t.id], _pending: true } : t));
      } else {
        const local = await offlineDB.pendingTasks.toArray();
        setTasks(local.map(t => ({ id: t.task_id, title: `Tâche #${t.task_id}`, status: t.status, _pending: true })));
      }
    } catch {
      setError('Impossible de charger les tâches. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const toggleTask = async (task) => {
    const newStatus = task.status === 'pending' ? 'done' : 'pending';
    const doneAt    = newStatus === 'done' ? new Date().toISOString() : null;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, _pending: !isOnline } : t));
    if (isOnline) {
      try {
        await api.put(`/worker/tasks/${task.id}`, { status: newStatus, done_at: doneAt });
      } catch {
        await offlineDB.pendingTasks.put({ task_id: task.id, status: newStatus, done_at: doneAt, synced: 0 });
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, _pending: true } : t));
      }
    } else {
      await offlineDB.pendingTasks.put({ task_id: task.id, status: newStatus, done_at: doneAt, synced: 0 });
    }
  };

  const pending = tasks.filter(t => t.status === 'pending').length;
  const done    = tasks.filter(t => t.status === 'done').length;

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', paddingBottom: 20 }}>

      {/* ── Header ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: '#0f172a', fontSize: 20, fontWeight: 800, margin: 0 }}>Mes Tâches</h1>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: '2px 0 0' }}>
              {loading ? 'Chargement…' : `${pending} à faire · ${done} terminée${done !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={loadTasks}
            disabled={loading}
            style={{
              background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10,
              padding: '8px 12px', cursor: 'pointer', color: '#64748b',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Actualiser
          </button>
        </div>

        {/* Progress bar */}
        {!loading && tasks.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ height: 4, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
                transition: 'width .4s ease',
              }} />
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>
              {tasks.length ? Math.round((done / tasks.length) * 100) : 0}% complété
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 14px 0' }}>

        {/* Offline notice */}
        {!isOnline && (
          <div style={{
            background: '#fefce8', border: '1px solid #fef08a', borderRadius: 12,
            padding: '10px 14px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
            color: '#854d0e', fontSize: 12, fontWeight: 600,
          }}>
            <WifiOff size={14} color="#ca8a04" />
            Hors-ligne — changements synchronisés au retour du réseau
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
            padding: '10px 14px', marginBottom: 12, color: '#b91c1c', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Skeleton loaders */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 72, borderRadius: 14,
                background: '#e2e8f0',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        )}

        {/* Task list */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasks.map(task => {
              const isDone = task.status === 'done';
              return (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task)}
                  style={{
                    padding: '14px 14px',
                    borderRadius: 14,
                    background: isDone ? '#f0fdf4' : '#fff',
                    border: `1px solid ${isDone ? '#bbf7d0' : '#e2e8f0'}`,
                    display: 'flex', alignItems: 'center', gap: 14,
                    cursor: 'pointer', transition: 'all 0.18s',
                    opacity: isDone ? 0.75 : 1,
                    boxShadow: isDone ? 'none' : '0 1px 3px rgba(0,0,0,.04)',
                  }}
                >
                  <div style={{ color: isDone ? '#16a34a' : '#cbd5e1', flexShrink: 0 }}>
                    {isDone ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: isDone ? '#94a3b8' : '#0f172a',
                      fontWeight: 600, fontSize: 14, margin: 0,
                      textDecoration: isDone ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {task.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      {task.due_date && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 11 }}>
                          <Clock size={10} />
                          {typeof task.due_date === 'string' && task.due_date.includes('T')
                            ? new Date(task.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : task.due_date}
                        </div>
                      )}
                      {task.priority && task.priority !== 'normal' && !isDone && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          color: PRIORITY_COLOR[task.priority] || '#94a3b8', letterSpacing: '.03em',
                        }}>
                          {task.priority === 'high' || task.priority === 'urgent' ? '⚡ Urgent' : task.priority}
                        </span>
                      )}
                      {task._pending && (
                        <span style={{
                          fontSize: 10, color: '#d97706', fontWeight: 600,
                          background: '#fef9c3', padding: '1px 6px', borderRadius: 99,
                        }}>
                          ● non sync.
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={16} color="#cbd5e1" style={{ flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && tasks.length === 0 && !error && (
          <div style={{ textAlign: 'center', marginTop: 60, padding: '0 20px' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: '#dcfce7', border: '1px solid #bbf7d0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <CheckCircle2 size={36} color="#16a34a" />
            </div>
            <p style={{ color: '#0f172a', fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>
              Toutes les tâches terminées !
            </p>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
              Le propriétaire vous assignera bientôt de nouvelles tâches.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
      `}</style>
    </div>
  );
}

export default WorkerTasks;
