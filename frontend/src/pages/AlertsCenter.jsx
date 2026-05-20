import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, CloudLightning, Sun,
  Flame, ShieldAlert, TreePine, Bug, Info, Activity,
  Bell, ShieldCheck, Clock, Warehouse, PackageX, PackageCheck,
  UserCheck, X, Send, Trash2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import KPIBox from '../components/KPIBox';
import { alertsAPI, farmsAPI, externalAPI, warehouseAPI, workerTasksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const SCAN_ALERT_KEY = 'farm_scan_alerts';
const SCANNER_CRITICAL = new Set(['fire', 'smoke', 'predator', 'dead_bird', 'feu', 'fumee', 'blight', 'rot', 'disease', '0', '1', '2', '3', '4']);

/* ── Design Tokens ──────────────────────────────────────────────────────── */
const C = {
  red: '#ef4444', redLt: '#fef2f2', orange: '#f97316',
  yellow: '#eab308', green: '#22c55e', blue: '#3b82f6',
  slate: '#64748b', bg: '#f8fafc', card: '#ffffff',
  border: '#e2e8f0', textPri: '#0f172a', textSec: '#475569',
  purple: '#7c3aed',
};

/* ── Bilingual labels (FR + Darija) ─────────────────────────────────────── */
const TR = {
  fr: {
    fireTitle:        'Alerte Incendie / Fumée',
    fireSub:          'Détections critiques par Vision Artificielle',
    fireLive:         'Scanner Live',
    treeTitle:        'Pathologies Végétales Critiques',
    treeSub:          'Analyses agronomiques nécessitant une intervention',
    treeManage:       'Gérer Plantations',
    criticalTitle:    'Alertes Sanitaires Critiques',
    animalManage:     'Gérer Bétail',
    noCritical:       'Aucune alerte sanitaire critique en cours.',
    warehouseTitle:   'Alertes Stock Entrepôt',
    warehouseSub:     'Ruptures et stocks faibles détectés automatiquement',
    warehouseManage:  "Gérer l'Entrepôt",
    warehouseEmpty:   'Stock en ordre',
    warehouseEmptySub:'Aucune rupture de stock détectée.',
    stockOut:         'RUPTURE',
    stockLow:         'STOCK FAIBLE',
    resolve:          'Résolu',
    assign:           'Assigner ouvrier',
    confidence:       'Confiance',
    intervention:     'INTERVENTION REQUISE',
    modalTitle:       'Assigner à un ouvrier',
    modalSub:         (n) => `Donner l'ordre de résoudre : "${n}"`,
    selectWorker:     '— Choisir un ouvrier —',
    noWorkers:        'Aucun ouvrier disponible',
    noteLabel:        'Note / Instructions',
    notePlaceholder:  'Ex: Réapprovisionner d\'urgence, contacter fournisseur...',
    confirmBtn:       "Confirmer l'assignation",
    cancelBtn:        'Annuler',
    assignOk:         'Tâche assignée avec succès',
    assignErr:        "Erreur lors de l'assignation",
    weatherTitle:     'Alertes Météorologiques Extrêmes',
    heatStress:       'Risque élevé pour le bétail.',
    stormRisk:        'Sécurisez les installations.',
    deleteBtn:        'Supprimer',
    deleteOk:         'Alerte supprimée',
    deleteErr:        'Erreur lors de la suppression',
    resolvedSection:  'Alertes Système Résolues',
    resolvedWSect:    'Alertes Entrepôt Résolues',
    resolvedAt:       'Résolu le',
    noResolved:       'Aucune alerte résolue.',
    resolvedBy:       'par',
  },
  ar: {
    fireTitle:        'تنبيه حريق / دخان',
    fireSub:          'كشف آلي بالرؤية الاصطناعية',
    fireLive:         'فحص مباشر',
    treeTitle:        'أمراض نباتية خطيرة',
    treeSub:          'تحليلات زراعية تحتاج تدخل',
    treeManage:       'إدارة الأشجار',
    criticalTitle:    'تنبيهات صحية خطيرة',
    animalManage:     'إدارة الماشية',
    noCritical:       'ما فماش تنبيه صحي خطير دابا.',
    warehouseTitle:   'تنبيهات مخزن المزرعة',
    warehouseSub:     'نقص كامل ومخزون قليل — اكتُشف تلقائياً',
    warehouseManage:  'إدارة المخزن',
    warehouseEmpty:   'المخزن بخير',
    warehouseEmptySub:'ما فماش نقص في المخزن.',
    stockOut:         'نقص كامل',
    stockLow:         'مخزون قليل',
    resolve:          'علّم بالحل',
    assign:           'كلّف عامل',
    confidence:       'ثقة',
    intervention:     'يحتاج تدخل',
    modalTitle:       'كلّف عامل لهذا التنبيه',
    modalSub:         (n) => `أعطي الأمر يحل مشكلة: "${n}"`,
    selectWorker:     '— اختار عامل —',
    noWorkers:        'ما فماش عمال متاحين',
    noteLabel:        'ملاحظة / تعليمات',
    notePlaceholder:  'مثال: تزود بالعاجل، اتصل بالمورد...',
    confirmBtn:       'أكّد التكليف',
    cancelBtn:        'إلغي',
    assignOk:         'تم تكليف العامل بنجاح',
    assignErr:        'صار خطأ في التكليف',
    weatherTitle:     'تنبيهات جوية خطيرة',
    heatStress:       'خطر حرارة على الماشية.',
    stormRisk:        'أمّن المنشآت.',
    deleteBtn:        'امسح',
    deleteOk:         'تم حذف التنبيه',
    deleteErr:        'صار خطأ في الحذف',
    resolvedSection:  'تنبيهات النظام المحلولة',
    resolvedWSect:    'تنبيهات المخزن المحلولة',
    resolvedAt:       'حُلّت في',
    noResolved:       'ما فماش تنبيهات محلولة.',
    resolvedBy:       'بواسطة',
  },
};

export default function AlertsCenter() {
  const [alerts, setAlerts]                   = useState([]);
  const [warehouseAlerts, setWarehouseAlerts]  = useState([]);
  const [resolvedWAlerts, setResolvedWAlerts]  = useState([]);
  const [emergencyData, setEmergencyData]      = useState(null);
  const [scannerAlerts, setScannerAlerts]      = useState([]);
  const [weatherRisks, setWeatherRisks]     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [filter, setFilter]                 = useState('emergency');
  const [firstFarmId, setFirstFarmId]       = useState(null);

  // Assign-to-worker modal
  const [assignTarget, setAssignTarget]   = useState(null);   // { id, item_name, message, severity }
  const [workers, setWorkers]             = useState([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [assignNote, setAssignNote]       = useState('');
  const [assigning, setAssigning]         = useState(false);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  const { user }    = useAuth();
  const { t, i18n } = useTranslation();
  const navigate    = useNavigate();
  const lang        = i18n.language?.startsWith('ar') ? 'ar' : 'fr';
  const L           = TR[lang];
  const rtl         = lang === 'ar';

  /* ── Load data ─────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, eRes, wRes, rwRes] = await Promise.all([
        alertsAPI.list(),
        alertsAPI.emergency(),
        warehouseAPI.alerts.list(false).catch(() => ({ data: [] })),
        warehouseAPI.alerts.list(true).catch(() => ({ data: [] })),
      ]);
      setWarehouseAlerts(wRes.data || []);
      setResolvedWAlerts(rwRes.data || []);
      let baseAlerts = aRes.data;
      setEmergencyData(eRes.data);

      const fRes = await farmsAPI.list();
      if (fRes.data.length > 0) {
        setFirstFarmId(fRes.data[0].id);
        try {
          const weatherRes = await externalAPI.weather.current(fRes.data[0].id);
          const risks = weatherRes.data?.risks;
          setWeatherRisks(risks);
          if (risks) {
            if (risks.heat_stress) baseAlerts.unshift({ id: 'w1', title: t('alerts.heat_stress'), description: t('alerts.heat_stress_desc'), severity: 'critical', entity_type: 'Environment', timestamp: new Date().toISOString(), is_resolved: false });
            if (risks.storm_risk)  baseAlerts.unshift({ id: 'w2', title: t('alerts.storm_warning'), description: t('alerts.storm_warning_desc'), severity: 'critical', entity_type: 'Environment', timestamp: new Date().toISOString(), is_resolved: false });
            if (risks.cold_stress) baseAlerts.unshift({ id: 'w3', title: t('alerts.cold_stress'), description: t('alerts.cold_stress_desc'), severity: 'warning', entity_type: 'Environment', timestamp: new Date().toISOString(), is_resolved: false });
          }
        } catch {}
      }
      setAlerts([...baseAlerts]);
      try {
        const stored = JSON.parse(localStorage.getItem(SCAN_ALERT_KEY) || '[]');
        setScannerAlerts(stored);
      } catch {}
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
    const t = setTimeout(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(SCAN_ALERT_KEY) || '[]');
        setScannerAlerts(stored);
      } catch {}
    }, 700);
    return () => clearTimeout(t);
  }, [load]);

  /* ── Resolve helpers ────────────────────────────────────────────────────── */
  const resolve = async (id) => {
    await alertsAPI.resolve(id, user?.username || 'manager');
    load();
  };
  const resolveWarehouseAlert = async (id) => {
    await warehouseAPI.alerts.resolve(id);
    load();
  };

  const deleteAlert = async (id) => {
    try {
      await alertsAPI.delete(id);
      toast.success(L.deleteOk);
      load();
    } catch { toast.error(L.deleteErr); }
  };

  const deleteWarehouseAlert = async (id) => {
    try {
      await warehouseAPI.alerts.delete(id);
      toast.success(L.deleteOk);
      load();
    } catch { toast.error(L.deleteErr); }
  };

  /* ── Assign-to-worker ───────────────────────────────────────────────────── */
  const openAssign = useCallback(async (alert) => {
    setAssignTarget(alert);
    setSelectedWorker('');
    setAssignNote('');
    setWorkers([]);
    setLoadingWorkers(true);
    try {
      const fid = firstFarmId || 1;
      const res = await workerTasksAPI.listWorkers(fid);
      setWorkers(res.data || []);
    } catch {
      setWorkers([]);
    } finally {
      setLoadingWorkers(false);
    }
  }, [firstFarmId]);

  const closeAssign = () => { setAssignTarget(null); setSelectedWorker(''); setAssignNote(''); };

  const confirmAssign = async () => {
    if (!selectedWorker) return;
    setAssigning(true);
    const alertName = assignTarget.item_name || assignTarget.title || assignTarget.alert_type || 'Alerte';
    try {
      await workerTasksAPI.create({
        title:           lang === 'ar'
          ? `حل مشكلة: ${alertName}`
          : `Résoudre alerte : ${alertName}`,
        description:     assignTarget.message || alertName,
        farm_id:         firstFarmId || 1,
        assigned_to_id:  parseInt(selectedWorker, 10),
        status:          'pending',
        priority:        assignTarget.severity === 'critical' ? 'high' : 'medium',
        notes:           assignNote || undefined,
      });
      toast.success(L.assignOk);
      closeAssign();
    } catch {
      toast.error(L.assignErr);
    } finally {
      setAssigning(false);
    }
  };

  /* ── Counts & Filters ───────────────────────────────────────────────────── */
  const counts = {
    active:    alerts.filter(a => !a.is_resolved).length,
    critical:  alerts.filter(a => !a.is_resolved && a.severity === 'critical').length,
    resolved:  alerts.filter(a => a.is_resolved).length + resolvedWAlerts.length,
    emergency: (emergencyData?.fire_events?.length || 0) + (emergencyData?.critical_alerts?.length || 0) + scannerAlerts.length,
    warehouse: warehouseAlerts.length,
  };

  const FILTERS = [
    { id: 'emergency', label: `🚨 ${t('alerts.sovereign_monitor', 'Moniteur Souverain')}`, icon: ShieldAlert },
    { id: 'warehouse', label: `🏪 ${rtl ? 'المخزن' : 'Entrepôt'} (${counts.warehouse})`, icon: Warehouse },
    { id: 'active',    label: `${t('alerts.filter_active')} (${counts.active})`, icon: Bell },
    { id: 'critical',  label: `${t('alerts.filter_critical')} (${counts.critical})`, icon: AlertTriangle },
    { id: 'resolved',  label: `${t('alerts.filter_resolved')} (${counts.resolved})`, icon: ShieldCheck },
    { id: 'all',       label: `${t('alerts.filter_all')} (${alerts.length})`, icon: Info },
  ];

  const filtered = alerts.filter(a => {
    if (filter === 'active')   return !a.is_resolved;
    if (filter === 'critical') return !a.is_resolved && a.severity === 'critical';
    if (filter === 'resolved') return a.is_resolved;
    return true;
  });

  /* ── Shared button styles ───────────────────────────────────────────────── */
  const resolveBtn = (onClick) => (
    <button onClick={onClick} title={L.resolve} style={{
      flexShrink: 0, background: 'rgba(34,197,94,0.08)', color: C.green,
      border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8,
      height: 34, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 5,
      cursor: 'pointer', fontSize: 11, fontWeight: 700,
    }}>
      <PackageCheck size={14} /> {L.resolve}
    </button>
  );

  const assignBtn = (alert) => (
    <button onClick={() => openAssign(alert)} title={L.assign} style={{
      flexShrink: 0, background: 'rgba(124,58,237,0.08)', color: C.purple,
      border: '1px solid rgba(124,58,237,0.25)', borderRadius: 8,
      height: 34, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 5,
      cursor: 'pointer', fontSize: 11, fontWeight: 700,
    }}>
      <UserCheck size={14} /> {L.assign}
    </button>
  );

  const deleteBtn = (onClick) => (
    <button onClick={onClick} title={L.deleteBtn} style={{
      flexShrink: 0, background: 'rgba(239,68,68,0.07)', color: C.red,
      border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8,
      height: 34, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 5,
      cursor: 'pointer', fontSize: 11, fontWeight: 700,
    }}>
      <Trash2 size={13} /> {L.deleteBtn}
    </button>
  );

  return (
    <>
      <Navbar title={t('alerts.center_title')} subtitle={t('alerts.center_subtitle')} />
      <div className="page-content" style={{ direction: rtl ? 'rtl' : 'ltr', background: C.bg, minHeight: '100dvh' }}>

        {/* KPIs */}
        <div className="kpi-grid" style={{ marginBottom: 32 }}>
          <KPIBox icon={ShieldAlert}   value={counts.emergency} label={rtl ? 'طوارئ' : 'Urgence'}           colorClass="red" />
          <KPIBox icon={AlertTriangle} value={counts.active}    label={t('alerts.active_alerts')}             colorClass="yellow" />
          <KPIBox icon={Warehouse}     value={counts.warehouse} label={rtl ? 'تنبيهات المخزن' : 'Stock Entrepôt'} colorClass="red" />
          <KPIBox icon={CheckCircle2}  value={counts.resolved}  label={t('alerts.resolved_today')}            colorClass="green" />
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 24,
          background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)',
          padding: '4px', borderRadius: '12px', border: `1px solid ${C.border}`,
          overflowX: 'auto',
        }}>
          {FILTERS.map(f => {
            const Ic = f.icon;
            const active = filter === f.id;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                background: active ? '#fff' : 'transparent', border: 'none',
                padding: '10px 18px', borderRadius: '8px', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 800 : 600,
                color: active ? C.blue : C.slate,
                boxShadow: active ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}>
                <Ic size={16} /> {f.label}
              </button>
            );
          })}
        </div>

        {loading && <div className="spinner" style={{ margin: '40px auto' }} />}

        {/* ── Emergency Tab ─────────────────────────────────────────────── */}
        {!loading && filter === 'emergency' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.5s ease' }}>

            {/* Fire / Smoke */}
            {emergencyData?.fire_events?.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: C.redLt, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.red}22` }}>
                      <Flame color={C.red} size={22} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 900, color: C.textPri, margin: 0 }}>{L.fireTitle}</h2>
                      <p style={{ fontSize: 12, color: C.slate, margin: 0 }}>{L.fireSub}</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('/cv')} className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>{L.fireLive}</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
                  {emergencyData.fire_events.map(e => (
                    <div key={e.id} style={{
                      background: '#fff', borderRadius: 16, border: `2px solid ${C.red}`,
                      overflow: 'hidden', boxShadow: '0 8px 24px rgba(239,68,68,0.15)', position: 'relative',
                    }}>
                      <div style={{ height: 'clamp(140px,30vw,200px)', background: '#000', position: 'relative' }}>
                        {(e.thumbnail_url || e.frame_metadata?.thumbnail_b64)
                          ? <img
                              src={e.thumbnail_url || e.frame_metadata.thumbnail_b64}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              alt="detection"
                              onError={ev => { ev.target.style.display = 'none'; }}
                            />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(45deg,#000,#450a0a)' }}><Flame color={C.red} size={40} /></div>
                        }
                        <div style={{ position: 'absolute', top: 12, left: 12, background: C.red, color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 900 }}>INCENDIE</div>
                        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 900 }}>{Math.round(e.confidence * 100)}%</div>
                      </div>
                      <div style={{ padding: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.textPri, marginBottom: 4 }}>
                          {rtl ? 'كشف: ' : 'DÉTECTION: '}{e.object_class.toUpperCase()}
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.slate, marginBottom: 3 }}>
                            <span>{L.confidence}</span>
                            <span style={{ fontWeight: 800, color: C.red }}>{Math.round(e.confidence * 100)}%</span>
                          </div>
                          <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.round(e.confidence * 100)}%`, background: C.red, borderRadius: 2 }} />
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: C.slate, marginBottom: 10 }}>
                          <Clock size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                          {new Date(e.timestamp).toLocaleString()}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {assignBtn({ id: e.id, item_name: e.object_class, message: `Feu/Fumée détecté — confiance ${Math.round(e.confidence*100)}%`, severity: 'critical' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tree diseases */}
            {emergencyData?.tree_diseases?.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #16a34a22' }}>
                      <TreePine color="#16a34a" size={22} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 900, color: C.textPri, margin: 0 }}>{L.treeTitle}</h2>
                      <p style={{ fontSize: 12, color: C.slate, margin: 0 }}>{L.treeSub}</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('/trees')} className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>{L.treeManage}</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 12 }}>
                  {emergencyData.tree_diseases.map(e => (
                    <div key={e.id} style={{
                      background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 12,
                      display: 'flex', gap: 12, alignItems: 'center',
                    }}>
                      <div style={{ width: 60, height: 60, borderRadius: 8, background: '#f8fafc', overflow: 'hidden', flexShrink: 0 }}>
                        {e.thumbnail_url ? <img src={e.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <Bug size={24} color={C.slate} style={{ margin: 18 }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{e.object_class.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: 10, color: C.slate, marginTop: 2 }}>{e.camera_id?.toUpperCase()} · {new Date(e.timestamp).toLocaleDateString()}</div>
                        <div style={{ marginTop: 6, fontSize: 9, fontWeight: 800, color: C.red, background: C.redLt, padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>{L.intervention}</div>
                        <div style={{ marginTop: 8 }}>
                          {assignBtn({ id: e.id, item_name: e.object_class, message: `Maladie végétale détectée : ${e.object_class}`, severity: 'warning' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Weather */}
            {weatherRisks && (weatherRisks.heat_stress || weatherRisks.storm_risk || weatherRisks.cold_stress) && (
              <div style={{
                background: 'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)',
                borderRadius: 16, padding: 20, color: '#fff',
                boxShadow: '0 10px 30px rgba(220,38,38,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <CloudLightning size={24} />
                  <span style={{ fontWeight: 800, fontSize: 16 }}>{L.weatherTitle}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {weatherRisks.heat_stress && (
                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px 16px', borderRadius: 12, fontSize: 13, flex: 1, minWidth: 200 }}>
                      <Sun size={14} style={{ marginRight: 6 }} /> <b>Heat Stress:</b> {L.heatStress}
                    </div>
                  )}
                  {weatherRisks.storm_risk && (
                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px 16px', borderRadius: 12, fontSize: 13, flex: 1, minWidth: 200 }}>
                      <CloudLightning size={14} style={{ marginRight: 6 }} /> <b>{rtl ? 'عاصفة:' : 'Tempête:'}</b> {L.stormRisk}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Scanner AI Detections */}
            {scannerAlerts.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(124,58,237,0.2)' }}>
                      <Activity color={C.purple} size={22} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 900, color: C.textPri, margin: 0 }}>
                        {rtl ? 'كشوفات المسح الفوري' : 'Détections Scanner IA'}
                      </h2>
                      <p style={{ fontSize: 12, color: C.slate, margin: 0 }}>
                        {rtl ? 'صور ممسوحة بالذكاء الاصطناعي' : 'Images analysées par vision artificielle'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { localStorage.removeItem(SCAN_ALERT_KEY); setScannerAlerts([]); }}
                    style={{ background: 'rgba(239,68,68,0.07)', color: C.red, border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 8, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Trash2 size={13} /> {rtl ? 'مسح الكل' : 'Effacer tout'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
                  {scannerAlerts.map(sa => {
                    const topDet = sa.detections?.[0];
                    const score = topDet ? Math.round(topDet.confidence * 100) : 0;
                    const isCrit = sa.category === 'fire' || SCANNER_CRITICAL.has(topDet?.label?.toLowerCase()) || SCANNER_CRITICAL.has(topDet?.label);
                    return (
                      <div key={sa.id} style={{
                        background: '#fff', borderRadius: 14,
                        border: `2px solid ${isCrit ? C.red : C.purple}`,
                        overflow: 'hidden',
                        boxShadow: `0 6px 20px ${isCrit ? 'rgba(239,68,68,0.12)' : 'rgba(124,58,237,0.1)'}`,
                        position: 'relative',
                      }}>
                        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, background: isCrit ? C.red : C.purple, color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 900 }}>
                          {sa.category === 'fire' ? 'INCENDIE' : isCrit ? 'CRITIQUE' : 'SCAN IA'}
                        </div>
                        <div style={{ height: 'clamp(140px, 28vw, 200px)', background: '#111', overflow: 'hidden' }}>
                          <img src={sa.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="scan" onError={e => { e.target.style.display='none'; }} />
                        </div>
                        <div style={{ padding: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: C.textPri, marginBottom: 6 }}>
                            {sa.category === 'fire'
                              ? (rtl ? 'كشف حريق / دخان' : 'DÉTECTION FEU / FUMÉE')
                              : (topDet?.label?.toUpperCase() || sa.category?.toUpperCase())}
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.slate, marginBottom: 3 }}>
                              <span>Score</span>
                              <span style={{ fontWeight: 800, color: isCrit ? C.red : C.purple }}>{score}%</span>
                            </div>
                            <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${score}%`, borderRadius: 2, background: isCrit ? C.red : C.purple }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                            {sa.detections?.slice(0, 4).map((det, i) => (
                              <span key={i} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#f8fafc', color: C.slate, border: `1px solid ${C.border}` }}>
                                {det.label} {Math.round(det.confidence * 100)}%
                              </span>
                            ))}
                          </div>
                          <div style={{ fontSize: 10, color: C.slate, marginBottom: 8 }}>
                            <Clock size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            {new Date(sa.timestamp).toLocaleTimeString()}
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {assignBtn({ id: sa.id, item_name: topDet?.label || sa.category, message: `Détection IA: ${topDet?.label} (${score}%)`, severity: isCrit ? 'critical' : 'warning' })}
                            <button
                              onClick={() => {
                                const updated = scannerAlerts.filter(a => a.id !== sa.id);
                                setScannerAlerts(updated);
                                localStorage.setItem(SCAN_ALERT_KEY, JSON.stringify(updated));
                              }}
                              style={{ background: 'rgba(239,68,68,0.07)', color: C.red, border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 8, height: 34, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                            >
                              <X size={12} /> {rtl ? 'إزالة' : 'Retirer'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Critical animal alerts */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: C.textPri, margin: 0 }}>{L.criticalTitle}</h2>
                <button onClick={() => navigate('/animals')} className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>{L.animalManage}</button>
              </div>
              {emergencyData?.critical_alerts?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {emergencyData.critical_alerts.map(a => (
                    <div key={a.id} className={`alert-banner ${a.severity === 'critical' ? 'critical' : 'warning'}`} style={{ justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="alert-banner-title">{a.unit_name && <span style={{ marginRight: 6 }}>[{a.unit_name}]</span>}{a.alert_type?.replace(/_/g,' ')}</div>
                        <div className="alert-banner-msg">{a.message}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {assignBtn({ id: a.id, item_name: a.alert_type, message: a.message, severity: a.severity })}
                        {!a.is_resolved && resolveBtn(() => resolve(a.id))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 16, border: `1px dashed ${C.border}` }}>
                  <ShieldCheck size={40} color={C.green} style={{ marginBottom: 12, opacity: 0.5 }} />
                  <p style={{ color: C.slate, fontSize: 14 }}>{L.noCritical}</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── Warehouse Tab ──────────────────────────────────────────────── */}
        {!loading && filter === 'warehouse' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <PackageX color={C.red} size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 900, color: C.textPri, margin: 0 }}>{L.warehouseTitle}</h2>
                  <p style={{ fontSize: 12, color: C.slate, margin: 0 }}>{L.warehouseSub}</p>
                </div>
              </div>
              <button onClick={() => navigate('/entrepot')} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {L.warehouseManage}
              </button>
            </div>

            {warehouseAlerts.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: 16, border: `1px dashed ${C.border}` }}>
                <PackageCheck size={44} color={C.green} style={{ marginBottom: 12, opacity: 0.6 }} />
                <h3 style={{ color: C.textPri, marginBottom: 6 }}>{L.warehouseEmpty}</h3>
                <p style={{ color: C.slate, fontSize: 14 }}>{L.warehouseEmptySub}</p>
              </div>
            ) : warehouseAlerts.map(a => (
              <div key={a.id} style={{
                background: '#fff', borderRadius: 14,
                border: `1.5px solid ${a.severity === 'critical' ? C.red : C.orange}30`,
                boxShadow: `0 4px 16px ${a.severity === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(249,115,22,0.08)'}`,
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <span style={{ fontSize: 30, flexShrink: 0 }}>{a.emoji || '📦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.textPri }}>{a.item_name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
                      background: a.severity === 'critical' ? C.redLt : '#fff7ed',
                      color: a.severity === 'critical' ? C.red : C.orange,
                      border: `1px solid ${a.severity === 'critical' ? C.red : C.orange}30`,
                    }}>{a.alert_type === 'stock_out' ? L.stockOut : L.stockLow}</span>
                  </div>
                  {a.category_name && <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>{a.category_name}</div>}
                  <div style={{ fontSize: 12, color: C.textSec, marginTop: 4 }}>{a.message}</div>
                  <div style={{ fontSize: 10, color: C.slate, marginTop: 4 }}>
                    <Clock size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {new Date(a.created_at).toLocaleString()}
                  </div>
                </div>
                {/* Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  {assignBtn(a)}
                  {resolveBtn(() => resolveWarehouseAlert(a.id))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Résolues Tab ──────────────────────────────────────────────── */}
        {!loading && filter === 'resolved' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.4s ease' }}>

            {/* System resolved alerts */}
            {(() => {
              const sysResolved = alerts.filter(a => a.is_resolved);
              return (
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <ShieldCheck size={18} color={C.green} />
                    <h2 style={{ fontSize: 16, fontWeight: 800, color: C.textPri, margin: 0 }}>
                      {L.resolvedSection} ({sysResolved.length})
                    </h2>
                  </div>
                  {sysResolved.length === 0 ? (
                    <div style={{ padding: '30px 20px', textAlign: 'center', background: '#fff', borderRadius: 12, border: `1px dashed ${C.border}` }}>
                      <p style={{ color: C.slate, fontSize: 13 }}>{L.noResolved}</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {sysResolved.map(a => (
                        <div key={a.id} style={{
                          background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`,
                          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                          opacity: 0.85,
                        }}>
                          <CheckCircle2 size={18} color={C.green} style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>
                              {a.unit_name && <span style={{ color: C.slate, marginRight: 6 }}>[{a.unit_name}]</span>}
                              {a.alert_type?.replace(/_/g, ' ')}
                            </div>
                            <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{a.message}</div>
                            <div style={{ fontSize: 10, color: C.slate, marginTop: 4 }}>
                              <Clock size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                              {a.farm_name && <span>{a.farm_name} · </span>}
                              <span style={{ color: C.green }}>✓ {L.resolve}</span>
                              {a.resolved_by && <span> {L.resolvedBy} {a.resolved_by}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            {deleteBtn(() => deleteAlert(a.id))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })()}

            {/* Warehouse resolved alerts */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Warehouse size={18} color={C.green} />
                <h2 style={{ fontSize: 16, fontWeight: 800, color: C.textPri, margin: 0 }}>
                  {L.resolvedWSect} ({resolvedWAlerts.length})
                </h2>
              </div>
              {resolvedWAlerts.length === 0 ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', background: '#fff', borderRadius: 12, border: `1px dashed ${C.border}` }}>
                  <p style={{ color: C.slate, fontSize: 13 }}>{L.noResolved}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {resolvedWAlerts.map(a => (
                    <div key={a.id} style={{
                      background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`,
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                      opacity: 0.85,
                    }}>
                      <span style={{ fontSize: 24, flexShrink: 0 }}>{a.emoji || '📦'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{a.item_name}</div>
                        {a.category_name && <div style={{ fontSize: 11, color: C.slate }}>{a.category_name}</div>}
                        <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{a.message}</div>
                        <div style={{ fontSize: 10, color: C.slate, marginTop: 4 }}>
                          <Clock size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                          {a.resolved_at
                            ? `${L.resolvedAt} ${new Date(a.resolved_at).toLocaleString()}`
                            : new Date(a.created_at).toLocaleString()
                          }
                          <span style={{ color: C.green, marginLeft: 8 }}>✓ {L.resolve}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {deleteBtn(() => deleteWarehouseAlert(a.id))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── Active / Critical / All tabs ──────────────────────────────── */}
        {!loading && filter !== 'emergency' && filter !== 'warehouse' && filter !== 'resolved' && (
          <>
            {filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: '80px 20px', background: '#fff', borderRadius: 20, marginTop: 20 }}>
                <CheckCircle2 size={48} color={C.green} style={{ marginBottom: 16 }} />
                <h3>{t('alerts.no_active')}</h3>
                <p style={{ color: C.slate }}>{t('alerts.all_good')}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'slideUp 0.4s ease' }}>
                {filtered.map(a => (
                  <div key={a.id} className={`alert-banner ${a.severity === 'critical' ? 'critical' : 'warning'}`} style={{ justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="alert-banner-title">{a.unit_name && <span style={{ marginRight: 6 }}>[{a.unit_name}]</span>}{a.alert_type?.replace(/_/g,' ')}</div>
                      <div className="alert-banner-msg">{a.message}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>
                        {a.farm_name && <span>{a.farm_name} · </span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {assignBtn({ id: a.id, item_name: a.alert_type, message: a.message, severity: a.severity })}
                      {resolveBtn(() => resolve(a.id))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Assign-to-Worker Modal ─────────────────────────────────────────── */}
      {assignTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 16, backdropFilter: 'blur(4px)',
        }} onClick={(e) => { if (e.target === e.currentTarget) closeAssign(); }}>
          <div style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            animation: 'slideUp 0.25s ease',
            direction: rtl ? 'rtl' : 'ltr',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '18px 20px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={20} color={C.purple} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.textPri }}>{L.modalTitle}</div>
                <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>{L.modalSub(assignTarget.item_name || assignTarget.alert_type || '—')}</div>
              </div>
              <button onClick={closeAssign} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate, padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Alert summary */}
            <div style={{ margin: '14px 20px 0', padding: '10px 14px', borderRadius: 10, background: assignTarget.severity === 'critical' ? C.redLt : '#fff7ed', border: `1px solid ${assignTarget.severity === 'critical' ? C.red : C.orange}25` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: assignTarget.severity === 'critical' ? C.red : C.orange }}>
                {assignTarget.item_name || assignTarget.alert_type}
              </div>
              <div style={{ fontSize: 11, color: C.textSec, marginTop: 3 }}>{assignTarget.message}</div>
            </div>

            {/* Worker select */}
            <div style={{ padding: '14px 20px 0' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textSec, display: 'block', marginBottom: 6 }}>
                <UserCheck size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                {L.selectWorker.replace('—', '').trim()} *
              </label>
              {loadingWorkers ? (
                <div style={{ textAlign: 'center', padding: 16, color: C.slate, fontSize: 12 }}>
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, margin: '0 auto 6px' }} />
                </div>
              ) : workers.length === 0 ? (
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: C.slate }}>{L.noWorkers}</div>
              ) : (
                <select
                  value={selectedWorker}
                  onChange={e => setSelectedWorker(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: 13 }}
                >
                  <option value="">{L.selectWorker}</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.full_name || w.username || `Worker #${w.id}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Note */}
            <div style={{ padding: '12px 20px 0' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textSec, display: 'block', marginBottom: 6 }}>
                {L.noteLabel}
              </label>
              <textarea
                value={assignNote}
                onChange={e => setAssignNote(e.target.value)}
                placeholder={L.notePlaceholder}
                className="form-input"
                rows={2}
                style={{ width: '100%', fontSize: 12, resize: 'vertical' }}
              />
            </div>

            {/* Actions */}
            <div style={{ padding: '16px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeAssign} style={{
                background: 'none', border: '1px solid #e2e8f0', borderRadius: 8,
                padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.slate,
              }}>{L.cancelBtn}</button>
              <button
                onClick={confirmAssign}
                disabled={!selectedWorker || assigning}
                style={{
                  background: selectedWorker && !assigning ? C.purple : '#e2e8f0',
                  color: selectedWorker && !assigning ? '#fff' : C.slate,
                  border: 'none', borderRadius: 8,
                  padding: '9px 20px', fontSize: 13, fontWeight: 700,
                  cursor: selectedWorker && !assigning ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 7, transition: 'all .2s',
                }}
              >
                {assigning
                  ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> {rtl ? 'جاري...' : 'Envoi…'}</>
                  : <><Send size={14} /> {L.confirmBtn}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        .spinner {
          width: 40px; height: 40px; border: 4px solid #f3f3f3;
          border-top: 4px solid ${C.blue}; border-radius: 50%;
          animation: spin 1s linear infinite; display: inline-block;
        }
        @keyframes spin { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}
