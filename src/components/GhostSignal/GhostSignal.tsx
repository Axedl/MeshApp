import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useSignalStrength } from '../../hooks/useSignalStrength';
import './GhostSignal.css';

// Probability of surfacing any given incoming signal, by strength
function getChance(strength: number): number {
  if (strength <= 0) return 1.0;
  if (strength === 1) return 0.80;
  if (strength <= 3) return 0.40;
  return 0.15;
}

// Minimum cooldown between displayed signals, by strength (ms)
function getCooldown(strength: number): number {
  if (strength <= 0) return 10_000;   // 10s
  if (strength === 1) return 30_000;  // 30s
  if (strength <= 3) return 120_000;  // 2min
  return 300_000;                     // 5min
}

const CORRUPT_CHARS = ['█', '▓', '░', '@', '#'];

function corruptText(text: string): string {
  return text.split('').map(char => {
    if (char === ' ' || char === '\n') return char;
    if (Math.random() < 0.20) return CORRUPT_CHARS[Math.floor(Math.random() * CORRUPT_CHARS.length)];
    return char;
  }).join('');
}

export function GhostSignal() {
  const signalStrength = useSignalStrength();
  const signalStrengthRef = useRef(signalStrength);
  useEffect(() => { signalStrengthRef.current = signalStrength; }, [signalStrength]);

  // Queue stored in a ref to avoid stale closures; dequeueTrigger forces effect re-runs
  const queueRef = useRef<string[]>([]);
  const [dequeueTrigger, setDequeueTrigger] = useState(0);

  // displayText is the final rendered string — corruption applied once at set time
  const [displayText, setDisplayText] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'showing' | 'fading'>('idle');
  const cooldownUntilRef = useRef(0);

  const enqueue = useCallback((content: string) => {
    if (Math.random() > getChance(signalStrengthRef.current)) return;
    queueRef.current.push(content);
    setDequeueTrigger(t => t + 1);
  }, []);

  // On mount: after a random delay (5–15s), seed one random active signal
  // so the terminal feels alive when the GM has pre-authored fragments
  useEffect(() => {
    const delay = 5000 + Math.random() * 10000;
    const t = window.setTimeout(async () => {
      const { data } = await supabase
        .from('mesh_ghost_signals')
        .select('content')
        .eq('active', true);
      if (!data || data.length === 0) return;
      const pick = data[Math.floor(Math.random() * data.length)];
      enqueue(pick.content);
    }, delay);
    return () => clearTimeout(t);
  }, [enqueue]);

  // Realtime: new active signal inserted, or existing signal re-activated
  useEffect(() => {
    const channel = supabase
      .channel('ghost_signals_display')
      .on(
        'postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table: 'mesh_ghost_signals' },
        (payload: { new: Record<string, unknown> }) => {
          if (payload.new['active']) enqueue(payload.new['content'] as string);
        }
      )
      .on(
        'postgres_changes' as never,
        { event: 'UPDATE', schema: 'public', table: 'mesh_ghost_signals' },
        (payload: { new: Record<string, unknown> }) => {
          if (payload.new['active']) enqueue(payload.new['content'] as string);
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [enqueue]);

  // Dequeue: when idle, wait out the cooldown then show the next item
  useEffect(() => {
    if (phase !== 'idle' || queueRef.current.length === 0) return;

    const show = () => {
      const content = queueRef.current.shift();
      if (!content) return;
      // Apply corruption once at display time so the pattern is stable during the linger
      setDisplayText(signalStrengthRef.current === 0 ? corruptText(content) : content);
      setPhase('showing');
    };

    const delay = Math.max(0, cooldownUntilRef.current - Date.now());
    if (delay === 0) {
      show();
      return;
    }
    const t = window.setTimeout(show, delay);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, dequeueTrigger]);

  // showing → fading after random linger (8–12s)
  useEffect(() => {
    if (phase !== 'showing') return;
    const linger = 8000 + Math.random() * 4000;
    const t = window.setTimeout(() => setPhase('fading'), linger);
    return () => clearTimeout(t);
  }, [phase]);

  // fading → idle after fade-out duration (600ms)
  useEffect(() => {
    if (phase !== 'fading') return;
    const t = window.setTimeout(() => {
      cooldownUntilRef.current = Date.now() + getCooldown(signalStrengthRef.current);
      setDisplayText(null);
      setPhase('idle');
    }, 600);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === 'idle' || !displayText) return null;

  return (
    <div className={`ghost-signal${phase === 'fading' ? ' ghost-signal--fading' : ''}`}>
      <div className="ghost-signal-text">{displayText}</div>
    </div>
  );
}
