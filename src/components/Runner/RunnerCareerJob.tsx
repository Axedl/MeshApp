import type { CareerPath } from '../../types';
import { CAREER_PATHS } from './constants/paths';
import { JOB_SEQUENCE_BEATS } from './constants/storyBeats';
import { fmt } from './Runner';

interface RunnerCareerJobProps {
  step: 0 | 1 | 2 | 3 | 4;
  contacts: number;
  rep: number;
  onAdvance: (step: 1 | 2 | 3) => void;
  onCareerSelect: (path: CareerPath) => void;
}

export default function RunnerCareerJob({
  step,
  contacts,
  rep,
  onAdvance,
  onCareerSelect,
}: RunnerCareerJobProps) {
  if (step === 0) {
    return (
      <div>
        <div className="runner-centre-header">// JOB SEQUENCE</div>
        <div style={{ color: 'var(--primary-dim)', fontSize: '0.75rem' }}>
          Awaiting unlock condition: CONTACTS ≥ 500
        </div>
      </div>
    );
  }

  // Steps 1-3: show the current beat with proceed button
  if (step <= 3) {
    const beatDef = JOB_SEQUENCE_BEATS.find(b => b.step === step);
    if (!beatDef) return null;

    const hasContactCost = beatDef.contactCost > 0;
    const hasRepCost = beatDef.repCost > 0;
    const canAffordContacts = !hasContactCost || contacts >= beatDef.contactCost;
    const canAffordRep = !hasRepCost || rep >= beatDef.repCost;
    const canProceed = canAffordContacts && canAffordRep;

    return (
      <div>
        <div className="runner-centre-header">// JOB SEQUENCE — BEAT {step}/4</div>

        <div className="runner-job-beat">
          <div className="runner-job-beat-from">
            [{beatDef.from}]
          </div>
          <div className="runner-job-beat-body">{beatDef.body}</div>

          {step < 3 && (
            <>
              <button
                className="runner-job-proceed-btn"
                onClick={() => onAdvance(step as 1 | 2 | 3)}
                disabled={!canProceed}
              >
                PROCEED
              </button>
              {(hasContactCost || hasRepCost) && (
                <div className="runner-job-cost-note">
                  Cost:{' '}
                  {hasContactCost && `${fmt(beatDef.contactCost)} Contacts`}
                  {hasContactCost && hasRepCost && ', '}
                  {hasRepCost && `${beatDef.repCost} Rep`}
                  {!canAffordContacts && <span style={{ color: '#ff6666' }}> — insufficient Contacts</span>}
                  {!canAffordRep && <span style={{ color: '#ff6666' }}> — insufficient Rep</span>}
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <button
                className="runner-job-proceed-btn"
                onClick={() => onAdvance(3)}
                disabled={!canProceed}
              >
                MAKE A CHOICE
              </button>
              {(hasContactCost || hasRepCost) && (
                <div className="runner-job-cost-note">
                  Cost:{' '}
                  {hasContactCost && `${fmt(beatDef.contactCost)} Contacts`}
                  {hasContactCost && hasRepCost && ', '}
                  {hasRepCost && `${beatDef.repCost} Rep`}
                  {!canAffordContacts && <span style={{ color: '#ff6666' }}> — insufficient</span>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Step 4: career selection screen
  return (
    <div>
      <div className="runner-centre-header">// CHOOSE YOUR PATH</div>

      <div className="runner-job-beat" style={{ marginBottom: '1rem' }}>
        <div className="runner-job-beat-from">[RAVEN]</div>
        <div className="runner-job-beat-body">
          {JOB_SEQUENCE_BEATS.find(b => b.step === 4)?.body}
        </div>
      </div>

      <div className="runner-career-grid">
        {CAREER_PATHS.map(path => (
          <div
            key={path.id}
            className="runner-career-card"
            onClick={() => onCareerSelect(path.id)}
            title={path.mechanicalSummary}
          >
            <div className="runner-career-card-name">{path.name}</div>
            <div className="runner-career-card-resource">
              ⬡ {path.secondaryResource} — {path.resourceDesc.slice(0, 40)}
              {path.resourceDesc.length > 40 ? '…' : ''}
            </div>
            <div className="runner-career-card-flavour">
              "{path.makoFlavour}"
            </div>
            <div className="runner-career-card-summary">
              {path.mechanicalSummary}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
