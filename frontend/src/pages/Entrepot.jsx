import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useTranslation } from 'react-i18next';
import {
  Warehouse, Sprout, FlaskConical, ShieldAlert, Shovel,
  Droplets, Beef, Package, Wrench, HardHat, Layers,
  ChevronDown, ChevronUp, Search, X, Plus, Pencil, Trash2,
  BarChart3, CheckCircle2, AlertTriangle, Save, Bot, Send,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { warehouseAPI } from '../services/api';
import toast from 'react-hot-toast';

const ICON_MAP = {
  Sprout, FlaskConical, ShieldAlert, Shovel, Droplets,
  Beef, Package, Layers, Wrench, HardHat, Warehouse,
};

const STATUS_MAP = {
  available: { cls: 'badge-success', ar: 'متوفر',  fr: 'Disponible' },
  limited:   { cls: 'badge-warning', ar: 'محدود',  fr: 'Limité'     },
  out:       { cls: 'badge-danger',  ar: 'منتهي',  fr: 'Épuisé'     },
};

const EMPTY_FORM = {
  category_id: '', name_ar: '', name_fr: '', emoji: '📦',
  description: '', quantity: 0, unit: 'unités',
  min_quantity: 5, entry_date: '', expiry_date: '', notes: '',
};

const PRESET_COLORS = [
  '#16a34a','#0ea5e9','#dc2626','#d97706','#0891b2',
  '#7c3aed','#ca8a04','#059669','#64748b','#ea580c','#f59e0b','#e11d48',
];

// ── Translations ─────────────────────────────────────────────────────────────
const TR = {
  ar: {
    dir: 'rtl',
    pageTitle:        'مستودع المزرعة الشامل',
    pageSubtitle:     'جميع المعدات والمستلزمات — إدارة كاملة للمخزون',
    navSubtitle:      (items, cats) => `${items} مقال · ${cats} فئة`,
    kpiCats:          'فئات', kpiArticles: 'مقالات',
    kpiAvail:         'التوفر', kpiLow: 'مخزون ناقص',
    search:           'بحث في المنتجات...',
    newCat:           'فئة جديدة',
    results:          (n, c) => `${n} نتيجة في ${c} فئة`,
    noResult:         'لا توجد نتائج',
    noResultSub:      (q) => `لم يُعثر على "${q}"`,
    noItems:          'لا توجد مقالات — اضغط إضافة',
    addItem:          'إضافة',
    editCat:          'تعديل الفئة',
    deleteCat:        'حذف الفئة',
    articleCount:     (n) => `${n} مقال`,
    artBadge:         (n) => `${n} مقال`,
    // Item form
    addItemTitle:     'إضافة مقال جديد',
    editItemTitle:    'تعديل المقال',
    emojiLabel:       'رمز',
    emojiChange:      'انقر لتغيير الرمز',
    emojiChoose:      'انقر لاختيار رمز...',
    emojiSearch:      'ابحث عن رمز...',
    nameLabel:        'الاسم *',
    namePh:           'مثال: بذور الطماطم',
    descLabel:        'الوصف',
    descPh:           'مثال: F1 هجين 25 كغ',
    qtyLabel:         'الكمية الحالية *',
    unitLabel:        'الوحدة',
    unitPh:           'وحدات',
    threshLabel:      'حد تنبيه نقص المخزون',
    entryLabel:       'تاريخ الدخول',
    expiryLabel:      'تاريخ الانتهاء',
    notesLabel:       'ملاحظات',
    notesPh:          'معلومات إضافية...',
    cancel:           'إلغاء',
    save:             'حفظ التعديلات',
    add:              'إضافة المقال',
    saving:           'جاري الحفظ...',
    // Category form
    newCatTitle:      'إنشاء فئة جديدة',
    editCatTitle:     'تعديل الفئة',
    catNameFr:        'الاسم بالفرنسية *',
    catNameFrPh:      'مثال: Matériel d\'irrigation',
    catNameAr:        'الاسم بالعربية',
    catNameArPh:      'مثال: مواد الري',
    colorLabel:       'اللون',
    imageLabel:       'صورة الفئة',
    imageOpt:         '(اختياري)',
    catSave:          'حفظ',
    catCreate:        'إنشاء',
    catSaving:        'جاري الحفظ...',
    // Delete cat
    delCat1Title:     'حذف الفئة؟',
    delCat1Sub:       (n) => `تحتوي هذه الفئة على ${n} مقال.`,
    delCat1Btn:       'متابعة ←',
    delCat2Title:     'تأكيد نهائي',
    delCat2Sub:       (name) => `ستُحذف جميع مقالات "${name}" نهائياً.`,
    delCat2Warn:      'هذا الإجراء لا يمكن التراجع عنه.',
    delCat2Btn:       'حذف نهائياً',
    delCatting:       'جاري الحذف...',
    // Delete item
    delItemTitle:     'تأكيد الحذف',
    delItemSub:       'هل تريد حذف هذا المقال نهائياً؟',
    delItemBtn:       'حذف',
    deleting:         '...',
    // Toast
    toastNameReq:     'الاسم مطلوب',
    toastSaved:       'تم الحفظ',
    toastAdded:       'تمت الإضافة',
    toastSaveErr:     'خطأ في الحفظ',
    toastCatSaved:    'تم تحديث الفئة',
    toastCatCreated:  'تم إنشاء الفئة',
    toastCatErr:      'خطأ في الحفظ',
    toastItemDel:     'تم حذف المقال',
    toastItemDelErr:  'خطأ في الحذف',
    toastCatDel:      'تم حذف الفئة',
    toastCatDelErr:   'خطأ في الحذف',
    toastQtyUp:       'تم تحديث الكمية',
    toastQtyErr:      'خطأ',
    toastLoadErr:     'خطأ في التحميل',
    initCats:         'تهيئة الفئات...',
    expiry:           'ان.',
  },
  fr: {
    dir: 'ltr',
    pageTitle:        'Entrepôt de la Ferme',
    pageSubtitle:     'Gestion complète du stock — ajout, modification et suivi des quantités',
    navSubtitle:      (items, cats) => `${items} articles · ${cats} catégories`,
    kpiCats:          'Catégories', kpiArticles: 'Articles',
    kpiAvail:         'Disponibilité', kpiLow: 'Stock faible',
    search:           'Rechercher un article...',
    newCat:           'Nouvelle catégorie',
    results:          (n, c) => `${n} résultat(s) dans ${c} catégorie(s)`,
    noResult:         'Aucun résultat',
    noResultSub:      (q) => `Aucun article pour "${q}"`,
    noItems:          'Aucun article — cliquez sur Ajouter',
    addItem:          'Ajouter',
    editCat:          'Modifier la catégorie',
    deleteCat:        'Supprimer la catégorie',
    articleCount:     (n) => `${n} article(s)`,
    artBadge:         (n) => `${n} art.`,
    // Item form
    addItemTitle:     'Ajouter un article',
    editItemTitle:    'Modifier l\'article',
    emojiLabel:       'Emoji',
    emojiChange:      'Cliquer pour changer l\'emoji',
    emojiChoose:      'Cliquer pour choisir un emoji…',
    emojiSearch:      'Rechercher un emoji…',
    nameLabel:        'Nom *',
    namePh:           'ex: Semences de tomates',
    descLabel:        'Description',
    descPh:           'ex: F1 hybride 25kg',
    qtyLabel:         'Quantité actuelle *',
    unitLabel:        'Unité',
    unitPh:           'unités',
    threshLabel:      'Seuil alerte stock faible',
    entryLabel:       'Date d\'entrée',
    expiryLabel:      'Date d\'expiration',
    notesLabel:       'Notes',
    notesPh:          'Infos supplémentaires…',
    cancel:           'Annuler',
    save:             'Enregistrer les modifications',
    add:              'Ajouter l\'article',
    saving:           'Enregistrement…',
    // Category form
    newCatTitle:      'Nouvelle catégorie',
    editCatTitle:     'Modifier la catégorie',
    catNameFr:        'Nom français *',
    catNameFrPh:      'ex: Matériel d\'irrigation',
    catNameAr:        'Nom arabe',
    catNameArPh:      'مثال: مواد الري',
    colorLabel:       'Couleur',
    imageLabel:       'Image de catégorie',
    imageOpt:         '(optionnel)',
    catSave:          'Enregistrer',
    catCreate:        'Créer',
    catSaving:        'Enregistrement…',
    // Delete cat
    delCat1Title:     'Supprimer la catégorie ?',
    delCat1Sub:       (n) => `Cette catégorie contient ${n} article(s).`,
    delCat1Btn:       'Continuer →',
    delCat2Title:     'Confirmation finale',
    delCat2Sub:       (name) => `Tous les articles de "${name}" seront supprimés définitivement.`,
    delCat2Warn:      'Cette action est irréversible.',
    delCat2Btn:       'Supprimer définitivement',
    delCatting:       'Suppression…',
    // Delete item
    delItemTitle:     'Confirmer la suppression',
    delItemSub:       'Voulez-vous supprimer définitivement cet article ?',
    delItemBtn:       'Supprimer',
    deleting:         '…',
    // Toast
    toastNameReq:     'Le nom est requis',
    toastSaved:       'Article mis à jour',
    toastAdded:       'Article ajouté',
    toastSaveErr:     'Erreur lors de la sauvegarde',
    toastCatSaved:    'Catégorie mise à jour',
    toastCatCreated:  'Catégorie créée',
    toastCatErr:      'Erreur lors de la sauvegarde',
    toastItemDel:     'Article supprimé',
    toastItemDelErr:  'Erreur de suppression',
    toastCatDel:      'Catégorie supprimée',
    toastCatDelErr:   'Erreur de suppression',
    toastQtyUp:       'Quantité mise à jour',
    toastQtyErr:      'Erreur',
    toastLoadErr:     'Erreur de chargement',
    initCats:         'Initialisation des catégories…',
    expiry:           'exp.',
  },
};
TR.en = TR.fr; // English falls back to French UI

// ─────────────────────────────────────────────────────────────────────────────

export default function Entrepot() {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'fr';
  const T    = TR[lang] || TR.fr;
  const rtl  = T.dir === 'rtl';
  const dir  = { direction: T.dir };

  // item name by language
  const itemName = (item) => (lang === 'ar' ? item.name_ar : item.name_fr) || item.name_ar || item.name_fr;
  const catName  = (cat)  => (lang === 'ar' ? cat.name_ar  : cat.name_fr)  || cat.name_ar  || cat.name_fr;

  // ── data ─────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [seeding, setSeeding]       = useState(false);

  // ── UI ───────────────────────────────────────────────────────────────────
  const [openSections, setOpenSections] = useState({});
  const [search, setSearch]             = useState('');

  // ── item CRUD ─────────────────────────────────────────────────────────────
  const [showForm, setShowForm]               = useState(false);
  const [editing, setEditing]                 = useState(null);
  const [form, setForm]                       = useState(EMPTY_FORM);
  const [saving, setSaving]                   = useState(false);
  const [confirmDelete, setConfirmDelete]     = useState(null); // stores full item object
  const [deleting, setDeleting]               = useState(false);

  // ── category CRUD ─────────────────────────────────────────────────────────
  const [showCatForm, setShowCatForm]         = useState(false);
  const [editingCat, setEditingCat]           = useState(null);
  const [catForm, setCatForm]                 = useState({ name_ar: '', name_fr: '', icon: 'Package', color: '#16a34a', emoji: '' });
  const [savingCat, setSavingCat]             = useState(false);
  const [deleteCatStep, setDeleteCatStep]     = useState(0);
  const [catToDelete, setCatToDelete]         = useState(null);
  const [deletingCat, setDeletingCat]         = useState(false);

  // ── emoji pickers ─────────────────────────────────────────────────────────
  const [showEmojiPicker, setShowEmojiPicker]         = useState(false);
  const emojiPickerRef                                 = useRef(null);
  const [showItemEmojiPicker, setShowItemEmojiPicker] = useState(false);
  const itemEmojiPickerRef                             = useRef(null);

  // ── reseed ────────────────────────────────────────────────────────────────
  const [showReseed, setShowReseed]   = useState(false);
  const [reseeding, setReseeding]     = useState(false);

  const handleReseed = async () => {
    setReseeding(true);
    try {
      await warehouseAPI.reseed();
      toast.success(rtl ? 'تم إعادة تهيئة المقالات' : 'Articles réinitialisés');
      setShowReseed(false);
      load();
    } catch {
      toast.error(rtl ? 'خطأ في الإعادة' : 'Erreur lors de la réinitialisation');
    } finally { setReseeding(false); }
  };

  // ── AI assistant ──────────────────────────────────────────────────────────
  const [showAI, setShowAI]         = useState(false);
  const [aiInput, setAiInput]       = useState('');
  const [aiMessages, setAiMessages] = useState([]);
  const [aiLoading, setAiLoading]   = useState(false);
  const aiChatRef                   = useRef(null);

  // ── quick qty ─────────────────────────────────────────────────────────────
  const [qtyEdit, setQtyEdit]   = useState(null);
  const [qtyValue, setQtyValue] = useState('');

  // close emoji pickers on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const h = (e) => { if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) setShowEmojiPicker(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!showItemEmojiPicker) return;
    const h = (e) => { if (itemEmojiPickerRef.current && !itemEmojiPickerRef.current.contains(e.target)) setShowItemEmojiPicker(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showItemEmojiPicker]);

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    warehouseAPI.categories()
      .then(res => {
        const cats = res.data;
        setCategories(cats);
        setOpenSections(prev => {
          const next = {};
          cats.forEach(c => { next[c.id] = prev[c.id] ?? false; });
          return next;
        });
      })
      .catch(() => toast.error(T.toastLoadErr))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const SEED_VERSION = 'warehouse_seed_v4';

  useEffect(() => {
    if (loading) return;
    const emptyCats  = categories.filter(c => (c.items?.length ?? 0) === 0);
    const alreadyUp  = localStorage.getItem(SEED_VERSION);

    if (categories.length === 0) {
      // Fresh DB — full seed
      setSeeding(true);
      warehouseAPI.seed()
        .then(() => { localStorage.setItem(SEED_VERSION, '1'); load(); })
        .catch(() => {}).finally(() => setSeeding(false));
    } else if (!alreadyUp) {
      // DB exists but emojis may be outdated — force reseed all default items
      setSeeding(true);
      warehouseAPI.reseed()
        .then(() => { localStorage.setItem(SEED_VERSION, '1'); load(); })
        .catch(() => {}).finally(() => setSeeding(false));
    } else if (emptyCats.length > 0) {
      // Some categories have no items (manually deleted) — fill them
      setSeeding(true);
      warehouseAPI.seedItems()
        .then(() => load()).catch(() => {}).finally(() => setSeeding(false));
    }
  }, [loading, categories]); // eslint-disable-line

  // ── stats ─────────────────────────────────────────────────────────────────
  const allItems      = useMemo(() => categories.flatMap(c => c.items || []), [categories]);
  const totalItems    = allItems.length;
  const availPct      = totalItems > 0 ? Math.round((allItems.filter(i => i.status === 'available').length / totalItems) * 100) : 0;
  const lowStockCount = allItems.filter(i => i.status === 'limited').length;

  // Alert items — out first, then low — drives alert strip + AI badge
  const alertItems = useMemo(() =>
    allItems
      .filter(i => i.status === 'limited' || i.status === 'out')
      .sort((a, b) => (a.status === 'out' ? 0 : 1) - (b.status === 'out' ? 0 : 1)),
    [allItems]
  );

  // ── search ────────────────────────────────────────────────────────────────
  const filteredCats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories.map(c => ({ ...c, filtered: c.items || [] }));
    return categories
      .map(c => ({
        ...c,
        filtered: (c.items || []).filter(i =>
          i.name_ar.includes(q) || i.name_fr.toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q)
        ),
      }))
      .filter(c => c.filtered.length > 0);
  }, [categories, search]);

  const isSearching   = search.trim().length > 0;
  const totalFiltered = filteredCats.reduce((s, c) => s + c.filtered.length, 0);
  const toggle = id => setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));

  // ── item form ─────────────────────────────────────────────────────────────
  const openCreate = (catId) => { setEditing(null); setForm({ ...EMPTY_FORM, category_id: catId }); setShowForm(true); };
  const openEdit   = (item)  => {
    setEditing(item);
    setForm({
      category_id: item.category_id, name_ar: item.name_ar, name_fr: item.name_fr,
      emoji: item.emoji || '📦', description: item.description || '',
      quantity: item.quantity, unit: item.unit || 'unités', min_quantity: item.min_quantity ?? 5,
      entry_date:  item.entry_date  ? item.entry_date.slice(0, 10)  : '',
      expiry_date: item.expiry_date ? item.expiry_date.slice(0, 10) : '',
      notes: item.notes || '',
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); setShowItemEmojiPicker(false); };

  // ── auto stock alert ─────────────────────────────────────────────────────
  const createStockAlert = useCallback(async (item, catName) => {
    const isOut = Number(item.quantity) <= 0;
    const isLow = !isOut && Number(item.quantity) <= Number(item.min_quantity || 5);
    if (!isOut && !isLow) return;
    const name = item.name_fr || item.name_ar;
    try {
      await warehouseAPI.alerts.create({
        item_id:       item.id   || null,
        item_name:     name,
        category_name: catName   || '',
        emoji:         item.emoji || '📦',
        alert_type:    isOut ? 'stock_out' : 'stock_low',
        severity:      isOut ? 'critical'  : 'warning',
        message:       isOut
          ? `Rupture de stock : ${name} — quantité = 0`
          : `Stock faible : ${name} — ${item.quantity} ${item.unit || ''} restant(s)`,
      });
    } catch { /* silent — alert creation is non-blocking */ }
  }, []); // eslint-disable-line

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name_ar.trim()) { toast.error(T.toastNameReq); return; }
    setSaving(true);
    const payload = {
      ...form,
      name_fr:      form.name_fr.trim() || form.name_ar,
      category_id:  Number(form.category_id),
      quantity:     Number(form.quantity),
      min_quantity: Number(form.min_quantity),
      entry_date:   form.entry_date  || null,
      expiry_date:  form.expiry_date || null,
    };
    try {
      let saved;
      if (editing) { const r = await warehouseAPI.update(editing.id, payload); saved = r.data; toast.success(T.toastSaved); }
      else         { const r = await warehouseAPI.create(payload);              saved = r.data; toast.success(T.toastAdded); }
      const catName = categories.find(c => c.id === Number(form.category_id))?.name_fr || '';
      await createStockAlert({ ...payload, id: saved?.id }, catName);
      closeForm(); load();
    } catch { toast.error(T.toastSaveErr); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try { await warehouseAPI.delete(confirmDelete.id); toast.success(T.toastItemDel); setConfirmDelete(null); load(); }
    catch { toast.error(T.toastItemDelErr); }
    finally { setDeleting(false); }
  };

  const saveQty = async (item) => {
    const n = parseFloat(qtyValue);
    if (isNaN(n) || n < 0) { setQtyEdit(null); return; }
    try {
      await warehouseAPI.update(item.id, { quantity: n });
      toast.success(T.toastQtyUp);
      const catName = categories.find(c => c.id === item.category_id)?.name_fr || '';
      await createStockAlert({ ...item, quantity: n }, catName);
      load();
    }
    catch { toast.error(T.toastQtyErr); }
    finally { setQtyEdit(null); }
  };

  const sendAI = async (text) => {
    const q = (text || aiInput).trim();
    if (!q) return;
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', text: q }]);
    setAiLoading(true);
    try {
      const res = await warehouseAPI.assistant(q, lang);
      setAiMessages(prev => [...prev, { role: 'ai', text: res.data?.response || '—' }]);
    } catch {
      setAiMessages(prev => [...prev, { role: 'ai', text: rtl ? 'حدث خطأ في الاتصال.' : 'Erreur de connexion à STOKKY.' }]);
    } finally {
      setAiLoading(false);
      setTimeout(() => aiChatRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50);
    }
  };

  const fld = (key) => ({ value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });

  // ── category form ─────────────────────────────────────────────────────────
  const openCreateCat = () => { setEditingCat(null); setCatForm({ name_ar: '', name_fr: '', icon: 'Package', color: '#16a34a', emoji: '' }); setShowCatForm(true); };
  const openEditCat   = (cat) => { setEditingCat(cat); setCatForm({ name_ar: cat.name_ar, name_fr: cat.name_fr, icon: cat.icon || 'Package', color: cat.color, emoji: cat.emoji || '' }); setShowCatForm(true); };
  const closeCatForm  = () => { setShowCatForm(false); setEditingCat(null); setShowEmojiPicker(false); };

  const handleSaveCat = async (e) => {
    e.preventDefault();
    const nameReq = (catForm.name_fr || catForm.name_ar || '').trim();
    if (!nameReq) { toast.error(T.toastNameReq); return; }
    setSavingCat(true);
    const payload = {
      ...catForm,
      name_fr: catForm.name_fr.trim() || catForm.name_ar,
      name_ar: catForm.name_ar.trim() || catForm.name_fr,
    };
    try {
      if (editingCat) { await warehouseAPI.updateCategory(editingCat.id, payload); toast.success(T.toastCatSaved); }
      else            { await warehouseAPI.createCategory(payload);                  toast.success(T.toastCatCreated); }
      closeCatForm(); load();
    } catch { toast.error(T.toastCatErr); }
    finally { setSavingCat(false); }
  };

  const requestDeleteCat = (cat) => { setCatToDelete(cat); setDeleteCatStep(1); };
  const handleDeleteCat  = async () => {
    if (!catToDelete) return;
    setDeletingCat(true);
    try { await warehouseAPI.deleteCategory(catToDelete.id); toast.success(T.toastCatDel); setDeleteCatStep(0); setCatToDelete(null); load(); }
    catch { toast.error(T.toastCatDelErr); }
    finally { setDeletingCat(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER helpers
  // ─────────────────────────────────────────────────────────────────────────
  const modalBox = (maxW = 480) => ({
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', padding: '28px 28px 24px',
    width: '100%', maxWidth: maxW, maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  });
  const overlay = (z = 1000) => ({
    position: 'fixed', inset: 0, zIndex: z,
    background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(5px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    ...dir,
  });
  const emojiPickerBtn = (emoji, open, color = '#0ea5e9') => ({
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    background: 'var(--color-surface-2, var(--color-bg))',
    border: `1.5px dashed ${open ? color : 'var(--color-border)'}`,
    borderRadius: 'var(--radius)', padding: '8px 12px',
    cursor: 'pointer', transition: 'border-color .2s',
  });

  // ─────────────────────────────────────────────────────────────────────────
  if (loading || seeding) return (
    <>
      <Navbar title={T.pageTitle} subtitle="…" />
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, ...dir }}>
        <div className="spinner" />
        {seeding && <p style={{ marginLeft: 12, color: 'var(--color-text-3)' }}>{T.initCats}</p>}
      </div>
    </>
  );

  return (
    <>
      <Navbar
        title={T.pageTitle}
        subtitle={T.navSubtitle(totalItems, categories.length)}
      />

      <div className="page-content" style={dir}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
            🏪 {T.pageTitle}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-3)' }}>{T.pageSubtitle}</p>
        </div>

        {/* ── KPI bar ── */}
        <div className="kpi-grid" style={{ marginBottom: 28 }}>
          {[
            { icon: BarChart3,     value: categories.length, label: T.kpiCats,     color: '#16a34a' },
            { icon: Package,       value: totalItems,        label: T.kpiArticles,  color: '#0ea5e9' },
            { icon: CheckCircle2,  value: `${availPct}%`,   label: T.kpiAvail,     color: '#059669' },
            { icon: AlertTriangle, value: lowStockCount,    label: T.kpiLow,       color: '#f59e0b' },
          ].map(({ icon: Icon, value, label, color }) => (
            <div className="kpi-box" key={label}>
              <div className="kpi-icon" style={{ background: color + '18', color }}><Icon size={20} /></div>
              <div>
                <div className="kpi-value" style={{ color }}>{value}</div>
                <div className="kpi-label">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Alert Strip ── */}
        {alertItems.length > 0 && (
          <div style={{
            marginBottom: 20, padding: '12px 16px',
            background: 'rgba(239,68,68,0.04)',
            border: '1.5px solid rgba(239,68,68,0.22)',
            borderRadius: 'var(--radius-lg)',
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
                  {alertItems.filter(i => i.status === 'out').length > 0 && (
                    <span style={{ marginRight: 6 }}>
                      🔴 {alertItems.filter(i => i.status === 'out').length} {rtl ? 'نفاد' : 'rupture(s)'}
                    </span>
                  )}
                  {alertItems.filter(i => i.status === 'limited').length > 0 && (
                    <span style={{ color: '#f59e0b' }}>
                      🟡 {alertItems.filter(i => i.status === 'limited').length} {rtl ? 'مخزون ناقص' : 'stock(s) faible'}
                    </span>
                  )}
                </span>
              </div>
              <button onClick={() => setShowAI(true)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg,#7c3aed,#0ea5e9)',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>
                <Bot size={12} /> {rtl ? 'تحليل بالذكاء الاصطناعي' : 'Analyser avec l\'IA'}
              </button>
            </div>
            {/* Scrollable chips */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {alertItems.map(item => {
                const isOut = item.status === 'out';
                return (
                  <button
                    key={item.id}
                    onClick={() => setOpenSections(prev => ({ ...prev, [item.category_id]: true }))}
                    style={{
                      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
                      background: isOut ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                      border: `1px solid ${isOut ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                      borderRadius: 10, padding: '7px 12px', cursor: 'pointer', textAlign: rtl ? 'right' : 'left',
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{item.emoji}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                        {lang === 'ar' ? item.name_ar : item.name_fr}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', color: isOut ? '#ef4444' : '#f59e0b' }}>
                        {item.quantity} {item.unit}
                        {isOut ? (rtl ? ' — نفاد' : ' — Rupture') : (rtl ? ' — ناقص' : ' — Faible')}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Search + Nouvelle catégorie ── */}
        <div className="control-row" style={{ marginBottom: 20 }}>
          <div className="control-item-search" style={{ flex: 1, position: 'relative' }}>
            <Search size={16} />
            <input className="form-input" placeholder={T.search} value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position: 'absolute', [rtl ? 'left' : 'right']: 12,
                top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', display: 'flex',
              }}>
                <X size={14} />
              </button>
            )}
          </div>
          <button onClick={() => setShowAI(p => !p)} title="STOKKY — Assistant Entrepôt" style={{
            display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, position: 'relative',
            background: showAI ? '#7c3aed' : 'rgba(124,58,237,0.1)', color: showAI ? '#fff' : '#7c3aed',
            border: '1px solid rgba(124,58,237,0.35)', borderRadius: 'var(--radius)', padding: '9px 14px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .2s',
          }}>
            <Bot size={14} /> {rtl ? 'ستوكي' : 'STOKKY'}
            {alertItems.length > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: '#ef4444', color: '#fff', borderRadius: '50%',
                width: 18, height: 18, fontSize: 10, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--color-surface)',
              }}>
                {alertItems.length}
              </span>
            )}
          </button>
          <button onClick={() => setShowReseed(true)} title={rtl ? 'إعادة تهيئة المقالات الافتراضية' : 'Réinitialiser les articles par défaut'} style={{
            display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
            background: 'rgba(239,68,68,0.08)', color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius)', padding: '9px 12px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            <Save size={13} style={{ transform: 'rotate(180deg)' }} />
            {rtl ? 'إعادة تهيئة' : 'Réinitialiser'}
          </button>
          <button onClick={openCreateCat} style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            background: 'var(--color-primary, #16a34a)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius)', padding: '9px 16px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            <Plus size={15} /> {T.newCat}
          </button>
        </div>

        {isSearching && (
          <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--color-text-3)' }}>
            {T.results(totalFiltered, filteredCats.length)}
          </div>
        )}

        {isSearching && filteredCats.length === 0 && (
          <div className="empty-state">
            <Search size={40} style={{ color: 'var(--color-text-3)', marginBottom: 12 }} />
            <h3>{T.noResult}</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{T.noResultSub(search)}</p>
          </div>
        )}

        {/* ── AI Assistant Panel ── */}
        {showAI && (
          <div style={{
            background: 'var(--color-surface)', border: '1px solid rgba(124,58,237,0.35)',
            borderRadius: 'var(--radius-lg)', marginBottom: 20,
            boxShadow: '0 4px 24px rgba(124,58,237,0.12)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(124,58,237,0.15)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={16} style={{ color: '#7c3aed' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                  STOKKY {rtl ? '— مساعد المستودع' : '— Assistant Entrepôt'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                  {rtl ? 'اسألني عن المخزون، الانتهاء، التوصيات...' : 'Interrogez le stock, expirations, recommandations…'}
                </div>
              </div>
              <button onClick={() => setShowAI(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)' }}><X size={16} /></button>
            </div>

            {/* Quick questions */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '10px 16px 0' }}>
              {(rtl
                ? ['ما هي المقالات المنتهية؟', 'ماذا يوجد في المخزون؟', 'ما الذي ينتهي قريبا؟', 'توصيات للتزود']
                : ['Articles en rupture ?', 'État du stock global ?', 'Expirations proches ?', 'Recommandations réapprovisionnement']
              ).map(q => (
                <button key={q} onClick={() => sendAI(q)} style={{
                  background: 'rgba(124,58,237,0.07)', color: '#7c3aed',
                  border: '1px solid rgba(124,58,237,0.2)', borderRadius: 99,
                  padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>{q}</button>
              ))}
            </div>

            {/* Chat history */}
            {aiMessages.length > 0 && (
              <div ref={aiChatRef} style={{ maxHeight: 260, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aiMessages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, flexDirection: m.role === 'user' ? (rtl ? 'row' : 'row-reverse') : 'row' }}>
                    <div style={{
                      maxWidth: '80%', padding: '8px 12px', borderRadius: 10, fontSize: 12, lineHeight: 1.5,
                      background: m.role === 'user' ? '#7c3aed' : 'var(--color-surface-2, var(--color-bg))',
                      color: m.role === 'user' ? '#fff' : 'var(--color-text)',
                      border: m.role === 'ai' ? '1px solid var(--color-border)' : 'none',
                    }}>{m.text}</div>
                  </div>
                ))}
                {aiLoading && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ padding: '8px 14px', background: 'var(--color-surface-2, var(--color-bg))', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12, color: '#7c3aed' }}>
                      <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <div style={{ display: 'flex', gap: 8, padding: '10px 16px 14px', alignItems: 'center' }}>
              <input
                className="form-input" style={{ flex: 1, fontSize: 13 }}
                placeholder={rtl ? 'اكتب سؤالك...' : 'Posez votre question…'}
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAI()}
                disabled={aiLoading}
              />
              <button onClick={() => sendAI()} disabled={aiLoading || !aiInput.trim()} style={{
                background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 'var(--radius)',
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: aiLoading || !aiInput.trim() ? 'not-allowed' : 'pointer',
                opacity: aiLoading || !aiInput.trim() ? 0.5 : 1,
              }}><Send size={14} /></button>
            </div>
          </div>
        )}

        {/* ── Accordion ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredCats.map(cat => {
            const IconComp = ICON_MAP[cat.icon] || Package;
            const isOpen   = isSearching ? true : (openSections[cat.id] ?? false);
            const colorBg  = cat.color + '18';
            const count    = cat.filtered?.length ?? cat.items?.length ?? 0;

            return (
              <div key={cat.id} style={{
                background: 'var(--color-surface)',
                border: `1px solid ${isOpen ? cat.color + '50' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                boxShadow: isOpen ? `0 4px 20px ${cat.color}15` : 'var(--shadow-sm)',
                transition: 'border-color .2s, box-shadow .2s',
              }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px' }}>

                  {/* Toggle */}
                  <button onClick={() => !isSearching && toggle(cat.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 11, flex: 1,
                    background: 'none', border: 'none', cursor: isSearching ? 'default' : 'pointer',
                    textAlign: rtl ? 'right' : 'left', padding: 0, minWidth: 0,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: colorBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1.5px solid ${cat.color}30`, fontSize: cat.emoji ? 20 : undefined,
                    }}>
                      {cat.emoji ? cat.emoji : <IconComp size={18} style={{ color: cat.color }} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {catName(cat)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>
                        {T.articleCount(count)}
                      </div>
                    </div>

                    <span style={{ background: colorBg, color: cat.color, flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99 }}>
                      {count}
                    </span>
                    {!isSearching && (
                      isOpen
                        ? <ChevronUp size={15} style={{ color: cat.color, flexShrink: 0 }} />
                        : <ChevronDown size={15} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
                    )}
                  </button>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => { openCreate(cat.id); if (!isOpen) toggle(cat.id); }} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: colorBg, color: cat.color,
                      border: `1px solid ${cat.color}40`, borderRadius: 8,
                      padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>
                      <Plus size={12} /> {T.addItem}
                    </button>
                    <button onClick={() => openEditCat(cat)} title={T.editCat} style={{
                      background: 'rgba(14,165,233,0.1)', color: '#0ea5e9',
                      border: '1px solid rgba(14,165,233,0.25)', borderRadius: 8,
                      width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}><Pencil size={13} /></button>
                    <button onClick={() => requestDeleteCat(cat)} title={T.deleteCat} style={{
                      background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8,
                      width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Body */}
                {isOpen && (
                  <div style={{
                    borderTop: `1px solid ${cat.color}20`, padding: '16px 18px 18px',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10,
                  }}>
                    {(cat.filtered ?? cat.items ?? []).length === 0 ? (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '30px 0', color: 'var(--color-text-3)', fontSize: 13 }}>
                        {T.noItems}
                      </div>
                    ) : (cat.filtered ?? cat.items ?? []).map(item => {
                      const badge = STATUS_MAP[item.status] || STATUS_MAP.available;
                      const isQtyEditing = qtyEdit === item.id;
                      return (
                        <div key={item.id} style={{
                          background: 'var(--color-surface-2, var(--color-bg))',
                          border: '1px solid var(--color-border-light, var(--color-border))',
                          borderRadius: 'var(--radius)', padding: '12px 13px',
                          display: 'flex', flexDirection: 'column', gap: 6,
                        }}>
                          {/* Top row */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 24 }}>{item.emoji}</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => openEdit(item)} style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Pencil size={12} /></button>
                              <button onClick={() => setConfirmDelete(item)} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash2 size={12} /></button>
                            </div>
                          </div>

                          {/* Name */}
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>
                            {itemName(item)}
                          </div>

                          {/* Quantity */}
                          <div style={{ marginTop: 4, padding: '8px 10px', background: cat.color + '10', border: `1px solid ${cat.color}25`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isQtyEditing ? (
                              <>
                                <input type="number" min="0" step="0.01" value={qtyValue}
                                  onChange={e => setQtyValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveQty(item); if (e.key === 'Escape') setQtyEdit(null); }}
                                  autoFocus
                                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, fontWeight: 700, color: cat.color, width: 60 }}
                                />
                                <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{item.unit}</span>
                                <button onClick={() => saveQty(item)} style={{ background: cat.color, color: '#fff', border: 'none', borderRadius: 5, padding: '2px 7px', fontSize: 11, cursor: 'pointer' }}><Save size={11} /></button>
                                <button onClick={() => setQtyEdit(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)' }}><X size={11} /></button>
                              </>
                            ) : (
                              <button onClick={() => { setQtyEdit(item.id); setQtyValue(String(item.quantity)); }} style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                <span style={{ fontSize: 18, fontWeight: 800, color: cat.color }}>{item.quantity}</span>
                                <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 500 }}>{item.unit}</span>
                                <Pencil size={10} style={{ color: cat.color, opacity: 0.6, marginLeft: 'auto' }} />
                              </button>
                            )}
                          </div>

                          {/* Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                            <span className={`badge ${badge.cls}`}>{rtl ? badge.ar : badge.fr}</span>
                            {item.expiry_date && (
                              <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>
                                {T.expiry} {item.expiry_date.slice(0, 10)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ ITEM FORM MODAL ══════════════════════════════════════════════════ */}
      {showForm && (
        <div onClick={e => e.target === e.currentTarget && closeForm()} style={overlay()}>
          <div style={modalBox(560)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)' }}>
                {editing ? T.editItemTitle : T.addItemTitle}
              </h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave}>
              {/* Emoji */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">{T.emojiLabel}</label>
                <button type="button" onClick={() => setShowItemEmojiPicker(p => !p)} style={emojiPickerBtn(form.emoji, showItemEmojiPicker)}>
                  <span style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: 'rgba(14,165,233,0.12)', border: '1.5px solid rgba(14,165,233,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {form.emoji || '📦'}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
                    {form.emoji ? T.emojiChange : T.emojiChoose}
                  </span>
                </button>
                {showItemEmojiPicker && (
                  <div ref={itemEmojiPickerRef} style={{ marginTop: 8, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <EmojiPicker theme="dark" searchPlaceholder={T.emojiSearch} width="100%" height={320}
                      onEmojiClick={data => { setForm(p => ({ ...p, emoji: data.emoji })); setShowItemEmojiPicker(false); }} />
                  </div>
                )}
              </div>

              {/* Nom */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">{T.nameLabel}</label>
                <input className="form-input" required placeholder={T.namePh} {...fld('name_ar')} />
              </div>

              {/* Description */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">{T.descLabel}</label>
                <input className="form-input" placeholder={T.descPh} {...fld('description')} />
              </div>

              {/* Qty + Unité */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">{T.qtyLabel}</label>
                  <input className="form-input" type="number" min="0" step="0.01" required {...fld('quantity')} />
                </div>
                <div className="form-group">
                  <label className="form-label">{T.unitLabel}</label>
                  <input className="form-input" placeholder={T.unitPh} {...fld('unit')} />
                </div>
              </div>

              {/* Seuil */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">{T.threshLabel}</label>
                <input className="form-input" type="number" min="0" step="0.01" {...fld('min_quantity')} />
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">{T.entryLabel}</label>
                  <input className="form-input" type="date" {...fld('entry_date')} />
                </div>
                <div className="form-group">
                  <label className="form-label">{T.expiryLabel}</label>
                  <input className="form-input" type="date" {...fld('expiry_date')} />
                </div>
              </div>

              {/* Notes */}
              <div className="form-group" style={{ marginBottom: 22 }}>
                <label className="form-label">{T.notesLabel}</label>
                <textarea className="form-input" rows={2} placeholder={T.notesPh} {...fld('notes')} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeForm} className="farms-cancel-btn">{T.cancel}</button>
                <button type="submit" className="farms-hero-btn" disabled={saving}>
                  {saving ? T.saving : editing ? T.save : T.add}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ CATEGORY FORM MODAL ══════════════════════════════════════════════ */}
      {showCatForm && (
        <div onClick={e => e.target === e.currentTarget && closeCatForm()} style={overlay()}>
          <div style={modalBox(460)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)' }}>
                {editingCat ? T.editCatTitle : T.newCatTitle}
              </h2>
              <button onClick={closeCatForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveCat}>
              {/* Nom unique */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Nom *</label>
                <input className="form-input" required
                  placeholder="ex: Produits phytosanitaires"
                  value={catForm.name_fr}
                  onChange={e => setCatForm(p => ({ ...p, name_fr: e.target.value, name_ar: e.target.value }))}
                />
              </div>

              {/* Couleur */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">{T.colorLabel}</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setCatForm(p => ({ ...p, color: c }))} style={{
                      width: 28, height: 28, borderRadius: '50%', background: c,
                      border: catForm.color === c ? '3px solid #fff' : '2px solid transparent',
                      outline: catForm.color === c ? `2px solid ${c}` : 'none',
                      cursor: 'pointer', flexShrink: 0,
                    }} />
                  ))}
                  <input type="color" value={catForm.color}
                    onChange={e => setCatForm(p => ({ ...p, color: e.target.value }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }}
                  />
                </div>
              </div>

              {/* Emoji */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">
                  {T.imageLabel} <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 400 }}>{T.imageOpt}</span>
                </label>
                <button type="button" onClick={() => setShowEmojiPicker(p => !p)} style={emojiPickerBtn(catForm.emoji, showEmojiPicker, catForm.color)}>
                  <span style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: catForm.color + '20', border: `1.5px solid ${catForm.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    {catForm.emoji || '📦'}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
                    {catForm.emoji ? T.emojiChange : T.emojiChoose}
                  </span>
                </button>
                {showEmojiPicker && (
                  <div ref={emojiPickerRef} style={{ marginTop: 8, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <EmojiPicker theme="dark" searchPlaceholder={T.emojiSearch} width="100%" height={340}
                      onEmojiClick={data => { setCatForm(p => ({ ...p, emoji: data.emoji })); setShowEmojiPicker(false); }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeCatForm} className="farms-cancel-btn">{T.cancel}</button>
                <button type="submit" className="farms-hero-btn" disabled={savingCat}>
                  {savingCat ? T.catSaving : editingCat ? T.catSave : T.catCreate}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ DELETE CAT — STEP 1 ══════════════════════════════════════════════ */}
      {deleteCatStep === 1 && catToDelete && (
        <div onClick={e => e.target === e.currentTarget && setDeleteCatStep(0)} style={overlay(1200)}>
          <div style={{ ...modalBox(380), border: '1px solid rgba(239,68,68,0.3)' }}>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 14 }}>🗂️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', textAlign: 'center', marginBottom: 8 }}>{T.delCat1Title}</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)', textAlign: 'center', marginBottom: 6 }}>
              <strong style={{ color: 'var(--color-text)' }}>{catName(catToDelete)}</strong>
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', marginBottom: 24 }}>
              {T.delCat1Sub(catToDelete.items?.length ?? 0)}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteCatStep(0)} className="farms-cancel-btn" style={{ flex: 1 }}>{T.cancel}</button>
              <button onClick={() => setDeleteCatStep(2)} style={{ flex: 1, background: '#f97316', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '9px 0', fontWeight: 700, cursor: 'pointer' }}>
                {T.delCat1Btn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE CAT — STEP 2 ══════════════════════════════════════════════ */}
      {deleteCatStep === 2 && catToDelete && (
        <div onClick={e => e.target === e.currentTarget && setDeleteCatStep(0)} style={overlay(1300)}>
          <div style={{ ...modalBox(380), border: '2px solid rgba(239,68,68,0.5)', boxShadow: '0 20px 60px rgba(239,68,68,0.3)' }}>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 14 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ef4444', textAlign: 'center', marginBottom: 10 }}>{T.delCat2Title}</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)', textAlign: 'center', marginBottom: 6 }}>
              {T.delCat2Sub(catName(catToDelete))}
            </p>
            <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', marginBottom: 24, fontWeight: 600 }}>{T.delCat2Warn}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteCatStep(0)} className="farms-cancel-btn" style={{ flex: 1 }}>{T.cancel}</button>
              <button onClick={handleDeleteCat} disabled={deletingCat} style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '9px 0', fontWeight: 700, cursor: deletingCat ? 'not-allowed' : 'pointer', opacity: deletingCat ? 0.7 : 1 }}>
                {deletingCat ? T.delCatting : T.delCat2Btn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ RESEED CONFIRM ══════════════════════════════════════════════════ */}
      {showReseed && (
        <div onClick={e => e.target === e.currentTarget && setShowReseed(false)} style={overlay(1400)}>
          <div style={{ ...modalBox(400), border: '2px solid rgba(239,68,68,0.4)', boxShadow: '0 20px 60px rgba(239,68,68,0.2)' }}>
            <div style={{ fontSize: 38, textAlign: 'center', marginBottom: 14 }}>🔄</div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', textAlign: 'center', marginBottom: 10 }}>
              {rtl ? 'إعادة تهيئة المقالات؟' : 'Réinitialiser les articles ?'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)', textAlign: 'center', marginBottom: 6 }}>
              {rtl
                ? 'سيتم حذف جميع المقالات الحالية واستبدالها بالبيانات الافتراضية.'
                : 'Tous les articles actuels seront supprimés et remplacés par les données par défaut.'}
            </p>
            <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, textAlign: 'center', marginBottom: 24 }}>
              {T.delCat2Warn}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowReseed(false)} className="farms-cancel-btn" style={{ flex: 1 }}>{T.cancel}</button>
              <button onClick={handleReseed} disabled={reseeding} style={{
                flex: 1, background: '#ef4444', color: '#fff', border: 'none',
                borderRadius: 'var(--radius)', padding: '9px 0', fontWeight: 700,
                cursor: reseeding ? 'not-allowed' : 'pointer', opacity: reseeding ? 0.7 : 1,
              }}>
                {reseeding ? (rtl ? 'جاري...' : 'En cours…') : (rtl ? 'إعادة التهيئة' : 'Réinitialiser')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE ITEM CONFIRM ══════════════════════════════════════════════ */}
      {confirmDelete && (
        <div onClick={e => e.target === e.currentTarget && setConfirmDelete(null)} style={overlay(1100)}>
          <div style={{ ...modalBox(380), border: '2px solid rgba(239,68,68,0.4)', boxShadow: '0 20px 60px rgba(239,68,68,0.25)' }}>

            {/* Header rouge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>{T.delItemTitle}</h3>
              <button onClick={() => setConfirmDelete(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)' }}><X size={18} /></button>
            </div>

            {/* Article à supprimer */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16,
            }}>
              <span style={{ fontSize: 32, flexShrink: 0 }}>{confirmDelete.emoji}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                  {itemName(confirmDelete)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                  {confirmDelete.quantity} {confirmDelete.unit}
                  {' · '}
                  <span className={`badge ${(STATUS_MAP[confirmDelete.status] || STATUS_MAP.available).cls}`} style={{ fontSize: 10 }}>
                    {rtl ? (STATUS_MAP[confirmDelete.status] || STATUS_MAP.available).ar : (STATUS_MAP[confirmDelete.status] || STATUS_MAP.available).fr}
                  </span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 6 }}>{T.delItemSub}</p>
            <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, marginBottom: 22 }}>{T.delCat2Warn}</p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} className="farms-cancel-btn" style={{ flex: 1 }}>{T.cancel}</button>
              <button onClick={handleDelete} disabled={deleting} style={{
                flex: 1, background: '#ef4444', color: '#fff', border: 'none',
                borderRadius: 'var(--radius)', padding: '9px 0', fontWeight: 700,
                cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1,
              }}>
                {deleting ? T.deleting : T.delItemBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
