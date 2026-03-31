import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, MapPin, Navigation, RotateCcw, Shield, Clock, Route, AlertTriangle, Search, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';

// Popular locations in Kolkata/West Bengal for quick selection
const QUICK_LOCATIONS = [
  { name: 'Howrah Station', lat: 22.5839, lng: 88.3428 },
  { name: 'Salt Lake', lat: 22.5800, lng: 88.4179 },
  { name: 'Park Street', lat: 22.5514, lng: 88.3528 },
  { name: 'Esplanade', lat: 22.5638, lng: 88.3518 },
  { name: 'Dum Dum', lat: 22.6225, lng: 88.4258 },
  { name: 'New Town', lat: 22.5923, lng: 88.4851 },
  { name: 'Sealdah', lat: 22.5697, lng: 88.3697 },
  { name: 'Tollygunge', lat: 22.4984, lng: 88.3477 },
  { name: 'Jadavpur', lat: 22.4989, lng: 88.3714 },
  { name: 'Rajarhat', lat: 22.6158, lng: 88.4697 },
];

const BottomSheet = ({
  isExpanded,
  setIsExpanded,
  source,
  setSource,
  destination,
  setDestination,
  onFindRoute,
  onReset,
  onUseMyLocation,
  route,
  loading,
  mode,
  setMode,
  loadingSteps,
}) => {
  const [sourceInput, setSourceInput] = useState('');
  const [destInput, setDestInput] = useState('');
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const sheetRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  useEffect(() => {
    if (source && source.name) {
      setSourceInput(source.name);
    }
  }, [source]);

  useEffect(() => {
    if (destination && destination.name) {
      setDestInput(destination.name);
    }
  }, [destination]);

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = startY - currentY;
    
    if (diff > 50 && !isExpanded) {
      setIsExpanded(true);
    } else if (diff < -50 && isExpanded) {
      setIsExpanded(false);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleSourceChange = (e) => {
    const value = e.target.value;
    setSourceInput(value);
    setShowSourceSuggestions(value.length > 0);
    if (value === '') {
      setSource(null);
    }
  };

  const handleDestChange = (e) => {
    const value = e.target.value;
    setDestInput(value);
    setShowDestSuggestions(value.length > 0);
    if (value === '') {
      setDestination(null);
    }
  };

  const selectSourceLocation = (location) => {
    setSource({ lat: location.lat, lng: location.lng, name: location.name });
    setSourceInput(location.name);
    setShowSourceSuggestions(false);
  };

  const selectDestLocation = (location) => {
    setDestination({ lat: location.lat, lng: location.lng, name: location.name });
    setDestInput(location.name);
    setShowDestSuggestions(false);
  };

  const filteredSourceLocations = QUICK_LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(sourceInput.toLowerCase())
  );

  const filteredDestLocations = QUICK_LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(destInput.toLowerCase())
  );

  const handleFindRoute = () => {
    if (source && destination) {
      onFindRoute();
    }
  };

  const handleReset = () => {
    setSourceInput('');
    setDestInput('');
    setShowSourceSuggestions(false);
    setShowDestSuggestions(false);
    onReset();
  };

  const getSafetyColor = (level) => {
    switch (level) {
      case 'safe': return 'text-green-500';
      case 'moderate': return 'text-yellow-500';
      case 'danger': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getSafetyBg = (level) => {
    switch (level) {
      case 'safe': return 'bg-green-50 border-green-200';
      case 'moderate': return 'bg-yellow-50 border-yellow-200';
      case 'danger': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getSafetyLabel = (level) => {
    switch (level) {
      case 'safe': return 'Safe';
      case 'moderate': return 'Moderate';
      case 'danger': return 'High Risk';
      default: return 'Unknown';
    }
  };

  const canFindRoute = source && destination;

  return (
    <div
      ref={sheetRef}
      className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ease-out z-50 safe-area-bottom ${
        isExpanded ? 'h-[75vh]' : route ? 'h-[260px]' : 'h-[100px]'
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="bottom-sheet"
    >
      {/* Handle bar */}
      <div 
        className="flex justify-center py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="sheet-handle"
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
      </div>

      <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: 'calc(100% - 40px)' }}>
        {/* Loading State */}
        {loading && (
          <div className="fade-in" data-testid="loading-state">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full spinner" />
            </div>
            <h3 className="text-lg font-semibold text-center text-gray-800 mb-2">
              Analyzing Safest Route...
            </h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              Scanning crime heatmap data
            </p>
            <Progress value={loadingSteps.progress} className="h-2 mb-4" />
            <div className="space-y-2">
              {loadingSteps.steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${step.done ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={step.done ? 'text-gray-700' : 'text-gray-400'}>{step.label}</span>
                  {step.done && <span className="text-green-500 text-xs ml-auto">Done</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Route Results */}
        {route && !loading && (
          <div className="fade-in" data-testid="route-results">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Safest route calculated</p>
                <h3 className="text-lg font-semibold text-gray-800">
                  {source?.name || 'Start'} → {destination?.name || 'End'}
                </h3>
              </div>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
            </div>

            {/* Safety Score Card */}
            <div className={`p-4 rounded-xl border ${getSafetyBg(route.safety_level)} mb-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold text-gray-800">{route.safety_score}</span>
                  <span className="text-lg text-gray-500">/100</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                  route.safety_level === 'safe' ? 'bg-green-100' :
                  route.safety_level === 'moderate' ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <Shield className={`w-4 h-4 ${getSafetyColor(route.safety_level)}`} />
                  <span className={`text-sm font-medium ${getSafetyColor(route.safety_level)}`}>
                    {getSafetyLabel(route.safety_level)}
                  </span>
                </div>
              </div>
            </div>

            {/* Route Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Route className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <p className="text-lg font-semibold text-gray-800">{route.distance} km</p>
                <p className="text-xs text-gray-500">Distance</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <p className="text-lg font-semibold text-gray-800">{Math.round(route.duration)} min</p>
                <p className="text-xs text-gray-500">Est. Time</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <AlertTriangle className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <p className="text-lg font-semibold text-gray-800">{route.high_risk_segments}</p>
                <p className="text-xs text-gray-500">Risk Zones</p>
              </div>
            </div>

            {/* Navigation Button */}
            <Button 
              className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl"
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&origin=${source.lat},${source.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
                window.open(url, '_blank');
              }}
              data-testid="start-navigation-btn"
            >
              <Navigation className="w-5 h-5 mr-2" />
              Start Navigation
            </Button>

            {/* New Route Button */}
            <Button 
              variant="outline"
              className="w-full h-10 mt-3 rounded-xl text-gray-600"
              onClick={handleReset}
              data-testid="new-route-btn"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Plan New Route
            </Button>
          </div>
        )}

        {/* Input Form - when no route */}
        {!route && !loading && (
          <div className="fade-in">
            {!isExpanded ? (
              <Button 
                className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl text-lg"
                onClick={() => setIsExpanded(true)}
                data-testid="find-route-btn"
              >
                Find Safest Route
                <ChevronUp className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-gray-800 mb-1">Plan Your Route</h3>
                <p className="text-sm text-gray-500 mb-4">Select locations from suggestions below</p>

                {/* Source Input */}
                <div className="relative mb-3">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  </div>
                  <Input
                    placeholder="Start location"
                    value={sourceInput}
                    onChange={handleSourceChange}
                    onFocus={() => setShowSourceSuggestions(true)}
                    className="pl-10 pr-20 h-12 bg-gray-50 border-gray-200 rounded-xl text-base"
                    data-testid="source-input"
                  />
                  {source ? (
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                      onClick={() => { setSource(null); setSourceInput(''); }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 text-xs font-medium h-8"
                      onClick={onUseMyLocation}
                      data-testid="use-gps-btn"
                    >
                      Use GPS
                    </Button>
                  )}
                  
                  {/* Source Suggestions */}
                  {showSourceSuggestions && !source && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50">
                      {filteredSourceLocations.length > 0 ? (
                        filteredSourceLocations.map((loc, idx) => (
                          <button
                            key={idx}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                            onClick={() => selectSourceLocation(loc)}
                            data-testid={`source-suggestion-${idx}`}
                          >
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{loc.name}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          No locations found. Try: Howrah, Salt Lake, Park Street
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Destination Input */}
                <div className="relative mb-4">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                  </div>
                  <Input
                    placeholder="Destination"
                    value={destInput}
                    onChange={handleDestChange}
                    onFocus={() => setShowDestSuggestions(true)}
                    className="pl-10 pr-10 h-12 bg-gray-50 border-gray-200 rounded-xl text-base"
                    data-testid="destination-input"
                  />
                  {destination && (
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                      onClick={() => { setDestination(null); setDestInput(''); }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  
                  {/* Destination Suggestions */}
                  {showDestSuggestions && !destination && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50">
                      {filteredDestLocations.length > 0 ? (
                        filteredDestLocations.map((loc, idx) => (
                          <button
                            key={idx}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                            onClick={() => selectDestLocation(loc)}
                            data-testid={`dest-suggestion-${idx}`}
                          >
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{loc.name}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          No locations found. Try: Howrah, Salt Lake, Park Street
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected locations indicator */}
                {(source || destination) && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-xl text-sm">
                    <div className="flex items-center gap-2 text-blue-700">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {source && destination 
                          ? 'Both locations set - Ready to find route!'
                          : source 
                            ? 'Source set. Now select destination.'
                            : 'Destination set. Now select source.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Mode Toggle */}
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">Route Mode</p>
                  <div className="flex gap-2">
                    <Button
                      variant={mode === 'safest' ? 'default' : 'outline'}
                      className={`flex-1 h-11 rounded-xl font-medium ${
                        mode === 'safest' 
                          ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                          : 'border-gray-200 text-gray-600'
                      }`}
                      onClick={() => setMode('safest')}
                      data-testid="mode-safest-btn"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Safest
                    </Button>
                    <Button
                      variant={mode === 'fastest' ? 'default' : 'outline'}
                      className={`flex-1 h-11 rounded-xl font-medium ${
                        mode === 'fastest' 
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                          : 'border-gray-200 text-gray-600'
                      }`}
                      onClick={() => setMode('fastest')}
                      data-testid="mode-fastest-btn"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Fastest
                    </Button>
                  </div>
                </div>

                {/* Reset Button */}
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
                  data-testid="reset-btn"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>

                {/* Find Route Button */}
                <Button 
                  className={`w-full h-14 font-semibold rounded-xl text-lg transition-all ${
                    canFindRoute 
                      ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={handleFindRoute}
                  disabled={!canFindRoute}
                  data-testid="submit-route-btn"
                >
                  {canFindRoute ? (
                    <>
                      Find Safest Route
                      <ChevronUp className="w-5 h-5 ml-2" />
                    </>
                  ) : (
                    'Select both locations'
                  )}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomSheet;
