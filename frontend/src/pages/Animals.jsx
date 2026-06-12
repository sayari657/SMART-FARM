import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, X, Activity, Users, AlertTriangle,
  ChevronRight, PawPrint, Tag,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import ThreeSpeciesCard from '../components/ThreeSpeciesCard';
import { animalsAPI, farmsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SPECIES = ['all', 'bee', 'cow', 'poultry', 'sheep', 'goat', 'rabbit'];
const SPECIES_EMOJI  = { bee: '🐝', cow: '🐄', poultry: '🐔', sheep: '🐑', goat: '🐐', rabbit: '🐰' };
const SPECIES_COLORS = { bee: '#d97706', cow: '#7c3aed', poultry: '#0891b2', sheep: '#059669', goat: '#dc2626', rabbit: '#16a34a' };
const SPECIES_ROUTES = {
  bee: '/aboutbee', cow: '/aboutcow', poultry: '/aboutpoultry',
  sheep: '/aboutsheep', goat: '/aboutgoat', rabbit: '/aboutrabbit',
};

export default function Animals() {
  const { t, i18n } = useTranslation();
  const { farmId, farms: authFarms } = useAuth();
  const [units, setUnits]         = useState([]);
  const [types, setTypes]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ name: '', farm_id: farmId || '', type_id: '', identifier: '', tag_id: '', notes: '' });
  const [saving, setSaving]       = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (farmId) setForm(prev => ({ ...prev, farm_id: farmId }));
  }, [farmId]);

  const load = () => {
    setLoading(true);
    const params = farmId ? { farm_id: farmId } : {};
    Promise.all([animalsAPI.list(params), animalsAPI.types()])
      .then(([u, tp]) => { setUnits(u.data); setTypes(tp.data); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [farmId]);

const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await animalsAPI.create({
        ...form,
        farm_id: +form.farm_id,
        type_id: +form.type_id,
        tag_id: form.tag_id || null,
      });
      setShowForm(false);
      setForm({ name: '', farm_id: '', type_id: '', identifier: '', tag_id: '', notes: '' });
      load();
    } finally { setSaving(false); }
  };

  const healthyCount  = units.filter(u => u.status === 'healthy').length;
  const criticalCount = units.filter(u => u.status === 'critical').length;
  const isRtl = i18n.language === 'ar';


  return (
    <>
      <Navbar
        title={t('animals.title')}
        subtitle={`${units.length} ${t('animals.population')}`}
      />
      <div className="page-content" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>

        {/* ── Hero ── */}
        <div className="anim-hero">
          <div className="anim-hero-left">
            <div className="anim-hero-eyebrow">
              <PawPrint size={11} /> {t('animals.hero_eyebrow')}
            </div>
            <h1 className="anim-hero-title">{t('animals.hero_title')}</h1>
            <p className="anim-hero-sub">
              {t('animals.hero_sub')} · {authFarms.length} {t('animals.kpi_farms').toLowerCase()}
            </p>
          </div>
          <div className="anim-hero-kpis">
            {[
              { val: units.length,       label: t('animals.kpi_total'),    color: '#92400e', icon: Users },
              { val: healthyCount,       label: t('animals.kpi_healthy'),  color: '#15803d', icon: Activity },
              { val: criticalCount,      label: t('animals.kpi_critical'), color: '#dc2626', icon: AlertTriangle },
              { val: authFarms.length,   label: t('animals.kpi_farms'),    color: '#1d4ed8', icon: ChevronRight },
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
        <div className="anim-section-label">{t('animals.section_label')}</div>
        <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {['cow', 'poultry', 'sheep', 'goat', 'rabbit'].map(sp => (
            <ThreeSpeciesCard
              key={sp}
              sp={sp}
              count={units.filter(u => u.species === sp).length}
              emoji={SPECIES_EMOJI[sp]}
              color={SPECIES_COLORS[sp]}
              isActive={false}
              onClick={() => navigate(SPECIES_ROUTES[sp])}
            />
          ))}
        </div>

        {/* ── Create form panel ── */}
        {showForm && (
          <div className="farms-form-panel">
            <div className="farms-form-header">
              <div className="farms-form-title"><Plus size={16} /> {t('animals.new_animal')}</div>
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
                  <label className="farms-form-label">{t('animals.kpi_farms')} *</label>
                  {authFarms.length > 1 ? (
                    <select className="farms-form-input" value={form.farm_id}
                      onChange={e => setForm(p => ({ ...p, farm_id: e.target.value }))} required>
                      <option value="">{t('animals.choose_farm')}</option>
                      {authFarms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  ) : (
                    <div className="farms-form-input" style={{
                      background: 'var(--color-surface-2)', color: 'var(--color-text-2)',
                      display: 'flex', alignItems: 'center', gap: 6, cursor: 'default',
                    }}>
                      <span style={{ fontSize: 14 }}>🏡</span>
                      <span style={{ fontWeight: 600 }}>
                        {authFarms[0]?.name || `Farm #${farmId}`}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--color-primary)', marginLeft: 'auto' }}>
                        {t('animals.active_farm')}
                      </span>
                    </div>
                  )}
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

              {/* ── Ear Tags — visible only for cow, goat, sheep ── */}
              {['cow', 'goat', 'sheep'].includes(
                types.find(tp => String(tp.id) === String(form.type_id))?.species
              ) && (
                <div style={{
                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                  border: '1.5px solid #fcd34d',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{
                      background: '#fbbf24', borderRadius: 8,
                      padding: '5px 7px', display: 'flex', alignItems: 'center',
                    }}>
                      <Tag size={13} color="#78350f" />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#92400e', letterSpacing: 1, textTransform: 'uppercase' }}>
                      {t('animals.ear_tags')}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#b45309', fontWeight: 600 }}>
                      {t('animals.ear_official')}
                    </span>
                  </div>

                  <div className="farms-form-row" style={{ gap: 12 }}>
                    <div className="farms-form-group">
                      <label className="farms-form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{
                          width: 14, height: 14, background: '#fbbf24',
                          borderRadius: 3, display: 'inline-flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#78350f',
                        }}>G</span>
                        {t('animals.ear_left')}
                      </label>
                      <input
                        className="farms-form-input"
                        placeholder="Ex: BOV-2025-001"
                        value={form.identifier}
                        onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))}
                        style={{ borderColor: '#fcd34d', background: '#fffef7' }}
                      />
                    </div>
                    <div className="farms-form-group">
                      <label className="farms-form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{
                          width: 14, height: 14, background: '#f59e0b',
                          borderRadius: 3, display: 'inline-flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#78350f',
                        }}>D</span>
                        {t('animals.ear_right')}
                      </label>
                      <input
                        className="farms-form-input"
                        placeholder="Ex: TN 56 1234 56789"
                        value={form.tag_id}
                        onChange={e => setForm(p => ({ ...p, tag_id: e.target.value }))}
                        style={{ borderColor: '#fcd34d', background: '#fffef7' }}
                      />
                    </div>
                  </div>

                  <p style={{ margin: '8px 0 0', fontSize: 10, color: '#b45309', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Tag size={9} /> {t('animals.ear_note')}
                  </p>
                </div>
              )}

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


      </div>
    </>
  );
}
