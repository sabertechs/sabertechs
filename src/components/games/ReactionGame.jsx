import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Timer, Target, Trophy, Building2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function ReactionGame({ employee, onComplete, onCancel }) {
  const [gameState, setGameState] = useState("ready"); // ready, countdown, waiting, click, result
  const [round, setRound] = useState(0);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [tooEarly, setTooEarly] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const timeoutRef = useRef(null);
  const totalRounds = 5;

  const startCountdown = useCallback(() => {
    setGameState("countdown");
    setCountdown(3);
  }, []);

  useEffect(() => {
    if (gameState === "countdown" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === "countdown" && countdown === 0) {
      startRound();
    }
  }, [gameState, countdown]);

  const startRound = useCallback(() => {
    setGameState("waiting");
    setTooEarly(false);
    
    const delay = Math.random() * 3000 + 2000;
    timeoutRef.current = setTimeout(() => {
      setStartTime(Date.now());
      setGameState("click");
    }, delay);
  }, []);

  const handleClick = () => {
    if (gameState === "waiting") {
      clearTimeout(timeoutRef.current);
      setTooEarly(true);
      setGameState("ready");
    } else if (gameState === "click") {
      const reactionTime = Date.now() - startTime;
      setReactionTimes(prev => [...prev, reactionTime]);
      
      if (round + 1 >= totalRounds) {
        setGameState("result");
      } else {
        setRound(r => r + 1);
        setGameState("ready");
      }
    }
  };

  const calculateScore = () => {
    if (reactionTimes.length === 0) return 0;
    const avgTime = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
    const score = Math.max(100, Math.min(1000, Math.round(1200 - avgTime)));
    return score;
  };

  const handleFinish = () => {
    const avgTime = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
    const score = calculateScore();
    onComplete({ score, avgReactionTime: Math.round(avgTime), rounds: totalRounds });
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const avgReactionTime = reactionTimes.length > 0 
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 0;

  return (
    <div 
      className="min-h-[80vh] flex flex-col items-center justify-center p-4"
    >
      <div 
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1e3a5f 0%, #0d1f3c 100%)'
        }}
      >
        {/* City Skyline Background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200'%3E%3Crect fill='%231a365d' x='20' y='80' width='30' height='120'/%3E%3Crect fill='%231a365d' x='60' y='60' width='25' height='140'/%3E%3Crect fill='%231a365d' x='95' y='90' width='35' height='110'/%3E%3Crect fill='%231a365d' x='140' y='50' width='40' height='150'/%3E%3Crect fill='%231a365d' x='190' y='70' width='30' height='130'/%3E%3Crect fill='%231a365d' x='230' y='100' width='25' height='100'/%3E%3Crect fill='%231a365d' x='265' y='55' width='35' height='145'/%3E%3Crect fill='%231a365d' x='310' y='75' width='30' height='125'/%3E%3Crect fill='%231a365d' x='350' y='85' width='30' height='115'/%3E%3C/svg%3E")`,
            backgroundPosition: 'bottom',
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'cover'
          }}
        />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-yellow-500" />
            <span className="text-white font-semibold uppercase text-sm">Department</span>
          </div>
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-slate-700/80 rounded-lg text-white text-sm font-semibold hover:bg-slate-600/80 transition-colors"
          >
            EXIT
          </button>
        </div>

        {/* Player Display */}
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-center gap-6 mb-6">
            {/* Player Avatar */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-white/30 shadow-lg mx-auto mb-2 bg-slate-700">
                {employee?.profile_photo ? (
                  <img 
                    src={employee.profile_photo} 
                    alt={employee.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500 to-orange-500">
                    <span className="text-2xl font-bold text-white">
                      {employee?.full_name?.[0] || '?'}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-white/80 text-xs uppercase font-semibold">
                {employee?.department || 'Player'}
              </span>
            </div>

            {/* VS */}
            <div className="text-white/40 text-2xl font-bold">V</div>

            {/* Opponent (CPU/Timer) */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-white/30 shadow-lg mx-auto mb-2 bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                <Timer className="w-10 h-10 text-white/60" />
              </div>
              <span className="text-white/80 text-xs uppercase font-semibold">Timer</span>
            </div>
          </div>

          {/* Round Counter */}
          <div className="text-center mb-6">
            <span className="text-6xl font-black text-yellow-500">
              {Math.min(round + 1, totalRounds)}
            </span>
            <p className="text-white/60 uppercase text-sm font-semibold tracking-wider">
              Round of {totalRounds}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <Progress value={(round / totalRounds) * 100} className="h-3 bg-slate-700" />
          </div>

          {/* Game Area */}
          <AnimatePresence mode="wait">
            {gameState === "ready" && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center py-8"
              >
                {tooEarly ? (
                  <>
                    <div className="text-6xl mb-4">⚡</div>
                    <p className="text-white text-xl font-bold mb-2">Too Early!</p>
                    <p className="text-white/60 mb-6">Wait for GREEN</p>
                  </>
                ) : (
                  <>
                    <Target className="w-16 h-16 text-white/40 mx-auto mb-4" />
                    <p className="text-white text-xl font-bold mb-2">Get Ready</p>
                    <p className="text-white/60 mb-6">Tap when screen turns green</p>
                  </>
                )}
                <button
                  onClick={startCountdown}
                  className="w-48 py-4 bg-gradient-to-r from-green-500 to-green-600 rounded-full text-white font-bold text-lg uppercase shadow-lg shadow-green-500/30 hover:from-green-400 hover:to-green-500 transition-all"
                >
                  START
                </button>
              </motion.div>
            )}

            {gameState === "countdown" && (
              <motion.div
                key="countdown"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-16"
              >
                <span className="text-8xl font-black text-white">{countdown}</span>
              </motion.div>
            )}

            {gameState === "waiting" && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClick}
                className="cursor-pointer"
              >
                <div className="bg-red-500 rounded-2xl p-16 text-center">
                  <Timer className="w-20 h-20 text-white mx-auto mb-4 animate-pulse" />
                  <p className="text-white text-2xl font-bold">WAIT...</p>
                  <p className="text-white/80 mt-2">Don't tap yet!</p>
                </div>
              </motion.div>
            )}

            {gameState === "click" && (
              <motion.div
                key="click"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClick}
                className="cursor-pointer"
              >
                <div className="bg-green-500 rounded-2xl p-16 text-center">
                  <Zap className="w-24 h-24 text-white mx-auto mb-4" />
                  <p className="text-white text-3xl font-black">TAP NOW!</p>
                </div>
              </motion.div>
            )}

            {gameState === "result" && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                <p className="text-white text-2xl font-bold mb-2">Complete!</p>
                <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
                  <p className="text-white/60 text-sm">Average Time</p>
                  <p className="text-4xl font-bold text-white">{avgReactionTime}ms</p>
                  <p className="text-yellow-400 text-lg font-semibold mt-2">
                    {calculateScore()} points
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={onCancel}
                    className="px-6 py-3 border border-white/20 rounded-full text-white font-semibold hover:bg-white/10 transition-colors"
                  >
                    Exit
                  </button>
                  <button
                    onClick={handleFinish}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full text-white font-bold shadow-lg hover:from-orange-400 hover:to-orange-500 transition-all"
                  >
                    Save Score
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reaction Times Display */}
          {reactionTimes.length > 0 && gameState !== "result" && (
            <div className="mt-6 flex justify-center gap-2 flex-wrap">
              {reactionTimes.map((time, idx) => (
                <div key={idx} className="bg-slate-700/60 px-3 py-1 rounded-full text-white text-sm">
                  R{idx + 1}: {time}ms
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}