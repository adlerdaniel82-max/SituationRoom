const { query } = require('../config/db');

async function storeRaw(source, rawData) {
  const sql = `
    INSERT INTO raw_data (source, data, created_at)
    VALUES (?, ?, NOW())
  `;

  const result = await query(sql, [source, JSON.stringify(rawData)]);
  return result.insertId;
}

async function storeRawEvent({ eventId = null, source, eventHash = null, payload }) {
  const sql = `
    INSERT INTO raw_events (event_id, source, event_hash, payload, created_at)
    VALUES (?, ?, ?, ?, NOW())
  `;

  const result = await query(sql, [
    eventId,
    source,
    eventHash,
    JSON.stringify(payload)
  ]);

  return result.insertId;
}

async function storeEventUpdate({ eventId, source, changedFields = [], beforeState = null, afterState = null }) {
  const sql = `
    INSERT INTO event_updates (event_id, source, changed_fields, before_state, after_state, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

  const result = await query(sql, [
    eventId,
    source,
    JSON.stringify(changedFields),
    JSON.stringify(beforeState),
    JSON.stringify(afterState)
  ]);

  return result.insertId;
}

async function getLatest(source) {
  const sql = 'SELECT * FROM raw_data WHERE source = ? ORDER BY created_at DESC LIMIT 1';
  const rows = await query(sql, [source]);
  if (!rows[0]) {
    return null;
  }

  const payload = JSON.parse(rows[0].data);
  return {
    ...payload,
    created_at: rows[0].created_at
  };
}

async function cleanup(daysToKeep = 7) {
  const sql = 'DELETE FROM raw_data WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)';
  const result = await query(sql, [daysToKeep]);
  return result.affectedRows;
}

module.exports = { storeRaw, storeRawEvent, storeEventUpdate, getLatest, cleanup };
