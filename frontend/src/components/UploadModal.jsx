import React, { useState } from 'react';
import { X, Upload, Camera, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { uploadObservation } from '../services/api';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [vehicleId, setVehicleId] = useState('VEH-CHD-09');
  const [speed, setSpeed] = useState(38.5);
  const [latitude, setLatitude] = useState(30.7412);
  const [longitude, setLongitude] = useState(76.7831);
  const [zShock, setZShock] = useState(3.4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    if (file) {
      formData.append('image', file);
    }
    formData.append('vehicle_id', vehicleId);
    formData.append('speed', speed);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('z_shock', zShock);

    try {
      const res = await uploadObservation(formData);
      setResult(res.data);
      if (onUploadSuccess) {
        onUploadSuccess(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-[#f0f7f4]">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-[#145547] text-white shadow-xs">
              <Camera className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Vehicle Telemetry & Hazard Ingest</h3>
              <p className="text-[11px] text-slate-500">Live AI Detection & GIS Axis Snapping</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Image Upload Zone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Road Surface Image Frame
            </label>
            <div className="relative border-2 border-dashed border-emerald-300 hover:border-[#145547] rounded-2xl p-4 text-center cursor-pointer transition-all bg-[#f0f7f4]/50 group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {preview ? (
                <div className="flex flex-col items-center">
                  <img src={preview} alt="Road Preview" className="h-32 object-cover rounded-xl mb-2 shadow-xs border border-emerald-200" />
                  <span className="text-xs text-[#145547] font-bold">Click to replace photo</span>
                </div>
              ) : (
                <div className="flex flex-col items-center py-2 text-slate-500">
                  <Upload className="h-8 w-8 text-[#145547] mb-1.5 transition-transform group-hover:-translate-y-0.5" />
                  <span className="text-xs font-bold text-slate-800">Drag & drop or click to upload road photo</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">JPEG / PNG from dashcam or mobile inspection</span>
                </div>
              )}
            </div>
          </div>

          {/* Telemetry Inputs */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Vehicle ID</label>
              <input
                type="text"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Speed (km/h)</label>
              <input
                type="number"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Accelerometer Z-Shock (m/s²) – Pothole Vibration Spike
              </label>
              <input
                type="number"
                step="0.1"
                value={zShock}
                onChange={(e) => setZShock(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
              />
            </div>
          </div>

          {/* Result Alert & AI Detection Display */}
          {result && (
            <div className="p-4 bg-[#f0f7f4] border border-emerald-200/90 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between text-[#145547] font-bold border-b border-emerald-200/60 pb-2">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>AI Detection & GPS Snapping Succeeded</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white border border-emerald-200 font-bold text-[#145547]">
                  {result.observation_id}
                </span>
              </div>

              {/* Annotated Image & BBox View */}
              {(result.annotated_image_url || result.image_url) && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-500 px-3 py-1.5 bg-slate-50 flex justify-between border-b border-slate-100">
                    <span>Annotated Road Damage Frame</span>
                    <span className="text-[#145547] font-bold">RDD2022 Verified</span>
                  </div>
                  <img
                    src={result.annotated_image_url || result.image_url}
                    alt="Annotated Road Detection"
                    className="w-full max-h-48 object-cover"
                  />
                </div>
              )}

              {/* Detected Classes Table */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700">Detected Anomalies:</span>
                {(result.detections || []).map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 text-[11px] shadow-xs">
                    <div>
                      <span className="font-bold text-slate-900">{d.class_id}: {d.class_name}</span>
                      <span className="text-slate-500 ml-2 font-medium">Conf: {Math.round(d.confidence * 100)}%</span>
                      <span className="text-slate-500 ml-2 font-medium">Area: {d.estimated_area_sqm} m²</span>
                    </div>
                    <div className="font-mono text-[10px] text-[#145547] font-bold">
                      BBox: [{d.bbox?.join(', ')}]
                    </div>
                  </div>
                ))}
              </div>

              {/* GPS Snapping Info */}
              <div className="p-3 rounded-xl bg-white border border-emerald-200/80 text-[11px] text-slate-600 space-y-1 shadow-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Snapped Road Segment:</span>
                  <b className="text-[#145547]">{result.matched_road_name || result.linked_segment_id}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sector:</span>
                  <span className="text-slate-800 font-semibold">{result.sector || "Chandigarh"}</span>
                </div>
                {result.snapping_distance_meters != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Distance from Road Axis:</span>
                    <span className="font-mono text-[#145547] font-bold">{result.snapping_distance_meters} m (Snapped)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-1.5 bg-[#145547] hover:bg-[#0d4339] text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-950/15 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{loading ? "Processing AI Detection..." : "Submit Observation"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
