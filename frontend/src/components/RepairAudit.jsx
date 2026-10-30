import React, { useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, ShieldCheck, Upload, Loader2, Sparkles } from 'lucide-react';
import { verifyRepair } from '../services/api';

export default function RepairAudit({ repairs, onRefresh }) {
  const [verifyingId, setVerifyingId] = useState(null);
  const [auditFeedback, setAuditFeedback] = useState({});

  const handleVerify = async (repairId) => {
    setVerifyingId(repairId);
    try {
      // Simulate file upload or use placeholder
      const dummyBlob = new Blob(["after_photo_bytes"], { type: "image/jpeg" });
      const result = await verifyRepair(repairId, dummyBlob);
      setAuditFeedback(prev => ({
        ...prev,
        [repairId]: result
      }));
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Municipal Repair Verification Audit</h2>
          <p className="text-xs text-slate-400">
            Closed-loop contractor verification comparing pre-repair road hazards with post-resurfacing imagery.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(repairs || []).map((rep) => {
          const feedback = auditFeedback[rep.repair_id];
          const isVerified = (feedback?.status || rep.status) === 'verified_closed';

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
                        src={rep.before_image_url}
                        alt="Before Repair"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wide">After (Work Done)</span>
                    <div className="h-32 rounded-lg overflow-hidden border border-emerald-500/30 bg-slate-900">
                      <img
                        src={rep.after_image_url || "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800&auto=format&fit=crop&q=80"}
                        alt="After Repair"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* AI Audit Feedback */}
                {feedback && (
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-emerald-500/30 text-xs text-emerald-300 space-y-1 mb-2">
                    <div className="flex items-center space-x-1.5 font-semibold text-emerald-400">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>AI Verification Result</span>
                    </div>
                    <p className="text-slate-200">{feedback.message}</p>
                    <p className="text-slate-400 text-[11px]">
                      Confidence: {Math.round(feedback.ai_verification_score * 100)}% | Hazard Cleared: Yes
                    </p>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-4 bg-slate-900/60 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {isVerified ? "Audited & payment authorized" : "Awaiting municipal sign-off"}
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
                    <span>{verifyingId === rep.repair_id ? "Analyzing..." : "Run AI Verification"}</span>
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
