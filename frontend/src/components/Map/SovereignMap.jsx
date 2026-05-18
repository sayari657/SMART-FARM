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
    userAccuracy = null,
    onMarkerClick = () => { },
    selectedEntity = null
}) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef([]);
    const [isStyleLoaded, setIsStyleLoaded] = React.useState(false);

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
