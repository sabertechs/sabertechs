import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Gamepad2,
  Zap,
  Coins,
  Trophy,
  Clock,
  Users,
  Settings,
  Play,
  Lock,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  const [showGame, setShowGame] = useState(false);
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
      // Create new player
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
    
    // Check if tokens need regeneration (new day)
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
    if (!settings?.game_enabled) return { can: false, reason: "Game is disabled by admin" };
    if (!gamePlayer) return { can: true, reason: "" };
    if (gamePlayer.tokens_left <= 0) return { can: false, reason: "No tokens left today" };
    if (gamePlayer.cooldown_until && new Date(gamePlayer.cooldown_until) > new Date()) {
      const mins = Math.ceil((new Date(gamePlayer.cooldown_until) - new Date()) / 60000);
      return { can: false, reason: `Cooldown active (${mins} min left)` };
    }
    
    // Check office hours if enabled
    if (settings?.office_hours_only) {
      const hour = new Date().getHours();
      if (hour < (settings.office_start_hour || 9) || hour >= (settings.office_end_hour || 18)) {
        return { can: false, reason: "Games only available during office hours" };
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
    setShowGame(true);
  };

  const handleGameComplete = async (result) => {
    setShowGame(false);
    
    try {
      // Save score
      await base44.entities.GameScore.create({
        player_email: user.email,
        player_name: employee?.full_name || user.full_name,
        department: employee?.department,
        mode: 'reaction',
        score: result.score,
        reaction_time_ms: result.avgReactionTime,
        duration_seconds: 30
      });

      // Update player stats
      const newConsecutive = (gamePlayer?.consecutive_plays || 0) + 1;
      const maxConsec = settings?.max_consecutive_plays || 5;
      
      const updateData = {
        tokens_left: Math.max(0, (gamePlayer?.tokens_left || 10) - 1),
        total_score: (gamePlayer?.total_score || 0) + result.score,
        games_played: (gamePlayer?.games_played || 0) + 1,
        consecutive_plays: newConsecutive,
        last_play_time: new Date().toISOString()
      };

      // Set cooldown if max consecutive reached
      if (newConsecutive >= maxConsec) {
        const cooldownMins = settings?.cooldown_minutes || 30;
        updateData.cooldown_until = new Date(Date.now() + cooldownMins * 60000).toISOString();
        updateData.consecutive_plays = 0;
        toast.info(`Cooldown activated! Take a ${cooldownMins} minute break.`);
      }

      // Update best reaction time
      if (!gamePlayer?.best_reaction_time || result.avgReactionTime < gamePlayer.best_reaction_time) {
        updateData.best_reaction_time = result.avgReactionTime;
      }

      if (gamePlayer?.id) {
        await base44.entities.GamePlayer.update(gamePlayer.id, updateData);
      }

      queryClient.invalidateQueries({ queryKey: ['gamePlayer'] });
      queryClient.invalidateQueries({ queryKey: ['gameScores'] });
      queryClient.invalidateQueries({ queryKey: ['gamePlayers'] });

      toast.success(`Score saved! +${result.score} points`);
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
      toast.error('Failed to save settings');
    }
  };

  const playStatus = canPlay();
  const tokensLeft = gamePlayer?.tokens_left ?? (settings?.tokens_per_day || 10);
  const maxTokens = settings?.tokens_per_day || 10;

  // Get user stats
  const userScores = scores.filter(s => s.player_email === user?.email);
  const todayScores = userScores.filter(s => s.created_date?.startsWith(new Date().toISOString().split('T')[0]));
  const todayPoints = todayScores.reduce((sum, s) => sum + s.score, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Gamepad2 className="w-7 h-7 text-indigo-600" />
            Office Ops Arena
          </h2>
          <p className="text-slate-500">Department vs Department mini-games</p>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={() => { setAdminSettings(settings || {}); setShowAdminDialog(true); }}>
            <Settings className="w-4 h-4 mr-2" />
            Admin Settings
          </Button>
        )}
      </div>

      {/* Disabled Banner */}
      {!settings?.game_enabled && (
        <Card className="border-0 shadow-sm bg-amber-50 border-l-4 border-l-amber-500">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <p className="text-amber-800 font-medium">Games are currently disabled by admin</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Coins className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{tokensLeft}</p>
                <p className="text-sm text-slate-500">Tokens Left</p>
              </div>
            </div>
            <Progress value={(tokensLeft / maxTokens) * 100} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Trophy className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{gamePlayer?.total_score || 0}</p>
                <p className="text-sm text-slate-500">Total Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{todayPoints}</p>
                <p className="text-sm text-slate-500">Today's Points</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {gamePlayer?.best_reaction_time ? `${gamePlayer.best_reaction_time}ms` : '-'}
                </p>
                <p className="text-sm text-slate-500">Best Reaction</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Game Modes */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">Game Modes</h3>
          
          {/* Reaction Speed Test */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-slate-800">Reaction Speed Test</h4>
                  <p className="text-slate-500 mt-1">
                    Test your reflexes! Click as fast as you can when the screen turns green.
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <Badge variant="outline" className="text-slate-500">
                      <Clock className="w-3 h-3 mr-1" /> 30 seconds
                    </Badge>
                    <Badge variant="outline" className="text-slate-500">
                      <Trophy className="w-3 h-3 mr-1" /> 5 rounds
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {playStatus.can ? (
                    <Button 
                      onClick={handleStartGame}
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Play Now
                    </Button>
                  ) : (
                    <Button disabled className="bg-slate-300">
                      <Lock className="w-4 h-4 mr-2" />
                      Locked
                    </Button>
                  )}
                  {!playStatus.can && (
                    <p className="text-xs text-red-500">{playStatus.reason}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coming Soon Games */}
          <Card className="border-0 shadow-sm opacity-60">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl">
                  <Gamepad2 className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-slate-800">Quick Puzzle</h4>
                  <p className="text-slate-500 mt-1">
                    Solve pattern matching puzzles against the clock.
                  </p>
                  <Badge className="mt-3 bg-slate-200 text-slate-600">Coming Soon</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm opacity-60">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-slate-800">Department Battle</h4>
                  <p className="text-slate-500 mt-1">
                    Challenge other departments to live PvP matches.
                  </p>
                  <Badge className="mt-3 bg-slate-200 text-slate-600">Coming Soon</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <div>
          <GameLeaderboard scores={scores} players={players} currentUserEmail={user?.email} />
        </div>
      </div>

      {/* Game Modal */}
      {showGame && (
        <ReactionGame
          onComplete={handleGameComplete}
          onCancel={() => setShowGame(false)}
        />
      )}

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
              <Label>Max Consecutive Plays (before cooldown)</Label>
              <Input
                type="number"
                value={adminSettings.max_consecutive_plays || 5}
                onChange={(e) => setAdminSettings({ ...adminSettings, max_consecutive_plays: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cooldown Duration (minutes)</Label>
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
            {adminSettings.office_hours_only && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Hour</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={adminSettings.office_start_hour || 9}
                    onChange={(e) => setAdminSettings({ ...adminSettings, office_start_hour: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Hour</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={adminSettings.office_end_hour || 18}
                    onChange={(e) => setAdminSettings({ ...adminSettings, office_end_hour: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdminDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} className="bg-indigo-600 hover:bg-indigo-700">Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}