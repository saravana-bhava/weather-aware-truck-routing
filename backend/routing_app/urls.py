"""
URL configuration for routing_app.
"""

from django.urls import path
from .views import (
    HealthCheckView,
    GeocodingSearchView,
    CalculateRoutesView,
    CorridorHeatmapView,
)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('geocoding/search/', GeocodingSearchView.as_view(), name='geocoding-search'),
    path('routes/calculate/', CalculateRoutesView.as_view(), name='calculate-routes'),
    path('heatmap/corridor/', CorridorHeatmapView.as_view(), name='corridor-heatmap'),
]
