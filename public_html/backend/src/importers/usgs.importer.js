const axios = require('axios');
const eventService = require('../services/event.service');
const logger = require('../utils/logger');

const USGS_API = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

async function run() {
  logger.info('Running USGS importer');

  try {
    const response = await axios.get(USGS_API, {
      params: {
        format: 'geojson',
        starttime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        minmagnitude: 4.5,
        limit: 100
      }
    });

    const features = response.data.features || [];
    let imported = 0;
    let duplicates = 0;

    for (const feature of features) {
      const event = {
        title: feature.properties.title,
        type: 'earthquake',
        source: 'usgs',
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
        depth: feature.geometry.coordinates[2],
        magnitude: feature.properties.mag,
        timestamp: new Date(feature.properties.time),
        url: feature.properties.url,
        data: feature.properties
      };

      const result = await eventService.create(event);
      if (result.isDuplicate) {
        duplicates++;
      } else {
        imported++;
      }
    }

    logger.info(`USGS importer completed: ${imported} imported, ${duplicates} duplicates`);
    return { imported, duplicates, total: features.length };
  } catch (error) {
    logger.error('USGS importer failed:', error.message);
    throw error;
  }
}

module.exports = { run };
