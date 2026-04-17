import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const [metadata, setMetadata] = useState(null);
  const [palette, setPalette] = useState({});
  
  const videoRef = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch Metadata
  useEffect(() => {
    cvAPI.getModelMetadata(category)
      .then(res => {
        setMetadata(res.data);
        const p = {};
        const colors = ['#7c3aed', '#ef4444', '#f97316', '#22c55e', '#3b82f6', '#ec4899', '#eab308', '#06b6d4'];
        Object.values(res.data.names).forEach((name, i) => {
          p[name.toLowerCase()] = colors[i % colors.length];
        });
        setPalette(p);
      })
      .catch(err => console.error("Metadata fetch error:", err));
  }, [category]);

  // Handle Camera Stream
  useEffect(() => {
    let stream = null;
    if (mode === 'camera') {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 1280, height: 720 } })
        .then(s => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => {
          console.error("Camera access error:", err);
          setError("Accès caméra refusé.");
          setMode('upload');
        });
    }
    return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
  }, [mode]);

  const getDetColor = (label) => palette[label.toLowerCase()] || color;

  const drawBoxes = useCallback(() => {
    const canvas = canvasRef.current;
    const viewport = mode === 'camera' ? videoRef.current : imgRef.current;
    if (!canvas || !viewport || !detections.length) return;

    canvas.width = viewport.offsetWidth;
    canvas.height = viewport.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const W = canvas.width;
    const H = canvas.height;

    detections.forEach(det => {
      const [cx_p, cy_p, w_p, h_p, rot = 0] = det.bbox;
      const w = (w_p / 100) * W;
      const h = (h_p / 100) * H;
      const cx = (cx_p / 100) * W;
      const cy = (cy_p / 100) * H;
      const x1 = cx - w/2;
      const y1 = cy - h/2;
      const boxColor = getDetColor(det.label);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.translate(-cx, -cy);

      // Box with Glow
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = boxColor;
      ctx.strokeRect(x1, y1, w, h);

      // Corner Accents
      const cl = Math.min(w, h) * 0.2;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x1, y1 + cl); ctx.lineTo(x1, y1); ctx.lineTo(x1 + cl, y1);
      ctx.stroke();

      // Label
      const conf = Math.floor(det.confidence * 100);
      const labelTxt = `${det.label.toUpperCase()} ${conf}%`;
      ctx.font = 'bold 11px Inter, sans-serif';
      const tw = ctx.measureText(labelTxt).width;
      ctx.fillStyle = boxColor;
      ctx.shadowBlur = 0;
      ctx.fillRect(x1, y1 - 20, tw + 10, 20);
      ctx.fillStyle = '#fff';
      ctx.fillText(labelTxt, x1 + 5, y1 - 6);

      ctx.restore();
    });
  }, [detections, palette, mode, color]);

  useEffect(() => {
    const timer = setTimeout(drawBoxes, 100);
    return () => clearTimeout(timer);
  }, [detections, drawBoxes]);

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
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      setCapturedImage(URL.createObjectURL(blob));
      runInference(file);
    }, 'image/jpeg');
  };

  const runInference = async (file) => {
    setIsProcessing(true); setDetections([]); setError(null);
    try {
      const res = await cvAPI.detect(file, category);
      setDetections(res.data.detections);
      if (onAnalysisComplete) onAnalysisComplete(res.data);
    } catch (err) {
      setError("Erreur analyse AI.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => { setCapturedImage(null); setDetections([]); setError(null); };

  return (
    <div className="card glass-card" style={{ padding: 0, overflow: 'hidden', border: `1px solid ${color}33`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', background: 'var(--glass-bg)', borderBottom: `1px solid ${color}22`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Activity size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{title}</h3>
            <span style={{ fontSize: 10, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Modèle: {category}</span>
          </div>
        </div>
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: 3, borderRadius: 8, gap: 2 }}>
          <button onClick={() => {setMode('upload'); reset();}} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: mode === 'upload' ? 'white' : 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Fichier</button>
          <button onClick={() => {setMode('camera'); reset();}} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: mode === 'camera' ? 'white' : 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Live</button>
        </div>
      </div>

      <div style={{ height: 320, background: '#000', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {mode === 'camera' && !capturedImage ? (
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : capturedImage && (
          <img ref={imgRef} src={capturedImage} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Scanning..." />
        )}
        
        {!capturedImage && mode === 'upload' && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
            <Upload size={40} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 12 }}>Importer une image pour analyse</p>
            <button className="btn btn-sm" onClick={() => fileInputRef.current.click()} style={{ marginTop: 12, background: 'white', color: '#000' }}>Parcourir</button>
          </div>
        )}

        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }} />

        {isProcessing && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', flexWrap:'wrap', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
             <div className="spinner-center" style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: color, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        )}
        
        {detections.length > 0 && (
           <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, background: 'rgba(0,0,0,0.8)', padding: '5px 10px', borderRadius: 6, fontSize: 10, color: 'white', zIndex: 50 }}>
              AI: {detections.length} objets détectés et enregistrés
           </div>
        )}
      </div>

      <div style={{ padding: '12px 20px', background: 'var(--glass-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
        {capturedImage ? (
          <button className="btn btn-secondary btn-sm" onClick={reset}><RefreshCcw size={14} /> Reset</button>
        ) : mode === 'camera' && (
          <button className="btn btn-primary btn-sm" onClick={captureAndScan} style={{ background: color }}><Camera size={14} /> Scan</button>
        )}
        <button 
          className="btn btn-sm"
          onClick={() => window.dispatchEvent(new CustomEvent('open-assistant', { detail: { species: category } }))}
          style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, #000)`, color: 'white' }}
        >
          <Sparkles size={18} />
        </button>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </div>
  );
};


export default AIScanner;
