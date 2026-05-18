import { useState, useEffect } from 'react';
import { Hexagon, MapPin, Search, Plus, ChevronRight } from 'lucide-react';
import { COLORS, gradeColor, gradeLabel } from './BeeConstants';
import { beeApi } from '../../services/beeApi';
import { QrModal, QueenDispatchModal } from './HiveModals.jsx';
import HiveWizardForm from './HiveWizardForm.jsx';

/* ── Feu tricolore santé ── */
function HealthLight({ score }) {
  const color = score >= 7 ? COLORS.gradeA : score >= 4 ? COLORS.gradeB : COLORS.gradeD;
  const anim  = score >= 7 ? 'pulse 2.5s infinite' : score < 4 ? 'pulse 0.8s infinite' : 'none';
  return (
    <span title={`Santé: ${score?.toFixed(1)}/10`}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22, borderRadius: '50%',
        background: `${color}22`, border: `2px solid ${color}`, flexShrink: 0 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color,
        display: 'block', animation: anim, boxShadow: `0 0 6px ${color}` }} />
    </span>
  );
}

function HoneyJar({ level }) {
  const pct  = Math.min(1, Math.max(0, (level ?? 5) / 10));
  const fill = pct >= 0.8 ? COLORS.accentLight : pct >= 0.5 ? COLORS.accent : pct >= 0.25 ? COLORS.accentDark : COLORS.textMuted;
  const h    = Math.round(pct * 24);
  const label = pct >= 0.8 ? 'PLEIN' : pct >= 0.5 ? 'BON' : pct >= 0.25 ? 'MOYEN' : 'FAIBLE';
  return (
    <span title={`Miel: ${level?.toFixed(1)}/10`}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg width="24" height="30" viewBox="0 0 24 30" fill="none">
        <rect x="4" y="2" width="16" height="22" rx="4" fill={COLORS.bg2} stroke={COLORS.accent} strokeWidth="1.5"/>
        <rect x="4" y={2 + (24 - h)} width="16" height={h} rx="2" fill={fill} opacity="0.85"/>
        <rect x="7" y="0" width="10" height="4" rx="2" fill={COLORS.accent}/>
      </svg>
      <span style={{ fontSize: 8, color: fill, fontWeight: 800 }}>{label}</span>
    </span>
  );
}

function BeeStrength({ level }) {
  const filled = Math.round(Math.min(5, Math.max(0, (level ?? 5) / 2)));
  const label  = filled >= 4 ? 'FORTE' : filled >= 2 ? 'MOYENNE' : 'FAIBLE';
  return (
    <span title={`Force: ${level?.toFixed(1)}/10`}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ display: 'flex', gap: 2 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <span key={i} style={{ fontSize: 12, opacity: i < filled ? 1 : 0.2, filter: i < filled ? 'none' : 'grayscale(1)' }}>🐝</span>
        ))}
      </span>
      <span style={{ fontSize: 8, color: COLORS.accent, fontWeight: 800 }}>{label}</span>
    </span>
  );
}

export default function InventaireTab({
  ruches, emplacements, onSelectHive, onAddRuche, toast,
  filterApiary = '', onClearFilter,
}) {
  const [search,        setSearch]        = useState('');
  const [filterSite,    setFilterSite]    = useState(filterApiary);
  const [filterGrade,   setFilterGrade]   = useState('');
  const [filterStatus,  setFilterStatus]  = useState('active');
  const [showForm,      setShowForm]      = useState(false);
  const [wizardStep,    setWizardStep]    = useState(1);
  const [expandedQuick, setExpandedQuick] = useState(null);
  const [quickVals,     setQuickVals]     = useState({});
  const [qrModal,       setQrModal]       = useState(null);
  const [queenDispatch, setQueenDispatch] = useState(null);

  const BLANK_FORM = {
    identifier: '', apiary_id: filterApiary || '', hive_type: 'Langstroth',
    queen_year: new Date().getFullYear(), health_score: 10, honey_level: 5,
    force_level: 5, has_queen: true, queen_count: 0,
  };
  const [form, setForm] = useState(BLANK_FORM);

  useEffect(() => { if (filterApiary) setFilterSite(filterApiary); }, [filterApiary]);

  const filtered = ruches.filter(r => {
    const ms  = !search       || r.identifier?.toLowerCase().includes(search.toLowerCase());
    const mi  = !filterSite   || String(r.apiary_id) === filterSite;
    const mg  = !filterGrade  || gradeLabel(r.health_score ?? 7) === filterGrade;
    const mst = filterStatus === 'active'
      ? r.is_active !== false
      : filterStatus === 'inactive'
      ? r.is_active === false
      : true;
    return ms && mi && mg && mst;
  });

  const active = ruches.filter(r => r.is_active !== false).length;
  const alerts = ruches.filter(r => (r.health_score ?? 10) < 4).length;
  const avgH   = ruches.length
    ? ruches.reduce((s, r) => s + (r.health_score || 0), 0) / ruches.length
    : 0;
  const grades = { A: 0, B: 0, C: 0, D: 0 };
  ruches.forEach(r => { grades[gradeLabel(r.health_score ?? 7)]++; });

  const handleSubmit = async () => {
    if (!form.apiary_id) { toast('Site requis.', 'warning'); return; }
    const payload = { ...form, apiary_id: Number(form.apiary_id) };
    const res = await beeApi.createHive(payload);
    if (!res.ok) {
      toast((await beeApi.json(res)).detail || 'Erreur création ruche', 'error');
      return;
    }
    const newHive = await res.json();
    toast('Ruche créée');
    setForm(BLANK_FORM);
    setShowForm(false);
    onAddRuche();
    if (!payload.has_queen && payload.hive_type !== 'queen_bank') {
      const qbRes = await beeApi.getQueenBank();
      if (qbRes.ok) {
        const qbData = await qbRes.json();
        if (qbData.available) {
          setQueenDispatch({ hiveId: newHive.id, hiveName: newHive.identifier, bankData: qbData });
        } else {
          toast('Aucune reine en Banque — introduction manuelle requise', 'warning');
        }
      }
    }
  };

  const handleDispatch = async () => {
    const res = await beeApi.dispatchQueen(queenDispatch.hiveId);
    if (res.ok) {
      const data = await res.json();
      toast(`Reine envoyée → ${queenDispatch.hiveName} · Banque: ${data.queen_bank_remaining} restante(s)`);
      onAddRuche();
    } else {
      toast((await beeApi.json(res)).detail || 'Erreur envoi reine', 'error');
    }
    setQueenDispatch(null);
  };

  const fetchQr = async (e, hive) => {
    e.stopPropagation();
    const res = await beeApi.getHiveQr(hive.id);
    if (res.ok) { const data = await res.json(); setQrModal(data); }
    else toast('Erreur génération QR', 'error');
  };

  const handleToggleActive = async (e, hive) => {
    e.stopPropagation();
    const newActive = hive.is_active === false;
    const res = await beeApi.updateHive(hive.id, { is_active: newActive });
    if (res.ok) { toast(newActive ? 'Ruche activée' : 'Ruche désactivée'); onAddRuche(); }
    else toast('Erreur mise à jour', 'error');
  };

  const handleQuickSave = async (e, hiveId) => {
    e.stopPropagation();
    const vals = quickVals[hiveId];
    if (!vals) return;
    const res = await beeApi.updateHive(hiveId, vals);
    if (res.ok) { toast('Ruche mise à jour'); onAddRuche(); setExpandedQuick(null); }
    else toast('Erreur sauvegarde', 'error');
  };

  const iSt = {
    height: 44, background: COLORS.bg2,
    border: `1px solid ${COLORS.border}`, borderRadius: 12,
    padding: '0 14px', color: COLORS.text, outline: 'none', fontSize: 13, width: '100%',
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: COLORS.accent, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 8 }}>
            Gestion Apicole · Enterprise
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: COLORS.text, letterSpacing: '-0.03em', lineHeight: 1 }}>
            Inventaire Ruches
          </h1>
          <p style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 8 }}>
            {ruches.length} ruches enregistrées · {active} actives
          </p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="action-btn"
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
            border: 'none', color: 'white', padding: '13px 26px', borderRadius: 14,
            fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center',
            gap: 10, boxShadow: `0 8px 24px -4px ${COLORS.accent}50`, fontSize: 14 }}>
          <Plus size={18} /> Nouvelle Ruche
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {[
          { label: 'ACTIVES',    value: `${active}`,       sub: `/ ${ruches.length}`,  color: COLORS.gradeA },
          { label: 'ALERTES',    value: `${alerts}`,       sub: 'Critiques',            color: alerts > 0 ? COLORS.gradeD : COLORS.gradeA },
          { label: 'SANTÉ MOY.', value: avgH.toFixed(1),   sub: '/10 COLOSS',           color: gradeColor(avgH) },
          { label: 'SITES',      value: emplacements.length, sub: 'Emplacements',       color: COLORS.info },
        ].map(k => (
          <div key={k.label} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: '16px 20px' }}>
            <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 800, letterSpacing: '1px' }}>{k.label}</div>
            <div style={{ color: k.color, fontWeight: 900, fontSize: 26, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginTop: 4 }}>{k.value}</div>
            <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}

        {/* Grade distribution */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: '16px 20px' }}>
          <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 800, letterSpacing: '1px', marginBottom: 10 }}>DISTRIBUTION GRADES</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(grades).map(([g, n]) => {
              const gc = gradeColor(g === 'A' ? 9 : g === 'B' ? 7 : g === 'C' ? 5 : 2);
              return (
                <div key={g} style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: gc, fontSize: 11, fontWeight: 800 }}>G{g}</span>
                    <span style={{ color: COLORS.text, fontSize: 11, fontWeight: 700 }}>{n}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 4, background: COLORS.bg2 }}>
                    <div style={{ height: '100%', width: ruches.length ? `${(n / ruches.length) * 100}%` : '0%', borderRadius: 4, background: gc }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      <QrModal qrModal={qrModal} onClose={() => setQrModal(null)} />
      <QueenDispatchModal
        queenDispatch={queenDispatch}
        onDispatch={handleDispatch}
        onClose={() => setQueenDispatch(null)}
      />

      {/* Wizard */}
      {showForm && (
        <HiveWizardForm
          emplacements={emplacements}
          form={form}
          setForm={setForm}
          BLANK_FORM={BLANK_FORM}
          wizardStep={wizardStep}
          setWizardStep={setWizardStep}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
          toast={toast}
        />
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une ruche…"
            style={{ ...iSt, paddingLeft: 38 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select value={filterSite}
            onChange={e => { setFilterSite(e.target.value); if (!e.target.value && onClearFilter) onClearFilter(); }}
            style={{ ...iSt, width: 'auto', paddingRight: 36 }}>
            <option value="">Tous les sites</option>
            {emplacements.map(e => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
          </select>
          {filterSite && (
            <button onClick={() => { setFilterSite(''); if (onClearFilter) onClearFilter(); }}
              style={{ height: 44, padding: '0 12px', borderRadius: 12, cursor: 'pointer',
                background: `${COLORS.accent}18`, border: `1px solid ${COLORS.accent}40`,
                color: COLORS.accent, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
              ✕ Filtre GIS
            </button>
          )}
        </div>
        {['', 'A', 'B', 'C', 'D'].map(g => {
          const gc = g ? gradeColor(g === 'A' ? 9 : g === 'B' ? 7 : g === 'C' ? 5 : 2) : COLORS.accent;
          return (
            <button key={g} onClick={() => setFilterGrade(g)}
              style={{ height: 44, padding: '0 16px', borderRadius: 12, cursor: 'pointer',
                background: filterGrade === g ? gc + '20' : COLORS.bg2,
                border: `1px solid ${filterGrade === g ? gc + '50' : COLORS.border}`,
                color: filterGrade === g ? COLORS.text : COLORS.textMuted,
                fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
              {g ? `Grade ${g}` : 'Tous'}
            </button>
          );
        })}
        <div style={{ width: 1, height: 28, background: COLORS.border, alignSelf: 'center' }} />
        {[
          { val: 'active',   label: '● Actives',  color: COLORS.gradeA },
          { val: 'inactive', label: '○ Inactives', color: COLORS.error },
          { val: '',         label: 'Toutes',      color: COLORS.text },
        ].map(s => (
          <button key={s.val} onClick={() => setFilterStatus(s.val)}
            style={{ height: 44, padding: '0 14px', borderRadius: 12, cursor: 'pointer',
              background: filterStatus === s.val ? s.color + '18' : COLORS.bg2,
              border: `1px solid ${filterStatus === s.val ? s.color + '50' : COLORS.border}`,
              color: filterStatus === s.val ? s.color : COLORS.textMuted,
              fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Hive grid */}
      {filtered.length === 0 ? (
        <div style={{ height: 300, background: COLORS.bg2, border: `2px dashed ${COLORS.border}`,
          borderRadius: 24, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14, color: COLORS.textMuted }}>
          <Hexagon size={52} strokeWidth={1} style={{ opacity: 0.2 }} />
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {ruches.length === 0 ? 'Aucune ruche enregistrée' : 'Aucun résultat'}
          </div>
          <div style={{ fontSize: 12 }}>
            {ruches.length === 0 ? 'Créez votre première ruche.' : 'Modifiez vos filtres.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
          {filtered.map(r => {
            const site     = emplacements.find(e => e.id === r.apiary_id);
            const sc       = r.health_score ?? 7;
            const gc       = gradeColor(sc);
            const isActive = r.is_active !== false;
            const qv       = quickVals[r.id] || {
              health_score: sc, honey_level: r.honey_level ?? 5, force_level: r.force_level ?? 5,
            };
            return (
              <div key={r.id} onClick={() => onSelectHive(r)} className="hive-card"
                style={{ background: COLORS.surface, borderRadius: 22,
                  border: `1px solid ${COLORS.border}`, padding: 0,
                  cursor: 'pointer', textAlign: 'left', overflow: 'hidden',
                  position: 'relative', width: '100%' }}>

                <div style={{ height: 3, background: `linear-gradient(90deg, ${gc}, ${gc}50, transparent)` }} />
                <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140,
                  borderRadius: '50%', background: `radial-gradient(circle, ${gc}10 0%, transparent 70%)`,
                  pointerEvents: 'none' }} />

                <div style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14,
                        background: `${gc}18`, border: `1px solid ${gc}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Hexagon size={22} color={gc} />
                      </div>
                      <div>
                        <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 17, letterSpacing: '-0.01em' }}>
                          {r.identifier}
                        </div>
                        <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2,
                          display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={10} /> {site?.name || 'Site ?'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <HealthLight score={sc} />
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%',
                          background: isActive ? COLORS.gradeA : COLORS.textMuted, display: 'inline-block',
                          boxShadow: isActive ? `0 0 6px ${COLORS.gradeA}` : 'none',
                          animation: isActive ? 'pulse 2s infinite' : 'none' }} />
                        <span style={{ color: isActive ? COLORS.gradeA : COLORS.textMuted }}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', paddingTop: 6 }}>
                    <HoneyJar level={r.honey_level ?? 5} />
                    <BeeStrength level={r.force_level ?? 5} />
                  </div>

                  {/* Quick edit */}
                  {expandedQuick === r.id && (
                    <div onClick={e => e.stopPropagation()}
                      style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14,
                        background: COLORS.bg2, border: `1px solid ${COLORS.borderHigh}` }}>
                      <div style={{ fontSize: 9, color: COLORS.accent, fontWeight: 800, letterSpacing: '1px', marginBottom: 10 }}>
                        ⚡ ÉDITION RAPIDE
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[
                          { key: 'health_score', label: 'Santé', color: gc },
                          { key: 'honey_level',  label: 'Miel',  color: COLORS.accent },
                          { key: 'force_level',  label: 'Force', color: COLORS.gradeA },
                        ].map(m => (
                          <div key={m.key} style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 700, marginBottom: 6 }}>
                              {m.label}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <button onClick={e => { e.stopPropagation(); setQuickVals(v => ({ ...v, [r.id]: { ...qv, [m.key]: Math.max(0, +(qv[m.key] ?? 5) - 0.5) } })); }}
                                style={{ width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
                                  border: `1px solid ${COLORS.border}`, background: COLORS.surface,
                                  color: COLORS.text, fontSize: 16, display: 'flex',
                                  alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>−</button>
                              <span style={{ flex: 1, color: m.color, fontWeight: 900, fontSize: 12, textAlign: 'center' }}>
                                {(qv[m.key] ?? 5).toFixed(1)}
                              </span>
                              <button onClick={e => { e.stopPropagation(); setQuickVals(v => ({ ...v, [r.id]: { ...qv, [m.key]: Math.min(10, +(qv[m.key] ?? 5) + 0.5) } })); }}
                                style={{ width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
                                  border: `1px solid ${COLORS.border}`, background: COLORS.surface,
                                  color: COLORS.text, fontSize: 16, display: 'flex',
                                  alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={e => handleQuickSave(e, r.id)}
                        style={{ marginTop: 10, width: '100%', height: 32, borderRadius: 10, cursor: 'pointer',
                          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
                          border: 'none', color: 'white', fontWeight: 800, fontSize: 12 }}>
                        ✓ Sauvegarder
                      </button>
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: 16, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ color: COLORS.textMuted, fontSize: 11 }}>
                        {r.hive_type === 'queen_bank' ? '👑 Banque de Reines' : (r.hive_type || 'Ruche')}
                        {r.queen_year && r.hive_type !== 'queen_bank' ? ` · ${r.queen_year}` : ''}
                      </span>
                      {r.hive_type === 'queen_bank' ? (
                        <span style={{ fontSize: 10, fontWeight: 800, color: COLORS.accent,
                          background: COLORS.accent + '18', padding: '2px 7px', borderRadius: 6 }}>
                          {r.queen_count ?? 0} reine(s)
                        </span>
                      ) : r.has_queen === false ? (
                        <span style={{ fontSize: 10, fontWeight: 800, color: COLORS.error,
                          background: COLORS.error + '15', padding: '2px 7px', borderRadius: 6 }}>Sans reine</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.success }}>♛</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={e => fetchQr(e, r)}
                        style={{ height: 26, width: 28, borderRadius: 8, cursor: 'pointer',
                          border: `1px solid ${COLORS.border}`, background: COLORS.bg2,
                          color: COLORS.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); if (expandedQuick === r.id) { setExpandedQuick(null); } else { setExpandedQuick(r.id); setQuickVals(v => ({ ...v, [r.id]: { health_score: sc, honey_level: r.honey_level ?? 5, force_level: r.force_level ?? 5 } })); } }}
                        style={{ height: 26, padding: '0 10px', borderRadius: 8, cursor: 'pointer',
                          border: `1px solid ${expandedQuick === r.id ? COLORS.accent + '50' : COLORS.border}`,
                          background: expandedQuick === r.id ? COLORS.accentGlow : COLORS.bg2,
                          color: expandedQuick === r.id ? COLORS.accent : COLORS.textMuted,
                          fontSize: 11, fontWeight: 700 }}>⚡</button>
                      <button onClick={e => handleToggleActive(e, r)}
                        style={{ height: 26, padding: '0 9px', borderRadius: 8, cursor: 'pointer',
                          border: `1px solid ${isActive ? COLORS.gradeA + '40' : COLORS.border}`,
                          background: isActive ? COLORS.gradeA + '12' : COLORS.bg2,
                          color: isActive ? COLORS.gradeA : COLORS.textMuted,
                          fontSize: 10, fontWeight: 800 }}>
                        {isActive ? '● ON' : '○ OFF'}
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: gc, fontSize: 12, fontWeight: 700 }}>
                        Ouvrir <ChevronRight size={13} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
