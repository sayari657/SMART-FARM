import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Building2, Plus, Check, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * FarmSelector — Dropdown contextuel dans la Navbar.
 *
 * Affiche la ferme active avec possibilité de :
 *  - Changer de ferme (switch)
 *  - Créer une nouvelle ferme (→ /farms)
 *  - Rafraîchir la liste
 *
 * Privacy : chaque sélection met à jour farmId dans AuthContext,
 * ce qui re-déclenche tous les useEffect([farmId]) dans les pages.
 */
export default function FarmSelector() {
  const { farms, farmId, switchFarm, refreshFarms } = useAuth();
  const [open, setOpen]         = useState(false);
  const [refreshing, setRefresh] = useState(false);
  const ref                     = useRef(null);
  const navigate                = useNavigate();

  const currentFarm = farms.find(f => f.id === farmId) || null;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleRefresh = async (e) => {
    e.stopPropagation();
    setRefresh(true);
    await refreshFarms(farmId);
    setRefresh(false);
  };

  const handleSwitch = (id) => {
    switchFarm(id);
    setOpen(false);
  };

  const handleCreate = () => {
    setOpen(false);
    navigate('/farms');
  };

  // Status dot color
  const statusColor = (status) => {
    if (status === 'active') return '#16a34a';
    if (status === 'maintenance') return '#d97706';
    return '#94a3b8';
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '5px 10px 5px 8px',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--r-full, 9999px)',
          cursor: 'pointer', userSelect: 'none',
          fontSize: 12, fontWeight: 600, color: 'var(--color-text)',
          transition: 'border-color 0.15s',
          minWidth: 0, maxWidth: 200,
        }}
      >
        <Building2 size={13} color={currentFarm ? '#16a34a' : '#94a3b8'} style={{ flexShrink: 0 }} />

        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: currentFarm ? 'var(--color-text)' : 'var(--color-text-3)',
        }}>
          {currentFarm ? currentFarm.name : 'Aucune ferme'}
        </span>

        {farms.length > 1 && (
          <span style={{
            background: 'var(--color-primary)', color: '#fff',
            borderRadius: 9999, fontSize: 9, fontWeight: 800,
            padding: '1px 5px', flexShrink: 0,
          }}>
            {farms.length}
          </span>
        )}

        <ChevronDown
          size={12}
          color="var(--color-text-3)"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 999,
          minWidth: 220, maxWidth: 300,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.18)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px 8px',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Mes Fermes
            </span>
            <button
              onClick={handleRefresh}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', padding: 2, display: 'flex' }}
              title="Rafraîchir"
            >
              <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>

          {/* Farm list */}
          {farms.length === 0 ? (
            <div style={{ padding: '16px 14px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: 12 }}>
              Aucune ferme — créez-en une
            </div>
          ) : (
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {farms.map(farm => (
                <button
                  key={farm.id}
                  onClick={() => handleSwitch(farm.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '9px 14px',
                    background: farm.id === farmId ? 'var(--color-accent-light, rgba(34,197,94,.06))' : 'none',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderBottom: '1px solid var(--color-border-light, rgba(0,0,0,.05))',
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Status dot */}
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: statusColor(farm.status),
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: farm.id === farmId ? 700 : 500,
                      color: farm.id === farmId ? 'var(--color-primary)' : 'var(--color-text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {farm.name}
                    </div>
                    {farm.location && (
                      <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {farm.location}
                      </div>
                    )}
                  </div>

                  {farm.id === farmId && <Check size={13} color="var(--color-primary)" style={{ flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          )}

          {/* Create new farm */}
          <div style={{ borderTop: '1px solid var(--color-border)', padding: 8 }}>
            <button
              onClick={handleCreate}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 10px',
                background: 'none', border: '1px dashed var(--color-border)',
                borderRadius: 8, cursor: 'pointer', color: 'var(--color-primary)',
                fontSize: 12, fontWeight: 600,
              }}
            >
              <Plus size={14} />
              Nouvelle ferme
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
