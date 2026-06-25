import { useRef, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { exportAllData, importAllData, loadMonthTrades, loadAllTrades } from '@/lib/db';

export default function Settings() {
  const {
    year, month,
    setMonthTrades, setAllTrades,
    setResetModalOpen,
    addToast, triggerRefresh,
  } = useStore();

  const sectionRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => {
      sectionRef.current?.classList.add('visible');
      infoRef.current?.classList.add('visible');
    }, 50);
  }, []);

  const exportData = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tjournal-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Export successful \u2713', 's');
    } catch {
      addToast('Export failed', 'e');
    }
  };

  const importData = (inp: HTMLInputElement) => {
    const file = inp.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        await importAllData(data);
        const monthData = await loadMonthTrades(year, month);
        setMonthTrades(monthData);
        const all = await loadAllTrades();
        setAllTrades(all);
        triggerRefresh();
        addToast('Import successful \u2713', 's');
      } catch (err) {
        addToast('Import failed: ' + (err as Error).message, 'e');
      }
    };
    reader.readAsText(file);
    inp.value = '';
  };

  return (
    <div className="page on" id="pg-settings">
      <div className="page-content">
        <div className="set-greeting">Settings</div>
        <div className="set-sub">Manage your data and preferences</div>

        <div className="set-section" ref={sectionRef}>
          <div className="set-sec-lbl">Data</div>
          <div className="tj-card">
            <div className="set-item" onClick={exportData}>
              <div className="si-ico gold">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(240,192,64,.85)" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <div className="si-content"><div className="si-title">Export Data</div><div className="si-sub">Download backup JSON file</div></div>
              <div className="si-arrow">&#8250;</div>
            </div>

            <label className="set-item" style={{ cursor: 'pointer' }}>
              <div className="si-ico green">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,.85)" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div className="si-content"><div className="si-title">Import Data</div><div className="si-sub">Restore from backup JSON</div></div>
              <div className="si-arrow">&#8250;</div>
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => importData(e.target)} />
            </label>

            <div className="set-item" onClick={() => setResetModalOpen(true)}>
              <div className="si-ico red">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,.85)" strokeWidth="1.8" strokeLinecap="round">
                  <polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
              </div>
              <div className="si-content"><div className="si-title">Reset All Data</div><div className="si-sub">Delete everything permanently</div></div>
              <div className="si-arrow" style={{ color: 'var(--red)' }}>&#8250;</div>
            </div>
          </div>
        </div>

        <div className="set-info" ref={infoRef}>
          T-Journal Pro<br />
          Built for traders, by traders<br />
          <span style={{ color: 'var(--t4)' }}>Data stored locally in your browser</span>
        </div>
      </div>
    </div>
  );
}
