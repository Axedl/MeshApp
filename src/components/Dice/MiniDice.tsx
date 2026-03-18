import { useState, useCallback } from 'react';
import './MiniDice.css';

interface MiniDiceResult {
  expr: string;
  total: number;
  rolls: number[];
  modifier: number;
}

function rollSingle(sides: number) { return Math.floor(Math.random() * sides) + 1; }

function quickRoll(count: number, sides: number, modifier: number, exploding: boolean): MiniDiceResult {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    let r = rollSingle(sides);
    rolls.push(r);
    while (exploding && sides === 10 && r === 10) {
      r = rollSingle(sides);
      rolls.push(r);
    }
  }
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  const modStr = modifier !== 0 ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : '';
  return { expr: `${count}d${sides}${modStr}`, total, rolls, modifier };
}

export function MiniDiceRoller() {
  const [sides, setSides] = useState(10);
  const [modifier, setModifier] = useState(0);
  const [exploding, setExploding] = useState(false);
  const [history, setHistory] = useState<MiniDiceResult[]>([]);
  const [last, setLast] = useState<MiniDiceResult | null>(null);

  const roll = useCallback((count = 1) => {
    const result = quickRoll(count, sides, modifier, exploding);
    setLast(result);
    setHistory(prev => [result, ...prev].slice(0, 5));
  }, [sides, modifier, exploding]);

  return (
    <div className="mini-dice">
      <div className="mini-dice-controls">
        <select
          className="mini-dice-select"
          value={sides}
          onChange={e => setSides(parseInt(e.target.value))}
        >
          {[4, 6, 8, 10, 12, 20].map(s => (
            <option key={s} value={s}>d{s}</option>
          ))}
        </select>
        <div className="mini-dice-mod-row">
          <span className="mini-dice-label">MOD</span>
          <input
            type="number"
            className="mini-dice-mod"
            value={modifier}
            onChange={e => setModifier(parseInt(e.target.value) || 0)}
          />
        </div>
        <label className="mini-dice-explode">
          <input type="checkbox" checked={exploding} onChange={e => setExploding(e.target.checked)} />
          <span>EXPLODE</span>
        </label>
      </div>

      <div className="mini-dice-btns">
        <button className="mini-dice-roll-btn" onClick={() => roll(1)}>1 DIE</button>
        <button className="mini-dice-roll-btn" onClick={() => roll(2)}>2 DICE</button>
      </div>

      {last && (
        <div className="mini-dice-result">
          <span className="mini-dice-expr">{last.expr}</span>
          <span className="mini-dice-rolls">[{last.rolls.join('|')}]</span>
          <span className="mini-dice-total">{last.total}</span>
        </div>
      )}

      {history.length > 1 && (
        <div className="mini-dice-history">
          {history.slice(1).map((r, i) => (
            <div key={i} className="mini-dice-hist-row">
              <span>{r.expr}</span>
              <span className="mini-dice-hist-total">{r.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
