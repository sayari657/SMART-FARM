import React, { useState, useRef, useEffect } from 'react';
import { Leaf, Upload, Loader2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cvAPI } from '../services/api';
import ModelClassesInfo from './ModelClassesInfo';
import { translateLabel } from '../utils/labelTranslations';

const SCAN_ALERT_KEY = 'farm_scan_alerts';
const SCAN_ALERT_MAX = 20;

const pushScanAlert = (card) => {
  try {
    const existing = JSON.parse(localStorage.getItem(SCAN_ALERT_KEY) || '[]');
    localStorage.setItem(SCAN_ALERT_KEY, JSON.stringify([card, ...existing].slice(0, SCAN_ALERT_MAX)));
  } catch { /* quota localStorage */ }
};

const compressImage = (dataUrl, maxWidth = 420, quality = 0.7) =>
  new Promise((resolve) => {
    if (!dataUrl?.startsWith('data:')) { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

const T = {
  green: '#16a34a', greenLt: '#dcfce7', red: '#dc2626',
  border: '#e2e8f0', textPri: '#0f172a', textSec: '#475569', textMut: '#94a3b8',
};

/**
 * Scanner PlantVillage — classification 38 classes maladie×espèce
 * (YOLOv8-cls, top-1 = 99 %). Diagnostic non-sain → Moniteur Souverain.
 */
export default function PlantVillageScanner() {
  const [img, setImg]       = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState(null);
  const [classes, setClasses] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    cvAPI.getModelMetadata('plantvillage')
      .then((r) => setClasses(Object.values(r.data?.names || {})))
      .catch(() => setClasses([]));
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(null); setResult(null);

    const dataUrl = await new Promise((res) => {
      const r = new FileReader();
      r.onload = (ev) => res(ev.target.result);
      r.readAsDataURL(file);
    });
    setImg(dataUrl);

    try {
      const res = await cvAPI.classify(file, 'plantvillage', 3);
      setResult(res.data);
      if (!res.data.healthy && res.data.top.confidence >= 0.5) {
        const stored = await compressImage(dataUrl);
        pushScanAlert({
          id: Date.now() + Math.random(),
          timestamp: new Date().toISOString(),
          imageUrl: stored,
          detections: res.data.classes.map((c) => ({ label: c.label, confidence: c.confidence })),
          category: 'plantvillage',
        });
        toast('🌿 Maladie détectée — envoyée au Moniteur Souverain',
          { duration: 3000, style: { background: '#fef2f2', color: '#991b1b', fontWeight: 700, fontSize: 13 } });
      }
    } catch (err) {
      setError(err?.response?.status === 503
        ? 'Modèle indisponible — vérifiez le serveur local.'
        : "Erreur d'analyse. Réessayez.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const reset = () => { setImg(null); setResult(null); setError(null); };
  const isHealthy = result?.healthy;

  return (
    <div style={{
      background: '#fff', border: `1.5px solid ${T.border}`, borderRadius: 18,
      overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.07),0 8px 24px rgba(0,0,0,0.06)',
      borderTop: `3px solid ${result ? (isHealthy ? T.green : T.red) : T.green}`,
    }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1.5px solid ${T.border}`, background: `linear-gradient(135deg,${T.greenLt} 0%,#ffffff 100%)` }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: `linear-gradient(135deg,${T.green},#15803d)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Leaf size={19} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.textPri }}>PlantVillage — Diagnostic 38 Maladies</div>
          <div style={{ fontSize: 9, color: T.textMut, textTransform: 'uppercase', letterSpacing: 1 }}>
            YOLOv8-cls · top-1 99 % · 14 espèces · entraîné sur 54 305 images
          </div>
        </div>
        {img && (
          <button onClick={reset} style={{ background: '#f8fafc', border: `1px solid ${T.border}`, borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textMut }}>
            <X size={12} />
          </button>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {!img ? (
          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: '26px 0', border: `2px dashed ${T.green}55`, borderRadius: 12,
            cursor: 'pointer', background: `${T.greenLt}44`,
          }}>
            <Upload size={20} color={T.green} style={{ opacity: 0.7 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.textSec }}>Photo de feuille (pommier, vigne, tomate, maïs…)</span>
            <span style={{ fontSize: 9, color: T.textMut }}>PNG · JPG — classification instantanée</span>
            <input ref={inputRef} type="file" hidden accept="image/*" onChange={handleFile} />
          </label>
        ) : (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ width: 110, height: 110, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#0f172a', position: 'relative' }}>
              <img src={img} alt="feuille" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {busy && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={18} color={T.green} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              {error ? (
                <div style={{ fontSize: 11, color: T.red, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={13} /> {error}
                </div>
              ) : result && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {isHealthy
                      ? <CheckCircle2 size={15} color={T.green} />
                      : <AlertTriangle size={15} color={T.red} />}
                    <span style={{ fontSize: 13, fontWeight: 900, color: isHealthy ? T.green : T.red }}>
                      {translateLabel(result.top.label, 'fr')} — {Math.round(result.top.confidence * 100)} %
                    </span>
                  </div>
                  {result.classes.map((c) => (
                    <div key={c.label} style={{ marginBottom: 5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textSec, marginBottom: 2 }}>
                        <span>{translateLabel(c.label, 'fr')} <span style={{ color: T.textMut }}>· {translateLabel(c.label, 'ar')}</span></span>
                        <span style={{ fontWeight: 800 }}>{Math.round(c.confidence * 100)} %</span>
                      </div>
                      <div style={{ height: 4, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${c.confidence * 100}%`, height: '100%', background: c.label.toLowerCase().includes('healthy') ? T.green : T.red, borderRadius: 99 }} />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── ℹ️ Liste des 38 classes (FR/EN/AR) — clic pour ouvrir/fermer ── */}
      <ModelClassesInfo classes={classes} accent={T.green} />
    </div>
  );
}
