import { QrCode, Download, X } from 'lucide-react';
import { COLORS } from './BeeConstants';

export function QrModal({ qrModal, onClose }) {
  if (!qrModal) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderHigh}`,
          borderRadius: 24, padding: 28, maxWidth: 340, width: '100%',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)', textAlign: 'center' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <QrCode size={18} color={COLORS.accent} />
            <span style={{ color: COLORS.text, fontWeight: 900, fontSize: 15 }}>QR Code Ruche</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 8, background: '#FFF', borderRadius: 16, display: 'inline-block', marginBottom: 16 }}>
          <img src={qrModal.data_url} alt="QR Code" style={{ width: 220, height: 220, display: 'block' }} />
        </div>
        <div style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 16, fontWeight: 700, letterSpacing: '1px' }}>
          {qrModal.identifier}
        </div>
        <a
          href={qrModal.data_url}
          download={`${qrModal.identifier}-QR.png`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', height: 44, borderRadius: 14,
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
            color: 'white', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}
        >
          <Download size={16} /> Télécharger PNG
        </a>
      </div>
    </div>
  );
}

export function QueenDispatchModal({ queenDispatch, onDispatch, onClose }) {
  if (!queenDispatch) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.78)',
      backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderHigh}`,
        borderRadius: 24, padding: 28, maxWidth: 440, width: '100%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: COLORS.accent + '20',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👑</div>
          <div>
            <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 16 }}>Banque de Reines disponible</div>
            <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 3 }}>
              {queenDispatch.bankData.queen_count} reine(s) · {queenDispatch.bankData.identifier}
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderRadius: 14, background: COLORS.accent + '0a',
          border: `1px solid ${COLORS.accent}25`, marginBottom: 20, color: COLORS.textMuted, fontSize: 13 }}>
          La ruche <strong style={{ color: COLORS.text }}>{queenDispatch.hiveName}</strong> n'a pas de reine.
          Envoyer une reine depuis la Banque ?
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onDispatch}
            style={{ flex: 1, height: 48, borderRadius: 14, cursor: 'pointer',
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
              border: 'none', color: 'white', fontWeight: 800, fontSize: 14 }}
          >
            👑 Envoyer une Reine
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, height: 48, borderRadius: 14, cursor: 'pointer',
              background: COLORS.bg2, border: `1px solid ${COLORS.border}`,
              color: COLORS.textMuted, fontWeight: 700, fontSize: 14 }}
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
