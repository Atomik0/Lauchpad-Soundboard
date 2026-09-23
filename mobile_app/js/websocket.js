// WebSocket Communication Client
// Handles resilient connection to Launchpad Studio Pro desktop server

class LaunchpadRemoteClient {
  constructor() {
    this.ws = null;
    this.status = 'disconnected';
    this.listeners = new Map();
    this.reconnectTimer = null;
    this.reconnectDelay = 2000;
    this.heartbeatTimer = null;
    this.serverUrl = this.getDefaultServerUrl();
  }

  getDefaultServerUrl() {
    const saved = localStorage.getItem('lp_server_url');
    if (saved) return saved;

    if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const port = window.location.port || '3000';
      return `${protocol}//${window.location.hostname}:${port}/ws-remote`;
    }

    return 'ws://localhost:3000/ws-remote';
  }

  setServerUrl(url) {
    if (!url) return;
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('ws://') && !cleanUrl.startsWith('wss://')) {
      cleanUrl = `ws://${cleanUrl}`;
    }
    if (!cleanUrl.includes('/ws-remote')) {
      cleanUrl = cleanUrl.replace(/\/+$/, '') + '/ws-remote';
    }

    this.serverUrl = cleanUrl;
    localStorage.setItem('lp_server_url', this.serverUrl);
    this.reconnect(true);
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.updateStatus('connecting');
    console.log('[RemoteWS] Connecting to:', this.serverUrl);

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log('[RemoteWS] Connected successfully');
        this.updateStatus('connected');
        this.reconnectDelay = 2000;
        this.startHeartbeat();

        this.send({ type: 'request_state' });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleIncomingMessage(message);
        } catch (err) {
          console.warn('[RemoteWS] Invalid message received:', event.data);
        }
      };

      this.ws.onclose = () => {
        console.log('[RemoteWS] Connection closed');
        this.updateStatus('disconnected');
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[RemoteWS] Error:', err);
      };
    } catch (err) {
      console.error('[RemoteWS] Connection attempt threw exception:', err);
      this.updateStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus('disconnected');
  }

  reconnect(immediate = false) {
    this.disconnect();
    if (immediate) {
      this.connect();
    } else {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 10000);
      this.connect();
    }, this.reconnectDelay);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 15000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  sendTriggerPad(bankId, padIndex) {
    return this.send({
      type: 'trigger_pad',
      bankId,
      padIndex,
      timestamp: Date.now()
    });
  }

  sendStopAll() {
    return this.send({
      type: 'stop_all',
      timestamp: Date.now()
    });
  }

  sendSwitchBank(bankId) {
    return this.send({
      type: 'switch_bank',
      bankId,
      timestamp: Date.now()
    });
  }

  updateStatus(newStatus) {
    this.status = newStatus;
    this.emit('status_change', newStatus);
  }

  handleIncomingMessage(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === 'pong') return;

    this.emit(msg.type, msg.payload || msg);
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);
  }

  off(eventName, callback) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).delete(callback);
    }
  }

  emit(eventName, data) {
    if (this.listeners.has(eventName)) {
      for (const cb of this.listeners.get(eventName)) {
        try {
          cb(data);
        } catch (e) {
          console.error(`[RemoteWS] Listener error on ${eventName}:`, e);
        }
      }
    }
  }
}

window.remoteClient = new LaunchpadRemoteClient();
