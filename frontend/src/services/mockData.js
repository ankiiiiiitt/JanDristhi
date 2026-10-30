export const MOCK_OVERVIEW = {
  monitored_km: 142.8,
  active_vehicles: 14,
  total_hazards_detected: 184,
  critical_hazards: 32,
  city_average_health_score: 64.2,
  pending_repairs: 19,
  verified_repairs_this_week: 8,
  hazard_distribution: {
    potholes: 92,
    alligator_cracking: 45,
    longitudinal_cracks: 31,
    manhole_depressions: 16
  },
  ward_health_rankings: [
    { ward: "WARD-112 (Indiranagar)", health_score: 88.0, status: "good" },
    { ward: "WARD-150 (Marathahalli)", health_score: 68.5, status: "fair" },
    { ward: "WARD-174 (MG Road/CBD)", health_score: 42.0, status: "critical" },
    { ward: "WARD-151 (Koramangala)", health_score: 38.0, status: "critical" }
  ]
};

export const MOCK_ROADS_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        segment_id: "RS-MG-01",
        name: "MG Road - Trinity Circle to Brigade Junction",
        ward_id: "WARD-174",
        health_score: 42.0,
        status_category: "critical",
        hazard_count: 6,
        length_meters: 1150.0,
        color: "#ef4444",
        last_inspected_at: "2026-10-30T10:14:00Z"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [77.6095, 12.9738],
          [77.6145, 12.9745],
          [77.6189, 12.9752]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        segment_id: "RS-ORR-02",
        name: "Outer Ring Road - Marathahalli Flyover Segment",
        ward_id: "WARD-150",
        health_score: 68.5,
        status_category: "fair",
        hazard_count: 2,
        length_meters: 1400.0,
        color: "#f59e0b",
        last_inspected_at: "2026-10-30T09:30:00Z"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [77.6970, 12.9560],
          [77.7020, 12.9575],
          [77.7065, 12.9590]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        segment_id: "RS-IND-03",
        name: "100 Feet Road - Indiranagar 12th Main Stretch",
        ward_id: "WARD-112",
        health_score: 88.0,
        status_category: "good",
        hazard_count: 0,
        length_meters: 1300.0,
        color: "#10b981",
        last_inspected_at: "2026-10-30T08:15:00Z"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [77.6410, 12.9780],
          [77.6415, 12.9720],
          [77.6420, 12.9660]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        segment_id: "RS-KOR-04",
        name: "Koramangala 80 Feet Road - Sony World Signal to 6th Block",
        ward_id: "WARD-151",
        health_score: 38.0,
        status_category: "critical",
        hazard_count: 8,
        length_meters: 950.0,
        color: "#ef4444",
        last_inspected_at: "2026-10-30T09:45:00Z"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [77.6250, 12.9340],
          [77.6290, 12.9345],
          [77.6340, 12.9350]
        ]
      }
    }
  ]
};

export const MOCK_OBSERVATIONS = [
  {
    observation_id: "OBS-20261030-001",
    vehicle_id: "VEH-KA04-9122",
    location: { type: "Point", coordinates: [77.6145, 12.9745] },
    altitude: 920.4,
    speed_kmph: 32.5,
    telemetry_z_shock: 4.12,
    image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80",
    detection_status: "processed",
    detections: [
      {
        class_id: "D00",
        class_name: "Pothole",
        confidence: 0.92,
        bbox: [150, 200, 320, 420],
        severity: "critical",
        estimated_area_sqm: 0.65
      }
    ],
    linked_segment_id: "RS-MG-01",
    captured_at: "2026-10-30T10:14:00Z"
  },
  {
    observation_id: "OBS-20261030-002",
    vehicle_id: "VEH-KA01-3310",
    location: { type: "Point", coordinates: [77.6290, 12.9345] },
    altitude: 915.0,
    speed_kmph: 28.0,
    telemetry_z_shock: 3.45,
    image_url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
    detection_status: "processed",
    detections: [
      {
        class_id: "D10",
        class_name: "Alligator Cracking",
        confidence: 0.84,
        bbox: [100, 120, 400, 500],
        severity: "high",
        estimated_area_sqm: 1.20
      }
    ],
    linked_segment_id: "RS-KOR-04",
    captured_at: "2026-10-30T10:18:00Z"
  }
];

export const MOCK_REPAIRS = [
  {
    repair_id: "REP-20261030-01",
    segment_id: "RS-MG-01",
    contractor_name: "Karnataka Urban Infra Ltd.",
    status: "completed_unverified",
    before_image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80",
    after_image_url: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800&auto=format&fit=crop&q=80",
    ai_verification_score: 0.94,
    damage_cleared: true,
    verified_by_user_id: null,
    created_at: "2026-10-30T08:00:00Z",
    updated_at: "2026-10-30T09:45:00Z"
  },
  {
    repair_id: "REP-20261030-02",
    segment_id: "RS-ORR-02",
    contractor_name: "Apex Roadworks Corp",
    status: "verified_closed",
    before_image_url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
    after_image_url: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800&auto=format&fit=crop&q=80",
    ai_verification_score: 0.98,
    damage_cleared: true,
    verified_by_user_id: "USR-101",
    created_at: "2026-10-29T10:00:00Z",
    updated_at: "2026-10-30T09:30:00Z"
  }
];
