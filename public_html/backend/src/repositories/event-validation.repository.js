const { query } = require('../config/db');

async function listCandidateSecondaryEvents(startDate, endDate) {
  return query(
    `
      SELECT id, title, type, source, lat, lon, timestamp, url, data, score
      FROM events
      WHERE source IN ('gdelt', 'reliefweb', 'ap', 'reuters', 'bbc')
        AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp DESC
      LIMIT 500
    `,
    [startDate, endDate]
  );
}

async function listCandidatePrimaryEvents(startDate, endDate) {
  return query(
    `
      SELECT id, title, type, source, lat, lon, magnitude, depth, affected_population, timestamp, url, data, score, updated_at
      FROM events
      WHERE source NOT IN ('gdelt', 'reliefweb', 'ap', 'reuters', 'bbc', 'acled')
        AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp DESC
      LIMIT 1000
    `,
    [startDate, endDate]
  );
}

async function upsertValidationMatch(match) {
  return query(
    `
      INSERT INTO event_validation_matches (
        primary_event_id,
        secondary_event_id,
        secondary_source,
        query_text,
        query_terms,
        match_score,
        time_signal,
        location_signal,
        country_signal,
        keyword_signal,
        publisher_signal,
        article_signal,
        hours_distance,
        distance_km,
        publisher_count,
        article_count,
        signal_data
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        secondary_source = VALUES(secondary_source),
        query_text = VALUES(query_text),
        query_terms = VALUES(query_terms),
        match_score = VALUES(match_score),
        time_signal = VALUES(time_signal),
        location_signal = VALUES(location_signal),
        country_signal = VALUES(country_signal),
        keyword_signal = VALUES(keyword_signal),
        publisher_signal = VALUES(publisher_signal),
        article_signal = VALUES(article_signal),
        hours_distance = VALUES(hours_distance),
        distance_km = VALUES(distance_km),
        publisher_count = VALUES(publisher_count),
        article_count = VALUES(article_count),
        signal_data = VALUES(signal_data),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      match.primaryEventId,
      match.secondaryEventId,
      match.secondarySource,
      match.queryText || null,
      JSON.stringify(match.queryTerms || []),
      match.matchScore,
      match.timeSignal,
      match.locationSignal,
      match.countrySignal,
      match.keywordSignal,
      match.publisherSignal,
      match.articleSignal,
      match.hoursDistance,
      match.distanceKm,
      match.publisherCount,
      match.articleCount,
      JSON.stringify(match.signalData || {})
    ]
  );
}

async function deleteByPrimaryEventId(primaryEventId) {
  return query('DELETE FROM event_validation_matches WHERE primary_event_id = ?', [primaryEventId]);
}

async function listByPrimaryEventId(primaryEventId, limit = 20) {
  return query(
    `
      SELECT
        vm.*,
        e.title AS secondary_title,
        e.type AS secondary_type,
        e.timestamp AS secondary_timestamp,
        e.url AS secondary_url,
        e.data AS secondary_data
      FROM event_validation_matches vm
      JOIN events e ON e.id = vm.secondary_event_id
      WHERE vm.primary_event_id = ?
      ORDER BY vm.match_score DESC, vm.updated_at DESC
      LIMIT ?
    `,
    [primaryEventId, limit]
  );
}

module.exports = {
  listCandidateSecondaryEvents,
  listCandidatePrimaryEvents,
  upsertValidationMatch,
  deleteByPrimaryEventId,
  listByPrimaryEventId
};
