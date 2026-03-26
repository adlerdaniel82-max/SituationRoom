'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Rate Limit für POST /api/events/:id/report-industrial.
 * Pro IP: maximal 10 Meldungen innerhalb von 15 Minuten.
 * Verhindert, dass ein Angreifer FIRMS-Brände durch schnelles
 * Rotieren von User-Agents massenhaft unsichtbar macht.
 */
const reportIndustrialRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Meldungen – bitte in einigen Minuten erneut versuchen' },
  keyGenerator: (req) => req.ip
});

module.exports = { reportIndustrialRateLimit };
