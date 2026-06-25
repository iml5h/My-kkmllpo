import { useStore } from '@/hooks/useStore';
import { deleteAllData } from '@/lib/db';

export default function ResetModal() {
  const { resetModalOpen, setResetModalOpen, addToast, triggerRefresh, setMonthTrades, setAllTrades } = useStore();

  const close = () => setResetModalOpen(false);

  const doReset = async () => {
    try {
      await deleteAllData();
      setMonthTrades({});
      setAllTrades([]);
      close();
      triggerRefresh();
      addToast('All data deleted', 'i');
    } catch {
      addToast('Reset failed', 'e');
    }
  };

  if (!resetModalOpen) return null;

  return (
    <div className={`reset-ovl${resetModalOpen ? ' open' : ''}`} onClick={close}>
      <div className="reset-modal" onClick={e => e.stopPropagation()}>
        <div className="rm-title">&#128465; Reset All Data</div>
        <div className="rm-desc">
          This will <strong style={{ color: 'var(--red)' }}>permanently delete</strong> all your data.
          Consider exporting a backup first.
        </div>
        <div className="rm-opts">
          <button className="rm-btn rm-btn-del" onClick={doReset}>
            <span className="rm-ico">&#128465;</span>
            <div>
              <div>Delete Everything</div>
              <div style={{ fontSize: '10px', fontWeight: 400, opacity: 0.6, marginTop: '2px' }}>This cannot be undone</div>
            </div>
          </button>
          <button className="rm-btn rm-btn-cancel" onClick={close}>
            <span className="rm-ico">&#8617;</span>
            <div>Cancel</div>
          </button>
        </div>
      </div>
    </div>
  );
}
