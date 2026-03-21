const config = require('./config/env');
const app = require('./app');
const { WebSocketServer } = require('./services/ws.service');
const logger = require('./utils/logger');
const { loadSources } = require('./config/sources');

const HOST = config.host;
const PORT = config.port;

async function start() {
  try {
    await loadSources();
    
    const server = app.listen(PORT, HOST, () => {
      logger.info(`Server running on ${HOST}:${PORT}`);
    });

    // Initialize WebSocket
    const wss = new WebSocketServer(server);
    wss.start();

    logger.info('Situation Dashboard backend started');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
