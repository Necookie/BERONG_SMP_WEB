import { useEffect, useRef } from 'react';

interface PrepChartProps {
  high: number;
  moderate: number;
  low: number;
}

export default function PrepChart({ high, moderate, low }: PrepChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ChartClass = (window as any).Chart;
    if (!ChartClass) {
      console.error('Chart.js was not loaded');
      return;
    }

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new ChartClass(ctx, {
      type: 'doughnut',
      data: {
        labels: ['High', 'Moderate', 'Low'],
        datasets: [{
          data: [high, moderate, low],
          backgroundColor: ['#88d982', '#c9a84c', '#c45c5c'],
          borderColor: 'transparent',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const value = context.raw || 0;
                const total = high + moderate + low;
                const percentage = total ? Math.round((value / total) * 100) : 0;
                return ` ${context.label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '75%'
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [high, moderate, low]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '140px' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
