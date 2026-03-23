import type { CareerPath } from '../../types';
import type { TabId } from './Runner';
import { ACT2_HUSTLE_UPGRADES, getUpgradesByPath } from './constants/upgrades';
import { CAREER_PATHS } from './constants/paths';
import { fmt } from './Runner';

interface RunnerAct2Props {
  careerPath: CareerPath;
  eddies: number;
  secondaryResource: number;
  upgrades: Record<string, number>;
  onPurchase: (id: string) => void;
  activeSubTab: TabId;
  onSubTabChange: (tab: TabId) => void;
}

export default function RunnerAct2({
  careerPath,
  eddies,
  secondaryResource,
  upgrades,
  onPurchase,
  activeSubTab,
  onSubTabChange,
}: RunnerAct2Props) {
  const pathDef = CAREER_PATHS.find(p => p.id === careerPath);
  const pathLabel = pathDef?.name ?? careerPath.toUpperCase();

  const hustleUpgrades = ACT2_HUSTLE_UPGRADES;
  const pathUpgrades = getUpgradesByPath(careerPath, 'act2_path');

  const renderUpgradeList = (ups: typeof hustleUpgrades) => (
    <div className="runner-upgrade-list">
      {ups.map(up => {
        const owned = !!upgrades[up.id];
        const prereqMet = !up.prereq || up.prereq.every(r => upgrades[r]);
        const balance = up.costResource === 'eddies' ? eddies : secondaryResource;
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
                  {fmt(up.cost)}{up.costResource === 'eddies' ? '¥' : ` ${pathDef?.secondaryResource ?? 'RES'}`}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderContactsTab = () => (
    <div>
      <div className="runner-centre-header">// CONTACT RELATIONSHIPS</div>
      <div className="runner-contacts-list">
        {pathDef && (
          <div className="runner-contact-row">
            <span className="runner-contact-name">{pathDef.contactName}</span>
            <span className="runner-contact-desc">{pathDef.contactDesc}</span>
            <span className="runner-contact-level">ACTIVE</span>
          </div>
        )}
        <div className="runner-contact-row">
          <span className="runner-contact-name">RAVEN</span>
          <span className="runner-contact-desc">Mid-tier fixer. Your first real contact.</span>
          <span className="runner-contact-level">ACTIVE</span>
        </div>
        <div className="runner-contact-row">
          <span className="runner-contact-name">ECHO</span>
          <span className="runner-contact-desc">Ghost in the NET. Watching your node.</span>
          <span className="runner-contact-level">ACTIVE</span>
        </div>
        <div className="runner-contact-row">
          <span className="runner-contact-name">MAKO</span>
          <span className="runner-contact-desc">Street-level fixer. Knows everyone.</span>
          <span className="runner-contact-level">ACTIVE</span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="runner-subtabs">
        <button
          className={`runner-subtab${activeSubTab === 'hustle' ? ' runner-subtab--active' : ''}`}
          onClick={() => onSubTabChange('hustle')}
        >
          HUSTLE
        </button>
        <button
          className={`runner-subtab${activeSubTab === 'path' ? ' runner-subtab--active' : ''}`}
          onClick={() => onSubTabChange('path')}
        >
          {pathLabel}
        </button>
        <button
          className={`runner-subtab${activeSubTab === 'contacts_tab' ? ' runner-subtab--active' : ''}`}
          onClick={() => onSubTabChange('contacts_tab')}
        >
          CONTACTS
        </button>
      </div>

      {activeSubTab === 'hustle' && (
        <div>
          <div className="runner-centre-header">// HUSTLE — INCOME UPGRADES</div>
          {renderUpgradeList(hustleUpgrades)}
        </div>
      )}

      {activeSubTab === 'path' && (
        <div>
          <div className="runner-centre-header">// {pathLabel} — PATH UPGRADES</div>
          {renderUpgradeList(pathUpgrades)}
        </div>
      )}

      {activeSubTab === 'contacts_tab' && renderContactsTab()}
    </div>
  );
}
