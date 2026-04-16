import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Sparkles, X, Activity, Maximize2, RefreshCcw } from 'lucide-react';
import { cvAPI } from '../services/api';

/**
 * AIScanner: A premium reusable component for real-time and file-based AI vision.
 * Supports YOLO categories: bee, livestock, leaves, olive, insects, fire.
 */
const AIScanner = ({ category = 'livestock', title = 'AI Vision Scanner', color = '#7c3aed', onAnalysisComplete }) => {
  const [mode, setMode] = useState('upload'); // 'camera' or 'upload'
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [detections, setDetections] = useState([]);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const fileInputRef = useRef(null);

  // Handle Camera Stream
  useEffect(() => {
    let stream = null;
    if (mode === 'camera') {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(s => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => {
          console.error("Camera access error:", err);
          setError("Accès caméra refusé ou indisponible.");
          setMode('upload');
        });
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [mode]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (f) => setCapturedImage(f.target.result);
    reader.readAsDataURL(file);

    runInference(file);
  };

  const captureAndScan = () => {
    if (!videoRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      setCapturedImage(URL.createObjectURL(blob));
      runInference(file);
    }, 'image/jpeg');
  };

  const runInference = async (file) => {
    setIsProcessing(true);
    setDetections([]);
    setError(null);
    try {
      const res = await cvAPI.detect(file, category);
      setDetections(res.data.detections);
      if (onAnalysisComplete) onAnalysisComplete(res.data);
    } catch (err) {
      console.error("AI Inference Error:", err);
      setError("Erreur d'analyse AI. Vérifiez la connexion au serveur.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setDetections([]);
    setError(null);
  };

  return (
    <div className="card glass-card" style={{ padding: 0, overflow: 'hidden', border: `1px solid ${color}33`, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', background: 'var(--glass-bg)', borderBottom: `1px solid ${color}22`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Activity size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>
            <span style={{ fontSize: 10, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Modèle: {category}</span>
          </div>
        </div>
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: 3, borderRadius: 8, gap: 2 }}>
          <button onClick={() => setMode('upload')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: mode === 'upload' ? 'white' : 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, boxShadow: mode === 'upload' ? 'var(--shadow-sm)' : 'none' }}>
            <Upload size={12} /> Fichier
          </button>
          <button onClick={() => setMode('camera')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: mode === 'camera' ? 'white' : 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, boxShadow: mode === 'camera' ? 'var(--shadow-sm)' : 'none' }}>
            <Camera size={12} /> Live
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div style={{ height: 300, background: '#000', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {mode === 'camera' && !capturedImage && (
          <>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div className="scanner-line" style={{ 
              position: 'absolute', top: 0, left: 0, width: '100%', height: 2, 
              background: `linear-gradient(to right, transparent, ${color}, transparent)`,
              animation: 'scan 3s linear infinite', zIndex: 10
            }} />
          </>
        )}

        {(mode === 'upload' || capturedImage) && (
          capturedImage ? (
            <img src={capturedImage} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Scanning..." />
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              <Upload size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>Cliquez pour importer une image</p>
              <button 
                className="btn btn-sm" 
                onClick={() => fileInputRef.current.click()}
                style={{ marginTop: 16, background: 'white', color: '#000', border: 'none' }}
              >
                Parcourir
              </button>
            </div>
          )
        )}

        {/* Bounding Box Overlays */}
        {detections.map((det, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${det.bbox[0]}%`, top: `${det.bbox[1]}%`,
            width: `${det.bbox[2]}%`, height: `${det.bbox[3]}%`,
            border: `2px solid ${color}`, borderRadius: 4,
            transform: `translate(-50%, -50%) rotate(${det.bbox[4] || 0}rad)`,
            boxShadow: `0 0 15px ${color}66`,
            zIndex: 20
          }}>
            <span style={{ 
              position: 'absolute', top: -18, left: -2, background: color, color: '#fff', 
              fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: 2,
              whiteSpace: 'nowrap'
            }}>
              {det.label.toUpperCase()} {Math.floor(det.confidence * 100)}%
            </span>
          </div>
        ))}

        {/* Processing State */}
        {isProcessing && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
             <div className="spinner-center" style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: color, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
             <span style={{ color: 'white', marginTop: 12, fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>ANALYSING...</span>
          </div>
        )}

        {error && (
          <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, background: 'rgba(220,38,38,0.9)', color: 'white', padding: '8px 12px', borderRadius: 8, fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, zIndex: 110 }}>
            <X size={14} /> {error}
          </div>
        )}
      </div>

      {/* Controls & Assistant Dock */}
      <div style={{ padding: '12px 20px', background: 'var(--glass-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
        
        <div style={{ display: 'flex', gap: 8 }}>
          {capturedImage ? (
            <button className="btn btn-secondary btn-sm" onClick={reset}>
               <RefreshCcw size={14} style={{ marginRight: 6 }} /> Réinitialiser
            </button>
          ) : (
            mode === 'camera' && (
              <button 
                className="btn btn-primary btn-sm" 
                onClick={captureAndScan} 
                disabled={isProcessing}
                style={{ background: color, border: 'none' }}
              >
                <Camera size={14} style={{ marginRight: 6 }} /> Capturer & Scanner
              </button>
            )
          )}
        </div>

        {/* The Intelligent Assistant Icon (Purple Sparkle) */}
        <button 
          className="assistant-btn-dock"
          onClick={() => {
            const assistantSpecies = category === 'livestock' ? 'cow' : 
                                    (category === 'leaves' || category === 'olive') ? 'plant' : 
                                    category;
            window.dispatchEvent(new CustomEvent('open-assistant', { detail: { species: assistantSpecies } }));
          }}
          style={{ 
            width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, #4c1d95)`, 
            border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: `0 4px 12px ${color}44`, transition: 'all 0.3s ease'
          }}
          title={`Ask the Smart Farm Expert (${category} mode)`}
        >
          <Sparkles size={20} />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan { from { top: 0; } to { top: 100%; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .assistant-btn-dock:hover { transform: scale(1.1) rotate(10deg); filter: brightness(1.2); }
      `}} />
    </div>
  );
};

export default AIScanner;
