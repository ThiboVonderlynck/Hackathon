'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Medal, Award, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { howestCampuses } from '@/data/howestCampuses';

interface BuildingScore {
  id: string;
  name: string;
  code: string;
  points: number;
  change: number;
  streak: number;
  color: string;
}

const Leaderboard = () => {
  const [buildings, setBuildings] = useState<BuildingScore[]>([]);
  const [loading, setLoading] = useState(true);

  // Map building IDs to colors
  const colorMapArray = ['green', 'cyan', 'magenta', 'yellow', 'green', 'cyan', 'magenta', 'yellow'];

  useEffect(() => {
    const loadRankings = async () => {
      try {
        const { data: rankings, error } = await supabase.rpc('get_building_rankings_today');

        if (error) {
          console.error('Error loading building rankings:', error);
          setLoading(false);
          return;
        }

        if (rankings && rankings.length > 0) {
          // Map rankings to BuildingScore format
          const mappedBuildings: BuildingScore[] = rankings.map((ranking: any, index: number) => {
            const campus = howestCampuses.find(c => c.id === ranking.building_id);
            const code = campus?.name
              ?.replace('Campus Kortrijk ', '')
              ?.replace('Campus ', '')
              ?.split(' ')
              ?.map(word => word.substring(0, 3).toUpperCase())
              ?.join('')
              ?.substring(0, 8) || ranking.building_id.substring(0, 8).toUpperCase();
            
            const name = campus?.name
              ?.replace('Campus Kortrijk ', '')
              ?.replace('Campus ', '') || ranking.building_id;

            return {
              id: ranking.building_id,
              name: name,
              code: code,
              points: Number(ranking.total_points),
              change: 0, // Can be calculated later if we track historical data
              streak: 0, // Can be calculated later if we track daily wins
              color: colorMapArray[index % colorMapArray.length] as 'green' | 'cyan' | 'magenta' | 'yellow',
            };
          });

          setBuildings(mappedBuildings);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error loading building rankings:', err);
        setLoading(false);
      }
    };

    loadRankings();
    
    // Refresh rankings every 30 seconds
    const interval = setInterval(loadRankings, 30000);
    return () => clearInterval(interval);
  }, []);

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    green: { bg: 'bg-building-a', text: 'text-building-a', border: 'border-building-a' },
    cyan: { bg: 'bg-building-b', text: 'text-building-b', border: 'border-building-b' },
    magenta: { bg: 'bg-building-c', text: 'text-building-c', border: 'border-building-c' },
    yellow: { bg: 'bg-building-d', text: 'text-building-d', border: 'border-building-d' },
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 text-muted-foreground text-center">{index + 1}</span>;
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-primary" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-mono">LOADING_RANKINGS...</p>
        </div>
      </div>
    );
  }

  if (buildings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No rankings available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-neon-yellow" />
          <h2 className="font-display text-xl text-primary">LEADERBOARD</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          Updated live
        </span>
      </div>

      {/* Podium visualization - only show if we have at least 3 buildings */}
      {buildings.length >= 3 && (
        <div className="flex items-end justify-center gap-2 h-32 mb-8">
          {/* 2nd place */}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: '60%' }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={`w-20 rounded-t-lg flex flex-col items-center justify-start pt-2 ${colorMap[buildings[1].color].bg}/20 border-2 ${colorMap[buildings[1].color].border}`}
          >
            <Medal className="w-6 h-6 text-gray-400" />
            <span className={`font-display text-xs ${colorMap[buildings[1].color].text} mt-1`}>
              {buildings[1].code}
            </span>
            <span className="text-xs text-muted-foreground">{buildings[1].points.toLocaleString()}</span>
          </motion.div>

          {/* 1st place */}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: '100%' }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className={`w-24 rounded-t-lg flex flex-col items-center justify-start pt-2 ${colorMap[buildings[0].color].bg}/30 border-2 ${colorMap[buildings[0].color].border} pulse-neon`}
          >
            <Crown className="w-8 h-8 text-yellow-400" />
            <span className={`font-display text-sm ${colorMap[buildings[0].color].text} mt-1`}>
              {buildings[0].code}
            </span>
            <span className="text-sm font-bold text-foreground">{buildings[0].points.toLocaleString()}</span>
            {buildings[0].streak > 0 && (
              <span className="text-xs text-neon-yellow">🔥 {buildings[0].streak} day streak</span>
            )}
          </motion.div>

          {/* 3rd place */}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: '40%' }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className={`w-20 rounded-t-lg flex flex-col items-center justify-start pt-2 ${colorMap[buildings[2].color].bg}/20 border-2 ${colorMap[buildings[2].color].border}`}
          >
            <Award className="w-6 h-6 text-amber-600" />
            <span className={`font-display text-xs ${colorMap[buildings[2].color].text} mt-1`}>
              {buildings[2].code}
            </span>
            <span className="text-xs text-muted-foreground">{buildings[2].points.toLocaleString()}</span>
          </motion.div>
        </div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {buildings.map((building, index) => {
          const colors = colorMap[building.color];

          return (
            <motion.div
              key={building.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                flex items-center gap-4 p-4 rounded-lg border transition-all
                ${colors.border} bg-card hover:bg-muted/50
                ${index === 0 ? 'ring-2 ring-yellow-400/30' : ''}
              `}
            >
              {/* Rank */}
              <div className="w-8 flex items-center justify-center">
                {getRankIcon(index)}
              </div>

              {/* Building info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-display font-bold ${colors.text}`}>
                    {building.name}
                  </span>
                  {building.streak > 0 && (
                    <span className="text-xs text-neon-yellow">🔥 {building.streak}</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{building.code}</span>
              </div>

              {/* Points */}
              <div className="text-right">
                <div className="font-display text-lg font-bold text-foreground">
                  {building.points.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {building.points === 0 ? 'No points yet' : 'Total points'}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
