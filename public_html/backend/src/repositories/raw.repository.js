const { query } = require('../config/db');

async function storeRaw(source, rawData) {
  const sql = `
    INSERT INTO raw_data (source, data, created_at)
    VALUES (?, ?, NOW())
  `;

  const result = await query(sql, [source, JSON.stringify(rawData)]);
  return result.insertId;
}

async function getLatest(source) {
  const sql = 'SELECT * FROM raw_data WHERE source = ? ORDER BY created_at DESC LIMIT 1';
  const rows = await query(sql, [source]);
  return rows[0] ? JSON.parse(rows[0].data) : null;
}

async function cleanup(daysToKeep = 7) {
  const sql = 'DELETE FROM raw_data WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)';
  const result = await query(sql, [daysToKeep]);
  return result.affectedRows;
}

module.exports = { storeRaw, getLatest, cleanup };
