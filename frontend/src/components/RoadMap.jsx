import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Layers, Compass, Crosshair, MapPin } from 'lucide-react';

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Create custom pulsating blue marker for user's real location
const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'leaflet-user-location-marker',
    html: `
      <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
        <span style="position:absolute;width:28px;height:28px;border-radius:50%;background:#3b82f6;opacity:0.35;animation:pulse 1.8s infinite ease-in-out;"></span>
        <span style="position:absolute;width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #ffffff;box-shadow:0 0 10px rgba(37,99,235,0.8);"></span>
        <span style="position:absolute;width:6px;height:6px;border-radius:50%;background:#ffffff;"></span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

export default function RoadMap({
  geojson,
  observations,
  onSelectSegment,
  height = '520px',
  userLocation: propUserLocation = null,
  autoLocate = true
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geojsonLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userMarkerLayerRef = useRef(null);
  const tileLayerRef = useRef(null);

  const [mapType, setMapType] = useState('street'); // 'street' | 'satellite'
  const [liveLocation, setLiveLocation] = useState(propUserLocation || null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initial center: if live location is already available use it, else default to Chandigarh
    const initialCoords = (propUserLocation && propUserLocation.lat && propUserLocation.lng)
      ? [propUserLocation.lat, propUserLocation.lng]
      : [30.7333, 76.7794];
    const initialZoom = (propUserLocation && propUserLocation.lat && propUserLocation.lng) ? 15 : 13;

    const map = L.map(mapContainerRef.current, {
      center: initialCoords,
      zoom: initialZoom,
      zoomControl: false, // will use custom or repositioned control
      preferCanvas: true
    });

    // Add zoom control at bottom-right so it doesn't overlap header
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // OpenStreetMap Standard Raster Tiles (World-wide real map coverage)
    const streetTile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 3,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      crossOrigin: true
    }).addTo(map);
    tileLayerRef.current = streetTile;

    // GeoJSON Layer
    geojsonLayerRef.current = L.geoJSON(null, {
      style: (feature) => {
        const color = feature?.properties?.color || '#10b981';
        return {
          color: color,
          weight: 6,
          opacity: 0.88,
          lineCap: 'round',
          lineJoin: 'round'
        };
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};
        const statusBadge = p.health_score < 50
          ? '<span style="background:#ef4444;color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">CRITICAL</span>'
          : p.health_score < 75
          ? '<span style="background:#f59e0b;color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">FAIR</span>'
          : '<span style="background:#10b981;color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">GOOD</span>';

        const popupContent = `
          <div style="font-family:system-ui;min-width:220px;padding:2px;color:#f8fafc;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <b style="font-size:13px;color:#f8fafc;">${p.name || 'Road Segment'}</b>
            </div>
            <div style="margin-bottom:8px;">${statusBadge}</div>
            <p style="margin:3px 0;font-size:12px;color:#cbd5e1;">Health Score: <b style="color:#f8fafc;">${p.health_score || 80} / 100</b></p>
            <p style="margin:3px 0;font-size:12px;color:#cbd5e1;">Segment Length: <b style="color:#f8fafc;">${p.length_meters || 500} m</b></p>
            <p style="margin:3px 0;font-size:12px;color:#cbd5e1;">Active Hazards: <b style="color:#f87171;">${p.hazard_count || 0} detected</b></p>
            <p style="margin:3px 0;font-size:11px;color:#94a3b8;">Sector / Zone: <b>${p.area_name || p.ward_id || 'Chandigarh'}</b></p>
          </div>
        `;
        layer.bindPopup(popupContent);
        layer.on('click', () => {
          if (onSelectSegment) onSelectSegment(p);
        });
      }
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    userMarkerLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Invalidate size on load
    const triggerInvalidate = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    const timer1 = setTimeout(triggerInvalidate, 80);
    const timer2 = setTimeout(triggerInvalidate, 300);
    const timer3 = setTimeout(triggerInvalidate, 800);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => triggerInvalidate());
      resizeObserver.observe(mapContainerRef.current);
    }

    const handleWindowResize = () => triggerInvalidate();
    window.addEventListener('resize', handleWindowResize);

    // Auto-locate user on mount if requested
    if (autoLocate && !propUserLocation && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy || 15;
          setLiveLocation({ lat, lng, accuracy });
        },
        () => {
          // silently keep Chandigarh fallback
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync propUserLocation into state
  useEffect(() => {
    if (propUserLocation && propUserLocation.lat && propUserLocation.lng) {
      setLiveLocation(propUserLocation);
    }
  }, [propUserLocation]);

  // Update User Live Location Marker on Map
  useEffect(() => {
    if (!userMarkerLayerRef.current || !mapInstanceRef.current || !liveLocation?.lat || !liveLocation?.lng) return;

    userMarkerLayerRef.current.clearLayers();

    const { lat, lng, accuracy = 20, city } = liveLocation;

    // Accuracy Circle
    const accuracyCircle = L.circle([lat, lng], {
      radius: Math.min(accuracy, 120),
      color: '#3b82f6',
      fillColor: '#60a5fa',
      fillOpacity: 0.16,
      weight: 1
    });

    // Pulsing Marker
    const userMarker = L.marker([lat, lng], {
      icon: createUserLocationIcon(),
      zIndexOffset: 1000
    });

    const popupHtml = `
      <div style="font-family:system-ui;min-width:180px;padding:3px;color:#0f172a;">
        <div style="font-weight:700;font-size:12px;color:#1e40af;margin-bottom:2px;display:flex;align-items:center;gap:4px;">
          <span>📍</span> <span>Your Real Location</span>
        </div>
        <p style="margin:2px 0;font-size:11px;color:#334155;"><b>${city || 'Real GPS Coordinates'}</b></p>
        <p style="margin:2px 0;font-size:11px;color:#475569;">Lat: <b>${lat.toFixed(5)}</b>, Lng: <b>${lng.toFixed(5)}</b></p>
        <p style="margin:2px 0;font-size:10px;color:#64748b;">GPS Accuracy: ±${Math.round(accuracy)}m</p>
      </div>
    `;
    userMarker.bindPopup(popupHtml);

    userMarkerLayerRef.current.addLayer(accuracyCircle);
    userMarkerLayerRef.current.addLayer(userMarker);
  }, [liveLocation]);

  // Handle Switch Map Layer (Street vs Satellite)
  const handleToggleMapType = (type) => {
    setMapType(type);
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    if (type === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics'
        }
      ).addTo(mapInstanceRef.current);
    } else {
      tileLayerRef.current = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          minZoom: 3,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
      ).addTo(mapInstanceRef.current);
    }
  };

  // Update GeoJSON Layers
  useEffect(() => {
    if (geojsonLayerRef.current && geojson && mapInstanceRef.current) {
      geojsonLayerRef.current.clearLayers();
      geojsonLayerRef.current.addData(geojson);

      // Only auto-fit bounds if we don't have a user location active
      if (!liveLocation && geojson.features && geojson.features.length > 0) {
        try {
          const bounds = geojsonLayerRef.current.getBounds();
          if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
          }
        } catch (e) {
          // ignore
        }
      }
      mapInstanceRef.current.invalidateSize();
    }
  }, [geojson, liveLocation]);

  // Update Hazard Observation Markers
  useEffect(() => {
    if (markersLayerRef.current && observations) {
      markersLayerRef.current.clearLayers();

      observations.forEach((obs) => {
        const coords = obs.location?.coordinates;
        if (!coords || coords.length < 2) return;
        const [lng, lat] = coords;

        const firstDet = obs.detections?.[0] || {};
        const isCritical = firstDet.severity === 'critical';

        const customMarker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: isCritical ? '#ef4444' : '#f59e0b',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        });

        const popupContent = `
          <div style="font-family:system-ui;min-width:210px;padding:2px;color:#f8fafc;">
            <div style="font-weight:bold;font-size:13px;color:#f8fafc;margin-bottom:4px;">
              ${firstDet.class_name || 'Road Hazard'}
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">
              Observation ID: ${obs.observation_id}
            </div>
            ${obs.image_url ? `<img src="${obs.image_url}" alt="Hazard" style="width:100%;height:100px;object-fit:cover;border-radius:6px;margin-bottom:6px;" onerror="this.onerror=null;this.src='/images/roads/road_pothole_d00.jpg';" />` : ''}
            <p style="margin:3px 0;font-size:11px;color:#cbd5e1;">Severity: <b style="color:${isCritical ? '#ef4444' : '#f59e0b'}">${(firstDet.severity || 'Medium').toUpperCase()}</b></p>
            <p style="margin:3px 0;font-size:11px;color:#cbd5e1;">Vehicle Z-Shock: <b>${obs.telemetry_z_shock || 0} m/s²</b></p>
            <p style="margin:3px 0;font-size:11px;color:#cbd5e1;">Confidence: <b>${Math.round((firstDet.confidence || 0.85) * 100)}%</b></p>
          </div>
        `;
        customMarker.bindPopup(popupContent);
        markersLayerRef.current.addLayer(customMarker);
      });
    }
  }, [observations]);

  // Request & Fly to Real Device GPS Location
  const handleLocateMe = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy || 10;

        setLiveLocation({ lat, lng, accuracy });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16, {
            duration: 1.2,
            easeLinearity: 0.25
          });
        }

        // Reverse geocode to get locality or city
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then((res) => res.json())
          .then((data) => {
            const city = data.address?.city || data.address?.town || data.address?.suburb || data.address?.state_district || 'My Location';
            setLiveLocation((prev) => ({ ...prev, city }));
          })
          .catch(() => {});
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        setLocationError(err.message || 'Could not fetch device GPS location.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  const handleZoomSector = (coords, zoom = 15) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(coords, zoom, { duration: 1.0 });
    }
  };

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950 w-full"
      style={{ height, minHeight: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* Top Filter Bar: Quick Locations */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-1.5 max-w-[calc(100%-80px)]">
        {/* Real Location Button */}
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all ${
            liveLocation
              ? 'bg-blue-600 text-white shadow-blue-500/25 border border-blue-400'
              : 'bg-slate-900/90 hover:bg-slate-800 text-blue-400 border border-blue-500/40 backdrop-blur'
          }`}
          title="Click to center map at your real physical location"
        >
          <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Locating...' : '📍 My Real Location'}</span>
        </button>

        {/* Demo Sectors Quick-Nav */}
        <div className="hidden sm:flex items-center space-x-1 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg p-1 text-xs">
          {[
            { label: "Chandigarh", coords: [30.7333, 76.7794], zoom: 13 },
            { label: "Sector 17", coords: [30.7408, 76.7825], zoom: 15 },
            { label: "Sector 22", coords: [30.7305, 76.7720], zoom: 15 }
          ].map((sec, idx) => (
            <button
              key={idx}
              onClick={() => handleZoomSector(sec.coords, sec.zoom)}
              className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Controls (Top Right: Map / Satellite & Locate Pin) */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col space-y-1.5 items-end">
        {/* Satellite vs Street Toggle */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg p-0.5 shadow-lg flex items-center space-x-0.5 text-[11px]">
          <button
            onClick={() => handleToggleMapType('street')}
            className={`px-2 py-1 rounded font-medium transition-all ${
              mapType === 'street'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => handleToggleMapType('satellite')}
            className={`px-2 py-1 rounded font-medium transition-all ${
              mapType === 'satellite'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Satellite
          </button>
        </div>

        {/* Floating Quick GPS Re-center Button */}
        <button
          onClick={handleLocateMe}
          className="w-8 h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-slate-700/80 flex items-center justify-center shadow-lg transition-transform active:scale-95"
          title="Center on my location"
        >
          <Compass className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Live Coordinates Pill at Bottom Left */}
      {liveLocation && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 flex items-center space-x-1.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
          <span>
            <b>Live GPS:</b> {liveLocation.lat.toFixed(4)}°, {liveLocation.lng.toFixed(4)}°
            {liveLocation.city ? ` (${liveLocation.city})` : ''}
          </span>
        </div>
      )}

      {/* Error Toast */}
      {locationError && (
        <div className="absolute bottom-12 left-3 right-3 z-[1000] bg-rose-950/90 border border-rose-700 text-rose-200 text-xs px-3 py-1.5 rounded-lg shadow-lg">
          {locationError}
        </div>
      )}

      {/* Leaflet Map Div */}
      <div
        ref={mapContainerRef}
        className="w-full h-full z-0"
        style={{ width: '100%', height: '100%', minHeight: '100%' }}
      />
    </div>
  );
}
