import { Zap, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { redirectToCheckout } from '../services/billingApi';

/**
 * ProGate — wraps Pro-only pages.
 * Shows an upgrade wall if user.plan is not 'pro' or 'enterprise'.
 * Renders children normally for paying users.
 */
export default function ProGate({ children }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPro = user?.plan === 'pro' || user?.plan === 'enterprise' || user?.role === 'superadmin';
  if (isPro) return children;

  const handleUpgrade = async () => {
    setLoading(true); setError('');
    const result = await redirectToCheckout('pro');
    if (!result.ok && result.reason !== 'not_authed') {
      setError(result.reason || 'Erreur Stripe');
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', padding: '40px 24px',
    }}>
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 20, padding: '48px 40px', maxWidth: 480, width: '100%',
        textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,.08)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg,#16a34a,#15803d)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Lock size={28} color="#fff" />
        </div>

        <div style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: .7, marginBottom: 8 }}>
          Fonctionnalité Pro
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)', margin: '0 0 12px', lineHeight: 1.3 }}>
          Passez au plan Professionnel
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.7, margin: '0 0 28px' }}>
          Cette fonctionnalité est disponible avec le plan <strong>Professionnel</strong>.
          Accédez à l'IA prédictive, les exports PDF/Excel, les rapports avancés et bien plus.
        </p>

        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
          {[
            'IA prédictive & conseils automatiques',
            'Rapports PDF / Excel',
            'Animaux & fermes illimités',
            '5 équipes de travailleurs',
            'Support prioritaire',
          ].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#15803d', marginBottom: 6 }}>
              <span style={{ color: '#16a34a', fontWeight: 900 }}>✓</span> {f}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: loading ? '#94a3b8' : 'linear-gradient(135deg,#16a34a,#15803d)',
            color: '#fff', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: loading ? 'none' : '0 4px 16px rgba(22,163,74,.35)',
            transition: 'all .2s',
          }}
        >
          <Zap size={17} />
          {loading ? 'Redirection vers Stripe…' : 'Passer au Pro — 29€/mois'}
        </button>

        <div style={{ marginTop: 14, fontSize: 11, color: 'var(--color-text-3)' }}>
          🔒 Paiement sécurisé Stripe · Sans engagement · Annulable à tout moment
        </div>
      </div>
    </div>
  );
}
