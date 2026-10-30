# JanDrishti – Official API Contract & Data Dictionary
**Version:** 1.0.0-hackathon  
**Target:** Monorepo Communication Standard for Developers 1 through 5  
**Base URL:** `http://localhost:8000/api/v1`

---

## 1. Overview & Architectural Principles

All five developers must strictly adhere to this contract.
- **Developer 1 (Frontend)** builds all UI consumers based on these request/response signatures. If the backend is unreachable or endpoints are in progress, Frontend falls back to the identical JSON mock data provided in `frontend/src/services/mockData.js`.
- **Developer 2 (AI/ML)** exposes predictions following the detection output format specified in Section 4.
- **Developer 3 (Backend)** implements FastAPI routers guaranteeing these JSON payloads, HTTP status codes, and error formats.
- **Developer 4 (Database & GIS)** designs MongoDB Atlas collections matching the exact database field names defined in Section 3.
- **Developer 5 (Data Collection & Testing)** submits field observations, telemetry, and repair photos adhering to the multipart and JSON ingestion endpoints.

---

## 2. Standard Envelope & Error Response Format

All responses use JSON format. Failed requests must return this uniform structure:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Road segment with ID 'RS-BLR-0042' does not exist.",
    "details": {},
    "timestamp": "2026-10-30T10:00:00Z"
  }
}
```

### Standard HTTP Status Codes
| Status Code | Meaning | Use Case |
|---|---|---|
| `200 OK` | Request succeeded | Standard GET, PUT, PATCH responses |
| `201 Created` | Resource created | Successful POST observation or user creation |
| `400 Bad Request` | Validation failure | Missing coordinates, invalid enum value |
| `401 Unauthorized` | Missing / invalid token | Protected route accessed without JWT |
| `403 Forbidden` | Insufficient permissions | Field worker attempting admin/contractor actions |
| `404 Not Found` | Resource does not exist | Invalid segment ID, observation ID |
| `422 Unprocessable`| Pydantic schema error | Type mismatch in request body |
| `500 Server Error` | Unhandled failure | Database connection failure, AI engine crash |

---

## 3. MongoDB Collection Schemas & Field Names

The following collection and field names are canonical across MongoDB, FastAPI Pydantic models, and React state:

### 3.1 `users`
| Field Name | Type | Description | Example |
|---|---|---|---|
| `_id` | ObjectId | MongoDB unique identifier | `ObjectId("...")` |
| `user_id` | String | External unique UUID | `"USR-9801"` |
| `email` | String | Unique email address | `"rahul.sharma@bbmp.gov.in"` |
| `hashed_password` | String | Salted bcrypt hash | `"$2b$12$..."` |
| `full_name` | String | User's full name | `"Rahul Sharma"` |
| `role` | String (Enum) | `admin`, `municipal_officer`, `field_worker`, `contractor` | `"municipal_officer"` |
| `ward_id` | String | Associated urban municipal ward | `"WARD-174"` |
| `created_at` | DateTime (ISO 8601) | Registration timestamp | `"2026-10-30T09:00:00Z"` |

### 3.2 `vehicles`
| Field Name | Type | Description | Example |
|---|---|---|---|
| `_id` | ObjectId | MongoDB unique identifier | `ObjectId("...")` |
| `vehicle_id` | String | Fleet or device identifier | `"VEH-KA04-9122"` |
| `vehicle_type` | String (Enum) | `bus`, `waste_truck`, `inspection_van`, `patrol_bike` | `"waste_truck"` |
| `operator_name` | String | Assigned driver / worker | `"Anil Patil"` |
| `last_active_at` | DateTime | Timestamp of latest heartbeat | `"2026-10-30T10:12:00Z"` |
| `last_known_location`| GeoJSON Point | Longitude, Latitude | `{"type": "Point", "coordinates": [77.5946, 12.9716]}` |
| `status` | String (Enum) | `active`, `idle`, `maintenance` | `"active"` |

### 3.3 `observations`
Raw telemetry and imagery captured by sensor units or field mobile apps.
| Field Name | Type | Description | Example |
|---|---|---|---|
| `_id` | ObjectId | MongoDB identifier | `ObjectId("...")` |
| `observation_id` | String | Unique ID | `"OBS-20261030-001"` |
| `vehicle_id` | String | Source vehicle identifier | `"VEH-KA04-9122"` |
| `location` | GeoJSON Point | GeoJSON `[longitude, latitude]` | `{"type": "Point", "coordinates": [77.6012, 12.9654]}` |
| `altitude` | Float | Altitude in meters | `920.4` |
| `speed_kmph` | Float | Vehicle speed at capture | `34.5` |
| `telemetry_z_shock`| Float | Accelerometer shock reading (m/s²) | `2.85` |
| `image_url` | String | Cloud/local image path | `"/uploads/obs_20261030_001.jpg"` |
| `detection_status` | String (Enum) | `pending`, `processed`, `failed` | `"processed"` |
| `detections` | Array[Object] | AI damage findings (see 4.1) | `[ ... ]` |
| `captured_at` | DateTime | Device capture time | `"2026-10-30T10:14:00Z"` |

### 3.4 `road_segments`
Managed urban road segments (typically 50m to 500m arterial or residential stretches).
| Field Name | Type | Description | Example |
|---|---|---|---|
| `_id` | ObjectId | MongoDB identifier | `ObjectId("...")` |
| `segment_id` | String | Unique road code | `"RS-MG-01"` |
| `name` | String | Street or road name | `"Mahatma Gandhi Road, Sector 3"` |
| `ward_id` | String | Administrative Ward identifier | `"WARD-174"` |
| `geometry` | GeoJSON LineString | Sequence of `[lng, lat]` coordinates | `{"type": "LineString", "coordinates": [[77.594, 12.971], [77.598, 12.973]]}` |
| `length_meters` | Float | Segment length in meters | `380.0` |
| `health_score` | Float | Current Infrastructure Health Score (0-100) | `48.5` |
| `status_category` | String (Enum) | `good`, `fair`, `critical` | `"critical"` |
| `hazard_count` | Integer | Total active unverified hazards | `7` |
| `last_inspected_at`| DateTime | Last inspection run | `"2026-10-30T10:14:00Z"` |

### 3.5 `risk_assessments`
Predictive analytics computed by the Multi-Hazard Fusion engine.
| Field Name | Type | Description | Example |
|---|---|---|---|
| `_id` | ObjectId | MongoDB identifier | `ObjectId("...")` |
| `assessment_id` | String | Unique assessment ID | `"RSK-20261030-88"` |
| `segment_id` | String | Referenced road segment | `"RS-MG-01"` |
| `health_score` | Float | Scaled 0 to 100 | `48.5` |
| `failure_probability` | Float | 0.00 to 1.00 probability of structural collapse within 30 days | `0.78` |
| `hazard_factors` | Object | Weighted contributing features | `{"pothole_density": 0.82, "monsoon_flood_index": 0.65, "heavy_traffic_volume": 0.70}` |
| `recommended_action` | String (Enum) | `routine_monitoring`, `patching_required`, `emergency_resurfacing` | `"emergency_resurfacing"` |
| `estimated_cost_inr` | Float | Estimated repair expenditure in INR | `240000.00` |
| `assessed_at` | DateTime | Timestamp | `"2026-10-30T10:15:00Z"` |

### 3.6 `repair_records`
Closed-loop verification of municipal repair works.
| Field Name | Type | Description | Example |
|---|---|---|---|
| `_id` | ObjectId | MongoDB identifier | `ObjectId("...")` |
| `repair_id` | String | Unique repair record ID | `"REP-20261030-01"` |
| `segment_id` | String | Road segment reference | `"RS-MG-01"` |
| `contractor_name` | String | Entity handling the repair | `"Karnataka Infra Works Ltd."` |
| `status` | String (Enum) | `work_order_issued`, `in_progress`, `completed_unverified`, `verified_closed`, `rejected` | `"completed_unverified"` |
| `before_image_url` | String | Pre-repair hazard photo | `"/uploads/obs_20261030_001.jpg"` |
| `after_image_url` | String | Post-repair contractor upload | `"/uploads/repair_after_001.jpg"` |
| `ai_verification_score` | Float | Confidence that damage has been rectified (0.0 to 1.0) | `0.94` |
| `verified_by_user_id` | String | Inspecting official | `"USR-9801"` |
| `updated_at` | DateTime | Latest status update | `"2026-10-30T10:16:00Z"` |

---

## 4. REST API Endpoint Specifications

### 4.1 System & Health Checks

#### `GET /api/v1/health`
Checks backend and connected database status.
- **Auth:** Public
- **Response `200 OK`:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "ai_engine": "online",
  "mock_mode": false,
  "timestamp": "2026-10-30T10:14:00Z"
}
```

---

### 4.2 Authentication (Developer 3)

#### `POST /api/v1/auth/login`
- **Auth:** Public
- **Request Body (application/json):**
```json
{
  "email": "officer@jandrishti.gov.in",
  "password": "HackathonPassword2026!"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "user_id": "USR-101",
    "email": "officer@jandrishti.gov.in",
    "full_name": "Dr. Ananya Rao",
    "role": "municipal_officer",
    "ward_id": "WARD-174"
  }
}
```

---

### 4.3 Observations & Data Ingestion (Developer 5 & 3)

#### `POST /api/v1/observations/upload`
Accepts image file along with GPS telemetry and triggers AI detection pipeline.
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `file`: Binary image file (JPEG / PNG)
  - `vehicle_id`: `"VEH-KA04-9122"` (string)
  - `latitude`: `12.9716` (float)
  - `longitude`: `77.5946` (float)
  - `altitude`: `920.0` (optional float)
  - `speed_kmph`: `38.2` (optional float)
  - `telemetry_z_shock`: `3.15` (optional float)
- **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "observation_id": "OBS-20261030-009",
    "vehicle_id": "VEH-KA04-9122",
    "location": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716]
    },
    "image_url": "/uploads/obs_20261030_009.jpg",
    "detection_status": "processed",
    "detections": [
      {
        "class_id": "D00",
        "class_name": "Pothole",
        "confidence": 0.89,
        "bbox": [140, 220, 310, 410],
        "severity": "high",
        "estimated_area_sqm": 0.45
      }
    ],
    "linked_segment_id": "RS-MG-01",
    "captured_at": "2026-10-30T10:14:00Z"
  }
}
```

#### `GET /api/v1/observations`
Lists recent observations with filtering options.
- **Query Parameters:** `limit` (int, default 50), `ward_id` (string), `severity` (string)
- **Response `200 OK`:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "observation_id": "OBS-20261030-009",
      "vehicle_id": "VEH-KA04-9122",
      "location": {"type": "Point", "coordinates": [77.5946, 12.9716]},
      "detections_count": 1,
      "severity": "high",
      "captured_at": "2026-10-30T10:14:00Z"
    }
  ]
}
```

---

### 4.4 Road Segments & GIS (Developer 4)

#### `GET /api/v1/roads/geojson`
Returns standard GeoJSON FeatureCollection formatted specifically for direct rendering on Leaflet/OpenStreetMap.
- **Query Parameters:** `ward_id` (optional), `status_category` (optional)
- **Response `200 OK`:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-MG-01",
        "name": "Mahatma Gandhi Road, Sector 3",
        "health_score": 48.5,
        "status_category": "critical",
        "hazard_count": 7,
        "color": "#ef4444",
        "last_inspected_at": "2026-10-30T10:14:00Z"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [77.5940, 12.9710],
          [77.5960, 12.9720],
          [77.5980, 12.9735]
        ]
      }
    }
  ]
}
```

#### `GET /api/v1/roads/{segment_id}`
Returns granular telemetry, historical assessments, and active repair tickets for a specific road stretch.

---

### 4.5 Risk Assessment & Multi-Hazard Fusion (Developer 2 & 3)

#### `GET /api/v1/analytics/overview`
Dashboard top-level metrics for Developer 1.
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "monitored_km": 142.8,
    "active_vehicles": 14,
    "total_hazards_detected": 184,
    "critical_hazards": 32,
    "city_average_health_score": 64.2,
    "pending_repairs": 19,
    "verified_repairs_this_week": 8,
    "hazard_distribution": {
      "potholes": 92,
      "alligator_cracking": 45,
      "longitudinal_cracks": 31,
      "manhole_depressions": 16
    }
  }
}
```

#### `POST /api/v1/risk/evaluate/{segment_id}`
Triggers real-time Multi-Hazard Fusion computation for a segment.
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "assessment_id": "RSK-20261030-99",
    "segment_id": "RS-MG-01",
    "health_score": 44.0,
    "failure_probability": 0.82,
    "risk_level": "critical",
    "recommended_action": "emergency_resurfacing",
    "contributing_hazards": [
      {"type": "pothole_cluster", "weight": 0.45},
      {"type": "drainage_overflow_risk", "weight": 0.35},
      {"type": "heavy_axle_transit", "weight": 0.20}
    ]
  }
}
```

---

### 4.6 Repair Verification (Developer 5 & 1)

#### `GET /api/v1/repairs`
Lists repair records with before/after photos and status.

#### `POST /api/v1/repairs/verify/{repair_id}`
Uploads contractor's "after" repair photo and invokes AI verification.
- **Form Fields:** `after_file`: Image binary
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "repair_id": "REP-20261030-01",
    "status": "verified_closed",
    "ai_verification_score": 0.94,
    "damage_cleared": true,
    "message": "AI successfully verified pothole patch with 94% confidence."
  }
}
```

