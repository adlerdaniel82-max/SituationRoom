const hashService = require('../utils/hash');
const eventRepository = require('../repositories/event.repository');
const logger = require('../utils/logger');

const DUPLICATE_TIME_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

async function findDuplicate(eventData) {
  const { title, lat, lon, timestamp, source } = eventData;

  // Generate hash for comparison
  const eventHash = hashService.generateEventHash(title, lat, lon);

  // Check for exact hash match
  const byHash = await eventRepository.getByHash(eventHash);
  if (byHash) {
    logger.debug('Found duplicate by hash:', title);
    return byHash;
  }

  // Check for similar events in time window
  const timeWindowStart = new Date(Date.now() - DUPLICATE_TIME_WINDOW);
  const nearbyEvents = await eventRepository.getNearby(lat, lon, 50, 100);

  for (const event of nearbyEvents) {
    if (event.source === source && event.title === title) {
      const eventTime = new Date(event.timestamp).getTime();
      const newEventTime = new Date(timestamp).getTime();
      if (Math.abs(eventTime - newEventTime) < DUPLICATE_TIME_WINDOW) {
        logger.debug('Found duplicate by similarity:', title);
        return event;
      }
    }
  }

  return null;
}

function isDuplicateSync(existing, newData) {
  // Quick in-memory duplicate check
  if (!existing || !newData) return false;

  const existingHash = hashService.generateEventHash(existing.title, existing.lat, existing.lon);
  const newHash = hashService.generateEventHash(newData.title, newData.lat, newData.lon);

  return existingHash === newHash;
}

module.exports = { findDuplicate, isDuplicateSync };
