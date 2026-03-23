import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type {
  BossState,
  CareerPath,
  CareerResources,
  CrewMember,
  GhostMemoryTree,
  RunHistoryEntry,
  RunnerAct,
} from '../../types';
import RunnerStatsBar from './RunnerStatsBar';
import RunnerAct1 from './RunnerAct1';
import RunnerCareerJob from './RunnerCareerJob';
import RunnerAct2 from './RunnerAct2';
import RunnerBossMoment from './RunnerBossMoment';
import RunnerAct3 from './RunnerAct3';
import RunnerAct4 from './RunnerAct4';
import RunnerGhostProtocol from './RunnerGhostProtocol';
import RunnerComms from './RunnerComms';
import RunnerSystem from './RunnerSystem';
import { ALL_UPGRADES, getUpgrade } from './constants/upgrades';
import { getBossByPath } from './constants/bosses';
import { getNewBeats, getBeat, JOB_SEQUENCE_BEATS } from './constants/storyBeats';
import { getPathDef } from './constants/paths';
import './Runner.css';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const TICK_MS = 500;
const SAVE_INTERVAL_MS = 30_000;
const CAREER_UNLOCK_REP = 20;
const CAREER_UNLOCK_CONTACTS = 500;
const LEGEND_INFLUENCE_THRESHOLD = 100000;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function fmt(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Math.floor(n).toString();
}

const DEFAULT_BOSS_STATE: BossState = {
  act2_complete: false,
  act3_complete: false,
  current_boss_active: false,
  current_boss_id: null,
  current_boss_progress: 0,
  current_boss_target: 0,
};

const DEFAULT_GHOST_MEMORY: GhostMemoryTree = {
  universal: {},
  paths: {},
  branches: {},
};

export type TabId =
  | 'shop'
  | 'job'
  | 'hustle'
  | 'path'
  | 'contacts_tab'
  | 'branch'
  | 'crew'
  | 'comms'
  | 'ghost'
  | 'system';

export interface LogEntry {
  msg: string;
  type?: 'story' | 'milestone' | 'event' | 'run' | 'boss';
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function Runner() {

  // ── Core currency state ───────────────────────────────────────────────────
  const [eddies, setEddies] = useState(0);
  const [lifetimeEddies, setLifetimeEddies] = useState(0);
  const [rep, setRep] = useState(0);
  const [upgrades, setUpgrades] = useState<Record<string, number>>({});
  const [prestigeTokens, setPrestigeTokens] = useState(0);
  const [prestigeCount, setPrestigeCount] = useState(0);
  const [, setPrestigeUpgrades] = useState<Record<string, number>>({});

  // ── Redesign state ────────────────────────────────────────────────────────
  const [act, setAct] = useState<RunnerAct>(1);
  const [careerPath, setCareerPath] = useState<CareerPath | null>(null);
  const [careerResources, setCareerResources] = useState<CareerResources>({ secondary: 0 });
  const [bossState, setBossState] = useState<BossState>(DEFAULT_BOSS_STATE);
  const [crew, setCrew] = useState<Record<string, CrewMember[]>>({});
  const [ghostMemoryTree, setGhostMemoryTree] = useState<GhostMemoryTree>(DEFAULT_GHOST_MEMORY);
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>([]);
  const [contactRelationships, setContactRelationships] = useState<Record<string, number>>({});
  const [careerBranch, setCareerBranch] = useState<string | null>(null);
  const [jobSequenceStep, setJobSequenceStep] = useState<0 | 1 | 2 | 3 | 4>(0);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('shop');
  const [activityLog, setActivityLog] = useState<LogEntry[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [runCooldown, setRunCooldown] = useState(false);
  const [storyBeatsSeen, setStoryBeatsSeen] = useState<string[]>([]);
  const [receivedBeats, setReceivedBeats] = useState<string[]>([]);
  const [hasUnreadBeats, setHasUnreadBeats] = useState(false);
  const [prestigeConfirm, setPrestigeConfirm] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeEvent, setActiveEvent] = useState<{ label: string; endsAt: number; mult: number } | null>(null);

  // ── Refs (game-loop closures) ─────────────────────────────────────────────
  const eddiesRef = useRef(0);
  const lifetimeRef = useRef(0);
  const repRef = useRef(0);
  const upgradesRef = useRef<Record<string, number>>({});
  const prestigeTokensRef = useRef(0);
  const prestigeCountRef = useRef(0);
  const prestigeUpgradesRef = useRef<Record<string, number>>({});
  const actRef = useRef<RunnerAct>(1);
  const careerPathRef = useRef<CareerPath | null>(null);
  const careerResourcesRef = useRef<CareerResources>({ secondary: 0 });
  const bossStateRef = useRef<BossState>(DEFAULT_BOSS_STATE);
  const ghostMemoryRef = useRef<GhostMemoryTree>(DEFAULT_GHOST_MEMORY);
  const logRef = useRef<LogEntry[]>([]);
  const activeEventRef = useRef<{ label: string; endsAt: number; mult: number } | null>(null);
  const storyBeatsSeenRef = useRef<string[]>([]);
  const receivedBeatsRef = useRef<string[]>([]);
  const activeTabRef = useRef<TabId>('shop');
  const jobStepRef = useRef<0 | 1 | 2 | 3 | 4>(0);
  const contactRelRef = useRef<Record<string, number>>({});
  const careerBranchRef = useRef<string | null>(null);
  const crewRef = useRef<Record<string, CrewMember[]>>({});
  const runHistoryRef = useRef<RunHistoryEntry[]>([]);

  const prestigeConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── INCOME CALCULATION ───────────────────────────────────────────────────

  const calcBaseIncome = useCallback((): number => {
    const ups = upgradesRef.current;
    let base = 1;
    for (const upDef of ALL_UPGRADES) {
      if (ups[upDef.id] && upDef.incomeMod) {
        base += upDef.incomeMod;
      }
    }
    return base;
  }, []);

  const calcMultiplier = useCallback((eventMult = 1): number => {
    const ups = upgradesRef.current;
    const pu = prestigeUpgradesRef.current;
    let mult = 1;
    // Only apply incomeMultMod for non-ghost upgrades; ghost effects come from ghostMemoryRef below
    for (const upDef of ALL_UPGRADES) {
      if (ups[upDef.id] && upDef.incomeMultMod && upDef.category !== 'ghost_universal' && upDef.category !== 'ghost_path') {
        mult *= upDef.incomeMultMod;
      }
    }
    // Ghost memory effects — read exclusively from ghostMemoryRef
    const gm = ghostMemoryRef.current;
    if (gm.universal['gm_street_memory']) mult *= 1.2;
    // Rep scales income: base +1% per rep, upgraded to +1.5% by "The Long Game"
    mult *= gm.universal['gm_the_long_game']
      ? (1 + repRef.current * 0.015)
      : (1 + repRef.current * 0.01);
    mult *= Math.pow(1.5, pu['base_mult'] ?? 0);
    mult *= eventMult;
    return mult;
  }, []);

  const calcSecondaryGenRate = useCallback((): number => {
    const ups = upgradesRef.current;
    let rate = 0;
    for (const upDef of ALL_UPGRADES) {
      if (!ups[upDef.id] || !upDef.secondaryGenMod) continue;
      if (upDef.path === careerPathRef.current) {
        rate += upDef.secondaryGenMod;
      } else if (!upDef.path && upDef.category === 'act1_universal') {
        rate += upDef.secondaryGenMod;
      }
    }
    return rate;
  }, []);

  const calcInfluenceGenRate = useCallback((): number => {
    if (actRef.current < 3) return 0;
    const ups = upgradesRef.current;
    let rate = repRef.current * 0.1 + (careerResourcesRef.current.secondary ?? 0) * 0.01;
    for (const upDef of ALL_UPGRADES) {
      if (ups[upDef.id] && upDef.influenceGenMod) rate += upDef.influenceGenMod;
    }
    return rate;
  }, []);

  const calcIncome = useCallback((): number => {
    const eventMult = activeEventRef.current && Date.now() < activeEventRef.current.endsAt
      ? activeEventRef.current.mult
      : 1;
    return calcBaseIncome() * calcMultiplier(eventMult);
  }, [calcBaseIncome, calcMultiplier]);

  const calcOfflineCap = useCallback((): number => {
    const pu = prestigeUpgradesRef.current;
    const gm = ghostMemoryRef.current;
    const ups = upgradesRef.current;
    let hours = 8;
    hours += (pu['offline_cap'] ?? 0) * 6;
    hours += (gm.universal['gm_worn_routes'] ?? 0) * 4;
    for (const upDef of ALL_UPGRADES) {
      if (ups[upDef.id] && upDef.offlineCapHours) hours += upDef.offlineCapHours;
    }
    return hours * 3600;
  }, []);

  // ─── LOGGING ─────────────────────────────────────────────────────────────

  const addLog = useCallback((msg: string, type?: LogEntry['type']) => {
    const entry: LogEntry = { msg, type };
    const next = [entry, ...logRef.current].slice(0, 80);
    logRef.current = next;
    setActivityLog([...next]);
  }, []);

  // ─── STORY BEATS ─────────────────────────────────────────────────────────

  const checkAndFireBeats = useCallback(() => {
    const newBeats = getNewBeats({
      lifetimeEddies: lifetimeRef.current,
      rep: repRef.current,
      contacts: careerResourcesRef.current.secondary,
      influence: careerResourcesRef.current.influence ?? 0,
      act: actRef.current,
      prestigeCount: prestigeCountRef.current,
      careerPath: careerPathRef.current,
      seenBeatIds: storyBeatsSeenRef.current,
    });
    if (newBeats.length === 0) return;

    const updatedSeen = [...storyBeatsSeenRef.current];
    const updatedReceived = [...receivedBeatsRef.current];
    for (const beat of newBeats) {
      if (!updatedSeen.includes(beat.id)) updatedSeen.push(beat.id);
      if (!updatedReceived.includes(beat.id)) updatedReceived.push(beat.id);
      addLog(`[COMMS] ${beat.from}: ${beat.subject}`, 'story');
    }
    storyBeatsSeenRef.current = updatedSeen;
    receivedBeatsRef.current = updatedReceived;
    setStoryBeatsSeen([...updatedSeen]);
    setReceivedBeats([...updatedReceived]);
    if (activeTabRef.current !== 'comms') setHasUnreadBeats(true);
  }, [addLog]);

  const fireBossResolveBeat = useCallback((beatId: string) => {
    const beat = getBeat(beatId);
    if (!beat || storyBeatsSeenRef.current.includes(beat.id)) return;
    const updatedSeen = [...storyBeatsSeenRef.current, beat.id];
    const updatedReceived = [...receivedBeatsRef.current, beat.id];
    storyBeatsSeenRef.current = updatedSeen;
    receivedBeatsRef.current = updatedReceived;
    setStoryBeatsSeen(updatedSeen);
    setReceivedBeats(updatedReceived);
    if (activeTabRef.current !== 'comms') setHasUnreadBeats(true);
    addLog(`[COMMS] ${beat.from}: ${beat.subject}`, 'story');
  }, [addLog]);

  // ─── SAVE ─────────────────────────────────────────────────────────────────

  const saveToDb = useCallback(async () => {
    if (!user) return;
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
        milestones_claimed: [],
        story_beats_seen: storyBeatsSeenRef.current,
        last_tick: new Date().toISOString(),
        act: actRef.current,
        career_path: careerPathRef.current,
        career_resources: careerResourcesRef.current,
        boss_state: bossStateRef.current,
        crew: crewRef.current,
        ghost_memory_tree: ghostMemoryRef.current,
        run_history: runHistoryRef.current,
        contacts: contactRelRef.current,
        career_branch: careerBranchRef.current,
        job_sequence_step: jobStepRef.current,
      },
      { onConflict: 'owner_id' }
    );
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 1500);
  }, [user]);

  // ─── LOAD ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('mesh_runner_state')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        addLog('ERROR: Could not load runner state', 'story');
        setLoaded(true);
        return;
      }

      if (!data) {
        await supabase.from('mesh_runner_state').insert({
          owner_id: user.id,
          eddies: 0, rep: 0, upgrades: {}, prestige_tokens: 0,
          prestige_count: 0, prestige_upgrades: {}, lifetime_eddies: 0,
          milestones_claimed: [], story_beats_seen: [],
          last_tick: new Date().toISOString(),
          act: 1, career_path: null, career_resources: { secondary: 0 },
          boss_state: DEFAULT_BOSS_STATE, crew: {},
          ghost_memory_tree: DEFAULT_GHOST_MEMORY, run_history: [], contacts: {},
          career_branch: null, job_sequence_step: 0,
        });
        setLoaded(true);
        return;
      }

      const pu = (data.prestige_upgrades as Record<string, number>) ?? {};
      const ups = (data.upgrades as Record<string, number>) ?? {};
      const restoredAct: RunnerAct = (data.act as RunnerAct) ?? 1;
      const restoredPath: CareerPath | null = data.career_path as CareerPath | null ?? null;
      const restoredResources: CareerResources = (data.career_resources as CareerResources) ?? { secondary: 0 };
      const restoredBossState: BossState = (data.boss_state as BossState) ?? DEFAULT_BOSS_STATE;
      const restoredCrew = (data.crew as Record<string, CrewMember[]>) ?? {};
      const restoredGM: GhostMemoryTree = (data.ghost_memory_tree as GhostMemoryTree) ?? DEFAULT_GHOST_MEMORY;
      const restoredRunHistory: RunHistoryEntry[] = (data.run_history as RunHistoryEntry[]) ?? [];
      const restoredContacts = (data.contacts as Record<string, number>) ?? {};
      const restoredBeats: string[] = (data.story_beats_seen as string[]) ?? [];
      const restoredBranch: string | null = (data.career_branch as string | null) ?? null;
      const restoredJobStep = (data.job_sequence_step as 0 | 1 | 2 | 3 | 4) ?? 0;

      upgradesRef.current = ups;
      prestigeUpgradesRef.current = pu;
      actRef.current = restoredAct;
      careerPathRef.current = restoredPath;
      careerResourcesRef.current = restoredResources;
      bossStateRef.current = restoredBossState;
      crewRef.current = restoredCrew;
      ghostMemoryRef.current = restoredGM;
      storyBeatsSeenRef.current = restoredBeats;
      receivedBeatsRef.current = [...restoredBeats];
      contactRelRef.current = restoredContacts;
      runHistoryRef.current = restoredRunHistory;
      careerBranchRef.current = restoredBranch;
      jobStepRef.current = restoredJobStep;
      repRef.current = (data.rep as number) ?? 0;
      prestigeTokensRef.current = (data.prestige_tokens as number) ?? 0;
      prestigeCountRef.current = (data.prestige_count as number) ?? 0;

      let offlineEddies = 0;
      if (restoredAct < 4) {
        const offlineCap = calcOfflineCap();
        const elapsed = Math.min(
          (Date.now() - new Date(data.last_tick as string).getTime()) / 1000,
          offlineCap
        );
        offlineEddies = Math.floor(elapsed * calcIncome());
      }

      const newEddies = Math.floor((data.eddies as number ?? 0) + offlineEddies);
      const newLifetime = Math.floor((data.lifetime_eddies as number ?? 0) + offlineEddies);
      eddiesRef.current = newEddies;
      lifetimeRef.current = newLifetime;

      setEddies(newEddies);
      setLifetimeEddies(newLifetime);
      setRep(repRef.current);
      setUpgrades(ups);
      setPrestigeTokens(prestigeTokensRef.current);
      setPrestigeCount(prestigeCountRef.current);
      setPrestigeUpgrades(pu);
      setAct(restoredAct);
      setCareerPath(restoredPath);
      setCareerResources(restoredResources);
      setBossState(restoredBossState);
      setCrew(restoredCrew);
      setGhostMemoryTree(restoredGM);
      setRunHistory(restoredRunHistory);
      setContactRelationships(restoredContacts);
      setStoryBeatsSeen(restoredBeats);
      setReceivedBeats([...restoredBeats]);
      setCareerBranch(restoredBranch);
      setJobSequenceStep(restoredJobStep);

      if (offlineEddies > 0) addLog(`OFFLINE: +${fmt(offlineEddies)} eddies earned`, 'milestone');
      setLoaded(true);
    };
    load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── GAME LOOP ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      if (bossStateRef.current.current_boss_active) {
        // Income redirects to boss progress while the encounter is active.
        const income = calcIncome() / 2;
        const bs = bossStateRef.current;
        const newProgress = Math.min(bs.current_boss_progress + income, bs.current_boss_target);
        const nb = { ...bs, current_boss_progress: newProgress };
        bossStateRef.current = nb;
        setBossState({ ...nb });
        return;
      }

      const income = calcIncome() / 2;
      const secondaryRate = calcSecondaryGenRate() / 2;
      const influenceRate = calcInfluenceGenRate() / 2;

      eddiesRef.current += income;
      lifetimeRef.current += income;

      const res = { ...careerResourcesRef.current };
      res.secondary = (res.secondary ?? 0) + secondaryRate;
      if (actRef.current >= 3 && influenceRate > 0) {
        res.influence = (res.influence ?? 0) + influenceRate;
      }
      careerResourcesRef.current = res;

      const newRep = Math.min(100, Math.floor(lifetimeRef.current / 500000));
      if (newRep !== repRef.current) {
        repRef.current = newRep;
        setRep(newRep);
        if (newRep > 0) addLog(`REP UP — Level ${newRep}`, 'milestone');
      }

      if (activeEventRef.current && Date.now() > activeEventRef.current.endsAt) {
        activeEventRef.current = null;
        setActiveEvent(null);
      }

      if (!activeEventRef.current && Math.random() < 0.002) {
        const roll = Math.random();
        if (roll < 0.33) {
          const bonus = calcIncome() * 10;
          eddiesRef.current += bonus;
          lifetimeRef.current += bonus;
          addLog(`LUCKY HACK — +${fmt(bonus)} eddies`, 'event');
        } else if (roll < 0.66) {
          const ev = { label: 'DATA BREACH WINDFALL', endsAt: Date.now() + 30000, mult: 2 };
          activeEventRef.current = ev;
          setActiveEvent(ev);
          addLog('DATA BREACH WINDFALL — ×2 income 30s', 'event');
        } else if (!upgradesRef.current['a1_ghost_address']) {
          const ev = { label: 'CORP SWEEP', endsAt: Date.now() + 30000, mult: 0.5 };
          activeEventRef.current = ev;
          setActiveEvent(ev);
          addLog('CORP SWEEP — ×0.5 income 30s', 'event');
        }
      }

      if (Math.random() < 0.25) checkAndFireBeats();

      if (
        actRef.current === 1 &&
        jobStepRef.current === 0 &&
        repRef.current >= CAREER_UNLOCK_REP &&
        res.secondary >= CAREER_UNLOCK_CONTACTS
      ) {
        jobStepRef.current = 1;
        setJobSequenceStep(1);
        addLog("RAVEN: I've got a job — check COMMS", 'story');
      }

      setEddies(Math.floor(eddiesRef.current));
      setLifetimeEddies(Math.floor(lifetimeRef.current));
      setCareerResources({ ...res });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [loaded, calcIncome, calcSecondaryGenRate, calcInfluenceGenRate, checkAndFireBeats, addLog]);

  // ─── AUTO-SAVE ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(saveToDb, SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loaded, saveToDb]);

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') saveToDb(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [saveToDb]);

  // ─── PURCHASE ────────────────────────────────────────────────────────────

  const isGhostUpgrade = (category: string) =>
    category === 'ghost_universal' || category === 'ghost_path';

  const isGhostNodeOwned = useCallback((def: { id: string; category: string; path?: string }): boolean => {
    if (def.category === 'ghost_universal') return !!ghostMemoryRef.current.universal[def.id];
    if (def.category === 'ghost_path' && def.path) return !!ghostMemoryRef.current.paths[def.path]?.[def.id];
    return false;
  }, []);

  const purchaseUpgrade = useCallback(async (id: string) => {
    const def = getUpgrade(id);
    if (!def) return;

    // Use the correct ownership map depending on upgrade type
    const alreadyOwned = isGhostUpgrade(def.category) ? isGhostNodeOwned(def) : !!upgradesRef.current[id];
    if (alreadyOwned) return;

    // Prereqs: ghost upgrades check ghost memory; regular upgrades check upgradesRef
    if (def.prereq?.some(req => {
      const reqDef = getUpgrade(req);
      if (reqDef && isGhostUpgrade(reqDef.category)) return !isGhostNodeOwned(reqDef);
      return !upgradesRef.current[req];
    })) return;

    // Cost check
    if (def.costResource === 'eddies' && eddiesRef.current < def.cost) return;
    if (def.costResource === 'ghost_tokens' && prestigeTokensRef.current < def.cost) return;
    if (def.costResource === 'contacts') {
      if ((careerResourcesRef.current.secondary ?? 0) < def.cost) return;
    }

    // Deduct
    if (def.costResource === 'eddies') {
      eddiesRef.current -= def.cost;
      setEddies(Math.floor(eddiesRef.current));
    } else if (def.costResource === 'ghost_tokens') {
      prestigeTokensRef.current -= def.cost;
      setPrestigeTokens(prestigeTokensRef.current);
    } else if (def.costResource === 'contacts') {
      const res = { ...careerResourcesRef.current, secondary: (careerResourcesRef.current.secondary ?? 0) - def.cost };
      careerResourcesRef.current = res;
      setCareerResources({ ...res });
    }

    // Check boss gates
    if (careerPathRef.current) {
      const pathDef = getPathDef(careerPathRef.current);

      if (id === pathDef.act2BossGateUpgrade && !bossStateRef.current.act2_complete) {
        const boss = getBossByPath(careerPathRef.current, 2);
        if (boss) {
          const nb: BossState = {
            ...bossStateRef.current,
            current_boss_active: true,
            current_boss_id: boss.id,
            current_boss_progress: 0,
            current_boss_target: boss.eddiesCost,
          };
          bossStateRef.current = nb;
          setBossState(nb);
          addLog(`[THREAT] ${boss.name} — income redirected`, 'boss');
        }
      } else if (id === pathDef.act3BossGateUpgrade && bossStateRef.current.act2_complete && !bossStateRef.current.act3_complete) {
        const boss = getBossByPath(careerPathRef.current, 3);
        if (boss) {
          const nb: BossState = {
            ...bossStateRef.current,
            current_boss_active: true,
            current_boss_id: boss.id,
            current_boss_progress: 0,
            current_boss_target: boss.eddiesCost,
          };
          bossStateRef.current = nb;
          setBossState(nb);
          addLog(`[THREAT] ${boss.name} — income redirected`, 'boss');
        }
      }
    }

    if (isGhostUpgrade(def.category)) {
      // Ghost nodes live in ghostMemoryTree, not upgradesRef
      const gm = ghostMemoryRef.current;
      const newGM: GhostMemoryTree = {
        universal: { ...gm.universal },
        paths: { ...gm.paths },
        branches: { ...gm.branches },
      };
      if (def.category === 'ghost_universal') {
        newGM.universal[id] = 1;
      } else if (def.category === 'ghost_path' && def.path) {
        newGM.paths[def.path] = { ...(gm.paths[def.path] ?? {}), [id]: 1 };
      }
      ghostMemoryRef.current = newGM;
      setGhostMemoryTree({ ...newGM });
    } else {
      const newUpgrades = { ...upgradesRef.current, [id]: 1 };
      upgradesRef.current = newUpgrades;
      setUpgrades({ ...newUpgrades });
    }
    addLog(`INSTALLED: ${def.name}`, 'milestone');
    await saveToDb();
  }, [addLog, saveToDb]);

  // ─── CAREER SELECTION ────────────────────────────────────────────────────

  const selectCareer = useCallback(async (path: CareerPath) => {
    careerPathRef.current = path;
    actRef.current = 2;
    careerResourcesRef.current = { secondary: 0 };
    jobStepRef.current = 0;
    setCareerPath(path);
    setAct(2);
    setCareerResources({ secondary: 0 });
    setJobSequenceStep(0);
    setActiveTab('hustle');
    addLog(`CAREER SELECTED: ${path.toUpperCase()}`, 'milestone');

    const confirmBeatId = `career_confirm_${path}`;
    const beat = getBeat(confirmBeatId);
    if (beat && !storyBeatsSeenRef.current.includes(beat.id)) {
      const updatedSeen = [...storyBeatsSeenRef.current, beat.id];
      const updatedReceived = [...receivedBeatsRef.current, beat.id];
      storyBeatsSeenRef.current = updatedSeen;
      receivedBeatsRef.current = updatedReceived;
      setStoryBeatsSeen(updatedSeen);
      setReceivedBeats(updatedReceived);
      setHasUnreadBeats(true);
    }
    await saveToDb();
  }, [addLog, saveToDb]);

  // ─── BOSS RESOLUTION ─────────────────────────────────────────────────────

  const engageBoss = useCallback(() => {
    addLog(`ENGAGING boss encounter`, 'boss');
  }, [addLog]);

  const resolveBoss = useCallback(async () => {
    const bs = bossStateRef.current;
    if (!bs.current_boss_active || !bs.current_boss_id || !careerPathRef.current) return;

    const isAct2 = bs.current_boss_id.includes('_a2_');
    const boss = getBossByPath(careerPathRef.current, isAct2 ? 2 : 3);
    if (!boss) return;

    eddiesRef.current += boss.rewardEddies;
    lifetimeRef.current += boss.rewardEddies;
    setEddies(Math.floor(eddiesRef.current));
    setLifetimeEddies(Math.floor(lifetimeRef.current));

    const newBossState: BossState = {
      ...bs,
      current_boss_active: false,
      current_boss_id: null,
      current_boss_progress: 0,
      current_boss_target: 0,
      act2_complete: isAct2 ? true : bs.act2_complete,
      act3_complete: !isAct2 ? true : bs.act3_complete,
    };
    bossStateRef.current = newBossState;
    setBossState(newBossState);

    const newAct: RunnerAct = isAct2 ? 3 : 4;
    actRef.current = newAct;
    setAct(newAct);

    addLog(boss.rewardLogMsg, 'boss');
    addLog(`ACT ${newAct} UNLOCKED`, 'milestone');
    fireBossResolveBeat(boss.storyBeatId);
    checkAndFireBeats();
    await saveToDb();
  }, [addLog, fireBossResolveBeat, checkAndFireBeats, saveToDb]);

  const _updateBossProgress = useCallback((amount: number) => {
    const bs = bossStateRef.current;
    if (!bs.current_boss_active) return;
    const newProgress = Math.min(bs.current_boss_progress + amount, bs.current_boss_target);
    const nb = { ...bs, current_boss_progress: newProgress };
    bossStateRef.current = nb;
    setBossState({ ...nb });
  }, []);

  // ─── BRANCH SELECTION ────────────────────────────────────────────────────

  const selectBranch = useCallback(async (branch: string) => {
    careerBranchRef.current = branch;
    setCareerBranch(branch);
    addLog(`BRANCH SELECTED: ${branch}`, 'milestone');
    await saveToDb();
  }, [addLog, saveToDb]);

  // ─── CREW HIRE ────────────────────────────────────────────────────────────

  const hireCrew = useCallback(async (memberId: string, eddiesCost: number, secondaryCost: number, influenceCost = 0) => {
    if (!careerPathRef.current) return;
    if (eddiesRef.current < eddiesCost) return;
    if (secondaryCost > 0 && careerResourcesRef.current.secondary < secondaryCost) return;
    if (influenceCost > 0 && (careerResourcesRef.current.influence ?? 0) < influenceCost) return;

    const path = careerPathRef.current;
    if (crewRef.current[path]?.some(m => m.id === memberId)) return; // already hired

    eddiesRef.current -= eddiesCost;
    setEddies(Math.floor(eddiesRef.current));

    if (secondaryCost > 0 || influenceCost > 0) {
      const res = {
        ...careerResourcesRef.current,
        secondary: careerResourcesRef.current.secondary - secondaryCost,
        influence: (careerResourcesRef.current.influence ?? 0) - influenceCost,
      };
      careerResourcesRef.current = res;
      setCareerResources({ ...res });
    }

    const member: CrewMember = {
      id: memberId,
      name: memberId,
      specialty: '',
      income_bonus: 0,
      hired_at: new Date().toISOString(),
    };
    const pathCrew = [...(crewRef.current[path] ?? []), member];
    const newCrew = { ...crewRef.current, [path]: pathCrew };
    crewRef.current = newCrew;
    setCrew({ ...newCrew });
    addLog(`HIRED: ${memberId}`, 'milestone');
    await saveToDb();
  }, [addLog, saveToDb]);

  // ─── MANUAL RUN ──────────────────────────────────────────────────────────

  const handleRun = useCallback(() => {
    if (runCooldown) return;
    const bonus = calcIncome() * 2;
    eddiesRef.current += bonus;
    lifetimeRef.current += bonus;
    setEddies(Math.floor(eddiesRef.current));
    setLifetimeEddies(Math.floor(lifetimeRef.current));
    addLog(`RUN +${fmt(bonus)}`, 'run');
    setRunCooldown(true);
    setTimeout(() => setRunCooldown(false), 500);
  }, [runCooldown, calcIncome, addLog]);

  // ─── PRESTIGE ────────────────────────────────────────────────────────────

  const handlePrestige = useCallback(async () => {
    if (!prestigeConfirm) {
      setPrestigeConfirm(true);
      prestigeConfirmTimer.current = setTimeout(() => setPrestigeConfirm(false), 4000);
      return;
    }
    if (prestigeConfirmTimer.current) clearTimeout(prestigeConfirmTimer.current);
    setPrestigeConfirm(false);

    const entry: RunHistoryEntry = {
      run_number: prestigeCountRef.current + 1,
      path: careerPathRef.current ?? 'solo',
      branch: careerBranchRef.current,
      act_reached: actRef.current,
      lifetime_eddies: Math.floor(lifetimeRef.current),
      completed_at: new Date().toISOString(),
    };

    const newGM: GhostMemoryTree = {
      universal: { ...ghostMemoryRef.current.universal },
      paths: { ...ghostMemoryRef.current.paths },
      branches: { ...ghostMemoryRef.current.branches },
    };
    const path = careerPathRef.current;
    if (path) {
      if (!newGM.paths[path]) newGM.paths[path] = {};
      newGM.paths[path][`gp_${path}_1`] = 1;
      if (entry.act_reached >= 2) newGM.paths[path][`gp_${path}_2`] = 1;
      if (entry.act_reached >= 3) newGM.paths[path][`gp_${path}_3`] = 1;
      if (entry.act_reached >= 4) newGM.paths[path][`gp_${path}_4`] = 1;
      if (careerBranchRef.current) {
        // Intentionally records the UNCHOSEN branch — ghost memory preserves the road not taken.
        // Ghost node IDs must use format `branch_${path}_a` / `branch_${path}_b` to match.
        newGM.branches[`branch_${path}_${careerBranchRef.current === 'a' ? 'b' : 'a'}`] = 1;
      }
    }
    if (prestigeCountRef.current === 0) newGM.universal['gm_street_memory'] = 1;
    ghostMemoryRef.current = newGM;

    const tokensEarned = Math.max(1, Math.floor(lifetimeRef.current / 1_000_000_000));
    prestigeTokensRef.current += tokensEarned;
    prestigeCountRef.current += 1;

    eddiesRef.current = 0;
    lifetimeRef.current = 0;
    repRef.current = 0;
    upgradesRef.current = {};
    careerPathRef.current = null;
    actRef.current = 1;
    careerResourcesRef.current = { secondary: 0 };
    bossStateRef.current = DEFAULT_BOSS_STATE;
    crewRef.current = {};
    careerBranchRef.current = null;
    jobStepRef.current = 0;
    contactRelRef.current = {};
    const newHistory = [...runHistoryRef.current, entry];
    runHistoryRef.current = newHistory;

    setEddies(0); setLifetimeEddies(0); setRep(0);
    setUpgrades({}); setAct(1); setCareerPath(null); setCareerResources({ secondary: 0 });
    setBossState(DEFAULT_BOSS_STATE); setCrew({}); setGhostMemoryTree(newGM);
    setRunHistory(newHistory); setContactRelationships({}); setCareerBranch(null);
    setJobSequenceStep(0); setActiveTab('shop');
    setPrestigeCount(prestigeCountRef.current);
    setPrestigeTokens(prestigeTokensRef.current);
    addLog(`FLATLINE & RETURN — Run #${entry.run_number} archived`, 'milestone');
    addLog(`GHOST TOKENS +${tokensEarned}`, 'milestone');

    await saveToDb();
    checkAndFireBeats();
  }, [prestigeConfirm, addLog, saveToDb, checkAndFireBeats]);

  // ─── HARD RESET ──────────────────────────────────────────────────────────

  const handleHardReset = useCallback(async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      resetConfirmTimer.current = setTimeout(() => setResetConfirm(false), 4000);
      return;
    }
    if (resetConfirmTimer.current) clearTimeout(resetConfirmTimer.current);
    setResetConfirm(false);

    eddiesRef.current = 0; lifetimeRef.current = 0; repRef.current = 0;
    upgradesRef.current = {}; prestigeTokensRef.current = 0; prestigeCountRef.current = 0;
    prestigeUpgradesRef.current = {}; careerPathRef.current = null; actRef.current = 1;
    careerResourcesRef.current = { secondary: 0 }; bossStateRef.current = DEFAULT_BOSS_STATE;
    crewRef.current = {}; ghostMemoryRef.current = DEFAULT_GHOST_MEMORY;
    storyBeatsSeenRef.current = []; receivedBeatsRef.current = [];
    jobStepRef.current = 0; careerBranchRef.current = null; contactRelRef.current = {};
    runHistoryRef.current = []; logRef.current = [];

    setEddies(0); setLifetimeEddies(0); setRep(0); setUpgrades({});
    setPrestigeTokens(0); setPrestigeCount(0); setPrestigeUpgrades({});
    setAct(1); setCareerPath(null); setCareerResources({ secondary: 0 });
    setBossState(DEFAULT_BOSS_STATE); setCrew({}); setGhostMemoryTree(DEFAULT_GHOST_MEMORY);
    setRunHistory([]); setContactRelationships({}); setCareerBranch(null);
    setJobSequenceStep(0); setStoryBeatsSeen([]); setReceivedBeats([]);
    setActivityLog([]); setActiveTab('shop');

    if (user) await supabase.from('mesh_runner_state').delete().eq('owner_id', user.id);
    addLog('SYSTEM: State reset', 'story');
  }, [resetConfirm, user, addLog]);

  // ─── JOB SEQUENCE ADVANCE ────────────────────────────────────────────────

  const advanceJobSequence = useCallback(async (step: 1 | 2 | 3) => {
    const beatDef = JOB_SEQUENCE_BEATS.find(b => b.step === step);
    if (!beatDef) return;
    const res = careerResourcesRef.current;
    if (beatDef.contactCost > 0 && (res.secondary ?? 0) < beatDef.contactCost) return;
    if (beatDef.repCost > 0 && repRef.current < beatDef.repCost) return;

    if (beatDef.contactCost > 0) {
      const newRes = { ...res, secondary: (res.secondary ?? 0) - beatDef.contactCost };
      careerResourcesRef.current = newRes;
      setCareerResources({ ...newRes });
    }

    const nextStep = Math.min(4, step + 1) as 0 | 1 | 2 | 3 | 4;
    jobStepRef.current = nextStep;
    setJobSequenceStep(nextStep);
    addLog(`JOB SEQUENCE: Step ${nextStep}`, 'story');
    await saveToDb();
  }, [addLog, saveToDb]);

  // ─── TAB MANAGEMENT ──────────────────────────────────────────────────────

  const handleTabChange = useCallback((tab: TabId) => {
    activeTabRef.current = tab;
    setActiveTab(tab);
    if (tab === 'comms') setHasUnreadBeats(false);
  }, []);

  const availableTabs = (): { id: TabId; label: string; notify?: boolean }[] => {
    const tabs: { id: TabId; label: string; notify?: boolean }[] = [];
    if (act === 1) {
      tabs.push({ id: 'shop', label: 'UPGRADES' });
      if (jobSequenceStep > 0) tabs.push({ id: 'job', label: 'JOB' });
    }
    if (act >= 2) {
      tabs.push({ id: 'hustle', label: 'HUSTLE' });
      tabs.push({ id: 'path', label: careerPath ? careerPath.toUpperCase() : 'PATH' });
      tabs.push({ id: 'contacts_tab', label: 'CONTACTS' });
    }
    if (act >= 3) tabs.push({ id: 'branch', label: 'BRANCH' });
    if (act >= 4) tabs.push({ id: 'crew', label: 'CREW' });
    tabs.push({ id: 'comms', label: 'COMMS', notify: hasUnreadBeats });
    tabs.push({ id: 'ghost', label: 'GHOST' });
    tabs.push({ id: 'system', label: 'SYSTEM' });
    return tabs;
  };

  // ─── CENTRE PANEL ────────────────────────────────────────────────────────

  const renderCentrePanel = () => {
    if (bossState.current_boss_active && bossState.current_boss_id && careerPath) {
      const isAct2 = bossState.current_boss_id.includes('_a2_');
      const boss = getBossByPath(careerPath, isAct2 ? 2 : 3);
      if (boss) {
        return (
          <RunnerBossMoment
            boss={boss}
            bossState={bossState}
            eddies={eddies}
            secondaryResource={careerResources.secondary}
            onEngage={engageBoss}
            onResolve={resolveBoss}
          />
        );
      }
    }

    switch (activeTab) {
      case 'shop':
        return <RunnerAct1 eddies={eddies} upgrades={upgrades} onPurchase={purchaseUpgrade} />;
      case 'job':
        return (
          <RunnerCareerJob
            step={jobSequenceStep}
            contacts={careerResources.secondary}
            rep={rep}
            onAdvance={advanceJobSequence}
            onCareerSelect={selectCareer}
          />
        );
      case 'hustle':
      case 'path':
      case 'contacts_tab':
        return careerPath ? (
          <RunnerAct2
            careerPath={careerPath}
            eddies={eddies}
            secondaryResource={careerResources.secondary}
            upgrades={upgrades}
            onPurchase={purchaseUpgrade}
            activeSubTab={activeTab}
            onSubTabChange={handleTabChange}
          />
        ) : null;
      case 'branch':
        return careerPath ? (
          <RunnerAct3
            careerPath={careerPath}
            branch={careerBranch}
            upgrades={upgrades}
            eddies={eddies}
            secondaryResource={careerResources.secondary}
            influence={careerResources.influence ?? 0}
            onPurchase={purchaseUpgrade}
            onBranchSelect={selectBranch}
          />
        ) : null;
      case 'crew':
        return careerPath ? (
          <RunnerAct4
            careerPath={careerPath}
            branch={careerBranch}
            crew={crew}
            eddies={eddies}
            secondaryResource={careerResources.secondary}
            influence={careerResources.influence ?? 0}
            onHire={hireCrew}
          />
        ) : null;
      case 'ghost':
        return (
          <RunnerGhostProtocol
            ghostMemoryTree={ghostMemoryTree}
            prestigeCount={prestigeCount}
            prestigeTokens={prestigeTokens}
            runHistory={runHistory}
            canPrestige={act === 4 && (careerResources.influence ?? 0) >= LEGEND_INFLUENCE_THRESHOLD}
            onPrestige={handlePrestige}
            prestigeConfirm={prestigeConfirm}
            onPurchaseGhostUpgrade={purchaseUpgrade}
          />
        );
      case 'comms':
        return (
          <RunnerComms
            receivedBeats={receivedBeats}
            seenBeats={storyBeatsSeen}
            contactRelationships={contactRelationships}
            onMarkSeen={(id) => {
              if (!storyBeatsSeenRef.current.includes(id)) {
                const updated = [...storyBeatsSeenRef.current, id];
                storyBeatsSeenRef.current = updated;
                setStoryBeatsSeen([...updated]);
              }
            }}
          />
        );
      case 'system':
        return (
          <RunnerSystem
            eddies={eddies}
            prestigeCount={prestigeCount}
            lifetimeEddies={lifetimeEddies}
            resetConfirm={resetConfirm}
            onHardReset={handleHardReset}
          />
        );
      default:
        return null;
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  if (!loaded) {
    return (
      <div className="runner-module">
        <div className="runner-loading">LOADING FLATLINE RUNNER...</div>
      </div>
    );
  }

  const tabs = availableTabs();
  const secondaryLabel = careerPath
    ? ({ solo: 'HEAT', netrunner: 'BANDWIDTH', fixer: 'CONNECTIONS', tech: 'PARTS', medtech: 'PATIENTS', rockerboy: 'FOLLOWERS', nomad: 'ROAD CRED', media: 'SOURCES' } as Record<CareerPath, string>)[careerPath]
    : 'CONTACTS';

  return (
    <div className="runner-module">
      <RunnerStatsBar
        act={act}
        eddies={eddies}
        income={calcIncome()}
        rep={rep}
        careerPath={careerPath}
        careerResources={careerResources}
        saveStatus={saveStatus}
        activeEvent={activeEvent}
        prestigeCount={prestigeCount}
      />

      <div className="runner-main">
        {/* LEFT PANEL */}
        <div className="runner-left">
          <div className="runner-resources">
            <div className="runner-resource-block">
              <span className="runner-resource-label">EDDIES</span>
              <span className="runner-resource-value runner-eddies-val">{fmt(eddies)}</span>
              <span className="runner-resource-sub">+{fmt(calcIncome())}/s</span>
            </div>
            <div className="runner-resource-block runner-resource-secondary">
              <span className="runner-resource-label">{secondaryLabel}</span>
              <span className="runner-resource-value">{fmt(careerResources.secondary)}</span>
            </div>
            {act >= 3 && (
              <div className="runner-resource-block runner-resource-influence">
                <span className="runner-resource-label">INFLUENCE</span>
                <span className="runner-resource-value">{fmt(careerResources.influence ?? 0)}</span>
              </div>
            )}
          </div>

          <button
            className={`runner-run-btn${runCooldown ? ' runner-run-btn--cooldown' : ''}`}
            onClick={handleRun}
            disabled={runCooldown || bossState.current_boss_active}
          >
            <span className="runner-run-icon">▶</span> RUN
          </button>

          <nav className="runner-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`runner-tab${activeTab === tab.id ? ' runner-tab--active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
                {tab.notify && <span className="runner-tab-notify" />}
              </button>
            ))}
          </nav>
        </div>

        {/* CENTRE PANEL */}
        <div className="runner-centre">
          {renderCentrePanel()}
        </div>

        {/* RIGHT PANEL — Activity Log */}
        <div className="runner-right">
          <div className="runner-log-label">ACTIVITY LOG</div>
          <div className="runner-log-entries">
            {activityLog.length === 0 && (
              <div className="runner-log-empty">// no activity</div>
            )}
            {activityLog.map((entry, i) => (
              <div
                key={i}
                className={`runner-log-line${i === 0 ? ' runner-log-line--first' : ''}${entry.type ? ` runner-log-line--${entry.type}` : ''}`}
              >
                {entry.msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
