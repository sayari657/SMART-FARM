import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * NoFarmGuard — wraps any page that requires an active farm.
 *
 * If the current user has no farms (farms.length === 0) OR farmId is null,
 * renders a full-page "create your first farm" prompt instead of the children.
 *
 * Usage:
 *   <NoFarmGuard>
 *     <MyFarmSpecificPage />
 *   </NoFarmGuard>
 */
export default function NoFarmGuard({ children }) {
  const { user, farms, farmId } = useAuth();
  const navigate = useNavigate();

  // Workers: their farmId comes from the JWT, always valid
  if (user?.role === 'worker') return children;

  // Owner with no farms yet
  if (farms.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', gap: 24, padding: 32, textAlign: 'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(22,163,74,.35)',
        }}>
          <Building2 size={34} color="#fff" />
        </div>

        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', margin: '0 0 10px' }}>
            Aucune ferme configurée
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-3)', maxWidth: 380, lineHeight: 1.7, margin: 0 }}>
            Vous n'avez pas encore créé de ferme. Chaque ferme a ses propres données — animaux, capteurs IoT, alertes et analytics — totalement isolées des autres utilisateurs.
          </p>
        </div>

        <button
          onClick={() => navigate('/farms')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 28px',
            background: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
            color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(22,163,74,.35)',
          }}
        >
          <Plus size={16} />
          Créer ma première ferme
          <ArrowRight size={14} />
        </button>

        <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
          La configuration prend moins de 2 minutes.
        </p>
      </div>
    );
  }

  // Owner with farms but no active selection (edge case)
  if (farmId == null) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '40vh', gap: 16, padding: 32, textAlign: 'center',
      }}>
        <Building2 size={40} color="var(--color-text-3)" />
        <h3 style={{ margin: 0, color: 'var(--color-text-2)' }}>Sélectionnez une ferme</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', maxWidth: 320 }}>
          Utilisez le sélecteur de ferme dans la barre de navigation pour choisir la ferme active.
        </p>
      </div>
    );
  }

  return children;
}
