import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { RouteInputForm } from './components/RouteInputForm';
import { RouteCard } from './components/RouteCard';
import { RouteMap } from './components/RouteMap';
import { ForecastSlider } from './components/ForecastSlider';
import { RiskLegend } from './components/RiskLegend';
import { CheckpointTimeline } from './components/CheckpointTimeline';
import type {
  LocationPoint,
  RouteOption,
  CorridorHeatmap,
  Checkpoint,
} from './types';
import { calculateRoutes } from './services/api';
import { AlertCircle, RotateCcw, ShieldCheck } from 'lucide-react';

export function App() {
  // Trip Parameters
  const [origin, setOrigin] = useState<LocationPoint>({
    lat: 41.8781,
    lng: -87.6298,
    name: 'Chicago, IL',
  });
  const [destination, setDestination] = useState<LocationPoint>({
    lat: 40.7128,
    lng: -74.006,
    name: 'New York, NY',
  });

  const getInitialDepartureTime = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };

  const [departureTime, setDepartureTime] = useState<string>(getInitialDepartureTime);
  const [loadWeightLb, setLoadWeightLb] = useState<number>(45000);
  const [samplingInterval, setSamplingInterval] = useState<number>(25);

  // Results State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [corridorHeatmap, setCorridorHeatmap] = useState<CorridorHeatmap | null>(null);

  // Heatmap & Slider State
  const [forecastHour, setForecastHour] = useState<number>(0);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);

  // Active View Tab in Sidebar: 'routes' or 'checkpoints'
  const [sidebarTab, setSidebarTab] = useState<'routes' | 'checkpoints'>('routes');
  const [activeCheckpoint, setActiveCheckpoint] = useState<Checkpoint | null>(null);

  // Perform Route Calculation
  const handleCalculateRoutes = useCallback(async () => {
    if (!origin || !destination) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await calculateRoutes({
        origin,
        destination,
        departure_time: departureTime ? new Date(departureTime).toISOString() : undefined,
        load_weight_lb: loadWeightLb,
        sampling_interval_miles: samplingInterval,
        include_heatmap: true,
      });

      setRoutes(response.routes);
      setCorridorHeatmap(response.corridor_heatmap || null);

      // Select recommended route by default
      const recommended = response.routes.find((r) => r.is_recommended);
      setSelectedRouteId(recommended ? recommended.route_id : response.routes[0]?.route_id || null);
      setForecastHour(0);
      setSidebarTab('routes');
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to calculate safe routes. Please verify inputs.');
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, departureTime, loadWeightLb, samplingInterval]);

  // Initial calculation on mount
  useEffect(() => {
    handleCalculateRoutes();
  }, []);

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const selectedRoute = routes.find((r) => r.route_id === selectedRouteId) || routes[0];

  const currentFrame =
    corridorHeatmap?.timeline && corridorHeatmap.timeline[forecastHour]
      ? corridorHeatmap.timeline[forecastHour]
      : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header />

      {/* Main Content Layout */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-3 lg:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Trip Setup, Routes, or Checkpoints */}
        <section className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-80px)] pr-1">
          {/* Trip Parameters Form */}
          <RouteInputForm
            origin={origin}
            destination={destination}
            departureTime={departureTime}
            loadWeightLb={loadWeightLb}
            samplingInterval={samplingInterval}
            isLoading={isLoading}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onDepartureTimeChange={setDepartureTime}
            onLoadWeightChange={setLoadWeightLb}
            onSamplingIntervalChange={setSamplingInterval}
            onSubmit={handleCalculateRoutes}
            onSwap={handleSwap}
          />

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2 shadow-lg">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
              <button
                type="button"
                onClick={handleCalculateRoutes}
                className="text-xs font-bold text-rose-300 hover:text-white underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Routes / Checkpoints Tab Switcher */}
          {routes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSidebarTab('routes')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      sidebarTab === 'routes'
                        ? 'bg-emerald-600 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white bg-slate-800'
                    }`}
                  >
                    Routes (3)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab('checkpoints')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                      sidebarTab === 'checkpoints'
                        ? 'bg-emerald-600 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700'
                    }`}
                    title="View Checkpoint Timeline"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Checkpoint Timeline ({selectedRoute?.checkpoints.length || 0})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCalculateRoutes}
                  title="Recalculate Routes"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* View 1: 3 Route Cards */}
              {sidebarTab === 'routes' && (
                <div className="space-y-3">
                  {routes.map((r) => (
                    <RouteCard
                      key={r.route_id}
                      route={r}
                      isSelected={r.route_id === selectedRouteId}
                      onSelect={() => setSelectedRouteId(r.route_id)}
                      onOpenCheckpoints={() => {
                        setSelectedRouteId(r.route_id);
                        setSidebarTab('checkpoints');
                      }}
                    />
                  ))}
                </div>
              )}

              {/* View 2: Checkpoint Timeline (Directly visible in sidebar beside the map) */}
              {sidebarTab === 'checkpoints' && selectedRoute && (
                <CheckpointTimeline
                  routeName={selectedRoute.name}
                  checkpoints={selectedRoute.checkpoints}
                  activeCheckpoint={activeCheckpoint}
                  onSelectCheckpoint={(cp) => setActiveCheckpoint(cp)}
                  onBackToRoutes={() => setSidebarTab('routes')}
                />
              )}
            </div>
          )}

          {/* Risk Rules Legend */}
          <RiskLegend />
        </section>

        {/* Right Column: Map & Forecast Slider */}
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3 h-[600px] lg:h-[calc(100vh-85px)]">
          {/* Map */}
          <div className="flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative bg-slate-900">
            <RouteMap
              origin={origin}
              destination={destination}
              routes={routes}
              selectedRouteId={selectedRouteId}
              corridorHeatmap={corridorHeatmap}
              forecastHour={forecastHour}
              showHeatmap={showHeatmap}
              onSelectRoute={setSelectedRouteId}
              activeCheckpoint={activeCheckpoint}
              isLoading={isLoading}
            />

            {/* Active Route Pill */}
            {selectedRoute && (
              <div className="absolute top-3 left-3 z-[400] bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-bold text-white">{selectedRoute.name}</span>
                <span className="text-xs text-slate-400 font-mono">
                  ({selectedRoute.distance_miles} mi &bull; {selectedRoute.duration_hours}h)
                </span>
              </div>
            )}
          </div>

          {/* 0-48 Hour Forecast Slider */}
          <ForecastSlider
            currentHour={forecastHour}
            maxHours={48}
            displayTime={currentFrame?.display_time || ''}
            isVisible={showHeatmap}
            onChangeHour={setForecastHour}
            onToggleVisibility={() => setShowHeatmap(!showHeatmap)}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
