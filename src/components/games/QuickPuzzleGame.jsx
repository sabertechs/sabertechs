import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Puzzle, Trophy, Timer, Check, X } from "lucide-react";

const PATTERNS = [
  { sequence: [1, 2, 3, 4], answer: 5, hint: "+1" },
  { sequence: [2, 4, 6, 8], answer: 10, hint: "+2" },
  { sequence: [1, 4, 9, 16], answer: 25, hint: "squares" },
  { sequence: [1, 1, 2, 3, 5], answer: 8, hint: "fibonacci" },
  { sequence: [3, 6, 12, 24], answer: 48, hint: "×2" },
  { sequence: [100, 90, 80, 70], answer: 60, hint: "-10" },
  { sequence: [1, 3, 6, 10], answer: 15, hint: "triangle" },
  { sequence: [2, 6, 18, 54], answer: 162, hint: "×3" },
];

export default function QuickPuzzleGame({ employee, onComplete, onCancel }) {
  const [gameState, setGameState] = useState("ready");
  const [currentPuzzle, setCurrentPuzzle] = useState(0);
  const [puzzles, setPuzzles] = useState([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [feedback, setFeedback] = useState(null);
  const [correct, setCorrect] = useState(0);

  const startGame = useCallback(() => {
    const shuffled = [...PATTERNS].sort(() => Math.random() - 0.5).slice(0, 6);
    setPuzzles(shuffled);
    setCurrentPuzzle(0);
    setScore(0);
    setCorrect(0);
    setTimeLeft(60);
    setUserAnswer("");
    setFeedback(null);
    setGameState("playing");
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

  const handleSubmit = () => {
    const puzzle = puzzles[currentPuzzle];
    const isCorrect = parseInt(userAnswer) === puzzle.answer;
    
    if (isCorrect) {
      const timeBonus = Math.max(0, timeLeft);
      const points = 100 + timeBonus;
      setScore(s => s + points);
      setCorrect(c => c + 1);
      setFeedback({ type: 'correct', points });
    } else {
      setFeedback({ type: 'wrong', answer: puzzle.answer });
    }

    setTimeout(() => {
      setFeedback(null);
      setUserAnswer("");
      if (currentPuzzle + 1 >= puzzles.length) {
        setGameState("result");
      } else {
        setCurrentPuzzle(c => c + 1);
      }
    }, 1500);
  };

  const handleFinish = () => {
    onComplete({ score, avgReactionTime: Math.round(score / Math.max(1, correct)), rounds: correct });
  };

  const puzzle = puzzles[currentPuzzle];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div 
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #0d1f3c 100%)' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-blue-400" />
            <span className="text-white font-semibold">Quick Puzzle</span>
          </div>
          <button onClick={onCancel} className="px-4 py-2 bg-slate-700/80 rounded-lg text-white text-sm font-semibold">
            EXIT
          </button>
        </div>

        <div className="p-4">
          {gameState === "ready" && (
            <div className="text-center py-12">
              <Puzzle className="w-20 h-20 text-blue-400 mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">Quick Puzzle</h2>
              <p className="text-white/60 mb-6">Find the pattern and complete the sequence!</p>
              <button
                onClick={startGame}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full text-white font-bold text-lg"
              >
                START GAME
              </button>
            </div>
          )}

          {gameState === "playing" && puzzle && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-white">
                  <Timer className="w-4 h-4" />
                  <span className={`font-bold ${timeLeft <= 10 ? 'text-red-400' : ''}`}>{timeLeft}s</span>
                </div>
                <div className="text-white/60 text-sm">{currentPuzzle + 1}/{puzzles.length}</div>
                <div className="text-yellow-500 font-bold">{score}</div>
              </div>

              <div className="bg-slate-700/50 rounded-2xl p-6 mb-6">
                <p className="text-white/60 text-sm mb-3 text-center">Find the next number:</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  {puzzle.sequence.map((num, idx) => (
                    <div key={idx} className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{num}</span>
                    </div>
                  ))}
                  <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                    <span className="text-yellow-900 font-bold text-lg">?</span>
                  </div>
                </div>
              </div>

              {feedback ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-center py-6 rounded-xl ${feedback.type === 'correct' ? 'bg-green-500/20' : 'bg-red-500/20'}`}
                >
                  {feedback.type === 'correct' ? (
                    <>
                      <Check className="w-12 h-12 text-green-400 mx-auto mb-2" />
                      <p className="text-green-400 font-bold">Correct! +{feedback.points}</p>
                    </>
                  ) : (
                    <>
                      <X className="w-12 h-12 text-red-400 mx-auto mb-2" />
                      <p className="text-red-400 font-bold">Wrong! Answer: {feedback.answer}</p>
                    </>
                  )}
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="number"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && userAnswer && handleSubmit()}
                    placeholder="Your answer"
                    className="w-full px-4 py-4 bg-slate-700 rounded-xl text-white text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!userAnswer}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white font-bold disabled:opacity-50"
                  >
                    SUBMIT
                  </button>
                </div>
              )}
            </>
          )}

          {gameState === "result" && (
            <div className="text-center py-8">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">Puzzle Complete!</h2>
              <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
                <p className="text-white/60 text-sm">Correct Answers</p>
                <p className="text-3xl font-bold text-white">{correct}/{puzzles.length}</p>
                <p className="text-yellow-400 font-bold text-xl mt-2">{score} points</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={onCancel} className="px-6 py-3 border border-white/20 rounded-full text-white">Exit</button>
                <button onClick={handleFinish} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full text-white font-bold">
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