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
          {/* ── Gradients ── */}

          {/* Greenfeld: warm olive-gold centre → dark forest edges */}
          <radialGradient id="greenfeld-fill" cx="155" cy="455" r="175" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#3d5e14" />
            <stop offset="55%"  stopColor="#2a4610" />
            <stop offset="100%" stopColor="#0e1a04" />
          </radialGradient>

          {/* Ashfen: murky olive-brown, unsettled */}
          <radialGradient id="ashfen-fill" cx="160" cy="320" r="130" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#2c2a0e" />
            <stop offset="65%"  stopColor="#1c1808" />
            <stop offset="100%" stopColor="#0c0a02" />
          </radialGradient>

          {/* Highwall: warm amber-gold torchlight */}
          <radialGradient id="highwall-fill" cx="380" cy="105" r="155" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#4e3212" />
            <stop offset="45%"  stopColor="#3a2408" />
            <stop offset="100%" stopColor="#160c02" />
          </radialGradient>

          {/* Miasma: deep purple-black far edges → corrupted purple near boundary */}
          <linearGradient id="miasma-gradient" x1="800" y1="0" x2="260" y2="600" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#080212" />
            <stop offset="55%"  stopColor="#12061e" />
            <stop offset="100%" stopColor="#1e0c2a" />
          </linearGradient>

          {/* ── Filters ── */}

          {/* Miasma boundary: turbulence + displacement for organic shifting edge */}
          <filter id="miasma-distort" x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence type="turbulence" baseFrequency="0.018 0.012" numOctaves="3" seed="12" result="turbulence">
              <animate
                attributeName="baseFrequency"
                values="0.018 0.012;0.022 0.016;0.015 0.019;0.021 0.013;0.018 0.012"
                dur="22s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="22" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* Miasma feathered penumbra */}
          <filter id="miasma-feather" x="-12%" y="-12%" width="124%" height="124%">
            <feGaussianBlur stdDeviation="16" />
          </filter>

          {/* Highwall outer glow halo */}
          <filter id="highwall-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Amber text glow for Highwall label */}
          <filter id="amber-text-glow" x="-40%" y="-120%" width="180%" height="340%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Dot glow */}
          <filter id="dot-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Miasma purple noise texture */}
          <filter id="miasma-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.04" numOctaves="3" seed="7" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="grey" />
            <feBlend in="SourceGraphic" in2="grey" mode="multiply" />
          </filter>

          {/* Full-map parchment grain — very low opacity aged-paper feel */}
          <filter id="map-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="3" seed="3" stitchTiles="stitch" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="grey" />
            <feBlend in="SourceGraphic" in2="grey" mode="screen" />
          </filter>

          {/* Vignette: strong corner darkening */}
          <radialGradient id="vignette" cx="50%" cy="50%" r="60%">
            <stop offset="0%"   stopColor="transparent" />
            <stop offset="68%"  stopColor="#0a0704" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0a0704" stopOpacity="0.85" />
          </radialGradient>
        </defs>

        {/* ── Background — warm dark brown, unexplored territory ── */}
        <rect width="800" height="600" fill="#0a0704" />

        {/* ── Parchment grain overlay (full map, ~4% opacity) ── */}
        <rect width="800" height="600" fill="#c8902a" opacity="0.04" filter="url(#map-grain)" />

        {/* ── Greenfeld — safe zone, bottom-left ── */}
        {/* Soft bloom underneath to brighten the zone */}
        <polygon
          points="15,330 185,298 290,318 312,592 15,592"
          fill="#2e5010"
          opacity="0.30"
          filter="url(#miasma-feather)"
        />
        {/* Main zone fill — rough irregular border */}
        <polygon
          points="15,330 185,298 290,318 312,592 15,592"
          fill="url(#greenfeld-fill)"
          stroke="#5a8020"
          strokeWidth="1.8"
          strokeDasharray="10 3 5 2 8 4 3"
          opacity="0.95"
        />
        {/* Terrain lines — horizontal */}
        <line x1="35" y1="362" x2="112" y2="355" stroke="#4a7018" strokeWidth="0.7" opacity="0.38" />
        <line x1="48" y1="392" x2="158" y2="382" stroke="#4a7018" strokeWidth="0.7" opacity="0.36" />
        <line x1="28" y1="428" x2="182" y2="416" stroke="#4a7018" strokeWidth="0.6" opacity="0.33" />
        <line x1="38" y1="462" x2="218" y2="448" stroke="#4a7018" strokeWidth="0.6" opacity="0.32" />
        <line x1="22" y1="502" x2="232" y2="490" stroke="#4a7018" strokeWidth="0.5" opacity="0.28" />
        <line x1="44" y1="538" x2="268" y2="525" stroke="#4a7018" strokeWidth="0.5" opacity="0.26" />
        {/* Diagonal terrain — rolling hills suggestion */}
        <line x1="75" y1="342" x2="138" y2="395" stroke="#3a6014" strokeWidth="0.6" opacity="0.28" />
        <line x1="148" y1="345" x2="212" y2="402" stroke="#3a6014" strokeWidth="0.6" opacity="0.25" />
        <line x1="58" y1="442" x2="118" y2="502" stroke="#3a6014" strokeWidth="0.5" opacity="0.22" />
        {/* Tree silhouettes at Greenfeld edges */}
        <polygon points="20,578 28,558 36,578"  fill="#3a5a12" opacity="0.72" />
        <polygon points="40,580 49,559 58,580"  fill="#3e6014" opacity="0.68" />
        <polygon points="60,576 69,555 78,576"  fill="#385810" opacity="0.70" />
        <polygon points="22,543 30,524 38,543"  fill="#3a5a12" opacity="0.52" />
        <polygon points="14,508 22,488 30,508"  fill="#3e6014" opacity="0.48" />
        <polygon points="278,551 286,530 294,551" fill="#3a5a12" opacity="0.46" />
        <polygon points="292,563 300,542 308,563" fill="#385810" opacity="0.44" />

        {/* ── Ashfen — middle-left marshland, jagged Miasma-facing edge ── */}
        <polygon
          points="18,248 165,218 282,248 306,336 290,354 304,370 280,388 295,403 260,416 88,432 18,378"
          fill="url(#ashfen-fill)"
          stroke="#3e3a14"
          strokeWidth="1.2"
          strokeDasharray="6 3 2 4"
          opacity="0.92"
        />
        {/* Reed/marsh — short vertical strokes suggesting reeds */}
        <line x1="42"  y1="272" x2="42"  y2="257" stroke="#4e4a1a" strokeWidth="0.9" opacity="0.52" />
        <line x1="53"  y1="283" x2="53"  y2="268" stroke="#4e4a1a" strokeWidth="0.9" opacity="0.48" />
        <line x1="66"  y1="291" x2="66"  y2="276" stroke="#4e4a1a" strokeWidth="0.8" opacity="0.48" />
        <line x1="79"  y1="300" x2="79"  y2="285" stroke="#4e4a1a" strokeWidth="0.8" opacity="0.45" />
        <line x1="92"  y1="312" x2="92"  y2="297" stroke="#4e4a1a" strokeWidth="0.8" opacity="0.43" />
        <line x1="107" y1="319" x2="107" y2="303" stroke="#4e4a1a" strokeWidth="0.7" opacity="0.42" />
        <line x1="44"  y1="346" x2="44"  y2="331" stroke="#4e4a1a" strokeWidth="0.8" opacity="0.38" />
        <line x1="58"  y1="358" x2="58"  y2="343" stroke="#4e4a1a" strokeWidth="0.7" opacity="0.36" />
        <line x1="72"  y1="369" x2="72"  y2="354" stroke="#4e4a1a" strokeWidth="0.7" opacity="0.36" />
        <line x1="86"  y1="379" x2="86"  y2="363" stroke="#4e4a1a" strokeWidth="0.7" opacity="0.33" />
        <line x1="126" y1="296" x2="126" y2="281" stroke="#4e4a1a" strokeWidth="0.8" opacity="0.40" />
        <line x1="143" y1="303" x2="143" y2="288" stroke="#4e4a1a" strokeWidth="0.7" opacity="0.38" />
        <line x1="161" y1="309" x2="161" y2="294" stroke="#4e4a1a" strokeWidth="0.7" opacity="0.36" />
        <line x1="179" y1="299" x2="179" y2="284" stroke="#4e4a1a" strokeWidth="0.7" opacity="0.33" />

        {/* ── Highwall Citadel — top-centre fortress ── */}
        {/* Outer amber glow halo */}
        <polygon
          points="248,14 482,14 512,88 492,172 404,212 316,172 274,88"
          fill="#6a4818"
          opacity="0.26"
          filter="url(#highwall-glow)"
        />
        {/* Main zone fill */}
        <polygon
          points="248,14 482,14 512,88 492,172 404,212 316,172 274,88"
          fill="url(#highwall-fill)"
          stroke="#c8902a"
          strokeWidth="2"
          opacity="0.94"
        />
        {/* Crenellations — dark notches cut into top edge */}
        <rect x="266" y="5"  width="12" height="11" fill="#0a0704" />
        <rect x="288" y="5"  width="12" height="11" fill="#0a0704" />
        <rect x="310" y="5"  width="12" height="11" fill="#0a0704" />
        <rect x="332" y="5"  width="12" height="11" fill="#0a0704" />
        <rect x="354" y="5"  width="12" height="11" fill="#0a0704" />
        <rect x="376" y="5"  width="12" height="11" fill="#0a0704" />
        <rect x="398" y="5"  width="12" height="11" fill="#0a0704" />
        <rect x="420" y="5"  width="12" height="11" fill="#0a0704" />
        <rect x="442" y="5"  width="12" height="11" fill="#0a0704" />
        <rect x="464" y="5"  width="12" height="11" fill="#0a0704" />
        {/* Mountain triangles — suggesting high ground */}
        <polygon points="320,170 340,130 360,170" fill="none" stroke="#8a6828" strokeWidth="1.3" opacity="0.62" />
        <polygon points="352,168 376,116 400,168" fill="none" stroke="#9a7832" strokeWidth="1.6" opacity="0.68" />
        <polygon points="393,172 412,138 431,172" fill="none" stroke="#8a6828" strokeWidth="1.3" opacity="0.58" />
        {/* Snow cap on tallest peak */}
        <polygon points="368,124 376,116 384,124" fill="#c8902a" opacity="0.30" />

        {/* ── The Miasma — organic shifting boundary ── */}
        {/* Feathered penumbra — blurred soft outer edge */}
        <polygon
          className="elo-miasma-blur"
          points="210,0 800,0 800,600 355,600 310,470 268,358 232,245 212,142"
          fill="#220e2e"
          opacity="0.58"
          filter="url(#miasma-feather)"
        />
        {/* Core fill — turbulence displacement makes boundary organic */}
        <polygon
          className="elo-miasma-fill"
          points="248,0 800,0 800,600 390,600 340,490 295,375 258,265 248,160"
          fill="url(#miasma-gradient)"
          opacity="0.92"
          filter="url(#miasma-distort)"
        />
        {/* Far-corner depth — deepens the dark far from boundary */}
        <polygon
          points="450,0 800,0 800,600 550,600"
          fill="#04010a"
          opacity="0.42"
        />
        {/* Purple noise texture over Miasma */}
        <polygon
          points="248,0 800,0 800,600 390,600 340,490 295,375 258,265 248,160"
          fill="#3a1850"
          opacity="0.18"
          filter="url(#miasma-noise)"
        />

        {/* ── Travel path lines — Greenfeld → Ashfen → Razorfire ── */}
        <polyline
          points="142,578 136,492 130,418 128,362"
          fill="none"
          stroke="#8a7830"
          strokeWidth="0.9"
          strokeDasharray="3 5"
          opacity="0.42"
        />
        <polyline
          points="128,362 131,342 139,318 148,302"
          fill="none"
          stroke="#6a5820"
          strokeWidth="0.9"
          strokeDasharray="3 5"
          opacity="0.38"
        />
        {/* Waypoint dots */}
        <circle cx="142" cy="578" r="2"   fill="#8a7830" opacity="0.48" />
        <circle cx="128" cy="362" r="2"   fill="#7a6828" opacity="0.44" />
        <circle cx="148" cy="302" r="2.2" fill="#8a6820" opacity="0.52" />

        {/* ── Zone Labels ── */}

        {/* Greenfeld — warm gold */}
        <text x="135" y="526" className="elo-zone-label elo-zone-safe" textAnchor="middle">
          GREENFELD
        </text>
        <text x="135" y="543" className="elo-zone-sublabel elo-zone-safe" textAnchor="middle" opacity="0.72">
          SAFE ZONE
        </text>

        {/* Ashfen — muted olive, harder to read */}
        <text x="145" y="260" className="elo-zone-label elo-zone-marsh" textAnchor="middle">
          ASHFEN
        </text>

        {/* Razorfire Caverns POI — warning marker */}
        <text x="148" y="289" className="elo-poi-icon" textAnchor="middle">✦</text>
        <text x="148" y="302" className="elo-poi-label" textAnchor="middle">RAZORFIRE CAVERNS</text>

        {/* Highwall Citadel — brightest label, amber glow */}
        <text
          x="380" y="126"
          className="elo-zone-label elo-zone-citadel"
          textAnchor="middle"
          filter="url(#amber-text-glow)"
        >
          HIGHWALL CITADEL
        </text>

        {/* The Miasma — large, deeply faded */}
        <text x="600" y="360" className="elo-zone-label elo-zone-miasma" textAnchor="middle" opacity="0.28">
          THE MIASMA
        </text>

        {/* ── Vignette overlay — strong corner framing ── */}
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
