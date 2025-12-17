import { motion } from 'framer-motion';
import { Palette, MessageSquare, Image, Zap, Clock, Users, Trophy, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  participants: number;
  timeLeft: string;
  points: number;
  type: 'active' | 'upcoming' | 'completed';
  color: string;
}

const DailyChallenges = () => {
  const challenges: Challenge[] = [
    {
      id: '1',
      title: 'WORD CHAIN',
      description: 'Spreek af in de Core en vul elkaars woorden aan. Fysieke meetup required!',
      icon: <MessageSquare className="w-6 h-6" />,
      participants: 24,
      timeLeft: '2h 34m',
      points: 150,
      type: 'active',
      color: 'green',
    },
    {
      id: '2',
      title: 'MEME BATTLE',
      description: 'Maak de beste meme van de dag. Alle gebouwen stemmen!',
      icon: <Image className="w-6 h-6" />,
      participants: 67,
      timeLeft: '5h 12m',
      points: 200,
      type: 'active',
      color: 'cyan',
    },
    {
      id: '3',
      title: 'ART DUEL',
      description: 'Maak een tekening en laat de gebouwen stemmen op de beste.',
      icon: <Palette className="w-6 h-6" />,
      participants: 45,
      timeLeft: '1h 45m',
      points: 175,
      type: 'active',
      color: 'magenta',
    },
    {
      id: '4',
      title: 'SPEED QUIZ',
      description: 'Beantwoord 10 nerd trivia vragen zo snel mogelijk.',
      icon: <Zap className="w-6 h-6" />,
      participants: 0,
      timeLeft: 'Starts in 30m',
      points: 100,
      type: 'upcoming',
      color: 'yellow',
    },
  ];

  const colorMap: Record<string, { border: string; bg: string; text: string; shadow: string }> = {
    green: {
      border: 'border-building-a',
      bg: 'bg-building-a/10',
      text: 'text-building-a',
      shadow: 'shadow-[0_0_15px_hsl(var(--building-a)/0.3)]',
    },
    cyan: {
      border: 'border-building-b',
      bg: 'bg-building-b/10',
      text: 'text-building-b',
      shadow: 'shadow-[0_0_15px_hsl(var(--building-b)/0.3)]',
    },
    magenta: {
      border: 'border-building-c',
      bg: 'bg-building-c/10',
      text: 'text-building-c',
      shadow: 'shadow-[0_0_15px_hsl(var(--building-c)/0.3)]',
    },
    yellow: {
      border: 'border-building-d',
      bg: 'bg-building-d/10',
      text: 'text-building-d',
      shadow: 'shadow-[0_0_15px_hsl(var(--building-d)/0.3)]',
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-primary">DAILY_CHALLENGES</h2>
        <span className="text-xs text-muted-foreground">
          Reset in 8h 24m
        </span>
      </div>

      <div className="grid gap-4">
        {challenges.map((challenge, index) => {
          const colors = colorMap[challenge.color];
          const isActive = challenge.type === 'active';

          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer
                ${colors.border} ${colors.bg}
                ${isActive ? colors.shadow : 'opacity-70'}
                hover:scale-[1.02] group
              `}
            >
              {isActive && (
                <span className="absolute -top-2 left-4 px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded font-bold">
                  LIVE
                </span>
              )}

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-3 rounded-lg ${colors.bg} ${colors.text}`}>
                  {challenge.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-display text-lg ${colors.text}`}>
                      {challenge.title}
                    </h3>
                    <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                      +{challenge.points} pts
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {challenge.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{challenge.participants}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{challenge.timeLeft}</span>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`shrink-0 ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyChallenges;
