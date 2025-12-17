import { motion } from 'framer-motion';
import { Terminal, Wifi, MapPin, Users } from 'lucide-react';

interface TerminalHeaderProps {
  buildingName?: string;
  onlineCount: number;
}

const TerminalHeader = ({ buildingName, onlineCount }: TerminalHeaderProps) => {
  return (
    <motion.header 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm"
    >
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            <div className="relative flex-shrink-0">
              <Terminal className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-primary rounded-full animate-pulse" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-sm sm:text-lg text-primary text-glow-sm tracking-wider sm:tracking-widest truncate">
                NERD.HUB
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">v2.0.25</p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 flex-shrink-0">
            {buildingName && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md bg-primary/10 border border-primary/30"
              >
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm text-primary font-medium truncate max-w-[100px] md:max-w-none">
                  {buildingName}
                </span>
              </motion.div>
            )}
            
            <div className="hidden md:flex items-center gap-2 text-secondary">
              <Wifi className="w-4 h-4" />
              <span className="text-sm">CONNECTED</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 text-foreground">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 text-neon-yellow flex-shrink-0" />
              <span className="text-xs sm:text-sm font-bold">{onlineCount}</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">ONLINE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Animated border */}
      <div className="h-[2px] border-animate" />
    </motion.header>
  );
};

export default TerminalHeader;
