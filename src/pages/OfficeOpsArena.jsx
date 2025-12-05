import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Gamepad2,
  Trophy,
  Settings,
  X,
  ChevronRight,
  Building2,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ReactionGame from "@/components/games/ReactionGame";
import GameLeaderboard from "@/components/games/GameLeaderboard";

export default function OfficeOpsArena() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [currentView, setCurrentView] = useState("home"); // home, game, leaderboard
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminSettings, setAdminSettings] = useState({});

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const emps = await base44.entities.Employee.filter({ email: u.email });
      if (emps.length > 0) setEmployee(emps[0]);
    };
    init();
  }, []);

  const isAdmin = user?.role === 'admin' || employee?.role === 'hr' || employee?.role === 'manager';

  // Fetch game data
  const { data: gamePlayer } = useQuery({
    queryKey: ['gamePlayer', user?.email],
    queryFn: async () => {
      const players = await base44.entities.GamePlayer.filter({ employee_email: user?.email });
      return players[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: scores = [] } = useQuery({
    queryKey: ['gameScores'],
    queryFn: () => base44.entities.GameScore.list('-created_date', 500)
  });

  const { data: players = [] } = useQuery({
    queryKey: ['gamePlayers'],
    queryFn: () => base44.entities.GamePlayer.list()
  });

  const { data: settings } = useQuery({
    queryKey: ['gameSettings'],
    queryFn: async () => {
      const s = await base44.entities.GameSettings.filter({ setting_key: 'global' });
      return s[0] || { tokens_per_day: 10, max_consecutive_plays: 5, cooldown_minutes: 30, game_enabled: true };
    }
  });

  // Initialize or update player
  const initPlayer = async () => {
    if (!user || !employee) return null;
    
    const today = new Date().toISOString().split('T')[0];
    
    if (!gamePlayer) {
      const newPlayer = await base44.entities.GamePlayer.create({
        employee_email: user.email,
        display_name: employee.full_name,
        department: employee.department,
        tokens_left: settings?.tokens_per_day || 10,
        last_token_regen: today,
        total_score: 0,
        games_played: 0,
        consecutive_plays: 0
      });
      queryClient.invalidateQueries({ queryKey: ['gamePlayer'] });
      return newPlayer;
    }
    
    if (gamePlayer.last_token_regen !== today) {
      await base44.entities.GamePlayer.update(gamePlayer.id, {
        tokens_left: settings?.tokens_per_day || 10,
        last_token_regen: today,
        consecutive_plays: 0,
        cooldown_until: null
      });
      queryClient.invalidateQueries({ queryKey: ['gamePlayer'] });
    }
    
    return gamePlayer;
  };

  const canPlay = () => {
    if (!settings?.game_enabled) return { can: false, reason: "Game is disabled" };
    if (!gamePlayer) return { can: true, reason: "" };
    if (gamePlayer.tokens_left <= 0) return { can: false, reason: "No tokens left" };
    if (gamePlayer.cooldown_until && new Date(gamePlayer.cooldown_until) > new Date()) {
      const mins = Math.ceil((new Date(gamePlayer.cooldown_until) - new Date()) / 60000);
      return { can: false, reason: `Cooldown (${mins}m)` };
    }
    
    if (settings?.office_hours_only) {
      const hour = new Date().getHours();
      if (hour < (settings.office_start_hour || 9) || hour >= (settings.office_end_hour || 18)) {
        return { can: false, reason: "Office hours only" };
      }
    }
    
    return { can: true, reason: "" };
  };

  const handleStartGame = async () => {
    await initPlayer();
    const check = canPlay();
    if (!check.can) {
      toast.error(check.reason);
      return;
    }
    setCurrentView("game");
  };

  const handleGameComplete = async (result) => {
    setCurrentView("home");
    
    try {
      await base44.entities.GameScore.create({
        player_email: user.email,
        player_name: employee?.full_name || user.full_name,
        department: employee?.department,
        mode: 'reaction',
        score: result.score,
        reaction_time_ms: result.avgReactionTime,
        duration_seconds: 30
      });

      const newConsecutive = (gamePlayer?.consecutive_plays || 0) + 1;
      const maxConsec = settings?.max_consecutive_plays || 5;
      
      const updateData = {
        tokens_left: Math.max(0, (gamePlayer?.tokens_left || 10) - 1),
        total_score: (gamePlayer?.total_score || 0) + result.score,
        games_played: (gamePlayer?.games_played || 0) + 1,
        consecutive_plays: newConsecutive,
        last_play_time: new Date().toISOString()
      };

      if (newConsecutive >= maxConsec) {
        const cooldownMins = settings?.cooldown_minutes || 30;
        updateData.cooldown_until = new Date(Date.now() + cooldownMins * 60000).toISOString();
        updateData.consecutive_plays = 0;
        toast.info(`Cooldown! Take a ${cooldownMins} min break.`);
      }

      if (!gamePlayer?.best_reaction_time || result.avgReactionTime < gamePlayer.best_reaction_time) {
        updateData.best_reaction_time = result.avgReactionTime;
      }

      if (gamePlayer?.id) {
        await base44.entities.GamePlayer.update(gamePlayer.id, updateData);
      }

      queryClient.invalidateQueries({ queryKey: ['gamePlayer'] });
      queryClient.invalidateQueries({ queryKey: ['gameScores'] });
      queryClient.invalidateQueries({ queryKey: ['gamePlayers'] });

      toast.success(`+${result.score} points!`);
    } catch (err) {
      toast.error('Failed to save score');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const existing = await base44.entities.GameSettings.filter({ setting_key: 'global' });
      if (existing.length > 0) {
        await base44.entities.GameSettings.update(existing[0].id, adminSettings);
      } else {
        await base44.entities.GameSettings.create({ setting_key: 'global', ...adminSettings });
      }
      queryClient.invalidateQueries({ queryKey: ['gameSettings'] });
      setShowAdminDialog(false);
      toast.success('Settings saved');
    } catch (err) {
      toast.error('Failed to save');
    }
  };

  const playStatus = canPlay();
  const tokensLeft = gamePlayer?.tokens_left ?? (settings?.tokens_per_day || 10);

  // Game View
  if (currentView === "game") {
    return (
      <ReactionGame
        employee={employee}
        onComplete={handleGameComplete}
        onCancel={() => setCurrentView("home")}
      />
    );
  }

  // Leaderboard View
  if (currentView === "leaderboard") {
    return (
      <GameLeaderboard
        scores={scores}
        players={players}
        currentUserEmail={user?.email}
        onBack={() => setCurrentView("home")}
      />
    );
  }

  // Home View - Main Arena Screen
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      {/* Main Game Card */}
      <div 
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1e3a5f 0%, #0d1f3c 100%)'
        }}
      >
        {/* City Skyline Background */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200'%3E%3Crect fill='%231a365d' x='20' y='80' width='30' height='120'/%3E%3Crect fill='%231a365d' x='60' y='60' width='25' height='140'/%3E%3Crect fill='%231a365d' x='95' y='90' width='35' height='110'/%3E%3Crect fill='%231a365d' x='140' y='50' width='40' height='150'/%3E%3Crect fill='%231a365d' x='190' y='70' width='30' height='130'/%3E%3Crect fill='%231a365d' x='230' y='100' width='25' height='100'/%3E%3Crect fill='%231a365d' x='265' y='55' width='35' height='145'/%3E%3Crect fill='%231a365d' x='310' y='75' width='30' height='125'/%3E%3Crect fill='%231a365d' x='350' y='85' width='30' height='115'/%3E%3C/svg%3E")`,
            backgroundPosition: 'bottom',
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'cover'
          }}
        />

        {/* Admin Settings Button */}
        {isAdmin && (
          <button 
            onClick={() => { setAdminSettings(settings || {}); setShowAdminDialog(true); }}
            className="absolute top-4 right-4 z-10 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <Settings className="w-5 h-5 text-white/80" />
          </button>
        )}

        {/* Tokens Display */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-slate-800/60 px-3 py-1.5 rounded-full">
          <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
            <span className="text-xs font-bold text-yellow-900">🪙</span>
          </div>
          <span className="text-white font-bold">{tokensLeft}</span>
          <Plus className="w-4 h-4 text-green-400" />
        </div>

        <div className="relative z-10 p-8 pt-16 pb-10 flex flex-col items-center">
          {/* Title */}
          <h1 
            className="text-4xl font-black text-white tracking-tight mb-1"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}
          >
            OFFICE OPS
          </h1>
          <h2 
            className="text-5xl font-black mb-8"
            style={{ 
              color: '#f59e0b',
              textShadow: '2px 2px 4px rgba(0,0,0,0.4)',
              fontStyle: 'italic'
            }}
          >
            ARENA
          </h2>

          {/* Player Avatar */}
          <div className="relative mb-8">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-xl bg-slate-700">
              {employee?.profile_photo ? (
                <img 
                  src={employee.profile_photo} 
                  alt={employee.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                  <span className="text-4xl font-bold text-white">
                    {employee?.full_name?.[0] || user?.full_name?.[0] || '?'}
                  </span>
                </div>
              )}
            </div>
            {/* Level Badge */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-indigo-600 px-3 py-1 rounded-full">
              <span className="text-white text-xs font-bold">
                {gamePlayer?.games_played || 0} Games
              </span>
            </div>
          </div>

          {/* Player Name */}
          <p className="text-white font-semibold text-lg mb-1">
            {employee?.full_name || user?.full_name}
          </p>
          <p className="text-white/60 text-sm capitalize mb-8">
            {employee?.department || 'Player'}
          </p>

          {/* Play Button */}
          <button
            onClick={handleStartGame}
            disabled={!playStatus.can}
            className={`
              w-48 py-4 rounded-full font-bold text-xl uppercase tracking-wide
              transition-all transform hover:scale-105 active:scale-95
              ${playStatus.can 
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:from-orange-400 hover:to-orange-500' 
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            {playStatus.can ? 'PLAY' : playStatus.reason}
          </button>

          {/* Leaderboard Button */}
          <button
            onClick={() => setCurrentView("leaderboard")}
            className="mt-4 px-6 py-3 bg-slate-700/50 border border-white/20 rounded-full text-white font-semibold hover:bg-slate-600/50 transition-colors flex items-center gap-2"
          >
            <Trophy className="w-5 h-5 text-yellow-500" />
            LEADERBOARD
          </button>
        </div>

        {/* Bottom Stats Bar */}
        <div className="relative z-10 grid grid-cols-3 border-t border-white/10">
          <button
            onClick={() => setCurrentView("leaderboard")}
            className="py-4 text-center hover:bg-white/5 transition-colors"
          >
            <Building2 className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <span className="text-white/60 text-xs uppercase">Department</span>
          </button>
          <div className="py-4 text-center border-x border-white/10">
            <p className="text-2xl font-bold text-white">{gamePlayer?.total_score || 0}</p>
            <span className="text-white/60 text-xs uppercase">Total Score</span>
          </div>
          <div className="py-4 text-center">
            <p className="text-2xl font-bold text-white">
              {gamePlayer?.best_reaction_time || '-'}
              <span className="text-sm text-white/60">ms</span>
            </p>
            <span className="text-white/60 text-xs uppercase">Best Time</span>
          </div>
        </div>
      </div>

      {/* Admin Settings Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Game Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label>Enable Games</Label>
              <Switch
                checked={adminSettings.game_enabled ?? true}
                onCheckedChange={(v) => setAdminSettings({ ...adminSettings, game_enabled: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tokens Per Day</Label>
              <Input
                type="number"
                value={adminSettings.tokens_per_day || 10}
                onChange={(e) => setAdminSettings({ ...adminSettings, tokens_per_day: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Consecutive Plays</Label>
              <Input
                type="number"
                value={adminSettings.max_consecutive_plays || 5}
                onChange={(e) => setAdminSettings({ ...adminSettings, max_consecutive_plays: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cooldown (minutes)</Label>
              <Input
                type="number"
                value={adminSettings.cooldown_minutes || 30}
                onChange={(e) => setAdminSettings({ ...adminSettings, cooldown_minutes: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Office Hours Only</Label>
              <Switch
                checked={adminSettings.office_hours_only ?? false}
                onCheckedChange={(v) => setAdminSettings({ ...adminSettings, office_hours_only: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdminDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} className="bg-indigo-600 hover:bg-indigo-700">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}