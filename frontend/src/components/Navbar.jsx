import React from 'react';
import { Activity, ShieldCheck, Database, Camera, AlertTriangle } from 'lucide-react';

export default function Navbar({ isMock, onOpenUpload, activeTab, setActiveTab }) {
  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3">
            <div className="bg-[#145547] p-2 rounded-xl text-white shadow-sm">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xl tracking-tight text-slate-900">JanDrishti</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-[#145547] border border-emerald-200 font-semibold">
                  v1.0 Hackathon
                </span>
              </div>
              <p className="text-xs text-slate-500">Predictive Urban Infrastructure Intelligence</p>
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
                className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#145547] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right Action & Mode Badge */}
          <div className="flex items-center space-x-3">
            {isMock ? (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mock Mode (Offline Fallback)</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-[#145547] border border-emerald-200">
                <Database className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">FastAPI & Mongo Live</span>
              </div>
            )}

            <button
              onClick={onOpenUpload}
              className="flex items-center space-x-2 bg-[#145547] hover:bg-[#0d4339] text-white font-semibold px-3.5 py-2 rounded-lg text-sm transition-all shadow-sm"
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

