import React, { useState, useRef } from 'react';
import { Microscope, Upload, Loader2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cvAPI } from '../../services/api';
import ModelClassesInfo from '../ModelClassesInfo';

const SCAN_ALERT_KEY = 'farm_scan_alerts';
const SCAN_ALERT_MAX = 20;

/* Recommandations COLOSS par diagnostic */
const CLASS_INFO = {
  healthy:                   { label: 'Colonie saine',            color: '#16a34a', critical: false, advice: 'Aucune action — suivi standard.' },
  varroa_small_hive_beetles: { label: 'Varroa + petit coléoptère', color: '#dc2626', critical: true,  advice: 'Traitement acaricide (Apivar / acide oxalique) + comptage chute naturelle sur lange graissé.' },
  few_varrao_hive_beetles:   { label: 'Varroa (infestation légère)', color: '#ea580c', critical: true, advice: 'Comptage varroa urgent ; traiter si > 3 acariens/jour de chute naturelle.' },
  missing_queen:             { label: 'Reine manquante',          color: '#dc2626', critical: true,  advice: 'Vérifier ponte et cellules royales ; introduire une reine fécondée sous 48 h.' },
  hive_being_robbed:         { label: 'Pillage en cours',         color: '#dc2626', critical: true,  advice: 'Réduire l\'entrée immédiatement, supprimer toute source de sirop exposée.' },
  ant_problems:              { label: 'Invasion de fourmis',      color: '#d97706', critical: false, advice: 'Graisser les pieds de ruche ou les poser dans des coupelles d\'eau.' },
};

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

/**
 * Diagnostic santé colonie par photo d'abeille — YOLOv8-cls entraîné sur
 * BeeImage (top-1 = 97,9 %). Les diagnostics critiques (varroa, reine
 * manquante, pillage) sont poussés vers le Moniteur Souverain (/alerts).
 */
export default function BeeHealthScanner() {
  const [img, setImg]         = useState(null);
  const [result, setResult]   = useState(null);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState(null);
  const inputRef = useRef(null);

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
      const res = await cvAPI.classify(file, 'bee_health', 3);
      const data = res.data;
      setResult(data);

      const info = CLASS_INFO[data.top.label];
      if (!data.healthy && data.top.confidence >= 0.5) {
        const stored = await compressImage(dataUrl);
        pushScanAlert({
          id: Date.now() + Math.random(),
          timestamp: new Date().toISOString(),
          imageUrl: stored,
          detections: data.classes.map((c) => ({ label: c.label, confidence: c.confidence })),
          category: 'bee_health',
        });
        toast(info?.critical ? '🚨 Diagnostic critique envoyé au Moniteur Souverain' : '⚠️ Diagnostic ajouté au Moniteur',
          { duration: 3000, style: { background: '#fef2f2', color: '#991b1b', fontWeight: 700, fontSize: 13 } });
      }
    } catch (err) {
      setError(err?.response?.status === 503
        ? 'Modèle indisponible (mode cloud) — réessayez sur le serveur local.'
        : 'Erreur d\'analyse. Réessayez.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const reset = () => { setImg(null); setResult(null); setError(null); };
  const topInfo = result ? CLASS_INFO[result.top.label] : null;
  const modelClasses = Object.keys(CLASS_INFO);

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #f3e8d8',
      boxShadow: '0 2px 8px rgba(139,68,14,.06)', padding: '18px 20px',
      borderTop: `3px solid ${result ? (topInfo?.color || '#16a34a') : '#fbbf24'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Microscope size={17} color="#d97706" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#2c1a0e' }}>
            Diagnostic Santé Colonie — Photo
          </div>
          <div style={{ fontSize: 9, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            YOLOv8-cls · BeeImage · top-1 97,9 % · varroa / reine / pillage
          </div>
        </div>
        {img && (
          <button onClick={reset} style={{ background: '#faf6f0', border: '1px solid #f3e8d8', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a8a29e' }}>
            <X size={12} />
          </button>
        )}
      </div>

      {!img ? (
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          padding: '22px 0', border: '2px dashed #fbbf2466', borderRadius: 12,
          cursor: 'pointer', background: '#fffbeb44',
        }}>
          <Upload size={20} color="#d97706" style={{ opacity: 0.7 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#78716c' }}>Photo d'abeille (cadre / planche d'envol)</span>
          <span style={{ fontSize: 9, color: '#a8a29e' }}>PNG · JPG — analyse instantanée</span>
          <input ref={inputRef} type="file" hidden accept="image/*" onChange={handleFile} />
        </label>
      ) : (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ width: 110, height: 110, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#2c1a0e', position: 'relative' }}>
            <img src={img} alt="scan abeille" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {busy && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(44,26,14,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={18} color="#fbbf24" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            {error ? (
              <div style={{ fontSize: 11, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={13} /> {error}
              </div>
            ) : result && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {result.healthy
                    ? <CheckCircle2 size={15} color="#16a34a" />
                    : <AlertTriangle size={15} color={topInfo?.color || '#dc2626'} />}
                  <span style={{ fontSize: 13, fontWeight: 900, color: topInfo?.color || '#2c1a0e' }}>
                    {topInfo?.label || result.top.label} — {Math.round(result.top.confidence * 100)} %
                  </span>
                </div>
                {result.classes.map((c) => {
                  const ci = CLASS_INFO[c.label];
                  return (
                    <div key={c.label} style={{ marginBottom: 5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#78716c', marginBottom: 2 }}>
                        <span>{ci?.label || c.label}</span>
                        <span style={{ fontWeight: 800, color: ci?.color || '#78716c' }}>{Math.round(c.confidence * 100)} %</span>
                      </div>
                      <div style={{ height: 4, background: '#faf6f0', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${c.confidence * 100}%`, height: '100%', background: ci?.color || '#a8a29e', borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ fontSize: 10.5, color: topInfo?.color || '#57534e', fontWeight: 600, marginTop: 8, lineHeight: 1.5 }}>
                  💡 {topInfo?.advice}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ℹ️ Liste des classes du modèle (FR/EN/AR) — clic pour ouvrir/fermer ── */}
      <div style={{ marginTop: 12 }}>
        <ModelClassesInfo classes={modelClasses} accent="#d97706" />
      </div>
    </div>
  );
}
