import React from 'react';

const Legend = ({ visible }) => {
  if (!visible) return null;

  return (
    <div 
      className="fixed right-4 bottom-[280px] bg-white rounded-xl shadow-lg p-3 z-30 fade-in"
      data-testid="legend"
    >
      <p className="text-xs font-semibold text-gray-600 mb-2">Legend</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-gray-600">Danger</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-xs text-gray-600">Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-gray-600">Safe</span>
        </div>
      </div>
    </div>
  );
};

export default Legend;
