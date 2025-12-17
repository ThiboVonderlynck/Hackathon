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
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Terminal className="w-8 h-8 text-primary" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="font-display text-lg text-primary text-glow-sm tracking-widest">
                NERD.HUB
              </h1>
              <p className="text-xs text-muted-foreground">v2.0.25</p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-6">
            {buildingName && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30"
              >
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">{buildingName}</span>
              </motion.div>
            )}
            
            <div className="flex items-center gap-2 text-secondary">
              <Wifi className="w-4 h-4" />
              <span className="text-sm">CONNECTED</span>
            </div>

            <div className="flex items-center gap-2 text-foreground">
              <Users className="w-4 h-4 text-neon-yellow" />
              <span className="text-sm font-bold">{onlineCount}</span>
              <span className="text-xs text-muted-foreground">ONLINE</span>
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
