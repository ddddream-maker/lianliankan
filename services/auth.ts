import { User, LeaderboardEntry, UserPerks } from '../types';
import { auth, db, app, isCloudBaseConfigured } from './tcb';

const SESSION_KEY = 'fruit_link_session_v3';

// Helper to normalize user object from CloudBase
const normalizeUser = (u: any): User => ({
  username: u.username || u.email?.split('@')[0] || 'User',
  maxLevel: u.maxLevel || 1,
  highScore: u.highScore || 0,
  coins: u.coins || 0,
  inventory: u.inventory || {},
  perks: u.perks || { extraHints: 0, extraShuffles: 0 }
});

// Helper to call the Cloud Function
const callAuthFunction = async (data: any) => {
  const res = await app.callFunction({
    name: 'user_auth',
    data
  });
  const result = res.result as any;
  if (result.code !== 0) {
    throw new Error(result.message || 'Operation failed');
  }
  return result.data;
};

export const loginUser = async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
  if (!isCloudBaseConfigured()) {
    return { success: false, message: 'CloudBase EnvID not configured' };
  }

  try {
    // Ensure we have a connection (Anonymous Login)
    const authInstance = auth as any;
    if (!authInstance.currentUser) {
      await authInstance.signInAnonymously();
    }

    // Call Cloud Function to Login
    const userData = await callAuthFunction({
      action: 'login',
      username,
      password
    });

    const normalized = normalizeUser(userData);
    localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    return { success: true, user: normalized };

  } catch (e: any) {
    return { success: false, message: e.message || 'Login failed' };
  }
};

export const registerUser = async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
  if (!isCloudBaseConfigured()) {
    return { success: false, message: 'CloudBase EnvID not configured' };
  }

  try {
    // Ensure connection
    const authInstance = auth as any;
    if (!authInstance.currentUser) {
      await authInstance.signInAnonymously();
    }

    // Call Cloud Function to Register
    const userData = await callAuthFunction({
      action: 'register',
      username,
      password
    });

    const safeUser = normalizeUser(userData);
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    return { success: true, user: safeUser };

  } catch (e: any) {
    return { success: false, message: e.message || 'Registration failed' };
  }
};

export const logoutUser = async () => {
  // We don't need to sign out of Anonymous auth, just clear local session
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
  const session = getCurrentUser();
  if (!session) return;

  // Update local session immediately for UI responsiveness
  let updated = false;
  if (stats.maxLevel && stats.maxLevel > session.maxLevel) { session.maxLevel = stats.maxLevel; updated = true; }
  if (stats.highScore && stats.highScore > session.highScore) { session.highScore = stats.highScore; updated = true; }
  if (stats.addCoins) { session.coins = (session.coins || 0) + stats.addCoins; updated = true; }
  if (stats.spendCoins) { session.coins = Math.max(0, (session.coins || 0) - stats.spendCoins); updated = true; }

  if (stats.addItems) {
    session.inventory = session.inventory || {};
    Object.entries(stats.addItems).forEach(([item, count]) => {
      session.inventory[item] = (session.inventory[item] || 0) + Number(count);
    });
    updated = true;
  }
  if (stats.upgradePerk) {
    session.perks = session.perks || { extraHints: 0, extraShuffles: 0 };
    session.perks[stats.upgradePerk] = (session.perks[stats.upgradePerk] || 0) + 1;
    updated = true;
  }

  if (updated) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Sync with CloudBase via Cloud Function
    if (isCloudBaseConfigured()) {
      try {
        await callAuthFunction({
          action: 'update',
          username, // Using username as key
          stats
        });
      } catch (e) {
        console.error('Failed to sync stats:', e);
      }
    }
  }
};

export const getGlobalLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  if (isCloudBaseConfigured()) {
    try {
      const res = await db.collection('users')
        .orderBy('maxLevel', 'desc')
        .orderBy('highScore', 'desc')
        .limit(10)
        .get();

      if (res.data) {
        return res.data.map((u: any, i: number) => ({
          name: u.username,
          maxLevel: u.maxLevel || 1,
          score: u.highScore || 0,
          rank: i + 1,
          avatar: '👤'
        }));
      }
    } catch (e) {
      console.error(e);
    }
  }
  return [];
};
