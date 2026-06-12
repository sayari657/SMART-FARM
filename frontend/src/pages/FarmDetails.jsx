import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserPlus, Phone, Pencil, Trash2, X,
  Users, ShieldCheck, CheckCircle2, Search, MapPin,
  Activity, AlertTriangle, Heart, Layers, PawPrint,
  Building2, Clock, Wrench, ChevronRight, TrendingUp,
  Calendar, Info, Shield, Zap, Star, Crown, Lock,
  TrendingDown, BarChart2, Gauge,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import AnimalCard from '../components/AnimalCard';
import AlertCard from '../components/AlertCard';
import { farmsAPI, animalsAPI, alertsAPI, farmWorkersAPI, farmOwnersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import farmHeroImg     from '../assets/farm/farm-hero.png';
import farmCardImg     from '../assets/farm/farm-card.png';
import farmLandscapeImg from '../assets/farm/farm-landscape.png';

/* ── Design tokens ────────────────────────────────────────────────────── */
const T = {
  bg:     '#f8fafc', surface:'#ffffff', raised:'#f1f5f9',
  border: '#e2e8f0', muted:'#94a3b8', dim:'#64748b', text:'#0f172a',
  primary:'#16a34a', green:'#10b981', red:'#ef4444', amber:'#f59e0b',
  sky:    '#0ea5e9', indigo:'#4f46e5', purple:'#8b5cf6',
};

const STATUS_META = {
  active:      { label:'Actif',       color:'#16a34a', bg:'#dcfce7', dot:'#4ade80' },
  inactive:    { label:'Inactif',     color:'#64748b', bg:'#f1f5f9', dot:'#94a3b8' },
  maintenance: { label:'Maintenance', color:'#d97706', bg:'#fef3c7', dot:'#fbbf24' },
};

function usePlanConfig(t) {
  return {
    free: {
      key: 'free', label: t('billing.plan_free'), color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1',
      icon: Shield, gradient: 'linear-gradient(135deg,#475569,#64748b)',
      limits: { max_animals: 50, max_workers: 1 },
      features: [t('billing.free_f1'), t('billing.free_f2'), t('billing.free_f3'), t('billing.free_f4'), t('billing.free_f5')],
    },
    pro: {
      key: 'pro', label: t('billing.plan_pro'), color: '#16a34a', bg: '#f0fdf4', border: '#86efac',
      icon: Zap, gradient: 'linear-gradient(135deg,#15803d,#22c55e)',
      limits: { max_animals: -1, max_workers: 5 },
      features: [t('billing.pro_f1'), t('billing.pro_f2'), t('billing.pro_f3'), t('billing.pro_f4'), t('billing.pro_f5'), t('billing.pro_f6')],
    },
    enterprise: {
      key: 'enterprise', label: t('billing.plan_enterprise'), color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd',
      icon: Crown, gradient: 'linear-gradient(135deg,#5b21b6,#7c3aed)',
      limits: { max_animals: -1, max_workers: -1 },
      features: [t('billing.ent_f1'), t('billing.ent_f2'), t('billing.ent_f3'), t('billing.ent_f4'), t('billing.ent_f5'), t('billing.ent_f6')],
    },
  };
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}
const AVATAR_COLORS = ['#16a34a','#2563eb','#d97706','#7c3aed','#db2777','#0891b2'];
function avatarColor(seed) {
  let h = 0;
  for (let i = 0; i < (seed||'').length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
const scoreColor = v => v >= 80 ? T.green : v >= 60 ? T.amber : T.red;

/* ── Modal shell ────────────────────────────────────────────────────────── */
function ModalShell({ onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.55)', backdropFilter:'blur(4px)',
      zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:T.surface, borderRadius:20, padding:28, width:'100%', maxWidth:460,
        boxShadow:'0 24px 64px rgba(0,0,0,.15)', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:T.raised,
          border:'none', borderRadius:8, padding:'6px 8px', cursor:'pointer', color:T.dim, display:'flex' }}>
          <X size={15}/>
        </button>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10,
    padding:'10px 14px', marginBottom:14, fontSize:13, color:'#b91c1c' }}>{msg}</div>;
}

/* ── Delete confirm ─────────────────────────────────────────────────────── */
function DeleteConfirm({ title, body, onConfirm, onClose, saving }) {
  return (
    <ModalShell onClose={onClose}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:52, height:52, borderRadius:'50%', margin:'0 auto 16px',
          background:'#fef2f2', border:'1.5px solid #fca5a5',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Trash2 size={20} color="#ef4444"/>
        </div>
        <h3 style={{ fontSize:16, fontWeight:800, marginBottom:8, color:T.text }}>{title}</h3>
        <p style={{ color:T.dim, fontSize:14, marginBottom:24, lineHeight:1.6 }}>{body}</p>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:10, border:`1px solid ${T.border}`,
            background:T.surface, fontWeight:600, fontSize:13, cursor:'pointer', color:T.dim }}>
            Annuler
          </button>
          <button onClick={onConfirm} disabled={saving} style={{ flex:1, padding:'10px', borderRadius:10,
            background:'#ef4444', color:'#fff', border:'none', fontWeight:700, fontSize:13,
            cursor:saving?'not-allowed':'pointer', opacity:saving?.7:1 }}>
            {saving ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   OWNERS TAB
══════════════════════════════════════════════════════════════════════════ */
function AddOwnerModal({ onSave, onClose, saving, error }) {
  const [identifier, setIdentifier] = useState('');
  return (
    <ModalShell onClose={onClose}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
        <div style={{ width:42, height:42, borderRadius:10, background:'#eff6ff',
          border:'1.5px solid #bfdbfe', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ShieldCheck size={18} color="#3b82f6"/>
        </div>
        <div>
          <div style={{ fontWeight:800, fontSize:15, color:T.text }}>Ajouter un propriétaire</div>
          <div style={{ fontSize:12, color:T.muted }}>L'utilisateur doit déjà avoir un compte propriétaire</div>
        </div>
      </div>
      <ErrorBox msg={error}/>
      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:11, fontWeight:700, color:T.dim, display:'block', marginBottom:6,
          textTransform:'uppercase', letterSpacing:.5 }}>Identifiant</label>
        <div style={{ position:'relative' }}>
          <Search size={14} color={T.muted} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
          <input placeholder="ahmed.farm ou +21655123456" value={identifier}
            onChange={e => setIdentifier(e.target.value)} autoFocus
            style={{ width:'100%', padding:'10px 12px 10px 36px', background:T.raised, border:`1px solid ${T.border}`,
              borderRadius:10, fontSize:13, color:T.text, outline:'none', boxSizing:'border-box' }}
            onFocus={e => e.target.style.borderColor='#3b82f6'}
            onBlur={e => e.target.style.borderColor=T.border}/>
        </div>
        <div style={{ fontSize:11, color:T.muted, marginTop:5 }}>
          Accès complet immédiat à la gestion de cette ferme.
        </div>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:10, border:`1px solid ${T.border}`,
          background:T.surface, fontWeight:600, fontSize:13, cursor:'pointer', color:T.dim }}>Annuler</button>
        <button onClick={() => onSave({ identifier })} disabled={saving || !identifier.trim()}
          style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:'#3b82f6',
            color:'#fff', fontWeight:700, fontSize:13, cursor:saving||!identifier.trim()?'not-allowed':'pointer',
            opacity:saving||!identifier.trim()?.7:1 }}>
          {saving ? 'Ajout…' : 'Ajouter'}
        </button>
      </div>
    </ModalShell>
  );
}

function OwnerCard({ owner, onRemove, canRemove }) {
  const color = avatarColor(owner.username);
  const ago = owner.added_at
    ? new Date(owner.added_at).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })
    : null;
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:T.surface, borderRadius:14, border:`1px solid ${hov?'#bfdbfe':T.border}`,
        display:'flex', alignItems:'center', gap:14, padding:'16px 18px',
        transition:'all .2s', boxShadow:hov?'0 4px 16px rgba(59,130,246,.1)':'0 1px 3px rgba(0,0,0,.04)' }}>
      <div style={{ width:46, height:46, borderRadius:'50%', flexShrink:0,
        background:`${color}15`, border:`2px solid ${color}35`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontWeight:800, fontSize:15, color }}>
        {initials(owner.full_name)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:14, color:T.text, marginBottom:3 }}>{owner.full_name}</div>
        <div style={{ fontSize:12, color:T.dim, display:'flex', flexWrap:'wrap', gap:8 }}>
          <span>@{owner.username}</span>
          {owner.phone_number && <span style={{ display:'flex', alignItems:'center', gap:3 }}><Phone size={11}/>{owner.phone_number}</span>}
          {ago && <span>· ajouté {ago}</span>}
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'#3b82f6',
        background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:99, padding:'4px 11px', flexShrink:0 }}>
        <ShieldCheck size={11}/> Propriétaire
      </div>
      {canRemove && (
        <button onClick={onRemove} title="Retirer"
          style={{ width:32, height:32, borderRadius:8, flexShrink:0, background:'#fef2f2',
            border:'1px solid #fca5a5', display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'#ef4444' }}>
          <Trash2 size={13}/>
        </button>
      )}
    </div>
  );
}

function OwnersTab({ farmId }) {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    farmOwnersAPI.list(farmId).then(r => setOwners(r.data)).catch(() => setOwners([])).finally(() => setLoading(false));
  }, [farmId]);
  useEffect(() => { load(); }, [load]);

  const handleAdd = async (form) => {
    setSaving(true); setModalError('');
    try { const r = await farmOwnersAPI.add(farmId, form); setOwners(p => [...p, r.data]); setShowAdd(false); }
    catch (e) { setModalError(e.response?.data?.detail || 'Une erreur est survenue.'); }
    finally { setSaving(false); }
  };
  const handleRemove = async () => {
    setSaving(true);
    try { await farmOwnersAPI.remove(farmId, deleteTarget.owner_id); setOwners(p => p.filter(o => o.owner_id !== deleteTarget.owner_id)); setDeleteTarget(null); }
    catch (e) { alert(e.response?.data?.detail || 'Erreur.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ textAlign:'center', padding:48 }}><div className="spinner"/></div>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div style={{ fontSize:13, color:T.dim }}>{owners.length} propriétaire{owners.length!==1?'s':''}</div>
        <button onClick={() => { setModalError(''); setShowAdd(true); }}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10,
            border:'none', background:'#3b82f6', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
            boxShadow:'0 3px 10px rgba(59,130,246,.3)' }}>
          <UserPlus size={14}/> Ajouter un propriétaire
        </button>
      </div>
      {owners.length === 0
        ? <EmptyState icon="🏠" title="Aucun propriétaire" sub="Ajoutez des propriétaires pour leur donner accès à la gestion complète." image={farmLandscapeImg}/>
        : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {owners.map(o => <OwnerCard key={o.owner_id} owner={o} canRemove={owners.length>1} onRemove={() => setDeleteTarget(o)}/>)}
          </div>}
      {owners.length > 0 && (
        <div style={{ marginTop:16, padding:'12px 16px', background:'#eff6ff', border:'1px solid #bfdbfe',
          borderRadius:10, fontSize:12, color:T.dim, lineHeight:1.6 }}>
          Les propriétaires peuvent aussi se connecter via <strong style={{ color:T.text }}>/worker-login</strong> avec leur numéro de téléphone.
        </div>
      )}
      {showAdd && <AddOwnerModal onSave={handleAdd} onClose={() => !saving && setShowAdd(false)} saving={saving} error={modalError}/>}
      {deleteTarget && (
        <DeleteConfirm title="Retirer ce propriétaire ?"
          body={<><strong>{deleteTarget.full_name}</strong> (@{deleteTarget.username}) perdra l'accès à cette ferme.</>}
          onConfirm={handleRemove} onClose={() => !saving && setDeleteTarget(null)} saving={saving}/>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   WORKERS TAB
══════════════════════════════════════════════════════════════════════════ */
function WorkerFormModal({ mode, initial, onSave, onClose, saving, error }) {
  const [form, setForm] = useState(initial
    ? { full_name: initial.full_name||'', phone_number: initial.phone_number||'' }
    : { full_name:'', phone_number:'+216' });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const valid = form.full_name.trim().length >= 2 && form.phone_number.trim().length >= 8;
  const inp = { width:'100%', padding:'10px 12px', background:T.raised, border:`1px solid ${T.border}`,
    borderRadius:10, fontSize:13, color:T.text, outline:'none', boxSizing:'border-box', fontFamily:'Inter,system-ui,sans-serif' };
  return (
    <ModalShell onClose={onClose}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
        <div style={{ width:42, height:42, borderRadius:10, background:'#f0fdf4',
          border:'1.5px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Users size={18} color="#16a34a"/>
        </div>
        <div>
          <div style={{ fontWeight:800, fontSize:15, color:T.text }}>{mode==='add'?'Ajouter un ouvrier':"Modifier l'ouvrier"}</div>
          <div style={{ fontSize:12, color:T.muted }}>{mode==='add'?'Compte créé automatiquement':'Mise à jour des informations'}</div>
        </div>
      </div>
      <ErrorBox msg={error}/>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <label style={{ fontSize:11, fontWeight:700, color:T.dim, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.5 }}>Nom complet *</label>
          <input style={inp} placeholder="Ahmed Ben Ali" value={form.full_name} onChange={set('full_name')} autoFocus
            onFocus={e => e.target.style.borderColor=T.primary} onBlur={e => e.target.style.borderColor=T.border}/>
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:700, color:T.dim, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.5 }}>Numéro WhatsApp *</label>
          <div style={{ position:'relative' }}>
            <Phone size={14} color={T.muted} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
            <input style={{ ...inp, paddingLeft:36 }} type="tel" placeholder="+216 55 123 456"
              value={form.phone_number} onChange={set('phone_number')}
              onFocus={e => e.target.style.borderColor=T.primary} onBlur={e => e.target.style.borderColor=T.border}/>
          </div>
          <div style={{ fontSize:11, color:T.muted, marginTop:4 }}>Connexion mobile via OTP WhatsApp</div>
        </div>
        {mode==='add' && (
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'10px 14px',
            fontSize:12, color:'#166534', lineHeight:1.6 }}>
            Un compte ouvrier sera créé automatiquement. Il peut être assigné à plusieurs fermes.
          </div>
        )}
        <div style={{ display:'flex', gap:10, marginTop:4 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:10, border:`1px solid ${T.border}`,
            background:T.surface, fontWeight:600, fontSize:13, cursor:'pointer', color:T.dim }}>Annuler</button>
          <button onClick={() => onSave(form)} disabled={saving||!valid}
            style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:T.primary,
              color:'#fff', fontWeight:700, fontSize:13, cursor:saving||!valid?'not-allowed':'pointer',
              opacity:saving||!valid?.7:1, boxShadow:'0 3px 10px rgba(22,163,74,.3)' }}>
            {saving?'Enregistrement…':mode==='add'?'Ajouter':'Sauvegarder'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function WorkerCard({ worker, onEdit, onDelete }) {
  const color = avatarColor(worker.phone_number);
  const ago = worker.assigned_at
    ? new Date(worker.assigned_at).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })
    : null;
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:T.surface, borderRadius:14, border:`1px solid ${hov?T.primary+'40':T.border}`,
        display:'flex', alignItems:'center', gap:14, padding:'16px 18px',
        transition:'all .2s', boxShadow:hov?'0 4px 16px rgba(22,163,74,.1)':'0 1px 3px rgba(0,0,0,.04)' }}>
      <div style={{ width:46, height:46, borderRadius:'50%', flexShrink:0,
        background:`${color}15`, border:`2px solid ${color}35`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontWeight:800, fontSize:15, color }}>
        {initials(worker.full_name)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:14, color:T.text, marginBottom:3 }}>{worker.full_name}</div>
        <div style={{ fontSize:12, color:T.dim, display:'flex', flexWrap:'wrap', gap:8 }}>
          <span style={{ display:'flex', alignItems:'center', gap:3 }}><Phone size={11}/><span style={{ fontFamily:'monospace' }}>{worker.phone_number}</span></span>
          {ago && <span>· assigné {ago}</span>}
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'#16a34a',
        background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:99, padding:'4px 11px', flexShrink:0 }}>
        <CheckCircle2 size={11}/> OTP
      </div>
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        <button onClick={onEdit} title="Modifier" style={{ width:32, height:32, borderRadius:8,
          background:T.raised, border:`1px solid ${T.border}`,
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:T.dim }}>
          <Pencil size={13}/>
        </button>
        <button onClick={onDelete} title="Retirer" style={{ width:32, height:32, borderRadius:8,
          background:'#fef2f2', border:'1px solid #fca5a5',
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#ef4444' }}>
          <Trash2 size={13}/>
        </button>
      </div>
    </div>
  );
}

function WorkersTab({ farmId }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    farmWorkersAPI.list(farmId).then(r => setWorkers(r.data)).catch(() => setWorkers([])).finally(() => setLoading(false));
  }, [farmId]);
  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setModalError(''); setModal({ mode:'add', worker:null }); };
  const openEdit = w  => { setModalError(''); setModal({ mode:'edit', worker:w }); };

  const handleSave = async (form) => {
    setSaving(true); setModalError('');
    try {
      if (modal.mode==='add') { const r = await farmWorkersAPI.add(farmId, form); setWorkers(p => [...p, r.data]); }
      else { const r = await farmWorkersAPI.update(farmId, modal.worker.worker_id, form); setWorkers(p => p.map(w => w.worker_id===modal.worker.worker_id ? r.data : w)); }
      setModal(null);
    } catch (e) { setModalError(e.response?.data?.detail||'Une erreur est survenue.'); }
    finally { setSaving(false); }
  };
  const handleDelete = async () => {
    setSaving(true);
    try { await farmWorkersAPI.remove(farmId, deleteTarget.worker_id); setWorkers(p => p.filter(w => w.worker_id!==deleteTarget.worker_id)); setDeleteTarget(null); }
    catch { } finally { setSaving(false); }
  };

  if (loading) return <div style={{ textAlign:'center', padding:48 }}><div className="spinner"/></div>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div style={{ fontSize:13, color:T.dim }}>{workers.length} ouvrier{workers.length!==1?'s':''}</div>
        <button onClick={openAdd}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10,
            border:'none', background:T.primary, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
            boxShadow:'0 3px 10px rgba(22,163,74,.3)' }}>
          <UserPlus size={14}/> Ajouter un ouvrier
        </button>
      </div>
      {workers.length === 0
        ? <EmptyState icon="👷" title="Aucun ouvrier assigné" sub="Ajoutez des ouvriers pour accès mobile via OTP WhatsApp." image={farmLandscapeImg}/>
        : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {workers.map(w => <WorkerCard key={w.worker_id} worker={w} onEdit={() => openEdit(w)} onDelete={() => setDeleteTarget(w)}/>)}
          </div>}
      {workers.length > 0 && (
        <div style={{ marginTop:16, padding:'12px 16px', background:'#f0fdf4', border:'1px solid #bbf7d0',
          borderRadius:10, fontSize:12, color:T.dim, lineHeight:1.6 }}>
          Les ouvriers se connectent via <strong style={{ color:T.text }}>/worker-login</strong> avec leur numéro WhatsApp.
        </div>
      )}
      {modal && <WorkerFormModal mode={modal.mode} initial={modal.worker} onSave={handleSave} onClose={() => !saving && setModal(null)} saving={saving} error={modalError}/>}
      {deleteTarget && (
        <DeleteConfirm title="Retirer cet ouvrier ?"
          body={<><strong>{deleteTarget.full_name}</strong> ({deleteTarget.phone_number}) sera retiré de cette ferme.</>}
          onConfirm={handleDelete} onClose={() => !saving && setDeleteTarget(null)} saving={saving}/>
      )}
    </div>
  );
}

/* ── KPI tile (extracted to obey Rules of Hooks — no hooks inside .map) ── */
function KpiTile({ label, value, color, Icon, sub }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:T.surface, borderRadius:14, padding:'16px 18px',
        border:`1px solid ${hov?color+'40':T.border}`,
        boxShadow:hov?`0 6px 20px ${color}12`:'0 1px 3px rgba(0,0,0,.04)',
        transform:hov?'translateY(-2px)':'none', transition:'all .2s' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <div style={{ background:`${color}12`, borderRadius:8, padding:6 }}><Icon size={12} color={color}/></div>
        <span style={{ fontSize:9, color:T.muted, fontWeight:700, letterSpacing:.6, textTransform:'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize:22, fontWeight:900, color, lineHeight:1, marginBottom:3, fontVariantNumeric:'tabular-nums' }}>{value}</div>
      <div style={{ fontSize:10, color:T.muted }}>{sub}</div>
    </div>
  );
}

/* ── Empty state with watercolor ────────────────────────────────────────── */
function EmptyState({ icon, title, sub, image, onAction, actionLabel }) {
  return (
    <div style={{ position:'relative', borderRadius:20, overflow:'hidden',
      border:`2px dashed ${T.border}`, padding:'52px 24px', textAlign:'center' }}>
      {image && <img src={image} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%',
        objectFit:'cover', opacity:.08, pointerEvents:'none' }}/>}
      <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ fontSize:44, marginBottom:12 }}>{icon}</div>
        <h3 style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:6 }}>{title}</h3>
        <p style={{ fontSize:13, color:T.muted, marginBottom: onAction ? 20 : 0 }}>{sub}</p>
        {onAction && (
          <button onClick={onAction} style={{ display:'inline-flex', alignItems:'center', gap:6,
            padding:'9px 20px', borderRadius:10, border:'none', background:T.primary,
            color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function FarmDetails() {
  const { t }      = useTranslation();
  const PLAN_CONFIG = usePlanConfig(t);
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const [farm, setFarm]       = useState(null);
  const [units, setUnits]     = useState([]);
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [unitsLoading, setUnitsLoading]   = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [tab, setTab]         = useState('units');

  useEffect(() => {
    let active = true;

    setFarm(null);
    setUnits([]);
    setAlerts([]);
    setLoading(true);
    setUnitsLoading(true);
    setAlertsLoading(true);

    farmsAPI.get(id)
      .then((response) => {
        if (active) setFarm(response.data);
      })
      .catch(() => {
        if (active) setFarm(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    animalsAPI.list({ farm_id: id })
      .then((response) => {
        if (active) setUnits(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        if (active) setUnits([]);
      })
      .finally(() => {
        if (active) setUnitsLoading(false);
      });

    alertsAPI.list(id)
      .then((response) => {
        if (active) setAlerts(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        if (active) setAlerts([]);
      })
      .finally(() => {
        if (active) setAlertsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <div className="page-content"><div className="spinner"/></div>;
  if (!farm)   return <div className="page-content"><p style={{ color:'#ef4444' }}>Ferme introuvable</p></div>;

  const statusMeta  = STATUS_META[farm.status] || STATUS_META.inactive;
  const healthColor = farm.avg_health_score != null ? scoreColor(farm.avg_health_score) : T.muted;
  const unresolvedAlerts = alerts.filter(a => !a.is_resolved);
  const unitCount = unitsLoading ? (farm.unit_count ?? 0) : units.length;
  const alertCount = alertsLoading ? (farm.active_alerts ?? 0) : unresolvedAlerts.length;
  const planKey  = (user?.plan || 'free');
  const planCfg  = PLAN_CONFIG[planKey] || PLAN_CONFIG.free;

  const TABS = [
    { id:'units',   label:'Animaux',       count: unitCount,  icon: PawPrint,       color: T.primary },
    { id:'alerts',  label:'Alertes',       count: alertCount, icon: AlertTriangle, color: alertCount>0 ? T.red : T.green },
    { id:'owners',  label:'Propriétaires', count: null,                   icon: ShieldCheck, color: '#3b82f6' },
    { id:'workers', label:'Ouvriers',      count: null,                   icon: Users,       color: '#16a34a' },
    { id:'info',    label:'Informations',  count: null,                   icon: Info,        color: T.dim },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden',
      background:T.bg, fontFamily:"'Inter',system-ui,sans-serif" }}>

      <Navbar
        title={farm.name}
        subtitle={farm.location || 'Ferme agricole'}
        actions={
          <button onClick={() => navigate('/farms')}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9,
              border:`1px solid ${T.border}`, background:T.surface, color:T.dim, fontSize:12, fontWeight:600, cursor:'pointer' }}>
            <ArrowLeft size={13}/> Retour aux fermes
          </button>
        }
      />

      <div style={{ flex:1, overflowY:'auto', overscrollBehaviorY:'contain' }}>

        {/* ═══ HERO BANNER ════════════════════════════════════════════════ */}
        <div style={{ position:'relative', overflow:'hidden', minHeight:240,
          background:'linear-gradient(135deg, #14532d 0%, #166534 40%, #16a34a 100%)' }}>

          {/* Watercolor background — tractor + barn */}
          <img src={farmHeroImg} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%',
            objectFit:'cover', objectPosition:'center', opacity:.35, mixBlendMode:'luminosity', pointerEvents:'none' }}/>

          {/* Farm card image right panel */}
          <div style={{ position:'absolute', right:0, top:0, height:'100%', width:'42%', overflow:'hidden', pointerEvents:'none' }}>
            <img src={farmCardImg} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'left center', opacity:.5 }}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right, rgba(22,101,52,.9) 0%, transparent 100%)' }}/>
          </div>

          {/* Decorative blobs */}
          <div style={{ position:'absolute', top:-60, left:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>
          <div style={{ position:'absolute', bottom:-40, right:'40%', width:150, height:150, borderRadius:'50%', background:'rgba(255,255,255,.03)', pointerEvents:'none' }}/>

          {/* Content */}
          <div style={{ position:'relative', zIndex:2, padding:'36px 32px',
            display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:24, flexWrap:'wrap' }}>

            {/* Left: farm info */}
            <div style={{ flex:1, minWidth:280 }}>
              {/* Status + plan badge */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                {/* Dynamic plan badge */}
                <div style={{ background: planCfg.gradient, borderRadius:99, padding:'5px 14px',
                  display:'flex', alignItems:'center', gap:6,
                  boxShadow:`0 3px 12px rgba(0,0,0,.25)` }}>
                  <planCfg.icon size={11} color="#fff"/>
                  <span style={{ fontSize:10, color:'#fff', fontWeight:800, letterSpacing:.7, textTransform:'uppercase' }}>
                    Smart Farm · {planCfg.label}
                  </span>
                </div>
                <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700,
                  color: statusMeta.dot, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.2)',
                  borderRadius:99, padding:'4px 10px' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:statusMeta.dot,
                    boxShadow:`0 0 6px ${statusMeta.dot}`, display:'inline-block' }}/>
                  {statusMeta.label}
                </span>
              </div>

              {/* Farm name */}
              <h1 style={{ fontSize:'clamp(22px,3.5vw,32px)', fontWeight:900, color:'#fff',
                margin:'0 0 8px', letterSpacing:'-.5px', lineHeight:1.2,
                textShadow:'0 2px 12px rgba(0,0,0,.2)' }}>
                {farm.name}
              </h1>

              {/* Location */}
              {farm.location && (
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:14,
                  color:'rgba(255,255,255,.75)', marginBottom:20 }}>
                  <MapPin size={14}/>
                  {farm.location}
                </div>
              )}

              {/* Quick pills */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[
                  { label:`${unitCount} animaux`, icon:'🐾' },
                  farm.total_area_ha && { label:`${farm.total_area_ha} ha`, icon:'🌿' },
                  { label: alertCount > 0 ? `${alertCount} alertes` : 'Aucune alerte',
                    icon: alertCount > 0 ? '⚠️' : '✅' },
                ].filter(Boolean).map((p, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:5,
                    background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.2)',
                    borderRadius:99, padding:'5px 12px', fontSize:12, color:'rgba(255,255,255,.9)', fontWeight:600 }}>
                    <span>{p.icon}</span> {p.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: KPI snapshot */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, minWidth:200 }}>
              {[
                { val: unitCount, label:'Animaux', color:'#4ade80' },
                { val: alertCount, label:'Alertes', color: alertCount>0 ? '#f87171' : '#4ade80' },
                { val: farm.avg_health_score != null ? `${farm.avg_health_score}%` : '—', label:'Santé', color:'#60a5fa' },
                { val: farm.total_area_ha ? `${farm.total_area_ha} ha` : '—', label:'Surface', color:'#fbbf24' },
              ].map(({ val, label, color }) => (
                <div key={label} style={{ background:'rgba(255,255,255,.12)', backdropFilter:'blur(8px)',
                  border:'1px solid rgba(255,255,255,.18)', borderRadius:14, padding:'14px 16px', textAlign:'center' }}>
                  <div style={{ fontSize:22, fontWeight:900, color, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{val}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.55)', fontWeight:600,
                    textTransform:'uppercase', letterSpacing:.6, marginTop:4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ KPI BAR ════════════════════════════════════════════════════ */}
        <div style={{ padding:'20px 32px', borderBottom:`1px solid ${T.border}`, background:T.bg }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
            {[
              { label:'Unités animales',  value: unitCount,  color:T.primary, icon:PawPrint, sub:'Toutes espèces' },
              { label:'Alertes actives',  value: alertCount, color:alertCount>0?T.red:T.green, icon:AlertTriangle, sub:alertCount>0?'Action requise':'Tout va bien' },
              { label:'Score santé',      value: farm.avg_health_score != null ? `${farm.avg_health_score}%` : '—', color:healthColor, icon:Heart, sub:'Moyenne cheptel' },
              { label:'Surface totale',   value: farm.total_area_ha ? `${farm.total_area_ha} ha` : '—', color:T.amber, icon:Layers, sub:'Hectares' },
              { label:'Statut',           value: statusMeta.label,        color:statusMeta.color, icon:Activity, sub:`Ferme ID #${id}` },
            ].map(({ label, value, color, icon:Icon, sub }) => (
              <KpiTile key={label} label={label} value={value} color={color} Icon={Icon} sub={sub}/>
            ))}
          </div>
        </div>

        {/* ═══ TABS + CONTENT ═════════════════════════════════════════════ */}
        <div style={{ padding:'20px 32px' }}>

          {/* Tab bar */}
          <div style={{ display:'flex', gap:0, borderBottom:`2px solid ${T.border}`, marginBottom:24, overflowX:'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px',
                  background:'transparent', border:'none',
                  borderBottom: tab===t.id ? `2px solid ${t.color}` : '2px solid transparent',
                  marginBottom:-2, cursor:'pointer', whiteSpace:'nowrap',
                  fontSize:13, fontWeight:tab===t.id?700:500,
                  color:tab===t.id?t.color:T.dim, transition:'all .15s', outline:'none' }}>
                <t.icon size={14}/>
                {t.label}
                {t.count != null && (
                  <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99,
                    background:tab===t.id?`${t.color}15`:T.raised,
                    color:tab===t.id?t.color:T.muted }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab: Animaux */}
          {tab === 'units' && (
            unitsLoading
              ? <div style={{ textAlign:'center', padding:48 }}><div className="spinner"/></div>
              : units.length > 0
              ? <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16 }}>
                  {units.map(u => <AnimalCard key={u.id} unit={u}/>)}
                </div>
              : <EmptyState icon="🐾" title="Aucun animal enregistré" sub="Ajoutez des animaux depuis la page Animaux." image={farmLandscapeImg}/>
          )}

          {/* Tab: Alertes */}
          {tab === 'alerts' && (
            alertsLoading
              ? <div style={{ textAlign:'center', padding:48 }}><div className="spinner"/></div>
              : unresolvedAlerts.length > 0
              ? <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {unresolvedAlerts.map(a => <AlertCard key={a.id} alert={a}/>)}
                </div>
              : <EmptyState icon="✅" title="Aucune alerte active" sub="Tous les systèmes sont opérationnels." image={farmLandscapeImg}/>
          )}

          {/* Tab: Propriétaires */}
          {tab === 'owners'  && <OwnersTab farmId={id}/>}

          {/* Tab: Ouvriers */}
          {tab === 'workers' && <WorkersTab farmId={id}/>}

          {/* Tab: Informations */}
          {tab === 'info' && (
            <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

              {/* ── ROW 1: Farm details + Stats ─────────────────────────── */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>

                {/* Farm details card */}
                <div style={{ background:T.surface, borderRadius:16, border:`1px solid ${T.border}`,
                  overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}>
                  <div style={{ position:'relative', height:130, overflow:'hidden', background:'#14532d' }}>
                    <img src={farmCardImg} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:.6 }}/>
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(20,83,45,.8) 0%, transparent 60%)' }}/>
                    <div style={{ position:'absolute', bottom:12, left:16, color:'#fff' }}>
                      <div style={{ fontWeight:800, fontSize:15 }}>{farm.name}</div>
                      <div style={{ fontSize:11, opacity:.75 }}>{farm.location || 'Emplacement non défini'}</div>
                    </div>
                    <div style={{ position:'absolute', top:12, right:12, background:statusMeta.bg,
                      color:statusMeta.color, borderRadius:99, padding:'3px 10px', fontSize:10, fontWeight:800 }}>
                      {statusMeta.label}
                    </div>
                  </div>
                  <div style={{ padding:'16px 18px' }}>
                    {[
                      ['Nom', farm.name],
                      ['Localisation', farm.location || '—'],
                      ['Statut', statusMeta.label],
                      ['Surface', farm.total_area_ha ? `${farm.total_area_ha} ha` : '—'],
                      ['Description', farm.description || '—'],
                      ['Créée le', new Date(farm.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })],
                      ['Coordonnées GPS', farm.latitude && farm.longitude ? `${(+farm.latitude).toFixed(4)}, ${(+farm.longitude).toFixed(4)}` : '—'],
                      ['ID Ferme', `#${farm.id}`],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
                        padding:'9px 0', borderBottom:`1px solid ${T.border}`, gap:16 }}>
                        <span style={{ fontSize:12, color:T.muted, fontWeight:600, flexShrink:0 }}>{k}</span>
                        <span style={{ fontSize:12, color:T.text, fontWeight:500, textAlign:'right', wordBreak:'break-all' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats side */}
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {/* Health gauge */}
                  <div style={{ background:T.surface, borderRadius:16, padding:'20px',
                    border:`1px solid ${T.border}`, boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:'uppercase',
                      letterSpacing:.6, marginBottom:14 }}>Score Santé Global</div>
                    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                      <div style={{ fontSize:44, fontWeight:900, color:healthColor, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
                        {farm.avg_health_score != null ? `${farm.avg_health_score}%` : '—'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ height:8, background:T.raised, borderRadius:99, overflow:'hidden' }}>
                          <div style={{ width:`${Math.min(farm.avg_health_score||0, 100)}%`, height:'100%',
                            background:healthColor, borderRadius:99, transition:'width .6s ease' }}/>
                        </div>
                        <div style={{ fontSize:11, color:T.muted, marginTop:5 }}>
                          {farm.avg_health_score >= 80 ? '✓ Excellent état'
                            : farm.avg_health_score >= 60 ? '~ État acceptable'
                            : farm.avg_health_score != null ? '⚠ À surveiller' : 'Pas de données'}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Quick stats */}
                  <div style={{ background:T.surface, borderRadius:16, padding:'20px',
                    border:`1px solid ${T.border}`, boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:'uppercase',
                      letterSpacing:.6, marginBottom:14 }}>Résumé Opérationnel</div>
                    {[
                      { label:'Unités animales', value:unitCount, color:T.primary },
                      { label:'Alertes actives', value:alertCount, color:alertCount>0?T.red:T.green },
                      { label:'Alertes totales', value:alerts.length, color:T.amber },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display:'flex', justifyContent:'space-between',
                        alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                        <span style={{ fontSize:13, color:T.dim }}>{label}</span>
                        <span style={{ fontSize:16, fontWeight:900, color, fontVariantNumeric:'tabular-nums' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── ROW 2: Plan Entreprise + Niveaux Max ────────────────── */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>

                {/* Plan Entreprise card */}
                <div style={{ borderRadius:20, overflow:'hidden', border:`1.5px solid ${planCfg.border}`,
                  boxShadow:`0 8px 32px ${planCfg.color}18` }}>
                  {/* Gradient header */}
                  <div style={{ background: planCfg.gradient, padding:'22px 24px', position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%',
                      background:'rgba(255,255,255,.08)', pointerEvents:'none' }}/>
                    <div style={{ position:'absolute', bottom:-20, left:-20, width:80, height:80, borderRadius:'50%',
                      background:'rgba(255,255,255,.05)', pointerEvents:'none' }}/>
                    <div style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                          <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,.2)',
                            display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <planCfg.icon size={18} color="#fff"/>
                          </div>
                          <div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', fontWeight:700,
                              textTransform:'uppercase', letterSpacing:.8 }}>Plan actif</div>
                            <div style={{ fontSize:18, fontWeight:900, color:'#fff', lineHeight:1.1 }}>{planCfg.label}</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ background:'rgba(255,255,255,.2)', border:'1px solid rgba(255,255,255,.3)',
                        borderRadius:99, padding:'4px 12px', fontSize:10, color:'#fff', fontWeight:800, letterSpacing:.5 }}>
                        {planCfg.key === 'enterprise' ? 'Sur mesure' : planCfg.key === 'pro' ? '29 €/mois' : 'Gratuit'}
                      </div>
                    </div>
                  </div>
                  {/* Features list */}
                  <div style={{ background:T.surface, padding:'18px 24px' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:'uppercase',
                      letterSpacing:.6, marginBottom:12 }}>Fonctionnalités incluses</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {planCfg.features.map((f, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0,
                            background:`${planCfg.color}15`, border:`1.5px solid ${planCfg.color}40`,
                            display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <CheckCircle2 size={10} color={planCfg.color}/>
                          </div>
                          <span style={{ fontSize:12, color:T.text, fontWeight:500 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    {planCfg.key !== 'enterprise' && (
                      <div style={{ marginTop:16, padding:'10px 14px', borderRadius:10,
                        background:`${planCfg.color}08`, border:`1px solid ${planCfg.color}20`,
                        fontSize:11, color:planCfg.color, fontWeight:600 }}>
                        {planCfg.key === 'free' ? t('billing.upgrade_to_pro') : t('billing.upgrade_to_enterprise')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Niveaux Max card */}
                <div style={{ background:T.surface, borderRadius:20, border:`1px solid ${T.border}`,
                  overflow:'hidden', boxShadow:'0 4px 16px rgba(0,0,0,.06)' }}>
                  {/* Header */}
                  <div style={{ padding:'18px 22px 14px', borderBottom:`1px solid ${T.border}`,
                    display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:`${T.primary}12`,
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Gauge size={16} color={T.primary}/>
                    </div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:14, color:T.text }}>Niveaux Max</div>
                      <div style={{ fontSize:11, color:T.muted }}>Utilisation selon le plan {planCfg.label}</div>
                    </div>
                  </div>
                  <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:20 }}>

                    {/* Animals gauge */}
                    {(() => {
                      const max = planCfg.limits.max_animals;
                      const used = unitCount;
                      const isUnlimited = max === -1;
                      const pct = isUnlimited ? 0 : Math.min((used / max) * 100, 100);
                      const barColor = pct >= 90 ? T.red : pct >= 70 ? T.amber : T.primary;
                      return (
                        <div>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                              <PawPrint size={14} color={barColor}/>
                              <span style={{ fontSize:13, fontWeight:700, color:T.text }}>Animaux</span>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <span style={{ fontSize:20, fontWeight:900, color:barColor, fontVariantNumeric:'tabular-nums' }}>{used}</span>
                              <span style={{ fontSize:12, color:T.muted, fontWeight:500 }}>
                                / {isUnlimited ? '∞' : max}
                              </span>
                              {isUnlimited && (
                                <span style={{ fontSize:10, fontWeight:700, color:planCfg.color,
                                  background:`${planCfg.color}12`, border:`1px solid ${planCfg.color}30`,
                                  borderRadius:99, padding:'2px 8px' }}>Illimité</span>
                              )}
                            </div>
                          </div>
                          {!isUnlimited && (
                            <>
                              <div style={{ height:10, background:T.raised, borderRadius:99, overflow:'hidden', marginBottom:4 }}>
                                <div style={{ width:`${pct}%`, height:'100%', background:barColor,
                                  borderRadius:99, transition:'width .7s ease',
                                  boxShadow:`0 0 8px ${barColor}60` }}/>
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:T.muted }}>
                                <span>{pct.toFixed(0)}% utilisé</span>
                                <span>{max - used} restants</span>
                              </div>
                            </>
                          )}
                          {isUnlimited && (
                            <div style={{ height:10, background:`${planCfg.color}15`, borderRadius:99, overflow:'hidden',
                              position:'relative' }}>
                              <div style={{ position:'absolute', inset:0,
                                background:`repeating-linear-gradient(90deg, ${planCfg.color}30 0px, ${planCfg.color}30 8px, transparent 8px, transparent 16px)`,
                                borderRadius:99 }}/>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Workers gauge */}
                    {(() => {
                      const max = planCfg.limits.max_workers;
                      const isUnlimited = max === -1;
                      const barColor = T.sky;
                      return (
                        <div>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                              <Users size={14} color={barColor}/>
                              <span style={{ fontSize:13, fontWeight:700, color:T.text }}>Équipes max</span>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <span style={{ fontSize:20, fontWeight:900, color:barColor, fontVariantNumeric:'tabular-nums' }}>
                                {isUnlimited ? '∞' : max}
                              </span>
                              {isUnlimited && (
                                <span style={{ fontSize:10, fontWeight:700, color:planCfg.color,
                                  background:`${planCfg.color}12`, border:`1px solid ${planCfg.color}30`,
                                  borderRadius:99, padding:'2px 8px' }}>Illimité</span>
                              )}
                            </div>
                          </div>
                          {!isUnlimited ? (
                            <>
                              <div style={{ display:'flex', gap:5 }}>
                                {Array.from({ length: max }, (_, i) => (
                                  <div key={i} style={{ flex:1, height:10, borderRadius:4,
                                    background:T.raised, overflow:'hidden' }}>
                                    <div style={{ width:'100%', height:'100%',
                                      background: barColor, opacity: .35 }}/>
                                  </div>
                                ))}
                              </div>
                              <div style={{ fontSize:10, color:T.muted, marginTop:4 }}>{max} équipe{max>1?'s':''} autorisée{max>1?'s':''}</div>
                            </>
                          ) : (
                            <div style={{ height:10, background:`${planCfg.color}15`, borderRadius:99,
                              position:'relative' }}>
                              <div style={{ position:'absolute', inset:0,
                                background:`repeating-linear-gradient(90deg, ${planCfg.color}30 0px, ${planCfg.color}30 8px, transparent 8px, transparent 16px)`,
                                borderRadius:99 }}/>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Divider */}
                    <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:16 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:'uppercase',
                        letterSpacing:.6, marginBottom:10 }}>Capacités du plan</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        {[
                          { label:'Animaux', val: planCfg.limits.max_animals === -1 ? '∞' : planCfg.limits.max_animals, color:T.primary, icon:PawPrint },
                          { label:'Équipes', val: planCfg.limits.max_workers === -1 ? '∞' : planCfg.limits.max_workers, color:T.sky, icon:Users },
                        ].map(({ label, val, color, icon:Icon }) => (
                          <div key={label} style={{ background:T.raised, borderRadius:12, padding:'12px 14px',
                            border:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:30, height:30, borderRadius:8, background:`${color}12`,
                              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              <Icon size={13} color={color}/>
                            </div>
                            <div>
                              <div style={{ fontSize:18, fontWeight:900, color, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{val}</div>
                              <div style={{ fontSize:10, color:T.muted }}>{label}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ FOOTER ═════════════════════════════════════════════════════ */}
        <footer style={{ borderTop:`1px solid ${T.border}`, padding:'14px 32px', display:'flex',
          justifyContent:'space-between', alignItems:'center', background:T.surface }}>
          <span style={{ fontSize:12, color:T.muted }}>
            Smart Farm AI · Ferme #{id} · {farm.name}
          </span>
          <button onClick={() => navigate('/farms')}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:8,
              border:`1px solid ${T.border}`, background:T.surface, color:T.dim, fontSize:12, fontWeight:600, cursor:'pointer',
              transition:'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=T.primary; e.currentTarget.style.color=T.primary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.dim; }}>
            <ArrowLeft size={12}/> Toutes les fermes
          </button>
        </footer>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinner{width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:#16a34a;border-radius:50%;animation:spin .7s linear infinite;margin:40px auto}@keyframes stripe-scroll{0%{background-position:0 0}100%{background-position:32px 0}}`}</style>
    </div>
  );
}
