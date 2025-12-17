import { motion } from 'framer-motion';
import { Building2, Users, Trophy, Zap } from 'lucide-react';
import { Button } from './ui/button';

import type { Campus } from '@/data/howestCampuses';

interface Building {
  id: string;
  name: string;
  code: string;
  color: string;
  activeUsers: number;
  points: number;
  isNear: boolean;
  campus?: Campus;
}

interface BuildingSelectorProps {
  buildings: Building[];
  selectedBuilding: string | null;
  isDetecting: boolean;
  hasLocationPermission: boolean;
  userLocation: { lat: number; lon: number } | null;
}

const BuildingSelector = ({ buildings, selectedBuilding, isDetecting, hasLocationPermission, userLocation }: BuildingSelectorProps) => {
  const colorMap: Record<string, string> = {
    green: 'border-building-a text-building-a shadow-[0_0_20px_hsl(var(--building-a)/0.3)]',
    cyan: 'border-building-b text-building-b shadow-[0_0_20px_hsl(var(--building-b)/0.3)]',
    magenta: 'border-building-c text-building-c shadow-[0_0_20px_hsl(var(--building-c)/0.3)]',
    yellow: 'border-building-d text-building-d shadow-[0_0_20px_hsl(var(--building-d)/0.3)]',
  };

  const bgMap: Record<string, string> = {
    green: 'bg-building-a/10 hover:bg-building-a/20',
    cyan: 'bg-building-b/10 hover:bg-building-b/20',
    magenta: 'bg-building-c/10 hover:bg-building-c/20',
    yellow: 'bg-building-d/10 hover:bg-building-d/20',
  };

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h2 className="font-display text-2xl text-primary text-glow-sm">
          {isDetecting ? '// LOCATING...' : selectedBuilding ? '// YOUR BUILDING' : '// LOCATION REQUIRED'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {isDetecting 
            ? 'Scanning for nearby buildings...' 
            : selectedBuilding
              ? 'Your building is automatically assigned based on your location'
              : 'Enable location to automatically detect your building'}
        </p>
        {!hasLocationPermission && !isDetecting && (
          <p className="text-xs text-destructive/80 mt-2">
            ⚠️ Buildings are automatically assigned based on your location
          </p>
        )}
      </motion.div>

      <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
        {buildings.map((building, index) => (
          <motion.div
            key={building.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <div
              className={`
                relative w-full p-6 rounded-lg border-2 transition-all duration-300
                ${colorMap[building.color]}
                ${bgMap[building.color]}
                ${selectedBuilding === building.id ? 'scale-105 ring-2 ring-offset-2 ring-offset-background' : ''}
                ${building.isNear ? 'pulse-neon' : ''}
                ${selectedBuilding === building.id ? 'cursor-default' : 'opacity-60 cursor-not-allowed'}
                group
              `}
              title={selectedBuilding === building.id ? 'Your assigned building' : 'Buildings are automatically assigned via location detection'}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-background/50">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="font-display text-3xl font-bold opacity-20 group-hover:opacity-40 transition-opacity">
                  {building.code}
                </span>
              </div>

              <h3 className="font-display text-lg text-left mb-4">{building.name}</h3>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{building.activeUsers}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  <span>{building.points} pts</span>
                </div>
              </div>

              {selectedBuilding === building.id && (
                <motion.div
                  layoutId="selected-indicator"
                  className="absolute inset-0 border-2 border-current rounded-lg"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              {selectedBuilding === building.id && (
                <div className="absolute top-2 right-2 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full font-bold">
                  ASSIGNED
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {isDetecting && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 text-secondary"
        >
          <Zap className="w-4 h-4 animate-pulse" />
          <span className="text-sm">Geolocation active...</span>
        </motion.div>
      )}
    </div>
  );
};

export default BuildingSelector;
