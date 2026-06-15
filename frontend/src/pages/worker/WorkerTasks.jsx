import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Clock, RefreshCw, WifiOff, AlertTriangle,
  Milk, Utensils, Stethoscope, Eraser,
} from 'lucide-react';
import { useNetworkSync } from '../../hooks/useNetworkSync';
import offlineDB from '../../db/offlineDB';
import api from '../../services/api';
import {
  WT, WorkerPage, PageHeader, Card,
  Skeleton, EmptyState, Segmented, ProgressRing, FloatingCTA, WorkerStyles,
} from './workerUI';
import OwnerReportCard from './OwnerReportCard';

function WorkerTasks() {
  const { t } = useTranslation();
  const { isOnline } = useNetworkSync();
  const navigate = useNavigate();
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [filter, setFilter]   = useState('pending');

  const CATEGORY = {
    milking:  { icon: Milk,        color: '#3b82f6', bg: '#eff6ff', label: t('worker.tasks.category.milking') },
    feeding:  { icon: Utensils,    color: '#10b981', bg: '#ecfdf5', label: t('worker.tasks.category.feeding') },
    health:   { icon: Stethoscope, color: '#ef4444', bg: '#fef2f2', label: t('worker.tasks.category.health') },
    cleaning: { icon: Eraser,      color: '#f59e0b', bg: '#fffbeb', label: t('worker.tasks.category.cleaning') },
    other:    { icon: Clock,       color: '#6b7280', bg: '#f3f4f6', label: t('worker.tasks.category.other') },
  };

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      if (isOnline) {
        const { data } = await api.get('/worker-tasks');
        setTasks(Array.isArray(data) ? data : []);
      } else {
        const local = await offlineDB.pendingTasks.toArray();
        setTasks(local.map(l => ({
          id: l.task_id, title: l.title || `Task #${l.task_id}`,
          status: l.status, category: l.category || 'other',
        })));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const toggleTask = async (task) => {
    if (task.status === 'done') return;
    const doneAt = new Date().toISOString();
    setTasks(prev => prev.map(x => x.id === task.id ? { ...x, status: 'done' } : x));
    try {
      if (isOnline) await api.put(`/worker-tasks/${task.id}`, { status: 'done', done_at: doneAt });
      else await offlineDB.pendingTasks.put({ task_id: task.id, status: 'done', done_at: doneAt, synced: 0 });
    } catch (err) {
      console.error(err);
      setTasks(prev => prev.map(x => x.id === task.id ? { ...x, status: task.status } : x)); // rollback
    }
  };

  const counts = useMemo(() => {
    const done = tasks.filter(x => x.status === 'done').length;
    return { total: tasks.length, done, pending: tasks.length - done };
  }, [tasks]);

  const visible = useMemo(() => {
    if (filter === 'pending') return tasks.filter(x => x.status !== 'done');
    if (filter === 'done')    return tasks.filter(x => x.status === 'done');
    return tasks;
  }, [tasks, filter]);

  return (
    <WorkerPage style={{ paddingBottom: 'calc(110px + env(safe-area-inset-bottom))' }}>
      <WorkerStyles />

      <PageHeader
        title={t('worker.tasks.title')}
        subtitle={t('worker.tasks.subtitle')}
        icon="✅"
        right={
          <button
            onClick={loadTasks}
            aria-label={t('worker.tasks.retry')}
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: WT.bg, border: `1px solid ${WT.border}`,
              color: WT.body, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <RefreshCw size={17} style={{ animation: loading ? 'wkSpin 1s linear infinite' : 'none' }} />
          </button>
        }
      />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {!isOnline && (
          <div style={{
            background: '#fffbeb', color: '#92400e', padding: '10px 12px',
            borderRadius: WT.r.sm, fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #fde68a',
          }}>
            <WifiOff size={16} /> {t('worker.tasks.offline_mode')}
          </div>
        )}

        {/* ── Progress summary ── */}
        {!error && (loading || counts.total > 0) && (
          <Card style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16 }}>
            {loading ? (
              <>
                <Skeleton width={56} height={56} radius="50%" />
                <div style={{ flex: 1 }}>
                  <Skeleton width="55%" height={14} style={{ marginBottom: 8 }} />
                  <Skeleton width="35%" height={11} />
                </div>
              </>
            ) : (
              <>
                <ProgressRing value={counts.done} max={counts.total} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: WT.ink }}>
                    {t('worker.tasks.progress_title')}
                  </div>
                  <div style={{ fontSize: 13, color: WT.muted, marginTop: 2 }}>
                    {t('worker.tasks.progress_sub', { done: counts.done, total: counts.total })}
                  </div>
                </div>
              </>
            )}
          </Card>
        )}

        {/* ── Filter segments ── */}
        {!error && !loading && counts.total > 0 && (
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all',     label: t('worker.tasks.filter_all'),     count: counts.total },
              { value: 'pending', label: t('worker.tasks.filter_pending'), count: counts.pending },
              { value: 'done',    label: t('worker.tasks.filter_done'),    count: counts.done },
            ]}
          />
        )}

        {/* ── List / states ── */}
        {error ? (
          <EmptyState
            emoji="📡"
            title={t('worker.tasks.error_title')}
            desc={t('worker.tasks.error_desc')}
            action={
              <button
                onClick={loadTasks}
                style={{
                  background: WT.brandGrad, border: 'none', borderRadius: WT.r.md,
                  padding: '12px 26px', color: '#fff', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
              >
                <RefreshCw size={15} /> {t('worker.tasks.retry')}
              </button>
            }
          />
        ) : loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2, 3].map(i => (
              <Card key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
                <Skeleton width={48} height={48} radius={14} />
                <div style={{ flex: 1 }}>
                  <Skeleton width="70%" height={14} style={{ marginBottom: 8 }} />
                  <Skeleton width="40%" height={11} />
                </div>
              </Card>
            ))}
          </div>
        ) : counts.total === 0 ? (
          <EmptyState emoji="🎉" title={t('worker.tasks.all_done_title')} desc={t('worker.tasks.all_done_desc')} />
        ) : visible.length === 0 ? (
          <EmptyState emoji="🗂️" title={t('worker.tasks.filter_empty')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visible.map(task => {
              const done = task.status === 'done';
              const cat = CATEGORY[task.category] || CATEGORY.other;
              const Icon = cat.icon;
              return (
                <Card
                  key={task.id}
                  onClick={() => !done && toggleTask(task)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: 14,
                    opacity: done ? 0.7 : 1, animation: 'wkRise .25s ease both',
                    cursor: done ? 'default' : 'pointer',
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: cat.bg, color: cat.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      margin: 0, fontSize: 15, fontWeight: 700,
                      color: done ? WT.muted : WT.ink,
                      textDecoration: done ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {task.title}
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: WT.muted }}>
                      {cat.label}
                      {task.due_date && ` · ${new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  {done ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#10b981', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      <CheckCircle2 size={20} /> {t('worker.tasks.done')}
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleTask(task); }}
                      style={{
                        background: WT.brand, color: '#fff', border: 'none',
                        padding: '9px 16px', borderRadius: WT.r.sm, fontWeight: 700,
                        fontSize: 13, cursor: 'pointer', flexShrink: 0, minHeight: 40,
                      }}
                    >
                      {t('worker.tasks.validate')}
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Send a report (description + photo) to the farm owner ── */}
        <OwnerReportCard />
      </div>

      {/* ── Report-anomaly CTA — clamped to the 480px frame (no more "out of cadre") ── */}
      <FloatingCTA
        onClick={() => navigate('/worker/report')}
        icon={<AlertTriangle size={19} />}
      >
        {t('worker.tasks.report_anomaly')}
      </FloatingCTA>
    </WorkerPage>
  );
}

export default WorkerTasks;
