"""
Weather service using Open-Meteo API.
Provides batch forecast querying, ETA-based hourly matching, and corridor weather grids.
"""

from datetime import datetime
import logging
from typing import List, Dict, Any, Tuple
import requests

logger = logging.getLogger(__name__)

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

WMO_WEATHER_CODES: Dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snowfall",
    73: "Moderate snowfall",
    75: "Heavy snowfall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def get_weather_description(code: int) -> str:
    return WMO_WEATHER_CODES.get(code, "Cloudy")


def fetch_batch_weather(
    points: List[Tuple[float, float]],  # List of (lat, lon)
    forecast_days: int = 3,
) -> List[Dict[str, Any]]:
    """
    Fetches hourly weather forecast for a list of (lat, lon) points from Open-Meteo in chunks of 50.
    """
    if not points:
        return []

    results: List[Dict[str, Any]] = []
    chunk_size = 50

    for i in range(0, len(points), chunk_size):
        chunk = points[i : i + chunk_size]
        lats = ",".join(f"{lat:.4f}" for lat, _ in chunk)
        lons = ",".join(f"{lon:.4f}" for _, lon in chunk)

        params = {
            "latitude": lats,
            "longitude": lons,
            "hourly": "temperature_2m,wind_speed_10m,rain,snowfall,weather_code",
            "wind_speed_unit": "mph",
            "precipitation_unit": "inch",
            "forecast_days": max(1, min(forecast_days, 14)),
        }

        try:
            resp = requests.get(
                OPEN_METEO_FORECAST_URL,
                params=params,
                headers={"User-Agent": "SpotterWeatherRouting/1.0"},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

            if isinstance(data, list):
                results.extend(data)
            elif isinstance(data, dict):
                results.append(data)
        except Exception as e:
            logger.error(f"Failed to fetch weather batch: {e}")
            # If weather API fails, generate safe default fallback hourly dict for each point
            for _ in chunk:
                results.append({
                    "hourly": {
                        "time": [],
                        "temperature_2m": [],
                        "wind_speed_10m": [],
                        "rain": [],
                        "snowfall": [],
                        "weather_code": [],
                    }
                })

    return results


def find_closest_hour_index(time_list: List[str], target_dt: datetime) -> int:
    """
    Finds the index of the hour in time_list closest to target_dt.
    """
    if not time_list:
        return 0

    target_iso_hour = target_dt.strftime("%Y-%m-%dT%H:00")
    try:
        return time_list.index(target_iso_hour)
    except ValueError:
        pass

    # Fallback: parse and find minimum delta
    best_idx = 0
    min_diff = float("inf")
    target_ts = target_dt.timestamp()

    for idx, t_str in enumerate(time_list):
        try:
            dt = datetime.fromisoformat(t_str)
            diff = abs(dt.timestamp() - target_ts)
            if diff < min_diff:
                min_diff = diff
                best_idx = idx
        except Exception:
            continue

    return best_idx


def extract_weather_at_eta(
    weather_payload: Dict[str, Any],
    eta_dt: datetime,
) -> Dict[str, Any]:
    """
    Extracts weather variables at the specified ETA hour from an Open-Meteo hourly payload.
    """
    hourly = weather_payload.get("hourly", {})
    times = hourly.get("time", [])

    if not times:
        return {
            "temperature_f": 65.0,
            "wind_speed_mph": 10.0,
            "rain_in_hr": 0.0,
            "snow_in_hr": 0.0,
            "weather_code": 0,
            "condition": "Fair / Clear",
        }

    idx = find_closest_hour_index(times, eta_dt)

    def get_val(key: str, default: float) -> float:
        arr = hourly.get(key, [])
        if idx < len(arr) and arr[idx] is not None:
            return float(arr[idx])
        return default

    wind_speed = get_val("wind_speed_10m", 0.0)
    rain = get_val("rain", 0.0)
    snow = get_val("snowfall", 0.0)
    temp_c = get_val("temperature_2m", 15.0)
    temp_f = round((temp_c * 9.0 / 5.0) + 32.0, 1)
    
    code_arr = hourly.get("weather_code", [])
    w_code = int(code_arr[idx]) if idx < len(code_arr) and code_arr[idx] is not None else 0

    return {
        "temperature_f": temp_f,
        "wind_speed_mph": round(wind_speed, 1),
        "rain_in_hr": round(rain, 2),
        "snow_in_hr": round(snow, 2),
        "weather_code": w_code,
        "condition": get_weather_description(w_code),
        "forecast_hour": times[idx] if idx < len(times) else eta_dt.isoformat(),
    }
