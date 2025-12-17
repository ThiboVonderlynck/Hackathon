import { motion } from 'framer-motion';
import { User, Trophy, Zap, Calendar, Edit2, Settings, LogOut, Medal, Target, Flame } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';

const UserProfile = () => {
  const { profile, signOut } = useAuth();
  const stats = [
    { label: 'Points', value: '1,234', icon: <Trophy className="w-4 h-4" /> },
    { label: 'Challenges', value: '47', icon: <Target className="w-4 h-4" /> },
    { label: 'Streak', value: '5 days', icon: <Flame className="w-4 h-4" /> },
  ];

  const badges = [
    { id: '1', name: 'Early Adopter', icon: '🚀', earned: true },
    { id: '2', name: 'Meme Lord', icon: '😂', earned: true },
    { id: '3', name: 'Social Butterfly', icon: '🦋', earned: true },
    { id: '4', name: 'Code Ninja', icon: '🥷', earned: false },
    { id: '5', name: 'Night Owl', icon: '🦉', earned: false },
    { id: '6', name: 'Team Player', icon: '🤝', earned: true },
  ];

  const recentActivity = [
    { action: 'Won Meme Battle', points: '+150', time: '2h ago' },
    { action: 'Completed Word Chain', points: '+100', time: '5h ago' },
    { action: 'Daily Check-in', points: '+25', time: '1d ago' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        {/* Cover */}
        <div className="h-24 rounded-t-xl bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20" />
        
        {/* Avatar */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-12">
          <div className="relative">
            <div className="w-24 h-24 rounded-xl bg-card border-4 border-background flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-primary" />
              )}
            </div>
            <button className="absolute -bottom-2 -right-2 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* User info */}
      <div className="pt-14 text-center space-y-2">
        <h2 className="font-display text-2xl text-primary text-glow-sm">
          {profile?.username?.toUpperCase() || 'ANONYMOUS_NERD'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {profile?.tag ? `#${profile.tag}` : '@nerdy_student_42'}
        </p>
        <div className="flex items-center justify-center gap-2">
          {profile?.tag && (
            <span className="px-3 py-1 rounded-full bg-building-a/20 text-building-a text-xs font-medium border border-building-a/30">
              {profile.tag}
            </span>
          )}
          <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs">
            Level 12
          </span>
        </div>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4"
      >
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="p-4 rounded-lg bg-card border border-border text-center hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-center gap-1 text-primary mb-1">
              {stat.icon}
            </div>
            <div className="font-display text-xl text-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm text-primary">BADGES</h3>
          <span className="text-xs text-muted-foreground">
            {badges.filter(b => b.earned).length}/{badges.length} earned
          </span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`
                aspect-square rounded-lg flex items-center justify-center text-2xl
                transition-all duration-300 cursor-pointer
                ${badge.earned 
                  ? 'bg-card border border-primary/30 hover:scale-110' 
                  : 'bg-muted/50 opacity-30 grayscale'
                }
              `}
              title={badge.name}
            >
              {badge.icon}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h3 className="font-display text-sm text-primary">RECENT_ACTIVITY</h3>
        <div className="space-y-2">
          {recentActivity.map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-foreground">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
              <span className="text-sm font-bold text-primary">{activity.points}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-2"
      >
        <Button variant="outline" className="flex-1">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => signOut()}
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
};

export default UserProfile;
