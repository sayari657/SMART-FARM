import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './SovereignMap.css'; // We will create this file

// NDVI VIIRS NOAA-20 8 jours — NASA GIBS (WMTS public, sans clé API).
// Les composites démarrent le 1er janvier puis tous les 8 jours ; on prend
// la dernière période complète (marge de 12 j pour la latence de traitement).
function latestNdviDate() {
    const now = Date.now() - 12 * 86400 * 1000;
    const year = new Date(now).getUTCFullYear();
    const jan1 = Date.UTC(year, 0, 1);
    const period = Math.floor((now - jan1) / (8 * 86400 * 1000));
    const d = new Date(jan1 + period * 8 * 86400 * 1000);
    return d.toISOString().slice(0, 10);
}

const NDVI_TILES = (date) =>
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_NDVI_8Day/default/${date}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`;

// ── Weather layers config — Open-Meteo + RainViewer (100% gratuit, sans clé API) ──
const WEATHER_LAYERS = [
    {
        id: 'precipitation_new', label: '🌧️ Pluie', icon: '🌧️', name: 'Pluie', color: '#3b82f6',
        variable: 'precipitation', unit: 'mm', useRainViewer: true,
        colorScale: [
            [0,     'rgba(59,130,246,0)'],
            [0.5,   'rgba(147,210,234,0.45)'],
            [2,     'rgba(59,130,246,0.55)'],
            [10,    'rgba(29,78,216,0.65)'],
            [30,    'rgba(49,46,129,0.78)'],
        ],
    },
    {
        id: 'wind_new', label: '💨 Vent', icon: '💨', name: 'Vent', color: '#8b5cf6',
        variable: 'wind_speed_10m', unit: 'km/h',
        colorScale: [
            [0,  'rgba(139,92,246,0.05)'],
            [10, 'rgba(167,139,250,0.38)'],
            [20, 'rgba(139,92,246,0.55)'],
            [35, 'rgba(109,40,217,0.68)'],
            [60, 'rgba(59,7,100,0.82)'],
        ],
    },
    {
        id: 'temp_new', label: '🌡️ Temp', icon: '🌡️', name: 'Temp', color: '#f59e0b',
        variable: 'temperature_2m', unit: '°C',
        colorScale: [
            [-5,  'rgba(30,58,138,0.65)'],
            [5,   'rgba(59,130,246,0.55)'],
            [15,  'rgba(16,185,129,0.5)'],
            [25,  'rgba(245,158,11,0.58)'],
            [35,  'rgba(239,68,68,0.65)'],
            [42,  'rgba(127,29,29,0.78)'],
        ],
    },
    {
        id: 'clouds_new', label: '☁️ Nuages', icon: '☁️', name: 'Nuages', color: '#64748b',
        variable: 'cloud_cover', unit: '%',
        colorScale: [
            [0,   'rgba(148,163,184,0)'],
            [20,  'rgba(148,163,184,0.22)'],
            [50,  'rgba(100,116,139,0.45)'],
            [75,  'rgba(71,85,105,0.62)'],
            [95,  'rgba(30,41,59,0.78)'],
        ],
    },
];

// Interpolate a color from a color scale given a value
function weatherColor(value, scale) {
    if (value === null || value === undefined) return 'rgba(0,0,0,0)';
    for (let i = 0; i < scale.length - 1; i++) {
        const [v0, c0] = scale[i], [v1, c1] = scale[i + 1];
        if (value >= v0 && value <= v1) {
            const t = (value - v0) / (v1 - v0);
            // Parse rgba strings and interpolate
            const p = (s) => s.match(/[\d.]+/g).map(Number);
            const [r0,g0,b0,a0] = p(c0), [r1,g1,b1,a1] = p(c1);
            const r = Math.round(r0 + (r1-r0)*t), g = Math.round(g0 + (g1-g0)*t),
                  b = Math.round(b0 + (b1-b0)*t), a = +(a0 + (a1-a0)*t).toFixed(2);
            return `rgba(${r},${g},${b},${a})`;
        }
    }
    return value < scale[0][0] ? scale[0][1] : scale[scale.length-1][1];
}

// ── Tunisia's 24 governorates — embedded polygon boundaries (no external dependency) ──
// Rectangles are non-overlapping, geographically correct, cover all of Tunisia.
function embeddedTunGeoJSON() {
    // r(name, lonMin, latMin, lonMax, latMax)
    const r = (n, x1, y1, x2, y2) => ({
        type: 'Feature',
        properties: { name: n },
        geometry: {
            type: 'Polygon',
            coordinates: [[[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]]],
        },
    });
    return { type: 'FeatureCollection', features: [
        // ── GRAND NORD ──
        r('Bizerte',      9.00, 37.00, 10.10, 37.55),
        r('Jendouba',     7.95, 36.25,  8.40, 37.10),
        r('Béja',         8.40, 36.30,  9.72, 37.00),
        // ── GRAND TUNIS ──
        r('Manouba',      9.72, 36.65, 10.10, 36.90),
        r('Tunis',       10.10, 36.72, 10.42, 36.90),
        r('Ariana',      10.10, 36.90, 10.42, 37.10),
        r('Ben Arous',   10.10, 36.52, 10.55, 36.72),
        // ── CAP BON ──
        r('Nabeul',      10.55, 36.00, 11.20, 37.10),
        // ── CENTRE-NORD ──
        r('Kef',          7.95, 35.50,  9.10, 36.25),
        r('Siliana',      9.10, 35.65,  9.95, 36.30),
        r('Zaghouan',     9.95, 35.90, 10.55, 36.52),
        // ── CENTRE ──
        r('Kasserine',    7.95, 34.80,  9.10, 35.50),
        r('Kairouan',     9.10, 34.80, 10.55, 35.90),
        r('Sidi Bouzid',  7.95, 34.00,  9.82, 34.80),
        // ── CÔTE EST ──
        r('Sousse',      10.55, 35.38, 11.10, 36.00),
        r('Monastir',    10.55, 35.08, 11.10, 35.38),
        r('Mahdia',      10.55, 34.80, 11.18, 35.08),
        // ── SUD ──
        r('Sfax',         9.82, 33.50, 11.25, 34.80),
        r('Gafsa',        7.95, 33.50,  9.00, 34.00),
        r('Gabès',        9.00, 33.00,  9.82, 34.00),
        r('Médenine',     9.82, 32.00, 11.50, 33.50),
        r('Tataouine',    8.40, 30.20,  9.82, 32.00),
        r('Tozeur',       7.50, 32.80,  8.40, 33.50),
        r('Kébili',       8.40, 32.00,  9.82, 33.00),
    ]};
}

// Centroid of a GeoJSON feature
function geoCentroid(feature) {
    const g = feature.geometry;
    const ring = g.type === 'Polygon' ? g.coordinates[0]
               : g.type === 'MultiPolygon' ? g.coordinates[0][0] : [];
    const n = ring.length;
    if (!n) return [0, 0];
    return [
        ring.reduce((s, c) => s + c[1], 0) / n, // lat
        ring.reduce((s, c) => s + c[0], 0) / n, // lon
    ];
}

// Batch fetch Open-Meteo weather for array of {lat, lon} points
async function batchWeather(points, variable) {
    const lats = points.map(p => (+p.lat).toFixed(4)).join(',');
    const lons = points.map(p => (+p.lon).toFixed(4)).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=${variable}&timezone=auto&forecast_days=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(18000) });
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [data];
    return arr.map(d => d?.current?.[variable] ?? null);
}

// Fetch latest RainViewer radar timestamp
async function fetchRainViewerPath() {
    try {
        const r = await fetch('https://api.rainviewer.com/public/weather-maps.json', { signal: AbortSignal.timeout(5000) });
        const d = await r.json();
        const past = d?.radar?.past || [];
        return past.length > 0 ? past[past.length - 1].path : null;
    } catch { return null; }
}

const SovereignMap = ({
    farms = [],
    vets = [],
    hives = [],
    markets = [],
    iotSensors = [],
    farmAlerts = [],
    center = [10.1815, 36.8065],
    zoom = 7,
    height = "100%",
    userPos = null,
    userAccuracy = null,
    onMarkerClick = () => { },
    selectedEntity = null
}) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef([]);
    const [isStyleLoaded, setIsStyleLoaded] = React.useState(false);
    const [showNdvi, setShowNdvi] = React.useState(false);
    const [activeWeatherLayer, setActiveWeatherLayer] = React.useState(null);
    const [weatherLoading, setWeatherLoading] = React.useState(false);
    const [weatherStats, setWeatherStats] = React.useState(null); // { min, max, unit, label }
    const ndviDate = latestNdviDate();

    // Default Style (Carto Voyager) - Better compatibility with ngrok/HTTPS
    const DEFAULT_MAP_STYLE = {
        version: 8,
        sources: {
            'osm': {
                type: 'raster',
                tiles: ['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'],
                tileSize: 256,
                attribution: '&copy; OpenStreetMap &copy; CARTO'
            }
        },
        layers: [{ id: 'osm-layer', type: 'raster', source: 'osm' }]
    };

    const mapStyle = DEFAULT_MAP_STYLE;

    useEffect(() => {
        if (map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: mapStyle,
            center: center,
            zoom: zoom,
            antialias: true,
            failIfMajorPerformanceCaveat: false,
            transformRequest: (url) => {
                // Silencing the Auth Popup: Never send credentials for local map tiles
                if (url.includes('/map-tiles')) {
                    return {
                        url: url,
                        credentials: 'omit' // This stops the browser "Se connecter" popup
                    };
                }
                return { url: url };
            }
        });

        // Failover Logic: If style is an object (OSM), it's available immediately
        if (typeof mapStyle === 'object') {
            setIsStyleLoaded(true);
        }

        map.current.on('load', () => setIsStyleLoaded(true));

        map.current.on('styledata', () => {
            if (map.current.isStyleLoaded()) {
                setIsStyleLoaded(true);
            }
        });



        // Track style loading to prevent "Style not done loading" errors
        map.current.on('styledata', () => {
            if (map.current.isStyleLoaded()) {
                setIsStyleLoaded(true);
            }
        });

        // Enterprise map controls
        map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');
        map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');
        map.current.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    // NDVI satellite overlay (NASA GIBS) — toggled by the user
    useEffect(() => {
        if (!map.current) return;
        const apply = () => {
            const m = map.current;
            if (!m) return;
            try {
                if (showNdvi) {
                    if (!m.getSource('ndvi')) {
                        m.addSource('ndvi', {
                            type: 'raster',
                            tiles: [NDVI_TILES(ndviDate)],
                            tileSize: 256,
                            maxzoom: 8,
                            attribution: 'NDVI © NASA GIBS / VIIRS NOAA-20',
                        });
                    }
                    if (!m.getLayer('ndvi-layer')) {
                        m.addLayer({
                            id: 'ndvi-layer',
                            type: 'raster',
                            source: 'ndvi',
                            paint: { 'raster-opacity': 0.62 },
                        });
                    }
                } else if (m.getLayer('ndvi-layer')) {
                    m.removeLayer('ndvi-layer');
                }
            } catch (e) { console.warn('NDVI layer:', e); }
        };
        if (map.current.isStyleLoaded()) apply();
        else map.current.once('styledata', apply);
    }, [showNdvi, ndviDate]);

    // ── Weather choropleth — 24 gouvernorats de Tunisie (polygones embarqués + Open-Meteo) ──
    useEffect(() => {
        if (!map.current) return;
        const GOV_SRC  = 'weather-gov';
        const GOV_FILL = 'weather-gov-fill';
        const GOV_LINE = 'weather-gov-line';
        const GOV_LBL  = 'weather-gov-label';
        const RV_SRC   = 'rainviewer-source';
        const RV_LYR   = 'rainviewer-layer';

        const cleanup = (m) => {
            try {
                [GOV_FILL, GOV_LINE, GOV_LBL, RV_LYR].forEach(l => { if (m.getLayer(l)) m.removeLayer(l); });
                [GOV_SRC, RV_SRC].forEach(s => { if (m.getSource(s)) m.removeSource(s); });
                m.off('click', GOV_FILL);
                m.off('mouseenter', GOV_FILL);
                m.off('mouseleave', GOV_FILL);
                if (m.getCanvas()) m.getCanvas().style.cursor = '';
            } catch {}
        };

        const apply = async () => {
            const m = map.current;
            if (!m || !m.isStyleLoaded()) return;
            cleanup(m);
            setWeatherStats(null);
            if (!activeWeatherLayer) return;

            const layerConfig = WEATHER_LAYERS.find(l => l.id === activeWeatherLayer);
            if (!layerConfig) return;
            setWeatherLoading(true);

            try {
                // ① Polygones des gouvernorats embarqués directement (instant, sans réseau)
                const govGeoJSON = embeddedTunGeoJSON();
                const features = govGeoJSON.features;

                // ② Calculer les centroides et récupérer la météo pour chaque gouvernorat
                const centroids = features.map(f => geoCentroid(f));
                const rawValues = await batchWeather(
                    centroids.map(([lat, lon]) => ({ lat, lon })),
                    layerConfig.variable
                );

                // ③ Colorier chaque gouvernorat selon sa valeur
                const coloredGeoJSON = {
                    type: 'FeatureCollection',
                    features: features.map((f, i) => ({
                        ...f,
                        properties: {
                            name: f.properties.name,
                            value: rawValues[i],
                            fillColor: rawValues[i] !== null
                                ? weatherColor(rawValues[i], layerConfig.colorScale)
                                : 'rgba(100,116,139,0.15)',
                            label: rawValues[i] !== null
                                ? `${rawValues[i].toFixed(1)}${layerConfig.unit}`
                                : '—',
                        },
                    })),
                };

                // ④ Ajouter les couches à la carte
                m.addSource(GOV_SRC, { type: 'geojson', data: coloredGeoJSON });
                m.addLayer({
                    id: GOV_FILL, type: 'fill', source: GOV_SRC,
                    paint: { 'fill-color': ['get', 'fillColor'], 'fill-opacity': 0.80 },
                });
                m.addLayer({
                    id: GOV_LINE, type: 'line', source: GOV_SRC,
                    paint: {
                        'line-color': 'rgba(255,255,255,0.9)',
                        'line-width': 1.8,
                        'line-opacity': 0.95,
                    },
                });
                m.addLayer({
                    id: GOV_LBL, type: 'symbol', source: GOV_SRC,
                    layout: {
                        'text-field': ['get', 'label'],
                        'text-size': [
                            'interpolate', ['linear'], ['zoom'],
                            5, 9,
                            7, 12,
                            9, 14,
                        ],
                        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                        'text-anchor': 'center',
                        'text-allow-overlap': false,
                        'text-ignore-placement': false,
                    },
                    paint: {
                        'text-color': '#ffffff',
                        'text-halo-color': 'rgba(0,0,0,0.7)',
                        'text-halo-width': 1.8,
                    },
                });

                // ⑤ Hover cursor + click popup
                m.on('mouseenter', GOV_FILL, () => { m.getCanvas().style.cursor = 'pointer'; });
                m.on('mouseleave', GOV_FILL, () => { m.getCanvas().style.cursor = ''; });
                m.on('click', GOV_FILL, (e) => {
                    if (!e.features?.length) return;
                    const p = e.features[0].properties;
                    const grad = layerConfig.colorScale.map(([,c]) => c).join(', ');
                    new maplibregl.Popup({ closeButton: true, maxWidth: '240px' })
                        .setLngLat(e.lngLat)
                        .setHTML(`
                            <div style="padding:14px;font-family:-apple-system,sans-serif">
                                <div style="font-size:9px;font-weight:900;text-transform:uppercase;color:${layerConfig.color};letter-spacing:1px;margin-bottom:4px">${layerConfig.label}</div>
                                <div style="font-size:16px;font-weight:800;color:#1e293b;margin-bottom:10px">📍 ${p.name}</div>
                                <div style="font-size:36px;font-weight:900;color:${layerConfig.color};text-align:center;padding:8px 0;background:rgba(0,0,0,0.03);border-radius:10px">${p.label}</div>
                                <div style="margin-top:12px;height:8px;border-radius:4px;background:linear-gradient(90deg,${grad})"></div>
                                <div style="display:flex;justify-content:space-between;font-size:8px;color:#94a3b8;margin-top:3px;font-weight:600">
                                    <span>Min</span><span>—</span><span>Max</span>
                                </div>
                                <div style="font-size:8px;color:#cbd5e1;margin-top:6px;text-align:center">☀️ Open-Meteo · Temps réel</div>
                            </div>
                        `).addTo(m);
                });

                // ⑥ Stats pour la légende
                const valid = rawValues.filter(v => v !== null);
                if (valid.length > 0) {
                    setWeatherStats({
                        min: Math.min(...valid).toFixed(1),
                        max: Math.max(...valid).toFixed(1),
                        avg: (valid.reduce((a,b) => a+b,0) / valid.length).toFixed(1),
                        count: features.length,
                        unit: layerConfig.unit,
                        label: layerConfig.label,
                        color: layerConfig.color,
                        colorScale: layerConfig.colorScale,
                    });
                }

                // ⑦ RainViewer radar (pluie uniquement)
                if (layerConfig.useRainViewer) {
                    const rvPath = await fetchRainViewerPath();
                    if (rvPath) {
                        const rvUrl = `https://tilecache.rainviewer.com${rvPath}/256/{z}/{x}/{y}/2/1_1.png`;
                        m.addSource(RV_SRC, { type:'raster', tiles:[rvUrl], tileSize:256, attribution:'© RainViewer' });
                        m.addLayer({ id:RV_LYR, type:'raster', source:RV_SRC, paint:{'raster-opacity':0.6} });
                    }
                }
            } catch (e) {
                console.warn('Weather choropleth error:', e);
            } finally {
                setWeatherLoading(false);
            }
        };

        if (map.current.isStyleLoaded()) apply();
        else map.current.once('load', apply);

        return () => { if (map.current) cleanup(map.current); };
    }, [activeWeatherLayer]);

    // Camera Sync Logic: Fly-to when center/zoom props change
    useEffect(() => {
        const isNgrok = window.location.hostname.includes('ngrok');
        if (!map.current || (!isStyleLoaded && !isNgrok)) return;
        const [lon, lat] = center;
        map.current.flyTo({
            center: [lon, lat],
            zoom: zoom,
            speed: 1.2,
            curve: 1.4,
            essential: true
        });
    }, [center, zoom, isStyleLoaded]);

    // Update markers when data changes
    useEffect(() => {
        const isNgrok = window.location.hostname.includes('ngrok');
        if (!map.current || (!isStyleLoaded && !isNgrok)) return;

        // 1. Clear existing markers properly
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        // ── IoT Sensor Markers ──────────────────────────────────────────────────
        iotSensors.forEach(s => {
            const coords = s.coords || [s.geometry?.coordinates[1], s.geometry?.coordinates[0]];
            const lon = s.geometry?.coordinates[0] ?? (s.coords?.[1]);
            const lat = s.geometry?.coordinates[1] ?? (s.coords?.[0]);
            if (!lat || !lon) return;
            const props = s.properties || s;
            const status = props.status || 'ok';
            const el = createMarkerElement('iot', status);
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([lon, lat])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
                    <div class="map-popup premium iot-popup">
                        <div class="popup-type-tag iot-tag">CAPTEURS IoT</div>
                        <h3>📡 ${props.name || 'Ferme'}</h3>
                        <div class="iot-stats-grid">
                            <div class="iot-stat">
                                <strong>${props.total || 0}</strong>
                                <span>Total</span>
                            </div>
                            <div class="iot-stat active">
                                <strong>${props.active || 0}</strong>
                                <span>Actifs</span>
                            </div>
                            <div class="iot-stat offline">
                                <strong>${props.offline || 0}</strong>
                                <span>Hors ligne</span>
                            </div>
                        </div>
                        ${props.address ? `<p class="popup-addr">📍 ${props.address}</p>` : ''}
                        <div class="popup-coords">${lat.toFixed(5)}, ${lon.toFixed(5)}</div>
                    </div>
                `))
                .addTo(map.current);
            markersRef.current.push(marker);
            el.addEventListener('click', () => onMarkerClick({ ...s, type: 'iot', name: props.name, coords: [lat, lon] }));
        });

        // ── Farm Alert Markers ──────────────────────────────────────────────────
        farmAlerts.forEach(a => {
            const lon = a.geometry?.coordinates[0];
            const lat = a.geometry?.coordinates[1];
            if (!lat || !lon) return;
            const props = a.properties || a;
            const severity = props.severity || 'warning';
            const el = createMarkerElement('alert', severity);
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([lon, lat])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
                    <div class="map-popup premium alert-popup ${severity}">
                        <div class="popup-type-tag alert-tag ${severity}">${severity === 'critical' ? '🚨 CRITIQUE' : '⚠️ AVERTISSEMENT'}</div>
                        <h3>${props.name || 'Ferme'}</h3>
                        <div class="alert-counts">
                            <span class="alert-badge total">${props.total_alerts || 0} alerte${(props.total_alerts || 0) > 1 ? 's' : ''}</span>
                            ${(props.critical_alerts || 0) > 0 ? `<span class="alert-badge critical">${props.critical_alerts} critique${props.critical_alerts > 1 ? 's' : ''}</span>` : ''}
                        </div>
                        ${props.address ? `<p class="popup-addr">📍 ${props.address}</p>` : ''}
                        <div class="popup-coords">${lat.toFixed(5)}, ${lon.toFixed(5)}</div>
                    </div>
                `))
                .addTo(map.current);
            markersRef.current.push(marker);
            el.addEventListener('click', () => onMarkerClick({ ...a, type: 'alert', name: props.name, coords: [lat, lon] }));
        });

        const mapsLink = (lon, lat) =>
            `https://www.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}`;
        const coordLabel = (lon, lat) =>
            `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

        // Process Hives (Yellow Hexagons)
        hives.forEach(h => {
            const el = createMarkerElement('hive');
            const metrics = h.properties?.metrics || { weight: 0, temperature: 0, humidity: 0 };
            const status = h.properties?.status || 'healthy';
            const lon = h.geometry.coordinates[0];
            const lat = h.geometry.coordinates[1];
            const addr = h.properties?.address ? `<p class="popup-addr">📍 ${h.properties.address}</p>` : '';

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([lon, lat])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
                    <div class="map-popup premium hive-live">
                        <div class="popup-status-badge ${status}">${status.toUpperCase()}</div>
                        <h3>🐝 ${h.properties?.name || h.name}</h3>
                        <div class="metrics-grid">
                            <div class="m-item"><strong>${metrics.weight}</strong><span>kg</span></div>
                            <div class="m-item"><strong>${metrics.temperature}</strong><span>°C</span></div>
                            <div class="m-item"><strong>${metrics.humidity}</strong><span>%</span></div>
                        </div>
                        ${addr}
                        <div class="popup-coords">${coordLabel(lon, lat)}</div>
                        <a class="popup-maps-link" href="${mapsLink(lon, lat)}" target="_blank" rel="noopener">🗺️ Google Maps</a>
                    </div>
                `))
                .addTo(map.current);
            markersRef.current.push(marker);
            el.addEventListener('click', () => onMarkerClick(h));
        });

        // Process Vets (Red Shields)
        vets.forEach(v => {
            const coords = v.coords || [v.geometry.coordinates[0], v.geometry.coordinates[1]];
            const lon = coords[0], lat = coords[1];
            const el = createMarkerElement('vet');
            const addr = v.properties?.address ? `<p class="popup-addr">📍 ${v.properties.address}</p>` : '';
            const phone = v.properties?.phone ? `<p class="popup-addr">📞 ${v.properties.phone}</p>` : '';
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([lon, lat])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
                    <div class="map-popup premium">
                        <h3>🩺 ${v.properties?.name || v.name}</h3>
                        <p>${v.properties?.specialty || 'Clinique Vétérinaire'}</p>
                        ${addr}${phone}
                        <div class="popup-coords">${coordLabel(lon, lat)}</div>
                        <a class="popup-maps-link" href="${mapsLink(lon, lat)}" target="_blank" rel="noopener">🗺️ Google Maps</a>
                    </div>
                `))
                .addTo(map.current);
            markersRef.current.push(marker);
            el.addEventListener('click', () => onMarkerClick(v));
        });

        // Add Farms (Green Houses)
        farms.forEach(f => {
            const lon = f.geometry.coordinates[0], lat = f.geometry.coordinates[1];
            const el = createMarkerElement('farm');
            const addr = f.properties?.address ? `<p class="popup-addr">📍 ${f.properties.address}</p>` : '';
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([lon, lat])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
                    <div class="map-popup premium">
                        <h3>🚜 ${f.properties?.name || f.name}</h3>
                        <p>Ferme Agricole · ${f.properties?.status || 'active'}</p>
                        ${addr}
                        <div class="popup-coords">${coordLabel(lon, lat)}</div>
                        <a class="popup-maps-link" href="${mapsLink(lon, lat)}" target="_blank" rel="noopener">🗺️ Google Maps</a>
                    </div>
                `))
                .addTo(map.current);
            markersRef.current.push(marker);
            el.addEventListener('click', () => onMarkerClick(f));
        });

        // Add Markets (Amber Honey Jars)
        markets.forEach(m => {
            const lon = m.geometry.coordinates[0], lat = m.geometry.coordinates[1];
            const el = createMarkerElement('market');
            const addr = m.properties?.address ? `<p class="popup-addr">📍 ${m.properties.address}</p>` : '';
            const phone = m.properties?.phone ? `<p class="popup-addr">📞 ${m.properties.phone}</p>` : '';
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([lon, lat])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
                    <div class="map-popup premium market-popup">
                        <div class="popup-type-tag">MARCHÉ</div>
                        <h3>🍯 ${m.properties?.name || m.name}</h3>
                        ${addr}${phone}
                        <div class="popup-coords">${coordLabel(lon, lat)}</div>
                        <a class="popup-maps-link" href="${mapsLink(lon, lat)}" target="_blank" rel="noopener">🗺️ Google Maps</a>
                    </div>
                `))
                .addTo(map.current);
            markersRef.current.push(marker);
            el.addEventListener('click', () => onMarkerClick(m));
        });

        // User Position (Pulsating Blue Navigation)
        if (userPos) {
            const el = createMarkerElement('user');
            const accuracyLabel = userAccuracy != null
                ? `±${userAccuracy < 1000 ? Math.round(userAccuracy) + 'm' : (userAccuracy / 1000).toFixed(1) + 'km'}`
                : '';
            const accuracyColor = userAccuracy == null ? '#3b82f6'
                : userAccuracy < 50 ? '#22c55e'
                : userAccuracy < 200 ? '#f59e0b'
                : '#ef4444';
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([userPos[1], userPos[0]])
                .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(`
                    <div style="background: ${accuracyColor}; color: white; padding: 6px 12px; border-radius: 8px; font-weight: 800; font-size: 11px;">
                        📍 VOUS ÊTES ICI ${accuracyLabel ? `<br/><span style="font-weight:500;font-size:10px">Précision ${accuracyLabel}</span>` : ''}
                    </div>
                `))
                .addTo(map.current);
            markersRef.current.push(marker);

            // Open popup by default so user sees clearly where they are
            const startPopup = new maplibregl.Popup({ offset: 15, closeButton: false })
                .setLngLat([userPos[1], userPos[0]])
                .setHTML(`<div style="color: ${accuracyColor}; font-weight: 900; font-size: 10px; text-transform: uppercase;">Moi${accuracyLabel ? ` · ${accuracyLabel}` : ''}</div>`)
                .addTo(map.current);
            markersRef.current.push(startPopup);

            // GPS accuracy circle (radius = actual GPS accuracy in meters)
            if (userAccuracy != null) {
                const accuracyRadiusKm = userAccuracy / 1000;
                const accuracyData = createGeoJSONCircle([userPos[1], userPos[0]], accuracyRadiusKm);
                if (map.current.getSource('gps-accuracy')) {
                    map.current.getSource('gps-accuracy').setData(accuracyData);
                } else {
                    map.current.addSource('gps-accuracy', { type: 'geojson', data: accuracyData });
                    map.current.addLayer({
                        id: 'gps-accuracy-fill',
                        type: 'fill',
                        source: 'gps-accuracy',
                        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.12 }
                    });
                    map.current.addLayer({
                        id: 'gps-accuracy-outline',
                        type: 'line',
                        source: 'gps-accuracy',
                        paint: { 'line-color': '#3b82f6', 'line-width': 1.5, 'line-opacity': 0.6 }
                    });
                }
            }

            // Dynamic 100km circle simulation (using a GeoJSON source in MapLibre for better performance)
            if (map.current.getSource('proximity')) {
                map.current.getSource('proximity').setData(createGeoJSONCircle([userPos[1], userPos[0]], 100));
            } else {
                map.current.addSource('proximity', {
                    type: 'geojson',
                    data: createGeoJSONCircle([userPos[1], userPos[0]], 100)
                });
                map.current.addLayer({
                    id: 'proximity-layer',
                    type: 'fill',
                    source: 'proximity',
                    paint: {
                        'fill-color': '#7c3aed',
                        'fill-opacity': 0.05
                    }
                });
                map.current.addLayer({
                    id: 'proximity-outline',
                    type: 'line',
                    source: 'proximity',
                    paint: {
                        'line-color': '#7c3aed',
                        'line-width': 1,
                        'line-dasharray': [2, 2]
                    }
                });
            }
        }

        // Search Result Pin (pulsing purple pin placed at searched location)
        if (selectedEntity?.type === 'search' && selectedEntity.coords) {
            const [sLat, sLon] = selectedEntity.coords;
            const sName = selectedEntity.name || selectedEntity.properties?.name || 'Résultat';
            const el = createMarkerElement('search');
            const popup = new maplibregl.Popup({ offset: 36, closeButton: true })
                .setHTML(`
                    <div class="map-popup premium search-popup">
                        <div class="popup-type-tag search-tag">RÉSULTAT DE RECHERCHE</div>
                        <h3>📍 ${sName}</h3>
                        <div class="popup-coords">${sLat.toFixed(5)}, ${sLon.toFixed(5)}</div>
                        <a class="popup-maps-link" href="https://www.google.com/maps?q=${sLat.toFixed(6)},${sLon.toFixed(6)}" target="_blank" rel="noopener">🗺️ Google Maps</a>
                    </div>
                `);
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([sLon, sLat])
                .setPopup(popup)
                .addTo(map.current);
            marker.togglePopup();
            markersRef.current.push(marker);
        }

        // --- HIVE-MARKET CONNECTIVITY LINKS ---
        const isNgrokActive = window.location.hostname.includes('ngrok');
        if ((isStyleLoaded || isNgrokActive) && map.current) {
            const updateConnectivity = () => {
                const sourceId = 'hive-market-links';
                const layerId = 'hive-market-links-layer';

                if (!selectedEntity || selectedEntity.type !== 'market') {
                    if (map.current.getSource(sourceId)) {
                        map.current.getSource(sourceId).setData({ type: 'FeatureCollection', features: [] });
                    }
                    return;
                }

                // Calculate links to top 3 nearest hives
                const marketCoords = selectedEntity.coords || [selectedEntity.geometry.coordinates[1], selectedEntity.geometry.coordinates[0]];
                const sortedHives = [...hives].sort((a, b) => {
                    const distA = haversine(marketCoords[0], marketCoords[1], a.geometry.coordinates[1], a.geometry.coordinates[0]);
                    const distB = haversine(marketCoords[0], marketCoords[1], b.geometry.coordinates[1], b.geometry.coordinates[0]);
                    return distA - distB;
                }).slice(0, 3);

                const features = sortedHives.map(h => ({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            [marketCoords[1], marketCoords[0]],
                            [h.geometry.coordinates[0], h.geometry.coordinates[1]]
                        ]
                    }
                }));

                const source = map.current.getSource(sourceId);
                if (source) {
                    source.setData({ type: 'FeatureCollection', features });
                } else {
                    map.current.addSource(sourceId, {
                        type: 'geojson',
                        data: { type: 'FeatureCollection', features }
                    });
                    map.current.addLayer({
                        id: layerId,
                        type: 'line',
                        source: sourceId,
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: {
                            'line-color': '#f59e0b',
                            'line-width': 2,
                            'line-dasharray': [3, 2],
                            'line-opacity': 0.8
                        }
                    });
                }
            };

            // MapLibre style might not be ready for sources immediately after load in some races
            if (map.current.isStyleLoaded()) {
                updateConnectivity();
            } else {
                map.current.once('styledata', updateConnectivity);
            }
        }
    }, [farms, vets, hives, markets, userPos, userAccuracy, center, isStyleLoaded, selectedEntity]);

    return (
        <div style={{ position: 'relative', width: '100%', height: height }}>
            <div ref={mapContainer} style={{ width: '100%', height: '100%', borderRadius: '24px' }} />

            {/* ── Controls Panel (top-left) ─────────────────────────────────── */}
            <div style={{
                position: 'absolute', top: 14, left: 14, zIndex: 5,
                display: 'flex', flexDirection: 'column', gap: 6,
            }}>
                {/* NDVI Toggle */}
                <button
                    onClick={() => setShowNdvi(v => !v)}
                    title={`NDVI VIIRS NOAA-20 — composite 8 jours du ${ndviDate}`}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        background: showNdvi ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'rgba(255,255,255,0.95)',
                        color: showNdvi ? '#fff' : '#475569',
                        border: showNdvi ? 'none' : '1.5px solid #e2e8f0',
                        borderRadius: 10, padding: '7px 12px', cursor: 'pointer',
                        fontSize: 11, fontWeight: 800, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    }}>
                    🛰️ NDVI {showNdvi ? 'ON' : 'OFF'}
                </button>

                {/* Weather Layer Cards — MSN Weather tile style */}
                <div style={{
                    background: 'linear-gradient(160deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))',
                    borderRadius: 18, border: '1px solid rgba(226,232,240,0.9)',
                    padding: 12, width: 188,
                    boxShadow: '0 10px 30px rgba(15,23,42,0.14)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', letterSpacing: 0.3 }}>
                            Météo
                        </span>
                        {weatherLoading
                            ? <span style={{ width: 9, height: 9, borderRadius: '50%', border: '1.6px solid #3b82f6', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                            : <span style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6 }}>Temps réel</span>
                        }
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {WEATHER_LAYERS.map(layer => {
                            const isActive = activeWeatherLayer === layer.id;
                            return (
                                <button
                                    key={layer.id}
                                    onClick={() => setActiveWeatherLayer(isActive ? null : layer.id)}
                                    title={layer.label}
                                    style={{
                                        position: 'relative', display: 'flex', flexDirection: 'column',
                                        alignItems: 'flex-start', gap: 6, padding: '11px 10px',
                                        borderRadius: 14, cursor: 'pointer', transition: 'all .18s ease',
                                        background: isActive
                                            ? `linear-gradient(150deg, ${layer.color}, ${layer.color}cc)`
                                            : 'rgba(255,255,255,0.85)',
                                        border: `1px solid ${isActive ? layer.color : 'rgba(226,232,240,0.95)'}`,
                                        boxShadow: isActive
                                            ? `0 6px 16px ${layer.color}55`
                                            : '0 1px 3px rgba(15,23,42,0.06)',
                                        transform: isActive ? 'translateY(-1px)' : 'none',
                                    }}
                                >
                                    <span style={{
                                        fontSize: 20, lineHeight: 1,
                                        filter: isActive ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' : 'none',
                                    }}>{layer.icon}</span>
                                    <span style={{
                                        fontSize: 11, fontWeight: 800, letterSpacing: 0.2,
                                        color: isActive ? '#fff' : '#475569',
                                    }}>{layer.name}</span>
                                    {isActive && (
                                        <span style={{
                                            position: 'absolute', top: 8, right: 8,
                                            width: 7, height: 7, borderRadius: '50%',
                                            background: '#fff', boxShadow: '0 0 0 2px rgba(255,255,255,0.4)',
                                        }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 10, textAlign: 'center', fontWeight: 600 }}>
                        ☀️ Open-Meteo · RainViewer
                    </div>
                </div>

                {/* Weather Legend (dynamique — par gouvernorat) */}
                {weatherStats && (
                    <div style={{
                        background: 'rgba(255,255,255,0.97)', borderRadius: 10,
                        border: `1.5px solid ${weatherStats.color}40`,
                        padding: '10px 12px', boxShadow: '0 4px 14px rgba(0,0,0,0.12)', width: 172,
                    }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#0f172a', marginBottom: 2, letterSpacing: 0.3 }}>
                            {weatherStats.label}
                        </div>
                        <div style={{ fontSize: 8, color: '#94a3b8', marginBottom: 7 }}>
                            {weatherStats.count} gouvernorats · temps réel
                        </div>
                        {/* Gradient bar */}
                        <div style={{
                            height: 10, borderRadius: 5,
                            background: `linear-gradient(90deg, ${weatherStats.colorScale.map(([,c]) => c).join(', ')})`,
                        }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#64748b', marginTop: 3, fontWeight: 700 }}>
                            <span>{weatherStats.min} {weatherStats.unit}</span>
                            <span style={{ color: weatherStats.color }}>moy {weatherStats.avg}</span>
                            <span>{weatherStats.max} {weatherStats.unit}</span>
                        </div>
                        <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 7, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>👆</span>
                            <span>Cliquer sur une région</span>
                        </div>
                    </div>
                )}


                {/* NDVI Legend */}
                {showNdvi && (
                    <div style={{
                        background: 'rgba(255,255,255,0.95)', borderRadius: 10,
                        border: '1.5px solid #e2e8f0', padding: '8px 12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: 160,
                    }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#0f172a', marginBottom: 5 }}>
                            Santé végétale (NDVI)
                        </div>
                        <div style={{
                            height: 8, borderRadius: 4,
                            background: 'linear-gradient(90deg,#a16207 0%,#eab308 30%,#84cc16 60%,#15803d 100%)',
                        }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8', marginTop: 3 }}>
                            <span>Sol nu</span><span>Dense</span>
                        </div>
                        <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 4 }}>
                            VIIRS NOAA-20 · {ndviDate} · NASA GIBS
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper: Create GeoJSON Circle for MapLibre
function createGeoJSONCircle(center, radiusInKm, points = 64) {
    const coords = {
        latitude: center[1],
        longitude: center[0]
    };
    const km = radiusInKm;
    const ret = [];
    const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
    const distanceY = km / 110.574;

    let theta, x, y;
    for (let i = 0; i < points; i++) {
        theta = (i / points) * (2 * Math.PI);
        x = distanceX * Math.cos(theta);
        y = distanceY * Math.sin(theta);
        ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]);
    return {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [ret]
        }
    };
}

// Helper: Create Custom HTML Marker Elements
function createMarkerElement(type, subtype) {
    const el = document.createElement('div');
    el.className = `custom-marker marker-${type}`;

    let innerHTML = '';
    if (type === 'iot') {
        const colors = { ok: { bg: '#e0f2fe', border: '#0284c7', icon: '#0284c7' }, warning: { bg: '#fef9c3', border: '#ca8a04', icon: '#ca8a04' }, offline: { bg: '#fee2e2', border: '#dc2626', icon: '#dc2626' } };
        const c = colors[subtype] || colors.ok;
        innerHTML = `
            <div class="marker-icon iot-icon" style="background:${c.bg}; border-color:${c.border};">
                ${subtype === 'offline' ? '<div class="iot-offline-ring"></div>' : ''}
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${c.icon}" stroke-width="2" stroke-linecap="round">
                    <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
                    <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                    <line x1="12" y1="20" x2="12.01" y2="20"/>
                </svg>
            </div>
            <div class="iot-count-badge" style="background:${c.border}">${subtype === 'ok' ? '✓' : subtype === 'offline' ? '!' : '~'}</div>
        `;
    } else if (type === 'alert') {
        const isCritical = subtype === 'critical';
        innerHTML = `
            <div class="alert-marker-ring ${isCritical ? 'critical' : 'warning'}"></div>
            <div class="marker-icon alert-icon ${isCritical ? 'critical' : 'warning'}">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
            </div>
        `;
    } else if (type === 'user') {
        innerHTML = `
            <div class="user-marker-pulse"></div>
            <div class="user-marker-core">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M3 11l19-9-9 19-2-8-8-2z" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
        `;
    } else if (type === 'hive') {
        innerHTML = `
            <div class="marker-icon hive-icon shadow-lg">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#facc15" stroke="#854d0e" stroke-width="1.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            </div>
        `;
    } else if (type === 'farm') {
        innerHTML = `
            <div class="marker-icon farm-icon shadow-lg">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#22c55e" stroke="white" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            </div>
        `;
    } else if (type === 'vet') {
        innerHTML = `
            <div class="marker-icon vet-icon shadow-lg">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#ef4444" stroke="white" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
        `;
    } else if (type === 'market') {
        innerHTML = `
            <div class="marker-icon market-icon shadow-lg">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#f59e0b" stroke="white" stroke-width="1.5">
                    <path d="M12 2a4 4 0 0 0-4 4v1h8V6a4 4 0 0 0-4-4zM6 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8H6zm4 4h4v2h-4v-2z" />
                </svg>
            </div>
        `;
    } else if (type === 'search') {
        innerHTML = `
            <div class="search-marker-ring"></div>
            <div class="search-marker-pin">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="7"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
            </div>
        `;
    }

    el.innerHTML = innerHTML;
    return el;
}

// Helper: Calculate Great-Circle Distance (Haversine Formula)
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default SovereignMap;
