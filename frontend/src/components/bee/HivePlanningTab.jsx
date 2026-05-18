import { useState, useCallback, useEffect } from 'react';
import {
  Zap, CalendarClock, Plus, ArrowRight, X,
  CheckCircle, Clock, Circle, Trash2
} from 'lucide-react';
import { COLORS } from './BeeConstants';
import { beeApi } from '../../services/beeApi';
import { TASK_STATUS, Section, inputSt } from './HiveShared.jsx';

export default function PlanningTab({ hive, toast }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [form, setForm]   = useState({ date: '', note: '', action_type: 'inspection' });
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rm, rp] = await Promise.all([
        beeApi.getPlanning(hive.id),
        beeApi.getPrediction(hive.id),
      ]);
      if (rm.ok) setMissions(await rm.json());
      if (rp.ok) {
        const pred = await rp.json();
        setPrediction(pred);
        const p = pred.predictions;
        setForm(f => ({
          ...f,
          _pred_sirop: p.sirop_L, _pred_pate: p.pate_kg,
          _pred_traitement: p.traitement, _pred_cadres: p.cadres,
        }));
      }
    } catch (err) {
      console.error("Planning load error:", err);
      toast("Erreur lors du chargement du planning", "error");
    } finally {
      setLoading(false);
    }
  }, [hive.id, toast]);

  useEffect(() => { load(); }, [load]);

  const addTask = () => { if (!newTask.trim()) return; setTasks(t => [...t, newTask.trim()]); setNewTask(''); };

  const createMission = async () => {
    const finalTasks = [...tasks, ...(newTask.trim() ? [newTask.trim()] : [])];
    if (!form.date || finalTasks.length === 0) { toast('Date et au moins une tâche requis', 'warning'); return; }
    const payload = {
      hive_id: hive.id, scheduled_date: form.date,
      action_type: form.action_type, notes: form.note,
      predicted_sirop: form._pred_sirop || 0, predicted_pate: form._pred_pate || 0,
      predicted_traitement: form._pred_traitement || 0, predicted_cadres: form._pred_cadres || 0,
      tasks: finalTasks,
    };
    const res = await beeApi.createPlan(payload);
    if (res.ok) {
      toast('Mission planifiée'); setTasks([]); setNewTask('');
      setForm(f => ({ ...f, date: '', note: '' }));
      load();
    } else toast('Erreur création mission', 'error');
  };

  const updateTaskStatus = async (planId, taskId, status) => {
    const res = await beeApi.updatePlanTask(planId, taskId, status);
    if (res.ok) load();
  };

  const deleteMission = async (id) => {
    await beeApi.deletePlan(id);
    load(); toast('Mission supprimée', 'warning');
  };

  const totalDone  = missions.reduce((n, p) => n + (p.tasks || []).filter(t => t.status === 'done').length, 0);
  const totalTasks = missions.reduce((n, p) => n + (p.tasks || []).length, 0);

  if (loading) return <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: 40 }}>Chargement…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 18 }}>Planning d'Interventions</div>
          {totalTasks > 0 && <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 3 }}>
            Tâches: <span style={{ color: COLORS.success, fontWeight: 700 }}>{totalDone}/{totalTasks}</span>
          </div>}
        </div>
      </div>

      {prediction && (
        <div style={{ background: COLORS.accent + '0a', border: `1px solid ${COLORS.accent}25`, borderRadius: 16, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Zap size={14} color={COLORS.accent} />
            <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 800 }}>
              PRÉDICTION IA — Prochaine visite
            </span>
            <span style={{ fontSize: 10, color: COLORS.textMuted, marginLeft: 'auto' }}>
              Confiance: {prediction.confidence} · {prediction.visits_analyzed} visite(s) analysée(s)
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Sirop', val: `${prediction.predictions.sirop_L}L`, color: COLORS.info },
              { label: 'Pâte', val: `${prediction.predictions.pate_kg}kg`, color: COLORS.success },
              { label: 'Traitement', val: prediction.predictions.traitement, color: COLORS.error },
              { label: 'Cadres', val: prediction.predictions.cadres, color: COLORS.accent },
            ].map(p => (
              <div key={p.label} style={{ padding: '6px 14px', borderRadius: 10, background: p.color + '15', border: `1px solid ${p.color}30` }}>
                <span style={{ color: p.color, fontWeight: 800, fontSize: 13 }}>{p.val}</span>
                <span style={{ color: COLORS.textMuted, fontSize: 10, marginLeft: 5 }}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Section title="Nouvelle Mission" icon={Plus} color={COLORS.accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', display: 'block', marginBottom: 6 }}>DATE *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputSt} />
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', display: 'block', marginBottom: 6 }}>TYPE</label>
              <select value={form.action_type} onChange={e => setForm(f => ({ ...f, action_type: e.target.value }))} style={inputSt}>
                {['inspection', 'feeding', 'treatment', 'harvest', 'autre'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', display: 'block', marginBottom: 6 }}>TÂCHES</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Ex: Changer la hausse…" value={newTask}
                onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
                style={{ ...inputSt, flex: 1 }} />
              <button onClick={addTask}
                style={{ width: 44, height: 44, borderRadius: 11, background: COLORS.accent, border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plus size={17} />
              </button>
            </div>
            {tasks.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {tasks.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderRadius: 9, background: 'rgba(0,0,0,0.03)', border: `1px solid ${COLORS.border}` }}>
                    <span style={{ fontSize: 12, color: COLORS.text, fontWeight: 600 }}>{t}</span>
                    <button onClick={() => setTasks(l => l.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: COLORS.error, cursor: 'pointer' }}><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={createMission}
            style={{ height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
            Créer la Mission <ArrowRight size={13} style={{ display: 'inline', marginLeft: 5 }} />
          </button>
        </div>
      </Section>

      {missions.length === 0 ? (
        <div style={{ height: 140, background: 'rgba(0,0,0,0.03)', border: `2px dashed ${COLORS.border}`, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 9, color: COLORS.textMuted }}>
          <CalendarClock size={34} strokeWidth={1} style={{ opacity: 0.4 }} />
          <div style={{ fontWeight: 600, fontSize: 13 }}>Aucune mission planifiée</div>
        </div>
      ) : missions.map(p => {
        const taskList = p.tasks || [];
        const done = taskList.filter(t => t.status === 'done').length;
        const progress = taskList.length > 0 ? (done / taskList.length) * 100 : 0;
        const today = new Date().toISOString().split('T')[0];
        const overdue = p.status !== 'done' && p.scheduled_date < today;
        return (
          <div key={p.id} style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${overdue ? COLORS.error + '40' : COLORS.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.03)', borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: COLORS.text, fontWeight: 800 }}>{p.scheduled_date}</span>
                {p.action_type && <span style={{ fontSize: 10, color: COLORS.textMuted, background: 'rgba(0,0,0,0.07)', padding: '2px 8px', borderRadius: 6 }}>{p.action_type}</span>}
                {overdue && <span style={{ fontSize: 10, color: COLORS.error, fontWeight: 800 }}>EN RETARD</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: progress === 100 ? COLORS.success : COLORS.honey, fontWeight: 800 }}>{done}/{taskList.length}</span>
                <button onClick={() => deleteMission(p.id)}
                  style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
            <div style={{ height: 3, background: 'rgba(0,0,0,0.07)' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? COLORS.success : COLORS.accent, transition: 'width 0.3s' }} />
            </div>
            {(p.predicted_sirop > 0 || p.predicted_pate > 0 || p.predicted_traitement > 0) && (
              <div style={{ padding: '8px 18px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 700 }}>Prévu:</span>
                {p.predicted_sirop > 0 && <span style={{ fontSize: 10, color: COLORS.info }}>Sirop {p.predicted_sirop}L</span>}
                {p.predicted_pate > 0 && <span style={{ fontSize: 10, color: COLORS.success }}>Pâte {p.predicted_pate}kg</span>}
                {p.predicted_traitement > 0 && <span style={{ fontSize: 10, color: COLORS.error }}>Trait. {p.predicted_traitement}</span>}
              </div>
            )}
            <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {taskList.map(task => {
                const cfg = TASK_STATUS[task.status] || TASK_STATUS.todo;
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.03)', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {task.status === 'done' ? <CheckCircle size={14} color={COLORS.success} /> : task.status === 'doing' ? <Clock size={14} color={COLORS.honey} /> : <Circle size={14} color={COLORS.textMuted} />}
                      <span style={{ color: task.status === 'done' ? COLORS.textMuted : 'white', textDecoration: task.status === 'done' ? 'line-through' : 'none', fontSize: 12, fontWeight: 600 }}>{task.text}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {['todo', 'doing', 'done'].map(st => (
                        <button key={st} onClick={() => updateTaskStatus(p.id, task.id, st)}
                          style={{ padding: '3px 7px', borderRadius: 5, fontSize: 9, fontWeight: 800,
                            background: task.status === st ? cfg.color : 'transparent',
                            color: task.status === st ? (st === 'doing' ? 'black' : 'white') : COLORS.textMuted,
                            border: `1px solid ${task.status === st ? cfg.color : COLORS.border}`, cursor: 'pointer' }}>
                          {TASK_STATUS[st].label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
