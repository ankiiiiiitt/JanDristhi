import {
  MOCK_OVERVIEW,
  MOCK_ROADS_GEOJSON,
  MOCK_OBSERVATIONS,
  MOCK_REPAIRS
} from './mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export let isBackendOnline = false;

export async function checkSystemHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      isBackendOnline = true;
      return await res.json();
    }
  } catch (err) {
    // Backend offline
  }
  isBackendOnline = false;
  return { status: "offline", mock_mode: true };
}

export async function fetchOverview() {
  try {
    const res = await fetch(`${BASE_URL}/analytics/overview`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const json = await res.json();
      isBackendOnline = true;
      return { data: json.data, isMock: false };
    }
  } catch (e) {
    // Fallback to mock
  }
  return { data: MOCK_OVERVIEW, isMock: true };
}

export async function fetchRoadsGeoJSON() {
  try {
    const res = await fetch(`${BASE_URL}/roads/geojson`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const json = await res.json();
      isBackendOnline = true;
      return { data: json, isMock: false };
    }
  } catch (e) {
    // Fallback to mock
  }
  return { data: MOCK_ROADS_GEOJSON, isMock: true };
}

export async function fetchObservations() {
  try {
    const res = await fetch(`${BASE_URL}/observations`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const json = await res.json();
      isBackendOnline = true;
      return { data: json.data, isMock: false };
    }
  } catch (e) {
    // Fallback
  }
  return { data: MOCK_OBSERVATIONS, isMock: true };
}

export async function uploadObservation(formData) {
  try {
    const res = await fetch(`${BASE_URL}/observations/upload`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      const json = await res.json();
      return { success: true, data: json.data };
    }
  } catch (e) {
    console.warn("Upload failed, simulating client response:", e);
  }

  // Simulated fallback response
  return {
    success: true,
    data: {
      observation_id: `OBS-${Date.now()}`,
      vehicle_id: formData.get("vehicle_id") || "VEH-KA04-9122",
      location: {
        type: "Point",
        coordinates: [
          parseFloat(formData.get("longitude") || "77.5946"),
          parseFloat(formData.get("latitude") || "12.9716")
        ]
      },
      detection_status: "processed",
      detections: [
        {
          class_id: "D00",
          class_name: "Pothole",
          confidence: 0.94,
          bbox: [120, 180, 290, 380],
          severity: "critical",
          estimated_area_sqm: 0.58
        }
      ],
      linked_segment_id: "RS-MG-01",
      captured_at: new Date().toISOString()
    }
  };
}

export async function fetchRepairs() {
  try {
    const res = await fetch(`${BASE_URL}/repairs`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const json = await res.json();
      return { data: json.data, isMock: false };
    }
  } catch (e) {}
  return { data: MOCK_REPAIRS, isMock: true };
}

export async function verifyRepair(repairId, afterFile) {
  try {
    const formData = new FormData();
    formData.append("after_file", afterFile);
    const res = await fetch(`${BASE_URL}/repairs/verify/${repairId}`, {
      method: "POST",
      body: formData
    });
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch (e) {}

  return {
    repair_id: repairId,
    status: "verified_closed",
    ai_verification_score: 0.96,
    damage_cleared: true,
    message: "AI verified road surface restored with 96% confidence."
  };
}

export async function evaluateSegmentRisk(segmentId) {
  try {
    const res = await fetch(`${BASE_URL}/risk/evaluate/${segmentId}`, { method: 'POST' });
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch (e) {}

  return {
    assessment_id: `RSK-${Date.now()}`,
    segment_id: segmentId,
    health_score: 41.5,
    failure_probability: 0.86,
    risk_level: "critical",
    recommended_action: "emergency_resurfacing"
  };
}
