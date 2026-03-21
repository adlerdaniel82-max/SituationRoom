const crypto = require('crypto');

function generateEventHash(title, lat, lon) {
  const normalizedTitle = normalizeTitle(title);
  const normalizedLat = Math.round(lat * 100) / 100;
  const normalizedLon = Math.round(lon * 100) / 100;
  
  const input = `${normalizedTitle}|${normalizedLat}|${normalizedLon}`;
  return crypto.createHash('md5').update(input).digest('hex');
}

function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

function hashString(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

module.exports = { generateEventHash, normalizeTitle, generateId, hashString };
