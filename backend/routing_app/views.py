"""
API views for weather-aware truck routing.
"""

from datetime import datetime
import logging
from typing import List, Tuple
import requests

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .serializers import (
    RouteCalculationRequestSerializer,
    CorridorHeatmapRequestSerializer,
)
from .services.routing_service import (
    generate_3_corridor_routes,
    sample_route_checkpoints,
)
from .services.weather_service import (
    fetch_batch_weather,
    extract_weather_at_eta,
)
from .services.risk_service import (
    evaluate_checkpoint_risk,
    calculate_route_risk_summary,
)
from .services.recommendation_service import rank_and_recommend_routes
from .services.heatmap_service import (
    compute_corridor_grid,
    fetch_corridor_weather_series,
)

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    def get(self, request):
        return Response({"status": "healthy", "service": "weather-aware-truck-routing", "version": "1.0.0"})


class GeocodingSearchView(APIView):
    """
    Search addresses/cities via Open-Meteo Geocoding API.
    """
    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if len(query) < 2:
            return Response([])

        try:
            url = "https://geocoding-api.open-meteo.com/v1/search"
            params = {
                "name": query,
                "count": 6,
                "language": "en",
                "format": "json",
            }
            resp = requests.get(url, params=params, timeout=5)
            resp.raise_for_status()
            data = resp.json().get("results", [])

            results = []
            for item in data:
                components = [item.get("name")]
                if item.get("admin1"):
                    components.append(item.get("admin1"))
                if item.get("country_code"):
                    components.append(item.get("country_code"))

                display_name = ", ".join(components)
                results.append({
                    "id": item.get("id"),
                    "name": display_name,
                    "city": item.get("name"),
                    "state": item.get("admin1", ""),
                    "country": item.get("country", ""),
                    "lat": round(float(item["latitude"]), 5),
                    "lng": round(float(item["longitude"]), 5),
                })
            return Response(results)
        except Exception as e:
            logger.error(f"Geocoding error: {e}")
            return Response([], status=status.HTTP_200_OK)


class CalculateRoutesView(APIView):
    """
    Generates 3 routes, samples checkpoints every 10/25/50 miles, queries weather,
    evaluates risk according to load rules, ranks routes, and generates corridor heatmap.
    """
    def post(self, request):
        serializer = RouteCalculationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        origin_pt = (data["origin"]["lng"], data["origin"]["lat"])
        dest_pt = (data["destination"]["lng"], data["destination"]["lat"])
        departure_time = data.get("departure_time") or datetime.utcnow()
        load_weight_lb = data["load_weight_lb"]
        interval_miles = float(data["sampling_interval_miles"])
        include_heatmap = data.get("include_heatmap", True)

        try:
            # 1. Generate 3 corridor routes
            routes_raw = generate_3_corridor_routes(origin_pt, dest_pt)

            # 2. Sample checkpoints for each route
            all_weather_queries: List[Tuple[float, float]] = []
            route_checkpoints_map = {}

            for r in routes_raw:
                coords = r["geometry"]["coordinates"]
                checkpoints = sample_route_checkpoints(
                    coordinates=coords,
                    total_duration_sec=r["duration_seconds"],
                    departure_time=departure_time,
                    interval_miles=interval_miles,
                )
                route_checkpoints_map[r["route_id"]] = checkpoints
                for cp in checkpoints:
                    all_weather_queries.append((cp["latitude"], cp["longitude"]))

            # 3. Batch fetch weather for all checkpoints
            weather_responses = fetch_batch_weather(all_weather_queries)
            
            # Map weather back to checkpoints
            q_idx = 0
            enriched_routes = []
            min_lat, min_lon, max_lat, max_lon = 90.0, 180.0, -90.0, -180.0

            for r in routes_raw:
                checkpoints = route_checkpoints_map[r["route_id"]]
                for cp in checkpoints:
                    w_payload = weather_responses[q_idx] if q_idx < len(weather_responses) else {}
                    q_idx += 1

                    cp_eta = datetime.fromisoformat(cp["eta"])
                    weather_info = extract_weather_at_eta(w_payload, cp_eta)
                    
                    # Evaluate risk with load rules
                    risk_info = evaluate_checkpoint_risk(
                        wind_mph=weather_info["wind_speed_mph"],
                        rain_in_hr=weather_info["rain_in_hr"],
                        snow_in_hr=weather_info["snow_in_hr"],
                        load_weight_lb=load_weight_lb,
                    )

                    cp["weather"] = weather_info
                    cp["risk"] = risk_info

                    # Update bounding box
                    min_lat = min(min_lat, cp["latitude"])
                    max_lat = max(max_lat, cp["latitude"])
                    min_lon = min(min_lon, cp["longitude"])
                    max_lon = max(max_lon, cp["longitude"])

                # Calculate route summary
                risk_summary = calculate_route_risk_summary(checkpoints)

                enriched_routes.append({
                    "route_id": r["route_id"],
                    "name": r["name"],
                    "distance_miles": r["distance_miles"],
                    "duration_hours": r["duration_hours"],
                    "duration_seconds": r["duration_seconds"],
                    "geometry": r["geometry"],
                    "checkpoints": checkpoints,
                    "risk_summary": risk_summary,
                })

            # 4. Rank and recommend routes according to priority rules
            ranked_routes = rank_and_recommend_routes(enriched_routes)

            # 5. Compute corridor bbox
            corridor_bbox = [
                round(min_lat, 4),
                round(min_lon, 4),
                round(max_lat, 4),
                round(max_lon, 4),
            ]

            # 6. Generate corridor heatmap if requested
            corridor_heatmap = None
            if include_heatmap and min_lat < max_lat:
                grid = compute_corridor_grid(
                    bbox=(min_lat, min_lon, max_lat, max_lon),
                    grid_rows=7,
                    grid_cols=7,
                )
                corridor_heatmap = fetch_corridor_weather_series(
                    grid_points=grid,
                    load_weight_lb=load_weight_lb,
                    departure_time=departure_time,
                    max_hours=48,
                )

            return Response({
                "origin": data["origin"],
                "destination": data["destination"],
                "departure_time": departure_time.isoformat(),
                "load_weight_lb": load_weight_lb,
                "sampling_interval_miles": interval_miles,
                "routes": ranked_routes,
                "corridor_bbox": corridor_bbox,
                "corridor_heatmap": corridor_heatmap,
            })

        except Exception as e:
            logger.exception("Error calculating routes")
            return Response(
                {"error": f"Failed to compute route options: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CorridorHeatmapView(APIView):
    """
    Dedicated endpoint to fetch or refresh corridor heatmap.
    """
    def post(self, request):
        serializer = CorridorHeatmapRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        bbox = tuple(data["bbox"])
        departure_time = data.get("departure_time") or datetime.utcnow()
        load_weight_lb = data["load_weight_lb"]
        max_hours = data["max_hours"]

        grid = compute_corridor_grid(bbox, grid_rows=7, grid_cols=7)
        heatmap_data = fetch_corridor_weather_series(
            grid_points=grid,
            load_weight_lb=load_weight_lb,
            departure_time=departure_time,
            max_hours=max_hours,
        )

        return Response(heatmap_data)
