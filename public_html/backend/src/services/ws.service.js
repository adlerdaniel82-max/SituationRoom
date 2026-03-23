const WebSocket = require('ws');
const logger = require('../utils/logger');
const sourceRepository = require('../repositories/source.repository');

let wss;
let activeServer = null;
const clients = new Set();
const sourceStatusSnapshot = new Map();
const SOURCE_STATUS_POLL_MS = 5000;

class WebSocketServer {
  constructor(server) {
    this.server = server;
  }

  start() {
    wss = new WebSocket.Server({ server: this.server, path: '/ws' });
    activeServer = this;
    this.startSourceStatusWatcher();

    wss.on('connection', (ws) => {
      logger.debug('WebSocket client connected');
      clients.add(ws);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          logger.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        logger.debug('WebSocket client disconnected');
        clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        clients.delete(ws);
      });
    });

    logger.info('WebSocket server initialized');
  }

  startSourceStatusWatcher() {
    if (this.sourceStatusTimer) {
      clearInterval(this.sourceStatusTimer);
    }
    this.captureInitialSourceStatusSnapshot();
    this.sourceStatusTimer = setInterval(() => {
      this.pollSourceStatusChanges();
    }, SOURCE_STATUS_POLL_MS);

    if (typeof this.sourceStatusTimer.unref === 'function') {
      this.sourceStatusTimer.unref();
    }
  }

  handleMessage(ws, data) {
    const { type, payload } = data;

    switch (type) {
      case 'subscribe':
        ws.subscriptions = payload?.channels || [];
        ws.send(JSON.stringify({ type: 'subscribed', channels: ws.subscriptions }));
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      default:
        logger.warn('Unknown WebSocket message type:', type);
    }
  }

  broadcast(type, payload, channel = null) {
    const message = JSON.stringify({ type, payload, timestamp: Date.now() });

    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        if (!channel || !client.subscriptions || client.subscriptions.includes(channel)) {
          client.send(message);
        }
      }
    }
  }

  sendEvent(event) {
    this.broadcast('event:new', event, 'events');
    this.broadcast('event.created', event, 'events');
  }

  sendUpdate(update) {
    this.broadcast('event:update', update, 'events');
    this.broadcast('event.updated', update, 'events');
  }

  sendStats(stats) {
    this.broadcast('stats:update', stats, 'stats');
  }

  sendSourceStatus(status) {
    this.broadcast('source.status', status, 'sources');
  }

  async captureInitialSourceStatusSnapshot() {
    try {
      const sources = await sourceRepository.getHealth();
      for (const source of sources) {
        sourceStatusSnapshot.set(source.id, buildStatusSignature(source));
      }
    } catch (error) {
      logger.warn(`Unable to initialize source status watcher: ${error.message}`);
    }
  }

  async pollSourceStatusChanges() {
    if (clients.size === 0) {
      return;
    }

    try {
      const sources = await sourceRepository.getHealth();
      for (const source of sources) {
        const signature = buildStatusSignature(source);
        if (sourceStatusSnapshot.get(source.id) !== signature) {
          sourceStatusSnapshot.set(source.id, signature);
          this.sendSourceStatus(source);
        }
      }
    } catch (error) {
      logger.warn(`Unable to poll source status changes: ${error.message}`);
    }
  }

  get clientCount() {
    return clients.size;
  }
}

function getWebSocketServer() {
  return activeServer;
}

function buildStatusSignature(source) {
  return JSON.stringify({
    enabled: source.enabled,
    interval_seconds: source.interval_seconds,
    last_run: source.last_run,
    last_status: source.last_status,
    health_status: source.health_status,
    minutes_since_run: source.minutes_since_run,
    events_last_24h: source.events_last_24h
  });
}

module.exports = { WebSocketServer, getWebSocketServer };
