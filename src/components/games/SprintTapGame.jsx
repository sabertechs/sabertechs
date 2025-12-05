import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Flame, Trophy, Timer, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function SprintTapGame({ employee, onComplete, onCancel }) {
  const [gameState, setGameState] = useState("ready");
  const [energy, setEnergy] = useState(0);
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const lastTapRef = useRef(0);

  useEffect(() => {
    if (gameState !== "playing") return;
    if (timeLeft <= 0) {
      setGameState("result");
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  // Energy decay
  useEffect(() => {
    if (gameState !== "playing") return;
    const decay = setInterval(() => {
      setEnergy(e => Math.max(0, e - 2));
    }, 100);
    return () => clearInterval(decay);
  }, [gameState]);

  const startGame = () => {
    setGameState("playing");
    setEnergy(0);
    setTaps(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(15);
    lastTapRef.current = Date.now();
  };

  const handleTap = () => {
    if (gameState !== "playing") return;
    
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    setTaps(t => t + 1);
    
    // Combo system
    if (timeSinceLastTap < 300) {
      setCombo(c => {
        const newCombo = c + 1;
        setMaxCombo(m => Math.max(m, newCombo));
        return newCombo;
      });
    } else {
      setCombo(1);
    }

    // Energy increases more with combo
    const comboMultiplier = 1 + Math.min(combo, 10) * 0.1;
    setEnergy(e => Math.min(100, e + 5 * comboMultiplier));
  };

  const calculateScore = () => {
    const baseScore = taps * 10;
    const comboBonus = maxCombo * 20;
    const energyBonus = Math.round(energy * 2);
    return baseScore + comboBonus + energyBonus;
  };

  const handleFinish = () => {
    const score = calculateScore();
    onComplete({ score, avgReactionTime: Math.round(15000 / Math.max(1, taps)), rounds: taps });
  };

  const getEnergyColor = () => {
    if (energy >= 80) return 'from-yellow-400 to-orange-500';
    if (energy >= 50) return 'from-green-400 to-green-500';
    return 'from-blue-400 to-blue-500';
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div 
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #0d1f3c 100%)' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="text-white font-semibold">Sprint Tap</span>
          </div>
          <button onClick={onCancel} className="px-4 py-2 bg-slate-700/80 rounded-lg text-white text-sm font-semibold">
            EXIT
          </button>
        </div>

        <div className="p-4">
          {gameState === "ready" && (
            <div className="text-center py-12">
              <Flame className="w-20 h-20 text-orange-400 mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">Sprint Tap</h2>
              <p className="text-white/60 mb-6">Tap as fast as you can to fill the energy bar!</p>
              <button
                onClick={startGame}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-white font-bold text-lg"
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
                  <span className={`font-bold ${timeLeft <= 5 ? 'text-red-400' : ''}`}>{timeLeft}s</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-bold">x{combo}</span>
                </div>
                <div className="text-white font-bold">{taps} taps</div>
              </div>

              {/* Energy Bar */}
              <div className="mb-6">
                <div className="h-8 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${getEnergyColor()} rounded-full`}
                    animate={{ width: `${energy}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-white/40 text-xs">0%</span>
                  <span className="text-white/60 text-sm font-bold">{Math.round(energy)}%</span>
                  <span className="text-white/40 text-xs">100%</span>
                </div>
              </div>

              {/* Tap Area */}
              <motion.button
                onClick={handleTap}
                className={`w-full h-64 rounded-2xl flex flex-col items-center justify-center transition-colors ${
                  energy >= 80 ? 'bg-gradient-to-br from-yellow-500 to-orange-600' :
                  energy >= 50 ? 'bg-gradient-to-br from-green-500 to-green-600' :
                  'bg-gradient-to-br from-indigo-500 to-indigo-600'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <Flame className={`w-24 h-24 text-white mb-2 ${energy >= 80 ? 'animate-pulse' : ''}`} />
                <span className="text-white text-2xl font-bold">TAP!</span>
                {combo > 3 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-white/80 text-sm mt-2"
                  >
                    🔥 COMBO x{combo}!
                  </motion.span>
                )}
              </motion.button>
            </>
          )}

          {gameState === "result" && (
            <div className="text-center py-8">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">Sprint Complete!</h2>
              <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-white/60 text-xs">Total Taps</p>
                    <p className="text-xl font-bold text-white">{taps}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">Max Combo</p>
                    <p className="text-xl font-bold text-orange-400">x{maxCombo}</p>
                  </div>
                </div>
                <p className="text-yellow-400 font-bold text-2xl">{calculateScore()} points</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={onCancel} className="px-6 py-3 border border-white/20 rounded-full text-white">Exit</button>
                <button onClick={handleFinish} className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-white font-bold">
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