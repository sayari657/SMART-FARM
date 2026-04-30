import React, { useState, useRef } from 'react';
import { Camera, Hexagon, Bug, Leaf, Flame, Volume2, RotateCcw, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { cvAPI, agentAPI } from '../../services/api';
import offlineDB from '../../db/offlineDB';

const CATEGORIES = [
  { id: 'bee', icon: '🐝', label: 'Ruche', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  { id: 'livestock', icon: '🐄', label: 'Animal', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  { id: 'leaves', icon: '🌿', label: 'Plante', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  { id: 'fire', icon: '🚨', label: 'Urgence', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
];

function WorkerScan() {
  const [selectedCat, setSelectedCat] = useState('bee');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

  const handleCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    setImagePreview(URL.createObjectURL(file));
    try {
      setStep(1);
      let detections = [];
      try {
        const cvRes = await cvAPI.detect(file, selectedCat);
        detections = cvRes.data.detections || [];
      } catch (cvErr) { console.warn("CV skip:", cvErr); }
      setStep(2);
      const base64Image = await toBase64(file);
      const b64Data = base64Image.split(',')[1];
      const agentRes = await agentAPI.analyzeImage(b64Data, "شنوة فمة في التصويرة؟ وهل فمة مشكلة؟", selectedCat);
      const analysisResult = { detections, derjaText: agentRes.data.response_derja, sources: agentRes.data.sources || [] };
      setResult(analysisResult);
      try {
        await offlineDB.pendingReports.add({ photo_b64: b64Data, notes: analysisResult.derjaText, created_at: new Date().toISOString(), synced: 0 });
      } catch (dbErr) { console.warn("Offline DB:", dbErr); }
    } catch (err) {
      setResult({ error: "Erreur lors de l'analyse. Vérifiez votre connexion et réessayez." });
    } finally {
      setLoading(false);
      setStep(0);
    }
  };

  const playTTS = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ar-TN'; u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  };

  const cat = CATEGORIES.find(c => c.id === selectedCat);

  return (
    <div style={{ padding:'24px 20px', background:'#0f172a', minHeight:'100%', display:'flex', flexDirection:'column', alignItems:'center' }}>
      <h1 style={{ color:'#f1f5f9', fontSize:24, fontWeight:800, marginBottom:6, alignSelf:'flex-start' }}>Diagnostic IA</h1>
      <p style={{ color:'#64748b', fontSize:13, marginBottom:24, alignSelf:'flex-start' }}>Photographiez un animal, une plante ou une ruche pour obtenir un diagnostic instantané</p>

      {/* Category Selector */}
      <div style={{ display:'flex', gap:10, marginBottom:28, width:'100%', justifyContent:'center' }}>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCat(c.id)}
            disabled={loading}
            style={{
              flex:1, padding:'12px 8px', borderRadius:16,
              background: selectedCat === c.id ? c.bg : 'rgba(255,255,255,0.04)',
              border: `2px solid ${selectedCat === c.id ? c.color : 'rgba(255,255,255,0.06)'}`,
              cursor:'pointer', transition:'all 0.2s',
              display:'flex', flexDirection:'column', alignItems:'center', gap:4
            }}
          >
            <span style={{ fontSize:22 }}>{c.icon}</span>
            <span style={{ fontSize:10, fontWeight:700, color: selectedCat === c.id ? c.color : '#64748b' }}>{c.label}</span>
          </button>
        ))}
      </div>

      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleCapture} style={{ display:'none' }} />

      {/* Main Scan Button */}
      {!loading && !result && (
        <button
          onClick={() => fileInputRef.current.click()}
          style={{
            width:200, height:200, borderRadius:'50%',
            background:`linear-gradient(135deg, ${cat.color}33, ${cat.color}11)`,
            border:`3px solid ${cat.color}66`,
            boxShadow:`0 0 60px ${cat.color}22, 0 20px 40px rgba(0,0,0,0.3)`,
            cursor:'pointer', display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', gap:10,
            transition:'all 0.2s', marginBottom:20
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; e.currentTarget.style.boxShadow = `0 0 40px ${cat.color}44, 0 10px 20px rgba(0,0,0,0.4)`; }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 0 60px ${cat.color}22, 0 20px 40px rgba(0,0,0,0.3)`; }}
        >
          <Camera size={60} color={cat.color} />
          <span style={{ color:cat.color, fontWeight:800, fontSize:18, letterSpacing:'1px', textTransform:'uppercase' }}>
            Scanner
          </span>
        </button>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:24, padding:32, textAlign:'center', width:'100%', maxWidth:340,
          display:'flex', flexDirection:'column', alignItems:'center', gap:16
        }}>
          {imagePreview && <img src={imagePreview} alt="" style={{ width:80, height:80, borderRadius:16, objectFit:'cover', opacity:0.7 }} />}
          <div style={{ position:'relative', width:60, height:60 }}>
            <div style={{
              position:'absolute', inset:0, borderRadius:'50%',
              border:'4px solid rgba(34,197,94,0.2)',
              borderTopColor:'#22c55e',
              animation:'spin 1s linear infinite'
            }} />
            <div style={{ position:'absolute', inset:8, borderRadius:'50%', background:'rgba(34,197,94,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {step === 1 ? <Camera size={18} color="#22c55e" /> : <Leaf size={18} color="#22c55e" />}
            </div>
          </div>
          <div>
            <div style={{ color:'#f1f5f9', fontWeight:700, fontSize:16, marginBottom:4 }}>
              {step === 1 ? 'Analyse visuelle...' : 'Consultation IA...'}
            </div>
            <div style={{ color:'#64748b', fontSize:13 }}>
              {step === 1 ? 'Détection des anomalies par YOLO' : 'Interprétation par Labess AI'}
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div style={{ width:'100%', maxWidth:420 }}>
          {imagePreview && (
            <div style={{ position:'relative', marginBottom:16, borderRadius:20, overflow:'hidden' }}>
              <img src={imagePreview} alt="Scan" style={{ width:'100%', height:180, objectFit:'cover', display:'block' }} />
              <div style={{
                position:'absolute', inset:0,
                background:'linear-gradient(to top, rgba(15,23,42,0.9) 0%, transparent 60%)'
              }} />
              <div style={{
                position:'absolute', bottom:16, left:16,
                background: result.error ? 'rgba(239,68,68,0.9)' : 'rgba(34,197,94,0.9)',
                borderRadius:20, padding:'6px 14px', fontSize:12, fontWeight:700,
                color:'white', display:'flex', alignItems:'center', gap:6
              }}>
                {result.error ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                {result.error ? 'Analyse échouée' : 'Diagnostic prêt'}
              </div>
            </div>
          )}

          <div style={{
            background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:20, padding:20
          }}>
            {result.error ? (
              <p style={{ color:'#f87171', fontSize:14 }}>{result.error}</p>
            ) : (
              <>
                {result.detections?.length > 0 && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ color:'#64748b', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>
                      Détections
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {result.detections.map((d, i) => (
                        <span key={i} style={{
                          background:'rgba(34,197,94,0.1)', color:'#4ade80',
                          border:'1px solid rgba(34,197,94,0.2)',
                          borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600
                        }}>
                          {d.label} · {(d.confidence * 100).toFixed(0)}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div style={{ color:'#94a3b8', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px' }}>
                    Diagnostic en Darja
                  </div>
                  <button
                    onClick={() => playTTS(result.derjaText)}
                    style={{
                      background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.3)',
                      borderRadius:20, padding:'6px 12px', color:'#60a5fa',
                      cursor:'pointer', fontSize:12, fontWeight:600,
                      display:'flex', alignItems:'center', gap:6
                    }}
                  >
                    <Volume2 size={14} /> Écouter
                  </button>
                </div>

                <div style={{
                  background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.05)',
                  borderRadius:14, padding:16, textAlign:'right',
                  color:'#f1f5f9', fontSize:18, lineHeight:1.8, direction:'rtl',
                  fontFamily:'Arial, sans-serif'
                }}>
                  {result.derjaText}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => { setResult(null); setImagePreview(null); }}
            style={{
              width:'100%', marginTop:12, padding:14,
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:16, color:'#94a3b8', fontSize:14, fontWeight:600, cursor:'pointer'
            }}
          >
            Nouveau scan
          </button>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

export default WorkerScan;
