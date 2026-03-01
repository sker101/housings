import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

const HEARTBEAT_MS = 25000;
const RECONNECT_MS = 1800;

function toWebsocketUrl() {
  const wsUrl = new URL('/realtime/v1/websocket', SUPABASE_URL);
  wsUrl.searchParams.set('apikey', SUPABASE_ANON_KEY);
  wsUrl.searchParams.set('vsn', '1.0.0');
  return wsUrl.toString().replace(/^http/i, 'ws');
}

export function subscribeToTableChanges({
  schema = 'public',
  table,
  filter,
  event = '*',
  accessToken,
  onEvent,
  onStatus
}) {
  if (!table) {
    throw new Error('table is required for realtime subscription');
  }

  if (!SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing Supabase anon key. Set VITE_SUPABASE_ANON_KEY in frontend/.env and restart the dev server.'
    );
  }

  if (typeof window === 'undefined' || typeof window.WebSocket === 'undefined') {
    return () => {};
  }

  const topic = `realtime:${schema}:${table}`;
  const socketUrl = toWebsocketUrl();

  let ws = null;
  let heartbeatTimer = null;
  let reconnectTimer = null;
  let stopped = false;
  let refCounter = 1;

  const nextRef = () => String(refCounter++);

  const clearTimers = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const send = (payload) => {
    if (ws?.readyState !== window.WebSocket.OPEN) {
      return;
    }

    ws.send(JSON.stringify(payload));
  };

  const connect = () => {
    if (stopped) {
      return;
    }

    ws = new window.WebSocket(socketUrl);

    ws.onopen = () => {
      onStatus?.('connecting');

      const joinRef = nextRef();
      send({
        topic,
        event: 'phx_join',
        payload: {
          config: {
            broadcast: { ack: false, self: false },
            presence: { key: '' },
            postgres_changes: [
              {
                event,
                schema,
                table,
                ...(filter ? { filter } : {})
              }
            ]
          },
          access_token: accessToken
        },
        ref: joinRef,
        join_ref: joinRef
      });

      heartbeatTimer = setInterval(() => {
        send({
          topic: 'phoenix',
          event: 'heartbeat',
          payload: {},
          ref: nextRef()
        });
      }, HEARTBEAT_MS);
    };

    ws.onmessage = (rawMessage) => {
      let message = null;

      try {
        message = JSON.parse(rawMessage.data);
      } catch {
        return;
      }

      if (message.event === 'phx_reply' && message.payload?.status === 'ok') {
        onStatus?.('subscribed');
        return;
      }

      if (message.event !== 'postgres_changes') {
        return;
      }

      const payload = message.payload || {};
      const data = payload.data || payload;
      const eventType = String(data.eventType || '').toUpperCase();
      const record = data.new || data.record || null;
      const oldRecord = data.old || data.old_record || null;

      onEvent?.({
        eventType,
        record,
        oldRecord,
        raw: message
      });
    };

    ws.onerror = () => {
      onStatus?.('error');
    };

    ws.onclose = () => {
      clearTimers();
      onStatus?.('closed');

      if (stopped) {
        return;
      }

      reconnectTimer = setTimeout(connect, RECONNECT_MS);
    };
  };

  connect();

  return () => {
    stopped = true;
    clearTimers();

    if (ws && ws.readyState === window.WebSocket.OPEN) {
      send({
        topic,
        event: 'phx_leave',
        payload: {},
        ref: nextRef()
      });
    }

    try {
      ws?.close();
    } catch {
      // Ignore close errors.
    }
  };
}
