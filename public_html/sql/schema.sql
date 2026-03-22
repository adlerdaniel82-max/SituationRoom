-- Situation Dashboard Database Schema
-- MySQL 8.0+

USE webuser_situation;

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
  last_status VARCHAR(50) DEFAULT NULL,
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
INSERT INTO sources (id, name, type, enabled, interval_seconds) VALUES
  ('usgs', 'USGS Earthquakes', 'earthquake', 1, 300),
  ('gdacs', 'GDACS Disasters', 'disaster', 1, 600),
  ('firms', 'FIRMS Fires', 'fire', 1, 600),
  ('acled', 'ACLED Conflicts', 'conflict', 1, 3600),
  ('reliefweb', 'ReliefWeb', 'humanitarian', 1, 1800),
  ('opensky', 'OpenSky Network', 'aviation', 1, 60)
ON DUPLICATE KEY UPDATE name=VALUES(name);
