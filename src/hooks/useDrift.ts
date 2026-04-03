import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtime } from './useRealtime';
import type { GlitchType } from '../types';

export function useDrift(userId: string | undefined): GlitchType[] {
  const [glitches, setGlitches] = useState<GlitchType[]>([]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('mesh_drift_effects')
      .select('active_glitches')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setGlitches((data?.active_glitches as GlitchType[]) ?? []);
      });
  }, [userId]);

  useRealtime({
    table: 'mesh_drift_state',
    event: 'UPDATE',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onUpdate: (payload) => {
      setGlitches((payload.active_glitches as GlitchType[]) ?? []);
    },
  });

  return glitches;
}
