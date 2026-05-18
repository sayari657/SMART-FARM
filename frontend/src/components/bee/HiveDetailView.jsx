import { useState } from 'react';
import {
  ArrowLeft, Hexagon, MapPin, ClipboardCheck, Boxes,
  CalendarClock, Droplets, Wallet, Package, Zap, ScanEye
} from 'lucide-react';
import { COLORS, gradeColor } from './BeeConstants';
import { useHiveRefresh } from './useHiveRefresh';
import FieldModeTab      from './FieldModeTab';
import EntranceMonitorTab from './EntranceMonitorTab';
import InspectionTab     from './HiveInspectionTab';
import LogistiqueTab     from './HiveLogistiqueTab';
import PlanningTab       from './HivePlanningTab';
import RecolteTab        from './HiveRecolteTab';
import FinanceTab        from './HiveFinanceTab';
import QueenBankTab      from './HiveQueenBankTab';

const HIVE_TABS = [
  { id: 'terrain',    label: 'Terrain',     icon: Zap },
  { id: 'monitor',    label: 'Monitor IA',  icon: ScanEye },
  { id: 'inspection', label: 'Inspection',  icon: ClipboardCheck },
  { id: 'logistique', label: 'Logistique',  icon: Boxes },
  { id: 'planning',   label: 'Planning',    icon: CalendarClock },
  { id: 'recolte',    label: 'Récolte',     icon: Droplets },
  { id: 'finance',    label: 'Finance',     icon: Wallet },
];

export default function HiveDetailView({ hive, emplacements = [], onBack, toast }) {
  const [activeTab, setActiveTab] = useState(hive.hive_type === 'queen_bank' ? 'banque' : 'terrain');
  const { currentHive, refreshHive, adjustQueenCount } = useHiveRefresh(hive, toast);

  const apiary   = emplacements.find(e => e.id === currentHive.apiary_id);
  const score    = currentHive.health_score ?? 7;
  const grade    = score >= 8 ? 'A' : score >= 6 ? 'B' : score >= 4 ? 'C' : 'D';
  const isQBBank = currentHive.hive_type === 'queen_bank';

  const tabs = isQBBank
    ? [{ id: 'banque', label: '👑 Banque', icon: Package }, ...HIVE_TABS.filter(t => t.id === 'monitor' || t.id === 'finance')]
    : HIVE_TABS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>

      {/* Header */}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '20px 20px 0 0', padding: '18px 26px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <button onClick={onBack}
          style={{ background: COLORS.overlay08, border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowLeft size={16} />
        </button>

        <div style={{ width: 46, height: 46, borderRadius: 13,
          background: isQBBank ? COLORS.accent + '22' : gradeColor(score) + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          border: `1px solid ${isQBBank ? COLORS.accent + '40' : gradeColor(score) + '30'}`,
          fontSize: isQBBank ? 22 : undefined }}>
          {isQBBank ? '👑' : <Hexagon size={22} color={gradeColor(score)} />}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: COLORS.text, fontWeight: 900, fontSize: 20 }}>{currentHive.identifier}</span>
            {isQBBank ? (
              <span style={{ padding: '3px 10px', borderRadius: 7, background: COLORS.accent + '22', color: COLORS.accent, fontSize: 12, fontWeight: 900 }}>
                👑 Banque de Reines
              </span>
            ) : (
              <span style={{ padding: '3px 9px', borderRadius: 7, background: gradeColor(score) + '20', color: gradeColor(score), fontSize: 12, fontWeight: 900 }}>Grade {grade}</span>
            )}
            {currentHive.is_active !== false && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 7, background: COLORS.success + '15', color: COLORS.success, fontSize: 10, fontWeight: 700 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.success, display: 'inline-block' }} /> Active
              </span>
            )}
            {!isQBBank && currentHive.has_queen === false && (
              <span style={{ padding: '3px 9px', borderRadius: 7, background: COLORS.error + '18', color: COLORS.error, fontSize: 10, fontWeight: 800 }}>
                ✕ Sans reine
              </span>
            )}
            {!isQBBank && currentHive.has_queen !== false && (
              <span style={{ color: COLORS.success, fontSize: 13 }} title="Reine présente">♛</span>
            )}
            {currentHive.hive_type && !isQBBank && (
              <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{currentHive.hive_type}</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {apiary && <span style={{ color: COLORS.textMuted, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} /> {apiary.name}</span>}
            {!isQBBank && currentHive.queen_year && (
              <span style={{ color: COLORS.textMuted, fontSize: 11 }}>♛ Reine {currentHive.queen_year} ({new Date().getFullYear() - currentHive.queen_year} ans)</span>
            )}
            {isQBBank && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: COLORS.textMuted, fontSize: 11 }}>Stock reines :</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: COLORS.accent + '10', border: `1px solid ${COLORS.accent}30`, borderRadius: 10, padding: '3px 8px' }}>
                  <button onClick={() => adjustQueenCount(-1)}
                    style={{ width: 22, height: 22, borderRadius: 6, background: COLORS.overlay08, border: `1px solid ${COLORS.border}`, color: COLORS.text, cursor: 'pointer', fontWeight: 900, fontSize: 14, lineHeight: 1 }}>−</button>
                  <span style={{ color: COLORS.accent, fontWeight: 900, fontSize: 15, minWidth: 24, textAlign: 'center' }}>
                    {currentHive.queen_count ?? 0}
                  </span>
                  <button onClick={() => adjustQueenCount(+1)}
                    style={{ width: 22, height: 22, borderRadius: 6, background: COLORS.accent + '22', border: 'none', color: COLORS.accent, cursor: 'pointer', fontWeight: 900, fontSize: 14, lineHeight: 1 }}>+</button>
                </div>
                <span style={{ color: COLORS.textMuted, fontSize: 10 }}>reine(s) disponible(s)</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {(isQBBank ? [
            { label: 'REINES',  value: `${currentHive.queen_count ?? 0}`,               color: COLORS.accent },
            { label: 'SANTÉ',   value: `${score?.toFixed(1)}`,                           color: gradeColor(score) },
            { label: 'MIEL',    value: `${currentHive.honey_level?.toFixed(0) || 5}/10`, color: COLORS.honey },
          ] : [
            { label: 'SANTÉ', value: `${score?.toFixed(1)}`,                             color: gradeColor(score) },
            { label: 'MIEL',  value: `${currentHive.honey_level?.toFixed(0) || 5}/10`,  color: COLORS.accent },
            { label: 'FORCE', value: `${currentHive.force_level?.toFixed(0) || 5}/10`,  color: COLORS.success },
          ]).map(m => (
            <div key={m.label} style={{ padding: '7px 12px', borderRadius: 11, background: COLORS.overlay04, border: `1px solid ${COLORS.border}`, textAlign: 'center', minWidth: 58 }}>
              <div style={{ color: m.color, fontWeight: 900, fontSize: 14 }}>{m.value}</div>
              <div style={{ color: COLORS.textMuted, fontSize: 8, fontWeight: 800, letterSpacing: '0.5px', marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, borderLeft: `1px solid ${COLORS.border}`, borderRight: `1px solid ${COLORS.border}`, display: 'flex', padding: '0 14px', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 16px', background: 'none', border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${COLORS.accent}` : '2px solid transparent',
              color: activeTab === tab.id ? COLORS.accent : COLORS.textMuted, cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 700 : 500, fontSize: 12, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 22, background: COLORS.bg, borderRadius: '0 0 20px 20px', border: `1px solid ${COLORS.border}`, borderTop: 'none' }}>
        {activeTab === 'banque'     && <QueenBankTab   hive={currentHive} onUpdated={refreshHive} toast={toast} />}
        {activeTab === 'terrain'    && <FieldModeTab       hive={currentHive} onVisitCreated={refreshHive} toast={toast} />}
        {activeTab === 'monitor'    && <EntranceMonitorTab hive={currentHive} toast={toast} />}
        {activeTab === 'inspection' && <InspectionTab      hive={currentHive} onVisitCreated={refreshHive} toast={toast} />}
        {activeTab === 'logistique' && <LogistiqueTab      hive={currentHive} toast={toast} />}
        {activeTab === 'planning'   && <PlanningTab        hive={currentHive} toast={toast} />}
        {activeTab === 'recolte'    && <RecolteTab         hive={currentHive} toast={toast} />}
        {activeTab === 'finance'    && <FinanceTab         hive={currentHive} toast={toast} />}
      </div>
    </div>
  );
}
