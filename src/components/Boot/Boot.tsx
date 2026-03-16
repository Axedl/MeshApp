import { useState, useEffect, useRef } from 'react';
import './Boot.css';

const BOOT_LINES = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 100 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 200 },
  { text: '', delay: 300 },
  { text: '[BOOT] Initialising kernel... OK', delay: 500 },
  { text: '[BOOT] Loading display driver... OK', delay: 700 },
  { text: '[BOOT] Scanning neural interface ports... NONE DETECTED', delay: 1000 },
  { text: '[BOOT] Connecting to local mesh node... OK', delay: 1300 },
  { text: '[BOOT] Authenticating network certificate... OK', delay: 1600 },
  { text: '[BOOT] Syncing with MetroNet backbone... OK', delay: 2000 },
  { text: '', delay: 2200 },
  { text: '[NET] Signal strength: 94%', delay: 2400 },
  { text: '[NET] Latency: 12ms', delay: 2600 },
  { text: '[NET] Mesh nodes in range: 847', delay: 2800 },
  { text: '', delay: 3000 },
  { text: '[SYS] Memory: 128TB neural-mapped', delay: 3200 },
  { text: '[SYS] Storage: 4PB solid-state crystal', delay: 3400 },
  { text: '[SYS] All systems nominal.', delay: 3600 },
  { text: '', delay: 3800 },
  { text: 'Welcome to Mesh.', delay: 4000 },
];

interface BootProps {
  onComplete: () => void;
}

export function Boot({ onComplete }: BootProps) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timers: number[] = [];

    BOOT_LINES.forEach((line, index) => {
      const timer = window.setTimeout(() => {
        setVisibleLines(prev => [...prev, line.text]);
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, line.delay);
      timers.push(timer);
    });

    const completeTimer = window.setTimeout(() => {
      setDone(true);
    }, 4500);
    timers.push(completeTimer);

    const transitionTimer = window.setTimeout(() => {
      onComplete();
    }, 5500);
    timers.push(transitionTimer);

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="boot-screen" ref={containerRef}>
      <div className="boot-content">
        {visibleLines.map((line, i) => (
          <div key={i} className={`boot-line ${line.startsWith('[') ? 'boot-system' : ''} ${line === 'Welcome to Mesh.' ? 'boot-welcome' : ''}`}>
            {line || '\u00A0'}
          </div>
        ))}
        {!done && <span className="boot-cursor cursor-blink">&#9608;</span>}
        {done && (
          <div className="boot-fade-out">
            <span className="boot-cursor cursor-blink">&#9608;</span>
          </div>
        )}
      </div>
    </div>
  );
}
