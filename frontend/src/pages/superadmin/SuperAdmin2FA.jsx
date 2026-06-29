import React, { useEffect, useState } from 'react';
import { Shield, QrCode, Check, X, RefreshCw, Lock } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const C = { bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0', muted: '#64748b', text: '#1e293b', purple: '#7c3aed' };
const INPUT = { width: '100%', padding: '9px 12px', background: '#f8fafc', border: `1px solid #e2e8f0`, borderRadius: 8, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const BTN_P = { padding: '9px 20px', background: C.purple, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' };

export default function SuperAdmin2FA() {
  const [status, setStatus] = useState(null);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [disableForm, setDisableForm] = useState({ password: '', code: '' });
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    try {
      const { data } = await api.get('/auth/2fa/status');
      setStatus(data);
    } catch { toast.error('Erreur chargement statut 2FA'); }
  };

  useEffect(() => { loadStatus(); }, []);

  const startSetup = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setSetup(data);
      setCode('');
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
    finally { setLoading(false); }
  };

  const verifyCode = async () => {
    if (code.length !== 6) return toast.error('Code à 6 chiffres requis');
    setLoading(true);
    try {
      await api.post('/auth/2fa/verify', { code });
      toast.success('2FA activée avec succès !');
      setSetup(null);
      setCode('');
      loadStatus();
    } catch (e) { toast.error(e.response?.data?.detail || 'Code invalide'); }
    finally { setLoading(false); }
  };

  const disable2FA = async () => {
    if (!disableForm.password || !disableForm.code) return toast.error('Mot de passe + code requis');
    setLoading(true);
    try {
      await api.post('/auth/2fa/disable', disableForm);
      toast.success('2FA désactivée');
      setDisableForm({ password: '', code: '' });
      loadStatus();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Authentification 2 facteurs (TOTP)</h1>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Google Authenticator · Authy · FreeOTP</p>
      </div>

      {/* Status card */}
      <div style={{ background: C.card, border: `1px solid ${status?.totp_enabled ? '#22c55e44' : C.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: status?.totp_enabled ? '#22c55e20' : '#ef444420', borderRadius: 10, padding: 12 }}>
            <Shield size={22} color={status?.totp_enabled ? '#22c55e' : '#ef4444'} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
              2FA {status?.totp_enabled ? 'ACTIVÉE' : 'DÉSACTIVÉE'}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {status?.totp_enabled
                ? 'Votre compte est protégé par une authentification à deux facteurs.'
                : 'Activez la 2FA pour sécuriser votre compte superadmin.'}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {status?.totp_enabled
              ? <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', background: '#22c55e20', padding: '4px 12px', borderRadius: 20 }}>✓ Actif</span>
              : <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#ef444420', padding: '4px 12px', borderRadius: 20 }}>✗ Inactif</span>}
          </div>
        </div>
      </div>

      {/* Setup flow */}
      {!status?.totp_enabled && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Configurer la 2FA
          </h3>

          {!setup ? (
            <div>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
                Installez <strong style={{ color: C.text }}>Google Authenticator</strong> ou <strong style={{ color: C.text }}>Authy</strong> sur votre téléphone.
                Cliquez sur "Générer le QR Code" puis scannez-le.
              </p>
              <button onClick={startSetup} disabled={loading} style={{ ...BTN_P, display: 'flex', alignItems: 'center', gap: 8 }}>
                <QrCode size={15} /> {loading ? 'Génération…' : 'Générer le QR Code'}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'start', marginBottom: 20 }}>
                {setup.qr_code?.startsWith('data:image') ? (
                  <img src={setup.qr_code} alt="QR Code 2FA" style={{ width: 160, height: 160, borderRadius: 8, border: `1px solid ${C.border}` }} />
                ) : (
                  <div style={{ background: C.bg, borderRadius: 8, padding: 12, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>URI TOTP (si QR non disponible)</div>
                    <code style={{ fontSize: 9, color: '#94a3b8', wordBreak: 'break-all' }}>{setup.qr_code}</code>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                    1. Ouvrez Google Authenticator<br />
                    2. Appuyez sur "+" → "Scanner un QR code"<br />
                    3. Scannez le code QR ci-contre<br />
                    4. Entrez le code à 6 chiffres affiché
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Code de vérification</label>
                    <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456" maxLength={6} inputMode="numeric"
                      style={{ ...INPUT, width: 160, fontSize: 22, fontWeight: 700, letterSpacing: 8, textAlign: 'center' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={verifyCode} disabled={loading || code.length !== 6}
                      style={{ ...BTN_P, display: 'flex', alignItems: 'center', gap: 6, opacity: code.length !== 6 ? 0.5 : 1 }}>
                      <Check size={14} /> Activer la 2FA
                    </button>
                    <button onClick={() => setSetup(null)}
                      style={{ padding: '9px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, color: '#64748b', cursor: 'pointer', fontSize: 13 }}>
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
              {setup.secret && (
                <div style={{ background: C.bg, borderRadius: 8, padding: '10px 14px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Clé secrète (backup manuel)</div>
                  <code style={{ fontSize: 13, color: '#f59e0b', letterSpacing: 2, fontWeight: 700 }}>{setup.secret}</code>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Disable 2FA */}
      {status?.totp_enabled && (
        <div style={{ background: C.card, border: '1px solid #ef444433', borderRadius: 12, padding: '20px 24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Désactiver la 2FA
          </h3>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
            Entrez votre mot de passe et un code TOTP valide pour désactiver la 2FA.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Mot de passe</label>
              <input type="password" value={disableForm.password} onChange={e => setDisableForm(f => ({ ...f, password: e.target.value }))} style={INPUT} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Code TOTP</label>
              <input value={disableForm.code} onChange={e => setDisableForm(f => ({ ...f, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                placeholder="123456" maxLength={6} style={INPUT} />
            </div>
          </div>
          <button onClick={disable2FA} disabled={loading}
            style={{ ...BTN_P, background: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={14} /> {loading ? 'Traitement…' : 'Désactiver la 2FA'}
          </button>
        </div>
      )}
    </div>
  );
}
