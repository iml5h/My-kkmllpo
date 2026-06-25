import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { loadNote, saveNote } from '@/lib/db';
import { calcStats, fmt } from '@/lib/utils';

export default function DayModal() {
  const {
    dayModalOpen, setDayModalOpen,
    dayModalTab, setDayModalTab,
    year, month, selDay,
    monthTrades,
    setTradeModalOpen, setEditingTradeId,
    addToast,
  } = useStore();

  const [noteText, setNoteText] = useState('');
  const [noteImages, setNoteImages] = useState<string[]>([]);

  // Load note when modal opens
  useEffect(() => {
    if (dayModalOpen && selDay !== null) {
      loadNote(year, month, selDay).then(note => {
        setNoteText(note.text || '');
        setNoteImages([...(note.images || [])]);
      });
      setDayModalTab('t');
    }
  }, [dayModalOpen, selDay, year, month, setDayModalTab]);

  const trades: import('@/types').Trade[] = selDay !== null ? (monthTrades[String(selDay)] || []) : [];
  const stats = calcStats(trades);

  const close = useCallback(() => {
    setDayModalOpen(false);
  }, [setDayModalOpen]);

  const saveNoteData = useCallback(async () => {
    if (selDay === null) return;
    await saveNote(year, month, selDay, { text: noteText, images: noteImages });
    addToast('Note saved \u2713', 's');
  }, [selDay, year, month, noteText, noteImages, addToast]);

  const addNoteImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      if (result) setNoteImages(prev => [...prev, result]);
    };
    reader.readAsDataURL(file);
  }, []);

  const removeNoteImage = useCallback((i: number) => {
    setNoteImages(prev => prev.filter((_, idx) => idx !== i));
  }, []);

  const openNew = useCallback(() => {
    setEditingTradeId(null);
    setTradeModalOpen(true);
    close();
  }, [setEditingTradeId, setTradeModalOpen, close]);

  const openEdit = useCallback((id: number) => {
    setEditingTradeId(id);
    setTradeModalOpen(true);
    close();
  }, [setEditingTradeId, setTradeModalOpen, close]);

  if (!dayModalOpen || selDay === null) return null;

  const date = new Date(year, month, selDay);
  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className={`day-modal${dayModalOpen ? ' open' : ''}`} onClick={close}>
      <div className="dm-card" onClick={e => e.stopPropagation()}>
        <div className="dm-head">
          <div className="dm-title-row">
            <div className="dm-title">{dateStr}</div>
            <button className="xbtn" onClick={close}>&#10005;</button>
          </div>
          <div className="dm-stats">
            <div className="dm-stat">
              <span className="dm-s-lbl">P&L</span>
              <span className="dm-s-val" style={{ color: stats.pnl > 0 ? 'var(--green)' : stats.pnl < 0 ? 'var(--red)' : 'var(--t3)' }}>
                {fmt(stats.pnl)}
              </span>
            </div>
            <div className="dm-stat">
              <span className="dm-s-lbl">Trades</span>
              <span className="dm-s-val">{stats.total}</span>
            </div>
            {stats.wr !== null && (
              <div className="dm-stat">
                <span className="dm-s-lbl">Win Rate</span>
                <span className="dm-s-val" style={{ color: stats.wr >= 50 ? 'var(--green)' : 'var(--red)' }}>
                  {stats.wr}%
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="dm-tabs">
          <button className={`dm-tab${dayModalTab === 't' ? ' on' : ''}`} onClick={() => setDayModalTab('t')}>Trades</button>
          <button className={`dm-tab${dayModalTab === 'n' ? ' on' : ''}`} onClick={() => setDayModalTab('n')}>&#128211; Notes</button>
        </div>

        <div className="dm-body">
          {dayModalTab === 't' ? (
            <div className="dm-trades">
              {trades.length === 0 ? (
                <div className="dm-empty">No trades yet.<br />Tap "Add Trade" to start.</div>
              ) : trades.map(t => {
                const pnl = parseFloat(t.pnl) || 0;
                const pc = pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--t3)';
                let rb: string, rl: string;
                if (t.result === 'be') { rb = 'bbe'; rl = 'B/E'; }
                else if (pnl > 0) { rb = 'bwin'; rl = 'WIN'; }
                else if (pnl < 0) { rb = 'blos'; rl = 'LOSS'; }
                else { rb = 'bbe'; rl = 'B/E'; }

                return (
                  <div key={t.id} className="dm-tcard" onClick={() => openEdit(t.id)} style={{ cursor: 'pointer' }}>
                    <div className="dm-tc-left">
                      <span className={`badge ${t.direction === 'sell' ? 'bsell' : 'bbuy'}`}>
                        {t.direction === 'sell' ? '\u25BC' : '\u25B2'} {t.pair || '\u2014'}
                      </span>
                      <span className={`badge ${rb}`}>{rl}</span>
                      {t.rrr && <span style={{ fontSize: '10px', color: 'var(--t3)' }}>RRR {t.rrr}</span>}
                    </div>
                    <span className="dm-tc-pnl" style={{ color: pc }}>{fmt(pnl)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="nbook">
              <textarea
                className="nbtxt"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="&#9997;&#65039; Daily plan, analysis, emotions, watchlist..."
              />
              <div className="nbimgs">
                {noteImages.map((img, i) => (
                  <div key={i} className="nbit">
                    <img src={img} alt="" />
                    <button className="nbrmv" onClick={() => removeNoteImage(i)}>&#10005;</button>
                  </div>
                ))}
                <label className="nbadd">
                  <span style={{ fontSize: '17px', opacity: 0.35 }}>+</span>
                  <span>Photo</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) addNoteImage(f);
                    e.target.value = '';
                  }} />
                </label>
              </div>
              <button className="nbsave" onClick={saveNoteData}>Save Note</button>
            </div>
          )}
        </div>

        {dayModalTab === 't' && (
          <div className="dm-foot">
            <button className="dm-add-btn" onClick={openNew}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Trade
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
