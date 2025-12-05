import React from "react";
import { Trophy, Medal, ArrowLeft, Building2, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { getDepartmentTheme, getPlayerFrame } from "./DepartmentThemes";

export default function GameLeaderboard({ scores, players, currentUserEmail, onBack }) {
  // Fetch all employees to get profile photos
  const { data: employees = [] } = useQuery({
    queryKey: ['employeesForLeaderboard'],
    queryFn: () => base44.entities.Employee.list()
  });

  const getEmployeePhoto = (email) => {
    const emp = employees.find(e => e.email === email);
    return emp?.profile_photo;
  };

  const getEmployeeDept = (email) => {
    const emp = employees.find(e => e.email === email);
    return emp?.department;
  };

  // Get today's scores
  const today = new Date().toISOString().split('T')[0];
  const todayScores = scores.filter(s => s.created_date?.startsWith(today));
  
  // Get this week's scores
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekScores = scores.filter(s => new Date(s.created_date) >= weekAgo);

  // Aggregate by player
  const aggregateScores = (scoreList) => {
    const playerScores = {};
    scoreList.forEach(s => {
      if (!playerScores[s.player_email]) {
        playerScores[s.player_email] = {
          email: s.player_email,
          name: s.player_name,
          department: s.department || getEmployeeDept(s.player_email),
          totalScore: 0,
          gamesPlayed: 0,
          bestReaction: Infinity
        };
      }
      playerScores[s.player_email].totalScore += s.score;
      playerScores[s.player_email].gamesPlayed += 1;
      if (s.reaction_time_ms && s.reaction_time_ms < playerScores[s.player_email].bestReaction) {
        playerScores[s.player_email].bestReaction = s.reaction_time_ms;
      }
    });
    return Object.values(playerScores).sort((a, b) => b.totalScore - a.totalScore);
  };

  // Aggregate by department
  const aggregateDeptScores = (scoreList) => {
    const deptScores = {};
    scoreList.forEach(s => {
      const dept = s.department || getEmployeeDept(s.player_email);
      if (!dept) return;
      if (!deptScores[dept]) {
        deptScores[dept] = { department: dept, totalScore: 0, players: new Set() };
      }
      deptScores[dept].totalScore += s.score;
      deptScores[dept].players.add(s.player_email);
    });
    return Object.values(deptScores)
      .map(d => ({ ...d, playerCount: d.players.size }))
      .sort((a, b) => b.totalScore - a.totalScore);
  };

  const dailyLeaderboard = aggregateScores(todayScores);
  const weeklyLeaderboard = aggregateScores(weekScores);
  const deptLeaderboard = aggregateDeptScores(weekScores);

  const getRankBadge = (rank) => {
    if (rank === 0) return (
      <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
        <Trophy className="w-4 h-4 text-yellow-900" />
      </div>
    );
    if (rank === 1) return (
      <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center">
        <Medal className="w-4 h-4 text-slate-700" />
      </div>
    );
    if (rank === 2) return (
      <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center">
        <Medal className="w-4 h-4 text-amber-100" />
      </div>
    );
    return (
      <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
        <span className="text-white text-sm font-bold">{rank + 1}</span>
      </div>
    );
  };

  const PlayerRow = ({ player, rank }) => {
    const photo = getEmployeePhoto(player.email);
    const isCurrentUser = player.email === currentUserEmail;
    const theme = getDepartmentTheme(player.department);
    
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl ${isCurrentUser ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-slate-700/50'}`}>
        {getRankBadge(rank)}
        <div className="relative">
          <div className={`w-10 h-10 rounded-full overflow-hidden bg-slate-600 flex-shrink-0 border-2 ${theme.textColor.replace('text-', 'border-')}`}>
            {photo ? (
              <img src={photo} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${theme.color}`}>
                <span className="text-white font-bold">{player.name?.[0] || '?'}</span>
              </div>
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 text-xs">{theme.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{player.name}</p>
          <p className={`text-xs ${theme.textColor}`}>{theme.class} • {theme.name}</p>
        </div>
        <div className="text-right">
          <p className="text-yellow-500 font-bold">{player.totalScore.toLocaleString()}</p>
          <p className="text-white/50 text-xs">{player.gamesPlayed} games</p>
        </div>
      </div>
    );
  };

  const DeptRow = ({ dept, rank }) => {
    const theme = getDepartmentTheme(dept.department);
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/50">
        {getRankBadge(rank)}
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${theme.color} flex items-center justify-center flex-shrink-0`}>
          <span className="text-xl">{theme.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold capitalize">{theme.name}</p>
          <p className={`text-xs ${theme.textColor}`}>{theme.class} Class • {dept.playerCount} players</p>
        </div>
        <div className="text-right">
          <p className="text-yellow-500 font-bold">{dept.totalScore.toLocaleString()}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-start p-4">
      <div 
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1e3a5f 0%, #0d1f3c 100%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-white font-bold uppercase">Leaderboard</span>
          </div>
          <div className="w-9" />
        </div>

        {/* Tabs */}
        <div className="p-4">
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-700/50 p-1 rounded-xl mb-4">
              <TabsTrigger value="daily" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg text-white/60">
                Today
              </TabsTrigger>
              <TabsTrigger value="weekly" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg text-white/60">
                Week
              </TabsTrigger>
              <TabsTrigger value="department" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg text-white/60">
                Dept
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-2 mt-0">
              {dailyLeaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50">No games played today</p>
                </div>
              ) : (
                dailyLeaderboard.slice(0, 10).map((player, idx) => (
                  <PlayerRow key={player.email} player={player} rank={idx} />
                ))
              )}
            </TabsContent>

            <TabsContent value="weekly" className="space-y-2 mt-0">
              {weeklyLeaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50">No games this week</p>
                </div>
              ) : (
                weeklyLeaderboard.slice(0, 10).map((player, idx) => (
                  <PlayerRow key={player.email} player={player} rank={idx} />
                ))
              )}
            </TabsContent>

            <TabsContent value="department" className="space-y-2 mt-0">
              {deptLeaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50">No department scores</p>
                </div>
              ) : (
                deptLeaderboard.slice(0, 10).map((dept, idx) => (
                  <DeptRow key={dept.department} dept={dept} rank={idx} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}