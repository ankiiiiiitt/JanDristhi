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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Municipal Repair Verification Audit</h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
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
              className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="p-5">
                {/* Status Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-[#145547] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      {rep.repair_id}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1.5">{rep.segment_id}</h3>
                    <p className="text-xs text-slate-500">Contractor: <span className="font-semibold text-slate-700">{rep.contractor_name}</span></p>
                    {rep.sector && <span className="text-[11px] text-[#145547] font-semibold">Area: {rep.sector}</span>}
                  </div>
                  <div>
                    {isVerified ? (
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#145547] border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Verified Closed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        <span>Audit Pending</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Before / After Photos */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Before (Hazard)</span>
                    <div className="h-32 rounded-xl overflow-hidden border border-rose-200 bg-slate-100 shadow-xs">
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
                      <span className="text-[10px] font-bold text-[#145547] uppercase tracking-wider">After (Work Done)</span>
                      {!isVerified && (
                        <label className="text-[10px] text-[#145547] font-bold hover:underline cursor-pointer flex items-center space-x-1">
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
                    <div className="h-32 rounded-xl overflow-hidden border border-emerald-200 bg-slate-100 relative group shadow-xs">
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
                        <span className="absolute bottom-1 right-1 bg-white/95 text-[#145547] font-bold text-[10px] px-2 py-0.5 rounded shadow-sm border border-emerald-200">
                          New Photo Ready
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Audit Feedback */}
                {feedback && (
                  <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 mb-2 ${
                    feedback.damage_cleared
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <div className="flex items-center space-x-1.5 font-bold">
                      <Sparkles className="h-3.5 w-3.5 text-[#145547]" />
                      <span>AI Verification Result: {feedback.damage_cleared ? "APPROVED" : "REJECTED"}</span>
                    </div>
                    <p className="text-slate-700">{feedback.message}</p>
                    <p className="text-slate-500 text-[11px] font-medium">
                      Confidence: {Math.round((feedback.ai_verification_score || 0.95) * 100)}% | Damage Cleared: {feedback.damage_cleared ? "Yes" : "No"}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {isVerified ? "Audited & municipal sign-off complete" : "Requires AI Before/After verification"}
                </span>
                {!isVerified && (
                  <button
                    onClick={() => handleVerify(rep.repair_id)}
                    disabled={verifyingId === rep.repair_id}
                    className="flex items-center space-x-1.5 bg-[#145547] hover:bg-[#0d4339] text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md shadow-emerald-950/15 disabled:opacity-50"
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
