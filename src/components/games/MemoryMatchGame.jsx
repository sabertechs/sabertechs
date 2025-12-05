import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Brain, Trophy, Timer, RotateCcw } from "lucide-react";

const ICONS = ['🎯', '⚡', '🔥', '💎', '🚀', '⭐', '🎮', '💡'];

export default function MemoryMatchGame({ employee, onComplete, onCancel }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameState, setGameState] = useState("ready"); // ready, playing, result
  const [timeLeft, setTimeLeft] = useState(60);
  const [startTime, setStartTime] = useState(null);

  const initGame = useCallback(() => {
    const shuffled = [...ICONS, ...ICONS]
      .sort(() => Math.random() - 0.5)
      .map((icon, idx) => ({ id: idx, icon, isFlipped: false }));
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setTimeLeft(60);
    setGameState("playing");
    setStartTime(Date.now());
  }, []);

  useEffect(() => {
    if (gameState !== "playing") return;
    if (timeLeft <= 0) {
      setGameState("result");
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  useEffect(() => {
    if (matched.length === ICONS.length * 2 && gameState === "playing") {
      setGameState("result");
    }
  }, [matched, gameState]);

  useEffect(() => {
    if (flipped.length === 2) {
      const [first, second] = flipped;
      if (cards[first].icon === cards[second].icon) {
        setMatched(prev => [...prev, first, second]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  }, [flipped, cards]);

  const handleCardClick = (idx) => {
    if (gameState !== "playing") return;
    if (flipped.length >= 2) return;
    if (flipped.includes(idx) || matched.includes(idx)) return;
    
    setFlipped(prev => [...prev, idx]);
    setMoves(m => m + 1);
  };

  const calculateScore = () => {
    const pairsFound = matched.length / 2;
    const timeBonus = Math.max(0, timeLeft * 5);
    const movesPenalty = Math.max(0, moves - 16) * 5;
    const baseScore = pairsFound * 100;
    return Math.max(100, baseScore + timeBonus - movesPenalty);
  };

  const handleFinish = () => {
    const score = calculateScore();
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    onComplete({ score, avgReactionTime: timeTaken * 10, rounds: matched.length / 2 });
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div 
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #0d1f3c 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <span className="text-white font-semibold">Memory Match</span>
          </div>
          <button onClick={onCancel} className="px-4 py-2 bg-slate-700/80 rounded-lg text-white text-sm font-semibold">
            EXIT
          </button>
        </div>

        <div className="p-4">
          {gameState === "ready" && (
            <div className="text-center py-12">
              <Brain className="w-20 h-20 text-purple-400 mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">Memory Match</h2>
              <p className="text-white/60 mb-6">Find all matching pairs before time runs out!</p>
              <button
                onClick={initGame}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full text-white font-bold text-lg"
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
                <div className="text-white/60 text-sm">Moves: {moves}</div>
                <div className="text-yellow-500 font-bold">{matched.length / 2}/{ICONS.length}</div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {cards.map((card, idx) => (
                  <motion.div
                    key={card.id}
                    onClick={() => handleCardClick(idx)}
                    className={`aspect-square rounded-xl flex items-center justify-center text-3xl cursor-pointer transition-all ${
                      flipped.includes(idx) || matched.includes(idx)
                        ? 'bg-indigo-500'
                        : 'bg-slate-600 hover:bg-slate-500'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {(flipped.includes(idx) || matched.includes(idx)) && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        {card.icon}
                      </motion.span>
                    )}
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {gameState === "result" && (
            <div className="text-center py-8">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">
                {matched.length === ICONS.length * 2 ? 'Perfect!' : 'Time Up!'}
              </h2>
              <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
                <p className="text-white/60 text-sm">Pairs Found</p>
                <p className="text-3xl font-bold text-white">{matched.length / 2}/{ICONS.length}</p>
                <p className="text-yellow-400 font-semibold mt-2">{calculateScore()} points</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={onCancel} className="px-6 py-3 border border-white/20 rounded-full text-white">Exit</button>
                <button onClick={handleFinish} className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full text-white font-bold">
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