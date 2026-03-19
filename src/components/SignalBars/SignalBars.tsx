import './SignalBars.css';

interface SignalBarsProps {
  strength: number; // 0–4
}

export function SignalBars({ strength }: SignalBarsProps) {
  return (
    <div
      className={`signal-bars${strength === 0 ? ' signal-bars--none' : ''}`}
      title={`Signal: ${strength}/4`}
    >
      {[1, 2, 3, 4].map(n => (
        <div
          key={n}
          className={`signal-bar signal-bar--${n}${n <= strength ? ' signal-bar--filled' : ''}`}
        />
      ))}
    </div>
  );
}
