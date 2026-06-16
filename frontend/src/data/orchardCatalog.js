/**
 * Orchard catalog — diseases & phytosanitary treatments (médicaments) for
 * trees / plants, oriented to Tunisian agriculture (olive, citrus, general).
 *
 * Indicative reference dataset to standardise what gets logged on a tree's
 * history — names are bilingual (fr/ar); technical meta stays in French
 * (common usage in Tunisian agronomy). The UI always allows free text too,
 * so anything missing can still be typed. Doses are indicative — always
 * follow the product label and local regulations.
 */

/* ── Treatment categories ──────────────────────────────────────── */
export const TREAT_CATEGORIES = [
  { key: 'fongicide',  fr: 'Fongicide',   ar: 'مبيد فطري',   color: '#16a34a' },
  { key: 'insecticide',fr: 'Insecticide', ar: 'مبيد حشري',   color: '#d97706' },
  { key: 'acaricide',  fr: 'Acaricide',   ar: 'مبيد العناكب', color: '#dc2626' },
  { key: 'herbicide',  fr: 'Herbicide',   ar: 'مبيد أعشاب',  color: '#7c3aed' },
  { key: 'bio',        fr: 'Bio / naturel',ar: 'حيوي / طبيعي', color: '#059669' },
  { key: 'piege',      fr: 'Piège',       ar: 'مصيدة',       color: '#0891b2' },
  { key: 'nutrition',  fr: 'Nutrition',   ar: 'تغذية',       color: '#0ea5e9' },
];

/* ── Diseases / pests, tagged by tree species ──────────────────── */
/* species: 'olive' | 'orange' | 'lemon' | 'other' | 'all'           */
export const TREE_DISEASES = [
  // ── Olivier ──
  { key: 'oeil_paon',   fr: 'Œil de paon (cycloconium)', ar: 'عين الطاووس',          species: ['olive'] },
  { key: 'anthracnose', fr: 'Anthracnose',               ar: 'الأنثراكنوز',           species: ['olive', 'orange', 'lemon'] },
  { key: 'tuberculose', fr: "Tuberculose de l'olivier",  ar: 'سل الزيتون',            species: ['olive'] },
  { key: 'verticilliose',fr: 'Verticilliose',            ar: 'الذبول الفرتيسيلي',      species: ['olive'] },
  { key: 'mouche_olive',fr: "Mouche de l'olivier",       ar: 'ذبابة الزيتون',         species: ['olive'] },
  { key: 'psylle',      fr: "Psylle de l'olivier",       ar: 'بسيلا الزيتون',         species: ['olive'] },
  { key: 'cochenille',  fr: 'Cochenille noire',          ar: 'الحشرة القشرية السوداء', species: ['olive', 'orange', 'lemon'] },
  // ── Agrumes (orange / citron) ──
  { key: 'hlb',         fr: 'Huanglongbing (HLB)',       ar: 'مرض التدهور السريع HLB', species: ['orange', 'lemon'] },
  { key: 'chancre',     fr: 'Chancre citrique',          ar: 'التقرح البكتيري للحمضيات', species: ['orange', 'lemon'] },
  { key: 'tristeza',    fr: 'Tristeza (virus CTV)',      ar: 'فيروس التريستيزا',       species: ['orange', 'lemon'] },
  { key: 'fumagine',    fr: 'Fumagine (sooty mould)',    ar: 'العفن الهبابي',         species: ['orange', 'lemon'] },
  { key: 'mineuse',     fr: 'Mineuse des agrumes',       ar: 'حافرة أوراق الحمضيات',    species: ['orange', 'lemon'] },
  { key: 'acariens',    fr: 'Acariens (araignée rouge)', ar: 'العنكبوت الأحمر',        species: ['orange', 'lemon', 'olive'] },
  { key: 'chlorose',    fr: 'Chlorose / carence en fer', ar: 'الاصفرار / نقص الحديد',  species: ['orange', 'lemon', 'olive', 'other'] },
  // ── Général ──
  { key: 'oidium',      fr: 'Oïdium (blanc)',            ar: 'البياض الدقيقي',        species: ['other', 'olive'] },
  { key: 'mildiou',     fr: 'Mildiou',                   ar: 'البياض الزغبي',         species: ['other'] },
  { key: 'pourriture',  fr: 'Pourriture des racines',    ar: 'تعفن الجذور',           species: ['olive', 'orange', 'lemon', 'other'] },
  { key: 'pucerons',    fr: 'Pucerons',                  ar: 'المنّ',                 species: ['orange', 'lemon', 'other'] },
];

/* ── Treatments (médicaments) ──────────────────────────────────── */
/* `for` lists the disease keys each product addresses (for recommendations) */
export const TREE_TREATMENTS = [
  // Fongicides
  { key: 'bouillie_bordelaise', cat: 'fongicide', fr: 'Bouillie bordelaise', ar: 'مزيج بوردو',
    substance: 'Sulfate de cuivre + chaux', target: 'Œil de paon, anthracnose, chancre', dose: '1–2 % (automne/hiver)',
    for: ['oeil_paon', 'anthracnose', 'tuberculose', 'chancre', 'mildiou'] },
  { key: 'hydroxyde_cuivre', cat: 'fongicide', fr: 'Hydroxyde de cuivre', ar: 'هيدروكسيد النحاس',
    substance: 'Cuivre (Cu)', target: 'Maladies fongiques & bactériennes', dose: 'Selon étiquette',
    for: ['oeil_paon', 'anthracnose', 'chancre', 'mildiou'] },
  { key: 'oxychlorure_cuivre', cat: 'fongicide', fr: 'Oxychlorure de cuivre', ar: 'أوكسي كلورور النحاس',
    substance: 'Cuivre (Cu)', target: 'Cycloconium, chancre', dose: '300–500 g/hl',
    for: ['oeil_paon', 'chancre', 'anthracnose'] },
  { key: 'mancozebe', cat: 'fongicide', fr: 'Mancozèbe 80 % WP', ar: 'مانكوزيب',
    substance: 'Mancozèbe', target: 'Anthracnose, mildiou', dose: '200–250 g/hl',
    for: ['anthracnose', 'mildiou'] },
  { key: 'soufre', cat: 'fongicide', fr: 'Soufre mouillable', ar: 'الكبريت القابل للبلل',
    substance: 'Soufre', target: 'Oïdium, acariens', dose: '300–500 g/hl',
    for: ['oidium', 'acariens'] },
  { key: 'tebuconazole', cat: 'fongicide', fr: 'Tébuconazole', ar: 'تيبوكونازول',
    substance: 'Tébuconazole (triazole)', target: 'Oïdium, maladies foliaires', dose: 'Selon étiquette',
    for: ['oidium', 'anthracnose'] },
  { key: 'difenoconazole', cat: 'fongicide', fr: 'Difénoconazole', ar: 'ديفينوكونازول',
    substance: 'Difénoconazole', target: 'Maladies foliaires des agrumes', dose: 'Selon étiquette',
    for: ['anthracnose', 'oidium'] },

  // Insecticides
  { key: 'deltamethrine', cat: 'insecticide', fr: 'Deltaméthrine', ar: 'دلتامثرين',
    substance: 'Deltaméthrine (pyréthrinoïde)', target: 'Mouche olive, psylle, pucerons', dose: 'Selon étiquette',
    for: ['mouche_olive', 'psylle', 'pucerons'] },
  { key: 'lambda', cat: 'insecticide', fr: 'Lambda-cyhalothrine', ar: 'لامبدا سيهالوثرين',
    substance: 'Lambda-cyhalothrine', target: 'Insectes ravageurs', dose: 'Selon étiquette',
    for: ['psylle', 'pucerons', 'mouche_olive'] },
  { key: 'imidaclopride', cat: 'insecticide', fr: 'Imidaclopride', ar: 'إيميداكلوبريد',
    substance: 'Imidaclopride (néonicotinoïde)', target: 'Psylles vecteurs HLB, pucerons', dose: 'Selon étiquette',
    for: ['hlb', 'pucerons', 'psylle'] },
  { key: 'acetamipride', cat: 'insecticide', fr: 'Acétamipride', ar: 'أسيتاميبريد',
    substance: 'Acétamipride', target: 'Cochenilles, pucerons, vecteurs', dose: 'Selon étiquette',
    for: ['cochenille', 'pucerons', 'hlb'] },
  { key: 'huile_blanche', cat: 'insecticide', fr: 'Huile minérale (blanche)', ar: 'الزيت المعدني الأبيض',
    substance: 'Huile de paraffine', target: 'Cochenilles, œufs, fumagine', dose: '1–2 %',
    for: ['cochenille', 'fumagine', 'acariens'] },
  { key: 'pyriproxyfene', cat: 'insecticide', fr: 'Pyriproxyfène', ar: 'بيريبروكسيفين',
    substance: 'Pyriproxyfène (IGR)', target: 'Cochenilles (régulateur de croissance)', dose: 'Selon étiquette',
    for: ['cochenille'] },

  // Acaricides
  { key: 'abamectine', cat: 'acaricide', fr: 'Abamectine', ar: 'أبامكتين',
    substance: 'Abamectine', target: 'Araignée rouge, mineuse', dose: 'Selon étiquette',
    for: ['acariens', 'mineuse'] },

  // Bio / naturel
  { key: 'spinosad', cat: 'bio', fr: 'Spinosad', ar: 'سبينوساد',
    substance: 'Spinosad (bio)', target: 'Mouche olive, mineuse', dose: 'Appâts / pulvérisation',
    for: ['mouche_olive', 'mineuse'] },
  { key: 'bt', cat: 'bio', fr: 'Bacillus thuringiensis (Bt)', ar: 'عصيات تورنجينسيس',
    substance: 'Bt (biologique)', target: 'Chenilles / larves', dose: 'Selon étiquette',
    for: ['mineuse'] },
  { key: 'neem', cat: 'bio', fr: 'Huile de neem', ar: 'زيت النيم',
    substance: 'Azadirachtine', target: 'Pucerons, cochenilles, psylle', dose: '3–5 ml/L',
    for: ['pucerons', 'cochenille', 'psylle'] },
  { key: 'savon_noir', cat: 'bio', fr: 'Savon noir', ar: 'الصابون الأسود',
    substance: 'Savon potassique', target: 'Pucerons, cochenilles, fumagine', dose: '1–2 %',
    for: ['pucerons', 'cochenille', 'fumagine'] },
  { key: 'kaolin', cat: 'bio', fr: 'Kaolin (argile blanche)', ar: 'الكاولين',
    substance: 'Kaolinite', target: 'Barrière mouche olive, coups de soleil', dose: '3–5 %',
    for: ['mouche_olive'] },

  // Pièges
  { key: 'piege_mcphail', cat: 'piege', fr: 'Piège McPhail', ar: 'مصيدة ماكفايل',
    substance: 'Attractif alimentaire', target: 'Monitoring / capture mouche olive', dose: '1 piège / 2 arbres',
    for: ['mouche_olive'] },
  { key: 'piege_jaune', cat: 'piege', fr: 'Pièges chromatiques jaunes', ar: 'المصائد الصفراء اللاصقة',
    substance: 'Plaque engluée jaune', target: 'Psylles, pucerons, mineuse', dose: 'Plusieurs / arbre',
    for: ['psylle', 'pucerons', 'mineuse'] },

  // Nutrition
  { key: 'chelate_fer', cat: 'nutrition', fr: 'Chélate de fer (Fe-EDDHA)', ar: 'حديد مخلبي',
    substance: 'Fer chélaté', target: 'Chlorose ferrique', dose: 'Au sol, en fertirrigation',
    for: ['chlorose'] },
];

export const treatmentMeta = (tr) =>
  [tr.substance, tr.target && `cible : ${tr.target}`, tr.dose && `dose : ${tr.dose}`]
    .filter(Boolean).join(' · ');

/** Disease key best-matching a free-text label (for recommendations). */
export const matchDiseaseKey = (label) => {
  if (!label) return null;
  const l = label.toLowerCase();
  const hit = TREE_DISEASES.find(d => l.includes(d.fr.toLowerCase().split(' ')[0]) || (d.ar && label.includes(d.ar)));
  return hit ? hit.key : null;
};
