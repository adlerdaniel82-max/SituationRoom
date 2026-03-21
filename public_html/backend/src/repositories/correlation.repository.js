const { query } = require('../config/db');

async function findCorrelated(eventId, maxDistance = 100, maxTimeHours = 24) {
  const sql = `
    SELECT e1.*, e2.id as correlated_id, e2.title as correlated_title
    FROM events e1
    JOIN events e2 ON e1.id != e2.id
      AND e2.timestamp >= DATE_SUB(e1.timestamp, INTERVAL ? HOUR)
      AND e2.timestamp <= DATE_ADD(e1.timestamp, INTERVAL ? HOUR)
      AND (6371 * acos(
        cos(radians(e1.lat)) * cos(radians(e2.lat)) * 
        cos(radians(e2.lon) - radians(e1.lon)) + 
        sin(radians(e1.lat)) * sin(radians(e2.lat))
      )) <= ?
    WHERE e1.id = ?
    ORDER BY e2.timestamp DESC
  `;

  return query(sql, [maxTimeHours, maxTimeHours, maxDistance, eventId]);
}

async function findClusters(timeWindowHours = 6, maxDistance = 50, minEvents = 3) {
  const sql = `
    SELECT 
      DATE_FORMAT(timestamp, '%Y-%m-%d %H:00') as time_bucket,
      ROUND(lat / ?) * ? as lat_cluster,
      ROUND(lon / ?) * ? as lon_cluster,
      type,
      COUNT(*) as event_count,
      GROUP_CONCAT(id) as event_ids,
      AVG(score) as avg_score,
      MAX(score) as max_score
    FROM events
    WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY time_bucket, lat_cluster, lon_cluster, type
    HAVING event_count >= ?
    ORDER BY event_count DESC, avg_score DESC
    LIMIT 50
  `;

  return query(sql, [maxDistance, maxDistance, maxDistance, maxDistance, minEvents]);
}

async function getCorrelationScore(event1Id, event2Id) {
  const sql = `
    SELECT e1.lat as lat1, e1.lon as lon1, e1.timestamp as time1, e1.type as type1,
           e2.lat as lat2, e2.lon as lon2, e2.timestamp as time2, e2.type as type2
    FROM events e1, events e2
    WHERE e1.id = ? AND e2.id = ?
  `;

  const rows = await query(sql, [event1Id, event2Id]);
  if (rows.length === 0) return null;

  const { lat1, lon1, time1, type1, lat2, lon2, time2, type2 } = rows[0];

  // Calculate correlation
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  const timeDiff = Math.abs(new Date(time1) - new Date(time2)) / (1000 * 60 * 60);

  const distanceScore = Math.max(0, 1 - distance / 500);
  const timeScore = Math.max(0, 1 - timeDiff / 48);
  const typeScore = type1 === type2 ? 1 : 0.3;

  return (distanceScore * 0.4) + (timeScore * 0.3) + (typeScore * 0.3);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
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

module.exports = { findCorrelated, findClusters, getCorrelationScore };
