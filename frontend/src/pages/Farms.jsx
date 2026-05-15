import React, { useEffect, useState } from 'react';
import {
  Plus, Search, MapPin, BarChart2, AlertTriangle, Layers,
  ChevronDown, SlidersHorizontal, X, CheckCircle2, Clock, Wrench,
  Building2, Activity, TrendingUp, Wifi,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import FarmCard from '../components/FarmCard';
import { farmsAPI, externalAPI } from '../services/api';

const STATUS_META = {
  active:      { label: 'Actif',        color: '#16a34a', bg: '#dcfce7', icon: CheckCircle2 },
  inactive:    { label: 'Inactif',      color: '#64748b', bg: '#f1f5f9', icon: Clock },
  maintenance: { label: 'Maintenance',  color: '#d97706', bg: '#fef3c7', icon: Wrench },
};

export default function Farms() {
  const { t, i18n } = useTranslation();
  const [farms, setFarms]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ name:'', location:'', description:'', status:'active', total_area_ha:'', latitude: '', longitude: '' });
  const [saving, setSaving]         = useState(false);
  const [geocoding, setGeocoding]   = useState(false);
  const [farmToDelete, setFarmToDelete] = useState(null);

  const load = () => {
    setLoading(true);
    farmsAPI.list().then(r => setFarms(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = farms.filter(f => {
    const matchSearch = (f.name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (f.location || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  /* ── aggregate KPIs ─────────────────────────────────────────────────── */
  const totalArea    = farms.reduce((s, f) => s + (f.total_area_ha || 0), 0);
  const activeFarms  = farms.filter(f => f.status === 'active').length;
  const totalAlerts  = farms.reduce((s, f) => s + (f.active_alerts || 0), 0);
  const totalUnits   = farms.reduce((s, f) => s + (f.unit_count || 0), 0);

  /* ── form handlers (unchanged logic) ───────────────────────────────── */
  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await farmsAPI.create({
        ...form,
        total_area_ha: form.total_area_ha ? +form.total_area_ha : null,
        latitude:      form.latitude      ? +form.latitude      : null,
        longitude:     form.longitude     ? +form.longitude     : null,
      });
      setShowForm(false);
      setForm({ name:'', location:'', description:'', status:'active', total_area_ha:'', latitude: '', longitude: '' });
      load();
    } finally { setSaving(false); }
  };

  const geocodeAddress = async () => {
    if (!form.location) return;
    setGeocoding(true);
    try {
      const res = await externalAPI.geocode.search(form.location);
      if (res.data && res.data.length > 0) {
        setForm(p => ({ ...p, latitude: res.data[0].lat, longitude: res.data[0].lon }));
      } else { alert(t('farms.location_not_found')); }
    } catch(err) { console.error(err); alert(t('farms.geocoding_failed')); }
    finally { setGeocoding(false); }
  };

  const getMyLocation = () => {
    if (!('geolocation' in navigator)) { alert(t('farms.geolocation_unsupported')); return; }
    setGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setForm(p => ({ ...p, latitude: pos.coords.latitude, longitude: pos.coords.longitude })); setGeocoding(false); },
      err => { alert(t('farms.error_location') + err.message); setGeocoding(false); }
    );
  };

  const reverseGeocode = async () => {
    if (!form.latitude || !form.longitude) return;
    setGeocoding(true);
    try {
      const res = await externalAPI.geocode.reverse(form.latitude, form.longitude);
      if (res.data?.display_name) setForm(p => ({ ...p, location: res.data.display_name }));
      else alert(t('farms.reverse_geocode_failed'));
    } catch(err) { console.error(err); alert(t('farms.reverse_geocode_error')); }
    finally { setGeocoding(false); }
  };

  const rtl = i18n.language === 'ar';

  return (
    <>
      <Navbar
        title={t('farms.title')}
        subtitle={`${farms.length} ${t('farms.units')}`}
        actions={
          <button className="farms-hero-btn" onClick={() => setShowForm(v => !v)}>
            <Plus size={15} />
            {t('farms.add_farm')}
          </button>
        }
      />

      <div className="page-content" style={{ direction: rtl ? 'rtl' : 'ltr' }}>

        {/* ═══════════════════════════════════════════════
            HERO BANNER
        ═══════════════════════════════════════════════ */}
        <div className="farms-hero">
          <div className="farms-hero-left">
            <div className="farms-hero-eyebrow">
              <span className="farms-hero-dot" />
              SMART FARM MANAGEMENT
            </div>
            <h1 className="farms-hero-title">
              {t('farms.title', 'Gestion des Fermes')}
            </h1>
            <p className="farms-hero-sub">
              Supervision centralisée · GPS · IoT · Santé animale
            </p>
            <div className="farms-hero-pills">
              <span className="farms-hero-pill">
                <Building2 size={11} /> {farms.length} fermes enregistrées
              </span>
              <span className="farms-hero-pill green">
                <CheckCircle2 size={11} /> {activeFarms} actives
              </span>
              {totalAlerts > 0 && (
                <span className="farms-hero-pill red">
                  <AlertTriangle size={11} /> {totalAlerts} alertes
                </span>
              )}
            </div>
          </div>

          {/* KPI strip */}
          <div className="farms-hero-kpis">
            {[
              { icon: Building2,   val: farms.length,              label: 'Fermes',        color: '#4ade80' },
              { icon: Activity,    val: totalUnits,                 label: 'Animaux',       color: '#60a5fa' },
              { icon: Layers,      val: totalArea.toFixed(1) + ' ha', label: 'Surface',    color: '#fbbf24' },
              { icon: AlertTriangle,val: totalAlerts,               label: 'Alertes',       color: totalAlerts > 0 ? '#f87171' : '#4ade80' },
            ].map(({ icon: Icon, val, label, color }) => (
              <div className="farms-kpi-tile" key={label}>
                <div className="farms-kpi-icon" style={{ color }}>
                  <Icon size={18} />
                </div>
                <div className="farms-kpi-val" style={{ color }}>{val}</div>
                <div className="farms-kpi-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            TOOLBAR
        ═══════════════════════════════════════════════ */}
        <div className="farms-toolbar">
          {/* Search */}
          <div className="farms-search-wrap">
            <Search size={14} className="farms-search-icon" />
            <input
              className="farms-search-input"
              placeholder="Rechercher une ferme, lieu…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="farms-search-clear" onClick={() => setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status filter pills */}
          <div className="farms-filter-pills">
            {['all', 'active', 'inactive', 'maintenance'].map(s => (
              <button
                key={s}
                className={`farms-filter-pill ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatus(s)}
                data-status={s}
              >
                {s === 'all' ? 'Tous' : STATUS_META[s]?.label}
              </button>
            ))}
          </div>

          {/* Count */}
          <div className="farms-count">
            <TrendingUp size={13} />
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            CREATE FARM FORM — slide panel
        ═══════════════════════════════════════════════ */}
        {showForm && (
          <div className="farms-form-panel">
            <div className="farms-form-header">
              <div>
                <div className="farms-form-title">
                  <Plus size={16} color="#16a34a" />
                  {t('farms.add_farm')}
                </div>
                <div className="farms-form-subtitle">Renseigner les données géographiques et opérationnelles</div>
              </div>
              <button className="farms-form-close" onClick={() => setShowForm(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="farms-form-body">
              {/* Row 1 */}
              <div className="farms-form-row">
                <div className="farms-field">
                  <label className="farms-label">{t('farms.farm_name')} <span className="farms-required">*</span></label>
                  <input
                    className="farms-input"
                    placeholder={t('farms.name_placeholder')}
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="farms-field">
                  <label className="farms-label" style={{ display:'flex', justifyContent:'space-between' }}>
                    {t('farms.location')}
                    <button type="button" className="farms-geo-btn" onClick={geocodeAddress} disabled={geocoding}>
                      {geocoding ? '…' : '⟶ GPS'}
                    </button>
                  </label>
                  <input
                    className="farms-input"
                    placeholder={t('farms.city_country')}
                    value={form.location}
                    onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  />
                </div>
              </div>

              {/* Row 2 — coordinates */}
              <div className="farms-form-row">
                <div className="farms-field">
                  <label className="farms-label" style={{ display:'flex', justifyContent:'space-between' }}>
                    {t('farms.latitude')}
                    <button type="button" className="farms-geo-btn" onClick={getMyLocation} disabled={geocoding}>
                      {geocoding ? '…' : '⊕ Ma position'}
                    </button>
                  </label>
                  <input className="farms-input" type="number" step="any" placeholder="35.777"
                    value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))} />
                </div>
                <div className="farms-field">
                  <label className="farms-label" style={{ display:'flex', justifyContent:'space-between' }}>
                    {t('farms.longitude')}
                    <button type="button" className="farms-geo-btn" onClick={reverseGeocode} disabled={geocoding}>
                      {geocoding ? '…' : '↺ Adresse'}
                    </button>
                  </label>
                  <input className="farms-input" type="number" step="any" placeholder="10.826"
                    value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))} />
                </div>
              </div>

              {/* Row 3 */}
              <div className="farms-form-row">
                <div className="farms-field">
                  <label className="farms-label">{t('farms.total_area')} <span style={{ color:'var(--color-text-3)',fontWeight:400 }}>(ha)</span></label>
                  <input className="farms-input" type="number" min="0" step="0.1" placeholder="12.5"
                    value={form.total_area_ha} onChange={e => setForm(p => ({ ...p, total_area_ha: e.target.value }))} />
                </div>
                <div className="farms-field">
                  <label className="farms-label">{t('common.status')}</label>
                  <select className="farms-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="active">{t('farms.active')}</option>
                    <option value="inactive">{t('farms.inactive')}</option>
                    <option value="maintenance">{t('farms.maintenance')}</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="farms-field">
                <label className="farms-label">{t('common.description')}</label>
                <input className="farms-input" placeholder={t('common.description_placeholder')}
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div className="farms-form-actions">
                <button className="farms-btn-submit" type="submit" disabled={saving}>
                  {saving ? <><span className="farms-spinner" /> Enregistrement…</> : <><Plus size={14} /> {t('common.save')}</>}
                </button>
                <button className="farms-btn-cancel" type="button" onClick={() => setShowForm(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            FARM GRID
        ═══════════════════════════════════════════════ */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="farms-empty">
            <div className="farms-empty-icon">🌿</div>
            <h3 className="farms-empty-title">{t('common.no_data')}</h3>
            <p className="farms-empty-sub">{t('farms.subtitle')}</p>
            <button className="farms-hero-btn" style={{ marginTop: 20 }} onClick={() => setShowForm(true)}>
              <Plus size={15} /> {t('farms.add_farm')}
            </button>
          </div>
        )}

        <div className="farms-grid">
          {filtered.map(f => <FarmCard key={f.id} farm={f} onDelete={setFarmToDelete} />)}
        </div>

      </div>

      {/* ═══════════════════════════════════════════════
          DELETE MODAL
      ═══════════════════════════════════════════════ */}
      {farmToDelete && (
        <div className="farms-modal-overlay" onClick={() => setFarmToDelete(null)}>
          <div className="farms-modal" onClick={e => e.stopPropagation()}>
            <div className="farms-modal-icon">
              <AlertTriangle size={28} color="#ef4444" />
            </div>
            <h3 className="farms-modal-title">{t('common.are_you_sure')}</h3>
            <p className="farms-modal-body">
              {t('farms.delete_confirm')} <strong style={{ color:'var(--color-text)' }}>{farmToDelete.name}</strong> ?
              <br />
              <span style={{ fontSize:12, color:'var(--color-text-3)', marginTop:6, display:'block' }}>
                Cette action est irréversible. Toutes les données associées seront supprimées.
              </span>
            </p>
            <div className="farms-modal-actions">
              <button className="farms-btn-cancel" onClick={() => setFarmToDelete(null)}>
                {t('common.no')}
              </button>
              <button
                className="farms-btn-delete"
                onClick={() => {
                  farmsAPI.delete(farmToDelete.id).then(() => { setFarmToDelete(null); load(); })
                    .catch(() => { alert(t('common.delete_error')); setFarmToDelete(null); });
                }}
              >
                <X size={14} /> {t('common.yes_delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
