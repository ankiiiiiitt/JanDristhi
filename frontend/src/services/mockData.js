// Chandigarh Urban Infrastructure Demo Data [DEMO DATA - SIMULATED]
export const MOCK_OVERVIEW = {
  "monitored_km": 28.6,
  "active_vehicles": 4,
  "total_hazards_detected": 14,
  "critical_hazards": 6,
  "city_average_health_score": 62.3,
  "pending_repairs": 2,
  "verified_repairs_this_week": 1,
  "hazard_distribution": {
    "potholes": 7,
    "alligator_cracking": 4,
    "longitudinal_cracks": 2,
    "manhole_depressions": 1
  },
  "ward_health_rankings": [
    {
      "ward": "Sector 34 (Sub-City Centre)",
      "sector_code": "SEC-34",
      "health_score": 84.5,
      "status": "good"
    },
    {
      "ward": "Sector 17 (City Centre)",
      "sector_code": "SEC-17",
      "health_score": 74.0,
      "status": "fair"
    },
    {
      "ward": "Sector 22 (Aroma / Market Hub)",
      "sector_code": "SEC-22",
      "health_score": 54.0,
      "status": "fair"
    },
    {
      "ward": "Industrial Area Phase 1",
      "sector_code": "IND-PH1",
      "health_score": 36.5,
      "status": "critical"
    }
  ],
  "city_name": "Chandigarh, India",
  "data_label": "[DEMO DATA - CHANDIGARH DEMO SUITE]"
};

export const MOCK_ROADS_GEOJSON = {
  "type": "FeatureCollection",
  "metadata": {
    "city": "Chandigarh, India",
    "sectors": [
      "Sector 17",
      "Sector 22",
      "Sector 34",
      "Industrial Area Phase 1"
    ],
    "total_segments": 23,
    "generated_at": "2026-10-30T11:45:00Z"
  },
  "features": [
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-17-001",
        "name": "Madhya Marg (North boundary) (Sector 17)",
        "ward_id": "SEC-17",
        "area_name": "Sector 17",
        "highway_type": "primary",
        "length_meters": 1199.8,
        "health_score": 74.0,
        "status_category": "fair",
        "hazard_count": 2,
        "color": "#f59e0b",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.776,
            30.745
          ],
          [
            76.782,
            30.7445
          ],
          [
            76.7885,
            30.744
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-17-002",
        "name": "Himalaya Marg (East boundary) (Sector 17)",
        "ward_id": "SEC-17",
        "area_name": "Sector 17",
        "highway_type": "primary",
        "length_meters": 894.7,
        "health_score": 74.0,
        "status_category": "fair",
        "hazard_count": 2,
        "color": "#f59e0b",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.7885,
            30.744
          ],
          [
            76.788,
            30.74
          ],
          [
            76.7875,
            30.736
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-17-003",
        "name": "Udyog Path (South boundary) (Sector 17)",
        "ward_id": "SEC-17",
        "area_name": "Sector 17",
        "highway_type": "primary",
        "length_meters": 1104.7,
        "health_score": 74.0,
        "status_category": "fair",
        "hazard_count": 2,
        "color": "#f59e0b",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.7875,
            30.736
          ],
          [
            76.7815,
            30.7365
          ],
          [
            76.776,
            30.737
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-17-004",
        "name": "Jan Marg (West boundary) (Sector 17)",
        "ward_id": "SEC-17",
        "area_name": "Sector 17",
        "highway_type": "primary",
        "length_meters": 889.6,
        "health_score": 74.0,
        "status_category": "fair",
        "hazard_count": 2,
        "color": "#f59e0b",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.776,
            30.737
          ],
          [
            76.776,
            30.741
          ],
          [
            76.776,
            30.745
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-17-005",
        "name": "Sector 17 Plaza Internal Arterial (Sector 17)",
        "ward_id": "SEC-17",
        "area_name": "Sector 17",
        "highway_type": "primary",
        "length_meters": 576.5,
        "health_score": 74.0,
        "status_category": "fair",
        "hazard_count": 2,
        "color": "#f59e0b",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.779,
            30.741
          ],
          [
            76.7825,
            30.7408
          ],
          [
            76.785,
            30.7405
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-17-006",
        "name": "Bank Square Access Road (Sector 17)",
        "ward_id": "SEC-17",
        "area_name": "Sector 17",
        "highway_type": "primary",
        "length_meters": 564.2,
        "health_score": 74.0,
        "status_category": "fair",
        "hazard_count": 2,
        "color": "#f59e0b",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.782,
            30.743
          ],
          [
            76.7825,
            30.7408
          ],
          [
            76.783,
            30.738
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-22-007",
        "name": "Udyog Path (North boundary) (Sector 22)",
        "ward_id": "SEC-22",
        "area_name": "Sector 22",
        "highway_type": "primary",
        "length_meters": 1152.3,
        "health_score": 54.0,
        "status_category": "fair",
        "hazard_count": 4,
        "color": "#f59e0b",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.766,
            30.736
          ],
          [
            76.772,
            30.7365
          ],
          [
            76.778,
            30.737
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-22-008",
        "name": "Himalaya Marg (East boundary) (Sector 22)",
        "ward_id": "SEC-22",
        "area_name": "Sector 22",
        "highway_type": "primary",
        "length_meters": 1337.8,
        "health_score": 54.0,
        "status_category": "fair",
        "hazard_count": 4,
        "color": "#f59e0b",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.778,
            30.737
          ],
          [
            76.7775,
            30.731
          ],
          [
            76.777,
            30.725
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-22-009",
        "name": "Dakshin Marg (South boundary) (Sector 22)",
        "ward_id": "SEC-22",
        "area_name": "Sector 22",
        "highway_type": "primary",
        "length_meters": 1057.3,
        "health_score": 54.0,
        "status_category": "fair",
        "hazard_count": 4,
        "color": "#f59e0b",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.777,
            30.725
          ],
          [
            76.7715,
            30.7255
          ],
          [
            76.766,
            30.726
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-22-010",
        "name": "Jan Marg (West boundary) (Sector 22)",
        "ward_id": "SEC-22",
        "area_name": "Sector 22",
        "highway_type": "primary",
        "length_meters": 1111.9,
        "health_score": 54.0,
        "status_category": "fair",
        "hazard_count": 4,
        "color": "#f59e0b",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.766,
            30.726
          ],
          [
            76.766,
            30.731
          ],
          [
            76.766,
            30.736
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-22-011",
        "name": "Sector 22 Shastri Market Promenade (Sector 22)",
        "ward_id": "SEC-22",
        "area_name": "Sector 22",
        "highway_type": "primary",
        "length_meters": 584.2,
        "health_score": 54.0,
        "status_category": "fair",
        "hazard_count": 4,
        "color": "#f59e0b",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.769,
            30.731
          ],
          [
            76.772,
            30.7305
          ],
          [
            76.775,
            30.73
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-22-012",
        "name": "Aroma Chowk Approach Road (Sector 22)",
        "ward_id": "SEC-22",
        "area_name": "Sector 22",
        "highway_type": "primary",
        "length_meters": 669.1,
        "health_score": 54.0,
        "status_category": "fair",
        "hazard_count": 4,
        "color": "#f59e0b",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.777,
            30.731
          ],
          [
            76.774,
            30.731
          ],
          [
            76.77,
            30.731
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-34-013",
        "name": "Dakshin Marg (North boundary) (Sector 34)",
        "ward_id": "SEC-34",
        "area_name": "Sector 34",
        "highway_type": "primary",
        "length_meters": 1200.0,
        "health_score": 84.5,
        "status_category": "good",
        "hazard_count": 0,
        "color": "#10b981",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.762,
            30.7275
          ],
          [
            76.768,
            30.727
          ],
          [
            76.7745,
            30.7265
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-34-014",
        "name": "Sarovar Path (East boundary) (Sector 34)",
        "ward_id": "SEC-34",
        "area_name": "Sector 34",
        "highway_type": "primary",
        "length_meters": 894.7,
        "health_score": 84.5,
        "status_category": "good",
        "hazard_count": 0,
        "color": "#10b981",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.7745,
            30.7265
          ],
          [
            76.774,
            30.7225
          ],
          [
            76.7735,
            30.7185
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-34-015",
        "name": "Sector 34/35 Dividing Road (Sector 34)",
        "ward_id": "SEC-34",
        "area_name": "Sector 34",
        "highway_type": "primary",
        "length_meters": 1104.9,
        "health_score": 84.5,
        "status_category": "good",
        "hazard_count": 0,
        "color": "#10b981",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.7735,
            30.7185
          ],
          [
            76.7675,
            30.719
          ],
          [
            76.762,
            30.7195
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-34-016",
        "name": "Himalaya Marg (West boundary) (Sector 34)",
        "ward_id": "SEC-34",
        "area_name": "Sector 34",
        "highway_type": "primary",
        "length_meters": 889.6,
        "health_score": 84.5,
        "status_category": "good",
        "hazard_count": 0,
        "color": "#10b981",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.762,
            30.7195
          ],
          [
            76.762,
            30.7235
          ],
          [
            76.762,
            30.7275
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-34-017",
        "name": "Sector 34 Commercial Exhibition Ground Avenue (Sector 34)",
        "ward_id": "SEC-34",
        "area_name": "Sector 34",
        "highway_type": "primary",
        "length_meters": 623.9,
        "health_score": 84.5,
        "status_category": "good",
        "hazard_count": 0,
        "color": "#10b981",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.765,
            30.723
          ],
          [
            76.7682,
            30.7228
          ],
          [
            76.7715,
            30.7225
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-SEC-34-018",
        "name": "Piccadily Chowk Outer Loop (Sector 34)",
        "ward_id": "SEC-34",
        "area_name": "Sector 34",
        "highway_type": "primary",
        "length_meters": 768.3,
        "health_score": 84.5,
        "status_category": "good",
        "hazard_count": 0,
        "color": "#10b981",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.762,
            30.7275
          ],
          [
            76.7645,
            30.725
          ],
          [
            76.768,
            30.723
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-IND-PH1-019",
        "name": "Purv Marg (West Arterial) (Industrial Area Phase 1)",
        "ward_id": "IND-PH1",
        "area_name": "Industrial Area Phase 1",
        "highway_type": "primary",
        "length_meters": 1781.7,
        "health_score": 36.5,
        "status_category": "critical",
        "hazard_count": 7,
        "color": "#ef4444",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.794,
            30.714
          ],
          [
            76.7945,
            30.706
          ],
          [
            76.795,
            30.698
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-IND-PH1-020",
        "name": "Industrial Area Phase 1 Spine Road (Industrial Area Phase 1)",
        "ward_id": "IND-PH1",
        "area_name": "Industrial Area Phase 1",
        "highway_type": "primary",
        "length_meters": 1724.5,
        "health_score": 36.5,
        "status_category": "critical",
        "hazard_count": 7,
        "color": "#ef4444",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.795,
            30.706
          ],
          [
            76.804,
            30.7055
          ],
          [
            76.813,
            30.705
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-IND-PH1-021",
        "name": "Elante Mall Commercial Access Road (Industrial Area Phase 1)",
        "ward_id": "IND-PH1",
        "area_name": "Industrial Area Phase 1",
        "highway_type": "primary",
        "length_meters": 677.8,
        "health_score": 36.5,
        "status_category": "critical",
        "hazard_count": 7,
        "color": "#ef4444",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.802,
            30.708
          ],
          [
            76.804,
            30.706
          ],
          [
            76.806,
            30.703
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-IND-PH1-022",
        "name": "Railway Station Link Corridor (Industrial Area Phase 1)",
        "ward_id": "IND-PH1",
        "area_name": "Industrial Area Phase 1",
        "highway_type": "primary",
        "length_meters": 1312.4,
        "health_score": 36.5,
        "status_category": "critical",
        "hazard_count": 7,
        "color": "#ef4444",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.804,
            30.714
          ],
          [
            76.808,
            30.71
          ],
          [
            76.814,
            30.706
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_id": "RS-CHD-IND-PH1-023",
        "name": "Plot 177 Freight Transport Way (Industrial Area Phase 1)",
        "ward_id": "IND-PH1",
        "area_name": "Industrial Area Phase 1",
        "highway_type": "primary",
        "length_meters": 956.1,
        "health_score": 36.5,
        "status_category": "critical",
        "hazard_count": 7,
        "color": "#ef4444",
        "data_source": "OpenStreetMap Verified Chandigarh Baseline"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            76.797,
            30.702
          ],
          [
            76.801,
            30.702
          ],
          [
            76.807,
            30.702
          ]
        ]
      }
    }
  ]
};

export const MOCK_OBSERVATIONS = [
  {
    "observation_id": "OBS-CHD-2026-001",
    "vehicle_id": "CTU-BUS-104",
    "location": {
      "type": "Point",
      "coordinates": [
        76.804,
        30.706
      ]
    },
    "altitude": 321.4,
    "speed_kmph": 31.5,
    "telemetry_z_shock": 4.65,
    "image_url": "/images/roads/road_pothole_d00.jpg",
    "detection_status": "processed",
    "detections": [
      {
        "class_id": "D40",
        "class_name": "Pothole",
        "confidence": 0.94,
        "bbox": [
          140,
          210,
          330,
          430
        ],
        "severity": "critical",
        "estimated_area_sqm": 0.72
      }
    ],
    "linked_segment_id": "RS-CHD-IND-PH1-019",
    "sector": "Industrial Area Phase 1",
    "captured_at": "2026-10-30T05:30:37.134544+00:00",
    "data_label": "[DEMO DATA - SIMULATED OBSERVATION]"
  },
  {
    "observation_id": "OBS-CHD-2026-002",
    "vehicle_id": "MC-WASTE-88",
    "location": {
      "type": "Point",
      "coordinates": [
        76.772,
        30.7305
      ]
    },
    "altitude": 345.0,
    "speed_kmph": 24.0,
    "telemetry_z_shock": 3.75,
    "image_url": "/images/roads/road_alligator_d10.jpg",
    "detection_status": "processed",
    "detections": [
      {
        "class_id": "D20",
        "class_name": "Alligator Cracking",
        "confidence": 0.86,
        "bbox": [
          90,
          110,
          420,
          510
        ],
        "severity": "high",
        "estimated_area_sqm": 1.45
      }
    ],
    "linked_segment_id": "RS-CHD-SEC-22-011",
    "sector": "Sector 22",
    "captured_at": "2026-10-30T05:45:37.134550+00:00",
    "data_label": "[DEMO DATA - SIMULATED OBSERVATION]"
  },
  {
    "observation_id": "OBS-CHD-2026-003",
    "vehicle_id": "CHD-PATROL-12",
    "location": {
      "type": "Point",
      "coordinates": [
        76.7825,
        30.7408
      ]
    },
    "altitude": 350.2,
    "speed_kmph": 38.0,
    "telemetry_z_shock": 2.15,
    "image_url": "/images/roads/road_longitudinal_d20.jpg",
    "detection_status": "processed",
    "detections": [
      {
        "class_id": "D00",
        "class_name": "Longitudinal Crack",
        "confidence": 0.79,
        "bbox": [
          50,
          180,
          480,
          240
        ],
        "severity": "medium",
        "estimated_area_sqm": 0.38
      }
    ],
    "linked_segment_id": "RS-CHD-SEC-17-005",
    "sector": "Sector 17",
    "captured_at": "2026-10-30T06:00:37.134553+00:00",
    "data_label": "[DEMO DATA - SIMULATED OBSERVATION]"
  },
  {
    "observation_id": "OBS-CHD-2026-004",
    "vehicle_id": "CTU-BUS-219",
    "location": {
      "type": "Point",
      "coordinates": [
        76.7682,
        30.7228
      ]
    },
    "altitude": 338.0,
    "speed_kmph": 42.0,
    "telemetry_z_shock": 1.45,
    "image_url": "/images/roads/road_transverse_d40.jpg",
    "detection_status": "processed",
    "detections": [
      {
        "class_id": "D10",
        "class_name": "Transverse Crack",
        "confidence": 0.72,
        "bbox": [
          200,
          100,
          260,
          490
        ],
        "severity": "medium",
        "estimated_area_sqm": 0.25
      }
    ],
    "linked_segment_id": "RS-CHD-SEC-34-017",
    "sector": "Sector 34",
    "captured_at": "2026-10-30T06:10:37.134555+00:00",
    "data_label": "[DEMO DATA - SIMULATED OBSERVATION]"
  }
];

export const MOCK_REPAIRS = [
  {
    "repair_id": "REP-CHD-2026-01",
    "segment_id": "RS-CHD-IND-PH1-019",
    "contractor_name": "Chandigarh Highway Infrastructure Pvt Ltd",
    "status": "completed_unverified",
    "before_image_url": "/images/roads/road_pothole_d00.jpg",
    "after_image_url": "/images/roads/road_repaired_patch.jpg",
    "ai_verification_score": null,
    "damage_cleared": null,
    "sector": "Industrial Area Phase 1",
    "created_at": "2026-10-28T06:15:37.134743+00:00",
    "updated_at": "2026-10-30T02:15:37.134746+00:00",
    "data_label": "[DEMO DATA - REPAIR WORK ORDER]"
  },
  {
    "repair_id": "REP-CHD-2026-02",
    "segment_id": "RS-CHD-SEC-22-011",
    "contractor_name": "Shivalik Road Builders & Contractors",
    "status": "completed_unverified",
    "before_image_url": "/images/roads/road_alligator_d10.jpg",
    "after_image_url": "/images/roads/road_repaired_fresh_asphalt.jpg",
    "ai_verification_score": null,
    "damage_cleared": null,
    "sector": "Sector 22",
    "created_at": "2026-10-27T06:15:37.134748+00:00",
    "updated_at": "2026-10-30T00:15:37.134749+00:00",
    "data_label": "[DEMO DATA - REPAIR WORK ORDER]"
  },
  {
    "repair_id": "REP-CHD-2026-03",
    "segment_id": "RS-CHD-SEC-17-005",
    "contractor_name": "Punjab & Haryana Municipal Works",
    "status": "verified_closed",
    "before_image_url": "/images/roads/road_longitudinal_d20.jpg",
    "after_image_url": "/images/roads/road_repaired_fresh_asphalt.jpg",
    "ai_verification_score": 0.97,
    "damage_cleared": true,
    "sector": "Sector 17",
    "created_at": "2026-10-25T06:15:37.134750+00:00",
    "updated_at": "2026-10-29T06:15:37.134751+00:00",
    "data_label": "[DEMO DATA - REPAIR WORK ORDER]"
  }
];
