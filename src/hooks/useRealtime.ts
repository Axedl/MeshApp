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

  // Keep callback refs up-to-date on every render without re-subscribing
  const onInsertRef = useRef(config.onInsert);
  const onUpdateRef = useRef(config.onUpdate);
  const onDeleteRef = useRef(config.onDelete);
  const onChangeRef = useRef(config.onChange);
  onInsertRef.current = config.onInsert;
  onUpdateRef.current = config.onUpdate;
  onDeleteRef.current = config.onDelete;
  onChangeRef.current = config.onChange;

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
          onChangeRef.current?.(payload.new);
          if (payload.eventType === 'INSERT') onInsertRef.current?.(payload.new);
          if (payload.eventType === 'UPDATE') onUpdateRef.current?.(payload.new);
          if (payload.eventType === 'DELETE') onDeleteRef.current?.(payload.old);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [config.table, config.filter, config.event]);

  return channelRef;
}
