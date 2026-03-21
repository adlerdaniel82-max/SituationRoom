const axios = require('axios');
const eventService = require('../services/event.service');
const logger = require('../utils/logger');

const FIRMS_API = 'https://firms.modaps.eosdis.nasa.gov/api/area';

async function run() {
  logger.info('Running FIRMS importer');

  try {
    // Get fires from last 24 hours (global bounding box)
    const response = await axios.get(`${FIRMS_API}/fire/VIIRS_SNPP_NRT/`, {
      params: {
        bbox: '-180,-90,180,90',
        ddate: new Date().toISOString().split('T')[0],
        format: 'csv',
        key: process.env.FIRMS_API_KEY || 'demo_key'
      }
    });

    const fires = parseFirmsCsv(response.data);
    let imported = 0;
    let duplicates = 0;

    for (const fire of fires.slice(0, 100)) { // Limit to 100 per run
      const event = {
        title: `Fire detected at ${fire.latitude.toFixed(2)}, ${fire.longitude.toFixed(2)}`,
        type: 'fire',
        source: 'firms',
        lat: parseFloat(fire.latitude),
        lon: parseFloat(fire.longitude),
        magnitude: fire.brightness,
        timestamp: new Date(`${fire.acq_date}T${fire.acq_time}`),
        data: fire
      };

      const result = await eventService.create(event);
      if (result.isDuplicate) {
        duplicates++;
      } else {
        imported++;
      }
    }

    logger.info(`FIRMS importer completed: ${imported} imported, ${duplicates} duplicates`);
    return { imported, duplicates, total: fires.length };
  } catch (error) {
    logger.error('FIRMS importer failed:', error.message);
    throw error;
  }
}

function parseFirmsCsv(csvData) {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',');
  const fires = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const fire = {};
    headers.forEach((header, index) => {
      fire[header] = values[index];
    });
    fires.push(fire);
  }

  return fires;
}

module.exports = { run };
