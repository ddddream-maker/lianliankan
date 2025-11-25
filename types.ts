
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  WON = 'WON', // Level Complete
  LOST = 'LOST', // Level Failed (Lives > 0)
  GAME_OVER = 'GAME_OVER' // Lives == 0
}

export interface Position {
  x: number;
  y: number;
}

export interface TileData {
  id: string; // Unique ID for React keys
  type: string; // Fruit type (Emoji char)
  x: number;
  y: number;
  isEmpty: boolean;
  isBlocker?: boolean; // If true, this is a permanent wall/gap in the pattern
}

export interface LevelConfig {
  level: number;
  rows: number;
  cols: number;
  totalTime: number; // in seconds
  targetScore: number;
  hints: number;
  shuffles: number;
}

export interface PathNode {
  x: number;
  y: number;
  turns: number;
  direction: 'none' | 'up' | 'down' | 'left' | 'right';
  parent?: PathNode;
}

export interface UserPerks {
  extraHints: number;
  extraShuffles: number;
}

export interface User {
  username: string;
  maxLevel: number;
  highScore: number; // Highest cumulative score in a single run
  coins: number;
  inventory: Record<string, number>; // Fruit type -> Count
  perks: UserPerks; // Permanent upgrades
}

export interface LeaderboardEntry {
    name: string;
    maxLevel: number;
    score: number;
    rank: number;
    avatar: string;
}

export interface Recipe {
    id: string;
    name: string;
    description: string;
    costItems: Record<string, number>; // e.g. { '🍎': 5, '🍌': 2 }
    rewardType: 'coin' | 'hint' | 'shuffle';
    rewardAmount: number;
    icon: any; // Icon name or component reference
}
