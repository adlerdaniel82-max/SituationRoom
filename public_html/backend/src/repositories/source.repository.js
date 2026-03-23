const { query } = require('../config/db');

async function list() {
  return query('SELECT * FROM sources ORDER BY id');
}

async function getById(id) {
  const rows = await query('SELECT * FROM sources WHERE id = ?', [id]);
  return rows[0] || null;
}

async function update(id, data) {
  const fields = [];
  const values = [];

  if (data.enabled !== undefined) {
    fields.push('enabled = ?');
    values.push(data.enabled ? 1 : 0);
  }

  if (data.interval !== undefined) {
    fields.push('interval_seconds = ?');
    values.push(data.interval);
  }

  if (data.last_run !== undefined) {
    fields.push('last_run = ?');
    values.push(data.last_run);
  }

  if (data.last_status !== undefined) {
    fields.push('last_status = ?');
    values.push(data.last_status);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const sql = `UPDATE sources SET ${fields.join(', ')} WHERE id = ?`;
  await query(sql, values);
  return true;
}

async function updateLastRun(id, timestamp) {
  return update(id, { last_run: timestamp });
}

async function updateRunState(id, timestamp, status) {
  return update(id, {
    last_run: timestamp,
    last_status: status
  });
}

async function getEnabled() {
  return query('SELECT * FROM sources WHERE enabled = 1 ORDER BY id');
}

async function getHealth() {
  try {
    return await query('SELECT * FROM source_health ORDER BY id');
  } catch {
    return list();
  }
}

async function getHealthById(id) {
  try {
    const rows = await query('SELECT * FROM source_health WHERE id = ?', [id]);
    return rows[0] || null;
  } catch {
    return getById(id);
  }
}

module.exports = { list, getById, update, updateLastRun, updateRunState, getEnabled, getHealth, getHealthById };
