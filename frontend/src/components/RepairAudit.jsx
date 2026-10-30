import React, { useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, ShieldCheck, Upload, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { verifyRepair } from '../services/api';

export default function RepairAudit({ repairs, onRefresh }) {
  const [verifyingId, setVerifyingId] = useState(null);
  const [auditFeedback, setAuditFeedback] = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});
  const [filePreviews, setFilePreviews] = useState({});

  const handleFileSelect = (repairId, e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFiles(prev => ({ ...prev, [repairId]: file }));
      setFilePreviews(prev => ({ ...prev, [repairId]: URL.createObjectURL(file) }));
    }
  };

  const handleVerify = async (repairId) => {
    setVerifyingId(repairId);
    try {
      const file = selectedFiles[repairId];
      let uploadFile = file;
      if (!uploadFile) {
        // Fallback default sample image blob
        uploadFile = new Blob(["after_photo_bytes"], { type: "image/jpeg" });
      }

      const result = await verifyRepair(repairId, uploadFile);
      setAuditFeedback(prev => ({
        ...prev,
        [repairId]: result
      }));
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error("Verification error:", e);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Municipal Repair Verification Audit (Chandigarh)</h2>
          <p className="text-xs text-slate-400">
            Closed-loop contractor verification comparing pre-repair road hazards with post-resurfacing imagery.
            Repairs are only marked verified when AI confirms structural damage is cleared.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(repairs || []).map((rep) => {
          const feedback = auditFeedback[rep.repair_id];
          const isVerified = (feedback?.status || rep.status) === 'verified_closed';
          const previewUrl = filePreviews[rep.repair_id] || rep.after_image_url || "/images/roads/road_repaired_fresh_asphalt.jpg";

          return (
            <div
              key={rep.repair_id}
              className="bg-slate-800/90 border border-slate-700/80 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between"
            >
              <div className="p-5">
                {/* Status Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs font-mono text-slate-400">{rep.repair_id}</span>
                    <h3 className="font-semibold text-slate-100 text-sm">{rep.segment_id}</h3>
                    <p className="text-xs text-slate-400">Contractor: {rep.contractor_name}</p>
                    {rep.sector && <span className="text-[11px] text-emerald-400 font-medium">Area: {rep.sector}</span>}
                  </div>
                  <div>
                    {isVerified ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Verified Closed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Audit Pending</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Before / After Photos */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-rose-400 uppercase tracking-wide">Before (Hazard)</span>
                    <div className="h-32 rounded-lg overflow-hidden border border-rose-500/30 bg-slate-900">
                      <img
                        src={rep.before_image_url || "/images/roads/road_pothole_d00.jpg"}
                        alt="Before Repair"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/images/roads/road_pothole_d00.jpg";
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wide">After (Work Done)</span>
                      {!isVerified && (
                        <label className="text-[10px] text-slate-400 hover:text-emerald-400 cursor-pointer flex items-center space-x-1">
                          <Upload className="h-3 w-3" />
                          <span>Upload Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileSelect(rep.repair_id, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                    <div className="h-32 rounded-lg overflow-hidden border border-emerald-500/30 bg-slate-900 relative group">
                      <img
                        src={previewUrl}
                        alt="After Repair"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/images/roads/road_repaired_fresh_asphalt.jpg";
                        }}
                      />
                      {selectedFiles[rep.repair_id] && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded">
                          New Photo Ready
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Audit Feedback */}
                {feedback && (
                  <div className={`p-3 rounded-lg border text-xs space-y-1 mb-2 ${
                    feedback.damage_cleared
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    <div className="flex items-center space-x-1.5 font-semibold">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>AI Verification Result: {feedback.damage_cleared ? "APPROVED" : "REJECTED"}</span>
                    </div>
                    <p className="text-slate-200">{feedback.message}</p>
                    <p className="text-slate-400 text-[11px]">
                      Confidence: {Math.round((feedback.ai_verification_score || 0.95) * 100)}% | Damage Cleared: {feedback.damage_cleared ? "Yes" : "No"}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-4 bg-slate-900/60 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {isVerified ? "Audited & municipal sign-off complete" : "Requires AI Before/After verification"}
                </span>
                {!isVerified && (
                  <button
                    onClick={() => handleVerify(rep.repair_id)}
                    disabled={verifyingId === rep.repair_id}
                    className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
                  >
                    {verifyingId === rep.repair_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    )}
                    <span>{verifyingId === rep.repair_id ? "Analyzing Imagery..." : "Run AI Verification"}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
