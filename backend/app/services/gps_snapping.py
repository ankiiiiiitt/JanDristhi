import math
from typing import Dict, List, Optional, Tuple, Any

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in meters using the Haversine formula."""
    r = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c

def point_to_segment_distance_meters(
    p_lat: float, p_lon: float,
    a_lat: float, a_lon: float,
    b_lat: float, b_lon: float
) -> float:
    """
    Computes shortest distance from point P to line segment AB on an approximated Cartesian plane
    projected around the midpoint.
    """
    # Midpoint latitude for metric longitude scaling
    mid_lat_rad = math.radians((a_lat + b_lat + p_lat) / 3.0)
    meters_per_deg_lat = 111132.92
    meters_per_deg_lon = 111412.84 * math.cos(mid_lat_rad)

    px = (p_lon - a_lon) * meters_per_deg_lon
    py = (p_lat - a_lat) * meters_per_deg_lat
    bx = (b_lon - a_lon) * meters_per_deg_lon
    by = (b_lat - a_lat) * meters_per_deg_lat

    seg_len_sq = bx * bx + by * by
    if seg_len_sq == 0:
        return math.hypot(px, py)

    # Project P onto AB, clamped to [0, 1]
    t = max(0.0, min(1.0, (px * bx + py * by) / seg_len_sq))
    proj_x = t * bx
    proj_y = t * by

    return math.hypot(px - proj_x, py - proj_y)

def snap_gps_to_road_segment(
    latitude: float,
    longitude: float,
    road_segments: List[Dict[str, Any]],
    max_threshold_meters: float = 80.0
) -> Dict[str, Any]:
    """
    Snaps detected damage GPS coordinates (lat, lon) to the nearest Chandigarh road segment.
    Returns matched segment ID, name, sector, and computed snapping distance in meters.
    """
    if not road_segments:
        return {
            "matched": False,
            "segment_id": None,
            "segment_name": "Unknown Chandigarh Road",
            "distance_meters": None,
            "sector": "Chandigarh",
            "message": "No road segments available in database"
        }

    best_segment = None
    min_distance = float("inf")

    for seg in road_segments:
        geom = seg.get("geometry", {})
        coords = geom.get("coordinates", [])
        if len(coords) < 2:
            continue

        # coords is [[lon1, lat1], [lon2, lat2], ...]
        for i in range(len(coords) - 1):
            lon1, lat1 = coords[i]
            lon2, lat2 = coords[i + 1]

            d = point_to_segment_distance_meters(latitude, longitude, lat1, lon1, lat2, lon2)
            if d < min_distance:
                min_distance = d
                best_segment = seg

    is_matched = best_segment is not None and min_distance <= max_threshold_meters

    if is_matched and best_segment:
        return {
            "matched": True,
            "segment_id": best_segment.get("segment_id"),
            "segment_name": best_segment.get("name"),
            "sector": best_segment.get("area_name", best_segment.get("ward_id", "Chandigarh")),
            "distance_meters": round(min_distance, 1),
            "threshold_meters": max_threshold_meters,
            "status_category": best_segment.get("status_category", "fair"),
            "current_health_score": best_segment.get("health_score", 60.0),
            "snapped": True
        }

    return {
        "matched": False,
        "segment_id": None,
        "segment_name": "Unmapped Road",
        "distance_meters": round(min_distance, 1) if min_distance != float("inf") else None,
        "threshold_meters": max_threshold_meters,
        "snapped": False
    }

