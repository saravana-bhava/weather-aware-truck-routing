export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Severe' | 'No Travel';

export interface LocationPoint {
  lat: number;
  lng: number;
  name: string;
}

export interface GeocodingResult {
  id: number;
  name: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
}

export interface CheckpointWeather {
  temperature_f: number;
  wind_speed_mph: number;
  rain_in_hr: number;
  snow_in_hr: number;
  weather_code: number;
  condition: string;
  forecast_hour: string;
}

export interface CheckpointRisk {
  overall_level: RiskLevel;
  overall_score: number;
  color: string;
  primary_driver: string;
  wind_risk: RiskLevel;
  raw_wind_risk: RiskLevel;
  rain_risk: RiskLevel;
  snow_risk: RiskLevel;
  load_notes: string[];
}

export interface Checkpoint {
  index: number;
  latitude: number;
  longitude: number;
  distance_from_start_miles: number;
  segment_distance_miles: number;
  elapsed_seconds: number;
  eta: string;
  eta_formatted: string;
  weather?: CheckpointWeather;
  risk?: CheckpointRisk;
}

export interface RouteRiskSummary {
  no_travel_miles: number;
  severe_miles: number;
  high_miles: number;
  moderate_miles: number;
  low_miles: number;
  total_miles: number;
  average_risk_score: number;
}

export interface RouteOption {
  route_id: string;
  name: string;
  rank: number;
  is_recommended: boolean;
  recommendation_rationale: string;
  distance_miles: number;
  duration_hours: number;
  duration_seconds: number;
  geometry: {
    type: string;
    coordinates: [number, number][]; // [lon, lat]
  };
  checkpoints: Checkpoint[];
  risk_summary: RouteRiskSummary;
}

export interface HeatmapGridPoint {
  lat: number;
  lng: number;
  intensity: number;
  level: RiskLevel;
  score: number;
  wind_mph: number;
  rain_in_hr: number;
  snow_in_hr: number;
  temp_f: number;
}

export interface HeatmapHourFrame {
  hour_offset: number;
  timestamp: string;
  display_time: string;
  points: HeatmapGridPoint[];
}

export interface CorridorHeatmap {
  total_hours: number;
  departure_time: string;
  timeline: HeatmapHourFrame[];
}

export interface RouteCalculationResponse {
  origin: LocationPoint;
  destination: LocationPoint;
  departure_time: string;
  load_weight_lb: number;
  sampling_interval_miles: number;
  routes: RouteOption[];
  corridor_bbox: [number, number, number, number]; // [min_lat, min_lon, max_lat, max_lon]
  corridor_heatmap?: CorridorHeatmap;
}
