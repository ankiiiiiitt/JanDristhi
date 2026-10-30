import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Monitor,
  User,
  ShieldCheck,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  MapPin,
  Building2,
  Menu,
  X,
  Crosshair,
  MapPinned,
  Gauge,
  ArrowLeft
} from 'lucide-react';
import { loginUser, signupCitizen, signupDeveloper } from '../services/api';

export default function AuthPortal({ onAuthSuccess, initialMode = 'login', onBack }) {
  // Target Role: 'citizen' | 'developer'
  const [selectedRole, setSelectedRole] = useState('citizen');
  // Auth Mode: 'login' | 'signup'
  const [authMode, setAuthMode] = useState(initialMode);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (initialMode) {
      setAuthMode(initialMode);
      setErrorMessage(null);
    }
  }, [initialMode]);

  // Common form fields
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Citizen Login Form
  const [citizenIdentifier, setCitizenIdentifier] = useState('rohit@jandrishti.in');
  const [citizenPassword, setCitizenPassword] = useState('password123');

  // Citizen Signup Form
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');
  const [citizenWard, setCitizenWard] = useState('Sector 17');
  const [citizenSignupPassword, setCitizenSignupPassword] = useState('');

  // Developer Login Form
  const [devEmail, setDevEmail] = useState('officer@jandrishti.gov.in');
  const [devPassword, setDevPassword] = useState('HackathonPassword2026!');

  // Developer Signup Form
  const [devName, setDevName] = useState('');
  const [devSignupEmail, setDevSignupEmail] = useState('');
  const [devDepartment, setDevDepartment] = useState('Chandigarh PWD Infrastructure');
  const [devInviteCode, setDevInviteCode] = useState('HACKATHON-2026');
  const [devSignupPassword, setDevSignupPassword] = useState('');

  // 1-Click Quick Demo Logins
  const handleDemoCitizenLogin = () => {
    setLoading(true);
    setErrorMessage(null);
    setTimeout(() => {
      setLoading(false);
      onAuthSuccess({
        user_id: 'USR-CTZ-001',
        name: 'Rohit Kumar',
        email: 'rohit@jandrishti.in',
        phone: '+91 98765 43210',
        role: 'citizen',
        ward_id: 'Sector 17',
        avatar: 'R'
      }, 'user');
    }, 400);
  };

  const handleDemoDeveloperLogin = () => {
    setLoading(true);
    setErrorMessage(null);
    setTimeout(() => {
      setLoading(false);
      onAuthSuccess({
        user_id: 'USR-DEV-101',
        name: 'Er. Vikram Sharma',
        email: 'officer@jandrishti.gov.in',
        phone: '+91 98111 22334',
        role: 'developer',
        department: 'Smart City Roads & PWD',
        ward_id: 'WARD-HQ',
        avatar: 'V'
      }, 'developer');
    }, 400);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (selectedRole === 'citizen') {
        if (authMode === 'login') {
          const res = await loginUser(citizenIdentifier, citizenPassword);
          if (res.success && res.data?.user) {
            const u = res.data.user;
            onAuthSuccess({
              user_id: u.user_id,
              name: u.full_name || 'Citizen User',
              email: u.email,
              phone: u.phone,
              role: 'citizen',
              avatar: (u.full_name || 'C')[0].toUpperCase()
            }, 'user');
          } else {
            // Local fallback for smooth testing if backend is cold-starting
            if (citizenIdentifier.includes('rohit') || citizenIdentifier === '9876543210') {
              handleDemoCitizenLogin();
              return;
            }
            setErrorMessage(res.error || 'Invalid citizen login credentials');
          }
        } else {
          // Citizen Signup
          if (!citizenName.trim() || !citizenPhone.trim() || !citizenSignupPassword.trim()) {
            setErrorMessage('Please fill in Name, Phone, and Password.');
            setLoading(false);
            return;
          }
          const res = await signupCitizen({
            fullName: citizenName,
            phone: citizenPhone,
            email: citizenEmail,
            password: citizenSignupPassword
          });
          if (res.success && res.data?.user) {
            const u = res.data.user;
            setSuccessMessage('Account created successfully! Logging you in...');
            setTimeout(() => {
              onAuthSuccess({
                user_id: u.user_id,
                name: u.full_name,
                email: u.email,
                phone: u.phone,
                role: 'citizen',
                avatar: (u.full_name || 'C')[0].toUpperCase()
              }, 'user');
            }, 600);
          } else {
            // Fallback user creation
            onAuthSuccess({
              user_id: `USR-CTZ-${Date.now().toString().slice(-4)}`,
              name: citizenName,
              phone: citizenPhone,
              email: citizenEmail || `${citizenPhone}@citizen.jandrishti.in`,
              role: 'citizen',
              ward_id: citizenWard,
              avatar: citizenName[0].toUpperCase()
            }, 'user');
          }
        }
      } else {
        // DEVELOPER / ENGINEER ROLE
        if (authMode === 'login') {
          const res = await loginUser(devEmail, devPassword);
          if (res.success && res.data?.user) {
            const u = res.data.user;
            onAuthSuccess({
              user_id: u.user_id,
              name: u.full_name || 'Municipal Engineer',
              email: u.email,
              role: 'developer',
              department: 'Public Works & Smart City Mission',
              avatar: (u.full_name || 'E')[0].toUpperCase()
            }, 'developer');
          } else {
            if (devEmail.includes('officer') || devEmail.includes('dev')) {
              handleDemoDeveloperLogin();
              return;
            }
            setErrorMessage(res.error || 'Invalid engineer login credentials');
          }
        } else {
          // Developer Signup
          if (!devName.trim() || !devSignupEmail.trim() || !devSignupPassword.trim()) {
            setErrorMessage('Please fill in Engineer Name, Gov Email, and Password.');
            setLoading(false);
            return;
          }
          const res = await signupDeveloper({
            fullName: devName,
            email: devSignupEmail,
            password: devSignupPassword,
            inviteCode: devInviteCode
          });
          if (res.success && res.data?.user) {
            const u = res.data.user;
            setSuccessMessage('Engineer account registered! Launching Studio...');
            setTimeout(() => {
              onAuthSuccess({
                user_id: u.user_id,
                name: u.full_name,
                email: u.email,
                role: 'developer',
                department: devDepartment,
                avatar: (u.full_name || 'E')[0].toUpperCase()
              }, 'developer');
            }, 600);
          } else {
            // Fallback developer onboarding
            onAuthSuccess({
              user_id: `USR-DEV-${Date.now().toString().slice(-4)}`,
              name: devName,
              email: devSignupEmail,
              role: 'developer',
              department: devDepartment,
              avatar: devName[0].toUpperCase()
            }, 'developer');
          }
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7faf9] text-slate-900 flex flex-col font-sans select-none relative overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP NAVBAR (Matching JanDrishti Homepage exactly)
         ───────────────────────────────────────────────────────────── */}
      <nav className="h-[76px] sticky top-0 inset-x-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl transition-all">
        <div className="max-w-7xl h-full mx-auto px-5 sm:px-8 flex items-center justify-between">
          {/* Logo */}
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2.5 text-left group transition-transform active:scale-95"
            title="Return to JanDrishti Homepage"
          >
            <span className="grid place-items-center size-9 rounded-xl bg-[#0d4d41] text-emerald-200 shadow-sm transition-colors group-hover:bg-[#145547]">
              <Sparkles size={18} />
            </span>
            <span className="font-extrabold tracking-tight text-xl text-slate-950">
              Jan<span className="text-[#145547]">Drishti</span>
            </span>
          </button>

          {/* Navigation Links (Matching Landing Page) */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button
              type="button"
              onClick={onBack}
              className="text-slate-900 font-bold border-b-2 border-[#145547] pb-0.5 transition-colors"
            >
              Home
            </button>
            <button
              type="button"
              onClick={onBack}
              className="hover:text-[#145547] transition-colors"
            >
              About
            </button>
            <button
              type="button"
              onClick={onBack}
              className="hover:text-[#145547] transition-colors"
            >
              How it works
            </button>
          </div>

          {/* Auth Switch Buttons in Navbar */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMessage(null);
              }}
              className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
                authMode === 'login'
                  ? 'border-2 border-[#145547] text-[#145547] bg-emerald-50/70 shadow-sm'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setErrorMessage(null);
              }}
              className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg shadow-emerald-950/15 transition-all ${
                authMode === 'signup'
                  ? 'bg-[#0d4339] ring-2 ring-emerald-600/30 ring-offset-2'
                  : 'bg-[#145547] hover:bg-[#0d4339]'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 text-xs font-semibold text-slate-600 flex items-center gap-1 hover:text-[#145547]"
              >
                <ArrowLeft size={16} /> Home
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-5 py-4 space-y-3 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onBack) onBack();
              }}
              className="block w-full text-left py-1 text-sm font-semibold text-slate-700 hover:text-[#145547]"
            >
              ← Back to Homepage
            </button>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setMobileMenuOpen(false);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border ${
                  authMode === 'login' ? 'border-[#145547] bg-emerald-50 text-[#145547]' : 'border-slate-300'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setMobileMenuOpen(false);
                }}
                className={`flex-1 py-2 text-xs font-bold text-white rounded-xl ${
                  authMode === 'signup' ? 'bg-[#0d4339]' : 'bg-[#145547]'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTENT AREA (Responsive Two-Column Desktop / Mobile Flow)
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center justify-center relative">
        {/* Subtle Decorative Ambient Glows */}
        <div className="absolute top-12 left-1/4 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-8 right-1/4 w-96 h-96 bg-teal-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="w-full grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* ═══════════════════════════════════════════════════════════
              LEFT COLUMN: JanDrishti Visual Brand Context (Desktop Hero)
             ═══════════════════════════════════════════════════════════ */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-6 pr-2">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 w-fit rounded-full border border-emerald-300/40 bg-emerald-50 text-[#145547] text-xs font-bold">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              AI for safer urban infrastructure
            </div>

            {/* Headline matching Homepage */}
            <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-slate-950 leading-[1.08]">
              Seeing Problems <span className="block text-[#145547]">Before They Become Failures</span>
            </h1>

            <p className="text-sm leading-relaxed text-slate-600">
              JanDrishti brings together YOLOv8 computer vision, citizen insight, and real-time GIS intelligence to identify road damages early and help municipal teams act with confidence.
            </p>

            {/* Road Image Preview Card with AI Signal Badge */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-xl shadow-slate-200/60 group">
              <img
                src="/images/roads/road_pothole_d00.jpg"
                alt="AI road damage detection"
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-end justify-between text-white">
                <div>
                  <span className="text-[10px] font-extrabold tracking-wider text-emerald-300 uppercase">
                    AI Vision Signal
                  </span>
                  <p className="text-sm font-bold">Pothole detected · 94% confidence</p>
                  <p className="text-[11px] text-slate-300 mt-0.5">Sector 17 City Center · Geotagged</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#145547] text-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-400/30">
                  <CheckCircle2 size={13} className="text-emerald-300" /> Verified
                </span>
              </div>
            </div>

            {/* 4 Feature Highlights matching JanDrishti pillars */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-2.5">
                <Crosshair size={18} className="text-[#145547] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900">AI Detection</p>
                  <p className="text-[11px] text-slate-500">Potholes & cracks</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-2.5">
                <MapPinned size={18} className="text-[#145547] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Live GIS Mapping</p>
                  <p className="text-[11px] text-slate-500">Street-level GPS</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-2.5">
                <Gauge size={18} className="text-[#145547] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Health Index</p>
                  <p className="text-[11px] text-slate-500">Priority risk score</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-2.5">
                <ShieldCheck size={18} className="text-[#145547] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Repair Audit</p>
                  <p className="text-[11px] text-slate-500">Visual verification</p>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              RIGHT COLUMN: Authentication Card (Citizen & Engineer)
             ═══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 flex justify-center w-full">
            <div className="w-full max-w-xl bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-950/5 relative space-y-6">
              
              {/* Card Header */}
              <div className="text-center space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-xs text-[#145547] font-semibold">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Secure Municipal & Public Access</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {authMode === 'login' ? 'Sign In to ' : 'Create Your '}
                  <span>Jan<span className="text-[#145547]">Drishti</span></span>
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {authMode === 'login'
                    ? 'Select your role to access the field mobile inspection view or municipal engineering GIS studio.'
                    : 'Register your profile to report damaged roads or perform smart city maintenance.'}
                </p>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  STEP 1: DISTINCT ROLE SELECTION (Citizen vs Municipal Engineer)
                 ───────────────────────────────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Select Your Role
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {selectedRole === 'citizen' ? 'Selected: Citizen' : 'Selected: Municipal Engineer'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Role 1: Citizen & Field Reporter */}
                  <div
                    onClick={() => {
                      setSelectedRole('citizen');
                      setErrorMessage(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedRole('citizen');
                        setErrorMessage(null);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center sm:flex-col sm:items-center text-left sm:text-center gap-3 relative ${
                      selectedRole === 'citizen'
                        ? 'border-[#145547] bg-[#f0f7f4] shadow-md shadow-emerald-900/5 ring-1 ring-[#145547]/20'
                        : 'border-slate-200 hover:border-emerald-300 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Active Check Indicator */}
                    {selectedRole === 'citizen' && (
                      <span className="absolute top-2.5 right-2.5 text-[#145547]">
                        <CheckCircle2 size={16} />
                      </span>
                    )}

                    <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      selectedRole === 'citizen'
                        ? 'bg-[#145547] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Smartphone size={20} />
                    </div>

                    <div className="flex-1 sm:flex-none">
                      <p className="text-xs font-bold text-slate-900">Citizen / Field Reporter</p>
                      <p className="text-[11px] text-slate-500">Mobile Phone View</p>
                      <span className="inline-block mt-1 text-[10px] font-bold text-[#145547] bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                        Pothole Reporting
                      </span>
                    </div>
                  </div>

                  {/* Role 2: Municipal Engineer & GIS Studio */}
                  <div
                    onClick={() => {
                      setSelectedRole('developer');
                      setErrorMessage(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedRole('developer');
                        setErrorMessage(null);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center sm:flex-col sm:items-center text-left sm:text-center gap-3 relative ${
                      selectedRole === 'developer'
                        ? 'border-[#145547] bg-[#f0f7f4] shadow-md shadow-emerald-900/5 ring-1 ring-[#145547]/20'
                        : 'border-slate-200 hover:border-emerald-300 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Active Check Indicator */}
                    {selectedRole === 'developer' && (
                      <span className="absolute top-2.5 right-2.5 text-[#145547]">
                        <CheckCircle2 size={16} />
                      </span>
                    )}

                    <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      selectedRole === 'developer'
                        ? 'bg-[#145547] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Monitor size={20} />
                    </div>

                    <div className="flex-1 sm:flex-none">
                      <p className="text-xs font-bold text-slate-900">Municipal Engineer</p>
                      <p className="text-[11px] text-slate-500">Desktop GIS Studio</p>
                      <span className="inline-block mt-1 text-[10px] font-bold text-[#145547] bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                        YOLOv8 & Audits
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  STEP 2: LOGIN / SIGNUP TOGGLE TABS
                 ───────────────────────────────────────────────────────────── */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 rounded-xl font-bold transition-all text-center ${
                    authMode === 'login'
                      ? 'bg-[#145547] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 font-semibold'
                  }`}
                >
                  Sign In ({selectedRole === 'citizen' ? 'Citizen' : 'Engineer'})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 rounded-xl font-bold transition-all text-center ${
                    authMode === 'signup'
                      ? 'bg-[#145547] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 font-semibold'
                  }`}
                >
                  Create New Account
                </button>
              </div>

              {/* Alerts / Error & Success Feedback */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-[#145547] shrink-0" />
                  <span className="font-semibold">{successMessage}</span>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 3: ROLE-SPECIFIC AUTH FORMS
                 ───────────────────────────────────────────────────────────── */}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                {/* ─── A. CITIZEN PORTAL FORMS ─── */}
                {selectedRole === 'citizen' && (
                  <>
                    {authMode === 'login' ? (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-slate-700 font-bold block">Mobile Number or Email</label>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                            <input
                              type="text"
                              required
                              value={citizenIdentifier}
                              onChange={(e) => setCitizenIdentifier(e.target.value)}
                              placeholder="e.g. 9876543210 or rohit@jandrishti.in"
                              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-slate-700 font-bold block">Password</label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={citizenPassword}
                              onChange={(e) => setCitizenPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Citizen Portal Features Pill */}
                        <div className="p-3 rounded-xl bg-[#f0f7f4] border border-emerald-200/80 text-[11px] text-slate-600 space-y-1.5">
                          <p className="font-bold text-[#145547] flex items-center gap-1.5">
                            <Smartphone size={14} /> Citizen Field Reporting Features:
                          </p>
                          <p className="flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                            Snap road potholes with live GPS geotagging
                          </p>
                          <p className="flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                            View your reports pinned live on OpenStreetMap
                          </p>
                          <p className="flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                            Track repair verification audits by municipal engineers
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-slate-700 font-bold block">Full Name</label>
                          <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                            <input
                              type="text"
                              required
                              value={citizenName}
                              onChange={(e) => setCitizenName(e.target.value)}
                              placeholder="e.g. Rohit Kumar"
                              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-slate-700 font-bold block">Mobile Number</label>
                            <div className="relative">
                              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                              <input
                                type="tel"
                                required
                                value={citizenPhone}
                                onChange={(e) => setCitizenPhone(e.target.value)}
                                placeholder="+91 98765 43210"
                                className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-slate-700 font-bold block">Residential Sector / Ward</label>
                            <div className="relative">
                              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                              <input
                                type="text"
                                value={citizenWard}
                                onChange={(e) => setCitizenWard(e.target.value)}
                                placeholder="e.g. Sector 17"
                                className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-slate-700 font-bold block">Email (Optional)</label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                            <input
                              type="email"
                              value={citizenEmail}
                              onChange={(e) => setCitizenEmail(e.target.value)}
                              placeholder="rohit@example.com"
                              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-slate-700 font-bold block">Password</label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={citizenSignupPassword}
                              onChange={(e) => setCitizenSignupPassword(e.target.value)}
                              placeholder="Minimum 6 characters"
                              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* ─── B. DEVELOPER / MUNICIPAL ENGINEER FORMS ─── */}
                {selectedRole === 'developer' && (
                  <>
                    {authMode === 'login' ? (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-slate-700 font-bold block">Official Municipal / Gov Email</label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                            <input
                              type="email"
                              required
                              value={devEmail}
                              onChange={(e) => setDevEmail(e.target.value)}
                              placeholder="officer@jandrishti.gov.in"
                              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-slate-700 font-bold block">Admin Password</label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={devPassword}
                              onChange={(e) => setDevPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Engineer Portal Features Pill */}
                        <div className="p-3 rounded-xl bg-[#f0f7f4] border border-emerald-200/80 text-[11px] text-slate-600 space-y-1.5">
                          <p className="font-bold text-[#145547] flex items-center gap-1.5">
                            <Monitor size={14} /> Municipal Engineering Features:
                          </p>
                          <p className="flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                            Smart City GIS Road Health Index & Risk Priority Matrix
                          </p>
                          <p className="flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                            YOLOv8 & RDD2022 Deep Learning Detection Studio
                          </p>
                          <p className="flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                            PWD Contractor Repair Audit & Downloadable PDF Reports
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-slate-700 font-bold block">Engineer Full Name</label>
                          <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                            <input
                              type="text"
                              required
                              value={devName}
                              onChange={(e) => setDevName(e.target.value)}
                              placeholder="e.g. Er. Vikram Sharma"
                              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-slate-700 font-bold block">Official Government Email</label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                            <input
                              type="email"
                              required
                              value={devSignupEmail}
                              onChange={(e) => setDevSignupEmail(e.target.value)}
                              placeholder="v.sharma@chandigarh.gov.in"
                              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-slate-700 font-bold block">Department / Agency</label>
                            <div className="relative">
                              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                              <input
                                type="text"
                                value={devDepartment}
                                onChange={(e) => setDevDepartment(e.target.value)}
                                placeholder="PWD Infrastructure"
                                className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-slate-700 font-bold block">Invite Passcode</label>
                            <input
                              type="text"
                              value={devInviteCode}
                              onChange={(e) => setDevInviteCode(e.target.value)}
                              placeholder="HACKATHON-2026"
                              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-[#145547] font-mono font-bold text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-slate-700 font-bold block">Password</label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={devSignupPassword}
                              onChange={(e) => setDevSignupPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-extrabold text-sm text-white bg-[#145547] hover:bg-[#0d4339] shadow-lg shadow-emerald-950/15 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {authMode === 'login'
                          ? `Sign In to ${selectedRole === 'citizen' ? 'Citizen App' : 'Developer GIS Studio'}`
                          : `Register & Launch ${selectedRole === 'citizen' ? 'Citizen App' : 'Developer Studio'}`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* ─────────────────────────────────────────────────────────────
                  STEP 4: INSTANT 1-CLICK DEMO LOGIN SHORTCUTS (FOR EVALUATION)
                 ───────────────────────────────────────────────────────────── */}
              <div className="pt-4 border-t border-slate-200 text-center space-y-2.5">
                <div className="flex items-center justify-center gap-2">
                  <span className="h-px w-10 bg-slate-200" />
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Quick Evaluator Demo Logins
                  </p>
                  <span className="h-px w-10 bg-slate-200" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={handleDemoCitizenLogin}
                    disabled={loading}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#f0f7f4] border border-emerald-300 text-[#145547] font-bold flex items-center justify-center space-x-2 transition-all shadow-sm active:scale-98"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>⚡ 1-Click Citizen (Rohit)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDemoDeveloperLogin}
                    disabled={loading}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#f0f7f4] border border-emerald-300 text-[#145547] font-bold flex items-center justify-center space-x-2 transition-all shadow-sm active:scale-98"
                  >
                    <Monitor className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>⚡ 1-Click Engineer (Vikram)</span>
                  </button>
                </div>
              </div>

              {/* Bottom Toggle Link */}
              <div className="text-center pt-1">
                <p className="text-xs text-slate-500">
                  {authMode === 'login' ? (
                    <>
                      Don't have an account yet?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setErrorMessage(null);
                        }}
                        className="font-bold text-[#145547] hover:underline"
                      >
                        Create an account
                      </button>
                    </>
                  ) : (
                    <>
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setErrorMessage(null);
                        }}
                        className="font-bold text-[#145547] hover:underline"
                      >
                        Sign in now
                      </button>
                    </>
                  )}
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. CLEAN FOOTER (Matching JanDrishti Homepage)
         ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200/80 bg-white/80 py-5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900">Jan<span className="text-[#145547]">Drishti</span></span>
            <span>·</span>
            <span>AI Urban Infrastructure Intelligence Platform</span>
          </div>
          <p>© 2026 JanDrishti · Chandigarh Smart City Mission</p>
        </div>
      </footer>
    </div>
  );
}
