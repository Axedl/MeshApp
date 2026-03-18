import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { MeshUser, RunnerState } from '../../types';
import './Runner.css';

interface RunnerModuleProps {
  user: MeshUser;
}

// ─── Upgrade definitions ──────────────────────────────────────────────────────

interface PassiveUpgradeDef {
  id: string;
  name: string;
  cost: number;
  income: number;
  flavour: string;
}

interface OneTimeUpgradeDef {
  id: string;
  name: string;
  cost: number;
  flavour: string;
  // multiplier for income (MULTIPLIER) or manual run power (CLICK)
  multiplier: number;
}

interface PrestigeUpgradeDef {
  id: string;
  name: string;
  tokenCost: number;
  maxLevel: number;
  flavour: string;
  description: string;
}

const PASSIVE_UPGRADES: PassiveUpgradeDef[] = [
  { id: 'cheap_rig',         name: 'Cheap Rig',          cost: 50,        income: 2,       flavour: 'Second-hand hardware, barely functional.' },
  { id: 'stolen_icebreaker', name: 'Stolen ICEbreaker',  cost: 200,       income: 10,      flavour: 'Lifted from a dead corpo. Still warm.' },
  { id: 'corpo_data_tap',    name: 'Corpo Data Tap',     cost: 1_000,     income: 50,      flavour: 'Skimming data from the Arasaka subnet.' },
  { id: 'black_ice_farm',    name: 'Black ICE Farm',     cost: 5_000,     income: 200,     flavour: 'Weaponised ICE, repurposed for profit.' },
  { id: 'rogue_ai',          name: 'Rogue AI Partner',   cost: 25_000,    income: 1_000,   flavour: 'Alt. Unpredictable. Extremely effective.' },
  { id: 'neural_link_hub',   name: 'Neural Link Hub',    cost: 100_000,   income: 5_000,   flavour: 'Direct cortex feed to the dark net.' },
  { id: 'quantum_subnet',    name: 'Quantum Subnet',     cost: 500_000,   income: 20_000,  flavour: 'Probability hacking. Barely legal.' },
  { id: 'corpo_mainframe',   name: 'Corpo Mainframe',    cost: 2_500_000, income: 100_000, flavour: 'You own a piece of Arasaka now.' },
];

const MULTIPLIER_UPGRADES: OneTimeUpgradeDef[] = [
  { id: 'mult_overclock',    name: 'Overclock Rig',       cost: 500,       multiplier: 1.1,  flavour: 'Pushed past thermal limits. Voided warranty.' },
  { id: 'mult_neural',       name: 'Neural Booster',      cost: 5_000,     multiplier: 1.25, flavour: 'Grey-market wetware. Works great.' },
  { id: 'mult_dealer',       name: 'Black Market Dealer', cost: 50_000,    multiplier: 1.5,  flavour: 'Wholesale data brokering. Low risk, high margin.' },
  { id: 'mult_datahaven',    name: 'Datahaven Membership',cost: 500_000,   multiplier: 2.0,  flavour: 'Friends in encrypted places.' },
  { id: 'mult_mole',         name: 'Corporate Mole',      cost: 5_000_000, multiplier: 3.0,  flavour: 'Someone inside Militech owes you everything.' },
];

const CLICK_UPGRADES: OneTimeUpgradeDef[] = [
  { id: 'click_macro',    name: 'Keyboard Macro',       cost: 300,     multiplier: 2,  flavour: 'Autokey spam. Juvenile but effective.' },
  { id: 'click_toolkit',  name: 'Script Kiddie Tools',  cost: 2_000,   multiplier: 5,  flavour: 'Lifted toolkit. Does the job.' },
  { id: 'click_custom',   name: 'Custom ICEbreaker',    cost: 20_000,  multiplier: 10, flavour: 'Built from scratch in a Japantown basement.' },
  { id: 'click_ghost',    name: 'Ghost Protocol Script',cost: 200_000, multiplier: 50, flavour: 'Leaves no trace. Hits like a freight train.' },
];

const PRESTIGE_UPGRADES: PrestigeUpgradeDef[] = [
  { id: 'base_mult',   name: 'Signal Amplifier',   tokenCost: 1, maxLevel: 5, description: '×1.5 income per level', flavour: 'Boost signal strength across all nodes.' },
  { id: 'offline_cap', name: 'Dead Drop Cache',     tokenCost: 1, maxLevel: 3, description: '+6h offline cap per level', flavour: 'Cached earnings drip long after you jack out.' },
  { id: 'click_boost', name: 'Trigger Finger',      tokenCost: 1, maxLevel: 1, description: '×2 manual run payout', flavour: 'Muscle memory from a thousand heists.' },
  { id: 'auto_run',    name: 'Ghost Script',        tokenCost: 2, maxLevel: 1, description: 'Auto-runs every 10 seconds', flavour: 'The net runs itself. You just watch.' },
];

// ─── Milestone definitions ────────────────────────────────────────────────────

interface MilestoneDef {
  id: string;
  threshold: number;
  bonus: number;
  message: string;
}

const MILESTONES: MilestoneDef[] = [
  { id: 'first_k',    threshold: 1_000,       bonus: 100,       message: 'First grand. You\'re in the game.' },
  { id: 'ten_k',      threshold: 10_000,       bonus: 1_000,     message: 'Ten large. Corpo notices.' },
  { id: 'hundred_k',  threshold: 100_000,      bonus: 10_000,    message: 'Six figures. Fixer calls.' },
  { id: 'million',    threshold: 1_000_000,    bonus: 100_000,   message: 'Seven figures. Legend status.' },
  { id: 'ten_mil',    threshold: 10_000_000,   bonus: 1_000_000, message: 'Ghost of the net. Untraceable.' },
  { id: 'hundred_mil',threshold: 100_000_000,  bonus: 10_000_000,message: 'You broke Arasaka\'s quarterly report.' },
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
  incomeMultiplier: number; // applied during event, 1 = no change
  durationMs: number;
}

const RANDOM_EVENTS: GameEvent[] = [
  { type: 'lucky',    label: 'LUCKY HACK',           incomeMultiplier: 1,   durationMs: 0 },    // instant bonus
  { type: 'windfall', label: 'DATA BREACH WINDFALL', incomeMultiplier: 2.0, durationMs: 30_000 },
  { type: 'sweep',    label: 'CORP SWEEP DETECTED',  incomeMultiplier: 0.5, durationMs: 30_000 },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_OFFLINE_SEC  = 8 * 3600;  // 8 hours default
const DISPLAY_TICK_MS   = 500;
const SAVE_INTERVAL_MS  = 30_000;
const RUN_COOLDOWN_MS   = 2_500;
const AUTO_RUN_INTERVAL = 10_000;    // Ghost Script: auto-run every 10s
const MAX_LOG           = 60;
const PRESTIGE_THRESHOLD = 1_000_000; // 1M lifetime eddies to unlock prestige
const EVENT_TICK_CHANCE  = 0.003;    // ~0.3% per 500ms tick ≈ event every ~3 minutes on average
const CONFIRM_TIMEOUT    = 5_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEddies(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toLocaleString();
}

function calcBaseIncome(upgrades: Record<string, number>): number {
  return 1 + PASSIVE_UPGRADES.reduce((sum, u) => sum + u.income * (upgrades[u.id] ?? 0), 0);
}

function calcMultiplier(upgrades: Record<string, number>, prestigeUpgrades: Record<string, number>, rep: number): number {
  // One-time multiplier upgrades (stack multiplicatively)
  let mult = MULTIPLIER_UPGRADES.reduce(
    (m, u) => (upgrades[u.id] ? m * u.multiplier : m),
    1
  );
  // Prestige: Signal Amplifier ×1.5 per level
  const presLevels = prestigeUpgrades['base_mult'] ?? 0;
  mult *= Math.pow(1.5, presLevels);
  // Rep bonus: +1% per rep level
  mult *= 1 + rep * 0.01;
  return mult;
}

function calcIncome(
  upgrades: Record<string, number>,
  prestigeUpgrades: Record<string, number>,
  rep: number,
  eventMult = 1
): number {
  return calcBaseIncome(upgrades) * calcMultiplier(upgrades, prestigeUpgrades, rep) * eventMult;
}

function calcClickPower(upgrades: Record<string, number>, prestigeUpgrades: Record<string, number>): number {
  let power = CLICK_UPGRADES.reduce(
    (p, u) => (upgrades[u.id] ? u.multiplier : p),
    1
  );
  if (prestigeUpgrades['click_boost']) power *= 2;
  return power;
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
  const [milestonesClaimed, setMilestonesClaimed] = useState<string[]>([]);
  const [activityLog, setActivityLog]       = useState<string[]>([]);
  const [runCooldown, setRunCooldown]       = useState(false);
  const [saveStatus, setSaveStatus]         = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeEvent, setActiveEvent]       = useState<{ label: string; endsAt: number; mult: number } | null>(null);
  const [activeTab, setActiveTab]           = useState<'upgrades' | 'prestige' | 'system'>('upgrades');
  const [prestigeConfirm, setPrestigeConfirm] = useState(false);
  const [resetConfirm, setResetConfirm]     = useState(false);

  // Mutable refs for interval closures
  const eddiesRef           = useRef(0);
  const repRef              = useRef(0);
  const upgradesRef         = useRef<Record<string, number>>({});
  const prestigeTokensRef   = useRef(0);
  const prestigeCountRef    = useRef(0);
  const prestigeUpgradesRef = useRef<Record<string, number>>({});
  const lifetimeRef         = useRef(0);
  const milestonesRef       = useRef<string[]>([]);
  const logRef              = useRef<string[]>([]);
  const activeEventRef      = useRef<{ label: string; endsAt: number; mult: number } | null>(null);

  // Timers for confirm revert
  const prestigeConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetConfirmTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const entry = `[${ts}] ${msg}`;
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

  const saveToDb = useCallback(async (
    e: number,
    r: number,
    u: Record<string, number>,
    pt: number,
    pc: number,
    pu: Record<string, number>,
    lifetime: number,
    mc: string[]
  ) => {
    setSaveStatus('saving');
    await supabase.from('mesh_runner_state').upsert(
      {
        owner_id: user.id,
        eddies: Math.floor(e),
        rep: r,
        upgrades: u,
        prestige_tokens: pt,
        prestige_count: pc,
        prestige_upgrades: pu,
        lifetime_eddies: Math.floor(lifetime),
        milestones_claimed: mc,
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
          last_tick: new Date().toISOString(),
        });
        addLog('>> MESH RUNNER INITIALISED. INCOME: 1 EDDIE/SEC');
        syncAll(0, 0, {}, 0, 0, {}, []);
        lifetimeRef.current = 0;
      } else {
        const state = data as RunnerState;
        const pt    = state.prestige_tokens ?? 0;
        const pc    = state.prestige_count  ?? 0;
        const pu    = (state.prestige_upgrades ?? {}) as Record<string, number>;
        const mc    = (state.milestones_claimed ?? []) as string[];

        const income = calcIncome(state.upgrades, pu, state.rep);
        const offlineCap = calcOfflineCap(pu);
        const lastTick = new Date(state.last_tick).getTime();
        const elapsedSec = Math.min((Date.now() - lastTick) / 1000, offlineCap);
        const offline = Math.floor(elapsedSec * income);

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
  }, [user.id, addLog, syncAll]);

  // ── Display tick (500ms) — income, milestones, random events ───────────────
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

      const income = calcIncome(upgradesRef.current, prestigeUpgradesRef.current, repRef.current, evMult);
      const earned = income * (DISPLAY_TICK_MS / 1000);

      eddiesRef.current   += earned;
      lifetimeRef.current += earned;

      setEddies(eddiesRef.current);

      // Rep (every 5K lifetime)
      const newRep = Math.floor(lifetimeRef.current / 5_000);
      if (newRep > repRef.current) {
        repRef.current = newRep;
        setRep(newRep);
        addLog(`>> REP INCREASED TO ${newRep}: ${getRepFlavour(newRep).toUpperCase()}`);
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
          addLog(`>> MILESTONE: ${m.message.toUpperCase()} — BONUS: +${fmtEddies(m.bonus)} EDDIES`);
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
          // Instant bonus — 10 seconds of income
          const bonus = Math.floor(income * 10);
          eddiesRef.current   += bonus;
          lifetimeRef.current += bonus;
          setEddies(eddiesRef.current);
          addLog(`>> ${evDef.label}: +${fmtEddies(bonus)} EDDIES`);
        } else {
          const newEvent = { label: evDef.label, endsAt: Date.now() + evDef.durationMs, mult: evDef.incomeMultiplier };
          activeEventRef.current = newEvent;
          setActiveEvent(newEvent);
          const effect = evDef.incomeMultiplier > 1 ? `INCOME ×${evDef.incomeMultiplier}` : `INCOME ×${evDef.incomeMultiplier}`;
          addLog(`>> EVENT: ${evDef.label} — ${effect} FOR 30 SECONDS`);
        }
      }
    }, DISPLAY_TICK_MS);

    return () => clearInterval(interval);
  }, [loading, addLog]);

  // ── Ghost Script: auto-run every 10s ────────────────────────────────────────
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      if (!prestigeUpgradesRef.current['auto_run']) return;
      const income = calcIncome(upgradesRef.current, prestigeUpgradesRef.current, repRef.current);
      const clickPow = calcClickPower(upgradesRef.current, prestigeUpgradesRef.current);
      const bonus = income * clickPow;
      eddiesRef.current   += bonus;
      lifetimeRef.current += bonus;
      setEddies(eddiesRef.current);
      addLog(`>> GHOST SCRIPT: AUTO-RUN +${fmtEddies(bonus)} EDDIES`);
    }, AUTO_RUN_INTERVAL);

    return () => clearInterval(interval);
  }, [loading, addLog]);

  // ── Periodic save (30s) ────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      saveToDb(
        eddiesRef.current, repRef.current, upgradesRef.current,
        prestigeTokensRef.current, prestigeCountRef.current, prestigeUpgradesRef.current,
        lifetimeRef.current, milestonesRef.current
      );
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [loading, saveToDb]);

  // ── Save on tab hide ────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;

    const handle = () => {
      if (document.visibilityState === 'hidden') {
        saveToDb(
          eddiesRef.current, repRef.current, upgradesRef.current,
          prestigeTokensRef.current, prestigeCountRef.current, prestigeUpgradesRef.current,
          lifetimeRef.current, milestonesRef.current
        );
      }
    };

    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [loading, saveToDb]);

  // ── Manual RUN ──────────────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    if (runCooldown) return;
    const income   = calcIncome(upgradesRef.current, prestigeUpgradesRef.current, repRef.current);
    const clickPow = calcClickPower(upgradesRef.current, prestigeUpgradesRef.current);
    const bonus    = income * clickPow;
    eddiesRef.current   += bonus;
    lifetimeRef.current += bonus;
    setEddies(eddiesRef.current);
    addLog(`>> MANUAL RUN: +${fmtEddies(bonus)} EDDIES`);
    setRunCooldown(true);
    setTimeout(() => setRunCooldown(false), RUN_COOLDOWN_MS);
  }, [runCooldown, addLog]);

  // ── Buy passive upgrade ─────────────────────────────────────────────────────
  const handleBuyPassive = useCallback(async (upg: PassiveUpgradeDef) => {
    if (eddiesRef.current < upg.cost) return;
    const newEddies   = eddiesRef.current - upg.cost;
    const newUpgrades = { ...upgradesRef.current, [upg.id]: (upgradesRef.current[upg.id] ?? 0) + 1 };
    eddiesRef.current   = newEddies;
    upgradesRef.current = newUpgrades;
    setEddies(newEddies);
    setUpgrades({ ...newUpgrades });
    const count     = newUpgrades[upg.id];
    const newIncome = calcIncome(newUpgrades, prestigeUpgradesRef.current, repRef.current);
    addLog(`>> PURCHASED: ${upg.name.toUpperCase()} (×${count}) — INCOME NOW ${fmtEddies(newIncome)}/SEC`);
    await saveToDb(newEddies, repRef.current, newUpgrades, prestigeTokensRef.current, prestigeCountRef.current, prestigeUpgradesRef.current, lifetimeRef.current, milestonesRef.current);
  }, [addLog, saveToDb]);

  // ── Buy one-time upgrade (multiplier or click) ──────────────────────────────
  const handleBuyOneTime = useCallback(async (upg: OneTimeUpgradeDef) => {
    if (eddiesRef.current < upg.cost || upgradesRef.current[upg.id]) return;
    const newEddies   = eddiesRef.current - upg.cost;
    const newUpgrades = { ...upgradesRef.current, [upg.id]: 1 };
    eddiesRef.current   = newEddies;
    upgradesRef.current = newUpgrades;
    setEddies(newEddies);
    setUpgrades({ ...newUpgrades });
    addLog(`>> UPGRADE INSTALLED: ${upg.name.toUpperCase()}`);
    await saveToDb(newEddies, repRef.current, newUpgrades, prestigeTokensRef.current, prestigeCountRef.current, prestigeUpgradesRef.current, lifetimeRef.current, milestonesRef.current);
  }, [addLog, saveToDb]);

  // ── Buy prestige upgrade ────────────────────────────────────────────────────
  const handleBuyPrestige = useCallback(async (upg: PrestigeUpgradeDef) => {
    const currentLevel = prestigeUpgradesRef.current[upg.id] ?? 0;
    if (currentLevel >= upg.maxLevel) return;
    if (prestigeTokensRef.current < upg.tokenCost) return;
    const newTokens = prestigeTokensRef.current - upg.tokenCost;
    const newPU     = { ...prestigeUpgradesRef.current, [upg.id]: currentLevel + 1 };
    prestigeTokensRef.current   = newTokens;
    prestigeUpgradesRef.current = newPU;
    setPrestigeTokens(newTokens);
    setPrestigeUpgrades({ ...newPU });
    addLog(`>> GHOST UPGRADE: ${upg.name.toUpperCase()} — ${upg.description.toUpperCase()}`);
    await saveToDb(eddiesRef.current, repRef.current, upgradesRef.current, newTokens, prestigeCountRef.current, newPU, lifetimeRef.current, milestonesRef.current);
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

    const tokensEarned  = Math.floor(lifetimeRef.current / PRESTIGE_THRESHOLD);
    const newTokenTotal = prestigeTokensRef.current + tokensEarned;
    const newCount      = prestigeCountRef.current + 1;

    prestigeTokensRef.current = newTokenTotal;
    prestigeCountRef.current  = newCount;
    eddiesRef.current         = 0;
    upgradesRef.current       = {};
    lifetimeRef.current       = 0;
    repRef.current            = 0;
    milestonesRef.current     = [];

    setPrestigeTokens(newTokenTotal);
    setPrestigeCount(newCount);
    setEddies(0);
    setRep(0);
    setUpgrades({});
    setMilestonesClaimed([]);
    setActiveTab('upgrades');

    addLog(`>> FLATLINE & RETURN — PRESTIGE ×${newCount}`);
    addLog(`>> GHOST TOKENS EARNED: +${tokensEarned} (TOTAL: ${newTokenTotal})`);

    await saveToDb(0, 0, {}, newTokenTotal, newCount, prestigeUpgradesRef.current, 0, []);
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
      last_tick: new Date().toISOString(),
    });

    syncAll(0, 0, {}, 0, 0, {}, []);
    lifetimeRef.current = 0;
    activeEventRef.current = null;
    setActiveEvent(null);
    setActiveTab('upgrades');

    // Reset log
    logRef.current = [];
    setActivityLog([]);
    addLog('>> HARD RESET EXECUTED. ALL DATA WIPED. STARTING FRESH.');
  }, [resetConfirm, addLog, syncAll, user.id]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const evMult  = activeEvent && Date.now() < activeEvent.endsAt ? activeEvent.mult : 1;
  const income  = calcIncome(upgrades, prestigeUpgrades, rep, evMult);
  const clickPow = calcClickPower(upgrades, prestigeUpgrades);
  const offlineCap = calcOfflineCap(prestigeUpgrades);
  const canPrestige = lifetimeRef.current >= PRESTIGE_THRESHOLD || prestigeCount > 0;
  const prestigeTokensToEarn = lifetimeRef.current >= PRESTIGE_THRESHOLD
    ? Math.floor(lifetimeRef.current / PRESTIGE_THRESHOLD)
    : 0;

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
              className={`runner-tab ${activeTab === 'upgrades' ? 'active' : ''}`}
              onClick={() => setActiveTab('upgrades')}
            >UPGRADES</button>
            <button
              className={`runner-tab ${activeTab === 'prestige' ? 'active' : ''} ${!canPrestige ? 'locked' : ''}`}
              onClick={() => canPrestige && setActiveTab('prestige')}
              title={!canPrestige ? `Unlock at ${fmtEddies(PRESTIGE_THRESHOLD)} lifetime eddies` : undefined}
            >
              {canPrestige ? 'GHOST PROTOCOL' : '[ LOCKED ]'}
            </button>
            <button
              className={`runner-tab runner-tab-danger ${activeTab === 'system' ? 'active' : ''}`}
              onClick={() => setActiveTab('system')}
            >SYSTEM</button>
          </div>

          {/* ── UPGRADES TAB ── */}
          {activeTab === 'upgrades' && (
            <>
              {/* Passive income */}
              <div className="runner-shop">
                <div className="runner-shop-label">// PASSIVE INCOME //</div>
                {PASSIVE_UPGRADES.map(upg => {
                  const owned     = upgrades[upg.id] ?? 0;
                  const canAfford = Math.floor(eddies) >= upg.cost;
                  return (
                    <div key={upg.id} className={`runner-upgrade-row ${!canAfford ? 'unaffordable' : ''}`}>
                      <div className="runner-upgrade-info">
                        <span className="runner-upgrade-name">{upg.name}</span>
                        {owned > 0 && <span className="runner-upgrade-owned">×{owned}</span>}
                        <span className="runner-upgrade-stat">+{fmtEddies(upg.income)}/sec each</span>
                        <span className="runner-upgrade-flavour">{upg.flavour}</span>
                      </div>
                      <button
                        className="runner-buy-btn"
                        onClick={() => handleBuyPassive(upg)}
                        disabled={!canAfford}
                      >
                        {fmtEddies(upg.cost)} ¥
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Multipliers */}
              <div className="runner-shop">
                <div className="runner-shop-label">// INCOME MULTIPLIERS //</div>
                {MULTIPLIER_UPGRADES.map(upg => {
                  const owned     = !!(upgrades[upg.id]);
                  const canAfford = !owned && Math.floor(eddies) >= upg.cost;
                  return (
                    <div key={upg.id} className={`runner-upgrade-row ${owned ? 'owned' : !canAfford ? 'unaffordable' : ''}`}>
                      <div className="runner-upgrade-info">
                        <span className="runner-upgrade-name">{upg.name}</span>
                        {owned && <span className="runner-upgrade-owned runner-upgrade-installed">INSTALLED</span>}
                        <span className="runner-upgrade-stat">×{upg.multiplier} income</span>
                        <span className="runner-upgrade-flavour">{upg.flavour}</span>
                      </div>
                      <button
                        className="runner-buy-btn"
                        onClick={() => handleBuyOneTime(upg)}
                        disabled={owned || !canAfford}
                      >
                        {owned ? '✓' : `${fmtEddies(upg.cost)} ¥`}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Run power */}
              <div className="runner-shop">
                <div className="runner-shop-label">// RUN POWER //</div>
                {CLICK_UPGRADES.map(upg => {
                  const owned     = !!(upgrades[upg.id]);
                  const canAfford = !owned && Math.floor(eddies) >= upg.cost;
                  return (
                    <div key={upg.id} className={`runner-upgrade-row ${owned ? 'owned' : !canAfford ? 'unaffordable' : ''}`}>
                      <div className="runner-upgrade-info">
                        <span className="runner-upgrade-name">{upg.name}</span>
                        {owned && <span className="runner-upgrade-owned runner-upgrade-installed">INSTALLED</span>}
                        <span className="runner-upgrade-stat">×{upg.multiplier} manual run</span>
                        <span className="runner-upgrade-flavour">{upg.flavour}</span>
                      </div>
                      <button
                        className="runner-buy-btn"
                        onClick={() => handleBuyOneTime(upg)}
                        disabled={owned || !canAfford}
                      >
                        {owned ? '✓' : `${fmtEddies(upg.cost)} ¥`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
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
                <p>COST: <strong>{fmtEddies(PRESTIGE_THRESHOLD)}</strong> lifetime eddies per Ghost Token.</p>
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
                        <span className="runner-upgrade-stat">{upg.description}</span>
                        <span className="runner-upgrade-flavour">{upg.flavour}</span>
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
              <div key={i} className="runner-log-line">{entry}</div>
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
