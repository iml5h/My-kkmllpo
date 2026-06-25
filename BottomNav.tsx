import { useStore } from '@/hooks/useStore';
import type { PageName } from '@/types';

const PAGES: { key: PageName; label: string; icon: React.ReactNode }[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/>
        <rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>
      </svg>
    ),
  },
  {
    key: 'trades',
    label: 'Trades',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="3" x2="8" y2="6"/><rect x="5" y="6" width="6" height="8" rx="1.5"/><line x1="8" y1="14" x2="8" y2="21"/>
        <line x1="16" y1="2" x2="16" y2="5"/><rect x="13" y="5" width="6" height="6" rx="1.5"/><line x1="16" y1="11" x2="16" y2="18"/>
      </svg>
    ),
  },
  {
    key: 'report',
    label: 'Report',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 20h18"/><rect x="5" y="10" width="3" height="10" rx="1"/><rect x="10.5" y="6" width="3" height="14" rx="1"/><rect x="16" y="13" width="3" height="7" rx="1"/>
        <path d="M6.5 8L12 5l5.5 6"/>
      </svg>
    ),
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line x1="4" y1="6" x2="20" y2="6"/><circle cx="14" cy="6" r="2.2" fill="currentColor" stroke="none"/>
        <line x1="4" y1="12" x2="20" y2="12"/><circle cx="8" cy="12" r="2.2" fill="currentColor" stroke="none"/>
        <line x1="4" y1="18" x2="20" y2="18"/><circle cx="15" cy="18" r="2.2" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const { curPage, setCurPage } = useStore();

  return (
    <nav className="bnav">
      {PAGES.map(p => (
        <button
          key={p.key}
          className={`nbtab${curPage === p.key ? ' on' : ''}`}
          onClick={() => setCurPage(p.key)}
        >
          <div className="ico-pill">{p.icon}</div>
          <span className="nb-lbl">{p.label}</span>
        </button>
      ))}
    </nav>
  );
}
