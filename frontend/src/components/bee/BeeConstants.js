/**
 * BeeConstants — "Miel du Matin" Design System
 * Palette apicole lumineuse :
 *   Fond       → crème ivoire chaud  (lumière du matin dans le rucher)
 *   Surface    → blanc pur           (carte de ruche propre)
 *   Accent     → ambre miel          (couleur signature apicole)
 *   Santé      → vert de champ       (colonie saine)
 *   Reine      → violet royal        (essaimage / banque reines)
 *   Alerte     → orange pollen       (surveillance)
 *   Critique   → rouge               (urgence)
 *   Texte      → brun profond chaud  (comme un vieux carnet d'apiculteur)
 */
export const COLORS = {
  /* ── Fonds — crème de miel matinal ── */
  bg:         '#FEFCF7',                       // ivoire chaud — lumière matinale
  bg2:        '#FFF8E7',                       // crème miel légère
  surface:    '#FFFFFF',                       // carte blanche pure
  surface2:   'rgba(255, 248, 231, 0.92)',     // panneau crème doux
  glass:      'rgba(245, 158, 11, 0.05)',      // reflet doré subtil

  /* ── Bordures — cire claire ── */
  border:     '#EDE0C4',
  borderHigh: 'rgba(217, 119, 6, 0.52)',

  /* ── Accent principal — miel ambré ── */
  accent:      '#D97706',   // ambre miel (lisible sur fond blanc)
  accentLight: '#F59E0B',   // miel lumineux
  accentDark:  '#92400E',   // miel foncé / acajou
  accentGlow:  'rgba(217, 119, 6, 0.13)',

  /* ── Sémantique métier apicole ── */
  success:  '#15803D',   // vert champ        → colonie saine / récolte OK
  error:    '#DC2626',   // rouge critique     → colonie en danger
  warning:  '#EA580C',   // orange pollen      → surveillance nécessaire
  info:     '#7C3AED',   // violet royal       → reine / essaimage / banque
  purple:   '#8B5CF6',   // lavande clover     → référence florale / royale

  /* ── Texte — brun profond chaud ── */
  text:      '#1C0A00',   // brun très sombre — carnet d'apiculteur
  textMuted: '#78716C',   // gris chaud neutre
  textDim:   '#A07848',   // or ambré tamisé

  /* ── Graphiques ── */
  chart: ['#F59E0B', '#D97706', '#15803D', '#EA580C', '#8B5CF6', '#DC2626'],

  /* ── Grades santé colonie ── */
  gradeA: '#15803D',   // vert champ    → A : excellente santé
  gradeB: '#D97706',   // ambre miel    → B : bonne santé
  gradeC: '#EA580C',   // orange pollen → C : à surveiller
  gradeD: '#DC2626',   // rouge urgence → D : critique
};
