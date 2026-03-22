const axios = require('axios');
const eventService = require('../services/event.service');
const logger = require('../utils/logger');
const { getAccessToken } = require('../utils/opensky-auth');

const OPENSKY_API = 'https://opensky-network.org/api/states/all';
const MAX_EVENTS_PER_RUN = 75;
// OpenSky state index 17: documented category values relevant for Situation Room.
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
const CLASSIFICATION_CAPS = {
  surface_emergency_vehicle: 12,
  space_or_trans_atmospheric_vehicle: 12,
  unmanned_aerial_vehicle: 20,
  military_size_large: 8,
  military_size_high_vortex: 8,
  military_size_heavy: 8,
  military_size_high_performance: 12,
  unknown_callsign: 20,
  no_callsign: 35
};

async function run() {
  logger.info('Running OpenSky importer');

  try {
    const states = await fetchStates();
    let imported = 0;
    let duplicates = 0;

    const interestingAircraft = states
      .map(normalizeState)
      .filter(Boolean)
      .map(classifyAircraft)
      .filter(Boolean)
      .sort(compareAircraftPriority)
    const selectedAircraft = applyClassificationCaps(interestingAircraft, MAX_EVENTS_PER_RUN);

    for (const aircraft of selectedAircraft) {
      const event = {
        title: buildTitle(aircraft),
        type: 'aviation',
        source: 'opensky',
        lat: aircraft.latitude,
        lon: aircraft.longitude,
        magnitude: aircraft.altitude,
        timestamp: new Date(aircraft.timestamp * 1000),
        data: aircraft
      };

      const result = await eventService.create(event);
      if (result.isDuplicate) {
        duplicates += 1;
      } else {
        imported += 1;
      }
    }

    logger.info(`OpenSky importer completed: ${imported} imported, ${duplicates} duplicates`);
    return { imported, duplicates, total: selectedAircraft.length, sourceTotal: states.length };
  } catch (error) {
    logger.error('OpenSky importer failed:', error.message);
    throw error;
  }
}

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
    params: {
      extended: 1,
      lamin: -90,
      lamax: 90,
      lomin: -180,
      lomax: 180
    },
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    timeout: 20000
  });

  return response.data?.states || [];
}

function normalizeState(state) {
  const [
    icao24,
    rawCallsign,
    originCountry,
    timePosition,
    lastContact,
    longitude,
    latitude,
    baroAltitude,
    onGround,
    velocity,
    trueTrack,
    verticalRate,
    sensors,
    geoAltitude,
    squawk,
    spi,
    positionSource,
    category
  ] = state;

  const normalized = {
    icao24,
    callsign: String(rawCallsign || '').trim(),
    originCountry,
    timestamp: Number(timePosition || lastContact || 0),
    longitude: Number(longitude),
    latitude: Number(latitude),
    altitude: toNullableNumber(baroAltitude ?? geoAltitude),
    geoAltitude: toNullableNumber(geoAltitude),
    baroAltitude: toNullableNumber(baroAltitude),
    onGround: Boolean(onGround),
    velocity: toNullableNumber(velocity),
    trueTrack: toNullableNumber(trueTrack),
    verticalRate: toNullableNumber(verticalRate),
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

function classifyAircraft(aircraft) {
  if (aircraft.category !== null && CATEGORY_LABELS[aircraft.category]) {
    if (aircraft.category === 16 || isTrackableAirVehicle(aircraft)) {
      if (isMilitarySizeCategory(aircraft.category) && isLikelyCommercialFlight(aircraft)) {
        return null;
      }

      return {
        ...aircraft,
        classification: CATEGORY_LABELS[aircraft.category]
      };
    }
  }

  if (isUnknownCallsign(aircraft.callsign) && isTrackableAirVehicle(aircraft)) {
    return {
      ...aircraft,
      classification: aircraft.callsign ? 'unknown_callsign' : 'no_callsign'
    };
  }

  return null;
}

function compareAircraftPriority(left, right) {
  const priority = getClassificationPriority(left.classification) - getClassificationPriority(right.classification);
  if (priority !== 0) {
    return priority;
  }

  const leftAltitude = left.altitude === null ? Number.POSITIVE_INFINITY : left.altitude;
  const rightAltitude = right.altitude === null ? Number.POSITIVE_INFINITY : right.altitude;
  if (leftAltitude !== rightAltitude) {
    return leftAltitude - rightAltitude;
  }

  return right.timestamp - left.timestamp;
}

function applyClassificationCaps(aircraft, maxItems) {
  const counts = new Map();
  const selected = [];

  for (const item of aircraft) {
    if (selected.length >= maxItems) {
      break;
    }

    const cap = CLASSIFICATION_CAPS[item.classification] ?? maxItems;
    const current = counts.get(item.classification) || 0;
    if (current >= cap) {
      continue;
    }

    counts.set(item.classification, current + 1);
    selected.push(item);
  }

  return selected;
}

function getClassificationPriority(classification) {
  switch (classification) {
    case 'surface_emergency_vehicle':
      return 1;
    case 'space_or_trans_atmospheric_vehicle':
      return 2;
    case 'unmanned_aerial_vehicle':
      return 3;
    case 'military_size_large':
    case 'military_size_high_vortex':
    case 'military_size_heavy':
    case 'military_size_high_performance':
      return 4;
    case 'unknown_callsign':
      return 5;
    case 'no_callsign':
      return 6;
    default:
      return 99;
  }
}

function isUnknownCallsign(callsign) {
  if (!callsign) {
    return true;
  }

  return UNKNOWN_CALLSIGN_PATTERNS.some((pattern) => pattern.test(callsign));
}

function isMilitarySizeCategory(category) {
  return category >= 4 && category <= 7;
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

function isLikelyCommercialFlight(aircraft) {
  if (!aircraft.callsign) {
    return false;
  }

  const looksLikeAirlineCallsign = /^[A-Z]{3}\d{1,4}[A-Z]{0,2}$/.test(aircraft.callsign);
  return looksLikeAirlineCallsign && aircraft.category !== 7;
}

function buildTitle(aircraft) {
  const label = aircraft.callsign || aircraft.icao24;
  const classificationLabel = formatClassification(aircraft.classification);
  return `OpenSky ${classificationLabel}: ${label}`;
}

function formatClassification(classification) {
  switch (classification) {
    case 'surface_emergency_vehicle':
      return 'Surface Emergency Vehicle';
    case 'space_or_trans_atmospheric_vehicle':
      return 'Space / Trans-atmospheric Vehicle';
    case 'unmanned_aerial_vehicle':
      return 'Unmanned Aerial Vehicle';
    case 'military_size_large':
    case 'military_size_high_vortex':
    case 'military_size_heavy':
    case 'military_size_high_performance':
      return 'Military-size Aircraft';
    case 'unknown_callsign':
      return 'Aircraft with Unknown Callsign';
    case 'no_callsign':
      return 'Aircraft without Callsign';
    default:
      return 'Aircraft';
  }
}

function toNullableNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = { run };
