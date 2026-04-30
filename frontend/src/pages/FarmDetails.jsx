import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserPlus, Phone, Pencil, Trash2, X,
  Users, ShieldCheck, CheckCircle2, Search,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import AnimalCard from '../components/AnimalCard';
import AlertCard from '../components/AlertCard';
import { farmsAPI, animalsAPI, alertsAPI, farmWorkersAPI, farmOwnersAPI } from '../services/api';

// ── Shared helpers ─────────────────────────────────────────────────────────────

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#0891b2'];
function avatarColor(seed) {
  let h = 0;
  for (let i = 0; i < (seed || '').length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}

// ── Generic modal shell ────────────────────────────────────────────────────────

function ModalShell({ onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 440, padding: 28, position: 'relative' }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-3)', padding: 4,
        }}>
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
      borderRadius: 8, padding: '10px 14px', marginBottom: 16,
      fontSize: 13, color: '#f87171',
    }}>{msg}</div>
  );
}

// ── Delete confirmation ────────────────────────────────────────────────────────

function DeleteConfirm({ title, body, onConfirm, onClose, saving }) {
  return (
    <ModalShell onClose={onClose}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', margin: '0 auto 14px',
          background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Trash2 size={20} color="#f87171" />
        </div>
        <h3 style={{ marginBottom: 8 }}>{title}</h3>
        <p style={{ color: 'var(--color-text-3)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{body}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
            Annuler
          </button>
          <button
            onClick={onConfirm} disabled={saving}
            style={{
              flex: 1, padding: '8px 16px', borderRadius: 'var(--radius)',
              background: '#ef4444', color: 'white', border: 'none',
              fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OWNERS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function AddOwnerModal({ onSave, onClose, saving, error }) {
  const [identifier, setIdentifier] = useState('');

  return (
    <ModalShell onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'rgba(59,130,246,0.12)', border: '1.5px solid rgba(59,130,246,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={18} color="#3b82f6" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Ajouter un propriétaire</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>L'utilisateur doit déjà avoir un compte propriétaire</div>
        </div>
      </div>

      <ErrorBox msg={error} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Nom d'utilisateur ou numéro de téléphone</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--color-text-3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="form-input"
              placeholder="ahmed.farm ou +21655123456"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              style={{ paddingLeft: 36 }}
              autoFocus
            />
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>
            L'utilisateur recevra immédiatement accès à la gestion de cette ferme.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Annuler</button>
          <button
            className="btn btn-primary"
            onClick={() => onSave({ identifier })}
            disabled={saving || !identifier.trim()}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {saving ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function OwnerCard({ owner, onRemove, canRemove }) {
  const color = avatarColor(owner.username);
  const ago = owner.added_at
    ? new Date(owner.added_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px' }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: `${color}18`, border: `1.5px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 15, color,
      }}>
        {initials(owner.full_name)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{owner.full_name}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span>@{owner.username}</span>
          {owner.phone_number && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Phone size={11} />{owner.phone_number}
            </span>
          )}
          {ago && <span>· ajouté le {ago}</span>}
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
        fontSize: 11, fontWeight: 700, color: '#3b82f6',
        background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 20, padding: '4px 10px',
      }}>
        <ShieldCheck size={11} />
        Propriétaire
      </div>

      {canRemove && (
        <button
          onClick={onRemove}
          title="Retirer"
          style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#f87171',
          }}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

function OwnersTab({ farmId }) {
  const [owners, setOwners]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [modalError, setModalError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    farmOwnersAPI.list(farmId)
      .then(r => setOwners(r.data))
      .catch(() => setOwners([]))
      .finally(() => setLoading(false));
  }, [farmId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (form) => {
    setSaving(true);
    setModalError('');
    try {
      const res = await farmOwnersAPI.add(farmId, form);
      setOwners(prev => [...prev, res.data]);
      setShowAdd(false);
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await farmOwnersAPI.remove(farmId, deleteTarget.owner_id);
      setOwners(prev => prev.filter(o => o.owner_id !== deleteTarget.owner_id));
      setDeleteTarget(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur lors de la suppression.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
          {owners.length} propriétaire{owners.length !== 1 ? 's' : ''} — accès complet à la gestion de la ferme
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setModalError(''); setShowAdd(true); }}>
          <UserPlus size={14} /> Ajouter un propriétaire
        </button>
      </div>

      {owners.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: 40 }}>🏠</span>
          <h3>Aucun propriétaire</h3>
          <p>Ajoutez des propriétaires pour leur donner accès à la gestion complète de cette ferme.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {owners.map(o => (
            <OwnerCard
              key={o.owner_id}
              owner={o}
              canRemove={owners.length > 1}
              onRemove={() => setDeleteTarget(o)}
            />
          ))}
        </div>
      )}

      {owners.length > 0 && (
        <div style={{
          marginTop: 20, padding: '12px 16px',
          background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.12)',
          borderRadius: 10, fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.6,
        }}>
          Les propriétaires peuvent également se connecter à l'interface mobile via{' '}
          <strong style={{ color: 'var(--color-text-2)' }}>/worker-login</strong> en utilisant leur numéro de téléphone.
        </div>
      )}

      {showAdd && (
        <AddOwnerModal
          onSave={handleAdd}
          onClose={() => !saving && setShowAdd(false)}
          saving={saving}
          error={modalError}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          title="Retirer ce propriétaire ?"
          body={
            <>
              <strong>{deleteTarget.full_name}</strong> (@{deleteTarget.username}) perdra l'accès à la gestion de cette ferme.
            </>
          }
          onConfirm={handleRemove}
          onClose={() => !saving && setDeleteTarget(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKERS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function WorkerFormModal({ mode, initial, onSave, onClose, saving, error }) {
  const [form, setForm] = useState(
    initial
      ? { full_name: initial.full_name || '', phone_number: initial.phone_number || '' }
      : { full_name: '', phone_number: '+216' }
  );
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const valid = form.full_name.trim().length >= 2 && form.phone_number.trim().length >= 8;

  return (
    <ModalShell onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'rgba(34,197,94,0.12)', border: '1.5px solid rgba(34,197,94,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={18} color="#22c55e" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {mode === 'add' ? 'Ajouter un ouvrier' : "Modifier l'ouvrier"}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
            {mode === 'add' ? 'Compte créé automatiquement' : 'Mise à jour des informations'}
          </div>
        </div>
      </div>

      <ErrorBox msg={error} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Nom complet *</label>
          <input className="form-input" placeholder="Ahmed Ben Ali" value={form.full_name} onChange={set('full_name')} autoFocus />
        </div>

        <div className="form-group">
          <label className="form-label">Numéro WhatsApp *</label>
          <div style={{ position: 'relative' }}>
            <Phone size={15} color="var(--color-text-3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="form-input" type="tel" placeholder="+216 55 123 456"
              value={form.phone_number} onChange={set('phone_number')}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>
            Format international · Connexion mobile via OTP WhatsApp
          </div>
        </div>

        {mode === 'add' && (
          <div style={{
            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
            borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.6,
          }}>
            Un compte ouvrier sera créé automatiquement. L'ouvrier peut être assigné à plusieurs fermes.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Annuler</button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(form)}
            disabled={saving || !valid}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {saving ? 'Enregistrement...' : mode === 'add' ? 'Ajouter' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function WorkerCard({ worker, onEdit, onDelete }) {
  const color = avatarColor(worker.phone_number);
  const ago = worker.assigned_at
    ? new Date(worker.assigned_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px' }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: `${color}18`, border: `1.5px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 15, color,
      }}>
        {initials(worker.full_name)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{worker.full_name}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Phone size={11} /><span style={{ fontFamily: 'monospace' }}>{worker.phone_number}</span>
          </span>
          {ago && <span>· assigné le {ago}</span>}
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
        fontSize: 11, fontWeight: 700, color: '#22c55e',
        background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
        borderRadius: 20, padding: '4px 10px',
      }}>
        <CheckCircle2 size={11} />OTP
      </div>

      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} title="Modifier" style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--color-text-2)',
        }}>
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} title="Retirer" style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#f87171',
        }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function WorkersTab({ farmId }) {
  const [workers, setWorkers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [modalError, setModalError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    farmWorkersAPI.list(farmId)
      .then(r => setWorkers(r.data))
      .catch(() => setWorkers([]))
      .finally(() => setLoading(false));
  }, [farmId]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setModalError(''); setModal({ mode: 'add', worker: null }); };
  const openEdit = w  => { setModalError(''); setModal({ mode: 'edit', worker: w }); };

  const handleSave = async (form) => {
    setSaving(true); setModalError('');
    try {
      if (modal.mode === 'add') {
        const res = await farmWorkersAPI.add(farmId, form);
        setWorkers(prev => [...prev, res.data]);
      } else {
        const res = await farmWorkersAPI.update(farmId, modal.worker.worker_id, form);
        setWorkers(prev => prev.map(w => w.worker_id === modal.worker.worker_id ? res.data : w));
      }
      setModal(null);
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Une erreur est survenue.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await farmWorkersAPI.remove(farmId, deleteTarget.worker_id);
      setWorkers(prev => prev.filter(w => w.worker_id !== deleteTarget.worker_id));
      setDeleteTarget(null);
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
          {workers.length} ouvrier{workers.length !== 1 ? 's' : ''} — un ouvrier peut être assigné à plusieurs fermes
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <UserPlus size={14} /> Ajouter un ouvrier
        </button>
      </div>

      {workers.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: 40 }}>👷</span>
          <h3>Aucun ouvrier assigné</h3>
          <p>Ajoutez des ouvriers pour qu'ils accèdent à cette ferme via l'application mobile (OTP WhatsApp).</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openAdd}>
            <UserPlus size={14} /> Ajouter le premier ouvrier
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {workers.map(w => (
            <WorkerCard key={w.worker_id} worker={w} onEdit={() => openEdit(w)} onDelete={() => setDeleteTarget(w)} />
          ))}
        </div>
      )}

      {workers.length > 0 && (
        <div style={{
          marginTop: 20, padding: '12px 16px',
          background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)',
          borderRadius: 10, fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.6,
        }}>
          Les ouvriers se connectent via <strong style={{ color: 'var(--color-text-2)' }}>/worker-login</strong> avec leur numéro WhatsApp — un code OTP leur est envoyé automatiquement.
        </div>
      )}

      {modal && (
        <WorkerFormModal
          mode={modal.mode} initial={modal.worker}
          onSave={handleSave} onClose={() => !saving && setModal(null)}
          saving={saving} error={modalError}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          title="Retirer cet ouvrier ?"
          body={
            <>
              <strong>{deleteTarget.full_name}</strong>
              {' '}({deleteTarget.phone_number}) sera retiré de cette ferme.
              {' '}Son compte sera supprimé s'il n'est assigné à aucune autre ferme.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => !saving && setDeleteTarget(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function FarmDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [farm, setFarm]     = useState(null);
  const [units, setUnits]   = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('units');

  useEffect(() => {
    Promise.all([
      farmsAPI.get(id),
      animalsAPI.list({ farm_id: id }),
      alertsAPI.list(),
    ]).then(([fRes, uRes, aRes]) => {
      setFarm(fRes.data);
      setUnits(uRes.data);
      const unitIds = new Set(uRes.data.map(u => u.id));
      setAlerts(aRes.data.filter(a => unitIds.has(a.unit_id)));
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-content"><div className="spinner" /></div>;
  if (!farm)   return <div className="page-content"><p style={{ color: 'var(--color-critical)' }}>Farm not found</p></div>;

  const TABS = [
    { id: 'units',   label: `Animal Units (${units.length})` },
    { id: 'alerts',  label: `Alerts (${alerts.filter(a => !a.is_resolved).length})` },
    { id: 'owners',  label: 'Propriétaires' },
    { id: 'workers', label: 'Ouvriers' },
    { id: 'info',    label: 'Info' },
  ];

  return (
    <>
      <Navbar
        title={farm.name}
        subtitle={farm.location}
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/farms')}>
            <ArrowLeft size={13} /> Back
          </button>
        }
      />
      <div className="page-content">

        {/* Stats banner */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Animal Units',  value: farm.unit_count,        icon: '🐾' },
            { label: 'Active Alerts', value: farm.active_alerts,     icon: '⚠️', danger: farm.active_alerts > 0 },
            { label: 'Avg Health',    value: farm.avg_health_score ? `${farm.avg_health_score}%` : '—', icon: '❤️' },
            { label: 'Area',          value: farm.total_area_ha ? `${farm.total_area_ha} ha` : '—', icon: '🌿' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 22, color: s.danger ? 'var(--color-critical)' : 'var(--color-text)' }}>
                {s.value ?? '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--color-border)', paddingBottom: 0, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer',
              fontSize: 13, whiteSpace: 'nowrap',
              fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? 'var(--color-primary)' : 'var(--color-text-2)',
              borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: -1,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'units' && (
          units.length > 0
            ? <div className="grid-auto">{units.map(u => <AnimalCard key={u.id} unit={u} />)}</div>
            : <div className="empty-state"><span style={{ fontSize: 40 }}>🐾</span><h3>No animal units</h3><p>Add animal units from the Animals page.</p></div>
        )}

        {tab === 'alerts' && (
          alerts.filter(a => !a.is_resolved).length > 0
            ? alerts.filter(a => !a.is_resolved).map(a => <AlertCard key={a.id} alert={a} />)
            : <div className="empty-state"><span style={{ fontSize: 32 }}>✅</span><h3>No active alerts</h3></div>
        )}

        {tab === 'owners'  && <OwnersTab  farmId={id} />}
        {tab === 'workers' && <WorkersTab farmId={id} />}

        {tab === 'info' && (
          <div className="card" style={{ maxWidth: 520 }}>
            {[
              ['Name',        farm.name],
              ['Location',    farm.location || '—'],
              ['Status',      farm.status],
              ['Total Area',  farm.total_area_ha ? `${farm.total_area_ha} ha` : '—'],
              ['Description', farm.description || '—'],
              ['Created',     new Date(farm.created_at).toLocaleDateString()],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-3)', fontWeight: 600 }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
