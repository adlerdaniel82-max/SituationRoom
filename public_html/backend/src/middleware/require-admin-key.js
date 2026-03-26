'use strict';

const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Middleware: prüft den x-api-key Header gegen ADMIN_API_KEY aus der .env.
 * Ist ADMIN_API_KEY nicht gesetzt, wird jede Anfrage mit 503 abgewiesen (fail-secure).
 * Verwendet crypto.timingSafeEqual um Timing-Angriffe zu verhindern.
 */
function requireAdminKey(req, res, next) {
  const configuredKey = env.adminApiKey;

  if (!configuredKey) {
    logger.error('ADMIN_API_KEY ist nicht konfiguriert – Admin-Endpunkt wird gesperrt');
    return res.status(503).json({ error: 'Admin-Endpunkt nicht verfügbar' });
  }

  const provided = String(req.headers['x-api-key'] || '');

  if (!provided) {
    return res.status(401).json({ error: 'x-api-key Header fehlt' });
  }

  let keysMatch = false;
  try {
    const a = Buffer.from(configuredKey, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    if (a.length === b.length) {
      keysMatch = crypto.timingSafeEqual(a, b);
    }
  } catch {
    keysMatch = false;
  }

  if (!keysMatch) {
    logger.warn(`Ungültiger Admin-API-Key von ${req.ip}`);
    return res.status(403).json({ error: 'Ungültiger API-Key' });
  }

  next();
}

module.exports = { requireAdminKey };
