const eventService = require('../services/event.service');
const eventReportService = require('../services/event-report.service');
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
      format,
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
    if (format === 'geojson') {
      return res.json(eventService.toGeoJson(events));
    }

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

async function reportIndustrialHeat(req, res, next) {
  try {
    const { id } = req.params;
    const result = await eventReportService.reportIndustrialHeat(Number(id), {
      clientId: req.header('x-client-id'),
      ip: req.ip,
      userAgent: req.header('user-agent')
    });

    if (result.error === 'not_found') {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (result.error === 'unsupported_event_type') {
      return res.status(400).json({ error: 'Only FIRMS fire events can be marked as industrial heat' });
    }

    if (result.error === 'missing_reporter') {
      return res.status(400).json({ error: 'Reporter identity missing' });
    }

    res.json(result);
  } catch (error) {
    logger.error('Error reporting industrial heat:', error);
    next(error);
  }
}

async function getValidation(req, res, next) {
  try {
    const { id } = req.params;
    const event = await eventService.getById(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const newsValidationService = require('../services/news-validation.service');
    const matches = await newsValidationService.listValidationMatches(Number(id));

    res.json({
      event_id: Number(id),
      source: event.source,
      type: event.type,
      validation: event.validationSummary,
      matches
    });
  } catch (error) {
    logger.error('Error getting event validation:', error);
    next(error);
  }
}

module.exports = { list, getById, getNearby, getStats, reportIndustrialHeat, getValidation };
