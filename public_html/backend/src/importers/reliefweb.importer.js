const axios = require('axios');
const eventService = require('../services/event.service');
const logger = require('../utils/logger');

const RELIEFWEB_API = 'https://api.reliefweb.int/v1/reports';

async function run() {
  logger.info('Running ReliefWeb importer');

  try {
    const response = await axios.post(RELIEFWEB_API, {
      appkey: process.env.RELIEFWEB_API_KEY || '',
      preset: 'latest',
      limit: 50
    });

    const reports = response.data?.data || [];
    let imported = 0;
    let duplicates = 0;

    for (const report of reports) {
      const event = {
        title: report.title,
        type: 'humanitarian',
        source: 'reliefweb',
        lat: report.location?.[0]?.lat || 0,
        lon: report.location?.[0]?.lon || 0,
        timestamp: new Date(report.date?.created || Date.now()),
        url: report.url,
        data: report
      };

      const result = await eventService.create(event);
      if (result.isDuplicate) {
        duplicates++;
      } else {
        imported++;
      }
    }

    logger.info(`ReliefWeb importer completed: ${imported} imported, ${duplicates} duplicates`);
    return { imported, duplicates, total: reports.length };
  } catch (error) {
    logger.error('ReliefWeb importer failed:', error.message);
    throw error;
  }
}

module.exports = { run };
