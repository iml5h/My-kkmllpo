import { useState, useCallback } from 'react';
import { StoreProvider, useStore } from '@/hooks/useStore';
import { loadAllTrades } from '@/lib/db';
import LoadingScreen from '@/components/LoadingScreen';
import BottomNav from '@/components/BottomNav';
import ToastContainer from '@/components/Toast';
import Lightbox from '@/components/Lightbox';
import TradeModal from '@/components/TradeModal';
import DayModal from '@/components/DayModal';
import ResetModal from '@/components/ResetModal';
import Dashboard from '@/pages/Dashboard';
import Trades from '@/pages/Trades';
import Report from '@/pages/Report';
import Settings from '@/pages/Settings';

function AppContent() {
  const { curPage, setAllTrades, loading, setLoading } = useStore();
  const [logoVisible, setLogoVisible] = useState(false);

  const handleLoadingComplete = useCallback(async () => {
    try {
      const all = await loadAllTrades();
      setAllTrades(all);
    } catch (e) {
      console.error('Failed to load trades:', e);
    }
    setLoading(false);
    // Show logo after loading
    setTimeout(() => setLogoVisible(true), 100);
  }, [setAllTrades, setLoading]);

  if (loading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  return (
    <>
      {/* Fixed Logo */}
      <div className={`app-logo${logoVisible ? ' visible' : ''}`}>
        <span className="logo-mark" id="lmark">&#9670;</span>
        <span className="logo-text">T-JOURNAL</span>
      </div>

      {/* Pages */}
      {curPage === 'dashboard' && <Dashboard />}
      {curPage === 'trades' && <Trades />}
      {curPage === 'report' && <Report />}
      {curPage === 'settings' && <Settings />}

      {/* Modals & Overlays */}
      <TradeModal />
      <DayModal />
      <ResetModal />
      <Lightbox />
      <ToastContainer />
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
