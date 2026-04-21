import ExpertAssistant from '../components/expert/ExpertAssistant';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Thermometer, 
  Activity, 
  PieChart, 
  Zap,
  Leaf,
  Home
} from 'lucide-react';
import Navbar from '../components/Navbar';
import ThreeSpeciesCard from '../components/ThreeSpeciesCard';
import KPIBox from '../components/KPIBox';
import ThreeTile from '../components/ThreeTile';
import { animalsAPI, telemetryAPI } from '../services/api';

export default function AboutRabbit() {
  const navigate = useNavigate();
  const [rabbitUnits, setRabbitUnits] = useState([]);
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    animalsAPI.list({ species: 'rabbit' })
      .then(res => {
        setRabbitUnits(res.data);
        if (res.data.length > 0) {
          fetchUnitTelemetry(res.data[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchUnitTelemetry = (unitId) => {
    telemetryAPI.getLatest(unitId).then(res => {
      setLatestTelemetry(res.data);
    }).catch(err => console.error("Telemetry fetch error:", err));
  };

  return (
    <>
      <Navbar 
        title="Rabbitry Intelligence" 
        subtitle="Cuniculture Monitoring & Nest Digital Twin" 
      />
      
      <div className="page-content">
        <div style={{ marginBottom: 24 }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/animals')}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <ArrowLeft size={16} /> Back to Animals
          </button>
        </div>

        <div className="grid-2-1" style={{ marginBottom: 32, gap: 24 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: '400px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, position: 'relative', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
              <ThreeSpeciesCard sp="rabbit" count={rabbitUnits.length} emoji="🐰" color="#16a34a" isActive={true} onClick={() => {}} />
              <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10 }}>
                <h2 style={{ fontSize: 24, color: '#166534', marginBottom: 4 }}>Oryctolagus cuniculus</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="badge badge-success">Sovereign V3.0 Enabled</span>
                  <span className="badge badge-info">Optimal Growth</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ThreeTile>
              <KPIBox icon={Thermometer} value={latestTelemetry?.metrics?.nest_temperature || 22.4} label="Nest Temperature" colorClass="green" unit="°C" />
            </ThreeTile>
            <ThreeTile>
              <KPIBox icon={Zap} value={latestTelemetry?.metrics?.feed_consumption || 155} label="Daily Feed Intake" colorClass="yellow" unit="g" />
            </ThreeTile>
          </div>
        </div>

        <div className="grid-3" style={{ marginBottom: 32, gap: 24 }}>
            <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <Home size={20} color="var(--color-primary)" />
                    <h3 style={{ margin: 0 }}>Nest Status</h3>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{latestTelemetry?.metrics?.nest_status || 'Secure'}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Monitoring 4 kits in Nest A02</div>
            </div>
            <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <Leaf size={20} color="#16a34a" />
                    <h3 style={{ margin: 0 }}>Feed Quality</h3>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>High Index</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Alfalfa-based diet detected</div>
            </div>
            <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <Activity size={20} color="#3b82f6" />
                    <h3 style={{ margin: 0 }}>Reproduction</h3>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Mid-Cycle</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Next checks: 4 days</div>
            </div>
        </div>
      </div>
      <ExpertAssistant species="rabbit" color="#16a34a" />
    </>
  );
}
