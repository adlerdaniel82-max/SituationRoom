const axios = require('axios');
const env = require('../config/env');
const { MANUAL_INDUSTRIAL_HEAT_ZONES } = require('../config/firms-industrial-hotspots');
const eventRepository = require('../repositories/event.repository');
const eventService = require('../services/event.service');
const logger = require('../utils/logger');

const FIRMS_API_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';
const GLOBAL_AREA = '-180,-90,180,90';
const MAX_EVENTS_PER_RUN = 150;
const INDUSTRIAL_BUCKET_PRECISION = 2;
const INDUSTRIAL_LOOKBACK_DAYS = 21;
const INDUSTRIAL_MIN_EVENTS = 8;
const INDUSTRIAL_MIN_DISTINCT_DAYS = 4;

async function run() {
  logger.info('Running FIRMS importer');

  const apiKey = env.apiKeys.firms;
  if (!apiKey) {
    throw new Error('FIRMS_API_KEY is missing');
  }

  const dataset = env.sourceOptions.firms.dataset;
  const dayRange = env.sourceOptions.firms.dayRange;
  const url = `${FIRMS_API_BASE}/${encodeURIComponent(apiKey)}/${dataset}/${GLOBAL_AREA}/${dayRange}`;

  try {
    const industrialHeatBuckets = await loadIndustrialHeatBuckets();
    const response = await axios.get(url, {
      timeout: 30000,
      responseType: 'text'
    });

    const fires = parseFirmsCsv(response.data)
      .filter((fire) => Number.isFinite(fire.latitude) && Number.isFinite(fire.longitude))
      .slice(0, MAX_EVENTS_PER_RUN);

    let imported = 0;
    let duplicates = 0;
    let suppressedIndustrial = 0;

    for (const fire of fires) {
      if (isPersistentIndustrialHeat(fire, industrialHeatBuckets) || isManualIndustrialHeat(fire)) {
        suppressedIndustrial += 1;
        continue;
      }

      const event = {
        title: `Fire detected at ${fire.latitude.toFixed(2)}, ${fire.longitude.toFixed(2)}`,
        type: 'fire',
        source: 'firms',
        lat: fire.latitude,
        lon: fire.longitude,
        magnitude: fire.brightness,
        timestamp: parseFirmsTimestamp(fire.acq_date, fire.acq_time),
        data: fire
      };

      const result = await eventService.create(event);
      if (result.isDuplicate) {
        duplicates += 1;
      } else {
        imported += 1;
      }
    }

    logger.info(`FIRMS importer completed: ${imported} imported, ${duplicates} duplicates, ${suppressedIndustrial} industrial_heat suppressed`);
    return {
      imported,
      duplicates,
      suppressedIndustrial,
      total: fires.length,
      dataset,
      dayRange
    };
  } catch (error) {
    const detail = error.response?.data
      ? String(error.response.data).slice(0, 200)
      : error.message;
    logger.error('FIRMS importer failed:', detail);
    throw error;
  }
}

async function loadIndustrialHeatBuckets() {
  const rows = await eventRepository.listPersistentSourceBuckets('firms', {
    lookbackDays: INDUSTRIAL_LOOKBACK_DAYS,
    bucketPrecision: INDUSTRIAL_BUCKET_PRECISION,
    minEvents: INDUSTRIAL_MIN_EVENTS,
    minDistinctDays: INDUSTRIAL_MIN_DISTINCT_DAYS
  });

  return new Set(
    rows.map((row) => buildBucketKey(row.lat_bucket, row.lon_bucket))
  );
}

function parseFirmsCsv(csvData) {
  const rows = String(csvData || '')
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  if (rows.length < 2) {
    return [];
  }

  const headers = parseCsvLine(rows[0]);

  return rows.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const fire = {};

    headers.forEach((header, index) => {
      fire[header] = values[index] ?? '';
    });

    fire.latitude = Number(fire.latitude);
    fire.longitude = Number(fire.longitude);
    fire.brightness = toNullableNumber(fire.bright_ti4 || fire.bright_t31 || fire.brightness);

    return fire;
  });
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseFirmsTimestamp(acqDate, acqTime) {
  const time = String(acqTime || '0000').padStart(4, '0');
  const hour = time.slice(0, 2);
  const minute = time.slice(2, 4);
  return new Date(`${acqDate}T${hour}:${minute}:00Z`);
}

function isPersistentIndustrialHeat(fire, industrialHeatBuckets) {
  return industrialHeatBuckets.has(buildBucketKey(fire.latitude, fire.longitude));
}

function isManualIndustrialHeat(fire) {
  return MANUAL_INDUSTRIAL_HEAT_ZONES.some((zone) => {
    const radiusKm = Number(zone.radiusKm) || 0;
    if (!Number.isFinite(zone.lat) || !Number.isFinite(zone.lon) || radiusKm <= 0) {
      return false;
    }

    return distanceKm(fire.latitude, fire.longitude, zone.lat, zone.lon) <= radiusKm;
  });
}

function buildBucketKey(lat, lon) {
  return `${Number(lat).toFixed(INDUSTRIAL_BUCKET_PRECISION)}:${Number(lon).toFixed(INDUSTRIAL_BUCKET_PRECISION)}`;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value) {
  return value * (Math.PI / 180);
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = { run };
