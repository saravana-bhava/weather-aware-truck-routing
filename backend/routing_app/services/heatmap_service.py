"""
Corridor Weather Heatmap Service.
Generates an optimized spatial grid along the trip corridor and precomputes
0-48 hour forecast intensities for ultra-smooth slider scrubbing.
"""

from datetime import datetime, timedelta
import logging
from typing import List, Dict, Any, Tuple
import requests
from .risk_service import evaluate_checkpoint_risk, RISK_SCORES
from .weather_service import OPEN_METEO_FORECAST_URL

logger = logging.getLogger(__name__)


def compute_corridor_grid(
    bbox: Tuple[float, float, float, float],  # (min_lat, min_lon, max_lat, max_lon)
    grid_rows: int = 7,
    grid_cols: int = 7,
) -> List[Tuple[float, float]]:
    """
    Computes a regular lattice of (lat, lon) sample points covering the corridor bounding box.
    """
    min_lat, min_lon, max_lat, max_lon = bbox

    # Expand bbox slightly for smooth edge heat dissipation
    lat_pad = max((max_lat - min_lat) * 0.15, 0.4)
    lon_pad = max((max_lon - min_lon) * 0.15, 0.4)

    min_lat = max(min_lat - lat_pad, -85.0)
    max_lat = min(max_lat + lat_pad, 85.0)
    min_lon = max(min_lon - lon_pad, -180.0)
    max_lon = min(max_lon + lon_pad, 180.0)

    points: List[Tuple[float, float]] = []
    lat_step = (max_lat - min_lat) / max(grid_rows - 1, 1)
    lon_step = (max_lon - min_lon) / max(grid_cols - 1, 1)

    for r in range(grid_rows):
        lat = round(min_lat + r * lat_step, 4)
        for c in range(grid_cols):
            lon = round(min_lon + c * lon_step, 4)
            points.append((lat, lon))

    return points


def fetch_corridor_weather_series(
    grid_points: List[Tuple[float, float]],
    load_weight_lb: float = 40000,
    departure_time: datetime = None,
    max_hours: int = 48,
) -> Dict[str, Any]:
    """
    Fetches hourly weather for the corridor grid and builds a precomputed
    time series from 0 to 48 hours for smooth frontend scrubbing.
    """
    if not grid_points:
        return {"hours": [], "timestamps": []}

    if departure_time is None:
        departure_time = datetime.utcnow()

    lats = ",".join(f"{lat:.4f}" for lat, _ in grid_points)
    lons = ",".join(f"{lon:.4f}" for _, lon in grid_points)

    params = {
        "latitude": lats,
        "longitude": lons,
        "hourly": "temperature_2m,wind_speed_10m,rain,snowfall",
        "wind_speed_unit": "mph",
        "precipitation_unit": "inch",
        "forecast_days": 3,
    }

    try:
        resp = requests.get(
            OPEN_METEO_FORECAST_URL,
            params=params,
            headers={"User-Agent": "SpotterWeatherRouting/1.0"},
            timeout=15,
        )
        resp.raise_for_status()
        raw_data = resp.json()
        if not isinstance(raw_data, list):
            raw_data = [raw_data]
    except Exception as e:
        logger.error(f"Failed to fetch corridor weather: {e}")
        raw_data = []

    # Map raw_data per grid point
    # We want 0..48 hours relative to departure_time
    hour_offsets = list(range(0, max_hours + 1))
    hours_data = []

    for h_off in hour_offsets:
        target_time = departure_time + timedelta(hours=h_off)
        target_iso = target_time.strftime("%Y-%m-%dT%H:00")
        
        # Heatmap points for this hour: [lat, lon, intensity, risk_level, wind_mph, rain_in, snow_in]
        points_for_hour = []

        for p_idx, pt in enumerate(grid_points):
            lat, lon = pt
            pt_weather = raw_data[p_idx] if p_idx < len(raw_data) else {}
            hourly = pt_weather.get("hourly", {})
            times = hourly.get("time", [])

            # Find matching time index
            time_idx = -1
            if times:
                try:
                    time_idx = times.index(target_iso)
                except ValueError:
                    time_idx = min(h_off, len(times) - 1)

            wind = 0.0
            rain = 0.0
            snow = 0.0
            temp_f = 65.0

            if time_idx >= 0 and times:
                w_arr = hourly.get("wind_speed_10m", [])
                r_arr = hourly.get("rain", [])
                s_arr = hourly.get("snowfall", [])
                t_arr = hourly.get("temperature_2m", [])

                if time_idx < len(w_arr) and w_arr[time_idx] is not None:
                    wind = float(w_arr[time_idx])
                if time_idx < len(r_arr) and r_arr[time_idx] is not None:
                    rain = float(r_arr[time_idx])
                if time_idx < len(s_arr) and s_arr[time_idx] is not None:
                    snow = float(s_arr[time_idx])
                if time_idx < len(t_arr) and t_arr[time_idx] is not None:
                    temp_f = round((float(t_arr[time_idx]) * 9.0 / 5.0) + 32.0, 1)

            # Evaluate risk
            risk_eval = evaluate_checkpoint_risk(wind, rain, snow, load_weight_lb)
            score = risk_eval["overall_score"]
            level = risk_eval["overall_level"]

            # Heatmap intensity mapping (0.1 to 1.0)
            # Low=0.2, Mod=0.45, High=0.7, Severe=0.9, No Travel=1.0
            intensity_map = {
                "Low": 0.15,
                "Moderate": 0.40,
                "High": 0.70,
                "Severe": 0.90,
                "No Travel": 1.00,
            }
            intensity = intensity_map.get(level, 0.15)

            points_for_hour.append({
                "lat": lat,
                "lng": lon,
                "intensity": intensity,
                "level": level,
                "score": score,
                "wind_mph": round(wind, 1),
                "rain_in_hr": round(rain, 2),
                "snow_in_hr": round(snow, 2),
                "temp_f": temp_f,
            })

        hours_data.append({
            "hour_offset": h_off,
            "timestamp": target_time.isoformat(),
            "display_time": target_time.strftime("%b %d, %I:%M %p"),
            "points": points_for_hour,
        })

    return {
        "total_hours": len(hours_data),
        "departure_time": departure_time.isoformat(),
        "timeline": hours_data,
    }
