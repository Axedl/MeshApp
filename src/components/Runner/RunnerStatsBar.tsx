import type { CareerPath, CareerResources, RunnerAct } from '../../types';
import { fmt } from './Runner';

const REP_FAST_CAP = 5;
const REP_FAST_EDDIES = 100_000;
const REP_SLOW_EDDIES = 500_000;

interface RunnerStatsBarProps {
  act: RunnerAct;
  eddies: number;
  income: number;
  rep: number;
  lifetimeEddies: number;
  careerPath: CareerPath | null;
  careerResources: CareerResources;
  saveStatus: 'idle' | 'saving' | 'saved';
  activeEvent: { label: string; endsAt: number; mult: number } | null;
  prestigeCount: number;
}

function repTooltip(rep: number, lifetimeEddies: number): string {
  const incomeMult = rep > 0 ? `+${rep}% income` : 'no income bonus yet';
  if (rep >= 100) return `REP ${rep}/100 · ${incomeMult} · maxed`;
  const fastEddieCap = REP_FAST_CAP * REP_FAST_EDDIES;
  const nextRepEddies = lifetimeEddies < fastEddieCap
    ? (rep + 1) * REP_FAST_EDDIES
    : fastEddieCap + (rep - REP_FAST_CAP + 1) * REP_SLOW_EDDIES;
  const needed = nextRepEddies - lifetimeEddies;
  const rateNote = rep < REP_FAST_CAP ? `(fast-track: 100k/rep up to rep ${REP_FAST_CAP})` : `(500k/rep)`;
  return `REP ${rep}/100 · ${incomeMult} · next rep in ${needed.toLocaleString()} lifetime eddies ${rateNote}`;
}

const ACT_NAMES: Record<RunnerAct, string> = {
  1: 'STREET LEVEL',
  2: 'EARLY CAREER',
  3: 'LATE CAREER',
  4: 'LEGEND',
};

const SECONDARY_LABEL: Record<CareerPath, string> = {
  solo: 'HEAT',
  netrunner: 'BANDWIDTH',
  fixer: 'CONNECTIONS',
  tech: 'PARTS',
  medtech: 'PATIENTS',
  rockerboy: 'FOLLOWERS',
  nomad: 'ROAD CRED',
  media: 'SOURCES',
};

export default function RunnerStatsBar({
  act,
  eddies,
  income,
  rep,
  lifetimeEddies,
  careerPath,
  careerResources,
  saveStatus,
  activeEvent,
  prestigeCount,
}: RunnerStatsBarProps) {
  return (
    <div className="runner-stats-bar">
      <div className="runner-stat-block">
        <span className="runner-stat-label">EDDIES</span>
        <span className="runner-stat-value runner-stat-value--eddies">{fmt(eddies)}</span>
        <span className="runner-stat-sub">+{fmt(income)}/s</span>
      </div>

      <div className="runner-stat-block" title={repTooltip(rep, lifetimeEddies)}>
        <span className="runner-stat-label">REP</span>
        <span className="runner-stat-value">{rep}</span>
      </div>

      {careerPath && (
        <div className="runner-stat-block">
          <span className="runner-stat-label">{SECONDARY_LABEL[careerPath]}</span>
          <span className="runner-stat-value">{fmt(careerResources.secondary)}</span>
        </div>
      )}

      {!careerPath && act === 1 && (
        <div className="runner-stat-block">
          <span className="runner-stat-label">CONTACTS</span>
          <span className="runner-stat-value">{fmt(careerResources.secondary)}</span>
        </div>
      )}

      {act >= 3 && (
        <div className="runner-stat-block">
          <span className="runner-stat-label">INFLUENCE</span>
          <span className="runner-stat-value runner-stat-value--influence">
            {fmt(careerResources.influence ?? 0)}
          </span>
        </div>
      )}

      {careerPath && (
        <div className="runner-stat-block">
          <span className="runner-stat-label">PATH</span>
          <span className="runner-stat-value">{careerPath.toUpperCase()}</span>
        </div>
      )}

      {prestigeCount > 0 && (
        <div className="runner-stat-block">
          <span className="runner-stat-label">RUNS</span>
          <span className="runner-stat-value">{prestigeCount}</span>
        </div>
      )}

      <div className="runner-stat-act">
        <span className="runner-act-badge">ACT {act}</span>
        <span className="runner-act-name">{ACT_NAMES[act]}</span>
      </div>

      {activeEvent && (
        <div className="runner-event-badge">
          ⚡ {activeEvent.label}
        </div>
      )}

      {saveStatus !== 'idle' && (
        <span className={`runner-save-status runner-save-status--${saveStatus}`}>
          {saveStatus === 'saving' ? 'SAVING...' : 'SAVED ✓'}
        </span>
      )}
    </div>
  );
}
