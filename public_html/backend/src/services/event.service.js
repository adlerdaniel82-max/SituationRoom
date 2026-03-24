const eventRepository = require('../repositories/event.repository');
const rawRepository = require('../repositories/raw.repository');
const scoringService = require('./scoring.service');
const dedupService = require('./dedup.service');
const { getWebSocketServer } = require('./ws.service');
const logger = require('../utils/logger');

let statsBroadcastTimer = null;
const validationRefreshTimers = new Map();

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

  // Calculate score and component breakdown
  const scoring = await scoringService.calculateDetailed(eventData);
  const data = attachScoringToData(eventData.data, scoring);

  // Create event
  const event = {
    ...eventData,
    data,
    score: scoring.score,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const id = await eventRepository.create(event);
  const createdEvent = enrichEvent({ ...event, id });
  await persistRawEventSnapshot(createdEvent, eventData);
  broadcastEventCreated(createdEvent);
  scheduleStatsBroadcast();
  scheduleNewsValidationRefresh(createdEvent);
  return { ...createdEvent, isDuplicate: false };
}

async function update(id, updates) {
  const previousEvent = await getById(id);
  if (!previousEvent) {
    return false;
  }

  const scoringInput = buildScoringInput(previousEvent, updates);
  const scoring = await scoringService.calculateDetailed(scoringInput);
  const didUpdate = await eventRepository.update(id, {
    ...updates,
    magnitude: updates.magnitude !== undefined ? updates.magnitude : scoringInput.magnitude,
    data: attachScoringToData(scoringInput.data, scoring),
    score: scoring.score,
    updated_at: new Date()
  });
  if (!didUpdate) {
    return false;
  }

  const updatedEvent = await getById(id);
  if (updatedEvent) {
    await persistEventUpdate(previousEvent, updatedEvent);
    broadcastEventUpdated(updatedEvent);
    scheduleStatsBroadcast();
    scheduleNewsValidationRefresh(updatedEvent);
  }

  return updatedEvent || true;
}

function enrichEvent(event) {
  const data = parseJsonField(event.data);
  const lat = toNumber(event.lat);
  const lon = toNumber(event.lon);
  const magnitude = toNullableNumber(event.magnitude);
  const depth = toNullableNumber(event.depth);
  const score = toNumber(event.score);
  const scoring = normalizeScoringComponents(data?.scoring);
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
    sourceConfidence: scoring.source_confidence,
    eventSeverityScore: scoring.event_severity,
    validationScore: scoring.validation_score,
    attentionScore: scoring.attention_score,
    validationSummary: data?.validation || null,
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
        sourceConfidence: event.sourceConfidence,
        eventSeverityScore: event.eventSeverityScore,
        validationScore: event.validationScore,
        attentionScore: event.attentionScore,
        severity: event.severity,
        urgency: event.urgency,
        timestamp: event.timestamp,
        description: getEventDescription(event),
        magnitude: event.magnitude,
        affectedPopulation: event.affectedPopulation,
        url: event.url
      }
    }))
  };
}

function getEventDescription(event) {
  return (
    event.description
    || event.data?.description
    || event.data?.details
    || event.data?.event_desc
    || event.data?.place
    || ''
  );
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

function attachScoringToData(data, scoring) {
  const payload = data && typeof data === 'object' && !Array.isArray(data)
    ? { ...data }
    : {};

  payload.scoring = {
    source_confidence: scoring.source_confidence,
    event_severity: scoring.event_severity,
    validation_score: scoring.validation_score,
    attention_score: scoring.attention_score,
    combined_score: scoring.score
  };

  return payload;
}

function buildScoringInput(previousEvent, updates) {
  const previousData = previousEvent?.data && typeof previousEvent.data === 'object' ? previousEvent.data : {};
  const updateData = updates?.data && typeof updates.data === 'object' ? updates.data : {};
  const mergedData = {
    ...previousData,
    ...updateData
  };

  const affectedPopulation =
    updates?.affectedPopulation
    ?? updates?.affected_population
    ?? previousEvent?.affectedPopulation
    ?? previousEvent?.affected_population
    ?? mergedData.affectedPopulation
    ?? mergedData.affected_population
    ?? null;

  return {
    ...previousEvent,
    ...updates,
    type: updates?.type ?? previousEvent?.type ?? mergedData.type,
    source: updates?.source ?? previousEvent?.source ?? mergedData.source,
    magnitude: updates?.magnitude ?? previousEvent?.magnitude ?? mergedData.magnitude ?? mergedData.normalizedSeverity ?? null,
    affectedPopulation,
    timestamp: updates?.timestamp ?? previousEvent?.timestamp ?? mergedData.timestamp ?? null,
    url: updates?.url ?? previousEvent?.url ?? mergedData.url ?? null,
    data: mergedData
  };
}

function normalizeScoringComponents(scoring) {
  if (!scoring || typeof scoring !== 'object') {
    return {
      source_confidence: null,
      event_severity: null,
      validation_score: null,
      attention_score: null
    };
  }

  return {
    source_confidence: toNullableNumber(scoring.source_confidence),
    event_severity: toNullableNumber(scoring.event_severity),
    validation_score: toNullableNumber(scoring.validation_score),
    attention_score: toNullableNumber(scoring.attention_score)
  };
}

async function persistRawEventSnapshot(createdEvent, sourcePayload) {
  try {
    await rawRepository.storeRawEvent({
      eventId: createdEvent.id,
      source: createdEvent.source,
      eventHash: createdEvent.event_hash || null,
      payload: {
        source_payload: sourcePayload,
        normalized_event: createdEvent
      }
    });
  } catch (error) {
    logger.warn(`Unable to persist raw event snapshot: ${error.message}`);
  }
}

async function persistEventUpdate(previousEvent, updatedEvent) {
  const changedFields = getChangedFields(previousEvent, updatedEvent);
  if (changedFields.length === 0) {
    return;
  }

  try {
    await rawRepository.storeEventUpdate({
      eventId: updatedEvent.id,
      source: updatedEvent.source,
      changedFields,
      beforeState: sanitizeHistorySnapshot(previousEvent),
      afterState: sanitizeHistorySnapshot(updatedEvent)
    });
  } catch (error) {
    logger.warn(`Unable to persist event update snapshot: ${error.message}`);
  }
}

function getChangedFields(previousEvent, updatedEvent) {
  const changedFields = [];
  const previousSnapshot = sanitizeHistorySnapshot(previousEvent);
  const updatedSnapshot = sanitizeHistorySnapshot(updatedEvent);

  for (const key of Object.keys(updatedSnapshot)) {
    if (JSON.stringify(previousSnapshot[key]) !== JSON.stringify(updatedSnapshot[key])) {
      changedFields.push(key);
    }
  }

  return changedFields;
}

function sanitizeHistorySnapshot(event) {
  return {
    title: event.title,
    type: event.type,
    source: event.source,
    lat: event.lat,
    lon: event.lon,
    magnitude: event.magnitude,
    depth: event.depth,
    affectedPopulation: event.affectedPopulation ?? event.affected_population ?? null,
    timestamp: event.timestamp,
    url: event.url,
    score: event.score,
    data: event.data
  };
}

function broadcastEventCreated(event) {
  const wsServer = getWebSocketServer();
  if (!wsServer || !event) {
    return;
  }

  wsServer.sendEvent(event);
}

function broadcastEventUpdated(event) {
  const wsServer = getWebSocketServer();
  if (!wsServer || !event) {
    return;
  }

  wsServer.sendUpdate(event);
}

function scheduleStatsBroadcast() {
  const wsServer = getWebSocketServer();
  if (!wsServer) {
    return;
  }

  if (statsBroadcastTimer) {
    clearTimeout(statsBroadcastTimer);
  }

  statsBroadcastTimer = setTimeout(async () => {
    statsBroadcastTimer = null;
    try {
      const stats = await getStats();
      wsServer.sendStats(stats);
    } catch (error) {
      logger.warn(`Unable to broadcast stats update: ${error.message}`);
    }
  }, 600);

  if (typeof statsBroadcastTimer.unref === 'function') {
    statsBroadcastTimer.unref();
  }
}

function scheduleNewsValidationRefresh(event) {
  if (!event?.id) {
    return;
  }

  if (validationRefreshTimers.has(event.id)) {
    clearTimeout(validationRefreshTimers.get(event.id));
  }

  const timer = setTimeout(async () => {
    validationRefreshTimers.delete(event.id);

    try {
      const newsValidationService = require('./news-validation.service');
      await newsValidationService.refreshForEvent(event);
    } catch (error) {
      logger.warn(`Unable to refresh news validation for event ${event.id}: ${error.message}`);
    }
  }, 1200);

  validationRefreshTimers.set(event.id, timer);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

module.exports = { list, getById, getNearby, getStats, create, update, enrichEvent, toGeoJson };
