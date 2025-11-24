import { User, Difficulty, LeaderboardEntry } from '../types';
import * as API from './api';

const DB_KEY = 'fruit_link_users_db_v2';
const SESSION_KEY = 'fruit_link_session_v2';

// --- LocalStorage Logic (Offline Mode) ---
const getLocalDb = () => {
  const str = localStorage.getItem(DB_KEY);
  return str ? JSON.parse(str) : [];
};

const saveLocalDb = (users: any[]) => {
  localStorage.setItem(DB_KEY, JSON.stringify(users));
};

// --- Hybrid Logic ---

// Variable to track online status during session
let isOnline = false;

// Check connection once on load
API.checkHealth().then(status => {
    isOnline = status;
    console.log(`Backend Server Status: ${isOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴 (Using LocalStorage)'}`);
});

export const loginUser = async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
  // Try Online First
  if (await API.checkHealth()) {
      try {
          const res = await API.apiLogin(username, password);
          if (res.success && res.user) {
              localStorage.setItem(SESSION_KEY, JSON.stringify(res.user));
              isOnline = true;
              return res;
          }
          return res;
      } catch (e) {
          isOnline = false;
      }
  }

  // Fallback to LocalStorage
  const users = getLocalDb();
  const user = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());

  if (user && user.passwordHash === password) {
    const safeUser = { username: user.username, records: user.records };
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    return { success: true, user: safeUser };
  }
  return { success: false, message: '账号或密码错误 (Offline Mode)' };
};

export const registerUser = async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
  // Try Online First
  if (await API.checkHealth()) {
      try {
          const res = await API.apiRegister(username, password);
          if (res.success && res.user) {
              localStorage.setItem(SESSION_KEY, JSON.stringify(res.user));
              isOnline = true;
              return res;
          }
          return res;
      } catch (e) {
          isOnline = false;
      }
  }

  // Fallback to LocalStorage
  const users = getLocalDb();
  if (users.some((u: any) => u.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, message: '该用户名已被注册' };
  }

  const newUser = {
    username,
    passwordHash: password,
    records: {}
  };

  users.push(newUser);
  saveLocalDb(users);
  
  const safeUser = { username: newUser.username, records: newUser.records };
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

export const updateUserScore = async (username: string, difficulty: Difficulty, newScore: number, timeUsed: number) => {
  // Always try to upload to server if online
  if (isOnline) {
      API.apiUpdateScore(username, difficulty, newScore, timeUsed);
  }

  // Always update local storage as backup/cache
  const users = getLocalDb();
  const userIndex = users.findIndex((u: any) => u.username === username);
  
  if (userIndex !== -1) {
    const user = users[userIndex];
    if (!user.records) user.records = {};
    const currentRecord = user.records[difficulty];
    let shouldUpdate = false;
    
    if (!currentRecord || newScore > currentRecord.score || (newScore === currentRecord.score && timeUsed < currentRecord.timeUsed)) {
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      user.records[difficulty] = { score: newScore, timeUsed };
      saveLocalDb(users);
      
      // Update session
      const session = getCurrentUser();
      if (session && session.username === username) {
        session.records = user.records;
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
    }
  }
};

// New function to fetch global leaderboard
export const getGlobalLeaderboard = async (difficulty: Difficulty = 'normal'): Promise<LeaderboardEntry[]> => {
    // 1. Try Server
    if (await API.checkHealth()) {
        const data = await API.apiGetLeaderboard(difficulty);
        if (data.length > 0) return data;
    }

    // 2. Fallback to generating local leaderboard from localStorage data
    // (In a real app, localStorage only has *current* user usually, but here we simulated a DB)
    const users = getLocalDb();
    const ranked = users
        .filter((u: any) => u.records && u.records[difficulty])
        .map((u: any) => ({
            name: u.username,
            score: u.records[difficulty].score,
            rank: 0,
            avatar: '👤'
        }))
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);
    
    return ranked.map((u: any, i: number) => ({ ...u, rank: i + 1 }));
};