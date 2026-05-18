/**
 * BeeConstants — "ApiCraft Modern" Design System
 * Palette apicole professionnelle :
 *   Fond       → gris clair neutre    (clean, moderne)
 *   Surface    → blanc pur            (carte propre)
 *   Accent     → ambre miel           (couleur signature — inchangée)
 *   Santé      → émeraude             (colonie saine)
 *   Reine      → violet profond       (banque reines)
 *   Alerte     → orange               (surveillance)
 *   Critique   → rouge clair          (urgence)
 *   Texte      → slate sombre         (lisibilité maximale)
 */
import { Sprout, ShieldPlus, Wrench, Truck, Users, MoreHorizontal } from 'lucide-react';

export const COLORS = {
  /* ── Fonds ── */
  bg:         '#F9FAFB',
  bg2:        '#F3F4F6',
  surface:    '#FFFFFF',
  surface2:   'rgba(249, 250, 251, 0.97)',
  glass:      'rgba(245, 158, 11, 0.06)',

  /* ── Bordures ── */
  border:     '#E5E7EB',
  borderHigh: 'rgba(245, 158, 11, 0.45)',

  /* ── Accent principal — miel ambré (signature) ── */
  accent:      '#D97706',
  accentLight: '#F59E0B',
  accentDark:  '#92400E',
  accentGlow:  'rgba(217, 119, 6, 0.10)',
  honey:       '#FBBF24',      // amber-400 → température, statut "en cours"

  /* ── Sémantique métier apicole ── */
  success:  '#059669',   // émeraude    → colonie saine
  error:    '#EF4444',   // rouge clair → urgence
  warning:  '#F97316',   // orange vif  → surveillance
  info:     '#6D28D9',   // violet prof → reine / banque
  purple:   '#7C3AED',   // lavande     → analytics

  /* ── Texte ── */
  text:      '#111827',   // slate sombre — lisibilité maximale
  textMuted: '#6B7280',   // gris neutre
  textDim:   '#9CA3AF',   // gris clair

  /* ── Graphiques ── */
  chart: ['#F59E0B', '#D97706', '#059669', '#F97316', '#7C3AED', '#EF4444'],

  /* ── Grades santé colonie ── */
  gradeA: '#059669',   // émeraude    → A : excellente santé
  gradeB: '#D97706',   // ambre miel  → B : bonne santé
  gradeC: '#F97316',   // orange vif  → C : à surveiller
  gradeD: '#EF4444',   // rouge clair → D : critique

  /* ── Catégories dépenses ── */
  catAlim:  '#10b981',   // emerald-500 → Alimentation
  catEquip: '#3B82F6',   // blue-500    → Équipement
  catWork:  '#8B5CF6',   // violet-500  → Main-d'œuvre
  catOther: '#94A3B8',   // slate-400   → Autre

  /* ── Overlay (rgba shortcuts — évite les inline magic values) ── */
  overlay03: 'rgba(0,0,0,0.03)',
  overlay04: 'rgba(0,0,0,0.04)',
  overlay06: 'rgba(0,0,0,0.06)',
  overlay08: 'rgba(0,0,0,0.08)',
  overlay10: 'rgba(0,0,0,0.10)',
};

/* ── Helpers grades (partagés entre InventaireTab, HiveDetailView, etc.) ── */
export const gradeColor = s =>
  s >= 8 ? COLORS.gradeA : s >= 6 ? COLORS.gradeB : s >= 4 ? COLORS.gradeC : COLORS.gradeD;

export const gradeLabel = s =>
  s >= 8 ? 'A' : s >= 6 ? 'B' : s >= 4 ? 'C' : 'D';

/* ── Catégories dépenses (partagées entre DepensesTab, HiveFinanceTab, etc.) ── */
export const EXPENSE_CATEGORIES = [
  { id: 'Alimentation', icon: Sprout,         color: COLORS.catAlim     },
  { id: 'Traitement',   icon: ShieldPlus,     color: COLORS.error       },
  { id: 'Équipement',   icon: Wrench,         color: COLORS.catEquip    },
  { id: 'Transport',    icon: Truck,          color: COLORS.accentLight },
  { id: "Main-d'œuvre", icon: Users,          color: COLORS.catWork     },
  { id: 'Autre',        icon: MoreHorizontal, color: COLORS.catOther    },
];
