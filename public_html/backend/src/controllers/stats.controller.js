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

async function getSummary(req, res, next) {
  try {
    const stats = await statsService.getSummary();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting summary stats:', error);
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

async function getHotRegions(req, res, next) {
  try {
    const { hours = 24, limit = 12 } = req.query;
    const stats = await statsService.getHotRegions({ hours, limit });
    res.json(stats);
  } catch (error) {
    logger.error('Error getting hot region stats:', error);
    next(error);
  }
}

async function getMarkets(req, res, next) {
  try {
    const markets = await statsService.getMarkets();
    res.json(markets);
  } catch (error) {
    logger.error('Error getting market snapshot:', error);
    next(error);
  }
}

module.exports = { getOverview, getSummary, getByType, getBySource, getTimeline, getHotRegions, getMarkets };
