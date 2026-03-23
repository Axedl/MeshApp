import React from 'react';
import type { GhostMemoryTree, RunHistoryEntry } from '../../types';
import {
  GHOST_UNIVERSAL_UPGRADES,
  GHOST_PATH_UPGRADES,
  type UpgradeDef,
} from './constants/upgrades';
import { CAREER_PATHS } from './constants/paths';
import { fmt } from './Runner';

interface RunnerGhostProtocolProps {
  ghostMemoryTree: GhostMemoryTree;
  prestigeCount: number;
  prestigeTokens: number;
  runHistory: RunHistoryEntry[];
  canPrestige: boolean;
  onPrestige: () => void;
  prestigeConfirm: boolean;
  onPurchaseGhostUpgrade: (id: string) => void;
}

export default function RunnerGhostProtocol({
  ghostMemoryTree,
  prestigeCount,
  prestigeTokens,
  runHistory,
  canPrestige,
  onPrestige,
  prestigeConfirm,
  onPurchaseGhostUpgrade,
}: RunnerGhostProtocolProps) {


  const isNodeUnlocked = (node: UpgradeDef): boolean => {
    if (node.category === 'ghost_universal') {
      return !!(ghostMemoryTree.universal[node.id]);
    }
    if (node.category === 'ghost_path' && node.path) {
      return !!(ghostMemoryTree.paths[node.path]?.[node.id]);
    }
    return false;
  };

  const isNodePurchasable = (node: UpgradeDef): boolean => {
    if (isNodeUnlocked(node)) return false;
    if (!node.prereq || node.prereq.every(req => {
      const reqNode = GHOST_UNIVERSAL_UPGRADES.find(n => n.id === req) ??
        GHOST_PATH_UPGRADES.find(n => n.id === req);
      return reqNode ? isNodeUnlocked(reqNode) : false;
    })) {
      return prestigeTokens >= node.cost;
    }
    return false;
  };

  const renderGhostNode = (node: UpgradeDef) => {
    const unlocked = isNodeUnlocked(node);
    const purchasable = isNodePurchasable(node);

    return (
      <div
        key={node.id}
        className={`runner-ghost-node${unlocked ? ' runner-ghost-node--unlocked' : ' runner-ghost-node--locked'}${purchasable ? ' runner-ghost-node--purchasable' : ''}`}
        onClick={() => purchasable && onPurchaseGhostUpgrade(node.id)}
        title={`${node.stat}${!unlocked ? ` — Cost: ${node.cost} tokens` : ''}`}
      >
        <div className="runner-ghost-node-name">{node.name}</div>
        <div className="runner-ghost-node-stat">{node.stat}</div>
        {purchasable && (
          <div style={{ fontSize: '0.55rem', color: 'var(--primary-bright)', marginTop: '0.1rem' }}>
            {node.cost}T — UNLOCK
          </div>
        )}
        {!unlocked && !purchasable && (
          <div style={{ fontSize: '0.55rem', color: 'var(--primary-dim)', marginTop: '0.1rem' }}>
            {node.cost}T — LOCKED
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="runner-ghost-panel">
      {/* Token display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div>
          <div className="runner-ghost-section-label">GHOST TOKENS</div>
          <div style={{ fontSize: '1.2rem', color: 'var(--primary-bright)', fontWeight: 'bold' }}>
            {prestigeTokens}
          </div>
        </div>
        <div>
          <div className="runner-ghost-section-label">PRESTIGE COUNT</div>
          <div style={{ fontSize: '1rem', color: 'var(--primary)' }}>{prestigeCount}</div>
        </div>
      </div>

      {/* Universal trunk */}
      <div>
        <div className="runner-ghost-section-label">UNIVERSAL MEMORY</div>
        <div className="runner-ghost-trunk">
          {GHOST_UNIVERSAL_UPGRADES.map(renderGhostNode)}
        </div>
      </div>

      {/* Path branches */}
      <div>
        <div className="runner-ghost-section-label">PATH MEMORY</div>
        {CAREER_PATHS.map(path => {
          const pathNodes = GHOST_PATH_UPGRADES.filter(n => n.path === path.id);
          const hasAny = pathNodes.some(n => isNodeUnlocked(n) || isNodePurchasable(n));
          return (
            <div key={path.id} className="runner-ghost-path-section">
              <div className="runner-ghost-path-label">
                {path.name}
                {!hasAny && ' — [no runs completed]'}
              </div>
              <div className="runner-ghost-path-nodes">
                {pathNodes.map(renderGhostNode)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Run history */}
      {runHistory.length > 0 && (
        <div>
          <div className="runner-ghost-section-label">RUN HISTORY</div>
          <div className="runner-run-history">
            {runHistory.map(run => (
              <div key={run.run_number} className="runner-run-entry">
                <span className="runner-run-num">#{run.run_number}</span>
                <span className="runner-run-path">{run.path}</span>
                <span className="runner-run-act">ACT {run.act_reached}</span>
                {run.branch && <span style={{ fontSize: '0.62rem', color: 'var(--primary-dim)' }}>{run.branch}</span>}
                <span className="runner-run-eddies">{fmt(run.lifetime_eddies)}¥</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prestige button */}
      <div>
        <div className="runner-ghost-section-label">FLATLINE PROTOCOL</div>
        {!canPrestige && (
          <div style={{ fontSize: '0.7rem', color: 'var(--primary-dim)', marginBottom: '0.5rem' }}>
            Reach 100,000 Influence in Act 4 to unlock.
          </div>
        )}
        <button
          className={`runner-flatline-btn${canPrestige ? ' runner-flatline-btn--active' : ''}${prestigeConfirm ? ' runner-flatline-btn--confirm' : ''}`}
          onClick={onPrestige}
          disabled={!canPrestige}
        >
          {prestigeConfirm ? '⚡ CONFIRM FLATLINE?' : '— FLATLINE & RETURN —'}
        </button>
        {prestigeConfirm && (
          <div style={{ fontSize: '0.67rem', color: '#ff9900', marginTop: '0.3rem' }}>
            All progress will be reset. Ghost Memory and run history are preserved.
          </div>
        )}
      </div>
    </div>
  );
}
