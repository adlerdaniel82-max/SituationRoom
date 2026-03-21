const axios = require('axios');
const eventService = require('../services/event.service');
const logger = require('../utils/logger');

const ACLED_API = 'https://api.acleddata.com/acledapi.json';

async function run() {
  logger.info('Running ACLED importer');

  try {
    const response = await axios.get(ACLED_API, {
      params: {
        key: process.env.ACLED_API_KEY || '',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        limit: 100
      }
    });

    const events = response.data || [];
    let imported = 0;
    let duplicates = 0;

    for (const eventData of events) {
      const event = {
        title: `${eventData.event_type}: ${eventData.sub_event_type}`,
        type: 'conflict',
        source: 'acled',
        lat: eventData.latitude,
        lon: eventData.longitude,
        timestamp: new Date(eventData.event_date),
        affectedPopulation: eventData.fatalities || 0,
        url: eventData.source,
        data: eventData
      };

      const result = await eventService.create(event);
      if (result.isDuplicate) {
        duplicates++;
      } else {
        imported++;
      }
    }

    logger.info(`ACLED importer completed: ${imported} imported, ${duplicates} duplicates`);
    return { imported, duplicates, total: events.length };
  } catch (error) {
    logger.error('ACLED importer failed:', error.message);
    throw error;
  }
}

module.exports = { run };
