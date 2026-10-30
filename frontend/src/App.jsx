import React, { useState, useEffect } from 'react';
import UserMobileApp from './components/UserMobileApp';
import UnifiedAppView from './components/UnifiedAppView';
import UploadModal from './components/UploadModal';
import AuthPortal from './components/AuthPortal';
import LandingPage from './components/LandingPage';
import { Smartphone, Monitor, LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import { fetchOverview, fetchRoadsGeoJSON, fetchObservations, fetchRepairs, checkSystemHealth } from './services/api';

export default function App() {
  const [authEntry, setAuthEntry] = useState(null);
  // Current Authenticated User & Role Session
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('jandrishti_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Global Mode: 'developer' (Laptop Web UI) or 'user' (Mobile Phone UI)
  const [activePlatform, setActivePlatform] = useState(() => {
    try {
      const savedPlatform = localStorage.getItem('jandrishti_active_platform');
      return savedPlatform || 'developer';
    } catch (e) {
      return 'developer';
    }
  });

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

      // Merge backend observations with locally persisted user mobile reports
      let localUserObs = [];
      try {
        localUserObs = JSON.parse(localStorage.getItem('jandrishti_user_observations') || '[]');
      } catch (e) {}

      const serverObs = obsRes.data || [];
      // Combine with local user uploads at the top (deduplicated by observation_id)
      const existingIds = new Set(localUserObs.map(o => o.observation_id));
      const filteredServerObs = serverObs.filter(o => !existingIds.has(o.observation_id));
      setObservations([...localUserObs, ...filteredServerObs]);
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

  const handleAuthSuccess = (user, platform) => {
    setCurrentUser(user);
    setActivePlatform(platform);
    try {
      localStorage.setItem('jandrishti_auth_user', JSON.stringify(user));
      localStorage.setItem('jandrishti_active_platform', platform);
    } catch (e) {}
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthEntry(null);
    try {
      localStorage.removeItem('jandrishti_auth_user');
      localStorage.removeItem('jandrishti_active_platform');
    } catch (e) {}
  };

  const handleUploadSuccess = (newObservation) => {
    setObservations(prev => {
      const filtered = prev.filter(o => o.observation_id !== newObservation.observation_id);
      const updated = [newObservation, ...filtered];
      try {
        localStorage.setItem('jandrishti_user_observations', JSON.stringify(updated.slice(0, 50)));
      } catch (e) {}
      return updated;
    });

    if (overview) {
      setOverview(prev => ({
        ...prev,
        total_hazards_detected: (prev.total_hazards_detected || 0) + 1,
        critical_hazards: (prev.critical_hazards || 0) + 1
      }));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // FIRST SCREEN: IF NOT LOGGED IN, RENDER AUTH PORTAL
  // ─────────────────────────────────────────────────────────────
  if (!currentUser) {
    if (!authEntry) {
      return <LandingPage onLogin={() => setAuthEntry('login')} onSignup={() => setAuthEntry('signup')} />;
    }
    return <AuthPortal onAuthSuccess={handleAuthSuccess} initialMode={authEntry} onBack={() => setAuthEntry(null)} />;
  }

  return (
    <div className="min-h-screen bg-[#f7faf9] text-slate-900 flex flex-col font-sans select-none relative">
      {/* ─────────────────────────────────────────────────────────────
          GLOBAL TOP PLATFORM SWITCHER & AUTH HEADER (Sticky Floating Bar)
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-6 py-2.5 flex items-center justify-between text-xs z-50 sticky top-0 shadow-xs gap-3">
        <div className="flex items-center space-x-2.5">
          <span className="grid place-items-center size-7 rounded-lg bg-[#0d4d41] text-emerald-200 shadow-xs">
            <Sparkles size={14} />
          </span>
          <span className="font-extrabold text-slate-950 text-sm">Jan<span className="text-[#145547]">Drishti</span></span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="text-slate-500 text-[11px] hidden md:inline font-semibold">Urban Infrastructure Platform</span>
        </div>

        {/* ROLE-BASED ACCESS CONTROL (RBAC) */}
        {currentUser.role === 'citizen' ? (
          /* CITIZEN PORTAL BADGE: Citizen CANNOT switch to or access Developer/Engineer UI */
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#f0f7f4] border border-emerald-200/80 text-[#145547] font-bold text-xs shadow-xs">
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Citizen Field Inspection Mode</span>
          </div>
        ) : (
          /* DEVELOPER / MUNICIPAL ENGINEER CONTROLS */
          <div className="flex items-center space-x-1 bg-slate-100/90 border border-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => {
                setActivePlatform('developer');
                localStorage.setItem('jandrishti_active_platform', 'developer');
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition-all text-xs ${
                activePlatform === 'developer'
                  ? 'bg-[#145547] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Engineer / GIS Studio</span>
              <span className="sm:hidden">Studio</span>
            </button>

            <button
              onClick={() => {
                setActivePlatform('user');
                localStorage.setItem('jandrishti_active_platform', 'user');
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition-all text-xs ${
                activePlatform === 'user'
                  ? 'bg-[#145547] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Field Mobile Preview</span>
              <span className="sm:hidden">Mobile</span>
            </button>
          </div>
        )}

        {/* Authenticated User Profile Pill & Logout Button */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="flex items-center space-x-2 bg-white border border-slate-200/90 px-2.5 py-1 rounded-xl shadow-xs">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-slate-950 ${
              currentUser.role === 'developer' ? 'bg-emerald-200 text-[#0d4d41]' : 'bg-emerald-100 text-[#145547]'
            }`}>
              {currentUser.avatar || (currentUser.name ? currentUser.name[0] : 'U')}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-none">
              <span className="font-bold text-slate-900 text-[11px] truncate max-w-[110px]">{currentUser.name}</span>
              <span className="text-[9px] text-slate-500 font-medium">
                {currentUser.role === 'developer' ? 'Municipal Engineer' : 'Citizen User'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200/90 text-xs font-semibold text-slate-600 flex items-center space-x-1 transition-all shadow-xs"
            title="Log Out & Switch Portal Role"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Log Out</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ACTIVE VIEW RENDERING (CITIZEN USERS ARE LOCKED TO MOBILE APP)
         ───────────────────────────────────────────────────────────── */}
      {currentUser.role === 'citizen' || activePlatform === 'user' ? (
        // 1. CITIZEN FIELD USER EXPERIENCE
        <UserMobileApp
          overview={overview}
          roadsGeoJson={roadsGeoJson}
          observations={observations}
          onOpenUpload={() => setIsModalOpen(true)}
          onSwitchToDeveloper={currentUser.role === 'developer' ? () => setActivePlatform('developer') : null}
          onUploadSuccess={handleUploadSuccess}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      ) : (
        // 2. DEVELOPER / MUNICIPAL ENGINEER EXPERIENCE (PROTECTED - CITIZENS CANNOT ACCESS)
        <UnifiedAppView
          overview={overview}
          roadsGeoJson={roadsGeoJson}
          observations={observations}
          repairs={repairs}
          onRefresh={loadAllData}
          onOpenUpload={() => setIsModalOpen(true)}
          onUploadSuccess={handleUploadSuccess}
          currentUser={currentUser}
          onLogout={handleLogout}
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
