import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type {
  RouteOption,
  LocationPoint,
  CorridorHeatmap,
  Checkpoint,
} from '../types';
import { Loader2, Truck, Layers } from 'lucide-react';

export type BasemapStyle = 'dark' | 'street' | 'satellite';

interface RouteMapProps {
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  routes: RouteOption[];
  selectedRouteId: string | null;
  corridorHeatmap: CorridorHeatmap | null;
  forecastHour: number;
  showHeatmap: boolean;
  onSelectRoute: (routeId: string) => void;
  activeCheckpoint: Checkpoint | null;
  isLoading?: boolean;
}

// Risk Colors
const RISK_COLORS: Record<string, string> = {
  Low: '#10b981',         // Green
  Moderate: '#f59e0b',    // Amber
  High: '#f97316',        // Orange
  Severe: '#ef4444',      // Red
  'No Travel': '#7f1d1d', // Dark Maroon
};

export const RouteMap: React.FC<RouteMapProps> = ({
  origin,
  destination,
  routes,
  selectedRouteId,
  corridorHeatmap,
  forecastHour,
  showHeatmap,
  onSelectRoute,
  activeCheckpoint,
  isLoading = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const [basemapStyle, setBasemapStyle] = useState<BasemapStyle>('dark');
  const baseTileLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Layer groups
  const heatmapLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const checkpointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map and Custom Z-Index Panes
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [39.8283, -98.5795],
      zoom: 4,
      zoomControl: true,
    });

    // Create custom Leaflet panes with strict Z-Indexes so checkpoints are NEVER behind anything
    const heatmapPane = map.createPane('heatmapPane');
    heatmapPane.style.zIndex = '300';
    heatmapPane.style.pointerEvents = 'none';

    const routesPane = map.createPane('routesPane');
    routesPane.style.zIndex = '400';

    const checkpointsPane = map.createPane('checkpointsPane');
    checkpointsPane.style.zIndex = '600';

    const markersPane = map.createPane('markersPane');
    markersPane.style.zIndex = '700';

    // Base Tile Layer Group for dynamic switching
    baseTileLayerGroupRef.current = L.layerGroup().addTo(map);

    // Layer groups assigned to respective panes
    heatmapLayerGroupRef.current = L.layerGroup([], { pane: 'heatmapPane' } as any).addTo(map);
    routesLayerGroupRef.current = L.layerGroup([], { pane: 'routesPane' } as any).addTo(map);
    checkpointsLayerGroupRef.current = L.layerGroup([], { pane: 'checkpointsPane' } as any).addTo(map);
    markersLayerGroupRef.current = L.layerGroup([], { pane: 'markersPane' } as any).addTo(map);

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Basemap Tiles (100% Free, NO Watermarks, NO API Keys)
  useEffect(() => {
    const group = baseTileLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (basemapStyle === 'dark') {
      // ArcGIS World Dark Gray Base & Reference (Clean, dark GIS theme)
      const base = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri | Weather: Open-Meteo',
          maxZoom: 16,
        }
      );
      const reference = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '',
          maxZoom: 16,
        }
      );
      group.addLayer(base);
      group.addLayer(reference);
    } else if (basemapStyle === 'street') {
      // Esri World Street Map (Crisp roads, highway numbers, no volunteer block, no API key)
      const street = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USGS | Weather: Open-Meteo',
          maxZoom: 18,
        }
      );
      group.addLayer(street);
    } else if (basemapStyle === 'satellite') {
      // ArcGIS Satellite Imagery + Boundaries and Places
      const sat = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Source: Esri, Maxar, Earthstar Geographics',
          maxZoom: 18,
        }
      );
      const ref = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '',
          maxZoom: 18,
        }
      );
      group.addLayer(sat);
      group.addLayer(ref);
    }
  }, [basemapStyle]);

  // Render Weather Heatmap along trip corridor
  useEffect(() => {
    const group = heatmapLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();
    if (!showHeatmap || !corridorHeatmap || !corridorHeatmap.timeline) return;

    const frame = corridorHeatmap.timeline[forecastHour] || corridorHeatmap.timeline[0];
    if (!frame || !frame.points) return;

    frame.points.forEach((pt) => {
      const color = RISK_COLORS[pt.level] || '#10b981';
      const opacity = pt.level === 'Low' ? 0.15 : pt.level === 'Moderate' ? 0.3 : pt.level === 'High' ? 0.45 : 0.65;

      const circle = L.circle([pt.lat, pt.lng], {
        pane: 'heatmapPane',
        radius: 40000,
        color: 'transparent',
        fillColor: color,
        fillOpacity: opacity,
        interactive: false,
      });

      group.addLayer(circle);
    });
  }, [forecastHour, showHeatmap, corridorHeatmap]);

  // Render Origin and Destination Pins
  useEffect(() => {
    const group = markersLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (origin) {
      const originIcon = L.divIcon({
        className: 'origin-marker',
        html: `
          <div style="background-color: #10b981; width: 28px; height: 28px; border-radius: 50%; border: 2.5px solid #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.6); font-family: sans-serif; font-weight: 800; font-size: 11px; color: #fff;">
            A
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const m = L.marker([origin.lat, origin.lng], { icon: originIcon, pane: 'markersPane' }).bindPopup(
        `<div style="font-family: sans-serif; font-size: 12px;"><strong>Origin:</strong> ${origin.name}</div>`
      );
      group.addLayer(m);
    }

    if (destination) {
      const destIcon = L.divIcon({
        className: 'destination-marker',
        html: `
          <div style="background-color: #ef4444; width: 28px; height: 28px; border-radius: 50%; border: 2.5px solid #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.6); font-family: sans-serif; font-weight: 800; font-size: 11px; color: #fff;">
            B
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const m = L.marker([destination.lat, destination.lng], { icon: destIcon, pane: 'markersPane' }).bindPopup(
        `<div style="font-family: sans-serif; font-size: 12px;"><strong>Destination:</strong> ${destination.name}</div>`
      );
      group.addLayer(m);
    }
  }, [origin, destination]);

  // Render Routes and Checkpoints (Checkpoints always on top with pane 'checkpointsPane')
  useEffect(() => {
    const routesGroup = routesLayerGroupRef.current;
    const checkpointsGroup = checkpointsLayerGroupRef.current;
    const map = mapInstanceRef.current;

    if (!routesGroup || !checkpointsGroup || !map) return;

    routesGroup.clearLayers();
    checkpointsGroup.clearLayers();

    if (!routes || routes.length === 0) return;

    const bounds = L.latLngBounds([]);

    // 1. Render all 3 routes
    routes.forEach((r) => {
      const isSelected = r.route_id === selectedRouteId;
      const latLngs = r.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);

      latLngs.forEach((ll) => bounds.extend(ll));

      if (!isSelected) {
        // Unselected alternative route: subtle dashed line
        const polyline = L.polyline(latLngs, {
          pane: 'routesPane',
          color: '#64748b',
          weight: 4,
          opacity: 0.5,
          dashArray: '6, 6',
        });

        polyline.on('click', () => onSelectRoute(r.route_id));
        polyline.bindTooltip(`<strong>${r.name}</strong> (${r.distance_miles} mi, ${r.duration_hours}h)`);
        routesGroup.addLayer(polyline);
      } else {
        // Selected Route: Segments colored by checkpoint risk
        const cps = r.checkpoints;
        if (cps.length > 1) {
          for (let i = 0; i < cps.length - 1; i++) {
            const startCp = cps[i];
            const endCp = cps[i + 1];
            const riskLevel = endCp.risk?.overall_level || 'Low';
            const segColor = RISK_COLORS[riskLevel] || '#10b981';

            const line = L.polyline(
              [
                [startCp.latitude, startCp.longitude],
                [endCp.latitude, endCp.longitude],
              ],
              {
                pane: 'routesPane',
                color: segColor,
                weight: 6,
                opacity: 0.95,
              }
            );
            routesGroup.addLayer(line);
          }
        } else {
          const directLine = L.polyline(latLngs, {
            pane: 'routesPane',
            color: '#10b981',
            weight: 6,
            opacity: 0.9,
          });
          routesGroup.addLayer(directLine);
        }

        // 2. Render Checkpoints on top pane 'checkpointsPane' (z-index 600)
        cps.forEach((cp) => {
          const riskLevel = cp.risk?.overall_level || 'Low';
          const markerColor = RISK_COLORS[riskLevel] || '#10b981';

          const marker = L.circleMarker([cp.latitude, cp.longitude], {
            pane: 'checkpointsPane',
            radius: 6,
            fillColor: markerColor,
            color: '#ffffff',
            weight: 2,
            fillOpacity: 1,
            interactive: true,
          });

          const w = cp.weather;
          const rsk = cp.risk;

          // Quick Hover Tooltip
          marker.bindTooltip(
            `<b>Checkpoint #${cp.index} (Mile ${cp.distance_from_start_miles})</b><br/>${riskLevel} Risk &bull; ETA: ${cp.eta_formatted}`,
            { direction: 'top', offset: [0, -6] }
          );

          // Click Popup with complete weather and load details
          const popupContent = `
            <div style="font-family: sans-serif; font-size: 12px; min-width: 200px; color: #0f172a;">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:6px;">
                <strong>Checkpoint #${cp.index}</strong>
                <span style="background:${markerColor}; color:white; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">
                  ${riskLevel}
                </span>
              </div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
                <strong>Mile ${cp.distance_from_start_miles}</strong> &bull; ETA: ${cp.eta_formatted}
              </div>
              ${
                w
                  ? `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:6px; font-size:11px;">
                  <div><strong>Condition:</strong> ${w.condition} (${w.temperature_f}&deg;F)</div>
                  <div><strong>Wind:</strong> ${w.wind_speed_mph} mph (${rsk?.wind_risk || 'Low'})</div>
                  <div><strong>Rain:</strong> ${w.rain_in_hr} in/hr &bull; <strong>Snow:</strong> ${w.snow_in_hr} in/hr</div>
                </div>
              `
                  : ''
              }
              ${
                rsk?.load_notes && rsk.load_notes.length > 0
                  ? `
                <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:4px; padding:4px 6px; font-size:11px; color:#9f1239; margin-top:4px;">
                  <strong>Load Rule Impact:</strong> ${rsk.load_notes[0]}
                </div>
              `
                  : ''
              }
            </div>
          `;

          marker.bindPopup(popupContent);
          checkpointsGroup.addLayer(marker);
        });
      }
    });

    setTimeout(() => {
      map.invalidateSize();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }, 150);
  }, [routes, selectedRouteId, onSelectRoute]);

  // Center on active checkpoint if clicked from list
  useEffect(() => {
    if (!activeCheckpoint || !mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(
      [activeCheckpoint.latitude, activeCheckpoint.longitude],
      10,
      { duration: 1 }
    );
  }, [activeCheckpoint]);

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Basemap Switcher (Dark, Street, Satellite) */}
      <div className="absolute top-3 right-3 z-[400] bg-slate-900/90 backdrop-blur border border-slate-800 p-1 rounded-xl shadow-lg flex items-center gap-1">
        <span className="text-[10px] text-slate-400 font-semibold px-1.5 flex items-center gap-1">
          <Layers className="w-3 h-3 text-emerald-400" /> Map:
        </span>
        {(['dark', 'street', 'satellite'] as BasemapStyle[]).map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => setBasemapStyle(style)}
            className={`px-2 py-0.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
              basemapStyle === style
                ? 'bg-emerald-600 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {style}
          </button>
        ))}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-[800] bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3 p-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-xl animate-pulse">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              Calculating 3 Route Options & Sampling Weather...
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Checking checkpoints every interval and querying hourly weather at arrival ETAs
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
