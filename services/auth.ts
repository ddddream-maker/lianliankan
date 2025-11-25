import { User, LeaderboardEntry, UserPerks } from '../types';
import { auth, db, isCloudBaseConfigured } from './tcb';

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

export const loginUser = async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
  if (!isCloudBaseConfigured()) {
    return { success: false, message: 'CloudBase EnvID not configured' };
  }

  try {
    const email = username.includes('@') ? username : `${username}@fruitlink.com`;

    // Cast auth to any to avoid TS errors with SDK types
    const authInstance = auth as any;
    // CloudBase SDK v2 uses signInWithEmail for email/password login
    await authInstance.signInWithEmail(email, password);
    const currentUser = authInstance.currentUser;

    if (currentUser) {
      const res = await db.collection('users').doc(currentUser.uid).get();

      let userData;
      if (res.data && res.data.length > 0) {
        userData = res.data[0];
      } else {
        userData = {
          username: username,
          maxLevel: 1,
          highScore: 0,
          coins: 0,
          inventory: {},
          perks: { extraHints: 0, extraShuffles: 0 }
        };
        await db.collection('users').doc(currentUser.uid).set(userData);
      }

      const normalized = normalizeUser(userData);
      localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
      return { success: true, user: normalized };
    }
  } catch (e: any) {
    return { success: false, message: e.message || 'Login failed' };
  }
  return { success: false, message: 'Login failed' };
};

export const registerUser = async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
  if (!isCloudBaseConfigured()) {
    return { success: false, message: 'CloudBase EnvID not configured' };
  }

  try {
    const email = username.includes('@') ? username : `${username}@fruitlink.com`;

    const authInstance = auth as any;
    // CloudBase SDK v2 uses signUp for registration
    await authInstance.signUp(email, password);

    // Auto login after sign up
    await authInstance.signInWithEmail(email, password);
    const currentUser = authInstance.currentUser;

    if (currentUser) {
      const newUser = {
        username,
        maxLevel: 1,
        highScore: 0,
        coins: 0,
        inventory: {},
        perks: { extraHints: 0, extraShuffles: 0 }
      };

      await db.collection('users').doc(currentUser.uid).set(newUser);

      const safeUser = normalizeUser(newUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
      return { success: true, user: safeUser };
    }
  } catch (e: any) {
    return { success: false, message: e.message || 'Registration failed' };
  }
  return { success: false, message: 'Registration failed' };
};

export const logoutUser = async () => {
  if (isCloudBaseConfigured()) {
    const authInstance = auth as any;
    await authInstance.signOut();
  }
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  const str = localStorage.getItem(SESSION_KEY);
  return str ? JSON.parse(str) : null;
};

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

    const authInstance = auth as any;
    if (isCloudBaseConfigured() && authInstance.currentUser) {
      const uid = authInstance.currentUser.uid;
      const cmd = db.command as any;
      const updateData: any = {};

      if (stats.maxLevel) updateData.maxLevel = cmd.max(stats.maxLevel);
      if (stats.highScore) updateData.highScore = cmd.max(stats.highScore);
      if (stats.addCoins) updateData.coins = cmd.inc(stats.addCoins);
      if (stats.spendCoins) updateData.coins = cmd.inc(-stats.spendCoins);

      if (stats.addItems) {
        Object.entries(stats.addItems).forEach(([item, count]) => {
          updateData[`inventory.${item}`] = cmd.inc(Number(count));
        });
      }
      if (stats.upgradePerk) {
        updateData[`perks.${stats.upgradePerk}`] = cmd.inc(1);
      }

      db.collection('users').doc(uid).update(updateData).catch(console.error);
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
