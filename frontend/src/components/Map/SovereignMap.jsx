import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './SovereignMap.css'; // We will create this file

const SovereignMap = ({ 
    farms = [], 
    vets = [], 
    hives = [], 
    markets = [],
    center = [10.1815, 36.8065], 
    zoom = 7, 
    height = "100%",
    userPos = null,
    onMarkerClick = () => {} 
}) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [isStyleLoaded, setIsStyleLoaded] = React.useState(false);
    const [mapStyle, setMapStyle] = React.useState(null);

    useEffect(() => {
        const checkStyleAvailability = async () => {
            const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            
            // LITE MODE / DEV: Skip 503-inducing checks and use OSM directly
            if (isLocalDev) {
                setMapStyle({
                    version: 8,
                    sources: {
                        'osm': {
                            type: 'raster',
                            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                            tileSize: 256,
                            attribution: '&copy; OpenStreetMap'
                        }
                    },
                    layers: [{ id: 'osm-layer', type: 'raster', source: 'osm' }]
                });
                return;
            }

            try {
                // Enterprise / Docker Mode: Attempt local GIS tiles
                const response = await fetch('/map-tiles/styles/basic/style.json', { method: 'HEAD' });
                if (response.ok) {
                    setMapStyle('/map-tiles/styles/basic/style.json');
                } else {
                    throw new Error('Local tiles offline');
                }
            } catch (err) {
                // Background Fallback
                setMapStyle({
                    version: 8,
                    sources: {
                        'osm': {
                            type: 'raster',
                            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                            tileSize: 256,
                            attribution: '&copy; OpenStreetMap'
                        }
                    },
                    layers: [{ id: 'osm-layer', type: 'raster', source: 'osm' }]
                });
            }
        };
        checkStyleAvailability();
    }, []);

    useEffect(() => {
        if (map.current || !mapStyle) return; // Initialize only once style is determined

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: mapStyle,
            center: center,
            zoom: zoom,
            antialias: true,
            failIfMajorPerformanceCaveat: false,
            transformRequest: (url, resourceType) => {
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

        // Add Navigation Controls (Standard Map Controls)
        map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [mapStyle]);

    // Camera Sync Logic: Fly-to when center/zoom props change
    useEffect(() => {
        if (!map.current || !isStyleLoaded) return;
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
        if (!map.current || !isStyleLoaded) return;

        // Clear existing markers (Basic implementation)
        const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
        existingMarkers.forEach(m => m.remove());

        // Process Hives (Yellow Hexagons)
        hives.forEach(h => {
             const el = createMarkerElement('hive');
             const metrics = h.properties?.metrics || { weight: 0, temperature: 0, humidity: 0 };
             const status = h.properties?.status || 'healthy';
             
             const marker = new maplibregl.Marker({ element: el })
                .setLngLat([h.geometry.coordinates[0], h.geometry.coordinates[1]])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
                    <div class="map-popup premium hive-live">
                        <div class="popup-status-badge ${status}">${status.toUpperCase()}</div>
                        <h3>🐝 ${h.properties?.name || h.name}</h3>
                        <div class="metrics-grid">
                            <div class="m-item"><strong>${metrics.weight}</strong><span>kg</span></div>
                            <div class="m-item"><strong>${metrics.temperature}</strong><span>°C</span></div>
                            <div class="m-item"><strong>${metrics.humidity}</strong><span>%</span></div>
                        </div>
                    </div>
                `))
                .addTo(map.current);
             el.addEventListener('click', () => onMarkerClick(h));
        });

        // Process Vets (Red Shields)
        vets.forEach(v => {
            const coords = v.coords || [v.geometry.coordinates[0], v.geometry.coordinates[1]];
            const el = createMarkerElement('vet');
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([coords[0], coords[1]])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
                    <div class="map-popup premium">
                        <h3>🩺 ${v.properties?.name || v.name}</h3>
                        <p>Clinique Vétérinaire</p>
                    </div>
                `))
                .addTo(map.current);
            el.addEventListener('click', () => onMarkerClick(v));
        });

        // Add Farms (Green Houses)
        farms.forEach(f => {
            const coords = [f.geometry.coordinates[0], f.geometry.coordinates[1]];
            const el = createMarkerElement('farm');
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([coords[0], coords[1]])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
                    <div class="map-popup premium">
                        <h3>🚜 ${f.properties?.name || f.name}</h3>
                        <p>Partenaire Agri-Tech</p>
                    </div>
                `))
                .addTo(map.current);
            el.addEventListener('click', () => onMarkerClick(f));
        });

        // Add Markets (Amber Honey Jars)
        markets.forEach(m => {
            const coords = [m.geometry.coordinates[0], m.geometry.coordinates[1]];
            const el = createMarkerElement('market');
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([coords[0], coords[1]])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
                    <div class="map-popup premium market-popup">
                        <div class="popup-type-tag">BIER MARKT</div>
                        <h3>🍯 ${m.properties?.name || m.name}</h3>
                        <p>${m.properties?.address || "Haddad Expert Partner"}</p>
                    </div>
                `))
                .addTo(map.current);
            el.addEventListener('click', () => onMarkerClick(m));
        });

        // User Position (Pulsating Blue Navigation)
        if (userPos) {
             const el = createMarkerElement('user');
             new maplibregl.Marker({ element: el })
                .setLngLat([userPos[1], userPos[0]])
                .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(`
                    <div style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 8px; font-weight: 800; font-size: 11px;">
                        📍 VOUS ÊTES ICI
                    </div>
                `))
                .addTo(map.current);
             
             // Open popup by default so user sees clearly where they are
             const startPopup = new maplibregl.Popup({ offset: 15, closeButton: false })
                .setLngLat([userPos[1], userPos[0]])
                .setHTML('<div style="color: #3b82f6; font-weight: 900; font-size: 10px; text-transform: uppercase;">Moi</div>')
                .addTo(map.current);
             
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
    }, [farms, vets, hives, markets, userPos, center, isStyleLoaded]);

    return (
        <div style={{ position: 'relative', width: '100%', height: height }}>
            <div ref={mapContainer} style={{ width: '100%', height: '100%', borderRadius: '24px' }} />
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
function createMarkerElement(type) {
    const el = document.createElement('div');
    el.className = `custom-marker marker-${type}`;
    
    let innerHTML = '';
    if (type === 'user') {
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
    }
    
    el.innerHTML = innerHTML;
    return el;
}

export default SovereignMap;
