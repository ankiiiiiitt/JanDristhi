import React, { useState, useEffect } from 'react';
import UserMobileApp from './components/UserMobileApp';
import UnifiedAppView from './components/UnifiedAppView';
import UploadModal from './components/UploadModal';
import { Smartphone, Monitor } from 'lucide-react';
import { fetchOverview, fetchRoadsGeoJSON, fetchObservations, fetchRepairs, checkSystemHealth } from './services/api';

export default function App() {
  // Global Mode: 'developer' (Laptop Web UI) or 'user' (Mobile Phone UI)
  const [activePlatform, setActivePlatform] = useState('developer'); // default 'developer' for laptop, switchable to 'user'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);

  // Core Data States
  const [overview, setOverview] = useState(null);
  const [roadsGeoJson, setRoadsGeoJson] = useState(null);
  const [observations, setObservations] = useState([]);
  const [repairs, setRepairs] = useState([]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await checkSystemHealth();
      const [ovRes, roadsRes, obsRes, repRes] = await Promise.all([
        fetchOverview(),
        fetchRoadsGeoJSON(),
        fetchObservations(),
        fetchRepairs()
      ]);

      setOverview(ovRes.data);
      setIsMock(ovRes.isMock);
      setRoadsGeoJson(roadsRes.data);
      setObservations(obsRes.data || []);
      setRepairs(repRes.data || []);
    } catch (e) {
      console.error("Error loading JanDrishti data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleUploadSuccess = (newObservation) => {
    setObservations(prev => [newObservation, ...prev]);
    if (overview) {
      setOverview(prev => ({
        ...prev,
        total_hazards_detected: (prev.total_hazards_detected || 0) + 1,
        critical_hazards: (prev.critical_hazards || 0) + 1
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans select-none relative">
      {/* ─────────────────────────────────────────────────────────────
          GLOBAL TOP PLATFORM SWITCHER (Sticky Floating Bar)
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#091122] border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs z-50 sticky top-0 shadow-md">
        <div className="flex items-center space-x-2">
          <span className="font-extrabold text-white text-sm">Jan<span className="text-emerald-400">Drishti</span></span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">Platform Mode:</span>
        </div>

        {/* Dual Mode Switcher: Developer (Laptop Web UI) vs User (Field Mobile Phone) */}
        <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700/80 p-1 rounded-xl">
          <button
            onClick={() => setActivePlatform('developer')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition-all ${
              activePlatform === 'developer'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>Developer Mode (Laptop UI)</span>
          </button>

          <button
            onClick={() => setActivePlatform('user')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition-all ${
              activePlatform === 'user'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>User / Field App (Mobile UI)</span>
          </button>
        </div>

        <div className="hidden md:flex items-center space-x-2 text-[11px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Live Synchronized Data</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ACTIVE VIEW RENDERING
         ───────────────────────────────────────────────────────────── */}
      {activePlatform === 'developer' ? (
        // 1. DEVELOPER LAPTOP-BASED EXPERIENCE (Full Width Desktop Dashboard, GIS Map, Studio, Auditing)
        <UnifiedAppView
          overview={overview}
          roadsGeoJson={roadsGeoJson}
          observations={observations}
          repairs={repairs}
          onRefresh={loadAllData}
          onOpenUpload={() => setIsModalOpen(true)}
        />
      ) : (
        // 2. USER MOBILE PHONE EXPERIENCE (Field monitoring, Live Record camera, Map, Reports)
        <UserMobileApp
          overview={overview}
          roadsGeoJson={roadsGeoJson}
          observations={observations}
          onOpenUpload={() => setIsModalOpen(true)}
          onSwitchToDeveloper={() => setActivePlatform('developer')}
        />
      )}

      {/* Modal for Telemetry & Image Ingestion */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
