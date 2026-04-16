import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Shield, Search, Navigation, Phone, Info, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import SovereignMap from '../components/Map/SovereignMap';
import api, { externalAPI } from '../services/api';

const OVERPASS_MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
];

const MapCenter = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [farms, setFarms] = useState([]);
    const [vets, setVets] = useState([]);
    const [hives, setHives] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all'); // all, bee, vet, farm
    const [globalSearch, setGlobalSearch] = useState('');
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [viewCenter, setViewCenter] = useState([36.8065, 10.1815]); // Tunisia Center
    const [userPos, setUserPos] = useState(null);
    const [zoom, setZoom] = useState(7);
    const [isSearching, setIsSearching] = useState(false);
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [isFetchingInfo, setIsFetchingInfo] = useState(false);
    const [locationName, setLocationName] = useState('');
    const [currentWeather, setCurrentWeather] = useState(null);
    const [discoveredVets, setDiscoveredVets] = useState([]);

    // Helpers
    const haversine = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    useEffect(() => {
        const loadGeoData = async () => {
            try {
                // Use authenticated 'api' instance to ensure JWT is sent
                const [farmsRes, vetsRes, hivesRes] = await Promise.all([
                    api.get('/geo/farms'),
                    api.get('/geo/vets'),
                    api.get('/geo/hives')
                ]);
                
                // Real Bee Hives from Backend GIS (Joined with Telemetry)
                setHives(hivesRes.data.features || []);
                
                setFarms(farmsRes.data.features || []);
                setVets(vetsRes.data.features || []);

                // Auto-Locate on mount to activate 50km filter
                handleLocateMe();

            } catch (err) {
                console.error("Error loading geo data", err);
            } finally {
                setLoading(false);
            }
        };
        loadGeoData();
    }, []);

    const focusOn = (item) => {
        if (selectedEntity?.id === item.id && selectedEntity?.type === item.type) {
            // Already selected -> reveal card (if not already visible)
            // The card renders automatically when selectedEntity is truthy
        } else {
            // First click -> Focus and Fly-to
            setSelectedEntity(item);
            const coords = item.coords || [item.geometry.coordinates[1], item.geometry.coordinates[0]];
            setViewCenter([coords[0], coords[1]]);
            setZoom(15);
        }
    };

    const fetchGlobalDiscoveries = async (lat, lon) => {
        if (isDiscovering) return;
        setIsDiscovering(true);
        
        try {
            // Use authenticated 'api' instance
            const res = await api.get(`/geo/nearby-vets?lat=${lat}&lon=${lon}&radius_km=100`);
            
            if (res.data) {
                const discoveries = res.data.map(v => ({
                    type: 'vet',
                    discovery: true, // Mark as discovered from database
                    name: v.name,
                    coords: v.coords,
                    id: v.id,
                    distance: v.distance_km,
                    properties: {
                        name: v.name,
                        specialty: v.specialty || "Clinique Privée",
                        phone: v.phone || "N/A",
                        address: v.address || "Localisation Tunissienne"
                    }
                }));
                // Combine with existing non-discovered vets if any
                setDiscoveredVets(discoveries);
            }
        } catch (err) {
            console.error("Local Discovery failed. Ensure PostGIS is running.", err);
        } finally {
            setIsDiscovering(false);
        }
    };

    const fetchLocationInfo = async (lat, lon) => {
        setIsFetchingInfo(true);
        try {
            // Use integrated API wrappers (handles authentication)
            const [geoRes, weatherRes] = await Promise.all([
                externalAPI.geocode.reverse(lat, lon),
                externalAPI.weather.byCoords(lat, lon)
            ]);
            
            if (geoRes.data) {
                const addr = geoRes.data.address;
                const name = addr.city || addr.town || addr.village || addr.suburb || geoRes.data.display_name.split(',')[0];
                setLocationName(name);
            }
            if (weatherRes.data) {
                setCurrentWeather(weatherRes.data);
            }
        } catch (err) {
            console.error("Failed to fetch location/weather info", err);
        } finally {
            setIsFetchingInfo(false);
        }
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            setUserPos([latitude, longitude]);
            setViewCenter([latitude, longitude]);
            setZoom(11);
            
            // Trigger Discovery and localized info
            fetchGlobalDiscoveries(latitude, longitude);
            fetchLocationInfo(latitude, longitude);
        });
    };

    const handleGlobalSearch = async (e) => {
        e.preventDefault();
        if (!globalSearch) return;
        setIsSearching(true);
        try {
            // Biasing search to the 100km zone around user
            let searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(globalSearch)}&limit=1`;
            if (userPos) {
                const [lat, lon] = userPos;
                const offset = 1.0; // Roughly 100km box
                searchUrl += `&viewbox=${lon-offset},${lat+offset},${lon+offset},${lat-offset}&bounded=1`;
            }
            
            const res = await axios.get(searchUrl);
            if (res.data && res.data.length > 0) {
                const result = res.data[0];
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);
                
                // Calculate distance to check if logical
                const distToResult = userPos ? haversine(userPos[0], userPos[1], lat, lon) : 0;
                
                // STRICT LOGICAL CHECK
                if (distToResult > 100) {
                    alert(`Attention: '${globalSearch}' a été trouvé à ${distToResult.toFixed(0)}km. Voulez-vous quand même afficher ce résultat hors-zone ?`);
                    // We allow viewing it but we don't zoom in super close to avoid "Pacific fly-to" confusion
                    setViewCenter([lat, lon]);
                    setZoom(6);
                } else {
                    setViewCenter([lat, lon]);
                    setZoom(14);
                }
                
                setSelectedEntity({ 
                    type: 'search', 
                    name: result.display_name,
                    coords: [lat, lon],
                    distance: distToResult, 
                    properties: { name: result.display_name } 
                });
            } else {
                alert("Location not found in your 100km zone.");
            }
        } catch (err) {
            console.error("Search error", err);
        } finally {
            setIsSearching(false);
        }
    };

    // Unified Filtered Directory Data (Real items within 50km)
    const filteredData = [
        ...hives.map(h => ({ 
            ...h, 
            type: 'hive', 
            name: h.properties.name, 
            coords: [h.geometry.coordinates[1], h.geometry.coordinates[0]], 
            id: h.properties.id,
            metrics: h.properties.metrics,
            status: h.properties.status
        })),
        ...farms.map(f => ({ ...f, type: 'farm', name: f.properties.name, coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]], id: f.properties.id, properties: f.properties })),
        ...vets.map(v => ({ ...v, type: 'vet', name: v.properties.name, coords: [v.geometry.coordinates[1], v.geometry.coordinates[0]], id: v.properties.id, properties: v.properties, discovery: false })),
        ...discoveredVets,
        // Any specific search result found via global search
        ...(selectedEntity?.type === 'search' ? [selectedEntity] : [])
    ].map(item => {
        const hasCoords = item.coords && item.coords.length === 2;
        // Fallback to viewCenter if userPos is not yet detected (fixes missing markers bug)
        const refPos = userPos || viewCenter;
        const dist = hasCoords ? haversine(refPos[0], refPos[1], item.coords[0], item.coords[1]) : 9999;
        return { ...item, distance: dist };
    })
    .filter(item => {
        // STRICT LOGICAL CONSTRAINT: Max 100km for the directory
        return item.distance <= 100;
    })
    .filter(item => categoryFilter === 'all' || item.type === categoryFilter)
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.distance - b.distance);

    return (
        <div className="page-container">
            <Navbar 
                title="Agricultural Map Center" 
                subtitle={isFetchingInfo ? "Détection en cours..." : (locationName ? `📍 ${locationName} | Rayon 100km actif` : (userPos ? `Filtrage local actif (Rayon 100km)` : `Initialisation du filtrage...`))}
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
                        <SovereignMap 
                            // BUG FIX: Show all markers initially (within 1000km) if user hasn't located yet
                            farms={farms.filter(f => f.geometry?.coordinates ? haversine(userPos ? userPos[0] : viewCenter[0], userPos ? userPos[1] : viewCenter[1], f.geometry.coordinates[1], f.geometry.coordinates[0]) <= 1000 : false)} 
                            vets={vets.filter(v => v.geometry?.coordinates ? haversine(userPos ? userPos[0] : viewCenter[0], userPos ? userPos[1] : viewCenter[1], v.geometry.coordinates[1], v.geometry.coordinates[0]) <= 1000 : false)} 
                            hives={hives.filter(h => h.geometry?.coordinates ? haversine(userPos ? userPos[0] : viewCenter[0], userPos ? userPos[1] : viewCenter[1], h.geometry.coordinates[1], h.geometry.coordinates[0]) <= 1000 : false)}
                            userPos={userPos}
                            center={[viewCenter[1], viewCenter[0]]} // MapLibre uses [lon, lat]
                            zoom={zoom} 
                            height="100%" 
                            onMarkerClick={(item) => focusOn(item)}
                        />
                    )}

                    {/* Google Maps Architecture: Floating Discovery Controls */}
                    <div style={{
                        position: 'absolute', top: 20, left: 20, zIndex: 1000,
                        display: 'flex', flexDirection: 'column', gap: 12, width: '400px'
                    }}>
                        {/* Unified Search Bar */}
                        <form onSubmit={handleGlobalSearch} style={{ width: '100%' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={22} style={{ position: 'absolute', left: 20, top: 15, color: '#7c3aed' }} />
                                    <input 
                                        type="text"
                                        placeholder="Full Discovery Mode: Vets, Ruches, Cities..."
                                        className="form-control"
                                        style={{ 
                                            padding: '16px 56px', background: 'rgba(255,255,255,0.98)', borderRadius: 32, fontSize: 16,
                                            border: 'none', fontWeight: 600, width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                                            backdropFilter: 'blur(20px)'
                                        }}
                                        value={globalSearch}
                                        onChange={(e) => {
                                            setGlobalSearch(e.target.value);
                                            setSearchQuery(e.target.value);
                                        }}
                                    />
                                    {isSearching && <div className="spinner-center" style={{ right: 20, left: 'auto', width: 18, height: 18 }} />}
                                </div>
                                <button 
                                    type="submit" 
                                    style={{ 
                                        background: '#22c55e', color: 'white', border: 'none', padding: '15px 32px', 
                                        borderRadius: 32, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px rgba(34, 197, 94, 0.4)',
                                        display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.3s', fontSize: 14, letterSpacing: 0.5
                                    }}
                                    className="hover-lift"
                                >
                                    EXPLORER
                                </button>
                            </div>
                        </form>

                        {/* Floating Category Chips */}
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10 }}>
                            {[
                                { id: 'all', label: 'Tout Exploré', icon: MapPin },
                                { id: 'hive', label: '🐝 Mes Ruches', icon: MapPin },
                                { id: 'vet', label: '🩺 Vétérinaires', icon: Phone },
                                { id: 'farm', label: '🚜 Fermes Partenaires', icon: Shield }
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategoryFilter(cat.id)}
                                    style={{
                                        padding: '8px 18px', borderRadius: 20, whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700,
                                        background: categoryFilter === cat.id ? '#7c3aed' : 'rgba(255,255,255,0.95)',
                                        color: categoryFilter === cat.id ? 'white' : '#7c3aed',
                                        border: '1px solid rgba(124, 58, 237, 0.2)', cursor: 'pointer', transition: 'all 0.2s',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backdropFilter: 'blur(5px)'
                                    }}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* NEW: Sovereign Location & Weather Status Chip */}
                        {(locationName || currentWeather || isFetchingInfo) && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
                                padding: '10px 20px', borderRadius: 32, border: '1px solid rgba(124, 58, 237, 0.2)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.1)', animation: 'fadeIn 0.5s ease', width: 'fit-content'
                            }}>
                                {isFetchingInfo ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>
                                        <div className="loader" style={{ width: 14, height: 14, borderWeight: 2, marginRight: 4 }} />
                                        <span>Détection en cours...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRight: '1px solid #e2e8f0', paddingRight: 15 }}>
                                            <div style={{ background: '#7c3aed', color: 'white', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Navigation size={12} fill="white" />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: 9, textTransform: 'uppercase', fontWeight: 800, opacity: 0.6, letterSpacing: 0.5 }}>Zone</span>
                                                <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{locationName || "Tunisie"}</span>
                                            </div>
                                        </div>
                                        
                                        {currentWeather && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ fontSize: 24 }}>{currentWeather.temperature > 25 ? '☀️' : (currentWeather.precipitation > 0 ? '🌧️' : '☁️')}</div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <span style={{ fontSize: 16, fontWeight: 900, color: '#7c3aed' }}>{currentWeather.temperature.toFixed(1)}°</span>
                                                        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7 }}>C</span>
                                                    </div>
                                                    <span style={{ fontSize: 9, fontWeight: 700, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, color: '#64748b' }}>
                                                        💧 {currentWeather.humidity}% HUMIDITÉ
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* New: Locate Me Button */}
                    <button 
                        onClick={handleLocateMe}
                        style={{
                            position: 'absolute', bottom: 30, right: 20, zIndex: 1000,
                            width: 50, height: 50, borderRadius: '50%', background: 'white',
                            border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-lg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            color: '#7c3aed'
                        }}
                        title="Ma localisation"
                    >
                        <Navigation size={22} />
                    </button>
                    
                    {/* Dynamic Map Dashboard: Real-time Coverage Status */}
                    <div style={{
                        position: 'absolute', top: 20, right: 20, zIndex: 1000,
                        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
                        padding: '15px 25px', borderRadius: '24px', border: '1px solid var(--glass-border)',
                        boxShadow: 'var(--glass-shadow)', display: 'flex', gap: 20
                    }}>
                        <div 
                            onClick={() => setCategoryFilter('hive')}
                            style={{ display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer', opacity: categoryFilter === 'hive' ? 1 : 0.7 }}
                        >
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6, fontWeight: 800 }}>Mes Ruches</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '16px', fontWeight: 900, color: '#d97706' }}>
                                <MapPin size={14} /> {filteredData.filter(i => i.type === 'hive').length}
                            </div>
                        </div>
                        <div style={{ width: 1, background: '#e2e8f0' }} />
                        <div 
                            onClick={() => setCategoryFilter('vet')}
                            style={{ display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer', opacity: categoryFilter === 'vet' ? 1 : 0.7 }}
                        >
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6, fontWeight: 800 }}>Vétérinaires</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '16px', fontWeight: 900, color: '#ef4444' }}>
                                <Shield size={14} /> {filteredData.filter(i => i.type === 'vet').length}
                            </div>
                        </div>
                        <div style={{ width: 1, background: '#e2e8f0' }} />
                        <div 
                            onClick={() => setCategoryFilter('farm')}
                            style={{ display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer', opacity: categoryFilter === 'farm' ? 1 : 0.7 }}
                        >
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6, fontWeight: 800 }}>Fermes</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '16px', fontWeight: 900, color: '#22c55e' }}>
                                <MapPin size={14} /> {filteredData.filter(i => i.type === 'farm').length}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info Panel */}
                <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
                    {/* Discovery Status Indicator */}
                    {isDiscovering && (
                        <div style={{ 
                            padding: '10px 15px', background: 'rgba(124, 58, 237, 0.05)', borderRadius: 12, 
                            display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#7c3aed', border: '1px dashed #7c3aed'
                        }}>
                            <div className="loader" style={{ width: 12, height: 12, borderWeight: 2 }} />
                            Exploration des services réels en cours...
                        </div>
                    )}

                    {/* Detailed Card Display if Selected */}
                    {selectedEntity && (
                        <div className="card detail-active" style={{ 
                            padding: '20px', background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)', 
                            color: 'white', borderRadius: 20, position: 'relative', overflow: 'hidden',
                            animation: 'slideInRight 0.3s ease'
                        }}>
                             <button 
                                onClick={() => setSelectedEntity(null)}
                                style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer' }}
                             >
                                <X size={14}/>
                             </button>
                             <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8, fontWeight: 800 }}>
                                Intelligence {selectedEntity.type === 'hive' ? 'Apiculture' : selectedEntity.type === 'vet' ? 'Vétérinaire' : 'Ferme'}
                             </div>
                             <h4 style={{ fontSize: 20, fontWeight: 800, margin: '8px 0' }}>{selectedEntity.nom || selectedEntity.properties?.name || selectedEntity.name}</h4>
                             
                             <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 15 }}>
                                {selectedEntity.type === 'vet' && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                                            <Shield size={16} /> <span style={{ fontWeight: 600 }}>Spécialité:</span> {selectedEntity.properties?.specialty}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                                            <Phone size={16} /> <span style={{ fontWeight: 600 }}>Contact:</span> {selectedEntity.properties?.phone}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                                            <MapPin size={16} /> <span style={{ fontWeight: 600 }}>Adresse:</span> {selectedEntity.properties?.address}
                                        </div>
                                        <a href={`tel:${selectedEntity.properties?.phone}`} style={{ 
                                            background: '#22c55e', color: 'white', textDecoration: 'none', padding: '10px', borderRadius: 12, textAlign: 'center',
                                            fontWeight: 800, fontSize: 14, marginTop: 10, display: 'block'
                                        }}>
                                            Appeler Maintenant
                                        </a>
                                    </>
                                )}
                                {selectedEntity.type === 'hive' && (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10, background: 'rgba(0,0,0,0.15)', padding: 12, borderRadius: 12 }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 10, opacity: 0.8 }}>POIDS</div>
                                                <div style={{ fontSize: 16, fontWeight: 900 }}>{selectedEntity.metrics?.weight || '0'} <span style={{fontSize: 10}}>kg</span></div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 10, opacity: 0.8 }}>TEMP</div>
                                                <div style={{ fontSize: 16, fontWeight: 900 }}>{selectedEntity.metrics?.temperature || '0'} <span style={{fontSize: 10}}>°C</span></div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 10, opacity: 0.8 }}>HUMIDITÉ</div>
                                                <div style={{ fontSize: 16, fontWeight: 900 }}>{selectedEntity.metrics?.humidity || '0'} <span style={{fontSize: 10}}>%</span></div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 10, opacity: 0.8 }}>SANTÉ</div>
                                                <div style={{ fontSize: 16, fontWeight: 900, color: '#4ade80' }}>98%</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 11, marginTop: 10, opacity: 0.9 }}>
                                            📍 Localisation: {selectedEntity.nom || selectedEntity.name}
                                        </div>
                                    </>
                                )}
                                {selectedEntity.distance > 100 && (
                                     <div style={{ fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: 8, marginTop: 10, border: '1px solid rgba(255,255,255,0.3)' }}>
                                        ⚠️ Cet élément est en dehors de votre zone locale (Distance: {selectedEntity.distance.toFixed(0)} km).
                                     </div>
                                 )}
                             </div>
                        </div>
                    )}

                    <div style={{ height: '1px', background: 'var(--color-border)' }} />

                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Navigation size={16} /> Directory (Max 100km)
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {filteredData.map((item, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => focusOn(item)}
                                    style={{ 
                                        padding: '14px', borderRadius: '16px', border: '1px solid var(--color-border)',
                                        cursor: 'pointer', transition: 'all 0.2s', 
                                        background: (selectedEntity?.id === item.id && selectedEntity?.type === item.type) ? 'rgba(124, 58, 237, 0.08)' : '#fafafa',
                                        borderColor: (selectedEntity?.id === item.id && selectedEntity?.type === item.type) ? '#7c3aed' : 'transparent',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                    className="hover-lift"
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--color-text)', lineHeight: 1.3 }}>{item.nom || item.properties?.name || item.name}</div>
                                        <div style={{ fontSize: '11px', background: 'white', border: '1px solid #e2e8f0', color: '#64748b', padding: '2px 8px', borderRadius: 99, fontWeight: 800 }}>
                                            {item.distance.toFixed(1)} km
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ opacity: 0.7 }}>{item.type === 'hive' ? '🐝 Site Apicole' : item.type === 'vet' ? '🩺 Clinique Vétérinaire' : '🚜 Site de Ferme'}</span>
                                        {item.discovery && <span style={{ padding: '2px 6px', background: '#3b82f6', color: 'white', borderRadius: 4, fontSize: 8, fontWeight: 900 }}>REAL-WORLD</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MapCenter;
