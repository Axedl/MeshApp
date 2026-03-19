import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Subscribes to mesh_config signal_strength and returns the current value (0–4).
 * Exported for use by Terminal (display) and any component that needs signal state
 * (e.g. ghost signal system).
 * Defaults to 4 (full signal) until the initial fetch resolves.
 */
export function useSignalStrength(): number {
  const [strength, setStrength] = useState<number>(4);

  const parseAndSet = useCallback((value: unknown) => {
    const n = parseInt(value as string, 10);
    if (!isNaN(n)) setStrength(n);
  }, []);

  useEffect(() => {
    // Initial fetch
    supabase
      .from('mesh_config')
      .select('value')
      .eq('key', 'signal_strength')
      .maybeSingle()
      .then(({ data }) => { if (data) parseAndSet(data.value); });

    // Realtime — follow the established pattern from Terminal.tsx
    const channel = supabase
      .channel('mesh_config_signal')
      .on(
        'postgres_changes' as never,
        { event: 'UPDATE', schema: 'public', table: 'mesh_config' },
        (payload: { new: Record<string, unknown> }) => {
          if (payload.new['key'] === 'signal_strength') {
            parseAndSet(payload.new['value']);
          }
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [parseAndSet]);

  return strength;
}
