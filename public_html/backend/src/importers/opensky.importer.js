const axios = require('axios');
const eventService = require('../services/event.service');
const logger = require('../utils/logger');

const OPENSKY_API = 'https://opensky-network.org/api/states/all';

async function run() {
  logger.info('Running OpenSky importer');

  try {
    // Get aircraft states - focus on unusual patterns
    const response = await axios.get(OPENSKY_API, {
      params: {
        lamin: -90,
        lamax: 90,
        lomin: -180,
        lomax: 180
      },
      auth: {
        username: process.env.OPENSKY_API_KEY || '',
        password: ''
      }
    });

    const states = response.data?.states || [];
    let imported = 0;

    // Filter for interesting aircraft (e.g., low altitude, unusual patterns)
    const interestingAircraft = states.filter(state => {
      const altitude = state[7]; // Barometric altitude
      return altitude !== null && altitude < 1000; // Low flying aircraft
    }).slice(0, 50);

    for (const aircraft of interestingAircraft) {
      const [icao24, callsign, originCountry, timePosition, lastContact, longitude, latitude, baroAltitude] = aircraft;

      const event = {
        title: `Aircraft ${callsign || icao24} at low altitude`,
        type: 'aviation',
        source: 'opensky',
        lat: latitude,
        lon: longitude,
        magnitude: baroAltitude,
        timestamp: new Date(timePosition * 1000),
        data: {
          icao24,
          callsign,
          originCountry,
          altitude: baroAltitude
        }
      };

      const result = await eventService.create(event);
      if (!result.isDuplicate) {
        imported++;
      }
    }

    logger.info(`OpenSky importer completed: ${imported} interesting aircraft tracked`);
    return { imported, total: states.length };
  } catch (error) {
    logger.error('OpenSky importer failed:', error.message);
    throw error;
  }
}

module.exports = { run };
