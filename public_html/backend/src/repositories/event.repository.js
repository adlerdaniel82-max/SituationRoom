const { query } = require('../config/db');
const hashService = require('../utils/hash');

async function list(options = {}) {
  const { type, source, minScore, startDate, endDate, bbox, limit = 100, offset = 0 } = options;

  let sql = `
    SELECT *
    FROM events
    WHERE 1=1
      AND NOT (
        source = 'firms'
        AND type = 'fire'
        AND (
          SELECT COUNT(*)
          FROM event_reports
          WHERE event_reports.event_id = events.id
            AND event_reports.report_type = 'industrial_heat'
        ) >= 3
      )
  `;
  const params = [];
  const types = Array.isArray(type)
    ? type
    : String(type || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
  const sources = Array.isArray(source)
    ? source
    : String(source || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

  if (types.length === 1) {
    sql += ' AND type = ?';
    params.push(types[0]);
  } else if (types.length > 1) {
    sql += ` AND type IN (${types.map(() => '?').join(', ')})`;
    params.push(...types);
  }

  if (sources.length === 1) {
    sql += ' AND source = ?';
    params.push(sources[0]);
  } else if (sources.length > 1) {
    sql += ` AND source IN (${sources.map(() => '?').join(', ')})`;
    params.push(...sources);
  }

  if (minScore !== undefined) {
    sql += ' AND score >= ?';
    params.push(minScore);
  }

  if (startDate) {
    sql += ' AND timestamp >= ?';
    params.push(startDate);
  }

  if (endDate) {
    sql += ' AND timestamp <= ?';
    params.push(endDate);
  }

  if (bbox) {
    const [minLon, minLat, maxLon, maxLat] = String(bbox)
      .split(',')
      .map((value) => Number(value.trim()));

    if ([minLon, minLat, maxLon, maxLat].every((value) => Number.isFinite(value))) {
      sql += ' AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?';
      params.push(Math.min(minLat, maxLat), Math.max(minLat, maxLat), Math.min(minLon, maxLon), Math.max(minLon, maxLon));
    }
  }

  sql += ' ORDER BY score DESC, timestamp DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return query(sql, params);
}

async function getById(id) {
  const rows = await query('SELECT * FROM events WHERE id = ?', [id]);
  return rows[0] || null;
}

async function getNearby(lat, lon, radiusKm, limit = 50) {
  // Simplified - uses bounding box for initial filter
  const R = 6371;
  const latOffset = (radiusKm / R) * (180 / Math.PI);
  const lonOffset = (radiusKm / (R * Math.cos(lat * Math.PI / 180))) * (180 / Math.PI);

  const sql = `
    SELECT *, 
      (6371 * acos(
        cos(radians(?)) * cos(radians(lat)) * 
        cos(radians(lon) - radians(?)) + 
        sin(radians(?)) * sin(radians(lat))
      )) AS distance
    FROM events
    WHERE lat BETWEEN ? AND ?
      AND lon BETWEEN ? AND ?
      AND NOT (
        source = 'firms'
        AND type = 'fire'
        AND (
          SELECT COUNT(*)
          FROM event_reports
          WHERE event_reports.event_id = events.id
            AND event_reports.report_type = 'industrial_heat'
        ) >= 3
      )
    HAVING distance <= ?
    ORDER BY timestamp DESC
    LIMIT ?
  `;

  return query(sql, [
    lat, lon, lat,
    lat - latOffset, lat + latOffset,
    lon - lonOffset, lon + lonOffset,
    radiusKm, limit
  ]);
}

async function getByHash(hash) {
  const rows = await query('SELECT * FROM events WHERE event_hash = ?', [hash]);
  return rows[0] || null;
}

async function getStats() {
  const sql = `
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN score >= 0.8 THEN 1 END) as critical,
      COUNT(CASE WHEN score >= 0.6 AND score < 0.8 THEN 1 END) as high,
      COUNT(CASE WHEN score >= 0.4 AND score < 0.6 THEN 1 END) as medium,
      COUNT(CASE WHEN score < 0.4 THEN 1 END) as low
    FROM events
    WHERE NOT (
      source = 'firms'
      AND type = 'fire'
      AND (
        SELECT COUNT(*)
        FROM event_reports
        WHERE event_reports.event_id = events.id
          AND event_reports.report_type = 'industrial_heat'
      ) >= 3
    )
  `;
  const rows = await query(sql);
  return rows[0];
}

async function create(event) {
  const {
    title,
    type,
    source,
    lat,
    lon,
    magnitude,
    depth,
    affectedPopulation,
    timestamp,
    url,
    data,
    score
  } = event;
  const eventHash = hashService.generateEventHash(title, lat, lon);

  // Create WKT point string for geo field
  const geoWKT = `POINT(${lon} ${lat})`;

  const sql = `
    INSERT INTO events (
      title, type, source, lat, lon, geo, magnitude, depth, affected_population,
      timestamp, url, data, score, event_hash, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ST_GeomFromText(?), ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

  const result = await query(sql, [
    title,
    type,
    source,
    lat,
    lon,
    geoWKT,
    magnitude || null,
    depth || null,
    affectedPopulation || null,
    timestamp,
    url || null,
    JSON.stringify(data),
    score,
    eventHash
  ]);

  return result.insertId;
}

async function update(id, updates) {
  const allowedFields = ['title', 'magnitude', 'score', 'data', 'updated_at'];
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(key === 'data' ? JSON.stringify(value) : value);
    }
  }

  if (fields.length === 0) return false;

  const sql = `UPDATE events SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);

  await query(sql, values);
  return true;
}

async function deleteOlderThan(days) {
  const sql = 'DELETE FROM events WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)';
  const result = await query(sql, [days]);
  return result.affectedRows;
}

async function listPersistentSourceBuckets(source, options = {}) {
  const {
    lookbackDays = 21,
    bucketPrecision = 2,
    minEvents = 8,
    minDistinctDays = 4
  } = options;

  const sql = `
    SELECT
      ROUND(lat, ?) AS lat_bucket,
      ROUND(lon, ?) AS lon_bucket,
      COUNT(*) AS hits,
      COUNT(DISTINCT DATE(timestamp)) AS distinct_days
    FROM events
    WHERE source = ?
      AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY ROUND(lat, ?), ROUND(lon, ?)
    HAVING COUNT(*) >= ?
      AND COUNT(DISTINCT DATE(timestamp)) >= ?
    ORDER BY distinct_days DESC, hits DESC
  `;

  return query(sql, [
    bucketPrecision,
    bucketPrecision,
    source,
    lookbackDays,
    bucketPrecision,
    bucketPrecision,
    minEvents,
    minDistinctDays
  ]);
}

module.exports = {
  list,
  getById,
  getNearby,
  getByHash,
  getStats,
  create,
  update,
  deleteOlderThan,
  listPersistentSourceBuckets
};
