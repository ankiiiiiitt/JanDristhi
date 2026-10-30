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
      color: "text-[#145547]",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200/80"
    },
    {
      title: "Critical Hazards",
      value: overview.critical_hazards,
      subtitle: `${overview.total_hazards_detected} total anomalies detected`,
      icon: AlertOctagon,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200/80"
    },
    {
      title: "City Health Score",
      value: `${overview.city_average_health_score} / 100`,
      subtitle: overview.city_average_health_score > 70 ? "Stable road network condition" : "Monsoon degradation warning",
      icon: HeartPulse,
      color: overview.city_average_health_score > 70 ? "text-[#145547]" : "text-amber-600",
      bgColor: overview.city_average_health_score > 70 ? "bg-emerald-50" : "bg-amber-50",
      borderColor: overview.city_average_health_score > 70 ? "border-emerald-200/80" : "border-amber-200/80"
    },
    {
      title: "Verified Closed Repairs",
      value: overview.verified_repairs_this_week,
      subtitle: `${overview.pending_repairs} active work orders`,
      icon: CheckCircle2,
      color: "text-[#145547]",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200/80"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`bg-white border ${card.borderColor} rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all group`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{card.title}</span>
              <div className={`p-2.5 rounded-xl ${card.bgColor} ${card.color} shadow-xs transition-transform group-hover:scale-105`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{card.value}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
