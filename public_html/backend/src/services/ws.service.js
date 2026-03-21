const WebSocket = require('ws');
const logger = require('../utils/logger');

let wss;
const clients = new Set();

class WebSocketServer {
  constructor(server) {
    this.server = server;
  }

  start() {
    wss = new WebSocket.Server({ server: this.server, path: '/ws' });

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
  }

  sendUpdate(update) {
    this.broadcast('event:update', update, 'events');
  }

  sendStats(stats) {
    this.broadcast('stats:update', stats, 'stats');
  }

  get clientCount() {
    return clients.size;
  }
}

module.exports = { WebSocketServer };
