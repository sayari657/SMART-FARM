import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit2, Trash2, RefreshCw, Key, UserCheck, UserX, LogIn } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const C = { bg: '#0a0e14', card: '#0d1520', border: '#1a2535', muted: '#4b6380', text: '#e2e8f0', purple: '#7c3aed' };

const ROLE_COLORS = { owner: '#22c55e', worker: '#06b6d4', superadmin: C.purple };

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000a', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0d1520', border: `1px solid #1a2535`, borderRadius: 14, padding: '24px 28px', width: 440, maxWidth: '92vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  );
}

const INPUT = { width: '100%', padding: '9px 12px', background: C.bg, border: `1px solid #2a3a50`, borderRadius: 8, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const BTN_P = { padding: '9px 20px', background: C.purple, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const BTN_G = { ...BTN_P, background: '#1a2535' };

export default function SuperAdminUsers() {
  const [data, setData]   = useState({ users: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole]   = useState('');
  const [modal, setModal] = useState(null); // 'create'|'edit'|'reset'|'impersonate'
  const [sel, setSel]     = useState(null);
  const [form, setForm]   = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/superadmin/users', { params: { search: search || undefined, role: role || undefined, limit: 200 } });
      setData(d);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, role]);

  const openCreate = () => { setForm({}); setModal('create'); };
  const openEdit   = u => { setSel(u); setForm({ email: u.email, full_name: u.full_name, phone_number: u.phone_number, plan: u.plan, role: u.role, is_active: u.is_active }); setModal('edit'); };
  const openReset  = u => { setSel(u); setForm({}); setModal('reset'); };

  const createUser = async () => {
    if (!form.username || !form.password) return toast.error('Username et mot de passe requis');
    try {
      await api.post('/superadmin/users', form);
      toast.success('Utilisateur créé'); setModal(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const updateUser = async () => {
    try {
      await api.put(`/superadmin/users/${sel.id}`, form);
      toast.success('Mis à jour'); setModal(null); load();
    } catch { toast.error('Erreur'); }
  };

  const resetPassword = async () => {
    if (!form.password) return toast.error('Nouveau mot de passe requis');
    try {
      await api.patch(`/superadmin/users/${sel.id}/reset-password`, { new_password: form.password });
      toast.success('Mot de passe réinitialisé'); setModal(null);
    } catch { toast.error('Erreur'); }
  };

  const toggleStatus = async (u) => {
    try {
      await api.patch(`/superadmin/users/${u.id}/status`, { is_active: !u.is_active });
      toast.success(u.is_active ? 'Désactivé' : 'Activé'); load();
    } catch { toast.error('Erreur'); }
  };

  const deleteUser = async (u) => {
    if (!confirm(`Supprimer @${u.username} ?`)) return;
    try {
      await api.delete(`/superadmin/users/${u.id}`);
      toast.success('Supprimé'); load();
    } catch { toast.error('Erreur'); }
  };

  const impersonate = async (u) => {
    try {
      const { data: d } = await api.post(`/superadmin/tenants/${u.id}/impersonate`);
      localStorage.setItem('token', d.access_token);
      localStorage.setItem('user', JSON.stringify({ username: d.target_user, role: d.target_role }));
      toast.success(`Mode impersonation : @${d.target_user}`);
      window.open('/dashboard', '_blank');
    } catch { toast.error('Erreur impersonation'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Gestion Utilisateurs</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{data.total} utilisateurs au total</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ ...BTN_G, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <RefreshCw size={13} />
          </button>
          <button onClick={openCreate} style={{ ...BTN_P, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Créer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            style={{ ...INPUT, paddingLeft: 32 }} />
        </div>
        {['', 'owner', 'worker', 'superadmin'].map(r => (
          <button key={r} onClick={() => setRole(r)}
            style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${role === r ? ROLE_COLORS[r] || C.purple : C.border}`, background: role === r ? `${ROLE_COLORS[r] || C.purple}18` : 'transparent', color: role === r ? C.text : C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {r || 'Tous'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Utilisateur', 'Contact', 'Rôle', 'Plan', 'Statut', 'Créé le', 'Actions'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: C.muted }}>Chargement…</td></tr>
            ) : data.users.map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}11` }}
                onMouseEnter={e => e.currentTarget.style.background = '#ffffff06'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{u.full_name || u.username}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>@{u.username}</div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{u.email || '—'}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{u.phone_number || '—'}</div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ROLE_COLORS[u.role] || C.muted, background: `${ROLE_COLORS[u.role] || C.muted}18`, padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase' }}>{u.role}</span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ fontSize: 11, color: C.muted }}>{u.plan || '—'}</span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: u.is_active ? '#22c55e' : '#ef4444' }}>
                    {u.is_active ? '● Actif' : '○ Inactif'}
                  </span>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 11, color: C.muted }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {u.role === 'owner' && (
                      <button onClick={() => impersonate(u)} title="Impersonner" style={{ padding: 6, background: '#06b6d420', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#06b6d4', display: 'flex' }}>
                        <LogIn size={13} />
                      </button>
                    )}
                    <button onClick={() => openEdit(u)} title="Modifier" style={{ padding: 6, background: `${C.purple}20`, border: 'none', borderRadius: 6, cursor: 'pointer', color: C.purple, display: 'flex' }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => openReset(u)} title="Réinitialiser MDP" style={{ padding: 6, background: '#f59e0b20', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#f59e0b', display: 'flex' }}>
                      <Key size={13} />
                    </button>
                    <button onClick={() => toggleStatus(u)} title={u.is_active ? 'Désactiver' : 'Activer'} style={{ padding: 6, background: u.is_active ? '#ef444420' : '#22c55e20', border: 'none', borderRadius: 6, cursor: 'pointer', color: u.is_active ? '#ef4444' : '#22c55e', display: 'flex' }}>
                      {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                    </button>
                    {u.role !== 'superadmin' && (
                      <button onClick={() => deleteUser(u)} title="Supprimer" style={{ padding: 6, background: '#ef444420', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#ef4444', display: 'flex' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {modal === 'create' && (
        <Modal title="Créer un utilisateur" onClose={() => setModal(null)}>
          <Field label="Username *"><input style={INPUT} value={form.username || ''} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></Field>
          <Field label="Mot de passe *"><input style={INPUT} type="password" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></Field>
          <Field label="Nom complet"><input style={INPUT} value={form.full_name || ''} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label="Email"><input style={INPUT} value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Rôle">
              <select style={{ ...INPUT }} value={form.role || 'owner'} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="owner">Owner</option>
                <option value="worker">Worker</option>
              </select>
            </Field>
            <Field label="Plan">
              <select style={{ ...INPUT }} value={form.plan || 'free'} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={() => setModal(null)} style={BTN_G}>Annuler</button>
            <button onClick={createUser} style={BTN_P}>Créer</button>
          </div>
        </Modal>
      )}

      {modal === 'edit' && sel && (
        <Modal title={`Modifier @${sel.username}`} onClose={() => setModal(null)}>
          <Field label="Nom complet"><input style={INPUT} value={form.full_name || ''} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label="Email"><input style={INPUT} value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Téléphone"><input style={INPUT} value={form.phone_number || ''} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Plan">
              <select style={{ ...INPUT }} value={form.plan || 'free'} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                <option value="free">Free</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
              </select>
            </Field>
            <Field label="Rôle">
              <select style={{ ...INPUT }} value={form.role || 'owner'} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="owner">Owner</option><option value="worker">Worker</option>
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={() => setModal(null)} style={BTN_G}>Annuler</button>
            <button onClick={updateUser} style={BTN_P}>Sauvegarder</button>
          </div>
        </Modal>
      )}

      {modal === 'reset' && sel && (
        <Modal title={`Reset MDP — @${sel.username}`} onClose={() => setModal(null)}>
          <Field label="Nouveau mot de passe">
            <input style={INPUT} type="password" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </Field>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={() => setModal(null)} style={BTN_G}>Annuler</button>
            <button onClick={resetPassword} style={{ ...BTN_P, background: '#f59e0b' }}>Réinitialiser</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
