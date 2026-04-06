import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter } from 'lucide-react';
import Navbar from '../components/Navbar';
import AnimalCard from '../components/AnimalCard';
import ThreeSpeciesCard from '../components/ThreeSpeciesCard';
import { animalsAPI, farmsAPI } from '../services/api';

const SPECIES = ['all', 'bee', 'cow', 'poultry', 'sheep', 'goat'];
const SPECIES_EMOJI = { bee: '🐝', cow: '🐄', poultry: '🐔', sheep: '🐑', goat: '🐐' };
const SPECIES_COLORS = { bee: '#d97706', cow: '#7c3aed', poultry: '#0891b2', sheep: '#059669', goat: '#dc2626' };

export default function Animals() {
  const [units, setUnits] = useState([]);
  const [farms, setFarms] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [speciesFilter, setSp] = useState('all');
  const [farmFilter, setFf] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', farm_id: '', type_id: '', identifier: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    Promise.all([animalsAPI.list(), farmsAPI.list(), animalsAPI.types()])
      .then(([u, f, t]) => { setUnits(u.data); setFarms(f.data); setTypes(t.data); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = units.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || (u.identifier || '').includes(search);
    const matchSpecies = speciesFilter === 'all' || u.species === speciesFilter;
    const matchFarm = !farmFilter || String(u.farm_id) === farmFilter;
    return matchSearch && matchSpecies && matchFarm;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await animalsAPI.create({ ...form, farm_id: +form.farm_id, type_id: +form.type_id });
      setShowForm(false);
      setForm({ name: '', farm_id: '', type_id: '', identifier: '', notes: '' });
      load();
    } finally { setSaving(false); }
  };

  return (
    <>
      <Navbar
        title="Animals"
        subtitle={`${units.length} animal units across all farms`}
      />
      <div className="page-content">

        {/* 1. Control Bar */}
        <div className="control-row">
          <div className="control-item-search">
            <Search size={18} />
            <input
              className="form-input"
              placeholder="Search units..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="control-item-select">
            <select className="form-select" value={farmFilter} onChange={e => setFf(e.target.value)}>
              <option value="">All Farms</option>
              {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <button className="btn btn-primary control-item-btn" id="btn-add-animal" onClick={() => setShowForm(v => !v)}>
            <Plus size={16} /> Add Unit
          </button>
        </div>

        {/* 2. Advanced 3D Category Summary Grid */}
        <div className="summary-grid">
          {['bee', 'cow', 'poultry', 'sheep', 'goat'].map(sp => (
            <ThreeSpeciesCard
              key={sp}
              sp={sp}
              count={units.filter(u => u.species === sp).length}
              emoji={SPECIES_EMOJI[sp]}
              color={SPECIES_COLORS[sp]}
              isActive={speciesFilter === sp}
              onClick={() => {
                const routeMap = {
                  bee: '/aboutbee',
                  cow: '/aboutcow',
                  poultry: '/aboutpoultry',
                  sheep: '/aboutsheep',
                  goat: '/aboutgoat'
                };
                if (routeMap[sp]) {
                  navigate(routeMap[sp]);
                } else {
                  setSp(speciesFilter === sp ? 'all' : sp);
                }
              }}
            />
          ))}
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: 32, padding: 32 }}>
            <div className="card-header">
              <div className="card-title">Register New Animal Unit</div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-3)' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Unit Name *</label>
                  <input className="form-input" placeholder="e.g. Hive 14A" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Identifier tag</label>
                  <input className="form-input" placeholder="e.g. SN-99A" value={form.identifier} onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Farm Location *</label>
                  <select className="form-select" value={form.farm_id} onChange={e => setForm(p => ({ ...p, farm_id: e.target.value }))} required>
                    <option value="">Select location…</option>
                    {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Animal Category *</label>
                  <select className="form-select" value={form.type_id} onChange={e => setForm(p => ({ ...p, type_id: e.target.value }))} required>
                    <option value="">Select category…</option>
                    {types.map(t => <option key={t.id} value={t.id}>{SPECIES_EMOJI[t.species] || ''} {t.display_name || t.species}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Additional notes</label>
                <input className="form-input" placeholder="Health status, age, etc." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Registering…' : 'Register Unit'}</button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* 3. Results Section */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-3)', fontWeight: 600 }}>
            {filtered.length} animal unit{filtered.length !== 1 ? 's' : ''} found
          </div>
          {speciesFilter !== 'all' && (
            <button onClick={() => setSp('all')} style={{ fontSize: 12, background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer' }}>
              Clear Filter
            </button>
          )}
        </div>

        {loading && <div className="spinner" />}
        {!loading && filtered.length === 0 && (
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center', borderStyle: 'dashed', background: 'none' }}>
            <p style={{ color: 'var(--color-text-3)', fontWeight: 500 }}>No animal units found for this selection.</p>
          </div>
        )}

        <div className="grid-auto">
          {filtered.map(u => <AnimalCard key={u.id} unit={u} />)}
        </div>
      </div>
    </>
  );
}
