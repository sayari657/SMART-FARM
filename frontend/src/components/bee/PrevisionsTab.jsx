import { useState, useEffect } from 'react';
import {
  CalendarClock, Plus, Hexagon, ArrowRight,
  CheckCircle, Circle, Clock, X,
  ClipboardList as TasksIcon, Package, MapPin,
  UserCheck, User, ChevronDown, Trash2,
  UserX, RefreshCw,
} from 'lucide-react';
import { COLORS } from './BeeConstants';
import { beeApi } from '../../services/beeApi';

/* ── Status config ─────────────────────────────────── */
const STATUS_CFG = {
  todo:  { label: 'À FAIRE',  color: COLORS.textMuted,  bg: 'rgba(0,0,0,0.04)'         },
  doing: { label: 'EN COURS', color: COLORS.honey,       bg: 'rgba(251,191,36,0.12)'    },
  done:  { label: 'TERMINÉ',  color: COLORS.success,     bg: 'rgba(16,185,129,0.10)'    },
};

const TaskIcon = ({ status }) => {
  if (status === 'done')  return <CheckCircle size={15} color={COLORS.success}/>;
  if (status === 'doing') return <Clock       size={15} color={COLORS.honey}/>;
  return <Circle size={15} color={COLORS.textMuted}/>;
};

/* ── Worker avatar chip ──────────────────────────────── */
function WorkerChip({ worker, size = 'md', onRemove }) {
  if (!worker) return null;
  const initials = (worker.workerName || worker.full_name || '?')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const name = worker.workerName || worker.full_name || worker.username;

  const isSmall = size === 'sm';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: isSmall ? 5 : 7,
      padding: isSmall ? '3px 8px 3px 4px' : '5px 12px 5px 5px',
      borderRadius: 99, background: `${COLORS.info}12`,
      border: `1px solid ${COLORS.info}30`,
      maxWidth: 200,
    }}>
      <div style={{
        width: isSmall ? 20 : 26, height: isSmall ? 20 : 26, borderRadius: '50%', flexShrink: 0,
        background: `linear-gradient(135deg, ${COLORS.info}, #4c1d95)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: isSmall ? 8 : 10, fontWeight: 900,
      }}>{initials}</div>
      <span style={{
        fontSize: isSmall ? 10 : 12, fontWeight: 700, color: COLORS.info,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{name}</span>
      {onRemove && (
        <button onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMuted,
            display: 'flex', padding: 0, lineHeight: 1 }}>
          <X size={11}/>
        </button>
      )}
    </div>
  );
}

/* ── Worker selector dropdown ───────────────────────── */
function WorkerSelector({ workers, value, onChange, placeholder = 'Assigner un agent…' }) {
  const [open, setOpen] = useState(false);
  const selected = workers.find(w => w.worker_id === value);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', height: 46, padding: '0 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          background: '#F8F5F0', border: `1px solid ${value ? COLORS.info + '60' : COLORS.border}`,
          borderRadius: 12, cursor: 'pointer', color: COLORS.text, fontSize: 13,
          transition: 'border-color .15s',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selected ? (
            <>
              <div style={{ width: 24, height: 24, borderRadius: '50%',
                background: `linear-gradient(135deg, ${COLORS.info}, #4c1d95)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 9, fontWeight: 900, flexShrink: 0 }}>
                {(selected.full_name || selected.username || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
              </div>
              <span style={{ fontWeight: 700, color: COLORS.info }}>
                {selected.full_name || selected.username}
              </span>
            </>
          ) : (
            <>
              <User size={15} color={COLORS.textMuted}/>
              <span style={{ color: COLORS.textMuted }}>{placeholder}</span>
            </>
          )}
        </div>
        <ChevronDown size={14} color={COLORS.textMuted}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}/>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: `1px solid ${COLORS.border}`,
          borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
          overflow: 'hidden',
        }}>
          {/* Unassign option */}
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center',
              gap: 10, background: 'none', border: 'none', cursor: 'pointer',
              color: COLORS.textMuted, fontSize: 13, textAlign: 'left',
              borderBottom: `1px solid ${COLORS.border}` }}>
            <UserX size={14}/> Aucun agent assigné
          </button>

          {workers.length === 0 ? (
            <div style={{ padding: '14px 16px', fontSize: 12, color: COLORS.textMuted, textAlign: 'center' }}>
              Aucun agent dans cette ferme
            </div>
          ) : (
            workers.map(w => {
              const initials = (w.full_name || w.username || '?')
                .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              const isSel = w.worker_id === value;
              return (
                <button key={w.worker_id}
                  onClick={() => { onChange(w.worker_id, w.full_name || w.username); setOpen(false); }}
                  style={{
                    width: '100%', padding: '10px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: isSel ? `${COLORS.info}10` : 'none',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderBottom: `1px solid ${COLORS.border}`,
                    transition: 'background .12s',
                  }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${COLORS.info}, #4c1d95)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 11, fontWeight: 900, boxShadow: `0 0 8px ${COLORS.info}30` }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.text }}>
                      {w.full_name || w.username}
                    </div>
                    <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 1 }}>
                      {w.phone_number || w.username}
                    </div>
                  </div>
                  {isSel && <CheckCircle size={14} color={COLORS.info}/>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════ MAIN COMPONENT ═════════════════════════════ */
export default function PrevisionsTab({
  emplacements = [], ruches = [], previsions = [],
  workers = [],
  onAdd, onUpdateTask, onAssignWorker, onDelete,
}) {
  const [form, setForm]         = useState({ empId: '', rucheId: '', date: '', note: '', workerId: null, workerName: null });
  const [newTask, setNewTask]   = useState('');
  const [taskList, setTaskList] = useState([]);
  const [predictedNeeds, setPredictedNeeds] = useState({ sirop: 10, pate: 2, traitement: 1, cadres: 5 });
  const [loadingNeeds, setLoadingNeeds] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(null); // prevId being reassigned
  const [filterWorker, setFilterWorker] = useState('all');

  useEffect(() => {
    if (!form.rucheId) return;
    const hive = ruches.find(r => (r.identifier || r.name) === form.rucheId);
    if (!hive) return;
    setLoadingNeeds(true);
    beeApi.getPrediction(hive.id)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setPredictedNeeds({
          sirop:      data.sirop_L    ?? 10,
          pate:       data.pate_kg    ?? 2,
          traitement: data.traitement ?? 1,
          cadres:     data.cadres     ?? 5,
        });
      })
      .catch(() => {})
      .finally(() => setLoadingNeeds(false));
  }, [form.rucheId, ruches]);

  const addInstruction = () => {
    if (!newTask.trim()) return;
    setTaskList(prev => [...prev, newTask.trim()]);
    setNewTask('');
  };

  const handleCreate = () => {
    let finalTasks = [...taskList];
    if (newTask.trim()) finalTasks.push(newTask.trim());
    if (!form.empId || !form.date || !form.rucheId || finalTasks.length === 0) {
      alert('Veuillez remplir le site, la ruche, la date et ajouter au moins une instruction.');
      return;
    }
    onAdd({ ...form, needs: predictedNeeds, tasks: finalTasks });
    setForm({ empId: '', rucheId: '', date: '', note: '', workerId: null, workerName: null });
    setTaskList([]);
    setNewTask('');
  };

  const inputStyle = {
    width: '100%', height: 46,
    background: '#F8F5F0', border: `1px solid ${COLORS.border}`,
    borderRadius: 12, padding: '0 16px',
    color: COLORS.text, outline: 'none', fontSize: 13
  };

  const totalMissions  = previsions.length;
  const doneTasks      = previsions.reduce((n, p) => n + (p.tasks || []).filter(t => t.status === 'done').length, 0);
  const totalTasks     = previsions.reduce((n, p) => n + (p.tasks || []).length, 0);
  const unassigned     = previsions.filter(p => !p.workerId).length;

  /* Filter missions by worker */
  const filtered = previsions.filter(p => {
    if (filterWorker === 'all')        return true;
    if (filterWorker === 'unassigned') return !p.workerId;
    return String(p.workerId) === filterWorker;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: COLORS.text, margin: 0 }}>Feuilles de Route</h1>
          <p style={{ color: COLORS.textMuted, marginTop: 4, fontSize: 13 }}>
            Planifiez et assignez des missions à vos agents apicoles
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { l:'MISSIONS',  v: totalMissions, c: COLORS.accent },
            { l:'TÂCHES',    v: `${doneTasks}/${totalTasks}`, c: COLORS.success },
            { l:'NON ASSIGNÉ', v: unassigned, c: unassigned > 0 ? COLORS.error : COLORS.textMuted },
          ].map(k => (
            <div key={k.l} style={{ padding: '8px 16px', background: COLORS.surface,
              borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
              <span style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 2 }}>
                {k.l}
              </span>
              <span style={{ color: k.c, fontWeight: 900, fontSize: 16 }}>{k.v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 28 }}>

        {/* ─── Creation form ─── */}
        <div style={{ background: COLORS.surface, borderRadius: 28, border: `1px solid ${COLORS.border}`,
          padding: 28, height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${COLORS.accent}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TasksIcon size={18} color={COLORS.accent}/>
            </div>
            <span style={{ fontWeight: 800, fontSize: 14, color: COLORS.text }}>Nouvelle Mission</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Site */}
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>
                <MapPin size={11} style={{ display:'inline',marginRight:5 }}/>SITE APICOLE
              </label>
              <select value={form.empId}
                onChange={e => setForm(f => ({ ...f, empId: e.target.value, rucheId: '' }))}
                style={inputStyle}>
                <option value="">Sélectionner un site…</option>
                {emplacements.map(e => <option key={e.id} value={e.id}>{e.name || e.nom}</option>)}
              </select>
            </div>

            {/* Ruche */}
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>
                🔶 RUCHE CIBLÉE
              </label>
              <select value={form.rucheId}
                onChange={e => setForm(f => ({ ...f, rucheId: e.target.value }))}
                style={inputStyle}>
                <option value="">Sélectionner une ruche…</option>
                {ruches.filter(r => !form.empId || String(r.apiary_id) === String(form.empId))
                       .map(r => <option key={r.id} value={r.identifier || r.name}>{r.identifier || r.name}</option>)}
              </select>
            </div>

            {/* Date */}
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>
                📅 DATE D'INTERVENTION
              </label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={inputStyle}/>
            </div>

            {/* ── WORKER ASSIGNMENT ── */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px' }}>
                <UserCheck size={13} color={COLORS.info}/> AGENT ASSIGNÉ
              </label>
              <WorkerSelector
                workers={workers}
                value={form.workerId}
                onChange={(id, name) => setForm(f => ({ ...f, workerId: id, workerName: name }))}
              />
              {workers.length === 0 && (
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 5 }}>
                  Aucun agent enregistré — ajoutez des agents dans Paramètres &gt; Équipe
                </div>
              )}
            </div>

            {/* Besoins estimés */}
            {form.rucheId && (
              <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: '12px 16px',
                border: `1px solid ${COLORS.border}` }}>
                <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  {loadingNeeds ? '⏳ Estimation IA…' : '📦 Besoins estimés'}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(predictedNeeds).map(([k, v]) => (
                    <span key={k} style={{ fontSize: 11, background: `${COLORS.accent}18`,
                      color: COLORS.accent, padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                      {k === 'sirop' ? `${v}L Sirop` : k === 'pate' ? `${v}kg Pâte`
                        : k === 'traitement' ? `${v} Trait.` : `${v} Cadres`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks */}
            <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 18 }}>
              <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 800,
                letterSpacing: '1px', marginBottom: 10, display: 'block' }}>
                📋 INSTRUCTIONS / TÂCHES
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder="Ex: Changer la reine…"
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addInstruction()}
                  style={{ ...inputStyle, flex: 1 }}/>
                <button onClick={addInstruction}
                  style={{ width: 46, height: 46, borderRadius: 12, background: COLORS.accent,
                    border: 'none', color: 'white', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <Plus size={20}/>
                </button>
              </div>
              {taskList.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {taskList.map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', background: 'rgba(0,0,0,0.03)',
                      padding: '8px 14px', borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Circle size={12} color={COLORS.accent}/>
                        <span style={{ fontSize: 12, color: COLORS.text, fontWeight: 600 }}>{t}</span>
                      </div>
                      <button onClick={() => setTaskList(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex' }}>
                        <X size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleCreate}
              style={{ width: '100%', height: 52, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
                border: 'none', borderRadius: 14, color: 'white', fontWeight: 900, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 14,
                boxShadow: `0 6px 20px ${COLORS.accent}35`, transition: 'transform .2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              Envoyer la Mission <ArrowRight size={18}/>
            </button>
          </div>
        </div>

        {/* ─── Missions list ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Filter by worker */}
          {(workers.length > 0 || previsions.some(p => p.workerId)) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700 }}>Filtrer :</span>
              {[
                { val: 'all',        label: 'Toutes',          color: COLORS.accent },
                { val: 'unassigned', label: '⚠ Non assignées', color: COLORS.error  },
                ...workers.map(w => ({
                  val:   String(w.worker_id),
                  label: (w.full_name || w.username || '').split(' ')[0],
                  color: COLORS.info,
                })),
              ].map(f => (
                <button key={f.val} onClick={() => setFilterWorker(f.val)}
                  style={{ padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
                    background: filterWorker === f.val ? `${f.color}18` : COLORS.surface,
                    border: `1px solid ${filterWorker === f.val ? f.color + '50' : COLORS.border}`,
                    color: filterWorker === f.val ? f.color : COLORS.textMuted,
                    fontWeight: filterWorker === f.val ? 800 : 600, fontSize: 11, whiteSpace: 'nowrap' }}>
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{ height: 280, background: 'rgba(0,0,0,0.02)',
              border: `2px dashed ${COLORS.border}`, borderRadius: 28,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', color: COLORS.textMuted, gap: 14 }}>
              <CalendarClock size={44} strokeWidth={1} style={{ opacity: 0.4 }}/>
              <p style={{ fontWeight: 600, fontSize: 15 }}>
                {filterWorker !== 'all' ? 'Aucune mission pour ce filtre.' : 'Aucune mission en cours.'}
              </p>
              <p style={{ fontSize: 12 }}>Créez une mission depuis le formulaire à gauche.</p>
            </div>
          ) : (
            filtered.map(p => {
              const site      = emplacements.find(e => String(e.id) === String(p.empId));
              const tasks     = p.tasks || [];
              const doneCount = tasks.filter(t => t.status === 'done').length;
              const progress  = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0;
              const isLate    = p.date && p.date < new Date().toISOString().split('T')[0] && progress < 100;
              const worker    = workers.find(w => w.worker_id === p.workerId);

              return (
                <div key={p.id} style={{
                  background: COLORS.surface, borderRadius: 24,
                  border: `1px solid ${isLate ? COLORS.error + '40' : COLORS.border}`,
                  overflow: 'hidden',
                  boxShadow: isLate ? `0 0 0 2px ${COLORS.error}15` : 'none',
                }}>

                  {/* ── Mission header ── */}
                  <div style={{ padding: '16px 22px', background: 'rgba(0,0,0,0.02)',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: `${COLORS.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Hexagon size={18} color={COLORS.accent}/>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 15 }}>{p.rucheId}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                          <MapPin size={11} color={COLORS.textMuted}/>
                          <span style={{ color: COLORS.textMuted, fontSize: 11 }}>
                            {site?.name || site?.nom || 'Site ?'}
                          </span>
                          {isLate && (
                            <span style={{ fontSize: 9, fontWeight: 800, color: COLORS.error,
                              background: `${COLORS.error}12`, padding: '1px 7px', borderRadius: 6 }}>
                              EN RETARD
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 700 }}>{p.date}</span>
                      <div style={{ padding: '4px 10px', borderRadius: 8,
                        background: progress === 100 ? `${COLORS.success}18` : 'rgba(251,191,36,0.12)',
                        border: `1px solid ${progress === 100 ? COLORS.success + '40' : 'rgba(251,191,36,0.3)'}` }}>
                        <span style={{ fontSize: 11, fontWeight: 800,
                          color: progress === 100 ? COLORS.success : COLORS.honey }}>
                          {doneCount}/{tasks.length}
                        </span>
                      </div>
                      {/* Delete */}
                      {onDelete && (
                        <button onClick={() => onDelete(p.id)}
                          title="Supprimer la mission"
                          style={{ width: 28, height: 28, borderRadius: 8, background: `${COLORS.error}10`,
                            border: `1px solid ${COLORS.error}25`, cursor: 'pointer', color: COLORS.error,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Worker assignment band ── */}
                  <div style={{ padding: '10px 22px', borderBottom: `1px solid ${COLORS.border}`,
                    background: p.workerId ? `${COLORS.info}06` : 'rgba(239,68,68,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {p.workerId && worker ? (
                        <>
                          <UserCheck size={14} color={COLORS.info}/>
                          <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700 }}>Agent assigné :</span>
                          <WorkerChip worker={{ workerName: p.workerName || worker?.full_name }} size="sm"/>
                        </>
                      ) : (
                        <>
                          <UserX size={14} color={COLORS.error}/>
                          <span style={{ fontSize: 11, color: COLORS.error, fontWeight: 700 }}>
                            Aucun agent assigné
                          </span>
                        </>
                      )}
                    </div>

                    {/* Reassign button */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setReassignOpen(reassignOpen === p.id ? null : p.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                          borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                          background: `${COLORS.info}12`, border: `1px solid ${COLORS.info}30`,
                          color: COLORS.info, transition: 'all .15s' }}>
                        <RefreshCw size={11}/> {p.workerId ? 'Changer' : 'Assigner'}
                      </button>

                      {reassignOpen === p.id && (
                        <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 50,
                          background: '#fff', border: `1px solid ${COLORS.border}`,
                          borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                          minWidth: 220, overflow: 'hidden' }}>
                          {/* Unassign */}
                          <button
                            onClick={() => { onAssignWorker?.(p.id, null, null); setReassignOpen(null); }}
                            style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center',
                              gap: 10, background: 'none', border: 'none', cursor: 'pointer',
                              color: COLORS.textMuted, fontSize: 12, textAlign: 'left',
                              borderBottom: `1px solid ${COLORS.border}` }}>
                            <UserX size={13}/> Retirer l'assignation
                          </button>
                          {workers.length === 0 ? (
                            <div style={{ padding: '12px 16px', fontSize: 11, color: COLORS.textMuted }}>
                              Aucun agent disponible
                            </div>
                          ) : workers.map(w => {
                            const isCurrent = p.workerId === w.worker_id;
                            const initials  = (w.full_name || w.username || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                            return (
                              <button key={w.worker_id}
                                onClick={() => {
                                  onAssignWorker?.(p.id, w.worker_id, w.full_name || w.username);
                                  setReassignOpen(null);
                                }}
                                style={{ width: '100%', padding: '10px 16px',
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  background: isCurrent ? `${COLORS.info}10` : 'none',
                                  border: 'none', cursor: 'pointer', textAlign: 'left',
                                  borderBottom: `1px solid ${COLORS.border}`, transition: 'background .12s' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                  background: `linear-gradient(135deg, ${COLORS.info}, #4c1d95)`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: '#fff', fontSize: 10, fontWeight: 900 }}>{initials}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: 12, color: COLORS.text }}>
                                    {w.full_name || w.username}
                                  </div>
                                  <div style={{ fontSize: 10, color: COLORS.textMuted }}>{w.phone_number || ''}</div>
                                </div>
                                {isCurrent && <CheckCircle size={13} color={COLORS.info}/>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 3, background: 'rgba(0,0,0,0.06)' }}>
                    <div style={{ height: '100%', width: `${progress}%`,
                      background: progress === 100 ? COLORS.success : COLORS.accent,
                      transition: 'width 0.4s ease' }}/>
                  </div>

                  {/* Tasks */}
                  <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tasks.map(task => {
                      const cfg = STATUS_CFG[task.status] || STATUS_CFG.todo;
                      return (
                        <div key={task.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', borderRadius: 12,
                          background: cfg.bg, border: `1px solid ${COLORS.border}`, transition: 'all .15s',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <TaskIcon status={task.status}/>
                            <span style={{
                              color: task.status === 'done' ? COLORS.textMuted : COLORS.text,
                              textDecoration: task.status === 'done' ? 'line-through' : 'none',
                              fontSize: 13, fontWeight: 600,
                            }}>{task.text}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {['todo', 'doing', 'done'].map(st => (
                              <button key={st}
                                onClick={() => onUpdateTask(p.id, task.id, st)}
                                style={{
                                  padding: '4px 9px', borderRadius: 7, fontSize: 9, fontWeight: 800,
                                  background: task.status === st ? STATUS_CFG[st].color : 'transparent',
                                  color: task.status === st
                                    ? (st === 'doing' ? '#7c3a00' : '#fff')
                                    : COLORS.textMuted,
                                  border: `1px solid ${task.status === st ? STATUS_CFG[st].color : COLORS.border}`,
                                  cursor: 'pointer', transition: 'all .15s',
                                }}>
                                {STATUS_CFG[st].label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Logistics */}
                  {p.needs && (
                    <div style={{ margin: '0 22px 18px', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.02)',
                      border: `1px solid ${COLORS.border}` }}>
                      <Package size={13} color={COLORS.textMuted}/>
                      <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700 }}>
                        LOGISTIQUE : {p.needs.sirop}L Sirop · {p.needs.pate}kg Pâte
                        · {p.needs.traitement} Trait. · {p.needs.cadres} Cadres
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
