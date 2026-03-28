'use strict';

const axios = require('axios');
const { getAccessToken } = require('../utils/opensky-auth');
const aircraftRegistryRepo = require('../repositories/aircraft-registry.repository');
const logger = require('../utils/logger');

const METADATA_API = 'https://opensky-network.org/api/metadata/aircraft/icao';
const METADATA_TIMEOUT_MS = 8000;
const CONCURRENT_FETCHES = 3;

/**
 * Enrich a batch of ICAO24 addresses with aircraft metadata.
 * Returns a Map<icao24, metadataRow>.
 * Uses aircraft_registry_ref as a 30-day TTL cache.
 * Soft-fails on API errors (returns null for missing entries).
 */
async function enrichBatch(icao24List) {
  if (!icao24List || icao24List.length === 0) {
    return new Map();
  }

  const normalized = [...new Set(icao24List.map((id) => String(id || '').toLowerCase().trim()).filter(Boolean))];

  // Load all cached entries in one query
  const cached = await aircraftRegistryRepo.findByIcao24List(normalized);

  // Identify which ones need a fresh API fetch
  const stale = await aircraftRegistryRepo.findStaleOrMissing(normalized);

  if (stale.length > 0) {
    await fetchAndCacheBatch(stale);
    // Reload cache entries for the stale ones
    const refreshed = await aircraftRegistryRepo.findByIcao24List(stale);
    for (const [k, v] of refreshed) {
      cached.set(k, v);
    }
  }

  return cached;
}

async function fetchAndCacheBatch(icao24List) {
  // Process in chunks to limit concurrency
  for (let i = 0; i < icao24List.length; i += CONCURRENT_FETCHES) {
    const chunk = icao24List.slice(i, i + CONCURRENT_FETCHES);
    await Promise.all(chunk.map((icao24) => fetchAndCache(icao24)));
  }
}

async function fetchAndCache(icao24) {
  try {
    const token = await getAccessToken();
    const response = await axios.get(`${METADATA_API}/${encodeURIComponent(icao24)}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: METADATA_TIMEOUT_MS
    });

    const data = response.data;
    if (!data || typeof data !== 'object') {
      await storeNullEntry(icao24);
      return;
    }

    const row = normalizeMetadataResponse(icao24, data);
    await aircraftRegistryRepo.upsert(row);
  } catch (error) {
    if (error.response?.status === 404) {
      await storeNullEntry(icao24);
    } else {
      logger.warn(`Aircraft metadata fetch failed for ${icao24}: ${error.message}`);
      // Don't store a null entry on transient errors — allow retry next run
    }
  }
}

async function storeNullEntry(icao24) {
  // Store an empty row so we don't keep retrying for unknown aircraft within TTL
  await aircraftRegistryRepo.upsert({
    icao24,
    source: 'opensky_api_miss'
  });
}

function normalizeMetadataResponse(icao24, data) {
  return {
    icao24,
    registration:  cleanString(data.registration),
    operator:      cleanString(data.operator),
    operator_icao: cleanString(data.operatorIcao || data.operatorcallsign),
    owner:         cleanString(data.owner),
    aircraft_type: cleanString(data.icaoaircrafttype || data.typecode),
    source: 'opensky_api'
  };
}

function cleanString(value) {
  const s = String(value || '').trim();
  return s && s !== 'null' && s !== 'undefined' ? s : null;
}

module.exports = { enrichBatch };
