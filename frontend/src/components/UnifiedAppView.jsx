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
  LogOut,
  Plus,
  Wrench,
  IndianRupee,
  Loader2
} from 'lucide-react';
import RoadMap from './RoadMap';
import MobileCollector from './MobileCollector';
import RepairAudit from './RepairAudit';
import { createRepair, resolveImageUrl } from '../services/api';

export default function UnifiedAppView({
  overview,
  roadsGeoJson,
  observations,
  repairs,
  onRefresh,
  onOpenUpload,
  onUploadSuccess = null,
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

  // Repair Task Creation Modal states
  const [isCreateRepairOpen, setIsCreateRepairOpen] = useState(false);
  const [newRepairData, setNewRepairData] = useState({
    segment_id: 'SEG-CHD-17-01',
    observation_id: null,
    road_name: 'Madhya Marg (Sector 17)',
    hazard_type: 'Pothole Emergency Resurfacing',
    priority: 'critical',
    contractor_name: 'Chandigarh Municipal Works Division',
    estimated_cost_inr: 45000,
    notes: '',
    before_image_url: '/images/roads/road_pothole_d00.jpg'
  });
  const [isCreatingRepair, setIsCreatingRepair] = useState(false);
  const [createRepairError, setCreateRepairError] = useState(null);

  const openCreateRepairModal = (prefill = {}) => {
    setNewRepairData({
      segment_id: prefill.segment_id || 'SEG-CHD-17-01',
      observation_id: prefill.observation_id || null,
      road_name: prefill.road_name || 'Madhya Marg (Sector 17)',
      hazard_type: prefill.hazard_type || 'Pothole Emergency Resurfacing',
      priority: prefill.priority || 'critical',
      contractor_name: prefill.contractor_name || 'Chandigarh Municipal Works Division',
      estimated_cost_inr: prefill.estimated_cost_inr || 45000,
      notes: prefill.notes || '',
      before_image_url: prefill.before_image_url || '/images/roads/road_pothole_d00.jpg'
    });
    setCreateRepairError(null);
    setIsCreateRepairOpen(true);
  };

  const handleCreateRepairSubmit = async (e) => {
    e.preventDefault();
    setIsCreatingRepair(true);
    setCreateRepairError(null);
    try {
      await createRepair({
        segment_id: newRepairData.segment_id,
        observation_id: newRepairData.observation_id || undefined,
        hazard_type: newRepairData.hazard_type,
        priority: newRepairData.priority,
        contractor_name: newRepairData.contractor_name,
        estimated_cost_inr: Number(newRepairData.estimated_cost_inr) || 45000,
        before_image_url: newRepairData.before_image_url || undefined,
        notes: newRepairData.notes || `Municipal repair task issued for ${newRepairData.road_name}.`
      });

      setIsCreateRepairOpen(false);
      if (onRefresh) onRefresh();
      setActiveNav('repair');
    } catch (err) {
      console.error('Failed to create repair:', err);
      setCreateRepairError(err.message || 'Failed to create repair task.');
    } finally {
      setIsCreatingRepair(false);
    }
  };

  // Live Hardware Monitoring in Mockup Widget
  const [isMockupLive, setIsMockupLive] = useState(false);
  const [mockupGps, setMockupGps] = useState({ lat: null, lng: null, speed: 0 });
  const [mockupAccel, setMockupAccel] = useState({ x: null, y: null, z: null });
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
            speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0
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
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f7faf9] text-slate-900 font-sans select-none overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────
          1. MOBILE TOP APP BAR & DRAWER (Visible on Mobile / Tablets)
         ───────────────────────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            {isMobileDrawerOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div className="flex items-center space-x-1.5">
            <span className="grid place-items-center size-6 rounded-md bg-[#0d4d41] text-emerald-200">
              <Sparkles size={12} />
            </span>
            <span className="text-lg font-black text-slate-950">Jan</span>
            <span className="text-lg font-black text-[#145547]">Drishti</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveNav('live')}
            className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center space-x-1"
          >
            <Radio className="h-3.5 w-3.5 animate-pulse text-rose-600" />
            <span>Live Telemetry</span>
          </button>

          <button
            onClick={onOpenUpload}
            className="p-2 rounded-xl bg-[#145547] text-white shadow-sm hover:bg-[#0d4339]"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Backdrop */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. SIDEBAR NAVIGATION (Desktop persistent, Mobile Slide-over)
         ───────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-60 bg-white/95 backdrop-blur-md border-r border-slate-200/90 flex flex-col justify-between z-50 transition-transform duration-200 ease-in-out shadow-xs ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo */}
          <div className="p-4 border-b border-slate-200/80">
            <div className="flex items-center space-x-2">
              <span className="grid place-items-center size-8 rounded-xl bg-[#0d4d41] text-emerald-200 shadow-xs">
                <Sparkles size={16} />
              </span>
              <div className="flex items-center space-x-1">
                <span className="text-xl font-extrabold tracking-tight text-slate-950">Jan</span>
                <span className="text-xl font-extrabold text-[#145547]">Drishti</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider mt-1">Smart City GIS & AI Studio</p>
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#f0f7f4] text-[#145547] font-bold shadow-xs border-r-2 border-[#145547]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-[#145547]' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'live' && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile */}
        <div className="p-3 border-t border-slate-200/80">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs font-bold text-[#145547]">
                AD
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900">Admin</p>
                <p className="text-[10px] text-slate-500">City Authority</p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CONTENT CONTAINER (Fully Responsive Grid)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f7faf9]">
        {/* Desktop Header */}
        <header className="hidden md:flex h-14 px-6 border-b border-slate-200/80 items-center justify-between flex-shrink-0 bg-white/90 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-lg text-slate-950">Jan</span>
              <span className="font-extrabold text-lg text-[#145547]">Drishti</span>
            </div>
            <span className="text-xs text-slate-500 border-l border-slate-200 pl-3 font-medium">
              AI-Powered Predictive Urban Infrastructure Intelligence
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Live Monitoring Quick Toggle */}
            <button
              onClick={() => setActiveNav('live')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors ${
                activeNav === 'live'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <Radio className="h-3.5 w-3.5 animate-pulse text-rose-600" />
              <span>Mobile Live Collector</span>
            </button>

            {/* Weather / Location Pill */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 text-xs text-slate-700 shadow-xs">
              <MapPin className="h-3.5 w-3.5 text-[#145547]" />
              <span className="font-semibold">Chandigarh</span>
              <span className="text-slate-300">|</span>
              <CloudSun className="h-3.5 w-3.5 text-amber-500" />
              <span>28°C Clear Sky</span>
            </div>

            <button
              onClick={onOpenUpload}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#145547] hover:bg-[#0d4339] text-white flex items-center space-x-1.5 shadow-md shadow-emerald-950/10 transition-all active:scale-98"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Report Hazard</span>
            </button>

            {/* Engineer Profile & Quick Logout */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <span className="w-5 h-5 rounded-full bg-[#145547] font-bold text-[10px] flex items-center justify-center text-white">
                  {currentUser?.avatar || 'E'}
                </span>
                <span className="font-bold text-[#145547] hidden md:inline">
                  {currentUser?.name || 'Er. Vikram Sharma'}
                </span>
                <span className="text-[9px] bg-emerald-200/60 text-[#0d4d41] px-1.5 py-0.5 rounded font-bold">
                  Engineer
                </span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 text-slate-600 transition-colors shadow-xs"
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
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 flex items-center justify-center space-x-2">
                  <span>Jan</span>
                  <span className="text-[#145547]">Drishti</span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  AI-Powered Predictive Urban Infrastructure Intelligence • From Road Data to Safer Cities
                </p>
              </div>

              {/* 5 KPI Metric Cards (Auto Wrapping for Mobile) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                {/* 1. Total Detections */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 flex items-center space-x-3 shadow-xs hover:shadow-md transition-all">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shadow-xs flex-shrink-0">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">Total Detections</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-base sm:text-lg font-black text-slate-900">{overview?.total_hazards_detected || '1,248'}</span>
                      <span className="text-[10px] text-[#145547] font-bold">+12%</span>
                    </div>
                  </div>
                </div>

                {/* 2. Potholes */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 flex items-center space-x-3 shadow-xs hover:shadow-md transition-all">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shadow-xs flex-shrink-0">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">Potholes</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-base sm:text-lg font-black text-slate-900">482</span>
                      <span className="text-[10px] text-[#145547] font-bold">+18%</span>
                    </div>
                  </div>
                </div>

                {/* 3. Cracks */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 flex items-center space-x-3 shadow-xs hover:shadow-md transition-all">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-xs flex-shrink-0">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">Cracks</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-base sm:text-lg font-black text-slate-900">436</span>
                      <span className="text-[10px] text-[#145547] font-bold">+9%</span>
                    </div>
                  </div>
                </div>

                {/* 4. Waterlogging Risk */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 flex items-center space-x-3 shadow-xs hover:shadow-md transition-all">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-[#145547] border border-emerald-100 flex items-center justify-center shadow-xs flex-shrink-0">
                    <Droplets className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">Waterlogging</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-base sm:text-lg font-black text-slate-900">192</span>
                      <span className="text-[10px] text-[#145547] font-bold">+5%</span>
                    </div>
                  </div>
                </div>

                {/* 5. Road Health Score */}
                <div className="col-span-2 sm:col-span-1 bg-white border border-emerald-200/90 rounded-2xl p-3 sm:p-3.5 flex items-center space-x-3 shadow-xs hover:shadow-md transition-all bg-[#f0f7f4]">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#145547] text-white flex items-center justify-center shadow-sm flex-shrink-0">
                    <Gauge className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#145547] block leading-tight">Health Score</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-base sm:text-lg font-black text-slate-900">
                        {overview?.city_average_health_score ? `${overview.city_average_health_score}/100` : '72/100'}
                      </span>
                      <span className="text-[10px] text-[#145547] font-bold">+6%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lower Split: City Road Map + High Risk Locations Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
                {/* Map Container */}
                <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 flex flex-col shadow-xs">
                  {/* Map Header Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-900">City Road Map</span>
                      <span className="text-[11px] text-slate-500 font-mono">(Chandigarh)</span>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] overflow-x-auto">
                      {['All Issues', 'Potholes', 'Cracks', 'Waterlogging'].map((f) => {
                        const key = f.toLowerCase().replace(' ', '');
                        const isSel = filterType === (key === 'allissues' ? 'all' : key);
                        return (
                          <button
                            key={f}
                            onClick={() => setFilterType(key === 'allissues' ? 'all' : key)}
                            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
                              isSel ? 'bg-[#145547] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#145547] transition"
                    />
                  </div>

                  {/* Leaflet Map Canvas */}
                  <div className="h-[320px] sm:h-[380px] rounded-xl overflow-hidden border border-slate-200 shadow-xs relative">
                    <RoadMap
                      geojson={roadsGeoJson}
                      observations={observations}
                      onSelectSegment={setSelectedLocation}
                      height="100%"
                    />
                  </div>
                </div>

                {/* High Risk Locations Column */}
                <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-slate-900">High Risk Locations</span>
                      <button
                        onClick={() => setActiveNav('analysis')}
                        className="text-xs text-[#145547] hover:underline font-bold"
                      >
                        View All
                      </button>
                    </div>

                    <div className="space-y-2">
                      {highRiskLocations.map((loc) => (
                        <div
                          key={loc.id}
                          onClick={() => setSelectedLocation({ name: loc.name })}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-emerald-300 hover:bg-[#f0f7f4] transition-all cursor-pointer group"
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              src={loc.thumbnail}
                              alt={loc.name}
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200 group-hover:scale-105 transition-transform shadow-xs"
                            />
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#145547] transition-colors">
                                {loc.name}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                <span className={loc.riskColor === 'rose' ? 'text-rose-600 font-bold' : 'text-amber-700 font-bold'}>
                                  {loc.issue}
                                </span>{' '}
                                • {loc.risk}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Health Score: <b className="text-slate-700 font-bold">{loc.healthScore}/100</b>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCreateRepairModal({
                                  segment_id: loc.id === 'LOC-17' ? 'SEG-CHD-17-01' : (loc.id === 'LOC-22' ? 'SEG-CHD-22-03' : 'SEG-CHD-34-02'),
                                  road_name: loc.name,
                                  hazard_type: `${loc.issue} Emergency Resurfacing`,
                                  priority: loc.riskColor === 'rose' ? 'critical' : 'high',
                                  before_image_url: loc.thumbnail
                                });
                              }}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-[#145547] text-[#145547] hover:text-white transition-colors border border-emerald-200/60 shadow-2xs"
                              title="Create Repair Task / Issue Work Order"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#145547] transition-all" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                    <div className="flex items-center space-x-2 text-rose-700 font-bold text-[11px] uppercase mb-1">
                      <Flame className="h-3.5 w-3.5" />
                      <span>Monsoon Warning</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Sector 17 & Industrial Area show critical surface fatigue under heavy vehicle traffic.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────
                RIGHT SIDEBAR: INTERACTIVE PHONE MOCKUP (WITH REAL CAMERA & SENSOR TOGGLE)
               ───────────────────────────────────────────────────────── */}
            <div className="w-full xl:w-[300px] flex-shrink-0 flex flex-col items-center justify-center py-2">
              <div className="w-full max-w-[290px] bg-[#f8faf9] border-[6px] border-slate-200/90 rounded-[40px] shadow-xl overflow-hidden flex flex-col relative h-[590px] ring-1 ring-slate-200/80">
                {/* Speaker Notch */}
                <div className="w-28 h-4 bg-slate-200 rounded-b-xl mx-auto flex items-center justify-center">
                  <div className="w-10 h-1 bg-slate-300 rounded-full" />
                </div>

                {/* Phone Header */}
                <div className="px-4 py-1.5 flex items-center justify-between border-b border-slate-200 text-xs bg-white">
                  <span className="font-bold text-[11px] text-slate-700">9:41</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-extrabold text-slate-900 text-xs">Jan</span>
                    <span className="font-extrabold text-[#145547] text-xs">Drishti</span>
                  </div>
                  <Settings className="h-3.5 w-3.5 text-slate-400" />
                </div>

                {/* Status Badges */}
                <div className="px-3 pt-2 pb-1 flex items-center justify-between text-[10px]">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#145547] border border-emerald-200 font-bold flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>{isMockupLive ? 'Hardware Live' : 'Connected'}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>{isMockupLive ? 'Live Device Sensors' : 'Standby Preview'}</span>
                  </span>
                </div>

                {/* Video / Dashcam Canvas */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-inner h-40 bg-black flex items-center justify-center">
                    {isMockupLive && mockupStream ? (
                      <video
                        ref={mockupVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center space-y-1.5">
                        <Camera className="h-7 w-7 text-slate-500" />
                        <p className="text-xs font-semibold text-slate-300">Camera Feed Inactive</p>
                        <p className="text-[10px] text-slate-500">Tap below to test rear camera and GPS sensors</p>
                      </div>
                    )}

                    {/* Live Status Pill */}
                    {isMockupLive && (
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur px-2 py-0.5 rounded text-[10px] text-emerald-400 font-mono flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>LIVE HARDWARE SENSORS</span>
                      </div>
                    )}
                  </div>

                  {/* Real-time Telemetry Sensor Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {/* Camera */}
                    <div className="bg-white border border-slate-200/90 p-2 rounded-xl flex items-center space-x-2 shadow-xs">
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-[#145547]">
                        <Camera className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold text-slate-400">Camera</p>
                        <p className="text-[10px] font-bold text-[#145547]">
                          {isMockupLive ? 'Rear Active' : 'Standby'}
                        </p>
                      </div>
                    </div>

                    {/* GPS */}
                    <div className="bg-white border border-slate-200/90 p-2 rounded-xl flex items-center space-x-2 shadow-xs">
                      <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                        <Compass className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold text-slate-400">GPS</p>
                        <p className="text-[9px] font-mono font-bold text-slate-700">
                          {mockupGps.lat !== null ? `${mockupGps.lat}, ${mockupGps.lng}` : 'Waiting for GPS'}
                        </p>
                      </div>
                    </div>

                    {/* Accelerometer */}
                    <div className="bg-white border border-slate-200/90 p-2 rounded-xl flex items-center space-x-2 shadow-xs">
                      <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                        <Activity className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold text-slate-400">IMU / Z-Shock</p>
                        <p className="text-[9px] font-mono font-bold text-slate-700">
                          {mockupAccel.x !== null ? `X:${mockupAccel.x} Y:${mockupAccel.y} Z:${mockupAccel.z}` : 'Waiting for IMU'}
                        </p>
                      </div>
                    </div>

                    {/* Speed */}
                    <div className="bg-white border border-slate-200/90 p-2 rounded-xl flex items-center space-x-2 shadow-xs">
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-[#145547]">
                        <Zap className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold text-slate-400">Speed</p>
                        <p className="text-[10px] font-bold text-slate-900">{mockupGps.speed} km/h</p>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Monitoring Action Button */}
                  <div className="mt-2 space-y-1.5">
                    <button
                      onClick={toggleMockupSensors}
                      className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-sm active:scale-98 ${
                        isMockupLive
                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      <span>{isMockupLive ? 'Stop Sensor Test' : 'Test Phone Sensors'}</span>
                    </button>
                    <button
                      onClick={() => setActiveNav('live')}
                      className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all bg-[#145547] hover:bg-[#0d4339] text-white shadow-md shadow-emerald-950/15"
                    >
                      <Radio className="h-3.5 w-3.5" />
                      <span>Launch Full Mobile Collector</span>
                    </button>
                  </div>
                </div>

                {/* Mobile Bottom Navigation Bar */}
                <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between text-[10px] text-slate-500">
                  <button onClick={() => setActiveNav('dashboard')} className="flex flex-col items-center text-[#145547] font-bold">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Home</span>
                  </button>
                  <button onClick={() => setActiveNav('detection')} className="flex flex-col items-center hover:text-slate-900">
                    <ScanSearch className="h-4 w-4" />
                    <span>Detections</span>
                  </button>
                  <button onClick={() => setActiveNav('live')} className="flex flex-col items-center hover:text-slate-900">
                    <Radio className="h-4 w-4 text-rose-600 animate-pulse" />
                    <span>Collector</span>
                  </button>
                  <button onClick={onOpenUpload} className="flex flex-col items-center hover:text-slate-900">
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
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
                  <Radio className="h-5 w-5 text-rose-600 animate-pulse" />
                  <span>Real-Time Mobile Collector & Telemetry Ingest</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Turn your phone or tablet into an automated road hazard scanner using browser camera, high-frequency GPS, and IMU shock sensors.
                </p>
              </div>
              <button
                onClick={() => setActiveNav('dashboard')}
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-[#145547] border border-slate-200/90 shadow-xs"
              >
                Back to Dashboard
              </button>
            </div>

            {/* Embedded Full Sensor Module */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-5 shadow-xs">
              <MobileCollector
                onUploadSuccess={(obs) => {
                  if (onUploadSuccess) onUploadSuccess(obs);
                  if (onRefresh) onRefresh();
                }}
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
                <h2 className="text-xl font-black text-slate-900 tracking-tight">AI Detection Studio</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Upload road images or video feeds to detect potholes, cracks, and other surface damages using YOLOv8.
                </p>
              </div>

              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                <button
                  onClick={() => setAiSubTab('image')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    aiSubTab === 'image' ? 'bg-[#145547] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Image Detection
                </button>
                <button
                  onClick={() => setAiSubTab('video')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    aiSubTab === 'video' ? 'bg-[#145547] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Video Detection
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col items-center">
                <div className="relative w-full h-[260px] sm:h-[380px] rounded-xl overflow-hidden border border-slate-300 bg-black flex items-center justify-center shadow-inner">
                  <img
                    src={activeDetectionImg}
                    alt="AI Detection Surface"
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute top-[52%] left-[16%] w-[28%] sm:w-[24%] h-[32%] border-2 border-rose-500 bg-rose-500/20 rounded flex flex-col justify-start p-1 pointer-events-none">
                    <span className="text-[9px] sm:text-[10px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded w-max shadow">
                      Pothole 0.92
                    </span>
                  </div>

                  <div className="absolute top-[42%] left-[45%] w-[25%] sm:w-[22%] h-[26%] border-2 border-amber-500 bg-amber-500/20 rounded flex flex-col justify-start p-1 pointer-events-none">
                    <span className="text-[9px] sm:text-[10px] font-black bg-amber-600 text-white px-1.5 py-0.5 rounded w-max shadow">
                      Crack 0.87
                    </span>
                  </div>

                  <div className="absolute top-[65%] left-[46%] w-[25%] sm:w-[22%] h-[20%] border-2 border-emerald-500 bg-emerald-500/20 rounded flex flex-col justify-start p-1 pointer-events-none">
                    <span className="text-[9px] sm:text-[10px] font-black bg-[#145547] text-white px-1.5 py-0.5 rounded w-max shadow">
                      Patch 0.76
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-4">
                  <button
                    onClick={onOpenUpload}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#145547] hover:bg-[#0d4339] text-white flex items-center space-x-2 shadow-md shadow-emerald-950/15 transition-all active:scale-98"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Upload Image/Video for AI Scan</span>
                  </button>
                  <button
                    onClick={() => openCreateRepairModal({
                      road_name: 'Madhya Marg (Sector 17)',
                      hazard_type: 'Pothole Emergency Resurfacing',
                      priority: 'critical',
                      before_image_url: activeDetectionImg
                    })}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white hover:bg-slate-50 text-[#145547] border border-emerald-200/90 flex items-center space-x-1.5 shadow-xs transition-all active:scale-98"
                  >
                    <Wrench className="h-4 w-4 text-[#145547]" />
                    <span>Create Repair Task</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Supports MP4, WebM, JPG, PNG • Real-time YOLOv8 & Computer Vision</p>

                <div className="flex items-center space-x-3 mt-4 pt-3 border-t border-slate-200/80 w-full overflow-x-auto pb-1">
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
                      alt="Sample road detection"
                      onClick={() => setActiveDetectionImg(thumb)}
                      className={`w-16 h-12 sm:w-20 sm:h-14 rounded-xl object-cover cursor-pointer border-2 transition-all flex-shrink-0 shadow-xs ${
                        activeDetectionImg === thumb ? 'border-[#145547] scale-105 shadow-md' : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-4">Detection Results</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-200">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-rose-600 text-white shadow-xs">
                          <Flame className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-rose-800">Potholes</span>
                      </div>
                      <span className="text-lg font-black text-rose-700">3</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-amber-600 text-white shadow-xs">
                          <Activity className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-amber-800">Cracks</span>
                      </div>
                      <span className="text-lg font-black text-amber-700">2</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-[#145547] text-white shadow-xs">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-[#145547]">Patch Damage</span>
                      </div>
                      <span className="text-lg font-black text-[#145547]">1</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-slate-700 text-white shadow-xs">
                          <Droplets className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">Other Distress</span>
                      </div>
                      <span className="text-lg font-black text-slate-700">0</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-[#f0f7f4] rounded-xl border border-emerald-200/80 text-[11px] text-slate-600 mt-4 space-y-1">
                  <p>Inference Model: <b className="text-slate-900">YOLOv8-IndiaRoads (RDD2022)</b></p>
                  <p>Latency: <b className="text-[#145547] font-bold">28ms</b> • Edge TPU / GPU Acceleration</p>
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
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Road Analysis & Risk Prediction</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <MapPin className="h-4 w-4 text-[#145547]" />
                  <span className="text-xs font-bold text-slate-700">Sector 22, Chandigarh</span>
                </div>
              </div>
              <button
                onClick={() => setActiveNav('dashboard')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-[#145547] border border-slate-200/90 shadow-xs"
              >
                View on Map
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Infrastructure Health Score Gauge */}
              <div className="md:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col items-center justify-center">
                <span className="text-xs uppercase font-bold text-slate-500 mb-4">Infrastructure Health Score</span>
                <div className="relative w-52 h-28 flex flex-col items-center justify-end">
                  <svg className="w-52 h-28 overflow-visible" viewBox="0 0 200 110">
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="#e2e8f0"
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
                        <stop offset="100%" stopColor="#145547" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute bottom-0 text-center">
                    <span className="text-3xl font-black text-slate-900">58</span>
                    <span className="text-sm font-bold text-slate-400">/100</span>
                    <div className="mt-1 px-3 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                      Medium Risk
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Factors Breakdown */}
              <div className="md:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
                <span className="text-xs uppercase font-bold text-slate-500 block mb-4">Risk Factors</span>
                <div className="space-y-3">
                  {[
                    { label: 'Pothole Severity', value: 70, color: 'bg-rose-500' },
                    { label: 'Crack Severity', value: 45, color: 'bg-amber-500' },
                    { label: 'Vehicle Vibration', value: 60, color: 'bg-yellow-500' },
                    { label: 'Traffic Exposure', value: 80, color: 'bg-blue-600' },
                    { label: 'Rainfall Vulnerability', value: 55, color: 'bg-[#145547]' },
                  ].map((rf) => (
                    <div key={rf.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 font-semibold">{rf.label}</span>
                        <span className="text-slate-900 font-bold font-mono">{rf.value}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
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
              <div className="md:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
                <span className="text-xs uppercase font-bold text-slate-500 block mb-4">Predicted Risk (Next 6 Months)</span>
                <div className="h-44 w-full relative">
                  <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                    <line x1="0" y1="130" x2="500" y2="130" stroke="#e2e8f0" strokeDasharray="4" />
                    <line x1="0" y1="90" x2="500" y2="90" stroke="#e2e8f0" strokeDasharray="4" />
                    <line x1="0" y1="50" x2="500" y2="50" stroke="#e2e8f0" strokeDasharray="4" />

                    <path
                      d="M 30 120 Q 150 110, 250 80 T 470 30"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3"
                    />
                    <circle cx="30" cy="120" r="4" fill="#145547" />
                    <circle cx="120" cy="115" r="4" fill="#145547" />
                    <circle cx="210" cy="95" r="4" fill="#f59e0b" />
                    <circle cx="300" cy="75" r="4" fill="#f59e0b" />
                    <circle cx="390" cy="50" r="4" fill="#ef4444" />
                    <circle cx="470" cy="30" r="4" fill="#ef4444" />
                  </svg>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-2 px-4 font-semibold">
                    <span>Nov</span>
                    <span>Dec</span>
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-slate-500 block mb-3">Prediction Result</span>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl mb-4">
                    <p className="text-xs font-bold text-rose-700 flex items-center space-x-1 mb-1">
                      <Flame className="h-3.5 w-3.5" />
                      <span>High Likelihood of Deterioration</span>
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Projected road surface failure in next 3 months due to micro-crack propagation under heavy traffic.
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-500 block mb-2">Recommended Action</span>
                  <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4 font-medium">
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
            VIEW 5: REPAIR VERIFICATION & WORK ORDERS
           ─────────────────────────────────────────────────────────── */}
        {activeNav === 'repair' && (
          <div className="p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-6">
            <RepairAudit
              repairs={repairs}
              onRefresh={onRefresh}
              onOpenCreateRepair={(prefill) => openCreateRepairModal(prefill)}
            />
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────
            VIEW 6: GIS / OTHER TABS
           ─────────────────────────────────────────────────────────── */}
        {activeNav === 'gis' && (
          <div className="p-6 max-w-6xl w-full mx-auto space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Accepted Reports on GIS</h3>
              <p className="text-xs text-slate-500 font-medium">Citizen reports appear as geotagged pins alongside verified inspection detections.</p>
            </div>
            <div className="h-[620px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs">
              <RoadMap geojson={roadsGeoJson} observations={observations} height="100%" />
            </div>
          </div>
        )}

        {activeNav === 'reports' && (
          <div className="p-6 max-w-6xl w-full mx-auto space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Citizen Reports & Live Video Inspections</h3>
                <p className="text-xs text-slate-500 font-medium">Verified field uploads with GPS coordinates, OpenCV frames, and YOLOv8 defect detections.</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openCreateRepairModal()}
                  className="text-xs font-bold px-3.5 py-2 rounded-xl bg-[#145547] hover:bg-[#0d4339] text-white shadow-md shadow-emerald-950/15 flex items-center space-x-1.5 transition active:scale-98"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Repair Task</span>
                </button>
                <button
                  onClick={onRefresh}
                  className="text-xs font-bold px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition"
                >
                  Refresh
                </button>
              </div>
            </div>
            <div className="grid gap-3.5 md:grid-cols-2">
              {observations.filter(o => o.report_status === 'accepted' || o.report_source === 'citizen' || o.video_url || o.video_id).map(report => {
                const detection = report.detections?.[0] || {};
                const isVideo = Boolean(report.video_url || report.video_id);
                const displayImg = resolveImageUrl(report.annotated_image_url || report.image_url);

                return (
                  <div key={report.report_id || report.observation_id} className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="relative w-28 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-xs shrink-0">
                        <img
                          src={displayImg}
                          alt="Citizen road report"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.onerror = null; e.target.src = '/images/roads/road_pothole_d00.jpg'; }}
                        />
                        {isVideo && (
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-white font-bold text-[9px] flex items-center space-x-1 shadow">
                            <Video className="w-2.5 h-2.5 text-purple-400" />
                            <span>Video</span>
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 text-xs flex-1">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <p className="font-bold text-slate-900 truncate">
                            {detection.class_name ? `${detection.class_name} (${detection.class_id || 'RDD'})` : (isVideo ? 'Video Inspection' : 'Road Hazard')}
                          </p>
                          <span className="text-[#145547] text-[10px] font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                            Accepted
                          </span>
                        </div>
                        <p className="text-slate-500 truncate mt-0.5">{report.matched_road_name || report.sector || 'GPS field location'}</p>
                        <p className="text-slate-400 text-[10px]">{new Date(report.captured_at || report.created_at || Date.now()).toLocaleString()}</p>
                        <p className="font-mono text-[9px] text-slate-400 truncate">{report.report_id || report.observation_id}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[#145547] font-bold text-[10px]">
                            {(detection.severity || 'medium').toUpperCase()} • {Math.round((detection.confidence || 0.88) * 100)}% conf
                          </span>
                          {detection.estimated_area_sqm && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              Area: {detection.estimated_area_sqm} m²
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar for Developers & Municipal Engineers */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {report.linked_segment_id ? `Linked: ${report.linked_segment_id}` : 'GPS Snapped Segment'}
                      </span>
                      <button
                        onClick={() => openCreateRepairModal({
                          segment_id: report.linked_segment_id || 'SEG-CHD-17-01',
                          observation_id: report.observation_id,
                          road_name: report.matched_road_name || report.sector || 'Chandigarh Urban Road',
                          hazard_type: detection.class_name ? `${detection.class_name} Repair` : 'Road Resurfacing',
                          priority: (detection.severity || 'medium').toLowerCase() === 'critical' ? 'critical' : 'high',
                          before_image_url: report.annotated_image_url || report.image_url
                        })}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-[#145547] text-[#145547] hover:text-white border border-emerald-200/70 text-[11px] font-bold transition flex items-center space-x-1 shadow-2xs"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>Issue Repair Work Order</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {observations.filter(o => o.report_status === 'accepted' || o.report_source === 'citizen' || o.video_url || o.video_id).length === 0 && (
                <div className="md:col-span-2 p-8 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500 shadow-xs">
                  No accepted road reports or video inspections yet.
                </div>
              )}
            </div>
          </div>
        )}

        {['vehicles', 'settings'].includes(activeNav) && (
          <div className="p-6 max-w-6xl w-full mx-auto space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-[#f0f7f4] text-[#145547] border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                <MapPin className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900 capitalize">{activeNav} Module Active</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Live synchronized GIS layer for {activeNav}. Click Dashboard to return to primary overview.
              </p>
              <button
                onClick={() => setActiveNav('dashboard')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#145547] hover:bg-[#0d4339] text-white shadow-md shadow-emerald-950/15"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CREATE REPAIR TASK / ISSUE WORK ORDER
         ───────────────────────────────────────────────────────────── */}
      {isCreateRepairOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-[#f0f7f4]">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-[#145547] text-white shadow-xs">
                  <Wrench className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Create Municipal Repair Task</h3>
                  <p className="text-[11px] text-slate-500">Issue work order & prioritize road resurfacing</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateRepairOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateRepairSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {createRepairError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {createRepairError}
                </div>
              )}

              {/* Road Segment Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Target Road Segment / Location
                </label>
                <select
                  value={newRepairData.segment_id}
                  onChange={(e) => {
                    const segId = e.target.value;
                    const nameMap = {
                      'SEG-CHD-17-01': 'Madhya Marg (Sector 17)',
                      'SEG-CHD-22-03': 'Jan Marg (Sector 22)',
                      'SEG-CHD-34-02': 'Himalaya Marg (Sector 34)',
                      'SEG-CHD-IND-01': 'Industrial Area Phase 1 Road',
                      'SEG-CHD-GEN-01': 'Dakshin Marg (Sector 35/43)'
                    };
                    setNewRepairData(prev => ({
                      ...prev,
                      segment_id: segId,
                      road_name: nameMap[segId] || 'Chandigarh Urban Road'
                    }));
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 font-medium"
                >
                  <option value="SEG-CHD-17-01">Madhya Marg (Sector 17) - High Priority</option>
                  <option value="SEG-CHD-22-03">Jan Marg (Sector 22) - Medium Priority</option>
                  <option value="SEG-CHD-34-02">Himalaya Marg (Sector 34) - Monitored</option>
                  <option value="SEG-CHD-IND-01">Industrial Area Phase 1 - High Priority</option>
                  <option value="SEG-CHD-GEN-01">Dakshin Marg (Sector 35/43)</option>
                </select>
              </div>

              {/* Hazard Type & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Hazard / Task Type</label>
                  <select
                    value={newRepairData.hazard_type}
                    onChange={(e) => setNewRepairData(prev => ({ ...prev, hazard_type: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 font-medium"
                  >
                    <option value="Pothole Emergency Resurfacing">Pothole Emergency Resurfacing</option>
                    <option value="Alligator Crack Seal & Patch">Alligator Crack Seal & Patch</option>
                    <option value="Longitudinal Joint Sealing">Longitudinal Joint Sealing</option>
                    <option value="Transverse Crack Repair">Transverse Crack Repair</option>
                    <option value="Full Depth Asphalt Patch">Full Depth Asphalt Patch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Priority Level</label>
                  <select
                    value={newRepairData.priority}
                    onChange={(e) => setNewRepairData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 font-medium"
                  >
                    <option value="critical">Critical (Immediate Repair)</option>
                    <option value="high">High (Within 48 Hours)</option>
                    <option value="medium">Medium (Within 7 Days)</option>
                    <option value="low">Low (Routine Maintenance)</option>
                  </select>
                </div>
              </div>

              {/* Contractor & Estimated Budget */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Assigned Contractor</label>
                  <select
                    value={newRepairData.contractor_name}
                    onChange={(e) => setNewRepairData(prev => ({ ...prev, contractor_name: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 font-medium"
                  >
                    <option value="Chandigarh Municipal Works Division">Chandigarh Municipal Works Division</option>
                    <option value="Northern Highway Infrastructure Ltd">Northern Highway Infrastructure Ltd</option>
                    <option value="Punjab PWD Road Maintenance Cell">Punjab PWD Road Maintenance Cell</option>
                    <option value="Tri-City Smart Highway Concessionaires">Tri-City Smart Highway Concessionaires</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Estimated Budget (INR ₹)</label>
                  <input
                    type="number"
                    value={newRepairData.estimated_cost_inr}
                    onChange={(e) => setNewRepairData(prev => ({ ...prev, estimated_cost_inr: Number(e.target.value) }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 font-mono font-medium"
                  />
                </div>
              </div>

              {/* Linked Defect / Before Photo Preview */}
              {newRepairData.before_image_url && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-600 block">Linked AI Hazard Observation Photo:</span>
                  <img
                    src={resolveImageUrl(newRepairData.before_image_url)}
                    alt="Hazard"
                    className="w-full h-28 object-cover rounded-lg border border-slate-200"
                  />
                  {newRepairData.observation_id && (
                    <span className="text-[10px] font-mono text-slate-500">Observation ID: {newRepairData.observation_id}</span>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Engineer Work Order Notes</label>
                <textarea
                  rows="2"
                  value={newRepairData.notes}
                  onChange={(e) => setNewRepairData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Rapid cold-mix patch required prior to evening commuter rush..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateRepairOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRepair}
                  className="px-5 py-2 rounded-xl bg-[#145547] hover:bg-[#0d4339] text-white font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-950/15 disabled:opacity-50"
                >
                  {isCreatingRepair ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isCreatingRepair ? 'Creating Work Order...' : 'Issue Work Order'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
