const axios = require('axios');
const env = require('../config/env');
const eventService = require('../services/event.service');
const logger = require('../utils/logger');

const RELIEFWEB_API = 'https://api.reliefweb.int/v2/reports';
const MAX_REPORTS_PER_RUN = 100;

async function run() {
  logger.info('Running ReliefWeb importer');

  const appname = env.sourceOptions.reliefweb.appname;
  if (!appname) {
    throw new Error('RELIEFWEB_APPNAME is missing');
  }

  try {
    const response = await axios.post(`${RELIEFWEB_API}?appname=${encodeURIComponent(appname)}`, {
      preset: 'latest',
      limit: MAX_REPORTS_PER_RUN,
      profile: 'list',
      fields: {
        include: [
          'id',
          'title',
          'body-html',
          'source',
          'country',
          'primary_country',
          'disaster',
          'date.created',
          'url_alias'
        ]
      }
    }, {
      timeout: 30000
    });

    const reports = response.data?.data || [];
    let imported = 0;
    let duplicates = 0;

    for (const item of reports) {
      const report = item.fields || {};
      const location = extractLocation(report);

      if (!location) {
        continue;
      }

      const event = {
        title: report.title || `ReliefWeb report ${item.id}`,
        type: 'humanitarian',
        source: 'reliefweb',
        lat: location.lat,
        lon: location.lon,
        timestamp: new Date(report.date?.created || Date.now()),
        url: buildReportUrl(item),
        data: {
          id: item.id,
          ...report
        }
      };

      const result = await eventService.create(event);
      if (result.isDuplicate) {
        duplicates += 1;
      } else {
        imported += 1;
      }
    }

    logger.info(`ReliefWeb importer completed: ${imported} imported, ${duplicates} duplicates`);
    return { imported, duplicates, total: reports.length };
  } catch (error) {
    const detail = error.response?.data?.error?.message || error.response?.data?.message || error.message;
    logger.error(`ReliefWeb importer failed: ${detail}`);
    throw error;
  }
}

function extractLocation(report) {
  const primary = report.primary_country?.location;
  if (primary?.lat !== undefined && primary?.lon !== undefined) {
    return { lat: Number(primary.lat), lon: Number(primary.lon) };
  }

  const firstCountry = Array.isArray(report.country) ? report.country[0] : null;
  if (firstCountry?.location?.lat !== undefined && firstCountry?.location?.lon !== undefined) {
    return { lat: Number(firstCountry.location.lat), lon: Number(firstCountry.location.lon) };
  }

  return null;
}

function buildReportUrl(item) {
  if (item.fields?.url_alias) {
    if (/^https?:\/\//i.test(item.fields.url_alias)) {
      return item.fields.url_alias;
    }

    return `https://reliefweb.int${item.fields.url_alias}`;
  }

  return item.href || null;
}

module.exports = { run };
