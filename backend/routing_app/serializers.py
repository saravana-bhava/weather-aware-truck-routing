"""
Serializers for routing and weather endpoints.
"""

from rest_framework import serializers


class CoordinateSerializer(serializers.Serializer):
    lat = serializers.FloatField(min_value=-90.0, max_value=90.0)
    lng = serializers.FloatField(min_value=-180.0, max_value=180.0)
    name = serializers.CharField(required=False, default="")


class RouteCalculationRequestSerializer(serializers.Serializer):
    origin = CoordinateSerializer()
    destination = CoordinateSerializer()
    departure_time = serializers.DateTimeField(required=False)
    load_weight_lb = serializers.FloatField(min_value=0.0, max_value=200000.0, default=40000.0)
    sampling_interval_miles = serializers.ChoiceField(choices=[10, 25, 50], default=25)
    include_heatmap = serializers.BooleanField(required=False, default=True)


class CorridorHeatmapRequestSerializer(serializers.Serializer):
    bbox = serializers.ListField(
        child=serializers.FloatField(),
        min_length=4,
        max_length=4,
        help_text="[min_lat, min_lon, max_lat, max_lon]",
    )
    departure_time = serializers.DateTimeField(required=False)
    load_weight_lb = serializers.FloatField(min_value=0.0, max_value=200000.0, default=40000.0)
    max_hours = serializers.IntegerField(min_value=1, max_value=48, default=48)
