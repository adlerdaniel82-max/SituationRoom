USE webuser_situation;

CREATE TABLE IF NOT EXISTS raw_events (
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

CREATE TABLE IF NOT EXISTS event_updates (
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
