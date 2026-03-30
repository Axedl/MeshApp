import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { MeshUser, EloProfile, Email } from '../../types';
import './Elo.css';

interface EloModuleProps {
  user: MeshUser;
}

// ── Hardcoded data ─────────────────────────────────────────────────────────

const ELF_NAMES = [
  '{Bur_oftheWayside}', '{ThornyRose_NZ}', '{IronwoodBarkshield}',
  '{TāmakiThornweaver}', '{Moonshadow_EverSong}', '{NightBen_77}',
  '{AshrunnerKai}', '{GlintfireMage}', '{VeilwalkerSoth}', '{CrimsonAshfen}',
  '{StonebackRuby}', '{WillowshadeNox}', '{EmbercroftTarn}', '{DuskweaverLen}',
  '{ThistledownAra}', '{GravenmarkSol}', '{FrostfernCael}', '{MirewalkerDan}',
  '{IronveilSasha}', '{BramblecapNZ}', '{ShadowmireKai}', '{GoldenshieldTe}',
  '{AshfenWanderer}', '{NightfireHemi}', '{CorvusBarkhold}', '{RunemarkAria}',
  '{Wildthorn_South}', '{CinderpeakRoa}', '{MossbackTūhoe}', '{GloomhavenNZ}',
];

const CHAT_MESSAGES = [
  ['{ThornyRose_NZ}', 'anyone doing razorfire tonight'],
  ['{IronwoodBarkshield}', 'LF1M warmheart for ashfen run'],
  ['{AshrunnerKai}', 'the respawn timer in sector 4 is broken again'],
  ['{GlintfireMage}', 'where do i get sacred herbs cheap'],
  ['{TāmakiThornweaver}', 'iron covenant has them at 75gp each'],
  ['{VeilwalkerSoth}', 'that thornweaver nerf really hurt'],
  ['{Bur_oftheWayside}', 'worth it. totally worth it. we died so many times.'],
  ['{NightBen_77}', 'anybody else getting lag in highwall rn'],
  ['{MirewalkerDan}', 'always lag in highwall during peak'],
  ['{ThistledownAra}', 'just hit rank 9 finally'],
  ['{GravenmarkSol}', 'gz!!'],
  ['{ThistledownAra}', 'ty ty took forever'],
  ['{FrostfernCael}', 'miasma boundary shifted again near ashfen'],
  ['{WillowshadeNox}', 'it does that every patch'],
  ['{EmbercroftTarn}', 'lf elfline casual raiding tāmaki server'],
  ['{StonebackRuby}', "nature's thorns recruiting?"],
  ['{EmbercroftTarn}', 'checking them out yeah'],
  ['{CrimsonAshfen}', 'fang hunters camping ashfen transition AGAIN'],
  ['{IronwoodBarkshield}', 'just go around'],
  ['{CrimsonAshfen}', 'there is no around'],
  ['{DuskweaverLen}', 'anyone had a message from the_shepherd'],
  ['{GlintfireMage}', 'yeah last week. weird but nice'],
  ['{DuskweaverLen}', 'right??'],
  ['{BramblecapNZ}', 'warmheart builds are broken since 4.7.1 and i am not complaining'],
  ['{CorvusBarkhold}', 'wait is that the shepherd account still active'],
  ['{DuskweaverLen}', 'apparently yeah'],
  ['{AshrunnerKai}', 'segotari is never going to fix the razorfire timer'],
  ['{NightBen_77}', "they'll fix it when someone important complains"],
  ['{GoldenshieldTe}', 'anyone selling ironveil armour'],
  ['{RunemarkAria}', 'check iron covenant'],
  ['{GoldenshieldTe}', 'they never have stock'],
  ['{MossbackTūhoe}', 'gz on rank 9 thistle'],
  ['{ThistledownAra}', '❤'],
  ['{Wildthorn_South}', 'this server is cooked tonight lag wise'],
  ['{CinderpeakRoa}', 'peak hours what do you expect'],
  ['{IronwoodBarkshield}', 'back in my day the servers were worse'],
  ['{TāmakiThornweaver}', 'no they werent'],
  ['{IronwoodBarkshield}', 'no they werent'],
];

// Zone bounding boxes [xMin, yMin, xMax, yMax] within the 800×600 SVG viewbox
const ZONE_BOUNDS: Record<string, [number, number, number, number]> = {
  greenfeld: [25, 325, 285, 575],
  highwall:  [255, 25, 495, 185],
  ashfen:    [30, 225, 255, 395],
  miasma:    [310, 15, 785, 585],
};

// Zone assignment for the 20 dots
const DOT_ZONES = [
  'greenfeld','greenfeld','greenfeld','greenfeld','greenfeld','greenfeld',
  'highwall','highwall','highwall','highwall',
  'ashfen','ashfen','ashfen','ashfen',
  'miasma','miasma','miasma','miasma','miasma','miasma',
];

function randInBounds([xMin, yMin, xMax, yMax]: [number,number,number,number]): [number, number] {
  return [
    xMin + Math.random() * (xMax - xMin),
    yMin + Math.random() * (yMax - yMin),
  ];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Dot animation ──────────────────────────────────────────────────────────

interface Dot {
  id: number;
  zone: string;
  name: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  nextMoveAt: number;
  moveDuration: number; // ms
  moveStartedAt: number;
  fromX: number;
  fromY: number;
}

function initDots(): Dot[] {
  const names = shuffle(ELF_NAMES);
  return DOT_ZONES.map((zone, i) => {
    const [x, y] = randInBounds(ZONE_BOUNDS[zone]);
    return {
      id: i,
      zone,
      name: names[i % names.length],
      x, y,
      targetX: x, targetY: y,
      fromX: x, fromY: y,
      nextMoveAt: Date.now() + 1000 + Math.random() * 4000,
      moveDuration: 3000 + Math.random() * 2000,
      moveStartedAt: Date.now(),
    };
  });
}

// ── Profile Card ───────────────────────────────────────────────────────────

function EloProfileCard({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<EloProfile | null | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    supabase
      .from('elo_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) { setError(true); return; }
        setProfile(data as EloProfile | null);
      });
  }, [userId]);

  if (error) {
    return <div className="elo-profile-loading">// ERROR CONNECTING TO ELFLINES</div>;
  }

  if (profile === undefined) {
    return <div className="elo-profile-loading">CONNECTING TO ELFLINES...</div>;
  }

  if (!profile) {
    return (
      <div className="elo-profile-empty">
        // NO ELFLINES ACCOUNT DETECTED<br />
        VISIT SEGOTARI.COM TO REGISTER
      </div>
    );
  }

  const corruptionPct = Math.min((profile.corruption_stacks / 10) * 100, 100);
  const corruptionColor = corruptionPct < 40
    ? 'var(--elo-primary)'
    : corruptionPct < 70
      ? '#d4782a'
      : '#c43020';

  return (
    <div className="elo-profile-card">
      <div className="elo-elfname">{profile.elfname}</div>
      {profile.title && <div className="elo-title">{profile.title}</div>}
      <div className="elo-class-rank">
        <span className="elo-class">{profile.class}</span>
        <span className="elo-rank-sep">·</span>
        <span className="elo-rank">RANK {profile.rank}</span>
      </div>
      <div className="elo-divider" />
      <div className="elo-field">
        <span className="elo-field-label">ELFLINE</span>
        <span className="elo-field-value">{profile.elfline ?? 'UNAFFILIATED'}</span>
      </div>
      <div className="elo-field">
        <span className="elo-field-label">CORRUPTION</span>
        <div className="elo-corruption-bar-wrap">
          <div
            className="elo-corruption-bar-fill"
            style={{ width: `${corruptionPct}%`, background: corruptionColor }}
          />
        </div>
        <span className="elo-field-value">{profile.corruption_stacks}/10</span>
      </div>
      {profile.revive_sickness && (
        <div className="elo-revive-badge">⚠ REVIVE SICKNESS</div>
      )}
      {profile.last_seen && (
        <div className="elo-last-seen">Last seen: {profile.last_seen}</div>
      )}
    </div>
  );
}

// ── SVG Zone Map ───────────────────────────────────────────────────────────

function EloZoneMap() {
  const [dots, setDots] = useState<Dot[]>(() => initDots());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();

      setDots(current => {
        // Only re-render if at least one dot is actively moving or due for a new target
        const anyActive = current.some(
          d => now >= d.nextMoveAt || now - d.moveStartedAt < d.moveDuration
        );
        if (!anyActive) return current;

        return current.map(dot => {
          // Lerp toward target
          const elapsed = now - dot.moveStartedAt;
          const t = Math.min(elapsed / dot.moveDuration, 1);
          // Ease in-out
          const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          const x = dot.fromX + (dot.targetX - dot.fromX) * ease;
          const y = dot.fromY + (dot.targetY - dot.fromY) * ease;

          // Assign new target when due
          if (now >= dot.nextMoveAt) {
            const [nx, ny] = randInBounds(ZONE_BOUNDS[dot.zone]);
            return {
              ...dot,
              x, y,
              fromX: x, fromY: y,
              targetX: nx, targetY: ny,
              moveStartedAt: now,
              moveDuration: 3000 + Math.random() * 2000,
              nextMoveAt: now + 4000 + Math.random() * 4000,
            };
          }

          return { ...dot, x, y };
        });
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="elo-map-container">
      <svg
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid meet"
        className="elo-map-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Miasma edge blur */}
          <filter id="miasma-feather" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          {/* Dot glow */}
          <filter id="dot-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Vignette */}
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="#0f0a06" stopOpacity="0.65" />
          </radialGradient>
          {/* Miasma texture overlay */}
          <filter id="miasma-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.04" numOctaves="3" seed="7" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="grey" />
            <feBlend in="SourceGraphic" in2="grey" mode="multiply" />
          </filter>
        </defs>

        {/* Background */}
        <rect width="800" height="600" fill="#0f0a06" />

        {/* ── Greenfeld — safe zone, bottom-left ── */}
        <polygon
          points="15,330 185,298 290,318 312,592 15,592"
          fill="#1e2e0c"
          stroke="#4a6a1a"
          strokeWidth="1.5"
          opacity="0.9"
        />
        {/* Subtle terrain lines */}
        <line x1="60" y1="370" x2="120" y2="380" stroke="#3a5a14" strokeWidth="0.8" opacity="0.5" />
        <line x1="80" y1="420" x2="160" y2="435" stroke="#3a5a14" strokeWidth="0.8" opacity="0.5" />
        <line x1="50" y1="480" x2="200" y2="500" stroke="#3a5a14" strokeWidth="0.8" opacity="0.5" />
        <line x1="100" y1="540" x2="250" y2="555" stroke="#3a5a14" strokeWidth="0.8" opacity="0.4" />

        {/* ── Ashfen — middle-left marshland ── */}
        <polygon
          points="18,248 165,218 282,248 302,342 258,412 88,432 18,378"
          fill="#1e1c08"
          stroke="#3e3c14"
          strokeWidth="1.2"
          opacity="0.9"
        />
        {/* Marsh texture — dashed lines */}
        <line x1="40" y1="275" x2="100" y2="268" stroke="#4a4818" strokeWidth="0.7" strokeDasharray="4 3" opacity="0.6" />
        <line x1="55" y1="305" x2="140" y2="295" stroke="#4a4818" strokeWidth="0.7" strokeDasharray="4 3" opacity="0.6" />
        <line x1="70" y1="340" x2="180" y2="330" stroke="#4a4818" strokeWidth="0.7" strokeDasharray="3 4" opacity="0.5" />
        <line x1="90" y1="375" x2="200" y2="368" stroke="#4a4818" strokeWidth="0.7" strokeDasharray="3 4" opacity="0.5" />
        <line x1="120" y1="395" x2="220" y2="390" stroke="#4a4818" strokeWidth="0.6" strokeDasharray="2 5" opacity="0.4" />

        {/* ── Highwall Citadel — top-centre fortress ── */}
        <polygon
          points="248,14 482,14 512,88 492,172 404,212 316,172 274,88"
          fill="#2a1e06"
          stroke="#c8902a"
          strokeWidth="1.8"
          opacity="0.92"
        />
        {/* Fortress battlements suggestion */}
        <rect x="280" y="14" width="10" height="8" fill="#c8902a" opacity="0.4" />
        <rect x="298" y="14" width="10" height="8" fill="#c8902a" opacity="0.4" />
        <rect x="316" y="14" width="10" height="8" fill="#c8902a" opacity="0.4" />
        <rect x="420" y="14" width="10" height="8" fill="#c8902a" opacity="0.4" />
        <rect x="438" y="14" width="10" height="8" fill="#c8902a" opacity="0.4" />
        <rect x="456" y="14" width="10" height="8" fill="#c8902a" opacity="0.4" />
        {/* Mountain suggestion */}
        <polyline
          points="350,170 365,140 380,160 395,120 410,155 430,170"
          fill="none"
          stroke="#7a5818"
          strokeWidth="1.2"
          opacity="0.5"
        />

        {/* ── The Miasma — feathered edge layer ── */}
        <polygon
          className="elo-miasma-blur"
          points="215,0 800,0 800,600 360,600 315,475 272,365 238,248 218,148"
          fill="#1a0d22"
          opacity="0.75"
          filter="url(#miasma-feather)"
        />
        {/* Hard fill core */}
        <polygon
          className="elo-miasma-fill"
          points="248,0 800,0 800,600 390,600 340,490 295,375 258,265 248,160"
          fill="#1a0d22"
          opacity="0.88"
        />
        {/* Miasma texture noise */}
        <polygon
          points="248,0 800,0 800,600 390,600 340,490 295,375 258,265 248,160"
          fill="#2a1035"
          opacity="0.22"
          filter="url(#miasma-noise)"
        />

        {/* ── Zone Labels ── */}
        {/* Greenfeld */}
        <text x="100" y="530" className="elo-zone-label elo-zone-safe" textAnchor="middle">
          GREENFELD
        </text>
        <text x="100" y="548" className="elo-zone-sublabel elo-zone-safe" textAnchor="middle">
          SAFE ZONE
        </text>

        {/* Ashfen */}
        <text x="155" y="260" className="elo-zone-label elo-zone-marsh" textAnchor="middle">
          ASHFEN
        </text>

        {/* Highwall Citadel */}
        <text x="380" y="130" className="elo-zone-label elo-zone-citadel" textAnchor="middle">
          HIGHWALL CITADEL
        </text>

        {/* Razorfire Caverns — POI inside Ashfen */}
        <text x="148" y="305" className="elo-poi-label" textAnchor="middle">
          ✦ RAZORFIRE CAVERNS
        </text>

        {/* The Miasma label — faded inside fog */}
        <text x="580" y="320" className="elo-zone-label elo-zone-miasma" textAnchor="middle" opacity="0.4">
          THE MIASMA
        </text>

        {/* ── Vignette overlay ── */}
        <rect width="800" height="600" fill="url(#vignette)" />

        {/* ── Player dots ── */}
        {dots.map(dot => (
          <g key={dot.id}>
            <circle
              cx={dot.x}
              cy={dot.y}
              r={dot.zone === 'miasma' ? 2.8 : 3.2}
              fill={dot.zone === 'miasma' ? '#7a3a1a' : '#c8902a'}
              opacity={dot.zone === 'miasma' ? 0.65 : 0.9}
              filter="url(#dot-glow)"
            />
            <title>{dot.name}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Chat Rail ──────────────────────────────────────────────────────────────

interface ChatLine {
  id: number;
  handle: string;
  text: string;
}

function EloChatRail() {
  const [lines, setLines] = useState<ChatLine[]>([]);
  const queueRef = useRef<[string, string][]>([]);
  const lineIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  // Build shuffled queue; refill when exhausted
  const nextMessage = useCallback(() => {
    if (queueRef.current.length === 0) {
      queueRef.current = shuffle(CHAT_MESSAGES) as [string, string][];
    }
    return queueRef.current.shift()!;
  }, []);

  const scheduleNext = useCallback(() => {
    const delay = 2000 + Math.random() * 4000;
    timerRef.current = setTimeout(() => {
      const [handle, text] = nextMessage();
      setLines(prev => {
        const next = [...prev, { id: lineIdRef.current++, handle, text }];
        return next.length > 15 ? next.slice(next.length - 15) : next;
      });
      scheduleNext();
    }, delay);
  }, [nextMessage]);

  useEffect(() => {
    scheduleNext();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [scheduleNext]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (railRef.current) {
      railRef.current.scrollTop = railRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="elo-chat-rail" ref={railRef}>
      <div className="elo-chat-header">// TM-01 SERVER CHAT</div>
      {lines.map(line => (
        <div key={line.id} className="elo-chat-line">
          <span className="elo-chat-handle">{line.handle}</span>
          <span className="elo-chat-sep">: </span>
          <span className="elo-chat-text">{line.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── World View ─────────────────────────────────────────────────────────────

function EloWorldView({ user }: { user: MeshUser }) {
  return (
    <div className="elo-world-view">
      <div className="elo-left-panel">
        <div className="elo-panel-header">// CHARACTER</div>
        <EloProfileCard userId={user.id} />
      </div>
      <div className="elo-center-panel">
        <div className="elo-panel-header">// AETHENVEIL ZONE MAP — SERVER TM-01</div>
        <EloZoneMap />
      </div>
      <div className="elo-right-panel">
        <EloChatRail />
      </div>
    </div>
  );
}

// ── Mail View ──────────────────────────────────────────────────────────────

function EloMailView({ user }: { user: MeshUser }) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selected, setSelected] = useState<Email | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setFetchError(false);
      const { data, error } = await supabase
        .from('mesh_emails')
        .select('*, from_user:mesh_users(*), from_npc:mesh_npc_identities(*)')
        .eq('to_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setFetchError(true);
        setLoading(false);
        return;
      }

      const all = (data ?? []) as Email[];
      const filtered = all.filter(e => {
        const npcHandle = e.from_npc?.handle?.toLowerCase() ?? '';
        const subject = e.subject?.toLowerCase() ?? '';
        return npcHandle.includes('segotari') || subject.includes('[elo]');
      });
      setEmails(filtered);
      setLoading(false);
    };
    load();
  }, [user.id]);

  if (loading) {
    return <div className="elo-mail-empty">CONNECTING TO ELFLINES MAIL...</div>;
  }

  if (fetchError) {
    return <div className="elo-mail-empty">// ERROR CONNECTING TO MAIL SERVER</div>;
  }

  if (selected) {
    const from = selected.from_npc?.display_name ?? selected.from_npc?.handle ?? selected.from_user?.handle ?? 'Unknown';
    const date = new Date(selected.created_at).toLocaleDateString();
    return (
      <div className="elo-mail-reader">
        <div className="elo-mail-reader-header">
          <button className="elo-mail-back" onClick={() => setSelected(null)}>← BACK</button>
          <div className="elo-mail-meta-row"><span className="elo-mail-meta-label">FROM:</span> {from}</div>
          <div className="elo-mail-meta-row"><span className="elo-mail-meta-label">SUBJ:</span> {selected.subject}</div>
          <div className="elo-mail-meta-row"><span className="elo-mail-meta-label">DATE:</span> {date}</div>
        </div>
        <div className="elo-mail-body">{selected.body}</div>
      </div>
    );
  }

  if (emails.length === 0) {
    return <div className="elo-mail-empty">// NO ELFLINES MAIL — INBOX CLEAR</div>;
  }

  return (
    <div className="elo-mail-list">
      {emails.map(e => {
        const from = e.from_npc?.handle ?? e.from_user?.handle ?? 'Unknown';
        const date = new Date(e.created_at).toLocaleDateString();
        return (
          <div
            key={e.id}
            className={`elo-mail-row${e.is_read ? '' : ' unread'}`}
            onClick={() => setSelected(e)}
          >
            <span className="elo-mail-unread-dot">{e.is_read ? '' : '●'}</span>
            <span className="elo-mail-from">{from}</span>
            <span className="elo-mail-subject">{e.subject}</span>
            <span className="elo-mail-date">{date}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Root Module ────────────────────────────────────────────────────────────

export function EloModule({ user }: EloModuleProps) {
  const [view, setView] = useState<'world' | 'mail'>('world');

  return (
    <div className="elo-module">
      <div className="elo-tab-bar">
        <button
          className={`elo-tab${view === 'world' ? ' active' : ''}`}
          onClick={() => setView('world')}
        >
          ◈ WORLD
        </button>
        <button
          className={`elo-tab${view === 'mail' ? ' active' : ''}`}
          onClick={() => setView('mail')}
        >
          ✉ MAIL
        </button>
        <div className="elo-tab-node">// SEGOTARI-NET — NODE: TM-01 — CONNECTED</div>
      </div>
      {view === 'world'
        ? <EloWorldView user={user} />
        : <EloMailView user={user} />
      }
    </div>
  );
}
