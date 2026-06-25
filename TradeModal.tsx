// ============================================================
// T-Journal Pro — Trade Modal (ADD/EDIT)
// CRITICAL FIX: Exit Image Upload — Consistent ID mapping
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { saveMonthTrades, loadAllTrades } from '@/lib/db';
import { calcStats, fileToBase64 } from '@/lib/utils';
import { MISTAKES_LIST, IMAGE_TYPE_CONFIG } from '@/types';
import type { Trade, TradeImageType } from '@/types';

export default function TradeModal() {
  const {
    tradeModalOpen, setTradeModalOpen,
    editingTradeId, setEditingTradeId,
    year, month, selDay,
    monthTrades, setMonthTrades,
    setAllTrades,
    formImages, setFormImages,
    formResult, setFormResult,
    formDirection, setFormDirection,
    formTags, setFormTags,
    formMistakes, setFormMistakes,
    addToast,
    triggerRefresh,
    setLightboxOpen, setLightboxSrc, setLightboxLabel,
  } = useStore();

  const [pair, setPair] = useState('XAUUSD');
  const [lot, setLot] = useState('');
  const [entry, setEntry] = useState('');
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const [rrr, setRrr] = useState('');
  const [pnl, setPnl] = useState('');
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [customMistake, setCustomMistake] = useState('');

  // Reset form
  const resetForm = useCallback(() => {
    setPair('XAUUSD');
    setLot('');
    setEntry('');
    setTp('');
    setSl('');
    setRrr('');
    setPnl('');
    setNotes('');
    setTagInput('');
    setCustomMistake('');
    setFormImages({ entry: null, during: null, exit: null });
    setFormResult('win');
    setFormDirection('buy');
    setFormTags([]);
    setFormMistakes([]);
  }, [setFormImages, setFormResult, setFormDirection, setFormTags, setFormMistakes]);

  // Load trade data for editing
  useEffect(() => {
    if (editingTradeId && selDay) {
      const list = monthTrades[String(selDay)] || [];
      const trade = list.find(t => t.id === editingTradeId);
      if (trade) {
        setPair(trade.pair || 'XAUUSD');
        setLot(trade.lot || '');
        setEntry(trade.entry || '');
        setTp(trade.tp || '');
        setSl(trade.sl || '');
        setRrr(trade.rrr || '');
        setPnl(trade.pnl || '');
        setNotes(trade.notes || '');
        setFormImages({
          entry: trade.images?.entry || null,
          during: trade.images?.during || null,
          exit: trade.images?.exit || null,
        });
        setFormResult(trade.result || 'win');
        setFormDirection(trade.direction || 'buy');
        setFormTags([...(trade.tags || [])]);
        setFormMistakes([...(trade.mistakes || [])]);
      }
    } else {
      resetForm();
    }
  }, [editingTradeId, selDay, monthTrades, setFormImages, setFormResult, setFormDirection, setFormTags, setFormMistakes, resetForm]);

  const close = useCallback(() => {
    setTradeModalOpen(false);
    setEditingTradeId(null);
  }, [setTradeModalOpen, setEditingTradeId]);

  // Auto RRR calculation
  const autoRRR = useCallback(() => {
    const e = parseFloat(entry);
    const t = parseFloat(tp);
    const s = parseFloat(sl);
    if (e && t && s && s !== e) {
      const reward = Math.abs(t - e);
      const risk = Math.abs(s - e);
      if (risk > 0) setRrr((reward / risk).toFixed(2));
    }
  }, [entry, tp, sl]);

  useEffect(() => { autoRRR(); }, [entry, tp, sl, autoRRR]);

  // Handle image upload — BUG FIX: consistent type-safe handling
  const handleImageUpload = useCallback(async (type: TradeImageType, file: File) => {
    try {
      const base64 = await fileToBase64(file);
      setFormImages({ ...formImages, [type]: base64 });
    } catch {
      addToast('Image upload failed', 'e');
    }
  }, [setFormImages, formImages, addToast]);

  const removeImage = useCallback((type: TradeImageType) => {
    setFormImages({ ...formImages, [type]: null });
  }, [setFormImages, formImages]);

  // Tag handling
  const addTag = useCallback(() => {
    const t = tagInput.trim().replace(/,/g, '');
    if (t && !formTags.includes(t)) {
      setFormTags([...formTags, t]);
    }
    setTagInput('');
  }, [tagInput, formTags, setFormTags]);

  const tagKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      addTag();
    }
    if (e.key === 'Backspace' && !tagInput && formTags.length) {
      setFormTags(formTags.slice(0, -1));
    }
  }, [tagInput, formTags, setFormTags, addTag]);

  // Mistake handling
  const toggleMistake = useCallback((m: string) => {
    if (formMistakes.includes(m)) {
      setFormMistakes(formMistakes.filter(x => x !== m));
    } else {
      setFormMistakes([...formMistakes, m]);
    }
  }, [formMistakes, setFormMistakes]);

  const addCustomMistake = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const v = customMistake.trim();
      if (v && !formMistakes.includes(v)) {
        setFormMistakes([...formMistakes, v]);
      }
      setCustomMistake('');
    }
  }, [customMistake, formMistakes, setFormMistakes]);

  // Stats preview
  const previewStats = (() => {
    const curP = parseFloat(pnl) || 0;
    const hypo: Record<string, Trade[]> = {};
    Object.entries(monthTrades).forEach(([k, v]) => {
      hypo[k] = (v || []).filter(t => t.id !== editingTradeId);
    });
    hypo['__cur'] = [{ pnl: String(curP), result: formResult } as Trade];
    return calcStats(Object.values(hypo).flat());
  })();

  const wrColor = previewStats.wr !== null && previewStats.wr >= 50 ? 'var(--green)' : 'var(--red)';
  const pfColor = parseFloat(previewStats.pf || '0') >= 1.5 ? 'var(--green)' : parseFloat(previewStats.pf || '0') >= 1 ? 'var(--yellow)' : 'var(--red)';

  // Save trade
  const saveTrade = useCallback(async () => {
    if (!selDay) { addToast('Select a day first', 'e'); return; }

    const trade: Trade = {
      id: editingTradeId || Date.now(),
      pair: pair || 'XAUUSD',
      lot,
      direction: formDirection,
      result: formResult,
      entry,
      tp,
      sl,
      rrr,
      pnl,
      tags: [...formTags],
      mistakes: [...formMistakes],
      notes,
      images: { ...formImages },
      savedAt: editingTradeId
        ? (monthTrades[String(selDay)]?.find(t => t.id === editingTradeId)?.savedAt || Date.now())
        : Date.now(),
    };

    const k = String(selDay);
    const list = monthTrades[k] || [];
    const idx = list.findIndex(t => t.id === editingTradeId);
    const newList = idx >= 0
      ? list.map((t, i) => i === idx ? trade : t)
      : [...list, trade];

    const updated = { ...monthTrades, [k]: newList };
    setMonthTrades(updated);
    await saveMonthTrades(year, month, updated);
    close();

    const all = await loadAllTrades();
    setAllTrades(all);

    addToast(editingTradeId ? 'Trade updated \u2713' : 'Trade saved \u2713', 's');
    triggerRefresh();
  }, [
    selDay, editingTradeId, pair, lot, formDirection, formResult,
    entry, tp, sl, rrr, pnl, formTags, formMistakes, notes, formImages,
    monthTrades, year, month, setMonthTrades, close, setAllTrades,
    addToast, triggerRefresh,
  ]);

  if (!tradeModalOpen) return null;

  return (
    <div className={`trade-ovl${tradeModalOpen ? ' open' : ''}`} onClick={close}>
      <div className="tmodal" onClick={e => e.stopPropagation()}>
        <div className="tm-head">
          <div className="tm-title">{editingTradeId ? 'Edit Trade' : 'Log Trade'}</div>
          <button className="xbtn" onClick={close}>&#10005;</button>
        </div>

        <div className="tm-body">
          {/* Stats Banner */}
          <div className="wrb" style={{ borderColor: previewStats.wr !== null && previewStats.wr >= 50 ? 'rgba(74,222,128,.26)' : 'rgba(248,113,113,.26)' }}>
            <div className="wrbg">
              <span className="wlbl">Win Rate</span>
              <span className="wval" style={{ color: wrColor, fontSize: '20px' }}>
                {previewStats.wr !== null ? `${previewStats.wr}%` : '\u2014'}
              </span>
            </div>
            <div className="wrbg" style={{ alignItems: 'flex-end' }}>
              <span className="wlbl">Profit Factor</span>
              <span className="wval" style={{ color: pfColor, fontSize: '16px' }}>
                {previewStats.pf || '\u2014'}
              </span>
            </div>
          </div>

          {/* Form Grid */}
          <div className="fgrid">
            <div className="fi">
              <span className="flbl">Pair</span>
              <input className="inp" value={pair} onChange={e => setPair(e.target.value)} placeholder="XAUUSD" />
            </div>
            <div className="fi">
              <span className="flbl">Lot Size</span>
              <input className="inp" value={lot} onChange={e => setLot(e.target.value)} type="number" placeholder="0.01" />
            </div>

            {/* Result Toggle */}
            <div className="fi full">
              <span className="flbl">Result</span>
              <div className="trow">
                <button className={`tbtn tw${formResult === 'win' ? ' on' : ''}`} onClick={() => setFormResult('win')}>&#10003; WIN</button>
                <button className={`tbtn tl${formResult === 'loss' ? ' on' : ''}`} onClick={() => setFormResult('loss')}>&#10007; LOSS</button>
                <button className={`tbtn tbe${formResult === 'be' ? ' on' : ''}`} onClick={() => setFormResult('be')}>&#126; B/E</button>
              </div>
            </div>

            {/* Direction Toggle */}
            <div className="fi full">
              <span className="flbl">Direction</span>
              <div className="trow">
                <button className={`tbtn tbu${formDirection === 'buy' ? ' on' : ''}`} onClick={() => setFormDirection('buy')}>&#9650; BUY</button>
                <button className={`tbtn tsl${formDirection === 'sell' ? ' on' : ''}`} onClick={() => setFormDirection('sell')}>&#9660; SELL</button>
              </div>
            </div>

            <div className="fi">
              <span className="flbl">Entry</span>
              <input className="inp" value={entry} onChange={e => setEntry(e.target.value)} type="number" placeholder="2320.50" />
            </div>
            <div className="fi">
              <span className="flbl">Take Profit</span>
              <input className="inp" value={tp} onChange={e => setTp(e.target.value)} type="number" placeholder="2340.00" />
            </div>
            <div className="fi">
              <span className="flbl">Stop Loss</span>
              <input className="inp" value={sl} onChange={e => setSl(e.target.value)} type="number" placeholder="2310.00" />
            </div>
            <div className="fi">
              <span className="flbl">RRR (auto)</span>
              <input className="inp inp-rrr" value={rrr} onChange={e => setRrr(e.target.value)} placeholder="Auto" readOnly />
            </div>

            {/* P&L */}
            <div className="fi full">
              <span className="flbl">P&amp;L ($)</span>
              <div className="pnlrow">
                <button
                  type="button"
                  className={`sgnbtn sgp${(parseFloat(pnl) || 0) >= 0 ? ' on' : ''}`}
                  onClick={() => setPnl(String(Math.abs(parseFloat(pnl) || 0)))}
                >+</button>
                <button
                  type="button"
                  className={`sgnbtn sgm${(parseFloat(pnl) || 0) < 0 ? ' on' : ''}`}
                  onClick={() => setPnl(String(-Math.abs(parseFloat(pnl) || 0)))}
                >&#8722;</button>
                <input className="inp" value={pnl} onChange={e => setPnl(e.target.value)} type="number" placeholder="150.00" style={{ flex: 1, minWidth: 0 }} />
              </div>
            </div>

            {/* Mistakes */}
            <div className="fi full">
              <span className="flbl">Mistakes</span>
              <div className="mgrid">
                {MISTAKES_LIST.map(m => (
                  <button
                    key={m}
                    className={`mbtn${formMistakes.includes(m) ? ' on' : ''}`}
                    onClick={() => toggleMistake(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <input
                className="inp"
                value={customMistake}
                onChange={e => setCustomMistake(e.target.value)}
                onKeyDown={addCustomMistake}
                placeholder="Custom mistake + Enter"
                style={{ marginTop: '5px' }}
              />
            </div>

            {/* Tags */}
            <div className="fi full">
              <span className="flbl">Tags</span>
              <div className="twrap" onClick={() => document.getElementById('tinp')?.focus()}>
                {formTags.map((tg, i) => (
                  <span key={tg} className="tchip">
                    {tg}
                    <button onClick={() => setFormTags(formTags.filter((_, idx) => idx !== i))}>&#215;</button>
                  </span>
                ))}
                <input
                  id="tinp"
                  className="tinp"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={tagKeyDown}
                  placeholder={formTags.length ? '' : 'Type & Enter...'}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="fi full">
              <span className="flbl">Notes</span>
              <textarea className="inp" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Setup, confluences, emotions..." />
            </div>
          </div>

          {/* Image Upload — entry / during / exit, each opens the shared
              full-screen Lightbox on click (BUG FIX: previously a no-op
              stub, so tapping any preview — including Exit — did nothing) */}
          <div className="isec">
            <div className="istitle">Chart Screenshots</div>
            <div className="iups">
              {( ['entry', 'during', 'exit'] as TradeImageType[] ).map(type => {
                const config = IMAGE_TYPE_CONFIG[type];
                const img = formImages[type];
                return (
                  <div className="ibox" key={type}>
                    <div className="iblbl" style={{ color: `var(${config.colorVar})` }}>{config.label}</div>
                    {img ? (
                      <div className="uprev">
                        <img
                          src={img}
                          onClick={() => {
                            setLightboxSrc(img);
                            setLightboxLabel(config.label);
                            setLightboxOpen(true);
                          }}
                          alt={`${config.label} screenshot`}
                          style={{ cursor: 'zoom-in' }}
                        />
                        <button className="urmv" onClick={() => removeImage(type)}>&#10005;</button>
                      </div>
                    ) : (
                      <label className="uarea">
                        <span className="uplus">+</span>
                        <small>Upload</small>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) handleImageUpload(type, f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="tm-foot">
          <button className="ccbtn" onClick={close}>Cancel</button>
          <button className="svbtn" onClick={saveTrade}>
            {editingTradeId ? 'Update Trade' : 'Save Trade'}
          </button>
        </div>
      </div>
    </div>
  );
}
