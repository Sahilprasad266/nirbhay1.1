import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const createIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const sourceIcon = createIcon('#4F6AF6');
const destIcon = createIcon('#22C55E');

// Heatmap layer component
const HeatmapLayer = ({ points }) => {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Dynamic import of leaflet.heat
    import('leaflet.heat').then(() => {
      // Remove existing heatmap layer
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }

      // Create gradient colors for danger zones
      const gradient = {
        0.0: 'rgba(34, 197, 94, 0.0)',   // Transparent green
        0.2: 'rgba(34, 197, 94, 0.4)',   // Green (safe)
        0.4: 'rgba(250, 204, 21, 0.5)',  // Yellow (moderate)
        0.6: 'rgba(245, 158, 11, 0.6)',  // Orange
        0.8: 'rgba(239, 68, 68, 0.7)',   // Red (danger)
        1.0: 'rgba(220, 38, 38, 0.8)',   // Dark red
      };

      // Create heat layer
      heatLayerRef.current = L.heatLayer(points, {
        radius: 35,
        blur: 25,
        maxZoom: 15,
        max: 1.0,
        gradient: gradient,
      }).addTo(map);
    });

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map, points]);

  return null;
};

// Route line component
const RouteLine = ({ coordinates, safetyLevel }) => {
  if (!coordinates || coordinates.length === 0) return null;

  // Convert [lng, lat] to [lat, lng] for Leaflet
  const positions = coordinates.map(coord => [coord[1], coord[0]]);

  const colorMap = {
    safe: '#22C55E',
    moderate: '#F59E0B',
    danger: '#EF4444',
  };

  const color = colorMap[safetyLevel] || '#4F6AF6';

  return (
    <>
      {/* Shadow line */}
      <Polyline
        positions={positions}
        color="#000"
        weight={8}
        opacity={0.2}
      />
      {/* Main line */}
      <Polyline
        positions={positions}
        color={color}
        weight={5}
        opacity={0.9}
        lineCap="round"
        lineJoin="round"
      />
    </>
  );
};

// Map center updater
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
    }
  }, [map, center, zoom]);
  
  return null;
};

const MapView = ({ 
  heatmapPoints, 
  source, 
  destination, 
  route,
  onMapClick,
  center,
  zoom = 12,
}) => {
  const defaultCenter = [22.5726, 88.3639]; // Kolkata

  const handleMapClick = (e) => {
    if (onMapClick) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  };

  return (
    <MapContainer
      center={center || defaultCenter}
      zoom={zoom}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
    >
      {/* Minimalist map tiles - CartoDB Positron */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      />

      {/* Heatmap overlay */}
      {heatmapPoints && heatmapPoints.length > 0 && (
        <HeatmapLayer points={heatmapPoints} />
      )}

      {/* Route polyline */}
      {route && route.geometry && (
        <RouteLine 
          coordinates={route.geometry} 
          safetyLevel={route.safety_level}
        />
      )}

      {/* Source marker */}
      {source && (
        <Marker position={[source.lat, source.lng]} icon={sourceIcon}>
          <Popup>
            <span className="font-medium">Start Point</span>
          </Popup>
        </Marker>
      )}

      {/* Destination marker */}
      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
          <Popup>
            <span className="font-medium">Destination</span>
          </Popup>
        </Marker>
      )}

      {/* Map center updater */}
      {center && <MapUpdater center={center} zoom={zoom} />}
    </MapContainer>
  );
};

export default MapView;
