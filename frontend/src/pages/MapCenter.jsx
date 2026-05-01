import React, { useState, useEffect, useRef } from 'react';
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
    const [markets, setMarkets] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all'); // all, bee, vet, farm, market
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
    const [osmVets, setOsmVets] = useState([]);
    const [isFetchingOSMVets, setIsFetchingOSMVets] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchDebounceRef = useRef(null);

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
                const [farmsRes, vetsRes, hivesRes, marketsRes] = await Promise.all([
                    api.get('/geo/farms'),
                    api.get('/geo/vets'),
                    api.get('/geo/hives'),
                    api.get('/geo/markets')
                ]);

                // Real Bee Hives from Backend GIS (Joined with Telemetry)
                setHives(hivesRes.data.features || []);
                setFarms(farmsRes.data.features || []);
                setVets(vetsRes.data.features || []);
                setMarkets(marketsRes.data.features || []);

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

    const fetchOSMVets = async (lat, lon) => {
        setIsFetchingOSMVets(true);
        try {
            const query = `[out:json][timeout:30];(node["amenity"="veterinary"](around:100000,${lat},${lon});way["amenity"="veterinary"](around:100000,${lat},${lon}););out center;`;
            // Try each mirror in sequence until one succeeds
            let data = null;
            for (const mirror of OVERPASS_MIRRORS) {
                try {
                    const res = await fetch(mirror, {
                        method: 'POST',
                        body: `data=${encodeURIComponent(query)}`
                    });
                    if (res.ok) { data = await res.json(); break; }
                } catch { continue; }
            }
            if (!data) return;

            const parsed = (data.elements || [])
                .filter(el => el.lat != null || el.center != null)
                .map(el => {
                    const elLat = el.lat ?? el.center.lat;
                    const elLon = el.lon ?? el.center.lon;
                    const tags = el.tags || {};
                    const addrParts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean);
                    return {
                        id: `osm-${el.id}`,
                        type: 'vet',
                        osm: true,
                        name: tags.name || tags['name:fr'] || tags['name:ar'] || 'Clinique Vétérinaire',
                        coords: [elLat, elLon],
                        distance: haversine(lat, lon, elLat, elLon),
                        properties: {
                            name: tags.name || 'Clinique Vétérinaire',
                            specialty: tags.veterinary || tags['veterinary:for'] || 'Médecine Vétérinaire',
                            phone: tags.phone || tags['contact:phone'] || null,
                            website: tags.website || tags['contact:website'] || null,
                            address: addrParts.length ? addrParts.join(', ') : (tags['addr:full'] || null),
                            opening_hours: tags.opening_hours || null,
                        }
                    };
                })
                .filter(v => v.distance <= 100)
                .sort((a, b) => a.distance - b.distance);

            setOsmVets(parsed);
        } catch (err) {
            console.error('Overpass fetch failed:', err);
        } finally {
            setIsFetchingOSMVets(false);
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
            fetchOSMVets(latitude, longitude);
        });
    };

    const handleGlobalSearch = async (e) => {
        e?.preventDefault();
        if (!globalSearch.trim()) return;
        setIsSearching(true);
        setShowSuggestions(false);
        try {
            let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(globalSearch)}&limit=1&lang=fr`;
            if (userPos) url += `&lat=${userPos[0]}&lon=${userPos[1]}`;
            const res = await fetch(url);
            const data = await res.json();
            const features = data.features || [];
            if (!features.length) {
                alert('Aucun résultat trouvé pour cette recherche.');
                return;
            }
            const f = features[0];
            const lon = f.geometry.coordinates[0];
            const lat = f.geometry.coordinates[1];
            const name = [f.properties.name, f.properties.city, f.properties.country].filter(Boolean).join(', ');
            const dist = userPos ? haversine(userPos[0], userPos[1], lat, lon) : 0;
            setViewCenter([lat, lon]);
            setZoom(dist > 100 ? 6 : 14);
            setSelectedEntity({ type: 'search', name, coords: [lat, lon], distance: dist || null, properties: { name } });
        } catch (err) {
            console.error('Search error', err);
            alert('Erreur de connexion au service de recherche.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchInput = (value) => {
        setGlobalSearch(value);
        setSearchQuery(value);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        if (value.trim().length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
        searchDebounceRef.current = setTimeout(async () => {
            try {
                let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&limit=5&lang=fr`;
                if (userPos) url += `&lat=${userPos[0]}&lon=${userPos[1]}`;
                const res = await fetch(url);
                const data = await res.json();
                setSuggestions((data.features || []).map(f => ({
                    name: f.properties.name || f.properties.city || 'Lieu',
                    display: [f.properties.name, f.properties.city, f.properties.country].filter(Boolean).join(', '),
                    type: f.properties.osm_value || 'place',
                    coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]],
                })));
                setShowSuggestions(true);
            } catch { setSuggestions([]); }
        }, 300);
    };

    const selectSuggestion = (s) => {
        setGlobalSearch(s.display);
        setSuggestions([]);
        setShowSuggestions(false);
        const dist = userPos ? haversine(userPos[0], userPos[1], s.coords[0], s.coords[1]) : 0;
        setViewCenter(s.coords);
        setZoom(dist > 100 ? 6 : 14);
        setSelectedEntity({ type: 'search', name: s.display, coords: s.coords, distance: dist || null, properties: { name: s.display } });
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
        ...markets.map(m => ({ ...m, type: 'market', name: m.properties.name, coords: [m.geometry.coordinates[1], m.geometry.coordinates[0]], id: m.properties.id, properties: m.properties })),
        ...discoveredVets,
        ...osmVets,
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

            <div className="page-content map-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', height: 'calc(100vh - 180px)' }}>

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
                            vets={[
                                ...vets.filter(v => v.geometry?.coordinates ? haversine(userPos ? userPos[0] : viewCenter[0], userPos ? userPos[1] : viewCenter[1], v.geometry.coordinates[1], v.geometry.coordinates[0]) <= 1000 : false),
                                ...osmVets.map(v => ({
                                    type: 'Feature',
                                    geometry: { type: 'Point', coordinates: [v.coords[1], v.coords[0]] },
                                    properties: { id: v.id, name: v.name, specialty: v.properties.specialty, phone: v.properties.phone, address: v.properties.address, osm: true }
                                }))
                            ]}
                            hives={hives.filter(h => h.geometry?.coordinates ? haversine(userPos ? userPos[0] : viewCenter[0], userPos ? userPos[1] : viewCenter[1], h.geometry.coordinates[1], h.geometry.coordinates[0]) <= 1000 : false)}
                            markets={markets.filter(m => m.geometry?.coordinates ? haversine(userPos ? userPos[0] : viewCenter[0], userPos ? userPos[1] : viewCenter[1], m.geometry.coordinates[1], m.geometry.coordinates[0]) <= 1000 : false)}
                            userPos={userPos}
                            center={[viewCenter[1], viewCenter[0]]} // MapLibre uses [lon, lat]
                            zoom={zoom}
                            height="100%"
                            onMarkerClick={(item) => focusOn(item)}
                            selectedEntity={selectedEntity}
                        />
                    )}

                    {/* Google Maps Architecture: Floating Discovery Controls */}
                    <div style={{
                        position: 'absolute', top: 20, left: 20, zIndex: 1000,
                        display: 'flex', flexDirection: 'column', gap: 12, width: 'min(400px, calc(100% - 40px))'
                    }}>
                        {/* Unified Search Bar + Photon Autocomplete */}
                        <form onSubmit={handleGlobalSearch} style={{ width: '100%' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={22} style={{ position: 'absolute', left: 20, top: 15, color: '#7c3aed', zIndex: 1 }} />
                                    <input
                                        type="text"
                                        placeholder="Rechercher villes, fermes, vétérinaires..."
                                        className="form-control"
                                        style={{
                                            padding: '16px 56px', background: 'rgba(255,255,255,0.98)', borderRadius: 32, fontSize: 16,
                                            border: 'none', fontWeight: 600, width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                                            backdropFilter: 'blur(20px)'
                                        }}
                                        value={globalSearch}
                                        onChange={(e) => handleSearchInput(e.target.value)}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                        autoComplete="off"
                                    />
                                    {isSearching && <div className="spinner-center" style={{ right: 20, left: 'auto', width: 18, height: 18 }} />}

                                    {/* Autocomplete dropdown */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div style={{
                                            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 9999,
                                            background: 'rgba(255,255,255,0.99)', borderRadius: 16,
                                            boxShadow: '0 12px 40px rgba(0,0,0,0.18)', border: '1px solid #e2e8f0',
                                            overflow: 'hidden', backdropFilter: 'blur(20px)'
                                        }}>
                                            {suggestions.map((s, i) => (
                                                <div
                                                    key={i}
                                                    onMouseDown={() => selectSuggestion(s)}
                                                    style={{
                                                        padding: '11px 18px', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: 12,
                                                        borderBottom: i < suggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                                                        transition: 'background 0.1s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <MapPin size={14} color="#7c3aed" style={{ flexShrink: 0 }} />
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                                                        <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.display}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                        <div style={{ width: 1, background: '#e2e8f0' }} />
                        <div
                            onClick={() => setCategoryFilter('market')}
                            style={{ display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer', opacity: categoryFilter === 'market' ? 1 : 0.7 }}
                        >
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6, fontWeight: 800 }}>Marchés</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '16px', fontWeight: 900, color: '#f59e0b' }}>
                                <Search size={14} /> {filteredData.filter(i => i.type === 'market').length}
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
                                <X size={14} />
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
                                                <div style={{ fontSize: 16, fontWeight: 900 }}>{selectedEntity.metrics?.weight || '0'} <span style={{ fontSize: 10 }}>kg</span></div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 10, opacity: 0.8 }}>TEMP</div>
                                                <div style={{ fontSize: 16, fontWeight: 900 }}>{selectedEntity.metrics?.temperature || '0'} <span style={{ fontSize: 10 }}>°C</span></div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 10, opacity: 0.8 }}>HUMIDITÉ</div>
                                                <div style={{ fontSize: 16, fontWeight: 900 }}>{selectedEntity.metrics?.humidity || '0'} <span style={{ fontSize: 10 }}>%</span></div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 10, opacity: 0.8 }}>SANTÉ</div>
                                                <div style={{ fontSize: 16, fontWeight: 900, color: '#4ade80' }}>98%</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 11, marginTop: 10, opacity: 0.9 }}>
                                            📍 Localisation: {selectedEntity.nom || selectedEntity.name}
                                        </div>
                                        {selectedEntity.type === 'market' && hives.length > 0 && (
                                            <div style={{ marginTop: 12, padding: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)' }}>
                                                <div style={{ fontSize: 9, textTransform: 'uppercase', fontWeight: 800 }}>📦 Logistique Proximité</div>
                                                <div style={{ fontSize: 12, fontWeight: 800, color: '#facc15', marginTop: 4 }}>
                                                    Plus proche ruche : {Math.min(...hives.map(h => haversine(selectedEntity.coords[0], selectedEntity.coords[1], h.geometry.coordinates[1], h.geometry.coordinates[0]))).toFixed(1)} km
                                                </div>
                                            </div>
                                        )}
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

                    {/* ── OSM Veterinarians Section ────────────────────────── */}
                    {(isFetchingOSMVets || osmVets.length > 0) && (
                        <div>
                            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
                                <Shield size={16} color="#ef4444" />
                                Vétérinaires à Proximité
                                <span style={{ marginLeft: 'auto', fontSize: 11, background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '2px 10px', borderRadius: 99, fontWeight: 800 }}>
                                    {isFetchingOSMVets ? '…' : `${osmVets.length} trouvé${osmVets.length !== 1 ? 's' : ''}`}
                                </span>
                            </h3>

                            {isFetchingOSMVets && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fef2f2', borderRadius: 12, fontSize: 13, color: '#ef4444', border: '1px dashed #fecaca', marginBottom: 12 }}>
                                    <div className="loader" style={{ width: 14, height: 14 }} />
                                    Recherche OpenStreetMap dans un rayon de 100 km…
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {osmVets.map(v => (
                                    <div key={v.id} style={{
                                        borderRadius: 16, border: '1px solid #fecaca', overflow: 'hidden',
                                        background: selectedEntity?.id === v.id ? '#fef2f2' : 'white',
                                        boxShadow: '0 2px 8px rgba(239,68,68,0.07)', transition: 'all 0.2s'
                                    }}>
                                        {/* Card header */}
                                        <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Shield size={16} color="#ef4444" />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</div>
                                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{v.properties.specialty}</div>
                                            </div>
                                            <span style={{ flexShrink: 0, fontSize: 11, background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: 99, fontWeight: 800 }}>
                                                {v.distance.toFixed(1)} km
                                            </span>
                                        </div>

                                        {/* Info rows */}
                                        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {v.properties.address && (
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#475569' }}>
                                                    <MapPin size={12} color="#94a3b8" style={{ flexShrink: 0, marginTop: 1 }} />
                                                    <span>{v.properties.address}</span>
                                                </div>
                                            )}
                                            {v.properties.phone && (
                                                <a href={`tel:${v.properties.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#16a34a', textDecoration: 'none', fontWeight: 600 }}>
                                                    <Phone size={12} color="#16a34a" style={{ flexShrink: 0 }} />
                                                    {v.properties.phone}
                                                </a>
                                            )}
                                            {v.properties.website && (
                                                <a href={v.properties.website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>
                                                    <Info size={12} color="#7c3aed" style={{ flexShrink: 0 }} />
                                                    Site web
                                                </a>
                                            )}
                                            {v.properties.opening_hours && (
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, color: '#64748b' }}>
                                                    <span style={{ flexShrink: 0 }}>🕐</span>
                                                    <span>{v.properties.opening_hours}</span>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                                <button onClick={() => focusOn(v)} style={{
                                                    flex: 1, padding: '8px 0', borderRadius: 10, border: '1px solid #fecaca',
                                                    background: '#fef2f2', color: '#ef4444', fontWeight: 700, fontSize: 12, cursor: 'pointer'
                                                }}>
                                                    📍 Voir sur la carte
                                                </button>
                                                {v.properties.phone && (
                                                    <a href={`tel:${v.properties.phone}`} style={{
                                                        flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                                                        background: '#16a34a', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                                                        textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                                                    }}>
                                                        <Phone size={11} /> Appeler
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
                                        <span style={{ opacity: 0.7 }}>
                                            {item.type === 'hive' ? '🐝 Site Apicole' :
                                                item.type === 'vet' ? '🩺 Clinique Vétérinaire' :
                                                    item.type === 'market' ? '🍯 Marché Apicole' : '🚜 Site de Ferme'}
                                        </span>
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
