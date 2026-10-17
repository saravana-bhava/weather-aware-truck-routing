"""
Unit tests for risk thresholds and load weight rules.
"""

import pytest
from routing_app.services.risk_service import (
    classify_wind,
    classify_rain,
    classify_snow,
    apply_load_rules,
    evaluate_checkpoint_risk,
    calculate_route_risk_summary,
)


def test_wind_classification():
    # Low: <25 mph
    assert classify_wind(0.0) == "Low"
    assert classify_wind(24.9) == "Low"

    # Moderate: 25-34 mph
    assert classify_wind(25.0) == "Moderate"
    assert classify_wind(34.0) == "Moderate"

    # High: 35-44 mph
    assert classify_wind(35.0) == "High"
    assert classify_wind(44.0) == "High"

    # Severe: 45-54 mph
    assert classify_wind(45.0) == "Severe"
    assert classify_wind(54.9) == "Severe"

    # No Travel: >=55 mph
    assert classify_wind(55.0) == "No Travel"
    assert classify_wind(75.0) == "No Travel"


def test_rain_classification():
    # Low: <0.10 in/hr
    assert classify_rain(0.0) == "Low"
    assert classify_rain(0.09) == "Low"

    # Moderate: 0.10-0.25 in/hr
    assert classify_rain(0.10) == "Moderate"
    assert classify_rain(0.24) == "Moderate"

    # High: 0.25-0.50 in/hr
    assert classify_rain(0.25) == "High"
    assert classify_rain(0.49) == "High"

    # Severe: 0.50-1.00 in/hr
    assert classify_rain(0.50) == "Severe"
    assert classify_rain(1.00) == "Severe"

    # No Travel: >1.00 in/hr
    assert classify_rain(1.01) == "No Travel"
    assert classify_rain(2.50) == "No Travel"


def test_snow_classification():
    # Low: <0.5 in/hr
    assert classify_snow(0.0) == "Low"
    assert classify_snow(0.49) == "Low"

    # Moderate: 0.5-1.0 in/hr
    assert classify_snow(0.5) == "Moderate"
    assert classify_snow(0.99) == "Moderate"

    # High: 1.0-2.0 in/hr
    assert classify_snow(1.0) == "High"
    assert classify_snow(1.99) == "High"

    # Severe: 2.0-3.0 in/hr
    assert classify_snow(2.0) == "Severe"
    assert classify_snow(3.0) == "Severe"

    # No Travel: >3.0 in/hr
    assert classify_snow(3.01) == "No Travel"
    assert classify_snow(5.0) == "No Travel"


def test_load_rule_ge_55_mph():
    # >=55 mph -> No Travel for any load
    level, notes = apply_load_rules(wind_mph=56.0, base_wind_risk="No Travel", load_weight_lb=10000)
    assert level == "No Travel"
    assert len(notes) > 0

    level, notes = apply_load_rules(wind_mph=60.0, base_wind_risk="No Travel", load_weight_lb=50000)
    assert level == "No Travel"


def test_load_rule_45_to_54_mph():
    # 45-54 mph + >30,000 lb -> No Travel
    level, notes = apply_load_rules(wind_mph=48.0, base_wind_risk="Severe", load_weight_lb=35000)
    assert level == "No Travel"
    assert "elevates risk to No Travel" in notes[0]

    # 45-54 mph + <=30,000 lb -> stays Severe
    level, notes = apply_load_rules(wind_mph=48.0, base_wind_risk="Severe", load_weight_lb=28000)
    assert level == "Severe"
    assert len(notes) == 0


def test_load_rule_35_to_44_mph():
    # 35-44 mph + >40,000 lb -> Severe
    level, notes = apply_load_rules(wind_mph=38.0, base_wind_risk="High", load_weight_lb=45000)
    assert level == "Severe"
    assert "elevates risk from High to Severe" in notes[0]

    # 35-44 mph + <=40,000 lb -> stays High
    level, notes = apply_load_rules(wind_mph=38.0, base_wind_risk="High", load_weight_lb=35000)
    assert level == "High"
    assert len(notes) == 0


def test_evaluate_checkpoint_risk_combining():
    # Rain is High, Wind is Moderate, Snow is Low -> Overall High
    eval_res = evaluate_checkpoint_risk(
        wind_mph=26.0,
        rain_in_hr=0.30,
        snow_in_hr=0.1,
        load_weight_lb=20000,
    )
    assert eval_res["overall_level"] == "High"
    assert "Rain" in eval_res["primary_driver"]

    # Heavy snow overrides everything
    eval_snow = evaluate_checkpoint_risk(
        wind_mph=15.0,
        rain_in_hr=0.0,
        snow_in_hr=3.5,
        load_weight_lb=20000,
    )
    assert eval_snow["overall_level"] == "No Travel"


def test_route_risk_summary():
    checkpoints = [
        {"segment_distance_miles": 25.0, "risk": {"overall_level": "Low"}},
        {"segment_distance_miles": 25.0, "risk": {"overall_level": "Moderate"}},
        {"segment_distance_miles": 25.0, "risk": {"overall_level": "High"}},
        {"segment_distance_miles": 25.0, "risk": {"overall_level": "Severe"}},
    ]
    summary = calculate_route_risk_summary(checkpoints)
    assert summary["total_miles"] == 100.0
    assert summary["low_miles"] == 25.0
    assert summary["moderate_miles"] == 25.0
    assert summary["high_miles"] == 25.0
    assert summary["severe_miles"] == 25.0
    assert summary["no_travel_miles"] == 0.0
    # avg score: (1*25 + 2*25 + 3*25 + 4*25) / 100 = 250 / 100 = 2.5
    assert summary["average_risk_score"] == 2.5
