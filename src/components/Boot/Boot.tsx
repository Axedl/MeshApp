import { useState, useEffect, useRef } from 'react';
import './Boot.css';

// ── Types ──────────────────────────────────────────────────────────────────

type BootLineAnimation =
  | { type: 'counter'; from: number; to: number; durationMs: number }
  | { type: 'progress'; durationMs: number }
  | { type: 'append'; appendText: string; appendDelay: number }
  | { type: 'tick'; values: string[]; intervalMs: number }
  | { type: 'stutter'; pauseAt: number; pauseDurationMs: number }
  | { type: 'glitch'; characters: string; frames: number; intervalMs: number };

interface BootScriptLine {
  text: string;
  delay: number;
  animate?: BootLineAnimation;
  flicker?: boolean;
}

interface BootLineState {
  id: number;
  text: string;
  display: string;
  flickerOff: boolean;
}

// ── Animation helpers ──────────────────────────────────────────────────────

function scrambleWith(text: string, resolvedFraction: number, chars: string): string {
  const resolvedUpTo = Math.floor(resolvedFraction * text.length);
  return text
    .split('')
    .map((char, i) => {
      if (char === ' ') return ' ';
      if (i < resolvedUpTo) return char;
      return chars[Math.floor(Math.random() * chars.length)];
    })
    .join('');
}

function applyCounter(text: string, toValue: number, currentValue: number): string {
  let result = text.replace(String(toValue), String(currentValue));
  if (currentValue === 1 && result.includes(' terminals ')) {
    result = result.replace(' terminals ', ' terminal ');
  }
  return result;
}

function getInitialDisplay(line: BootScriptLine): string {
  const { animate, text } = line;
  if (!animate) return text;
  switch (animate.type) {
    case 'glitch':
      return scrambleWith(text, 0, animate.characters);
    case 'stutter':
      return text.slice(0, animate.pauseAt);
    case 'progress': {
      const colonIdx = text.lastIndexOf(': ');
      return `${text.slice(0, colonIdx + 2)}AUTHENTICATING [░░░░░░░░░░]`;
    }
    case 'tick': {
      const lastVal = animate.values[animate.values.length - 1];
      return text.slice(0, text.length - lastVal.length) + animate.values[0];
    }
    case 'counter':
      return applyCounter(text, animate.to, animate.from);
    case 'append':
      return text;
  }
}

function runAnimation(
  id: number,
  line: BootScriptLine,
  timers: number[],
  updateLine: (id: number, display: string) => void
): void {
  const { animate, text } = line;
  if (!animate) return;

  switch (animate.type) {
    case 'glitch': {
      const { characters, frames, intervalMs } = animate;
      for (let f = 1; f <= frames; f++) {
        const t = window.setTimeout(() => {
          const frac = f / frames;
          updateLine(id, frac >= 1 ? text : scrambleWith(text, frac, characters));
        }, f * intervalMs);
        timers.push(t);
      }
      break;
    }
    case 'counter': {
      const { from, to, durationMs } = animate;
      const steps = to - from;
      const stepMs = durationMs / steps;
      for (let i = 1; i <= steps; i++) {
        const value = from + i;
        const t = window.setTimeout(
          () => updateLine(id, applyCounter(text, to, value)),
          Math.round(i * stepMs)
        );
        timers.push(t);
      }
      break;
    }
    case 'progress': {
      const { durationMs } = animate;
      const BARS = 10;
      const stepMs = durationMs / BARS;
      const colonIdx = text.lastIndexOf(': ');
      const prefix = text.slice(0, colonIdx + 2);
      for (let bar = 1; bar <= BARS; bar++) {
        const t = window.setTimeout(() => {
          if (bar === BARS) {
            updateLine(id, text);
          } else {
            updateLine(id, `${prefix}AUTHENTICATING [${'█'.repeat(bar)}${'░'.repeat(BARS - bar)}]`);
          }
        }, Math.round(bar * stepMs));
        timers.push(t);
      }
      break;
    }
    case 'append': {
      const { appendText, appendDelay } = animate;
      const t = window.setTimeout(() => updateLine(id, text + appendText), appendDelay);
      timers.push(t);
      break;
    }
    case 'tick': {
      const { values, intervalMs } = animate;
      const lastVal = values[values.length - 1];
      const prefix = text.slice(0, text.length - lastVal.length);
      for (let i = 1; i < values.length; i++) {
        const t = window.setTimeout(() => updateLine(id, prefix + values[i]), i * intervalMs);
        timers.push(t);
      }
      break;
    }
    case 'stutter': {
      const t = window.setTimeout(() => updateLine(id, text), animate.pauseDurationMs);
      timers.push(t);
      break;
    }
  }
}

// ── Boot scripts (all delays scaled ×1.72 to target ~10s total) ────────────

const GM_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 150 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 700 },
  { text: '', delay: 1200 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1700 },
  { text: '[BOOT] Loading city-state node... OK', delay: 2400 },
  { text: '[NET] Tāmaki Makaurau mesh backbone: CONNECTED', delay: 3100 },
  { text: '[SYS] Elevation level: ADMINISTRATOR', delay: 3800 },
  { text: '[NET] Active player nodes: scanning...', delay: 4500 },
  {
    text: '[NET] 4 terminals online — all authenticated',
    delay: 5150,
    animate: { type: 'counter', from: 0, to: 4, durationMs: 2000 },
  },
  { text: '[CITY] MetService feed: partly cloudy, 22°C, UV high', delay: 5850 },
  { text: '[CITY] Fixer board: 7 active listings', delay: 6550 },
  { text: '[CITY] Incident reports: 3 flagged in the last 24 hours', delay: 7200 },
  { text: '[SYS] NPC identity matrix: loaded', delay: 7900 },
  { text: '[SYS] World state: ready', delay: 8600 },
  { text: '', delay: 9300 },
  { text: 'Welcome to Mesh.', delay: 10000 },
];

const SOLO_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 150 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 700 },
  { text: '', delay: 1200 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1700 },
  { text: '[BOOT] Loading display driver... OK', delay: 2400 },
  { text: '[SYS] Militech CombatOS interface: DETECTED', delay: 3250 },
  { text: '[SYS] Threat assessment: nominal', delay: 4150 },
  { text: '[SYS] Reflex augmentation interface: READY', delay: 5000 },
  { text: '[SYS] Scanning perimeter... 0 hostiles detected', delay: 5850 },
  { text: '[NET] Connecting to local mesh node... OK', delay: 6700 },
  { text: '[NET] Signal strength: 94%', delay: 7550 },
  { text: '[SYS] All systems nominal. Stay sharp.', delay: 8450 },
  { text: '', delay: 9100 },
  { text: 'Welcome to Mesh.', delay: 9800 },
];

const NETRUNNER_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 150 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 700 },
  { text: '', delay: 1200 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1700 },
  { text: '[BOOT] Loading display driver... 0K', delay: 2400 },
  { text: '[NET] Scanning neural interface ports... PORT 7 ACTIVE', delay: 3250 },
  { text: '[NET] Zetatech bridge detected — syncing wetware... OK', delay: 4150 },
  {
    text: '[WARN] Unauthorised process running in background... ██████',
    delay: 5000,
    animate: { type: 'glitch', characters: '█▓░■@#%&', frames: 7, intervalMs: 80 },
  },
  { text: '[BOOT] Connecting to local mesh node... rerouting... OK', delay: 6000 },
  { text: '[SYS] Militech ICE package: loaded (origin unverified)', delay: 6900 },
  { text: '[NET] Latency: 4ms', delay: 7750 },
  { text: '[SYS] Ghost partitions: 3 active', delay: 8600 },
  { text: '', delay: 9300 },
  { text: 'Welcome to Mesh.', delay: 10000 },
];

const TECH_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 150 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 700 },
  { text: '', delay: 1200 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1700 },
  { text: '[BOOT] Loading display driver... OK', delay: 2400 },
  { text: '[WARN] Non-standard hardware detected x4', delay: 3250 },
  { text: '[SYS] Raven Microcybernetics compatibility layer: OK (probably)', delay: 4150 },
  { text: '[BOOT] Mounting salvage storage array... 3 of 4 drives OK', delay: 5000 },
  {
    text: '[SYS] Drive 2: making a noise. Monitoring.',
    delay: 5850,
    animate: { type: 'stutter', pauseAt: 22, pauseDurationMs: 800 },
  },
  { text: '[NET] Connecting to local mesh node... OK', delay: 6700 },
  { text: '[SYS] Memory: 128TB neural-mapped (14TB jury-rigged)', delay: 7550 },
  { text: '[SYS] Build quality: functional. Mostly.', delay: 8450 },
  { text: '', delay: 9100 },
  { text: 'Welcome to Mesh.', delay: 9800 },
];

const MEDTECH_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 150 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 700 },
  { text: '', delay: 1200 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1700 },
  { text: '[BOOT] Loading display driver... OK', delay: 2400 },
  { text: '[BIO] Trauma Team neural interface: AUTHENTICATED', delay: 3250 },
  {
    text: '[BIO] Heart rate: 78 bpm. Stress markers: elevated.',
    delay: 4150,
    animate: { type: 'counter', from: 58, to: 78, durationMs: 1200 },
  },
  { text: '[BIO] Humanity index: within acceptable range', delay: 5000 },
  { text: '[NET] Connecting to local mesh node... OK', delay: 5850 },
  { text: '[MED] Trauma Team pharmaceutical inventory: 12 items logged', delay: 6700 },
  { text: '[MED] Triage protocols: standing by', delay: 7550 },
  { text: '[SYS] All systems nominal.', delay: 8450 },
  { text: '', delay: 9100 },
  { text: 'Welcome to Mesh.', delay: 9800 },
];

const ROCKERBOY_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 150 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 700 },
  { text: '', delay: 1200 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1700 },
  { text: '[BOOT] Loading display driver... OK', delay: 2400 },
  {
    text: '[SYS] Rocklin Augmetics audio interface: ACTIVE',
    delay: 3250,
    animate: {
      type: 'tick',
      values: ['▁▂▃▅▂▄▃▁', '▂▄▅▃▁▂▄▅', '▃▁▄▂▅▃▂▄', 'ACTIVE'],
      intervalMs: 120,
    },
  },
  {
    text: '[WARN] Unsigned firmware detected — running anyway',
    delay: 4150,
    flicker: true,
  },
  { text: '[NET] Connecting to local mesh node... OK', delay: 5150 },
  { text: '[NET] Feed subscribers online: checking...', delay: 6000 },
  { text: '[SYS] Cultural footprint index: significant', delay: 6900 },
  { text: '[SYS] All systems nominal.', delay: 7750 },
  { text: '', delay: 8450 },
  { text: 'Welcome to Mesh.', delay: 9100 },
];

const MEDIA_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 150 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 700 },
  { text: '', delay: 1200 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1700 },
  { text: '[BOOT] Loading display driver... OK', delay: 2400 },
  { text: '[REC] The Sprawl press credentials: VERIFIED', delay: 3250 },
  {
    text: '[REC] Recording devices: 4 active,',
    delay: 4150,
    animate: { type: 'append', appendText: ' 1 hidden', appendDelay: 1200 },
  },
  { text: '[NET] Connecting to local mesh node... OK', delay: 5000 },
  { text: '[NET] Monitoring 14 corporate feeds... OK', delay: 5850 },
  { text: '[SYS] Source protection protocols: ACTIVE', delay: 6700 },
  { text: '[SYS] Encryption: layered', delay: 7550 },
  { text: '', delay: 8250 },
  { text: 'Welcome to Mesh.', delay: 8950 },
];

const EXEC_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 150 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 700 },
  { text: '', delay: 1200 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1700 },
  { text: '[BOOT] Loading display driver... OK', delay: 2400 },
  {
    text: '[SYS] Arasaka CorporOS v14.2: AUTHENTICATED',
    delay: 3250,
    animate: { type: 'progress', durationMs: 1500 },
  },
  { text: '[NET] Connecting to secure mesh node... OK', delay: 4150 },
  { text: '[SYS] Portfolio sync: 14 active positions', delay: 5000 },
  { text: '[SYS] Threat assessment: 3 rivals flagged', delay: 5850 },
  { text: '[BOOT] Secure comms channel: OPEN', delay: 6700 },
  { text: '[SYS] Smile. Someone is always watching.', delay: 7550 },
  { text: '', delay: 8250 },
  { text: 'Welcome to Mesh.', delay: 8950 },
];

const LAWMAN_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 150 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 700 },
  { text: '', delay: 1200 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1700 },
  { text: '[BOOT] Loading display driver... OK', delay: 2400 },
  { text: '[SYS] Tāmaki Police Force credentials: VERIFIED', delay: 3250 },
  { text: '[SYS] Jurisdiction: Tāmaki Makaurau city-state', delay: 4150 },
  { text: '[NET] Connecting to local mesh node... OK', delay: 5000 },
  {
    text: '[LAW] Outstanding warrants in range: 3',
    delay: 5850,
    animate: { type: 'counter', from: 0, to: 3, durationMs: 1500 },
  },
  { text: '[LAW] Case files sync: 47 active', delay: 6700 },
  { text: '[SYS] Use of force protocols: loaded', delay: 7550 },
  { text: '[SYS] All systems nominal.', delay: 8450 },
  { text: '', delay: 9100 },
  { text: 'Welcome to Mesh.', delay: 9800 },
];

const FIXER_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 150 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 700 },
  { text: '', delay: 1200 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1700 },
  { text: '[BOOT] Loading display driver... OK', delay: 2400 },
  { text: '[NET] Connecting to local mesh node... OK', delay: 3250 },
  { text: '[SYS] Contact list: 247 entries — all deniable', delay: 4150 },
  {
    text: '[SYS] Credentials: verified (Arasaka, Militech, Continental Brands)',
    delay: 5000,
    animate: {
      type: 'tick',
      values: [
        'verified (Kang Tau, EBM, Petrochem)',
        'verified (Biotechnica, Zetatech, SovOil)',
        'verified (Militech, Arasaka, Trauma Team)',
        'verified (Arasaka, Militech, Continental Brands)',
      ],
      intervalMs: 180,
    },
  },
  { text: '[SYS] Active contracts: you know which ones', delay: 5850 },
  { text: '[NET] Back-channel comms: open', delay: 6700 },
  { text: '[SYS] Everyone needs something.', delay: 7550 },
  { text: '', delay: 8250 },
  { text: 'Welcome to Mesh.', delay: 8950 },
];

const NOMAD_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 150 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 700 },
  { text: '', delay: 1200 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1700 },
  { text: '[BOOT] Loading display driver... OK', delay: 2400 },
  { text: '[NET] Scanning for local mesh nodes... 2 found', delay: 3250 },
  {
    text: '[NET] Signal routing via pack relay... OK',
    delay: 4150,
    animate: { type: 'stutter', pauseAt: 37, pauseDurationMs: 1000 },
  },
  { text: '[NAV] Ara Motors onboard nav: ACTIVE', delay: 5000 },
  { text: '[NAV] Last known position: logged', delay: 5850 },
  { text: '[SYS] Pack comms: 6 members online', delay: 6700 },
  { text: '[SYS] All systems nominal.', delay: 7550 },
  { text: '', delay: 8250 },
  { text: 'Welcome to Mesh.', delay: 8950 },
];

const DEFAULT_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 150 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 700 },
  { text: '', delay: 1200 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1700 },
  { text: '[BOOT] Loading display driver... OK', delay: 2600 },
  { text: '[BOOT] Scanning neural interface ports... NONE DETECTED', delay: 3450 },
  { text: '[BOOT] Connecting to local mesh node... OK', delay: 4300 },
  { text: '[BOOT] Authenticating network certificate... OK', delay: 5150 },
  { text: '[NET] Signal strength: 94%', delay: 6000 },
  { text: '[NET] Latency: 12ms', delay: 6900 },
  { text: '[SYS] Memory: 128TB neural-mapped', delay: 7750 },
  { text: '[SYS] All systems nominal.', delay: 8600 },
  { text: '', delay: 9100 },
  { text: 'Welcome to Mesh.', delay: 9650 },
];

function selectScript(role: string | null, isGm: boolean): BootScriptLine[] {
  if (isGm) return GM_SCRIPT;
  switch (role) {
    case 'Solo':      return SOLO_SCRIPT;
    case 'Netrunner': return NETRUNNER_SCRIPT;
    case 'Tech':      return TECH_SCRIPT;
    case 'Medtech':   return MEDTECH_SCRIPT;
    case 'Rockerboy': return ROCKERBOY_SCRIPT;
    case 'Media':     return MEDIA_SCRIPT;
    case 'Exec':      return EXEC_SCRIPT;
    case 'Lawman':    return LAWMAN_SCRIPT;
    case 'Fixer':     return FIXER_SCRIPT;
    case 'Nomad':     return NOMAD_SCRIPT;
    default:          return DEFAULT_SCRIPT;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

interface BootProps {
  onComplete: () => void;
}

export function Boot({ onComplete }: BootProps) {
  const [visibleLines, setVisibleLines] = useState<BootLineState[]>([]);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineIdRef = useRef(0);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleLines]);

  useEffect(() => {
    const role = localStorage.getItem('mesh_last_role');
    const isGm = localStorage.getItem('mesh_last_is_gm') === 'true';
    const script = selectScript(role, isGm);
    const lastDelay = Math.max(...script.map(l => l.delay));
    const timers: number[] = [];

    const updateLine = (id: number, display: string) => {
      setVisibleLines(prev => {
        const next = [...prev];
        const idx = next.findIndex(l => l.id === id);
        if (idx !== -1) next[idx] = { ...next[idx], display };
        return next;
      });
    };

    script.forEach(line => {
      const timer = window.setTimeout(() => {
        const id = lineIdRef.current++;

        setVisibleLines(prev => [
          ...prev,
          { id, text: line.text, display: getInitialDisplay(line), flickerOff: false },
        ]);

        if (line.flicker) {
          [100, 200, 300, 400].forEach((ms, fi) => {
            const t = window.setTimeout(() => {
              setVisibleLines(prev => {
                const next = [...prev];
                const idx = next.findIndex(l => l.id === id);
                if (idx !== -1) next[idx] = { ...next[idx], flickerOff: fi % 2 === 0 };
                return next;
              });
            }, ms);
            timers.push(t);
          });
        }

        if (line.animate) {
          runAnimation(id, line, timers, updateLine);
        }
      }, line.delay);
      timers.push(timer);
    });

    const completeTimer = window.setTimeout(() => setDone(true), lastDelay + 400);
    const transitionTimer = window.setTimeout(() => onComplete(), lastDelay + 1500);
    timers.push(completeTimer, transitionTimer);

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="boot-screen" ref={containerRef}>
      <div className="boot-content">
        {visibleLines.map(line => (
          <div
            key={line.id}
            className={[
              'boot-line',
              line.text.startsWith('[') ? 'boot-system' : '',
              line.text === 'Welcome to Mesh.' ? 'boot-welcome' : '',
            ].filter(Boolean).join(' ')}
            style={line.flickerOff ? { opacity: 0 } : undefined}
          >
            {line.display || '\u00A0'}
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
