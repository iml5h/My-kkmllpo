import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { loadMonthTrades, saveMonthTrades, loadAllTrades } from '@/lib/db';
import { fmt } from '@/lib/utils';

export default function Trades() {
  const {
    year, month,
    monthTrades, setMonthTrades,
    setAllTrades,
    setSelDay, setEditingTradeId, setTradeModalOpen,
    setLightboxOpen, setLightboxSrc, setLightboxLabel,
    addToast, refresh,
  } = useStore();

  const [fDir, setFDir] = useState('all');
  const [fRes, setFRes] = useState('all');
  const [fPair, setFPair] = useState('');
  const [openCards, setOpenCards] = useState<Set<number>>(new Set());
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMonthTrades(year, month).then(setMonthTrades);
  }, [year, month, setMonthTrades, refresh]);

  useEffect(() => {
    if (sectionRef.current) sectionRef.current.classList.add('visible');
  }, []);

  const filtered = useMemo(() => {
    const all = Object.entries(monthTrades).flatMap(([day, ts]) =>
      (ts || []).map(t => ({ ...t, _day: Number(day) }))
    );
    return all.filter(t => {
      if (fDir !== 'all' && t.direction !== fDir) return false;
      const pnl = parseFloat(t.pnl) || 0;
      if (fRes === 'win' && pnl <= 0) return false;
      if (fRes === 'loss' && pnl >= 0) return false;
      if (fRes === 'be' && pnl !== 0) return false;
      if (fPair && !(t.pair || '').toLowerCase().includes(fPair.toLowerCase())) return false;
      return true;
    }).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  }, [monthTrades, fDir, fRes, fPair]);

  const toggleCard = useCallback((id: number) => {
    setOpenCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const editTrade = useCallback((id: number, day: number) => {
    setSelDay(day);
    setEditingTradeId(id);
    setTradeModalOpen(true);
  }, [setSelDay, setEditingTradeId, setTradeModalOpen]);

  const deleteTrade = useCallback(async (id: number, day: number) => {
    if (!confirm('Delete this trade?')) return;
    const k = String(day);
    const updated = { ...monthTrades, [k]: (monthTrades[k] || []).filter(t => t.id !== id) };
    setMonthTrades(updated);
    await saveMonthTrades(year, month, updated);
    const all = await loadAllTrades();
    setAllTrades(all);
    addToast('Deleted', 'i');
  }, [monthTrades, year, month, setMonthTrades, setAllTrades, addToast]);

  const openLightbox = useCallback((src: string, label: string) => {
    setLightboxSrc(src);
    setLightboxLabel(label);
    setLightboxOpen(true);
  }, [setLightboxSrc, setLightboxLabel, setLightboxOpen]);

  return (
    <div className="page on" id="pg-trades">
      <div className="page-content" ref={sectionRef}>
        <div className="section-lbl" style={{ marginBottom: '12px' }}>All Trades</div>

        <div className="tp-filter">
          <select className="fsel" value={fDir} onChange={e => setFDir(e.target.value)}>
            <option value="all">All Directions</option>
            <option value="buy">&#9650; BUY</option>
            <option value="sell">&#9660; SELL</option>
          </select>
          <select className="fsel" value={fRes} onChange={e => setFRes(e.target.value)}>
            <option value="all">All Results</option>
            <option value="win">WIN</option>
            <option value="loss">LOSS</option>
            <option value="be">B/E</option>
          </select>
          <input className="finp" value={fPair} onChange={e => setFPair(e.target.value)} placeholder="Search pair..." />
          <button className="fclear" onClick={() => { setFDir('all'); setFRes('all'); setFPair(''); }}>Clear</button>
          <span className="tcnt">{filtered.length} trade{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="tcard-list">
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)', fontSize: '13px' }}>No trades match filters</div>
          )}
          {filtered.map(t => {
            const pnl = parseFloat(t.pnl) || 0;
            const pc = pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--t3)';
            let rb: string, rl: string;
            if (t.result === 'be') { rb = 'bbe'; rl = 'B/E'; }
            else if (pnl > 0) { rb = 'bwin'; rl = 'WIN'; }
            else if (pnl < 0) { rb = 'blos'; rl = 'LOSS'; }
            else { rb = 'bbe'; rl = 'B/E'; }
            const d = t.savedAt ? new Date(t.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';
            const isOpen = openCards.has(t.id);

            // BUG FIX: Safe image access with proper null checking
            const images = t.images || {};
            const imageEntries = (['entry', 'during', 'exit'] as const)
              .filter(key => {
                const val = images[key];
                return val !== null && val !== undefined && val !== '';
              })
              .map(key => ({ key, src: images[key]!, label: key.charAt(0).toUpperCase() + key.slice(1) }));

            return (
              <div
                key={t.id}
                className="tcard"
                style={{ borderLeft: `3px solid ${pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'rgba(255,255,255,.1)'}` }}
              >
                <div className="tcard-top" onClick={() => toggleCard(t.id)}>
                  <div className="tc-left">
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t)' }}>{t.pair || '\u2014'}</span>
                    <span className={`badge ${t.direction === 'sell' ? 'bsell' : 'bbuy'}`}>
                      {t.direction === 'sell' ? '\u25BC SELL' : '\u25B2 BUY'}
                    </span>
                    <span className={`badge ${rb}`}>{rl}</span>
                    <span style={{ fontSize: '10px', color: 'var(--t3)' }}>{d}</span>
                  </div>
                  <div className="tc-right">
                    <span className="tc-pnl" style={{ color: pc }}>{fmt(pnl)}</span>
                    <span className={`chev${isOpen ? ' open' : ''}`}>&#9662;</span>
                  </div>
                </div>

                <div className={`tcard-body${isOpen ? ' open' : ''}`}>
                  <div className="td-grid">
                    <div className="kv"><span className="kk">Direction</span><span className="kv2" style={{ color: t.direction === 'sell' ? 'var(--yellow)' : 'var(--blue)' }}>{t.direction === 'sell' ? 'SELL' : 'BUY'}</span></div>
                    <div className="kv"><span className="kk">Entry</span><span className="kv2">{t.entry || '\u2014'}</span></div>
                    <div className="kv"><span className="kk">TP</span><span className="kv2">{t.tp || '\u2014'}</span></div>
                    <div className="kv"><span className="kk">SL</span><span className="kv2">{t.sl || '\u2014'}</span></div>
                    <div className="kv"><span className="kk">RRR</span><span className="kv2">{t.rrr || '\u2014'}</span></div>
                    <div className="kv"><span className="kk">Lot</span><span className="kv2">{t.lot || '\u2014'}</span></div>
                  </div>

                  {t.notes && <div className="td-notes">{t.notes}</div>}

                  {t.tags && t.tags.length > 0 && (
                    <div className="td-chips">{t.tags.map(tg => <span key={tg} className="ctag">{tg}</span>)}</div>
                  )}

                  {t.mistakes && t.mistakes.length > 0 && (
                    <div className="td-chips" style={{ marginTop: '4px' }}>
                      {t.mistakes.map(m => <span key={m} className="cmbadge">{m}</span>)}
                    </div>
                  )}

                  {/* BUG FIX: Proper image gallery with lightbox */}
                  {imageEntries.length > 0 && (
                    <div className="td-imgs">
                      {imageEntries.map(({ key, src, label }) => (
                        <div key={key} className="td-img-thumb">
                          <span className="td-img-lbl">{label}</span>
                          <img
                            src={src}
                            alt={`${label} screenshot`}
                            loading="lazy"
                            onClick={(e) => { e.stopPropagation(); openLightbox(src, label); }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="td-acts">
                    <button className="edbtn" onClick={() => editTrade(t.id, t._day)}>Edit</button>
                    <button className="dlbtn" onClick={() => deleteTrade(t.id, t._day)}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
