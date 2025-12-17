"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Loader2 } from 'lucide-react';
import MatrixRain from '@/components/MatrixRain';
import TerminalHeader from '@/components/TerminalHeader';
import BuildingSelector from '@/components/BuildingSelector';
import GlobalChat from '@/components/GlobalChat';
import DailyChallenges from '@/components/DailyChallenges';
import LeaderBoard from '@/components/Leaderboard';
import Navigation from '@/components/Navigation';
import UserProfile from '@/components/UserProfile';
import { Button } from '@/components/ui/button';
import { howestCampuses, isOnCampus } from '@/data/howestCampuses';
import { useUsers } from '@/contexts/UserContext';

type Tab = 'home' | 'chat' | 'challenges' | 'leaderboard' | 'profile';

// Assign colors to campuses
const colorMap = ['green', 'cyan', 'magenta', 'yellow', 'green', 'cyan', 'magenta', 'yellow'];

// Map campuses to buildings format
const mapCampusesToBuildings = () => {
  return howestCampuses.map((campus, index) => {
    // Generate a short code from the campus name
    const code = campus.name
      .replace('Campus Kortrijk ', '')
      .replace('Campus ', '')
      .split(' ')
      .map(word => word.substring(0, 3).toUpperCase())
      .join('')
      .substring(0, 8);
    
    return {
      id: campus.id,
      name: campus.name.replace('Campus Kortrijk ', '').replace('Campus ', ''),
      code: code,
      color: colorMap[index % colorMap.length] as 'green' | 'cyan' | 'magenta' | 'yellow',
      activeUsers: Math.floor(Math.random() * 50) + 10, // Random for demo
      points: Math.floor(Math.random() * 2000) + 1000, // Random for demo
      isNear: false,
      campus: campus, // Store the original campus data
    };
  });
};

export default function Home() {
  const { addUser, getUserCountForBuilding, totalConnectedUsers, connectedUsers } = useUsers();
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isDetecting, setIsDetecting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [buildings, setBuildings] = useState(() => {
    // Initialize with fixed values to prevent hydration mismatch
    // Will be updated on client mount
    return howestCampuses.map((campus, index) => {
      const code = campus.name
        .replace('Campus Kortrijk ', '')
        .replace('Campus ', '')
        .split(' ')
        .map(word => word.substring(0, 3).toUpperCase())
        .join('')
        .substring(0, 8);
      
      return {
        id: campus.id,
        name: campus.name.replace('Campus Kortrijk ', '').replace('Campus ', ''),
        code: code,
        color: colorMap[index % colorMap.length] as 'green' | 'cyan' | 'magenta' | 'yellow',
        activeUsers: 0, // Will be set on client
        points: 0, // Will be set on client
        isNear: false,
        campus: campus,
      };
    });
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize buildings only on client to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    // Update buildings with real user counts
    setBuildings(prevBuildings => 
      prevBuildings.map(building => ({
        ...building,
        activeUsers: getUserCountForBuilding(building.id),
      }))
    );
  }, []);

  // Update activeUsers when connected users change
  useEffect(() => {
    setBuildings(prevBuildings => 
      prevBuildings.map(building => ({
        ...building,
        activeUsers: getUserCountForBuilding(building.id),
      }))
    );
  }, [connectedUsers, getUserCountForBuilding]);

  const currentBuilding = buildings.find(b => b.id === selectedBuilding);
  const onlineCount = totalConnectedUsers;

  const handleDetectLocation = () => {
    setIsDetecting(true);
    setLocationError(null);
    
    // Check for HTTPS (required for geolocation in production)
    const isSecureContext = typeof window !== 'undefined' && 
      (window.location.protocol === 'https:' || 
       window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1');
    
    // If we're not using HTTPS, show clear message
    if (!isSecureContext) {
      const errorMsg = 'Geolocation requires HTTPS. Use https:// or localhost to detect your location.';
      console.warn(errorMsg);
      setLocationError(errorMsg);
      setIsDetecting(false);
      setHasLocationPermission(false);
      return;
    }
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setIsDetecting(false);
      setHasLocationPermission(false);
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // Cache for 1 minute
    };
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setUserLocation({ lat, lon });
        setHasLocationPermission(true);
        
        // Check which campus is nearest
        const { nearestCampus, isOnCampus: onCampus } = isOnCampus(lat, lon);
        
        // Update buildings with isNear status
        setBuildings(prevBuildings => 
          prevBuildings.map(building => ({
            ...building,
            isNear: building.id === nearestCampus?.id && onCampus,
          }))
        );
        
        // Automatically select the nearest campus if you're on campus
        if (nearestCampus && onCampus) {
          setSelectedBuilding(nearestCampus.id);
          // Add user to context (only with verified location)
          addUser(nearestCampus.id, true);
        } else if (nearestCampus) {
          // Not on campus, but close enough for selection
          setSelectedBuilding(nearestCampus.id);
          addUser(nearestCampus.id, true);
        }
        
        setIsDetecting(false);
      },
      (error) => {
        const errorCode = error?.code ?? 'UNKNOWN';
        const errorMessage = error?.message ?? 'No error message available';
        
        setIsDetecting(false);
        setHasLocationPermission(false);
        
        // Specific error handling
        let userErrorMessage: string | null = null;
        
        // Check for HTTPS/secure origin error
        if (errorMessage.includes('secure origins') || 
            errorMessage.includes('Only secure origins') ||
            errorMessage.includes('getCurrentPosition') && errorCode === 1) {
          userErrorMessage = 'Geolocation requires HTTPS. Use https:// or localhost to detect your location.';
        } else {
          switch (errorCode) {
            case 1: // PERMISSION_DENIED
            case error?.PERMISSION_DENIED:
              userErrorMessage = 'Geolocation access denied. Check your browser settings and grant access.';
              break;
            case 2: // POSITION_UNAVAILABLE
            case error?.POSITION_UNAVAILABLE:
              userErrorMessage = 'Location information not available. Check your GPS/WiFi settings.';
              break;
            case 3: // TIMEOUT
            case error?.TIMEOUT:
              userErrorMessage = 'Location request timeout. Please try again.';
              break;
            default:
              userErrorMessage = 'Location could not be determined. Make sure you use HTTPS or localhost.';
          }
        }
        
        setLocationError(userErrorMessage);
        // NO fallback selection - user must use location
      },
      options
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-8">
            {/* Welcome section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4"
            >
              <h1 className="font-display text-3xl md:text-4xl text-primary text-glow mt-4">
                WELCOME, NERD
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Connect with your fellow students, win challenges and show which building is the coolest.
              </p>
              
              {!selectedBuilding && (
                <div className="flex flex-col items-center gap-4">
                  <Button 
                    onClick={handleDetectLocation}
                    variant="neon"
                    size="lg"
                    disabled={isDetecting}
                    className="mt-4"
                  >
                    {isDetecting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        SCANNING...
                      </>
                    ) : (
                      <>
                        <MapPin className="w-5 h-5" />
                        DETECT MY BUILDING
                      </>
                    )}
                  </Button>
                  {locationError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="max-w-md px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center"
                    >
                      {locationError}
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Building selector */}
            <BuildingSelector
              buildings={buildings}
              selectedBuilding={selectedBuilding}
              isDetecting={isDetecting}
              hasLocationPermission={hasLocationPermission}
              userLocation={userLocation}
            />

            {/* Quick stats when building selected */}
            {selectedBuilding && currentBuilding && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-xl bg-card border border-border"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg text-primary">TODAY&apos;S_PROGRESS</h3>
                  <span className={`text-sm font-bold ${
                    currentBuilding.color === 'green' ? 'text-building-a' :
                    currentBuilding.color === 'cyan' ? 'text-building-b' :
                    currentBuilding.color === 'magenta' ? 'text-building-c' :
                    'text-building-d'
                  }`}>
                    {currentBuilding.name}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="font-display text-2xl text-foreground">{currentBuilding.activeUsers}</div>
                    <div className="text-xs text-muted-foreground">Active now</div>
                  </div>
                  <div>
                    <div className="font-display text-2xl text-foreground">3</div>
                    <div className="text-xs text-muted-foreground">Challenges</div>
                  </div>
                  <div>
                    <div className="font-display text-2xl text-foreground">+125</div>
                    <div className="text-xs text-muted-foreground">Pts today</div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        );

      case 'chat':
        return selectedBuilding ? (
          <div className="h-[calc(100vh-180px)] rounded-xl overflow-hidden border border-border bg-card">
            <GlobalChat 
              currentBuilding={currentBuilding?.code || ''} 
              buildingColor={currentBuilding?.color || 'green'}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Select a building first to join the chat</p>
          </div>
        );

      case 'challenges':
        return <DailyChallenges />;

      case 'leaderboard':
        return <LeaderBoard />;

      case 'profile':
        return <UserProfile />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Matrix background */}
      <MatrixRain />

      {/* Welcome animation */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h1 className="font-display text-5xl md:text-7xl text-primary text-glow glitch mb-4">
                NERD.HUB
              </h1>
              <p className="text-muted-foreground typing cursor-blink">
                Initializing connection...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <TerminalHeader 
        buildingName={currentBuilding?.name}
        onlineCount={onlineCount}
      />

      {/* Main content */}
      <main className="relative z-10 pt-20 pb-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Scanlines overlay */}
      <div className="fixed inset-0 pointer-events-none scanlines opacity-30 z-50" />
    </div>
  );
}
