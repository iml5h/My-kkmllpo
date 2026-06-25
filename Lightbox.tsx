import { useEffect, useCallback } from 'react';
import { useStore } from '@/hooks/useStore';

export default function Lightbox() {
  const { lightboxOpen, lightboxSrc, lightboxLabel, setLightboxOpen } = useStore();

  const close = useCallback(() => {
    setLightboxOpen(false);
  }, [setLightboxOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxOpen) close();
    };
    window.addEventListener('keydown', onKey);
    if (lightboxOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [lightboxOpen, close]);

  if (!lightboxOpen) return null;

  return (
    <div className={`lightbox${lightboxOpen ? ' open' : ''}`} onClick={close}>
      <button className="lightbox-close" onClick={close}>&#10005;</button>
      <div onClick={e => e.stopPropagation()}>
        <img
          className="lightbox-img"
          src={lightboxSrc}
          alt={lightboxLabel || 'Trade screenshot'}
        />
        {lightboxLabel && (
          <div style={{
            position: 'absolute',
            bottom: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '11px',
            color: 'var(--t3)',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            {lightboxLabel}
          </div>
        )}
      </div>
    </div>
  );
}
