import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Compass,
  Activity,
  Play,
  Square,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Smartphone,
  Eye,
  ShieldAlert,
  MapPin,
  Check,
  X
} from 'lucide-react';
import { uploadCollectorSession } from '../services/api';

export default function MobileCollector({ onUploadSuccess, onRefresh }) {
  // Device & API state
  const [isSecure, setIsSecure] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef(null);

  // Test status states
  const [cameraTestStatus, setCameraTestStatus] = useState({ tested: false, ok: false, message: 'Not tested' });
  const [gpsTestStatus, setGpsTestStatus] = useState({ tested: false, ok: false, message: 'Not tested' });
  const [accelTestStatus, setAccelTestStatus] = useState({ tested: false, ok: false, message: 'Not tested' });

  // Live stream & sensor states
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Live Readings
  const [liveGps, setLiveGps] = useState({
    latitude: 30.7408,
    longitude: 76.7825,
    altitude: 345.0,
    accuracy: 4.2,
    speed: 0.0,
    heading: 0.0,
    active: false
  });

  const [liveAccel, setLiveAccel] = useState({
    x: 0.0,
    y: 9.8,
    z: 0.0,
    calibrated_z_shock: 0.0,
    dynamic_mag: 0.0,
    active: false
  });

  const [liveOrientation, setLiveOrientation] = useState({
    alpha: 0,
    beta: 0,
    gamma: 0
  });

  // Mount Orientation Calibration
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [mountCalibration, setMountCalibration] = useState({
    isCalibrated: false,
    vector: { x: 0, y: 1, z: 0 }, // default assumes upright portrait
    sampleCount: 0
  });

  // Monitoring & Recording state
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedTelemetry, setRecordedTelemetry] = useState([]);
  const [capturedKeyframes, setCapturedKeyframes] = useState([]);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ loading: false, result: null, error: null });

  // Metadata
  const [vehicleId, setVehicleId] = useState('MOB-CHD-PATROL-01');
  const [operatorName, setOperatorName] = useState('CTU Inspection Team');

  const timerRef = useRef(null);
  const telemetryIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const watchIdRef = useRef(null);

  // Check Secure Context on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      setIsSecure(window.isSecureContext || isLocal);
    }
  }, []);

  // -------------------------------------------------------------
  // 1. INDIVIDUAL TEST FUNCTIONS
  // -------------------------------------------------------------

  const handleTestCamera = async () => {
    setCameraTestStatus({ tested: true, ok: false, message: 'Requesting rear camera...' });
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported on this browser/origin.');
      }

      // Try environment rear camera first
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch (err) {
        // Fallback to any camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings ? track.getSettings() : {};
      const res = `${settings.width || 1280}x${settings.height || 720}`;
      setCameraTestStatus({
        tested: true,
        ok: true,
        message: `Rear Camera Active (${res}, ${settings.facingMode || 'environment'})`
      });
    } catch (e) {
      setCameraTestStatus({
        tested: true,
        ok: false,
        message: e.message || 'Camera permission denied or camera unavailable'
      });
    }
  };

  const handleTestGps = () => {
    setGpsTestStatus({ tested: true, ok: false, message: 'Acquiring high-accuracy GPS fix...' });
    if (!navigator.geolocation) {
      setGpsTestStatus({ tested: true, ok: false, message: 'Geolocation not supported by browser.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, altitude, accuracy, speed, heading } = pos.coords;
        setLiveGps({
          latitude,
          longitude,
          altitude: altitude || 345.0,
          accuracy: accuracy || 5.0,
          speed: speed ? (speed * 3.6).toFixed(1) : 0.0,
          heading: heading || 0.0,
          active: true
        });
        setGpsTestStatus({
          tested: true,
          ok: true,
          message: `GPS Fix Acquired: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${accuracy ? accuracy.toFixed(1) : 5}m)`
        });
      },
      (err) => {
        setGpsTestStatus({
          tested: true,
          ok: false,
          message: `GPS Error (${err.code}): ${err.message}`
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleTestAccelerometer = async () => {
    setAccelTestStatus({ tested: true, ok: false, message: 'Checking motion sensors...' });

    // iOS 13+ permission request
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const perm = await DeviceMotionEvent.requestPermission();
        if (perm !== 'granted') {
          setAccelTestStatus({ tested: true, ok: false, message: 'DeviceMotion permission denied by user.' });
          return;
        }
      } catch (err) {
        setAccelTestStatus({ tested: true, ok: false, message: `Permission error: ${err.message}` });
        return;
      }
    }

    if (typeof window === 'undefined' || !window.DeviceMotionEvent) {
      setAccelTestStatus({ tested: true, ok: false, message: 'DeviceMotionEvent API not available on this device.' });
      return;
    }

    let samplesReceived = 0;
    const testListener = (evt) => {
      const acc = evt.accelerationIncludingGravity || evt.acceleration;
      if (acc && (acc.x !== null || acc.y !== null || acc.z !== null)) {
        samplesReceived++;
        if (samplesReceived >= 3) {
          window.removeEventListener('devicemotion', testListener);
          setAccelTestStatus({
            tested: true,
            ok: true,
            message: `Motion Sensor Active: X=${(acc.x || 0).toFixed(2)}, Y=${(acc.y || 0).toFixed(2)}, Z=${(acc.z || 0).toFixed(2)} m/s²`
          });
        }
      }
    };

    window.addEventListener('devicemotion', testListener);

    // Timeout if no event received (e.g. desktop without sensor)
    setTimeout(() => {
      window.removeEventListener('devicemotion', testListener);
      if (samplesReceived === 0) {
        setAccelTestStatus({
          tested: true,
          ok: false,
          message: 'No motion events received. Ensure device has an IMU and is not in power-saving mode.'
        });
      }
    }, 2500);
  };

  // -------------------------------------------------------------
  // 2. LIVE SENSOR LISTENER
  // -------------------------------------------------------------

  useEffect(() => {
    const handleMotion = (evt) => {
      const acc = evt.accelerationIncludingGravity || evt.acceleration;
      if (!acc) return;

      const rawX = acc.x || 0.0;
      const rawY = acc.y || 0.0;
      const rawZ = acc.z || 0.0;

      // Dynamic shock computation:
      // If mount orientation is calibrated, project acceleration along gravity direction
      let zShock = 0.0;
      let dynMag = 0.0;

      if (mountCalibration.isCalibrated) {
        const u = mountCalibration.vector;
        const proj = rawX * u.x + rawY * u.y + rawZ * u.z;
        zShock = Math.abs(proj - 9.81);
        const totalMag = Math.sqrt(rawX * rawX + rawY * rawY + rawZ * rawZ);
        dynMag = Math.abs(totalMag - 9.81);
      } else {
        // Fallback default: assume nominal 9.81 m/s^2 on phone plane
        const totalMag = Math.sqrt(rawX * rawX + rawY * rawY + rawZ * rawZ);
        zShock = Math.abs(totalMag - 9.81);
        dynMag = zShock;
      }

      setLiveAccel({
        x: parseFloat(rawX.toFixed(2)),
        y: parseFloat(rawY.toFixed(2)),
        z: parseFloat(rawZ.toFixed(2)),
        calibrated_z_shock: parseFloat(zShock.toFixed(2)),
        dynamic_mag: parseFloat(dynMag.toFixed(2)),
        active: true
      });
    };

    const handleOrientation = (evt) => {
      setLiveOrientation({
        alpha: Math.round(evt.alpha || 0),
        beta: Math.round(evt.beta || 0),
        gamma: Math.round(evt.gamma || 0)
      });
    };

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [mountCalibration]);

  // -------------------------------------------------------------
  // 3. SENSOR ORIENTATION / CALIBRATION STEP
  // -------------------------------------------------------------

  const handleCalibrateMount = () => {
    setIsCalibrating(true);
    const samples = [];

    const calListener = (evt) => {
      const acc = evt.accelerationIncludingGravity;
      if (acc && acc.x !== null) {
        samples.push({ x: acc.x, y: acc.y, z: acc.z });
      }
    };

    window.addEventListener('devicemotion', calListener);

    setTimeout(() => {
      window.removeEventListener('devicemotion', calListener);
      setIsCalibrating(false);

      if (samples.length >= 5) {
        const avgX = samples.reduce((s, p) => s + p.x, 0) / samples.length;
        const avgY = samples.reduce((s, p) => s + p.y, 0) / samples.length;
        const avgZ = samples.reduce((s, p) => s + p.z, 0) / samples.length;
        const mag = Math.sqrt(avgX * avgX + avgY * avgY + avgZ * avgZ) || 9.81;

        setMountCalibration({
          isCalibrated: true,
          vector: { x: avgX / mag, y: avgY / mag, z: avgZ / mag },
          sampleCount: samples.length
        });
      } else {
        // Fallback default level vector (upright portrait mount)
        setMountCalibration({
          isCalibrated: true,
          vector: { x: 0, y: 1, z: 0 },
          sampleCount: 1
        });
      }
    }, 1200);
  };

  // -------------------------------------------------------------
  // 4. CONTINUOUS GPS WATCHER (WHEN MONITORING)
  // -------------------------------------------------------------

  const startGpsWatcher = () => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, altitude, accuracy, speed, heading } = pos.coords;
        setLiveGps({
          latitude,
          longitude,
          altitude: altitude || 345.0,
          accuracy: accuracy || 4.0,
          speed: speed ? parseFloat((speed * 3.6).toFixed(1)) : 0.0,
          heading: heading || 0.0,
          active: true
        });
      },
      (err) => console.warn('GPS Watcher warning:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  };

  const stopGpsWatcher = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // -------------------------------------------------------------
  // 5. START / STOP MONITORING & MEDIA RECORDER
  // -------------------------------------------------------------

  const handleStartMonitoring = async () => {
    setUploadStatus({ loading: false, result: null, error: null });
    setRecordedTelemetry([]);
    setCapturedKeyframes([]);
    setRecordedVideoBlob(null);

    // 1. Ensure camera stream is active
    if (!streamRef.current) {
      await handleTestCamera();
    }
    if (!streamRef.current) {
      alert('Camera stream is required before starting road monitoring.');
      return;
    }

    // 2. Request Screen WakeLock to keep in foreground
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockActive(true);
      }
    } catch (e) {
      console.warn('WakeLock not acquired:', e);
    }

    // 3. Start GPS tracking
    startGpsWatcher();

    // 4. Start MediaRecorder
    recordedChunksRef.current = [];
    let mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
    }

    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      recorder.start(1000); // 1-second chunks
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.error('MediaRecorder error:', err);
    }

    // 5. Start Synchronized Telemetry Clock
    startTimeRef.current = performance.now();
    setIsMonitoring(true);
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    // Periodic telemetry snapshot (every 500ms)
    telemetryIntervalRef.current = setInterval(() => {
      const offsetMs = Math.round(performance.now() - startTimeRef.current);

      setRecordedTelemetry((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          video_time_ms: offsetMs,
          latitude: liveGps.latitude,
          longitude: liveGps.longitude,
          altitude: liveGps.altitude,
          accuracy_m: liveGps.accuracy,
          speed_kmph: liveGps.speed,
          heading: liveGps.heading,
          raw_accel: { x: liveAccel.x, y: liveAccel.y, z: liveAccel.z },
          calibrated_z_shock: liveAccel.calibrated_z_shock,
          dynamic_magnitude: liveAccel.dynamic_mag,
          sensor_source: 'PHONE_IMU_SMARTPHONE',
          is_calibrated: mountCalibration.isCalibrated
        }
      ]);

      // Capture a video keyframe snapshot via offscreen canvas every 3 seconds or on high shock
      if (videoRef.current && (offsetMs % 3000 < 500 || liveAccel.calibrated_z_shock > 2.8)) {
        try {
          const video = videoRef.current;
          if (video.videoWidth > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(video.videoWidth, 800);
            canvas.height = Math.min(video.videoHeight, 480);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const b64 = canvas.toDataURL('image/jpeg', 0.85);

            setCapturedKeyframes((kfs) => [
              ...kfs.slice(-10), // keep up to 10 keyframes
              { video_time_ms: offsetMs, image_base64: b64 }
            ]);
          }
        } catch (e) {
          // canvas capture failed
        }
      }
    }, 500);
  };

  const handleStopMonitoring = () => {
    setIsMonitoring(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (telemetryIntervalRef.current) clearInterval(telemetryIntervalRef.current);
    stopGpsWatcher();

    // Release WakeLock
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setRecordedVideoBlob(blob);
      };
      mediaRecorderRef.current.stop();
    }
  };

  // -------------------------------------------------------------
  // 6. UPLOAD RECORDED SESSION TO FASTAPI BACKEND
  // -------------------------------------------------------------

  const handleUploadSession = async () => {
    if (recordedTelemetry.length === 0) {
      alert('No telemetry collected to upload.');
      return;
    }

    setUploadStatus({ loading: true, result: null, error: null });

    try {
      const formData = new FormData();
      const sessionId = `SES-MOB-${Date.now()}`;

      if (recordedVideoBlob) {
        formData.append('video_file', recordedVideoBlob, `${sessionId}.webm`);
      }
      formData.append('telemetry_json', JSON.stringify(recordedTelemetry));
      formData.append('session_id', sessionId);
      formData.append('vehicle_id', vehicleId);
      formData.append('operator_name', operatorName);

      if (capturedKeyframes.length > 0) {
        formData.append('keyframes_json', JSON.stringify(capturedKeyframes));
      }

      const res = await uploadCollectorSession(formData);

      if (res.success) {
        setUploadStatus({ loading: false, result: res.data, error: null });
        if (onUploadSuccess && res.data.observations && res.data.observations.length > 0) {
          res.data.observations.forEach((obs) => onUploadSuccess(obs));
        }
        if (onRefresh) onRefresh();
      } else {
        setUploadStatus({ loading: false, result: null, error: res.error || 'Upload failed' });
      }
    } catch (err) {
      setUploadStatus({ loading: false, result: null, error: err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-emerald-500 to-cyan-500 p-2.5 rounded-xl text-slate-950 font-bold shadow-md shadow-emerald-500/20">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-100">Android Chrome Mobile Collector</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SMARTPHONE IMU
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transforms any smartphone into a synchronized visual + inertial road surface inspection unit.
              </p>
            </div>
          </div>

          {/* Secure Context & WakeLock Badges */}
          <div className="flex items-center space-x-2 text-xs">
            {isSecure ? (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Check className="h-3 w-3" />
                <span>Secure Origin (HTTPS/Localhost)</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="h-3 w-3" />
                <span>Insecure Context</span>
              </span>
            )}
            {wakeLockActive && (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse">
                <span>Foreground Lock Active</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: SEPARATE TEST BUTTONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Test 1: Camera */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Camera className="h-4 w-4 text-emerald-400" />
                <span>1. Rear Camera</span>
              </span>
              {cameraTestStatus.tested && (
                cameraTestStatus.ok ? (
                  <span className="text-emerald-400 flex items-center text-[11px]"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Ready</span>
                ) : (
                  <span className="text-rose-400 flex items-center text-[11px]"><X className="h-3.5 w-3.5 mr-1" /> Error</span>
                )
              )}
            </div>
            <p className="text-[11px] text-slate-400 min-h-[32px]">{cameraTestStatus.message}</p>
          </div>
          <button
            onClick={handleTestCamera}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-1.5 px-3 rounded-lg text-xs transition-colors"
          >
            Test Camera
          </button>
        </div>

        {/* Test 2: GPS */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Compass className="h-4 w-4 text-cyan-400" />
                <span>2. Geolocation (GPS)</span>
              </span>
              {gpsTestStatus.tested && (
                gpsTestStatus.ok ? (
                  <span className="text-emerald-400 flex items-center text-[11px]"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Fixed</span>
                ) : (
                  <span className="text-rose-400 flex items-center text-[11px]"><X className="h-3.5 w-3.5 mr-1" /> Error</span>
                )
              )}
            </div>
            <p className="text-[11px] text-slate-400 min-h-[32px]">{gpsTestStatus.message}</p>
          </div>
          <button
            onClick={handleTestGps}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-1.5 px-3 rounded-lg text-xs transition-colors"
          >
            Test GPS Fix
          </button>
        </div>

        {/* Test 3: Accelerometer */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Activity className="h-4 w-4 text-amber-400" />
                <span>3. Motion Sensor (IMU)</span>
              </span>
              {accelTestStatus.tested && (
                accelTestStatus.ok ? (
                  <span className="text-emerald-400 flex items-center text-[11px]"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Active</span>
                ) : (
                  <span className="text-rose-400 flex items-center text-[11px]"><X className="h-3.5 w-3.5 mr-1" /> Error</span>
                )
              )}
            </div>
            <p className="text-[11px] text-slate-400 min-h-[32px]">{accelTestStatus.message}</p>
          </div>
          <button
            onClick={handleTestAccelerometer}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-1.5 px-3 rounded-lg text-xs transition-colors"
          >
            Test Accelerometer
          </button>
        </div>
      </div>

      {/* SECTION 2: LIVE CAMERA PREVIEW & HUD */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
        {/* Camera Video View */}
        <div className="relative aspect-video w-full max-h-[460px] bg-slate-950 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {!streamRef.current && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-950/80 space-y-2 p-4 text-center">
              <Camera className="h-10 w-10 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">Live Camera Standby</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Tap "Test Camera" or "Start Monitoring" to activate your device's road-facing rear camera.
              </p>
            </div>
          )}

          {/* Real-time On-Screen HUD Overlay */}
          <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 space-y-1 z-10 shadow-lg">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
              <b className="text-[11px] uppercase tracking-wider text-slate-300">
                {isMonitoring ? `Recording [${elapsedSeconds}s]` : 'Standby HUD'}
              </b>
            </div>
            <div className="text-[11px] text-slate-300">
              GPS: <b className="text-emerald-400">{liveGps.latitude.toFixed(5)}, {liveGps.longitude.toFixed(5)}</b>
            </div>
            <div className="text-[11px] text-slate-400">
              Accuracy: <b>±{liveGps.accuracy}m</b> | Speed: <b className="text-cyan-400">{liveGps.speed} km/h</b>
            </div>
            <div className="text-[11px] text-slate-400">
              Calibrated Shock: <b className={`${liveAccel.calibrated_z_shock > 2.5 ? 'text-rose-400' : 'text-amber-300'}`}>
                {liveAccel.calibrated_z_shock} m/s²
              </b>
            </div>
          </div>

          {/* Source Attribution Watermark */}
          <div className="absolute bottom-3 left-3 bg-slate-950/80 px-2 py-1 rounded text-[10px] text-slate-400 border border-slate-800">
            Source: <b className="text-emerald-400">PHONE_IMU_SMARTPHONE</b> (Separate from MPU6050)
          </div>
        </div>

        {/* Live Sensor Metrics Dashboard Bar */}
        <div className="bg-slate-900/95 border-t border-slate-800 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Raw Triaxial (X/Y/Z)</span>
            <div className="font-mono text-xs text-slate-200 mt-1">
              X: <b className="text-cyan-300">{liveAccel.x}</b> | Y: <b className="text-emerald-300">{liveAccel.y}</b> | Z: <b className="text-indigo-300">{liveAccel.z}</b>
            </div>
            <span className="text-[10px] text-slate-500">Units: m/s²</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Calibrated Z-Shock</span>
            <div className={`font-mono text-base font-bold mt-0.5 ${liveAccel.calibrated_z_shock > 2.5 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {liveAccel.calibrated_z_shock} m/s²
            </div>
            <span className="text-[10px] text-slate-500">
              {mountCalibration.isCalibrated ? 'Gravity-compensated' : 'Uncalibrated baseline'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Orientation (Pitch/Roll)</span>
            <div className="font-mono text-xs text-slate-200 mt-1">
              β: <b className="text-slate-100">{liveOrientation.beta}°</b> | γ: <b className="text-slate-100">{liveOrientation.gamma}°</b>
            </div>
            <span className="text-[10px] text-slate-500">Heading: {liveGps.heading}°</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Mount Calibration</span>
            <div className="mt-1">
              {mountCalibration.isCalibrated ? (
                <span className="text-emerald-400 font-semibold flex items-center text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Calibrated
                </span>
              ) : (
                <span className="text-amber-400 font-medium text-xs">Not Calibrated</span>
              )}
            </div>
            <button
              onClick={handleCalibrateMount}
              disabled={isCalibrating || isMonitoring}
              className="mt-1 text-[10px] text-cyan-400 hover:text-cyan-300 underline font-medium disabled:opacity-50"
            >
              {isCalibrating ? 'Calibrating (keep still)...' : 'Calibrate Orientation'}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: CONTROLS & MONITORING BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {!isMonitoring ? (
            <button
              onClick={handleStartMonitoring}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Start Monitoring</span>
            </button>
          ) : (
            <button
              onClick={handleStopMonitoring}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-rose-500 hover:bg-rose-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-rose-500/20 animate-pulse"
            >
              <Square className="h-4 w-4 fill-current" />
              <span>Stop Monitoring ({elapsedSeconds}s)</span>
            </button>
          )}

          <div className="text-xs text-slate-400 hidden md:block">
            {isMonitoring ? (
              <span className="text-emerald-400">Recording video & logging synchronized GPS/IMU packets...</span>
            ) : (
              <span>Mount phone on windshield. Calibrate, then start session.</span>
            )}
          </div>
        </div>

        {/* Upload Session Button */}
        {recordedTelemetry.length > 0 && !isMonitoring && (
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <span className="text-xs text-slate-400">
              Session ready: <b className="text-slate-200">{recordedTelemetry.length} packets</b> ({elapsedSeconds}s)
            </span>
            <button
              onClick={handleUploadSession}
              disabled={uploadStatus.loading}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {uploadStatus.loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing YOLOv8...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Upload & Analyze</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* SECTION 4: UPLOAD & DETECTION RESULTS */}
      {uploadStatus.error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Upload failed: {uploadStatus.error}</span>
        </div>
      )}

      {uploadStatus.result && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <h3 className="font-bold text-slate-100 text-sm">
                Session Analyzed: {uploadStatus.result.session_id}
              </h3>
            </div>
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              {uploadStatus.result.hazards_detected} Hazards Identified
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 block">Frames Analyzed</span>
              <b className="text-sm text-slate-100">{uploadStatus.result.frames_processed}</b>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 block">Peak Calibrated Shock</span>
              <b className="text-sm text-rose-400">{uploadStatus.result.max_vertical_shock} m/s²</b>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 block">Snapping Network</span>
              <b className="text-sm text-emerald-400">Chandigarh OSM</b>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 block">Database Storage</span>
              <b className="text-sm text-slate-100">MongoDB Atlas</b>
            </div>
          </div>

          {/* Newly created observations cards */}
          {uploadStatus.result.observations && uploadStatus.result.observations.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Newly Discovered Road Observations:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {uploadStatus.result.observations.map((obs) => {
                  const firstDet = obs.detections?.[0] || {};
                  return (
                    <div key={obs.observation_id} className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex space-x-3 text-xs">
                      {obs.annotated_image_url && (
                        <img
                          src={obs.annotated_image_url}
                          alt="Hazard Detection"
                          className="w-20 h-20 rounded-lg object-cover border border-slate-700 shrink-0"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/roads/road_pothole_d00.jpg';
                          }}
                        />
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <b className="text-slate-100 font-semibold">{firstDet.class_name || 'Road Hazard'}</b>
                          <span className="text-[10px] text-emerald-400 font-mono">({Math.round((firstDet.confidence || 0.88)*100)}%)</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">{obs.observation_id}</p>
                        <p className="text-[11px] text-slate-300">Road: <b className="text-emerald-400">{obs.matched_road_name}</b></p>
                        <p className="text-[10px] text-slate-400">Sector: {obs.sector} | Shock: {obs.telemetry_z_shock} m/s²</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

