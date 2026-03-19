import { useState, useEffect } from 'react';
import './JackIn.css';

interface JackInProps {
  moduleId: string;
  children: React.ReactNode;
}

// ── Fragment pool ──────────────────────────────────────────────────────────

const IP_PREFIXES = ['10.', '192.168.', '172.16.', '169.254.', '10.0.0.', '192.168.1.'];
const PORTS       = [22, 80, 443, 1337, 4444, 7777, 8080, 9000, 9999, 31337];
const HANDSHAKE   = [
  'SYN', 'SYN-ACK', 'ACK', 'TLS 1.3', 'CIPHER:AES-256-GCM',
  'AUTH OK', 'HANDSHAKE OK', 'MESH CONNECT', 'ROUTE RESOLVED',
  'VECTOR OK', 'INIT', 'NODE MAPPED', 'UPLINK OK', 'SIGNAL LOCKED',
  'PACKET VERIFIED', 'SESSION KEY OK',
];

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function hex(len = 4) {
  return Math.floor(Math.random() * (16 ** len)).toString(16).padStart(len, '0').toUpperCase();
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pad2(n: number) { return n.toString().padStart(2, '0'); }

const TEMPLATES: Array<() => string> = [
  () => `${pick(IP_PREFIXES)}${rnd(1, 254)}.${rnd(1, 254)} PORT ${pick(PORTS)}`,
  () => `0x${hex()} 0x${hex()} 0x${hex()} 0x${hex()}`,
  () => `[${pick(HANDSHAKE)}]`,
  () => `TCP ${rnd(1000, 9999)} SEQ=${rnd(100000, 999999)} ACK=${rnd(100000, 999999)}`,
  () => `MESH_NODE_${pad2(rnd(1, 99))} → AUTH_VEC_${pad2(rnd(1, 99))}`,
  () => `CIPHER 0x${hex(6)} VERIFY OK`,
  () => `${hex(2)}:${hex(2)}:${hex(2)}:${hex(2)}:${hex(2)}:${hex(2)}`,
  () => `STREAM_${rnd(1, 9)}${hex(3)} ${pick(['OPEN', 'INIT', 'BOUND'])}`,
  () => `NET_ADDR ${rnd(1, 254)}.${rnd(1, 254)}.${rnd(1, 254)}.${rnd(1, 254)} TTL ${rnd(32, 128)}`,
  () => `${hex(8)} → ${hex(8)} [${pick(HANDSHAKE)}]`,
];

function generateLines(count: number): string[] {
  return Array.from({ length: count }, () => pick(TEMPLATES)());
}

// Accelerating delays: 55ms → 15ms per line over ~35 lines
function calcDelay(i: number): number {
  let delay = 0;
  for (let j = 0; j < i; j++) {
    delay += Math.max(15, 55 - j * 1.3);
  }
  return Math.round(delay);
}

// ── Component ──────────────────────────────────────────────────────────────

export function JackIn({ moduleId, children }: JackInProps) {
  const storageKey = `jackin_${moduleId}`;

  const [phase, setPhase] = useState<'animating' | 'fading' | 'done'>(
    () => sessionStorage.getItem(storageKey) === '1' ? 'done' : 'animating'
  );

  // Pre-generate lines once; stable for the lifetime of this mount
  const [lines] = useState(() => generateLines(35));

  useEffect(() => {
    // Re-check storage inside the effect — covers fast mount/unmount in dev StrictMode
    if (sessionStorage.getItem(storageKey) === '1') {
      setPhase('done');
      return;
    }

    const timers: number[] = [];
    timers.push(window.setTimeout(() => setPhase('fading'), 1250));
    timers.push(window.setTimeout(() => {
      sessionStorage.setItem(storageKey, '1');
      setPhase('done');
    }, 1500));

    return () => timers.forEach(clearTimeout);
  }, [storageKey]);

  // Already seen — render children directly with no wrapper overhead
  if (phase === 'done') return <>{children}</>;

  return (
    <div className="jackin-wrap">
      {/* Children render underneath so they can initialise/fetch while animation plays */}
      {children}
      <div className={`jackin-overlay${phase === 'fading' ? ' jackin-overlay--fading' : ''}`}>
        <div className="jackin-stream">
          {lines.map((line, i) => (
            <div
              key={i}
              className="jackin-line"
              style={{ animationDelay: `${calcDelay(i)}ms` }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
