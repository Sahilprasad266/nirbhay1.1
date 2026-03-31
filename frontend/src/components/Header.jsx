import React from 'react';
import { MoreHorizontal, Shield } from 'lucide-react';

const Header = ({ isOnline }) => {
  return (
    <header 
      className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100"
      data-testid="header"
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 leading-tight">Nirbhay</h1>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                {isOnline ? 'Active' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Menu */}
        <button 
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          data-testid="menu-btn"
        >
          <MoreHorizontal className="w-6 h-6 text-gray-600" />
        </button>
      </div>
    </header>
  );
};

export default Header;
