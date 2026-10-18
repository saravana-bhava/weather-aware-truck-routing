import type {
  GeocodingResult,
  LocationPoint,
  RouteCalculationResponse,
  CorridorHeatmap,
} from '../types';

const API_BASE_URL = '/api';

export async function searchLocations(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];
  const res = await fetch(`${API_BASE_URL}/geocoding/search/?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) throw new Error('Geocoding search failed');
  return res.json();
}

export interface CalculateRoutesPayload {
  origin: LocationPoint;
  destination: LocationPoint;
  departure_time?: string;
  load_weight_lb: number;
  sampling_interval_miles: number;
  include_heatmap?: boolean;
}

export async function calculateRoutes(
  payload: CalculateRoutesPayload
): Promise<RouteCalculationResponse> {
  const res = await fetch(`${API_BASE_URL}/routes/calculate/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to calculate safe routes');
  }

  return res.json();
}

export async function fetchCorridorHeatmap(
  bbox: [number, number, number, number],
  loadWeightLb: number,
  departureTime?: string,
  maxHours: number = 48
): Promise<CorridorHeatmap> {
  const res = await fetch(`${API_BASE_URL}/heatmap/corridor/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bbox,
      load_weight_lb: loadWeightLb,
      departure_time: departureTime,
      max_hours: maxHours,
    }),
  });

  if (!res.ok) throw new Error('Failed to fetch heatmap data');
  return res.json();
}
