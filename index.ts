// ============================================================
// T-Journal Pro — Type Definitions
// ============================================================

export interface TradeImages {
  entry?: string | null;
  during?: string | null;
  exit?: string | null;
}

export interface Trade {
  id: number;
  pair: string;
  lot: string;
  direction: 'buy' | 'sell';
  result: 'win' | 'loss' | 'be';
  entry: string;
  tp: string;
  sl: string;
  rrr: string;
  pnl: string;
  tags: string[];
  mistakes: string[];
  notes: string;
  images: TradeImages;
  savedAt: number;
}

export interface NoteData {
  text: string;
  images: string[];
}

export interface DayStats {
  count: number;
  pnl: number;
}

export interface StatsResult {
  total: number;
  wins: number;
  losses: number;
  wr: number | null;
  pf: string | null;
  pnl: number;
  avgW: number | null;
  avgL: number | null;
  exp: number | null;
  avgRRR: string | null;
  gP: number;
  gL: number;
  lots: string;
  best: number | null;
  streak: number;
  streakType: 'W' | 'L' | null;
}

export type PageName = 'dashboard' | 'trades' | 'report' | 'settings';

export type TradeImageType = 'entry' | 'during' | 'exit';

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

export const MONTHS_S = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const;

export const DAYS_S = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export const MISTAKES_LIST = [
  'FOMO', 'Revenge Trade', 'No Setup', 'Broke Rules',
  'Oversize', 'Late Entry', 'Early Exit', 'Moved SL'
] as const;

export const IMAGE_TYPE_CONFIG: Record<TradeImageType, { label: string; colorVar: string }> = {
  entry: { label: 'Entry', colorVar: '--blue' },
  during: { label: 'During', colorVar: '--yellow' },
  exit: { label: 'Exit', colorVar: '--red' },
};
