import { useState, useRef, useCallback } from 'react';
import type { MeshUser, DiceRoll, DiceGroup } from '../../types';
import './Dice.css';

interface DiceModuleProps {
  user: MeshUser;
}

// ─── Dice logic ────────────────────────────────────────────────────────────

function rollSingle(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDieExploding(sides: number, exploding: boolean): number[] {
  const results: number[] = [];
  let roll = rollSingle(sides);
  results.push(roll);
  while (exploding && sides === 10 && roll === 10) {
    roll = rollSingle(sides);
    results.push(roll);
  }
  return results;
}

function parseDiceExpression(expr: string): { groups: { count: number; sides: number }[]; modifier: number } | null {
  const clean = expr.replace(/\s+/g, '').toLowerCase();

  // Extract trailing modifier: +3, -2
  const modMatch = clean.match(/([+-]\d+)$/);
  const modifier = modMatch ? parseInt(modMatch[1], 10) : 0;
  const diceStr = modMatch ? clean.slice(0, clean.length - modMatch[0].length) : clean;

  // Split on + and - between dice groups (but keep sign)
  // e.g. "2d6+1d10" → ["2d6","1d10"]
  const parts = diceStr.split(/(?=[+-])/);
  const groups: { count: number; sides: number }[] = [];

  for (const part of parts) {
    if (!part) continue;
    // Each part might start with + or -; dice don't subtract but handle gracefully
    const diceMatch = part.replace(/^\+/, '').match(/^(\d+)d(\d+)$/);
    if (!diceMatch) return null;
    const count = parseInt(diceMatch[1], 10);
    const sides = parseInt(diceMatch[2], 10);
    if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;
    groups.push({ count, sides });
  }

  if (groups.length === 0) return null;
  return { groups, modifier };
}

function executeRoll(expr: string, explodingDice: boolean): DiceRoll | null {
  const parsed = parseDiceExpression(expr);
  if (!parsed) return null;

  const diceGroups: DiceGroup[] = parsed.groups.map(g => {
    const rolls: number[] = [];
    for (let i = 0; i < g.count; i++) {
      rolls.push(...rollDieExploding(g.sides, explodingDice));
    }
    return { count: g.count, sides: g.sides, rolls };
  });

  const diceSum = diceGroups.reduce((sum, g) => sum + g.rolls.reduce((a, b) => a + b, 0), 0);
  const total = diceSum + parsed.modifier;

  return {
    id: crypto.randomUUID(),
    expression: expr.toUpperCase(),
    diceGroups,
    modifier: parsed.modifier,
    total,
    timestamp: new Date(),
  };
}

// ─── Presets ───────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'D6',       expr: '1d6'    },
  { label: 'D10',      expr: '1d10'   },
  { label: '2D6',      expr: '2d6'    },
  { label: '3D6',      expr: '3d6'    },
  { label: 'D10+D10',  expr: '1d10+1d10' },
];

// ─── Component ────────────────────────────────────────────────────────────

export function DiceModule({ user: _user }: DiceModuleProps) {
  const [rollHistory, setRollHistory] = useState<DiceRoll[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [explodingDice, setExplodingDice] = useState(false);
  const [currentRoll, setCurrentRoll] = useState<DiceRoll | null>(null);
  const [animating, setAnimating] = useState(false);
  const [parseError, setParseError] = useState('');
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doRoll = useCallback((expr: string) => {
    setParseError('');
    const result = executeRoll(expr, explodingDice);
    if (!result) {
      setParseError(`Invalid expression: "${expr}" — try e.g. 2d6+3`);
      return;
    }

    // Cancel any in-progress animation
    if (animTimerRef.current) clearTimeout(animTimerRef.current);

    setAnimating(true);
    setCurrentRoll(result);

    animTimerRef.current = setTimeout(() => {
      setAnimating(false);
      setRollHistory(prev => [result, ...prev].slice(0, 20));
    }, 900);
  }, [explodingDice]);

  const handleCustomRoll = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    doRoll(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCustomRoll();
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const formatRollSummary = (roll: DiceRoll): string => {
    const dieParts = roll.diceGroups.map(g => `[${g.rolls.join('|')}]`).join(' ');
    const modStr = roll.modifier !== 0 ? (roll.modifier > 0 ? ` +${roll.modifier}` : ` ${roll.modifier}`) : '';
    return `${dieParts}${modStr} = ${roll.total}`;
  };

  return (
    <div className="dice-module">
      {/* ── Presets ── */}
      <div className="dice-section">
        <div className="dice-section-label">QUICK ROLL</div>
        <div className="dice-presets">
          {PRESETS.map(p => (
            <button
              key={p.expr}
              className="dice-preset-btn"
              onClick={() => doRoll(p.expr)}
              disabled={animating}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Custom input ── */}
      <div className="dice-section">
        <div className="dice-section-label">CUSTOM ROLL</div>
        <div className="dice-custom-row">
          <input
            className="dice-custom-input"
            value={customInput}
            onChange={e => { setCustomInput(e.target.value); setParseError(''); }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 2d6+3  /  1d10-2  /  3d6"
            spellCheck={false}
          />
          <button
            className="dice-roll-btn"
            onClick={handleCustomRoll}
            disabled={animating || !customInput.trim()}
          >
            ROLL
          </button>
        </div>
        {parseError && <div className="dice-error">{parseError}</div>}
      </div>

      {/* ── Exploding dice toggle ── */}
      <div className="dice-section dice-explode-row">
        <label className="dice-toggle-label">
          <input
            type="checkbox"
            checked={explodingDice}
            onChange={e => setExplodingDice(e.target.checked)}
          />
          <span className="dice-toggle-text">EXPLODING D10</span>
          <span className="dice-toggle-hint">(reroll on 10, add result)</span>
        </label>
      </div>

      {/* ── Result display ── */}
      <div className={`dice-result-panel ${animating ? 'dice-animating' : ''}`}>
        {currentRoll ? (
          <>
            <div className="dice-result-expr">{currentRoll.expression}</div>
            <div className="dice-result-dice">
              {currentRoll.diceGroups.map((g, gi) => (
                <span key={gi} className="dice-result-group">
                  {g.rolls.map((r, ri) => (
                    <span
                      key={ri}
                      className={`dice-die ${r === g.sides ? 'dice-die-max' : ''} ${r === 1 ? 'dice-die-min' : ''}`}
                      style={{ animationDelay: `${(gi * g.rolls.length + ri) * 80}ms` }}
                    >
                      {r}
                    </span>
                  ))}
                </span>
              ))}
              {currentRoll.modifier !== 0 && (
                <span className="dice-modifier">
                  {currentRoll.modifier > 0 ? `+${currentRoll.modifier}` : currentRoll.modifier}
                </span>
              )}
            </div>
            <div className={`dice-total ${animating ? '' : 'dice-total-glow'}`}>
              {currentRoll.total}
            </div>
            {currentRoll.diceGroups.some(g => g.rolls.length > g.count) && (
              <div className="dice-explode-notice">⚡ DICE EXPLODED</div>
            )}
          </>
        ) : (
          <div className="dice-result-empty">— NO ROLL YET —</div>
        )}
      </div>

      {/* ── History ── */}
      {rollHistory.length > 0 && (
        <div className="dice-section">
          <div className="dice-section-label">ROLL HISTORY (SESSION)</div>
          <div className="dice-history">
            {rollHistory.map(r => (
              <div key={r.id} className="dice-history-row">
                <span className="dice-hist-time">{formatTime(r.timestamp)}</span>
                <span className="dice-hist-expr">{r.expression}</span>
                <span className="dice-hist-result">{formatRollSummary(r)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
