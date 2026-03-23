const WebSocket = require('ws');
const { query } = require('../config/db');
const logger = require('../utils/logger');
const sourceRepository = require('../repositories/source.repository');

let wss;
let activeServer = null;
const clients = new Set();
const sourceStatusSnapshot = new Map();
let statsSignature = null;
let eventCursor = {
  createdAt: null,
  updatedAt: null
};
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
    this.captureInitialWatcherSnapshot();
    this.sourceStatusTimer = setInterval(() => {
      this.pollRealtimeChanges();
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

  async captureInitialWatcherSnapshot() {
    try {
      await Promise.all([
        this.captureInitialSourceStatusSnapshot(),
        this.captureInitialEventCursor(),
        this.captureInitialStatsSnapshot()
      ]);
    } catch (error) {
      logger.warn(`Unable to initialize realtime watcher: ${error.message}`);
    }
  }

  async captureInitialSourceStatusSnapshot() {
    const sources = await sourceRepository.getHealth();
    for (const source of sources) {
      sourceStatusSnapshot.set(source.id, buildStatusSignature(source));
    }
  }

  async captureInitialEventCursor() {
    const rows = await query(`
      SELECT
        MAX(created_at) AS max_created_at,
        MAX(updated_at) AS max_updated_at
      FROM events
    `);

    eventCursor = {
      createdAt: rows[0]?.max_created_at || null,
      updatedAt: rows[0]?.max_updated_at || null
    };
  }

  async captureInitialStatsSnapshot() {
    const rows = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN score >= 0.8 THEN 1 END) as critical,
        COUNT(CASE WHEN score >= 0.6 AND score < 0.8 THEN 1 END) as high,
        COUNT(CASE WHEN score >= 0.4 AND score < 0.6 THEN 1 END) as medium,
        COUNT(CASE WHEN score < 0.4 THEN 1 END) as low
      FROM events
    `);

    statsSignature = JSON.stringify(rows[0] || {});
  }

  async pollRealtimeChanges() {
    if (clients.size === 0) {
      return;
    }

    try {
      await Promise.all([
        this.pollSourceStatusChanges(),
        this.pollEventChanges(),
        this.pollStatsChanges()
      ]);
    } catch (error) {
      logger.warn(`Unable to poll realtime changes: ${error.message}`);
    }
  }

  async pollSourceStatusChanges() {
    const sources = await sourceRepository.getHealth();
    for (const source of sources) {
      const signature = buildStatusSignature(source);
      if (sourceStatusSnapshot.get(source.id) !== signature) {
        sourceStatusSnapshot.set(source.id, signature);
        this.sendSourceStatus(source);
      }
    }
  }

  async pollEventChanges() {
    const createdEvents = await query(`
      SELECT * FROM events
      WHERE created_at > COALESCE(?, '1970-01-01 00:00:00')
      ORDER BY created_at ASC
      LIMIT 250
    `, [eventCursor.createdAt]);

    for (const event of createdEvents) {
      this.sendEvent(normalizeRealtimeEvent(event));
    }

    if (createdEvents.length > 0) {
      eventCursor.createdAt = createdEvents[createdEvents.length - 1].created_at;
    }

    const updatedEvents = await query(`
      SELECT * FROM events
      WHERE updated_at > COALESCE(?, '1970-01-01 00:00:00')
        AND updated_at > created_at
      ORDER BY updated_at ASC
      LIMIT 250
    `, [eventCursor.updatedAt]);

    for (const event of updatedEvents) {
      this.sendUpdate(normalizeRealtimeEvent(event));
    }

    if (updatedEvents.length > 0) {
      eventCursor.updatedAt = updatedEvents[updatedEvents.length - 1].updated_at;
    }
  }

  async pollStatsChanges() {
    const rows = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN score >= 0.8 THEN 1 END) as critical,
        COUNT(CASE WHEN score >= 0.6 AND score < 0.8 THEN 1 END) as high,
        COUNT(CASE WHEN score >= 0.4 AND score < 0.6 THEN 1 END) as medium,
        COUNT(CASE WHEN score < 0.4 THEN 1 END) as low
      FROM events
    `);

    const currentStats = rows[0] || {};
    const signature = JSON.stringify(currentStats);
    if (signature !== statsSignature) {
      statsSignature = signature;
      this.sendStats(currentStats);
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

function normalizeRealtimeEvent(event) {
  return {
    ...event,
    id: Number(event.id),
    lat: Number(event.lat),
    lon: Number(event.lon),
    magnitude: event.magnitude === null || event.magnitude === undefined ? null : Number(event.magnitude),
    depth: event.depth === null || event.depth === undefined ? null : Number(event.depth),
    score: Number(event.score || 0),
    affectedPopulation: event.affected_population ?? null,
    data: parseJsonField(event.data)
  };
}

function parseJsonField(value) {
  if (!value || typeof value !== 'string') {
    return value || null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

module.exports = { WebSocketServer, getWebSocketServer };
