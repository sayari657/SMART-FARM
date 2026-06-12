import { useEffect, useState, useCallback } from 'react';
import { Trash2, RefreshCw, Download, WifiOff } from 'lucide-react';
import { COLORS } from './BeeConstants';
import { beeApi } from '../../services/beeApi';
import { getCachedVisits } from '../../services/offlineVisitCache';

/* ─── inject table styles once ─── */
if (typeof document !== 'undefined' && !document.getElementById('__hiveTbl')) {
  const s = document.createElement('style');
  s.id = '__hiveTbl';
  s.textContent = `
    .hive-tbl { width:100%; border-collapse:collapse; font-size:12px; }
    .hive-tbl th {
      position:sticky; top:0; z-index:2;
      background:#f5f0e8; color:#7a6a50;
      font-size:9px; font-weight:900; letter-spacing:.9px;
      padding:10px 12px; text-align:left;
      border-bottom:2px solid #e5ddd0; border-right:1px solid #e5ddd0;
      white-space:nowrap;
    }
    .hive-tbl td {
      padding:9px 12px;
      border-bottom:1px solid #f0ebe2;
      border-right:1px solid #f0ebe2;
      vertical-align:middle;
      white-space:nowrap;
    }
    .hive-tbl tr:last-child td { border-bottom:none; }
    .hive-tbl tr:hover td { background:#fdf8f0; }
    .hive-tbl td:last-child, .hive-tbl th:last-child { border-right:none; }
  `;
  document.head.appendChild(s);
}

/* ─── helpers ─── */
const HEALTH_COLOR = { health: '#22c55e', warning: '#f59e0b', urgent: '#ef4444', treatment: '#3b82f6' };
const HEALTH_LABEL = { health: 'Bonne', warning: 'Surveiller', urgent: 'Urgent', treatment: 'Traitement' };
const LEVEL_DOT    = { FAIBLE: '🔴', MOYEN: '🟡', FORT: '🟢' };
const TYPE_META    = {
  MERE:    { e: '👑', c: '#f59e0b' },
  POUSSIN: { e: '🐣', c: '#3b82f6' },
  VIDE:    { e: '⬜', c: '#9ca3af' },
  MORTE:   { e: '💀', c: '#ef4444' },
};

function Bool({ val }) {
  if (val === null || val === undefined) return <span style={{ color: '#ccc' }}>—</span>;
  return val
    ? <span style={{ color: '#22c55e', fontWeight: 800, fontSize: 11 }}>Oui</span>
    : <span style={{ color: '#ef4444', fontWeight: 800, fontSize: 11 }}>Non</span>;
}

function Level({ val }) {
  if (!val) return <span style={{ color: '#ccc' }}>—</span>;
  return <span style={{ fontWeight: 700 }}>{LEVEL_DOT[val] || ''} {val}</span>;
}

/* ─── CSV export — architecture Excel ─── */
function toCSV(visits, hiveIdentifier) {
  const cols = [
    'Date','Visiteur','Role',
    'Numero_Ruche','Type_Ruche',
    'Reine (Oui/Non)','Oeufs (Oui/Non)','Couvain (Oui/Non)',
    'Population (Faible/Moyen/Fort)','Miel (Faible/Moyen/Fort)','Pollen (Faible/Moyen/Fort)',
    'Nb_Cadres','Action_Observation','OBSERVATION',
  ];
  const yn = v => v === true ? 'Oui' : v === false ? 'Non' : '';
  const rows = visits.map(v => [
    v.visit_date   || '',
    v.visited_by   || '',
    v.visitor_role || '',
    hiveIdentifier || v.hive_id || '',
    v.type_ruche   || '',
    yn(v.reine), yn(v.oeufs), yn(v.couvain),
    v.population   || '',
    v.honey_level  || '',
    v.pollen_level || '',
    v.nb_cadres    || '',
    (v.notes || '').replace(/"/g, '""'),
    '',
  ].map(c => `"${c}"`).join(','));
  return [cols.map(c => `"${c}"`).join(','), ...rows].join('\r\n');
}

function exportCSV(visits, hiveIdentifier) {
  const blob = new Blob([toCSV(visits, hiveIdentifier)], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `visites_${hiveIdentifier}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════ */
export default function HiveHistoryPanel({ hive, refreshTick }) {
  const [visits,  setVisits]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await beeApi.getVisitsByHive(hive.id, 200);
      if (r.ok) {
        setVisits(await r.json());
        setOffline(false);
      } else { throw new Error('API error'); }
    } catch {
      const cached = getCachedVisits(hive.id);
      setVisits(cached);
      setOffline(true);
    }
    setLoading(false);
  }, [hive.id]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const del = async id => { await beeApi.deleteVisit(id); load(); };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: COLORS.text, fontWeight: 900, fontSize: 15 }}>Historique</span>
          <span style={{
            background: COLORS.accent + '18', color: COLORS.accent,
            fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 7,
          }}>
            {visits.length} visite{visits.length !== 1 ? 's' : ''}
          </span>
          {offline && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: '#f59e0b18', color: '#f59e0b',
              fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 7,
            }}>
              <WifiOff size={10} /> Hors-ligne · 5 dernières
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {visits.length > 0 && (
            <button onClick={() => exportCSV(visits, hive.identifier || hive.id)}
              title="Exporter CSV (Excel)"
              style={{
                height: 32, padding: '0 12px', borderRadius: 9,
                border: `1px solid ${COLORS.success}40`,
                background: COLORS.success + '0a',
                color: COLORS.success, fontWeight: 700, fontSize: 11,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <Download size={12} /> Export CSV
            </button>
          )}
          <button onClick={load} disabled={loading}
            style={{
              height: 32, padding: '0 12px', borderRadius: 9,
              border: `1px solid ${COLORS.border}`,
              background: 'none', color: COLORS.textMuted,
              fontWeight: 600, fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
            <RefreshCw size={12} style={{ animation: loading ? 'visitSpin 1s linear infinite' : 'none' }} />
            Actualiser
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', color: COLORS.textMuted, padding: '36px 0', fontSize: 12 }}>
          Chargement…
        </div>
      ) : visits.length === 0 ? (
        <div style={{
          textAlign: 'center', color: COLORS.textMuted, padding: '48px 0',
          border: `2px dashed ${COLORS.border}`, borderRadius: 14, fontSize: 13,
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
          Aucune visite pour cette ruche
          <div style={{ fontSize: 11, marginTop: 6 }}>Remplissez le formulaire ci-dessus pour enregistrer la première visite</div>
        </div>
      ) : (
        <div style={{
          borderRadius: 16, border: `1px solid ${COLORS.border}`,
          overflow: 'auto', maxHeight: 480,
          boxShadow: '0 2px 12px rgba(0,0,0,.05)',
        }}>
          <table className="hive-tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Visiteur</th>
                <th>Rôle</th>
                <th>Numero_Ruche</th>
                <th>Type_Ruche</th>
                <th>Reine (Oui/Non)</th>
                <th>Oeufs (Oui/Non)</th>
                <th>Couvain (Oui/Non)</th>
                <th>Population (Faible/Moyen/Fort)</th>
                <th>Miel (Faible/Moyen/Fort)</th>
                <th>Pollen (Faible/Moyen/Fort)</th>
                <th>Nb_Cadres</th>
                <th>Action_Observation</th>
                <th>OBSERVATION</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visits.map(v => {
                const tm = TYPE_META[v.type_ruche];
                return (
                  <tr key={v.id}>
                    {/* Date */}
                    <td style={{ color: COLORS.text, fontWeight: 700, minWidth: 95 }}>
                      {v.visit_date || '—'}
                    </td>
                    {/* Visiteur */}
                    <td style={{ minWidth: 110, fontWeight: 700, color: COLORS.text }}>
                      {v.visited_by || <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    {/* Rôle */}
                    <td style={{ minWidth: 90 }}>
                      {v.visitor_role === 'owner'
                        ? <span style={{ color: COLORS.accent, fontWeight: 800, fontSize: 11 }}>🧑‍🌾 Propriét.</span>
                        : v.visitor_role === 'ouvrier'
                        ? <span style={{ color: COLORS.info,   fontWeight: 800, fontSize: 11 }}>👷 Ouvrier</span>
                        : <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    {/* Numero_Ruche */}
                    <td style={{ color: COLORS.accent, fontWeight: 800, minWidth: 90 }}>
                      {hive.identifier || v.hive_id || '—'}
                    </td>
                    {/* Type_Ruche */}
                    <td style={{ minWidth: 85 }}>
                      {tm
                        ? <span style={{ color: tm.c, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {tm.e} {v.type_ruche}
                          </span>
                        : <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    {/* Reine */}
                    <td style={{ textAlign: 'center' }}><Bool val={v.reine} /></td>
                    {/* Oeufs */}
                    <td style={{ textAlign: 'center' }}><Bool val={v.oeufs} /></td>
                    {/* Couvain */}
                    <td style={{ textAlign: 'center' }}><Bool val={v.couvain} /></td>
                    {/* Population */}
                    <td><Level val={v.population} /></td>
                    {/* Miel */}
                    <td><Level val={v.honey_level} /></td>
                    {/* Pollen */}
                    <td><Level val={v.pollen_level} /></td>
                    {/* Nb_Cadres */}
                    <td style={{ color: '#3b82f6', fontWeight: 700, minWidth: 70 }}>
                      {v.nb_cadres || '—'}
                    </td>
                    {/* Action_Observation */}
                    <td style={{ color: COLORS.textMuted, minWidth: 160, maxWidth: 200 }}>
                      {v.notes
                        ? <span title={v.notes}>{v.notes.length > 35 ? v.notes.slice(0, 35) + '…' : v.notes}</span>
                        : <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    {/* OBSERVATION (photo indicator) */}
                    <td style={{ textAlign: 'center', minWidth: 80 }}>
                      {v.photo_url
                        ? <span style={{ fontSize: 16 }} title="Photo attachée">📷</span>
                        : <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    {/* DELETE */}
                    <td style={{ textAlign: 'center', minWidth: 36 }}>
                      <button onClick={() => del(v.id)}
                        style={{
                          width: 26, height: 26, borderRadius: 7,
                          background: 'rgba(239,68,68,0.08)', border: 'none',
                          color: '#ef4444', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
