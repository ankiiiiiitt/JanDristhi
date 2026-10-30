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
  Loader2,
  X,
  Clock,
  AlertTriangle,
  Video,
  Film
} from 'lucide-react';
import RoadMap from './RoadMap';
import { uploadObservation, resolveImageUrl } from '../services/api';

export default function UserMobileApp({
  overview,
  roadsGeoJson,
  observations,
  onOpenUpload,
  onSwitchToDeveloper,
  onUploadSuccess,
  currentUser: propCurrentUser = null,
  onLogout = null
}) {
  // Auth state: 'login' | 'signup' | 'app'
  const [authScreen, setAuthScreen] = useState('app');
  const [currentUser, setCurrentUser] = useState(() => {
    return propCurrentUser || {
      name: 'Rohit Kumar',
      email: 'rohit@jandrishti.in',
      phone: '+91 98765 43210',
      avatar: 'R'
    };
  });

  useEffect(() => {
    if (propCurrentUser) {
      setCurrentUser(propCurrentUser);
    }
  }, [propCurrentUser]);

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

  // Live Recording state (defaults to 'photo' for instant field hazard inspection)
  const [recordMode, setRecordMode] = useState('photo'); // 'photo' | 'video'
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingSaved, setRecordingSaved] = useState(false);
  const [photoFlash, setPhotoFlash] = useState(false);
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccessData, setUploadSuccessData] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const userVideoRef = useRef(null);

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
  const [isLocatingDevice, setIsLocatingDevice] = useState(false);

  // Real Captured Photo or Video Blob and Preview for direct posting
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [isVideoCaptured, setIsVideoCaptured] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [lockedCoords, setLockedCoords] = useState(null);
  const [captureTimestamp, setCaptureTimestamp] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const fileInputRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // Auto-acquire real device GPS on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setIsLocatingDevice(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocatingDevice(false);
          const { latitude, longitude, accuracy } = pos.coords;
          setUserCoords({
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy || 10),
            city: 'Live Location',
            isReal: true
          });

          // Reverse geocode via OpenStreetMap Nominatim
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            .then(r => r.json())
            .then(data => {
              const detectedCity = data.address?.city || data.address?.town || data.address?.suburb || data.address?.state_district || 'Live Location';
              setUserCoords(prev => ({ ...prev, city: detectedCity }));
            })
            .catch(() => {});
        },
        (err) => {
          setIsLocatingDevice(false);
          console.warn('Device GPS unavailable, falling back to default:', err);
          setUserCoords(prev => ({ ...prev, city: 'Chandigarh' }));
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // ── REAR CAMERA & STREAM LIFECYCLE ──
  const startRearCamera = async () => {
    setIsCameraStarting(true);
    setCameraError(null);
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported on this browser or requires HTTPS.');
      }

      let stream = null;
      // 1. Request environment rear camera with ideal resolution for Android Chrome / iOS
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 }
          },
          audio: false
        });
      } catch (err1) {
        console.warn('Initial ideal rear camera constraint failed, retrying fallback:', err1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
          });
        } catch (err2) {
          console.warn('Exact environment failed, using default camera:', err2);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }

      cameraStreamRef.current = stream;
      setCameraStream(stream);
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream;
        userVideoRef.current.onloadedmetadata = () => {
          userVideoRef.current?.play().catch(e => console.warn('Video play catch:', e));
        };
      }
    } catch (err) {
      console.warn('startRearCamera error:', err);
      setCameraError(err.message || 'Camera permission denied or camera not found');
    } finally {
      setIsCameraStarting(false);
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    if (userVideoRef.current) {
      userVideoRef.current.srcObject = null;
    }
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    try {
      const stream = cameraStreamRef.current || cameraStream;
      const track = stream?.getVideoTracks()?.[0];
      if (track && track.getCapabilities && track.getCapabilities().torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn }]
        });
      }
      setTorchOn(prev => !prev);
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  // Open rear camera when on record tab and no captured preview
  useEffect(() => {
    if (userTab === 'record' && !capturedPreview) {
      startRearCamera();
    } else if (userTab !== 'record') {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [userTab, capturedPreview]);

  // Keep video source attached
  useEffect(() => {
    if (userVideoRef.current && cameraStream && !capturedPreview) {
      userVideoRef.current.srcObject = cameraStream;
      userVideoRef.current.play().catch(() => {});
    }
  }, [cameraStream, userTab, capturedPreview]);

  // Capture Photo Snapshot
  const handleCapturePhoto = () => {
    setPhotoFlash(true);
    setTimeout(() => setPhotoFlash(false), 200);

    // Freeze exact GPS & timestamp at capture time
    const timestamp = new Date().toISOString();
    setCaptureTimestamp(timestamp);
    setReportId(`RPT-MOB-${globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`);
    setLockedCoords({
      lat: userCoords.lat,
      lng: userCoords.lng,
      accuracy: userCoords.accuracy,
      city: userCoords.city,
      isReal: userCoords.isReal
    });

    // 1. Grab frame from live video feed
    if (userVideoRef.current && (userVideoRef.current.videoWidth > 0 || userVideoRef.current.readyState >= 2)) {
      try {
        const video = userVideoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedPreview(dataUrl);

        canvas.toBlob((blob) => {
          if (blob) {
            setCapturedBlob(blob);
          }
        }, 'image/jpeg', 0.92);

        setPhotoCaptured(true);
        setRecordingSaved(false);
        setUploadSuccessData(null);
        setUploadError(null);
        stopCamera();
        return;
      } catch (err) {
        console.warn('Canvas capture error:', err);
      }
    }

    // 2. Fallback to native camera input dialog
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRetake = () => {
    setCapturedBlob(null);
    setCapturedPreview(null);
    setIsVideoCaptured(false);
    setVideoDuration(0);
    recordedChunksRef.current = [];
    setLockedCoords(null);
    setCaptureTimestamp(null);
    setReportId(null);
    setPhotoCaptured(false);
    setRecordingSaved(false);
    setRecordingSeconds(0);
    setIsRecording(false);
    setUploadSuccessData(null);
    setUploadError(null);
    startRearCamera();
  };

  const handleCancel = () => {
    setCapturedBlob(null);
    setCapturedPreview(null);
    setIsVideoCaptured(false);
    setVideoDuration(0);
    recordedChunksRef.current = [];
    setLockedCoords(null);
    setCaptureTimestamp(null);
    setReportId(null);
    setPhotoCaptured(false);
    setRecordingSaved(false);
    setRecordingSeconds(0);
    setIsRecording(false);
    setUploadSuccessData(null);
    setUploadError(null);
    stopCamera();
    setUserTab('home');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = (file.type && file.type.startsWith('video/')) || /\.(mp4|webm|mov|avi|mkv)$/i.test(file.name);
    setIsVideoCaptured(isVideo);
    const preview = URL.createObjectURL(file);
    const nowIso = new Date().toISOString();
    setCaptureTimestamp(nowIso);
    setReportId(isVideo
      ? `RPT-VID-${globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID().slice(0, 8).toUpperCase() : `${Date.now()}`}`
      : `RPT-MOB-${globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID().slice(0, 8).toUpperCase() : `${Date.now()}`}`
    );
    setLockedCoords({
      lat: userCoords.lat,
      lng: userCoords.lng,
      accuracy: userCoords.accuracy,
      city: userCoords.city,
      isReal: userCoords.isReal
    });
    setCapturedBlob(file);
    setCapturedPreview(preview);
    setPhotoCaptured(true);
    setRecordingSaved(false);
    setUploadSuccessData(null);
    setUploadError(null);
    stopCamera();
  };

  const toggleRecording = async () => {
    if (recordMode === 'photo') {
      handleCapturePhoto();
      return;
    }

    // VIDEO MODE
    if (isRecording) {
      // User tapped Stop Recording button
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.warn('Error stopping mediaRecorder:', e);
        }
      }
      setIsRecording(false);
      return;
    }

    // Start Real MediaRecorder Video Recording
    try {
      let stream = cameraStreamRef.current || cameraStream;
      if (!stream || !stream.active) {
        await startRearCamera();
        stream = cameraStreamRef.current;
      }

      if (!stream) {
        if (fileInputRef.current) {
          fileInputRef.current.accept = 'video/*,image/*';
          fileInputRef.current.click();
        }
        return;
      }

      recordedChunksRef.current = [];
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          mimeType = 'video/webm;codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const chunks = recordedChunksRef.current;
        const finalBlob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        const videoUrl = URL.createObjectURL(finalBlob);

        setCapturedBlob(finalBlob);
        setCapturedPreview(videoUrl);
        setIsVideoCaptured(true);
        setRecordingSaved(true);
        setPhotoCaptured(true);
        stopCamera();

        const timestamp = new Date().toISOString();
        setCaptureTimestamp(timestamp);
        setReportId(`RPT-VID-${globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID().slice(0, 8).toUpperCase() : `${Date.now()}`}`);
        setLockedCoords({
          lat: userCoords.lat,
          lng: userCoords.lng,
          accuracy: userCoords.accuracy,
          city: userCoords.city,
          isReal: userCoords.isReal
        });
        setUploadSuccessData(null);
        setUploadError(null);
      };

      recorder.start(500); // 500ms chunk intervals
      mediaRecorderRef.current = recorder;
      setRecordingSeconds(0);
      setRecordingSaved(false);
      setPhotoCaptured(false);
      setCapturedBlob(null);
      setCapturedPreview(null);
      setIsVideoCaptured(false);
      setIsRecording(true);
    } catch (err) {
      console.warn('Failed to start MediaRecorder, falling back to file upload:', err);
      if (fileInputRef.current) {
        fileInputRef.current.accept = 'video/*,image/*';
        fileInputRef.current.click();
      }
    }
  };

  const handleQuickUpload = async () => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    try {
      const formData = new FormData();
      let blobToUpload = capturedBlob;
      if (!blobToUpload && capturedPreview) {
        try {
          const res = await fetch(capturedPreview);
          blobToUpload = await res.blob();
        } catch (e) {
          console.warn('Could not convert capturedPreview to blob:', e);
        }
      }
      if (!blobToUpload) throw new Error('No inspection footage available. Please retake the road photo or video.');

      const fileName = isVideoCaptured
        ? (blobToUpload.name || 'road_inspection_video.webm')
        : (blobToUpload.name || 'road_hazard_recording.jpg');

      formData.append('file', blobToUpload, fileName);
      formData.append('vehicle_id', currentUser?.phone ? `MOB-${currentUser.phone.slice(-4)}` : 'CITIZEN-MOB');

      const activeCoords = lockedCoords || userCoords;
      const finalLat = (activeCoords.lat || 30.7450).toFixed(5);
      const finalLng = (activeCoords.lng || 76.7760).toFixed(5);
      const finalSector = activeCoords.city || 'Field Location';
      const exactTime = captureTimestamp || new Date().toISOString();

      formData.append('latitude', finalLat);
      formData.append('longitude', finalLng);
      formData.append('sector', finalSector);
      formData.append('speed_kmph', '34.5');
      formData.append('telemetry_z_shock', '3.1');
      formData.append('captured_at', exactTime);
      formData.append('report_id', reportId || `RPT-${Date.now()}`);

      const res = await uploadObservation(formData, { onProgress: setUploadProgress });

      const obsData = res.data || {};
      const inspectionSummary = res.inspection_summary || null;

      const enrichedObs = {
        observation_id: obsData.observation_id || `OBS-${Date.now()}`,
        report_id: obsData.report_id || reportId,
        vehicle_id: obsData.vehicle_id || (currentUser?.phone ? `MOB-${currentUser.phone.slice(-4)}` : 'CITIZEN-MOB'),
        report_source: obsData.report_source || 'citizen',
        report_status: obsData.report_status || 'accepted',
        location: obsData.location || {
          type: 'Point',
          coordinates: [Number(finalLng), Number(finalLat)]
        },
        latitude: Number(finalLat),
        longitude: Number(finalLng),
        sector: obsData.sector || finalSector,
        matched_road_name: obsData.matched_road_name || `${finalSector} (Live User Report)`,
        image_url: obsData.image_url,
        annotated_image_url: obsData.annotated_image_url || obsData.image_url,
        video_url: obsData.video_url || (isVideoCaptured ? capturedPreview : null),
        preview_url: capturedPreview || obsData.annotated_image_url || obsData.image_url,
        detections: obsData.detections || [],
        telemetry_z_shock: obsData.telemetry_z_shock || 3.1,
        captured_at: obsData.captured_at || exactTime,
        created_at: obsData.created_at || exactTime,
        duplicate: res.duplicate,
        inspection_summary: inspectionSummary,
        isVideo: isVideoCaptured
      };

      setUploadSuccessData(enrichedObs);
      if (onUploadSuccess) {
        onUploadSuccess(enrichedObs);
      }
    } catch (err) {
      console.error('Quick upload error:', err);
      setUploadError(err.message || 'Failed to analyze and upload road inspection.');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 30) {
            // Auto-stop after 30 seconds max to prevent stuck recordings
            setTimeout(() => toggleRecording(), 0);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
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
    <div className="min-h-screen bg-[#f7faf9] text-slate-900 flex flex-col items-center justify-start p-0 sm:py-6 sm:px-4 font-sans select-none">
      {/* ── PHONE SHELL CONTAINER ── */}
      <div className="w-full max-w-md bg-white sm:border sm:border-slate-300 sm:rounded-[44px] shadow-2xl shadow-emerald-950/10 flex flex-col min-h-screen sm:min-h-[780px] sm:max-h-[850px] relative overflow-hidden ring-1 ring-slate-200/80">
        {/* Status Bar */}
        <div className="pt-2.5 px-6 pb-1 flex items-center justify-between text-xs text-slate-600 font-bold select-none z-20 bg-white">
          <span>9:41</span>
          <div className="w-20 h-4 bg-slate-200 rounded-full mx-auto hidden sm:block" />
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-semibold text-slate-500">5G</span>
            <div className="w-4 h-2.5 border border-slate-400 rounded-xs p-0.5 flex items-center">
              <div className="w-full h-full bg-slate-600 rounded-2xs" />
            </div>
          </div>
        </div>

        {/* ── 1. LOGIN SCREEN ── */}
        {authScreen === 'login' && (
          <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto bg-[#f7faf9]">
            <div className="text-center mt-2">
              <div className="w-24 h-24 mx-auto mb-3 rounded-2xl overflow-hidden border border-slate-200 shadow-md relative">
                <img
                  src="/images/roads/road_pothole_d00.jpg"
                  alt="City Heritage"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
              </div>

              <div className="flex items-center justify-center space-x-1.5">
                <span className="text-2xl font-black text-slate-950">Jan</span>
                <span className="text-2xl font-black text-[#145547]">Drishti</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Safer Roads • Smarter Cities</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 my-4 shadow-sm">
              <div className="text-center mb-4">
                <h3 className="text-base font-bold text-slate-900">Citizen Login</h3>
                <p className="text-[11px] text-slate-500">Report potholes & road damages in your sector</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                <div className="relative flex items-center">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    placeholder="Email or Mobile"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
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
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-xs bg-[#145547] hover:bg-[#0d4339] text-white font-bold shadow-md shadow-emerald-950/15 transition-all mt-2 active:scale-98"
                >
                  Login
                </button>
              </form>

              <div className="text-center text-[11px] text-slate-500 mt-3">
                Don't have an account?{' '}
                <button
                  onClick={() => setAuthScreen('signup')}
                  className="text-[#145547] font-bold hover:underline"
                >
                  Sign Up
                </button>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400">
              JanDrishti Field Surveillance • Powered by Municipal AI
            </div>
          </div>
        )}

        {/* ── 2. SIGNUP SCREEN ── */}
        {authScreen === 'signup' && (
          <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto bg-[#f7faf9]">
            <div className="text-center mt-2">
              <div className="flex items-center justify-center space-x-1.5">
                <span className="text-2xl font-black text-slate-950">Jan</span>
                <span className="text-2xl font-black text-[#145547]">Drishti</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Safer Roads • Smarter Cities</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 my-3 shadow-sm">
              <div className="text-center mb-3">
                <h3 className="text-base font-bold text-slate-900">Create Citizen Account</h3>
                <p className="text-[11px] text-slate-500">Join to report road hazards and earn badges</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-2.5">
                <div className="relative flex items-center">
                  <User className="h-4 w-4 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
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
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
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
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                  />
                </div>

                <div className="relative flex items-center">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#145547] focus:ring-2 focus:ring-[#145547]/15 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#145547] hover:bg-[#0d4339] text-white shadow-md shadow-emerald-950/15 transition-all mt-2 active:scale-98"
                >
                  Sign Up
                </button>
              </form>

              <div className="text-center text-[11px] text-slate-500 mt-3">
                Already have an account?{' '}
                <button
                  onClick={() => setAuthScreen('login')}
                  className="text-[#145547] font-bold hover:underline"
                >
                  Login
                </button>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400">
              By signing up, you agree to Municipal Citizen Terms
            </div>
          </div>
        )}

        {/* ── 3. MAIN FIELD USER APP ── */}
        {authScreen === 'app' && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#f7faf9]">
            {/* Header */}
            <div className="px-5 pt-3 pb-2.5 flex items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center font-bold text-xs text-[#145547]">
                  {currentUser.avatar}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Hello,</p>
                  <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#f0f7f4] border border-emerald-200/80 text-[10px] text-[#145547] font-semibold">
                  <MapPin className={`h-3 w-3 ${userCoords.isReal ? 'text-blue-500 animate-pulse' : 'text-[#145547]'}`} />
                  <span className="font-bold max-w-[95px] truncate">{userCoords.city || 'Chandigarh'}</span>
                  <span className="text-emerald-300">•</span>
                  <span className="text-slate-500">{userCoords.isReal ? 'Live GPS' : '28°C'}</span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 transition-colors shadow-xs"
                    title="Logout & Return to Login Portal"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Content Tabs */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* TAB 1: HOME */}
              {userTab === 'home' && (
                <>
                  <div
                    onClick={() => setUserTab('record')}
                    className="p-4 rounded-2xl bg-gradient-to-r from-[#145547] to-[#1e6f5c] text-white flex items-center justify-between cursor-pointer shadow-md shadow-emerald-950/15 active:scale-98 transition-transform group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shadow-xs">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-white">Start Recording</h4>
                        <p className="text-[11px] text-emerald-100 font-medium">
                          Capture road photo with live GPS to detect potholes & cracks
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/80 group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setUserTab('map')}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-300 hover:bg-[#f0f7f4] cursor-pointer flex items-center space-x-3 transition-all shadow-xs"
                    >
                      <div className="p-2.5 rounded-xl bg-emerald-50 text-[#145547]">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">View Map</p>
                        <p className="text-[10px] text-slate-500 font-medium">See reported pins</p>
                      </div>
                    </div>

                    <div
                      onClick={() => setUserTab('reports')}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-300 hover:bg-[#f0f7f4] cursor-pointer flex items-center space-x-3 transition-all shadow-xs"
                    >
                      <div className="p-2.5 rounded-xl bg-emerald-50 text-[#145547]">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">My Reports</p>
                        <p className="text-[10px] text-slate-500 font-medium">View submission history</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-900">Recent Reports</h4>
                      <button onClick={() => setUserTab('reports')} className="text-[11px] text-[#145547] font-bold hover:underline">
                        See All &gt;
                      </button>
                    </div>

                    <div className="space-y-2">
                      {[
                        { title: 'Pothole', loc: 'Sector 17, Chandigarh', time: '2 min ago', status: 'Submitted', img: '/images/roads/road_pothole_d00.jpg' },
                        { title: 'Crack', loc: 'Sector 22, Chandigarh', time: '20 min ago', status: 'Submitted', img: '/images/roads/road_longitudinal_d20.jpg' },
                        { title: 'Patch Damage', loc: 'Sector 34, Chandigarh', time: '1 hour ago', status: 'Submitted', img: '/images/roads/road_alligator_d10.jpg' }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
                          <div className="flex items-center space-x-2.5">
                            <img src={item.img} alt={item.title} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-xs" />
                            <div>
                              <p className="text-xs font-bold text-slate-900">{item.title}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{item.loc}</p>
                              <span className="text-[9px] text-[#145547] font-bold flex items-center space-x-1 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                <span>{item.status}</span>
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">{item.time}</span>
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
                    <button onClick={() => setUserTab('home')} className="p-1 rounded-lg text-slate-500 hover:text-slate-800 transition-colors">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="text-xs font-bold text-slate-900">Record Road Defect</span>
                    <button
                      onClick={toggleTorch}
                      title={torchOn ? "Turn Torch Off" : "Turn Torch On"}
                      className={`p-1.5 rounded-lg transition-colors ${torchOn ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <Zap className={`h-4 w-4 ${torchOn ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>

                  {/* VIEW FINDER / PHOTO PREVIEW CONTAINER */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 h-72 flex items-center justify-center shadow-md">
                    {photoFlash && (
                      <div className="absolute inset-0 bg-white/90 z-30 transition-opacity duration-300 pointer-events-none animate-ping" />
                    )}

                    {capturedPreview ? (
                      /* 1. Captured Photo or Video Preview */
                      <>
                        {isVideoCaptured ? (
                          <video
                            src={capturedPreview}
                            controls
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={capturedPreview}
                            alt="Captured Road Hazard"
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 text-[#145547] text-[10px] font-bold flex items-center space-x-1 shadow-md border border-emerald-200 backdrop-blur z-20">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#145547]" />
                          <span>{isVideoCaptured ? '🎥 Video Inspection Recorded' : '📸 Photo Captured • Ready to Review'}</span>
                        </div>
                      </>
                    ) : cameraStream ? (
                      /* 2. Live Rear Camera Feed */
                      <>
                        <video
                          ref={(el) => {
                            userVideoRef.current = el;
                            if (el && cameraStream && el.srcObject !== cameraStream) {
                              el.srcObject = cameraStream;
                              el.play().catch(e => console.warn('Video play error:', e));
                            }
                          }}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        {/* Live HUD Overlays */}
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 border border-emerald-200 text-[#145547] text-[10px] font-bold flex items-center space-x-1.5 shadow-md backdrop-blur z-20">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>LIVE REAR CAMERA</span>
                        </div>

                        {/* Framing Reticle */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                          <div className="w-48 h-36 border border-white/40 rounded-2xl flex items-center justify-center relative">
                            <div className="w-3 h-3 border-t-2 border-l-2 border-emerald-400 absolute -top-0.5 -left-0.5" />
                            <div className="w-3 h-3 border-t-2 border-r-2 border-emerald-400 absolute -top-0.5 -right-0.5" />
                            <div className="w-3 h-3 border-b-2 border-l-2 border-emerald-400 absolute -bottom-0.5 -left-0.5" />
                            <div className="w-3 h-3 border-b-2 border-r-2 border-emerald-400 absolute -bottom-0.5 -right-0.5" />
                            <span className="text-[10px] text-white/80 font-medium">Align Road Defect</span>
                          </div>
                        </div>

                        <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/60 border border-white/20 text-[10px] font-bold text-white z-20">
                          1x
                        </div>
                      </>
                    ) : isCameraStarting ? (
                      /* 3. Initializing Loader */
                      <div className="flex flex-col items-center justify-center space-y-2 text-slate-300 p-4">
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                        <span className="text-xs font-semibold">Starting Rear Camera...</span>
                      </div>
                    ) : cameraError ? (
                      /* 4. Camera Error / Fallback State */
                      <div className="p-4 text-center space-y-2 max-w-xs">
                        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                        <p className="text-xs text-slate-200 font-semibold">{cameraError}</p>
                        <div className="flex items-center justify-center space-x-2 pt-1">
                          <button
                            onClick={startRearCamera}
                            className="px-3.5 py-1.5 rounded-xl bg-[#145547] hover:bg-[#0d4339] text-white font-bold text-xs shadow-md transition-all active:scale-95"
                          >
                            Retry Camera
                          </button>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs shadow-md transition-all active:scale-95 border border-slate-200"
                          >
                            Choose Photo
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* 5. Camera Off / Tap to Start */
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img
                          src="/images/roads/road_pothole_d00.jpg"
                          alt="Road Surface"
                          className="w-full h-full object-cover opacity-40 filter blur-[1px]"
                        />
                        <button
                          onClick={startRearCamera}
                          className="absolute px-4 py-2 rounded-xl bg-white/95 border border-emerald-200 text-[#145547] font-bold text-xs flex items-center space-x-2 shadow-lg hover:border-[#145547] transition-all active:scale-95"
                        >
                          <Camera className="w-4 h-4 text-[#145547]" />
                          <span>Start Live Rear Camera</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Hidden native camera / gallery file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept={recordMode === 'video' ? 'video/*,image/*' : 'image/*,video/*'}
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {/* ── CONDITIONAL RENDER: CAPTURED PHOTO REVIEW vs LIVE CAMERA CONTROLS ── */}
                  {capturedPreview ? (
                    /* ════════════════════════════════════════════════════════════
                       REVIEW MODE: RETAKE, CANCEL, PRESERVED GPS & UPLOAD
                       ════════════════════════════════════════════════════════════ */
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      {/* Retake & Cancel Side-by-Side Controls */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          onClick={handleRetake}
                          disabled={isUploading}
                          className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50 shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          <span>🔄 Retake</span>
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={isUploading}
                          className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50 shadow-xs"
                        >
                          <X className="w-3.5 h-3.5 text-rose-600" />
                          <span>❌ Cancel</span>
                        </button>
                      </div>

                      {/* Upload Success Card OR Upload Action Card */}
                      {uploadSuccessData ? (
                        <div className="bg-white border border-emerald-200 rounded-2xl p-4 text-center space-y-3 shadow-md">
                          <div className="inline-flex items-center space-x-1.5 text-[#145547] font-bold text-xs bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-[#145547]" />
                            <span>{uploadSuccessData.inspection_summary ? '🎥 Video Inspection Analyzed & Logged!' : 'Road Hazard Uploaded & Logged!'}</span>
                          </div>

                          <p className="text-xs text-slate-700 font-semibold">
                            {uploadSuccessData.duplicate ? 'Existing report:' : 'Report accepted:'} <span className="font-mono text-[#145547] font-bold">{uploadSuccessData.report_id || uploadSuccessData.observation_id}</span>
                          </p>

                          <p className="text-[11px] text-slate-500">
                            📍 {uploadSuccessData.matched_road_name || 'Madhya Marg (Sector 17)'}
                          </p>

                          {/* Video Inspection Summary Card if available */}
                          {uploadSuccessData.inspection_summary && (
                            <div className="bg-[#f0f7f4] border border-emerald-200/90 rounded-xl p-3 text-left text-[11px] space-y-1.5 shadow-xs">
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-slate-800">Infrastructure Health Score:</span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#145547] font-mono">
                                  {uploadSuccessData.inspection_summary.health_score}/100 ({uploadSuccessData.inspection_summary.risk_level?.toUpperCase()})
                                </span>
                              </div>
                              <div className="flex justify-between text-slate-600">
                                <span>OpenCV Extracted Frames:</span>
                                <span className="font-bold text-slate-900">{uploadSuccessData.inspection_summary.frames_processed} frames</span>
                              </div>
                              <div className="flex justify-between text-slate-600">
                                <span>Detected Road Defects:</span>
                                <span className="font-bold text-rose-600">
                                  {uploadSuccessData.inspection_summary.potholes_count} Potholes • {uploadSuccessData.inspection_summary.cracks_count} Cracks
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 pt-1 border-t border-emerald-200/60">
                                Recommended Action: <b className="text-slate-800">{uploadSuccessData.inspection_summary.recommended_action}</b>
                              </div>
                            </div>
                          )}

                          {uploadSuccessData.preview_url && !uploadSuccessData.isVideo && (
                            <div className="w-28 h-20 mx-auto rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                              <img src={uploadSuccessData.preview_url} alt="Uploaded" className="w-full h-full object-cover" />
                            </div>
                          )}

                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              onClick={() => setUserTab('map')}
                              className="flex-1 py-2.5 rounded-xl bg-[#145547] hover:bg-[#0d4339] text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-95"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View Pin on Map 🗺️</span>
                            </button>
                            <button
                              onClick={handleRetake}
                              className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center space-x-1 shadow-xs"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Inspect New</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white border border-emerald-200 rounded-2xl p-3.5 space-y-3 shadow-md">
                          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
                            <div className="flex items-center space-x-1.5 text-[#145547] font-bold">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{isVideoCaptured ? 'Road Inspection Video Ready' : 'Photo Ready to Upload'}</span>
                            </div>
                            <span className="text-[10px] bg-emerald-50 text-[#145547] px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                              {isVideoCaptured ? 'OpenCV / YOLO' : 'GPS Tagged'}
                            </span>
                          </div>

                          {/* Preserved Telemetry: Locked GPS & Capture Timestamp */}
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                            <div className="flex items-center space-x-1.5 truncate">
                              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate font-medium">
                                {(lockedCoords?.lat ?? userCoords.lat).toFixed(4)}°N, {(lockedCoords?.lng ?? userCoords.lng).toFixed(4)}°E
                              </span>
                            </div>
                            <div className="flex items-center space-x-1.5 justify-end text-slate-500">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{new Date(captureTimestamp || Date.now()).toLocaleTimeString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                            <span>Sector: <strong className="text-slate-800">{lockedCoords?.city || userCoords.city || 'Chandigarh'}</strong></span>
                            <span className="text-[#145547] font-mono font-bold">±{lockedCoords?.accuracy || userCoords.accuracy}m Accuracy</span>
                          </div>

                          {uploadError && (
                            <p className="text-[11px] text-rose-700 text-center font-medium bg-rose-50 p-2 rounded-xl border border-rose-200">
                              {uploadError}
                            </p>
                          )}

                          {isUploading && (
                            <div className="space-y-1" aria-live="polite">
                              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                <span>{isVideoCaptured ? 'Uploading video & extracting frames with OpenCV...' : 'Uploading photo & running road-damage detection...'}</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#145547] transition-all" style={{ width: `${uploadProgress}%` }} /></div>
                            </div>
                          )}

                          {/* EXPLICIT UPLOAD BUTTON */}
                          <button
                            onClick={handleQuickUpload}
                            disabled={isUploading}
                            className="w-full py-3 px-4 rounded-xl bg-[#145547] hover:bg-[#0d4339] text-white font-bold text-xs transition-all shadow-md shadow-emerald-950/15 flex items-center justify-center space-x-2 active:scale-[0.98] disabled:opacity-50 mt-1"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                <span>{uploadProgress < 100 ? `Uploading ${uploadProgress}%...` : (isVideoCaptured ? 'Extracting frames & running YOLOv8...' : 'Validating road photo & detecting damage...')}</span>
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-4 h-4 text-white" />
                                <span>{isVideoCaptured ? 'Upload & Run AI Video Inspection' : 'Upload & Log Hazard to JanDrishti'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ════════════════════════════════════════════════════════════
                       LIVE CAMERA VIEW CONTROLS (PHOTO & VIDEO SHUTTER)
                       ════════════════════════════════════════════════════════════ */
                    <div className="space-y-3">
                      {/* Live GPS Telemetry Status Bar */}
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-xs text-[10px]">
                        <div className="flex items-center space-x-1.5 text-slate-600">
                          <MapPin className={`w-3.5 h-3.5 ${userCoords.isReal ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`} />
                          <span className="font-semibold text-slate-800">
                            {userCoords.isReal
                              ? `${userCoords.lat?.toFixed(4)}°, ${userCoords.lng?.toFixed(4)}° (${userCoords.city})`
                              : '30.7450° N, 76.7760° E (Sector 17)'}
                          </span>
                        </div>
                        <span className="text-[#145547] font-mono font-bold">
                          {userCoords.isReal ? `±${userCoords.accuracy}m GPS Fix` : 'Demo Sector'}
                        </span>
                      </div>

                      {/* Photo / Video Mode Selector */}
                      <div className="flex items-center justify-center space-x-2 bg-slate-100 p-1 rounded-xl max-w-[200px] mx-auto border border-slate-200">
                        <button
                          onClick={() => setRecordMode('photo')}
                          className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${
                            recordMode === 'photo' ? 'bg-[#145547] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Photo
                        </button>
                        <button
                          onClick={() => setRecordMode('video')}
                          className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${
                            recordMode === 'video' ? 'bg-[#145547] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Video
                        </button>
                      </div>

                      {/* Phone Native Camera / Gallery Upload Trigger */}
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-[#145547] text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-all active:scale-95"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#145547]" />
                          <span>📸 Snap / Choose Photo from Phone</span>
                        </button>
                      </div>

                      {/* Shutter Button */}
                      <div className="flex items-center justify-center py-1">
                        <button
                          onClick={toggleRecording}
                          title={recordMode === 'video' ? (isRecording ? "Stop Recording" : "Start Recording") : "Capture Photo"}
                          className={`w-16 h-16 rounded-full border-4 ${isRecording ? 'border-rose-300' : 'border-slate-300'} p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md`}
                        >
                          <div className={`w-full h-full rounded-full ${isRecording ? 'bg-rose-600 animate-pulse' : 'bg-[#145547]'} flex items-center justify-center shadow-xs`}>
                            {recordMode === 'video' ? (
                              isRecording ? <Square className="h-5 w-5 text-white" /> : <div className="w-6 h-6 rounded-full bg-white" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-white" />
                            )}
                          </div>
                        </button>
                      </div>

                      {/* Shutter Status Text */}
                      <div className="text-center text-xs">
                        {recordMode === 'video' ? (
                          isRecording ? (
                            <span className="text-rose-600 font-bold flex items-center justify-center space-x-1.5 animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                              <span>Recording... {formatTime(recordingSeconds)} / 00:30</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium flex items-center justify-center space-x-1.5">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              <span>Ready to Record • Tap button to start</span>
                            </span>
                          )
                        ) : (
                          <span className="text-slate-600 font-medium flex items-center justify-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#145547]" />
                            <span>Photo Mode • Tap shutter button to snap road hazard</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: LIVE MAP */}
              {userTab === 'map' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setUserTab('home')} className="p-1 rounded-lg text-slate-500 hover:text-slate-800 transition-colors">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="text-xs font-bold text-slate-900">Live Map</span>
                    <button onClick={onOpenUpload} className="p-1 text-[#145547] hover:text-[#0d4339] transition-colors">
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search location..."
                      className="w-full bg-white border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#145547] focus:ring-1 focus:ring-[#145547] shadow-xs"
                    />
                  </div>

                  {/* Map Header Info */}
                  <div className="flex items-center justify-between text-xs bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-semibold text-slate-800">
                        {userCoords.isReal ? `Live: ${userCoords.city}` : 'Smart City Map'}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#145547] font-mono font-bold">
                      {userCoords.isReal ? `${userCoords.lat?.toFixed(4)}, ${userCoords.lng?.toFixed(4)}` : 'Chandigarh'}
                    </span>
                  </div>

                  <div className="h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-200/90 relative shadow-sm">
                    <RoadMap
                      geojson={roadsGeoJson}
                      observations={observations}
                      userLocation={userCoords}
                      height="100%"
                    />
                  </div>

                  <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900">Reported Issues</span>
                      <span className="text-[10px] text-[#145547] font-bold cursor-pointer hover:underline">View All</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="flex items-center space-x-2">
                          <Flame className="h-3.5 w-3.5 text-rose-500" />
                          <span>Pothole</span>
                        </span>
                        <b className="text-slate-900">48</b>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="flex items-center space-x-2">
                          <Activity className="h-3.5 w-3.5 text-amber-500" />
                          <span>Crack</span>
                        </span>
                        <b className="text-slate-900">32</b>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="flex items-center space-x-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#145547]" />
                          <span>Patch Damage</span>
                        </span>
                        <b className="text-slate-900">18</b>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: REPORTS */}
              {userTab === 'reports' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setUserTab('home')} className="p-1 rounded-lg text-slate-500 hover:text-slate-800 transition-colors">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="text-xs font-bold text-slate-900">My Hazard Reports</span>
                    <span />
                  </div>

                  <div className="space-y-2.5">
                    {observations.filter(o => o.report_source === 'citizen' || o.vehicle_id?.startsWith('MOB-') || o.vehicle_id?.startsWith('CITIZEN-') || o.video_url || o.video_id).map(r => {
                      const damage = r.detections?.[0] || {};
                      const isVid = Boolean(r.video_url || r.video_id);
                      const keyId = r.report_id || r.observation_id;
                      const isExpanded = expandedReportId === keyId;
                      const imgUrl = resolveImageUrl(r.annotated_image_url || r.image_url);
                      const vidUrl = r.video_url ? resolveImageUrl(r.video_url) : null;

                      return (
                      <div key={keyId} className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start space-x-2.5 min-w-0">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt="Report Thumbnail"
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/images/roads/road_pothole_d00.jpg'; }}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {damage.class_name ? `${damage.class_name} (${damage.class_id || 'RDD'})` : (isVid ? 'Road Video Inspection' : 'Road Surface Hazard')}
                                </p>
                                {isVid && (
                                  <span className="text-[9px] font-bold bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded border border-purple-200 inline-flex items-center space-x-0.5">
                                    <Video className="w-2.5 h-2.5" />
                                    <span>Video</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 truncate">{r.matched_road_name || r.sector || 'Field location'} • {new Date(r.captured_at || r.created_at || Date.now()).toLocaleTimeString()}</p>
                              <div className="flex items-center space-x-1 mt-1">
                                <span className="text-[9px] font-semibold text-[#145547] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                                  {r.report_status === 'accepted' ? 'Accepted & Geotagged' : 'Processed'}
                                </span>
                                {damage.severity && (
                                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                                    {String(damage.severity).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setExpandedReportId(isExpanded ? null : keyId)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 shrink-0"
                            title={isExpanded ? 'Collapse' : 'Expand Details'}
                          >
                            {isExpanded ? <ChevronLeft className="w-4 h-4 rotate-90" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Expandable Details Container */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-2 animate-in fade-in duration-150">
                            {vidUrl && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-600 flex items-center space-x-1">
                                  <Video className="w-3 h-3 text-purple-600" />
                                  <span>Recorded Inspection Video:</span>
                                </span>
                                <video
                                  src={vidUrl}
                                  controls
                                  playsInline
                                  className="w-full h-40 rounded-xl bg-black object-cover shadow-xs border border-slate-200"
                                />
                              </div>
                            )}

                            {r.annotated_image_url && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-600 flex items-center space-x-1">
                                  <Sparkles className="w-3 h-3 text-[#145547]" />
                                  <span>YOLOv8 Detection Annotation:</span>
                                </span>
                                <img
                                  src={resolveImageUrl(r.annotated_image_url)}
                                  alt="YOLO Annotation"
                                  className="w-full h-40 rounded-xl object-cover shadow-xs border border-slate-200"
                                />
                              </div>
                            )}

                            {/* Telemetry & Detection Meta */}
                            <div className="bg-[#f0f7f4] p-2.5 rounded-xl border border-emerald-100 text-[10px] space-y-1">
                              <p className="text-slate-700">
                                <b>GPS Snapped Road:</b> {r.matched_road_name || 'Chandigarh Urban Network'}
                              </p>
                              <p className="text-slate-600 font-mono">
                                <b>Coordinates:</b> {r.location?.coordinates ? `${r.location.coordinates[1].toFixed(4)}°N, ${r.location.coordinates[0].toFixed(4)}°E` : `${r.latitude || 30.74}°N, ${r.longitude || 76.78}°E`}
                              </p>
                              {r.detections && r.detections.length > 0 && (
                                <p className="text-[#145547] font-semibold">
                                  <b>Detections ({r.detections.length}):</b> {r.detections.map(d => `${d.class_name} (${Math.round((d.confidence || 0.85)*100)}% conf)`).join(', ')}
                                </p>
                              )}
                              {r.frame_timestamp_ms !== undefined && (
                                <p className="text-slate-500">
                                  <b>Frame Offset:</b> {(r.frame_timestamp_ms / 1000).toFixed(1)}s into video inspection
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )})}
                    {observations.filter(o => o.report_source === 'citizen' || o.vehicle_id?.startsWith('MOB-') || o.vehicle_id?.startsWith('CITIZEN-') || o.video_url || o.video_id).length === 0 && (
                      <p className="p-5 text-center text-xs text-slate-400">No submitted reports yet. Capture a road photo or video to start one.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: PROFILE */}
              {userTab === 'profile' && (
                <div className="space-y-4 text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 mx-auto flex items-center justify-center text-xl font-bold text-[#145547] shadow-xs">
                    {currentUser.avatar}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{currentUser.name}</h3>
                    <p className="text-xs text-slate-500">{currentUser.email}</p>
                    <p className="text-xs text-slate-500">{currentUser.phone}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-xl text-left text-xs space-y-2">
                    <p className="text-slate-600">Total Hazards Reported: <b className="text-slate-900 font-bold">14</b></p>
                    <p className="text-slate-600">Verified Cleared: <b className="text-[#145547] font-bold">9</b></p>
                    <p className="text-slate-600">Contribution Rank: <b className="text-amber-700 font-bold">Top 5% Citizen</b></p>
                  </div>

                  <button
                    onClick={() => {
                      if (onLogout) onLogout();
                      else setAuthScreen('login');
                    }}
                    className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors shadow-xs"
                  >
                    Logout / Switch Account
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Nav */}
            <div className="bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-2 flex items-center justify-between text-[10px] text-slate-500 relative shadow-sm">
              <button
                onClick={() => setUserTab('home')}
                className={`flex flex-col items-center space-y-0.5 transition-colors ${userTab === 'home' ? 'text-[#145547] font-bold' : 'hover:text-slate-900'}`}
              >
                <div className="h-4 w-4 flex items-center justify-center">🏠</div>
                <span>Home</span>
              </button>

              <button
                onClick={() => setUserTab('map')}
                className={`flex flex-col items-center space-y-0.5 transition-colors ${userTab === 'map' ? 'text-[#145547] font-bold' : 'hover:text-slate-900'}`}
              >
                <MapPin className="h-4 w-4" />
                <span>Map</span>
              </button>

              <div className="relative -top-4">
                <button
                  onClick={() => setUserTab('record')}
                  className="w-12 h-12 rounded-full bg-[#145547] hover:bg-[#0d4339] text-white flex items-center justify-center shadow-lg shadow-emerald-950/20 border-4 border-white active:scale-95 transition-transform"
                >
                  <Camera className="h-5 w-5" />
                </button>
              </div>

              <button
                onClick={() => setUserTab('reports')}
                className={`flex flex-col items-center space-y-0.5 transition-colors ${userTab === 'reports' ? 'text-[#145547] font-bold' : 'hover:text-slate-900'}`}
              >
                <FileText className="h-4 w-4" />
                <span>Reports</span>
              </button>

              <button
                onClick={() => setUserTab('profile')}
                className={`flex flex-col items-center space-y-0.5 transition-colors ${userTab === 'profile' ? 'text-[#145547] font-bold' : 'hover:text-slate-900'}`}
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
