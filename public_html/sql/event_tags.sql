USE webuser_situation;

CREATE TABLE IF NOT EXISTS event_tags (
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
