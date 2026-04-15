import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// Component to handle map centering and programmatic interactions
function MapController({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, zoom || 13);
    }, [center, zoom, map]);
    return null;
}

const SmartMap = ({ farms = [], vets = [], center = [36.8065, 10.1815], zoom = 7, height = "500px" }) => {
    return (
        <div style={{ height, width: '100%', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
            <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                
                <MapController center={center} zoom={zoom} />

                {/* Farms */}
                {farms.map(farm => (
                    <Marker 
                        key={`farm-${farm.id}`} 
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
                        key={`vet-${vet.id}`} 
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
            </MapContainer>
        </div>
    );
};

export default SmartMap;
