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
  Check
} from 'lucide-react';
import RoadMap from './RoadMap';

export default function UserMobileApp({
  overview,
  roadsGeoJson,
  observations,
  onOpenUpload,
  onSwitchToDeveloper
}) {
  // Auth state: 'login' | 'signup' | 'app'
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

  // User App Tabs: 'home' | 'map' | 'record' | 'reports' | 'profile'
  const [userTab, setUserTab] = useState('home');

  // Live Recording state
  const [recordMode, setRecordMode] = useState('video'); // 'video' | 'photo'
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(138); // 00:02:18
  const [cameraStream, setCameraStream] = useState(null);
  const userVideoRef = useRef(null);

  // Format timer MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `00:${m}:${s}`;
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
      }
      setIsRecording(false);
      return;
    }

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
      console.warn("Camera access failed:", e);
    }
    setIsRecording(true);
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
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleLogin = (e) => {
    e?.preventDefault();
    setCurrentUser({
      name: 'Rohit Kumar',
      email: loginEmail,
      phone: '+91 98765 43210',
      avatar: 'R'
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

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-start p-0 sm:py-6 sm:px-4">
      {/* Top Banner to switch to Developer Dashboard */}
      <div className="w-full max-w-md bg-[#0c1427] border-b sm:border border-slate-800 sm:rounded-2xl p-2.5 mb-2 sm:mb-4 flex items-center justify-between shadow-xl z-30">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-white">Citizen & Field Mobile App</span>
        </div>

        <button
          onClick={onSwitchToDeveloper}
          className="text-xs px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center space-x-1.5 shadow-md shadow-purple-600/30 transition-transform active:scale-95"
        >
          <span>Switch to Developer (Laptop)</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── PHONE SHELL CONTAINER ── */}
      <div className="w-full max-w-md bg-[#0b1120] sm:border-4 sm:border-slate-800 sm:rounded-[40px] shadow-2xl flex flex-col min-h-screen sm:min-h-[780px] sm:max-h-[850px] relative overflow-hidden ring-1 ring-slate-700/50">
        {/* Status Bar */}
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

        {/* ── 1. LOGIN SCREEN ── */}
        {authScreen === 'login' && (
          <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto">
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
                <span className="text-2xl font-black text-emerald-400">Drishti</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Safer Roads • Smarter Cities</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 my-4 shadow-xl">
              <div className="text-center mb-4">
                <h3 className="text-base font-bold text-white">Citizen Login</h3>
                <p className="text-[11px] text-slate-400">Report potholes & road damages in your sector</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                <div className="relative flex items-center">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    placeholder="Email or Mobile"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="relative flex items-center">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
                  className="w-full py-2.5 rounded-xl text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 transition-all mt-2"
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
            </div>

            <div className="text-center text-[10px] text-slate-500">
              JanDrishti Field Surveillance • Powered by Municipal AI
            </div>
          </div>
        )}

        {/* ── 2. SIGNUP SCREEN ── */}
        {authScreen === 'signup' && (
          <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto">
            <div className="text-center mt-2">
              <div className="flex items-center justify-center space-x-1.5">
                <span className="text-2xl font-black text-white">Jan</span>
                <span className="text-2xl font-black text-emerald-400">Drishti</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Safer Roads • Smarter Cities</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 my-3 shadow-xl">
              <div className="text-center mb-3">
                <h3 className="text-base font-bold text-white">Create Citizen Account</h3>
                <p className="text-[11px] text-slate-400">Join to report road hazards and earn badges</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-2.5">
                <div className="relative flex items-center">
                  <User className="h-4 w-4 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="relative flex items-center">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all mt-2"
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
              By signing up, you agree to Municipal Citizen Terms
            </div>
          </div>
        )}

        {/* ── 3. MAIN FIELD USER APP ── */}
        {authScreen === 'app' && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Header */}
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

              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                <MapPin className="h-3 w-3 text-emerald-400" />
                <span>Chandigarh</span>
                <span className="text-slate-600">•</span>
                <span>28°C Clear</span>
              </div>
            </div>

            {/* Content Tabs */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* TAB 1: HOME */}
              {userTab === 'home' && (
                <>
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

              {/* TAB 2: RECORD */}
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

                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black h-72 flex items-center justify-center shadow-2xl">
                    {cameraStream ? (
                      <video ref={userVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    ) : (
                      <img src="/images/roads/road_pothole_d00.jpg" alt="Road Surface" className="w-full h-full object-cover" />
                    )}

                    <div className="absolute top-[45%] left-[25%] w-[45%] h-[32%] border-2 border-rose-500 bg-rose-500/20 rounded-lg flex flex-col justify-start p-1 pointer-events-none">
                      <span className="text-[9px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded w-max">
                        Pothole 0.87
                      </span>
                    </div>

                    <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/60 border border-slate-700 text-[10px] font-bold text-white">
                      1x
                    </div>
                  </div>

                  <div className="flex items-center justify-center space-x-2 bg-slate-900 p-1 rounded-xl max-w-[200px] mx-auto border border-slate-800">
                    <button
                      onClick={() => setRecordMode('video')}
                      className={`px-4 py-1 rounded-lg text-xs font-bold ${
                        recordMode === 'video' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      Video
                    </button>
                    <button
                      onClick={() => setRecordMode('photo')}
                      className={`px-4 py-1 rounded-lg text-xs font-bold ${
                        recordMode === 'photo' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      Photo
                    </button>
                  </div>

                  <div className="flex items-center justify-center py-2">
                    <button
                      onClick={toggleRecording}
                      className="w-16 h-16 rounded-full border-4 border-slate-700 p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                    >
                      <div className={`w-full h-full rounded-full ${isRecording ? 'bg-rose-600' : 'bg-red-500'} flex items-center justify-center shadow-lg`}>
                        {isRecording ? <Square className="h-5 w-5 text-white" /> : <div className="w-6 h-6 rounded-full bg-white" />}
                      </div>
                    </button>
                  </div>

                  <div className="text-center text-xs">
                    <span className="text-rose-400 font-bold flex items-center justify-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span>Recording... {formatTime(recordingSeconds)}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 3: LIVE MAP */}
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

                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search location..."
                      className="w-full bg-slate-900 border border-slate-800 text-xs rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <div className="h-56 rounded-2xl overflow-hidden border border-slate-800 relative shadow-xl">
                    <RoadMap geojson={roadsGeoJson} observations={observations} />
                  </div>

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

              {/* TAB 4: REPORTS */}
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

              {/* TAB 5: PROFILE */}
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

            {/* Bottom Nav */}
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
      </div>
    </div>
  );
}
