import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { HelpCircle, Trophy, Timer, Check, X } from "lucide-react";

const QUESTIONS = [
  {
    q: "What does HR stand for?",
    options: ["Human Resources", "High Revenue", "Home Relations", "Hiring Rules"],
    correct: 0
  },
  {
    q: "What is the purpose of a KPI?",
    options: ["Kitchen Protocol", "Key Performance Indicator", "Knowledge Process", "Keep Productivity Index"],
    correct: 1
  },
  {
    q: "What does ERP stand for?",
    options: ["Employee Resource Plan", "Enterprise Resource Planning", "Effective Results Program", "Executive Review Process"],
    correct: 1
  },
  {
    q: "What is a P&L statement?",
    options: ["People & Leadership", "Profit & Loss", "Policy & Law", "Planning & Logistics"],
    correct: 1
  },
  {
    q: "What does ROI measure?",
    options: ["Rate of Interest", "Return on Investment", "Risk of Inflation", "Revenue of Industry"],
    correct: 1
  },
  {
    q: "What is onboarding?",
    options: ["Getting on a boat", "New employee integration", "Board meeting", "Online boarding pass"],
    correct: 1
  },
  {
    q: "What does CRM stand for?",
    options: ["Customer Relationship Management", "Company Revenue Model", "Client Resource Manager", "Corporate Risk Management"],
    correct: 0
  },
  {
    q: "What is a deadline?",
    options: ["End of life", "Due date for task", "Final warning", "Budget limit"],
    correct: 1
  },
  {
    q: "What is a team standup?",
    options: ["Comedy show", "Brief daily meeting", "Standing desk", "Fire drill"],
    correct: 1
  },
  {
    q: "What does SLA stand for?",
    options: ["Service Level Agreement", "Sales Leadership Award", "System Login Access", "Staff Leave Application"],
    correct: 0
  }
];

export default function QuizBattleGame({ employee, onComplete, onCancel }) {
  const [gameState, setGameState] = useState("ready");
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selected, setSelected] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  const startGame = useCallback(() => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5);
    setQuestions(shuffled);
    setCurrent(0);
    setScore(0);
    setCorrect(0);
    setStreak(0);
    setMaxStreak(0);
    setTimeLeft(10);
    setSelected(null);
    setGameState("playing");
  }, []);

  useEffect(() => {
    if (gameState !== "playing" || selected !== null) return;
    if (timeLeft <= 0) {
      handleAnswer(-1);
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [gameState, timeLeft, selected]);

  const handleAnswer = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    
    const isCorrect = idx === questions[current].correct;
    
    if (isCorrect) {
      const timeBonus = timeLeft * 10;
      const streakBonus = streak * 20;
      const points = 100 + timeBonus + streakBonus;
      setScore(s => s + points);
      setCorrect(c => c + 1);
      setStreak(s => {
        const newStreak = s + 1;
        setMaxStreak(m => Math.max(m, newStreak));
        return newStreak;
      });
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      if (current + 1 >= questions.length) {
        setGameState("result");
      } else {
        setCurrent(c => c + 1);
        setTimeLeft(10);
        setSelected(null);
      }
    }, 1500);
  };

  const handleFinish = () => {
    onComplete({ score, avgReactionTime: Math.round(score / Math.max(1, correct)), rounds: correct });
  };

  const question = questions[current];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div 
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #0d1f3c 100%)' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <span className="text-white font-semibold">Quiz Battle</span>
          </div>
          <button onClick={onCancel} className="px-4 py-2 bg-slate-700/80 rounded-lg text-white text-sm font-semibold">
            EXIT
          </button>
        </div>

        <div className="p-4">
          {gameState === "ready" && (
            <div className="text-center py-12">
              <HelpCircle className="w-20 h-20 text-cyan-400 mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">Quiz Battle</h2>
              <p className="text-white/60 mb-6">Answer quickly for bonus points! Build streaks!</p>
              <button
                onClick={startGame}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full text-white font-bold text-lg"
              >
                START QUIZ
              </button>
            </div>
          )}

          {gameState === "playing" && question && (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="text-white/60 text-sm">Q{current + 1}/{questions.length}</div>
                <div className={`flex items-center gap-2 ${timeLeft <= 3 ? 'text-red-400' : 'text-white'}`}>
                  <Timer className="w-4 h-4" />
                  <span className="font-bold">{timeLeft}s</span>
                </div>
                <div className="text-yellow-500 font-bold">{score}</div>
              </div>

              {streak > 1 && (
                <div className="text-center mb-2">
                  <span className="text-orange-400 text-sm font-bold">🔥 {streak} Streak!</span>
                </div>
              )}

              {/* Time bar */}
              <div className="h-2 bg-slate-700 rounded-full mb-6 overflow-hidden">
                <motion.div
                  className={`h-full ${timeLeft <= 3 ? 'bg-red-500' : 'bg-cyan-500'}`}
                  animate={{ width: `${(timeLeft / 10) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <div className="bg-slate-700/50 rounded-2xl p-4 mb-6">
                <p className="text-white font-semibold text-center">{question.q}</p>
              </div>

              <div className="space-y-3">
                {question.options.map((option, idx) => {
                  let bgClass = 'bg-slate-600 hover:bg-slate-500';
                  if (selected !== null) {
                    if (idx === question.correct) {
                      bgClass = 'bg-green-500';
                    } else if (idx === selected && idx !== question.correct) {
                      bgClass = 'bg-red-500';
                    } else {
                      bgClass = 'bg-slate-700 opacity-50';
                    }
                  }
                  
                  return (
                    <motion.button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      disabled={selected !== null}
                      className={`w-full p-4 rounded-xl text-white font-medium text-left transition-all ${bgClass}`}
                      whileTap={selected === null ? { scale: 0.98 } : {}}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {option}
                        {selected !== null && idx === question.correct && (
                          <Check className="w-5 h-5 ml-auto" />
                        )}
                        {selected === idx && idx !== question.correct && (
                          <X className="w-5 h-5 ml-auto" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </>
          )}

          {gameState === "result" && (
            <div className="text-center py-8">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">Quiz Complete!</h2>
              <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-white/60 text-xs">Correct</p>
                    <p className="text-xl font-bold text-green-400">{correct}/{questions.length}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">Max Streak</p>
                    <p className="text-xl font-bold text-orange-400">{maxStreak}</p>
                  </div>
                </div>
                <p className="text-yellow-400 font-bold text-2xl">{score} points</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={onCancel} className="px-6 py-3 border border-white/20 rounded-full text-white">Exit</button>
                <button onClick={handleFinish} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full text-white font-bold">
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