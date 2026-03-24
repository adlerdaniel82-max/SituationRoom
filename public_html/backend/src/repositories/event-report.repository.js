const { query } = require('../config/db');

async function createReport({ eventId, reportType, reporterKey }) {
  const sql = `
    INSERT IGNORE INTO event_reports (event_id, report_type, reporter_key, created_at)
    VALUES (?, ?, ?, NOW())
  `;

  const result = await query(sql, [eventId, reportType, reporterKey]);
  return {
    inserted: result.affectedRows > 0
  };
}

async function countReports(eventId, reportType) {
  const sql = `
    SELECT COUNT(*) AS total
    FROM event_reports
    WHERE event_id = ? AND report_type = ?
  `;

  const rows = await query(sql, [eventId, reportType]);
  return Number(rows[0]?.total || 0);
}

module.exports = {
  createReport,
  countReports
};
