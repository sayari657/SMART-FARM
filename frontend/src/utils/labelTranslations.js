/**
 * YOLO model label translations — all models across Smart Farm AI.
 * Key  = exact label returned by the backend (case-sensitive).
 * Value = { en, fr, ar }
 */
export const LABEL_TRANSLATIONS = {

  // ── Livestock detection (model goat cow) ─────────────────────────────────
  cow:   { en: 'Cow',   fr: 'Vache',  ar: 'بقرة' },
  goat:  { en: 'Goat',  fr: 'Chèvre', ar: 'ماعز' },
  sheep: { en: 'Sheep', fr: 'Mouton', ar: 'خروف' },

  // ── Cow behavior (Model_cow_behavior_YOLOv11) ─────────────────────────────
  Lie:   { en: 'Lying',    fr: 'Couchée',  ar: 'مستلقية' },
  Stand: { en: 'Standing', fr: 'Debout',   ar: 'واقفة' },
  Walk:  { en: 'Walking',  fr: 'En marche', ar: 'تمشي' },

  // ── Goat disease (Model_goat_YOLOv11) ────────────────────────────────────
  'Cheesy gland':       { en: 'Cheesy Gland (CLA)',    fr: 'Lymphadénite caséeuse', ar: 'التهاب العقد اللمفاوية الجبني' },
  'Contagious ecthyma': { en: 'Contagious Ecthyma',    fr: 'Ecthyma contagieux',    ar: 'الإكتيما المعدي' },
  'Lice infestation':   { en: 'Lice Infestation',      fr: 'Infestation de poux',   ar: 'إصابة بالقمل' },
  Mange:                { en: 'Mange (Scabies)',        fr: 'Gale',                  ar: 'الجرب' },
  Ringworm:             { en: 'Ringworm',               fr: 'Teigne',                ar: 'داء الفطر الحلقي' },

  // ── Chicken disease (Model_chicken_YOLOv11) ───────────────────────────────
  'Chicken Favus':  { en: 'Chicken Favus',    fr: 'Favus du poulet',  ar: 'داء الفافوس في الدجاج' },
  'Fowl Pox':       { en: 'Fowl Pox',         fr: 'Variole aviaire',  ar: 'جدري الطيور' },
  coryza:           { en: 'Coryza',            fr: 'Coryza aviaire',   ar: 'كوريزا الدجاج' },
  crd:              { en: 'CRD (Mycoplasmosis)', fr: 'Mycoplasmose (CRD)', ar: 'المتفطرة (مرض الجهاز التنفسي)' },
  normal:           { en: 'Healthy',           fr: 'Sain',             ar: 'سليم' },
  weak_leg:         { en: 'Weak Leg',          fr: 'Patte faible',     ar: 'ضعف الأرجل' },

  // ── Chicken detection (Model_chicken_detection_YOLOv11) ───────────────────
  rooster: { en: 'Rooster / Chicken', fr: 'Coq / Poulet', ar: 'ديك / دجاج' },

  // ── Rabbit (Model_rabbit_YOLOv11) ─────────────────────────────────────────
  rabit:  { en: 'Rabbit', fr: 'Lapin', ar: 'أرنب' },
  rabbit: { en: 'Rabbit', fr: 'Lapin', ar: 'أرنب' },

  // ── Bee (bee/final_export) ────────────────────────────────────────────────
  bee:        { en: 'Bee',          fr: 'Abeille ouvrière', ar: 'نحلة عاملة' },
  drone:      { en: 'Drone (male)', fr: 'Faux-bourdon',     ar: 'ذكر النحل' },
  pollenbee:  { en: 'Pollen Bee',   fr: 'Abeille pollinisatrice', ar: 'نحلة الحبوب' },
  queen:      { en: 'Queen Bee',    fr: 'Reine',            ar: 'ملكة النحل' },

  // ── Leaves diseases (Detection diseases Leaves) ───────────────────────────
  Beans_Angular_LeafSpot:           { en: 'Beans Angular Leaf Spot',       fr: 'Haricot — Tache angulaire',        ar: 'بقعة ورقية زاوية في الفول' },
  Beans_Rust:                       { en: 'Beans Rust',                    fr: 'Rouille du haricot',               ar: 'صدأ الفول' },
  Strawberry_Angular_LeafSpot:      { en: 'Strawberry Angular Leaf Spot',  fr: 'Fraise — Tache angulaire',         ar: 'بقعة زاوية في الفراولة' },
  Strawberry_Anthracnose_Fruit_Rot: { en: 'Strawberry Anthracnose',        fr: 'Anthracnose de la fraise',         ar: 'عفن ثمار الفراولة' },
  Strawberry_Blossom_Blight:        { en: 'Strawberry Blossom Blight',     fr: 'Brûlure des fleurs — Fraise',      ar: 'لفحة أزهار الفراولة' },
  Strawberry_Gray_Mold:             { en: 'Strawberry Gray Mold',          fr: 'Botrytis de la fraise',            ar: 'العفن الرمادي في الفراولة' },
  Strawberry_Leaf_Spot:             { en: 'Strawberry Leaf Spot',          fr: 'Tache foliaire — Fraise',          ar: 'تبقع أوراق الفراولة' },
  Strawberry_Powdery_Mildew_Fruit:  { en: 'Strawberry Powdery Mildew (Fruit)', fr: 'Oïdium fraise (fruits)',      ar: 'البياض الدقيقي في ثمار الفراولة' },
  Strawberry_Powdery_Mildew_Leaf:   { en: 'Strawberry Powdery Mildew (Leaf)',  fr: 'Oïdium fraise (feuilles)',    ar: 'البياض الدقيقي في أوراق الفراولة' },
  Tomato_Blight:                    { en: 'Tomato Blight',                 fr: 'Mildiou de la tomate',             ar: 'اللفحة في الطماطم' },
  Tomato_Leaf_Mold:                 { en: 'Tomato Leaf Mold',              fr: 'Moisissure foliaire — Tomate',     ar: 'عفن أوراق الطماطم' },
  Tomato_Spider_Mites:              { en: 'Tomato Spider Mites',           fr: 'Acariens — Tomate',                ar: 'العناكب الحمراء في الطماطم' },

  // ── PlantDoc (Model_plantdoc_YOLOv11 — 30 classes) ───────────────────────
  'Apple Scab Leaf':                    { en: 'Apple Scab',                     fr: 'Tavelure du pommier',              ar: 'جرب التفاح' },
  'Apple leaf':                         { en: 'Apple Leaf (Healthy)',            fr: 'Feuille de pommier (saine)',       ar: 'ورقة تفاح (سليمة)' },
  'Apple rust leaf':                    { en: 'Apple Rust',                     fr: 'Rouille du pommier',               ar: 'صدأ التفاح' },
  'Bell_pepper leaf':                   { en: 'Bell Pepper Leaf (Healthy)',      fr: 'Poivron (sain)',                   ar: 'ورقة فلفل (سليمة)' },
  'Bell_pepper leaf spot':              { en: 'Bell Pepper Leaf Spot',          fr: 'Tache foliaire — Poivron',         ar: 'تبقع أوراق الفلفل' },
  'Blueberry leaf':                     { en: 'Blueberry Leaf (Healthy)',        fr: 'Myrtille (saine)',                 ar: 'ورقة عنب الدب (سليمة)' },
  'Cherry leaf':                        { en: 'Cherry Leaf (Healthy)',           fr: 'Cerisier (sain)',                  ar: 'ورقة كرز (سليمة)' },
  'Corn Gray leaf spot':                { en: 'Corn Gray Leaf Spot',            fr: 'Tache grise — Maïs',               ar: 'البقعة الرمادية في الذرة' },
  'Corn leaf blight':                   { en: 'Corn Leaf Blight',               fr: 'Brûlure foliaire — Maïs',          ar: 'لفحة أوراق الذرة' },
  'Corn rust leaf':                     { en: 'Corn Rust',                      fr: 'Rouille du maïs',                  ar: 'صدأ الذرة' },
  'Peach leaf':                         { en: 'Peach Leaf (Healthy)',            fr: 'Pêcher (sain)',                    ar: 'ورقة خوخ (سليمة)' },
  'Potato leaf':                        { en: 'Potato Leaf (Healthy)',           fr: 'Pomme de terre (saine)',           ar: 'ورقة بطاطا (سليمة)' },
  'Potato leaf early blight':           { en: 'Potato Early Blight',            fr: 'Alternariose — Pomme de terre',    ar: 'اللفحة المبكرة في البطاطا' },
  'Potato leaf late blight':            { en: 'Potato Late Blight',             fr: 'Mildiou — Pomme de terre',         ar: 'اللفحة المتأخرة في البطاطا' },
  'Raspberry leaf':                     { en: 'Raspberry Leaf (Healthy)',        fr: 'Framboisier (sain)',               ar: 'ورقة توت (سليمة)' },
  'Soyabean leaf':                      { en: 'Soybean Leaf (Healthy)',          fr: 'Soja (sain)',                      ar: 'ورقة فول الصويا (سليمة)' },
  'Soybean leaf':                       { en: 'Soybean Leaf (Healthy)',          fr: 'Soja (sain)',                      ar: 'ورقة فول الصويا (سليمة)' },
  'Squash Powdery mildew leaf':         { en: 'Squash Powdery Mildew',          fr: 'Oïdium — Courge',                  ar: 'البياض الدقيقي في القرع' },
  'Strawberry leaf':                    { en: 'Strawberry Leaf (Healthy)',       fr: 'Fraise (saine)',                   ar: 'ورقة فراولة (سليمة)' },
  'Tomato Early blight leaf':           { en: 'Tomato Early Blight',            fr: 'Alternariose — Tomate',            ar: 'اللفحة المبكرة في الطماطم' },
  'Tomato Septoria leaf spot':          { en: 'Tomato Septoria Leaf Spot',      fr: 'Septoriose — Tomate',              ar: 'بقعة سبتوريا في الطماطم' },
  'Tomato leaf':                        { en: 'Tomato Leaf (Healthy)',           fr: 'Tomate (saine)',                   ar: 'ورقة طماطم (سليمة)' },
  'Tomato leaf bacterial spot':         { en: 'Tomato Bacterial Spot',          fr: 'Bactériose — Tomate',              ar: 'البقعة البكتيرية في الطماطم' },
  'Tomato leaf late blight':            { en: 'Tomato Late Blight',             fr: 'Mildiou — Tomate',                 ar: 'اللفحة المتأخرة في الطماطم' },
  'Tomato leaf mosaic virus':           { en: 'Tomato Mosaic Virus',            fr: 'Virus de la mosaïque — Tomate',    ar: 'فيروس الموزاييك في الطماطم' },
  'Tomato leaf yellow virus':           { en: 'Tomato Yellow Leaf Curl Virus',  fr: 'TYLCV — Tomate',                   ar: 'فيروس تجعد الأوراق الأصفر' },
  'Tomato mold leaf':                   { en: 'Tomato Leaf Mold',               fr: 'Moisissure — Tomate',              ar: 'عفن أوراق الطماطم' },
  'Tomato two spotted spider mites leaf': { en: 'Tomato Spider Mites',          fr: 'Acariens — Tomate',                ar: 'العناكب الحمراء في الطماطم' },
  'grape leaf':                         { en: 'Grape Leaf (Healthy)',            fr: 'Vigne (saine)',                    ar: 'ورقة عنب (سليمة)' },
  'grape leaf black rot':               { en: 'Grape Black Rot',                fr: 'Pourriture noire — Vigne',         ar: 'العفن الأسود في العنب' },

  // ── Fire / Alert ──────────────────────────────────────────────────────────
  fire:  { en: 'Fire',  fr: 'Incendie', ar: 'حريق' },
  smoke: { en: 'Smoke', fr: 'Fumée',    ar: 'دخان' },
};

/**
 * Translate a YOLO label to the current language.
 * Falls back to the original label if no translation found.
 * @param {string} label  - raw label from YOLO model
 * @param {string} lang   - 'en' | 'fr' | 'ar'
 * @returns {string}
 */
export function translateLabel(label, lang = 'fr') {
  if (!label) return '';
  const entry = LABEL_TRANSLATIONS[label];
  if (!entry) return label; // unknown label → keep original
  return entry[lang] || entry.en || label;
}
