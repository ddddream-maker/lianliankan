

import React, { useEffect, useState } from 'react';
import { RefreshCw, Lightbulb, LogOut, Trophy, Zap, Heart, Target } from 'lucide-react';
import { MAX_LIVES } from '../constants';

interface GameControlsProps {
  level: number;
  lives: number;
  score: number;
  targetScore: number;
  timeLeft: number;
  totalTime: number;
  hints: number;
  shuffles: number;
  combo: number;
  lastTimeBonus: { amount: number; id: number } | null;
  onHint: () => void;
  onShuffle: () => void;
  onGiveUp: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  level,
  lives,
  score,
  targetScore,
  timeLeft,
  totalTime,
  hints,
  shuffles,
  combo,
  lastTimeBonus,
  onHint,
  onShuffle,
  onGiveUp
}) => {
  const timePercent = (timeLeft / totalTime) * 100;
  const [bonusDisplay, setBonusDisplay] = useState<{amount: number, id: number} | null>(null);
  const scorePercent = Math.min(100, (score / targetScore) * 100);

  useEffect(() => {
    if (lastTimeBonus) {
        setBonusDisplay(lastTimeBonus);
        const timer = setTimeout(() => {
            setBonusDisplay(null);
        }, 800); 
        return () => clearTimeout(timer);
    }
  }, [lastTimeBonus]);
  
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeString = `${mins}:${secs.toString().padStart(2, '0')}`;
  
  // Use absolute positioning for combo so it doesn't shift layout
  const isOnFire = combo > 1;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-2 flex flex-col gap-2 shrink-0 z-20 relative">
      
      {/* Top Info Bar */}
      <div className="flex w-full justify-between items-center px-1">
          {/* Lives & Level */}
          <div className="flex flex-col items-start gap-1">
             <div className="bg-indigo-600 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-sm flex items-center">
                 Level {level}
             </div>
             <div className="flex items-center -space-x-1">
                   {Array.from({length: MAX_LIVES}).map((_, i) => (
                       <Heart 
                          key={i} 
                          size={18} 
                          className={`transition-all drop-shadow-sm ${i < lives ? 'text-red-500 fill-red-500' : 'text-gray-300'}`} 
                       />
                   ))}
              </div>
          </div>

          {/* Center Timer */}
          <div className="flex flex-col items-center justify-center relative z-10">
              {/* Floating Bonus */}
              {bonusDisplay && (
                  <div key={bonusDisplay.id} className="absolute top-0 transform -translate-y-full animate-float-up pointer-events-none">
                      <span className="text-green-500 font-black text-xl drop-shadow-md stroke-white">+{bonusDisplay.amount}s</span>
                  </div>
              )}
              <div className="font-mono font-black text-4xl leading-none text-gray-800 tracking-tighter drop-shadow-sm">
                  {timeString}
              </div>
              <div className="w-20 h-1.5 bg-gray-200/80 rounded-full overflow-hidden mt-1">
                  <div 
                      className={`h-full transition-all duration-1000 linear ${timePercent < 20 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(100, timePercent)}%` }}
                  />
              </div>
          </div>

          {/* Right: Score */}
          <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-1 opacity-80 text-[10px] font-bold text-gray-500 uppercase">
                <Target size={10} />
                <span>Target: {targetScore}</span>
             </div>
             <div className="flex items-center gap-1 text-yellow-600">
                <Trophy size={16} fill="currentColor" />
                <span className="text-xl font-black">{score}</span>
             </div>
             <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: `${scorePercent}%` }} />
            </div>
          </div>
      </div>

      {/* Toolbar & Combo Overlay Area */}
      <div className="relative w-full h-12 mt-1 flex items-center justify-between">
            {/* Left: Exit */}
            <button onClick={onGiveUp} className="bg-white/80 hover:bg-red-50 text-gray-500 hover:text-red-500 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-bold border border-transparent hover:border-red-100 transition-all shadow-sm">
                <LogOut size={14} /> 返回
            </button>

            {/* Center: Floating Combo (Absolute to not disturb layout) */}
            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 ${isOnFire ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                 <div className="flex flex-col items-center animate-pulse">
                     <div className="flex items-center gap-1 text-orange-500 drop-shadow-sm">
                         <Zap size={16} fill="currentColor" />
                         <span className="text-xs font-black italic">COMBO</span>
                     </div>
                     <span className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-orange-600 leading-none filter drop-shadow-md">
                        x{combo}
                     </span>
                 </div>
            </div>

            {/* Right: Tools */}
            <div className="flex gap-3">
                 <button onClick={onHint} disabled={hints <= 0} className={`w-12 h-10 rounded-xl flex items-center justify-center border-b-4 active:border-b-0 active:translate-y-1 transition-all relative ${hints > 0 ? 'bg-purple-100 text-purple-600 border-purple-200 hover:bg-purple-200' : 'bg-gray-100 text-gray-300 border-gray-200'}`}>
                     <Lightbulb size={20} />
                     <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white font-bold">{hints}</span>
                 </button>
                 <button onClick={onShuffle} disabled={shuffles <= 0} className={`w-12 h-10 rounded-xl flex items-center justify-center border-b-4 active:border-b-0 active:translate-y-1 transition-all relative ${shuffles > 0 ? 'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200' : 'bg-gray-100 text-gray-300 border-gray-200'}`}>
                     <RefreshCw size={18} />
                     <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white font-bold">{shuffles}</span>
                 </button>
            </div>
      </div>

      <style>{`
        @keyframes float-up {
            0% { transform: translate(-50%, 0) scale(0.8); opacity: 0; }
            50% { transform: translate(-50%, -20px) scale(1.2); opacity: 1; }
            100% { transform: translate(-50%, -40px) scale(1); opacity: 0; }
        }
        .animate-float-up {
            animation: float-up 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
