import React, { useEffect, useState } from 'react';
import { Eye, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { cvAPI } from '../services/api';

const SEV_CLASS = { critical:'badge-danger', warning:'badge-warning', info:'badge-info' };
const SEV_LEVELS = ['all','critical','warning','info'];

export default function CVMonitoring() {
  const { t, i18n } = useTranslation();
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [sevFilter, setSev]   = useState('all');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    cvAPI.recent(200).then(r => setEvents(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = events.filter(e => {
    const matchSev    = sevFilter === 'all' || e.severity === sevFilter;
    const matchSearch = e.object_class.includes(search.toLowerCase()) || (e.unit_name||'').toLowerCase().includes(search.toLowerCase());
    return matchSev && matchSearch;
  });

  const counts = { critical: events.filter(e=>e.severity==='critical').length,
                   warning:  events.filter(e=>e.severity==='warning').length,
                   info:     events.filter(e=>e.severity==='info').length };

  return (
    <>
      <Navbar title={t('cv.title')} subtitle={t('cv.subtitle')} />
      <div className="page-content" style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>

        <div className="kpi-grid" style={{ marginBottom:24 }}>
          {[
            { label: t('cv.events'),    value: events.length,         color:'green' },
            { label: t('dashboard.active_alerts'), value: counts.critical,       color:'red'   },
            { label: t('telemetry.activity'),  value: counts.warning,        color:'yellow' },
            { label: 'System',     value: counts.info,           color:'blue'  },
          ].map(k => (
            <div key={k.label} className="kpi-box">
              <div className={`kpi-icon ${k.color}`}><Eye size={20} /></div>
              <div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20, alignItems:'center' }}>
          <input className="form-input" placeholder={t('cv.object') + "..."} value={search}
            onChange={e=>setSearch(e.target.value)} style={{ maxWidth:280 }} />
          <div style={{ display:'flex', gap:6 }}>
            {SEV_LEVELS.map(s => (
              <button key={s} onClick={() => setSev(s)}
                className="btn btn-sm"
                style={{ background: sevFilter===s ? 'var(--color-primary)' : 'var(--color-surface)',
                         color: sevFilter===s ? 'white' : 'var(--color-text-2)',
                         border: '1px solid var(--color-border)' }}>
                {s.toUpperCase()}{s!=='all' ? ` (${counts[s]||0})` : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          {loading ? <div className="spinner" /> : filtered.length === 0 ? (
            <div className="empty-state"><Eye size={40} /><h3>{t('common.no_data')}</h3></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('cv.live')}</th>
                    <th>{t('farms.units')}</th>
                    <th>{t('cv.object')}</th>
                    <th>{t('cv.confidence')}</th>
                    <th>{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(ev => (
                    <tr key={ev.id}>
                      <td style={{ whiteSpace:'nowrap', fontSize:12 }}>{new Date(ev.timestamp).toLocaleString()}</td>
                      <td style={{ fontWeight:600 }}>{ev.unit_name || `Unit ${ev.unit_id}`}</td>
                      <td>
                        <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ width:32, height:32, background:'var(--color-bg)', borderRadius:6, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                            {ev.object_class==='bee'?'🐝':ev.object_class==='predator'?'🐝':ev.object_class==='fire'?'🔥':ev.object_class==='smoke'?'💨':ev.object_class==='dead_bird'?'💀':'📷'}
                          </span>
                          <code style={{ background:'var(--color-bg)', padding:'2px 7px', borderRadius:4, fontSize:11 }}>{ev.object_class}</code>
                        </span>
                      </td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:60, height:6, background:'var(--color-border)', borderRadius:99 }}>
                            <div style={{ width:`${(ev.confidence||0)*100}%`, height:'100%', background:'var(--color-primary)', borderRadius:99 }} />
                          </div>
                          <span style={{ fontSize:12 }}>{((ev.confidence||0)*100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td><span className={`badge ${SEV_CLASS[ev.severity]||'badge-info'}`}>{ev.severity}</span></td>
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
