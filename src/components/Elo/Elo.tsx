import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { MeshUser, EloProfile, Email } from '../../types';
import eloMap from '../../assets/images/elo-map.png';
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

// Zone bounding boxes [xMin, yMin, xMax, yMax] in 0–100 SVG viewBox percentage coords
const ZONE_BOUNDS: Record<string, [number, number, number, number]> = {
  highwall:  [20, 5,  50, 30],
  ashfen:    [5,  28, 40, 58],
  greenfeld: [5,  58, 45, 95],
  miasma:    [42, 0,  98, 98],
};

// Zone colour and opacity per zone
const ZONE_DOT_STYLE: Record<string, { fill: string; opacity: number }> = {
  highwall:  { fill: '#f0b84a', opacity: 0.90 },
  ashfen:    { fill: '#c87a2a', opacity: 0.70 },
  greenfeld: { fill: '#f0b84a', opacity: 0.85 },
  miasma:    { fill: '#8a3a2a', opacity: 0.50 },
};

// Zone assignment for the 20 dots: 5 highwall, 4 ashfen, 6 greenfeld, 5 miasma
const DOT_ZONES = [
  'highwall','highwall','highwall','highwall','highwall',
  'ashfen','ashfen','ashfen','ashfen',
  'greenfeld','greenfeld','greenfeld','greenfeld','greenfeld','greenfeld',
  'miasma','miasma','miasma','miasma','miasma',
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
  const now = Date.now();
  return DOT_ZONES.map((zone, i) => {
    const [x, y] = randInBounds(ZONE_BOUNDS[zone]);
    // Stagger initial waypoints so dots don't all start moving at once
    const initialOffset = i * 400 + Math.random() * 2000;
    return {
      id: i,
      zone,
      name: names[i % names.length],
      x, y,
      targetX: x, targetY: y,
      fromX: x, fromY: y,
      nextMoveAt: now + initialOffset,
      moveDuration: 6000 + Math.random() * 4000,
      moveStartedAt: now,
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
  const [hoveredDotId, setHoveredDotId] = useState<number | null>(null);
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
            // Miasma dots wander even more slowly
            const durationBase = dot.zone === 'miasma' ? 8000 : 6000;
            const waitBase    = dot.zone === 'miasma' ? 12000 : 8000;
            return {
              ...dot,
              x, y,
              fromX: x, fromY: y,
              targetX: nx, targetY: ny,
              moveStartedAt: now,
              moveDuration: durationBase + Math.random() * 4000,
              nextMoveAt: now + waitBase + Math.random() * 6000,
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

  // Look up the hovered dot from current state for tooltip position
  const hoveredDot = hoveredDotId !== null ? dots.find(d => d.id === hoveredDotId) ?? null : null;

  return (
    <div className="elo-map-container">
      {/* Static background image */}
      <img
        src={eloMap}
        alt="Aethenveil zone map"
        className="elo-map-bg"
        draggable={false}
      />

      {/* SVG overlay — labels, dots, tooltip */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="elo-map-svg"
        xmlns="http://www.w3.org/2000/svg"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          {/* Dot glow */}
          <filter id="dot-glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Zone Labels ── */}

        {/* Highwall Citadel */}
        <text x="32" y="28" textAnchor="middle"
          fontFamily="'Palatino Linotype', Georgia, serif"
          fontSize="3.5" fontVariant="small-caps" letterSpacing="0.15em"
          fill="#f0b84a">
          HIGHWALL CITADEL
        </text>

        {/* Ashfen */}
        <text x="18" y="36" textAnchor="middle"
          fontFamily="'Palatino Linotype', Georgia, serif"
          fontSize="3" fontVariant="small-caps" letterSpacing="0.12em"
          fill="#8a7055">
          ASHFEN
        </text>

        {/* Razorfire Caverns */}
        <text x="18" y="49" textAnchor="middle"
          fontFamily="'Palatino Linotype', Georgia, serif"
          fontSize="2.8" letterSpacing="0.1em"
          fill="#f0b84a">
          ✦
        </text>
        <text x="18" y="52.5" textAnchor="middle"
          fontFamily="'Palatino Linotype', Georgia, serif"
          fontSize="2.2" fontVariant="small-caps" letterSpacing="0.1em"
          fill="#a06e1a">
          RAZORFIRE CAVERNS
        </text>

        {/* Greenfeld */}
        <text x="18" y="82" textAnchor="middle"
          fontFamily="'Palatino Linotype', Georgia, serif"
          fontSize="3.5" fontVariant="small-caps" letterSpacing="0.15em"
          fill="#a08040">
          GREENFELD
        </text>
        <text x="18" y="85.5" textAnchor="middle"
          fontFamily="'Palatino Linotype', Georgia, serif"
          fontSize="2" letterSpacing="0.2em"
          fill="#8a7055">
          SAFE ZONE
        </text>

        {/* The Miasma */}
        <text x="72" y="55" textAnchor="middle"
          fontFamily="'Palatino Linotype', Georgia, serif"
          fontSize="4" fontVariant="small-caps" letterSpacing="0.25em"
          fill="#4a3560" opacity="0.6">
          THE MIASMA
        </text>

        {/* ── Player dots ── */}
        {dots.map(dot => {
          const style = ZONE_DOT_STYLE[dot.zone];
          const r = dot.zone === 'miasma' ? 0.55 : 0.65;
          return (
            <circle
              key={dot.id}
              cx={dot.x}
              cy={dot.y}
              r={r}
              fill={style.fill}
              opacity={style.opacity}
              filter="url(#dot-glow)"
              style={{ pointerEvents: 'all', cursor: 'default' }}
              onMouseEnter={() => setHoveredDotId(dot.id)}
              onMouseLeave={() => setHoveredDotId(null)}
            />
          );
        })}

        {/* ── Hover tooltip ── */}
        {hoveredDot && (() => {
          const name = hoveredDot.name;
          // Estimate box width: ~0.9 SVG units per char, plus padding
          const boxW = Math.min(name.length * 0.9 + 2, 32);
          const boxH = 4;
          // Clamp x so tooltip stays within viewBox
          const tx = Math.max(1, Math.min(hoveredDot.x - boxW / 2, 99 - boxW));
          // Place above the dot; flip below if near the top
          const ty = hoveredDot.y < 10 ? hoveredDot.y + 2 : hoveredDot.y - boxH - 1.5;
          return (
            <g pointerEvents="none">
              <rect
                x={tx} y={ty}
                width={boxW} height={boxH}
                fill="#0f0a06"
                stroke="#5c3d1e"
                strokeWidth="0.25"
                rx="0.4"
                opacity="0.95"
              />
              <text
                x={tx + boxW / 2} y={ty + 2.7}
                textAnchor="middle"
                fontFamily="'Palatino Linotype', Georgia, serif"
                fontSize="2.2"
                fill="#f0b84a"
              >
                {name}
              </text>
            </g>
          );
        })()}
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
