import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HiOutlineMapPin } from 'react-icons/hi2';

interface MapLocationPickerProps {
    lat: number | null;
    lng: number | null;
    onChange: (lat: number, lng: number) => void;
}

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({ lat, lng, onChange }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [mapError, setMapError] = useState<string | null>(null);

    // Initial center (Mérida as default if none provided)
    const initialLat = lat ?? 20.9676;
    const initialLng = lng ?? -89.5926;

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Initialize map
        const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 14);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // Custom icon
        const customIcon = L.divIcon({
            className: 'custom-picker-marker',
            html: `
                <div style="
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 4px rgba(59, 130, 246, 0.3);
                    border: 2px solid white;
                    font-size: 20px;
                ">
                    <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"></path></svg>
                </div>
                <div style="
                    width: 2px;
                    height: 12px;
                    background: #2563eb;
                    margin: 0 auto;
                "></div>
                <div style="
                    width: 8px;
                    height: 4px;
                    background: rgba(0,0,0,0.4);
                    border-radius: 50%;
                    margin: 0 auto;
                    filter: blur(1px);
                "></div>
            `,
            iconSize: [40, 56],
            iconAnchor: [20, 56],
            popupAnchor: [0, -56]
        });

        // Add marker
        const marker = L.marker([initialLat, initialLng], {
            icon: customIcon,
            draggable: true
        }).addTo(map);

        markerRef.current = marker;

        // Handle marker drag
        marker.on('dragend', (e) => {
            const position = e.target.getLatLng();
            onChange(position.lat, position.lng);
        });

        // Handle map click
        map.on('click', (e: L.LeafletMouseEvent) => {
            const position = e.latlng;
            marker.setLatLng(position);
            onChange(position.lat, position.lng);
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setMapError("Geolocalización no soportada por el navegador");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                if (mapInstanceRef.current && markerRef.current) {
                    mapInstanceRef.current.setView([latitude, longitude], 17);
                    markerRef.current.setLatLng([latitude, longitude]);
                    onChange(latitude, longitude);
                }
            },
            (err) => {
                setMapError("Error obteniendo ubicación. Asegúrate de dar permisos.");
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Arrastra el pin o haz clic en el mapa para ajustar</span>
                <button 
                    type="button" 
                    onClick={getCurrentLocation}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '6px', 
                        background: '#f1f5f9', border: '1px solid #cbd5e1', 
                        padding: '6px 12px', borderRadius: '8px', 
                        color: '#0f172a', fontSize: '13px', fontWeight: 'bold', 
                        cursor: 'pointer' 
                    }}
                >
                    <HiOutlineMapPin size={16} /> Usar mi ubicación actual
                </button>
            </div>
            
            {mapError && <div style={{ color: '#ef4444', fontSize: '12px' }}>{mapError}</div>}
            
            <div 
                ref={mapContainerRef} 
                style={{ width: '100%', height: '300px', borderRadius: '12px', zIndex: 1, border: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }} 
            />
            
            <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                <div><strong>Latitud:</strong> {lat ? lat.toFixed(6) : 'No definida'}</div>
                <div><strong>Longitud:</strong> {lng ? lng.toFixed(6) : 'No definida'}</div>
            </div>
        </div>
    );
};

export default MapLocationPicker;
