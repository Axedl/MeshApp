import type { BossState } from '../../types';
import type { BossDef } from './constants/bosses';
import { fmt } from './Runner';

interface RunnerBossMomentProps {
  boss: BossDef;
  bossState: BossState;
  eddies: number;
  secondaryResource: number;
  onEngage: () => void;
  onResolve: () => void;
}

export default function RunnerBossMoment({
  boss,
  bossState,
  eddies,
  onEngage,
  onResolve,
}: RunnerBossMomentProps) {
  const progress = bossState.current_boss_progress;
  const target = bossState.current_boss_target;
  const pct = target > 0 ? Math.min(100, (progress / target) * 100) : 0;

  // Derive phase from persisted bossState so session restore shows the correct UI
  const hasEngaged = progress > 0 || pct >= 100;
  const isResolvable = pct >= 100;
  const canEngage = !hasEngaged && eddies >= boss.eddiesCost * 0.1;

  return (
    <div className="runner-boss-moment">
      <div className="runner-boss-title">
        ⚠ {boss.name}
      </div>

      <div className="runner-boss-flavour">
        {boss.flavourIntro}
      </div>

      <div className="runner-boss-cost">
        <div style={{ marginBottom: '0.3rem', fontWeight: 'bold' }}>COST TO RESOLVE:</div>
        <div>▸ {fmt(boss.eddiesCost)} Eddies</div>
        {boss.secondaryCost > 0 && (
          <div>▸ {fmt(boss.secondaryCost)} {boss.act === 2 ? 'Secondary Resource' : 'Resources'}</div>
        )}
        <div style={{ marginTop: '0.3rem', color: 'var(--primary-bright)' }}>
          ◈ REWARD: {fmt(boss.rewardEddies)} Eddies
        </div>
      </div>

      {hasEngaged && (
        <>
          <div>
            <div style={{ fontSize: '0.67rem', color: 'var(--primary-dim)', marginBottom: '0.3rem' }}>
              PROGRESS: {fmt(progress)} / {fmt(target)}
            </div>
            <div className="runner-boss-progress-bar">
              <div
                className="runner-boss-progress-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {isResolvable && (
            <button className="runner-boss-resolve-btn" onClick={onResolve}>
              ▶ RESOLVE
            </button>
          )}

          {!isResolvable && (
            <div style={{ fontSize: '0.67rem', color: 'var(--primary-dim)' }}>
              // income redirected — accumulating resources...
            </div>
          )}
        </>
      )}

      {!hasEngaged && (
        <button
          className="runner-boss-engage-btn"
          onClick={onEngage}
          disabled={!canEngage}
        >
          ⚡ ENGAGE
        </button>
      )}
    </div>
  );
}
