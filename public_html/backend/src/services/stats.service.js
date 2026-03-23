const eventRepository = require('../repositories/event.repository');
const { query } = require('../config/db');

async function getOverview() {
  return eventRepository.getStats();
}

async function getSummary() {
  return getOverview();
}

async function getByType() {
  const sql = `
    SELECT 
      type,
      COUNT(*) as count,
      AVG(score) as avg_score,
      MAX(score) as max_score,
      COUNT(CASE WHEN score >= 0.8 THEN 1 END) as critical,
      COUNT(CASE WHEN score >= 0.6 AND score < 0.8 THEN 1 END) as high
    FROM events
    WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY type
    ORDER BY count DESC
  `;
  return query(sql);
}

async function getBySource() {
  const sql = `
    SELECT 
      e.source,
      s.name as source_name,
      COUNT(*) as count,
      AVG(e.score) as avg_score,
      MAX(e.timestamp) as last_event
    FROM events e
    LEFT JOIN sources s ON e.source = s.id
    WHERE e.timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY e.source, s.name
    ORDER BY count DESC
  `;
  return query(sql);
}

async function getTimeline(interval = 'hour') {
  let format;
  let whereClause = 'timestamp >= DATE_SUB(NOW(), INTERVAL 48 HOUR)';
  
  switch (interval) {
    case 'day':
      format = '%Y-%m-%d';
      whereClause = 'timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      break;
    case 'week':
      format = '%Y-%u';
      whereClause = 'timestamp >= DATE_SUB(NOW(), INTERVAL 12 WEEK)';
      break;
    default:
      format = '%Y-%m-%d %H:00';
  }

  const sql = `
    SELECT 
      DATE_FORMAT(timestamp, '${format}') as period,
      COUNT(*) as event_count,
      AVG(score) as avg_score,
      MAX(score) as max_score,
      COUNT(DISTINCT type) as type_count
    FROM events
    WHERE ${whereClause}
    GROUP BY DATE_FORMAT(timestamp, '${format}')
    ORDER BY period DESC
  `;
  return query(sql);
}

async function getHotRegions({ hours = 24, limit = 12 } = {}) {
  const safeHours = Math.max(1, Math.min(Number(hours) || 24, 168));
  const safeLimit = Math.max(1, Math.min(Number(limit) || 12, 50));

  const sql = `
    SELECT
      ROUND(lat / 5) * 5 AS lat_bucket,
      ROUND(lon / 5) * 5 AS lon_bucket,
      COUNT(*) AS event_count,
      AVG(score) AS avg_score,
      MAX(score) AS max_score,
      COUNT(DISTINCT type) AS type_count,
      COUNT(DISTINCT source) AS source_count,
      MAX(timestamp) AS latest_event
    FROM events
    WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
    GROUP BY ROUND(lat / 5), ROUND(lon / 5)
    HAVING event_count > 0
    ORDER BY max_score DESC, event_count DESC, latest_event DESC
    LIMIT ?
  `;

  const rows = await query(sql, [safeHours, safeLimit]);
  return rows.map((row) => ({
    ...row,
    lat: Number(row.lat_bucket),
    lon: Number(row.lon_bucket),
    label: `${Number(row.lat_bucket).toFixed(0)}, ${Number(row.lon_bucket).toFixed(0)}`,
    event_count: Number(row.event_count),
    avg_score: Number(row.avg_score || 0),
    max_score: Number(row.max_score || 0),
    type_count: Number(row.type_count),
    source_count: Number(row.source_count)
  }));
}

module.exports = { getOverview, getSummary, getByType, getBySource, getTimeline, getHotRegions };
