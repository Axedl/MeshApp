import React from 'react';
import type { CareerPath } from '../../types';
import { getUpgradesByPath } from './constants/upgrades';
import { CAREER_PATHS, PATH_ACT3_BRANCHES } from './constants/paths';
import { fmt } from './Runner';

interface RunnerAct3Props {
  careerPath: CareerPath;
  branch: string | null;
  upgrades: Record<string, number>;
  eddies: number;
  secondaryResource: number;
  influence: number;
  onPurchase: (id: string) => void;
  onBranchSelect: (branch: string) => void;
}

export default function RunnerAct3({
  careerPath,
  branch,
  upgrades,
  eddies,
  secondaryResource,
  influence,
  onPurchase,
  onBranchSelect,
}: RunnerAct3Props) {
  const pathDef = CAREER_PATHS.find(p => p.id === careerPath);
  const branches = PATH_ACT3_BRANCHES[careerPath] ?? { a: 'Branch A', b: 'Branch B' };

  const branchAUpgrades = getUpgradesByPath(careerPath, 'act3_branch_a');
  const branchBUpgrades = getUpgradesByPath(careerPath, 'act3_branch_b');
  const activeUpgrades = branch === 'a' ? branchAUpgrades : branch === 'b' ? branchBUpgrades : [];

  const renderUpgrade = (up: (typeof branchAUpgrades)[0]) => {
    const owned = !!upgrades[up.id];
    const prereqMet = !up.prereq || up.prereq.every(r => upgrades[r]);
    const balance = up.costResource === 'eddies' ? eddies
      : up.costResource === 'influence' ? influence
      : secondaryResource;
    const canAfford = balance >= up.cost;
    const available = prereqMet && !owned && canAfford;

    return (
      <div
        key={up.id}
        className={`runner-upgrade-item${owned ? ' runner-upgrade-item--owned' : ''}${!owned && (!canAfford || !prereqMet) ? ' runner-upgrade-item--unaffordable' : ''}`}
        onClick={() => available && onPurchase(up.id)}
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
              onClick={(e) => { e.stopPropagation(); if (available) onPurchase(up.id); }}
            >
              {fmt(up.cost)}{up.costResource === 'eddies' ? '¥' : ` ${up.costResource.toUpperCase()}`}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="runner-centre-header">
        // ACT 3 — {pathDef?.name ?? careerPath.toUpperCase()}
      </div>

      {!branch && (
        <>
          <div style={{ fontSize: '0.73rem', color: 'var(--primary-dim)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
            ECHO: <em>"The path you chose shapes everything downstream. Now it splits."</em>
            <br />Choose a branch. This is permanent for this run. The other path will be remembered.
          </div>

          <div className="runner-branch-options">
            <div
              className="runner-branch-card"
              onClick={() => onBranchSelect('a')}
            >
              <div className="runner-branch-card-name">▸ {branches.a}</div>
              <div className="runner-branch-card-desc">
                {branchAUpgrades.slice(0, 2).map(u => u.stat).join(' — ') || 'Specialised upgrades'}
              </div>
            </div>
            <div
              className="runner-branch-card"
              onClick={() => onBranchSelect('b')}
            >
              <div className="runner-branch-card-name">▸ {branches.b}</div>
              <div className="runner-branch-card-desc">
                {branchBUpgrades.slice(0, 2).map(u => u.stat).join(' — ') || 'Specialised upgrades'}
              </div>
            </div>
          </div>
        </>
      )}

      {branch && (
        <>
          <div style={{ fontSize: '0.67rem', color: 'var(--primary-dim)', marginBottom: '0.75rem' }}>
            BRANCH: <strong style={{ color: 'var(--primary-bright)' }}>
              {branch === 'a' ? branches.a : branches.b}
            </strong>
          </div>

          <div className="runner-upgrade-list">
            {activeUpgrades.map(renderUpgrade)}
          </div>
        </>
      )}
    </div>
  );
}
