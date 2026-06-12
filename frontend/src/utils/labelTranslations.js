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
  fire:   { en: 'Fire',   fr: 'Incendie', ar: 'حريق' },
  smoke:  { en: 'Smoke',  fr: 'Fumée',    ar: 'دخان' },
  object: { en: 'Object', fr: 'Objet',    ar: 'جسم' },
  0: { en: 'Fire/smoke (class 0)', fr: 'Feu/fumée (classe 0)', ar: 'حريق/دخان (فئة 0)' },
  1: { en: 'Fire/smoke (class 1)', fr: 'Feu/fumée (classe 1)', ar: 'حريق/دخان (فئة 1)' },
  2: { en: 'Fire/smoke (class 2)', fr: 'Feu/fumée (classe 2)', ar: 'حريق/دخان (فئة 2)' },
  3: { en: 'Fire/smoke (class 3)', fr: 'Feu/fumée (classe 3)', ar: 'حريق/دخان (فئة 3)' },
  4: { en: 'Fire/smoke (class 4)', fr: 'Feu/fumée (classe 4)', ar: 'حريق/دخان (فئة 4)' },

  // ── Olivier (model olive-tree-diseases) ───────────────────────────────────
  Anthracnose:      { en: 'Anthracnose',              fr: "Anthracnose de l'olivier",  ar: 'الأنثراكنوز' },
  BlackScale:       { en: 'Black Scale',              fr: 'Cochenille noire',          ar: 'الحشرة القشرية السوداء' },
  OlivePeacockSpot: { en: 'Peacock Spot',             fr: 'Œil de paon',               ar: 'عين الطاووس' },
  Psyllid:          { en: 'Olive Psyllid',            fr: "Psylle de l'olivier",       ar: 'بسيلا الزيتون' },
  Tuberculosis:     { en: 'Olive Knot (Tuberculosis)', fr: "Tuberculose de l'olivier", ar: 'سل الزيتون (التدرن)' },

  // ── Citronnier (model lemon-leaf) ──────────────────────────────────────────
  anthracnose:      { en: 'Anthracnose',          fr: 'Anthracnose',             ar: 'الأنثراكنوز' },
  bacterial_blight: { en: 'Bacterial Blight',     fr: 'Brûlure bactérienne',     ar: 'اللفحة البكتيرية' },
  citrus_canker:    { en: 'Citrus Canker',        fr: 'Chancre citrique',        ar: 'تقرح الحمضيات' },
  curl_virus:       { en: 'Leaf Curl Virus',      fr: "Virus de l'enroulement",  ar: 'فيروس تجعد الأوراق' },
  deficiency_leaf:  { en: 'Nutrient Deficiency',  fr: 'Carence nutritive',       ar: 'نقص العناصر الغذائية' },
  dry_leaf:         { en: 'Dry Leaf',             fr: 'Feuille desséchée',       ar: 'ورقة جافة' },
  healthy_leaf:     { en: 'Healthy Leaf',         fr: 'Feuille saine',           ar: 'ورقة سليمة' },
  sooty_mould:      { en: 'Sooty Mould',          fr: 'Fumagine',                ar: 'العفن السخامي' },
  spider_mites:     { en: 'Spider Mites',         fr: 'Acariens (araignée rouge)', ar: 'العناكب الحمراء' },

  // ── Oranger (Model orange-leaf) ────────────────────────────────────────────
  Orange_Huanglongbing: { en: 'Huanglongbing (Citrus Greening)', fr: 'Dragon jaune (HLB)', ar: 'مرض التنين الأصفر (الاخضرار)' },
  Orange_canker:        { en: 'Citrus Canker',                   fr: 'Chancre citrique',   ar: 'تقرح الحمضيات' },
  Orange_healthy:       { en: 'Healthy',                         fr: 'Sain',               ar: 'سليم' },

  // ── Insectes & ravageurs (model insects_final) ────────────────────────────
  'army worm':                 { en: 'Army Worm',                fr: 'Chenille légionnaire',       ar: 'دودة الحشد' },
  'legume blister beetle':     { en: 'Legume Blister Beetle',    fr: 'Méloé des légumineuses',     ar: 'خنفساء البقوليات' },
  'red spider':                { en: 'Red Spider Mite',          fr: 'Araignée rouge',             ar: 'العنكبوت الأحمر' },
  'rice gall midge':           { en: 'Rice Gall Midge',          fr: 'Cécidomyie du riz',          ar: 'ذبابة عفصة الأرز' },
  'rice leaf roller':          { en: 'Rice Leaf Roller',         fr: 'Enrouleuse du riz',          ar: 'لفّافة أوراق الأرز' },
  'rice leafhopper':           { en: 'Rice Leafhopper',          fr: 'Cicadelle du riz',           ar: 'نطاط أوراق الأرز' },
  'rice water weevil':         { en: 'Rice Water Weevil',        fr: 'Charançon aquatique du riz', ar: 'سوسة الأرز المائية' },
  'wheat phloeothrips':        { en: 'Wheat Thrips',             fr: 'Thrips du blé',              ar: 'تربس القمح' },
  'white backed plant hopper': { en: 'White-backed Planthopper', fr: 'Cicadelle à dos blanc',      ar: 'نطاط النبات أبيض الظهر' },
  'yellow rice borer':         { en: 'Yellow Rice Borer',        fr: 'Foreur jaune du riz',        ar: 'ثاقبة الأرز الصفراء' },

  // ── Santé colonie (bee_health_cls — BeeImage) ─────────────────────────────
  healthy:                   { en: 'Healthy Colony',            fr: 'Colonie saine',                  ar: 'مستعمرة سليمة' },
  varroa_small_hive_beetles: { en: 'Varroa + Small Hive Beetle', fr: 'Varroa + petit coléoptère',     ar: 'فاروا + خنفساء الخلية الصغيرة' },
  few_varrao_hive_beetles:   { en: 'Light Varroa Infestation',  fr: 'Varroa (infestation légère)',    ar: 'فاروا (إصابة خفيفة)' },
  missing_queen:             { en: 'Missing Queen',             fr: 'Reine manquante',                ar: 'ملكة مفقودة' },
  hive_being_robbed:         { en: 'Hive Being Robbed',         fr: 'Pillage de la ruche',            ar: 'نهب الخلية' },
  ant_problems:              { en: 'Ant Problems',              fr: 'Invasion de fourmis',            ar: 'غزو النمل' },

  // ── PlantVillage (plantvillage_cls — 38 classes) ──────────────────────────
  Apple___Apple_scab:       { en: 'Apple Scab',            fr: 'Tavelure du pommier',          ar: 'جرب التفاح' },
  Apple___Black_rot:        { en: 'Apple Black Rot',       fr: 'Pourriture noire du pommier',  ar: 'العفن الأسود في التفاح' },
  Apple___Cedar_apple_rust: { en: 'Cedar Apple Rust',      fr: 'Rouille grillagée du pommier', ar: 'صدأ التفاح' },
  Apple___healthy:          { en: 'Apple (Healthy)',       fr: 'Pommier sain',                 ar: 'تفاح سليم' },
  Blueberry___healthy:      { en: 'Blueberry (Healthy)',   fr: 'Myrtille saine',               ar: 'عنب الدب سليم' },
  'Cherry_(including_sour)___Powdery_mildew': { en: 'Cherry Powdery Mildew', fr: 'Oïdium du cerisier', ar: 'البياض الدقيقي في الكرز' },
  'Cherry_(including_sour)___healthy':        { en: 'Cherry (Healthy)',      fr: 'Cerisier sain',      ar: 'كرز سليم' },
  'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': { en: 'Corn Gray Leaf Spot', fr: 'Cercosporiose du maïs', ar: 'تبقع سركسبورا في الذرة' },
  'Corn_(maize)___Common_rust_':         { en: 'Corn Common Rust',       fr: 'Rouille commune du maïs',    ar: 'الصدأ الشائع في الذرة' },
  'Corn_(maize)___Northern_Leaf_Blight': { en: 'Corn Northern Leaf Blight', fr: 'Helminthosporiose du maïs', ar: 'لفحة الأوراق الشمالية في الذرة' },
  'Corn_(maize)___healthy':              { en: 'Corn (Healthy)',         fr: 'Maïs sain',                  ar: 'ذرة سليمة' },
  Grape___Black_rot:                  { en: 'Grape Black Rot',          fr: 'Pourriture noire de la vigne', ar: 'العفن الأسود في العنب' },
  'Grape___Esca_(Black_Measles)':     { en: 'Grape Esca',               fr: 'Esca de la vigne',             ar: 'مرض الإسكا في العنب' },
  'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)': { en: 'Grape Leaf Blight', fr: 'Brûlure foliaire — Vigne', ar: 'لفحة أوراق العنب' },
  Grape___healthy:                    { en: 'Grape (Healthy)',          fr: 'Vigne saine',                  ar: 'عنب سليم' },
  'Orange___Haunglongbing_(Citrus_greening)': { en: 'Orange Huanglongbing', fr: 'Dragon jaune (HLB) — Oranger', ar: 'اخضرار الحمضيات (HLB)' },
  Peach___Bacterial_spot:   { en: 'Peach Bacterial Spot',  fr: 'Bactériose du pêcher',  ar: 'البقعة البكتيرية في الخوخ' },
  Peach___healthy:          { en: 'Peach (Healthy)',       fr: 'Pêcher sain',           ar: 'خوخ سليم' },
  'Pepper,_bell___Bacterial_spot': { en: 'Bell Pepper Bacterial Spot', fr: 'Bactériose du poivron', ar: 'البقعة البكتيرية في الفلفل' },
  'Pepper,_bell___healthy':        { en: 'Bell Pepper (Healthy)',      fr: 'Poivron sain',          ar: 'فلفل سليم' },
  Potato___Early_blight:    { en: 'Potato Early Blight',   fr: 'Alternariose — Pomme de terre', ar: 'اللفحة المبكرة في البطاطا' },
  Potato___Late_blight:     { en: 'Potato Late Blight',    fr: 'Mildiou — Pomme de terre',      ar: 'اللفحة المتأخرة في البطاطا' },
  Potato___healthy:         { en: 'Potato (Healthy)',      fr: 'Pomme de terre saine',          ar: 'بطاطا سليمة' },
  Raspberry___healthy:      { en: 'Raspberry (Healthy)',   fr: 'Framboisier sain',              ar: 'توت العليق سليم' },
  Soybean___healthy:        { en: 'Soybean (Healthy)',     fr: 'Soja sain',                     ar: 'فول الصويا سليم' },
  Squash___Powdery_mildew:  { en: 'Squash Powdery Mildew', fr: 'Oïdium de la courge',           ar: 'البياض الدقيقي في القرع' },
  Strawberry___Leaf_scorch: { en: 'Strawberry Leaf Scorch', fr: 'Brûlure foliaire — Fraise',    ar: 'لسعة أوراق الفراولة' },
  Strawberry___healthy:     { en: 'Strawberry (Healthy)',  fr: 'Fraisier sain',                 ar: 'فراولة سليمة' },
  Tomato___Bacterial_spot:  { en: 'Tomato Bacterial Spot', fr: 'Bactériose — Tomate',           ar: 'البقعة البكتيرية في الطماطم' },
  Tomato___Early_blight:    { en: 'Tomato Early Blight',   fr: 'Alternariose — Tomate',         ar: 'اللفحة المبكرة في الطماطم' },
  Tomato___Late_blight:     { en: 'Tomato Late Blight',    fr: 'Mildiou — Tomate',              ar: 'اللفحة المتأخرة في الطماطم' },
  Tomato___Leaf_Mold:       { en: 'Tomato Leaf Mold',      fr: 'Moisissure foliaire — Tomate',  ar: 'عفن أوراق الطماطم' },
  Tomato___Septoria_leaf_spot: { en: 'Tomato Septoria Spot', fr: 'Septoriose — Tomate',         ar: 'بقعة سبتوريا في الطماطم' },
  'Tomato___Spider_mites Two-spotted_spider_mite': { en: 'Tomato Spider Mites', fr: 'Acariens — Tomate', ar: 'العناكب الحمراء في الطماطم' },
  Tomato___Target_Spot:     { en: 'Tomato Target Spot',    fr: 'Corynesporiose — Tomate',       ar: 'البقعة المستهدفة في الطماطم' },
  Tomato___Tomato_Yellow_Leaf_Curl_Virus: { en: 'Tomato Yellow Leaf Curl Virus', fr: 'TYLCV — Tomate', ar: 'فيروس تجعد الأوراق الأصفر' },
  Tomato___Tomato_mosaic_virus: { en: 'Tomato Mosaic Virus', fr: 'Virus de la mosaïque — Tomate', ar: 'فيروس الموزاييك في الطماطم' },
  Tomato___healthy:         { en: 'Tomato (Healthy)',      fr: 'Tomate saine',                  ar: 'طماطم سليمة' },
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

/**
 * Full trilingual entry for a label (used by ModelClassesInfo).
 * Falls back to a prettified version of the raw label for the 3 languages.
 * @param {string} label - raw label from YOLO model
 * @returns {{en: string, fr: string, ar: string}}
 */
export function getLabelEntry(label) {
  const entry = LABEL_TRANSLATIONS[label] || LABEL_TRANSLATIONS[String(label).toLowerCase()];
  if (entry) return entry;
  const pretty = String(label).replace(/___|_/g, ' ').trim();
  return { en: pretty, fr: pretty, ar: pretty };
}
