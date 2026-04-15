import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Thermometer,
  Activity,
  PieChart,
  Calendar,
  AlertCircle,
  Eye,
  Plus,
  Milk,
  Footprints,
  Heart
} from 'lucide-react';
import Navbar from '../components/Navbar';
import ThreeSpeciesCard from '../components/ThreeSpeciesCard';
import KPIBox from '../components/KPIBox';
import ThreeTile from '../components/ThreeTile';
import { animalsAPI, telemetryAPI, cvAPI } from '../services/api';
import ExpertAssistant from '../components/expert/ExpertAssistant';

export default function AboutCows() {
  const navigate = useNavigate();
  const [cowUnits, setCowUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceMode, setSourceMode] = useState('live');
  const [capturedImage, setCapturedImage] = useState(null);
  const [realDetections, setRealDetections] = useState([]);
  const [activeDetections, setActiveDetections] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(document.createElement('canvas'));

  const [stats, setStats] = useState({
    avgTemp: 38.5,
    ruminationTime: 480,
    activityLevel: 75,
    milkYield: 28.4
  });

  useEffect(() => {
    animalsAPI.list({ species: 'cow' })
      .then(res => {
        setCowUnits(res.data);
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
          avgTemp: res.data.metrics.temperature || 38.5,
          ruminationTime: res.data.metrics.rumination_time || 480,
          activityLevel: res.data.metrics.activity_index || 75,
          milkYield: res.data.metrics.milk_yield || 28.4
        }));
      }
    }).catch(err => console.error("Telemetry fetch error:", err));
  };

  useEffect(() => {
    const fetchDetections = () => {
      cvAPI.recent(10).then(res => {
        const cowRelevant = res.data.filter(d =>
          ['cow', 'calf', 'bull'].includes(d.object_class?.toLowerCase())
        );
        setRealDetections(cowRelevant);
      }).catch(err => console.error("Error fetching CV data:", err));
    };

    fetchDetections();
    const interval = setInterval(fetchDetections, 5000);
    return () => clearInterval(interval);
  }, [cowUnits]);

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
        title="Bovine Intelligence Dashboard"
        subtitle="Precision dairy and beef monitoring system"
      />

      <div className="page-content">
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/animals')} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
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
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: '400px', display: 'flex', flexDirection: 'column' }}>
            {sourceMode === 'live' ? (
              <div style={{ flex: 1, position: 'relative', background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)' }}>
                <ThreeSpeciesCard sp="cow" count={cowUnits.length} emoji="🐄" color="#7c3aed" isActive={true} onClick={() => { }} />
                <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10 }}>
                  <h2 style={{ fontSize: 24, color: '#4c1d95', marginBottom: 4 }}>Bos Taurus</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge badge-success">Dairy Monitoring</span>
                    <span className="badge badge-info">Optimal Health</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, position: 'relative', background: '#000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {sourceMode === 'camera' && (
                  <>
                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div className="scan-line" />
                    {activeDetections.map((det, i) => (
                      <div key={i} style={{
                        position: 'absolute',
                        left: `${det.bbox[0]}%`, top: `${det.bbox[1]}%`,
                        width: `${det.bbox[2]}%`, height: `${det.bbox[3]}%`,
                        border: `2px solid #7c3aed`, borderRadius: 4,
                        transform: `translate(-50%, -50%) rotate(${det.bbox[4] || 0}rad)`,
                        boxShadow: `0 0 10px #7c3aed`
                      }}>
                        <span style={{ position: 'absolute', top: -18, left: -2, background: '#7c3aed', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '2px 4px', borderRadius: 2 }}>
                          {det.label.toUpperCase()} {Math.floor(det.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                    <button className="btn btn-primary" onClick={scanCameraFrame} disabled={isProcessing} style={{ position: 'absolute', bottom: 20, zIndex: 100, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isProcessing ? 'Analyzing...' : 'Scan Cattle (YOLO)'}
                    </button>
                  </>
                )}
                {sourceMode === 'upload' && (
                  capturedImage ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={capturedImage} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Upload Preview" />
                      {activeDetections.map((det, i) => (
                        <div key={i} style={{
                          position: 'absolute', left: `${det.bbox[0]}%`, top: `${det.bbox[1]}%`,
                          width: `${det.bbox[2]}%`, height: `${det.bbox[3]}%`,
                          border: `2px solid #7c3aed`, borderRadius: 4,
                          transform: `translate(-50%, -50%)`, boxShadow: `0 0 10px #7c3aed`
                        }}>
                          <span style={{ position: 'absolute', top: -16, left: -2, background: '#7c3aed', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '2px 4px', borderRadius: 2 }}>
                            {det.label.toUpperCase()}
                          </span>
                        </div>
                      ))}
                      <button className="btn btn-secondary btn-sm" style={{ position: 'absolute', bottom: 16, right: 16 }} onClick={() => { setCapturedImage(null); setActiveDetections([]); }}>Clear</button>
                    </div>
                  ) : (
                    <div style={{ color: '#666' }}>
                      <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                        Upload Image to Scan
                        <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                      </label>
                    </div>
                  )
                )}
              </div>
            )}

            <div style={{ background: 'var(--color-surface)', padding: '12px 20px', display: 'flex', gap: 20, borderTop: '1px solid var(--color-border)' }}>
              {['Holstein', 'Jersey', 'Angus', 'Calf'].map(c => (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 600 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#7c3aed' }} />{c}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ThreeTile><KPIBox icon={Thermometer} value={stats.avgTemp} label="Avg Body Temp" colorClass="red" unit="°C" /></ThreeTile>
            <ThreeTile><KPIBox icon={Milk} value={stats.milkYield} label="Daily Milk Yield" colorClass="blue" unit="L" /></ThreeTile>
            <ThreeTile><KPIBox icon={Activity} value={stats.ruminationTime} label="Rumination Time" colorClass="green" unit="m/d" /></ThreeTile>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 32, gap: 24 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Bovine Health Status</div></div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}><Footprints size={18} color="#7c3aed" /><span style={{ fontWeight: 600 }}>Daily Steps</span></div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>4,820</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Optimal movement pattern</div>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}><Heart size={18} color="#ef4444" /><span style={{ fontWeight: 600 }}>Heart Rate</span></div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>72 BPM</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Resting nominal</div>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Managed Cattle</div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Tag ID</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {cowUnits.map(unit => (
                    <tr key={unit.id}>
                      <td style={{ fontWeight: 600 }}>{unit.name}</td>
                      <td><code>{unit.identifier || 'N/A'}</code></td>
                      <td><span className="badge badge-success">Normal</span></td>
                      <td><button className="btn btn-secondary btn-sm" onClick={() => navigate(`/animals/${unit.id}`)}>Details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <ExpertAssistant species="cow" color="#7c3aed" />
    </>
  );
}
