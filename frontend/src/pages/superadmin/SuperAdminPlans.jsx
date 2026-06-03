import React from 'react';
import { CheckSquare, Zap, Building } from 'lucide-react';

const PLANS = [
  {
    key: 'free',
    label: 'Initiation',
    price: 'Gratuit',
    color: '#64748b',
    icon: CheckSquare,
    limits: { max_animals: 50, max_workers: 1 },
    features: [
      "Jusqu'à 50 animaux",
      '1 utilisateur',
      'Tableaux de bord de base',
      'Historique 14 jours',
      'Support communauté',
    ],
    revenue: '0 €/mois',
  },
  {
    key: 'pro',
    label: 'Professionnel',
    price: '29 €/mois',
    color: '#22c55e',
    icon: Zap,
    popular: true,
    limits: { max_animals: -1, max_workers: 5 },
    features: [
      'Données temps-réel illimitées',
      "Jusqu'à 5 équipes",
      'Analyse prédictive IA',
      'Exports Excel/PDF',
      'Support prioritaire',
      'Accès MLflow models',
    ],
    revenue: '29 €/tenant/mois',
  },
  {
    key: 'enterprise',
    label: 'Entreprise',
    price: 'Sur mesure',
    color: '#7c3aed',
    icon: Building,
    limits: { max_animals: -1, max_workers: -1 },
    features: [
      'Acteurs illimités',
      'Models Computer Vision custom',
      'Serveur local souverain',
      'API & Webhooks',
      'Account Manager dédié',
      'SLA garanti',
    ],
    revenue: 'Négocié',
  },
];

export default function SuperAdminPlans() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Gestion des abonnements</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Configuration des plans — modifiez les limites dans <code style={{ color: '#7c3aed', background: '#7c3aed11', padding: '1px 6px', borderRadius: 4 }}>superadmin_routes.py → PLAN_LIMITS</code></p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>
        {PLANS.map(plan => {
          const Icon = plan.icon;
          return (
            <div key={plan.key} style={{
              background: '#0d1117',
              border: `1px solid ${plan.popular ? plan.color + '66' : '#1e2d3d'}`,
              borderRadius: 14,
              padding: 24,
              position: 'relative',
            }}>
              {plan.popular && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20 }}>
                  POPULAIRE
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ background: `${plan.color}22`, borderRadius: 8, padding: 8 }}>
                  <Icon size={18} color={plan.color} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{plan.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: plan.color }}>{plan.price}</div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>LIMITES</div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#080c10', borderRadius: 8, padding: '6px 12px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{plan.limits.max_animals === -1 ? '∞' : plan.limits.max_animals}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Animaux</div>
                </div>
                <div style={{ background: '#080c10', borderRadius: 8, padding: '6px 12px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{plan.limits.max_workers === -1 ? '∞' : plan.limits.max_workers}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Ouvriers</div>
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8' }}>
                    <CheckSquare size={13} color={plan.color} style={{ flexShrink: 0 }} /> {f}
                  </li>
                ))}
              </ul>

              <div style={{ borderTop: '1px solid #1e2d3d', paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: '#64748b' }}>Revenu par tenant</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: plan.color }}>{plan.revenue}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div style={{ background: '#7c3aed11', border: '1px solid #7c3aed33', borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa', marginBottom: 6 }}>Comment modifier les limites d'un tenant ?</div>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
          Allez dans <strong style={{ color: '#f1f5f9' }}>Tenants</strong> → colonne <strong style={{ color: '#f1f5f9' }}>Plan</strong> → cliquez sur le badge pour changer de plan en temps réel via l'API <code style={{ color: '#7c3aed' }}>PATCH /superadmin/tenants/{'{id}'}/plan</code>.
          Les limites sont appliquées automatiquement par le backend à chaque requête.
        </p>
      </div>
    </div>
  );
}
