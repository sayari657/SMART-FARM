import React, { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import FarmCard from '../components/FarmCard';
import { farmsAPI, externalAPI } from '../services/api';

export default function Farms() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', location:'', description:'', status:'active', total_area_ha:'', latitude: '', longitude: '' });
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

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
        alert("Location not found via Nominatim.");
      }
    } catch(err) {
      console.error(err);
      alert("Geocoding failed.");
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
          // Optional: we can automatically trigger reverseGeocode here if we want!
        },
        (error) => {
          alert("Error getting location: " + error.message);
          setGeocoding(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
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
        alert("Reverse Geocoding failed to find an address.");
      }
    } catch(err) {
      console.error(err);
      alert("Reverse Geocoding failed.");
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <>
      <Navbar
        title="Farms"
        subtitle={`${farms.length} farm${farms.length !== 1 ? 's' : ''} registered`}
        actions={
          <button className="btn btn-primary" id="btn-add-farm" onClick={() => setShowForm(v => !v)}>
            <Plus size={14} /> Add Farm
          </button>
        }
      />
      <div className="page-content">

        {showForm && (
          <div className="card" style={{ marginBottom:24 }}>
            <div className="card-header">
              <div className="card-title">New Farm</div>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'var(--color-text-3)' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Farm Name *</label>
                  <input className="form-input" placeholder="Oasis Apiary" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Location (Searchable)
                    <button type="button" onClick={geocodeAddress} disabled={geocoding} style={{ background:'none', border:'none', color:'var(--color-primary)', cursor:'pointer', fontSize: 12 }}>
                      {geocoding ? 'Locating...' : 'Get GPS (Nominatim)'}
                    </button>
                  </label>
                  <input className="form-input" placeholder="City, Country" value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Latitude
                    <button type="button" onClick={getMyLocation} disabled={geocoding} style={{ background:'none', border:'none', color:'var(--color-primary)', cursor:'pointer', fontSize: 12 }}>
                      {geocoding ? 'Locating...' : '🎯 My Location'}
                    </button>
                  </label>
                  <input className="form-input" type="number" step="any" placeholder="35.777" value={form.latitude} onChange={e=>setForm(p=>({...p,latitude:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Longitude
                    <button type="button" onClick={reverseGeocode} disabled={geocoding} style={{ background:'none', border:'none', color:'var(--color-primary)', cursor:'pointer', fontSize: 12 }}>
                      {geocoding ? 'Locating...' : 'Generate Address (Reverse)'}
                    </button>
                  </label>
                  <input className="form-input" type="number" step="any" placeholder="10.826" value={form.longitude} onChange={e=>setForm(p=>({...p,longitude:e.target.value}))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Total Area (ha)</label>
                  <input className="form-input" type="number" min="0" step="0.1" placeholder="12.5" value={form.total_area_ha} onChange={e=>setForm(p=>({...p,total_area_ha:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" placeholder="Brief description..." value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} />
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create Farm'}</button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <div style={{ position:'relative', flex:1, maxWidth:340 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-3)' }} />
            <input className="form-input" placeholder="Search farms…" value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:32 }} />
          </div>
          <div style={{ fontSize:13, color:'var(--color-text-3)' }}>{filtered.length} result{filtered.length!==1?'s':''}</div>
        </div>

        {loading && <div className="spinner" />}
        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <span style={{ fontSize:48 }}>🌿</span>
            <h3>No farms found</h3>
            <p>Add your first farm using the button above.</p>
          </div>
        )}
        <div className="grid-auto">
          {filtered.map(f => <FarmCard key={f.id} farm={f} />)}
        </div>
      </div>
    </>
  );
}
