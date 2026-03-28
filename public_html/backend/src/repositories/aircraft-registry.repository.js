'use strict';

const { query } = require('../config/db');

const METADATA_TTL_DAYS = 30;

async function findByIcao24(icao24) {
  const rows = await query(
    'SELECT * FROM aircraft_registry_ref WHERE icao24 = ? LIMIT 1',
    [String(icao24 || '').toLowerCase().trim()]
  );
  return rows[0] || null;
}

async function findByIcao24List(icao24Array) {
  if (!icao24Array || icao24Array.length === 0) {
    return new Map();
  }

  const normalized = icao24Array.map((id) => String(id || '').toLowerCase().trim()).filter(Boolean);
  if (normalized.length === 0) {
    return new Map();
  }

  const placeholders = normalized.map(() => '?').join(', ');
  const rows = await query(
    `SELECT * FROM aircraft_registry_ref WHERE icao24 IN (${placeholders})`,
    normalized
  );

  const result = new Map();
  for (const row of rows) {
    result.set(row.icao24, row);
  }
  return result;
}

async function findStaleOrMissing(icao24Array) {
  if (!icao24Array || icao24Array.length === 0) {
    return [];
  }

  const normalized = icao24Array.map((id) => String(id || '').toLowerCase().trim()).filter(Boolean);
  if (normalized.length === 0) {
    return [];
  }

  // Fetch which ones exist and are fresh
  const placeholders = normalized.map(() => '?').join(', ');
  const freshRows = await query(
    `SELECT icao24 FROM aircraft_registry_ref
      WHERE icao24 IN (${placeholders})
        AND last_fetched >= DATE_SUB(NOW(), INTERVAL ${METADATA_TTL_DAYS} DAY)`,
    normalized
  );

  const freshSet = new Set(freshRows.map((r) => r.icao24));
  return normalized.filter((id) => !freshSet.has(id));
}

async function upsert(row) {
  const icao24 = String(row.icao24 || '').toLowerCase().trim();
  if (!icao24) {
    return;
  }

  await query(
    `INSERT INTO aircraft_registry_ref
       (icao24, registration, operator, operator_icao, owner, aircraft_type,
        category_tag, confidence, source, notes, is_active, last_fetched)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
     ON DUPLICATE KEY UPDATE
       registration  = COALESCE(VALUES(registration),  registration),
       operator      = COALESCE(VALUES(operator),      operator),
       operator_icao = COALESCE(VALUES(operator_icao), operator_icao),
       owner         = COALESCE(VALUES(owner),         owner),
       aircraft_type = COALESCE(VALUES(aircraft_type), aircraft_type),
       last_fetched  = NOW(),
       updated_at    = NOW()`,
    [
      icao24,
      row.registration || null,
      row.operator     || null,
      row.operator_icao || null,
      row.owner        || null,
      row.aircraft_type || null,
      row.category_tag  || null,
      row.confidence    != null ? Number(row.confidence) : null,
      row.source        || 'opensky_api',
      row.notes         || null
    ]
  );
}

module.exports = { findByIcao24, findByIcao24List, findStaleOrMissing, upsert };
