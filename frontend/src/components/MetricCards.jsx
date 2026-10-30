import React from 'react';
import { Route, AlertOctagon, HeartPulse, CheckCircle2 } from 'lucide-react';

export default function MetricCards({ overview }) {
  if (!overview) return null;

  const cards = [
    {
      title: "Monitored Network",
      value: `${overview.monitored_km} km`,
      subtitle: `${overview.active_vehicles || 12} telemetry vehicles live`,
      icon: Route,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      title: "Critical Hazards",
      value: overview.critical_hazards,
      subtitle: `${overview.total_hazards_detected} total anomalies detected`,
      icon: AlertOctagon,
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/20"
    },
    {
      title: "City Health Score",
      value: `${overview.city_average_health_score} / 100`,
      subtitle: overview.city_average_health_score > 70 ? "Stable condition" : "Monsoon degradation warning",
      icon: HeartPulse,
      color: overview.city_average_health_score > 70 ? "text-emerald-400" : "text-amber-400",
      bgColor: overview.city_average_health_score > 70 ? "bg-emerald-500/10" : "bg-amber-500/10",
      borderColor: overview.city_average_health_score > 70 ? "border-emerald-500/20" : "border-amber-500/20"
    },
    {
      title: "Verified Closed Repairs",
      value: overview.verified_repairs_this_week,
      subtitle: `${overview.pending_repairs} active work orders`,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`bg-slate-800/80 backdrop-blur border ${card.borderColor} rounded-xl p-4 shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.title}</span>
              <div className={`p-2 rounded-lg ${card.bgColor} ${card.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline">
              <span className="text-2xl font-bold text-white tracking-tight">{card.value}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
