// ============================================================
// T-Journal Pro — Central State Management (React Context)
// ============================================================

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Trade, NoteData, PageName, TradeImages } from '@/types';

interface AppState {
  // Navigation
  curPage: PageName;
  setCurPage: (p: PageName) => void;

  // Date
  year: number;
  month: number;
  setYear: (y: number) => void;
  setMonth: (m: number) => void;

  // Trades for current month
  monthTrades: Record<string, Trade[]>;
  setMonthTrades: (t: Record<string, Trade[]>) => void;

  // All trades
  allTrades: Trade[];
  setAllTrades: (t: Trade[]) => void;

  // Selected day
  selDay: number | null;
  setSelDay: (d: number | null) => void;

  // Notes
  notes: Record<string, NoteData>;
  setNotes: (n: Record<string, NoteData>) => void;

  // Trade Modal
  tradeModalOpen: boolean;
  setTradeModalOpen: (v: boolean) => void;
  editingTradeId: number | null;
  setEditingTradeId: (id: number | null) => void;

  // Day Modal
  dayModalOpen: boolean;
  setDayModalOpen: (v: boolean) => void;
  dayModalTab: 't' | 'n';
  setDayModalTab: (t: 't' | 'n') => void;

  // Reset Modal
  resetModalOpen: boolean;
  setResetModalOpen: (v: boolean) => void;

  // Lightbox
  lightboxOpen: boolean;
  setLightboxOpen: (v: boolean) => void;
  lightboxSrc: string;
  setLightboxSrc: (s: string) => void;
  lightboxLabel: string;
  setLightboxLabel: (s: string) => void;

  // Loading
  loading: boolean;
  setLoading: (v: boolean) => void;

  // Force refresh
  refresh: number;
  triggerRefresh: () => void;

  // Current trade form state
  formImages: TradeImages;
  setFormImages: (i: TradeImages) => void;
  formResult: 'win' | 'loss' | 'be';
  setFormResult: (r: 'win' | 'loss' | 'be') => void;
  formDirection: 'buy' | 'sell';
  setFormDirection: (d: 'buy' | 'sell') => void;
  formTags: string[];
  setFormTags: (t: string[]) => void;
  formMistakes: string[];
  setFormMistakes: (m: string[]) => void;

  // Toast
  toasts: Array<{ id: number; msg: string; type: 's' | 'e' | 'i' }>;
  addToast: (msg: string, type?: 's' | 'e' | 'i') => void;
  removeToast: (id: number) => void;
}

const StoreContext = createContext<AppState | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const now = new Date();

  const [curPage, setCurPage] = useState<PageName>('dashboard');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [monthTrades, setMonthTrades] = useState<Record<string, Trade[]>>({});
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [selDay, setSelDay] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<string, NoteData>>({});

  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [editingTradeId, setEditingTradeId] = useState<number | null>(null);

  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayModalTab, setDayModalTab] = useState<'t' | 'n'>('t');

  const [resetModalOpen, setResetModalOpen] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [lightboxLabel, setLightboxLabel] = useState('');

  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const [formImages, setFormImages] = useState<TradeImages>({ entry: null, during: null, exit: null });
  const [formResult, setFormResult] = useState<'win' | 'loss' | 'be'>('win');
  const [formDirection, setFormDirection] = useState<'buy' | 'sell'>('buy');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formMistakes, setFormMistakes] = useState<string[]>([]);

  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; type: 's' | 'e' | 'i' }>>([]);

  const triggerRefresh = useCallback(() => setRefresh(r => r + 1), []);

  const addToast = useCallback((msg: string, type: 's' | 'e' | 'i' = 'i') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2800);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <StoreContext.Provider value={{
      curPage, setCurPage,
      year, setYear,
      month, setMonth,
      monthTrades, setMonthTrades,
      allTrades, setAllTrades,
      selDay, setSelDay,
      notes, setNotes,
      tradeModalOpen, setTradeModalOpen,
      editingTradeId, setEditingTradeId,
      dayModalOpen, setDayModalOpen,
      dayModalTab, setDayModalTab,
      resetModalOpen, setResetModalOpen,
      lightboxOpen, setLightboxOpen,
      lightboxSrc, setLightboxSrc,
      lightboxLabel, setLightboxLabel,
      loading, setLoading,
      refresh, triggerRefresh,
      formImages, setFormImages,
      formResult, setFormResult,
      formDirection, setFormDirection,
      formTags, setFormTags,
      formMistakes, setFormMistakes,
      toasts, addToast, removeToast,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): AppState {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
