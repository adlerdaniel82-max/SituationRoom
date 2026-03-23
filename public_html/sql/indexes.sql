-- Situation Dashboard Database Indexes
-- Additional indexes for performance optimization

USE webuser_situation;

-- Composite indexes for common query patterns
CREATE INDEX idx_events_type_timestamp ON events(type, timestamp DESC);
CREATE INDEX idx_events_source_timestamp ON events(source, timestamp DESC);
CREATE INDEX idx_events_score_timestamp ON events(score DESC, timestamp DESC);
CREATE INDEX idx_events_type_score ON events(type, score DESC);

-- Index for location-based queries with time filter
CREATE INDEX idx_events_location_time ON events(lat, lon, timestamp DESC);

-- Index for stats aggregation (using generated column approach)
-- CREATE INDEX idx_events_created_date ON events(DATE(created_at));

-- Full-text search index for event titles (MySQL 5.7+)
ALTER TABLE events ADD FULLTEXT INDEX idx_title_fulltext (title);

-- Compound index for correlation queries
CREATE INDEX idx_correlations_events ON correlations(event_id_1, event_id_2, correlation_type);

-- Index for cluster queries by time
CREATE INDEX idx_clusters_time ON clusters(start_time, end_time);

-- Analyze tables to update statistics
ANALYZE TABLE events;
ANALYZE TABLE sources;
ANALYZE TABLE raw_data;
ANALYZE TABLE raw_events;
ANALYZE TABLE event_updates;
ANALYZE TABLE correlations;
ANALYZE TABLE clusters;
