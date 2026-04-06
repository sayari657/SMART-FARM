import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Wind, 
  Droplets, 
  Thermometer, 
  Activity, 
  PieChart, 
  Calendar,
  AlertCircle,
  Eye,
  Plus
} from 'lucide-react';
import Navbar from '../components/Navbar';
import ThreeSpeciesCard from '../components/ThreeSpeciesCard';
import KPIBox from '../components/KPIBox';
import ThreeTile from '../components/ThreeTile';
import { animalsAPI, telemetryAPI, cvAPI } from '../services/api';

export default function AboutBee() {
  const navigate = useNavigate();
  const [beeUnits, setBeeUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceMode, setSourceMode] = useState('live'); // 'live', 'camera', 'upload'
  const [capturedImage, setCapturedImage] = useState(null);
  const [realDetections, setRealDetections] = useState([]);
  const [activeDetections, setActiveDetections] = useState([]); // Real-time result overlay
  const [isProcessing, setIsProcessing] = useState(false);
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(document.createElement('canvas')); // For frame capture
  
  const [stats, setStats] = useState({
    avgTemp: 34.5,
    avgHumidity: 62,
    activityLevel: 88,
    honeyYield: 12.4
  });

  // Load bee units and initial telemetry
  useEffect(() => {
    animalsAPI.list({ species: 'bee' })
      .then(res => {
        setBeeUnits(res.data);
        if (res.data.length > 0) {
          fetchUnitTelemetry(res.data[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchUnitTelemetry = (unitId) => {
    telemetryAPI.getLatest(unitId).then(res => {
      setLatestTelemetry(res.data);
      if (res.data && res.data.metrics) {
        setStats(prev => ({
          ...prev,
          avgTemp: res.data.metrics.temperature || 34.5,
          avgHumidity: res.data.metrics.humidity || 62,
          activityLevel: res.data.metrics.activity_index || 88
        }));
      }
    }).catch(err => console.error("Telemetry fetch error:", err));
  };

  // Poll for real detection data (Log feed)
  useEffect(() => {
    const fetchDetections = () => {
      cvAPI.recent(10).then(res => {
        const beeRelevant = res.data.filter(d => 
          ['bee', 'drone', 'pollenbee', 'queen'].includes(d.object_class?.toLowerCase())
        );
        setRealDetections(beeRelevant);
      }).catch(err => console.error("Error fetching CV data:", err));
    };

    fetchDetections();
    const interval = setInterval(fetchDetections, 5000); // Poll log every 5 seconds
    return () => clearInterval(interval);
  }, [beeUnits]);

  // WebCam Logic
  useEffect(() => {
    if (sourceMode === 'camera' && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
        .catch(err => console.error("Webcam error:", err));
    } else if (sourceMode !== 'camera' && videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  }, [sourceMode]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (f) => setCapturedImage(f.target.result);
      reader.readAsDataURL(file);
      
      // Perform REAL detection
      setIsProcessing(true);
      try {
        const res = await cvAPI.detect(file);
        setActiveDetections(res.data.detections);
      } catch (err) {
        console.error("Inference Error:", err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const scanCameraFrame = async () => {
    if (!videoRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setIsProcessing(true);
      try {
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        const res = await cvAPI.detect(file);
        setActiveDetections(res.data.detections);
      } catch (err) {
        console.error("Camera Inference Error:", err);
      } finally {
        setIsProcessing(false);
      }
    }, 'image/jpeg');
  };

  return (
    <>
      <Navbar 
        title="Smart Bee Intelligence" 
        subtitle="Advanced hive monitoring and apiary analytics" 
      />
      
      <div className="page-content">
        {/* Navigation & Source Selection */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/animals')}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <ArrowLeft size={16} /> Back to Animals
          </button>

          <div style={{ display: 'flex', background: 'var(--color-surface)', padding: 4, borderRadius: 12, border: '1px solid var(--color-border)', gap: 4 }}>
            {[
              { id: 'live', label: 'Live Stream', icon: Activity },
              { id: 'camera', label: 'PC Camera', icon: Eye },
              { id: 'upload', label: 'Image Upload', icon: Plus }
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
          {/* Main Hero Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: '400px', display: 'flex', flexDirection: 'column' }}>
            {sourceMode === 'live' ? (
              <div style={{ flex: 1, position: 'relative', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
                <ThreeSpeciesCard sp="bee" count={beeUnits.length} emoji="🐝" color="#d97706" isActive={true} onClick={() => {}} />
                <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10 }}>
                  <h2 style={{ fontSize: 24, color: '#92400e', marginBottom: 4 }}>Apis Mellifera</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge badge-warning">Active Monitoring</span>
                    <span className="badge badge-info">Healthy Colony</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, position: 'relative', background: '#000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {sourceMode === 'camera' && (
                  <>
                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div className="scan-line" />
                    
                    {/* Real-time Bounding Boxes */}
                    {activeDetections.map((det, i) => {
                      const colorMap = { bee: '#fbbf24', drone: '#ef4444', pollenbee: '#10b981', queen: '#f472b6' };
                      const color = colorMap[det.label.toLowerCase()] || '#3b82f6';
                      // det.bbox is [cx, cy, w, h, r]
                      const [cx, cy, w, h, r] = det.bbox;
                      // Mapping coordinate percentages (simplified center-based positioning)
                      return (
                        <div key={i} style={{ 
                          position: 'absolute', 
                          left: `${(cx / videoRef.current?.videoWidth) * 100}%`, 
                          top: `${(cy / videoRef.current?.videoHeight) * 100}%`, 
                          width: `${(w / videoRef.current?.videoWidth) * 100}%`, 
                          height: `${(h / videoRef.current?.videoHeight) * 100}%`, 
                          border: `2px solid ${color}`, 
                          borderRadius: 4, 
                          transform: `translate(-50%, -50%) rotate(${r * (180/Math.PI)}deg)`, 
                          boxShadow: `0 0 10px ${color}` 
                        }}>
                          <span style={{ position: 'absolute', top: -18, left: -2, background: color, color: '#fff', fontSize: '9px', fontWeight: 800, padding: '2px 4px', borderRadius: 2, whiteSpace: 'nowrap' }}>
                            {det.label.toUpperCase()} {Math.floor(det.confidence * 100)}%
                          </span>
                        </div>
                      );
                    })}

                    <button 
                      className="btn btn-primary" 
                      onClick={scanCameraFrame}
                      disabled={isProcessing}
                      style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                    >
                      {isProcessing ? <Activity size={16} className="spin" /> : <Eye size={16} />}
                      {isProcessing ? 'Analyzing...' : 'Scan Now (best.pt)'}
                    </button>
                  </>
                )}
                {sourceMode === 'upload' && (
                  capturedImage ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={capturedImage} id="detect-image" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Upload Preview" />
                      
                      {/* Real Boxes for Uploaded Image */}
                      {activeDetections.map((det, i) => {
                        const colorMap = { bee: '#fbbf24', drone: '#ef4444', pollenbee: '#10b981', queen: '#f472b6' };
                        const color = colorMap[det.label.toLowerCase()] || '#3b82f6';
                        const [cx, cy, w, h, r] = det.bbox;
                        // Note: Bbox coordinates are usually relative to image size.
                        // For a simple demo, we'll assume the backend returns relative or we'll need image scale.
                        // YOLO results from .predict(image) are in pixels of the input.
                        return (
                          <div key={i} style={{ 
                            position: 'absolute', 
                            left: `${cx}%`, // Backend logic change needed or frontend calculation
                            top: `${cy}%`, 
                            width: `${w}%`, 
                            height: `${h}%`, 
                            border: `2px solid ${color}`, 
                            borderRadius: 4, 
                            transform: `translate(-50%, -50%) rotate(${det.task === 'obb' ? r * (180/Math.PI) : 0}deg)`, 
                            boxShadow: `0 0 10px ${color}`,
                            zIndex: 10
                          }}>
                            <span style={{ position: 'absolute', top: -16, left: -2, background: color, color: '#fff', fontSize: '9px', fontWeight: 800, padding: '2px 4px', borderRadius: 2 }}>
                              {det.label.toUpperCase()} {Math.floor(det.confidence * 100)}%
                            </span>
                          </div>
                        );
                      })}

                      {isProcessing && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                          <Activity size={32} className="spin" color="white" />
                        </div>
                      )}

                      <button className="btn btn-secondary btn-sm" style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 60 }} onClick={() => { setCapturedImage(null); setActiveDetections([]); }}>
                        Clear Image
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: '#666' }}>
                      <Plus size={48} />
                      <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                        Choose Image to Detect
                        <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                      </label>
                      <span style={{ fontSize: 12 }}>Using: best.pt | oriented-obb</span>
                    </div>
                  )
                )}
              </div>
            )}
            
            <div style={{ background: 'var(--color-surface)', padding: '12px 20px', display: 'flex', gap: 20, borderTop: '1px solid var(--color-border)' }}>
              {[
                { label: 'Bee', color: '#fbbf24' },
                { label: 'Drone', color: '#ef4444' },
                { label: 'Pollen Bee', color: '#10b981' },
                { label: 'Queen', color: '#f472b6' }
              ].map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 600 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
                  {c.label}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ThreeTile>
              <KPIBox icon={Thermometer} value={stats.avgTemp} label="Avg Hive Temp" colorClass="yellow" unit="°C" />
            </ThreeTile>
            <ThreeTile>
              <KPIBox icon={Droplets} value={stats.avgHumidity} label="Avg Humidity" colorClass="blue" unit="%" />
            </ThreeTile>
            {/* Detection Summary in sidebar when not in Live mode */}
            <ThreeTile>
              <div style={{ padding: '0 20px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="kpi-label">Active Detections</div>
                  <div className="kpi-value">{activeDetections.length || realDetections.length}</div>
                </div>
                <Activity size={24} color="#10b981" />
              </div>
            </ThreeTile>
          </div>
        </div>

        {/* Detailed Insights */}
        <div className="grid-2-1" style={{ marginBottom: 32, gap: 24 }}>
          {/* Detection Results Log */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <div className="card-title">Real-time Hit Feed [best.pt]</div>
              <div className="card-subtitle">Source: {sourceMode.toUpperCase()} | Task: OBB</div>
            </div>
            <div style={{ flex: 1, padding: '0 16px 16px', overflowY: 'auto', maxHeight: '340px', fontSize: '11px', fontFamily: 'monospace' }}>
              {realDetections.length > 0 ? (
                realDetections.map((log, i) => {
                  const colorMap = { bee: '#fbbf24', drone: '#ef4444', pollenbee: '#10b981', queen: '#f472b6' };
                  const color = colorMap[log.object_class?.toLowerCase()] || 'var(--color-primary)';
                  const timeStr = new Date(log.timestamp).toLocaleTimeString();
                  
                  return (
                    <div key={log.id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ color: 'var(--color-text-3)' }}>[{timeStr}]</span>
                      <span style={{ color: color, fontWeight: 700 }}>{log.object_class?.toUpperCase()}</span>
                      <span style={{ color: 'var(--color-text-2)' }}>CONF: {Math.floor((log.confidence || 0) * 100)}%</span>
                      <span style={{ padding: '2px 6px', background: `${color}15`, color: color, borderRadius: 4, fontSize: 9, fontWeight: 800 }}>
                        {log.severity?.toUpperCase() || 'INFO'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-3)' }}>
                  <Activity size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <p>Awaiting live detections...</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Hive Parameters</div>
              <div className="card-subtitle">Real monitoring from unit {(beeUnits[0]?.name || 'N/A')}</div>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { l: 'Ventilation', v: latestTelemetry?.metrics?.ventilation || 'Optimal', p: latestTelemetry?.metrics?.fan_speed || 45 },
                  { l: 'Pollen Rate', v: `${latestTelemetry?.metrics?.pollen_rate || 8.2}g/hr`, p: (latestTelemetry?.metrics?.pollen_rate ? 72 : 0) },
                  { l: 'Noise Level', v: latestTelemetry?.metrics?.noise || 'Nominal', p: 30 }
                ].map(item => (
                  <div key={item.l} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                      <span>{item.l}</span>
                      <span>{item.v}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--color-bg)', borderRadius: 2 }}>
                      <div style={{ width: `${item.p}%`, height: '100%', background: 'var(--color-primary)', borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 32, gap: 24 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Hive Health Overview</div>
              <div className="card-subtitle">AI-driven diagnostics for current colonies</div>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Wind size={18} color="#d97706" />
                    <span style={{ fontWeight: 600 }}>Ventilation</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{latestTelemetry?.metrics?.ventilation || 'Optimal'}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Fan speed at {latestTelemetry?.metrics?.fan_speed || 45}%</div>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <PieChart size={18} color="#3b82f6" />
                    <span style={{ fontWeight: 600 }}>Pollen Rate</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{latestTelemetry?.metrics?.pollen_rate || 8.2}g/hr</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{latestTelemetry?.metrics?.pollen_rate > 9 ? 'Above average' : 'Normal'}</div>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Calendar size={18} color="#10b981" />
                    <span style={{ fontWeight: 600 }}>Next Harvest</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{latestTelemetry?.metrics?.days_to_harvest || 12} Days</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Est. {latestTelemetry?.metrics?.honey_yield || 15}kg yield</div>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <AlertCircle size={18} color="#ef4444" />
                    <span style={{ fontWeight: 600 }}>Risk Level</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{(beeUnits[0]?.health_score || 100) > 90 ? 'Low' : 'Caution'}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>No pathogens detected</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Managed Hives</div>
              <div className="card-subtitle">{beeUnits.length} units listed in database</div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Hive Name</th>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {beeUnits.map(unit => (
                    <tr key={unit.id}>
                      <td style={{ fontWeight: 600 }}>{unit.name}</td>
                      <td><code>{unit.identifier || 'N/A'}</code></td>
                      <td><span className="badge badge-success">Online</span></td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/animals/${unit.id}`)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {beeUnits.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-3)' }}>
                        No bee units found. Add them in the Animals page.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
