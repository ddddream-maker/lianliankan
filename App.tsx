
import React, { useState, useEffect, useRef } from 'react';
import { GameState, Position, TileData, User, LevelConfig } from './types';
import { getLevelConfig, MATCH_SCORE, COMBO_CONFIG, MAX_LIVES } from './constants';
import { generateBoard, findPath, getHintPair, shuffleBoard, hasValidMoves } from './services/gameLogic';
import { playMatchSound, playHintSound, playShuffleSound } from './services/audio';
import { getCurrentUser, updateUserStats } from './services/auth';
import { GameMenu } from './components/GameMenu';
import { GameControls } from './components/GameControls';
import { GameBoard } from './components/GameBoard';
import { Frown, Trophy, ArrowRight, AlertTriangle, RefreshCcw, Heart, LogOut, Shuffle } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(MAX_LIVES);
  const [targetScore, setTargetScore] = useState(0);
  
  const [board, setBoard] = useState<TileData[][]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [initialTime, setInitialTime] = useState(0); 
  const [hints, setHints] = useState(0);
  const [shuffles, setShuffles] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastTimeBonus, setLastTimeBonus] = useState<{ amount: number, id: number } | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [hintPair, setHintPair] = useState<[Position, Position] | null>(null);
  const [connectionPath, setConnectionPath] = useState<Position[] | null>(null);

  const lastMatchTimeRef = useRef<number>(0);
  const sessionItemsRef = useRef<Record<string, number>>({});

  // Initialize Session
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // Toast Timer
  useEffect(() => {
    if (toastMessage) {
        const t = setTimeout(() => setToastMessage(null), 2000);
        return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Timer Effect
  useEffect(() => {
    let timerId: ReturnType<typeof setInterval>;
    if (gameState === GameState.PLAYING && timeLeft > 0 && !showQuitConfirm) {
      timerId = setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 1) {
                handleLevelFail("Time's Up!");
                return 0;
            }
            return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [gameState, timeLeft, showQuitConfirm]);

  // Start Level (Init or Next)
  const startLevel = (lvl: number) => {
    const config = getLevelConfig(lvl);
    
    // Generate board based on Level config
    const newBoard = generateBoard(config.rows, config.cols);
    
    setBoard(newBoard);
    setScore(0); 
    
    setLevel(lvl);
    setTargetScore(config.targetScore);
    setTimeLeft(config.totalTime);
    setInitialTime(config.totalTime);

    // Apply Perks (Permanent Upgrades)
    // NOTE: We rely on currentUser being up-to-date here
    const extraHints = currentUser?.perks?.extraHints || 0;
    const extraShuffles = currentUser?.perks?.extraShuffles || 0;
    
    setHints(config.hints + extraHints);
    setShuffles(config.shuffles + extraShuffles);
    
    setCombo(0);
    setLastTimeBonus(null);
    lastMatchTimeRef.current = 0;
    sessionItemsRef.current = {}; // Reset items collected for this level/session attempt
    
    setSelectedPos(null);
    setHintPair(null);
    setConnectionPath(null);
    setShowQuitConfirm(false);
    setGameState(GameState.PLAYING);
  };

  const handleStartGame = () => {
      setLives(MAX_LIVES);
      startLevel(1);
  };

  const handleNextLevel = () => {
      commitSessionStats(score, sessionItemsRef.current, false);
      startLevel(level + 1);
  };

  const handleRetryLevel = () => {
      commitSessionStats(score, sessionItemsRef.current, false);
      const newLevel = Math.max(1, level - 1);
      startLevel(newLevel);
  };

  const handleLevelFail = (reason: string) => {
      if (lives > 1) {
          setLives(l => l - 1);
          setGameState(GameState.LOST); // Shows "Level Failed" screen
      } else {
          setLives(0);
          commitSessionStats(score, sessionItemsRef.current, false); // Final save
          setGameState(GameState.GAME_OVER);
      }
  };

  const handleQuitToMenu = () => {
      // Save everything obtained so far
      commitSessionStats(score, sessionItemsRef.current, false);
      setGameState(GameState.MENU);
      setShowQuitConfirm(false);
      // Reload user to refresh UI
      const u = getCurrentUser();
      if(u) setCurrentUser(u);
  };

  // Helper to save coins and items
  const commitSessionStats = (currentLevelScore: number, items: Record<string, number>, isNewMaxLevel: boolean) => {
      if (!currentUser) return;
      const coinsEarned = Math.floor(currentLevelScore / 100);
      
      const statsToUpdate: any = {
          addCoins: coinsEarned,
          addItems: items
      };
      
      if (isNewMaxLevel) {
          statsToUpdate.maxLevel = level + 1;
      }
      
      // Update local storage
      updateUserStats(currentUser.username, statsToUpdate);
      
      // Update local state to reflect changes immediately
      setCurrentUser(prev => {
          if (!prev) return null;
          const newInv = { ...prev.inventory };
          Object.entries(items).forEach(([k, v]) => {
              newInv[k] = (newInv[k] || 0) + v;
          });
          return {
              ...prev,
              coins: (prev.coins || 0) + coinsEarned,
              inventory: newInv,
              maxLevel: isNewMaxLevel ? level + 1 : prev.maxLevel
          };
      });
  };

  // Handle Tile Click
  const handleTileClick = (pos: Position) => {
    if (gameState !== GameState.PLAYING || showQuitConfirm) return;
    const tile = board[pos.y][pos.x];
    if (tile.isEmpty) return;

    setHintPair(null);

    if (!selectedPos) {
      setSelectedPos(pos);
      return;
    }

    if (selectedPos.x === pos.x && selectedPos.y === pos.y) {
      setSelectedPos(null);
      return;
    }

    const selectedTile = board[selectedPos.y][selectedPos.x];
    if (selectedTile.type === tile.type) {
        const path = findPath(selectedPos, pos, board);
        if (path) {
            handleMatch(selectedPos, pos, path, selectedTile.type);
        } else {
            setSelectedPos(pos);
        }
    } else {
        setSelectedPos(pos);
    }
  };

  const handleMatch = (p1: Position, p2: Position, path: Position[], fruitType: string) => {
    setConnectionPath(path);
    setSelectedPos(null);
    playMatchSound();

    const now = Date.now();
    let newCombo = 1;
    if (lastMatchTimeRef.current > 0 && (now - lastMatchTimeRef.current) <= COMBO_CONFIG.WINDOW_MS) {
        newCombo = combo + 1;
    }
    lastMatchTimeRef.current = now;
    setCombo(newCombo);

    // Track Item: 1 Item per pair
    sessionItemsRef.current[fruitType] = (sessionItemsRef.current[fruitType] || 0) + 1;

    const scoreToAdd = MATCH_SCORE + ((newCombo - 1) * COMBO_CONFIG.COMBO_SCORE_BONUS);
    
    setTimeout(() => {
        setConnectionPath(null);

        // Calculate new board state
        let nextBoard = board.map(row => row.map(t => ({...t})));
        nextBoard[p1.y][p1.x].isEmpty = true;
        nextBoard[p2.y][p2.x].isEmpty = true;

        const hasTiles = nextBoard.some(row => row.some(t => !t.isEmpty));
        
        if (!hasTiles) {
            // Win logic
            setBoard(nextBoard);
            const timeBonusCoins = timeLeft;
            const finalScore = score + scoreToAdd; 
            
            if (finalScore >= targetScore) {
                if (!currentUser) return;

                const baseCoins = Math.floor(finalScore / 100);
                const totalCoins = baseCoins + timeBonusCoins;

                const items = sessionItemsRef.current;
                const statsToUpdate: any = {
                    addCoins: totalCoins,
                    addItems: items,
                    maxLevel: level + 1
                };
                updateUserStats(currentUser.username, statsToUpdate);
                
                setCurrentUser(prev => {
                    if (!prev) return null;
                    const newInv = { ...prev.inventory };
                    Object.entries(items).forEach(([k, v]) => {
                        newInv[k] = (newInv[k] || 0) + v;
                    });
                    return {
                        ...prev,
                        coins: (prev.coins || 0) + totalCoins,
                        inventory: newInv,
                        maxLevel: level + 1
                    };
                });

                setGameState(GameState.WON);
            } else {
                handleLevelFail("Score too low!");
            }
        } else {
            // Game continues
            // Anti-Deadlock Check
            // If the user has NO valid moves left, we auto-shuffle for them
            // We check this BEFORE they potentially get frustrated.
            
            let finalBoard = nextBoard;
            if (!hasValidMoves(finalBoard)) {
                playShuffleSound();
                setToastMessage("无解！自动洗牌...");
                
                // Shuffle until valid (usually once is enough)
                finalBoard = shuffleBoard(finalBoard);
                
                // If by some miracle it's still invalid, the user will trigger this check again next click or use a tool. 
                // But generally shuffleBoard creates valid moves for standard fruit counts.
            }

            setBoard(finalBoard);
            setScore(s => s + scoreToAdd);
        }

    }, 400); 
  };

  const handleHint = () => {
    if (hints > 0 && !showQuitConfirm) {
      const pair = getHintPair(board);
      if (pair) {
        playHintSound();
        setHintPair(pair);
        setHints(h => h - 1);
      }
    }
  };

  const handleShuffle = () => {
    if (shuffles > 0 && !showQuitConfirm) {
      playShuffleSound();
      setBoard(prev => shuffleBoard(prev));
      setShuffles(s => s - 1);
      setHintPair(null);
      setSelectedPos(null);
    }
  };

  const handleGiveUpRequest = () => {
    setShowQuitConfirm(true);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };
  
  const handleUserUpdate = (updatedUser: User) => {
      setCurrentUser(updatedUser);
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans overflow-hidden">
      
      {/* Toast Notification */}
      {toastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
              <div className="bg-black/70 backdrop-blur-md text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-xl border border-white/10">
                  <Shuffle size={18} className="text-yellow-400" />
                  {toastMessage}
              </div>
          </div>
      )}

      {gameState === GameState.MENU && (
        <GameMenu 
            onStart={handleStartGame} 
            currentUser={currentUser}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onUpdateUser={handleUserUpdate} 
        />
      )}

      {gameState === GameState.PLAYING && (
        <div className="flex-1 flex flex-col h-[100dvh] w-full relative">
          <GameControls 
            level={level}
            lives={lives}
            score={score}
            targetScore={targetScore}
            timeLeft={timeLeft}
            totalTime={initialTime}
            hints={hints}
            shuffles={shuffles}
            combo={combo}
            lastTimeBonus={lastTimeBonus}
            onHint={handleHint}
            onShuffle={handleShuffle}
            onGiveUp={handleGiveUpRequest}
          />
          <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
             <GameBoard 
                board={board}
                selectedPos={selectedPos}
                hintPair={hintPair}
                onTileClick={handleTileClick}
                connectionPath={connectionPath}
                isPaused={showQuitConfirm}
             />
          </div>
        </div>
      )}

      {/* Quit Confirmation */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center glass-panel-dark animate-fade-in p-4">
             <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-gray-100">
                <div className="mb-6 flex justify-center">
                    <div className="bg-gray-100 p-4 rounded-full">
                        <LogOut size={48} className="text-gray-500" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">返回主菜单?</h3>
                <p className="text-gray-500 mb-6 text-sm">
                    当前进度将丢失，但已获得的金币和物品会保留。
                </p>
                <div className="flex space-x-4">
                    <button onClick={() => setShowQuitConfirm(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl">继续游戏</button>
                    <button onClick={handleQuitToMenu} className="flex-1 bg-gray-800 text-white font-bold py-3 rounded-xl shadow-lg">确定返回</button>
                </div>
             </div>
        </div>
      )}

      {/* Won / Lost / Game Over Screens */}
      {(gameState === GameState.WON || gameState === GameState.LOST || gameState === GameState.GAME_OVER) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center glass-panel-dark p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center transform scale-100 transition-all border border-gray-100">
                
                {gameState === GameState.WON && (
                    <>
                        <div className="p-4 bg-yellow-100 rounded-full mb-4 inline-block animate-bounce">
                            <Trophy size={48} className="text-yellow-500" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-1">关卡完成!</h2>
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <span className="text-green-600 font-bold">Target Reached!</span>
                            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-lg font-bold">+{Math.floor(score/100) + timeLeft} Coins</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
                             <div className="bg-gray-50 p-2 rounded-lg">
                                <div className="text-gray-400">Score</div>
                                <div className="font-bold text-xl">{score}</div>
                             </div>
                             <div className="bg-gray-50 p-2 rounded-lg">
                                <div className="text-gray-400">Time Bonus</div>
                                <div className="font-bold text-xl text-green-500">+{timeLeft}</div>
                             </div>
                        </div>

                        <button 
                            onClick={handleNextLevel}
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                        >
                            <span>下一关 Level {level + 1}</span>
                            <ArrowRight size={20} />
                        </button>
                    </>
                )}

                {gameState === GameState.LOST && (
                    <>
                        <div className="p-4 bg-orange-100 rounded-full mb-4 inline-block">
                             <AlertTriangle size={48} className="text-orange-500" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">挑战失败</h2>
                        <div className="text-gray-500 mb-4 space-y-1">
                             <p>没有达到目标分数 或 时间耗尽。</p>
                             <p className="text-red-500 font-bold flex items-center justify-center gap-1">
                                <Heart size={14} fill="currentColor"/> 生命值 -1
                             </p>
                        </div>
                        
                         <div className="mb-6 bg-yellow-50 p-2 rounded-lg text-xs text-yellow-700 font-bold">
                             获得 {Math.floor(score/100)} 金币 (安慰奖)
                         </div>

                         <div className="mb-6 p-3 bg-red-50 rounded-xl text-xs text-red-600 font-medium">
                            退回至 Level {Math.max(1, level - 1)}
                         </div>

                        <button 
                            onClick={handleRetryLevel}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg"
                        >
                            <RefreshCcw size={18} />
                            <span>重试 (剩余生命: {lives})</span>
                        </button>
                    </>
                )}

                {gameState === GameState.GAME_OVER && (
                    <>
                         <div className="p-4 bg-red-100 rounded-full mb-4 inline-block">
                             <Frown size={48} className="text-red-500" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">游戏结束</h2>
                        <p className="text-gray-500 mb-6">生命值耗尽！请重新开始。</p>
                        
                        <button 
                            onClick={() => setGameState(GameState.MENU)}
                            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg"
                        >
                            返回主菜单
                        </button>
                    </>
                )}
            </div>
        </div>
      )}

    </div>
  );
};

export default App;
