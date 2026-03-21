function validateEvent(event) {
  const errors = [];

  if (!event.title || typeof event.title !== 'string') {
    errors.push('title is required and must be a string');
  }

  if (!event.type || typeof event.type !== 'string') {
    errors.push('type is required and must be a string');
  }

  if (!event.source || typeof event.source !== 'string') {
    errors.push('source is required and must be a string');
  }

  if (event.lat === undefined || typeof event.lat !== 'number' || event.lat < -90 || event.lat > 90) {
    errors.push('lat must be a number between -90 and 90');
  }

  if (event.lon === undefined || typeof event.lon !== 'number' || event.lon < -180 || event.lon > 180) {
    errors.push('lon must be a number between -180 and 180');
  }

  if (event.timestamp && isNaN(new Date(event.timestamp).getTime())) {
    errors.push('timestamp must be a valid date');
  }

  if (event.magnitude !== undefined && (typeof event.magnitude !== 'number' || event.magnitude < 0)) {
    errors.push('magnitude must be a positive number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateCoordinates(lat, lon) {
  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    return false;
  }
  if (typeof lon !== 'number' || lon < -180 || lon > 180) {
    return false;
  }
  return true;
}

function sanitizeString(str, maxLength = 1000) {
  if (!str || typeof str !== 'string') return '';
  return str.slice(0, maxLength).trim();
}

function parseLimit(limit, defaultLimit = 100, maxLimit = 1000) {
  const parsed = parseInt(limit, 10);
  if (isNaN(parsed) || parsed < 1) return defaultLimit;
  return Math.min(parsed, maxLimit);
}

module.exports = { validateEvent, validateCoordinates, sanitizeString, parseLimit };
