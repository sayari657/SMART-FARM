/**
 * OrchardPlanigramme — spatial row × column plan of the farm's trees.
 * Each cell is a tree, colour-coded by health status. Tap a tree to set its
 * status, log a detected disease or a treatment, and see its full timeline.
 * Backend-persisted + farm-scoped (orchardAPI) → owner and workers share one
 * live plan.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Trees, Plus, Minus, RefreshCw, X, Trash2, Stethoscope, SprayCan, Eye, Loader2,
  Search, LayoutGrid, List,
} from 'lucide-react';
import { orchardAPI } from '../services/api';
import {
  TREAT_CATEGORIES, TREE_DISEASES, TREE_TREATMENTS, treatmentMeta, matchDiseaseKey,
} from '../data/orchardCatalog';

const G = {
  green: '#16a34a', amber: '#d97706', red: '#ef4444', blue: '#2563eb',
  ink: '#0f172a', body: '#475569', muted: '#94a3b8', faint: '#cbd5e1',
  border: '#e2e8f0', bg: '#f8fafc', surface: '#ffffff',
};

const STATUS = {
  healthy:  { color: G.green, bg: '#dcfce7', border: '#bbf7d0' },
  watch:    { color: G.amber, bg: '#fffbeb', border: '#fde68a' },
  diseased: { color: G.red,   bg: '#fef2f2', border: '#fecaca' },
  treated:  { color: G.blue,  bg: '#eff6ff', border: '#bfdbfe' },
};
const STATUS_ORDER = ['healthy', 'watch', 'diseased', 'treated'];

const SPECIES = [
  { id: 'olive',  emoji: '🫒' },
  { id: 'orange', emoji: '🍊' },
  { id: 'lemon',  emoji: '🍋' },
  { id: 'other',  emoji: '🌳' },
];
const emojiOf = (s) => (SPECIES.find(x => x.id === s)?.emoji) || '🌳';

const CELL = 58;
const MIN_ROWS = 3;
const MIN_COLS = 5;

export default function OrchardPlanigramme() {
  const { t } = useTranslation();

  const [trees, setTrees]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [extraRows, setExtraRows] = useState(0);
  const [extraCols, setExtraCols] = useState(0);
  const [adding, setAdding]   = useState(null);   // { row, col }
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [search, setSearch]   = useState('');
  const [view, setView]       = useState('grid'); // 'grid' | 'list'
  const [cellSize, setCellSize] = useState(CELL);
  const [detailId, setDetailId] = useState(null); // open tree id
  const [detail, setDetail]   = useState(null);   // full tree + events
  const [busy, setBusy]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const { data } = await orchardAPI.trees();
      setTrees(Array.isArray(data) ? data : []);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // open / refresh detail
  useEffect(() => {
    if (detailId == null) { setDetail(null); return; }
    let alive = true;
    orchardAPI.tree(detailId)
      .then(({ data }) => { if (alive) setDetail(data); })
      .catch(() => { if (alive) setDetailId(null); });
    return () => { alive = false; };
  }, [detailId]);

  const map = useMemo(() => {
    const m = {};
    trees.forEach(tr => { m[`${tr.row}_${tr.col}`] = tr; });
    return m;
  }, [trees]);

  const counts = useMemo(() => {
    const c = { healthy: 0, watch: 0, diseased: 0, treated: 0 };
    trees.forEach(tr => { c[tr.status] = (c[tr.status] || 0) + 1; });
    return c;
  }, [trees]);

  const speciesLabel = (s) => t(`trees.plan.species_${s || 'other'}`);
  const q = search.trim().toLowerCase();
  const matchTree = (tr) => {
    if (speciesFilter !== 'all' && tr.species !== speciesFilter) return false;
    if (!q) return true;
    return (tr.label || '').toLowerCase().includes(q)
      || speciesLabel(tr.species).toLowerCase().includes(q)
      || (tr.disease || '').toLowerCase().includes(q);
  };
  const STATUS_RANK = { diseased: 0, watch: 1, treated: 2, healthy: 3 };
  const listTrees = useMemo(
    () => trees.filter(matchTree).sort((a, b) =>
      (STATUS_RANK[a.status] - STATUS_RANK[b.status]) || (a.row - b.row) || (a.col - b.col)),
    [trees, speciesFilter, search], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const maxRow = trees.reduce((m, tr) => Math.max(m, tr.row), -1);
  const maxCol = trees.reduce((m, tr) => Math.max(m, tr.col), -1);
  const rows = Math.max(MIN_ROWS, maxRow + 2) + extraRows;
  const cols = Math.max(MIN_COLS, maxCol + 2) + extraCols;

  const upsertTree = (tr) => setTrees(prev => {
    const i = prev.findIndex(x => x.id === tr.id);
    if (i === -1) return [...prev, tr];
    const copy = [...prev]; copy[i] = { ...copy[i], ...tr }; return copy;
  });

  const createTree = async (species, label) => {
    if (!adding || busy) return;
    setBusy(true);
    try {
      const { data } = await orchardAPI.create({ row: adding.row, col: adding.col, species, label });
      upsertTree(data);
      setAdding(null);
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  const patchTree = async (id, patch) => {
    setBusy(true);
    try {
      const { data } = await orchardAPI.update(id, patch);
      upsertTree(data); setDetail(data);
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  const removeTree = async (id) => {
    setBusy(true);
    try {
      await orchardAPI.remove(id);
      setTrees(prev => prev.filter(x => x.id !== id));
      setDetailId(null);
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  const addEvent = async (id, payload) => {
    setBusy(true);
    try {
      const { data } = await orchardAPI.addEvent(id, payload);
      upsertTree(data); setDetail(data);
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  return (
    <section style={{
      background: G.surface, border: `1.5px solid ${G.border}`, borderRadius: 16,
      padding: 'clamp(14px,2.5vw,22px)', marginBottom: 32, boxShadow: '0 1px 4px rgba(0,0,0,.05)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trees size={22} color={G.green} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: G.ink, letterSpacing: '-0.3px' }}>{t('trees.plan.title')}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: G.muted }}>{t('trees.plan.subtitle')}</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} style={iconBtn}>
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Health overview — stacked bar + counts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: G.ink, lineHeight: 1, letterSpacing: '-1px' }}>{trees.length}</div>
          <div style={{ fontSize: 11, color: G.muted, fontWeight: 600 }}>{t('trees.plan.total_trees')}</div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', background: G.bg, border: `1px solid ${G.border}` }}>
            {trees.length > 0 && STATUS_ORDER.map(s => (counts[s] > 0
              ? <div key={s} title={`${t(`trees.plan.st_${s}`)}: ${counts[s]}`} style={{ flex: counts[s], background: STATUS[s].color }} />
              : null))}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
            {STATUS_ORDER.map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: STATUS[s].color }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: STATUS[s].color }} />
                {t(`trees.plan.st_${s}`)} · {counts[s] || 0}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Species filter — keeps trees in place, just highlights the type */}
      {trees.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: G.muted }}>{t('trees.plan.filter_type')} :</span>
          <button onClick={() => setSpeciesFilter('all')} style={filterChip(speciesFilter === 'all')}>
            {t('trees.plan.filter_all')} · {trees.length}
          </button>
          {SPECIES.map(s => {
            const n = trees.filter(x => x.species === s.id).length;
            if (n === 0) return null;
            return (
              <button key={s.id} onClick={() => setSpeciesFilter(s.id)} style={filterChip(speciesFilter === s.id)}>
                {s.emoji} {t(`trees.plan.species_${s.id}`)} · {n}
              </button>
            );
          })}
        </div>
      )}

      {/* Controls — search · view · zoom */}
      {trees.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={15} color={G.muted} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('trees.plan.search_ph')}
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', borderRadius: 10, border: `1px solid ${G.border}`, background: G.surface, fontSize: 13, color: G.ink, outline: 'none' }}
              onFocus={e => e.target.style.borderColor = G.green}
              onBlur={e => e.target.style.borderColor = G.border}
            />
          </div>
          <div style={{ display: 'flex', background: G.bg, border: `1px solid ${G.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
            {[{ k: 'grid', icon: LayoutGrid, label: t('trees.plan.view_grid') }, { k: 'list', icon: List, label: t('trees.plan.view_list') }].map(v => {
              const active = view === v.k;
              const Ic = v.icon;
              return (
                <button key={v.k} onClick={() => setView(v.k)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, border: 'none',
                  background: active ? G.surface : 'transparent', color: active ? G.green : G.body,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: active ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                }}>
                  <Ic size={14} /> {v.label}
                </button>
              );
            })}
          </div>
          {view === 'grid' && (
            <div style={{ display: 'flex', background: G.bg, border: `1px solid ${G.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
              <button onClick={() => setCellSize(s => Math.max(42, s - 8))} aria-label="zoom out" style={zoomBtn}><Minus size={15} /></button>
              <button onClick={() => setCellSize(s => Math.min(86, s + 8))} aria-label="zoom in" style={zoomBtn}><Plus size={15} /></button>
            </div>
          )}
        </div>
      )}

      {/* Body */}
      {error ? (
        <Center>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📡</div>
          <div style={{ fontWeight: 700, color: G.ink, marginBottom: 12 }}>{t('trees.plan.error')}</div>
          <button onClick={load} style={primaryBtn}><RefreshCw size={15} /> {t('trees.plan.retry')}</button>
        </Center>
      ) : loading ? (
        <Center><Loader2 size={28} color={G.green} style={{ animation: 'spin 1s linear infinite' }} /></Center>
      ) : view === 'list' ? (
        listTrees.length === 0 ? (
          <Center>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            <div style={{ fontWeight: 700, color: G.ink }}>{trees.length === 0 ? t('trees.plan.empty') : t('trees.plan.no_match', 'Aucun arbre')}</div>
          </Center>
        ) : (
          <div style={{ border: `1px solid ${G.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: G.bg, borderBottom: `1px solid ${G.border}`, fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: G.muted }}>
              <div style={{ flex: 2, minWidth: 0 }}>{t('trees.plan.col_tree')}</div>
              <div style={{ width: 92, flexShrink: 0 }}>{t('trees.plan.col_status')}</div>
              <div style={{ flex: 1.4, minWidth: 0 }}>{t('trees.plan.col_last')}</div>
              <div style={{ width: 50, flexShrink: 0, textAlign: 'center' }}>{t('trees.plan.col_position')}</div>
            </div>
            {listTrees.map(tr => {
              const st = STATUS[tr.status] || STATUS.healthy;
              return (
                <div key={tr.id} onClick={() => setDetailId(tr.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', cursor: 'pointer', borderBottom: `1px solid ${G.bg}`, transition: 'background .12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = G.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 2, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{emojiOf(tr.species)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: G.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.label || speciesLabel(tr.species)}</div>
                      <div style={{ fontSize: 11, color: G.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{speciesLabel(tr.species)}{tr.disease ? ` · ${tr.disease}` : ''}</div>
                    </div>
                  </div>
                  <div style={{ width: 92, flexShrink: 0 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{t(`trees.plan.st_${tr.status}`)}</span>
                  </div>
                  <div style={{ flex: 1.4, minWidth: 0, fontSize: 12, color: G.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tr.last_event_at ? new Date(tr.last_event_at).toLocaleDateString() : (tr.last_treatment_at ? new Date(tr.last_treatment_at).toLocaleDateString() : '—')}
                  </div>
                  <div style={{ width: 50, flexShrink: 0, textAlign: 'center', fontSize: 11, fontWeight: 700, color: G.muted }}>
                    {String.fromCharCode(65 + (tr.row % 26))}{tr.col + 1}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setExtraRows(r => r + 1)} style={ghostBtn}><Plus size={14} /> {t('trees.plan.add_row')}</button>
            <button onClick={() => setExtraCols(c => c + 1)} style={ghostBtn}><Plus size={14} /> {t('trees.plan.add_col')}</button>
            {trees.length === 0 && (
              <span style={{ alignSelf: 'center', fontSize: 12, color: G.muted }}>{t('trees.plan.empty')}</span>
            )}
          </div>

          {/* Grid */}
          <div style={{ overflowX: 'auto', paddingBottom: 6 }}>
            <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 8, minWidth: 'min-content' }}>
              {/* column headers */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 28, flexShrink: 0 }} />
                {Array.from({ length: cols }).map((_, c) => (
                  <div key={c} style={{ width: cellSize, textAlign: 'center', fontSize: 10, fontWeight: 700, color: G.faint }}>
                    {c + 1}
                  </div>
                ))}
              </div>

              {Array.from({ length: rows }).map((_, r) => (
                <div key={r} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 28, flexShrink: 0, textAlign: 'center', fontSize: 10, fontWeight: 700, color: G.faint }}>
                    {String.fromCharCode(65 + (r % 26))}
                  </div>
                  {Array.from({ length: cols }).map((_, c) => {
                    const tr = map[`${r}_${c}`];
                    if (tr) {
                      const st = STATUS[tr.status] || STATUS.healthy;
                      const dimmed = !matchTree(tr);
                      return (
                        <button
                          key={c}
                          onClick={() => !dimmed && setDetailId(tr.id)}
                          title={tr.label || ''}
                          style={{
                            width: cellSize, height: cellSize, flexShrink: 0, borderRadius: 14, cursor: dimmed ? 'default' : 'pointer',
                            background: st.bg, border: `2px solid ${st.color}`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: 1, position: 'relative', transition: 'transform .12s, opacity .15s',
                            opacity: dimmed ? 0.22 : 1, filter: dimmed ? 'grayscale(1)' : 'none',
                          }}
                          onMouseEnter={e => { if (!dimmed) e.currentTarget.style.transform = 'scale(1.06)'; }}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <span style={{ fontSize: Math.round(cellSize * 0.34), lineHeight: 1 }}>{emojiOf(tr.species)}</span>
                          {tr.label && (
                            <span style={{ fontSize: 8, fontWeight: 700, color: st.color, maxWidth: cellSize - 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tr.label}
                            </span>
                          )}
                          <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: st.color }} />
                        </button>
                      );
                    }
                    return (
                      <button
                        key={c}
                        onClick={() => setAdding({ row: r, col: c })}
                        aria-label={t('trees.plan.add_tree')}
                        style={{
                          width: cellSize, height: cellSize, flexShrink: 0, borderRadius: 14, cursor: 'pointer',
                          background: G.bg, border: `2px dashed ${G.border}`, color: G.faint,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = G.green; e.currentTarget.style.color = G.green; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = G.border; e.currentTarget.style.color = G.faint; }}
                      >
                        <Plus size={18} />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Add-tree modal */}
      {adding && (
        <AddTreeModal
          t={t}
          busy={busy}
          pos={adding}
          onClose={() => setAdding(null)}
          onCreate={createTree}
        />
      )}

      {/* Detail modal */}
      {detailId != null && (
        <TreeDetailModal
          t={t}
          tree={detail}
          busy={busy}
          onClose={() => setDetailId(null)}
          onStatus={(s) => patchTree(detailId, { status: s })}
          onAddEvent={(p) => addEvent(detailId, p)}
          onDelEvent={async (eid) => { setBusy(true); try { await orchardAPI.delEvent(eid); const { data } = await orchardAPI.tree(detailId); setDetail(data); upsertTree(data); } catch {} finally { setBusy(false); } }}
          onDelete={() => removeTree(detailId)}
        />
      )}
    </section>
  );
}

/* ── Add tree modal ─────────────────────────────────────────────── */
function AddTreeModal({ t, pos, busy, onClose, onCreate }) {
  const [species, setSpecies] = useState('olive');
  const [label, setLabel] = useState('');
  return (
    <Overlay onClose={onClose}>
      <ModalHead title={t('trees.plan.add_tree')} sub={`${t('trees.plan.row')} ${String.fromCharCode(65 + pos.row)} · ${pos.col + 1}`} onClose={onClose} />
      <div style={{ padding: 18 }}>
        <Label>{t('trees.plan.species')}</Label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {SPECIES.map(s => (
            <button key={s.id} onClick={() => setSpecies(s.id)} style={{
              padding: '8px 14px', borderRadius: 99, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${species === s.id ? G.green : G.border}`,
              background: species === s.id ? '#dcfce7' : G.surface, color: species === s.id ? G.green : G.body,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 16 }}>{s.emoji}</span> {t(`trees.plan.species_${s.id}`)}
            </button>
          ))}
        </div>
        <Label>{t('trees.plan.label_opt')}</Label>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder={t('trees.plan.label_ph')} style={inputStyle} />
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ ...ghostBtn, flex: 1, justifyContent: 'center', padding: '11px' }}>{t('trees.plan.cancel')}</button>
          <button onClick={() => onCreate(species, label.trim())} disabled={busy} style={{ ...primaryBtn, flex: 1, justifyContent: 'center' }}>
            {busy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : t('trees.plan.plant')}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ── Tree detail modal ──────────────────────────────────────────── */
function TreeDetailModal({ t, tree, busy, onClose, onStatus, onAddEvent, onDelEvent, onDelete }) {
  const [form, setForm] = useState(null);   // { type, label, note }
  const [confirmDel, setConfirmDel] = useState(false);

  const submit = async () => {
    if (!form) return;
    await onAddEvent({ type: form.type, label: (form.label || '').trim(), note: (form.note || '').trim() });
    setForm(null);
  };

  const EV_ICON = { disease: Stethoscope, treatment: SprayCan, observation: Eye, note: Eye };
  const EV_COLOR = { disease: G.red, treatment: G.blue, observation: G.amber, note: G.muted };

  return (
    <Overlay onClose={onClose}>
      {!tree ? (
        <Center><Loader2 size={26} color={G.green} style={{ animation: 'spin 1s linear infinite' }} /></Center>
      ) : (
        <>
          <ModalHead
            title={`${emojiOf(tree.species)} ${tree.label || t(`trees.plan.species_${tree.species || 'other'}`)}`}
            sub={`${t('trees.plan.row')} ${String.fromCharCode(65 + tree.row)} · ${tree.col + 1}`}
            onClose={onClose}
          />
          <div style={{ padding: 18, maxHeight: '64vh', overflowY: 'auto' }}>
            {/* Status segmented */}
            <Label>{t('trees.plan.status')}</Label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
              {STATUS_ORDER.map(s => {
                const active = tree.status === s;
                return (
                  <button key={s} onClick={() => onStatus(s)} disabled={busy} style={{
                    flex: '1 1 auto', minWidth: 70, padding: '9px 8px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${active ? STATUS[s].color : G.border}`,
                    background: active ? STATUS[s].bg : G.surface,
                    color: active ? STATUS[s].color : G.body, fontSize: 12, fontWeight: 700,
                  }}>
                    {t(`trees.plan.st_${s}`)}
                  </button>
                );
              })}
            </div>

            {/* Quick actions */}
            <Label>{t('trees.plan.actions')}</Label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <ActBtn color={G.red}  icon={Stethoscope} onClick={() => setForm({ type: 'disease',     label: '', note: '' })}>{t('trees.plan.act_disease')}</ActBtn>
              <ActBtn color={G.blue} icon={SprayCan}    onClick={() => setForm({ type: 'treatment',   label: '', note: '' })}>{t('trees.plan.act_treatment')}</ActBtn>
              <ActBtn color={G.amber} icon={Eye}        onClick={() => setForm({ type: 'observation', label: '', note: '' })}>{t('trees.plan.act_observation')}</ActBtn>
            </div>

            {/* Inline event form */}
            {form && (
              <div style={{ background: G.bg, border: `1px solid ${G.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                {(form.type === 'disease' || form.type === 'treatment') ? (
                  <CatalogPicker
                    mode={form.type}
                    species={tree.species}
                    currentDisease={tree.disease}
                    value={form.label}
                    onChange={(label) => setForm(f => ({ ...f, label }))}
                    onNote={(note) => setForm(f => ({ ...f, note: f.note ? f.note : note }))}
                    t={t}
                  />
                ) : (
                  <input
                    autoFocus
                    value={form.label}
                    onChange={e => setForm({ ...form, label: e.target.value })}
                    placeholder={t('trees.plan.obs_ph')}
                    style={inputStyle}
                  />
                )}
                <textarea
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  placeholder={t('trees.plan.note_ph')}
                  rows={2}
                  style={{ ...inputStyle, marginTop: 8, resize: 'none', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => setForm(null)} style={{ ...ghostBtn, flex: 1, justifyContent: 'center' }}>{t('trees.plan.cancel')}</button>
                  <button onClick={submit} disabled={busy} style={{ ...primaryBtn, flex: 1, justifyContent: 'center' }}>
                    {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : t('trees.plan.save')}
                  </button>
                </div>
              </div>
            )}

            {/* Timeline */}
            <Label>{t('trees.plan.timeline')}</Label>
            {(!tree.events || tree.events.length === 0) ? (
              <div style={{ fontSize: 13, color: G.muted, padding: '10px 0' }}>{t('trees.plan.no_events')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                {tree.events.map(ev => {
                  const Ic = EV_ICON[ev.type] || Eye;
                  const col = EV_COLOR[ev.type] || G.muted;
                  return (
                    <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: G.surface, border: `1px solid ${G.border}`, borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${col}15`, color: col, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Ic size={15} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: G.ink }}>
                          {t(`trees.plan.ev_${ev.type}`)}{ev.label ? ` — ${ev.label}` : ''}
                        </div>
                        {ev.note && <div style={{ fontSize: 12, color: G.body, marginTop: 2 }}>{ev.note}</div>}
                        <div style={{ fontSize: 10.5, color: G.muted, marginTop: 3 }}>
                          {ev.created_at ? new Date(ev.created_at).toLocaleString() : ''}
                        </div>
                      </div>
                      <button onClick={() => onDelEvent(ev.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: G.faint, padding: 2 }}>
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Delete tree */}
            <div style={{ marginTop: 16, borderTop: `1px solid ${G.border}`, paddingTop: 14 }}>
              {confirmDel ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDel(false)} style={{ ...ghostBtn, flex: 1, justifyContent: 'center' }}>{t('trees.plan.cancel')}</button>
                  <button onClick={onDelete} disabled={busy} style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, padding: '11px', borderRadius: 10, border: 'none', background: G.red, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    <Trash2 size={14} /> {t('trees.plan.confirm_delete')}
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: `1px solid #fecaca`, background: '#fef2f2', color: G.red, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  <Trash2 size={14} /> {t('trees.plan.delete_tree')}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </Overlay>
  );
}

/* ── Catalog picker — searchable disease / treatment dataset ─────── */
function CatalogPicker({ mode, species, currentDisease, value, onChange, onNote, t }) {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || '').startsWith('ar');
  const nm = (o) => (isAr ? (o.ar || o.fr) : o.fr);
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState(true);

  const recoKey = mode === 'treatment' ? matchDiseaseKey(currentDisease) : null;

  let items = mode === 'disease'
    ? TREE_DISEASES.filter(d => !species || d.species.includes(species) || d.species.includes('all'))
    : TREE_TREATMENTS.filter(tr => cat === 'all' || tr.cat === cat);

  if (mode === 'treatment' && recoKey) {
    items = [...items].sort((a, b) => ((b.for?.includes(recoKey) ? 1 : 0) - (a.for?.includes(recoKey) ? 1 : 0)));
  }

  const q = (value || '').toLowerCase().trim();
  const filtered = items.filter(o =>
    !q || nm(o).toLowerCase().includes(q) || (o.fr || '').toLowerCase().includes(q)
    || (mode === 'treatment' && (o.substance || '').toLowerCase().includes(q)));

  const pick = (o) => {
    onChange(nm(o));
    if (mode === 'treatment' && onNote) onNote(treatmentMeta(o));
    setOpen(false);
  };

  const catChips = [{ key: 'all', fr: t('trees.plan.cat_all'), ar: t('trees.plan.cat_all'), color: G.muted }, ...TREAT_CATEGORIES];

  return (
    <div style={{ position: 'relative' }}>
      <input
        autoFocus
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={mode === 'disease' ? t('trees.plan.disease_ph') : t('trees.plan.product_ph')}
        style={inputStyle}
      />

      {mode === 'treatment' && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
          {catChips.map(c => (
            <button key={c.key} type="button" onClick={() => setCat(c.key)} style={{
              padding: '4px 9px', borderRadius: 99, fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${cat === c.key ? c.color : G.border}`,
              background: cat === c.key ? `${c.color}15` : G.surface, color: cat === c.key ? c.color : G.body,
            }}>
              {isAr ? (c.ar || c.fr) : c.fr}
            </button>
          ))}
        </div>
      )}

      {open && filtered.length > 0 && (
        <div style={{ marginTop: 8, maxHeight: 190, overflowY: 'auto', border: `1px solid ${G.border}`, borderRadius: 10, background: G.surface }}>
          {filtered.map(o => {
            const reco = mode === 'treatment' && recoKey && o.for?.includes(recoKey);
            return (
              <button key={o.key} type="button" onClick={() => pick(o)} style={{
                display: 'block', width: '100%', textAlign: isAr ? 'right' : 'left', padding: '8px 12px',
                border: 'none', borderBottom: `1px solid ${G.bg}`, background: reco ? '#f0fdf4' : G.surface, cursor: 'pointer',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.ink, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {nm(o)}
                  {reco && <span style={{ fontSize: 9, fontWeight: 800, color: G.green, background: '#dcfce7', borderRadius: 99, padding: '1px 6px' }}>{t('trees.plan.recommended')}</span>}
                </div>
                {mode === 'treatment' && <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{treatmentMeta(o)}</div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── tiny shared UI ─────────────────────────────────────────────── */
function Overlay({ children, onClose }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: G.surface, borderRadius: 18, width: '100%', maxWidth: 460, boxShadow: '0 30px 80px rgba(0,0,0,.4)', animation: 'slideUp .2s ease', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
function ModalHead({ title, sub, onClose }) {
  return (
    <div style={{ padding: '16px 18px', borderBottom: `1px solid ${G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: G.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: G.muted, marginTop: 1 }}>{sub}</div>}
      </div>
      <button onClick={onClose} style={{ background: G.bg, border: `1px solid ${G.border}`, borderRadius: 9, width: 32, height: 32, cursor: 'pointer', color: G.body, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <X size={16} />
      </button>
    </div>
  );
}
function ActBtn({ children, icon: Ic, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: '1 1 auto', minWidth: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
      border: `1.5px solid ${color}40`, background: `${color}0f`, color,
    }}>
      <Ic size={15} /> {children}
    </button>
  );
}
function Label({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: G.muted, marginBottom: 8 }}>{children}</div>;
}
function Center({ children }) {
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px' }}>{children}</div>;
}

const iconBtn   = { width: 38, height: 38, borderRadius: 10, background: G.bg, border: `1px solid ${G.border}`, color: G.body, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const ghostBtn  = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: `1px solid ${G.border}`, background: G.surface, color: G.body, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const primaryBtn = { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${G.green},#15803d)`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: `1px solid ${G.border}`, background: G.bg, fontSize: 14, color: G.ink, outline: 'none' };
const filterChip = (active) => ({
  padding: '5px 11px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer',
  border: `1.5px solid ${active ? G.green : G.border}`,
  background: active ? '#dcfce7' : G.surface, color: active ? G.green : G.body,
});
const zoomBtn = { width: 30, height: 30, borderRadius: 7, border: 'none', background: 'transparent', color: G.body, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
