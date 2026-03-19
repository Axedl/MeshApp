import { useState, useEffect, useRef } from 'react';
import './Boot.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface BootScriptLine {
  text: string;
  delay: number;
  effect?: 'glitch' | 'flicker';
}

interface BootLineState {
  id: number;
  text: string;
  display: string;       // may differ from text during glitch animation
  effect?: 'glitch' | 'flicker';
  flickerOff: boolean;   // true during flicker-off frames
}

// ── Glitch helpers ─────────────────────────────────────────────────────────

const GLITCH_CHARS = '█▓░■@#%&';
const GLITCH_FRAMES = 7;
const GLITCH_FRAME_MS = 80;

function scrambleLine(text: string, resolvedFraction: number): string {
  const resolvedUpTo = Math.floor(resolvedFraction * text.length);
  return text
    .split('')
    .map((char, i) => {
      if (char === ' ') return ' ';
      if (i < resolvedUpTo) return char;
      return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
    })
    .join('');
}

// ── Boot scripts ───────────────────────────────────────────────────────────

const GM_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 100 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 400 },
  { text: '', delay: 700 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1000 },
  { text: '[BOOT] Loading city-state node... OK', delay: 1400 },
  { text: '[NET] Tāmaki Makaurau mesh backbone: CONNECTED', delay: 1800 },
  { text: '[SYS] Elevation level: ADMINISTRATOR', delay: 2200 },
  { text: '[NET] Active player nodes: scanning...', delay: 2600 },
  { text: '[NET] 4 terminals online — all authenticated', delay: 3000 },
  { text: '[CITY] MetService feed: partly cloudy, 22°C, UV high', delay: 3400 },
  { text: '[CITY] Fixer board: 7 active listings', delay: 3800 },
  { text: '[CITY] Incident reports: 3 flagged in the last 24 hours', delay: 4200 },
  { text: '[SYS] NPC identity matrix: loaded', delay: 4600 },
  { text: '[SYS] World state: ready', delay: 5000 },
  { text: '', delay: 5400 },
  { text: 'Welcome to Mesh.', delay: 5800 },
];

const SOLO_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 100 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 400 },
  { text: '', delay: 700 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1000 },
  { text: '[BOOT] Loading display driver... OK', delay: 1400 },
  { text: '[SYS] Militech CombatOS interface: DETECTED', delay: 1900 },
  { text: '[SYS] Threat assessment: nominal', delay: 2400 },
  { text: '[SYS] Reflex augmentation interface: READY', delay: 2900 },
  { text: '[SYS] Scanning perimeter... 0 hostiles detected', delay: 3400 },
  { text: '[NET] Connecting to local mesh node... OK', delay: 3900 },
  { text: '[NET] Signal strength: 94%', delay: 4400 },
  { text: '[SYS] All systems nominal. Stay sharp.', delay: 4900 },
  { text: '', delay: 5300 },
  { text: 'Welcome to Mesh.', delay: 5700 },
];

const NETRUNNER_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 100 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 400 },
  { text: '', delay: 700 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1000 },
  { text: '[BOOT] Loading display driver... 0K', delay: 1400 },
  { text: '[NET] Scanning neural interface ports... PORT 7 ACTIVE', delay: 1900 },
  { text: '[NET] Zetatech bridge detected — syncing wetware... OK', delay: 2400 },
  { text: '[WARN] Unauthorised process running in background... ██████', delay: 2900, effect: 'glitch' },
  { text: '[BOOT] Connecting to local mesh node... rerouting... OK', delay: 3500 },
  { text: '[SYS] Militech ICE package: loaded (origin unverified)', delay: 4000 },
  { text: '[NET] Latency: 4ms', delay: 4500 },
  { text: '[SYS] Ghost partitions: 3 active', delay: 5000 },
  { text: '', delay: 5400 },
  { text: 'Welcome to Mesh.', delay: 5800 },
];

const TECH_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 100 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 400 },
  { text: '', delay: 700 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1000 },
  { text: '[BOOT] Loading display driver... OK', delay: 1400 },
  { text: '[WARN] Non-standard hardware detected x4', delay: 1900 },
  { text: '[SYS] Raven Microcybernetics compatibility layer: OK (probably)', delay: 2400 },
  { text: '[BOOT] Mounting salvage storage array... 3 of 4 drives OK', delay: 2900 },
  { text: '[SYS] Drive 2: making a noise. Monitoring.', delay: 3400 },
  { text: '[NET] Connecting to local mesh node... OK', delay: 3900 },
  { text: '[SYS] Memory: 128TB neural-mapped (14TB jury-rigged)', delay: 4400 },
  { text: '[SYS] Build quality: functional. Mostly.', delay: 4900 },
  { text: '', delay: 5300 },
  { text: 'Welcome to Mesh.', delay: 5700 },
];

const MEDTECH_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 100 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 400 },
  { text: '', delay: 700 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1000 },
  { text: '[BOOT] Loading display driver... OK', delay: 1400 },
  { text: '[BIO] Trauma Team neural interface: AUTHENTICATED', delay: 1900 },
  { text: '[BIO] Heart rate: 68 bpm. Stress markers: elevated.', delay: 2400 },
  { text: '[BIO] Humanity index: within acceptable range', delay: 2900 },
  { text: '[NET] Connecting to local mesh node... OK', delay: 3400 },
  { text: '[MED] Trauma Team pharmaceutical inventory: 12 items logged', delay: 3900 },
  { text: '[MED] Triage protocols: standing by', delay: 4400 },
  { text: '[SYS] All systems nominal.', delay: 4900 },
  { text: '', delay: 5300 },
  { text: 'Welcome to Mesh.', delay: 5700 },
];

const ROCKERBOY_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 100 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 400 },
  { text: '', delay: 700 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1000 },
  { text: '[BOOT] Loading display driver... OK', delay: 1400 },
  { text: '[SYS] Rocklin Augmetics audio interface: ACTIVE', delay: 1900 },
  { text: '[WARN] Unsigned firmware detected — running anyway', delay: 2400, effect: 'flicker' },
  { text: '[NET] Connecting to local mesh node... OK', delay: 3000 },
  { text: '[NET] Feed subscribers online: checking...', delay: 3500 },
  { text: '[SYS] Cultural footprint index: significant', delay: 4000 },
  { text: '[SYS] All systems nominal.', delay: 4500 },
  { text: '', delay: 4900 },
  { text: 'Welcome to Mesh.', delay: 5300 },
];

const MEDIA_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 100 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 400 },
  { text: '', delay: 700 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1000 },
  { text: '[BOOT] Loading display driver... OK', delay: 1400 },
  { text: '[REC] The Sprawl press credentials: VERIFIED', delay: 1900 },
  { text: '[REC] Recording devices: 4 active, 1 hidden', delay: 2400 },
  { text: '[NET] Connecting to local mesh node... OK', delay: 2900 },
  { text: '[NET] Monitoring 14 corporate feeds... OK', delay: 3400 },
  { text: '[SYS] Source protection protocols: ACTIVE', delay: 3900 },
  { text: '[SYS] Encryption: layered', delay: 4400 },
  { text: '', delay: 4800 },
  { text: 'Welcome to Mesh.', delay: 5200 },
];

const EXEC_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 100 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 400 },
  { text: '', delay: 700 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1000 },
  { text: '[BOOT] Loading display driver... OK', delay: 1400 },
  { text: '[SYS] Arasaka CorporOS v14.2: AUTHENTICATED', delay: 1900 },
  { text: '[NET] Connecting to secure mesh node... OK', delay: 2400 },
  { text: '[SYS] Portfolio sync: 14 active positions', delay: 2900 },
  { text: '[SYS] Threat assessment: 3 rivals flagged', delay: 3400 },
  { text: '[BOOT] Secure comms channel: OPEN', delay: 3900 },
  { text: '[SYS] Smile. Someone is always watching.', delay: 4400 },
  { text: '', delay: 4800 },
  { text: 'Welcome to Mesh.', delay: 5200 },
];

const LAWMAN_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 100 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 400 },
  { text: '', delay: 700 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1000 },
  { text: '[BOOT] Loading display driver... OK', delay: 1400 },
  { text: '[SYS] Tāmaki Police Force credentials: VERIFIED', delay: 1900 },
  { text: '[SYS] Jurisdiction: Tāmaki Makaurau city-state', delay: 2400 },
  { text: '[NET] Connecting to local mesh node... OK', delay: 2900 },
  { text: '[LAW] Outstanding warrants in range: 3', delay: 3400 },
  { text: '[LAW] Case files sync: 47 active', delay: 3900 },
  { text: '[SYS] Use of force protocols: loaded', delay: 4400 },
  { text: '[SYS] All systems nominal.', delay: 4900 },
  { text: '', delay: 5300 },
  { text: 'Welcome to Mesh.', delay: 5700 },
];

const FIXER_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 100 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 400 },
  { text: '', delay: 700 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1000 },
  { text: '[BOOT] Loading display driver... OK', delay: 1400 },
  { text: '[NET] Connecting to local mesh node... OK', delay: 1900 },
  { text: '[SYS] Contact list: 247 entries — all deniable', delay: 2400 },
  { text: '[SYS] Credentials: verified (Arasaka, Militech, Continental Brands)', delay: 2900 },
  { text: '[SYS] Active contracts: you know which ones', delay: 3400 },
  { text: '[NET] Back-channel comms: open', delay: 3900 },
  { text: '[SYS] Everyone needs something.', delay: 4400 },
  { text: '', delay: 4800 },
  { text: 'Welcome to Mesh.', delay: 5200 },
];

const NOMAD_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 100 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 400 },
  { text: '', delay: 700 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1000 },
  { text: '[BOOT] Loading display driver... OK', delay: 1400 },
  { text: '[NET] Scanning for local mesh nodes... 2 found', delay: 1900 },
  { text: '[NET] Signal routing via pack relay... OK', delay: 2400 },
  { text: '[NAV] Ara Motors onboard nav: ACTIVE', delay: 2900 },
  { text: '[NAV] Last known position: logged', delay: 3400 },
  { text: '[SYS] Pack comms: 6 members online', delay: 3900 },
  { text: '[SYS] All systems nominal.', delay: 4400 },
  { text: '', delay: 4800 },
  { text: 'Welcome to Mesh.', delay: 5200 },
];

const DEFAULT_SCRIPT: BootScriptLine[] = [
  { text: '', delay: 0 },
  { text: 'MESH PERSONAL TERMINAL v1.0.3', delay: 100 },
  { text: '(c) 2045 Parallax Devices — Tāmaki Makaurau', delay: 400 },
  { text: '', delay: 700 },
  { text: '[BOOT] Initialising kernel... OK', delay: 1000 },
  { text: '[BOOT] Loading display driver... OK', delay: 1500 },
  { text: '[BOOT] Scanning neural interface ports... NONE DETECTED', delay: 2000 },
  { text: '[BOOT] Connecting to local mesh node... OK', delay: 2500 },
  { text: '[BOOT] Authenticating network certificate... OK', delay: 3000 },
  { text: '[NET] Signal strength: 94%', delay: 3500 },
  { text: '[NET] Latency: 12ms', delay: 4000 },
  { text: '[SYS] Memory: 128TB neural-mapped', delay: 4500 },
  { text: '[SYS] All systems nominal.', delay: 5000 },
  { text: '', delay: 5300 },
  { text: 'Welcome to Mesh.', delay: 5600 },
];

function selectScript(role: string | null, isGm: boolean): BootScriptLine[] {
  if (isGm) return GM_SCRIPT;
  switch (role) {
    case 'Solo':       return SOLO_SCRIPT;
    case 'Netrunner':  return NETRUNNER_SCRIPT;
    case 'Tech':       return TECH_SCRIPT;
    case 'Medtech':    return MEDTECH_SCRIPT;
    case 'Rockerboy':  return ROCKERBOY_SCRIPT;
    case 'Media':      return MEDIA_SCRIPT;
    case 'Exec':       return EXEC_SCRIPT;
    case 'Lawman':     return LAWMAN_SCRIPT;
    case 'Fixer':      return FIXER_SCRIPT;
    case 'Nomad':      return NOMAD_SCRIPT;
    default:           return DEFAULT_SCRIPT;
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

  // Auto-scroll as lines appear
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

    script.forEach(line => {
      const timer = window.setTimeout(() => {
        const id = lineIdRef.current++;

        setVisibleLines(prev => [
          ...prev,
          {
            id,
            text: line.text,
            display: line.effect === 'glitch'
              ? scrambleLine(line.text, 0)
              : line.text,
            effect: line.effect,
            flickerOff: false,
          },
        ]);

        // Glitch: resolve chars left-to-right over GLITCH_FRAMES × GLITCH_FRAME_MS
        if (line.effect === 'glitch') {
          for (let frame = 1; frame <= GLITCH_FRAMES; frame++) {
            const frameTimer = window.setTimeout(() => {
              const fraction = frame / GLITCH_FRAMES;
              const newDisplay = fraction >= 1
                ? line.text
                : scrambleLine(line.text, fraction);
              setVisibleLines(prev => {
                const next = [...prev];
                const idx = next.findIndex(l => l.id === id);
                if (idx !== -1) next[idx] = { ...next[idx], display: newDisplay };
                return next;
              });
            }, frame * GLITCH_FRAME_MS);
            timers.push(frameTimer);
          }
        }

        // Flicker: off→on→off→on over ~400ms, then stays on
        if (line.effect === 'flicker') {
          [100, 200, 300, 400].forEach((ms, fi) => {
            const flickerTimer = window.setTimeout(() => {
              setVisibleLines(prev => {
                const next = [...prev];
                const idx = next.findIndex(l => l.id === id);
                if (idx !== -1) next[idx] = { ...next[idx], flickerOff: fi % 2 === 0 };
                return next;
              });
            }, ms);
            timers.push(flickerTimer);
          });
        }
      }, line.delay);
      timers.push(timer);
    });

    const completeTimer = window.setTimeout(() => setDone(true), lastDelay + 400);
    const transitionTimer = window.setTimeout(() => onComplete(), lastDelay + 1000);
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
