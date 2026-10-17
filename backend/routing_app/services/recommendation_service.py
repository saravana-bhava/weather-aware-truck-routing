"""
Route recommendation engine.
Implements the exact priority hierarchy from specification:
1. Fewest Severe miles (and No Travel miles)
2. Fewest High miles
3. Lowest average risk
4. Shortest travel times
"""

from typing import List, Dict, Any


def rank_and_recommend_routes(routes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Ranks routes according to strict priority order:
      1. (no_travel_miles, severe_miles)
      2. high_miles
      3. average_risk_score
      4. duration_seconds
    Adds ranking metadata, recommendation flag, and human-readable rationale to each route.
    """
    if not routes:
        return []

    def sort_key(route: Dict[str, Any]):
        summary = route.get("risk_summary", {})
        return (
            summary.get("no_travel_miles", 0.0),
            summary.get("severe_miles", 0.0),
            summary.get("high_miles", 0.0),
            summary.get("average_risk_score", 1.0),
            route.get("duration_seconds", 0),
        )

    # Sort routes based on evaluation hierarchy
    sorted_routes = sorted(routes, key=sort_key)

    # Assign ranks and rationale
    for idx, r in enumerate(sorted_routes):
        r["rank"] = idx + 1
        r["is_recommended"] = (idx == 0)

        summary = r.get("risk_summary", {})
        no_travel = summary.get("no_travel_miles", 0.0)
        severe = summary.get("severe_miles", 0.0)
        high = summary.get("high_miles", 0.0)
        avg_risk = summary.get("average_risk_score", 1.0)
        duration_hrs = r.get("duration_hours", round(r.get("duration_seconds", 0) / 3600.0, 1))

        if idx == 0:
            reasons = []
            if no_travel == 0 and severe == 0:
                reasons.append("Zero Severe or No-Travel weather hazards along the entire trip corridor.")
            elif severe > 0:
                reasons.append(f"Lowest exposure to Severe weather ({severe} miles).")
            if high == 0:
                reasons.append("Zero High-risk miles.")
            else:
                reasons.append(f"Only {high} miles under High-risk weather.")
            reasons.append(f"Optimal average risk rating ({avg_risk}/5.0) with an estimated travel duration of {duration_hrs} hours.")
            r["recommendation_rationale"] = " ".join(reasons)
        else:
            diffs = []
            best_summary = sorted_routes[0].get("risk_summary", {})
            if no_travel > best_summary.get("no_travel_miles", 0.0):
                diffs.append(f"+{round(no_travel - best_summary.get('no_travel_miles', 0.0), 1)} more No-Travel miles")
            if severe > best_summary.get("severe_miles", 0.0):
                diffs.append(f"+{round(severe - best_summary.get('severe_miles', 0.0), 1)} more Severe miles")
            if high > best_summary.get("high_miles", 0.0):
                diffs.append(f"+{round(high - best_summary.get('high_miles', 0.0), 1)} more High miles")
            if avg_risk > best_summary.get("average_risk_score", 1.0):
                diffs.append(f"+{round(avg_risk - best_summary.get('average_risk_score', 1.0), 2)} higher avg risk")
            
            diff_text = ", ".join(diffs) if diffs else f"{duration_hrs} hrs travel time"
            r["recommendation_rationale"] = f"Alternative option #{idx + 1}: Has {diff_text} compared to the recommended route."

    return sorted_routes
