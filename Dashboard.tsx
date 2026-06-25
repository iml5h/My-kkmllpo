import { useEffect, useRef, useMemo } from 'react';
import { useStore } from '@/hooks/useStore';
import { loadMonthTrades, loadNote } from '@/lib/db';
import { calcStats, fmt } from '@/lib/utils';
import { DAYS_S } from '@/types';
import type { NoteData } from '@/types';
import Calendar from '@/components/Calendar';
import ChartWrapper from '@/components/charts/ChartWrapper';

/* ------------------------------------------------------------------ */
/*  Dashboard – premium UI + full data pipeline                       */
/*                                                                     */
/*  BUG FIX (critical): .qcard / .chart-card / .an-card / .an-full     */
/*  carry `opacity:0` by default in index.css and only become visible  */
/*  once `.visible` is added to THAT SAME element. The previous code   */
/*  only toggled `.visible` on the outer section wrappers, so every    */
/*  individual stat/chart card stayed invisible forever even though    */
/*  the underlying data (P&L, Win Rate, Profit Factor, Avg RRR, Equity */
/*  Curve, Analytics) was computing correctly the whole time. Fixed    */
/*  below with a proper per-card IntersectionObserver reveal.          */
/*                                                                     */
/*  STRUCTURAL FIX: removed a redundant local `allTrades` state that   */
/*  duplicated a full IndexedDB re-scan on every refresh. The global   */
/*  store already maintains a single source of truth for `allTrades`,  */
/*  kept in sync by TradeModal / Trades / Settings after every CRUD    */
/*  operation — Dashboard now simply reads it.                         */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const {
    year, month, setYear, setMonth,
    monthTrades, setMonthTrades,
    notes, setNotes,
    setSelDay, setDayModalOpen, setDayModalTab,
    allTrades,
    refresh,
  } = useStore();

  const rootRef     = useRef<HTMLDivElement>(null);
  const greetingRef = useRef<HTMLDivElement>(null);
  const statsRef    = useRef<HTMLDivElement>(null);

  /* ── stats (all-trades scope) ── */
  const stats = useMemo(() => calcStats(allTrades), [allTrades]);

  /* ═══════════════════════════════════════════════════════════════
     1.  LOAD MONTH TRADES  (calendar only)
     ═══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    loadMonthTrades(year, month).then((data) => {
      setMonthTrades(data);
      /* preload notes */
      const days = new Date(year, month + 1, 0).getDate();
      const noteBatch: Record<string, NoteData> = {};
      for (let d = 1; d <= days; d++) {
        const dayNum = d;
        loadNote(year, month, dayNum).then((note: NoteData) => {
          if (note.text || note.images.length) {
            noteBatch[String(dayNum)] = note;
            setNotes({ ...noteBatch });
          }
        });
      }
    });
  }, [year, month, setMonthTrades, setNotes, refresh]);

  /* ═══════════════════════════════════════════════════════════════
     2.  ENTRANCE ANIMATIONS — top-level sections that genuinely
         carry an `opacity:0` rule on themselves (greeting + stats
         list). Calendar manages its own internal reveal already.
     ═══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const t1 = window.setTimeout(() => greetingRef.current?.classList.add('visible'), 100);
    const t2 = window.setTimeout(() => statsRef.current?.classList.add('visible'), 220);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);

  /* ═══════════════════════════════════════════════════════════════
     3.  PER-CARD REVEAL  (the actual bug fix)
         Every .qcard / .chart-card / .an-card / .an-full element
         needs `.visible` added to ITSELF — not to a parent — before
         index.css will render it at opacity:1. Re-runs whenever the
         trade set changes, since conditional cards (Direction, Setup
         Performance, Mistake Cost) mount/unmount based on data.
     ═══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const cards = Array.from(
      root.querySelectorAll<HTMLElement>('.qcard, .chart-card, .an-card, .an-full')
    );
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const idx = cards.indexOf(el);
          window.setTimeout(() => el.classList.add('visible'), Math.max(0, idx % 4) * 60);
          observer.unobserve(el);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [allTrades]);

  /* ── handlers ── */
  const handleDayClick = (day: number) => {
    setSelDay(day);
    setDayModalTab('t');
    setDayModalOpen(true);
  };

  const handleMonthChange = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
    setNotes({});
  };

  /* ═══════════════════════════════════════════════════════════════
     4.  GREETING
     ═══════════════════════════════════════════════════════════════ */
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning \u2600'
    : hour < 17 ? 'Good afternoon \u26A1'
    : 'Good evening \u1F319';
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  /* ═══════════════════════════════════════════════════════════════
     5.  EQUITY CURVE DATA
     ═══════════════════════════════════════════════════════════════ */
  const equityData = useMemo(() => {
    if (!allTrades.length) return null;
    let cum = 0;
    const labels: string[] = [];
    const data: number[] = [];
    allTrades.forEach((t, i) => {
      cum += parseFloat(t.pnl) || 0;
      labels.push(String(i + 1));
      data.push(parseFloat(cum.toFixed(2)));
    });
    return { labels, data, cum };
  }, [allTrades]);

  /* ═══════════════════════════════════════════════════════════════
     6.  ANALYTICS DATA
     ═══════════════════════════════════════════════════════════════ */

  /* P&L by Day of Week */
  const dowData = useMemo(() => {
    const dow = new Array(7).fill(0);
    allTrades.forEach((t) => {
      const d = new Date(t.savedAt || Date.now()).getDay();
      dow[d] += parseFloat(t.pnl) || 0;
    });
    return {
      labels: DAYS_S,
      datasets: [{
        data: dow.map((v) => parseFloat(v.toFixed(2))),
        backgroundColor: dow.map((v) =>
          v >= 0 ? 'rgba(74,222,128,.65)' : 'rgba(248,113,113,.65)'
        ),
        borderRadius: 4,
      }],
    };
  }, [allTrades]);

  /* BUY vs SELL */
  const dirData = useMemo(() => {
    const buys = allTrades.filter((t) => t.direction === 'buy').length;
    const sells = allTrades.filter((t) => t.direction === 'sell').length;
    if (!buys && !sells) return null;
    return {
      labels: [`BUY (${buys})`, `SELL (${sells})`],
      datasets: [{
        data: [Math.max(buys, 0.01), Math.max(sells, 0.01)],
        backgroundColor: ['rgba(96,165,250,.7)', 'rgba(251,191,36,.7)'],
        borderWidth: 0,
      }],
    };
  }, [allTrades]);

  /* Setup / Tag Performance */
  const tagData = useMemo(() => {
    const tMap: Record<string, number> = {};
    allTrades.forEach((t) =>
      (t.tags || []).forEach((tg) => {
        if (!tMap[tg]) tMap[tg] = 0;
        tMap[tg] += parseFloat(t.pnl) || 0;
      })
    );
    const tS = Object.entries(tMap)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 6);
    if (!tS.length) return null;
    return {
      labels: tS.map(([t]) => t),
      datasets: [{
        data: tS.map(([, v]) => parseFloat(v.toFixed(2))),
        backgroundColor: tS.map(([, v]) =>
          v >= 0 ? 'rgba(74,222,128,.65)' : 'rgba(248,113,113,.65)'
        ),
        borderRadius: 4,
      }],
    };
  }, [allTrades]);

  /* Mistake Cost */
  const mistakeData = useMemo(() => {
    const mMap: Record<string, number> = {};
    allTrades.forEach((t) =>
      (t.mistakes || []).forEach((m) => {
        if (!mMap[m]) mMap[m] = 0;
        mMap[m] += parseFloat(t.pnl) || 0;
      })
    );
    const mS = Object.entries(mMap)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 6);
    if (!mS.length) return null;
    return {
      labels: mS.map(([m]) => m),
      datasets: [{
        data: mS.map(([, v]) => parseFloat(v.toFixed(2))),
        backgroundColor: mS.map(([, v]) =>
          v >= 0 ? 'rgba(74,222,128,.65)' : 'rgba(248,113,113,.65)'
        ),
        borderRadius: 4,
      }],
    };
  }, [allTrades]);

  /* ═══════════════════════════════════════════════════════════════
     7.  STATISTICS LIST
     ═══════════════════════════════════════════════════════════════ */
  const statItems = [
    { key: 'No. of Trades', val: String(stats.total) },
    { key: 'Total Lots', val: stats.lots },
    {
      key: 'Win Rate',
      val: stats.wr !== null ? `${stats.wr}%` : '\u2014',
      col: stats.wr !== null && stats.wr >= 50 ? 'var(--green)' : 'var(--red)',
    },
    {
      key: 'Best Trade',
      val: stats.best !== null && stats.best > 0 ? `$${stats.best.toFixed(2)}` : '\u2014',
      col: 'var(--green)',
    },
    {
      key: 'Average Win',
      val: stats.avgW !== null ? `$${stats.avgW.toFixed(2)}` : '\u2014',
      col: 'var(--green)',
    },
    {
      key: 'Average Loss',
      val: stats.avgL !== null ? `-$${stats.avgL.toFixed(2)}` : '\u2014',
      col: 'var(--red)',
    },
    { key: 'Average RRR', val: stats.avgRRR || '\u2014' },
    {
      key: 'Expectancy',
      val: stats.exp !== null ? `$${stats.exp.toFixed(2)}` : '\u2014',
      col: stats.exp !== null && stats.exp > 0 ? 'var(--green)' : 'var(--red)',
    },
    {
      key: 'Profit Factor',
      val: stats.pf || '\u2014',
      col:
        parseFloat(stats.pf || '0') >= 1.5
          ? 'var(--green)'
          : parseFloat(stats.pf || '0') >= 1
            ? 'var(--yellow)'
            : 'var(--red)',
    },
    { key: 'Gross Profit', val: `$${stats.gP.toFixed(2)}`, col: 'var(--green)' },
    { key: 'Gross Loss', val: `-$${stats.gL.toFixed(2)}`, col: 'var(--red)' },
    {
      key: 'Net P&L',
      val: fmt(stats.pnl),
      col: stats.pnl >= 0 ? 'var(--green)' : 'var(--red)',
    },
    ...(stats.streakType
      ? [{
          key: 'Current Streak',
          val: `${stats.streak} ${stats.streakType}`,
          col: stats.streakType === 'W' ? 'var(--green)' : 'var(--red)',
        }]
      : []),
  ];

  /* ═══════════════════════════════════════════════════════════════
     8.  RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="page on" id="pg-dashboard" ref={rootRef}>
      {/* ── Greeting ── */}
      <div className="greeting-area" ref={greetingRef}>
        <div className="greet-hi">{greeting}</div>
        <div className="greet-date">{dateStr}</div>
      </div>

      {/* ── Quick Stats (4 KPI cards) ── */}
      <div className="qstats">
        <div className="qcard tj-card">
          <div className="qc-lbl">Net P&L</div>
          <div
            className="qc-val"
            style={{ color: stats.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}
          >
            {fmt(stats.pnl)}
          </div>
          <div className="qc-sub">{stats.total} trades total</div>
        </div>

        <div className="qcard tj-card">
          <div className="qc-lbl">Win Rate</div>
          <div
            className="qc-val"
            style={{
              color: stats.wr !== null && stats.wr >= 50 ? 'var(--green)' : 'var(--red)',
            }}
          >
            {stats.wr !== null ? `${stats.wr}%` : '\u2014'}
          </div>
          <div className="qc-sub">{stats.wins}W / {stats.losses}L</div>
        </div>

        <div className="qcard tj-card">
          <div className="qc-lbl">Profit Factor</div>
          <div
            className="qc-val"
            style={{
              color:
                parseFloat(stats.pf || '0') >= 1.5
                  ? 'var(--green)'
                  : parseFloat(stats.pf || '0') >= 1
                    ? 'var(--yellow)'
                    : 'var(--red)',
            }}
          >
            {stats.pf || '\u2014'}
          </div>
          <div className="qc-sub">gross P &divide; gross L</div>
        </div>

        <div className="qcard tj-card">
          <div className="qc-lbl">Avg RRR</div>
          <div className="qc-val">{stats.avgRRR || '\u2014'}</div>
          <div className="qc-sub">on wins</div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* ── Equity Curve ── */}
        {equityData && (
          <div className="chart-card tj-card" style={{ marginTop: '16px' }}>
            <div className="cc-head">
              <span className="cc-title">Equity Curve</span>
              <span className="cc-sub">{allTrades.length} trades</span>
            </div>
            <div style={{ height: '180px' }}>
              <ChartWrapper
                id="eq-curve"
                type="line"
                data={{
                  labels: equityData.labels,
                  datasets: [{
                    data: equityData.data,
                    borderColor:
                      equityData.cum >= 0
                        ? 'rgba(240,192,64,.85)'
                        : 'rgba(248,113,113,.85)',
                    backgroundColor:
                      equityData.cum >= 0
                        ? 'rgba(240,192,64,.08)'
                        : 'rgba(248,113,113,.07)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    borderWidth: 2,
                  }],
                }}
                options={{
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { display: false },
                    y: { grid: { color: 'rgba(255,255,255,.04)' } },
                  },
                }}
                height="180px"
              />
            </div>
          </div>
        )}

        {/* ── Statistics ── */}
        <div className="stats-section" ref={statsRef}>
          <div className="section-lbl">Statistics</div>
          <div className="tj-card sl-list">
            {statItems.map((s, i) => (
              <div key={i} className="sl-item">
                <span className="sl-key">{s.key}</span>
                <span className="sl-val" style={s.col ? { color: s.col } : {}}>
                  {s.val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Calendar (manages its own entrance reveal internally) ── */}
        <Calendar
          year={year}
          month={month}
          trades={monthTrades}
          notes={notes}
          onDayClick={handleDayClick}
          onMonthChange={handleMonthChange}
        />

        {/* ── Analytics ── */}
        <div className="analytics-section">
          <div className="section-lbl">Analytics</div>

          <div className="an-grid">
            {/* P&L by Day */}
            <div className="an-card tj-card">
              <div className="an-title">P&L by Day</div>
              <div style={{ height: '130px' }}>
                <ChartWrapper id="dow-chart" type="bar" data={dowData} height="130px" />
              </div>
            </div>

            {/* Direction */}
            {dirData && (
              <div className="an-card tj-card">
                <div className="an-title">Direction</div>
                <div style={{ height: '130px' }}>
                  <ChartWrapper
                    id="dir-chart"
                    type="doughnut"
                    data={dirData}
                    options={{
                      cutout: '62%',
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            color: 'rgba(232,237,245,.35)',
                            font: { size: 9 },
                            padding: 8,
                          },
                        },
                      },
                    }}
                    height="130px"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Setup Performance */}
          {tagData && (
            <div className="an-full tj-card">
              <div className="an-title">Setup Performance</div>
              <div style={{ height: '140px' }}>
                <ChartWrapper
                  id="tag-chart"
                  type="bar"
                  data={tagData}
                  options={{ indexAxis: 'y' as const }}
                  height="140px"
                />
              </div>
            </div>
          )}

          {/* Mistake Cost */}
          {mistakeData && (
            <div className="an-full tj-card">
              <div className="an-title">Mistake Cost</div>
              <div style={{ height: '130px' }}>
                <ChartWrapper
                  id="mistake-chart"
                  type="bar"
                  data={mistakeData}
                  options={{ indexAxis: 'y' as const }}
                  height="130px"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
