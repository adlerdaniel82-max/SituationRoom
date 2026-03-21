const eventService = require('../services/event.service');
const logger = require('../utils/logger');

async function list(req, res, next) {
  try {
    const {
      type,
      source,
      minScore,
      startDate,
      endDate,
      bbox,
      limit = 100,
      offset = 0
    } = req.query;

    const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 100, 500));
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    const events = await eventService.list({
      type,
      source,
      minScore: minScore ? parseFloat(minScore) : undefined,
      startDate,
      endDate,
      bbox,
      limit: parsedLimit,
      offset: parsedOffset
    });
    res.json(events);
  } catch (error) {
    logger.error('Error listing events:', error);
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const event = await eventService.getById(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    logger.error('Error getting event:', error);
    next(error);
  }
}

async function getNearby(req, res, next) {
  try {
    const { lat, lon, radius = 100, limit = 50 } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat and lon are required' });
    }
    const events = await eventService.getNearby(
      parseFloat(lat),
      parseFloat(lon),
      parseFloat(radius),
      parseInt(limit, 10)
    );
    res.json(events);
  } catch (error) {
    logger.error('Error getting nearby events:', error);
    next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const stats = await eventService.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting event stats:', error);
    next(error);
  }
}

module.exports = { list, getById, getNearby, getStats };
