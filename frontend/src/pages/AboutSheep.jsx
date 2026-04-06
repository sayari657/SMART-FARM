import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Thermometer, 
  Heart, 
  Activity, 
  Eye, 
  Plus, 
  Map, 
  Wind,
  ShieldCheck
} from 'lucide-react';
import Navbar from '../components/Navbar';
import ThreeSpeciesCard from '../components/ThreeSpeciesCard';
import KPIBox from '../components/KPIBox';
import ThreeTile from '../components/ThreeTile';
import { animalsAPI, telemetryAPI, cvAPI } from '../services/api';

export default function AboutSheep() {
  const navigate = useNavigate();
  const [sheepUnits, setSheepUnits] = useState([]);
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
    avgTemp: 39.1,
    heartRate: 78,
    grazingTime: 320,
    healthScore: 94
  });

  useEffect(() => {
    animalsAPI.list({ species: 'sheep' })
      .then(res => {
        setSheepUnits(res.data);
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
          avgTemp: res.data.metrics.temperature || 39.1,
          heartRate: res.data.metrics.heart_rate || 78,
          grazingTime: res.data.metrics.grazing_minutes || 320,
          healthScore: res.data.metrics.health_score || 94
        }));
      }
    }).catch(err => console.error("Telemetry fetch error:", err));
  };

  useEffect(() => {
    const fetchDetections = () => {
      cvAPI.recent(10).then(res => {
        const sheepRelevant = res.data.filter(d => 
          ['sheep', 'lamb', 'ram'].includes(d.object_class?.toLowerCase())
        );
        setRealDetections(sheepRelevant);
      }).catch(err => console.error("Error fetching CV data:", err));
    };

    fetchDetections();
    const interval = setInterval(fetchDetections, 5000);
    return () => clearInterval(interval);
  }, [sheepUnits]);

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
        title="Sheep Health Tracking" 
        subtitle="Flock management and physiological monitoring" 
      />
      
      <div className="page-content">
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/animals')} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowLeft size={16} /> Back to Animals
          </button>

          <div style={{ display: 'flex', background: 'var(--color-surface)', padding: 4, borderRadius: 12, border: '1px solid var(--color-border)', gap: 4 }}>
            {[
              { id: 'live', label: 'Field Stream', icon: Activity },
              { id: 'camera', label: 'Vision Node', icon: Eye },
              { id: 'upload', label: 'Event Scan', icon: Plus }
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
              <div style={{ flex: 1, position: 'relative', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
                <ThreeSpeciesCard sp="sheep" count={sheepUnits.length} emoji="🐑" color="#059669" isActive={true} onClick={() => {}} />
                <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10 }}>
                  <h2 style={{ fontSize: 24, color: '#064e3b', marginBottom: 4 }}>Ovis Aries</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge badge-success">Grazing Nominal</span>
                    <span className="badge badge-info">{sheepUnits.length} Managed Sheep</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, position: 'relative', background: '#000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {sourceMode === 'camera' && (
                  <>
                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div className="scan-line" />
                    <button className="btn btn-primary" onClick={scanCameraFrame} disabled={isProcessing} style={{ position: 'absolute', bottom: 20, zIndex: 100 }}>
                      Analyze Field Capture
                    </button>
                  </>
                )}
                {sourceMode === 'upload' && (
                  capturedImage ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={capturedImage} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Upload Preview" />
                      <button className="btn btn-secondary btn-sm" style={{ position: 'absolute', bottom: 16, right: 16 }} onClick={() => { setCapturedImage(null); setActiveDetections([]); }}>Clear</button>
                    </div>
                  ) : (
                    <div style={{ color: '#666' }}>
                      <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                        Browse for Image
                        <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                      </label>
                    </div>
                  )
                )}
              </div>
            )}
            
            <div style={{ background: 'var(--color-surface)', padding: '12px 20px', display: 'flex', gap: 20, borderTop: '1px solid var(--color-border)' }}>
              {['Merino', 'Suffolk', 'Dorper', 'Lamb'].map(c => (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 600 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#059669' }} />{c}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ThreeTile><KPIBox icon={Thermometer} value={stats.avgTemp} label="Avg Rectal Temp" colorClass="yellow" unit="°C" /></ThreeTile>
            <ThreeTile><KPIBox icon={Heart} value={stats.heartRate} label="Avg Heart Rate" colorClass="red" unit="BPM" /></ThreeTile>
            <ThreeTile><KPIBox icon={Activity} value={stats.grazingTime} label="Grazing Time" colorClass="green" unit="min/d" /></ThreeTile>
          </div>
        </div>

        <div className="grid-2-1" style={{ marginBottom: 32, gap: 24 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Vital Stats Feed</div></div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { l: 'Health Score', v: `${stats.healthScore}%`, p: stats.healthScore, icon: ShieldCheck },
                  { l: 'Movement', v: 'Normal Range', p: 82, icon: Activity },
                  { l: 'Location', v: 'Zone A (North)', p: 100, icon: Map }
                ].map(item => (
                  <div key={item.l} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><item.icon size={14} color="#059669" />{item.l}</span>
                      <span>{item.v}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--color-bg)', borderRadius: 2 }}>
                      <div style={{ width: `${item.p}%`, height: '100%', background: '#059669', borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Flock List</div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>ID</th><th>Health</th></tr></thead>
                <tbody>
                  {sheepUnits.map(unit => (
                    <tr key={unit.id}>
                      <td style={{ fontWeight: 600 }}>{unit.name}</td>
                      <td><code>{unit.identifier || 'N/A'}</code></td>
                      <td><span className="badge badge-success">Healthy</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
