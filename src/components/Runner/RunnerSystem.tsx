import { fmt } from './Runner';

interface RunnerSystemProps {
  eddies: number;
  prestigeCount: number;
  lifetimeEddies: number;
  resetConfirm: boolean;
  onHardReset: () => void;
}

export default function RunnerSystem({
  eddies,
  prestigeCount,
  lifetimeEddies,
  resetConfirm,
  onHardReset,
}: RunnerSystemProps) {
  return (
    <div>
      <div className="runner-centre-header">// SYSTEM — DIAGNOSTICS</div>

      <div className="runner-system-stats">
        <div className="runner-system-stat-row">
          <span>CURRENT EDDIES</span>
          <span className="runner-system-stat-val">{fmt(eddies)}¥</span>
        </div>
        <div className="runner-system-stat-row">
          <span>LIFETIME EDDIES</span>
          <span className="runner-system-stat-val">{fmt(lifetimeEddies)}¥</span>
        </div>
        <div className="runner-system-stat-row">
          <span>PRESTIGE COUNT</span>
          <span className="runner-system-stat-val">{prestigeCount}</span>
        </div>
      </div>

      <div className="runner-danger-zone">
        <div className="runner-danger-title">⚠ DANGER ZONE</div>
        <div className="runner-danger-desc">
          Hard reset wipes all progress, ghost memory, and run history. Permanent.
        </div>
        <button
          className={`runner-reset-btn${resetConfirm ? ' runner-reset-btn--confirm' : ''}`}
          onClick={onHardReset}
        >
          {resetConfirm ? '⚠ CONFIRM — WIPE ALL DATA?' : '— HARD RESET —'}
        </button>
        {resetConfirm && (
          <div style={{ fontSize: '0.62rem', color: '#ff4444', marginTop: '0.3rem' }}>
            This cannot be undone. All ghost memory and run history will be lost.
          </div>
        )}
      </div>
    </div>
  );
}
