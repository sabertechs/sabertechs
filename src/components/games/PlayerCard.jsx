import React from "react";
import { motion } from "framer-motion";
import { getDepartmentTheme, getPlayerTitle, getPlayerFrame, getEarnedBadges } from "./DepartmentThemes";

export default function PlayerCard({ employee, gamePlayer, size = "large", showBadges = true }) {
  const theme = getDepartmentTheme(employee?.department);
  const title = getPlayerTitle(gamePlayer);
  const frame = getPlayerFrame(gamePlayer);
  const badges = getEarnedBadges(gamePlayer);

  const isLarge = size === "large";
  const avatarSize = isLarge ? "w-32 h-32" : "w-16 h-16";
  const iconSize = isLarge ? "text-4xl" : "text-xl";

  return (
    <div className="flex flex-col items-center">
      {/* Avatar with Frame & Class Icon */}
      <div className="relative">
        {/* Department Aura */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${theme.color} opacity-30 blur-xl scale-110`} />
        
        {/* Avatar */}
        <div className={`relative ${avatarSize} rounded-full overflow-hidden ${frame.style} shadow-xl bg-slate-700`}>
          {employee?.profile_photo ? (
            <img src={employee.profile_photo} alt={employee.full_name} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${theme.color}`}>
              <span className={`font-bold text-white ${isLarge ? 'text-4xl' : 'text-xl'}`}>
                {employee?.full_name?.[0] || '?'}
              </span>
            </div>
          )}
        </div>

        {/* Class Icon Badge */}
        <div className={`absolute -bottom-1 -right-1 ${isLarge ? 'w-10 h-10' : 'w-6 h-6'} rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center`}>
          <span className={iconSize}>{theme.icon}</span>
        </div>

        {/* Level/Games Badge */}
        {isLarge && (
          <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${theme.bgColor} px-3 py-1 rounded-full`}>
            <span className="text-white text-xs font-bold">{gamePlayer?.games_played || 0} Games</span>
          </div>
        )}
      </div>

      {/* Player Info */}
      <div className="text-center mt-4">
        <p className="text-white font-bold text-lg">{employee?.full_name || 'Player'}</p>
        
        {/* Title */}
        <p className={`text-sm font-semibold ${theme.textColor}`}>
          {title.name} • {theme.class}
        </p>
        
        {/* Department */}
        <p className="text-white/50 text-xs uppercase tracking-wider mt-1">
          {theme.name} Department
        </p>
      </div>

      {/* Traits */}
      {isLarge && (
        <div className="flex gap-2 mt-3">
          {theme.traits.map((trait, idx) => (
            <span key={idx} className="px-2 py-1 bg-white/10 rounded-full text-white/70 text-xs">
              {trait}
            </span>
          ))}
        </div>
      )}

      {/* Badges */}
      {showBadges && badges.length > 0 && (
        <div className="flex gap-1 mt-3 flex-wrap justify-center">
          {badges.slice(0, isLarge ? 6 : 3).map((badge) => (
            <motion.div
              key={badge.id}
              title={`${badge.name}: ${badge.desc}`}
              className="w-8 h-8 rounded-full bg-slate-700/80 flex items-center justify-center cursor-help"
              whileHover={{ scale: 1.2 }}
            >
              <span className="text-sm">{badge.icon}</span>
            </motion.div>
          ))}
          {badges.length > (isLarge ? 6 : 3) && (
            <div className="w-8 h-8 rounded-full bg-slate-700/80 flex items-center justify-center text-white/60 text-xs">
              +{badges.length - (isLarge ? 6 : 3)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}