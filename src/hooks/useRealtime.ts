import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimeConfig {
  table: string;
  event?: PostgresEvent;
  filter?: string;
  onInsert?: (payload: Record<string, unknown>) => void;
  onUpdate?: (payload: Record<string, unknown>) => void;
  onDelete?: (payload: Record<string, unknown>) => void;
  onChange?: (payload: Record<string, unknown>) => void;
}

export function useRealtime(config: RealtimeConfig) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`mesh_${config.table}_${Date.now()}`)
      .on(
        'postgres_changes' as never,
        {
          event: config.event || '*',
          schema: 'public',
          table: config.table,
          ...(config.filter ? { filter: config.filter } : {}),
        },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          config.onChange?.(payload.new);
          if (payload.eventType === 'INSERT') config.onInsert?.(payload.new);
          if (payload.eventType === 'UPDATE') config.onUpdate?.(payload.new);
          if (payload.eventType === 'DELETE') config.onDelete?.(payload.old);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [config.table, config.filter]);

  return channelRef;
}
