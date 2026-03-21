const eventRepository = require('../repositories/event.repository');
const { query } = require('../config/db');

async function getOverview() {
  return eventRepository.getStats();
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

module.exports = { getOverview, getByType, getBySource, getTimeline };
