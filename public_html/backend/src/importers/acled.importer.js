const axios = require('axios');
const eventService = require('../services/event.service');
const logger = require('../utils/logger');
const { getAccessToken } = require('../utils/acled-auth');

const ACLED_API = 'https://acleddata.com/api/acled/read';
const MAX_EVENTS_PER_RUN = 150;

async function run() {
  logger.info('Running ACLED importer');

  try {
    const response = await fetchAcledEvents();
    const events = normalizeAcledPayload(response.data).slice(0, MAX_EVENTS_PER_RUN);
    let imported = 0;
    let duplicates = 0;

    for (const eventData of events) {
      const lat = Number(eventData.latitude);
      const lon = Number(eventData.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        continue;
      }

      const event = {
        title: `${eventData.event_type}: ${eventData.sub_event_type || eventData.disorder_type || 'Unknown'}`,
        type: 'conflict',
        source: 'acled',
        lat,
        lon,
        timestamp: new Date(eventData.event_date),
        affectedPopulation: Number(eventData.fatalities || 0),
        url: eventData.source || null,
        data: eventData
      };

      const result = await eventService.create(event);
      if (result.isDuplicate) {
        duplicates += 1;
      } else {
        imported += 1;
      }
    }

    logger.info(`ACLED importer completed: ${imported} imported, ${duplicates} duplicates`);
    return { imported, duplicates, total: events.length };
  } catch (error) {
    const detail = error.response?.data?.message || error.response?.data || error.message;
    logger.error(`ACLED importer failed: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    throw error;
  }
}

async function fetchAcledEvents() {
  let accessToken = await getAccessToken();

  try {
    return await requestEvents(accessToken);
  } catch (error) {
    if (error.response?.status !== 401) {
      throw error;
    }

    accessToken = await getAccessToken({ forceRefresh: true });
    return requestEvents(accessToken);
  }
}

async function requestEvents(accessToken) {
  const startDate = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);

  return axios.get(ACLED_API, {
    params: {
      limit: MAX_EVENTS_PER_RUN,
      event_date: `${startDate}|${new Date().toISOString().slice(0, 10)}`,
      event_date_where: 'BETWEEN'
    },
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    timeout: 30000
  });
}

function normalizeAcledPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

module.exports = { run };
