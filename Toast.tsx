import { useStore } from '@/hooks/useStore';

export default function ToastContainer() {
  const { toasts } = useStore();

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type === 's' ? 'success' : t.type === 'e' ? 'error' : 'info'}`}>
          <span>{t.type === 's' ? '\u2713' : t.type === 'e' ? '\u2717' : '\u25C6'}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
