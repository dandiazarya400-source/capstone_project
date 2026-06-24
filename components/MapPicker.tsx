"use client";

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 🌟 FIX: Ikon bawaan Leaflet
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapPickerProps {
  onLocationSelect: (address: string) => void;
}

// 🌟 Sub-komponen penangkap klik (Radar Peta)
const LocationMarker = ({ onLocationSelect }: MapPickerProps) => {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  useMapEvents({
    async click(e) {
      setPosition(e.latlng);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`);
        const data = await response.json();
        if (data && data.display_name) {
          onLocationSelect(data.display_name);
        }
      } catch (error) {
        console.error("Gagal mendeteksi alamat:", error);
      }
    },
  });

  return position === null ? null : <Marker position={position} icon={customIcon} />;
};

const MapPicker = ({ onLocationSelect }: MapPickerProps) => {
  // 🌟 STATE BARU: Untuk mengontrol apakah peta digembok atau bebas
  const [isLocked, setIsLocked] = useState(true);

  // Koordinat Batas Singkawang
  const singkawangBounds = L.latLngBounds(
    [0.75, 108.80],
    [1.05, 109.15]
  );

  return (
    <div className="h-[250px] w-full rounded-2xl overflow-hidden border border-primary/20 relative shadow-inner">
      
      {/* 🌟 TOMBOL SAKTI: Mengganti mode peta (Z-index 400 agar di atas peta Leaflet) */}
      <button
        type="button"
        onClick={() => setIsLocked(!isLocked)}
        className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md text-[10px] font-bold flex items-center gap-1.5 border hover:bg-white transition-all cursor-pointer"
        title="Ganti mode jangkauan peta"
      >
        {isLocked ? (
          <><span className="text-rose-500">🔒</span> <span className="text-slate-700">Singkawang</span></>
        ) : (
          <><span className="text-blue-500">🌍</span> <span className="text-slate-700">Global</span></>
        )}
      </button>

      {/* 🌟 KEY=isLocked MEMAKSA PETA REFRESH SAAT MODE DIGANTI */}
      <MapContainer 
        key={isLocked ? 'locked' : 'global'} 
        center={[0.9064, 108.9841]} 
        zoom={13} 
        minZoom={isLocked ? 11 : 3} // Kunci zoom out jika dilock
        maxBounds={isLocked ? singkawangBounds : undefined} // Kunci batas wilayah jika dilock
        style={{ height: '100%', width: '100%', zIndex: 1 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <LocationMarker onLocationSelect={onLocationSelect} />
      </MapContainer>
    </div>
  );
};

export default MapPicker;