import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Radio,
  ScanSearch,
  MapPin,
  LineChart,
  ShieldCheck,
  FileText,
  Truck,
  Settings,
  ChevronDown,
  Activity,
  Flame,
  XCircle,
  Droplets,
  Gauge,
  Search,
  Maximize2,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  CloudSun,
  Bell,
  Play,
  Square,
  Camera,
  Compass,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  Crosshair,
  Sliders,
  ChevronLeft,
  Menu,
  X,
  Smartphone,
  Video,
  UploadCloud,
  Check,
  AlertCircle,
  LogOut
} from 'lucide-react';
import RoadMap from './RoadMap';
import MobileCollector from './MobileCollector';

export default function UnifiedAppView({
  overview,
  roadsGeoJson,
  observations,
  repairs,
  onRefresh,
  onOpenUpload,
  currentUser = null,
  onLogout = null
}) {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);

  // AI Detection tab states
  const [aiSubTab, setAiSubTab] = useState('image');
  const [activeDetectionImg, setActiveDetectionImg] = useState('/images/roads/road_pothole_d00.jpg');

  // Live Hardware Monitoring in Mockup Widget
  const [isMockupLive, setIsMockupLive] = useState(false);
  const [mockupGps, setMockupGps] = useState({ lat: 30.7408, lng: 76.7827, speed: 28 });
  const [mockupAccel, setMockupAccel] = useState({ x: 2.1, y: 1.3, z: 0.8 });
  const [mockupStream, setMockupStream] = useState(null);
  const mockupVideoRef = useRef(null);

  // Start real browser sensors & camera for widget
  const toggleMockupSensors = async () => {
    if (isMockupLive) {
      // Turn off
      if (mockupStream) {
        mockupStream.getTracks().forEach(track => track.stop());
        setMockupStream(null);
      }
      setIsMockupLive(false);
      return;
    }

    // Turn ON Camera
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        setMockupStream(stream);
        if (mockupVideoRef.current) {
          mockupVideoRef.current.srcObject = stream;
        }
      }
    } catch (e) {
      console.warn("Camera permission or stream failed:", e);
    }

    // Turn ON Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMockupGps({
            lat: Number(pos.coords.latitude.toFixed(4)),
            lng: Number(pos.coords.longitude.toFixed(4)),
            speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 28
          });
        },
        (err) => console.warn("GPS lookup:", err),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    // Turn ON Accelerometer
    if (typeof window !== 'undefined' && window.DeviceMotionEvent) {
      const handleMotion = (e) => {
        const acc = e.accelerationIncludingGravity || e.acceleration;
        if (acc) {
          setMockupAccel({
            x: Number((acc.x || 0).toFixed(1)),
            y: Number((acc.y || 0).toFixed(1)),
            z: Number((acc.z || 0).toFixed(1))
          });
        }
      };
      window.addEventListener('devicemotion', handleMotion, { once: false });
    }

    setIsMockupLive(true);
  };

  useEffect(() => {
    if (mockupVideoRef.current && mockupStream) {
      mockupVideoRef.current.srcObject = mockupStream;
    }
  }, [mockupStream]);

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      if (mockupStream) {
        mockupStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [mockupStream]);

  // High risk locations list
  const highRiskLocations = [
    {
      id: 'LOC-17',
      name: 'Sector 17',
      issue: 'Pothole',
      risk: 'High Risk',
      riskColor: 'rose',
      healthScore: 32,
      thumbnail: '/images/roads/road_pothole_d00.jpg',
      coords: [30.7410, 76.7850]
    },
    {
      id: 'LOC-22',
      name: 'Sector 22',
      issue: 'Crack',
      risk: 'Medium Risk',
      riskColor: 'amber',
      healthScore: 58,
      thumbnail: '/images/roads/road_longitudinal_d20.jpg',
      coords: [30.7350, 76.7720]
    },
    {
      id: 'LOC-34',
      name: 'Sector 34',
      issue: 'Patch Damage',
      risk: 'Low Risk',
      riskColor: 'emerald',
      healthScore: 82,
      thumbnail: '/images/roads/road_alligator_d10.jpg',
      coords: [30.7220, 76.7680]
    },
    {
      id: 'LOC-IND',
      name: 'Industrial Area Phase 1',
      issue: 'Pothole',
      risk: 'High Risk',
      riskColor: 'rose',
      healthScore: 41,
      thumbnail: '/images/roads/road_transverse_d40.jpg',
      coords: [30.7060, 76.8040]
    }
  ];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Monitoring', icon: Radio },
    { id: 'detection', label: 'AI Detection', icon: ScanSearch },
    { id: 'gis', label: 'GIS Map', icon: MapPin },
    { id: 'analysis', label: 'Road Analysis', icon: LineChart },
    { id: 'repair', label: 'Repair Verification', icon: ShieldCheck },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'vehicles', label: 'Vehicles', icon: Truck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#070b14] text-slate-100 font-sans select-none overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────
          1. MOBILE TOP APP BAR & DRAWER (Visible on Mobile / Tablets)
         ───────────────────────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0c1427] border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800"
          >
            {isMobileDrawerOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div className="flex items-center space-x-1">
            <span className="text-lg font-black text-white">Jan</span>
            <span className="text-lg font-black text-emerald-400">Drishti</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveNav('live')}
            className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[11px] font-bold flex items-center space-x-1"
          >
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>Live Telemetry</span>
          </button>

          <button
            onClick={onOpenUpload}
            className="p-2 rounded-lg bg-emerald-500 text-slate-950 shadow"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Backdrop */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. SIDEBAR NAVIGATION (Desktop persistent, Mobile Slide-over)
         ───────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-60 bg-[#0c1427] border-r border-slate-800/80 flex flex-col justify-between z-50 transition-transform duration-200 ease-in-out ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo */}
          <div className="p-4 border-b border-slate-800/60">
            <div className="flex items-center space-x-1.5">
              <span className="text-xl font-bold tracking-tight text-white">Jan</span>
              <div className="relative flex items-center justify-center">
                <span className="text-xl font-black text-emerald-400">Drishti</span>
                <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider mt-0.5">Safer Roads • Smarter Cities</p>
          </div>

          {/* Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id);
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'live' && (
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile */}
        <div className="p-3 border-t border-slate-800/70">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-xs font-bold text-indigo-200">
                AD
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-200">Admin</p>
                <p className="text-[10px] text-slate-400">City Authority</p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CONTENT CONTAINER (Fully Responsive Grid)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-[#091122] to-[#070b14]">
        {/* Desktop Header */}
        <header className="hidden md:flex h-14 px-6 border-b border-slate-800/70 items-center justify-between flex-shrink-0 bg-[#0c1427]/60 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg text-white">Jan</span>
              <span className="font-extrabold text-lg text-emerald-400">Drishti</span>
            </div>
            <span className="text-xs text-slate-400 border-l border-slate-700 pl-3">
              AI-Powered Predictive Urban Infrastructure Intelligence
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Live Monitoring Quick Toggle */}
            <button
              onClick={() => setActiveNav('live')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors ${
                activeNav === 'live'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25'
              }`}
            >
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span>Mobile Live Collector</span>
            </button>

            {/* Weather / Location Pill */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/60 text-xs text-slate-200">
              <MapPin className="h-3.5 w-3.5 text-blue-400" />
              <span>Chandigarh</span>
              <span className="text-slate-600">|</span>
              <CloudSun className="h-3.5 w-3.5 text-amber-400" />
              <span>28°C Clear Sky</span>
            </div>

            <button
              onClick={onOpenUpload}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center space-x-1.5 shadow-md shadow-emerald-500/20"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Report Hazard</span>
            </button>

            {/* Engineer Profile & Quick Logout */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-purple-950/40 border border-purple-800/40 text-xs">
                <span className="w-5 h-5 rounded-full bg-purple-600 font-bold text-[10px] flex items-center justify-center text-white">
                  {currentUser?.avatar || 'E'}
                </span>
                <span className="font-semibold text-purple-200 hidden md:inline">
                  {currentUser?.name || 'Er. Vikram Sharma'}
                </span>
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-semibold">
                  Engineer
                </span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700/80 text-slate-300 transition-colors"
                  title="Logout & Switch Role Portal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ───────────────────────────────────────────────────────────
            VIEW 1: PRIMARY DASHBOARD (With Responsive Grid)
           ─────────────────────────────────────────────────────────── */}
        {activeNav === 'dashboard' && (
          <div className="p-3 sm:p-5 flex flex-col xl:flex-row gap-5 flex-1 min-h-0">
            {/* Center Area */}
            <div className="flex-1 flex flex-col space-y-4 min-w-0">
              {/* Header Title */}
              <div className="text-center py-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center justify-center space-x-2">
                  <span>Jan</span>
                  <span className="text-emerald-400">Drishti</span>
                </h1>
                <p className="text-xs text-slate-400">
                  AI-Powered Predictive Urban Infrastructure Intelligence • From Road Data to Safer Cities
                </p>
              </div>

              {/* 5 KPI Metric Cards (Auto Wrapping for Mobile) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                {/* 1. Total Detections */}
                <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-3 flex items-center space-x-3 shadow-md">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 flex-shrink-0">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Total Detections</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-base sm:text-lg font-black text-white">{overview?.total_hazards_detected || '1,248'}</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">+12%</span>
                    </div>
                  </div>
                </div>

                {/* 2. Potholes */}
                <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-3 flex items-center space-x-3 shadow-md">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 flex-shrink-0">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Potholes</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-base sm:text-lg font-black text-white">482</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">+18%</span>
                    </div>
                  </div>
                </div>

                {/* 3. Cracks */}
                <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-3 flex items-center space-x-3 shadow-md">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 flex-shrink-0">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Cracks</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-base sm:text-lg font-black text-white">436</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">+9%</span>
                    </div>
                  </div>
                </div>

                {/* 4. Waterlogging Risk */}
                <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-3 flex items-center space-x-3 shadow-md">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 flex-shrink-0">
                    <Droplets className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Waterlogging</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-base sm:text-lg font-black text-white">192</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">+5%</span>
                    </div>
                  </div>
                </div>

                {/* 5. Road Health Score */}
                <div className="col-span-2 sm:col-span-1 bg-[#0f172a]/90 border border-emerald-500/30 rounded-2xl p-3 flex items-center space-x-3 shadow-md bg-emerald-500/5">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 flex-shrink-0">
                    <Gauge className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block leading-tight">Health Score</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-base sm:text-lg font-black text-white">
                        {overview?.city_average_health_score ? `${overview.city_average_health_score}/100` : '72/100'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold">+6%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lower Split: City Road Map + High Risk Locations Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
                {/* Map Container */}
                <div className="lg:col-span-8 bg-[#0f172a] border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col shadow-xl">
                  {/* Map Header Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white">City Road Map</span>
                      <span className="text-[11px] text-slate-400 font-mono">(Chandigarh)</span>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-[11px] overflow-x-auto">
                      {['All Issues', 'Potholes', 'Cracks', 'Waterlogging'].map((f) => {
                        const key = f.toLowerCase().replace(' ', '');
                        const isSel = filterType === (key === 'allissues' ? 'all' : key);
                        return (
                          <button
                            key={f}
                            onClick={() => setFilterType(key === 'allissues' ? 'all' : key)}
                            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                              isSel ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {f}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="mb-2 relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search location, sector or road..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-800 text-xs rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Leaflet Map Canvas */}
                  <div className="h-[320px] sm:h-[380px] rounded-xl overflow-hidden border border-slate-800 relative">
                    <RoadMap
                      geojson={roadsGeoJson}
                      observations={observations}
                      onSelectSegment={setSelectedLocation}
                      height="100%"
                    />
                  </div>
                </div>

                {/* High Risk Locations Column */}
                <div className="lg:col-span-4 bg-[#0f172a] border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-white">High Risk Locations</span>
                      <button
                        onClick={() => setActiveNav('analysis')}
                        className="text-xs text-blue-400 hover:underline font-medium"
                      >
                        View All
                      </button>
                    </div>

                    <div className="space-y-2">
                      {highRiskLocations.map((loc) => (
                        <div
                          key={loc.id}
                          onClick={() => setSelectedLocation({ name: loc.name })}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              src={loc.thumbnail}
                              alt={loc.name}
                              className="w-11 h-11 rounded-lg object-cover border border-slate-700 group-hover:scale-105 transition-transform"
                            />
                            <div>
                              <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                                {loc.name}
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                <span className={loc.riskColor === 'rose' ? 'text-rose-400 font-semibold' : 'text-amber-400 font-semibold'}>
                                  {loc.issue}
                                </span>{' '}
                                • {loc.risk}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                HS: <b className="text-slate-300">{loc.healthScore}/100</b>
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-all" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                    <div className="flex items-center space-x-2 text-rose-400 font-bold text-[11px] uppercase mb-1">
                      <Flame className="h-3.5 w-3.5" />
                      <span>Monsoon Warning</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Sector 17 & Industrial Area show critical surface fatigue.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────
                RIGHT SIDEBAR: INTERACTIVE PHONE MOCKUP (WITH REAL CAMERA & SENSOR TOGGLE)
               ───────────────────────────────────────────────────────── */}
            <div className="w-full xl:w-[300px] flex-shrink-0 flex flex-col items-center justify-center py-2">
              <div className="w-full max-w-[290px] bg-slate-950 border-[6px] border-slate-800 rounded-[38px] shadow-2xl overflow-hidden flex flex-col relative h-[590px] ring-1 ring-slate-700">
                {/* Speaker Notch */}
                <div className="w-28 h-4 bg-slate-800 rounded-b-xl mx-auto flex items-center justify-center">
                  <div className="w-10 h-1 bg-slate-900 rounded-full" />
                </div>

                {/* Phone Header */}
                <div className="px-4 py-1.5 flex items-center justify-between border-b border-slate-900 text-xs">
                  <span className="font-bold text-[11px] text-slate-300">9:41</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-white text-xs">Jan</span>
                    <span className="font-bold text-emerald-400 text-xs">Drishti</span>
                  </div>
                  <Settings className="h-3.5 w-3.5 text-slate-400" />
                </div>

                {/* Status Badges */}
                <div className="px-3 pt-2 pb-1 flex items-center justify-between text-[10px]">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>{isMockupLive ? 'Hardware Live' : 'Connected'}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 font-semibold flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>{isMockupLive ? 'Live Sensors' : 'Demo Stream'}</span>
                  </span>
                </div>

                {/* Video / Dashcam Canvas */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-inner h-40 bg-slate-900 flex items-center justify-center">
                    {isMockupLive && mockupStream ? (
                      <video
                        ref={mockupVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src="/images/roads/road_pothole_d00.jpg"
                        alt="Road Camera Feed"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Overlay Bounding Box */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="border-2 border-rose-500 bg-rose-500/20 w-28 h-16 rounded flex flex-col justify-between p-1">
                        <span className="text-[9px] font-black bg-rose-600 text-white px-1 rounded w-max">
                          Pothole 0.87
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Telemetry Sensor Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {/* Camera */}
                    <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                        <Camera className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400">Camera</p>
                        <p className="text-[10px] font-bold text-emerald-400">
                          {isMockupLive ? 'Rear Active' : 'Simulated'}
                        </p>
                      </div>
                    </div>

                    {/* GPS */}
                    <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                        <Compass className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400">GPS</p>
                        <p className="text-[9px] font-mono text-slate-200">
                          {mockupGps.lat}, {mockupGps.lng}
                        </p>
                      </div>
                    </div>

                    {/* Accelerometer */}
                    <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                        <Activity className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400">IMU / Z-Shock</p>
                        <p className="text-[9px] font-mono text-slate-200">
                          X:{mockupAccel.x} Y:{mockupAccel.y} Z:{mockupAccel.z}
                        </p>
                      </div>
                    </div>

                    {/* Speed */}
                    <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                        <Zap className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400">Speed</p>
                        <p className="text-[10px] font-bold text-white">{mockupGps.speed} km/h</p>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Monitoring Action Button */}
                  <button
                    onClick={toggleMockupSensors}
                    className={`mt-2 w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                      isMockupLive
                        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20'
                    }`}
                  >
                    <span>{isMockupLive ? 'Turn Off Camera & Sensors' : 'Turn On Live Hardware Sensors'}</span>
                  </button>
                </div>

                {/* Mobile Bottom Navigation Bar */}
                <div className="bg-slate-900 border-t border-slate-800/80 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400">
                  <button onClick={() => setActiveNav('dashboard')} className="flex flex-col items-center text-blue-400 font-bold">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Home</span>
                  </button>
                  <button onClick={() => setActiveNav('detection')} className="flex flex-col items-center hover:text-white">
                    <ScanSearch className="h-4 w-4" />
                    <span>Detections</span>
                  </button>
                  <button onClick={() => setActiveNav('live')} className="flex flex-col items-center hover:text-white">
                    <Radio className="h-4 w-4 text-rose-400 animate-pulse" />
                    <span>Collector</span>
                  </button>
                  <button onClick={onOpenUpload} className="flex flex-col items-center hover:text-white">
                    <Camera className="h-4 w-4" />
                    <span>Upload</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────
            VIEW 2: FULL MOBILE SENSOR COLLECTOR (Full-Screen Camera, GPS, & Accelerometer)
           ─────────────────────────────────────────────────────────── */}
        {activeNav === 'live' && (
          <div className="p-3 sm:p-6 max-w-5xl w-full mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Radio className="h-5 w-5 text-rose-400 animate-pulse" />
                  <span>Real-Time Mobile Collector & Telemetry Ingest</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Turn your phone or tablet into an automated road hazard scanner using browser camera, high-frequency GPS, and IMU shock sensors.
                </p>
              </div>
              <button
                onClick={() => setActiveNav('dashboard')}
                className="self-start sm:self-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700"
              >
                Back to Dashboard
              </button>
            </div>

            {/* Embedded Full Sensor Module */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 sm:p-5 shadow-2xl">
              <MobileCollector
                onUploadSuccess={onRefresh}
                onRefresh={onRefresh}
              />
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────
            VIEW 3: AI DETECTION STUDIO
           ─────────────────────────────────────────────────────────── */}
        {activeNav === 'detection' && (
          <div className="p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-white">AI Detection Studio</h2>
                <p className="text-xs text-slate-400">
                  Upload road images or video feeds to detect potholes, cracks, and other surface damages using YOLOv8.
                </p>
              </div>

              <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setAiSubTab('image')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    aiSubTab === 'image' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Image Detection
                </button>
                <button
                  onClick={() => setAiSubTab('video')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    aiSubTab === 'video' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Video Detection
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col items-center">
                <div className="relative w-full h-[260px] sm:h-[380px] rounded-xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
                  <img
                    src={activeDetectionImg}
                    alt="AI Detection Surface"
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute top-[52%] left-[16%] w-[28%] sm:w-[24%] h-[32%] border-2 border-rose-500 bg-rose-500/15 rounded flex flex-col justify-start p-1 pointer-events-none">
                    <span className="text-[9px] sm:text-[10px] font-bold bg-rose-600 text-white px-1.5 py-0.5 rounded w-max shadow">
                      Pothole 0.92
                    </span>
                  </div>

                  <div className="absolute top-[42%] left-[45%] w-[25%] sm:w-[22%] h-[26%] border-2 border-amber-500 bg-amber-500/15 rounded flex flex-col justify-start p-1 pointer-events-none">
                    <span className="text-[9px] sm:text-[10px] font-bold bg-amber-600 text-white px-1.5 py-0.5 rounded w-max shadow">
                      Crack 0.87
                    </span>
                  </div>

                  <div className="absolute top-[65%] left-[46%] w-[25%] sm:w-[22%] h-[20%] border-2 border-emerald-500 bg-emerald-500/15 rounded flex flex-col justify-start p-1 pointer-events-none">
                    <span className="text-[9px] sm:text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded w-max shadow">
                      Patch 0.76
                    </span>
                  </div>
                </div>

                <button
                  onClick={onOpenUpload}
                  className="mt-4 px-6 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white flex items-center space-x-2 shadow-lg shadow-blue-500/20"
                >
                  <Camera className="h-4 w-4" />
                  <span>Upload Image</span>
                </button>
                <p className="text-[10px] text-slate-500 mt-1">Supports JPG, PNG (Max 10MB)</p>

                <div className="flex items-center space-x-3 mt-4 pt-3 border-t border-slate-800/80 w-full overflow-x-auto pb-1">
                  {[
                    '/images/roads/road_pothole_d00.jpg',
                    '/images/roads/road_longitudinal_d20.jpg',
                    '/images/roads/road_alligator_d10.jpg',
                    '/images/roads/road_transverse_d40.jpg',
                    '/images/roads/road_repaired_fresh_asphalt.jpg'
                  ].map((thumb, idx) => (
                    <img
                      key={idx}
                      src={thumb}
                      alt="Sample"
                      onClick={() => setActiveDetectionImg(thumb)}
                      className={`w-16 h-12 sm:w-20 sm:h-14 rounded-lg object-cover cursor-pointer border-2 transition-all flex-shrink-0 ${
                        activeDetectionImg === thumb ? 'border-blue-500 scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-4">Detection Results</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-rose-500 text-white">
                          <Flame className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-rose-300">Potholes</span>
                      </div>
                      <span className="text-lg font-black text-rose-400">3</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-amber-500 text-white">
                          <Activity className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-amber-300">Cracks</span>
                      </div>
                      <span className="text-lg font-black text-amber-400">2</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-emerald-500 text-white">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-emerald-300">Patch Damage</span>
                      </div>
                      <span className="text-lg font-black text-emerald-400">1</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-indigo-500 text-white">
                          <Droplets className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-indigo-300">Other</span>
                      </div>
                      <span className="text-lg font-black text-indigo-400">0</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 mt-4">
                  <p>Inference Model: <b className="text-slate-200">YOLOv8-IndiaRoads</b></p>
                  <p>Latency: <b className="text-emerald-400">28ms</b> • TensorRT Ready</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────
            VIEW 4: ROAD ANALYSIS & RISK PREDICTION
           ─────────────────────────────────────────────────────────── */}
        {activeNav === 'analysis' && (
          <div className="p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Road Analysis & Risk Prediction</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <MapPin className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold text-slate-200">Sector 22, Chandigarh</span>
                </div>
              </div>
              <button
                onClick={() => setActiveNav('dashboard')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700"
              >
                View on Map
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Infrastructure Health Score Gauge */}
              <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center">
                <span className="text-xs uppercase font-bold text-slate-400 mb-4">Infrastructure Health Score</span>
                <div className="relative w-52 h-28 flex flex-col items-center justify-end">
                  <svg className="w-52 h-28 overflow-visible" viewBox="0 0 200 110">
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 20 100 A 80 80 0 0 1 125 35"
                      fill="none"
                      stroke="url(#gauge-gradient)"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gauge-gradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="50%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute bottom-0 text-center">
                    <span className="text-3xl font-black text-white">58</span>
                    <span className="text-sm font-semibold text-slate-400">/100</span>
                    <div className="mt-1 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                      Medium Risk
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Factors Breakdown */}
              <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <span className="text-xs uppercase font-bold text-slate-400 block mb-4">Risk Factors</span>
                <div className="space-y-3">
                  {[
                    { label: 'Pothole Severity', value: 70, color: 'bg-rose-500' },
                    { label: 'Crack Severity', value: 45, color: 'bg-amber-500' },
                    { label: 'Vehicle Vibration', value: 60, color: 'bg-yellow-500' },
                    { label: 'Traffic Exposure', value: 80, color: 'bg-blue-500' },
                    { label: 'Rainfall Vulnerability', value: 55, color: 'bg-indigo-500' },
                  ].map((rf) => (
                    <div key={rf.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{rf.label}</span>
                        <span className="text-slate-200 font-mono">{rf.value}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${rf.color} rounded-full`}
                          style={{ width: `${rf.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <span className="text-xs uppercase font-bold text-slate-400 block mb-4">Predicted Risk (Next 6 Months)</span>
                <div className="h-44 w-full relative">
                  <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                    <line x1="0" y1="130" x2="500" y2="130" stroke="#1e293b" strokeDasharray="4" />
                    <line x1="0" y1="90" x2="500" y2="90" stroke="#1e293b" strokeDasharray="4" />
                    <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeDasharray="4" />

                    <path
                      d="M 30 120 Q 150 110, 250 80 T 470 30"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3"
                    />
                    <circle cx="30" cy="120" r="4" fill="#10b981" />
                    <circle cx="120" cy="115" r="4" fill="#10b981" />
                    <circle cx="210" cy="95" r="4" fill="#f59e0b" />
                    <circle cx="300" cy="75" r="4" fill="#f59e0b" />
                    <circle cx="390" cy="50" r="4" fill="#ef4444" />
                    <circle cx="470" cy="30" r="4" fill="#ef4444" />
                  </svg>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-2 px-4">
                    <span>Nov</span>
                    <span>Dec</span>
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-slate-400 block mb-3">Prediction Result</span>
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-4">
                    <p className="text-xs font-bold text-rose-400 flex items-center space-x-1 mb-1">
                      <Flame className="h-3.5 w-3.5" />
                      <span>High Likelihood of Deterioration</span>
                    </p>
                    <p className="text-[11px] text-slate-300">
                      Projected road surface failure in next 3 months due to micro-crack propagation under heavy traffic.
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-2">Recommended Action</span>
                  <ul className="text-xs text-slate-200 space-y-1.5 list-disc pl-4">
                    <li>Patch repair within 30 days</li>
                    <li>Increased monitoring schedule</li>
                    <li>Drainage inspection before monsoon</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────
            VIEW 5: REPAIR VERIFICATION
           ─────────────────────────────────────────────────────────── */}
        {activeNav === 'repair' && (
          <div className="p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Repair Verification</h2>
                <p className="text-xs text-slate-400">
                  Dual-image comparison & AI damage clearance verification.
                </p>
              </div>
              <button
                onClick={() => setActiveNav('dashboard')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700"
              >
                View on Map
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                <div className="relative rounded-xl overflow-hidden border border-rose-500/40 h-56 sm:h-72">
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-rose-600 text-white font-bold text-xs shadow z-10">
                    Before Repair
                  </span>
                  <img
                    src="/images/roads/road_pothole_d00.jpg"
                    alt="Before Repair"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 h-56 sm:h-72">
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-emerald-600 text-white font-bold text-xs shadow z-10">
                    After Repair
                  </span>
                  <img
                    src="/images/roads/road_repaired_patch.jpg"
                    alt="After Repair"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/30 flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Repair Verified</h4>
                    <p className="text-xs text-slate-400">
                      The road surface has been significantly improved. Structural defects cleared with 96% AI confidence.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400">Location</span>
                  <p className="font-bold text-slate-200 mt-0.5">Sector 34, Chandigarh</p>
                </div>
                <div>
                  <span className="text-slate-400">Repair Date</span>
                  <p className="font-bold text-slate-200 mt-0.5">15 Oct 2026</p>
                </div>
                <div>
                  <span className="text-slate-400">Verification Date</span>
                  <p className="font-bold text-slate-200 mt-0.5">20 Oct 2026</p>
                </div>
                <div>
                  <span className="text-slate-400">Health Score Change</span>
                  <p className="font-bold text-emerald-400 mt-0.5">
                    35 ➔ 82 <span className="text-emerald-300">(+47)</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────
            VIEW 6: GIS / OTHER TABS
           ─────────────────────────────────────────────────────────── */}
        {['gis', 'reports', 'vehicles', 'settings'].includes(activeNav) && (
          <div className="p-6 max-w-6xl w-full mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto">
                <MapPin className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-white capitalize">{activeNav} Module Active</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Live synchronized GIS layer for {activeNav}. Click Dashboard to return to primary overview.
              </p>
              <button
                onClick={() => setActiveNav('dashboard')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
