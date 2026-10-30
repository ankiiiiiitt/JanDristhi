import React, { useState } from 'react';
import { X, Upload, Camera, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { uploadObservation } from '../services/api';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [vehicleId, setVehicleId] = useState("CTU-BUS-104");
  const [latitude, setLatitude] = useState("30.7408");
  const [longitude, setLongitude] = useState("76.7825");
  const [speed, setSpeed] = useState("34.5");
  const [zShock, setZShock] = useState("3.8");
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
      formData.append('file', file);
    } else {
      // Create empty dummy blob if no file picked for testing
      const dummyBlob = new Blob(["dummy_image_payload"], { type: "image/jpeg" });
      formData.append('file', dummyBlob, "field_capture.jpg");
    }

    formData.append('vehicle_id', vehicleId);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('speed_kmph', speed);
    formData.append('telemetry_z_shock', zShock);

    try {
      const res = await uploadObservation(formData);
      setResult(res.data);
      if (onUploadSuccess) onUploadSuccess(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center space-x-2">
            <Camera className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-slate-100">Vehicle Telemetry & Hazard Ingest</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Image Upload Zone */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Road Surface Image Frame</label>
            <div className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-950/50">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {preview ? (
                <div className="flex flex-col items-center">
                  <img src={preview} alt="Road Preview" className="h-32 object-cover rounded-lg mb-2" />
                  <span className="text-xs text-emerald-400 font-medium">Click to replace photo</span>
                </div>
              ) : (
                <div className="flex flex-col items-center py-2 text-slate-400">
                  <Upload className="h-7 w-7 text-slate-500 mb-1" />
                  <span className="text-xs font-medium text-slate-200">Drag & drop or click to upload road photo</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">JPEG / PNG from dashcam or phone</span>
                </div>
              )}
            </div>
          </div>

          {/* Telemetry Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Vehicle ID</label>
              <input
                type="text"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Speed (km/h)</label>
              <input
                type="number"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Accelerometer Z-Shock (m/s²) – Pothole Vibration Spike
              </label>
              <input
                type="number"
                step="0.1"
                value={zShock}
                onChange={(e) => setZShock(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Result Alert & AI Detection Display */}
          {result && (
            <div className="p-3.5 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-emerald-400 font-semibold border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>AI Detection & GPS Snapping Succeeded</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                  {result.observation_id}
                </span>
              </div>

              {/* Annotated Image & BBox View */}
              {(result.annotated_image_url || result.image_url) && (
                <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 px-2 py-1 bg-slate-800/80 flex justify-between">
                    <span>Annotated Road Damage Frame</span>
                    <span className="text-emerald-400">RDD2022 Verified</span>
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
                <span className="text-[11px] font-semibold text-slate-300">Detected Anomalies:</span>
                {(result.detections || []).map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 text-[11px]">
                    <div>
                      <span className="font-bold text-white">{d.class_id}: {d.class_name}</span>
                      <span className="text-slate-400 ml-2">Conf: {Math.round(d.confidence * 100)}%</span>
                      <span className="text-slate-400 ml-2">Area: {d.estimated_area_sqm} m²</span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      BBox: [{d.bbox?.join(', ')}]
                    </div>
                  </div>
                ))}
              </div>

              {/* GPS Snapping Info */}
              <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Snapped Road Segment:</span>
                  <b className="text-emerald-300">{result.matched_road_name || result.linked_segment_id}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sector:</span>
                  <span className="text-slate-200">{result.sector || "Chandigarh"}</span>
                </div>
                {result.snapping_distance_meters != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Distance from Road Axis:</span>
                    <span className="font-mono text-emerald-400">{result.snapping_distance_meters} m (Snapped)</span>
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
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs shadow-md transition-all disabled:opacity-50"
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

