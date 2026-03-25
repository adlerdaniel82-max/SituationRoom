const eventRepository = require('../repositories/event.repository');
const eventTagRepository = require('../repositories/event-tag.repository');
const eventValidationRepository = require('../repositories/event-validation.repository');

const SECONDARY_SOURCES = new Set(['gdelt', 'reliefweb', 'ap', 'reuters', 'bbc']);
const PRIMARY_SOURCES = new Set(['usgs', 'gdacs', 'noaa_tsunami', 'firms', 'opensky']);
const VALIDATION_TAG_SOURCE = 'validation_prep';
const VALIDATION_WINDOW_HOURS = 72;
const MIN_MATCH_SCORE = 0.35;
const MAX_DISTANCE_KM = 1800;
const MAX_QUERY_TERMS = 8;
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'over', 'near', 'after',
  'into', 'onto', 'amid', 'global', 'green', 'orange', 'red', 'report', 'reported',
  'magnitude', 'depth', 'detected', 'warning', 'watch', 'advisory', 'bulletin',
  'north', 'south', 'east', 'west', 'region', 'km'
]);

async function refreshForEvent(event) {
  const normalized = normalizeEvent(event);
  if (!normalized) {
    return { status: 'skipped' };
  }

  if (PRIMARY_SOURCES.has(normalized.source)) {
    return validatePrimaryEvent(normalized);
  }

  if (SECONDARY_SOURCES.has(normalized.source)) {
    return refreshPrimariesForSecondaryEvent(normalized);
  }

  return { status: 'ignored_source', source: normalized.source };
}

async function validatePrimaryEvent(event) {
  if (!PRIMARY_SOURCES.has(event.source)) {
    return { status: 'unsupported_source', source: event.source };
  }

  const context = buildValidationContext(event);
  const secondaryCandidates = await eventValidationRepository.listCandidateSecondaryEvents(
    hoursFrom(event.timestamp, -VALIDATION_WINDOW_HOURS),
    hoursFrom(event.timestamp, VALIDATION_WINDOW_HOURS)
  );

  await eventTagRepository.deleteByEventIdAndSource(event.id, VALIDATION_TAG_SOURCE);
  await persistValidationTags(event.id, context);
  await eventValidationRepository.deleteByPrimaryEventId(event.id);

  const rankedMatches = [];

  for (const candidate of secondaryCandidates.map(normalizeEvent).filter(Boolean)) {
    const match = buildValidationMatch(event, candidate, context);
    if (!match || match.matchScore < MIN_MATCH_SCORE) {
      continue;
    }

    await eventValidationRepository.upsertValidationMatch(match);
    rankedMatches.push(match);
  }

  rankedMatches.sort((left, right) => right.matchScore - left.matchScore);
  const summary = buildValidationSummary(context, rankedMatches);
  const nextData = {
    ...(event.data && typeof event.data === 'object' && !Array.isArray(event.data) ? event.data : {}),
    validation: summary
  };

  await eventRepository.update(event.id, {
    data: nextData,
    updated_at: event.updated_at || new Date()
  });

  return {
    status: 'validated',
    eventId: event.id,
    query: context.queryText,
    matches: rankedMatches.length,
    bestMatchScore: summary.best_match_score
  };
}

async function refreshPrimariesForSecondaryEvent(event) {
  const primaryCandidates = await eventValidationRepository.listCandidatePrimaryEvents(
    hoursFrom(event.timestamp, -VALIDATION_WINDOW_HOURS),
    hoursFrom(event.timestamp, VALIDATION_WINDOW_HOURS)
  );

  let refreshed = 0;

  for (const candidate of primaryCandidates.map(normalizeEvent).filter(Boolean)) {
    if (!shouldRevalidatePrimaryForSecondary(candidate, event)) {
      continue;
    }

    await validatePrimaryEvent(candidate);
    refreshed += 1;
  }

  return {
    status: 'related_primaries_refreshed',
    secondaryEventId: event.id,
    refreshed
  };
}

async function listValidationMatches(eventId, limit = 20) {
  const rows = await eventValidationRepository.listByPrimaryEventId(eventId, limit);
  return rows.map((row) => ({
    ...row,
    query_terms: parseJson(row.query_terms) || [],
    signal_data: parseJson(row.signal_data) || {},
    secondary_data: parseJson(row.secondary_data) || null
  }));
}

function buildValidationContext(event) {
  const data = event.data && typeof event.data === 'object' ? event.data : {};
  const typeTerms = getTypeTerms(event.type);
  const countryTerms = collectCountryTerms(event, data);
  const placeTerms = collectPlaceTerms(event, data)
    .filter((term) => !countryTerms.includes(term));
  const magnitudeTerms = collectMagnitudeTerms(event);

  const queryTerms = uniqueNormalized([
    ...typeTerms,
    ...countryTerms,
    ...placeTerms,
    ...magnitudeTerms
  ]).slice(0, MAX_QUERY_TERMS);

  return {
    typeTerms,
    countryTerms,
    placeTerms,
    magnitudeTerms,
    queryTerms,
    queryText: queryTerms.join(' ')
  };
}

async function persistValidationTags(eventId, context) {
  for (const tag of context.typeTerms) {
    await eventTagRepository.upsertTag({
      eventId,
      tagType: 'event_type',
      tag,
      source: VALIDATION_TAG_SOURCE,
      confidence: 1
    });
  }

  for (const tag of context.countryTerms) {
    await eventTagRepository.upsertTag({
      eventId,
      tagType: 'country_term',
      tag,
      source: VALIDATION_TAG_SOURCE,
      confidence: 0.9
    });
  }

  for (const tag of context.placeTerms) {
    await eventTagRepository.upsertTag({
      eventId,
      tagType: 'place_term',
      tag,
      source: VALIDATION_TAG_SOURCE,
      confidence: 0.7
    });
  }

  for (const tag of context.queryTerms) {
    await eventTagRepository.upsertTag({
      eventId,
      tagType: 'query_term',
      tag,
      source: VALIDATION_TAG_SOURCE,
      confidence: 0.8
    });
  }
}

function buildValidationMatch(primaryEvent, secondaryEvent, context) {
  if (!SECONDARY_SOURCES.has(secondaryEvent.source)) {
    return null;
  }

  const secondaryTextTerms = collectSecondaryTextTerms(secondaryEvent);
  const hazardSignal = calculateOverlapScore(context.typeTerms, secondaryTextTerms);
  const placeSignal = calculateOverlapScore([
    ...context.placeTerms,
    ...context.magnitudeTerms
  ], secondaryTextTerms);
  const keywordSignal = clamp((hazardSignal * 0.75) + (placeSignal * 0.25));
  const primaryCountryTerms = uniqueNormalized(context.countryTerms);
  const secondaryCountryTerms = collectSecondaryCountryTerms(secondaryEvent);
  const countrySignal = calculateOverlapScore(primaryCountryTerms, secondaryCountryTerms);

  if (hazardSignal === 0 && placeSignal === 0) {
    return null;
  }

  const hoursDistance = Math.abs(new Date(primaryEvent.timestamp) - new Date(secondaryEvent.timestamp)) / (1000 * 60 * 60);
  const timeSignal = clamp(1 - (hoursDistance / VALIDATION_WINDOW_HOURS));
  const distanceKm = calculateDistance(primaryEvent.lat, primaryEvent.lon, secondaryEvent.lat, secondaryEvent.lon);
  const locationSignal = Number.isFinite(distanceKm) ? clamp(1 - (distanceKm / MAX_DISTANCE_KM)) : 0;
  const publisherCount = getPublisherCount(secondaryEvent);
  const articleCount = getArticleCount(secondaryEvent);
  const publisherSignal = clamp(Math.min(publisherCount / 8, 1));
  const articleSignal = clamp(Math.min(articleCount / 12, 1));

  const matchScore = clamp(
    keywordSignal * 0.3
    + countrySignal * 0.18
    + timeSignal * 0.18
    + locationSignal * 0.16
    + publisherSignal * 0.1
    + articleSignal * 0.08
  );

  return {
    primaryEventId: primaryEvent.id,
    secondaryEventId: secondaryEvent.id,
    secondarySource: secondaryEvent.source,
    queryText: context.queryText,
    queryTerms: context.queryTerms,
    matchScore,
    timeSignal,
    locationSignal,
    countrySignal,
    keywordSignal,
    publisherSignal,
    articleSignal,
    hoursDistance: round(hoursDistance),
    distanceKm: Number.isFinite(distanceKm) ? round(distanceKm) : null,
    publisherCount,
    articleCount,
    signalData: {
      primary_event_type: primaryEvent.type,
      primary_country_terms: primaryCountryTerms,
      secondary_country_terms: secondaryCountryTerms,
      hazard_signal: hazardSignal,
      place_signal: placeSignal,
      overlapping_terms: intersectTerms(context.queryTerms, secondaryTextTerms).slice(0, 10)
    }
  };
}

function buildValidationSummary(context, matches) {
  const matchedSources = Array.from(new Set(matches.map((match) => match.secondarySource)));
  const bestMatch = matches[0] || null;

  return {
    query: context.queryText,
    query_terms: context.queryTerms,
    total_matches: matches.length,
    matched_sources: matchedSources,
    best_match_score: bestMatch ? bestMatch.matchScore : 0,
    strongest_source: bestMatch ? bestMatch.secondarySource : null,
    publisher_signal_max: maxOf(matches, 'publisherSignal'),
    article_signal_max: maxOf(matches, 'articleSignal'),
    time_signal_max: maxOf(matches, 'timeSignal'),
    location_signal_max: maxOf(matches, 'locationSignal'),
    country_signal_max: maxOf(matches, 'countrySignal'),
    top_matches: matches.slice(0, 3).map((match) => ({
      secondary_event_id: match.secondaryEventId,
      secondary_source: match.secondarySource,
      match_score: match.matchScore,
      keyword_signal: match.keywordSignal,
      publisher_signal: match.publisherSignal,
      article_signal: match.articleSignal
    })),
    last_validated_at: new Date().toISOString()
  };
}

function shouldRevalidatePrimaryForSecondary(primaryEvent, secondaryEvent) {
  const hoursDistance = Math.abs(new Date(primaryEvent.timestamp) - new Date(secondaryEvent.timestamp)) / (1000 * 60 * 60);
  if (hoursDistance > VALIDATION_WINDOW_HOURS) {
    return false;
  }

  const distanceKm = calculateDistance(primaryEvent.lat, primaryEvent.lon, secondaryEvent.lat, secondaryEvent.lon);
  if (Number.isFinite(distanceKm) && distanceKm <= MAX_DISTANCE_KM) {
    return true;
  }

  const primaryCountries = collectCountryTerms(primaryEvent, primaryEvent.data || {});
  const secondaryCountries = collectSecondaryCountryTerms(secondaryEvent);
  return intersectTerms(primaryCountries, secondaryCountries).length > 0;
}

function normalizeEvent(event) {
  if (!event) {
    return null;
  }

  const data = parseJson(event.data);
  return {
    ...event,
    data,
    lat: toNumber(event.lat),
    lon: toNumber(event.lon),
    magnitude: toNullableNumber(event.magnitude ?? data?.magnitude ?? data?.normalizedSeverity),
    timestamp: event.timestamp ? new Date(event.timestamp) : null
  };
}

function collectCountryTerms(event, data) {
  const candidates = [];

  if (typeof data.country === 'string') {
    candidates.push(data.country);
  }

  if (typeof data.iso3 === 'string') {
    candidates.push(data.iso3);
  }

  if (typeof data.affected_region === 'string') {
    candidates.push(data.affected_region);
  }

  if (typeof data.place === 'string') {
    candidates.push(data.place);
  }

  candidates.push(event.title);

  return uniqueNormalized(
    candidates.flatMap((value) => tokenize(value).filter((term) => term.length >= 3))
  );
}

function collectPlaceTerms(event, data) {
  return uniqueNormalized([
    ...tokenize(data.place),
    ...tokenize(data.affected_region),
    ...tokenize(event.title).filter((term) => !STOP_WORDS.has(term))
  ]).filter((term) => term.length >= 4);
}

function collectMagnitudeTerms(event) {
  if (!Number.isFinite(event.magnitude)) {
    return [];
  }

  const rounded = Math.round(event.magnitude * 10) / 10;
  const major = Math.floor(event.magnitude);
  return uniqueNormalized([String(rounded), String(major)]);
}

function collectSecondaryTextTerms(event) {
  const data = event.data && typeof event.data === 'object' ? event.data : {};
  const textParts = [
    event.title,
    event.type,
    event.url,
    data.description,
    data.body_html,
    data.body,
    data.attention_country,
    data.affected_region,
    ...(Array.isArray(data.country) ? data.country.map((item) => item?.name || item?.shortname || '') : []),
    ...(Array.isArray(data.disaster) ? data.disaster.map((item) => item?.name || item?.type || '') : []),
    ...(Array.isArray(data.articles) ? data.articles.flatMap((article) => [article?.title, article?.domain, article?.source_country]) : [])
  ];

  return uniqueNormalized(textParts.flatMap((value) => tokenize(value)));
}

function collectSecondaryCountryTerms(event) {
  const data = event.data && typeof event.data === 'object' ? event.data : {};
  const terms = [];

  if (typeof data.attention_country === 'string') {
    terms.push(data.attention_country);
  }
  if (typeof data.attention_country_alpha2 === 'string') {
    terms.push(data.attention_country_alpha2);
  }
  if (typeof data.attention_country_alpha3 === 'string') {
    terms.push(data.attention_country_alpha3);
  }

  if (Array.isArray(data.country)) {
    terms.push(...data.country.flatMap((item) => [item?.name, item?.shortname, item?.iso3]));
  }

  return uniqueNormalized(terms.flatMap((value) => tokenize(value)));
}

function getTypeTerms(type) {
  switch (String(type || '').toLowerCase()) {
    case 'earthquake':
      return ['earthquake', 'seismic', 'quake'];
    case 'tsunami':
      return ['tsunami', 'wave', 'warning'];
    case 'flood':
      return ['flood', 'flooding', 'inundation'];
    case 'fire':
      return ['fire', 'wildfire', 'blaze'];
    case 'volcano':
      return ['volcano', 'eruption', 'ash'];
    case 'conflict':
      return ['conflict', 'airstrike', 'attack', 'missile', 'drone'];
    case 'aviation':
      return ['aircraft', 'flight', 'aviation', 'airspace'];
    case 'disaster':
      return ['disaster', 'emergency', 'evacuation'];
    default:
      return [String(type || 'incident').toLowerCase()];
  }
}

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term && term.length >= 3 && !STOP_WORDS.has(term));
}

function uniqueNormalized(values) {
  return Array.from(new Set((values || []).map((value) => String(value || '').toLowerCase().trim()).filter(Boolean)));
}

function calculateOverlapScore(left, right) {
  const a = uniqueNormalized(left);
  const b = uniqueNormalized(right);
  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const overlap = intersectTerms(a, b).length;
  return clamp(overlap / Math.max(Math.min(a.length, b.length), 1));
}

function intersectTerms(left, right) {
  const rightSet = new Set(uniqueNormalized(right));
  return uniqueNormalized(left).filter((term) => rightSet.has(term));
}

function getPublisherCount(event) {
  const data = event.data && typeof event.data === 'object' ? event.data : {};
  if (event.source === 'gdelt') {
    return Number(data.distinct_domains || 0);
  }

  if (event.source === 'reliefweb') {
    return Array.isArray(data.source) ? data.source.length : 0;
  }

  return 0;
}

function getArticleCount(event) {
  const data = event.data && typeof event.data === 'object' ? event.data : {};
  if (event.source === 'gdelt') {
    return Number(data.article_count || 0);
  }

  if (event.source === 'reliefweb') {
    return 1;
  }

  return 0;
}

function maxOf(matches, key) {
  if (!matches.length) {
    return 0;
  }

  return round(Math.max(...matches.map((match) => Number(match[key]) || 0)));
}

function hoursFrom(date, offsetHours) {
  return new Date(new Date(date).getTime() + (offsetHours * 60 * 60 * 1000));
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) {
    return null;
  }

  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseJson(value) {
  if (!value || typeof value !== 'string') {
    return value && typeof value === 'object' ? value : {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(value, 1));
}

function round(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 10000) / 10000;
}

module.exports = {
  refreshForEvent,
  validatePrimaryEvent,
  listValidationMatches,
  buildValidationContext
};
