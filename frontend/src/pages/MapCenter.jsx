import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Shield, Search, Navigation, Phone, Info } from 'lucide-react';
import Navbar from '../components/Navbar';
import SmartMap from '../components/Map/SmartMap';
import axios from 'axios';

const MapCenter = () => {
    const { t } = useTranslation();
    const [farms, setFarms] = useState([]);
    const [vets, setVets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [viewCenter, setViewCenter] = useState([36.8065, 10.1815]); // Tunisia Center
    const [zoom, setZoom] = useState(7);

    useEffect(() => {
        const loadGeoData = async () => {
            try {
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
                const [farmsRes, vetsRes] = await Promise.all([
                    axios.get(`${apiBase}/geo/farms`),
                    axios.get(`${apiBase}/geo/vets`)
                ]);
                setFarms(farmsRes.data.features);
                setVets(vetsRes.data.features);
            } catch (err) {
                console.error("Error loading geo data", err);
            } finally {
                setLoading(false);
            }
        };
        loadGeoData();
    }, []);

    const focusOn = (entity) => {
        setSelectedEntity(entity);
        setViewCenter([entity.geometry.coordinates[1], entity.geometry.coordinates[0]]);
        setZoom(15);
    };

    return (
        <div className="page-container">
            <Navbar 
                title="Agricultural Map Center" 
                subtitle="High-precision geographic monitoring & veterinarian network" 
            />

            <div className="page-content" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', height: 'calc(100vh - 180px)' }}>
                
                {/* Main Map View */}
                <div style={{ position: 'relative' }}>
                    {loading ? (
                        <div className="card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="loader" />
                            <p style={{ marginLeft: '10px' }}>Mapping your ecosystem...</p>
                        </div>
                    ) : (
                        <SmartMap 
                            farms={farms} 
                            vets={vets} 
                            center={viewCenter} 
                            zoom={zoom} 
                            height="100%" 
                        />
                    )}
                    
                    {/* Floating Map Overlay for Layer Control */}
                    <div style={{
                        position: 'absolute', top: 20, right: 20, zIndex: 1000,
                        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
                        padding: '12px 20px', borderRadius: '16px', border: '1px solid var(--glass-border)',
                        boxShadow: 'var(--glass-shadow)', display: 'flex', gap: 15
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', fontWeight: 600 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} /> Farms: {farms.length}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', fontWeight: 600 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} /> Vets: {vets.length}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info Panel */}
                <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-text-3)' }} />
                        <input 
                            type="text" 
                            placeholder="Search clinical vets..." 
                            className="form-control" 
                            style={{ paddingLeft: 40 }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div style={{ height: '1px', background: 'var(--color-border)' }} />

                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Navigation size={16} /> Directory
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {farms.concat(vets)
                                .filter(f => f.properties.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map((item, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => focusOn(item)}
                                        style={{ 
                                            padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)',
                                            cursor: 'pointer', transition: 'all 0.2s', background: selectedEntity === item ? 'rgba(124, 58, 237, 0.05)' : 'white',
                                            borderColor: selectedEntity === item ? '#7c3aed' : 'var(--color-border)'
                                        }}
                                        className="hover-lift"
                                    >
                                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text)' }}>{item.properties.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: 4 }}>
                                            {item.properties.status ? `Farm • ${item.properties.status}` : `Vet • ${item.properties.specialty}`}
                                        </div>
                                        {item.properties.phone && (
                                            <div style={{ fontSize: '11px', color: '#7c3aed', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Phone size={10} /> {item.properties.phone}
                                            </div>
                                        )}
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MapCenter;
