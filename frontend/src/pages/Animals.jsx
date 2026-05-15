import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import AnimalCard from '../components/AnimalCard';
import ThreeSpeciesCard from '../components/ThreeSpeciesCard';
import { animalsAPI, farmsAPI } from '../services/api';

const SPECIES = ['all', 'bee', 'cow', 'poultry', 'sheep', 'goat', 'rabbit'];
const SPECIES_EMOJI = { bee: '🐝', cow: '🐄', poultry: '🐔', sheep: '🐑', goat: '🐐', rabbit: '🐰' };
const SPECIES_COLORS = { bee: '#d97706', cow: '#7c3aed', poultry: '#0891b2', sheep: '#059669', goat: '#dc2626', rabbit: '#16a34a' };

export default function Animals() {
  const { t, i18n } = useTranslation();
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
    const matchSearch = (u.name || '').toLowerCase().includes(search.toLowerCase()) || (u.identifier || '').includes(search);
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
        title={t('animals.title')}
        subtitle={`${units.length} ${t('animals.population')}`}
      />
      <div className="page-content" style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>

        {/* 1. Control Bar */}
        <div className="control-row">
          <div className="control-item-search">
            <Search size={18} />
            <input
              className="form-input"
              placeholder={t('animals.species') + "..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="control-item-select">
            <select className="form-select" value={farmFilter} onChange={e => setFf(e.target.value)}>
              <option value="">{t('farms.title')}</option>
              {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <button className="btn btn-primary control-item-btn" id="btn-add-animal" onClick={() => setShowForm(v => !v)}>
            <Plus size={16} /> {t('common.actions')}
          </button>
        </div>

        {/* 2. Advanced 3D Category Summary Grid */}
        <div className="summary-grid">
          {['bee', 'cow', 'poultry', 'sheep', 'goat', 'rabbit'].map(sp => (
            <ThreeSpeciesCard
              key={sp}
              sp={sp}
              count={units.filter(u => u.species === sp).length}
              emoji={SPECIES_EMOJI[sp]}
              color={SPECIES_COLORS[sp]}
              isActive={speciesFilter === sp}
              onClick={() => navigate({
                bee:     '/aboutbee',
                cow:     '/aboutcow',
                poultry: '/aboutpoultry',
                sheep:   '/aboutsheep',
                goat:    '/aboutgoat',
                rabbit:  '/aboutrabbit',
              }[sp])}
            />
          ))}
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: 32, padding: 32 }}>
            <div className="card-header" style={{ textAlign: i18n.language === 'ar' ? 'right' : 'left' }}>
              <div className="card-title">{t('animals.title')}</div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-3)' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('farms.farm_name')} *</label>
                  <input className="form-input" placeholder={t('animals.name_placeholder')} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('common.id')}</label>
                  <input className="form-input" placeholder={t('animals.id_placeholder')} value={form.identifier} onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('farms.location')} *</label>
                  <select className="form-select" value={form.farm_id} onChange={e => setForm(p => ({ ...p, farm_id: e.target.value }))} required>
                    <option value="">{t('farms.location')}…</option>
                    {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('animals.species')} *</label>
                  <select className="form-select" value={form.type_id} onChange={e => setForm(p => ({ ...p, type_id: e.target.value }))} required>
                    <option value="">{t('animals.species')}…</option>
                    {types.map(t => <option key={t.id} value={t.id}>{SPECIES_EMOJI[t.species] || ''} {t.display_name || t.species}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('common.notes')}</label>
                <input className="form-input" placeholder={t('animals.notes_placeholder')} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? '...' : t('common.save')}</button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        )}

        {/* 3. Results Section */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-3)', fontWeight: 600 }}>
            {filtered.length} {t('animals.population')}
          </div>
          {speciesFilter !== 'all' && (
            <button onClick={() => setSp('all')} style={{ fontSize: 12, background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer' }}>
              {t('common.clear')}
            </button>
          )}
        </div>

        {loading && <div className="spinner" />}
        {!loading && filtered.length === 0 && (
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center', borderStyle: 'dashed', background: 'none' }}>
            <p style={{ color: 'var(--color-text-3)', fontWeight: 500 }}>{t('common.no_data')}</p>
          </div>
        )}

        <div className="grid-auto">
          {filtered.map(u => <AnimalCard key={u.id} unit={u} />)}
        </div>
      </div>
    </>
  );
}
