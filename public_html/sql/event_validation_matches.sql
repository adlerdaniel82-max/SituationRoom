USE webuser_situation;

CREATE TABLE IF NOT EXISTS event_validation_matches (
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
