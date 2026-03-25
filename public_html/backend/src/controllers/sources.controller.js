const { getSourceById, getVisibleSources, isSourceVisible, loadSources } = require('../config/sources');
const sourceRepository = require('../repositories/source.repository');
const sourceRunner = require('../services/source-runner.service');
const logger = require('../utils/logger');

async function list(req, res, next) {
  try {
    const health = await sourceRepository.getHealth();
    res.json(getVisibleSources(health));
  } catch (error) {
    logger.error('Error listing sources:', error);
    next(error);
  }
}

async function getStatus(req, res, next) {
  try {
    const health = await sourceRepository.getHealth();
    res.json(getVisibleSources(health));
  } catch (error) {
    logger.error('Error getting source status:', error);
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    if (!isSourceVisible(id)) {
      return res.status(404).json({ error: 'Source not found' });
    }
    await loadSources();
    const source = getSourceById(id);
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }
    res.json(source);
  } catch (error) {
    logger.error('Error getting source:', error);
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    if (!isSourceVisible(id)) {
      return res.status(404).json({ error: 'Source not found' });
    }
    const { enabled, interval } = req.body;
    await sourceRepository.update(id, { enabled, interval });
    await loadSources();
    const source = getSourceById(id);
    res.json(source);
  } catch (error) {
    logger.error('Error updating source:', error);
    next(error);
  }
}

async function run(req, res, next) {
  try {
    const { id } = req.params;
    if (!isSourceVisible(id)) {
      return res.status(404).json({ error: 'Source not found' });
    }
    const result = await sourceRunner.runSource(id);
    res.json(result);
  } catch (error) {
    logger.error('Error running source:', error);
    next(error);
  }
}

module.exports = { list, getStatus, getById, update, run };
