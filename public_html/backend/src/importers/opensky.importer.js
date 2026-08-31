'use strict';

const axios = require('axios');
const eventService = require('../services/event.service');
const aircraftMetadataService = require('../services/aircraft-metadata.service');
const aircraftClassifierService = require('../services/aircraft-classifier.service');
const airMissionScoreRepo = require('../repositories/air-mission-score.repository');
const logger = require('../utils/logger');
const { getAccessToken } = require('../utils/opensky-auth');

const OPENSKY_API = 'https://opensky-network.org/api/states/all';
const MAX_EVENTS_PER_RUN = 75;
// Maximum pre-filter candidates to enrich with metadata (rate-limit guard)
const MAX_METADATA_BATCH = 150;

// ADS-B category labels (used as pre-filter gate only)
const CATEGORY_LABELS = {
  4: 'military_size_large',
  5: 'military_size_high_vortex',
  6: 'military_size_heavy',
  7: 'military_size_high_performance',
  14: 'unmanned_aerial_vehicle',
  15: 'space_or_trans_atmospheric_vehicle',
  16: 'surface_emergency_vehicle'
};

const UNKNOWN_CALLSIGN_PATTERNS = [/^UNKNOWN$/i, /^UNKWN$/i, /^UNK$/i, /^\?+$/];

// Score threshold below which no event is created
const MIN_SCORE_FOR_EVENT = 0.30;

// Per-category event caps for a single run
const CATEGORY_EVENT_CAPS = {
  military_transport:         15,
  tanker:                      8,
  surveillance:                8,
  military:                   10,
  government:                 12,
  vip:                         5,
  police:                     10,
  coast_guard:                 8,
  sar:                         8,
  unknown_but_interesting:    20,
  // ADS-B-only fallbacks (aircraft that pass pre-filter but score < threshold)
  unmanned_aerial_vehicle:    20,
  surface_emergency_vehicle:  12,
  space_or_trans_atmospheric_vehicle: 6
};

async function run() {
  logger.info('Running OpenSky importer');
  const warningSummary = createWarningSummary();

  try {
    const states = await fetchStates();
    let imported = 0;
    let duplicates = 0;

    // ── Step 1: normalize + ADS-B pre-filter ─────────────────────────
    const preFiltered = states
      .map(normalizeState)
      .filter(Boolean)
      .map(adsb_classify)
      .filter(Boolean);

    // ── Step 2: metadata enrichment (batch, capped) ───────────────────
    const enrichCandidates = preFiltered.slice(0, MAX_METADATA_BATCH);
    const icao24List = enrichCandidates.map((a) => a.icao24);
    const metadataMap = await loadMetadataSafely(icao24List);

    // ── Step 3: score every candidate ────────────────────────────────
    const scored = [];
    for (const aircraft of enrichCandidates) {
      const metadata = metadataMap.get(aircraft.icao24) || null;
      const classification = await classifySafely(aircraft, metadata, warningSummary);
      scored.push({ aircraft, metadata, classification });
    }

    // ── Step 4: filter by minimum score, sort, cap ───────────────────
    const relevant = scored.filter(
      (item) => item.classification.confidence_level !== 'normal'
        || isAdsbOnlyKeeper(item.aircraft)
    );

    relevant.sort((a, b) => b.classification.score_total - a.classification.score_total);

    const selected = applyEventCaps(relevant, MAX_EVENTS_PER_RUN);

    // ── Step 5: create events ────────────────────────────────────────
    for (const { aircraft, metadata, classification } of selected) {
      const missionScoreId = await saveMissionScoreSafely(aircraft, metadata, classification, warningSummary);

      if (classification.score_total < MIN_SCORE_FOR_EVENT && !isAdsbOnlyKeeper(aircraft)) {
        continue;
      }

      const event = {
        title: buildTitle(aircraft, classification),
        type: 'aviation',
        source: 'opensky',
        lat: aircraft.latitude,
        lon: aircraft.longitude,
        magnitude: aircraft.altitude,
        timestamp: new Date(aircraft.timestamp * 1000),
        data: {
          ...aircraft,
          gov_category:   classification.category_primary,
          gov_score:      classification.score_total,
          gov_confidence: classification.confidence_level,
          gov_reasons:    classification.reasons,
          gov_operator:   metadata?.operator   || null,
          gov_owner:      metadata?.owner      || null,
          gov_type:       metadata?.aircraft_type || null,
          gov_registration: metadata?.registration || null
        }
      };

      const result = await eventService.create(event);
      if (result.isDuplicate) {
        duplicates += 1;
      } else {
        imported += 1;
        if (missionScoreId && result.id) {
          await airMissionScoreRepo.linkEvent(missionScoreId, result.id).catch(() => {});
        }
      }
    }

    logger.info(`OpenSky importer completed: ${imported} imported, ${duplicates} duplicates`);
    return { imported, duplicates, total: selected.length, sourceTotal: states.length };
  } catch (error) {
    logger.error('OpenSky importer failed:', error.message);
    throw error;
  } finally {
    logWarningSummary(warningSummary);
  }
}

// ─── Metadata + classifier helpers (soft-fail wrappers) ──────────────────────

async function loadMetadataSafely(icao24List) {
  try {
    return await aircraftMetadataService.enrichBatch(icao24List, { logPrefix: 'OpenSky aircraft metadata' });
  } catch (error) {
    logger.warn(`Aircraft metadata enrichment failed: ${error.message}`);
    return new Map();
  }
}

async function classifySafely(aircraft, metadata, warningSummary) {
  try {
    return await aircraftClassifierService.classifyAircraft(aircraft, metadata);
  } catch (error) {
    recordWarning(warningSummary.classification, error);
    return buildFallbackClassification(aircraft);
  }
}

async function saveMissionScoreSafely(aircraft, metadata, classification, warningSummary) {
  try {
    return await airMissionScoreRepo.insert({
      icao24:       aircraft.icao24,
      registration: metadata?.registration || null,
      callsign:     aircraft.callsign || null,
      observed_at:  new Date(aircraft.timestamp * 1000),
      operator:     metadata?.operator || null,
      owner:        metadata?.owner    || null,
      aircraft_type: metadata?.aircraft_type || null,
      lat:     aircraft.latitude,
      lon:     aircraft.longitude,
      altitude: aircraft.altitude,
      velocity: aircraft.velocity,
      heading:  aircraft.trueTrack,
      ...classification,
      reasons_json: classification.reasons
    });
  } catch (error) {
    recordWarning(warningSummary.missionScore, error);
    return null;
  }
}

function createWarningSummary() {
  return {
    classification: new Map(),
    missionScore: new Map()
  };
}

function recordWarning(summary, error) {
  const message = error?.message || 'Unknown error';
  summary.set(message, (summary.get(message) || 0) + 1);
}

function logWarningSummary(summary) {
  logWarningGroup('OpenSky aircraft classification', summary.classification);
  logWarningGroup('OpenSky mission score persistence', summary.missionScore);
}

function logWarningGroup(label, warnings) {
  for (const [message, count] of warnings) {
    logger.warn(`${label}: ${count} failures (${message})`);
  }
}

function buildFallbackClassification(aircraft) {
  // Minimal fallback when classifier fails: use ADS-B category
  const adsbCat = CATEGORY_LABELS[aircraft.category];
  return {
    score_total: adsbCat ? 0.35 : 0,
    confidence_level: adsbCat ? 'watchlist' : 'normal',
    category_primary: adsbCat || 'unknown_but_interesting',
    is_government: false,
    is_military: !!adsbCat,
    is_military_transport: false,
    is_surveillance: false,
    is_vip: false,
    reasons: { adsb_category_fallback: adsbCat || null }
  };
}

// ─── ADS-B pre-filter (gate for metadata enrichment) ─────────────────────────

function adsb_classify(aircraft) {
  // Keep all ADS-B military-size categories, UAVs, emergency vehicles
  if (aircraft.category !== null && CATEGORY_LABELS[aircraft.category]) {
    if (aircraft.category === 16 || isTrackableAirVehicle(aircraft)) {
      return { ...aircraft, adsb_class: CATEGORY_LABELS[aircraft.category] };
    }
  }

  // Keep aircraft with unknown/missing callsigns (potential military without squawk)
  if (isUnknownCallsign(aircraft.callsign) && isTrackableAirVehicle(aircraft)) {
    return { ...aircraft, adsb_class: aircraft.callsign ? 'unknown_callsign' : 'no_callsign' };
  }

  return null;
}

// Aircraft that should be kept even below the scoring threshold (ADS-B-only signals)
function isAdsbOnlyKeeper(aircraft) {
  return aircraft.category === 16 // surface emergency vehicle
    || aircraft.category === 14   // UAV
    || aircraft.category === 15;  // space vehicle
}

// ─── Event creation helpers ──────────────────────────────────────────────────

function buildTitle(aircraft, classification) {
  const label = aircraft.callsign || aircraft.icao24.toUpperCase();
  const categoryLabel = formatCategoryLabel(classification.category_primary);
  return `OpenSky ${categoryLabel}: ${label}`;
}

function formatCategoryLabel(category) {
  switch (category) {
    case 'government':          return 'Government Aircraft';
    case 'military_transport':  return 'Military Transport';
    case 'military':            return 'Military Aircraft';
    case 'tanker':              return 'Military Tanker';
    case 'surveillance':        return 'Surveillance Aircraft';
    case 'police':              return 'Police/Law Enforcement';
    case 'coast_guard':         return 'Coast Guard';
    case 'sar':                 return 'SAR/Rescue';
    case 'vip':                 return 'VIP/State Transport';
    case 'unmanned_aerial_vehicle': return 'Unmanned Aerial Vehicle';
    case 'surface_emergency_vehicle': return 'Surface Emergency Vehicle';
    case 'space_or_trans_atmospheric_vehicle': return 'Space/Trans-atmospheric Vehicle';
    default:                    return 'Aircraft';
  }
}

function applyEventCaps(items, maxTotal) {
  const counts = new Map();
  const selected = [];

  for (const item of items) {
    if (selected.length >= maxTotal) break;

    const cat = item.classification.category_primary || item.aircraft.adsb_class || 'unknown_but_interesting';
    const cap = CATEGORY_EVENT_CAPS[cat] ?? 10;
    const current = counts.get(cat) || 0;
    if (current >= cap) continue;

    counts.set(cat, current + 1);
    selected.push(item);
  }

  return selected;
}

// ─── OpenSky API ──────────────────────────────────────────────────────────────

async function fetchStates() {
  let accessToken = await getAccessToken();

  try {
    return await requestStates(accessToken);
  } catch (error) {
    if (error.response?.status !== 401) {
      throw error;
    }

    accessToken = await getAccessToken({ forceRefresh: true });
    return requestStates(accessToken);
  }
}

async function requestStates(accessToken) {
  const response = await axios.get(OPENSKY_API, {
    params: { extended: 1, lamin: -90, lamax: 90, lomin: -180, lomax: 180 },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 20000
  });

  return response.data?.states || [];
}

// ─── State normalization ──────────────────────────────────────────────────────

function normalizeState(state) {
  const [
    icao24, rawCallsign, originCountry, timePosition, lastContact,
    longitude, latitude, baroAltitude, onGround, velocity,
    trueTrack, verticalRate, sensors, geoAltitude, squawk, spi,
    positionSource, category
  ] = state;

  const normalized = {
    icao24,
    callsign:      String(rawCallsign || '').trim(),
    originCountry,
    timestamp:     Number(timePosition || lastContact || 0),
    longitude:     Number(longitude),
    latitude:      Number(latitude),
    altitude:      toNullableNumber(baroAltitude ?? geoAltitude),
    geoAltitude:   toNullableNumber(geoAltitude),
    baroAltitude:  toNullableNumber(baroAltitude),
    onGround:      Boolean(onGround),
    velocity:      toNullableNumber(velocity),
    trueTrack:     toNullableNumber(trueTrack),
    verticalRate:  toNullableNumber(verticalRate),
    sensors,
    squawk,
    spi,
    positionSource,
    category
  };

  if (!normalized.timestamp || !Number.isFinite(normalized.latitude) || !Number.isFinite(normalized.longitude)) {
    return null;
  }

  return normalized;
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

function isUnknownCallsign(callsign) {
  if (!callsign) return true;
  return UNKNOWN_CALLSIGN_PATTERNS.some((pattern) => pattern.test(callsign));
}

function isTrackableAirVehicle(aircraft) {
  return (
    !aircraft.onGround
    && (
      (aircraft.altitude !== null && aircraft.altitude >= 0)
      || (aircraft.velocity !== null && aircraft.velocity > 15)
    )
  );
}

function toNullableNumber(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = { run };
