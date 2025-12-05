// Department Visual Identity System

export const DEPARTMENT_THEMES = {
  hr: {
    name: 'HR',
    class: 'Guardian',
    color: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-500',
    textColor: 'text-pink-400',
    icon: '🛡️',
    description: 'Protectors of People',
    traits: ['Empathy', 'Care', 'Balance']
  },
  finance: {
    name: 'Finance',
    class: 'Analyst',
    color: 'from-emerald-500 to-green-600',
    bgColor: 'bg-emerald-500',
    textColor: 'text-emerald-400',
    icon: '📊',
    description: 'Masters of Numbers',
    traits: ['Precision', 'Strategy', 'Foresight']
  },
  sales: {
    name: 'Sales',
    class: 'Striker',
    color: 'from-orange-500 to-amber-600',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-400',
    icon: '⚡',
    description: 'Lightning Fast Closers',
    traits: ['Speed', 'Energy', 'Charisma']
  },
  it: {
    name: 'IT',
    class: 'Tech Wizard',
    color: 'from-blue-500 to-cyan-600',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-400',
    icon: '🧙‍♂️',
    description: 'Digital Sorcerers',
    traits: ['Logic', 'Innovation', 'Problem Solving']
  },
  admin: {
    name: 'Admin',
    class: 'Protector',
    color: 'from-slate-500 to-slate-600',
    bgColor: 'bg-slate-500',
    textColor: 'text-slate-400',
    icon: '🏰',
    description: 'Fortress Keepers',
    traits: ['Organization', 'Reliability', 'Support']
  },
  operations: {
    name: 'Operations',
    class: 'Engineer',
    color: 'from-amber-500 to-yellow-600',
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-400',
    icon: '⚙️',
    description: 'Master Builders',
    traits: ['Efficiency', 'Systems', 'Execution']
  },
  marketing: {
    name: 'Marketing',
    class: 'Storyteller',
    color: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-400',
    icon: '✨',
    description: 'Brand Wizards',
    traits: ['Creativity', 'Vision', 'Impact']
  },
  quality_analyst: {
    name: 'QA',
    class: 'Inspector',
    color: 'from-teal-500 to-cyan-600',
    bgColor: 'bg-teal-500',
    textColor: 'text-teal-400',
    icon: '🔍',
    description: 'Quality Guardians',
    traits: ['Attention', 'Detail', 'Standards']
  },
  mettl: {
    name: 'Mettl',
    class: 'Assessor',
    color: 'from-indigo-500 to-blue-600',
    bgColor: 'bg-indigo-500',
    textColor: 'text-indigo-400',
    icon: '📝',
    description: 'Skill Evaluators',
    traits: ['Analysis', 'Fairness', 'Insight']
  },
  mettl_operations: {
    name: 'Mettl Ops',
    class: 'Coordinator',
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-500',
    textColor: 'text-violet-400',
    icon: '🎯',
    description: 'Operations Masters',
    traits: ['Coordination', 'Timing', 'Flow']
  },
  proctoring: {
    name: 'Proctoring',
    class: 'Sentinel',
    color: 'from-red-500 to-rose-600',
    bgColor: 'bg-red-500',
    textColor: 'text-red-400',
    icon: '👁️',
    description: 'Watchful Guardians',
    traits: ['Vigilance', 'Integrity', 'Focus']
  },
  cashifty: {
    name: 'Cashifty',
    class: 'Treasurer',
    color: 'from-yellow-500 to-amber-600',
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-400',
    icon: '💰',
    description: 'Cash Flow Masters',
    traits: ['Accuracy', 'Speed', 'Trust']
  },
  default: {
    name: 'Team',
    class: 'Player',
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-500',
    textColor: 'text-gray-400',
    icon: '🎮',
    description: 'Arena Champion',
    traits: ['Skill', 'Spirit', 'Growth']
  }
};

export const BADGES = [
  { id: 'first_win', name: 'First Victory', icon: '🏆', desc: 'Win your first game', requirement: { games: 1 } },
  { id: 'streak_3', name: 'Hot Streak', icon: '🔥', desc: '3 games in a row', requirement: { streak: 3 } },
  { id: 'score_1000', name: 'Point Master', icon: '⭐', desc: 'Score 1000+ in one game', requirement: { score: 1000 } },
  { id: 'games_10', name: 'Regular', icon: '🎯', desc: 'Play 10 games', requirement: { totalGames: 10 } },
  { id: 'games_50', name: 'Dedicated', icon: '💎', desc: 'Play 50 games', requirement: { totalGames: 50 } },
  { id: 'games_100', name: 'Legend', icon: '👑', desc: 'Play 100 games', requirement: { totalGames: 100 } },
  { id: 'reaction_200', name: 'Lightning', icon: '⚡', desc: 'Under 200ms reaction', requirement: { reactionTime: 200 } },
  { id: 'all_games', name: 'All-Rounder', icon: '🌟', desc: 'Play all game types', requirement: { allGames: true } },
  { id: 'dept_champ', name: 'Dept Champion', icon: '🏅', desc: 'Top scorer in department', requirement: { deptTop: true } },
  { id: 'weekly_top', name: 'Weekly Star', icon: '🌠', desc: 'Top 3 weekly', requirement: { weeklyTop3: true } },
];

export const FRAMES = [
  { id: 'default', name: 'Standard', style: 'border-4 border-white/30', requirement: null },
  { id: 'bronze', name: 'Bronze', style: 'border-4 border-amber-600', requirement: { totalScore: 1000 } },
  { id: 'silver', name: 'Silver', style: 'border-4 border-slate-300', requirement: { totalScore: 5000 } },
  { id: 'gold', name: 'Gold', style: 'border-4 border-yellow-400', requirement: { totalScore: 10000 } },
  { id: 'platinum', name: 'Platinum', style: 'border-4 border-cyan-400 shadow-lg shadow-cyan-400/50', requirement: { totalScore: 25000 } },
  { id: 'diamond', name: 'Diamond', style: 'border-4 border-blue-400 shadow-lg shadow-blue-400/50 animate-pulse', requirement: { totalScore: 50000 } },
];

export const TITLES = [
  { id: 'rookie', name: 'Rookie', requirement: null },
  { id: 'player', name: 'Player', requirement: { totalGames: 5 } },
  { id: 'competitor', name: 'Competitor', requirement: { totalGames: 20 } },
  { id: 'veteran', name: 'Veteran', requirement: { totalGames: 50 } },
  { id: 'elite', name: 'Elite', requirement: { totalGames: 100 } },
  { id: 'champion', name: 'Champion', requirement: { totalScore: 20000 } },
  { id: 'legend', name: 'Legend', requirement: { totalScore: 50000 } },
  { id: 'speed_demon', name: 'Speed Demon', requirement: { reactionTime: 180 } },
  { id: 'dept_hero', name: 'Dept Hero', requirement: { deptTop: true } },
];

export const EMOTES = [
  { id: 'gg', name: 'GG', emoji: '👏' },
  { id: 'nice', name: 'Nice!', emoji: '🔥' },
  { id: 'wow', name: 'Wow', emoji: '😮' },
  { id: 'lol', name: 'LOL', emoji: '😂' },
  { id: 'flex', name: 'Flex', emoji: '💪' },
  { id: 'think', name: 'Hmm', emoji: '🤔' },
];

export const getDepartmentTheme = (department) => {
  if (!department) return DEPARTMENT_THEMES.default;
  const key = department.toLowerCase().replace(/\s+/g, '_');
  return DEPARTMENT_THEMES[key] || DEPARTMENT_THEMES.default;
};

export const getPlayerTitle = (player) => {
  if (!player) return TITLES[0];
  const validTitles = TITLES.filter(t => {
    if (!t.requirement) return true;
    if (t.requirement.totalGames && (player.games_played || 0) < t.requirement.totalGames) return false;
    if (t.requirement.totalScore && (player.total_score || 0) < t.requirement.totalScore) return false;
    if (t.requirement.reactionTime && (player.best_reaction_time || 999) > t.requirement.reactionTime) return false;
    return true;
  });
  return validTitles[validTitles.length - 1] || TITLES[0];
};

export const getPlayerFrame = (player) => {
  if (!player) return FRAMES[0];
  const validFrames = FRAMES.filter(f => {
    if (!f.requirement) return true;
    if (f.requirement.totalScore && (player.total_score || 0) < f.requirement.totalScore) return false;
    return true;
  });
  return validFrames[validFrames.length - 1] || FRAMES[0];
};

export const getEarnedBadges = (player) => {
  if (!player) return [];
  return BADGES.filter(b => {
    if (!b.requirement) return true;
    if (b.requirement.games && (player.games_played || 0) < b.requirement.games) return false;
    if (b.requirement.totalGames && (player.games_played || 0) < b.requirement.totalGames) return false;
    if (b.requirement.score && (player.best_score || 0) < b.requirement.score) return false;
    if (b.requirement.reactionTime && (player.best_reaction_time || 999) > b.requirement.reactionTime) return false;
    return true;
  });
};