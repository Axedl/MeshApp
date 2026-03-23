import type { CareerPath, CrewMember } from '../../types';
import {
  SOLO_CREW,
  NETRUNNER_NODES,
  FIXER_RETAINERS,
  TECH_PRODUCTION_LINES,
  MEDTECH_CLINICS,
  ROCKERBOY_CREW,
  NOMAD_TERRITORIES,
  MEDIA_SOURCE_NETWORK,
} from './constants/crew';
import { CAREER_PATHS } from './constants/paths';
import { fmt } from './Runner';

interface RunnerAct4Props {
  careerPath: CareerPath;
  branch: string | null;
  crew: Record<string, CrewMember[]>;
  eddies: number;
  secondaryResource: number;
  influence: number;
  onHire: (memberId: string, eddiesCost: number, secondaryCost: number, influenceCost?: number) => void;
}

export default function RunnerAct4({
  careerPath,
  crew,
  eddies,
  secondaryResource,
  influence,
  onHire,
}: RunnerAct4Props) {
  const hiredIds = new Set((crew[careerPath] ?? []).map(m => m.id));
  const pathDef = CAREER_PATHS.find(p => p.id === careerPath);

  const renderSolo = () => (
    <div>
      <div className="runner-centre-header">// ELITE FIRETEAM</div>
      <div className="runner-crew-grid">
        {SOLO_CREW.map(member => {
          const hired = hiredIds.has(member.id);
          const canAfford = !hired && eddies >= member.cost.eddies &&
            (!member.cost.secondary || secondaryResource >= member.cost.secondary);
          return (
            <div key={member.id} className="runner-crew-slot">
              <div style={{ flex: 1 }}>
                <div className="runner-crew-name">{member.name}</div>
                <div className="runner-crew-role">{member.specialty}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--primary-dim)', marginTop: '0.1rem', fontStyle: 'italic' }}>
                  {member.flavour}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                <div className="runner-crew-income">+{fmt(member.incomeBonus)}/s</div>
                <button
                  className="runner-crew-hire-btn"
                  disabled={!canAfford}
                  onClick={() => canAfford && onHire(member.id, member.cost.eddies, member.cost.secondary ?? 0)}
                >
                  {hired ? 'HIRED' : `${fmt(member.cost.eddies)}¥${member.cost.secondary ? ` + ${fmt(member.cost.secondary)} HEAT` : ''}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderNetrunner = () => (
    <div>
      <div className="runner-centre-header">// GHOST NETWORK — DEPLOY NODES</div>
      <div className="runner-crew-grid">
        {NETRUNNER_NODES.map(node => {
          const hired = hiredIds.has(node.id);
          const canAfford = !hired && eddies >= node.cost.eddies && secondaryResource >= node.cost.bandwidth;
          return (
            <div key={node.id} className="runner-crew-slot">
              <div style={{ flex: 1 }}>
                <div className="runner-crew-name">{node.name}</div>
                <div className="runner-crew-role">{node.type.toUpperCase()}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--primary-dim)', marginTop: '0.1rem', fontStyle: 'italic' }}>
                  {node.flavour}
                </div>
                {node.detectionRisk > 0 && (
                  <div style={{ fontSize: '0.6rem', color: '#ff6666' }}>
                    Detection risk: {(node.detectionRisk * 100 * 2).toFixed(1)}%/min
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                <div className="runner-crew-income">+{fmt(node.incomeBonus)}/s</div>
                <button
                  className="runner-crew-hire-btn"
                  disabled={!canAfford}
                  onClick={() => canAfford && onHire(node.id, node.cost.eddies, node.cost.bandwidth)}
                >
                  {hired ? 'DEPLOYED' : `${fmt(node.cost.eddies)}¥ + ${fmt(node.cost.bandwidth)} BW`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFixer = () => (
    <div>
      <div className="runner-centre-header">// THE OPERATION — RETAINERS</div>
      <div className="runner-crew-grid">
        {FIXER_RETAINERS.map(ret => {
          const hired = hiredIds.has(ret.id);
          const canAfford = !hired && eddies >= ret.cost.eddies && secondaryResource >= ret.cost.connections;
          return (
            <div key={ret.id} className="runner-crew-slot">
              <div style={{ flex: 1 }}>
                <div className="runner-crew-name">{ret.name}</div>
                <div className="runner-crew-role">{ret.role}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--primary-dim)', marginTop: '0.1rem', fontStyle: 'italic' }}>
                  {ret.flavour}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                {ret.incomeBonus > 0 && <div className="runner-crew-income">+{fmt(ret.incomeBonus)}/s</div>}
                <button
                  className="runner-crew-hire-btn"
                  disabled={!canAfford}
                  onClick={() => canAfford && onHire(ret.id, ret.cost.eddies, ret.cost.connections)}
                >
                  {hired ? 'RETAINED' : `${fmt(ret.cost.eddies)}¥ + ${fmt(ret.cost.connections)} CON`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderTech = () => (
    <div>
      <div className="runner-centre-header">// THE WORKSHOP — PRODUCTION LINES</div>
      <div className="runner-crew-grid">
        {TECH_PRODUCTION_LINES.map(line => {
          const hired = hiredIds.has(line.id);
          const canAfford = !hired && eddies >= line.cost.eddies && secondaryResource >= line.cost.parts;
          return (
            <div key={line.id} className="runner-crew-slot">
              <div style={{ flex: 1 }}>
                <div className="runner-crew-name">{line.name}</div>
                <div className="runner-crew-role">{line.type.toUpperCase()}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--primary-dim)', marginTop: '0.1rem', fontStyle: 'italic' }}>
                  {line.flavour}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#f5a023', marginTop: '0.1rem' }}>
                  -{fmt(line.partsPerSec)} Parts/s → +{fmt(line.eddiesPerSec)}¥/s
                </div>
              </div>
              <button
                className="runner-crew-hire-btn"
                disabled={!canAfford}
                style={{ alignSelf: 'flex-end' }}
                onClick={() => canAfford && onHire(line.id, line.cost.eddies, line.cost.parts)}
              >
                {hired ? 'ONLINE' : `${fmt(line.cost.eddies)}¥ + ${fmt(line.cost.parts)} Parts`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMedtech = () => (
    <div>
      <div className="runner-centre-header">// SHADOW NETWORK — CLINICS</div>
      <div className="runner-crew-grid">
        {MEDTECH_CLINICS.map(clinic => {
          const hired = hiredIds.has(clinic.id);
          const canAfford = !hired && eddies >= clinic.cost.eddies && secondaryResource >= clinic.cost.patients;
          return (
            <div key={clinic.id} className="runner-crew-slot">
              <div style={{ flex: 1 }}>
                <div className="runner-crew-name">{clinic.name}</div>
                <div className="runner-crew-role">{clinic.specialisation.toUpperCase()}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--primary-dim)', marginTop: '0.1rem', fontStyle: 'italic' }}>
                  {clinic.flavour}
                </div>
                {clinic.patientCap > 0 && (
                  <div style={{ fontSize: '0.6rem', color: '#f5c842' }}>
                    +{clinic.patientCap} patient cap
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                <div className="runner-crew-income">+{fmt(clinic.incomeBonus)}/s</div>
                <button
                  className="runner-crew-hire-btn"
                  disabled={!canAfford}
                  onClick={() => canAfford && onHire(clinic.id, clinic.cost.eddies, clinic.cost.patients)}
                >
                  {hired ? 'OPERATIONAL' : `${fmt(clinic.cost.eddies)}¥ + ${fmt(clinic.cost.patients)} PAT`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderRockerboy = () => (
    <div>
      <div className="runner-centre-header">// THE MOVEMENT — CONVERT FOLLOWERS</div>
      <div className="runner-crew-grid">
        {ROCKERBOY_CREW.map(member => {
          const hired = hiredIds.has(member.id);
          const canAfford = !hired && eddies >= member.cost.eddies && secondaryResource >= member.cost.followers;
          return (
            <div key={member.id} className="runner-crew-slot">
              <div style={{ flex: 1 }}>
                <div className="runner-crew-name">{member.name}</div>
                <div className="runner-crew-role">{member.type.toUpperCase()}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--primary-dim)', marginTop: '0.1rem', fontStyle: 'italic' }}>
                  {member.flavour}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                {member.incomeBonus > 0 && <div className="runner-crew-income">+{fmt(member.incomeBonus)}/s</div>}
                {member.influenceBonus > 0 && (
                  <div style={{ fontSize: '0.6rem', color: '#c0a0ff' }}>+{fmt(member.influenceBonus)} INF/s</div>
                )}
                <button
                  className="runner-crew-hire-btn"
                  disabled={!canAfford}
                  onClick={() => canAfford && onHire(member.id, member.cost.eddies, member.cost.followers)}
                >
                  {hired ? 'CONVERTED' : `${fmt(member.cost.eddies)}¥ + ${fmt(member.cost.followers)} FOL`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderNomad = () => (
    <div>
      <div className="runner-centre-header">// THE PACK — CLAIM TERRITORY</div>
      <div className="runner-crew-grid">
        {NOMAD_TERRITORIES.map(terr => {
          const hired = hiredIds.has(terr.id);
          const canAfford = !hired && eddies >= terr.cost.eddies &&
            secondaryResource >= terr.cost.roadCred &&
            influence >= terr.cost.influence;
          return (
            <div key={terr.id} className="runner-crew-slot">
              <div style={{ flex: 1 }}>
                <div className="runner-crew-name">{terr.name}</div>
                <div className="runner-crew-role">{terr.type.toUpperCase()}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--primary-dim)', marginTop: '0.1rem', fontStyle: 'italic' }}>
                  {terr.flavour}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                <div className="runner-crew-income">+{fmt(terr.incomeBonus)}/s</div>
                <button
                  className="runner-crew-hire-btn"
                  disabled={!canAfford}
                  onClick={() => canAfford && onHire(terr.id, terr.cost.eddies, terr.cost.roadCred, terr.cost.influence)}
                >
                  {hired ? 'CLAIMED' : `${fmt(terr.cost.eddies)}¥${terr.cost.roadCred ? ` + ${fmt(terr.cost.roadCred)} RC` : ''}${terr.cost.influence ? ` + ${fmt(terr.cost.influence)} INF` : ''}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMedia = () => (
    <div>
      <div className="runner-centre-header">// THE NETWORK — PLACE SOURCES</div>
      <div className="runner-crew-grid">
        {MEDIA_SOURCE_NETWORK.map(src => {
          const hired = hiredIds.has(src.id);
          const canAfford = !hired && eddies >= src.cost.eddies && secondaryResource >= src.cost.sources;
          return (
            <div key={src.id} className="runner-crew-slot">
              <div style={{ flex: 1 }}>
                <div className="runner-crew-name">{src.name}</div>
                <div className="runner-crew-role">{src.tier.toUpperCase()}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--primary-dim)', marginTop: '0.1rem', fontStyle: 'italic' }}>
                  {src.flavour}
                </div>
                {src.sourceCap > 0 && (
                  <div style={{ fontSize: '0.6rem', color: '#f5c842' }}>+{src.sourceCap} source cap</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                <div className="runner-crew-income">+{fmt(src.incomeBonus)}/s</div>
                {src.influenceBonus > 0 && (
                  <div style={{ fontSize: '0.6rem', color: '#c0a0ff' }}>+{fmt(src.influenceBonus)} INF/s</div>
                )}
                <button
                  className="runner-crew-hire-btn"
                  disabled={!canAfford}
                  onClick={() => canAfford && onHire(src.id, src.cost.eddies, src.cost.sources)}
                >
                  {hired ? 'PLACED' : `${fmt(src.cost.eddies)}¥ + ${fmt(src.cost.sources)} SRC`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderByPath = () => {
    switch (careerPath) {
      case 'solo': return renderSolo();
      case 'netrunner': return renderNetrunner();
      case 'fixer': return renderFixer();
      case 'tech': return renderTech();
      case 'medtech': return renderMedtech();
      case 'rockerboy': return renderRockerboy();
      case 'nomad': return renderNomad();
      case 'media': return renderMedia();
      default: return null;
    }
  };

  return (
    <div>
      <div style={{
        fontSize: '0.67rem',
        color: 'var(--primary-dim)',
        marginBottom: '0.75rem',
        fontStyle: 'italic',
      }}>
        ACT 4 — {pathDef?.name ?? careerPath.toUpperCase()} | Legend threshold: 100,000 Influence
      </div>
      {renderByPath()}
    </div>
  );
}
