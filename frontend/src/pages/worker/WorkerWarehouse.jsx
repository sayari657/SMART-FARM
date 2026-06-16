import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Minus, Plus, RefreshCw, WifiOff, PackageX, Loader2 } from 'lucide-react';
import { useNetworkSync } from '../../hooks/useNetworkSync';
import { warehouseAPI } from '../../services/api';
import {
  WT, WorkerPage, PageHeader, SectionLabel, Card,
  Skeleton, EmptyState, WorkerStyles,
} from './workerUI';

const statusOf = (it) =>
  (it.quantity ?? 0) <= 0 ? 'out'
    : (it.min_quantity && it.quantity <= it.min_quantity ? 'low' : 'ok');

const STATUS = {
  out: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  low: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  ok:  { color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
};

export default function WorkerWarehouse() {
  const { t, i18n } = useTranslation();
  const { isOnline } = useNetworkSync();
  const isAr = (i18n.language || '').startsWith('ar');
  const nameOf = (o) => (isAr ? (o.name_ar || o.name_fr) : (o.name_fr || o.name_ar)) || '';

  const [cats, setCats]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [query, setQuery]     = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      // No farm arg → backend scopes to the worker's assigned farm(s) via WorkerAssignment.
      const { data } = await warehouseAPI.categories();
      setCats(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOnline) load();
    else setLoading(false);
  }, [load, isOnline]);

  // Flatten for counts + status labels
  const allItems = useMemo(
    () => cats.flatMap(c => (c.items || []).map(it => ({ ...it, _cat: c }))),
    [cats],
  );
  const counts = useMemo(() => {
    let out = 0, low = 0;
    allItems.forEach(it => {
      const s = statusOf(it);
      if (s === 'out') out++; else if (s === 'low') low++;
    });
    return { total: allItems.length, out, low, attention: out + low };
  }, [allItems]);

  // Apply filters → grouped categories with their visible items
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cats
      .filter(c => activeCat === 'all' || c.id === activeCat)
      .map(c => ({
        cat: c,
        items: (c.items || []).filter(it => {
          if (attentionOnly && statusOf(it) === 'ok') return false;
          if (!q) return true;
          return (it.name_fr || '').toLowerCase().includes(q)
            || (it.name_ar || '').toLowerCase().includes(q)
            || (it.description || '').toLowerCase().includes(q);
        }),
      }))
      .filter(g => g.items.length > 0);
  }, [cats, activeCat, attentionOnly, query]);

  const adjust = async (item, delta) => {
    if (!isOnline || savingId) return;
    const next = Math.max(0, (item.quantity ?? 0) + delta);
    if (next === item.quantity) return;
    const prev = item.quantity;
    // optimistic
    setCats(cs => cs.map(c => ({ ...c, items: (c.items || []).map(i => i.id === item.id ? { ...i, quantity: next } : i) })));
    setSavingId(item.id);
    try {
      await warehouseAPI.update(item.id, { quantity: next });
    } catch {
      setCats(cs => cs.map(c => ({ ...c, items: (c.items || []).map(i => i.id === item.id ? { ...i, quantity: prev } : i) })));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <WorkerPage style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
      <WorkerStyles />

      <PageHeader
        title={t('worker.warehouse.title')}
        subtitle={t('worker.warehouse.subtitle')}
        icon="📦"
        right={
          <button
            onClick={load}
            aria-label={t('worker.warehouse.refresh')}
            disabled={!isOnline}
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: WT.bg, border: `1px solid ${WT.border}`, color: WT.body,
              cursor: isOnline ? 'pointer' : 'not-allowed', opacity: isOnline ? 1 : 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <RefreshCw size={17} style={{ animation: loading ? 'wkSpin 1s linear infinite' : 'none' }} />
          </button>
        }
      />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {!isOnline && (
          <div style={{
            background: '#fffbeb', color: '#92400e', padding: '10px 12px',
            borderRadius: WT.r.sm, fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #fde68a',
          }}>
            <WifiOff size={16} /> {t('worker.warehouse.offline_readonly')}
          </div>
        )}

        {/* ── Summary ── */}
        {!error && (loading || counts.total > 0) && (
          <Card style={{ display: 'flex', gap: 10, padding: 14 }}>
            {loading ? (
              <Skeleton height={46} radius={12} />
            ) : (
              <>
                <Stat label={t('worker.warehouse.stat_items')} value={counts.total} color={WT.ink} />
                <Stat label={t('worker.warehouse.stat_low')}    value={counts.low}  color="#d97706" />
                <Stat label={t('worker.warehouse.stat_out')}    value={counts.out}  color="#ef4444" />
              </>
            )}
          </Card>
        )}

        {/* ── Search ── */}
        {!error && !loading && counts.total > 0 && (
          <div style={{ position: 'relative' }}>
            <Search size={16} color={WT.muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('worker.warehouse.search_ph')}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '11px 12px 11px 36px',
                borderRadius: WT.r.sm, border: `1px solid ${WT.border}`, background: WT.surface,
                fontSize: 14, color: WT.ink, outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = WT.brand}
              onBlur={e => e.target.style.borderColor = WT.border}
            />
          </div>
        )}

        {/* ── Category chips ── */}
        {!error && !loading && counts.total > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            <Chip active={activeCat === 'all' && !attentionOnly} onClick={() => { setActiveCat('all'); setAttentionOnly(false); }} color={WT.brand}>
              {t('worker.warehouse.all')}
            </Chip>
            {counts.attention > 0 && (
              <Chip active={attentionOnly} onClick={() => { setAttentionOnly(a => !a); setActiveCat('all'); }} color="#d97706">
                ⚠️ {t('worker.warehouse.to_restock')} {counts.attention}
              </Chip>
            )}
            {cats.map(c => (
              <Chip key={c.id} active={activeCat === c.id} onClick={() => { setActiveCat(c.id); setAttentionOnly(false); }} color={c.color || WT.brand}>
                {c.emoji} {nameOf(c)}
              </Chip>
            ))}
          </div>
        )}

        {/* ── Body ── */}
        {error ? (
          <EmptyState
            emoji="📡"
            title={t('worker.warehouse.error_title')}
            desc={t('worker.warehouse.error_desc')}
            action={isOnline && (
              <button onClick={load} style={ctaStyle}>
                <RefreshCw size={15} /> {t('worker.warehouse.refresh')}
              </button>
            )}
          />
        ) : loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2, 3].map(i => (
              <Card key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14 }}>
                <Skeleton width={44} height={44} radius={12} />
                <div style={{ flex: 1 }}>
                  <Skeleton width="65%" height={13} style={{ marginBottom: 8 }} />
                  <Skeleton width="35%" height={10} />
                </div>
                <Skeleton width={92} height={36} radius={10} />
              </Card>
            ))}
          </div>
        ) : counts.total === 0 ? (
          <EmptyState
            emoji="📦"
            title={t('worker.warehouse.empty_title')}
            desc={t('worker.warehouse.empty_desc')}
          />
        ) : groups.length === 0 ? (
          <EmptyState emoji="🔍" title={t('worker.warehouse.no_match')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {groups.map(({ cat, items }) => (
              <div key={cat.id}>
                <SectionLabel style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color || WT.brand, display: 'inline-block' }} />
                  {cat.emoji} {nameOf(cat)} · {items.length}
                </SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map(it => {
                    const st = statusOf(it);
                    const sc = STATUS[st];
                    return (
                      <Card key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, animation: 'wkRise .22s ease both' }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12, flexShrink: 0, fontSize: 22,
                          background: `${cat.color || WT.brand}14`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {it.emoji || '📦'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 700, fontSize: 14, color: WT.ink,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {nameOf(it)}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: WT.r.pill,
                              background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                            }}>
                              {t(`worker.warehouse.status_${st}`)}
                            </span>
                            {it.min_quantity ? (
                              <span style={{ fontSize: 11, color: WT.muted }}>
                                {t('worker.warehouse.min')} {it.min_quantity}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {/* Stepper */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <StepBtn onClick={() => adjust(it, -1)} disabled={!isOnline || (it.quantity ?? 0) <= 0}>
                            <Minus size={16} />
                          </StepBtn>
                          <div style={{ minWidth: 52, textAlign: 'center' }}>
                            {savingId === it.id
                              ? <Loader2 size={15} className="wk-spin" style={{ animation: 'wkSpin .8s linear infinite', color: WT.muted }} />
                              : (
                                <>
                                  <div style={{ fontWeight: 800, fontSize: 16, color: sc.color, lineHeight: 1 }}>{it.quantity ?? 0}</div>
                                  <div style={{ fontSize: 9, color: WT.muted, marginTop: 1 }}>{it.unit || ''}</div>
                                </>
                              )}
                          </div>
                          <StepBtn onClick={() => adjust(it, +1)} disabled={!isOnline} accent>
                            <Plus size={16} />
                          </StepBtn>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WorkerPage>
  );
}

/* ── small local primitives ───────────────────────────────────── */
function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: WT.muted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Chip({ children, active, onClick, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0, whiteSpace: 'nowrap', padding: '7px 13px', borderRadius: WT.r.pill,
        background: active ? `${color}15` : WT.surface,
        border: `1.5px solid ${active ? color : WT.border}`,
        color: active ? color : WT.body, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      {children}
    </button>
  );
}

function StepBtn({ children, onClick, disabled, accent }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        border: `1px solid ${accent ? WT.brand : WT.border}`,
        background: disabled ? WT.bg : (accent ? WT.brand : WT.surface),
        color: disabled ? WT.faint : (accent ? '#fff' : WT.body),
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        touchAction: 'manipulation',
      }}
    >
      {children}
    </button>
  );
}

const ctaStyle = {
  background: WT.brandGrad, border: 'none', borderRadius: WT.r.md,
  padding: '12px 26px', color: '#fff', fontWeight: 700, fontSize: 14,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
};
