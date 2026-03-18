import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { MeshUser, RunnerState } from '../../types';
import './Runner.css';

interface RunnerModuleProps {
  user: MeshUser;
}

// ─── Upgrade definitions ─────────────────────────────────────────────────

interface UpgradeDef {
  id: string;
  name: string;
  cost: number;
  income: number;
  flavour: string;
}

const UPGRADES: UpgradeDef[] = [
  { id: 'cheap_rig',         name: 'Cheap Rig',          cost: 50,    income: 2,    flavour: 'Second-hand hardware, barely functional.' },
  { id: 'stolen_icebreaker', name: 'Stolen ICEbreaker',  cost: 200,   income: 10,   flavour: 'Lifted from a dead corpo. Still warm.' },
  { id: 'corpo_data_tap',    name: 'Corpo Data Tap',     cost: 1000,  income: 50,   flavour: 'Skimming data from the Arasaka subnet.' },
  { id: 'black_ice_farm',    name: 'Black ICE Farm',     cost: 5000,  income: 200,  flavour: 'Weaponised ICE, repurposed for profit.' },
  { id: 'rogue_ai',          name: 'Rogue AI Partner',   cost: 25000, income: 1000, flavour: 'Alt. Unpredictable. Extremely effective.' },
];

const REP_FLAVOUR = [
  'Unknown runner in the dark',
  'Night Market regular',
  'Known fixer contact',
  'Dangerous netrunner',
  'Legend of the net',
];

const getRepFlavour = (rep: number): string =>
  REP_FLAVOUR[Math.min(rep, REP_FLAVOUR.length - 1)];

const MAX_OFFLINE_SEC = 8 * 3600; // 8 hours
const DISPLAY_TICK_MS = 500;
const SAVE_INTERVAL_MS = 30_000;
const RUN_COOLDOWN_MS = 2500;
const MAX_LOG = 50;

// ─── Income calculation ───────────────────────────────────────────────────

function calcIncome(upgrades: Record<string, number>): number {
  return 1 + UPGRADES.reduce((sum, u) => sum + u.income * (upgrades[u.id] ?? 0), 0);
}

// ─── Number formatting ────────────────────────────────────────────────────

function fmtEddies(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Component ────────────────────────────────────────────────────────────

export function RunnerModule({ user }: RunnerModuleProps) {
  const [loading, setLoading] = useState(true);
  const [eddies, setEddies] = useState(0);
  const [rep, setRep] = useState(0);
  const [upgrades, setUpgrades] = useState<Record<string, number>>({});
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [runCooldown, setRunCooldown] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Mutable refs so interval callbacks always see fresh values
  const eddiesRef = useRef(0);
  const repRef = useRef(0);
  const upgradesRef = useRef<Record<string, number>>({});
  const lifetimeRef = useRef(0); // total eddies ever earned (for rep)
  const logRef = useRef<string[]>([]);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const entry = `[${ts}] ${msg}`;
    logRef.current = [entry, ...logRef.current].slice(0, MAX_LOG);
    setActivityLog([...logRef.current]);
  }, []);

  const syncState = useCallback((e: number, r: number, u: Record<string, number>) => {
    eddiesRef.current = e;
    repRef.current = r;
    upgradesRef.current = u;
    setEddies(e);
    setRep(r);
    setUpgrades(u);
  }, []);

  const saveToDb = useCallback(async (e: number, r: number, u: Record<string, number>) => {
    setSaveStatus('saving');
    await supabase.from('mesh_runner_state').upsert(
      { owner_id: user.id, eddies: Math.floor(e), rep: r, upgrades: u, last_tick: new Date().toISOString() },
      { onConflict: 'owner_id' }
    );
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 1500);
  }, [user.id]);

  // ── On mount: load or create state ──────────────────────────────────────
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
        // New runner
        const newState: Partial<RunnerState> = {
          owner_id: user.id,
          eddies: 0,
          rep: 0,
          upgrades: {},
          last_tick: new Date().toISOString(),
        };
        await supabase.from('mesh_runner_state').insert(newState);
        addLog('>> MESH RUNNER INITIALISED. INCOME: 1 EDDIE/SEC');
        syncState(0, 0, {});
        lifetimeRef.current = 0;
      } else {
        // Existing — calculate offline earnings
        const state = data as RunnerState;
        const income = calcIncome(state.upgrades);
        const lastTick = new Date(state.last_tick).getTime();
        const elapsedSec = Math.min((Date.now() - lastTick) / 1000, MAX_OFFLINE_SEC);
        const offline = Math.floor(elapsedSec * income);

        const newEddies = state.eddies + offline;
        lifetimeRef.current = newEddies; // approximate — we don't track true lifetime

        syncState(newEddies, state.rep, state.upgrades);

        if (offline > 0) {
          addLog(`>> OFFLINE EARNINGS: +${fmtEddies(offline)} EDDIES (${Math.round(elapsedSec / 3600 * 10) / 10}h offline)`);
        }
        addLog(`>> RUNNER ONLINE. INCOME: ${income}/SEC  REP: ${state.rep}`);
      }

      setLoading(false);
    }

    initRunner();
    return () => { cancelled = true; };
  }, [user.id, addLog, syncState]);

  // ── Display tick (500ms) — UI update only, no DB ─────────────────────────
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      const income = calcIncome(upgradesRef.current);
      const earned = income * (DISPLAY_TICK_MS / 1000);
      const newEddies = eddiesRef.current + earned;
      lifetimeRef.current += earned;

      const newRep = Math.floor(lifetimeRef.current / 10000);
      const curRep = repRef.current;

      eddiesRef.current = newEddies;
      setEddies(newEddies);

      if (newRep > curRep) {
        repRef.current = newRep;
        setRep(newRep);
        addLog(`>> REP INCREASED TO ${newRep}: ${getRepFlavour(newRep).toUpperCase()}`);
      }
    }, DISPLAY_TICK_MS);

    return () => clearInterval(interval);
  }, [loading, addLog]);

  // ── Periodic save (30s) — DB write only ───────────────────────────────────
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      saveToDb(eddiesRef.current, repRef.current, upgradesRef.current);
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [loading, saveToDb]);

  // ── Save on tab hide / page unload ───────────────────────────────────────
  useEffect(() => {
    if (loading) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveToDb(eddiesRef.current, repRef.current, upgradesRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loading, saveToDb]);

  // ── Manual RUN button ─────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    if (runCooldown) return;
    const income = calcIncome(upgradesRef.current);
    const newEddies = eddiesRef.current + income;
    lifetimeRef.current += income;
    eddiesRef.current = newEddies;
    setEddies(newEddies);
    addLog(`>> MANUAL RUN: +${income} EDDIES`);

    setRunCooldown(true);
    setTimeout(() => setRunCooldown(false), RUN_COOLDOWN_MS);
  }, [runCooldown, addLog]);

  // ── Buy upgrade ──────────────────────────────────────────────────────────
  const handleBuy = useCallback(async (upg: UpgradeDef) => {
    if (eddiesRef.current < upg.cost) return;

    const newEddies = eddiesRef.current - upg.cost;
    const newUpgrades = { ...upgradesRef.current, [upg.id]: (upgradesRef.current[upg.id] ?? 0) + 1 };
    eddiesRef.current = newEddies;
    upgradesRef.current = newUpgrades;
    setEddies(newEddies);
    setUpgrades({ ...newUpgrades });

    const count = newUpgrades[upg.id];
    const newIncome = calcIncome(newUpgrades);
    addLog(`>> PURCHASED: ${upg.name.toUpperCase()} (x${count}) — INCOME NOW ${newIncome}/SEC`);

    await saveToDb(newEddies, repRef.current, newUpgrades);
  }, [addLog, saveToDb]);

  const income = calcIncome(upgrades);

  if (loading) {
    return <div className="runner-loading">JACKING IN TO THE NET<span className="runner-blink">_</span></div>;
  }

  return (
    <div className="runner-module">
      {/* ── Header stats ── */}
      <div className="runner-stats-bar">
        <div className="runner-stat-block runner-eddies-block">
          <div className="runner-stat-label">EDDIES</div>
          <div className="runner-eddies-value glow">{fmtEddies(Math.floor(eddies))}</div>
        </div>
        <div className="runner-stat-block">
          <div className="runner-stat-label">INCOME/SEC</div>
          <div className="runner-stat-value">{income.toLocaleString()}</div>
        </div>
        <div className="runner-stat-block">
          <div className="runner-stat-label">REP</div>
          <div className="runner-stat-value">{rep}</div>
          <div className="runner-rep-flavour">{getRepFlavour(rep)}</div>
        </div>
        {saveStatus !== 'idle' && (
          <div className={`runner-save-status ${saveStatus}`}>
            {saveStatus === 'saving' ? 'SAVING...' : 'SAVED ✓'}
          </div>
        )}
      </div>

      <div className="runner-main">
        {/* ── Controls + upgrades ── */}
        <div className="runner-left">
          {/* Manual run button */}
          <button
            className={`runner-run-btn ${runCooldown ? 'cooldown' : ''}`}
            onClick={handleRun}
            disabled={runCooldown}
          >
            <span className="runner-run-icon">▸</span>
            {runCooldown ? 'COOLING DOWN...' : 'RUN THE NET'}
          </button>

          {/* Upgrade shop */}
          <div className="runner-shop">
            <div className="runner-shop-label">// UPGRADE SHOP //</div>
            {UPGRADES.map(upg => {
              const owned = upgrades[upg.id] ?? 0;
              const canAfford = Math.floor(eddies) >= upg.cost;
              return (
                <div key={upg.id} className={`runner-upgrade-row ${!canAfford ? 'unaffordable' : ''}`}>
                  <div className="runner-upgrade-info">
                    <span className="runner-upgrade-name">{upg.name}</span>
                    {owned > 0 && <span className="runner-upgrade-owned">×{owned}</span>}
                    <span className="runner-upgrade-stat">+{upg.income}/sec each</span>
                    <span className="runner-upgrade-flavour">{upg.flavour}</span>
                  </div>
                  <button
                    className="runner-buy-btn"
                    onClick={() => handleBuy(upg)}
                    disabled={!canAfford}
                    title={`Cost: ${upg.cost.toLocaleString()} eddies`}
                  >
                    {fmtEddies(upg.cost)} ¥
                  </button>
                </div>
              );
            })}
          </div>
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
