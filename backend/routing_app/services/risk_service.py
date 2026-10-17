"""
Risk classification and load rules engine for weather-aware truck routing.
Implements the exact thresholds and load adjustments specified in the requirements.
"""

from dataclasses import dataclass
from typing import Dict, Any, Tuple, List

RISK_LEVELS = ["Low", "Moderate", "High", "Severe", "No Travel"]

RISK_SCORES: Dict[str, float] = {
    "Low": 1.0,
    "Moderate": 2.0,
    "High": 3.0,
    "Severe": 4.0,
    "No Travel": 5.0,
}

RISK_COLORS: Dict[str, str] = {
    "Low": "#10b981",       # Green
    "Moderate": "#f59e0b",  # Amber/Yellow
    "High": "#f97316",      # Orange
    "Severe": "#ef4444",    # Red
    "No Travel": "#450a0a", # Very dark red / Black
}


def classify_wind(wind_mph: float) -> str:
    """
    Wind thresholds:
      Low: <25 mph
      Moderate: 25-34 mph
      High: 35-44 mph
      Severe: 45-54 mph
      No Travel: >=55 mph
    """
    if wind_mph >= 55.0:
        return "No Travel"
    elif wind_mph >= 45.0:
        return "Severe"
    elif wind_mph >= 35.0:
        return "High"
    elif wind_mph >= 25.0:
        return "Moderate"
    else:
        return "Low"


def classify_rain(rain_in_hr: float) -> str:
    """
    Rain thresholds:
      Low: <0.10 in/hr
      Moderate: 0.10-0.25 in/hr
      High: 0.25-0.50 in/hr
      Severe: 0.50-1.00 in/hr
      No Travel: >1.00 in/hr
    """
    if rain_in_hr > 1.00:
        return "No Travel"
    elif rain_in_hr >= 0.50:
        return "Severe"
    elif rain_in_hr >= 0.25:
        return "High"
    elif rain_in_hr >= 0.10:
        return "Moderate"
    else:
        return "Low"


def classify_snow(snow_in_hr: float) -> str:
    """
    Snow thresholds:
      Low: <0.5 in/hr
      Moderate: 0.5-1.0 in/hr
      High: 1.0-2.0 in/hr
      Severe: 2.0-3.0 in/hr
      No Travel: >3.0 in/hr
    """
    if snow_in_hr > 3.0:
        return "No Travel"
    elif snow_in_hr >= 2.0:
        return "Severe"
    elif snow_in_hr >= 1.0:
        return "High"
    elif snow_in_hr >= 0.5:
        return "Moderate"
    else:
        return "Low"


def apply_load_rules(wind_mph: float, base_wind_risk: str, load_weight_lb: float) -> Tuple[str, List[str]]:
    """
    Apply truck load rules on wind:
      - >=55 mph -> No Travel for any load
      - 45-54 mph + >30,000 lb -> No Travel (normally Severe)
      - 35-44 mph + >40,000 lb -> Severe (normally High)
    """
    notes = []
    adjusted_wind_risk = base_wind_risk

    if wind_mph >= 55.0:
        adjusted_wind_risk = "No Travel"
        notes.append(f"Wind speed {wind_mph:.1f} mph exceeds 55 mph safety limit (No Travel for all loads).")
    elif 45.0 <= wind_mph < 55.0:
        if load_weight_lb > 30000:
            adjusted_wind_risk = "No Travel"
            notes.append(
                f"Wind speed {wind_mph:.1f} mph (45-54 mph) with heavy load ({load_weight_lb:,.0f} lb > 30,000 lb) elevates risk to No Travel."
            )
        else:
            adjusted_wind_risk = "Severe"
    elif 35.0 <= wind_mph < 45.0:
        if load_weight_lb > 40000:
            adjusted_wind_risk = "Severe"
            notes.append(
                f"Wind speed {wind_mph:.1f} mph (35-44 mph) with heavy load ({load_weight_lb:,.0f} lb > 40,000 lb) elevates risk from High to Severe."
            )
        else:
            adjusted_wind_risk = "High"

    return adjusted_wind_risk, notes


def evaluate_checkpoint_risk(
    wind_mph: float,
    rain_in_hr: float,
    snow_in_hr: float,
    load_weight_lb: float,
) -> Dict[str, Any]:
    """
    Calculates detailed weather risk for a single checkpoint including load weight rules.
    """
    raw_wind_risk = classify_wind(wind_mph)
    rain_risk = classify_rain(rain_in_hr)
    snow_risk = classify_snow(snow_in_hr)

    adj_wind_risk, load_notes = apply_load_rules(wind_mph, raw_wind_risk, load_weight_lb)

    # Determine highest severity among conditions
    all_risks = [
        ("Wind", adj_wind_risk, RISK_SCORES[adj_wind_risk]),
        ("Rain", rain_risk, RISK_SCORES[rain_risk]),
        ("Snow", snow_risk, RISK_SCORES[snow_risk]),
    ]

    # Find maximum risk
    highest_risk = max(all_risks, key=lambda r: r[2])
    overall_level = highest_risk[1]
    overall_score = highest_risk[2]

    # Primary risk driver
    drivers = [name for name, level, score in all_risks if score == overall_score and level != "Low"]
    primary_driver = ", ".join(drivers) if drivers else "None (Clear)"

    return {
        "overall_level": overall_level,
        "overall_score": overall_score,
        "color": RISK_COLORS[overall_level],
        "primary_driver": primary_driver,
        "wind_risk": adj_wind_risk,
        "raw_wind_risk": raw_wind_risk,
        "rain_risk": rain_risk,
        "snow_risk": snow_risk,
        "load_notes": load_notes,
    }


def calculate_route_risk_summary(checkpoints: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes total miles per risk tier and weighted average risk for an entire route.
    """
    miles_by_level = {
        "Low": 0.0,
        "Moderate": 0.0,
        "High": 0.0,
        "Severe": 0.0,
        "No Travel": 0.0,
    }
    
    total_miles = 0.0
    weighted_score_sum = 0.0

    for cp in checkpoints:
        seg_miles = cp.get("segment_distance_miles", 0.0)
        risk_level = cp.get("risk", {}).get("overall_level", "Low")
        risk_score = RISK_SCORES.get(risk_level, 1.0)
        
        miles_by_level[risk_level] += seg_miles
        weighted_score_sum += seg_miles * risk_score
        total_miles += seg_miles

    avg_risk = (weighted_score_sum / total_miles) if total_miles > 0 else 1.0

    return {
        "no_travel_miles": round(miles_by_level["No Travel"], 1),
        "severe_miles": round(miles_by_level["Severe"], 1),
        "high_miles": round(miles_by_level["High"], 1),
        "moderate_miles": round(miles_by_level["Moderate"], 1),
        "low_miles": round(miles_by_level["Low"], 1),
        "total_miles": round(total_miles, 1),
        "average_risk_score": round(avg_risk, 2),
    }
