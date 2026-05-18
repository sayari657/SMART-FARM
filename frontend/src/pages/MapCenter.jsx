import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Shield, Search, Navigation, Phone, Info, X, Clock, Globe } from 'lucide-react';
import Navbar from '../components/Navbar';
import SovereignMap from '../components/Map/SovereignMap';
import api, { externalAPI } from '../services/api';

const OVERPASS_MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
];

const CATEGORIES = (t) => [
    { id: 'all', label: t('map_center.all'), emoji: null },
    { id: 'hive', label: t('map_center.hives'), emoji: '🐝' },
    { id: 'vet', label: t('map_center.vets'), emoji: '🩺' },
    { id: 'farm', label: t('map_center.farms'), emoji: '🚜' },
    { id: 'market', label: t('map_center.markets'), emoji: '🍯' },
];

const TYPE_COLOR = {
    hive: 'var(--color-warning)',
    vet: '#ef4444',
    farm: 'var(--color-primary)',
    market: 'var(--color-accent)',
};

const MapCenter = () => {
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [farms, setFarms] = useState([]);
    const [vets, setVets] = useState([]);
    const [hives, setHives] = useState([]);
    const [markets, setMarkets] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [globalSearch, setGlobalSearch] = useState('');
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [viewCenter, setViewCenter] = useState([36.8065, 10.1815]);
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

    const haversine = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    useEffect(() => {
        const loadGeoData = async () => {
            try {
                const [farmsRes, vetsRes, hivesRes, marketsRes] = await Promise.all([
                    api.get('/geo/farms'),
                    api.get('/geo/vets'),
                    api.get('/geo/hives'),
                    api.get('/geo/markets')
                ]);
                setHives(hivesRes.data.features || []);
                setFarms(farmsRes.data.features || []);
                setVets(vetsRes.data.features || []);
                setMarkets(marketsRes.data.features || []);
                handleLocateMe();
            } catch (err) {
                console.error('Error loading geo data', err);
            } finally {
                setLoading(false);
            }
        };
        loadGeoData();
    }, []);

    const focusOn = (item) => {
        setSelectedEntity(item);
        const coords = item.coords || [item.geometry.coordinates[1], item.geometry.coordinates[0]];
        setViewCenter([coords[0], coords[1]]);
        setZoom(15);
    };

    const fetchGlobalDiscoveries = async (lat, lon) => {
        if (isDiscovering) return;
        setIsDiscovering(true);
        try {
            const res = await api.get(`/geo/nearby-vets?lat=${lat}&lon=${lon}&radius_km=100`);
            if (res.data) {
                setDiscoveredVets(res.data.map(v => ({
                    type: 'vet', discovery: true,
                    name: v.name, coords: v.coords, id: v.id, distance: v.distance_km,
                    properties: {
                        name: v.name,
                        specialty: v.specialty || 'Clinique Privée',
                        phone: v.phone || 'N/A',
                        address: v.address || 'Localisation Tunissienne'
                    }
                })));
            }
        } catch (err) {
            console.error('Local Discovery failed.', err);
        } finally {
            setIsDiscovering(false);
        }
    };

    const fetchOSMVets = async (lat, lon) => {
        setIsFetchingOSMVets(true);
        try {
            const query = `[out:json][timeout:30];(node["amenity"="veterinary"](around:100000,${lat},${lon});way["amenity"="veterinary"](around:100000,${lat},${lon}););out center;`;
            let data = null;
            for (const mirror of OVERPASS_MIRRORS) {
                try {
                    const res = await fetch(mirror, { method: 'POST', body: `data=${encodeURIComponent(query)}` });
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
                        id: `osm-${el.id}`, type: 'vet', osm: true,
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
            const [geoRes, weatherRes] = await Promise.all([
                externalAPI.geocode.reverse(lat, lon),
                externalAPI.weather.byCoords(lat, lon)
            ]);
            if (geoRes.data) {
                const addr = geoRes.data.address;
                setLocationName(addr.city || addr.town || addr.village || addr.suburb || geoRes.data.display_name.split(',')[0]);
            }
            if (weatherRes.data) setCurrentWeather(weatherRes.data);
        } catch (err) {
            console.error('Failed to fetch location/weather info', err);
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
            if (!features.length) { alert('Aucun résultat trouvé.'); return; }
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

    const filteredData = [
        ...hives.map(h => ({ ...h, type: 'hive', name: h.properties.name, coords: [h.geometry.coordinates[1], h.geometry.coordinates[0]], id: h.properties.id, metrics: h.properties.metrics, status: h.properties.status })),
        ...farms.map(f => ({ ...f, type: 'farm', name: f.properties.name, coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]], id: f.properties.id, properties: f.properties })),
        ...vets.map(v => ({ ...v, type: 'vet', name: v.properties.name, coords: [v.geometry.coordinates[1], v.geometry.coordinates[0]], id: v.properties.id, properties: v.properties, discovery: false })),
        ...markets.map(m => ({ ...m, type: 'market', name: m.properties.name, coords: [m.geometry.coordinates[1], m.geometry.coordinates[0]], id: m.properties.id, properties: m.properties })),
        ...discoveredVets,
        ...osmVets,
        ...(selectedEntity?.type === 'search' ? [selectedEntity] : [])
    ].map(item => {
        const refPos = userPos || viewCenter;
        const dist = item.coords?.length === 2 ? haversine(refPos[0], refPos[1], item.coords[0], item.coords[1]) : 9999;
        return { ...item, distance: dist };
    })
        .filter(item => item.distance <= 100)
        .filter(item => categoryFilter === 'all' || item.type === categoryFilter)
        .filter(item => (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.distance - b.distance);

    const countFor = (type) => filteredData.filter(i => i.type === type).length;

    const weatherIcon = currentWeather
        ? currentWeather.temperature > 25 ? '☀️' : currentWeather.precipitation > 0 ? '🌧️' : '☁️'
        : null;

    return (
        <div className="page-container" style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>
            <Navbar title={t('sidebar.map_center')} />

            {/* ── Toolbar ─────────────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                padding: '0 24px 16px',
            }}>
                {/* Search */}
                <form onSubmit={handleGlobalSearch} style={{ position: 'relative', flex: '1 1 260px', maxWidth: 400 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        placeholder={t('map_center.search_placeholder')}
                        className="form-control"
                        style={{ paddingLeft: 36, paddingRight: isSearching ? 36 : 12, height: 42, fontSize: 13, borderRadius: 'var(--r)', touchAction: 'manipulation' }}
                        value={globalSearch}
                        onChange={(e) => handleSearchInput(e.target.value)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        autoComplete="off"
                    />
                    {isSearching && (
                        <div className="spinner-center" style={{ right: 10, left: 'auto', width: 14, height: 14 }} />
                    )}
                    {/* Autocomplete dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
                            background: 'var(--color-surface)', borderRadius: 'var(--r)',
                            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--color-border)', overflow: 'hidden'
                        }}>
                            {suggestions.map((s, i) => (
                                <div
                                    key={i}
                                    onMouseDown={() => selectSuggestion(s)}
                                    style={{
                                        padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                                        borderBottom: i < suggestions.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <MapPin size={12} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.display}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </form>

                {/* Category filter pills with counts */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', overflowX: 'auto' }}>
                    {CATEGORIES(t).map(cat => {
                        const count = cat.id === 'all' ? filteredData.length : countFor(cat.id);
                        const active = categoryFilter === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setCategoryFilter(cat.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '5px 12px', borderRadius: 'var(--r-full)', fontSize: 12,
                                    fontWeight: active ? 600 : 500, whiteSpace: 'nowrap',
                                    background: active ? 'var(--color-primary)' : 'var(--color-surface)',
                                    color: active ? '#fff' : 'var(--color-text-2)',
                                    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                    cursor: 'pointer', transition: 'all .15s',
                                    boxShadow: active ? '0 2px 8px rgba(22,163,74,.25)' : 'none',
                                }}
                            >
                                {cat.emoji && <span>{cat.emoji}</span>}
                                {cat.label}
                                <span style={{
                                    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                                    background: active ? 'rgba(255,255,255,.25)' : 'var(--color-surface-2)',
                                    color: active ? '#fff' : 'var(--color-text-3)',
                                }}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Weather badge */}
                {currentWeather && locationName && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px',
                        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                        borderRadius: 'var(--r-full)', fontSize: 12, color: 'var(--color-text-2)',
                        whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                        <span>{weatherIcon}</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{currentWeather.temperature.toFixed(1)}°C</span>
                        <span style={{ color: 'var(--color-border)' }}>·</span>
                        <Navigation size={11} color="var(--color-primary)" />
                        <span>{locationName}</span>
                    </div>
                )}
                {isFetchingInfo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-3)' }}>
                        <div className="loader" style={{ width: 12, height: 12 }} />
                        {t('map_center.detecting')}
                    </div>
                )}

                {/* Locate me */}
                <button
                    onClick={handleLocateMe}
                    className="btn btn-secondary btn-sm"
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
                    title="Ma localisation"
                >
                    <Navigation size={13} />
                    <span style={{ fontSize: 12 }}>{t('map_center.locate')}</span>
                </button>
            </div>

            {/* ── Map + Panel ─────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr min(340px, 35vw)', gap: 16, padding: '0 24px 24px', height: 'calc(100dvh - 168px)' }}>

                {/* Map */}
                <div style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
                    {loading ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface)', gap: 12 }}>
                            <div className="loader" />
                            <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{t('map_center.loading_map')}</span>
                        </div>
                    ) : (
                        <SovereignMap
                            farms={farms.filter(f => f.geometry?.coordinates ? haversine(userPos?.[0] ?? viewCenter[0], userPos?.[1] ?? viewCenter[1], f.geometry.coordinates[1], f.geometry.coordinates[0]) <= 1000 : false)}
                            vets={[
                                ...vets.filter(v => v.geometry?.coordinates ? haversine(userPos?.[0] ?? viewCenter[0], userPos?.[1] ?? viewCenter[1], v.geometry.coordinates[1], v.geometry.coordinates[0]) <= 1000 : false),
                                ...osmVets.map(v => ({
                                    type: 'Feature',
                                    geometry: { type: 'Point', coordinates: [v.coords[1], v.coords[0]] },
                                    properties: { id: v.id, name: v.name, specialty: v.properties.specialty, phone: v.properties.phone, address: v.properties.address, osm: true }
                                }))
                            ]}
                            hives={hives.filter(h => h.geometry?.coordinates ? haversine(userPos?.[0] ?? viewCenter[0], userPos?.[1] ?? viewCenter[1], h.geometry.coordinates[1], h.geometry.coordinates[0]) <= 1000 : false)}
                            markets={markets.filter(m => m.geometry?.coordinates ? haversine(userPos?.[0] ?? viewCenter[0], userPos?.[1] ?? viewCenter[1], m.geometry.coordinates[1], m.geometry.coordinates[0]) <= 1000 : false)}
                            userPos={userPos}
                            center={[viewCenter[1], viewCenter[0]]}
                            zoom={zoom}
                            height="100%"
                            onMarkerClick={focusOn}
                            selectedEntity={selectedEntity}
                        />
                    )}
                </div>

                {/* ── Right Panel ─────────────────────────────────── */}
                <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Panel header */}
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                                {CATEGORIES(t).find(c => c.id === categoryFilter)?.label ?? t('map_center.results')}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
                                {filteredData.length} {filteredData.length !== 1 ? t('map_center.results').toLowerCase() : t('map_center.results').slice(0, -1).toLowerCase()} · {t('map_center.radius_100km')}
                            </div>
                        </div>
                        {(isDiscovering || isFetchingOSMVets) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-primary)' }}>
                                <div className="loader" style={{ width: 12, height: 12 }} />
                                {t('map_center.exploration')}
                            </div>
                        )}
                    </div>

                    {/* Scrollable list */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {filteredData.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-3)' }}>
                                <MapPin size={28} style={{ opacity: .3, margin: '0 auto 10px' }} />
                                <div style={{ fontSize: 13 }}>{t('map_center.no_results')}</div>
                            </div>
                        ) : filteredData.map((item, idx) => {
                            const isActive = selectedEntity?.id === item.id && selectedEntity?.type === item.type;
                            const color = TYPE_COLOR[item.type] || 'var(--color-text-3)';
                            const label = item.type === 'hive' ? t('map_center.hives') : item.type === 'vet' ? t('map_center.vet_clinic') : item.type === 'market' ? t('map_center.markets') : t('map_center.farm');
                            return (
                                <div
                                    key={idx}
                                    onClick={() => focusOn(item)}
                                    style={{
                                        padding: '10px 12px', borderRadius: 'var(--r)', cursor: 'pointer',
                                        border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border-light)'}`,
                                        background: isActive ? 'var(--color-primary-light)' : 'var(--color-surface)',
                                        transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 10,
                                        borderLeft: `3px solid ${isActive ? 'var(--color-primary)' : color}`,
                                    }}
                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'var(--color-surface)'; }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.nom || item.properties?.name || item.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>{label}</div>
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', flexShrink: 0 }}>
                                        {item.distance.toFixed(1)} km
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Selected entity detail drawer */}
                    {selectedEntity && selectedEntity.type !== 'search' && (
                        <div style={{ borderTop: '1px solid var(--color-border)', padding: '14px 16px', flexShrink: 0, background: 'var(--color-surface-2)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                                <div>
                                    <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: .5 }}>
                                        {selectedEntity.type === 'hive' ? t('map_center.selected_hive') : selectedEntity.type === 'vet' ? t('map_center.vet_clinic') : t('map_center.farm')}
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>
                                        {selectedEntity.nom || selectedEntity.properties?.name || selectedEntity.name}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedEntity(null)}
                                    style={{ background: 'var(--color-border)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                                >
                                    <X size={12} color="var(--color-text-2)" />
                                </button>
                            </div>

                            {/* Vet details */}
                            {selectedEntity.type === 'vet' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {selectedEntity.properties?.specialty && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-2)' }}>
                                            <Shield size={12} color="var(--color-text-3)" style={{ flexShrink: 0 }} />
                                            {selectedEntity.properties.specialty}
                                        </div>
                                    )}
                                    {selectedEntity.properties?.address && (
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--color-text-2)' }}>
                                            <MapPin size={12} color="var(--color-text-3)" style={{ flexShrink: 0, marginTop: 1 }} />
                                            {selectedEntity.properties.address}
                                        </div>
                                    )}
                                    {selectedEntity.properties?.opening_hours && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-2)' }}>
                                            <Clock size={12} color="var(--color-text-3)" style={{ flexShrink: 0 }} />
                                            {selectedEntity.properties.opening_hours}
                                        </div>
                                    )}
                                    {selectedEntity.properties?.website && (
                                        <a href={selectedEntity.properties.website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-primary)', textDecoration: 'none' }}>
                                            <Globe size={12} style={{ flexShrink: 0 }} />
                                            {t('map_center.website')}
                                        </a>
                                    )}
                                    {selectedEntity.properties?.phone && (
                                        <a href={`tel:${selectedEntity.properties.phone}`} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            marginTop: 6, padding: '8px', borderRadius: 'var(--r-sm)',
                                            background: 'var(--color-primary)', color: '#fff',
                                            textDecoration: 'none', fontSize: 13, fontWeight: 600,
                                        }}>
                                            <Phone size={13} /> {selectedEntity.properties.phone}
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Hive metrics */}
                            {selectedEntity.type === 'hive' && selectedEntity.metrics && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                    {[
                                        { label: t('map_center.weight'), value: `${selectedEntity.metrics.weight ?? '—'} kg` },
                                        { label: t('map_center.temp'), value: `${selectedEntity.metrics.temperature ?? '—'}°C` },
                                        { label: t('map_center.humidity'), value: `${selectedEntity.metrics.humidity ?? '—'}%` },
                                    ].map(m => (
                                        <div key={m.label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--r-sm)', padding: '8px', textAlign: 'center' }}>
                                            <div style={{ fontSize: 10, color: 'var(--color-text-3)', textTransform: 'uppercase', fontWeight: 600 }}>{m.label}</div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>{m.value}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MapCenter;
