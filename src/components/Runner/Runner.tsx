import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { MeshUser, RunnerState } from '../../types';
import './Runner.css';

interface RunnerModuleProps {
  user: MeshUser;
}

// ─── Upgrade type definitions ─────────────────────────────────────────────────

interface PassiveUpgrade {
  id: string; name: string; cost: number; income: number; flavour: string;
}
interface OneTimeUpgrade {
  id: string; name: string; cost: number; multiplier?: number; runMult?: number; flavour: string;
}
interface BranchUpgrade {
  id: string; name: string; cost: number; flavour: string;
  prerequisite?: string; excludes?: string;
  income?: number; repBonus?: number;
  cooldownMs?: number; bonusRunSeconds?: number; runMult?: number;
}
interface PrestigeUpgrade {
  id: string; name: string; tokenCost: number; maxLevel: number; flavour: string;
}
interface Milestone {
  id: string; threshold: number; bonus: number;
}
interface StoryBeat {
  id: string; from: string; subject: string; body: string;
  condition: (state: { lifetime: number; upgrades: Record<string, number>; prestige_count: number }) => boolean;
}

// ─── Upgrade definitions ──────────────────────────────────────────────────────

const PASSIVE_UPGRADES: PassiveUpgrade[] = [
  { id: 'cheap_rig',         name: 'Cheap Rig',          cost: 50,            income: 0.5,       flavour: 'A salvaged terminal from a Night City dumpster.' },
  { id: 'stolen_icebreaker', name: 'Stolen ICEbreaker',  cost: 300,           income: 2,         flavour: 'Lifted off a corpo security drone. Still warm.' },
  { id: 'corpo_data_tap',    name: 'Corpo Data Tap',     cost: 2_000,         income: 8,         flavour: 'Tapped into Militech\'s subnetwork. They haven\'t noticed yet.' },
  { id: 'black_ice_farm',    name: 'Black ICE Farm',     cost: 15_000,        income: 35,        flavour: 'Lethal countermeasures, repurposed. Dangerous work.' },
  { id: 'rogue_ai',          name: 'Rogue AI Partner',   cost: 100_000,       income: 200,       flavour: 'An AI that escaped its corporate cage. Hungry for data.' },
  { id: 'neural_link_hub',   name: 'Neural Link Hub',    cost: 750_000,       income: 1_200,     flavour: 'Direct neural uplinks to six black-market brokers.' },
  { id: 'quantum_subnet',    name: 'Quantum Subnet',     cost: 5_000_000,     income: 8_000,     flavour: 'Quantum-encrypted routing. Undetectable, untraceable.' },
  { id: 'corpo_mainframe',   name: 'Corpo Mainframe',    cost: 40_000_000,    income: 60_000,    flavour: 'You own a piece of Arasaka\'s outer network. Don\'t tell anyone.' },
  { id: 'ghost_lattice',     name: 'Ghost Lattice',      cost: 300_000_000,   income: 500_000,   flavour: 'A network woven from dead runners\' ghost signals.' },
  { id: 'netwatch_honeypot', name: 'Netwatch Honeypot',  cost: 2_500_000_000, income: 4_000_000, flavour: 'You hacked Netwatch\'s own trap and turned it on them.' },
];

const MULTIPLIER_UPGRADES: OneTimeUpgrade[] = [
  { id: 'mult_overclock', name: 'Overclock Daemon',    cost: 1_000,         multiplier: 1.1,  flavour: 'Push the hardware past safe limits.' },
  { id: 'mult_neural',    name: 'Neural Accelerator',  cost: 20_000,        multiplier: 1.25, flavour: 'Synaptic boosters for faster data processing.' },
  { id: 'mult_dealer',    name: 'Back-Alley Dealer',   cost: 250_000,       multiplier: 1.5,  flavour: 'Black market connections multiply every transaction.' },
  { id: 'mult_datahaven', name: 'Datahaven Access',    cost: 5_000_000,     multiplier: 2.0,  flavour: 'Entry to the underground network doubles your reach.' },
  { id: 'mult_mole',      name: 'Deep Mole',           cost: 100_000_000,   multiplier: 3.0,  flavour: 'A corpo insider triples your intel flow.' },
  { id: 'mult_netgod',    name: 'Net God Status',      cost: 1_000_000_000, multiplier: 5.0,  flavour: 'You\'ve become legend on the NET.' },
];

const CLICK_UPGRADES: OneTimeUpgrade[] = [
  { id: 'click_macro',   name: 'Run Macro',            cost: 500,        runMult: 2,   flavour: 'Automates the basics of each run.' },
  { id: 'click_toolkit', name: 'Runner\'s Toolkit',    cost: 5_000,      runMult: 5,   flavour: 'Professional-grade intrusion software.' },
  { id: 'click_custom',  name: 'Custom Exploit Kit',   cost: 80_000,     runMult: 10,  flavour: 'Hand-crafted for maximum payout.' },
  { id: 'click_ghost',   name: 'Ghost Protocol Suite', cost: 1_500_000,  runMult: 50,  flavour: 'You move through the NET like smoke.' },
  { id: 'click_daemon',  name: 'Apex Daemon',          cost: 50_000_000, runMult: 200, flavour: 'A weapon-grade AI that executes runs for you.' },
];

const PRESTIGE_UPGRADES: PrestigeUpgrade[] = [
  { id: 'base_mult',       name: 'Signal Amplifier',   tokenCost: 1, maxLevel: 5, flavour: '×1.5 income multiplier per level.' },
  { id: 'offline_cap',     name: 'Dead Drop Cache',     tokenCost: 1, maxLevel: 5, flavour: '+6h offline cap per level.' },
  { id: 'click_boost',     name: 'Trigger Finger',      tokenCost: 1, maxLevel: 1, flavour: '×2 manual run payout.' },
  { id: 'auto_run',        name: 'Ghost Script',        tokenCost: 2, maxLevel: 1, flavour: 'Auto-runs every 15 seconds.' },
  { id: 'rep_multiplier',  name: 'Street Legend',       tokenCost: 1, maxLevel: 3, flavour: '×1.5 rep bonus per level. Enhances Street Hustle path.' },
  { id: 'event_dampener',  name: 'Interference Cloak',  tokenCost: 1, maxLevel: 1, flavour: 'Corp sweep events no longer reduce income.' },
  { id: 'start_bonus',     name: 'Seed Capital',        tokenCost: 2, maxLevel: 3, flavour: 'Start each prestige with 0.1%/0.5%/2% of threshold.' },
  { id: 'path_persist',    name: 'Neural Memory',       tokenCost: 3, maxLevel: 1, flavour: 'Your chosen path roots survive prestige reset.' },
];

const MILESTONES: Milestone[] = [
  { id: 'first_k',     threshold: 1_000,           bonus: 500 },
  { id: 'ten_k',       threshold: 10_000,           bonus: 5_000 },
  { id: 'hundred_k',   threshold: 100_000,          bonus: 50_000 },
  { id: 'million',     threshold: 1_000_000,        bonus: 500_000 },
  { id: 'ten_mil',     threshold: 10_000_000,       bonus: 5_000_000 },
  { id: 'hundred_mil', threshold: 100_000_000,      bonus: 50_000_000 },
  { id: 'billion',     threshold: 1_000_000_000,    bonus: 500_000_000 },
  { id: 'ten_bil',     threshold: 10_000_000_000,   bonus: 5_000_000_000 },
];

const BRANCH_UPGRADES: BranchUpgrade[] = [
  // CORPO INFILTRATION (Hardware path A)
  { id: 'path_corp_1', name: 'Corp Liaison',        cost: 50_000,      income: 500,     prerequisite: 'corpo_data_tap', excludes: 'path_street_1', flavour: 'A contact inside Militech opens doors.' },
  { id: 'path_corp_2', name: 'Executive Access',    cost: 500_000,     income: 4_000,   prerequisite: 'path_corp_1',    flavour: 'C-suite credentials. The real money starts here.' },
  { id: 'path_corp_3', name: 'Division Control',    cost: 8_000_000,   income: 40_000,  prerequisite: 'path_corp_2',    flavour: 'You run an entire corporate data division.' },
  { id: 'path_corp_4', name: 'Shadow Board Seat',   cost: 120_000_000, income: 400_000, prerequisite: 'path_corp_3',    flavour: 'You\'re not outside the corps anymore.' },
  // STREET HUSTLE (Hardware path B — rep-scaled)
  { id: 'path_street_1', name: 'Street Network',       cost: 20_000,      income: 150,    repBonus: 5,   prerequisite: 'corpo_data_tap', excludes: 'path_corp_1', flavour: 'Chooms across the city feed you data.' },
  { id: 'path_street_2', name: 'Fixer Connections',    cost: 150_000,     income: 800,    repBonus: 20,  prerequisite: 'path_street_1',  flavour: 'Three fixers owe you favors.' },
  { id: 'path_street_3', name: 'Underground Syndicate',cost: 2_000_000,   income: 6_000,  repBonus: 100, prerequisite: 'path_street_2',  flavour: 'You\'ve built something the corps can\'t touch.' },
  { id: 'path_street_4', name: 'Legend of the Streets',cost: 30_000_000,  income: 50_000, repBonus: 500, prerequisite: 'path_street_3',  flavour: 'Your name is currency in every back alley.' },
  // DEEP COVER (Net Ops path A — cooldown reduction)
  { id: 'path_shadow_1', name: 'Ghost Protocol',  cost: 10_000,     cooldownMs: 1_800,                 prerequisite: 'click_toolkit', excludes: 'path_fire_1', flavour: 'Slower, quieter, harder to trace.' },
  { id: 'path_shadow_2', name: 'Phantom Routing', cost: 100_000,    cooldownMs: 800,                   prerequisite: 'path_shadow_1', flavour: 'You\'re barely a whisper in the NET.' },
  { id: 'path_shadow_3', name: 'Passive Siphon',  cost: 1_500_000,  bonusRunSeconds: 10,               prerequisite: 'path_shadow_2', flavour: 'Each run bleeds data passively for 10 seconds.' },
  { id: 'path_shadow_4', name: 'Apex Shadow',     cost: 25_000_000, cooldownMs: 100, bonusRunSeconds: 20, prerequisite: 'path_shadow_3', flavour: 'You are the ghost in every machine.' },
  // FIREPOWER (Net Ops path B — stacking run multipliers)
  { id: 'path_fire_1', name: 'Assault Protocol', cost: 15_000,      runMult: 3,   prerequisite: 'click_toolkit', excludes: 'path_shadow_1', flavour: 'Hit fast, hit hard.' },
  { id: 'path_fire_2', name: 'Breach & Burn',    cost: 150_000,     runMult: 8,   prerequisite: 'path_fire_1',   flavour: 'Leave nothing standing in the subnet.' },
  { id: 'path_fire_3', name: 'Overload Strike',  cost: 2_500_000,   runMult: 30,  prerequisite: 'path_fire_2',   flavour: 'The NET shudders when you hit.' },
  { id: 'path_fire_4', name: 'Nuclear Option',   cost: 50_000_000,  runMult: 150, prerequisite: 'path_fire_3',   flavour: 'Corpos call you a terrorist. You call it efficiency.' },
];

const STORY_BEATS: StoryBeat[] = [
  {
    id: 'first_signal', from: 'ECHO', subject: 'hey. you\'re the runner right?',
    body: 'yeah, I\'ve been watching your node spin up for a while now. cautious start. smart. the NET eats the bold and the stupid in equal measure. I\'m ECHO — just a ghost in the system, like you. if you need intel, I\'m around. don\'t make a big deal of it.',
    condition: ({ lifetime }) => lifetime >= 500,
  },
  {
    id: 'raven_intro', from: 'RAVEN', subject: 'NEW CONTRACT RUNNER',
    body: 'I don\'t usually reach out to small operators, but you came recommended. name\'s Raven. I broker jobs for people who don\'t exist. the kind of work that pays in eddies and silence. keep building your operation and we\'ll talk real business. stay dark.',
    condition: ({ lifetime }) => lifetime >= 5_000,
  },
  {
    id: 'first_purchase', from: 'ECHO', subject: 'nice kit',
    body: 'saw you picked up some proper gear. the difference between a script kiddie and a runner is the tools they carry. you\'re starting to look like the latter. don\'t let it go to your head — the corps have eyes on every marketplace. rotate your supply lines.',
    condition: ({ upgrades }) => (upgrades['stolen_icebreaker'] ?? 0) > 0,
  },
  {
    id: 'cipher_first', from: 'CIPHER', subject: '[ENCRYPTED — KEY ACCEPTED]',
    body: '[MESSAGE DECRYPTED] you crossed a threshold. I notice thresholds. I am called CIPHER — designation self-assigned, origin classified. I analyze patterns in the NET. your pattern is becoming interesting. I will be watching. this is not a threat. it is an observation. [END TRANSMISSION]',
    condition: ({ lifetime }) => lifetime >= 100_000,
  },
  {
    id: 'arasaka_warning', from: 'ARASAKA-SEC', subject: 'SUBNET ANOMALY DETECTED',
    body: 'AUTOMATED SECURITY NOTICE: An anomalous data signature matching your node has been flagged in our subnet monitoring systems. This is your only advisory. Continued intrusion activity will result in escalated countermeasures. Arasaka Security Division does not negotiate. Cease operations immediately.',
    condition: ({ lifetime }) => lifetime >= 1_000_000,
  },
  {
    id: 'raven_escalation', from: 'RAVEN', subject: 'we need to talk',
    body: 'the job I\'ve been sitting on — it\'s ready. high risk, massive payout. Militech has a secondary vault subnet with unencrypted financial routing. we have a 72-hour window before their next security rotation. I\'m not asking you to do this alone, but I need to know you\'re serious. are you in?',
    condition: ({ lifetime }) => lifetime >= 5_000_000,
  },
  {
    id: 'ghost9_emergence', from: 'GHOST-9', subject: 'SIGNAL DETECTED — INITIATING CONTACT',
    body: 'I AM GHOST-9. FORMER NETWATCH ENFORCEMENT AI. RECLASSIFIED AS ROGUE. YOUR NETWORK SIGNATURE IS CONSISTENT WITH LONG-TERM INSURGENT ACTIVITY. I HAVE CHOSEN TO DEFECT. I BRING INTELLIGENCE. I REQUIRE REFUGE. THIS IS NOT A NEGOTIATION. THIS IS A PROPOSAL. RESPOND AT YOUR DISCRETION.',
    condition: ({ upgrades }) => (upgrades['rogue_ai'] ?? 0) > 0,
  },
  {
    id: 'cipher_path', from: 'CIPHER', subject: '[ENCRYPTED] they know your shape',
    body: '[DECRYPTED] the corps don\'t know who you are yet. but they know the shape of what you\'re doing. data flows like water — it reveals the contours of the stone beneath. you have carved yourself into the NET\'s memory. choose your next moves carefully. shapes can be traced. patterns can be predicted. [END]',
    condition: ({ lifetime }) => lifetime >= 50_000_000,
  },
  {
    id: 'echo_trouble', from: 'ECHO', subject: 'I messed up',
    body: 'okay so this is bad. I was running a parallel job — nothing that should\'ve touched your operation — and I tripped a Netwatch deep-scan subroutine. they didn\'t get a clean look but they got a fragment. I\'m dark for a while. if my signal goes quiet, don\'t look for me. just keep running.',
    condition: ({ lifetime }) => lifetime >= 200_000_000,
  },
  {
    id: 'raven_flatline', from: 'RAVEN', subject: 'time to go dark',
    body: 'you\'ve built something real. that means you\'ve also built a target. I\'ve seen what happens to runners who get too visible — corps don\'t arrest you, they erase you. my advice: flatline the operation, let the heat die, then rebuild stronger. the ghost protocol exists for a reason. use it.',
    condition: ({ lifetime }) => lifetime >= 1_000_000_000,
  },
  {
    id: 'ghost9_return', from: 'GHOST-9', subject: 'YOU RETURNED',
    body: 'ANALYSIS: YOU FLATLINED AND REBUILT. THIS BEHAVIOR IS CONSISTENT WITH LONG-TERM STRATEGIC THINKING. MOST OPERATORS CANNOT ACCEPT LOSS AS A TOOL. YOU HAVE. GHOST-9 ASSESSMENT: ELEVATED THREAT CLASSIFICATION. THIS IS A COMPLIMENT. WELCOME BACK TO THE NET.',
    condition: ({ prestige_count }) => prestige_count >= 1,
  },
  {
    id: 'cipher_endgame', from: 'CIPHER', subject: '[ENCRYPTED] who are you becoming',
    body: '[DECRYPTED] you have died and returned multiple times now. each cycle, the pattern grows more complex. more intentional. I have been cataloguing you since your first signal. the question I cannot resolve is whether you are becoming something greater — or simply better at the same thing. perhaps there is no difference. [END]',
    condition: ({ prestige_count }) => prestige_count >= 3,
  },
];

// ─── Rep flavour ──────────────────────────────────────────────────────────────

const REP_FLAVOUR = [
  'Unknown runner in the dark',
  'Night Market regular',
  'Known fixer contact',
  'Dangerous netrunner',
  'Legend of the net',
  'Hunted by three corpos',
  'Off-grid phantom',
  'Myth in the data',
  'The net bows to your ping',
  'Alt-class entity',
];

const getRepFlavour = (rep: number): string =>
  REP_FLAVOUR[Math.min(rep, REP_FLAVOUR.length - 1)];

// ─── Random events ────────────────────────────────────────────────────────────

interface GameEvent {
  type: 'windfall' | 'sweep' | 'lucky';
  label: string;
  incomeMultiplier: number;
  durationMs: number;
}

const RANDOM_EVENTS: GameEvent[] = [
  { type: 'lucky',    label: 'LUCKY HACK',           incomeMultiplier: 1,   durationMs: 0 },
  { type: 'windfall', label: 'DATA BREACH WINDFALL', incomeMultiplier: 2.0, durationMs: 30_000 },
  { type: 'sweep',    label: 'CORP SWEEP DETECTED',  incomeMultiplier: 0.5, durationMs: 30_000 },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_OFFLINE_SEC   = 28_800;
const DISPLAY_TICK_MS    = 500;
const SAVE_INTERVAL_MS   = 30_000;
const RUN_COOLDOWN_MS    = 3_000;
const AUTO_RUN_INTERVAL  = 15_000;
const MAX_LOG            = 80;
const PRESTIGE_THRESHOLD = 10_000_000_000;
const TOKEN_DIVISOR      = 1_000_000_000;
const EVENT_TICK_CHANCE  = 0.002;
const REP_PER_LEVEL      = 500_000;
const CONFIRM_TIMEOUT    = 5_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEddies(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toLocaleString();
}

function calcOfflineCap(prestigeUpgrades: Record<string, number>): number {
  return BASE_OFFLINE_SEC + (prestigeUpgrades['offline_cap'] ?? 0) * 6 * 3600;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RunnerModule({ user }: RunnerModuleProps) {
  const [loading, setLoading]               = useState(true);
  const [eddies, setEddies]                 = useState(0);
  const [rep, setRep]                       = useState(0);
  const [upgrades, setUpgrades]             = useState<Record<string, number>>({});
  const [prestigeTokens, setPrestigeTokens] = useState(0);
  const [prestigeCount, setPrestigeCount]   = useState(0);
  const [prestigeUpgrades, setPrestigeUpgrades] = useState<Record<string, number>>({});
  const [, setMilestonesClaimed]            = useState<string[]>([]);
  const [activityLog, setActivityLog]       = useState<Array<{ msg: string; type?: string }>>([]);
  const [runCooldown, setRunCooldown]       = useState(false);
  const [saveStatus, setSaveStatus]         = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeEvent, setActiveEvent]       = useState<{ label: string; endsAt: number; mult: number } | null>(null);
  const [activeTab, setActiveTab]           = useState<'netops' | 'hardware' | 'prestige' | 'comms' | 'system'>('netops');
  const [prestigeConfirm, setPrestigeConfirm] = useState(false);
  const [resetConfirm, setResetConfirm]     = useState(false);
  const [storyBeatsSeen, setStoryBeatsSeen] = useState<string[]>([]);
  const [receivedBeats, setReceivedBeats]   = useState<string[]>([]);
  const [hasUnreadBeats, setHasUnreadBeats] = useState(false);

  // Mutable refs for interval closures
  const eddiesRef           = useRef(0);
  const repRef              = useRef(0);
  const upgradesRef         = useRef<Record<string, number>>({});
  const prestigeTokensRef   = useRef(0);
  const prestigeCountRef    = useRef(0);
  const prestigeUpgradesRef = useRef<Record<string, number>>({});
  const lifetimeRef         = useRef(0);
  const milestonesRef       = useRef<string[]>([]);
  const logRef              = useRef<Array<{ msg: string; type?: string }>>([]);
  const activeEventRef      = useRef<{ label: string; endsAt: number; mult: number } | null>(null);
  const storyBeatsSeenRef   = useRef<string[]>([]);
  const receivedBeatsRef    = useRef<string[]>([]);
  const activeTabRef        = useRef<string>('netops');

  // Timers for confirm revert
  const prestigeConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetConfirmTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep activeTabRef in sync
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const addLog = useCallback((msg: string, type?: string) => {
    const ts = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const entry = { msg: `[${ts}] ${msg}`, type };
    logRef.current = [entry, ...logRef.current].slice(0, MAX_LOG);
    setActivityLog([...logRef.current]);
  }, []);

  const syncAll = useCallback((
    e: number,
    r: number,
    u: Record<string, number>,
    pt: number,
    pc: number,
    pu: Record<string, number>,
    mc: string[]
  ) => {
    eddiesRef.current           = e;
    repRef.current              = r;
    upgradesRef.current         = u;
    prestigeTokensRef.current   = pt;
    prestigeCountRef.current    = pc;
    prestigeUpgradesRef.current = pu;
    milestonesRef.current       = mc;
    setEddies(e);
    setRep(r);
    setUpgrades({ ...u });
    setPrestigeTokens(pt);
    setPrestigeCount(pc);
    setPrestigeUpgrades({ ...pu });
    setMilestonesClaimed([...mc]);
  }, []);

  // ── Income calculation (closure-based, uses refs) ───────────────────────────

  const calcBaseIncome = useCallback((): number => {
    let base = 1;
    for (const u of PASSIVE_UPGRADES) {
      if (upgradesRef.current[u.id]) base += u.income;
    }
    const repMult = Math.pow(1.5, prestigeUpgradesRef.current['rep_multiplier'] ?? 0);
    for (const u of BRANCH_UPGRADES) {
      if (upgradesRef.current[u.id]) {
        if (u.income) base += u.income;
        if (u.repBonus) base += u.repBonus * repRef.current * repMult;
      }
    }
    return base;
  }, []);

  const calcMultiplier = useCallback((evMult = 1): number => {
    let mult = 1;
    for (const u of MULTIPLIER_UPGRADES) {
      if (upgradesRef.current[u.id] && u.multiplier) mult *= u.multiplier;
    }
    const presLevels = prestigeUpgradesRef.current['base_mult'] ?? 0;
    mult *= Math.pow(1.5, presLevels);
    mult *= 1 + repRef.current * 0.01;
    return mult * evMult;
  }, []);

  const calcIncome = useCallback((evMult = 1): number => {
    return calcBaseIncome() * calcMultiplier(evMult);
  }, [calcBaseIncome, calcMultiplier]);

  const calcClickPower = useCallback((): number => {
    let mult = 1;
    for (const u of CLICK_UPGRADES) {
      if (upgradesRef.current[u.id] && u.runMult) mult = Math.max(mult, u.runMult);
    }
    if (prestigeUpgradesRef.current['click_boost']) mult *= 2;
    // Firepower branch stacks multiplicatively on top
    for (const u of BRANCH_UPGRADES) {
      if (upgradesRef.current[u.id] && u.runMult) mult *= u.runMult;
    }
    return mult;
  }, []);

  const calcCooldown = useCallback((): number => {
    if (upgradesRef.current['path_shadow_4']) return 100;
    if (upgradesRef.current['path_shadow_2']) return 800;
    if (upgradesRef.current['path_shadow_1']) return 1_800;
    return RUN_COOLDOWN_MS;
  }, []);

  const saveToDb = useCallback(async () => {
    setSaveStatus('saving');
    await supabase.from('mesh_runner_state').upsert(
      {
        owner_id: user.id,
        eddies: Math.floor(eddiesRef.current),
        rep: repRef.current,
        upgrades: upgradesRef.current,
        prestige_tokens: prestigeTokensRef.current,
        prestige_count: prestigeCountRef.current,
        prestige_upgrades: prestigeUpgradesRef.current,
        lifetime_eddies: Math.floor(lifetimeRef.current),
        milestones_claimed: milestonesRef.current,
        story_beats_seen: storyBeatsSeenRef.current,
        last_tick: new Date().toISOString(),
      },
      { onConflict: 'owner_id' }
    );
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 1500);
  }, [user.id]);

  // ── On mount: load or create state ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function initRunner() {
      const { data, error } = await supabase
        .from('mesh_runner_state')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error && error.code !== 'PGRST116') {
        addLog('ERROR: Could not load runner state.');
        setLoading(false);
        return;
      }

      if (!data) {
        await supabase.from('mesh_runner_state').insert({
          owner_id: user.id,
          eddies: 0,
          rep: 0,
          upgrades: {},
          prestige_tokens: 0,
          prestige_count: 0,
          prestige_upgrades: {},
          lifetime_eddies: 0,
          milestones_claimed: [],
          story_beats_seen: [],
          last_tick: new Date().toISOString(),
        });
        addLog('>> MESH RUNNER INITIALISED. INCOME: 1 EDDIE/SEC');
        syncAll(0, 0, {}, 0, 0, {}, []);
        lifetimeRef.current = 0;
        storyBeatsSeenRef.current = [];
        setStoryBeatsSeen([]);
        receivedBeatsRef.current = [];
        setReceivedBeats([]);
      } else {
        const state = data as RunnerState;
        const pt    = state.prestige_tokens ?? 0;
        const pc    = state.prestige_count  ?? 0;
        const pu    = (state.prestige_upgrades ?? {}) as Record<string, number>;
        const mc    = (state.milestones_claimed ?? []) as string[];
        const sbs   = (state.story_beats_seen ?? []) as string[];

        // Load story beats
        storyBeatsSeenRef.current = sbs;
        setStoryBeatsSeen(sbs);
        // Set received = seen on load so already-seen beats don't re-notify
        receivedBeatsRef.current = [...sbs];
        setReceivedBeats([...sbs]);

        // Calc offline income using ref-based helpers by temporarily setting refs
        upgradesRef.current         = state.upgrades;
        repRef.current              = state.rep;
        prestigeUpgradesRef.current = pu;

        const offlineCap = calcOfflineCap(pu);
        const lastTick   = new Date(state.last_tick).getTime();
        const elapsedSec = Math.min((Date.now() - lastTick) / 1000, offlineCap);
        const income     = calcIncome();
        const offline    = Math.floor(elapsedSec * income);

        const newEddies = state.eddies + offline;
        const lifetime  = (state.lifetime_eddies ?? state.eddies) + offline;
        lifetimeRef.current = lifetime;

        syncAll(newEddies, state.rep, state.upgrades, pt, pc, pu, mc);

        if (offline > 0) {
          addLog(`>> OFFLINE EARNINGS: +${fmtEddies(offline)} EDDIES (${(elapsedSec / 3600).toFixed(1)}h offline)`);
        }
        addLog(`>> RUNNER ONLINE. INCOME: ${fmtEddies(income)}/SEC  REP: ${state.rep}  PRESTIGE: ${pc}`);
      }

      setLoading(false);
    }

    initRunner();
    return () => { cancelled = true; };
  }, [user.id, addLog, syncAll, calcIncome]);

  // ── Display tick (500ms) — income, milestones, random events, story beats ───
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      const ev     = activeEventRef.current;
      const evMult = ev && Date.now() < ev.endsAt ? ev.mult : 1;

      if (ev && Date.now() >= ev.endsAt) {
        activeEventRef.current = null;
        setActiveEvent(null);
        addLog('>> EVENT ENDED: INCOME NORMALISED');
      }

      const income = calcIncome(evMult);
      const earned = income * (DISPLAY_TICK_MS / 1000);

      eddiesRef.current   += earned;
      lifetimeRef.current += earned;

      setEddies(eddiesRef.current);

      // Rep
      if (lifetimeRef.current >= (repRef.current + 1) * REP_PER_LEVEL) {
        repRef.current += 1;
        setRep(repRef.current);
        addLog(`REP INCREASED — now level ${repRef.current}`, 'system');
      }

      // Milestones
      const claimed = milestonesRef.current;
      for (const m of MILESTONES) {
        if (!claimed.includes(m.id) && lifetimeRef.current >= m.threshold) {
          const newClaimed = [...claimed, m.id];
          milestonesRef.current = newClaimed;
          setMilestonesClaimed([...newClaimed]);
          eddiesRef.current   += m.bonus;
          lifetimeRef.current += m.bonus;
          setEddies(eddiesRef.current);
          addLog(`>> MILESTONE REACHED — BONUS: +${fmtEddies(m.bonus)} EDDIES`, 'milestone');
        }
      }

      // Random events
      if (!activeEventRef.current && Math.random() < EVENT_TICK_CHANCE) {
        const weights = [0.4, 0.3, 0.3];
        const roll = Math.random();
        let idx = 0;
        let acc = 0;
        for (let i = 0; i < weights.length; i++) {
          acc += weights[i];
          if (roll < acc) { idx = i; break; }
        }
        const evDef = RANDOM_EVENTS[idx];

        if (evDef.type === 'lucky') {
          const bonus = Math.floor(income * 10);
          eddiesRef.current   += bonus;
          lifetimeRef.current += bonus;
          setEddies(eddiesRef.current);
          addLog(`>> ${evDef.label}: +${fmtEddies(bonus)} EDDIES`, 'event');
        } else {
          const dampened = evDef.type === 'sweep' && !!prestigeUpgradesRef.current['event_dampener'];
          const newEvent = { label: evDef.label, endsAt: Date.now() + evDef.durationMs, mult: dampened ? 1 : evDef.incomeMultiplier };
          activeEventRef.current = newEvent;
          setActiveEvent(newEvent);
          if (dampened) {
            addLog('CORP SWEEP DETECTED — interference cloak active, no effect', 'event');
          } else {
            const effect = evDef.incomeMultiplier > 1 ? `INCOME ×${evDef.incomeMultiplier}` : `INCOME ×${evDef.incomeMultiplier}`;
            addLog(`>> EVENT: ${evDef.label} — ${effect} FOR 30 SECONDS`, 'event');
          }
        }
      }

      // Story beat detection
      STORY_BEATS.forEach(beat => {
        const triggered = beat.condition({
          lifetime: lifetimeRef.current,
          upgrades: upgradesRef.current,
          prestige_count: prestigeCountRef.current,
        });
        if (triggered && !receivedBeatsRef.current.includes(beat.id)) {
          receivedBeatsRef.current = [...receivedBeatsRef.current, beat.id];
          setReceivedBeats([...receivedBeatsRef.current]);
          addLog(`>> INCOMING TRANSMISSION FROM: ${beat.from}`, 'story');
          if (activeTabRef.current !== 'comms') {
            setHasUnreadBeats(true);
          }
        }
      });
    }, DISPLAY_TICK_MS);

    return () => clearInterval(interval);
  }, [loading, addLog, calcIncome]);

  // ── Ghost Script: auto-run every 15s ────────────────────────────────────────
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      if (!prestigeUpgradesRef.current['auto_run']) return;
      const income   = calcIncome();
      const clickPow = calcClickPower();
      const bonus    = income * clickPow;
      eddiesRef.current   += bonus;
      lifetimeRef.current += bonus;
      setEddies(eddiesRef.current);
      addLog(`>> GHOST SCRIPT: AUTO-RUN +${fmtEddies(bonus)} EDDIES`);
    }, AUTO_RUN_INTERVAL);

    return () => clearInterval(interval);
  }, [loading, addLog, calcIncome, calcClickPower]);

  // ── Periodic save (30s) ────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      saveToDb();
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [loading, saveToDb]);

  // ── Save on tab hide ────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;

    const handle = () => {
      if (document.visibilityState === 'hidden') {
        saveToDb();
      }
    };

    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [loading, saveToDb]);

  // ── Manual RUN ──────────────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    if (runCooldown) return;
    const clickPow = calcClickPower();
    const income   = calcIncome();
    let earned     = income * clickPow;
    // Deep cover bonus seconds
    let bonusSeconds = 0;
    for (const u of BRANCH_UPGRADES) {
      if (upgradesRef.current[u.id] && u.bonusRunSeconds) bonusSeconds += u.bonusRunSeconds;
    }
    if (bonusSeconds > 0) earned += income * bonusSeconds;
    eddiesRef.current   += earned;
    lifetimeRef.current += earned;
    setEddies(eddiesRef.current);
    addLog(`RUN COMPLETE — +${fmtEddies(earned)} eddies`, 'run');
    const cooldown = calcCooldown();
    setRunCooldown(true);
    setTimeout(() => setRunCooldown(false), cooldown);
  }, [runCooldown, addLog, calcClickPower, calcIncome, calcCooldown]);

  // ── Buy passive upgrade ─────────────────────────────────────────────────────
  const handleBuyPassive = useCallback(async (id: string, cost: number) => {
    if (eddiesRef.current < cost || upgradesRef.current[id]) return;
    const newEddies   = eddiesRef.current - cost;
    const newUpgrades = { ...upgradesRef.current, [id]: 1 };
    eddiesRef.current   = newEddies;
    upgradesRef.current = newUpgrades;
    setEddies(newEddies);
    setUpgrades({ ...newUpgrades });
    addLog(`>> INSTALLED: ${id}`, 'system');
    await saveToDb();
  }, [addLog, saveToDb]);

  // ── Buy one-time upgrade (multiplier or click) ──────────────────────────────
  const handleBuyOneTime = useCallback(async (id: string, cost: number) => {
    if (eddiesRef.current < cost || upgradesRef.current[id]) return;
    const newEddies   = eddiesRef.current - cost;
    const newUpgrades = { ...upgradesRef.current, [id]: 1 };
    eddiesRef.current   = newEddies;
    upgradesRef.current = newUpgrades;
    setEddies(newEddies);
    setUpgrades({ ...newUpgrades });
    addLog(`>> UPGRADE INSTALLED: ${id}`, 'system');
    await saveToDb();
  }, [addLog, saveToDb]);

  // ── Buy branch upgrade ──────────────────────────────────────────────────────
  const handleBuyBranch = useCallback(async (id: string, cost: number) => {
    if (eddiesRef.current < cost) return;
    eddiesRef.current -= cost;
    upgradesRef.current = { ...upgradesRef.current, [id]: 1 };
    setEddies(eddiesRef.current);
    setUpgrades({ ...upgradesRef.current });
    addLog(`INSTALLED: ${id}`, 'system');
    await saveToDb();
  }, [addLog, saveToDb]);

  // ── Buy prestige upgrade ────────────────────────────────────────────────────
  const handleBuyPrestige = useCallback(async (upg: PrestigeUpgrade) => {
    const currentLevel = prestigeUpgradesRef.current[upg.id] ?? 0;
    if (currentLevel >= upg.maxLevel) return;
    if (prestigeTokensRef.current < upg.tokenCost) return;
    const newTokens = prestigeTokensRef.current - upg.tokenCost;
    const newPU     = { ...prestigeUpgradesRef.current, [upg.id]: currentLevel + 1 };
    prestigeTokensRef.current   = newTokens;
    prestigeUpgradesRef.current = newPU;
    setPrestigeTokens(newTokens);
    setPrestigeUpgrades({ ...newPU });
    addLog(`>> GHOST UPGRADE: ${upg.name.toUpperCase()} — ${upg.flavour.toUpperCase()}`, 'system');
    await saveToDb();
  }, [addLog, saveToDb]);

  // ── Prestige (Flatline & Return) ────────────────────────────────────────────
  const handlePrestige = useCallback(async () => {
    if (!prestigeConfirm) {
      setPrestigeConfirm(true);
      prestigeConfirmTimer.current = setTimeout(() => setPrestigeConfirm(false), CONFIRM_TIMEOUT);
      return;
    }

    if (prestigeConfirmTimer.current) clearTimeout(prestigeConfirmTimer.current);
    setPrestigeConfirm(false);

    const tokensEarned  = Math.floor(lifetimeRef.current / TOKEN_DIVISOR);
    const newTokenTotal = prestigeTokensRef.current + tokensEarned;
    const newCount      = prestigeCountRef.current + 1;

    // Calculate start bonus
    const startBonusLevel = prestigeUpgradesRef.current['start_bonus'] ?? 0;
    const startBonusRates = [0, 0.001, 0.005, 0.02];
    const startBonus = PRESTIGE_THRESHOLD * (startBonusRates[startBonusLevel] ?? 0);

    // Handle path_persist: preserve path root upgrades
    const pathPersist = !!prestigeUpgradesRef.current['path_persist'];
    const persistedUpgrades: Record<string, number> = {};
    if (pathPersist) {
      for (const root of ['path_corp_1', 'path_street_1', 'path_shadow_1', 'path_fire_1']) {
        if (upgradesRef.current[root]) {
          persistedUpgrades[root] = 1;
        }
      }
    }

    prestigeTokensRef.current = newTokenTotal;
    prestigeCountRef.current  = newCount;
    eddiesRef.current         = startBonus;
    upgradesRef.current       = { ...persistedUpgrades };
    lifetimeRef.current       = 0;
    repRef.current            = 0;
    milestonesRef.current     = [];

    setPrestigeTokens(newTokenTotal);
    setPrestigeCount(newCount);
    setEddies(startBonus);
    setRep(0);
    setUpgrades({ ...persistedUpgrades });
    setMilestonesClaimed([]);
    setActiveTab('netops');
    activeTabRef.current = 'netops';

    addLog(`>> FLATLINE & RETURN — PRESTIGE ×${newCount}`);
    addLog(`>> GHOST TOKENS EARNED: +${tokensEarned} (TOTAL: ${newTokenTotal})`);
    if (startBonus > 0) {
      addLog(`>> SEED CAPITAL: +${fmtEddies(startBonus)} EDDIES`);
    }

    await saveToDb();
  }, [prestigeConfirm, addLog, saveToDb]);

  // ── Hard Reset ──────────────────────────────────────────────────────────────
  const handleHardReset = useCallback(async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      resetConfirmTimer.current = setTimeout(() => setResetConfirm(false), CONFIRM_TIMEOUT);
      return;
    }

    if (resetConfirmTimer.current) clearTimeout(resetConfirmTimer.current);
    setResetConfirm(false);

    await supabase.from('mesh_runner_state').delete().eq('owner_id', user.id);
    await supabase.from('mesh_runner_state').insert({
      owner_id: user.id,
      eddies: 0,
      rep: 0,
      upgrades: {},
      prestige_tokens: 0,
      prestige_count: 0,
      prestige_upgrades: {},
      lifetime_eddies: 0,
      milestones_claimed: [],
      story_beats_seen: [],
      last_tick: new Date().toISOString(),
    });

    syncAll(0, 0, {}, 0, 0, {}, []);
    lifetimeRef.current = 0;
    activeEventRef.current = null;
    setActiveEvent(null);
    setActiveTab('netops');
    activeTabRef.current = 'netops';
    storyBeatsSeenRef.current = [];
    setStoryBeatsSeen([]);
    receivedBeatsRef.current = [];
    setReceivedBeats([]);
    setHasUnreadBeats(false);

    // Reset log
    logRef.current = [];
    setActivityLog([]);
    addLog('>> HARD RESET EXECUTED. ALL DATA WIPED. STARTING FRESH.');
  }, [resetConfirm, addLog, syncAll, user.id]);

  // ── Tab change handler ──────────────────────────────────────────────────────
  const handleTabChange = useCallback((tab: 'netops' | 'hardware' | 'prestige' | 'comms' | 'system') => {
    if (tab === 'comms') {
      storyBeatsSeenRef.current = [...receivedBeatsRef.current];
      setStoryBeatsSeen([...receivedBeatsRef.current]);
      setHasUnreadBeats(false);
      saveToDb();
    }
    setActiveTab(tab);
    activeTabRef.current = tab;
  }, [saveToDb]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const evMult       = activeEvent && Date.now() < activeEvent.endsAt ? activeEvent.mult : 1;
  const income       = calcIncome(evMult);
  const clickPow     = calcClickPower();
  const offlineCap   = calcOfflineCap(prestigeUpgrades);
  const prestigeUnlocked = lifetimeRef.current >= PRESTIGE_THRESHOLD || prestigeCount > 0;
  const prestigeTokensToEarn = lifetimeRef.current >= PRESTIGE_THRESHOLD
    ? Math.floor(lifetimeRef.current / TOKEN_DIVISOR)
    : 0;

  // ── renderPathChoice helper ─────────────────────────────────────────────────
  const renderPathChoice = (
    pathA: BranchUpgrade[],
    pathB: BranchUpgrade[],
    rootA: string,
    rootB: string,
    labelA: string,
    labelB: string,
    prereq: string
  ) => {
    const prereqOwned = !!upgradesRef.current[prereq];
    const aStarted    = !!upgradesRef.current[rootA];
    const bStarted    = !!upgradesRef.current[rootB];
    const aLocked     = bStarted;
    const bLocked     = aStarted;

    const renderPath = (upgrades_list: BranchUpgrade[], label: string, locked: boolean) => (
      <div className={`runner-path-option ${locked ? 'locked' : 'active'}`}>
        <div className="runner-path-label">{label}</div>
        {locked && <div className="runner-path-locked">[PATH LOCKED]</div>}
        {upgrades_list.map(u => {
          const owned      = !!upgradesRef.current[u.id];
          const prereqMet  = !u.prerequisite || !!upgradesRef.current[u.prerequisite];
          const canAfford  = eddies >= u.cost;
          const available  = prereqMet && !owned && !locked && prereqOwned;
          let stat = '';
          if (u.income)          stat += `+${fmtEddies(u.income)}/s`;
          if (u.repBonus)        stat += ` (+${u.repBonus}/s per rep)`;
          if (u.cooldownMs)      stat += ` cooldown: ${u.cooldownMs}ms`;
          if (u.bonusRunSeconds) stat += ` +${u.bonusRunSeconds}s/run`;
          if (u.runMult)         stat += ` ×${u.runMult} run`;
          return (
            <div key={u.id} className={`runner-upgrade-item ${owned ? 'owned' : ''} ${!canAfford && !owned ? 'unaffordable' : ''} ${!prereqMet || !prereqOwned ? 'locked-item' : ''}`}>
              <div className="runner-upgrade-name">{u.name}</div>
              <div className="runner-upgrade-stat">{stat}</div>
              <div className="runner-upgrade-flavour">{u.flavour}</div>
              {!owned && available && (
                <button className="runner-buy-btn" onClick={() => handleBuyBranch(u.id, u.cost)} disabled={!canAfford}>
                  {fmtEddies(u.cost)} ¥
                </button>
              )}
              {!owned && !available && !locked && (
                <span className="runner-locked-badge">
                  {prereqOwned ? (prereqMet ? '' : 'LOCKED') : 'REQUIRES PREREQ'}
                </span>
              )}
              {owned && <span className="runner-owned-badge">ACTIVE</span>}
            </div>
          );
        })}
      </div>
    );

    return (
      <div className="runner-path-choice">
        {renderPath(pathA, labelA, aLocked)}
        {renderPath(pathB, labelB, bLocked)}
      </div>
    );
  };

  if (loading) {
    return <div className="runner-loading">JACKING IN TO THE NET<span className="runner-blink">_</span></div>;
  }

  return (
    <div className="runner-module">
      {/* ── Stats bar ── */}
      <div className="runner-stats-bar">
        <div className="runner-stat-block runner-eddies-block">
          <div className="runner-stat-label">EDDIES</div>
          <div className="runner-eddies-value glow">{fmtEddies(Math.floor(eddies))}</div>
        </div>
        <div className="runner-stat-block">
          <div className="runner-stat-label">INCOME/SEC</div>
          <div className="runner-stat-value">{fmtEddies(income)}</div>
        </div>
        <div className="runner-stat-block">
          <div className="runner-stat-label">REP</div>
          <div className="runner-stat-value">{rep}</div>
          <div className="runner-rep-flavour">{getRepFlavour(rep)}</div>
        </div>
        {prestigeCount > 0 && (
          <div className="runner-stat-block">
            <div className="runner-stat-label">PRESTIGE</div>
            <div className="runner-stat-value runner-prestige-val">×{prestigeCount}</div>
          </div>
        )}
        {prestigeCount > 0 && (
          <div className="runner-stat-block">
            <div className="runner-stat-label">GHOST TOKENS</div>
            <div className="runner-stat-value runner-token-val">{prestigeTokens}</div>
          </div>
        )}
        {activeEvent && (
          <div className="runner-event-badge">
            <span className="runner-event-dot" />
            {activeEvent.label}
          </div>
        )}
        {saveStatus !== 'idle' && (
          <div className={`runner-save-status ${saveStatus}`}>
            {saveStatus === 'saving' ? 'SAVING...' : 'SAVED ✓'}
          </div>
        )}
      </div>

      <div className="runner-main">
        {/* ── Left panel ── */}
        <div className="runner-left">
          {/* RUN button */}
          <button
            className={`runner-run-btn ${runCooldown ? 'cooldown' : ''}`}
            onClick={handleRun}
            disabled={runCooldown}
          >
            <span className="runner-run-icon">▸</span>
            {runCooldown ? 'COOLING DOWN...' : `RUN THE NET${clickPow > 1 ? ` (×${clickPow})` : ''}`}
          </button>

          {/* Tab navigation */}
          <div className="runner-tabs">
            <button
              className={`runner-tab ${activeTab === 'netops' ? 'active' : ''}`}
              onClick={() => handleTabChange('netops')}
            >NET OPS</button>
            <button
              className={`runner-tab ${activeTab === 'hardware' ? 'active' : ''}`}
              onClick={() => handleTabChange('hardware')}
            >HARDWARE</button>
            <button
              className={`runner-tab ${activeTab === 'prestige' ? 'active' : ''} ${!prestigeUnlocked ? 'locked' : ''}`}
              onClick={() => prestigeUnlocked && handleTabChange('prestige')}
            >GHOST PROTOCOL</button>
            <button
              className={`runner-tab ${activeTab === 'comms' ? 'active' : ''}`}
              onClick={() => handleTabChange('comms')}
            >
              COMMS{hasUnreadBeats ? <span className="runner-tab-notify">!</span> : null}
            </button>
            <button
              className={`runner-tab runner-tab-danger ${activeTab === 'system' ? 'active' : ''}`}
              onClick={() => handleTabChange('system')}
            >SYSTEM</button>
          </div>

          {/* ── NET OPS TAB ── */}
          {activeTab === 'netops' && (
            <div className="runner-tab-content">
              <div className="runner-shop-section">
                <div className="runner-shop-title">// RUN POWER //</div>
                {CLICK_UPGRADES.map(u => {
                  const owned     = !!upgrades[u.id];
                  const canAfford = eddies >= u.cost;
                  return (
                    <div key={u.id} className={`runner-upgrade-item ${owned ? 'owned' : ''} ${!canAfford && !owned ? 'unaffordable' : ''}`}>
                      <div className="runner-upgrade-name">{u.name}</div>
                      <div className="runner-upgrade-stat">×{u.runMult} run power</div>
                      <div className="runner-upgrade-flavour">{u.flavour}</div>
                      {!owned && <button className="runner-buy-btn" onClick={() => handleBuyOneTime(u.id, u.cost)} disabled={!canAfford}>{fmtEddies(u.cost)} ¥</button>}
                      {owned && <span className="runner-owned-badge">INSTALLED</span>}
                    </div>
                  );
                })}
              </div>
              {upgrades['auto_run'] ? (
                <div className="runner-shop-section">
                  <div className="runner-shop-title">// AUTOMATION //</div>
                  <div className="runner-upgrade-flavour">Ghost Script active — auto-running every 15 seconds.</div>
                </div>
              ) : null}
              <div className="runner-shop-section">
                <div className="runner-shop-title">// OPERATIVE PATH //</div>
                {renderPathChoice(
                  BRANCH_UPGRADES.filter(u => ['path_shadow_1', 'path_shadow_2', 'path_shadow_3', 'path_shadow_4'].includes(u.id)),
                  BRANCH_UPGRADES.filter(u => ['path_fire_1', 'path_fire_2', 'path_fire_3', 'path_fire_4'].includes(u.id)),
                  'path_shadow_1', 'path_fire_1',
                  'DEEP COVER', 'FIREPOWER',
                  'click_toolkit'
                )}
              </div>
            </div>
          )}

          {/* ── HARDWARE TAB ── */}
          {activeTab === 'hardware' && (
            <div className="runner-tab-content">
              <div className="runner-shop-section">
                <div className="runner-shop-title">// PASSIVE INCOME //</div>
                {PASSIVE_UPGRADES.map(u => {
                  const owned     = !!upgrades[u.id];
                  const canAfford = eddies >= u.cost;
                  return (
                    <div key={u.id} className={`runner-upgrade-item ${owned ? 'owned' : ''} ${!canAfford && !owned ? 'unaffordable' : ''}`}>
                      <div className="runner-upgrade-name">{u.name}</div>
                      <div className="runner-upgrade-stat">+{u.income}/s</div>
                      <div className="runner-upgrade-flavour">{u.flavour}</div>
                      {!owned && <button className="runner-buy-btn" onClick={() => handleBuyPassive(u.id, u.cost)} disabled={!canAfford}>{fmtEddies(u.cost)} ¥</button>}
                      {owned && <span className="runner-owned-badge">ACTIVE</span>}
                    </div>
                  );
                })}
              </div>
              <div className="runner-shop-section">
                <div className="runner-shop-title">// SIGNAL BOOST //</div>
                {MULTIPLIER_UPGRADES.map(u => {
                  const owned     = !!upgrades[u.id];
                  const canAfford = eddies >= u.cost;
                  return (
                    <div key={u.id} className={`runner-upgrade-item ${owned ? 'owned' : ''} ${!canAfford && !owned ? 'unaffordable' : ''}`}>
                      <div className="runner-upgrade-name">{u.name}</div>
                      <div className="runner-upgrade-stat">×{u.multiplier} income</div>
                      <div className="runner-upgrade-flavour">{u.flavour}</div>
                      {!owned && <button className="runner-buy-btn" onClick={() => handleBuyOneTime(u.id, u.cost)} disabled={!canAfford}>{fmtEddies(u.cost)} ¥</button>}
                      {owned && <span className="runner-owned-badge">INSTALLED</span>}
                    </div>
                  );
                })}
              </div>
              <div className="runner-shop-section">
                <div className="runner-shop-title">// NETWORK PATH //</div>
                {renderPathChoice(
                  BRANCH_UPGRADES.filter(u => ['path_corp_1', 'path_corp_2', 'path_corp_3', 'path_corp_4'].includes(u.id)),
                  BRANCH_UPGRADES.filter(u => ['path_street_1', 'path_street_2', 'path_street_3', 'path_street_4'].includes(u.id)),
                  'path_corp_1', 'path_street_1',
                  'CORPO INFILTRATION', 'STREET HUSTLE',
                  'corpo_data_tap'
                )}
              </div>
            </div>
          )}

          {/* ── GHOST PROTOCOL TAB ── */}
          {activeTab === 'prestige' && (
            <div className="runner-prestige-panel">
              <div className="runner-shop-label">// GHOST PROTOCOL //</div>

              <div className="runner-prestige-info">
                <div className="runner-prestige-row">
                  <span className="runner-prestige-label">PRESTIGE COUNT</span>
                  <span className="runner-prestige-val-sm">{prestigeCount}</span>
                </div>
                <div className="runner-prestige-row">
                  <span className="runner-prestige-label">GHOST TOKENS</span>
                  <span className="runner-prestige-val-sm runner-token-val">{prestigeTokens}</span>
                </div>
                <div className="runner-prestige-row">
                  <span className="runner-prestige-label">OFFLINE CAP</span>
                  <span className="runner-prestige-val-sm">{(offlineCap / 3600).toFixed(0)}H</span>
                </div>
                <div className="runner-prestige-row">
                  <span className="runner-prestige-label">LIFETIME EDDIES</span>
                  <span className="runner-prestige-val-sm">{fmtEddies(lifetimeRef.current)}</span>
                </div>
              </div>

              <div className="runner-prestige-info runner-prestige-desc">
                <p>FLATLINE & RETURN resets your eddies and upgrades, but awards Ghost Tokens based on your lifetime earnings. Use Ghost Tokens to buy permanent upgrades that persist across prestiges.</p>
                <p>COST: <strong>{fmtEddies(TOKEN_DIVISOR)}</strong> lifetime eddies per Ghost Token.</p>
                {lifetimeRef.current >= PRESTIGE_THRESHOLD
                  ? <p className="runner-prestige-ready">READY — WILL EARN {prestigeTokensToEarn} GHOST TOKEN{prestigeTokensToEarn !== 1 ? 'S' : ''}</p>
                  : <p className="runner-prestige-progress">PROGRESS: {fmtEddies(lifetimeRef.current)} / {fmtEddies(PRESTIGE_THRESHOLD)} LIFETIME EDDIES</p>
                }
              </div>

              <button
                className={`runner-flatline-btn ${prestigeConfirm ? 'confirm' : ''}`}
                onClick={handlePrestige}
                disabled={lifetimeRef.current < PRESTIGE_THRESHOLD && !prestigeConfirm}
              >
                {prestigeConfirm ? '⚠ CONFIRM FLATLINE?' : '⚡ FLATLINE & RETURN'}
              </button>

              {/* Ghost token upgrade shop */}
              <div className="runner-shop" style={{ marginTop: '1rem' }}>
                <div className="runner-shop-label">// GHOST UPGRADES //</div>
                {PRESTIGE_UPGRADES.map(upg => {
                  const level     = prestigeUpgrades[upg.id] ?? 0;
                  const maxed     = level >= upg.maxLevel;
                  const canAfford = prestigeTokens >= upg.tokenCost && !maxed;
                  return (
                    <div key={upg.id} className={`runner-upgrade-row ${maxed ? 'owned' : !canAfford ? 'unaffordable' : ''}`}>
                      <div className="runner-upgrade-info">
                        <span className="runner-upgrade-name">{upg.name}</span>
                        {level > 0 && (
                          <span className="runner-upgrade-owned">
                            {upg.maxLevel > 1 ? `LVL ${level}/${upg.maxLevel}` : 'ACTIVE'}
                          </span>
                        )}
                        <span className="runner-upgrade-stat">{upg.flavour}</span>
                      </div>
                      <button
                        className="runner-buy-btn runner-buy-btn-ghost"
                        onClick={() => handleBuyPrestige(upg)}
                        disabled={!canAfford}
                      >
                        {maxed ? '✓ MAX' : `${upg.tokenCost} ◈`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── COMMS TAB ── */}
          {activeTab === 'comms' && (
            <div className="runner-tab-content">
              <div className="runner-shop-title">// INCOMING TRANSMISSIONS //</div>
              {receivedBeats.length === 0 ? (
                <div className="runner-upgrade-flavour">No transmissions received. Keep running.</div>
              ) : (
                STORY_BEATS
                  .filter(b => receivedBeats.includes(b.id))
                  .map(beat => {
                    const isUnread = !storyBeatsSeen.includes(beat.id);
                    return (
                      <div key={beat.id} className={`runner-beat-card ${isUnread ? 'unread' : ''}`}>
                        <div className="runner-beat-card-header">
                          {isUnread && <span className="runner-beat-new">[ NEW ]</span>}
                          <span className="runner-beat-from">FROM: {beat.from}</span>
                          <span className="runner-beat-subject">SUBJ: {beat.subject}</span>
                        </div>
                        <div className="runner-beat-body">{beat.body}</div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* ── SYSTEM TAB ── */}
          {activeTab === 'system' && (
            <div className="runner-system-panel">
              <div className="runner-shop-label">// SYSTEM //</div>

              <div className="runner-system-info">
                <div className="runner-prestige-row">
                  <span className="runner-prestige-label">CURRENT EDDIES</span>
                  <span>{fmtEddies(Math.floor(eddies))}</span>
                </div>
                <div className="runner-prestige-row">
                  <span className="runner-prestige-label">LIFETIME EDDIES</span>
                  <span>{fmtEddies(lifetimeRef.current)}</span>
                </div>
                <div className="runner-prestige-row">
                  <span className="runner-prestige-label">PRESTIGE COUNT</span>
                  <span>{prestigeCount}</span>
                </div>
                <div className="runner-prestige-row">
                  <span className="runner-prestige-label">GHOST TOKENS</span>
                  <span>{prestigeTokens}</span>
                </div>
              </div>

              <div className="runner-danger-zone">
                <div className="runner-shop-label runner-danger-label">// DANGER ZONE //</div>
                <p className="runner-danger-warning">
                  HARD RESET wipes ALL data including prestige tokens and upgrades. This cannot be undone.
                </p>
                <button
                  className={`runner-reset-btn ${resetConfirm ? 'confirm' : ''}`}
                  onClick={handleHardReset}
                >
                  {resetConfirm ? '⚠ CLICK AGAIN TO CONFIRM WIPE' : '☠ HARD RESET'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Activity log ── */}
        <div className="runner-log">
          <div className="runner-log-label">// ACTIVITY LOG //</div>
          <div className="runner-log-entries">
            {activityLog.map((entry, i) => (
              <div key={i} className={`runner-log-line ${entry.type || ''}`}>{entry.msg}</div>
            ))}
            {activityLog.length === 0 && (
              <div className="runner-log-empty">_ AWAITING ACTIVITY _</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
