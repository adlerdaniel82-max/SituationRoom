-- Situation Dashboard Database Schema
-- MySQL 8.0+

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  checksum CHAR(64) NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Events table: stores all crisis/situation events
CREATE TABLE events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  type ENUM('earthquake', 'tsunami', 'volcano', 'flood', 'fire', 'conflict', 'humanitarian', 'aviation', 'disaster', 'other') NOT NULL,
  source VARCHAR(50) NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lon DECIMAL(11, 8) NOT NULL,
  geo POINT NOT NULL,
  magnitude DECIMAL(10, 2) DEFAULT NULL,
  depth DECIMAL(10, 2) DEFAULT NULL COMMENT 'Depth in km (for earthquakes)',
  affected_population INT UNSIGNED DEFAULT NULL,
  timestamp DATETIME NOT NULL,
  url VARCHAR(1000) DEFAULT NULL,
  data JSON DEFAULT NULL COMMENT 'Raw data from source',
  score DECIMAL(5, 4) DEFAULT 0 COMMENT 'Calculated severity score (0-1)',
  event_hash CHAR(32) DEFAULT NULL COMMENT 'MD5 hash for deduplication',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_type (type),
  INDEX idx_source (source),
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_score (score DESC),
  INDEX idx_event_hash (event_hash),
  SPATIAL INDEX idx_location (geo)
) ENGINE=InnoDB;

-- Sources table: configuration for data sources
CREATE TABLE sources (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,
  enabled TINYINT(1) DEFAULT 1,
  interval_seconds INT UNSIGNED DEFAULT 300,
  last_run DATETIME DEFAULT NULL,
  last_status VARCHAR(255) DEFAULT NULL,
  config JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Raw data table: stores raw API responses for debugging/reprocessing
CREATE TABLE raw_data (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  data JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_source (source),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB;

-- Raw event table: stores normalized source payloads per created event
CREATE TABLE raw_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id INT UNSIGNED DEFAULT NULL,
  source VARCHAR(50) NOT NULL,
  event_hash CHAR(32) DEFAULT NULL,
  payload JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_raw_events_source_created (source, created_at DESC),
  INDEX idx_raw_events_event_id (event_id),
  INDEX idx_raw_events_event_hash (event_hash),
  CONSTRAINT fk_raw_events_event
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Event updates table: stores before/after snapshots for later audit trails
CREATE TABLE event_updates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id INT UNSIGNED NOT NULL,
  source VARCHAR(50) NOT NULL,
  changed_fields JSON DEFAULT NULL,
  before_state JSON DEFAULT NULL,
  after_state JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_event_updates_event_id (event_id),
  INDEX idx_event_updates_source_created (source, created_at DESC),
  INDEX idx_event_updates_created_at (created_at DESC),
  CONSTRAINT fk_event_updates_event
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Event reports table: anonymous moderation signals such as industrial-heat reports
CREATE TABLE event_reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id INT UNSIGNED NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  reporter_key CHAR(64) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_event_reporter_type (event_id, report_type, reporter_key),
  KEY idx_event_reports_event_type (event_id, report_type),
  KEY idx_event_reports_created_at (created_at DESC),
  CONSTRAINT fk_event_reports_event
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Event tags table: normalized labels for later cross-source validation and review workflows
CREATE TABLE event_tags (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id INT UNSIGNED NOT NULL,
  tag_type VARCHAR(50) NOT NULL,
  tag VARCHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'system',
  confidence DECIMAL(5, 4) DEFAULT NULL,
  value VARCHAR(255) DEFAULT NULL,
  data JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_event_tag (event_id, tag_type, tag, source),
  KEY idx_event_tags_event (event_id),
  KEY idx_event_tags_lookup (tag_type, tag, source),
  KEY idx_event_tags_created (created_at DESC),
  CONSTRAINT fk_event_tags_event
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- News validation matches: links primary incidents to secondary GDELT/ReliefWeb signals
CREATE TABLE event_validation_matches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  primary_event_id INT UNSIGNED NOT NULL,
  secondary_event_id INT UNSIGNED NOT NULL,
  secondary_source VARCHAR(50) NOT NULL,
  query_text VARCHAR(1000) DEFAULT NULL,
  query_terms JSON DEFAULT NULL,
  match_score DECIMAL(5, 4) NOT NULL,
  time_signal DECIMAL(5, 4) DEFAULT NULL,
  location_signal DECIMAL(5, 4) DEFAULT NULL,
  country_signal DECIMAL(5, 4) DEFAULT NULL,
  keyword_signal DECIMAL(5, 4) DEFAULT NULL,
  publisher_signal DECIMAL(5, 4) DEFAULT NULL,
  article_signal DECIMAL(5, 4) DEFAULT NULL,
  hours_distance DECIMAL(8, 2) DEFAULT NULL,
  distance_km DECIMAL(10, 2) DEFAULT NULL,
  publisher_count INT UNSIGNED DEFAULT NULL,
  article_count INT UNSIGNED DEFAULT NULL,
  signal_data JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_validation_pair (primary_event_id, secondary_event_id),
  KEY idx_validation_primary (primary_event_id, match_score DESC),
  KEY idx_validation_secondary (secondary_event_id),
  KEY idx_validation_source (secondary_source, updated_at DESC),
  CONSTRAINT fk_validation_primary_event
    FOREIGN KEY (primary_event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_validation_secondary_event
    FOREIGN KEY (secondary_event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Correlations table: stores detected correlations between events
CREATE TABLE correlations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id_1 INT UNSIGNED NOT NULL,
  event_id_2 INT UNSIGNED NOT NULL,
  correlation_score DECIMAL(5, 4) NOT NULL,
  correlation_type ENUM('temporal', 'spatial', 'causal', 'similar') NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (event_id_1) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id_2) REFERENCES events(id) ON DELETE CASCADE,
  INDEX idx_event_pair (event_id_1, event_id_2),
  INDEX idx_correlation_score (correlation_score DESC)
) ENGINE=InnoDB;

-- Clusters table: stores detected event clusters
CREATE TABLE clusters (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cluster_type VARCHAR(50) NOT NULL,
  center_lat DECIMAL(10, 8) NOT NULL,
  center_lon DECIMAL(11, 8) NOT NULL,
  radius_km DECIMAL(10, 2) DEFAULT NULL,
  event_count INT UNSIGNED NOT NULL,
  event_ids JSON DEFAULT NULL,
  avg_score DECIMAL(5, 4) DEFAULT NULL,
  max_score DECIMAL(5, 4) DEFAULT NULL,
  start_time DATETIME DEFAULT NULL,
  end_time DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_cluster_type (cluster_type),
  INDEX idx_center (center_lat, center_lon),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB;

-- Insert default sources
INSERT INTO sources (id, name, type, enabled, interval_seconds, config) VALUES
  (
    'usgs',
    'USGS Earthquakes',
    'earthquake',
    1,
    300,
    JSON_OBJECT(
      'api_endpoint', 'https://earthquake.usgs.gov/fdsnws/event/1/query',
      'params', JSON_OBJECT('format', 'geojson', 'minmagnitude', 4.5, 'limit', 100),
      'timeout', 30
    )
  ),
  (
    'gdacs',
    'GDACS Disasters',
    'disaster',
    1,
    600,
    JSON_OBJECT(
      'feed_url', 'https://www.gdacs.org/xml/rss.xml',
      'parse_format', 'rss',
      'timeout', 60
    )
  ),
  (
    'gdelt',
    'GDELT Attention',
    'humanitarian',
    1,
    10800,
    JSON_OBJECT(
      'doc_endpoint', 'https://api.gdeltproject.org/api/v2/doc/doc',
      'query_mode', 'country_attention',
      'timespan', '6h',
      'maxrecords', 60,
      'min_country_articles', 1,
      'max_countries', 20,
      'country_lookup', 'https://restcountries.com/v3.1/name',
      'timeout', 30
    )
  ),
  (
    'noaa_tsunami',
    'NOAA Tsunami',
    'tsunami',
    1,
    300,
    JSON_OBJECT(
      'feed_urls', JSON_ARRAY(
        'https://www.tsunami.gov/events/xml/PAAQAtom.xml',
        'https://www.tsunami.gov/events/xml/PHEBAtom.xml'
      ),
      'parse_format', 'atom',
      'provider', 'NOAA Tsunami.gov',
      'timeout', 30
    )
  ),
  (
    'firms',
    'FIRMS Fires',
    'fire',
    1,
    600,
    JSON_OBJECT(
      'api_endpoint', 'https://firms.modaps.eosdis.nasa.gov/api/area',
      'params', JSON_OBJECT('bbox', '-180,-90,180,90', 'format', 'csv'),
      'requires_api_key', TRUE,
      'timeout', 60
    )
  ),
  (
    'acled',
    'ACLED Conflicts',
    'conflict',
    0,
    3600,
    JSON_OBJECT(
      'api_endpoint', 'https://acleddata.com/api/acled/read',
      'auth_endpoint', 'https://acleddata.com/oauth/token',
      'auth_mode', 'oauth2_password',
      'params', JSON_OBJECT('limit', 100, 'event_date_where', 'BETWEEN'),
      'requires_auth', TRUE,
      'timeout', 60
    )
  ),
  (
    'reliefweb',
    'ReliefWeb',
    'humanitarian',
    1,
    1800,
    JSON_OBJECT(
      'api_endpoint', 'https://api.reliefweb.int/v2/reports',
      'access_model', 'approved_appname',
      'method', 'POST',
      'preset', 'latest',
      'profile', 'list',
      'timeout', 30
    )
  ),
  (
    'ap',
    'AP News',
    'humanitarian',
    0,
    1800,
    JSON_OBJECT(
      'feed_url', 'https://apnews.com/rss',
      'parse_format', 'rss',
      'access_model', 'public_feed_review',
      'timeout', 30
    )
  ),
  (
    'reuters',
    'Reuters',
    'humanitarian',
    0,
    1800,
    JSON_OBJECT(
      'feed_urls', JSON_ARRAY(
        'https://www.reutersagency.com/feed/?best-topics=world&post_type=best',
        'https://www.reutersagency.com/feed/?post_type=best&best-topics=breakingviews'
      ),
      'parse_format', 'rss',
      'access_model', 'public_feed_review',
      'timeout', 30
    )
  ),
  (
    'bbc',
    'BBC News',
    'humanitarian',
    1,
    1800,
    JSON_OBJECT(
      'feed_urls', JSON_ARRAY(
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://feeds.bbci.co.uk/news/uk/rss.xml',
        'https://feeds.bbci.co.uk/news/business/rss.xml',
        'https://feeds.bbci.co.uk/news/politics/rss.xml',
        'https://feeds.bbci.co.uk/news/health/rss.xml',
        'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
        'https://feeds.bbci.co.uk/news/technology/rss.xml'
      ),
      'parse_format', 'rss',
      'access_model', 'public_feed_review',
      'timeout', 30
    )
  ),
  (
    'opensky',
    'OpenSky Network',
    'aviation',
    1,
    60,
    JSON_OBJECT(
      'api_endpoint', 'https://opensky-network.org/api/states/all',
      'auth_endpoint', 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
      'auth_mode', 'oauth2_client_credentials',
      'params', JSON_OBJECT('extended', 1, 'lamin', -90, 'lamax', 90, 'lomin', -180, 'lomax', 180),
      'requires_auth', TRUE,
      'timeout', 30
    )
  )
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  type = VALUES(type),
  enabled = VALUES(enabled),
  interval_seconds = VALUES(interval_seconds),
  config = VALUES(config);
