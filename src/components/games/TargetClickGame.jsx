import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Trophy, Timer } from "lucide-react";

export default function TargetClickGame({ employee, onComplete, onCancel }) {
  const [gameState, setGameState] = useState("ready");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [target, setTarget] = useState(null);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const gameAreaRef = useRef(null);

  const spawnTarget = useCallback(() => {
    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const size = 40 + Math.random() * 30; // 40-70px
    const x = Math.random() * (rect.width - size);
    const y = Math.random() * (rect.height - size);
    const points = Math.round(100 - size + 40); // Smaller = more points
    
    setTarget({ x, y, size, points, id: Date.now() });
  }, []);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setHits(0);
    setMisses(0);
    setTimeLeft(30);
    setTimeout(spawnTarget, 500);
  };

  useEffect(() => {
    if (gameState !== "playing") return;
    if (timeLeft <= 0) {
      setGameState("result");
      setTarget(null);
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  useEffect(() => {
    if (gameState !== "playing" || !target) return;
    const timeout = setTimeout(() => {
      setMisses(m => m + 1);
      spawnTarget();
    }, 2000); // Target disappears after 2s
    return () => clearTimeout(timeout);
  }, [target, gameState, spawnTarget]);

  const handleTargetClick = (e) => {
    e.stopPropagation();
    if (!target) return;
    setScore(s => s + target.points);
    setHits(h => h + 1);
    setTarget(null);
    setTimeout(spawnTarget, 200);
  };

  const handleMiss = () => {
    if (gameState !== "playing") return;
    setMisses(m => m + 1);
  };

  const calculateFinalScore = () => {
    const accuracy = hits / Math.max(1, hits + misses);
    const accuracyBonus = Math.round(accuracy * 200);
    return score + accuracyBonus;
  };

  const handleFinish = () => {
    const finalScore = calculateFinalScore();
    const accuracy = Math.round((hits / Math.max(1, hits + misses)) * 100);
    onComplete({ score: finalScore, avgReactionTime: accuracy, rounds: hits });
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div 
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #0d1f3c 100%)' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-red-400" />
            <span className="text-white font-semibold">Target Click</span>
          </div>
          <button onClick={onCancel} className="px-4 py-2 bg-slate-700/80 rounded-lg text-white text-sm font-semibold">
            EXIT
          </button>
        </div>

        <div className="p-4">
          {gameState === "ready" && (
            <div className="text-center py-12">
              <Target className="w-20 h-20 text-red-400 mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">Target Click</h2>
              <p className="text-white/60 mb-6">Click targets as fast as you can! Smaller = more points.</p>
              <button
                onClick={startGame}
                className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 rounded-full text-white font-bold text-lg"
              >
                START GAME
              </button>
            </div>
          )}

          {gameState === "playing" && (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-white">
                  <Timer className="w-4 h-4" />
                  <span className={`font-bold ${timeLeft <= 10 ? 'text-red-400' : ''}`}>{timeLeft}s</span>
                </div>
                <div className="text-yellow-500 font-bold text-xl">{score}</div>
                <div className="text-white/60 text-sm">Hits: {hits}</div>
              </div>

              <div 
                ref={gameAreaRef}
                onClick={handleMiss}
                className="relative h-80 bg-slate-800/50 rounded-2xl overflow-hidden cursor-crosshair"
              >
                <AnimatePresence>
                  {target && (
                    <motion.div
                      key={target.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={handleTargetClick}
                      className="absolute rounded-full bg-gradient-to-br from-red-400 to-red-600 cursor-pointer flex items-center justify-center shadow-lg shadow-red-500/30"
                      style={{
                        left: target.x,
                        top: target.y,
                        width: target.size,
                        height: target.size,
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Target className="w-1/2 h-1/2 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {gameState === "result" && (
            <div className="text-center py-8">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">Great Aim!</h2>
              <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-white/60 text-xs">Hits</p>
                    <p className="text-xl font-bold text-green-400">{hits}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">Accuracy</p>
                    <p className="text-xl font-bold text-white">
                      {Math.round((hits / Math.max(1, hits + misses)) * 100)}%
                    </p>
                  </div>
                </div>
                <p className="text-yellow-400 font-bold text-2xl">{calculateFinalScore()} points</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={onCancel} className="px-6 py-3 border border-white/20 rounded-full text-white">Exit</button>
                <button onClick={handleFinish} className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 rounded-full text-white font-bold">
                  Save Score
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}