import React, { useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Cpu, Check, ShieldAlert, Sparkles } from 'lucide-react';
import { evaluateSegmentRisk } from '../services/api';

export default function AnalyticsCharts({ overview, selectedSegment }) {
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);

  const distribution = overview?.hazard_distribution || {
    potholes: 92,
    alligator_cracking: 45,
    longitudinal_cracks: 31,
    manhole_depressions: 16
  };

  const totalHazards = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;

  const handleRunEvaluation = async () => {
    const segmentId = selectedSegment?.segment_id || "RS-CHD-SEC-17-001";
    setEvaluating(true);
    try {
      const res = await evaluateSegmentRisk(segmentId);
      setEvaluationResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Hazard Breakdown */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 flex items-center space-x-2 text-sm">
            <BarChart3 className="h-4 w-4 text-[#145547]" />
            <span>Hazard Type Breakdown</span>
          </h3>
          <span className="text-xs bg-emerald-50 text-[#145547] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200/80">
            {totalHazards} Total
          </span>
        </div>

        <div className="space-y-4">
          {[
            { label: "Potholes (D00)", count: distribution.potholes, color: "bg-rose-500", text: "text-rose-700" },
            { label: "Alligator Cracking (D10)", count: distribution.alligator_cracking, color: "bg-amber-500", text: "text-amber-700" },
            { label: "Longitudinal Cracks (D20)", count: distribution.longitudinal_cracks, color: "bg-emerald-600", text: "text-emerald-700" },
            { label: "Transverse Cracks (D40)", count: distribution.manhole_depressions, color: "bg-[#145547]", text: "text-[#145547]" }
          ].map((item, idx) => {
            const pct = Math.round((item.count / totalHazards) * 100);
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 font-semibold">{item.label}</span>
                  <span className={`font-bold ${item.text}`}>{item.count} ({pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Ward Infrastructure Health Ranking */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 flex items-center space-x-2 text-sm">
            <TrendingUp className="h-4 w-4 text-[#145547]" />
            <span>Area Health Index</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">Chandigarh Urban</span>
        </div>

        <div className="space-y-2.5">
          {(overview?.ward_health_rankings || []).map((w, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-50 transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-900">{w.ward}</p>
                <p className="text-[11px] text-slate-500 capitalize">Condition: {w.status}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                  w.health_score > 75
                    ? 'bg-emerald-50 text-[#145547] border-emerald-200'
                    : w.health_score > 50
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {w.health_score} / 100
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Multi-Hazard AI Fusion Panel */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 flex items-center space-x-2 text-sm">
              <Cpu className="h-4 w-4 text-[#145547]" />
              <span>Multi-Hazard AI Evaluator</span>
            </h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#145547] font-bold border border-emerald-200">
              ML Fusion
            </span>
          </div>

          <p className="text-xs text-slate-600 mb-4">
            Target Segment: <b className="text-slate-900">{selectedSegment?.name || "Sector 17 - Madhya Marg (Default)"}</b>
          </p>

          {evaluationResult ? (
            <div className="p-3.5 bg-[#f0f7f4] rounded-xl border border-emerald-200/80 space-y-2 mb-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Updated Health Score:</span>
                <span className="font-black text-rose-600 text-sm">{evaluationResult.health_score} / 100</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">30-Day Failure Risk:</span>
                <span className="font-black text-rose-700">{Math.round(evaluationResult.failure_probability * 100)}%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Recommended Action:</span>
                <span className="font-bold text-[#145547] uppercase text-[11px]">
                  {evaluationResult.recommended_action?.replace('_', ' ')}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 mb-4 flex items-center space-x-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <span>Select any road on the map and run fusion algorithm to predict structural failure risk.</span>
            </div>
          )}
        </div>

        <button
          onClick={handleRunEvaluation}
          disabled={evaluating}
          className="w-full flex items-center justify-center space-x-2 bg-[#145547] hover:bg-[#0d4339] text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-950/15 transition-all active:scale-98 disabled:opacity-50"
        >
          <Cpu className="h-4 w-4" />
          <span>{evaluating ? "Evaluating Multi-Hazard Fusion..." : "Run AI Risk Assessment"}</span>
        </button>
      </div>
    </div>
  );
}
