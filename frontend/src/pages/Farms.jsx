import React, { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import FarmCard from '../components/FarmCard';
import { farmsAPI, externalAPI } from '../services/api';

export default function Farms() {
  const { t, i18n } = useTranslation();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', location:'', description:'', status:'active', total_area_ha:'', latitude: '', longitude: '' });
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [farmToDelete, setFarmToDelete] = useState(null);

  const load = () => {
    setLoading(true);
    farmsAPI.list().then(r => setFarms(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = farms.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.location||'').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await farmsAPI.create({ 
        ...form, 
        total_area_ha: form.total_area_ha ? +form.total_area_ha : null,
        latitude: form.latitude ? +form.latitude : null,
        longitude: form.longitude ? +form.longitude : null
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
      } else {
        alert(t('farms.location_not_found'));
      }
    } catch(err) {
      console.error(err);
      alert(t('farms.geocoding_failed'));
    } finally {
      setGeocoding(false);
    }
  };

  const getMyLocation = () => {
    if ("geolocation" in navigator) {
      setGeocoding(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setForm(p => ({
            ...p,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
          setGeocoding(false);
        },
        (error) => {
          alert(t('farms.error_location') + error.message);
          setGeocoding(false);
        }
      );
    } else {
      alert(t('farms.geolocation_unsupported'));
    }
  };

  const reverseGeocode = async () => {
    if (!form.latitude || !form.longitude) return;
    setGeocoding(true);
    try {
      const res = await externalAPI.geocode.reverse(form.latitude, form.longitude);
      if (res.data && res.data.display_name) {
        setForm(p => ({ ...p, location: res.data.display_name }));
      } else {
        alert(t('farms.reverse_geocode_failed'));
      }
    } catch(err) {
      console.error(err);
      alert(t('farms.reverse_geocode_error'));
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <>
      <Navbar
        title={t('farms.title')}
        subtitle={`${farms.length} ${t('farms.units')}`}
        actions={
          <button className="btn btn-primary" id="btn-add-farm" onClick={() => setShowForm(v => !v)}>
            <Plus size={14} /> {t('farms.add_farm')}
          </button>
        }
      />
      <div className="page-content" style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>

        {showForm && (
          <div className="card" style={{ marginBottom:24 }}>
            <div className="card-header" style={{ textAlign: i18n.language === 'ar' ? 'right' : 'left' }}>
              <div className="card-title">{t('farms.add_farm')}</div>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'var(--color-text-3)' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('farms.farm_name')} *</label>
                  <input className="form-input" placeholder={t('farms.name_placeholder')} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {t('farms.location')}
                    <button type="button" onClick={geocodeAddress} disabled={geocoding} style={{ background:'none', border:'none', color:'var(--color-primary)', cursor:'pointer', fontSize: 12 }}>
                      {geocoding ? t('farms.locating') : t('farms.get_gps')}
                    </button>
                  </label>
                  <input className="form-input" placeholder={t('farms.city_country')} value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {t('farms.latitude')}
                    <button type="button" onClick={getMyLocation} disabled={geocoding} style={{ background:'none', border:'none', color:'var(--color-primary)', cursor:'pointer', fontSize: 12 }}>
                      {geocoding ? t('farms.locating') : t('farms.my_location')}
                    </button>
                  </label>
                  <input className="form-input" type="number" step="any" placeholder="35.777" value={form.latitude} onChange={e=>setForm(p=>({...p,latitude:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {t('farms.longitude')}
                    <button type="button" onClick={reverseGeocode} disabled={geocoding} style={{ background:'none', border:'none', color:'var(--color-primary)', cursor:'pointer', fontSize: 12 }}>
                      {geocoding ? t('farms.locating') : t('farms.generate_address')}
                    </button>
                  </label>
                  <input className="form-input" type="number" step="any" placeholder="10.826" value={form.longitude} onChange={e=>setForm(p=>({...p,longitude:e.target.value}))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('farms.total_area')}</label>
                  <input className="form-input" type="number" min="0" step="0.1" placeholder="12.5" value={form.total_area_ha} onChange={e=>setForm(p=>({...p,total_area_ha:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('common.status')}</label>
                  <select className="form-select" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                    <option value="active">{t('farms.active')}</option>
                    <option value="inactive">{t('farms.inactive')}</option>
                    <option value="maintenance">{t('farms.maintenance')}</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('common.description')}</label>
                <input className="form-input" placeholder={t('common.description_placeholder')} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} />
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <div style={{ position:'relative', flex:1, maxWidth:340 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-3)' }} />
            <input className="form-input" placeholder={t('farms.title').slice(0, 15) + "..."} value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:32 }} />
          </div>
          <div style={{ fontSize:13, color:'var(--color-text-3)' }}>{filtered.length} {t('common.actions')}</div>
        </div>

        {loading && <div className="spinner" />}
        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <span style={{ fontSize:48 }}>🌿</span>
            <h3>{t('common.no_data')}</h3>
            <p>{t('farms.subtitle')}</p>
          </div>
        )}
        <div className="grid-auto">
          {filtered.map(f => <FarmCard key={f.id} farm={f} onDelete={setFarmToDelete} />)}
        </div>
      </div>

      {farmToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 400, maxWidth: '90%', background: 'var(--color-bg)', padding: 24 }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-critical)', fontSize: 18, marginBottom: 12 }}>{t('common.are_you_sure')}</h3>
            <p style={{ color: 'var(--color-text)', fontSize: 14 }}>{t('farms.delete_confirm')} <strong>{farmToDelete.name}</strong> ?</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setFarmToDelete(null)}>{t('common.no')}</button>
              <button className="btn btn-danger" style={{ background: 'var(--color-critical)', color: 'white', border: 'none' }} onClick={() => {
                farmsAPI.delete(farmToDelete.id).then(() => {
                  setFarmToDelete(null);
                  load();
                }).catch(e => {
                  alert(t('common.delete_error'));
                  setFarmToDelete(null);
                });
              }}>{t('common.yes_delete')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
