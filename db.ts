// ============================================================
// T-Journal Pro — IndexedDB Persistence Layer
// ============================================================

import type { Trade, NoteData } from '@/types';

const DB_NAME = 'tjournal_pro_v1';
const DB_VERSION = 1;
const STORE_TRADES = 'months';
const STORE_NOTES = 'notes';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) { resolve(dbInstance); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_TRADES)) db.createObjectStore(STORE_TRADES);
      if (!db.objectStoreNames.contains(STORE_NOTES)) db.createObjectStore(STORE_NOTES);
    };
    req.onsuccess = (e) => { dbInstance = (e.target as IDBOpenDBRequest).result; resolve(dbInstance); };
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

function dbOp<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (objStore: IDBObjectStore, resolve: (v: T) => void, reject: (e: Event) => void) => void
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(store, mode);
      fn(tx.objectStore(store), resolve, reject);
      tx.onerror = (e) => reject(e);
    } catch (e) { reject(e); }
  });
}

const dkeys = (s: string): Promise<IDBValidKey[]> => dbOp(s, 'readonly', (st, res, rej) => {
  const q = st.getAllKeys();
  q.onsuccess = (e) => res((e.target as IDBRequest).result || []);
  q.onerror = rej;
});

// Export dbOp and dkeys for external use
export { dbOp, dkeys };

const mk = (y: number, m: number) => `t:${y}-${m}`;
const nk = (y: number, m: number, d: number) => `n:${y}-${m}-${d}`;

// --- Trade Operations ---
export async function loadMonthTrades(y: number, m: number): Promise<Record<string, Trade[]>> {
  try {
    const r = await dbOp<Record<string, Trade[]> | null>(STORE_TRADES, 'readonly', (st, res, rej) => {
      const q = st.get(mk(y, m));
      q.onsuccess = (e) => res((e.target as IDBRequest).result ?? null);
      q.onerror = rej;
    });
    if (!r || typeof r !== 'object' || Array.isArray(r)) return {};
    return r;
  } catch { return {}; }
}

export async function saveMonthTrades(y: number, m: number, data: Record<string, Trade[]>): Promise<void> {
  try {
    const ex = await loadMonthTrades(y, m);
    const hasNew = Object.values(data).some(a => a && a.length > 0);
    const hasOld = ex && Object.values(ex).some(a => a && a.length > 0);
    if (!hasNew && hasOld) return;
    await dbOp<void>(STORE_TRADES, 'readwrite', (st, res, rej) => {
      const q = st.put(data, mk(y, m));
      q.onsuccess = () => res();
      q.onerror = rej;
    });
  } catch { throw new Error('Failed to save trades'); }
}

export async function loadAllTrades(): Promise<Trade[]> {
  const keys = await dbOp<IDBValidKey[]>(STORE_TRADES, 'readonly', (st, res, rej) => {
    const q = st.getAllKeys();
    q.onsuccess = (e) => res((e.target as IDBRequest).result as IDBValidKey[]);
    q.onerror = rej;
  });
  const all: Trade[] = [];
  for (const k of keys) {
    const data = await dbOp<Record<string, Trade[]>>(STORE_TRADES, 'readonly', (st, res, rej) => {
      const q = st.get(k);
      q.onsuccess = (e) => res((e.target as IDBRequest).result ?? {});
      q.onerror = rej;
    });
    if (data && typeof data === 'object') {
      Object.values(data).forEach(ts => (ts || []).forEach(t => all.push(t)));
    }
  }
  all.sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
  return all;
}

// --- Note Operations ---
export async function loadNote(y: number, m: number, d: number): Promise<NoteData> {
  try {
    const r = await dbOp<NoteData | null>(STORE_NOTES, 'readonly', (st, res, rej) => {
      const q = st.get(nk(y, m, d));
      q.onsuccess = (e) => res((e.target as IDBRequest).result ?? null);
      q.onerror = rej;
    });
    return r || { text: '', images: [] };
  } catch { return { text: '', images: [] }; }
}

export async function saveNote(y: number, m: number, d: number, data: NoteData): Promise<void> {
  try {
    await dbOp<void>(STORE_NOTES, 'readwrite', (st, res, rej) => {
      const q = st.put(data, nk(y, m, d));
      q.onsuccess = () => res();
      q.onerror = rej;
    });
  } catch { throw new Error('Failed to save note'); }
}

// --- Import / Export ---
export async function exportAllData(): Promise<object> {
  const tk = await dbOp<IDBValidKey[]>(STORE_TRADES, 'readonly', (st, res, rej) => {
    const q = st.getAllKeys();
    q.onsuccess = (e) => res((e.target as IDBRequest).result as IDBValidKey[]);
    q.onerror = rej;
  });
  const nk2 = await dbOp<IDBValidKey[]>(STORE_NOTES, 'readonly', (st, res, rej) => {
    const q = st.getAllKeys();
    q.onsuccess = (e) => res((e.target as IDBRequest).result as IDBValidKey[]);
    q.onerror = rej;
  });
  const dump: Record<string, Record<string, unknown>> = { trades: {}, notes: {} };
  for (const k of tk) dump.trades[String(k)] = await dbOp(STORE_TRADES, 'readonly', (st, res, rej) => {
    const q = st.get(k);
    q.onsuccess = (e) => res((e.target as IDBRequest).result);
    q.onerror = rej;
  });
  for (const k of nk2) dump.notes[String(k)] = await dbOp(STORE_NOTES, 'readonly', (st, res, rej) => {
    const q = st.get(k);
    q.onsuccess = (e) => res((e.target as IDBRequest).result);
    q.onerror = rej;
  });
  return dump;
}

export async function importAllData(dump: { trades?: Record<string, unknown>; notes?: Record<string, unknown> }): Promise<void> {
  const trades = dump.trades || dump;
  const notes = dump.notes || {};
  for (const [k, v] of Object.entries(trades)) {
    await dbOp<void>(STORE_TRADES, 'readwrite', (st, res, rej) => {
      const q = st.put(v, k);
      q.onsuccess = () => res();
      q.onerror = rej;
    });
  }
  for (const [k, v] of Object.entries(notes)) {
    await dbOp<void>(STORE_NOTES, 'readwrite', (st, res, rej) => {
      const q = st.put(v, k);
      q.onsuccess = () => res();
      q.onerror = rej;
    });
  }
}

export async function deleteAllData(): Promise<void> {
  const tk = await dbOp<IDBValidKey[]>(STORE_TRADES, 'readonly', (st, res, rej) => {
    const q = st.getAllKeys();
    q.onsuccess = (e) => res((e.target as IDBRequest).result as IDBValidKey[]);
    q.onerror = rej;
  });
  const nk2 = await dbOp<IDBValidKey[]>(STORE_NOTES, 'readonly', (st, res, rej) => {
    const q = st.getAllKeys();
    q.onsuccess = (e) => res((e.target as IDBRequest).result as IDBValidKey[]);
    q.onerror = rej;
  });
  for (const k of tk) {
    await dbOp<void>(STORE_TRADES, 'readwrite', (st, res, rej) => {
      const q = st.delete(k);
      q.onsuccess = () => res();
      q.onerror = rej;
    });
  }
  for (const k of nk2) {
    await dbOp<void>(STORE_NOTES, 'readwrite', (st, res, rej) => {
      const q = st.delete(k);
      q.onsuccess = () => res();
      q.onerror = rej;
    });
  }
}
