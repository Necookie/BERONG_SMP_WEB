import { useEffect, useRef } from 'react';

interface ScoreHistogramProps {
  scores: number[];
}

export default function ScoreHistogram({ scores }: ScoreHistogramProps) {
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

    // Bucket scores into 10 groups: 0-10, 11-20, ..., 91-100
    const buckets = Array(10).fill(0);
    scores.forEach(s => {
      const idx = Math.min(9, Math.floor(s / 10));
      buckets[idx]++;
    });

    const labels = [
      '0-10', '11-20', '21-30', '31-40', '41-50',
      '51-60', '61-70', '71-80', '81-90', '91-100'
    ];

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new ChartClass(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Sessions',
          data: buckets,
          backgroundColor: '#88d982',
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 4
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
                return ` ${context.raw} sessions`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#888',
              font: {
                family: 'JetBrains Mono',
                size: 9
              }
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#888',
              font: {
                family: 'JetBrains Mono',
                size: 9
              },
              precision: 0
            }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [scores]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '180px' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
