"""
Unit tests for the route recommendation and tiebreaker ranking logic.
"""

from routing_app.services.recommendation_service import rank_and_recommend_routes


def test_recommendation_prioritizes_fewest_severe_miles():
    r1 = {
        "route_id": "r1",
        "duration_seconds": 36000,
        "risk_summary": {"no_travel_miles": 0.0, "severe_miles": 10.0, "high_miles": 20.0, "average_risk_score": 2.0},
    }
    r2 = {
        "route_id": "r2",
        "duration_seconds": 30000,  # Shorter time, but more severe miles
        "risk_summary": {"no_travel_miles": 0.0, "severe_miles": 25.0, "high_miles": 10.0, "average_risk_score": 2.2},
    }
    
    ranked = rank_and_recommend_routes([r2, r1])
    assert ranked[0]["route_id"] == "r1"
    assert ranked[0]["is_recommended"] is True
    assert ranked[1]["route_id"] == "r2"
    assert ranked[1]["is_recommended"] is False


def test_recommendation_tiebreaker_high_miles():
    # Both have 0 severe miles; route with fewest high miles wins
    r1 = {
        "route_id": "r1",
        "duration_seconds": 36000,
        "risk_summary": {"no_travel_miles": 0.0, "severe_miles": 0.0, "high_miles": 30.0, "average_risk_score": 2.0},
    }
    r2 = {
        "route_id": "r2",
        "duration_seconds": 36000,
        "risk_summary": {"no_travel_miles": 0.0, "severe_miles": 0.0, "high_miles": 10.0, "average_risk_score": 2.0},
    }

    ranked = rank_and_recommend_routes([r1, r2])
    assert ranked[0]["route_id"] == "r2"


def test_recommendation_tiebreaker_lowest_avg_risk():
    # Both have 0 severe, 0 high; route with lower avg risk wins
    r1 = {
        "route_id": "r1",
        "duration_seconds": 30000,
        "risk_summary": {"no_travel_miles": 0.0, "severe_miles": 0.0, "high_miles": 0.0, "average_risk_score": 1.8},
    }
    r2 = {
        "route_id": "r2",
        "duration_seconds": 30000,
        "risk_summary": {"no_travel_miles": 0.0, "severe_miles": 0.0, "high_miles": 0.0, "average_risk_score": 1.3},
    }

    ranked = rank_and_recommend_routes([r1, r2])
    assert ranked[0]["route_id"] == "r2"


def test_recommendation_tiebreaker_shortest_travel_time():
    # All risk metrics identical; shorter duration wins
    r1 = {
        "route_id": "r1",
        "duration_seconds": 32000,
        "risk_summary": {"no_travel_miles": 0.0, "severe_miles": 0.0, "high_miles": 0.0, "average_risk_score": 1.2},
    }
    r2 = {
        "route_id": "r2",
        "duration_seconds": 28000,
        "risk_summary": {"no_travel_miles": 0.0, "severe_miles": 0.0, "high_miles": 0.0, "average_risk_score": 1.2},
    }

    ranked = rank_and_recommend_routes([r1, r2])
    assert ranked[0]["route_id"] == "r2"
