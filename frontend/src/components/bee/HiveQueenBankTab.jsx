import { useState, useEffect } from 'react';
import { Plus, Zap } from 'lucide-react';
import { COLORS } from './BeeConstants';
import { beeApi } from '../../services/beeApi';
import { Section, StepperInput } from './HiveShared.jsx';

export default function QueenBankTab({ hive, onUpdated, toast }) {
  const [addCount, setAddCount] = useState(1);
  const [saving, setSaving]     = useState(false);
  const [dispatches, setDispatches] = useState([]);

  useEffect(() => {
    beeApi.getHives()
      .then(r => r.ok ? r.json() : [])
      .then(hives => {
        const filtered = hives.filter(h => h.hive_type !== 'queen_bank');
        filtered.sort((a, b) => (a.has_queen ? 1 : 0) - (b.has_queen ? 1 : 0));
        setDispatches(filtered);
      })
      .catch(() => {});
  }, []);

  const addQueens = async () => {
    if (addCount < 1) return;
    setSaving(true);
    const body = {
      apiary_id: hive.apiary_id, identifier: hive.identifier, is_active: hive.is_active,
      health_score: hive.health_score, honey_level: hive.honey_level, force_level: hive.force_level,
      hive_type: hive.hive_type, queen_year: hive.queen_year, has_queen: hive.has_queen,
      queen_count: (hive.queen_count || 0) + addCount, notes: hive.notes,
    };
    const r = await beeApi.updateHive(hive.id, body);
    setSaving(false);
    if (r.ok) { toast(`+${addCount} reine(s) ajoutée(s) au stock`, 'success'); onUpdated(); }
    else toast('Erreur mise à jour', 'error');
  };

  const dispatchTo = async (targetHive) => {
    const r = await beeApi.dispatchQueen(targetHive.id);
    if (r.ok) {
      const d = await r.json();
      toast(`Reine envoyée vers ${targetHive.identifier} · Stock restant: ${d.queen_bank_remaining}`, 'success');
      onUpdated();
    } else {
      const err = await r.json().catch(() => ({}));
      toast(err.detail || 'Erreur envoi', 'error');
    }
  };

  const available = hive.queen_count || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ padding: '18px 22px', borderRadius: 20, background: COLORS.accent + '0a', border: `1px solid ${COLORS.accent}30`, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ fontSize: 40 }}>👑</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 18 }}>Banque de Reines</div>
          <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 3 }}>
            {hive.identifier} · Stock actuel
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: COLORS.accent, fontWeight: 900, fontSize: 40, lineHeight: 1 }}>{available}</div>
          <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px' }}>REINE(S) DISPO</div>
        </div>
      </div>

      <Section title="Ajouter des reines au stock" icon={Plus} color={COLORS.success}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <StepperInput label="Nombre de reines à ajouter" value={addCount} min={1}
            onChange={setAddCount} color={COLORS.success} />
          <button onClick={addQueens} disabled={saving}
            style={{ height: 46, padding: '0 24px', borderRadius: 12, flexShrink: 0,
              background: `linear-gradient(135deg, ${COLORS.success}, #065f46)`,
              border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 13,
              opacity: saving ? 0.7 : 1 }}>
            {saving ? '…' : `+ Ajouter ${addCount} reine(s)`}
          </button>
        </div>
      </Section>

      <Section title="Envoyer une reine vers une ruche" icon={Zap} color={COLORS.accent}>
        {available === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: COLORS.textMuted, fontSize: 13 }}>
            Aucune reine disponible — ajoutez d'abord des reines au stock
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>
              Ruches qui ont déjà une reine (pour remplacement) ou ruches sans reine :
            </div>
            {dispatches.slice(0, 12).map(h2 => {
              const needsQueen = h2.has_queen === false;
              return (
                <div key={h2.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 12, background: needsQueen ? COLORS.error + '06' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${needsQueen ? COLORS.error + '30' : COLORS.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 13 }}>{h2.identifier}</span>
                      {needsQueen
                        ? <span style={{ fontSize: 9, fontWeight: 800, color: COLORS.error, background: COLORS.error + '18', padding: '2px 6px', borderRadius: 5 }}>SANS REINE</span>
                        : <span style={{ fontSize: 10, color: COLORS.success }}>♛</span>}
                    </div>
                    <span style={{ color: COLORS.textMuted, fontSize: 11 }}>
                      Santé: {h2.health_score?.toFixed(1)}/10
                    </span>
                  </div>
                  <button onClick={() => dispatchTo(h2)}
                    style={{ height: 34, padding: '0 14px', borderRadius: 10,
                      background: needsQueen ? COLORS.error + '20' : COLORS.accent + '18',
                      border: `1px solid ${needsQueen ? COLORS.error + '40' : COLORS.accent + '30'}`,
                      color: needsQueen ? COLORS.error : COLORS.accent,
                      fontWeight: 800, cursor: 'pointer', fontSize: 12 }}>
                    Envoyer ♛
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
