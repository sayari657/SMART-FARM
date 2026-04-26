/**
 * BeeConstants — "Champ de Fleurs" Design System
 * Palette calquée sur la logique métier de l'apiculture :
 *   Miel/cire   → ambre chaud (accent principal)
 *   Santé/champ → vert de champ (success)
 *   Reine       → violet royal (info/queen)
 *   Alerte      → orange pollen (warning)
 *   Critique    → rouge (error)
 *   Fonds       → brun-ambre sombre (cire de ruche)
 */
export const COLORS = {
  /* ── Fonds — brun cire d'abeille, pas de bleu froid ── */
  bg:         '#0E0700',                       // intérieur de ruche (nuit)
  bg2:        '#180C00',                       // légèrement plus clair
  surface:    'rgba(34, 18, 2, 0.97)',         // panneau cire sombre
  surface2:   'rgba(52, 30, 5, 0.82)',         // panneau cire moyen
  glass:      'rgba(255, 200, 50, 0.06)',      // reflet verre doré

  /* ── Bordures — miel doré ── */
  border:     'rgba(245, 175, 40, 0.16)',
  borderHigh: 'rgba(245, 158, 11, 0.58)',

  /* ── Accent principal — miel liquide ── */
  accent:      '#F59E0B',   // miel pur
  accentLight: '#FCD34D',   // pollen clair
  accentDark:  '#B45309',   // miel foncé
  accentGlow:  'rgba(245, 158, 11, 0.22)',

  /* ── Sémantique métier apicole ── */
  success:  '#65A30D',   // vert de champ  → colonie en bonne santé / récolte OK
  error:    '#EF4444',   // rouge critique → colonie en danger
  warning:  '#F97316',   // orange pollen  → surveillance nécessaire
  info:     '#A855F7',   // violet royal   → reine / essaimage / banque reines
  purple:   '#C084FC',   // lavande clover → référence florale/royale

  /* ── Texte — crème chaude, jamais blanc froid ── */
  text:      '#FFF7ED',   // crème orange-chaude
  textMuted: '#A08060',   // brun-or discret
  textDim:   '#C4965A',   // or tamisé

  /* ── Graphiques ── */
  chart: ['#FCD34D', '#F59E0B', '#65A30D', '#F97316', '#A855F7', '#EF4444'],

  /* ── Grades santé colonie ── */
  gradeA: '#65A30D',   // vert champ    → A : excellente santé
  gradeB: '#F59E0B',   // or miel       → B : bonne santé
  gradeC: '#F97316',   // orange pollen → C : à surveiller
  gradeD: '#EF4444',   // rouge urgence → D : critique
};
