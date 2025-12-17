import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Loader2 } from 'lucide-react';
import MatrixRain from '@/components/MatrixRain';
import TerminalHeader from '@/components/TerminalHeader';
import BuildingSelector from '@/components/BuildingSelector';
import GlobalChat from '@/components/GlobalChat';
import DailyChallenges from '@/components/DailyChallenges';
import Leaderboard from '@/components/Leaderboard';
import Navigation from '@/components/Navigation';
import UserProfile from '@/components/UserProfile';
import { Button } from '@/components/ui/button';

type Tab = 'home' | 'chat' | 'challenges' | 'leaderboard' | 'profile';

const Index = () => {
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isDetecting, setIsDetecting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  const buildings = [
    { id: 'core', name: 'THE CORE', code: 'CORE', color: 'green', activeUsers: 42, points: 2450, isNear: false },
    { id: 'weide', name: 'DE WEIDE', code: 'WEIDE', color: 'cyan', activeUsers: 28, points: 2180, isNear: false },
    { id: 'station', name: 'HET STATION', code: 'STATION', color: 'magenta', activeUsers: 35, points: 1920, isNear: false },
    { id: 'bblok', name: 'B-BLOK', code: 'B-BLOK', color: 'yellow', activeUsers: 19, points: 1650, isNear: false },
  ];

  const currentBuilding = buildings.find(b => b.id === selectedBuilding);
  const onlineCount = buildings.reduce((acc, b) => acc + b.activeUsers, 0);

  const handleDetectLocation = () => {
    setIsDetecting(true);
    // Simulate geolocation detection
    setTimeout(() => {
      setIsDetecting(false);
      // Randomly select a building as "nearby" for demo
      const randomBuilding = buildings[Math.floor(Math.random() * buildings.length)];
      setSelectedBuilding(randomBuilding.id);
    }, 2000);
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
              <h1 className="font-display text-3xl md:text-4xl text-primary text-glow">
                WELKOM, NERD
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Connect met je medestudenten, win challenges en laat zien welk gebouw het coolste is.
              </p>
              
              {!selectedBuilding && (
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
              )}
            </motion.div>

            {/* Building selector */}
            <BuildingSelector
              buildings={buildings}
              selectedBuilding={selectedBuilding}
              onSelect={setSelectedBuilding}
              isDetecting={isDetecting}
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
        return <Leaderboard />;

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
            className="fixed inset-0 z-[100] bg-background flex items-center justify-center"
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
};

export default Index;
