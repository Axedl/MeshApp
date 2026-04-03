import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useDrift } from '../../hooks/useDrift';
import type { MeshUser } from '../../types';

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function formatDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length < 3) return isoDate;
  const day   = parseInt(parts[2], 10);
  const month = parseInt(parts[1], 10);
  const year  = parts[0];
  if (isNaN(day) || isNaN(month) || month < 1 || month > 12) return isoDate;
  return `${day} ${MONTH_ABBR[month - 1]} ${year}`;
}

function parseHHMM(hhmm: string): number | null {
  const parts = hhmm.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

interface InWorldClockProps {
  user: MeshUser;
}

export function InWorldClock({ user }: InWorldClockProps) {
  const [date, setDate]           = useState('');
  // baseMinutes: total minutes from DB at the moment it was received
  const [baseMinutes, setBaseMinutes] = useState<number | null>(null);
  // baseSetAt: wall-clock ms when baseMinutes was last updated from DB
  const [baseSetAt, setBaseSetAt]     = useState<number>(0);
  // displayed time (ticks forward)
  const [displayMins, setDisplayMins] = useState(0);

  // clock_drift: random offset computed once on mount, stable until glitch toggles
  const glitches = useDrift(user.is_gm ? undefined : user.id);
  const driftOffsetRef = useRef<number | null>(null);
  const hasDrift = glitches.includes('clock_drift') && !user.is_gm;

  useEffect(() => {
    if (hasDrift && driftOffsetRef.current === null) {
      const magnitude = 13 + Math.floor(Math.random() * 35);
      const direction = Math.random() < 0.5 ? 1 : -1;
      driftOffsetRef.current = magnitude * direction;
    }
    if (!hasDrift) {
      driftOffsetRef.current = null;
    }
  }, [hasDrift]);

  const applyTime = useCallback((hhmm: string) => {
    const total = parseHHMM(hhmm);
    if (total === null) return;
    const now = Date.now();
    setBaseMinutes(total);
    setBaseSetAt(now);
    setDisplayMins(total);
  }, []);

  // Initial fetch + realtime subscription
  useEffect(() => {
    supabase
      .from('mesh_config')
      .select('key, value')
      .in('key', ['ingame_date', 'ingame_time'])
      .then(({ data }) => {
        data?.forEach(row => {
          if (row.key === 'ingame_date') setDate(row.value as string);
          if (row.key === 'ingame_time') applyTime(row.value as string);
        });
      });

    const channel = supabase
      .channel('mesh_config_clock')
      .on(
        'postgres_changes' as never,
        { event: 'UPDATE', schema: 'public', table: 'mesh_config' },
        (payload: { new: Record<string, unknown> }) => {
          const key   = payload.new['key']   as string;
          const value = payload.new['value'] as string;
          if (key === 'ingame_date') setDate(value);
          if (key === 'ingame_time') applyTime(value);
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [applyTime]);

  // Tick forward every 60 real seconds from the base DB value
  useEffect(() => {
    if (baseMinutes === null || !baseSetAt) return;
    const interval = setInterval(() => {
      const elapsedMins = Math.floor((Date.now() - baseSetAt) / 60000);
      setDisplayMins(baseMinutes + elapsedMins);
    }, 60000);
    return () => clearInterval(interval);
  }, [baseMinutes, baseSetAt]);

  if (!date && baseMinutes === null) return null;

  const adjustedMins = displayMins + (driftOffsetRef.current ?? 0);
  const hours = Math.floor(adjustedMins / 60) % 24;
  const mins  = ((adjustedMins % 60) + 60) % 60;
  const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} NZT`;

  return (
    <div className="sidebar-clock">
      {date && <div>{formatDate(date)}</div>}
      {baseMinutes !== null && <div>{timeStr}</div>}
    </div>
  );
}
