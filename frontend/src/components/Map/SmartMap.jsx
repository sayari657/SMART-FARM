import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, Minus } from 'lucide-react';

function CustomZoomControls() {
    const map = useMap();
    return (
        <div style={{ 
            position: 'absolute', bottom: 30, right: 30, zIndex: 1000, 
            display: 'flex', flexDirection: 'column', gap: 2,
            background: 'white', borderRadius: '12px', padding: 4,
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.05)'
        }}>
            <button 
                onClick={() => map.zoomIn()}
                style={{ width: 44, height: 44, borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                className="hover-bg-light"
            >
                <Plus size={20} color="#1e293b" />
            </button>
            <div style={{ height: 1, background: '#f1f5f9', width: '70%', alignSelf: 'center' }} />
            <button 
                onClick={() => map.zoomOut()}
                style={{ width: 44, height: 44, borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                className="hover-bg-light"
            >
                <Minus size={20} color="#1e293b" />
            </button>
        </div>
    );
}

// Fix for default marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons for different entities
const farmIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const vetIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const searchIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const beehiveIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to handle map centering and programmatic interactions
function MapController({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom || 13, {
                animate: true,
                duration: 1.5
            });
        }
    }, [center, zoom, map]);
    return null;
}

const SmartMap = ({ farms = [], vets = [], hives = [], center = [36.8065, 10.1815], zoom = 7, height = "500px", userPos = null }) => {
    return (
        <div style={{ height, width: '100%', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)', position: 'relative' }}>
            <MapContainer 
                center={center} 
                zoom={zoom} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                
                <MapController center={center} zoom={zoom} />
                <CustomZoomControls />

                {/* Proximity Circle (100km) */}
                {userPos && (
                    <Circle 
                        center={userPos} 
                        radius={100000} 
                        pathOptions={{ 
                            fillColor: '#7c3aed', 
                            fillOpacity: 0.05, 
                            color: '#7c3aed', 
                            weight: 1, 
                            dashArray: '10, 10' 
                        }} 
                    />
                )}

                {/* User Position */}
                {userPos && (
                    <Marker position={userPos} icon={userIcon}>
                        <Popup>Ma position actuelle</Popup>
                    </Marker>
                )}

                {/* Hives (Real Data) */}
                {hives.map(hive => (
                    <Marker 
                        key={`hive-${hive.id}`} 
                        position={[hive.lat, hive.lng]}
                        icon={beehiveIcon}
                    >
                        <Popup className="glass-popup">
                            <div style={{ padding: '5px' }}>
                                <h3 style={{ margin: '0 0 5px 0', color: '#d97706' }}>🍯 Ruche: {hive.nom}</h3>
                                <p style={{ margin: 0, fontSize: '11px' }}>Fleur: {hive.typeFleur}</p>
                                <p style={{ margin: 0, fontSize: '11px' }}>Saison: {hive.saison}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Farms */}
                {farms.map(farm => (
                    <Marker 
                        key={`farm-${farm.properties.id}`} 
                        position={[farm.geometry.coordinates[1], farm.geometry.coordinates[0]]}
                        icon={farmIcon}
                    >
                        <Popup className="glass-popup">
                            <div style={{ padding: '5px' }}>
                                <h3 style={{ margin: '0 0 5px 0', color: 'var(--color-primary)' }}>{farm.properties.name}</h3>
                                <p style={{ margin: 0, fontSize: '12px' }}>Status: <strong>{farm.properties.status}</strong></p>
                                <a href={`/farms/${farm.properties.id}`} style={{ display: 'inline-block', marginTop: '10px', fontSize: '11px', color: '#7c3aed', fontWeight: 600 }}>View Details &rarr;</a>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Veterinarians */}
                {vets.map(vet => (
                    <Marker 
                        key={`vet-${vet.properties.id}`} 
                        position={[vet.geometry.coordinates[1], vet.geometry.coordinates[0]]}
                        icon={vetIcon}
                    >
                        <Popup className="glass-popup">
                            <div style={{ padding: '5px' }}>
                                <h3 style={{ margin: '0 0 5px 0', color: '#dc2626' }}>{vet.properties.name}</h3>
                                <p style={{ margin: '0 0 5px 0', fontSize: '11px', fontStyle: 'italic' }}>{vet.properties.specialty}</p>
                                <p style={{ margin: 0, fontSize: '12px' }}>📞 {vet.properties.phone}</p>
                                <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'gray' }}>{vet.properties.address}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Search Result Marker */}
                {center && !farms.some(f => f.geometry.coordinates[1] === center[0]) && !vets.some(v => v.geometry.coordinates[1] === center[0]) && (
                    <Marker position={center} icon={searchIcon}>
                        <Popup>
                            <div style={{ padding: 5, fontWeight: 600 }}>Cible de recherche</div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
};

export default SmartMap;
