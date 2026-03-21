const statsService = require('../services/stats.service');
const logger = require('../utils/logger');

async function getOverview(req, res, next) {
  try {
    const stats = await statsService.getOverview();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting overview stats:', error);
    next(error);
  }
}

async function getByType(req, res, next) {
  try {
    const stats = await statsService.getByType();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting type stats:', error);
    next(error);
  }
}

async function getBySource(req, res, next) {
  try {
    const stats = await statsService.getBySource();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting source stats:', error);
    next(error);
  }
}

async function getTimeline(req, res, next) {
  try {
    const { interval = 'hour' } = req.query;
    const stats = await statsService.getTimeline(interval);
    res.json(stats);
  } catch (error) {
    logger.error('Error getting timeline stats:', error);
    next(error);
  }
}

module.exports = { getOverview, getByType, getBySource, getTimeline };
