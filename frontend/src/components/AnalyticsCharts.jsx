import React, { useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Cpu, Check, ShieldAlert } from 'lucide-react';
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
    const segmentId = selectedSegment?.segment_id || "RS-MG-01";
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
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-100 flex items-center space-x-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <span>Hazard Type Breakdown</span>
          </h3>
          <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
            {totalHazards} Total
          </span>
        </div>

        <div className="space-y-4">
          {[
            { label: "Potholes (D00)", count: distribution.potholes, color: "bg-rose-500", text: "text-rose-400" },
            { label: "Alligator Cracking (D10)", count: distribution.alligator_cracking, color: "bg-amber-500", text: "text-amber-400" },
            { label: "Longitudinal Cracks (D20)", count: distribution.longitudinal_cracks, color: "bg-blue-500", text: "text-blue-400" },
            { label: "Manhole Depressions (D40)", count: distribution.manhole_depressions, color: "bg-purple-500", text: "text-purple-400" }
          ].map((item, idx) => {
            const pct = Math.round((item.count / totalHazards) * 100);
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">{item.label}</span>
                  <span className={`font-semibold ${item.text}`}>{item.count} ({pct}%)</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Ward Infrastructure Health Ranking */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-100 flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            <span>Ward Health Index</span>
          </h3>
          <span className="text-xs text-slate-400">Bangalore Urban</span>
        </div>

        <div className="space-y-3">
          {(overview?.ward_health_rankings || []).map((w, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div>
                <p className="text-sm font-medium text-slate-200">{w.ward}</p>
                <p className="text-xs text-slate-400 capitalize">Condition: {w.status}</p>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold ${
                  w.health_score > 75 ? 'text-emerald-400' : w.health_score > 50 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {w.health_score} / 100
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Multi-Hazard AI Fusion Panel */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-100 flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-purple-400" />
              <span>Multi-Hazard AI Evaluator</span>
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">
              ML Fusion
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-4">
            Target Segment: <b className="text-slate-100">{selectedSegment?.name || "MG Road - Sector 3 (Default)"}</b>
          </p>

          {evaluationResult ? (
            <div className="p-3 bg-slate-900/90 rounded-lg border border-purple-500/30 space-y-2 mb-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Updated Health Score:</span>
                <span className="font-bold text-rose-400 text-sm">{evaluationResult.health_score} / 100</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">30-Day Failure Risk:</span>
                <span className="font-bold text-rose-300">{Math.round(evaluationResult.failure_probability * 100)}%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Recommended Action:</span>
                <span className="font-semibold text-amber-300 uppercase text-[11px]">
                  {evaluationResult.recommended_action?.replace('_', ' ')}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800 text-xs text-slate-400 mb-4 flex items-center space-x-3">
              <ShieldAlert className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <span>Select any road on the map and run fusion algorithm to predict structural failure risk.</span>
            </div>
          )}
        </div>

        <button
          onClick={handleRunEvaluation}
          disabled={evaluating}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-2.5 px-4 rounded-lg text-sm shadow-md transition-all disabled:opacity-50"
        >
          <Cpu className="h-4 w-4" />
          <span>{evaluating ? "Evaluating Multi-Hazard Fusion..." : "Run AI Risk Assessment"}</span>
        </button>
      </div>
    </div>
  );
}
