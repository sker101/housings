import { useState, useEffect, useCallback, useRef } from 'react';
import { selectRows, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import type { ActivityLog } from '../types';

interface UseActivityLogResult {
  events: ActivityLog[];
  loading: boolean;
  error: string | null;
}

export function useActivityLog(
  userId: string | null,
  accessToken: string | null,
  limit = 10
): UseActivityLogResult {
  const [events, setEvents] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!userId || !accessToken) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = await selectRows('activity_log', {
        select: 'id,user_id,event_type,description,metadata,created_at',
        filters: [{ column: 'user_id', op: 'eq', value: userId }],
        order: 'created_at.desc',
        limit,
        accessToken,
      });
      setEvents(rows as ActivityLog[]);
    } catch {
      setError('Could not load activity.');
    } finally {
      setLoading(false);
    }
  }, [userId, accessToken, limit]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ── Supabase Realtime via native WebSocket ────────────────────
  // We use the Supabase Realtime protocol directly since supabase.ts
  // is a raw REST client without the SDK.
  useEffect(() => {
    if (!userId || !accessToken) return;

    const supabaseKey = SUPABASE_ANON_KEY;
    const realtimeUrl = SUPABASE_URL.replace('https://', 'wss://')
      .replace('http://', 'ws://');
    const wsUrl = `${realtimeUrl}/realtime/v1/websocket?apikey=${supabaseKey}&vsn=1.0.0`;

    let ws: WebSocket;
    let heartbeatId: ReturnType<typeof setInterval>;
    let ref = 1;

    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Join the Realtime topic for postgres_changes on activity_log
        ws.send(
          JSON.stringify({
            topic: 'realtime:public:activity_log',
            event: 'phx_join',
            payload: {
              config: {
                broadcast: { ack: false, self: false },
                presence: { key: '' },
                postgres_changes: [
                  {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'activity_log',
                    filter: `user_id=eq.${userId}`,
                  },
                ],
              },
              access_token: accessToken,
            },
            ref: String(ref++),
          })
        );

        // Heartbeat every 30 seconds
        heartbeatId = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                topic: 'phoenix',
                event: 'heartbeat',
                payload: {},
                ref: String(ref++),
              })
            );
          }
        }, 30_000);
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string);
          if (
            msg.event === 'postgres_changes' &&
            msg.payload?.data?.type === 'INSERT'
          ) {
            const newEvent = msg.payload.data.record as ActivityLog;
            if (newEvent?.user_id === userId) {
              setEvents((prev) => [newEvent, ...prev].slice(0, limit));
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        // Silently degrade — polling is sufficient fallback
      };
    } catch {
      // WebSocket not supported or blocked — fallback to polling
    }

    return () => {
      clearInterval(heartbeatId);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [userId, accessToken, limit]);

  return { events, loading, error };
}
