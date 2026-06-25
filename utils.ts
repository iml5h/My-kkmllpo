// ============================================================
// T-Journal Pro — Core Utilities & Statistics Engine
// ============================================================

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Trade, StatsResult, DayStats, NoteData } from '@/types';

// shadcn compatibility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Smart Number Formatting ---
/**
 * Formats profit numbers with intelligent compaction:
 * 1,000+ → "1k", 10,000+ → "10k", 100,000+ → "100k", 1,000,000+ → "1M"
 * Used in calendar cells to prevent layout overflow.
 */
export function fmtSmart(n: number): string {
  const absVal = Math.abs(n);
  const sign = n >= 0 ? '+' : '-';
  if (absVal >= 1_000_000) {
    return `${sign}${(absVal / 1_000_000).toFixed(absVal % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (absVal >= 100_000) {
    return `${sign}${(absVal / 1_000).toFixed(0)}k`;
  }
  if (absVal >= 10_000) {
    return `${sign}${(absVal / 1_000).toFixed(0)}k`;
  }
  if (absVal >= 1_000) {
    return `${sign}${(absVal / 1_000).toFixed(1)}k`;
  }
  return `${sign}$${absVal.toFixed(2)}`;
}

/** Full format for tooltips and detailed views */
export function fmtFull(n: number): string {
  const a = Math.abs(n).toFixed(2);
  return n >= 0 ? `+$${a}` : `-$${a}`;
}

/** Primary format function (alias for fmtFull) */
export function fmt(n: number): string {
  return fmtFull(n);
}

export function fmtSimple(n: number): string {
  return n >= 0 ? `$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`;
}

// --- Statistics Engine ---
export function calcStats(arr: Trade[]): StatsResult {
  let wins = 0, losses = 0, gP = 0, gL = 0, rrs = 0, rrc = 0, lots = 0;
  arr.forEach(t => {
    const p = parseFloat(t.pnl) || 0;
    lots += parseFloat(t.lot || '0');
    if (p > 0) { wins++; gP += p; }
    else if (p < 0) { losses++; gL += Math.abs(p); }
    if (p > 0 && t.rrr) {
      const r = parseFloat(String(t.rrr).replace(/.*:/, ''));
      if (!isNaN(r) && r > 0) { rrs += r; rrc++; }
    }
  });
  const n = wins + losses;
  const wr = n > 0 ? Math.round(wins / n * 100) : null;
  const pf = gL > 0 ? (gP / gL).toFixed(2) : gP > 0 ? '\u221e' : null;
  const avgW = wins > 0 ? gP / wins : null;
  const avgL = losses > 0 ? gL / losses : null;
  const exp = (avgW !== null && avgL !== null && n > 0)
    ? ((wins / n) * avgW - (losses / n) * avgL)
    : null;
  const best = arr.length ? Math.max(...arr.map(t => parseFloat(t.pnl) || 0)) : null;
  const sorted = [...arr].sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
  let streak = 0, streakType: 'W' | 'L' | null = null;
  if (sorted.length) {
    const lp = parseFloat(sorted[sorted.length - 1].pnl) || 0;
    streakType = lp > 0 ? 'W' : lp < 0 ? 'L' : null;
    if (streakType) {
      for (let i = sorted.length - 1; i >= 0; i--) {
        const p = parseFloat(sorted[i].pnl) || 0;
        if ((streakType === 'W' && p > 0) || (streakType === 'L' && p < 0)) streak++;
        else break;
      }
    }
  }
  return {
    total: arr.length, wins, losses, wr, pf,
    pnl: arr.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0),
    avgW, avgL, exp, avgRRR: rrc > 0 ? (rrs / rrc).toFixed(2) : null,
    gP, gL, lots: lots.toFixed(2), best, streak, streakType
  };
}

export function dayStats(day: string, trades: Record<string, Trade[]>): DayStats {
  const ts = trades[day] || [];
  return { count: ts.length, pnl: ts.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0) };
}

export function hasNote(day: string, notes: Record<string, NoteData>): boolean {
  const n = notes[day];
  return !!(n && (n.text || (n.images && n.images.length > 0)));
}

// --- Chart Helpers ---
export const chartTextStyle = {
  color: 'rgba(232,237,245,.28)',
  font: { size: 9, family: "'DM Mono', 'Fira Code', Consolas, monospace" }
};
export const chartGridColor = 'rgba(255,255,255,.04)';

// --- File to Base64 ---
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
