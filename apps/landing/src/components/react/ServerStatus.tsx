import { useState, useEffect } from 'react';

export default function ServerStatus() {
  const [status, setStatus] = useState<{ online: boolean; players: { online: number; max: number } } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/server-status');
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (err) {
        console.error('Failed to load server status:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-elevated stone-border mb-6 font-mono text-xs font-medium tracking-widest text-on-surface-variant">
        <span className="w-2 h-2 bg-on-surface-variant/50 inline-block animate-pulse"></span>
        Ping Server Status...
      </div>
    );
  }

  if (status?.online) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-elevated stone-border mb-6 font-mono text-xs font-medium tracking-widest text-experience-orb">
        <span className="w-2 h-2 bg-experience-orb shadow-[0_0_8px_#7cfc00] inline-block animate-pulse"></span>
        Server Online — {status.players.online}/{status.players.max} Online — Version 1.21 NeoForge
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-elevated stone-border mb-6 font-mono text-xs font-medium tracking-widest text-red-400">
      <span className="w-2 h-2 bg-red-500 shadow-[0_0_8px_#ef4444] inline-block"></span>
      Server Offline
    </div>
  );
}
