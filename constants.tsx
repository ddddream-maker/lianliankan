
import { LevelConfig } from './types';

// Bonus Config
export const COMBO_CONFIG = {
  WINDOW_MS: 3000, // 3 seconds to chain combo
  BASE_TIME_BONUS: 2, 
  COMBO_TIME_BONUS: 1, 
  COMBO_SCORE_BONUS: 50 
};

export const MATCH_SCORE = 100;
export const BOARD_PADDING = 1;
export const MAX_LIVES = 5;

// Dynamic Level Generator
export const getLevelConfig = (level: number): LevelConfig => {
  // Determine screen orientation for mobile optimization
  const isMobilePortrait = typeof window !== 'undefined' && window.innerWidth < 600;

  // Cycle logic: Levels 1-10 get harder, Level 11 resets difficulty slightly but keeps scaling
  const cycleIndex = (level - 1) % 10; // 0 to 9
  const cycleCount = Math.floor((level - 1) / 10); // 0, 1, 2...

  let baseCols, baseRows;

  if (isMobilePortrait) {
    // Mobile Strict Mode: Never exceed 7 columns
    // Growth based on cycleIndex
    baseCols = Math.min(4 + Math.floor(cycleIndex / 2), 7); 
    baseRows = Math.min(6 + Math.floor(cycleIndex / 1.5) + cycleCount, 12);
  } else {
    // Desktop:
    // Limit to 12 columns max to ensure it fits comfortably on most screens without horizontal scroll
    // Start at 6x5, grow to max 12x8
    baseCols = Math.min(6 + Math.floor(cycleIndex / 1.5) + Math.floor(cycleCount / 3), 12); 
    baseRows = Math.min(5 + Math.floor(cycleIndex / 1.5) + Math.floor(cycleCount / 3), 9);
  }

  const rows = baseRows;
  const cols = baseCols;

  const totalTiles = rows * cols;
  const pairs = totalTiles / 2;
  
  // Base score for clearing board (without combos)
  const clearScore = pairs * MATCH_SCORE;
  
  // Target Score logic
  let difficultyMult = 1.0 + (cycleCount * 0.1) + (cycleIndex * 0.05);
  const targetScore = Math.ceil((clearScore * difficultyMult) / 50) * 50;

  // Time: Base time + time per pair
  // Time gets slightly tighter as cycleIndex increases
  const timePerPair = Math.max(2.5, 8 - (cycleIndex * 0.3) - (cycleCount * 0.5)); 
  const totalTime = Math.floor(20 + (pairs * timePerPair));

  return {
    level,
    rows,
    cols,
    totalTime,
    targetScore,
    hints: Math.max(1, 3 - Math.floor(cycleIndex / 3)), 
    shuffles: Math.max(1, 3 - Math.floor(cycleIndex / 3))
  };
};

export const FRUIT_EMOJIS = [
  '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈',
  '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦',
  '🥬', '🥒', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯',
  '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓',
  '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆',
  '🌮', '🌯', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮',
  '🍡', '🥟', '🥠', '🥡', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂',
  '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯'
];
