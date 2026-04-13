// v1.0.1 - Fix: Clipboard component conflict resolved
import React, { useState } from 'react';
import { 
  CalendarClock, Plus, MapPin, Sparkles, ChevronRight, 
  Sprout, Package, ShieldPlus, ArrowRight, CheckCircle2,
  Trash2, Info, Hexagon, Clock, CheckCircle, Circle, ClipboardList as TasksIcon, X
} from 'lucide-react';
import { COLORS } from './BeeConstants';

export default function PrevisionsTab({ emplacements, ruches, previsions, onAdd, onUpdateTask }) {
  const [form, setForm] = useState({ empId: '', rucheId: '', date: '', note: '' });
  const [newTask, setNewTask] = useState('');
  const [taskList, setTaskList] = useState([]);

  const addInstruction = () => {
    if (!newTask.trim()) return;
    setTaskList([...taskList, newTask.trim()]);
    setNewTask('');
  };

  const removeInstruction = (index) => {
    setTaskList(taskList.filter((_, i) => i !== index));
  };

  const calculateNeeds = (empId) => {
    // Logique simplifiée pour la logistique automatique
    return { sirop: 10, pate: 2, traitement: 1, cadres: 5 };
  };

  const handleCreate = () => {
    // Amélioration UX : inclure automatiquement la tâche en cours de saisie si on a oublié de cliquer sur (+)
    let finalTasks = [...taskList];
    if (newTask.trim()) {
      finalTasks.push(newTask.trim());
    }

    if (!form.empId || !form.date || !form.rucheId || finalTasks.length === 0) {
      alert("Veuillez remplir le site, la ruche, la date et ajouter au moins une instruction.");
      return;
    }
    const needs = calculateNeeds(form.empId);
    onAdd({ ...form, needs, tasks: finalTasks });
    setForm({ empId: '', rucheId: '', date: '', note: '' });
    setTaskList([]);
    setNewTask('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white' }}>Feuilles de Route</h1>
            <p style={{ color: COLORS.textMuted, marginTop: 4 }}>Donnez des instructions précises à vos employés</p>
          </div>
       </div>

       <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 32 }}>
          {/* Formulaire de création de mission */}
          <div style={{ background: COLORS.surface, borderRadius: 28, border: `1px solid ${COLORS.border}`, padding: 32, height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
               <TasksIcon size={20} color={COLORS.accent} />
               <span style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: 'white' }}>Nouvelles Instructions</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
               <div>
                 <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, marginBottom: 8, display: 'block' }}>DESTINATION</label>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <select 
                      value={form.empId} 
                      onChange={(e) => setForm({ ...form, empId: e.target.value })}
                      style={{ width: '100%', height: 48, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white', outline: 'none' }}
                    >
                      <option value="">Sélectionner un site...</option>
                      {emplacements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                    </select>
                    <select 
                      value={form.rucheId} 
                      onChange={(e) => setForm({ ...form, rucheId: e.target.value })}
                      style={{ width: '100%', height: 48, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white', outline: 'none' }}
                    >
                      <option value="">Sélectionner une ruche...</option>
                      {ruches.filter(r => r.empId == form.empId || !form.empId).map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                 </div>
               </div>
               
               <div>
                 <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, marginBottom: 8, display: 'block' }}>DATE D'INTERVENTION</label>
                 <input 
                   type="date" 
                   value={form.date}
                   onChange={(e) => setForm({ ...form, date: e.target.value })}
                   style={{ width: '100%', height: 48, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white', outline: 'none' }} 
                 />
               </div>

               <div style={{ borderTop: `1px solid ${COLORS.border}`, pt: 20 }}>
                 <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, marginBottom: 8, display: 'block' }}>AJOUTER UNE TÂCHE / ORDRE</label>
                 <div style={{ display: 'flex', gap: 8 }}>
                    <input 
                      type="text" 
                      placeholder="Ex: Changer la reine..." 
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addInstruction()}
                      style={{ flex: 1, height: 48, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white', outline: 'none' }}
                    />
                    <button onClick={addInstruction} style={{ width: 48, height: 48, borderRadius: 12, background: COLORS.accent, border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Plus size={24} /></button>
                 </div>
                 
                 <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {taskList.map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
                         <span style={{ fontSize: 12, color: 'white' }}>{t}</span>
                         <button onClick={() => removeInstruction(i)} style={{ background: 'none', border: 'none', color: COLORS.error, cursor: 'pointer' }}><X size={14} /></button>
                      </div>
                    ))}
                 </div>
               </div>

               <button 
                 onClick={handleCreate}
                 style={{ width: '100%', height: 56, background: COLORS.accent, border: 'none', borderRadius: 14, color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12 }}
               >
                 Envoyer la mission <ArrowRight size={18} />
               </button>
            </div>
          </div>

          {/* Affichage des missions actives */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {previsions.length === 0 ? (
              <div style={{ height: 300, background: 'rgba(255,255,255,0.02)', border: `2px dashed ${COLORS.border}`, borderRadius: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, gap: 16 }}>
                 <CalendarClock size={48} strokeWidth={1} />
                 <p style={{ fontWeight: 600 }}>Aucune mission en cours.</p>
              </div>
            ) : (
              previsions.map(p => {
                const site = emplacements.find(e => Number(e.id) === Number(p.empId));
                return (
                  <div key={p.id} style={{ background: COLORS.surface, borderRadius: 24, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
                     <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                           <Hexagon size={18} color={COLORS.accent} />
                           <span style={{ color: 'white', fontWeight: 800 }}>{p.rucheId} — {site?.nom}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                           <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 700 }}>{p.date}</span>
                           <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24' }} />
                        </div>
                     </div>
                     <div style={{ padding: 24 }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 20, border: `1px solid ${COLORS.border}` }}>
                          <h4 style={{ color: 'white', fontSize: 13, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                             <TasksIcon size={16} color={COLORS.accent} /> ORDRES À EXÉCUTER :
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {p.tasks?.map(task => (
                              <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: task.status === 'done' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.01)', border: `1px solid ${task.status === 'done' ? COLORS.success + '40' : COLORS.border}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  {task.status === 'done' ? <CheckCircle size={18} color={COLORS.success} /> : task.status === 'doing' ? <Clock size={18} color="#fbbf24" /> : <Circle size={18} color={COLORS.textMuted} />}
                                  <span style={{ color: task.status === 'done' ? COLORS.textMuted : 'white', textDecoration: task.status === 'done' ? 'line-through' : 'none', fontSize: 14, fontWeight: 600 }}>{task.text}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                   <button onClick={() => onUpdateTask(p.id, task.id, 'todo')} style={{ px: 10, py: 6, borderRadius: 8, fontSize: 10, fontWeight: 700, background: task.status === 'todo' ? 'white' : 'transparent', color: task.status === 'todo' ? 'black' : COLORS.textMuted, border: `1px solid ${COLORS.border}`, cursor: 'pointer' }}>À FAIRE</button>
                                   <button onClick={() => onUpdateTask(p.id, task.id, 'doing')} style={{ px: 10, py: 6, borderRadius: 8, fontSize: 10, fontWeight: 700, background: task.status === 'doing' ? '#fbbf24' : 'transparent', color: task.status === 'doing' ? 'black' : COLORS.textMuted, border: `1px solid ${COLORS.border}`, cursor: 'pointer' }}>EN COURS</button>
                                   <button onClick={() => onUpdateTask(p.id, task.id, 'done')} style={{ px: 10, py: 6, borderRadius: 8, fontSize: 10, fontWeight: 700, background: task.status === 'done' ? COLORS.success : 'transparent', color: task.status === 'done' ? 'white' : COLORS.textMuted, border: `1px solid ${COLORS.border}`, cursor: 'pointer' }}>TERMINÉ</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Rappel logistique (secondaire) */}
                        <div style={{ mt: 24, display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)' }}>
                           <Package size={16} color={COLORS.textMuted} />
                           <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700 }}>BESOINS LOGISTIQUES : {p.needs.sirop}L Sirop, {p.needs.pate}kg Pâte, {p.needs.traitement}d. Trait.</span>
                        </div>
                     </div>
                  </div>
                );
              })
            )}
          </div>
       </div>
    </div>
  );
}
