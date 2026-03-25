const { getEnabledSources } = require('../config/sources');
const logger = require('../utils/logger');
const sourceRepository = require('../repositories/source.repository');
const { getWebSocketServer } = require('./ws.service');

const importers = {
  usgs: require('../importers/usgs.importer'),
  gdacs: require('../importers/gdacs.importer'),
  gdelt: require('../importers/gdelt.importer'),
  noaa_tsunami: require('../importers/noaa-tsunami.importer'),
  firms: require('../importers/firms.importer'),
  acled: require('../importers/acled.importer'),
  reliefweb: require('../importers/reliefweb.importer'),
  opensky: require('../importers/opensky.importer'),
  ap: require('../importers/ap.importer'),
  reuters: require('../importers/reuters.importer'),
  bbc: require('../importers/bbc.importer')
};

const runningJobs = new Map();

async function runSource(sourceId) {
  if (runningJobs.has(sourceId)) {
    logger.warn(`Source ${sourceId} is already running`);
    return { status: 'already_running' };
  }

  const importer = importers[sourceId];
  if (!importer) {
    logger.error(`Unknown source: ${sourceId}`);
    return { status: 'unknown_source' };
  }

  try {
    runningJobs.set(sourceId, { started: Date.now() });
    logger.info(`Starting source runner: ${sourceId}`);

    await sourceRepository.updateRunState(sourceId, new Date(), 'running');
    await broadcastSourceStatus(sourceId);
    const result = await importer.run();
    await sourceRepository.updateRunState(sourceId, new Date(), 'ok');
    await broadcastSourceStatus(sourceId);

    runningJobs.delete(sourceId);
    logger.info(`Source runner completed: ${sourceId}`, result);

    return { status: 'completed', ...result };
  } catch (error) {
    runningJobs.delete(sourceId);
    await sourceRepository.updateRunState(sourceId, new Date(), `error: ${error.message}`.slice(0, 50));
    await broadcastSourceStatus(sourceId);
    logger.error(`Source runner failed: ${sourceId}`, summarizeError(error));
    return { status: 'failed', error: error.message };
  }
}

async function runAllEnabled() {
  const sources = getEnabledSources();
  const results = {};

  for (const source of sources) {
    results[source.id] = await runSource(source.id);
  }

  return results;
}

function getRunningJobs() {
  const jobs = {};
  for (const [id, info] of runningJobs.entries()) {
    jobs[id] = {
      ...info,
      duration: Date.now() - info.started
    };
  }
  return jobs;
}

function summarizeError(error) {
  return {
    message: error.message,
    status: error.response?.status,
    code: error.code
  };
}

async function broadcastSourceStatus(sourceId) {
  const wsServer = getWebSocketServer();
  if (!wsServer) {
    return;
  }

  try {
    const source = await sourceRepository.getHealthById(sourceId);
    if (source) {
      wsServer.sendSourceStatus(source);
    }
  } catch (error) {
    logger.warn(`Unable to broadcast source status for ${sourceId}: ${error.message}`);
  }
}

module.exports = { runSource, runAllEnabled, getRunningJobs, importers };
