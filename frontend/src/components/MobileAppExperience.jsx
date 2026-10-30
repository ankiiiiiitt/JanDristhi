import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  MapPin,
  Play,
  Square,
  Compass,
  Zap,
  Activity,
  Flame,
  XCircle,
  Droplets,
  CheckCircle2,
  FileText,
  User,
  Eye,
  EyeOff,
  Bell,
  Search,
  Filter,
  Sliders,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Plus,
  BarChart2,
  Settings,
  Layers,
  Sparkles,
  Phone,
  Mail,
  Lock,
  LogOut,
  Maximize2,
  ShieldCheck,
  Check,
  UploadCloud,
  RotateCcw,
  Loader2
} from 'lucide-react';
import RoadMap from './RoadMap';
import { uploadObservation } from '../services/api';

export default function MobileAppExperience({
  overview,
  roadsGeoJson,
  observations,
  repairs,
  onRefresh,
  onOpenUpload
}) {
  // ── AUTH & ROLE STATE ──
  // role: 'user' | 'developer'
  const [role, setRole] = useState('user');
  // authScreen: 'login' | 'signup' | 'app'
  const [authScreen, setAuthScreen] = useState('app');
  const [currentUser, setCurrentUser] = useState({
    name: 'Rohit Kumar',
    email: 'rohit.kumar@chandigarh.gov.in',
    phone: '+91 98765 43210',
    avatar: 'R'
  });

  // Login & Signup Form states
  const [loginEmail, setLoginEmail] = useState('rohit@jandrishti.in');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // ── NAVIGATION TABS ──
  // User App Tabs: 'home' | 'map' | 'record' | 'reports' | 'profile'
  const [userTab, setUserTab] = useState('home');
  // Developer App Tabs: 'dashboard' | 'map' | 'detection' | 'analysis' | 'verification'
  const [devTab, setDevTab] = useState('dashboard');

  // ── USER APP: LIVE RECORDING STATE ──
  const [recordMode, setRecordMode] = useState('video'); // 'video' | 'photo'
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingSaved, setRecordingSaved] = useState(false);
  const [photoFlash, setPhotoFlash] = useState(false);
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessData, setUploadSuccessData] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const userVideoRef = useRef(null);

  // ── DEVELOPER APP: AI DETECTION & SLIDER STATE ──
  const [aiMode, setAiMode] = useState('live'); // 'live' | 'upload'
  const [devDetectionImg, setDevDetectionImg] = useState('/images/roads/road_pothole_d00.jpg');
  const [repairTab, setRepairTab] = useState('comparison'); // 'before' | 'after' | 'comparison'
  const [repairVerified, setRepairVerified] = useState(true);

  // Format timer MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `00:${m}:${s}`;
  };

  // Real GPS Geolocation State
  const [userCoords, setUserCoords] = useState({
    lat: 30.7450,
    lng: 76.7760,
    accuracy: 12,
    city: 'Detecting Location...',
    isReal: false
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setUserCoords({
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy || 10),
            city: 'Live Location',
            isReal: true
          });

          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            .then(r => r.json())
            .then(data => {
              const detectedCity = data.address?.city || data.address?.town || data.address?.suburb || data.address?.state_district || 'Live Location';
              setUserCoords(prev => ({ ...prev, city: detectedCity }));
            })
            .catch(() => {});
        },
        (err) => {
          console.warn('MobileAppExperience GPS unavailable:', err);
          setUserCoords(prev => ({ ...prev, city: 'Chandigarh' }));
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // Start / Stop camera in user record tab
  const toggleRecording = async () => {
    if (recordMode === 'photo') {
      setPhotoFlash(true);
      setPhotoCaptured(true);
      setRecordingSaved(false);
      setUploadSuccessData(null);
      setUploadError(null);
      setTimeout(() => setPhotoFlash(false), 300);
      return;
    }

    if (isRecording) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
      }
      setIsRecording(false);
      setRecordingSaved(true);
      setUploadSuccessData(null);
      setUploadError(null);
      return;
    }

    // Reset and start recording
    setRecordingSeconds(0);
    setRecordingSaved(false);
    setPhotoCaptured(false);
    setUploadSuccessData(null);
    setUploadError(null);
    setIsRecording(true);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        setCameraStream(stream);
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
      }
    } catch (e) {
      console.warn("Camera access failed or running in preview mode:", e);
    }
  };

  const handleQuickUpload = async () => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      const imgRes = await fetch('/images/roads/road_pothole_d00.jpg');
      const blob = await imgRes.blob();
      formData.append('file', blob, 'road_hazard_recording.jpg');
      formData.append('vehicle_id', currentUser?.phone ? `MOB-${currentUser.phone.slice(-4)}` : 'CTU-BUS-104');
      const finalLat = userCoords.lat ? userCoords.lat.toFixed(5) : '30.7450';
      const finalLng = userCoords.lng ? userCoords.lng.toFixed(5) : '76.7760';
      const finalSector = userCoords.isReal ? (userCoords.city || 'My Location') : 'Sector 17';

      formData.append('latitude', finalLat);
      formData.append('longitude', finalLng);
      formData.append('sector', finalSector);
      formData.append('speed_kmph', '34.5');
      formData.append('telemetry_z_shock', '3.1');

      const res = await uploadObservation(formData);
      if (res.success && res.data) {
        setUploadSuccessData(res.data);
      } else {
        setUploadError('Upload failed. Please check backend connection.');
      }
    } catch (err) {
      console.error('Quick upload error:', err);
      setUploadError(err.message || 'Network error uploading hazard');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (userVideoRef.current && cameraStream) {
      userVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, userTab]);

  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const handleLogin = (e) => {
    e?.preventDefault();
    setCurrentUser({
      name: role === 'user' ? 'Rohit Kumar' : 'Admin Developer',
      email: loginEmail,
      phone: '+91 98765 43210',
      avatar: role === 'user' ? 'R' : 'A'
    });
    setAuthScreen('app');
  };

  const handleSignup = (e) => {
    e?.preventDefault();
    setCurrentUser({
      name: signupName || 'New Citizen User',
      email: signupEmail || 'citizen@chandigarh.gov.in',
      phone: signupPhone || '+91 98888 12345',
      avatar: (signupName || 'N')[0].toUpperCase()
    });
    setAuthScreen('app');
  };

  // ── BRAND COLORS PER ROLE ──
  // User: Emerald / Green themed
  // Developer: Purple / Indigo themed
  const accentGradient = role === 'user'
    ? 'from-emerald-500 to-teal-400'
    : 'from-purple-600 to-indigo-500';
  const accentButton = role === 'user'
    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
    : 'bg-purple-600 hover:bg-purple-500 text-white font-bold';

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-start p-0 sm:py-6 sm:px-4">
      {/* ─────────────────────────────────────────────────────────────
          TOP ROLE SWITCHER BAR (Always allows switching Role & Auth)
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-md bg-[#0c1427] border-b sm:border border-slate-800 sm:rounded-2xl p-2.5 mb-2 sm:mb-4 flex items-center justify-between shadow-xl z-30">
        <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => { setRole('user'); }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              role === 'user'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            User App
          </button>
          <button
            onClick={() => { setRole('developer'); }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              role === 'developer'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Developer App
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {authScreen === 'app' ? (
            <button
              onClick={() => setAuthScreen('login')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center space-x-1 border border-slate-700"
            >
              <LogOut className="h-3 w-3" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => setAuthScreen('app')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center space-x-1 border border-slate-700"
            >
              <span>Skip to App</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PHONE CONTAINER SHELL (Matches screenshot exactly)
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-md bg-[#0b1120] sm:border-4 sm:border-slate-800 sm:rounded-[40px] shadow-2xl flex flex-col min-h-screen sm:min-h-[780px] sm:max-h-[850px] relative overflow-hidden ring-1 ring-slate-700/50">

        {/* Status Bar (9:41, WiFi, Battery) */}
        <div className="pt-2 px-6 pb-1 flex items-center justify-between text-xs text-slate-400 font-semibold select-none z-20">
          <span>9:41</span>
          <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto hidden sm:block" />
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px]">5G</span>
            <div className="w-4 h-2.5 border border-slate-400 rounded-sm p-0.5 flex items-center">
              <div className="w-full h-full bg-slate-300 rounded-2xs" />
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            1. AUTHENTICATION SCREENS (LOGIN & SIGNUP)
           ═════════════════════════════════════════════════════════════ */}
        {authScreen === 'login' && (
          <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto">
            {/* Header Hero Image & Brand */}
            <div className="text-center mt-2">
              <div className="w-24 h-24 mx-auto mb-3 rounded-2xl overflow-hidden border border-slate-700 shadow-lg relative">
                <img
                  src="/images/roads/road_pothole_d00.jpg"
                  alt="City Heritage"
                  className="w-full h-full object-cover filter brightness-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              </div>

              <div className="flex items-center justify-center space-x-1.5">
                <span className="text-2xl font-black text-white">Jan</span>
                <span className={`text-2xl font-black ${role === 'user' ? 'text-emerald-400' : 'text-purple-400'}`}>
                  Drishti
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Safer Roads • Smarter Cities</p>

              {/* User vs Developer Mode Pill Switcher */}
              <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl mt-4 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    role === 'user'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  User
                </button>
                <button
                  type="button"
                  onClick={() => setRole('developer')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    role === 'developer'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Developer
                </button>
              </div>
            </div>

            {/* Login Card */}
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 my-4 shadow-xl">
              <div className="text-center mb-4">
                <h3 className="text-base font-bold text-white">Login</h3>
                <p className="text-[11px] text-slate-400">
                  {role === 'user' ? 'Continue to report and explore road issues' : 'Access admin and analysis tools'}
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                {/* Email / Phone Input */}
                <div className="space-y-1">
                  <div className="relative flex items-center">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3" />
                    <input
                      type="text"
                      placeholder="Email or Phone"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <div className="relative flex items-center">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <label className="flex items-center space-x-1.5 text-slate-400 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded bg-slate-950 border-slate-800 text-blue-600" />
                    <span>Remember me</span>
                  </label>
                  <button type="button" className="text-blue-400 hover:underline">
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-xl text-xs shadow-lg transition-all mt-2 ${
                    role === 'user'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-emerald-500/20'
                      : 'bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-purple-600/30'
                  }`}
                >
                  Login
                </button>
              </form>

              <div className="text-center text-[11px] text-slate-400 mt-3">
                Don't have an account?{' '}
                <button
                  onClick={() => setAuthScreen('signup')}
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Sign Up
                </button>
              </div>

              <div className="relative my-4 text-center">
                <hr className="border-slate-800" />
                <span className="bg-slate-900 px-2 text-[10px] text-slate-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  or
                </span>
              </div>

              {/* Social Login Options */}
              <div className="space-y-2">
                <button
                  onClick={handleLogin}
                  className="w-full py-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800/60 text-xs font-medium text-slate-200 flex items-center justify-center space-x-2"
                >
                  <span className="font-bold text-red-400">G</span>
                  <span>Continue with Google</span>
                </button>
                <button
                  onClick={handleLogin}
                  className="w-full py-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800/60 text-xs font-medium text-slate-200 flex items-center justify-center space-x-2"
                >
                  <Phone className="h-3.5 w-3.5 text-blue-400" />
                  <span>Continue with Phone</span>
                </button>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-500">
              By logging in, you agree to our Terms & Privacy Policy
            </div>
          </div>
        )}

        {/* ── SIGNUP SCREEN ── */}
        {authScreen === 'signup' && (
          <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto">
            <div className="text-center mt-2">
              <div className="flex items-center justify-center space-x-1.5">
                <span className="text-2xl font-black text-white">Jan</span>
                <span className="text-2xl font-black text-emerald-400">Drishti</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Safer Roads • Smarter Cities</p>

              {/* User vs Developer Selector */}
              <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl mt-3 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                    role === 'user' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  User
                </button>
                <button
                  type="button"
                  onClick={() => setRole('developer')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                    role === 'developer' ? 'bg-purple-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Developer
                </button>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 my-3 shadow-xl">
              <div className="text-center mb-3">
                <h3 className="text-base font-bold text-white">Create Account</h3>
                <p className="text-[11px] text-slate-400">Join to make your city's roads safer</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-2.5">
                <div className="relative flex items-center">
                  <User className="h-4 w-4 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="relative flex items-center">
                  <Phone className="h-4 w-4 text-slate-400 absolute left-3" />
                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="relative flex items-center">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3" />
                  <input
                    type="email"
                    placeholder="Email (Optional)"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="relative flex items-center">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all mt-2 ${
                    role === 'user' ? 'bg-emerald-500 text-slate-950' : 'bg-purple-600 text-white'
                  }`}
                >
                  Sign Up
                </button>
              </form>

              <div className="text-center text-[11px] text-slate-400 mt-3">
                Already have an account?{' '}
                <button
                  onClick={() => setAuthScreen('login')}
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Login
                </button>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-500">
              By signing up, you agree to our Terms & Conditions
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            2. USER APP EXPERIENCE (Simple, Field Monitoring, Record & Map)
           ═════════════════════════════════════════════════════════════ */}
        {authScreen === 'app' && role === 'user' && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* User Header */}
            <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-slate-800/80 bg-[#0c1427]/80">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center font-bold text-xs text-emerald-300">
                  {currentUser.avatar}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Hello</p>
                  <p className="text-xs font-bold text-white">{currentUser.name}</p>
                </div>
              </div>

              {/* Weather & Location Pill */}
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                <MapPin className={`h-3 w-3 ${userCoords.isReal ? 'text-blue-400 animate-pulse' : 'text-emerald-400'}`} />
                <span className="font-semibold max-w-[120px] truncate">{userCoords.city || 'Chandigarh'}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{userCoords.isReal ? 'Live GPS' : '28°C Clear'}</span>
              </div>
            </div>

            {/* User Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* TAB: USER HOME */}
              {userTab === 'home' && (
                <>
                  {/* Start Recording Big Action Card */}
                  <div
                    onClick={() => setUserTab('record')}
                    className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 flex items-center justify-between cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-98 transition-transform"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center">
                        <Camera className="h-6 w-6 text-slate-950" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-950">Start Recording</h4>
                        <p className="text-[11px] text-slate-900/80 font-medium">
                          Capture road video or photo to detect potholes and cracks
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-950" />
                  </div>

                  {/* Two Quick Shortcuts: View Map & My Reports */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setUserTab('map')}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center space-x-3 transition-colors"
                    >
                      <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">View Map</p>
                        <p className="text-[10px] text-slate-400">See reported</p>
                      </div>
                    </div>

                    <div
                      onClick={() => setUserTab('reports')}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center space-x-3 transition-colors"
                    >
                      <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">My Reports</p>
                        <p className="text-[10px] text-slate-400">View your history</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Reports List */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-white">Recent Reports</h4>
                      <button onClick={() => setUserTab('reports')} className="text-[11px] text-emerald-400 font-semibold hover:underline">
                        See All &gt;
                      </button>
                    </div>

                    <div className="space-y-2">
                      {[
                        { title: 'Pothole', loc: 'Sector 17, Chandigarh', time: '2 min ago', status: 'Submitted', img: '/images/roads/road_pothole_d00.jpg' },
                        { title: 'Crack', loc: 'Sector 22, Chandigarh', time: '20 min ago', status: 'Submitted', img: '/images/roads/road_longitudinal_d20.jpg' },
                        { title: 'Patch Damage', loc: 'Sector 34, Chandigarh', time: '1 hour ago', status: 'Submitted', img: '/images/roads/road_alligator_d10.jpg' }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                          <div className="flex items-center space-x-2.5">
                            <img src={item.img} alt={item.title} className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                            <div>
                              <p className="text-xs font-bold text-white">{item.title}</p>
                              <p className="text-[10px] text-slate-400">{item.loc}</p>
                              <span className="text-[9px] text-emerald-400 font-semibold flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                <span>{item.status}</span>
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* TAB: USER RECORD SCREEN (Matches Live Record mockup in screenshot) */}
              {userTab === 'record' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setUserTab('home')} className="p-1 rounded-lg text-slate-400 hover:text-white">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="text-xs font-bold text-white">Record</span>
                    <button className="p-1 text-slate-400 hover:text-white">
                      <Zap className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Camera Canvas with Live Stream or Mock View */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black h-72 flex items-center justify-center shadow-2xl">
                    {cameraStream ? (
                      <video ref={userVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    ) : (
                      <img src="/images/roads/road_pothole_d00.jpg" alt="Road Surface" className="w-full h-full object-cover" />
                    )}

                    {/* Real-time Bounding Box Simulation */}
                    <div className="absolute top-[45%] left-[25%] w-[45%] h-[32%] border-2 border-rose-500 bg-rose-500/20 rounded-lg flex flex-col justify-start p-1 pointer-events-none">
                      <span className="text-[9px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded w-max">
                        Pothole 0.87
                      </span>
                    </div>

                    {/* Zoom pill */}
                    <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/60 border border-slate-700 text-[10px] font-bold text-white">
                      1x
                    </div>
                  </div>

                  {/* Mode Toggle (Video / Photo) */}
                  <div className="flex items-center justify-center space-x-2 bg-slate-900 p-1 rounded-xl max-w-[200px] mx-auto border border-slate-800">
                    <button
                      onClick={() => setRecordMode('video')}
                      className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${
                        recordMode === 'video' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Video
                    </button>
                    <button
                      onClick={() => setRecordMode('photo')}
                      className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${
                        recordMode === 'photo' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Photo
                    </button>
                  </div>

                  {/* Shutter / Record Trigger Button */}
                  <div className="flex items-center justify-center py-2">
                    <button
                      onClick={toggleRecording}
                      title={recordMode === 'video' ? (isRecording ? "Stop Recording" : "Start Recording") : "Capture Photo"}
                      className={`w-16 h-16 rounded-full border-4 ${isRecording ? 'border-rose-500/50' : 'border-slate-700'} p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl`}
                    >
                      <div className={`w-full h-full rounded-full ${isRecording ? 'bg-rose-600 animate-pulse' : 'bg-red-500'} flex items-center justify-center shadow-lg`}>
                        {recordMode === 'video' ? (
                          isRecording ? <Square className="h-5 w-5 text-white" /> : <div className="w-6 h-6 rounded-full bg-white" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white" />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Timer & Indicator */}
                  <div className="text-center text-xs">
                    {recordMode === 'video' ? (
                      isRecording ? (
                        <span className="text-rose-400 font-bold flex items-center justify-center space-x-1.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          <span>Recording... {formatTime(recordingSeconds)}</span>
                        </span>
                      ) : recordingSaved && recordingSeconds > 0 ? (
                        <span className="text-emerald-400 font-bold flex items-center justify-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>Recorded ({formatTime(recordingSeconds)}) • Ready to Upload</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium flex items-center justify-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-500" />
                          <span>Ready to Record • Tap button to start</span>
                        </span>
                      )
                    ) : (
                      <span className="text-slate-300 font-medium flex items-center justify-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{photoCaptured ? "Photo Snapped • Ready to Upload" : "Photo Mode • Tap shutter button to capture"}</span>
                      </span>
                    )}
                  </div>

                  {/* POST-RECORDING / POST-PHOTO ACTION PANEL WITH DIRECT UPLOAD */}
                  {((recordingSaved && recordingSeconds > 0) || photoCaptured) && (
                    <div className="bg-slate-900/95 border border-emerald-500/30 rounded-2xl p-3.5 space-y-3 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-200 mt-2">
                      {uploadSuccessData ? (
                        <div className="space-y-2 text-center py-1">
                          <div className="inline-flex items-center space-x-1.5 text-emerald-400 font-bold text-xs bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Road Hazard Uploaded & Logged!</span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Observation ID: <span className="font-mono text-emerald-300 font-semibold">{uploadSuccessData.observation_id}</span>
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Location: {uploadSuccessData.matched_road_name || 'Madhya Marg (Sector 17)'}
                          </p>
                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              onClick={() => setUserTab('map')}
                              className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow"
                            >
                              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                              <span>View on Map</span>
                            </button>
                            <button
                              onClick={() => {
                                setRecordingSaved(false);
                                setPhotoCaptured(false);
                                setRecordingSeconds(0);
                                setUploadSuccessData(null);
                              }}
                              className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-lg"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>New Inspection</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>
                                {recordMode === 'video' ? `Session (${formatTime(recordingSeconds)})` : 'Photo Snapshot'}
                              </span>
                            </div>
                            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-bold border border-rose-500/30">
                              Pothole (D00) · 87% Conf.
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-emerald-400" />
                              <span>Sector 17 (30.745°N, 76.776°E)</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Activity className="w-3 h-3 text-amber-400" />
                              <span>36 km/h • 2.8g Z-Shock</span>
                            </div>
                          </div>

                          {uploadError && (
                            <p className="text-[10px] text-rose-400 text-center font-medium bg-rose-500/10 py-1 rounded">
                              {uploadError}
                            </p>
                          )}

                          <div className="space-y-2 pt-0.5">
                            <button
                              onClick={handleQuickUpload}
                              disabled={isUploading}
                              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 active:scale-[0.98] disabled:opacity-50"
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                                  <span>Uploading & Snapping to Road...</span>
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="w-4 h-4 text-slate-950" />
                                  <span>Upload & Log Hazard to JanDrishti</span>
                                </>
                              )}
                            </button>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setRecordingSaved(false);
                                  setPhotoCaptured(false);
                                  setRecordingSeconds(0);
                                  setUploadError(null);
                                }}
                                disabled={isUploading}
                                className="flex-1 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] font-semibold transition-all flex items-center justify-center space-x-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Discard</span>
                              </button>
                              <button
                                onClick={onOpenUpload}
                                disabled={isUploading}
                                className="flex-1 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold transition-all flex items-center justify-center space-x-1 border border-slate-700/50"
                              >
                                <Sliders className="w-3 h-3" />
                                <span>Edit Telemetry</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: USER MAP SCREEN (Matches Live Map in screenshot) */}
              {userTab === 'map' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setUserTab('home')} className="p-1 rounded-lg text-slate-400 hover:text-white">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="text-xs font-bold text-white">Live Map</span>
                    <button onClick={onOpenUpload} className="p-1 text-emerald-400 hover:text-white">
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Search inside map */}
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search location..."
                      className="w-full bg-slate-900 border border-slate-800 text-xs rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  {/* Map / Satellite Toggle */}
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950">
                      Map
                    </button>
                    <button className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800">
                      Satellite
                    </button>
                  </div>

                  {/* Interactive Leaflet Map */}
                  <div className="h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-800 relative shadow-xl">
                    <RoadMap
                      geojson={roadsGeoJson}
                      observations={observations}
                      userLocation={userCoords}
                      height="100%"
                    />
                  </div>

                  {/* Reported Issues Quick Stats */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">Reported Issues</span>
                      <span className="text-[10px] text-emerald-400 font-semibold cursor-pointer">View All</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="flex items-center space-x-2">
                          <Flame className="h-3.5 w-3.5 text-rose-500" />
                          <span>Pothole</span>
                        </span>
                        <b className="text-white">48</b>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="flex items-center space-x-2">
                          <Activity className="h-3.5 w-3.5 text-amber-500" />
                          <span>Crack</span>
                        </span>
                        <b className="text-white">32</b>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="flex items-center space-x-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Patch Damage</span>
                        </span>
                        <b className="text-white">18</b>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: USER REPORTS */}
              {userTab === 'reports' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setUserTab('home')} className="p-1 rounded-lg text-slate-400 hover:text-white">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="text-xs font-bold text-white">My Hazard Reports</span>
                    <span />
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { id: 'REP-01', type: 'Pothole', sector: 'Sector 17', status: 'Under Review', score: '32/100', color: 'text-rose-400' },
                      { id: 'REP-02', type: 'Crack Propagation', sector: 'Sector 22', status: 'Work Scheduled', score: '58/100', color: 'text-amber-400' },
                      { id: 'REP-03', type: 'Resurfacing Patch', sector: 'Sector 34', status: 'Verified Fixed', score: '82/100', color: 'text-emerald-400' },
                    ].map(r => (
                      <div key={r.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">{r.type}</p>
                          <p className="text-[10px] text-slate-400">{r.sector} • ID: {r.id}</p>
                          <span className="text-[10px] font-semibold text-emerald-400 mt-1 block">{r.status}</span>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-bold ${r.color}`}>HS: {r.score}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: USER PROFILE */}
              {userTab === 'profile' && (
                <div className="space-y-4 text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mx-auto flex items-center justify-center text-xl font-bold text-emerald-300">
                    {currentUser.avatar}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{currentUser.name}</h3>
                    <p className="text-xs text-slate-400">{currentUser.email}</p>
                    <p className="text-xs text-slate-400">{currentUser.phone}</p>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-left text-xs space-y-2">
                    <p className="text-slate-400">Total Hazards Reported: <b className="text-white">14</b></p>
                    <p className="text-slate-400">Verified Cleared: <b className="text-emerald-400">9</b></p>
                    <p className="text-slate-400">Contribution Rank: <b className="text-amber-400">Top 5% Citizen</b></p>
                  </div>

                  <button
                    onClick={() => setAuthScreen('login')}
                    className="w-full py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* User Bottom Navigation Bar (Home, Map, Floating Record, Reports, Profile) */}
            <div className="bg-[#0c1427] border-t border-slate-800/80 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400 relative">
              <button
                onClick={() => setUserTab('home')}
                className={`flex flex-col items-center space-y-0.5 ${userTab === 'home' ? 'text-emerald-400 font-bold' : 'hover:text-white'}`}
              >
                <div className="h-4 w-4 flex items-center justify-center">🏠</div>
                <span>Home</span>
              </button>

              <button
                onClick={() => setUserTab('map')}
                className={`flex flex-col items-center space-y-0.5 ${userTab === 'map' ? 'text-emerald-400 font-bold' : 'hover:text-white'}`}
              >
                <MapPin className="h-4 w-4" />
                <span>Map</span>
              </button>

              {/* Floating Green Capture Shutter in the Center */}
              <div className="relative -top-4">
                <button
                  onClick={() => setUserTab('record')}
                  className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 border-4 border-[#0c1427] active:scale-95 transition-transform"
                >
                  <Camera className="h-5 w-5" />
                </button>
              </div>

              <button
                onClick={() => setUserTab('reports')}
                className={`flex flex-col items-center space-y-0.5 ${userTab === 'reports' ? 'text-emerald-400 font-bold' : 'hover:text-white'}`}
              >
                <FileText className="h-4 w-4" />
                <span>Reports</span>
              </button>

              <button
                onClick={() => setUserTab('profile')}
                className={`flex flex-col items-center space-y-0.5 ${userTab === 'profile' ? 'text-emerald-400 font-bold' : 'hover:text-white'}`}
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            3. DEVELOPER APP EXPERIENCE (Full Features, AI, Risk, Audit)
           ═════════════════════════════════════════════════════════════ */}
        {authScreen === 'app' && role === 'developer' && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Developer Top Header */}
            <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-slate-800/80 bg-[#0c1427]/80">
              <div className="flex items-center space-x-1.5">
                <span className="text-base font-black text-white">Jan</span>
                <span className="text-base font-black text-purple-400">Drishti</span>
              </div>

              <div className="flex items-center space-x-2">
                <button className="p-1.5 rounded-lg text-slate-400 hover:text-white relative">
                  <Bell className="h-4 w-4" />
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute top-1 right-1" />
                </button>
                <div className="w-7 h-7 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-xs font-bold text-purple-300">
                  A
                </div>
              </div>
            </div>

            {/* Developer Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* DEV TAB: DASHBOARD */}
              {devTab === 'dashboard' && (
                <>
                  <div>
                    <h3 className="text-base font-bold text-white">Dashboard</h3>
                    <p className="text-[11px] text-slate-400">Live overview of road conditions</p>
                  </div>

                  {/* Today's Summary 4 Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">Today's Summary</span>
                      <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        Chandigarh ▾
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Potholes */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-2.5">
                        <div className="p-2 rounded-lg bg-rose-500 text-white flex-shrink-0">
                          <Flame className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Potholes</p>
                          <p className="text-sm font-bold text-white">482 <span className="text-[10px] text-emerald-400">↑12%</span></p>
                        </div>
                      </div>

                      {/* Cracks */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-2.5">
                        <div className="p-2 rounded-lg bg-amber-500 text-white flex-shrink-0">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Cracks</p>
                          <p className="text-sm font-bold text-white">436 <span className="text-[10px] text-emerald-400">↑9%</span></p>
                        </div>
                      </div>

                      {/* Patch Damage */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-2.5">
                        <div className="p-2 rounded-lg bg-purple-500 text-white flex-shrink-0">
                          <Droplets className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Patch Damage</p>
                          <p className="text-sm font-bold text-white">192 <span className="text-[10px] text-emerald-400">↑18%</span></p>
                        </div>
                      </div>

                      {/* Total Reports */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-2.5">
                        <div className="p-2 rounded-lg bg-blue-500 text-white flex-shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Total Reports</p>
                          <p className="text-sm font-bold text-white">1,248 <span className="text-[10px] text-emerald-400">↑15%</span></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* City Road Map Snippet */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">City Road Map</span>
                      <button onClick={() => setDevTab('map')} className="text-[10px] text-purple-400 hover:underline">
                        View All &gt;
                      </button>
                    </div>

                    <div className="h-44 rounded-xl overflow-hidden border border-slate-800 relative">
                      <RoadMap
                        geojson={roadsGeoJson}
                        observations={observations}
                        userLocation={userCoords}
                        height="100%"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* DEV TAB: AI DETECTION STUDIO */}
              {devTab === 'detection' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setDevTab('dashboard')} className="p-1 rounded-lg text-slate-400 hover:text-white">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="text-xs font-bold text-white">AI Detection</span>
                    <span />
                  </div>

                  {/* Live vs Upload Image Pills */}
                  <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => setAiMode('live')}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold ${
                        aiMode === 'live' ? 'bg-purple-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Live Detection
                    </button>
                    <button
                      onClick={() => setAiMode('upload')}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold ${
                        aiMode === 'upload' ? 'bg-purple-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Upload Image
                    </button>
                  </div>

                  {/* Detection Canvas with Bounding Boxes */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black h-56 flex items-center justify-center shadow-xl">
                    <img src={devDetectionImg} alt="Road Surface" className="w-full h-full object-cover" />

                    <div className="absolute top-[52%] left-[16%] w-[34%] h-[32%] border-2 border-rose-500 bg-rose-500/20 rounded flex flex-col justify-start p-1 pointer-events-none">
                      <span className="text-[9px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded w-max">
                        Pothole 0.92
                      </span>
                    </div>

                    <div className="absolute top-[42%] left-[55%] w-[32%] h-[26%] border-2 border-amber-500 bg-amber-500/20 rounded flex flex-col justify-start p-1 pointer-events-none">
                      <span className="text-[9px] font-black bg-amber-600 text-white px-1.5 py-0.5 rounded w-max">
                        Crack 0.76
                      </span>
                    </div>
                  </div>

                  {/* Detection Breakdown */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
                    <span className="text-xs font-bold text-white block">Detection Results</span>
                    <div className="flex justify-between items-center text-xs text-rose-300 bg-rose-500/10 p-2 rounded-lg">
                      <span className="flex items-center space-x-1.5">
                        <Flame className="h-3.5 w-3.5" />
                        <span>Potholes</span>
                      </span>
                      <b>3</b>
                    </div>
                    <div className="flex justify-between items-center text-xs text-amber-300 bg-amber-500/10 p-2 rounded-lg">
                      <span className="flex items-center space-x-1.5">
                        <Activity className="h-3.5 w-3.5" />
                        <span>Cracks</span>
                      </span>
                      <b>2</b>
                    </div>
                    <div className="flex justify-between items-center text-xs text-emerald-300 bg-emerald-500/10 p-2 rounded-lg">
                      <span className="flex items-center space-x-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Patch Damage</span>
                      </span>
                      <b>1</b>
                    </div>
                  </div>

                  <button
                    onClick={onOpenUpload}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
                  >
                    Process Frame
                  </button>
                </div>
              )}

              {/* DEV TAB: ROAD ANALYSIS & RISK */}
              {devTab === 'analysis' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setDevTab('dashboard')} className="p-1 rounded-lg text-slate-400 hover:text-white">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="text-xs font-bold text-white">Road Analysis</span>
                    <span />
                  </div>

                  <div className="flex space-x-2 text-[10px]">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">Chandigarh ▾</span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">Last 30 Days ▾</span>
                  </div>

                  {/* Infrastructure Health Score Gauge */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="text-xs font-bold text-slate-400 block mb-2">Infrastructure Health Score</span>
                    <div className="w-40 h-20 mx-auto relative flex items-center justify-center">
                      <svg className="w-40 h-20 overflow-visible" viewBox="0 0 200 110">
                        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1e293b" strokeWidth="18" strokeLinecap="round" />
                        <path d="M 20 100 A 80 80 0 0 1 145 40" fill="none" stroke="#10b981" strokeWidth="18" strokeLinecap="round" />
                      </svg>
                      <div className="absolute bottom-0 text-center">
                        <span className="text-2xl font-black text-white">72</span>
                        <span className="text-xs font-semibold text-slate-400">/100</span>
                        <div className="text-[10px] text-emerald-400 font-bold">Good</div>
                      </div>
                    </div>
                  </div>

                  {/* Risk Factor Analysis */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
                    <span className="text-xs font-bold text-white block">Risk Factor Analysis</span>
                    {[
                      { name: 'Pothole Severity', pct: 40, color: 'bg-emerald-500' },
                      { name: 'Crack Severity', pct: 35, color: 'bg-emerald-500' },
                      { name: 'Vehicle Vibration', pct: 45, color: 'bg-emerald-500' },
                      { name: 'Traffic Exposure', pct: 70, color: 'bg-amber-500' },
                      { name: 'Rainfall Vulnerability', pct: 55, color: 'bg-indigo-500' },
                    ].map(rf => (
                      <div key={rf.name} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-300">{rf.name}</span>
                          <span className="text-slate-400">{rf.pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${rf.color}`} style={{ width: `${rf.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Risk Level Badge */}
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center space-x-3 text-xs">
                    <div className="p-2 rounded-lg bg-amber-500 text-slate-950 font-bold">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-400">Medium Risk</p>
                      <p className="text-[10px] text-slate-400">Patching required / Priority inspection</p>
                    </div>
                  </div>
                </div>
              )}

              {/* DEV TAB: REPAIR VERIFICATION */}
              {devTab === 'verification' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setDevTab('dashboard')} className="p-1 rounded-lg text-slate-400 hover:text-white">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="text-xs font-bold text-white">Repair Verification</span>
                    <span />
                  </div>

                  {/* Before / After Pills */}
                  <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => setRepairTab('before')}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold ${
                        repairTab === 'before' ? 'bg-purple-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Before Repair
                    </button>
                    <button
                      onClick={() => setRepairTab('after')}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold ${
                        repairTab === 'after' ? 'bg-purple-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      After Repair
                    </button>
                  </div>

                  {/* Comparison Canvas */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black h-48 flex shadow-xl">
                    <img
                      src={repairTab === 'before' ? '/images/roads/road_pothole_d00.jpg' : '/images/roads/road_repaired_patch.jpg'}
                      alt="Road Comparison"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* AI Verification Result Badge */}
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center space-x-3 text-xs">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold flex-shrink-0">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Repair Verified</p>
                      <p className="text-[10px] text-slate-400">The road condition has improved significantly.</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] space-y-1.5 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Location:</span>
                      <b>Sector 34, Chandigarh</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Repair Date:</span>
                      <b>15 Oct 2026</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Verification Date:</span>
                      <b>20 Oct 2026</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Health Score Change:</span>
                      <b className="text-emerald-400">35 → 82 (+47)</b>
                    </div>
                  </div>

                  <button
                    onClick={() => alert("Marked as verified in municipal ledger.")}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
                  >
                    Mark as Verified
                  </button>
                </div>
              )}

              {/* DEV TAB: FULL GIS MAP */}
              {devTab === 'map' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setDevTab('dashboard')} className="p-1 rounded-lg text-slate-400 hover:text-white">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="text-xs font-bold text-white">Full GIS Map</span>
                    <span />
                  </div>

                  <div className="h-[440px] rounded-2xl overflow-hidden border border-slate-800 relative shadow-xl">
                    <RoadMap
                      geojson={roadsGeoJson}
                      observations={observations}
                      userLocation={userCoords}
                      height="100%"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Developer Bottom Navigation Bar (Dashboard, Map, Add (+), Analytics, Profile/Audit) */}
            <div className="bg-[#0c1427] border-t border-slate-800/80 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400 relative">
              <button
                onClick={() => setDevTab('dashboard')}
                className={`flex flex-col items-center space-y-0.5 ${devTab === 'dashboard' ? 'text-purple-400 font-bold' : 'hover:text-white'}`}
              >
                <div className="h-4 w-4 flex items-center justify-center">📊</div>
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setDevTab('map')}
                className={`flex flex-col items-center space-y-0.5 ${devTab === 'map' ? 'text-purple-400 font-bold' : 'hover:text-white'}`}
              >
                <MapPin className="h-4 w-4" />
                <span>Map</span>
              </button>

              {/* Central Floating Purple Action Button */}
              <div className="relative -top-4">
                <button
                  onClick={() => setDevTab('detection')}
                  className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 border-4 border-[#0c1427] active:scale-95 transition-transform"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>

              <button
                onClick={() => setDevTab('analysis')}
                className={`flex flex-col items-center space-y-0.5 ${devTab === 'analysis' ? 'text-purple-400 font-bold' : 'hover:text-white'}`}
              >
                <BarChart2 className="h-4 w-4" />
                <span>Analytics</span>
              </button>

              <button
                onClick={() => setDevTab('verification')}
                className={`flex flex-col items-center space-y-0.5 ${devTab === 'verification' ? 'text-purple-400 font-bold' : 'hover:text-white'}`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Audit</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
