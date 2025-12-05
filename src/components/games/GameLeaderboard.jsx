import React from "react";
import { Trophy, Medal, Zap, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function GameLeaderboard({ scores, players, currentUserEmail }) {
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
          department: s.department,
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
      if (!s.department) return;
      if (!deptScores[s.department]) {
        deptScores[s.department] = { department: s.department, totalScore: 0, players: new Set() };
      }
      deptScores[s.department].totalScore += s.score;
      deptScores[s.department].players.add(s.player_email);
    });
    return Object.values(deptScores)
      .map(d => ({ ...d, playerCount: d.players.size }))
      .sort((a, b) => b.totalScore - a.totalScore);
  };

  const dailyLeaderboard = aggregateScores(todayScores);
  const weeklyLeaderboard = aggregateScores(weekScores);
  const deptLeaderboard = aggregateDeptScores(weekScores);

  const getRankIcon = (rank) => {
    if (rank === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 1) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 text-center text-slate-500 text-sm font-bold">{rank + 1}</span>;
  };

  const LeaderboardList = ({ data, showDept = true }) => (
    <div className="space-y-2">
      {data.length === 0 ? (
        <p className="text-center text-slate-500 py-8">No games played yet</p>
      ) : (
        data.slice(0, 10).map((player, idx) => (
          <div
            key={player.email}
            className={`flex items-center gap-3 p-3 rounded-xl ${
              player.email === currentUserEmail ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-50'
            }`}
          >
            <div className="w-8 flex justify-center">{getRankIcon(idx)}</div>
            <div className="flex-1">
              <p className="font-medium text-slate-800">{player.name}</p>
              {showDept && player.department && (
                <p className="text-xs text-slate-500 capitalize">{player.department}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold text-indigo-600">{player.totalScore.toLocaleString()}</p>
              <p className="text-xs text-slate-500">{player.gamesPlayed} games</p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const DeptLeaderboardList = ({ data }) => (
    <div className="space-y-2">
      {data.length === 0 ? (
        <p className="text-center text-slate-500 py-8">No department scores yet</p>
      ) : (
        data.slice(0, 10).map((dept, idx) => (
          <div key={dept.department} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className="w-8 flex justify-center">{getRankIcon(idx)}</div>
            <div className="flex-1">
              <p className="font-medium text-slate-800 capitalize">{dept.department}</p>
              <p className="text-xs text-slate-500">{dept.playerCount} players</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-indigo-600">{dept.totalScore.toLocaleString()}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="daily">Today</TabsTrigger>
            <TabsTrigger value="weekly">This Week</TabsTrigger>
            <TabsTrigger value="department">Departments</TabsTrigger>
          </TabsList>
          <TabsContent value="daily">
            <LeaderboardList data={dailyLeaderboard} />
          </TabsContent>
          <TabsContent value="weekly">
            <LeaderboardList data={weeklyLeaderboard} />
          </TabsContent>
          <TabsContent value="department">
            <DeptLeaderboardList data={deptLeaderboard} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}