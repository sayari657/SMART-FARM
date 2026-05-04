import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { settingsAPI, farmsAPI } from '../services/api';

const DEFAULT_SETTINGS = [
  { key:'bee_temp_max',          value:36.0,  description:'Max hive temperature (°C)' },
  { key:'bee_humidity_min',      value:45.0,  description:'Min hive humidity (%)' },
  { key:'bee_weight_drop_alert', value:1.5,   description:'Hive weight drop threshold (kg/24h)' },
  { key:'cow_temp_max',          value:39.5,  description:'Max cow body temperature (°C)' },
  { key:'poultry_ammonia_max',   value:25.0,  description:'Max coop ammonia (ppm)' },
  { key:'poultry_temp_max',      value:28.0,  description:'Max coop temperature (°C)' },
  { key:'alert_check_interval_sec', value:60, description:'Worker anomaly check interval (sec)' },
];

const SECTION_MAP = (t) => ({
  [t('settings.bee_thresholds')]: ['bee_temp_max','bee_humidity_min','bee_weight_drop_alert'],
  [t('settings.cow_thresholds')]: ['cow_temp_max'],
  [t('settings.poultry_thresholds')]: ['poultry_ammonia_max','poultry_temp_max'],
  [t('common.system')]: ['alert_check_interval_sec'],
});
  'Bee Thresholds': ['bee_temp_max','bee_humidity_min','bee_weight_drop_alert'],
  'Cow Thresholds': ['cow_temp_max'],
  'Poultry Thresholds': ['poultry_ammonia_max','poultry_temp_max'],
  'System': ['alert_check_interval_sec'],
};

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState({});
  const [farms, setFarms]       = useState([]);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([settingsAPI.list(), farmsAPI.list()]).then(([s, f]) => {
      const map = {};
      DEFAULT_SETTINGS.forEach(d => { map[d.key] = d.value; });
      s.data.forEach(item => { map[item.key] = item.value; });
      setSettings(map);
      setFarms(f.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(settings).map(([key, value]) =>
          settingsAPI.upsert({ key, value, description: DEFAULT_SETTINGS.find(d=>d.key===key)?.description||'' })
        )
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const set = (key) => (e) => {
    const val = e.target.type === 'number' ? +e.target.value : e.target.value;
    setSettings(p => ({ ...p, [key]: val }));
  };

  if (loading) return <div className="page-content" style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><div className="spinner" /></div>;

  return (
    <>
      <Navbar
        title={t('settings.title')}
        subtitle={t('settings.notifications')}
        actions={
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? '...' : t('common.saved_success') || 'Saved'}
          </button>
        }
      />
      <div className="page-content" style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>
        {saved && <div className="alert-banner success" style={{ marginBottom:20 }}><div className="alert-banner-msg">✓ {t('common.save')}</div></div>}

        {Object.entries(SECTION_MAP(t)).map(([section, keys]) => (
          <div key={section} className="card" style={{ marginBottom:20 }}>
            <div className="card-title" style={{ marginBottom:18, textAlign: i18n.language === 'ar' ? 'right' : 'left' }}>{section}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {keys.map(key => {
                const def = DEFAULT_SETTINGS.find(d => d.key === key);
                return (
                  <div key={key} style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{key.replace(/_/g,' ')}</div>
                      <div style={{ fontSize:12, color:'var(--color-text-3)' }}>{def?.description}</div>
                    </div>
                    <input
                      className="form-input"
                      type="number"
                      step="0.1"
                      value={settings[key] ?? ''}
                      onChange={set(key)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="card">
          <div className="card-title" style={{ marginBottom:12, textAlign: i18n.language === 'ar' ? 'right' : 'left' }}>{t('farms.title')}</div>
          {farms.length === 0 ? (
            <div className="empty-state" style={{ padding:'20px 0' }}><p>{t('common.no_data')}</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>{t('farms.farm_name')}</th>
                    <th>{t('farms.location')}</th>
                    <th>{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {farms.map(f => (
                    <tr key={f.id}>
                      <td style={{ color:'var(--color-text-3)', fontSize:12 }}>#{f.id}</td>
                      <td style={{ fontWeight:600 }}>{f.name}</td>
                      <td style={{ color:'var(--color-text-3)' }}>{f.location||'—'}</td>
                      <td><span className={`badge badge-${f.status==='active'?'success':'neutral'}`}>{f.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
