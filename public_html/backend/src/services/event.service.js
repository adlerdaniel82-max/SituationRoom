const eventRepository = require('../repositories/event.repository');
const scoringService = require('./scoring.service');
const dedupService = require('./dedup.service');
const logger = require('../utils/logger');

async function list(options = {}) {
  const events = await eventRepository.list(options);
  return events.map(enrichEvent);
}

async function getById(id) {
  const event = await eventRepository.getById(id);
  if (event) {
    return enrichEvent(event);
  }
  return null;
}

async function getNearby(lat, lon, radiusKm, limit = 50) {
  const events = await eventRepository.getNearby(lat, lon, radiusKm, limit);
  return events.map(e => ({
    ...enrichEvent(e),
    distanceKm: calculateDistance(lat, lon, e.lat, e.lon)
  }));
}

async function getStats() {
  return eventRepository.getStats();
}

async function create(eventData) {
  // Check for duplicates
  const existing = await dedupService.findDuplicate(eventData);
  if (existing) {
    logger.debug('Duplicate event detected:', eventData.title);
    return { ...enrichEvent(existing), isDuplicate: true };
  }

  // Calculate score
  const score = await scoringService.calculate(eventData);

  // Create event
  const event = {
    ...eventData,
    score,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const id = await eventRepository.create(event);
  return { ...event, id, isDuplicate: false };
}

async function update(id, updates) {
  const score = updates.data ? await scoringService.calculate(updates.data) : undefined;
  return eventRepository.update(id, { ...updates, score, updatedAt: new Date() });
}

function enrichEvent(event) {
  const data = parseJsonField(event.data);
  const lat = toNumber(event.lat);
  const lon = toNumber(event.lon);
  const magnitude = toNullableNumber(event.magnitude);
  const depth = toNullableNumber(event.depth);
  const score = toNumber(event.score);
  const affectedPopulation = event.affectedPopulation ?? event.affected_population ?? null;

  return {
    ...event,
    data,
    lat,
    lon,
    magnitude,
    depth,
    score,
    affectedPopulation,
    severity: calculateSeverity(score),
    urgency: calculateUrgency({ ...event, timestamp: event.timestamp })
  };
}

function calculateSeverity(score) {
  if (score >= 0.8) return 'critical';
  if (score >= 0.6) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

function calculateUrgency(event) {
  const hoursSinceEvent = (Date.now() - new Date(event.timestamp).getTime()) / (1000 * 60 * 60);
  if (hoursSinceEvent < 6) return 'immediate';
  if (hoursSinceEvent < 24) return 'recent';
  return 'historical';
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function toGeoJson(events = []) {
  return {
    type: 'FeatureCollection',
    features: events.map((event) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [event.lon, event.lat]
      },
      properties: {
        id: event.id,
        title: event.title,
        type: event.type,
        source: event.source,
        score: event.score,
        severity: event.severity,
        urgency: event.urgency,
        timestamp: event.timestamp,
        magnitude: event.magnitude,
        affectedPopulation: event.affectedPopulation,
        url: event.url
      }
    }))
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

function toNumber(value) {
  return typeof value === 'number' ? value : Number(value);
}

function toNullableNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

module.exports = { list, getById, getNearby, getStats, create, update, enrichEvent, toGeoJson };
