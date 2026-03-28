'use strict';

const { query } = require('../config/db');

async function insert(row) {
  const result = await query(
    `INSERT INTO air_mission_scores
       (icao24, registration, callsign, observed_at, operator, owner, aircraft_type,
        lat, lon, altitude, velocity, heading,
        score_total, score_registry, score_operator, score_type, score_callsign, score_civilian_pen,
        is_government, is_military, is_military_transport, is_surveillance, is_vip,
        category_primary, confidence_level, reasons_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(row.icao24 || '').toLowerCase(),
      row.registration   || null,
      row.callsign       || null,
      row.observed_at    || new Date(),
      row.operator       || null,
      row.owner          || null,
      row.aircraft_type  || null,
      row.lat,
      row.lon,
      row.altitude       != null ? Number(row.altitude)      : null,
      row.velocity       != null ? Number(row.velocity)      : null,
      row.heading        != null ? Number(row.heading)       : null,
      Number(row.score_total      || 0),
      row.score_registry  != null ? Number(row.score_registry)  : null,
      row.score_operator  != null ? Number(row.score_operator)  : null,
      row.score_type      != null ? Number(row.score_type)      : null,
      row.score_callsign  != null ? Number(row.score_callsign)  : null,
      row.score_civilian_pen != null ? Number(row.score_civilian_pen) : null,
      row.is_government         ? 1 : 0,
      row.is_military           ? 1 : 0,
      row.is_military_transport ? 1 : 0,
      row.is_surveillance       ? 1 : 0,
      row.is_vip                ? 1 : 0,
      row.category_primary   || null,
      row.confidence_level   || 'normal',
      row.reasons_json ? JSON.stringify(row.reasons_json) : null
    ]
  );
  return result.insertId;
}

async function linkEvent(missionScoreId, eventId) {
  if (!missionScoreId || !eventId) return;
  await query(
    'UPDATE air_mission_scores SET event_id = ? WHERE id = ?',
    [Number(eventId), Number(missionScoreId)]
  );
}

module.exports = { insert, linkEvent };
