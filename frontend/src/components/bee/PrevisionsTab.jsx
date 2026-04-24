import { useState } from 'react';
import {
  CalendarClock, Plus, Hexagon, ArrowRight,
  CheckCircle, Circle, Clock, X,
  ClipboardList as TasksIcon, Package, MapPin
} from 'lucide-react';
import { COLORS } from './BeeConstants';

const STATUS_CONFIG = {
  todo:  { label: 'À FAIRE',   color: COLORS.textMuted, bg: 'rgba(255,255,255,0.06)' },
  doing: { label: 'EN COURS',  color: '#fbbf24',        bg: 'rgba(251,191,36,0.15)' },
  done:  { label: 'TERMINÉ',   color: COLORS.success,   bg: `rgba(16,185,129,0.12)` }
};

const TaskIcon = ({ status }) => {
  if (status === 'done')  return <CheckCircle size={16} color={COLORS.success} />;
  if (status === 'doing') return <Clock size={16} color="#fbbf24" />;
  return <Circle size={16} color={COLORS.textMuted} />;
};

export default function PrevisionsTab({ emplacements = [], ruches = [], previsions = [], onAdd, onUpdateTask }) {
  const [form, setForm]         = useState({ empId: '', rucheId: '', date: '', note: '' });
  const [newTask, setNewTask]   = useState('');
  const [taskList, setTaskList] = useState([]);

  const addInstruction = () => {
    if (!newTask.trim()) return;
    setTaskList([...taskList, newTask.trim()]);
    setNewTask('');
  };

  const handleCreate = () => {
    let finalTasks = [...taskList];
    if (newTask.trim()) finalTasks.push(newTask.trim());
    if (!form.empId || !form.date || !form.rucheId || finalTasks.length === 0) {
      alert('Veuillez remplir le site, la ruche, la date et ajouter au moins une instruction.');
      return;
    }
    onAdd({ ...form, needs: { sirop: 10, pate: 2, traitement: 1, cadres: 5 }, tasks: finalTasks });
    setForm({ empId: '', rucheId: '', date: '', note: '' });
    setTaskList([]);
    setNewTask('');
  };

  const inputStyle = {
    width: '100%', height: 46,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12, padding: '0 16px',
    color: 'white', outline: 'none', fontSize: 13
  };

  const totalMissions = previsions.length;
  const doneTasks = previsions.reduce((n, p) => n + (p.tasks || []).filter(t => t.status === 'done').length, 0);
  const totalTasks = previsions.reduce((n, p) => n + (p.tasks || []).length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: 0 }}>Feuilles de Route</h1>
          <p style={{ color: COLORS.textMuted, marginTop: 4, fontSize: 13 }}>Assignez des missions précises à vos équipes</p>
        </div>
        {totalMissions > 0 && (
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ padding: '8px 18px', background: COLORS.surface, borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
              <span style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700 }}>MISSIONS </span>
              <span style={{ color: 'white', fontWeight: 900 }}>{totalMissions}</span>
            </div>
            <div style={{ padding: '8px 18px', background: COLORS.surface, borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
              <span style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700 }}>TÂCHES </span>
              <span style={{ color: COLORS.success, fontWeight: 900 }}>{doneTasks}/{totalTasks}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 28 }}>

        {/* ─ Creation form ─ */}
        <div style={{ background: COLORS.surface, borderRadius: 28, border: `1px solid ${COLORS.border}`, padding: 28, height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${COLORS.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TasksIcon size={18} color={COLORS.accent} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 14, color: 'white' }}>Nouvelle Mission</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Site */}
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>SITE APICOLE</label>
              <select value={form.empId} onChange={e => setForm({ ...form, empId: e.target.value, rucheId: '' })} style={inputStyle}>
                <option value="">Sélectionner un site...</option>
                {emplacements.map(e => <option key={e.id} value={e.id}>{e.name || e.nom}</option>)}
              </select>
            </div>

            {/* Ruche */}
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>RUCHE CIBLÉE</label>
              <select value={form.rucheId} onChange={e => setForm({ ...form, rucheId: e.target.value })} style={inputStyle}>
                <option value="">Sélectionner une ruche...</option>
                {ruches.filter(r => !form.empId || String(r.apiary_id) === String(form.empId)).map(r => (
                  <option key={r.id} value={r.identifier || r.name}>{r.identifier || r.name}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>DATE D'INTERVENTION</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
            </div>

            {/* Add task */}
            <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 18 }}>
              <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px', marginBottom: 10, display: 'block' }}>INSTRUCTIONS / TÂCHES</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Ex: Changer la reine..."
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addInstruction()}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={addInstruction} style={{ width: 46, height: 46, borderRadius: 12, background: COLORS.accent, border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <Plus size={20} />
                </button>
              </div>

              {taskList.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {taskList.map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '8px 14px', borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Circle size={12} color={COLORS.accent} />
                        <span style={{ fontSize: 12, color: 'white', fontWeight: 600 }}>{t}</span>
                      </div>
                      <button onClick={() => setTaskList(taskList.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleCreate}
              style={{ width: '100%', height: 54, background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, border: 'none', borderRadius: 14, color: 'white', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 14, boxShadow: `0 6px 20px ${COLORS.accent}40`, transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Envoyer la Mission <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* ─ Missions list ─ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {previsions.length === 0 ? (
            <div style={{ height: 320, background: 'rgba(255,255,255,0.02)', border: `2px dashed ${COLORS.border}`, borderRadius: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, gap: 14 }}>
              <CalendarClock size={44} strokeWidth={1} style={{ opacity: 0.5 }} />
              <p style={{ fontWeight: 600, fontSize: 15 }}>Aucune mission en cours.</p>
              <p style={{ fontSize: 12 }}>Créez une mission depuis le formulaire à gauche.</p>
            </div>
          ) : previsions.map(p => {
            const site = emplacements.find(e => String(e.id) === String(p.empId));
            const tasks = p.tasks || [];
            const doneCount = tasks.filter(t => t.status === 'done').length;
            const progress = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0;

            return (
              <div key={p.id} style={{ background: COLORS.surface, borderRadius: 24, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>

                {/* Mission header */}
                <div style={{ padding: '18px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${COLORS.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Hexagon size={18} color={COLORS.accent} />
                    </div>
                    <div>
                      <div style={{ color: 'white', fontWeight: 800, fontSize: 15 }}>{p.rucheId}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <MapPin size={11} color={COLORS.textMuted} />
                        <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{site?.name || site?.nom || 'Site ?'}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 700 }}>{p.date}</span>
                    <div style={{ padding: '4px 10px', borderRadius: 8, background: progress === 100 ? `${COLORS.success}18` : 'rgba(251,191,36,0.15)', border: `1px solid ${progress === 100 ? COLORS.success + '40' : 'rgba(251,191,36,0.3)'}` }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: progress === 100 ? COLORS.success : '#fbbf24' }}>
                        {doneCount}/{tasks.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 3, background: 'rgba(255,255,255,0.05)' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? COLORS.success : COLORS.accent, transition: 'width 0.4s ease' }} />
                </div>

                {/* Tasks */}
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tasks.map(task => {
                    const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                    return (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 14, background: cfg.bg, border: `1px solid ${COLORS.border}`, transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <TaskIcon status={task.status} />
                          <span style={{ color: task.status === 'done' ? COLORS.textMuted : 'white', textDecoration: task.status === 'done' ? 'line-through' : 'none', fontSize: 13, fontWeight: 600 }}>
                            {task.text}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {['todo', 'doing', 'done'].map(st => (
                            <button
                              key={st}
                              onClick={() => onUpdateTask(p.id, task.id, st)}
                              style={{
                                padding: '5px 10px', borderRadius: 8, fontSize: 9, fontWeight: 800,
                                background: task.status === st ? STATUS_CONFIG[st].color : 'transparent',
                                color: task.status === st ? (st === 'doing' ? 'black' : 'white') : COLORS.textMuted,
                                border: `1px solid ${task.status === st ? STATUS_CONFIG[st].color : COLORS.border}`,
                                cursor: 'pointer', transition: 'all 0.15s'
                              }}
                            >
                              {STATUS_CONFIG[st].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Logistics reminder */}
                {p.needs && (
                  <div style={{ margin: '0 24px 20px', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}` }}>
                    <Package size={14} color={COLORS.textMuted} />
                    <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700 }}>
                      LOGISTIQUE : {p.needs.sirop}L Sirop · {p.needs.pate}kg Pâte · {p.needs.traitement} Trait. · {p.needs.cadres} Cadres
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
