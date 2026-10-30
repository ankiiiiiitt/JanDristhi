import React, { useState } from 'react';
import { X, Upload, Camera, AlertCircle, CheckCircle2, Loader2, Sparkles, Video } from 'lucide-react';
import { uploadObservation, resolveImageUrl } from '../services/api';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [vehicleId, setVehicleId] = useState('VEH-CHD-09');
  const [speed, setSpeed] = useState(38.5);
  const [latitude, setLatitude] = useState(30.7412);
  const [longitude, setLongitude] = useState(76.7831);
  const [zShock, setZShock] = useState(3.4);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [inspectionSummary, setInspectionSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      const isVid = (selected.type && selected.type.startsWith('video/')) || /\.(mp4|webm|mov|avi)$/i.test(selected.name);
      setIsVideo(isVid);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
      setInspectionSummary(null);
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setProgress(0);
    setResult(null);
    setInspectionSummary(null);
    setErrorMessage(null);

    const formData = new FormData();
    if (file) {
      formData.append('file', file, file.name);
    }
    formData.append('vehicle_id', vehicleId);
    formData.append('speed_kmph', speed);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('telemetry_z_shock', zShock);
    formData.append('report_id', `RPT-${Date.now()}`);

    try {
      const res = await uploadObservation(formData, {
        onProgress: (p) => setProgress(p)
      });
      setResult(res.data);
      if (res.inspection_summary) {
        setInspectionSummary(res.inspection_summary);
      }
      if (onUploadSuccess) {
        onUploadSuccess({
          ...res.data,
          inspection_summary: res.inspection_summary
        });
      }
    } catch (err) {
      console.error('Upload modal error:', err);
      setErrorMessage(err.message || 'Failed to process road footage upload.');
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
          {/* Footage Upload Zone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Road Surface Photo or Recorded Inspection Video
            </label>
            <div className="relative border-2 border-dashed border-emerald-300 hover:border-[#145547] rounded-2xl p-4 text-center cursor-pointer transition-all bg-[#f0f7f4]/50 group">
              <input
                type="file"
                accept="image/*,video/*,.mp4,.webm,.mov,.avi"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {preview ? (
                <div className="flex flex-col items-center">
                  {isVideo ? (
                    <video
                      src={preview}
                      controls
                      playsInline
                      className="h-36 w-full object-cover rounded-xl mb-2 shadow-xs border border-emerald-200 bg-black"
                    />
                  ) : (
                    <img
                      src={preview}
                      alt="Road Preview"
                      className="h-32 object-cover rounded-xl mb-2 shadow-xs border border-emerald-200"
                    />
                  )}
                  <span className="text-xs text-[#145547] font-bold">
                    {isVideo ? '🎥 Road Inspection Video Selected • Click to replace' : '📸 Road Photo Selected • Click to replace'}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center py-2 text-slate-500">
                  <Upload className="h-8 w-8 text-[#145547] mb-1.5 transition-transform group-hover:-translate-y-0.5" />
                  <span className="text-xs font-bold text-slate-800">Drag & drop or click to upload road footage</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">MP4 / WebM video or JPG / PNG from dashcam or phone</span>
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {loading && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>{isVideo ? 'Uploading video & extracting frames with OpenCV...' : 'Uploading road photo & running YOLOv8 detection...'}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-[#145547] transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

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

              {/* Video Inspection Summary if video was processed */}
              {inspectionSummary && (
                <div className="p-3 rounded-xl bg-white border border-emerald-200/90 text-[11px] space-y-1.5 shadow-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-800">Infrastructure Health Score (IHS):</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#145547] border border-emerald-200 font-mono">
                      {inspectionSummary.health_score}/100 ({inspectionSummary.risk_level?.toUpperCase()})
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>OpenCV Frames Analyzed:</span>
                    <span className="font-bold text-slate-900">{inspectionSummary.frames_processed} frames</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Defects Identified:</span>
                    <span className="font-bold text-rose-600">{inspectionSummary.potholes_count} Potholes • {inspectionSummary.cracks_count} Cracks</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    Recommended Action: <strong className="text-slate-800">{inspectionSummary.recommended_action}</strong>
                  </div>
                </div>
              )}

              {/* Annotated Image & BBox View */}
              {(result.annotated_image_url || result.image_url) && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-500 px-3 py-1.5 bg-slate-50 flex justify-between border-b border-slate-100">
                    <span>{inspectionSummary ? "OpenCV Video Keyframe • YOLOv8 Annotation" : "Annotated Road Damage Frame"}</span>
                    <span className="text-[#145547] font-bold">RDD2022 Verified</span>
                  </div>
                  <img
                    src={resolveImageUrl(result.annotated_image_url || result.image_url)}
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
