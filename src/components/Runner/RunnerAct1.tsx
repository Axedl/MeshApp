import { ACT1_UPGRADES } from './constants/upgrades';
import { fmt } from './Runner';

interface RunnerAct1Props {
  eddies: number;
  upgrades: Record<string, number>;
  onPurchase: (id: string) => void;
}

export default function RunnerAct1({ eddies, upgrades, onPurchase }: RunnerAct1Props) {
  return (
    <div>
      <div className="runner-centre-header">// STREET LEVEL UPGRADES</div>
      <div className="runner-upgrade-list">
        {ACT1_UPGRADES.map(up => {
          const owned = !!upgrades[up.id];
          const prereqMet = !up.prereq || up.prereq.every(r => upgrades[r]);
          const canAfford = eddies >= up.cost;
          const available = prereqMet && !owned;

          return (
            <div
              key={up.id}
              className={`runner-upgrade-item${owned ? ' runner-upgrade-item--owned' : ''}${!owned && (!canAfford || !prereqMet) ? ' runner-upgrade-item--unaffordable' : ''}`}
              onClick={() => available && canAfford && onPurchase(up.id)}
            >
              <div className="runner-upgrade-row">
                <div className="runner-upgrade-info">
                  <div className="runner-upgrade-name">{up.name}</div>
                  <div className="runner-upgrade-stat">{up.stat}</div>
                  <div className="runner-upgrade-flavour">{up.flavour}</div>
                </div>
                {owned ? (
                  <span className="runner-upgrade-owned">INSTALLED</span>
                ) : (
                  <button
                    className="runner-buy-btn"
                    disabled={!canAfford || !prereqMet}
                    onClick={(e) => { e.stopPropagation(); if (canAfford && prereqMet) onPurchase(up.id); }}
                  >
                    {fmt(up.cost)}¥
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
