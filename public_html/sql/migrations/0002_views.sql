-- Situation Dashboard Database Views
-- Pre-defined views for common queries

-- Recent events view (last 24 hours)
CREATE OR REPLACE VIEW events_recent AS
SELECT 
  id,
  title,
  type,
  source,
  lat,
  lon,
  magnitude,
  timestamp,
  score,
  CASE 
    WHEN score >= 0.8 THEN 'critical'
    WHEN score >= 0.6 THEN 'high'
    WHEN score >= 0.4 THEN 'medium'
    ELSE 'low'
  END AS severity
FROM events
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY timestamp DESC;

-- Events by type summary (last 7 days)
CREATE OR REPLACE VIEW events_by_type_summary AS
SELECT 
  type,
  COUNT(*) as event_count,
  COUNT(CASE WHEN score >= 0.8 THEN 1 END) as critical_count,
  COUNT(CASE WHEN score >= 0.6 AND score < 0.8 THEN 1 END) as high_count,
  AVG(score) as avg_score,
  MAX(score) as max_score,
  MIN(timestamp) as first_event,
  MAX(timestamp) as last_event
FROM events
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY type
ORDER BY event_count DESC;

-- Events by source summary
CREATE OR REPLACE VIEW events_by_source_summary AS
SELECT 
  e.source,
  s.name as source_name,
  COUNT(*) as event_count,
  COUNT(CASE WHEN score >= 0.6 THEN 1 END) as significant_count,
  AVG(score) as avg_score,
  MAX(timestamp) as last_import,
  TIMESTAMPDIFF(MINUTE, s.last_run, NOW()) as minutes_since_run
FROM events e
LEFT JOIN sources s ON e.source = s.id
GROUP BY e.source, s.name, s.last_run
ORDER BY event_count DESC;

-- Hourly event timeline (last 48 hours)
CREATE OR REPLACE VIEW events_hourly_timeline AS
SELECT 
  DATE_FORMAT(timestamp, '%Y-%m-%d %H:00') as hour,
  COUNT(*) as event_count,
  AVG(score) as avg_score,
  MAX(score) as max_score,
  GROUP_CONCAT(DISTINCT type ORDER BY type) as types
FROM events
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d %H:00')
ORDER BY hour DESC;

-- Geographic clusters (events within 50km in 6-hour windows)
CREATE OR REPLACE VIEW event_clusters AS
SELECT 
  DATE_FORMAT(timestamp, '%Y-%m-%d %H:00') as time_bucket,
  ROUND(lat / 1) * 1 as lat_cluster,
  ROUND(lon / 1) * 1 as lon_cluster,
  type,
  COUNT(*) as event_count,
  AVG(lat) as center_lat,
  AVG(lon) as center_lon,
  AVG(score) as avg_score,
  MAX(score) as max_score,
  GROUP_CONCAT(id ORDER BY timestamp) as event_ids
FROM events
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY time_bucket, lat_cluster, lon_cluster, type
HAVING event_count >= 3
ORDER BY event_count DESC, avg_score DESC
LIMIT 100;

-- Source health view
CREATE OR REPLACE VIEW source_health AS
SELECT 
  s.id,
  s.name,
  s.enabled,
  s.interval_seconds,
  s.last_run,
  s.last_status,
  TIMESTAMPDIFF(MINUTE, s.last_run, NOW()) as minutes_since_run,
  ROUND(s.interval_seconds / 60, 2) as interval_minutes,
  CASE 
    WHEN s.enabled = 0 THEN 'disabled'
    WHEN s.last_run IS NULL THEN 'never_run'
    WHEN LOWER(COALESCE(s.last_status, '')) LIKE 'error:%' THEN 'error'
    WHEN LOWER(COALESCE(s.last_status, '')) = 'running' THEN 'running'
    WHEN TIMESTAMPDIFF(SECOND, s.last_run, NOW()) > s.interval_seconds * 2 THEN 'overdue'
    WHEN TIMESTAMPDIFF(SECOND, s.last_run, NOW()) > s.interval_seconds THEN 'due_soon'
    ELSE 'healthy'
  END as health_status,
  (SELECT COUNT(*) FROM events e WHERE e.source = s.id AND e.timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as events_last_24h
FROM sources s
ORDER BY s.id;

-- Critical events alert view
CREATE OR REPLACE VIEW critical_events_alert AS
SELECT 
  id,
  title,
  type,
  source,
  lat,
  lon,
  magnitude,
  affected_population,
  timestamp,
  score,
  url,
  TIMESTAMPDIFF(MINUTE, timestamp, NOW()) as minutes_old
FROM events
WHERE score >= 0.8 
  AND timestamp >= DATE_SUB(NOW(), INTERVAL 6 HOUR)
ORDER BY score DESC, timestamp DESC;
