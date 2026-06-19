import { useEffect, useRef } from 'react';

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, []);

  return (
    <div className="event-log">
      {entries.map((entry, i) => (
        <div className="log-line" key={i}>
          <span className="l-prompt">&gt;&nbsp;</span>
          <span className="l-ts">{entry.ts}&nbsp;&nbsp;</span>
          <span className="l-code">{padCode(entry.code)}&nbsp;&nbsp;</span>
          <span className="l-msg">{entry.msg}</span>
        </div>
      ))}
      <div className="log-line log-cursor-line">
        <span className="l-prompt">&gt;&nbsp;</span>
        <span className="log-cursor">_</span>
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
