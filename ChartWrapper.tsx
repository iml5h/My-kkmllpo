import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { chartTextStyle, chartGridColor } from '@/lib/utils';

interface Props {
  id: string;
  type: string;
  data: object;
  options?: object;
  height?: string;
}

const chartRegistry: Record<string, Chart> = {};

export function destroyChart(id: string) {
  if (chartRegistry[id]) {
    chartRegistry[id].destroy();
    delete chartRegistry[id];
  }
}

export default function ChartWrapper({ id, type, data, options, height = '150px' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Destroy existing
    destroyChart(id);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: chartTextStyle },
        y: { grid: { color: chartGridColor }, ticks: chartTextStyle },
      },
      animation: { duration: 800, easing: 'easeOutQuart' as const },
    };

    chartRegistry[id] = new Chart(ctx, {
      type: type as never,
      data: data as never,
      options: { ...defaultOptions, ...options } as never,
    });

    return () => { destroyChart(id); };
  }, [id, type, data, options]);

  return (
    <div style={{ position: 'relative', height }}>
      <canvas ref={canvasRef} id={id} />
    </div>
  );
}
