import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function RoadMap({ geojson, observations, onSelectSegment }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geojsonLayerRef = useRef(null);
  const markersLayerRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default to Bangalore coordinates
      const map = L.map(mapContainerRef.current, {
        center: [12.965, 77.62],
        zoom: 13,
        zoomControl: true,
      });

      // Dark / Midnight style CartoDB or OpenStreetMap tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      geojsonLayerRef.current = L.geoJSON(null, {
        style: (feature) => {
          const color = feature?.properties?.color || '#10b981';
          return {
            color: color,
            weight: 6,
            opacity: 0.85,
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
            <div style="font-family:system-ui;min-width:210px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <b style="font-size:13px;color:#f8fafc;">${p.name || 'Road Segment'}</b>
              </div>
              <div style="margin-bottom:8px;">${statusBadge}</div>
              <p style="margin:2px 0;font-size:12px;color:#cbd5e1;">Health Score: <b style="color:#f8fafc;">${p.health_score} / 100</b></p>
              <p style="margin:2px 0;font-size:12px;color:#cbd5e1;">Segment Length: <b style="color:#f8fafc;">${p.length_meters || 500} m</b></p>
              <p style="margin:2px 0;font-size:12px;color:#cbd5e1;">Active Hazards: <b style="color:#f87171;">${p.hazard_count || 0} detected</b></p>
              <p style="margin:2px 0;font-size:11px;color:#94a3b8;">Ward: ${p.ward_id || 'WARD-174'}</p>
            </div>
          `;
          layer.bindPopup(popupContent);
          layer.on('click', () => {
            if (onSelectSegment) onSelectSegment(p);
          });
        }
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup handled on full unmount
    };
  }, []);

  // Update GeoJSON Layers
  useEffect(() => {
    if (geojsonLayerRef.current && geojson) {
      geojsonLayerRef.current.clearLayers();
      geojsonLayerRef.current.addData(geojson);

      // Fit bounds if features exist
      if (geojson.features && geojson.features.length > 0 && mapInstanceRef.current) {
        try {
          const bounds = geojsonLayerRef.current.getBounds();
          if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
          }
        } catch (e) {
          // ignore invalid bounds
        }
      }
    }
  }, [geojson]);

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
          radius: 9,
          fillColor: isCritical ? '#ef4444' : '#f59e0b',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        });

        const popupContent = `
          <div style="font-family:system-ui;min-width:200px;">
            <div style="font-weight:bold;font-size:13px;color:#f8fafc;margin-bottom:4px;">
              ${firstDet.class_name || 'Road Hazard'}
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">
              Telemetry ID: ${obs.observation_id}
            </div>
            ${obs.image_url ? `<img src="${obs.image_url}" alt="Hazard" style="width:100%;height:100px;object-fit:cover;border-radius:6px;margin-bottom:6px;" />` : ''}
            <p style="margin:2px 0;font-size:11px;color:#cbd5e1;">Severity: <b style="color:${isCritical ? '#ef4444' : '#f59e0b'}">${firstDet.severity || 'Medium'}</b></p>
            <p style="margin:2px 0;font-size:11px;color:#cbd5e1;">Vehicle Z-Shock: <b>${obs.telemetry_z_shock || 0} m/s²</b></p>
            <p style="margin:2px 0;font-size:11px;color:#cbd5e1;">Confidence: <b>${Math.round((firstDet.confidence || 0.85) * 100)}%</b></p>
          </div>
        `;
        customMarker.bindPopup(popupContent);
        markersLayerRef.current.addLayer(customMarker);
      });
    }
  }, [observations]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
      {/* Map Header / Legend Bar */}
      <div className="absolute top-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg p-2.5 shadow-lg flex flex-col space-y-1.5 text-xs text-slate-300">
        <span className="font-semibold text-slate-100 text-[11px] uppercase tracking-wider mb-0.5">Road Health Status</span>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/50"></span>
          <span>Good Condition (&gt;75)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm shadow-amber-500/50"></span>
          <span>Moderate / Fair (50 - 75)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-sm shadow-rose-500/50"></span>
          <span>Critical Failure (&lt;50)</span>
        </div>
        <div className="pt-1 mt-1 border-t border-slate-700/60 flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full border border-white bg-rose-500 inline-block"></span>
          <span>Observation Pin (Hazard)</span>
        </div>
      </div>

      <div ref={mapContainerRef} className="w-full h-[540px] z-0" />
    </div>
  );
}
