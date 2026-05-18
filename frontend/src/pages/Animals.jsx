import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, X, Activity, Users, AlertTriangle,
  ChevronRight, PawPrint,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import AnimalCard from '../components/AnimalCard';
import ThreeSpeciesCard from '../components/ThreeSpeciesCard';
import { animalsAPI, farmsAPI } from '../services/api';

const SPECIES = ['all', 'bee', 'cow', 'poultry', 'sheep', 'goat', 'rabbit'];
const SPECIES_EMOJI  = { bee: '🐝', cow: '🐄', poultry: '🐔', sheep: '🐑', goat: '🐐', rabbit: '🐰' };
const SPECIES_COLORS = { bee: '#d97706', cow: '#7c3aed', poultry: '#0891b2', sheep: '#059669', goat: '#dc2626', rabbit: '#16a34a' };
const SPECIES_LABELS = { bee: 'Abeilles', cow: 'Bovins', poultry: 'Volailles', sheep: 'Ovins', goat: 'Caprins', rabbit: 'Lapins' };
const SPECIES_ROUTES = {
  bee: '/aboutbee', cow: '/aboutcow', poultry: '/aboutpoultry',
  sheep: '/aboutsheep', goat: '/aboutgoat', rabbit: '/aboutrabbit',
};

export default function Animals() {
  const { t, i18n } = useTranslation();
  const [units, setUnits]         = useState([]);
  const [farms, setFarms]         = useState([]);
  const [types, setTypes]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [speciesFilter, setSp]    = useState('all');
  const [farmFilter, setFf]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ name: '', farm_id: '', type_id: '', identifier: '', notes: '' });
  const [saving, setSaving]       = useState(false);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    Promise.all([animalsAPI.list(), farmsAPI.list(), animalsAPI.types()])
      .then(([u, f, tp]) => { setUnits(u.data); setFarms(f.data); setTypes(tp.data); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = units.filter(u => {
    const matchSearch  = (u.name || '').toLowerCase().includes(search.toLowerCase()) || (u.identifier || '').includes(search);
    const matchSpecies = speciesFilter === 'all' || u.species === speciesFilter;
    const matchFarm    = !farmFilter || String(u.farm_id) === farmFilter;
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

  const healthyCount  = units.filter(u => u.status === 'healthy').length;
  const criticalCount = units.filter(u => u.status === 'critical').length;

  return (
    <>
      <Navbar
        title={t('animals.title')}
        subtitle={`${units.length} ${t('animals.population')}`}
        actions={
          <button className="farms-hero-btn" onClick={() => setShowForm(v => !v)}>
            <Plus size={14} /> {t('common.actions')}
          </button>
        }
      />
      <div className="page-content" style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>

        {/* ── Hero ── */}
        <div className="anim-hero">
          <div className="anim-hero-left">
            <div className="anim-hero-eyebrow"><PawPrint size={11} /> LIVESTOCK INTELLIGENCE · SUIVI DES ESPÈCES</div>
            <h1 className="anim-hero-title">Gestion du Bétail</h1>
            <p className="anim-hero-sub">
              Monitoring temps réel · IA prédictive · {farms.length} ferme{farms.length !== 1 ? 's' : ''} connectée{farms.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="anim-hero-kpis">
            {[
              { val: units.length,  label: 'Total',     color: '#92400e', icon: Users },
              { val: healthyCount,  label: 'Sains',     color: '#15803d', icon: Activity },
              { val: criticalCount, label: 'Critiques', color: '#dc2626', icon: AlertTriangle },
              { val: farms.length,  label: 'Fermes',    color: '#1d4ed8', icon: ChevronRight },
            ].map(({ val, label, color, icon: Icon }) => (
              <div key={label} className="anim-kpi">
                <Icon size={16} color={color} />
                <div className="anim-kpi-val" style={{ color }}>{val}</div>
                <div className="anim-kpi-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Species navigation grid ── */}
        <div className="anim-section-label">ESPÈCES SURVEILLÉES — CLIQUER POUR ACCÉDER AU MODULE</div>
        <div className="summary-grid">
          {['bee', 'cow', 'poultry', 'sheep', 'goat', 'rabbit'].map(sp => (
            <ThreeSpeciesCard
              key={sp}
              sp={sp}
              count={units.filter(u => u.species === sp).length}
              emoji={SPECIES_EMOJI[sp]}
              color={SPECIES_COLORS[sp]}
              isActive={speciesFilter === sp}
              onClick={() => navigate(SPECIES_ROUTES[sp])}
            />
          ))}
        </div>

        {/* ── Create form panel ── */}
        {showForm && (
          <div className="farms-form-panel">
            <div className="farms-form-header">
              <div className="farms-form-title"><Plus size={16} /> Nouvel Animal</div>
              <button className="farms-form-close" onClick={() => setShowForm(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="farms-form-body">
              <div className="farms-form-row">
                <div className="farms-form-group">
                  <label className="farms-form-label">{t('farms.farm_name')} *</label>
                  <input className="farms-form-input" placeholder={t('animals.name_placeholder')}
                    value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="farms-form-group">
                  <label className="farms-form-label">{t('common.id')}</label>
                  <input className="farms-form-input" placeholder={t('animals.id_placeholder')}
                    value={form.identifier} onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))} />
                </div>
              </div>
              <div className="farms-form-row">
                <div className="farms-form-group">
                  <label className="farms-form-label">{t('farms.location')} *</label>
                  <select className="farms-form-input" value={form.farm_id}
                    onChange={e => setForm(p => ({ ...p, farm_id: e.target.value }))} required>
                    <option value="">{t('farms.location')}…</option>
                    {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="farms-form-group">
                  <label className="farms-form-label">{t('animals.species')} *</label>
                  <select className="farms-form-input" value={form.type_id}
                    onChange={e => setForm(p => ({ ...p, type_id: e.target.value }))} required>
                    <option value="">{t('animals.species')}…</option>
                    {types.map(tp => <option key={tp.id} value={tp.id}>{SPECIES_EMOJI[tp.species] || ''} {tp.display_name || tp.species}</option>)}
                  </select>
                </div>
              </div>
              <div className="farms-form-group">
                <label className="farms-form-label">{t('common.notes')}</label>
                <input className="farms-form-input" placeholder={t('animals.notes_placeholder')}
                  value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="farms-form-actions">
                <button className="farms-hero-btn" type="submit" disabled={saving}>{saving ? '…' : t('common.save')}</button>
                <button className="farms-cancel-btn" type="button" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="farms-toolbar">
          <div className="farms-search-wrap">
            <Search size={14} className="farms-search-icon" />
            <input className="farms-search-input" placeholder="Rechercher un animal…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="farms-search-clear" onClick={() => setSearch('')}><X size={12} /></button>}
          </div>
          <select className="anim-farm-select" value={farmFilter} onChange={e => setFf(e.target.value)}>
            <option value="">{t('farms.title')}</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <div className="farms-filter-pills">
            {SPECIES.map(sp => (
              <button key={sp}
                className={`farms-filter-pill ${speciesFilter === sp ? 'active' : ''}`}
                onClick={() => setSp(sp)}
                style={speciesFilter === sp && sp !== 'all' ? { background: SPECIES_COLORS[sp], borderColor: SPECIES_COLORS[sp] } : {}}>
                {sp === 'all' ? 'Toutes' : `${SPECIES_EMOJI[sp]} ${SPECIES_LABELS[sp]}`}
              </button>
            ))}
          </div>
          <div className="farms-count">
            <Activity size={13} />
            {filtered.length} animal{filtered.length !== 1 ? 'x' : ''}
            {speciesFilter !== 'all' && (
              <button onClick={() => setSp('all')} className="anim-clear-filter">✕</button>
            )}
          </div>
        </div>

        {/* ── Grid ── */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="al-empty">
            <span style={{ fontSize: 48 }}>🐾</span>
            <h3>Aucun animal trouvé</h3>
            <p>Modifiez vos filtres ou ajoutez des animaux.</p>
          </div>
        )}
        <div className="anim-grid">
          {filtered.map(u => <AnimalCard key={u.id} unit={u} />)}
        </div>

      </div>
    </>
  );
}
