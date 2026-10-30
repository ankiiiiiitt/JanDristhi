import React from 'react';
import { Activity, ShieldCheck, Database, Camera, AlertTriangle } from 'lucide-react';

export default function Navbar({ isMock, onOpenUpload, activeTab, setActiveTab }) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-emerald-600 to-teal-400 p-2 rounded-xl text-white shadow-lg shadow-emerald-500/20">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xl tracking-tight text-white">JanDrishti</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  v1.0 Hackathon
                </span>
              </div>
              <p className="text-xs text-slate-400">Predictive Urban Infrastructure Intelligence</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            {[
              { id: 'dashboard', label: 'GIS Map & Roads' },
              { id: 'analytics', label: 'Risk Analytics' },
              { id: 'repairs', label: 'Repair Verification' },
              { id: 'collector', label: 'Mobile Collector' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right Action & Mode Badge */}
          <div className="flex items-center space-x-3">
            {isMock ? (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mock Mode (Offline Fallback)</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <Database className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">FastAPI & Mongo Live</span>
              </div>
            )}

            <button
              onClick={onOpenUpload}
              className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-3.5 py-2 rounded-lg text-sm transition-all shadow-md shadow-emerald-500/20"
            >
              <Camera className="h-4 w-4" />
              <span>Report Road Hazard</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

