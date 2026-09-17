type TelemetryCallback = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private subscribers: Set<TelemetryCallback> = new Set();
  private reconnectTimeout: any = null;
  private isConnected: boolean = false;
  private url: string;

  constructor() {
    const isHttps = window.location.protocol === 'https:';
    const wsProto = isHttps ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_URL || `${wsProto}//${window.location.host}`;
    this.url = `${host}/ws/telemetry`;
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notify({ type: 'WS_CONNECTED' });
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.notify(parsed);
        } catch (err) {
          console.error('Failed to parse WebSocket message', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notify({ type: 'WS_DISCONNECTED' });
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        this.isConnected = false;
        this.notify({ type: 'WS_ERROR', error: err });
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  public subscribe(callback: TelemetryCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(data: any) {
    this.subscribers.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error('Error in subscriber callback', e);
      }
    });
  }

  public getStatus(): boolean {
    return this.isConnected;
  }
}

export const wsService = new WebSocketService();
