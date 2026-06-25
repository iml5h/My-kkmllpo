import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { loadMonthTrades, dkeys } from '@/lib/db';
import { calcStats, fmt } from '@/lib/utils';
import { MONTHS_S } from '@/types';
import type { Trade } from '@/types';

type MonthMap = Record<string, Trade[]>;

/* ------------------------------------------------------------------ */
/*  Report – premium UI from P2 + full data pipeline from P1          */
/* ------------------------------------------------------------------ */

export default function Report() {
  const { year, month, refresh } = useStore();

  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selMonth, setSelMonth]   = useState(`${year}-${month}`);
  const [cmpMonth, setCmpMonth]   = useState('');
  const [data, setData]           = useState<MonthMap>({});
  const [cmpData, setCmpData]     = useState<MonthMap>({});
  const [loading, setLoading]     = useState(false);
  const contentRef                = useRef<HTMLDivElement>(null);

  /* ═══════════════════════════════════════════════════════════════
     1.  AVAILABLE MONTHS  (from all DB keys)
     ═══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    dkeys('months').then((keys) => {
      const allM = new Set([`${year}-${month}`]);
      keys.forEach((k) => {
        const s = String(k).replace('t:', '');
        if (s && s.includes('-')) allM.add(s);
      });
      const sorted = [...allM].sort().reverse();
      setAvailableMonths(sorted);
    });
  }, [year, month, refresh]);

  /* ═══════════════════════════════════════════════════════════════
     2.  LOAD SELECTED MONTH DATA
     ═══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!selMonth) return;
    setLoading(true);
    const [y, m] = selMonth.split('-').map(Number);
    loadMonthTrades(y, m)
      .then((d) => {
        if (d && typeof d === 'object' && !Array.isArray(d)) {
          setData(d as MonthMap);
        } else {
          setData({});
        }
      })
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, [selMonth, refresh]);

  /* ═══════════════════════════════════════════════════════════════
     3.  LOAD COMPARISON MONTH DATA
     ═══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!cmpMonth || cmpMonth === selMonth) {
      setCmpData({});
      return;
    }
    const [cy, cm] = cmpMonth.split('-').map(Number);
    loadMonthTrades(cy, cm)
      .then((d) => {
        if (d && typeof d === 'object' && !Array.isArray(d)) {
          setCmpData(d as MonthMap);
        } else {
          setCmpData({});
        }
      })
      .catch(() => setCmpData({}));
  }, [cmpMonth, selMonth, refresh]);

  /* ═══════════════════════════════════════════════════════════════
     4.  DERIVED STATS
     ═══════════════════════════════════════════════════════════════ */
  const stats  = useMemo(() => calcStats(Object.values(data).flat()),  [data]);
  const cmpS   = useMemo(() => calcStats(Object.values(cmpData).flat()), [cmpData]);

  const [sy, sm] = selMonth.split('-').map(Number);

  /* ── daily bars data ── */
  const days = new Date(sy, sm + 1, 0).getDate();
  const dp = useMemo(() => {
    const arr: { d: number; p: number }[] = [];
    let maxA = 0;
    for (let d = 1; d <= days; d++) {
      const dayTrades = data[String(d)] || [];
      const p = dayTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
      arr.push({ d, p });
      if (Math.abs(p) > maxA) maxA = Math.abs(p);
    }
    return { arr, maxA };
  }, [data, days]);

  /* ═══════════════════════════════════════════════════════════════
     5.  INSIGHTS  (P1 logic)
     ═══════════════════════════════════════════════════════════════ */
  const insights = useMemo(() => {
    const leaks: Array<{ i: string; t: string; d: string }> = [];
    const ins:   Array<{ i: string; t: string; d: string }> = [];

    if (stats.wr !== null && stats.wr < 40)
      leaks.push({
        i: '\uD83D\uDCC9',
        t: 'Low Win Rate',
        d: `Win rate is ${stats.wr}% — review entry criteria.`,
      });
    if (stats.pf && parseFloat(stats.pf) < 1)
      leaks.push({
        i: '\u26A0\uFE0F',
        t: 'Negative Profit Factor',
        d: `PF ${stats.pf} — losses exceed gains.`,
      });
    if (stats.losses > stats.wins && stats.total > 3)
      leaks.push({
        i: '\uD83D\uDD34',
        t: 'More Losses Than Wins',
        d: `${stats.losses}L vs ${stats.wins}W — tighten criteria.`,
      });
    if (stats.wr !== null && stats.wr >= 60)
      ins.push({
        i: '\u2705',
        t: 'Strong Win Rate',
        d: `${stats.wr}% — stay consistent.`,
      });
    if (parseFloat(stats.pf || '0') >= 2)
      ins.push({
        i: '\uD83C\uDFC6',
        t: 'Excellent Profit Factor',
        d: `PF ${stats.pf} — great risk management.`,
      });
    if (stats.avgRRR && parseFloat(stats.avgRRR) >= 3)
      ins.push({
        i: '\uD83C\uDFAF',
        t: 'Great RRR',
        d: `Avg ${stats.avgRRR} on wins.`,
      });

    return { leaks, ins };
  }, [stats]);

  /* ═══════════════════════════════════════════════════════════════
     ENTRANCE ANIMATION  (the actual bug fix)
     .rscard / .cpcard / .lkcard / .inscard all carry `opacity:0` by
     default in index.css and only render at opacity:1 once `.visible`
     is added to THAT SAME element. The previous code only toggled
     `.visible` on the outer `.page-content` wrapper, so every single
     stat card, comparison card and insight card stayed invisible
     forever — even though stats/comparison/insights were computed
     correctly the whole time. Fixed below by revealing each card
     directly, with a small stagger for a premium feel.
     ═══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    root.classList.add('visible');

    const cards = Array.from(
      root.querySelectorAll<HTMLElement>('.rscard, .cpcard, .lkcard, .inscard')
    );
    const timers = cards.map((el, i) =>
      window.setTimeout(() => el.classList.add('visible'), 40 + i * 45)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [selMonth, cmpMonth, data, cmpData, insights]);

  /* ═══════════════════════════════════════════════════════════════
     6.  HELPERS
     ═══════════════════════════════════════════════════════════════ */
  const sc = useCallback(
    (label: string, value: string, color: string, cls = '') => (
      <div className={`rscard tj-card ${cls}`}>
        <div className="rslbl">{label}</div>
        <div className="rsval" style={{ color }}>{value}</div>
      </div>
    ),
    []
  );

  /* ═══════════════════════════════════════════════════════════════
     7.  RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="page on" id="pg-report">
      <div className="page-content" ref={contentRef}>
        {/* ── Header ── */}
        <div className="rp-head">
          <div className="rp-title">Monthly Report</div>
          <div className="rp-ctrls">
            <select
              className="msel"
              value={selMonth}
              onChange={(e) => setSelMonth(e.target.value)}
            >
              {availableMonths.map((m) => {
                const [y2, mo] = m.split('-').map(Number);
                return (
                  <option key={m} value={m}>
                    {MONTHS_S[mo]} {y2}
                  </option>
                );
              })}
            </select>

            <select
              className="csel"
              value={cmpMonth}
              onChange={(e) => setCmpMonth(e.target.value)}
            >
              <option value="">vs...</option>
              {availableMonths.map((m) => {
                const [y2, mo] = m.split('-').map(Number);
                return (
                  <option key={m} value={m}>
                    {MONTHS_S[mo]} {y2}
                  </option>
                );
              })}
            </select>

            <button className="pdfbtn" onClick={() => window.print()}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              PDF
            </button>
          </div>
        </div>

        <div id="rpcontent">
          {/* ── Loading state ── */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)', fontSize: '12px' }}>
              Loading...
            </div>
          )}

          {/* ═══════════════ STATS GRID ═══════════════ */}
          <div className="rsgrid">
            {sc('Net P&L', fmt(stats.pnl), stats.pnl >= 0 ? 'var(--green)' : 'var(--red)', 'gld')}
            {sc(
              'Win Rate',
              stats.wr !== null ? `${stats.wr}%` : '\u2014',
              stats.wr !== null && stats.wr >= 50 ? 'var(--green)' : 'var(--red)'
            )}
            {sc(
              'Profit Factor',
              stats.pf || '\u2014',
              parseFloat(stats.pf || '0') >= 1.5
                ? 'var(--green)'
                : parseFloat(stats.pf || '0') >= 1
                  ? 'var(--yellow)'
                  : 'var(--red)'
            )}
            {sc(
              'Expectancy',
              stats.exp !== null ? `$${stats.exp.toFixed(2)}` : '\u2014',
              stats.exp !== null && stats.exp > 0 ? 'var(--green)' : 'var(--red)'
            )}
            {sc('Total Trades', String(stats.total), 'var(--t)')}
            {sc('Avg RRR', stats.avgRRR || '\u2014', 'var(--gold)')}
          </div>

          {/* ═══════════════ DAILY BARS ═══════════════ */}
          <div className="tj-card" style={{ padding: '16px', marginBottom: '16px' }}>
            <div className="stitle">
              Daily P&L &mdash; {MONTHS_S[sm]} {sy}
            </div>
            <div className="bars">
              {dp.arr.map(({ d, p }) => {
                if (p === 0) {
                  return (
                    <div className="bwrap" key={d}>
                      <div
                        className="bar"
                        style={{
                          height: '2px',
                          background: 'rgba(255,255,255,.06)',
                        }}
                        data-tip={`${d}: $0`}
                      />
                      <div className="barlbl">{d}</div>
                    </div>
                  );
                }
                const h = Math.max(4, Math.round((Math.abs(p) / dp.maxA) * 100));
                const col = p > 0 ? 'rgba(74,222,128,.65)' : 'rgba(248,113,113,.65)';
                return (
                  <div className="bwrap" key={d}>
                    <div
                      className="bar"
                      style={{ height: `${h}px`, background: col }}
                      data-tip={`${d}: ${fmt(p)}`}
                    />
                    <div className="barlbl">{d}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══════════════ COMPARISON ═══════════════ */}
          {cmpMonth && cmpMonth !== selMonth && (
            <div>
              <div className="stitle" style={{ marginBottom: '10px' }}>
                Comparison
              </div>
              <div className="cpgrid">
                {/* Selected month */}
                <div className="cpcard tj-card">
                  <div className="cpmonth">
                    {MONTHS_S[sm]} {sy}
                  </div>
                  <div className="cpstats">
                    <div className="cprow">
                      <span className="cpkey">Net P&L</span>
                      <span
                        className="cpval"
                        style={{
                          color: stats.pnl >= 0 ? 'var(--green)' : 'var(--red)',
                        }}
                      >
                        {fmt(stats.pnl)}
                      </span>
                    </div>
                    <div className="cprow">
                      <span className="cpkey">Win Rate</span>
                      <span
                        className="cpval"
                        style={{
                          color:
                            stats.wr !== null && stats.wr >= 50
                              ? 'var(--green)'
                              : 'var(--red)',
                        }}
                      >
                        {stats.wr !== null ? stats.wr + '%' : '\u2014'}
                      </span>
                    </div>
                    <div className="cprow">
                      <span className="cpkey">Profit Factor</span>
                      <span
                        className="cpval"
                        style={{
                          color:
                            parseFloat(stats.pf || '0') >= 1
                              ? 'var(--green)'
                              : 'var(--red)',
                        }}
                      >
                        {stats.pf || '\u2014'}
                      </span>
                    </div>
                    <div className="cprow">
                      <span className="cpkey">Trades</span>
                      <span className="cpval">{stats.total}</span>
                    </div>
                    <div className="cprow">
                      <span className="cpkey">Avg RRR</span>
                      <span className="cpval" style={{ color: 'var(--gold)' }}>
                        {stats.avgRRR || '\u2014'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Comparison month */}
                {cmpMonth && (
                  <div className="cpcard tj-card">
                    <div className="cpmonth">
                      {MONTHS_S[parseInt(cmpMonth.split('-')[1], 10)]}{' '}
                      {parseInt(cmpMonth.split('-')[0], 10)}
                    </div>
                    <div className="cpstats">
                      <div className="cprow">
                        <span className="cpkey">Net P&L</span>
                        <span
                          className="cpval"
                          style={{
                            color: cmpS.pnl >= 0 ? 'var(--green)' : 'var(--red)',
                          }}
                        >
                          {fmt(cmpS.pnl)}
                        </span>
                      </div>
                      <div className="cprow">
                        <span className="cpkey">Win Rate</span>
                        <span
                          className="cpval"
                          style={{
                            color:
                              cmpS.wr !== null && cmpS.wr >= 50
                                ? 'var(--green)'
                                : 'var(--red)',
                          }}
                        >
                          {cmpS.wr !== null ? cmpS.wr + '%' : '\u2014'}
                        </span>
                      </div>
                      <div className="cprow">
                        <span className="cpkey">Profit Factor</span>
                        <span
                          className="cpval"
                          style={{
                            color:
                              parseFloat(cmpS.pf || '0') >= 1
                                ? 'var(--green)'
                                : 'var(--red)',
                          }}
                        >
                          {cmpS.pf || '\u2014'}
                        </span>
                      </div>
                      <div className="cprow">
                        <span className="cpkey">Trades</span>
                        <span className="cpval">{cmpS.total}</span>
                      </div>
                      <div className="cprow">
                        <span className="cpkey">Avg RRR</span>
                        <span className="cpval" style={{ color: 'var(--gold)' }}>
                          {cmpS.avgRRR || '\u2014'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ INSIGHTS ═══════════════ */}
          {(insights.leaks.length > 0 || insights.ins.length > 0) && (
            <div style={{ marginTop: '4px' }}>
              <div className="stitle" style={{ marginBottom: '8px' }}>
                Insights
              </div>
              {insights.leaks.map((lk, i) => (
                <div key={`leak-${i}`} className="lkcard">
                  <span className="lkico">{lk.i}</span>
                  <div>
                    <div className="lktitle">{lk.t}</div>
                    <div className="lkdesc">{lk.d}</div>
                  </div>
                </div>
              ))}
              {insights.ins.map((insp, i) => (
                <div key={`ins-${i}`} className="inscard">
                  <span className="lkico">{insp.i}</span>
                  <div>
                    <div className="institle">{insp.t}</div>
                    <div className="lkdesc">{insp.d}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
