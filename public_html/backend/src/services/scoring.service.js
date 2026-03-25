const config = require('../config/env');
const distanceService = require('../utils/distance');

const SOURCE_CONFIDENCE_SCORES = {
  usgs: 0.96,
  noaa_tsunami: 0.93,
  gdacs: 0.84,
  firms: 0.56,
  acled: 0.78,
  reliefweb: 0.62,
  gdelt: 0.44,
  opensky: 0.58,
  ap: 0.9,
  reuters: 0.92,
  bbc: 0.86
};

const TYPE_BASE_SEVERITY = {
  earthquake: 0.35,
  tsunami: 0.98,
  volcano: 0.65,
  flood: 0.58,
  fire: 0.46,
  conflict: 0.74,
  humanitarian: 0.38,
  aviation: 0.32,
  disaster: 0.5,
  other: 0.2
};

async function calculate(eventData) {
  const detailed = await calculateDetailed(eventData);
  return detailed.score;
}

async function calculateDetailed(eventData) {
  const normalizedEvent = normalizeEventData(eventData);

  const sourceConfidence = calculateSourceConfidence(normalizedEvent);
  const eventSeverity = calculateEventSeverity(normalizedEvent);
  const validationScore = calculateValidationScore(normalizedEvent);
  const attentionScore = calculateAttentionScore(normalizedEvent);

  const score = clampScore(
    sourceConfidence * 0.2
    + eventSeverity * 0.55
    + validationScore * 0.15
    + attentionScore * 0.1
  );

  return {
    score,
    source_confidence: sourceConfidence,
    event_severity: eventSeverity,
    validation_score: validationScore,
    attention_score: attentionScore
  };
}

function calculateSourceConfidence(eventData) {
  const baseScore = SOURCE_CONFIDENCE_SCORES[eventData.source] ?? 0.5;

  if (eventData.source === 'gdacs') {
    const alertLevel = String(eventData.data?.alertLevel || '').toLowerCase();
    if (alertLevel === 'red') {
      return clampScore(baseScore + 0.1);
    }
    if (alertLevel === 'orange') {
      return clampScore(baseScore + 0.06);
    }
  }

  return clampScore(baseScore);
}

function calculateEventSeverity(eventData) {
  const baseSeverity = TYPE_BASE_SEVERITY[eventData.type] ?? TYPE_BASE_SEVERITY.other;
  const magnitudeScore = normalizeMagnitude(eventData);
  const populationScore = normalizePopulation(eventData.affectedPopulation);
  const alertScore = normalizeAlertLevel(eventData.data?.alertLevel);
  const recencyScore = normalizeRecency(eventData.timestamp);

  return clampScore(
    baseSeverity * 0.38
    + magnitudeScore * 0.22
    + populationScore * 0.24
    + alertScore * 0.08
    + recencyScore * 0.08
  );
}

function calculateValidationScore(eventData) {
  let score = 0;

  if (Number.isFinite(eventData.lat) && Number.isFinite(eventData.lon)) {
    score += 0.2;
  }

  if (eventData.timestamp) {
    score += 0.15;
  }

  if (eventData.url) {
    score += 0.15;
  }

  if (eventData.data?.source_event_id || eventData.data?.id) {
    score += 0.2;
  }

  if (
    eventData.magnitude !== null
    || eventData.affectedPopulation !== null
    || eventData.data?.alertLevel
    || eventData.data?.article_count
  ) {
    score += 0.15;
  }

  if (['usgs', 'noaa_tsunami', 'gdacs', 'opensky'].includes(eventData.source)) {
    score += 0.15;
  }

  return clampScore(score);
}

function calculateAttentionScore(eventData) {
  if (eventData.source === 'gdelt') {
    const articleCount = Number(eventData.data?.article_count || 0);
    const distinctDomains = Number(eventData.data?.distinct_domains || 0);
    return clampScore(
      Math.min(articleCount / 15, 1) * 0.7
      + Math.min(distinctDomains / 10, 1) * 0.3
    );
  }

  if (eventData.source === 'reliefweb') {
    const hasCountry = Array.isArray(eventData.data?.country) && eventData.data.country.length > 0;
    const hasDisaster = Array.isArray(eventData.data?.disaster) && eventData.data.disaster.length > 0;
    return clampScore(0.35 + (hasCountry ? 0.15 : 0) + (hasDisaster ? 0.2 : 0));
  }

  if (['ap', 'reuters', 'bbc'].includes(eventData.source)) {
    const trustBase = Number(eventData.data?.trust_base_score || 0.75);
    const hasDescription = String(eventData.data?.description || '').trim().length > 60;
    const hasPublisherMeta = Boolean(eventData.data?.editorial_tier || eventData.data?.ownership_type);
    return clampScore((trustBase * 0.55) + (hasDescription ? 0.2 : 0) + (hasPublisherMeta ? 0.15 : 0));
  }

  return 0;
}

function normalizeEventData(eventData = {}) {
  const data = eventData.data && typeof eventData.data === 'object' ? eventData.data : {};
  return {
    ...eventData,
    data,
    source: String(eventData.source || data.source || '').trim(),
    type: String(eventData.type || data.type || 'other').trim(),
    lat: toNullableNumber(eventData.lat ?? data.lat),
    lon: toNullableNumber(eventData.lon ?? data.lon),
    magnitude: toNullableNumber(eventData.magnitude ?? data.magnitude ?? data.normalizedSeverity),
    affectedPopulation: toNullableNumber(
      eventData.affectedPopulation
      ?? eventData.affected_population
      ?? data.affectedPopulation
      ?? data.affected_population
    ),
    timestamp: eventData.timestamp ?? data.timestamp ?? null,
    url: eventData.url || data.url || null
  };
}

function normalizeMagnitude(eventData) {
  if (eventData.magnitude === null) {
    return 0;
  }

  switch (eventData.type) {
    case 'earthquake':
    case 'tsunami':
      return clampScore(eventData.magnitude / 10);
    case 'aviation':
      return clampScore(eventData.magnitude / 10);
    default:
      return clampScore(eventData.magnitude / 100);
  }
}

function normalizePopulation(affectedPopulation) {
  if (affectedPopulation === null) {
    return 0;
  }

  return clampScore(Math.log10(affectedPopulation + 1) / 7);
}

function normalizeAlertLevel(alertLevel) {
  switch (String(alertLevel || '').toLowerCase()) {
    case 'red':
      return 1;
    case 'orange':
      return 0.75;
    case 'green':
      return 0.35;
    default:
      return 0;
  }
}

function normalizeRecency(timestamp) {
  if (!timestamp) {
    return 0;
  }

  const hoursSinceEvent = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
  return clampScore(Math.max(0, 1 - hoursSinceEvent / 72));
}

function clampScore(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(Number(value), 1));
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateCorrelationScore(event1, event2) {
  const distanceWeight = config.scoring.weightDistance;
  const timeWeight = config.scoring.weightTime;
  const typeWeight = config.scoring.weightType;

  // Distance correlation
  const distance = distanceService.calculate(
    event1.lat, event1.lon,
    event2.lat, event2.lon
  );
  const distanceScore = Math.max(0, 1 - distance / 500);

  // Time correlation
  const timeDiff = Math.abs(new Date(event1.timestamp) - new Date(event2.timestamp)) / (1000 * 60 * 60);
  const timeScore = Math.max(0, 1 - timeDiff / 48);

  // Type correlation
  const typeScore = event1.type === event2.type ? 1 : 0.3;

  return (distanceScore * distanceWeight) + (timeScore * timeWeight) + (typeScore * typeWeight);
}

module.exports = { calculate, calculateDetailed, calculateCorrelationScore };
