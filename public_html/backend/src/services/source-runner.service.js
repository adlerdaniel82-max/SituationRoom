const { getEnabledSources } = require('../config/sources');
const logger = require('../utils/logger');
const sourceRepository = require('../repositories/source.repository');

const importers = {
  usgs: require('../importers/usgs.importer'),
  gdacs: require('../importers/gdacs.importer'),
  firms: require('../importers/firms.importer'),
  acled: require('../importers/acled.importer'),
  reliefweb: require('../importers/reliefweb.importer'),
  opensky: require('../importers/opensky.importer')
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
    const result = await importer.run();
    await sourceRepository.updateRunState(sourceId, new Date(), 'ok');

    runningJobs.delete(sourceId);
    logger.info(`Source runner completed: ${sourceId}`, result);

    return { status: 'completed', ...result };
  } catch (error) {
    runningJobs.delete(sourceId);
    await sourceRepository.updateRunState(sourceId, new Date(), `error: ${error.message}`.slice(0, 50));
    logger.error(`Source runner failed: ${sourceId}`, error);
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

module.exports = { runSource, runAllEnabled, getRunningJobs, importers };
