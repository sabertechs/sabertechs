import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Timer, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReactionGame({ onComplete, onCancel }) {
  const [gameState, setGameState] = useState("ready"); // ready, waiting, click, result
  const [round, setRound] = useState(0);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [tooEarly, setTooEarly] = useState(false);
  const timeoutRef = useRef(null);
  const totalRounds = 5;

  const startRound = useCallback(() => {
    setGameState("waiting");
    setTooEarly(false);
    
    const delay = Math.random() * 3000 + 2000; // 2-5 seconds
    timeoutRef.current = setTimeout(() => {
      setStartTime(Date.now());
      setGameState("click");
    }, delay);
  }, []);

  const handleClick = () => {
    if (gameState === "waiting") {
      // Clicked too early
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
    // Score: faster = higher (max 1000 for <200ms, min 100 for >800ms)
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

  return (
    <div className="fixed inset-0 bg-slate-900/95 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-white">
            <Zap className="w-6 h-6 text-yellow-400" />
            <span className="text-xl font-bold">Reaction Test</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-white/80">
              Round {Math.min(round + 1, totalRounds)}/{totalRounds}
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-white/60 hover:text-white">
              Exit
            </Button>
          </div>
        </div>

        {/* Game Area */}
        <motion.div
          className={`
            aspect-square rounded-3xl flex flex-col items-center justify-center cursor-pointer select-none
            transition-colors duration-200
            ${gameState === "ready" ? "bg-slate-700" : ""}
            ${gameState === "waiting" ? "bg-red-500" : ""}
            ${gameState === "click" ? "bg-green-500" : ""}
            ${gameState === "result" ? "bg-indigo-600" : ""}
          `}
          onClick={gameState !== "result" && gameState !== "ready" ? handleClick : undefined}
          whileTap={{ scale: 0.98 }}
        >
          <AnimatePresence mode="wait">
            {gameState === "ready" && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                {tooEarly ? (
                  <>
                    <div className="text-6xl mb-4">😅</div>
                    <p className="text-white text-xl font-bold mb-2">Too Early!</p>
                    <p className="text-white/60 mb-6">Wait for the green screen</p>
                  </>
                ) : (
                  <>
                    <Target className="w-16 h-16 text-white/60 mx-auto mb-4" />
                    <p className="text-white text-xl font-bold mb-2">Get Ready!</p>
                    <p className="text-white/60 mb-6">Click when the screen turns green</p>
                  </>
                )}
                <Button onClick={startRound} className="bg-white text-slate-900 hover:bg-white/90">
                  Start Round
                </Button>
              </motion.div>
            )}

            {gameState === "waiting" && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <Timer className="w-20 h-20 text-white mx-auto mb-4 animate-pulse" />
                <p className="text-white text-2xl font-bold">Wait...</p>
                <p className="text-white/80 mt-2">Don't click yet!</p>
              </motion.div>
            )}

            {gameState === "click" && (
              <motion.div
                key="click"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <Zap className="w-24 h-24 text-white mx-auto mb-4" />
                <p className="text-white text-3xl font-bold">CLICK NOW!</p>
              </motion.div>
            )}

            {gameState === "result" && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                <p className="text-white text-2xl font-bold mb-2">Game Complete!</p>
                <div className="bg-white/20 rounded-xl p-4 mb-6">
                  <p className="text-white/80 text-sm">Average Reaction Time</p>
                  <p className="text-4xl font-bold text-white">
                    {Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)}ms
                  </p>
                  <p className="text-yellow-400 text-lg font-semibold mt-2">
                    Score: {calculateScore()} points
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={onCancel} className="border-white/30 text-white hover:bg-white/10">
                    Exit
                  </Button>
                  <Button onClick={handleFinish} className="bg-white text-indigo-600 hover:bg-white/90">
                    Save Score
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Reaction Times */}
        {reactionTimes.length > 0 && gameState !== "result" && (
          <div className="mt-4 flex justify-center gap-2">
            {reactionTimes.map((time, idx) => (
              <div key={idx} className="bg-slate-700 px-3 py-1 rounded-full text-white text-sm">
                {time}ms
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}