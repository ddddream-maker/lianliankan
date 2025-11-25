
import React, { useState, useEffect } from 'react';
import { User, LeaderboardEntry, UserPerks, Recipe } from '../types';
import { Play, LogOut, Trophy, User as UserIcon, Zap, Crown, Loader, Heart, ShoppingBag, X, Coins, Store, Lightbulb, RefreshCw, ArrowUpCircle, Beaker, Check, AlertCircle } from 'lucide-react';
import { AuthForm } from './AuthForm';
import { logoutUser, getGlobalLeaderboard, updateUserStats } from '../services/auth';

interface GameMenuProps {
  onStart: () => void;
  currentUser: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

const RECIPES: Recipe[] = [
    {
        id: 'gold_pack',
        name: '果味金币包',
        description: '回收多余水果换取金币。',
        costItems: { '🍎': 5, '🍌': 5 },
        rewardType: 'coin',
        rewardAmount: 100,
        icon: Coins
    },
    {
        id: 'hint_potion',
        name: '洞察药水',
        description: '混合浆果来获得一次永久提示升级。',
        costItems: { '🍇': 20, '🫐': 20, '🍓': 10 },
        rewardType: 'hint',
        rewardAmount: 1,
        icon: Lightbulb
    },
    {
        id: 'shuffle_mix',
        name: '混乱果昔',
        description: '使用热带水果来获得一次永久洗牌升级。',
        costItems: { '🥭': 15, '🍍': 15, '🥥': 10 },
        rewardType: 'shuffle',
        rewardAmount: 1,
        icon: RefreshCw
    },
    {
        id: 'mega_gold',
        name: '大富翁沙拉',
        description: '大量消耗普通蔬菜，换取巨额金币。',
        costItems: { '🥕': 50, '🥔': 50 },
        rewardType: 'coin',
        rewardAmount: 2000,
        icon: Crown
    }
];

export const GameMenu: React.FC<GameMenuProps> = ({ onStart, currentUser, onLogin, onLogout, onUpdateUser }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLB, setLoadingLB] = useState(false);
  const [showBag, setShowBag] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showCraft, setShowCraft] = useState(false);
  const [localUser, setLocalUser] = useState<User | null>(currentUser);

  useEffect(() => {
    setLocalUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    setLoadingLB(true);
    getGlobalLeaderboard().then(data => {
        setLeaderboard(data);
        setLoadingLB(false);
    });
  }, [currentUser]); 

  const handleLogout = () => {
    logoutUser();
    onLogout();
  };

  const handleBuyUpgrade = (type: keyof UserPerks, basePrice: number) => {
      if (!localUser) return;
      const currentLevel = localUser.perks?.[type] || 0;
      const cost = basePrice * (currentLevel + 1);

      if (localUser.coins >= cost) {
          updateUserStats(localUser.username, {
              spendCoins: cost,
              upgradePerk: type
          });
          
          const updatedUser: User = {
              ...localUser,
              coins: localUser.coins - cost,
              perks: {
                  ...localUser.perks,
                  [type]: (localUser.perks?.[type] || 0) + 1
              }
          };

          setLocalUser(updatedUser);
          onUpdateUser(updatedUser);
      }
  };

  const handleCraft = (recipe: Recipe) => {
      if (!localUser) return;

      // Check items
      for (const [item, cost] of Object.entries(recipe.costItems)) {
          if ((localUser.inventory[item] || 0) < cost) return;
      }

      // Deduct Items
      const newInventory = { ...localUser.inventory };
      const itemsToDeduct: Record<string, number> = {};
      
      for (const [item, cost] of Object.entries(recipe.costItems)) {
          newInventory[item] -= cost;
          // Stats update expects negative numbers to subtract? 
          // Actually updateUserStats 'addItems' adds. So we pass negative values to subtract.
          itemsToDeduct[item] = -cost; 
      }

      // Apply Reward
      const updates: any = {
          addItems: itemsToDeduct
      };

      let newUserState = { ...localUser, inventory: newInventory };

      if (recipe.rewardType === 'coin') {
          updates.addCoins = recipe.rewardAmount;
          newUserState.coins += recipe.rewardAmount;
      } else if (recipe.rewardType === 'hint') {
          updates.upgradePerk = 'extraHints';
           newUserState.perks = {
               ...newUserState.perks,
               extraHints: newUserState.perks.extraHints + 1
           };
      } else if (recipe.rewardType === 'shuffle') {
          updates.upgradePerk = 'extraShuffles';
           newUserState.perks = {
               ...newUserState.perks,
               extraShuffles: newUserState.perks.extraShuffles + 1
           };
      }

      updateUserStats(localUser.username, updates);
      setLocalUser(newUserState);
      onUpdateUser(newUserState);
  };

  const canCraft = (recipe: Recipe) => {
      if (!localUser) return false;
      for (const [item, cost] of Object.entries(recipe.costItems)) {
          if ((localUser.inventory[item] || 0) < cost) return false;
      }
      return true;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative z-10">
      {/* Main Card */}
      <div className="glass-panel p-6 md:p-10 rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col md:flex-row gap-8 md:gap-16 items-center md:items-stretch animate-fade-in relative overflow-hidden">
        
        {/* Decorative blobs */}
        <div className="absolute -top-40 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Left Side: Brand & Global Stats */}
        <div className="flex-1 flex flex-col justify-center w-full md:max-w-md z-10">
            <div className="text-center md:text-left mb-8">
                <h1 className="text-5xl md:text-7xl font-bold text-gray-800 mb-2 drop-shadow-sm font-[Fredoka] tracking-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">连连看</span>
                  <span className="text-3xl block md:inline md:ml-4 text-gray-400 font-medium">Saga</span>
                </h1>
                <p className="text-xl text-gray-600 font-medium flex items-center justify-center md:justify-start gap-2">
                    <span>闯关模式</span>
                    <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md text-sm font-bold border border-orange-200">v2.4</span>
                </p>
            </div>

            {/* Leaderboard Mini */}
            <div className="bg-white/50 rounded-2xl p-5 shadow-sm border border-white/60 backdrop-blur-sm hidden md:block">
                <h3 className="text-gray-800 font-bold mb-3 flex items-center gap-2">
                    <Trophy size={18} className="text-yellow-500" />
                    <span>排行榜 Top 5</span>
                </h3>
                {loadingLB ? (
                    <div className="flex justify-center py-4"><Loader className="animate-spin text-gray-400" /></div>
                ) : (
                    <div className="space-y-2">
                        {leaderboard.map((entry, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/80 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold w-4 ${idx < 3 ? 'text-yellow-600' : 'text-gray-400'}`}>{entry.rank}</span>
                                    <span className="font-medium text-gray-700 truncate max-w-[100px]">{entry.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-xs font-bold">Lv.{entry.maxLevel}</span>
                                    <span className="text-gray-500 font-mono">{entry.score}</span>
                                </div>
                            </div>
                        ))}
                        {leaderboard.length === 0 && <div className="text-center text-gray-400 py-2">暂无数据</div>}
                    </div>
                )}
            </div>
        </div>

        {/* Right Side: Auth & Actions */}
        <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
          {!localUser ? (
            <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white">
                <AuthForm onLoginSuccess={onLogin} />
            </div>
          ) : (
            <div className="w-full max-w-sm flex flex-col gap-4">
                {/* User Card */}
                <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-100 to-transparent rounded-bl-full opacity-50"></div>
                    
                    <div className="flex items-center gap-4 mb-6 relative">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg text-white font-bold text-2xl">
                            {localUser.username[0].toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">{localUser.username}</h2>
                            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                <Crown size={14} className="text-yellow-500" />
                                <span>Max Level: {localUser.maxLevel}</span>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="absolute top-0 right-0 p-2 text-gray-400 hover:text-red-500 transition-colors">
                            <LogOut size={18} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-yellow-50 p-3 rounded-2xl border border-yellow-100 flex flex-col items-center">
                            <span className="text-yellow-600 text-xs font-bold uppercase mb-1">Coins</span>
                            <div className="flex items-center gap-1.5 text-yellow-700 font-black text-xl">
                                <Coins size={20} className="fill-yellow-500 stroke-yellow-700" />
                                {localUser.coins}
                            </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 flex flex-col items-center">
                            <span className="text-blue-600 text-xs font-bold uppercase mb-1">High Score</span>
                            <div className="flex items-center gap-1.5 text-blue-700 font-black text-xl">
                                <Trophy size={18} />
                                {localUser.highScore}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <button 
                            onClick={() => setShowShop(true)}
                            className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-2.5 rounded-xl text-sm font-bold transition-colors"
                        >
                            <Store size={16} /> 商城
                        </button>
                        <button 
                            onClick={() => setShowCraft(true)}
                            className="flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-600 py-2.5 rounded-xl text-sm font-bold transition-colors"
                        >
                            <Beaker size={16} /> 工坊
                        </button>
                        <button 
                            onClick={() => setShowBag(true)}
                            className="col-span-2 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-bold transition-colors"
                        >
                            <ShoppingBag size={16} /> 我的背包
                        </button>
                    </div>
                </div>

                <button 
                    onClick={onStart}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-5 rounded-3xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 text-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Play fill="currentColor" />
                    开始游戏
                </button>
            </div>
          )}
        </div>
      </div>

      {/* Bag Modal */}
      {showBag && localUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <ShoppingBag className="text-blue-500" /> 背包
                    </h3>
                    <button onClick={() => setShowBag(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {Object.keys(localUser.inventory).length === 0 ? (
                        <div className="text-center text-gray-400 py-8">
                            暂无物品，快去游戏中收集水果吧！
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
                            {Object.entries(localUser.inventory).map(([item, count]) => (
                                <div key={item} className="bg-gray-50 p-3 rounded-xl flex flex-col items-center border border-gray-100 relative">
                                    <div className="text-3xl mb-1">{item}</div>
                                    <div className="text-xs font-bold text-gray-600">x{count}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Shop Modal */}
      {showShop && localUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center bg-indigo-50">
                      <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-900">
                          <Store className="text-indigo-500" /> 道具商城
                      </h3>
                      <button onClick={() => setShowShop(false)} className="p-2 hover:bg-indigo-100 rounded-full transition-colors text-indigo-900"><X size={20} /></button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      {/* Hint Upgrade */}
                      <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-blue-200 transition-colors bg-white shadow-sm">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                                  <Lightbulb size={24} />
                              </div>
                              <div>
                                  <h4 className="font-bold text-gray-800">永久提示 +1</h4>
                                  <div className="text-xs text-gray-500">每局游戏初始提示增加</div>
                                  <div className="mt-1 text-xs font-bold text-purple-600 bg-purple-50 inline-block px-2 py-0.5 rounded">
                                      当前等级: {localUser.perks?.extraHints || 0}
                                  </div>
                              </div>
                          </div>
                          <button 
                              onClick={() => handleBuyUpgrade('extraHints', 500)}
                              className="flex flex-col items-center bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={localUser.coins < 500 * ((localUser.perks?.extraHints || 0) + 1)}
                          >
                              <div className="flex items-center gap-1">
                                  <Coins size={14} className="text-yellow-400" />
                                  {500 * ((localUser.perks?.extraHints || 0) + 1)}
                              </div>
                              <span className="text-[10px] opacity-80">购买</span>
                          </button>
                      </div>

                      {/* Shuffle Upgrade */}
                      <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-blue-200 transition-colors bg-white shadow-sm">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                                  <RefreshCw size={24} />
                              </div>
                              <div>
                                  <h4 className="font-bold text-gray-800">永久洗牌 +1</h4>
                                  <div className="text-xs text-gray-500">每局游戏初始洗牌增加</div>
                                  <div className="mt-1 text-xs font-bold text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded">
                                      当前等级: {localUser.perks?.extraShuffles || 0}
                                  </div>
                              </div>
                          </div>
                          <button 
                              onClick={() => handleBuyUpgrade('extraShuffles', 500)}
                              className="flex flex-col items-center bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={localUser.coins < 500 * ((localUser.perks?.extraShuffles || 0) + 1)}
                          >
                              <div className="flex items-center gap-1">
                                  <Coins size={14} className="text-yellow-400" />
                                  {500 * ((localUser.perks?.extraShuffles || 0) + 1)}
                              </div>
                              <span className="text-[10px] opacity-80">购买</span>
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Crafting / Juice Bar Modal */}
      {showCraft && localUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-6 border-b flex justify-between items-center bg-green-50">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-green-900">
                        <Beaker className="text-green-600" /> 果汁工坊
                    </h3>
                    <button onClick={() => setShowCraft(false)} className="p-2 hover:bg-green-100 rounded-full transition-colors text-green-900"><X size={20} /></button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {RECIPES.map(recipe => {
                            const affordable = canCraft(recipe);
                            const Icon = recipe.icon;
                            
                            return (
                                <div key={recipe.id} className={`p-4 rounded-2xl border transition-all relative ${affordable ? 'border-green-200 bg-green-50/30' : 'border-gray-100 bg-gray-50 opacity-80'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${affordable ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                                                <Icon size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800">{recipe.name}</h4>
                                                <div className="text-xs text-gray-500 leading-tight mt-0.5">{recipe.description}</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Cost Requirements */}
                                    <div className="flex flex-wrap gap-2 mt-3 mb-4">
                                        {Object.entries(recipe.costItems).map(([item, reqCount]) => {
                                            const has = localUser.inventory[item] || 0;
                                            const isEnough = has >= reqCount;
                                            return (
                                                <div key={item} className={`text-xs px-2 py-1 rounded-md border flex items-center gap-1 ${isEnough ? 'bg-white border-green-200 text-green-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                                                    <span className="text-base">{item}</span>
                                                    <span className="font-mono font-bold">{has}/{reqCount}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <button 
                                        onClick={() => handleCraft(recipe)}
                                        disabled={!affordable}
                                        className={`w-full py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${affordable ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                    >
                                        {affordable ? (
                                            <>
                                                <Check size={16} /> 制作
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle size={16} /> 材料不足
                                            </>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
