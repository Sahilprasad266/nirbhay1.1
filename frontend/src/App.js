import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import MapView from './components/MapView';
import BottomSheet from './components/BottomSheet';
import Header from './components/Header';
import Legend from './components/Legend';
import { getHeatmap, findSafeRoute, checkHealth } from './api';
import { Toaster, toast } from 'sonner';

// Kolkata center
const DEFAULT_CENTER = [22.5726, 88.3639];
const DEFAULT_ZOOM = 12;

function App() {
  // App state
  const [isOnline, setIsOnline] = useState(false);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [districts, setDistricts] = useState({});
  
  // Route state
  const [source, setSource] = useState(null);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [mode, setMode] = useState('safest');
  
  // UI state
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState({
    progress: 0,
    steps: [
      { label: 'Fetching heatmap data', done: false },
      { label: 'Calculating route', done: false },
      { label: 'Scoring risk zones', done: false },
    ],
  });
  
  // Map state
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);

  // Initialize app
  useEffect(() => {
    const initApp = async () => {
      try {
        // Check backend health
        const health = await checkHealth();
        setIsOnline(health.status === 'healthy');
        
        // Load heatmap data
        const heatmapData = await getHeatmap();
        if (heatmapData.points) {
          setHeatmapPoints(heatmapData.points);
        }
        if (heatmapData.districts) {
          setDistricts(heatmapData.districts);
        }
        
        toast.success('Nirbhay loaded successfully', {
          description: `${Object.keys(heatmapData.districts || {}).length} districts analyzed`,
        });
      } catch (error) {
        console.error('Failed to initialize app:', error);
        toast.error('Failed to connect to server', {
          description: 'Please check your connection',
        });
      }
    };

    initApp();
  }, []);

  // Handle using current location
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    toast.loading('Getting your location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSource({
          lat: latitude,
          lng: longitude,
          name: 'Current Location',
        });
        setMapCenter([latitude, longitude]);
        setMapZoom(14);
        toast.dismiss();
        toast.success('Location found!');
      },
      (error) => {
        toast.dismiss();
        console.error('Geolocation error:', error);
        // Default to Kolkata center
        setSource({
          lat: 22.5726,
          lng: 88.3639,
          name: 'Kolkata Center',
        });
        toast.info('Using default location (Kolkata)');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Handle finding route
  const handleFindRoute = useCallback(async () => {
    if (!source || !destination) {
      toast.error('Please set both source and destination');
      return;
    }

    setLoading(true);
    setIsExpanded(true);
    setLoadingSteps({
      progress: 0,
      steps: [
        { label: 'Fetching heatmap data', done: false },
        { label: 'Calculating route', done: false },
        { label: 'Scoring risk zones', done: false },
      ],
    });

    try {
      // Simulate loading steps
      setLoadingSteps(prev => ({
        ...prev,
        progress: 33,
        steps: prev.steps.map((s, i) => i === 0 ? { ...s, done: true } : s),
      }));
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLoadingSteps(prev => ({
        ...prev,
        progress: 66,
        steps: prev.steps.map((s, i) => i <= 1 ? { ...s, done: true } : s),
      }));

      const result = await findSafeRoute(
        source.lat,
        source.lng,
        destination.lat,
        destination.lng,
        mode
      );

      setLoadingSteps(prev => ({
        ...prev,
        progress: 100,
        steps: prev.steps.map(s => ({ ...s, done: true })),
      }));

      await new Promise(resolve => setTimeout(resolve, 300));

      if (result.route) {
        setRoute(result.route);
        
        // Center map on route
        const routeCoords = result.route.geometry;
        if (routeCoords && routeCoords.length > 0) {
          const midIndex = Math.floor(routeCoords.length / 2);
          setMapCenter([routeCoords[midIndex][1], routeCoords[midIndex][0]]);
          setMapZoom(13);
        }

        toast.success('Route calculated!', {
          description: `Safety score: ${result.route.safety_score}/100`,
        });
      }
    } catch (error) {
      console.error('Failed to find route:', error);
      toast.error('Failed to calculate route', {
        description: 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  }, [source, destination, mode]);

  // Handle reset
  const handleReset = useCallback(() => {
    setSource(null);
    setDestination(null);
    setRoute(null);
    setMapCenter(DEFAULT_CENTER);
    setMapZoom(DEFAULT_ZOOM);
    setIsExpanded(false);
  }, []);

  // Handle map click to set markers
  const handleMapClick = useCallback((lat, lng) => {
    if (!source) {
      setSource({ lat, lng, name: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      toast.info('Start point set. Now set destination.');
    } else if (!destination) {
      setDestination({ lat, lng, name: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      toast.info('Destination set. Click "Find Route" to continue.');
      setIsExpanded(true);
    }
  }, [source, destination]);

  return (
    <div className="h-screen w-screen overflow-hidden relative" data-testid="app-container">
      {/* Toast notifications */}
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <Header isOnline={isOnline} />
      
      {/* Map */}
      <div className="absolute inset-0 pt-14">
        <MapView
          heatmapPoints={heatmapPoints}
          source={source}
          destination={destination}
          route={route}
          onMapClick={handleMapClick}
          center={mapCenter}
          zoom={mapZoom}
        />
      </div>

      {/* Legend */}
      <Legend visible={heatmapPoints.length > 0 && !isExpanded} />

      {/* Zoom Controls */}
      <div className="fixed right-4 top-20 z-30">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <button 
            className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-100 border-b border-gray-100"
            onClick={() => setMapZoom(prev => Math.min(prev + 1, 18))}
            data-testid="zoom-in-btn"
          >
            +
          </button>
          <button 
            className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-100"
            onClick={() => setMapZoom(prev => Math.max(prev - 1, 5))}
            data-testid="zoom-out-btn"
          >
            −
          </button>
        </div>
      </div>

      {/* Bottom Sheet */}
      <BottomSheet
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        source={source}
        setSource={setSource}
        destination={destination}
        setDestination={setDestination}
        onFindRoute={handleFindRoute}
        onReset={handleReset}
        onUseMyLocation={handleUseMyLocation}
        route={route}
        loading={loading}
        mode={mode}
        setMode={setMode}
        loadingSteps={loadingSteps}
      />
    </div>
  );
}

export default App;
