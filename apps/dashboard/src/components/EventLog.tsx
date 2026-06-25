// EventLog.tsx — Terminal-style event log viewer with keyword filter
// Filters across timestamp, event code, and message body columns.

import { useState, useEffect, useRef } from 'react';

interface LogEntry {
  ts: string;
  code: string;
  msg: string;
}

interface Props {
  entries: LogEntry[];
}

// Pads a string to a fixed character width for terminal column alignment.
function padCode(code: string, width = 22): string {
  return code.length >= width ? code : code + ' '.repeat(width - code.length);
}

export function EventLog({ entries }: Props) {
  const [query, setQuery] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Filter entries by keyword (case-insensitive, any column)
  const filtered = query.trim()
    ? entries.filter(e => {
        const q = query.toLowerCase();
        return (
          e.ts.toLowerCase().includes(q) ||
          e.code.toLowerCase().includes(q) ||
          e.msg.toLowerCase().includes(q)
        );
      })
    : entries;

  // Scroll to bottom when entries first load (not when filter changes)
  useEffect(() => {
    if (!query) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search bar */}
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-card)',
          background: 'var(--bg-sidebar)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            color: 'var(--text-muted)',
            userSelect: 'none',
          }}
        >
          filter:
        </span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="keyword…"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            color: 'var(--text-primary)',
          }}
          aria-label="Filter event log entries"
        />
        {query && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color: filtered.length > 0 ? 'var(--text-brand)' : '#c45c5c',
              flexShrink: 0,
            }}
          >
            {filtered.length}/{entries.length}
          </span>
        )}
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Clear filter"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              padding: '0 4px',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Log lines */}
      <div className="event-log">
        {filtered.map((entry, i) => (
          <div className="log-line" key={i}>
            <span className="l-prompt">&gt;&nbsp;</span>
            <span className="l-ts">{entry.ts}&nbsp;&nbsp;</span>
            <span className="l-code">{padCode(entry.code)}&nbsp;&nbsp;</span>
            <span className="l-msg">{entry.msg}</span>
          </div>
        ))}
        {filtered.length === 0 && query && (
          <div
            className="log-line"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              color: 'var(--text-muted)',
              padding: '4px 0',
            }}
          >
            <span className="l-prompt">&gt;&nbsp;</span>
            no matches for "{query}"
          </div>
        )}
        {!query && (
          <>
            <div className="log-line log-cursor-line">
              <span className="l-prompt">&gt;&nbsp;</span>
              <span className="log-cursor">_</span>
            </div>
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
}
