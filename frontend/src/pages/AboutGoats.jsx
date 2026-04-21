import ExpertAssistant from '../components/expert/ExpertAssistant';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Thermometer, 
  Activity, 
  Eye, 
  Plus, 
  Milk, 
  Footprints, 
  TrendingUp,
  AlertTriangle,
  Upload,
  Camera,
  ScanLine,
  CheckCircle2
} from 'lucide-react';
import Navbar from '../components/Navbar';
import ThreeSpeciesCard from '../components/ThreeSpeciesCard';
import KPIBox from '../components/KPIBox';
import ThreeTile from '../components/ThreeTile';
import { animalsAPI, telemetryAPI, cvAPI } from '../services/api';

// ─── Colors per class ─────────────────────────────────────────────────────────
const CLASS_COLORS = { cow: '#f97316', goat: '#22c55e', sheep: '#3b82f6' };

export default function AboutGoats() {
  const navigate = useNavigate();
  const [goatUnits, setGoatUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceMode, setSourceMode] = useState('live'); 
  const [capturedImage, setCapturedImage] = useState(null);  // base64 / objectURL
  const [activeDetections, setActiveDetections] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectError, setDetectError] = useState(null);
  const [latestTelemetry, setLatestTelemetry] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);       // canvas overlay for bounding boxes
  const imgRef   = useRef(null);        // the displayed image element
  const hiddenCanvas = useRef(document.createElement('canvas'));
  const fileInputRef = useRef(null);

  const [stats, setStats] = useState({
    avgTemp: 38.9, milkYield: 3.5, activityLevel: 92, ruminationRate: 85
  });

  useEffect(() => {
    animalsAPI.list({ species: 'goat' })
      .then(res => {
        setGoatUnits(res.data);
        if (res.data.length > 0) fetchUnitTelemetry(res.data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchUnitTelemetry = (unitId) => {
    telemetryAPI.getLatest(unitId).then(res => {
      setLatestTelemetry(res.data);
      if (res.data?.metrics) {
        setStats(prev => ({
          ...prev,
          avgTemp: res.data.metrics.temperature || 38.9,
          milkYield: res.data.metrics.milk_yield || 3.5,
          activityLevel: res.data.metrics.activity_index || 92,
          ruminationRate: res.data.metrics.rumination_rate || 85
        }));
      }
    }).catch(() => {});
  };

  // ─── Camera stream ────────────────────────────────────────────────────────
  useEffect(() => {
    if (sourceMode === 'camera' && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
        .catch(err => console.error("Webcam error:", err));
    } else if (sourceMode !== 'camera' && videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
  }, [sourceMode]);

  // ─── Draw bounding boxes on canvas ───────────────────────────────────────
  const drawBoundingBoxes = useCallback((detections) => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;

    const rect = img.getBoundingClientRect();
    canvas.width  = img.offsetWidth;
    canvas.height = img.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!detections || detections.length === 0) return;

    detections.forEach(det => {
      // Backend returns relative percentages [cx%, cy%, w%, h%, rotation]
      const [cx_pct, cy_pct, w_pct, h_pct, rot = 0] = det.bbox;
      const W = canvas.width;
      const H = canvas.height;

      // Convert center+size percentages → pixel x1,y1,x2,y2
      const w  = (w_pct / 100) * W;
      const h  = (h_pct / 100) * H;
      const cx = (cx_pct / 100) * W;
      const cy = (cy_pct / 100) * H;
      const x1 = cx - w / 2;
      const y1 = cy - h / 2;

      const color = CLASS_COLORS[det.label?.toLowerCase()] || '#22c55e';
      const conf  = Math.round(det.confidence * 100);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.translate(-cx, -cy);

      // Rectangle
      ctx.strokeStyle = color;
      ctx.lineWidth   = 3;
      ctx.shadowBlur  = 12;
      ctx.shadowColor = color;
      ctx.strokeRect(x1, y1, w, h);

      // Corner accents
      const cl = Math.min(w, h) * 0.2;
      ctx.lineWidth = 5;
      [[x1, y1], [x1 + w, y1], [x1, y1 + h], [x1 + w, y1 + h]].forEach(([px, py]) => {
        const dx = px === x1 ? cl : -cl;
        const dy = py === y1 ? cl : -cl;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dx, py); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + dy); ctx.stroke();
      });

      // Label background
      const label = `${det.label?.toUpperCase()}  ${conf}%`;
      ctx.font      = 'bold 13px Inter, sans-serif';
      ctx.shadowBlur = 0;
      const tw = ctx.measureText(label).width;
      const lh = 22;
      const ly = Math.max(y1 - lh - 4, 0);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x1, ly, tw + 16, lh, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x1 + 8, ly + 15);

      ctx.restore();
    });
  }, []);

  // Redraw when detections change
  useEffect(() => {
    if (capturedImage && activeDetections.length > 0) {
      // Wait for image to be rendered
      setTimeout(() => drawBoundingBoxes(activeDetections), 100);
    }
  }, [activeDetections, capturedImage, drawBoundingBoxes]);

  // ─── Upload + Inference ───────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (f) => setCapturedImage(f.target.result);
    reader.readAsDataURL(file);

    setIsProcessing(true);
    setDetectError(null);
    setActiveDetections([]);

    try {
      // ✅ Pass category='goat' — this loads the livestock model (goat+cow+sheep)
      const res = await cvAPI.detect(file, 'goat');
      setActiveDetections(res.data.detections || []);
    } catch (err) {
      console.error('Inference Error:', err);
      setDetectError(err.response?.data?.detail || 'Erreur serveur. Vérifiez que le backend est démarré.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Camera scan ─────────────────────────────────────────────────────────
  const scanCameraFrame = async () => {
    if (!videoRef.current) return;
    const canvas = hiddenCanvas.current;
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setCapturedImage(URL.createObjectURL(blob));
      setIsProcessing(true);
      setDetectError(null);
      try {
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
        const res  = await cvAPI.detect(file, 'goat');
        setActiveDetections(res.data.detections || []);
      } catch (err) {
        setDetectError('Erreur lors de l\'analyse de la capture.');
      } finally {
        setIsProcessing(false);
      }
    }, 'image/jpeg');
  };

  return (
    <>
      <Navbar 
        title="Caprine Management Portal" 
        subtitle="Goat health, milk yield and activity supervision" 
      />
      
      <div className="page-content">
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/animals')} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowLeft size={16} /> Back to Animals
          </button>

          <div style={{ display: 'flex', background: 'var(--color-surface)', padding: 4, borderRadius: 12, border: '1px solid var(--color-border)', gap: 4 }}>
            {[
              { id: 'live', label: 'Herd Stream', icon: Activity },
              { id: 'camera', label: 'Vision Node', icon: Eye },
              { id: 'upload', label: 'Detection', icon: Plus }
            ].map(m => (
              <button 
                key={m.id}
                onClick={() => setSourceMode(m.id)}
                className={`btn btn-sm ${sourceMode === m.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ border: 'none', background: sourceMode === m.id ? 'var(--color-primary)' : 'transparent', color: sourceMode === m.id ? 'white' : 'var(--color-text-2)' }}
              >
                <m.icon size={14} style={{ marginRight: 6 }} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid-2-1" style={{ marginBottom: 32, gap: 24 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: '400px', display: 'flex', flexDirection: 'column' }}>
            {sourceMode === 'live' ? (
              <div style={{ flex: 1, position: 'relative', background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)' }}>
                <ThreeSpeciesCard sp="goat" count={goatUnits.length} emoji="🐐" color="#dc2626" isActive={true} onClick={() => {}} />
                <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10 }}>
                  <h2 style={{ fontSize: 24, color: '#991b1b', marginBottom: 4 }}>Capra Hircus</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge badge-error">High Activity</span>
                    <span className="badge badge-info">{goatUnits.length} Managed Goats</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, position: 'relative', background: '#0a0a0a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* ── Camera mode ── */}
                {sourceMode === 'camera' && (
                  <>
                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 2, background: 'linear-gradient(to right, transparent, #22c55e, transparent)', animation: 'scanline 3s linear infinite' }} />
                    <button className="btn btn-primary" onClick={scanCameraFrame} disabled={isProcessing}
                      style={{ position: 'absolute', bottom: 20, background: '#22c55e', border: 'none' }}>
                      <Camera size={14} style={{ marginRight: 6 }} /> Analyser Frame
                    </button>
                  </>
                )}

                {/* ── Upload mode: image + canvas overlay ── */}
                {sourceMode === 'upload' && (
                  capturedImage ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {/* Image de base */}
                      <img
                        ref={imgRef}
                        src={capturedImage}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                        alt="Detection Input"
                        onLoad={() => activeDetections.length > 0 && drawBoundingBoxes(activeDetections)}
                      />
                      {/* Canvas overlay — bounding boxes dessinées ici */}
                      <canvas
                        ref={canvasRef}
                        style={{
                          position: 'absolute', top: '50%', left: '50%',
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'none', zIndex: 10
                        }}
                      />

                      {/* Processing spinner */}
                      {isProcessing && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
                          <div style={{ width: 46, height: 46, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          <span style={{ color: '#22c55e', marginTop: 14, fontWeight: 700, fontSize: 11, letterSpacing: 2 }}>YOLO ANALYSING...</span>
                        </div>
                      )}

                      {/* Error banner */}
                      {detectError && (
                        <div style={{ position: 'absolute', bottom: 60, left: 12, right: 12, background: 'rgba(220,38,38,0.92)', color: 'white', padding: '10px 14px', borderRadius: 8, fontSize: 12, zIndex: 40 }}>
                          ⚠ {detectError}
                        </div>
                      )}

                      {/* Detection summary bar */}
                      {!isProcessing && activeDetections.length > 0 && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', padding: '8px 14px', display: 'flex', gap: 16, alignItems: 'center', zIndex: 20 }}>
                          <CheckCircle2 size={14} color="#22c55e" />
                          <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 12 }}>{activeDetections.length} Détection(s)</span>
                          {['goat','cow','sheep'].map(cls => {
                            const count = activeDetections.filter(d => d.label?.toLowerCase() === cls).length;
                            if (!count) return null;
                            const color = CLASS_COLORS[cls];
                            return (
                              <span key={cls} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'white' }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                                {cls.toUpperCase()} × {count}
                              </span>
                            );
                          })}
                          <button style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #444', color: '#aaa', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11 }}
                            onClick={() => { setCapturedImage(null); setActiveDetections([]); setDetectError(null); if(canvasRef.current) canvasRef.current.getContext('2d').clearRect(0, 0, 9999, 9999); }}>
                            Nouvelle image
                          </button>
                        </div>
                      )}

                      {/* Simple clear if no detections yet */}
                      {!isProcessing && activeDetections.length === 0 && !detectError && (
                        <button className="btn btn-secondary btn-sm" style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 20 }}
                          onClick={() => { setCapturedImage(null); setDetectError(null); }}>
                          Clear
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Drop zone */
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                      <Upload size={52} style={{ marginBottom: 12, opacity: 0.3 }} />
                      <p style={{ fontSize: 13, marginBottom: 4 }}>Importer une image de chèvre / mouton / vache</p>
                      <p style={{ fontSize: 11, opacity: 0.5, marginBottom: 20 }}>Le modèle YOLO livestock détectera automatiquement</p>
                      <label className="btn btn-primary" style={{ cursor: 'pointer', background: '#22c55e', border: 'none' }}>
                        <Upload size={13} style={{ marginRight: 6 }} /> Parcourir
                        <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleFileUpload} />
                      </label>
                    </div>
                  )
                )}
              </div>
            )}

            <div style={{ background: 'var(--color-surface)', padding: '12px 20px', display: 'flex', gap: 20, borderTop: '1px solid var(--color-border)' }}>
              {['Alpine', 'Nubian', 'Boer', 'Kid'].map(c => (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 600 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626' }} />{c}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ThreeTile><KPIBox icon={Thermometer} value={stats.avgTemp} label="Avg Rectal Temp" colorClass="yellow" unit="°C" /></ThreeTile>
            <ThreeTile><KPIBox icon={Milk} value={stats.milkYield} label="Daily Milk Yield" colorClass="blue" unit="L" /></ThreeTile>
            <ThreeTile><KPIBox icon={TrendingUp} value={stats.activityLevel} label="Agility Index" colorClass="red" unit="pts" /></ThreeTile>
          </div>
        </div>

        <div className="grid-2-1" style={{ marginBottom: 32, gap: 24 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Behavioral Monitoring</div></div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { l: 'Rumination', v: `${stats.ruminationRate}% Optimal`, p: stats.ruminationRate, icon: Activity },
                  { l: 'Climbing Energy', v: 'High', p: 95, icon: TrendingUp },
                  { l: 'Alert Priority', v: 'Low (None)', p: 5, icon: AlertTriangle }
                ].map(item => (
                  <div key={item.l} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><item.icon size={14} color="#dc2626" />{item.l}</span>
                      <span>{item.v}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--color-bg)', borderRadius: 2 }}>
                      <div style={{ width: `${item.p}%`, height: '100%', background: '#dc2626', borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Registered Goats</div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Goat Name</th><th>Tag ID</th><th>Status</th></tr></thead>
                <tbody>
                   {goatUnits.map(unit => (
                    <tr key={unit.id}>
                      <td style={{ fontWeight: 600 }}>{unit.name}</td>
                      <td><code>{unit.identifier || 'N/A'}</code></td>
                      <td><span className="badge badge-success">Online</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <ExpertAssistant species="goat" color="#dc2626" />
    </>
  );
}
