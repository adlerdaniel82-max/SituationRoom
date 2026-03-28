-- Migration 0008: Cleanup stale/unclassified events
-- 2026-03-28
--
-- Removes:
--   - All OpenSky aviation events (12.785) – pre-classifier, stale positions
--   - Old GDACS events before 2025 (2 entries)
--   - Orphaned raw_events (event_id NULL after CASCADE SET NULL)
--   - All air_mission_scores (rebuilt by importer)
--
-- Preserves:
--   - aircraft_registry_ref (metadata cache)
--   - event_reports (all linked to firms/fire events, unaffected)
--   - All non-aviation events from 2026

-- Step 1: Delete OpenSky events
-- CASCADE: auto-deletes event_tags, event_validation_matches
-- SET NULL: sets raw_events.event_id = NULL (cleaned in step 3)
-- CASCADE: event_reports linked to opensky (none exist, safe)
DELETE FROM events WHERE source = 'opensky';

-- Step 2: Delete old GDACS events (pre-2025, irrelevant historical data)
DELETE FROM events WHERE source = 'gdacs' AND timestamp < '2025-01-01 00:00:00';

-- Step 3: Clean up all orphaned raw_events (includes pre-existing NULLs)
DELETE FROM raw_events WHERE event_id IS NULL;

-- Step 4: Clear air_mission_scores (rebuilt automatically by OpenSky importer)
TRUNCATE TABLE air_mission_scores;
