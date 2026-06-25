import { useEffect, useRef } from 'react';

interface Props {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: Props) {
  const fillRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => {
      if (fillRef.current) fillRef.current.style.width = '100%';
    }, 200);
    const t2 = setTimeout(() => {
      if (screenRef.current) screenRef.current.style.opacity = '0';
    }, 950);
    const t3 = setTimeout(() => {
      onComplete();
    }, 1350);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div ref={screenRef} className="loading-screen">
      <div className="loading-logo">
        <span className="loading-mark">&#9670;</span>
        <span className="loading-text">T-JOURNAL</span>
      </div>
      <div className="loading-track">
        <div ref={fillRef} className="loading-fill" />
      </div>
    </div>
  );
}
