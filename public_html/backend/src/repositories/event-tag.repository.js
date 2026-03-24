const { query } = require('../config/db');

async function upsertTag({ eventId, tagType, tag, source = 'system', confidence = null, value = null, data = null }) {
  const sql = `
    INSERT INTO event_tags (
      event_id, tag_type, tag, source, confidence, value, data
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      confidence = VALUES(confidence),
      value = VALUES(value),
      data = VALUES(data),
      updated_at = CURRENT_TIMESTAMP
  `;

  return query(sql, [
    eventId,
    tagType,
    tag,
    source,
    confidence,
    value,
    data ? JSON.stringify(data) : null
  ]);
}

async function listByEventId(eventId) {
  return query(
    `
      SELECT id, event_id, tag_type, tag, source, confidence, value, data, created_at, updated_at
      FROM event_tags
      WHERE event_id = ?
      ORDER BY tag_type ASC, tag ASC, created_at ASC
    `,
    [eventId]
  );
}

async function listByTag(tagType, tag, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit) || 100, 500));

  return query(
    `
      SELECT id, event_id, tag_type, tag, source, confidence, value, data, created_at, updated_at
      FROM event_tags
      WHERE tag_type = ?
        AND tag = ?
      ORDER BY confidence DESC, created_at DESC
      LIMIT ?
    `,
    [tagType, tag, limit]
  );
}

async function deleteByEventId(eventId) {
  return query('DELETE FROM event_tags WHERE event_id = ?', [eventId]);
}

async function deleteByEventIdAndSource(eventId, source) {
  return query('DELETE FROM event_tags WHERE event_id = ? AND source = ?', [eventId, source]);
}

module.exports = {
  upsertTag,
  listByEventId,
  listByTag,
  deleteByEventId,
  deleteByEventIdAndSource
};
