'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirement: string;
  earned: boolean;
}

interface BadgeProps {
  badge: Badge;
  onClick?: () => void;
}

const Badge = ({ badge, onClick }: BadgeProps) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <div
        className={`
          aspect-square rounded-lg flex items-center justify-center text-2xl
          transition-all duration-300 cursor-pointer relative
          ${badge.earned 
            ? 'bg-card border border-primary/30 hover:scale-110 hover:border-primary' 
            : 'bg-muted/50 opacity-30 grayscale'
          }
        `}
        onClick={() => {
          setShowInfo(true);
          onClick?.();
        }}
        title={badge.earned ? badge.name : 'Locked'}
      >
        {badge.icon}
        {!badge.earned && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-muted-foreground rounded-full" />
          </div>
        )}
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border-2 border-primary rounded-xl p-6 max-w-md w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowInfo(false)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-4">
                <div className="text-6xl mb-2">{badge.icon}</div>
                <h3 className="font-display text-2xl text-primary">{badge.name}</h3>
                <p className="text-muted-foreground">{badge.description}</p>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-mono text-muted-foreground mb-1">REQUIREMENT:</p>
                  <p className="text-sm text-foreground">{badge.requirement}</p>
                </div>
                {badge.earned && (
                  <div className="pt-2">
                    <span className="text-xs px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
                      EARNED
                    </span>
                  </div>
                )}
                {!badge.earned && (
                  <div className="pt-2">
                    <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                      LOCKED
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Badge;

