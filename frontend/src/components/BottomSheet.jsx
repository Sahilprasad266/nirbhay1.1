import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, MapPin, Navigation, RotateCcw, Shield, Clock, Route, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';

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
    setSourceInput(e.target.value);
    if (e.target.value === '') {
      setSource(null);
    }
  };

  const handleDestChange = (e) => {
    setDestInput(e.target.value);
    if (e.target.value === '') {
      setDestination(null);
    }
  };

  const handleFindRoute = () => {
    if (source && destination) {
      onFindRoute();
    }
  };

  const handleReset = () => {
    setSourceInput('');
    setDestInput('');
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

  return (
    <div
      ref={sheetRef}
      className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ease-out z-50 safe-area-bottom ${
        isExpanded ? 'h-[70vh]' : route ? 'h-[260px]' : 'h-[100px]'
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
                <p className="text-sm text-gray-500 mb-4">We'll find the safest path for you</p>

                {/* Source Input */}
                <div className="relative mb-3">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  </div>
                  <Input
                    placeholder="Current Location"
                    value={sourceInput}
                    onChange={handleSourceChange}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 rounded-xl text-base"
                    data-testid="source-input"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 text-xs font-medium"
                    onClick={onUseMyLocation}
                    data-testid="use-gps-btn"
                  >
                    Use GPS
                  </Button>
                </div>

                {/* Destination Input */}
                <div className="relative mb-4">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                  </div>
                  <Input
                    placeholder="Where are you going?"
                    value={destInput}
                    onChange={handleDestChange}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 rounded-xl text-base"
                    data-testid="destination-input"
                  />
                </div>

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
                  className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl text-lg disabled:opacity-50"
                  onClick={handleFindRoute}
                  disabled={!source || !destination}
                  data-testid="submit-route-btn"
                >
                  Find Safest Route
                  <ChevronUp className="w-5 h-5 ml-2" />
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
