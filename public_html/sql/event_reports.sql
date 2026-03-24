USE webuser_situation;

CREATE TABLE IF NOT EXISTS event_reports (
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
