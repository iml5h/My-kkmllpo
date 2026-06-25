import { useCallback, useEffect, useRef } from 'react';
import { MONTHS, DAYS_S } from '@/types';
import { dayStats, hasNote, fmtSmart, fmtFull } from '@/lib/utils';
import type { Trade } from '@/types';

interface Props {
  year: number;
  month: number;
  trades: Record<string, Trade[]>;
  notes: Record<string, { text: string; images: string[] }>;
  onDayClick: (day: number) => void;
  onMonthChange: (y: number, m: number) => void;
}

export default function Calendar({ year, month, trades, notes, onDayClick, onMonthChange }: Props) {
  const now = new Date();
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sectionRef.current) {
      sectionRef.current.classList.add('visible');
    }
  }, []);

  const prevMonth = useCallback(() => {
    if (month === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, month - 1);
  }, [year, month, onMonthChange]);

  const nextMonth = useCallback(() => {
    if (month === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, month + 1);
  }, [year, month, onMonthChange]);

  const totalDays = new Date(year, month + 1, 0).getDate();
  const offset = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="cal-section" ref={sectionRef}>
      <div className="cal-head">
        <div className="cal-title">{MONTHS[month]} {year}</div>
        <div className="cal-arrows">
          <button className="car-btn" onClick={prevMonth}>&#8249;</button>
          <button className="car-btn" onClick={nextMonth}>&#8250;</button>
        </div>
      </div>
      <div className="cal-grid">
        {DAYS_S.map(d => <div key={d} className="dlbl">{d}</div>)}
      </div>
      <div className="cal-grid" id="calgrid">
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} className="cal-cell-empty" />;

          const { count, pnl } = dayStats(String(d), trades);
          const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
          const note = hasNote(String(d), notes);

          let cls = 'cal-cell';
          if (isToday) cls += ' today';
          if (count > 0) cls += pnl > 0 ? ' pro' : pnl < 0 ? ' los' : ' eve';
          if (note) cls += ' has-note';

          const pnlColor = pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'rgba(255,255,255,.35)';

          return (
            <div
              key={d}
              className={cls}
              onClick={() => onDayClick(d)}
            >
              {/* Tooltip with exact unformatted value */}
              {count > 0 && (
                <div className="cal-tooltip">
                  {fmtFull(pnl)} &middot; {count} trade{count !== 1 ? 's' : ''}
                </div>
              )}
              <span className="cal-day-num">{d}</span>
              {count > 0 ? (
                <>
                  <span className="cal-day-pnl" style={{ color: pnlColor }}>
                    {fmtSmart(pnl)}
                  </span>
                  <span className="cal-day-count">{count}t</span>
                </>
              ) : (
                <span style={{ fontSize: '10px', opacity: 0.15 }}>&#8212;</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
