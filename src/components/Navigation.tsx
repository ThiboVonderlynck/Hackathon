import { motion } from 'framer-motion';
import { Home, MessageSquare, Gamepad2, Trophy, User } from 'lucide-react';

type Tab = 'home' | 'chat' | 'challenges' | 'leaderboard' | 'profile';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'home', icon: <Home className="w-5 h-5" />, label: 'Home' },
    { id: 'chat', icon: <MessageSquare className="w-5 h-5" />, label: 'Chat' },
    { id: 'challenges', icon: <Gamepad2 className="w-5 h-5" />, label: 'Games' },
    { id: 'leaderboard', icon: <Trophy className="w-5 h-5" />, label: 'Ranks' },
    { id: 'profile', icon: <User className="w-5 h-5" />, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg
                transition-all duration-300
                ${activeTab === tab.id 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/30"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className="relative z-10 text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Top glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </nav>
  );
};

export default Navigation;
