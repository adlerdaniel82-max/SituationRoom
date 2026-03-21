const axios = require('axios');
const eventService = require('../services/event.service');
const logger = require('../utils/logger');

const GDACS_RSS = 'https://www.gdacs.org/xml.aspx';

async function run() {
  logger.info('Running GDACS importer');

  try {
    // GDACS provides RSS/XML feed - parse accordingly
    const response = await axios.get(GDACS_RSS);
    const xml = response.data;

    // Parse XML (simplified - in production use xml2js or similar)
    const events = parseGdacsFeed(xml);

    let imported = 0;
    let duplicates = 0;

    for (const eventData of events) {
      const event = {
        ...eventData,
        type: 'disaster',
        source: 'gdacs'
      };

      const result = await eventService.create(event);
      if (result.isDuplicate) {
        duplicates++;
      } else {
        imported++;
      }
    }

    logger.info(`GDACS importer completed: ${imported} imported, ${duplicates} duplicates`);
    return { imported, duplicates, total: events.length };
  } catch (error) {
    logger.error('GDACS importer failed:', error.message);
    throw error;
  }
}

function parseGdacsFeed(xml) {
  // Simplified XML parsing - implement proper parsing in production
  const events = [];
  // TODO: Implement proper XML parsing
  return events;
}

module.exports = { run };
