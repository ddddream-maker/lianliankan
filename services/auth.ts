
import { User, LeaderboardEntry, UserPerks } from '../types';
import * as API from './api';

const DB_KEY = 'fruit_link_users_v3';
const SESSION_KEY = 'fruit_link_session_v3';

let isOnline = false;

API.checkHealth().then(status => {
    isOnline = status;
    console.log(`Backend Status: ${status ? 'Online' : 'Offline'}`);
});

const getLocalDb = () => {
  const str = localStorage.getItem(DB_KEY);
  return str ? JSON.parse(str) : [];
};

const saveLocalDb = (users: any[]) => {
  localStorage.setItem(DB_KEY, JSON.stringify(users));
};

// Helper to normalize user object
const normalizeUser = (u: any): User => ({
    username: u.username,
    maxLevel: u.maxLevel || 1,
    highScore: u.highScore || 0,
    coins: u.coins || 0,
    inventory: u.inventory || {},
    perks: u.perks || { extraHints: 0, extraShuffles: 0 }
});

export const loginUser = async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
  if (isOnline) {
      try {
          const res = await API.apiLogin(username, password);
          if (res.success && res.user) {
              const normalized = normalizeUser(res.user);
              localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
              return { ...res, user: normalized };
          }
      } catch (e) {}
  }

  const users = getLocalDb();
  const user = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());

  if (user && user.passwordHash === password) {
    const safeUser = normalizeUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    return { success: true, user: safeUser };
  }
  return { success: false, message: '账号或密码错误 (Offline)' };
};

export const registerUser = async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
  if (isOnline) {
      try {
          const res = await API.apiRegister(username, password);
          if (res.success && res.user) {
              const normalized = normalizeUser(res.user);
              localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
              return { ...res, user: normalized };
          }
      } catch (e) {}
  }

  const users = getLocalDb();
  if (users.some((u: any) => u.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, message: '用户已存在' };
  }

  const newUser = {
    username,
    passwordHash: password,
    maxLevel: 1,
    highScore: 0,
    coins: 0,
    inventory: {},
    perks: { extraHints: 0, extraShuffles: 0 }
  };

  users.push(newUser);
  saveLocalDb(users);
  
  const safeUser = normalizeUser(newUser);
  localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
  
  return { success: true, user: safeUser };
};

export const logoutUser = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  const str = localStorage.getItem(SESSION_KEY);
  return str ? JSON.parse(str) : null;
};

// Update Score, Coins, Inventory AND Perks
export const updateUserStats = async (username: string, stats: { 
    maxLevel?: number, 
    highScore?: number, 
    addCoins?: number, 
    spendCoins?: number,
    addItems?: Record<string, number>,
    upgradePerk?: keyof UserPerks
}) => {
  const users = getLocalDb();
  const userIndex = users.findIndex((u: any) => u.username === username);
  
  if (userIndex !== -1) {
    const user = users[userIndex];
    // Ensure fields exist
    if (!user.maxLevel) user.maxLevel = 1;
    if (!user.highScore) user.highScore = 0;
    if (!user.coins) user.coins = 0;
    if (!user.inventory) user.inventory = {};
    if (!user.perks) user.perks = { extraHints: 0, extraShuffles: 0 };

    let updated = false;

    if (stats.maxLevel && stats.maxLevel > user.maxLevel) {
        user.maxLevel = stats.maxLevel;
        updated = true;
    }
    if (stats.highScore && stats.highScore > user.highScore) {
        user.highScore = stats.highScore;
        updated = true;
    }
    if (stats.addCoins) {
        user.coins += stats.addCoins;
        updated = true;
    }
    if (stats.spendCoins) {
        user.coins = Math.max(0, user.coins - stats.spendCoins);
        updated = true;
    }
    if (stats.addItems) {
        Object.entries(stats.addItems).forEach(([item, count]) => {
            const itemCount = count as number;
            user.inventory[item] = (user.inventory[item] || 0) + itemCount;
        });
        updated = true;
    }
    if (stats.upgradePerk) {
        user.perks[stats.upgradePerk] = (user.perks[stats.upgradePerk] || 0) + 1;
        updated = true;
    }

    if (updated) {
      saveLocalDb(users);
      // Update session if it matches
      const session = getCurrentUser();
      if (session && session.username === username) {
        session.maxLevel = user.maxLevel;
        session.highScore = user.highScore;
        session.coins = user.coins;
        session.inventory = user.inventory;
        session.perks = user.perks;
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
    }
  }
};

export const getGlobalLeaderboard = async (): Promise<LeaderboardEntry[]> => {
    const users = getLocalDb();
    const ranked = users
        .map((u: any) => ({
            name: u.username,
            maxLevel: u.maxLevel || 1,
            score: u.highScore || 0,
            rank: 0,
            avatar: '👤'
        }))
        .sort((a: any, b: any) => {
            if (b.maxLevel !== a.maxLevel) return b.maxLevel - a.maxLevel;
            return b.score - a.score;
        })
        .slice(0, 5);
    
    return ranked.map((u: any, i: number) => ({ ...u, rank: i + 1 }));
};
